---
summary: 以 libc++ 固定版本源码为参照，讲清 shared_ptr 的控制块布局、引用计数、两个释放点、内存序与 weak_ptr::lock 的竞态防护。
---
# shared_ptr 实现原理：控制块、引用计数与内存序

`shared_ptr` 对外只承诺可观察语义，内部怎么实现由标准库决定。本专题以 LLVM libc++（commit [`6273f264aa88`](https://github.com/llvm/llvm-project/tree/6273f264aa88c8fc55d3fec231f80638bca1de13)）为主线，回答四个问题：

1. `shared_ptr` 里到底存了什么？
2. `make_shared` 为什么只分配一次？
3. 对象析构和控制块释放为什么是两件事？
4. `weak_ptr::lock()` 如何避免“复活”已进入销毁流程的对象？

> libc++ 是 LLVM 的 C++ 标准库实现，符号位于 `std::__1`（如 `__shared_count`）。这些是实现细节，不属于标准 API，也不应进入业务代码或跨库 ABI 约定。只使用 `clang++` 不代表在用 libc++；`-stdlib=libc++` 才切换标准库。

源码入口（阅读时按符号跳转，不要通读 `<memory>`）：

| 文件 | 内容 |
|---|---|
| [`__memory/shared_ptr.h`](https://github.com/llvm/llvm-project/blob/6273f264aa88c8fc55d3fec231f80638bca1de13/libcxx/include/__memory/shared_ptr.h) | 公开接口、控制块类型、`make_shared` 路径 |
| [`__memory/shared_count.h`](https://github.com/llvm/llvm-project/blob/6273f264aa88c8fc55d3fec231f80638bca1de13/libcxx/include/__memory/shared_count.h) | 强弱计数、原子递增/递减 |
| [`src/memory.cpp`](https://github.com/llvm/llvm-project/blob/6273f264aa88c8fc55d3fec231f80638bca1de13/libcxx/src/memory.cpp) | `__release_weak()`、`lock()` |

## 1. 对象模型

`shared_ptr` 和 `weak_ptr` 都只保存两个指针：

```cpp
element_type* __ptr_;
__shared_weak_count* __cntrl_;
```

这说明：

- `shared_ptr<T>` 不保存 deleter、allocator 或控制块的具体类型，类型擦除发生在控制块的虚函数里；
- `weak_ptr` 不拥有对象，但必须持有控制块才能判断对象是否还活着；
- `weak_ptr::__ptr_` 只是地址副本，对象析构后不可解引用。

`sizeof(shared_ptr<T>)` 在 libc++ 上通常是两个指针，但不是标准保证，不能用于 ABI 或序列化设计。

`make_shared` 的控制块 `__shared_ptr_emplace<T, Alloc>`：

```text
+--------------------------------------+
| vptr                                 |
| __shared_owners_       // strong - 1 |
| __shared_weak_owners_  // weak       |
| __alloc_                             |
| alignas(T) buffer_[sizeof(T)]        |  <- T 在这里原位构造
+--------------------------------------+
```

`shared_ptr<T>(new T)` 的控制块 `__shared_ptr_pointer<T*, D, Alloc>` 额外保存 deleter 与对象指针，对象在另一块内存里。

示意布局不是 `offsetof` 依据。关键事实只有一条：**控制块负责销毁对象，`__ptr_` 只负责访问**。aliasing constructor 可以让 `__ptr_` 指向子对象，但控制块销毁的仍是它最初管理的那个对象。

## 2. make_shared 的分配路径

```text
make_shared<T>(args...)
  -> allocate_shared<T>(allocator<T>(), args...)
  -> __allocate_shared_impl<__shared_ptr_emplace<T, Alloc>, T>(...)
  -> 一次分配：控制块 + T 缓冲区
```

`__allocate_shared_impl` 的四步：

```cpp
using _ControlBlockAllocator = typename __allocator_traits_rebind<_Alloc, _ControlBlock>::type;
__allocation_guard<_ControlBlockAllocator> __guard(__alloc, 1);
::new ((void*)std::addressof(*__guard.__get()))
    _ControlBlock(__alloc, std::forward<_Args>(__args)...);
auto __control_block = __guard.__release_ptr();
return shared_ptr<_Tp>::__create_with_control_block(__control_block->__get_elem(),
                                                    std::__to_address(__control_block));
```

1. 把用户 allocator 重绑定到控制块类型；
2. `__allocation_guard` 保证控制块构造抛异常时释放内存；
3. placement new 控制块，控制块构造函数在内部缓冲区构造 `T`；
4. 把对象地址与控制块指针交给 `shared_ptr`。

对象缓冲区在控制块内部，对齐由 `_ALIGNAS_TYPE(__value_type)` 保证，所以 `make_shared` 只分配一次。`shared_ptr<T>(new T)` 则是两次：先 `new T`，再分配控制块；若控制块分配失败，异常守卫会调用删除器释放对象。

`__create_with_control_block` 不增加强计数：新控制块强计数为 `0`，`0` 就代表“当前这个 `shared_ptr` 是唯一 owner”。

## 3. 计数器为什么“少 1”

### 强计数：内部值 = use_count - 1

```cpp
long use_count() const noexcept {
  return __atomic_load_n(&__shared_owners_, __ATOMIC_RELAXED) + 1;
}

bool __release_shared() noexcept {
  if (__libcpp_atomic_refcount_decrement(__shared_owners_) == -1) {
    __on_zero_shared();
    return true;
  }
  return false;
}
```

| 内部 `__shared_owners_` | `use_count()` | 含义 |
|---:|---:|---|
| `0` | `1` | 只有一个 owner |
| `1` | `2` | 两个 owner |
| `-1` | `0` | 强 owner 归零，对象已销毁 |

控制块创建时初始化为 `0`，创建它的 `shared_ptr` 视为“隐式第一个 owner”，省掉一次原子递增；复制时 `__add_shared()` 递增；最后一个 `shared_ptr` 析构时递减得到 `-1`，进入 `__on_zero_shared()`。

### 弱计数：0 表示没有外部 weak_ptr

`__shared_weak_count` 额外保存 `__shared_weak_owners_`。弱计数为 `0` 不代表控制块已释放，它表示“没有外部 `weak_ptr`”。控制块在强 owner 存活期间必须存在，因此最后一个强 owner 释放时会调用 `__release_weak()`，替控制块归还这份“隐式弱引用”：

```cpp
void __release_shared() noexcept {
  if (__shared_count::__release_shared()) __release_weak();
}
```

- 没有 `weak_ptr`：弱计数为 `0`，`__release_weak()` 直接释放控制块；
- 有 `weak_ptr`：最后一个强 owner 释放后控制块继续存活；
- 最后一个 `weak_ptr` 析构时再次调用 `__release_weak()`，看到 `0` 才释放控制块。

阅读源码时不要把 `__shared_owners_` 直接当成 `use_count()`；`-1` 表示“强 owner 已归零”，不是计数溢出。

## 4. 对象析构与控制块释放

析构入口只有一行：

```cpp
~shared_ptr() {
  if (__cntrl_) __cntrl_->__release_shared();
}
```

最后一个强 owner 递减到 `-1` 时，`__shared_count::__release_shared()` 调用虚函数 `__on_zero_shared()`：

- `__shared_ptr_emplace`：`allocator_traits<Alloc>::destroy(__alloc_, __get_elem())`，执行 `T` 析构；
- `__shared_ptr_pointer`：先调用用户 deleter。

`__on_zero_shared()` 是虚函数，这就是 `shared_ptr<T>` 的模板参数里不需要 deleter 类型的原因。

```text
最后一个 shared_ptr 析构
  -> __release_shared()
       +-- 强计数仍 > 0：递减后返回
       +-- 强计数归零
             -> __on_zero_shared()       // T 析构 / deleter 执行
             -> __release_weak()
                  +-- 无 weak_ptr：释放控制块
                  +-- 有 weak_ptr：控制块继续存活
```

两个容易混淆的点：

1. 对象析构由最后一个强 owner 触发，不是由最后一个 `weak_ptr` 触发；
2. deleter 在对象析构阶段执行，即使控制块之后还会因 `weak_ptr` 存活。deleter 很慢（关文件、等 I/O）时，这段延迟由最后一个 `shared_ptr` 的析构同步承担。

控制块释放发生在 `__release_weak()`（`src/memory.cpp`）：

```cpp
void __shared_weak_count::__release_weak() noexcept {
  if (__libcpp_atomic_load(&__shared_weak_owners_, _AO_Acquire) == 0) {
    __on_zero_shared_weak();
  } else if (__libcpp_atomic_refcount_decrement(__shared_weak_owners_) == -1) {
    __on_zero_shared_weak();
  }
}
```

快路径用 acquire load 看到 `0`，说明没有其他弱引用，直接释放；否则退回原子递减，由减到 `-1` 的线程释放。

| 构造方式 | 对象存储释放点 | 控制块存储释放点 |
|---|---|---|
| `shared_ptr<T>(new T)` | 最后一个强 owner 释放时，deleter 执行 | 最后一个弱 owner 释放时 |
| `make_shared<T>()` | 最后一个强 owner 释放时，`T` 析构 | 最后一个弱 owner 释放时，整块 allocation 归还 |

对 `make_shared` 来说，对象和控制块在同一块内存：`__on_zero_shared()` 析构 `T`，`__on_zero_shared_weak()` 才归还整块内存。因此**只要还有一个 `weak_ptr`，这块内存就不会归还**，即使 `T` 已经析构。`weak_ptr` 不是零成本观察者，它延长的是控制块（以及合并分配时的对象存储），不是对象的可用寿命。

## 5. 内存序：递增 relaxed，递减 acq_rel

```cpp
// 递增：只保证原子性
__atomic_add_fetch(&__shared_owners_, 1, __ATOMIC_RELAXED);
// 递减：release + acquire
__atomic_add_fetch(&__shared_owners_, -1, __ATOMIC_ACQ_REL);
```

- **递增**通常发生在复制已有的 `shared_ptr` 时，对象已经构造并发布，不需要再建立 happens-before；
- **递减**可能是最后一个 owner，销毁前必须看到其他线程通过各自 `shared_ptr` 对对象做的写入。所有递减构成一条 release 链，最后减到零的线程通过 acquire 接收之前所有写入，因此可以安全析构对象。

`use_count()` 用 relaxed load，这正说明它是诊断值而不是同步原语：多线程下可能已经过期，不能写“`use_count() == 1` 就独占修改”。

弱计数递增同样用 relaxed（`weak_ptr` 复制不发布对象数据）；`__release_weak()` 的快路径用 acquire load 判断是否需要竞争路径。

这些内存序是 libc++ 的实现策略，标准只要求引用计数操作线程安全，其他标准库可能选择不同顺序。

## 6. weak_ptr::lock 如何防竞态

`lock()` 不是 `use_count() != 0` 检查，而是 load + CAS 循环：

```cpp
__shared_weak_count* __shared_weak_count::lock() noexcept {
  long object_owners = __libcpp_atomic_load(&__shared_owners_);
  while (object_owners != -1) {
    if (__libcpp_atomic_compare_exchange(&__shared_owners_, &object_owners, object_owners + 1))
      return this;
  }
  return nullptr;
}
```

`-1` 是“强 owner 已归零”的哨兵。CAS 成功条件包含“计数仍等于读到的非 `-1` 值”，所以检查与加计数不会跨越销毁窗口：

| 交错（A 销毁最后一个 owner，B 调用 `lock()`） | 结果 |
|---|---|
| B 读到 `0`，A 递减到 `-1`，B 的 CAS 期望 `0` 失败，重读得到 `-1` | B 返回空 |
| B 的 CAS 先把 `0` 改成 `1`，A 再递减 `1 -> 0` | A 不是最后 owner；B 持有有效 `shared_ptr` |
| A 先递减到 `-1` 并开始析构，B 读到 `-1` | B 返回空，不复活对象 |

因此已经进入销毁流程的对象不会被“复活”。

不要先 `expired()` 再 `lock()`：

```cpp
// 错误：检查与使用之间存在竞态
if (!wp.expired()) {
  auto sp = wp.lock();  // 这里可能已经为空
  sp->Use();            // 可能解引用空指针
}

// 正确：只调用一次 lock() 并检查返回值
if (auto sp = wp.lock()) {
  sp->Use();
}
```

`expired()` 只是 `use_count() == 0` 的快照。用 `shared_ptr(const weak_ptr&)` 提升失败会抛 `std::bad_weak_ptr`；`lock()` 返回空指针，失败是正常控制流，工程代码优先用它。

## 7. deleter、allocator 与 aliasing

`shared_ptr<T>` 只保存 `__shared_weak_count*`，deleter 存在控制块里：

```cpp
std::shared_ptr<Resource> a(new Resource, FileDeleter{});
std::shared_ptr<Resource> b(new Resource, SocketDeleter{});
```

静态类型相同，销毁策略不同，靠 `__on_zero_shared()` 分派。`get_deleter<D>()` 依赖 RTTI（比较 `typeid(D)`），关闭 RTTI 时不可用。

allocator 的释放发生在控制块阶段：重绑定到控制块类型 → 复制 allocator → 销毁原 allocator 对象 → 用副本 `deallocate` 整块内存。因此自定义 allocator 必须可复制、可重绑定，且其依赖的资源要活到控制块释放。

aliasing constructor 只改变 `__ptr_`：

```cpp
auto owner = std::make_shared<Pair>(1, 2);
std::shared_ptr<int> alias(owner, &owner->second);
```

`alias.get()` 指向 `Pair::second`，但与 `owner` 共享控制块；控制块销毁的仍是整个 `Pair`。所以不能根据 `get()` 推断控制块拥有什么，只要 `alias` 活着，整个 `Pair` 就活着。

三套 STL 的对应关系（用于换符号名，不是一一等价）：

| 概念 | libc++ | libstdc++ | MSVC STL |
|---|---|---|---|
| 强计数基类 | `__shared_count` | `_Sp_counted_base` | `_Ref_count_base` |
| 弱计数 | `__shared_weak_count` | `_Sp_counted_base::_M_weak_count` | `_Ref_count_base::_Weaks` |
| deleter 控制块 | `__shared_ptr_pointer` | `_Sp_counted_ptr` 派生体系 | `_Ref_count_resource` |
| `make_shared` 控制块 | `__shared_ptr_emplace` | `_Sp_counted_ptr_inplace` | `_Ref_count_obj` |
| 递增 / 递减内存序 | relaxed / acq_rel | relaxed / acq_rel | relaxed / acq_rel |

## 8. 可运行实验

[lab/main.cpp](lab/main.cpp) 不依赖标准库源码，用全局 `new/delete` 计数与析构打点把上面的模型变成可观察行为，GCC / Clang 通用。

| 实验 | 观测 | 对应结论 |
|---|---|---|
| `make_shared` | `new +1`，`delete +1` | 一次分配 |
| `shared_ptr(new T)` | `new +2`，`delete +2` | 两次分配 |
| `weak_ptr` 存活时 `reset()` | 对象已析构，`delete +0`；`wp.reset()` 后 `delete +1` | 对象析构 ≠ 控制块释放 |
| 两个不同 lambda deleter 的 `shared_ptr<void>` | 静态类型相同，各自 deleter 恰好调用 1 次 | 类型擦除 |
| `weak_ptr::lock()` | 存活时成功，过期时返回空且不抛异常 | CAS 提升 |
| aliasing constructor | `owner.reset()` 后 `Pair` 仍存活 | 销毁对象不随 `get()` 改变 |

```bash
cd topics/stdlib/shared-ptr-internals
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic lab/main.cpp -o lab_main
./lab_main
```

用 libc++ 编译：

```bash
clang++ -std=c++23 -stdlib=libc++ -Wall -Wextra -Wconversion -Wpedantic \
  lab/main.cpp -o lab_main
```

实验只验证标准可观察语义，不验证 libc++ 内部计数偏移。内部计数是否为 `use_count - 1`、控制块是否合并分配，要回到对应实现源码确认。

## 9. 工程结论

- **先决定所有权，再选 `shared_ptr`。** 单一明确 owner 用 `unique_ptr` 或值语义更便宜；`shared_ptr` 的价值是共享生命周期，不是“自动管理内存”。
- **`weak_ptr` 是观察者。** 它延长控制块，不延长对象的可用寿命；对象能否使用只看 `lock()` 的返回值。
- **区分对象析构与控制块回收。** 长生命周期的 observer、缓存、回调表要评估 `weak_ptr` 持有控制块（以及 `make_shared` 整块内存）的成本。
- **实时路径慎用共享所有权。** 原子 RMW、控制块分配、最后一个 owner 的同步析构都会破坏最坏执行时间的确定性；中断上下文避免拷贝 `shared_ptr`，能传引用就传引用。
- **源码结论绑定版本。** 符号名、计数偏移、控制块布局都可能变化，本文结论只对固定 commit 负责。

常见误读：

| 误读 | 事实 |
|---|---|
| `use_count() == 1` 可以安全独占修改 | 它只是快照，其他线程可能正在复制或释放 |
| `expired()` 为 false 说明对象还活着 | 与后续解引用之间没有保护，应只 `lock()` 一次 |
| 对象析构了控制块立刻释放 | `weak_ptr` 会让控制块（及 `make_shared` 的对象存储）继续存活 |
| `make_shared` 永远优于 `shared_ptr(new T)` | 弱引用长期存在时会延迟整块内存回收，按生命周期选择 |
| `shared_ptr` 线程安全所以对象也线程安全 | 标准只保证控制块计数操作安全，对象成员仍需自己的同步 |
| `shared_ptr<T>` 大小随 deleter 变大 | deleter 在控制块里；只有 `unique_ptr<T, D>` 把 `D` 放进对象 |

## 参考

- libc++ [`__memory/shared_ptr.h`](https://github.com/llvm/llvm-project/blob/6273f264aa88c8fc55d3fec231f80638bca1de13/libcxx/include/__memory/shared_ptr.h) · [`__memory/shared_count.h`](https://github.com/llvm/llvm-project/blob/6273f264aa88c8fc55d3fec231f80638bca1de13/libcxx/include/__memory/shared_count.h) · [`src/memory.cpp`](https://github.com/llvm/llvm-project/blob/6273f264aa88c8fc55d3fec231f80638bca1de13/libcxx/src/memory.cpp)
- cppreference：[`std::shared_ptr`](https://en.cppreference.com/w/cpp/memory/shared_ptr) · [`std::weak_ptr`](https://en.cppreference.com/w/cpp/memory/weak_ptr)
- ISO C++ 标准：[`[util.smartptr]`](https://eel.is/c++draft/util.smartptr)
- 相关课程：[Day 60：shared_ptr / weak_ptr 与控制块生命周期](../../../daily/day-060-shared-ptr-weak-ptr-lifetime.md) · [Ownership 与智能指针](../../../patterns/ownership-and-smart-pointers.md)

> 许可提示：libc++ 采用 Apache-2.0 WITH LLVM-exception。本文以符号导航和短小片段解释原理，不复制大段实现。
