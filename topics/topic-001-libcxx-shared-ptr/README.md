---
summary: 以 Clang + libc++ 为主线，固定 LLVM commit，沿 make_shared、控制块、强弱计数、内存序与 weak_ptr::lock 追踪对象析构和控制块回收。
---
# 专题 001 · 用 libc++ 源码读懂 shared_ptr：引用计数、控制块与内存序

Day 31 解决的是“什么时候用 `shared_ptr`”（所有权与生命周期边界）；
本专题解决的是“`shared_ptr` 里面是什么”——以 LLVM libc++ 为主阅读对象，
把引用计数、控制块、内存序这三个黑盒打开。

> 本文面向已经会使用 `shared_ptr` / `weak_ptr`、希望读懂 libc++ 实现的读者。
>
> 源码固定到 LLVM commit [`6273f264aa88`](https://github.com/llvm/llvm-project/tree/6273f264aa88c8fc55d3fec231f80638bca1de13)（2026-11-05）。标准规定 `shared_ptr` 的可观察语义，不规定控制块的类层次、内存布局或具体原子指令；本文中的符号名和行号只对应该 revision。

## 本次学习路线

- [先分清 Clang 与 libc++](#1-先分清-clang-与-libc)
- [固定版本与源码入口](#2-固定版本与源码入口)
- [先建立对象模型](#3-先建立对象模型)
- [make_shared 的完整调用链](#4-make_shared-的完整调用链)
- [两个计数器为什么都“少 1”](#5-两个计数器为什么都少-1)
- [对象什么时候析构](#6-对象什么时候析构)
- [控制块什么时候释放](#7-控制块什么时候释放)
- [引用计数为什么用不同内存序](#8-引用计数为什么用不同内存序)
- [weak_ptr::lock 如何避免销毁竞态](#9-weak_ptrlock-如何避免销毁竞态)
- [自定义 deleter 与类型擦除](#10-自定义-deleter-与类型擦除)
- [可运行实验](#11-可运行实验)
- [源码阅读检查表](#12-源码阅读检查表)

---

# 1. 先分清 Clang 与 libc++

这两个名字经常被混在一起，但它们不是一回事：

| 名称 | 是什么 | 仓库 | 选择方式 |
|---|---|---|---|
| **Clang** | C / C++ / Objective-C 编译器前端 | [llvm/llvm-project](https://github.com/llvm/llvm-project) 的 `clang/` | `clang++` |
| **libc++** | LLVM 项目的 C++ 标准库实现 | 同一仓库的 `libcxx/` | `-stdlib=libc++` |
| **libstdc++** | GCC 的 C++ 标准库实现 | [gcc-mirror/gcc](https://github.com/gcc-mirror/gcc) | `-stdlib=libstdc++`（通常是 Linux 上 Clang 的默认值） |

Clang 可以搭配 libc++，也可以搭配 libstdc++。只使用 `clang++` 并不自动意味着正在阅读 libc++ 的实现。

## 1.1 确认当前工具链

```bash
# 看编译器版本和默认标准库搜索路径
clang++ -v

# 确认头文件来自 libc++：有输出说明 _LIBCPP_VERSION 已定义
echo '#include <memory>' | clang++ -stdlib=libc++ -dM -E -x c++ - | grep _LIBCPP_VERSION
```

如果要固定使用 libc++：

```bash
clang++ -std=c++17 -stdlib=libc++ your_file.cpp -o your_file
```

这要求系统已经安装 libc++ 的 headers 与运行库；否则会出现找不到 `<__config>` 或链接失败。不同发行版的包名不同，先以本机工具链文档为准。

libc++ 的内部符号通常位于 `std::__1`（由 `_LIBCPP_ABI_NAMESPACE` 配置的 ABI inline namespace）中，例如 `std::__1::__shared_count`。这是 libc++ 的 ABI 细节，不是标准 API，也不应出现在业务代码或跨库 ABI 约定中。

## 1.2 为什么以 libc++ 为主

1. **实现集中**：`shared_ptr` 的核心逻辑收拢在 `__memory/shared_ptr.h` 与 `__memory/shared_count.h` 两个小文件中，`shared_count.h` 只有约 118 行，比 libstdc++ 的控制块继承树更容易追踪。
2. **注释坦率**：内存序选择直接写明了依据（[LLVM PR22803](https://llvm.org/PR22803)），`__release_weak()` 的快路径优化也附带了完整论证。
3. **对照友好**：三套主流 STL 在这个问题上的设计高度同构；读完 libc++，再读 libstdc++ / MSVC STL 主要是换符号名。

---

# 2. 固定版本与源码入口

## 2.1 源码位置

新版本 libc++ 已经把 `<memory>` 拆成多个内部头文件。阅读 `shared_ptr` 时，主要看这三处：

| 文件 | 负责内容 | 本次阅读重点 |
|---|---|---|
| [`libcxx/include/__memory/shared_ptr.h`](https://github.com/llvm/llvm-project/blob/6273f264aa88c8fc55d3fec231f80638bca1de13/libcxx/include/__memory/shared_ptr.h) | `shared_ptr` / `weak_ptr` 公开接口、控制块具体类型、`make_shared` 路径 | 构造、复制、析构、`lock()` |
| [`libcxx/include/__memory/shared_count.h`](https://github.com/llvm/llvm-project/blob/6273f264aa88c8fc55d3fec231f80638bca1de13/libcxx/include/__memory/shared_count.h) | `__shared_count`、`__shared_weak_count`、原子计数 helper | 强弱计数、递增/递减、`use_count` |
| [`libcxx/src/memory.cpp`](https://github.com/llvm/llvm-project/blob/6273f264aa88c8fc55d3fec231f80638bca1de13/libcxx/src/memory.cpp) | 不宜内联的释放与提升逻辑 | `__release_weak()`、`lock()` |

`libcxx/include/memory` 仍然是公开入口，但它只是汇总包含；不要从第一行开始通读整个文件。先沿着一条调用链走，遇到符号再跳转。

## 2.2 推荐阅读顺序

```text
make_shared<T>(args...)
    |
    v
allocate_shared<T>(alloc, args...)
    |
    v
__allocate_shared_impl<__shared_ptr_emplace<T, Alloc>, T>(...)
    |
    v
control block (vptr + strong count + weak count + allocator + T buffer)
    |
    +---- shared_ptr::__ptr_       -> T object
    |
    +---- shared_ptr::__cntrl_     -> control block
    |
    +---- __on_zero_shared()       -> destroy T
    |
    +---- __on_zero_shared_weak()  -> deallocate control block
```

建议按下面六个符号逐层跟踪，而不是一次看完整个 `memory`：

1. `shared_ptr<T>::__ptr_` / `__cntrl_`
2. `__shared_count` / `__shared_weak_count`
3. `__shared_ptr_emplace`
4. `__shared_ptr_pointer`
5. `__release_shared()` / `__release_weak()`
6. `__shared_weak_count::lock()`

---

# 3. 先建立对象模型

libc++ 的 `shared_ptr` 只保存两个指针：

```cpp
element_type* __ptr_;
__shared_weak_count* __cntrl_;
```

`weak_ptr` 同样保存两个指针：

```cpp
element_type* __ptr_;
__shared_weak_count* __cntrl_;
```

这说明：

- `shared_ptr<T>` 不直接保存 deleter、allocator 或控制块的完整类型；
- 控制块通过虚函数完成类型擦除；
- `weak_ptr` 不拥有对象，但必须持有控制块，才能判断对象是否还活着；
- `weak_ptr::__ptr_` 只是对象地址的副本，对象析构后已经不能解引用。

`sizeof(shared_ptr<T>)` 在 libc++ 上通常是两个指针大小，但这不是标准保证。不要依赖它做 ABI、序列化或二进制布局设计。

## 3.1 控制块的概念布局

`make_shared` 路径下，`__shared_ptr_emplace<T, Alloc>` 大致是：

```text
+--------------------------------------+
| vptr                                 |
| __shared_owners_       // strong - 1 |
| __shared_weak_owners_  // weak       |
| __alloc_                             |
| alignas(T) buffer_[sizeof(T)]        |  <- T 在这里原位构造
+--------------------------------------+
```

`shared_ptr<T>(new T)` 路径使用的是 `__shared_ptr_pointer<T*, D, Alloc>`：

```text
+--------------------------------------+
| vptr                                 |
| __shared_owners_                     |
| __shared_weak_owners_                |
| __alloc_                             |
| __deleter_                           |
| __ptr_                               |  -> 单独的 T 对象
+--------------------------------------+
```

上图是概念示意，具体偏移、填充和基类顺序由 ABI 与编译器决定，不能当作 `offsetof` 依据。

一个关键事实是：**控制块负责销毁对象，而 `shared_ptr` 的 `__ptr_` 只负责访问**。aliasing constructor 可以让 `__ptr_` 指向子对象，但控制块仍然销毁它最初管理的那个对象。

---

# 4. make_shared 的完整调用链

## 4.1 入口

在固定 revision 中，`make_shared` 很薄：

```cpp
template <class _Tp, class... _Args>
shared_ptr<_Tp> make_shared(_Args&&... __args) {
  return std::allocate_shared<_Tp>(allocator<__remove_cv_t<_Tp>>(), std::forward<_Args>(__args)...);
}
```

真正的分配在 `__allocate_shared_impl`：

```cpp
template <class _ControlBlock, class _Tp, class _Alloc, class... _Args>
shared_ptr<_Tp> __allocate_shared_impl(const _Alloc& __alloc, _Args&&... __args) {
  using _ControlBlockAllocator = typename __allocator_traits_rebind<_Alloc, _ControlBlock>::type;
  __allocation_guard<_ControlBlockAllocator> __guard(__alloc, 1);
  ::new ((void*)std::addressof(*__guard.__get()))
      _ControlBlock(__alloc, std::forward<_Args>(__args)...);
  auto __control_block = __guard.__release_ptr();
  return shared_ptr<_Tp>::__create_with_control_block(__control_block->__get_elem(),
                                                      std::__to_address(__control_block));
}
```

这段代码做了四件事：

1. 把用户 allocator 重绑定到控制块类型；
2. 用 `__allocation_guard` 保证异常安全：控制块构造失败时释放已分配内存；
3. 在分配块上 placement new 控制块，控制块构造函数再在内部缓冲区构造 `T`；
4. 把对象地址和控制块指针交给 `shared_ptr`。

## 4.2 为什么只有一次分配

`__shared_ptr_emplace` 把对象缓冲区放在控制块内部：

```cpp
template <class _Tp, class _Alloc>
struct __shared_ptr_emplace : __shared_weak_count {
  using __value_type = __remove_cv_t<_Tp>;

  template <class... _Args>
  explicit __shared_ptr_emplace(_Alloc __a, _Args&&... __args) : __alloc_(std::move(__a)) {
    allocator_traits<_Alloc>::construct(__alloc_, __get_elem(), std::forward<_Args>(__args)...);
  }

  __value_type* __get_elem() noexcept {
    return reinterpret_cast<__value_type*>(__buffer_);
  }

  _ALIGNAS_TYPE(__value_type) char __buffer_[sizeof(__value_type)];
};
```

因此 `make_shared<T>` 在 libc++ 中通常只分配一次：控制块和 `T` 在同一个 allocation 中。`_ALIGNAS_TYPE(__value_type)` 保证缓冲区满足 `T` 的对齐要求。

相反，`shared_ptr<T>(new T)` 至少涉及两次分配：

- `new T` 分配对象；
- 控制块 `__shared_ptr_pointer` 再分配一次。

如果 `new T` 成功而控制块分配失败，libc++ 通过异常守卫调用删除器，避免泄漏；这部分不是本文重点，但阅读源码时值得留意。

## 4.3 `__create_with_control_block` 不增加强计数

```cpp
static shared_ptr<_Tp> __create_with_control_block(_Yp* __p, _CntrlBlk* __cntrl) noexcept {
  shared_ptr<_Tp> __r;
  __r.__ptr_ = __p;
  __r.__cntrl_ = __cntrl;
  __r.__enable_weak_this(__r.__ptr_, __r.__ptr_);
  return __r;
}
```

这里没有调用 `__add_shared()`。新建的控制块内部强计数为 `0`，而 `0` 正好表示“当前这个 `shared_ptr` 是唯一 owner”。这就是下一节要解释的计数偏移。

`__enable_weak_this` 用于 `enable_shared_from_this`：控制块建立后，把 `weak_this` 指向同一个控制块。它不是“凭空把 `this` 变成 shared owner”，前提仍然是对象已经由某个 `shared_ptr` 管理。

---

# 5. 两个计数器为什么都“少 1”

## 5.1 强计数：内部值 = use_count - 1

libc++ 的 `__shared_count` 保存 `__shared_owners_`，但对外 `use_count()` 返回它加一：

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

对应关系：

| 内部 `__shared_owners_` | `use_count()` | 含义 |
|---:|---:|---|
| `0` | `1` | 只有一个 owner |
| `1` | `2` | 两个 owner |
| `-1` | `0` | 最后一个 owner 已释放，对象销毁 |

为什么可以这样设计？

- 控制块创建时初始化为 `0`；
- 创建它的那个 `shared_ptr` 被视为“隐式第一个 owner”，不需要额外原子递增；
- 复制 `shared_ptr` 时调用 `__add_shared()`，内部值变为 `1`；
- 最后一个 `shared_ptr` 析构时，递减返回 `-1`，进入 `__on_zero_shared()`。

这只是 libc++ 的实现技巧，不是标准要求。标准只要求 `use_count()` 返回共享 owner 的数量；其他实现完全可以用不同的内部表示。

## 5.2 弱计数：0 表示没有外部 weak_ptr

`__shared_weak_count` 额外保存 `__shared_weak_owners_`。关键点是：**弱计数为 0 不代表控制块已经释放**，它表示“没有外部 `weak_ptr`”。

控制块本身在强 owner 存在期间必须存活，所以最后一个强 owner 释放时会调用 `__release_weak()`，替控制块释放这份“隐式弱引用”：

```cpp
void __release_shared() noexcept {
  if (__shared_count::__release_shared()) __release_weak();
}
```

- 没有 `weak_ptr`：`__shared_weak_owners_ == 0`，`__release_weak()` 直接释放控制块；
- 有一个 `weak_ptr`：弱计数为 `1`；最后一个强 owner 释放时递减到 `0`，控制块继续存活；
- 最后一个 `weak_ptr` 析构时再次调用 `__release_weak()`，此时看到 `0`，才释放控制块。

因此，“对象析构”和“控制块释放”是两个独立事件，弱计数负责把第二个事件延后。

> 阅读源码时不要把 `__shared_owners_` 的值直接当成 `use_count()`。看到 `-1` 时，应理解为“强 owner 已归零”，而不是“计数溢出”。

---

# 6. 对象什么时候析构

## 6.1 析构入口

`shared_ptr` 的析构函数只做一件事：

```cpp
~shared_ptr() {
  if (__cntrl_) __cntrl_->__release_shared();
}
```

`__shared_weak_count::__release_shared()` 先尝试释放强引用；如果这是最后一个强 owner，再调用 `__release_weak()`：

```cpp
void __release_shared() noexcept {
  if (__shared_count::__release_shared()) __release_weak();
}
```

`__shared_count::__release_shared()` 在递减结果为 `-1` 时调用纯虚函数 `__on_zero_shared()`。具体控制块决定如何销毁对象：

- `__shared_ptr_emplace`：调用 `allocator_traits<Alloc>::destroy(__alloc_, __get_elem())`，执行 `T` 的析构函数；
- `__shared_ptr_pointer`：先调用用户 deleter，再销毁保存的指针／deleter 状态。

`__on_zero_shared()` 是虚函数，这就是 `shared_ptr<T>` 不必把 deleter 类型放进模板参数的原因。

## 6.2 析构时序

```text
最后一个 shared_ptr 析构
    |
    v
__release_shared()
    |
    +-- strong count 仍 > 0：只递减，返回
    |
    +-- strong count 归零
            |
            v
        __on_zero_shared()
            |
            +-- make_shared：destroy(T)
            +-- 指针构造：deleter(ptr)
            |
            v
        __release_weak()
            |
            +-- 没有 weak_ptr：释放控制块
            +-- 仍有 weak_ptr：控制块继续存活
```

这里有两个容易混淆的点：

1. **对象析构由最后一个强 owner 触发**，不是由最后一个 `weak_ptr` 触发；
2. **deleter 在对象析构阶段执行**，即使控制块之后还会因为 `weak_ptr` 存活一段时间。

如果 deleter 很慢（关闭文件、释放设备、等待 I/O），最后一个 `shared_ptr` 的析构会同步承担这段延迟。实时路径中不能把这种延迟当成“引用计数很便宜”。

---

# 7. 控制块什么时候释放

## 7.1 `__release_weak()`

`__release_weak()` 位于 `libcxx/src/memory.cpp`，核心逻辑是：

```cpp
void __shared_weak_count::__release_weak() noexcept {
  if (__libcpp_atomic_load(&__shared_weak_owners_, _AO_Acquire) == 0) {
    __on_zero_shared_weak();
  } else if (__libcpp_atomic_refcount_decrement(__shared_weak_owners_) == -1) {
    __on_zero_shared_weak();
  }
}
```

它有两个分支：

- **快路径**：acquire load 看到 `0`，说明没有其他弱引用，直接释放控制块；
- **竞争路径**：看到非零值，执行原子递减；递减返回 `-1` 的线程负责释放。

libc++ 源码注释解释了快路径的动机：常见的“最后一个 `shared_ptr` 析构且没有其他竞争引用”场景，可以避免一次昂贵的原子读改写；如果看到非零值，说明可能存在并发，再退回原子递减。

## 7.2 `__on_zero_shared_weak()` 做什么

`__on_zero_shared_weak()` 负责控制块存储的回收：

- `__shared_ptr_emplace`：重绑定 allocator 到控制块类型，复制 allocator，销毁原 allocator 对象，然后 `deallocate` 整块内存；
- `__shared_ptr_pointer`：同样通过重绑定 allocator 释放控制块；对象本身已经在 `__on_zero_shared()` 阶段由 deleter 释放。

对 `make_shared` 来说，对象和控制块在同一块内存里，所以：

```text
__on_zero_shared()      -> 执行 T 的析构函数
__on_zero_shared_weak() -> 归还包含 T 存储的整块 allocation
```

这意味着：**只要还有一个 `weak_ptr`，`make_shared` 分配的那整块内存都不会归还**，即使 `T` 已经析构。若 `T` 很大、`weak_ptr` 生命周期很长，就会出现“对象已死但内存仍被控制块保留”的现象。

## 7.3 两种分配的生命周期对照

| 构造方式 | 对象存储释放点 | 控制块存储释放点 |
|---|---|---|
| `shared_ptr<T>(new T)` | 最后一个强 owner 释放时，deleter 执行 | 最后一个弱 owner 释放时 |
| `make_shared<T>()` / `allocate_shared<T>()` | 最后一个强 owner 释放时，`T` 析构 | 最后一个弱 owner 释放时，整块 allocation 归还 |

所以 `weak_ptr` 不是“零成本观察者”。它延长的是控制块（以及 `make_shared` 合并分配时的对象存储）的寿命，而不是对象本身的可用寿命。

---

# 8. 引用计数为什么用不同内存序

## 8.1 递增 relaxed，递减 acq_rel

libc++ 的两个 helper 很直接：

```cpp
// 递增：只保证原子性
return __atomic_add_fetch(&__shared_owners_, 1, __ATOMIC_RELAXED);

// 递减：release + acquire
return __atomic_add_fetch(&__shared_owners_, -1, __ATOMIC_ACQ_REL);
```

为什么递增可以弱，递减必须强？

- **递增**通常发生在复制一个已经存在的 `shared_ptr` 时。对象已经构造完成并发布；复制操作只需要让计数原子地加一，不需要再建立新的 happens-before 关系。
- **递减**可能是最后一个 owner。最后一个 owner 在销毁对象之前，必须看到其他线程通过它们的 `shared_ptr` 对对象所做的写入。`release` 把本线程之前的写入发布出去，`acquire` 让最后递减的线程接收其他 release 的写入。
- 所有递减操作构成一条 release 链；最后那个把计数减到零的线程通过 acquire 接收之前所有递减线程的写入，因此可以安全地销毁对象。

`use_count()` 使用 `relaxed` load：

```cpp
return __atomic_load_n(&__shared_owners_, __ATOMIC_RELAXED) + 1;
```

这进一步说明 `use_count()` 是诊断值，不是同步原语。多线程下它可能已经过期；不要写“如果 `use_count() == 1` 就安全修改对象”这样的逻辑。

## 8.2 弱计数释放的快路径

`__release_weak()` 先用 acquire load 检查是否为 `0`，再看是否需要原子递减。这个优化在 libc++ 源码注释中有详细解释，核心结论是：

- 如果看到 `0`，可以确定没有其他弱引用会同时访问控制块，直接释放；
- 如果看到非零值，可能存在并发 `weak_ptr` 析构，必须使用原子读改写；
- 弱计数递增使用 relaxed 即可，因为 `weak_ptr` 的复制本身不发布对象数据。

这些内存序是 libc++ 的实现策略，不是标准承诺。标准只要求 `shared_ptr` 的引用计数操作是线程安全的；其他标准库可能采用不同的原子顺序。

---

# 9. weak_ptr::lock 如何避免销毁竞态

## 9.1 `lock()` 的核心循环

`__shared_weak_count::lock()` 不是一个简单的 `use_count() != 0` 检查，而是 load + compare-exchange 循环：

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

`-1` 是“强 owner 已归零”的内部哨兵值。循环的含义是：

1. 读取当前强计数；
2. 如果已经是 `-1`，对象生命周期已结束，返回空；
3. 否则尝试用 CAS 把计数加一；
4. CAS 成功，说明当前线程成功“提升”为一个新的强 owner，返回控制块；
5. CAS 失败，说明计数被其他线程改变，重新读取再试。

关键是：**CAS 把“计数仍等于读到的非 -1 值”作为成功条件**，因此检查与增加计数不会跨越销毁窗口。如果期间有线程把计数改成 `-1`，CAS 失败，循环重新读取后返回空。

## 9.2 两种交错

假设线程 A 正在销毁最后一个 `shared_ptr`，线程 B 调用 `weak_ptr::lock()`：

| 交错 | 结果 |
|---|---|
| B 先读到 `0`；A 递减到 `-1`；B 的 CAS 期望 `0`，失败；B 重读 `-1` | B 返回空，安全 |
| B 的 CAS 先把 `0` 改成 `1`；A 再递减 `1 -> 0` | A 不是最后一个 owner，不销毁对象；B 持有有效 `shared_ptr` |
| A 先递减到 `-1` 并开始析构；B 读到 `-1` | B 返回空，不会复活对象 |

因此 `lock()` 不会让一个已经进入销毁流程的对象“复活”。如果 CAS 成功，B 返回的 `shared_ptr` 持有一个强计数，对象的生命周期至少延长到这个 `shared_ptr` 释放为止。

## 9.3 不要写 `expired()` 后再 `lock()`

```cpp
// 错误：检查和使用之间存在竞态
if (!wp.expired()) {
  auto sp = wp.lock();  // 这里可能已经为空
  sp->Use();            // 可能解引用空指针
}
```

正确写法是只调用一次 `lock()`，并检查返回值：

```cpp
if (auto sp = wp.lock()) {
  sp->Use();
}
```

`expired()` 本身只是 `use_count() == 0` 的快照，不能把“未过期”这个结论保持到下一行。

`shared_ptr(const weak_ptr&)` 构造在提升失败时抛出 `std::bad_weak_ptr`；`weak_ptr::lock()` 则返回空 `shared_ptr`。两者语义不同，工程代码通常优先使用 `lock()`，因为失败是正常控制流，不需要异常。

---

# 10. 自定义 deleter 与类型擦除

## 10.1 控制块如何保存 deleter

`shared_ptr<T>` 只保存 `__shared_weak_count*`，但控制块的具体类型可以是：

```cpp
__shared_ptr_pointer<T*, Deleter, Allocator>
```

它把 deleter、allocator 和原始指针保存在控制块内部。`shared_ptr<T>` 的模板参数里没有 `Deleter`，所以：

```cpp
std::shared_ptr<Resource> a(new Resource, FileDeleter{});
std::shared_ptr<Resource> b(new Resource, SocketDeleter{});
```

可以是同一个静态类型 `shared_ptr<Resource>`，但拥有不同的销毁策略。这正是控制块虚函数 `__on_zero_shared()` 的作用。

`get_deleter<D>()` 依赖 RTTI：控制块比较 `typeid(D)`，匹配时返回保存的 deleter 地址。关闭 RTTI 的构建中，这条路径不可用。

## 10.2 allocator 的销毁时机

`__shared_ptr_pointer::__on_zero_shared_weak()` 大致做三件事：

1. 把 allocator 重绑定到控制块类型；
2. 复制一份 allocator；
3. 销毁控制块中保存的 allocator 对象，再用副本 `deallocate` 整块内存。

这解释了两个工程约束：

- 自定义 allocator 必须可复制、可重绑定，并且复制后仍能正确释放原 allocation；
- allocator 的 `deallocate` 发生在控制块释放阶段，而不是对象析构阶段。若 allocator 依赖某个资源，该资源必须活到控制块释放。

## 10.3 aliasing constructor 不改变销毁对象

```cpp
auto owner = std::make_shared<Pair>(1, 2);
std::shared_ptr<int> alias(owner, &owner->second);
```

`alias.get()` 指向 `Pair::second`，但 `alias` 与 `owner` 共享同一个控制块。控制块销毁的仍然是整个 `Pair`，不是 `int` 子对象。因此：

- 不能根据 `shared_ptr::get()` 推断控制块拥有什么；
- aliasing constructor 适合暴露成员或子对象，但不能用来“只拥有某个字段”；
- 只要 `alias` 还活着，整个 `Pair` 就活着。

## 10.4 与 libstdc++ / MSVC STL 对照

掌握 libc++ 这套后，读另外两套主要是换符号名：

| 概念 | libc++ | libstdc++ | MSVC STL |
|---|---|---|---|
| 强计数基类 | `__shared_count` | `_Sp_counted_base` | `_Ref_count_base` |
| 弱计数 | `__shared_weak_count` | `_Sp_counted_base::_M_weak_count` | `_Ref_count_base::_Weaks` |
| deleter 控制块 | `__shared_ptr_pointer` | `_Sp_counted_ptr` 派生体系 | `_Ref_count_resource` |
| `make_shared` 控制块 | `__shared_ptr_emplace` | `_Sp_counted_ptr_inplace` | `_Ref_count_obj` |
| 递增 / 递减内存序 | relaxed / acq_rel | relaxed / acq_rel | relaxed / acq_rel |

表格用于导航，不表示三家内部类可以一一等价映射；具体名字与内存序仍需按各自版本核对。

---

# 11. 可运行实验

配套实验：

- [lab/main.cpp](lab/main.cpp)：用全局 `new/delete` 计数与析构打点，把正文模型变成可观察行为；不依赖任何一家标准库源码，GCC / Clang 通用。

它覆盖六个观测点：

| 实验 | 观测 | 对应正文 |
|---|---|---|
| 1. `make_shared` | `new +1`，`delete +1` | 第 4 节：一次分配 |
| 2. `shared_ptr(new T)` | `new +2`，`delete +2` | 第 4 节：两次分配与异常安全 |
| 3. `weak_ptr` 存活时 `reset()` | 对象已析构，但 `delete +0`；`wp.reset()` 后 `delete +1` | 第 6、7 节：对象析构 ≠ 控制块释放 |
| 4. 两个不同 lambda deleter 的 `shared_ptr<void>` | 静态类型相同，各自 deleter 恰好调用 1 次 | 第 10 节：类型擦除 |
| 5. `weak_ptr::lock()` | 存活时成功（`use_count` 变为 2），过期时返回空且不抛异常 | 第 9 节：CAS 提升 |
| 6. aliasing constructor | `alias` 共享控制块；`owner.reset()` 后 `Pair` 仍存活 | 第 10.3 节：销毁对象不随 `get()` 改变 |

运行：

```bash
cd topics/topic-001-libcxx-shared-ptr
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic lab/main.cpp -o lab_main
./lab_main
```

使用 libc++：

```bash
clang++ -std=c++23 -stdlib=libc++ -Wall -Wextra -Wconversion -Wpedantic \
  lab/main.cpp -o lab_main
```

关键观测点：

- `make_shared` 一次分配同时容纳控制块与对象；
- `shared_ptr(new T)` 的对象与控制块分别分配；
- `weak_ptr` 让控制块在对象析构后继续存活，直到最后一个弱引用释放；
- deleter 的具体类型只存在于控制块中，`shared_ptr<void>` 的静态类型不随 deleter 改变；
- `weak_ptr::lock()` 成功时延长对象寿命，失败时返回空 `shared_ptr`；
- aliasing constructor 让 `shared_ptr<int>` 指向成员，但控制块仍然销毁整个 `Pair`。

需要强调：实验只验证标准可观察语义，不验证 libc++ 内部计数偏移。它已在主机 libstdc++ 下通过；内部计数是否为 `use_count - 1`、控制块是否合并分配，必须回到对应实现的源码确认。

---

# 12. 源码阅读检查表

阅读时不要只“看懂”，要为每个问题留下源码位置和结论。

| 问题 | 要找到的符号 | 记录内容 |
|---|---|---|
| 强计数在哪里增加？ | `__shared_count::__add_shared()` | 调用点、原子操作、内存序 |
| 强计数在哪里减少？ | `__shared_count::__release_shared()` | 递减返回值判断、销毁触发条件 |
| 对象由谁析构？ | `__on_zero_shared()` | `make_shared` 与 pointer 控制块分别做什么 |
| 控制块由谁释放？ | `__on_zero_shared_weak()` | allocator 重绑定与 `deallocate` 路径 |
| 弱计数如何参与释放？ | `__release_weak()` | 快路径、竞争路径、最后释放者 |
| `weak_ptr::lock()` 如何防竞态？ | `__shared_weak_count::lock()` | load + CAS 循环、`-1` 哨兵 |
| 自定义 deleter 存在哪里？ | `__shared_ptr_pointer` | 模板参数、成员、虚函数分派 |
| `make_shared` 如何合并分配？ | `__shared_ptr_emplace` | 缓冲区、对齐、`construct` |
| aliasing 如何共享控制块？ | `shared_ptr(const shared_ptr<Y>&, T*)` | `__ptr_` 与 `__cntrl_` 分离 |

可以先用命令定位符号，再回到阅读器：

```bash
grep -n "__shared_count\|__shared_weak_count\|__release_shared\|__release_weak\|__libcpp_atomic_refcount" \
  libcxx/include/__memory/shared_count.h \
  libcxx/src/memory.cpp

grep -n "__shared_ptr_emplace\|__shared_ptr_pointer\|__allocate_shared_impl\|__create_with_control_block" \
  libcxx/include/__memory/shared_ptr.h
```

最终应能画出两条时间线：

```text
强 owner：1 -> 0
    -> T 析构
    -> 有 weak？控制块继续存活
    -> 无 weak？控制块立即释放

弱 owner：1 -> 0
    -> 控制块释放
```

以及一条竞态时间线：

```text
lock 读计数 -> 对象销毁流程递减到 -1 -> lock 的 CAS 失败 -> 返回空
```

---

# 13. 常见误读

1. **“`use_count() == 1` 表示我可以安全地独占修改对象。”**
   不一定。其他线程可能正在复制或释放同一个控制块；`use_count()` 是快照，不能作为同步协议。

2. **“`weak_ptr::expired()` 为 false，所以对象一定还活着。”**
   `expired()` 和后续解引用之间没有保护。正确做法是 `lock()` 一次并持有返回的 `shared_ptr`。

3. **“对象析构了，控制块也马上释放。”**
   `weak_ptr` 可以让控制块继续存活；`make_shared` 还会让对象存储一起被保留。

4. **“`make_shared` 总是比 `shared_ptr(new T)` 好。”**
   合并分配减少了分配次数和局部性开销，但弱引用长期存在时会延迟整块内存回收；需要根据生命周期选择。

5. **“`shared_ptr` 是线程安全的，所以它指向的对象也是线程安全的。”**
   标准保证的是不同 `shared_ptr` 实例对同一控制块的引用计数操作安全；对象成员的并发访问仍需要自己的同步。

6. **“原子操作越多越安全，所以 `use_count` 也应该用 seq_cst。”**
   标准库只需要满足语义；libc++ 选择 relaxed/acquire-release 是性能与正确性的折中。业务代码不应依赖内部内存序。

7. **“`__shared_owners_ == 0` 表示没有 owner。”**
   在 libc++ 中，`0` 表示还有一个 owner；`-1` 才表示归零。这是内部表示，不是标准语义。

8. **“`shared_ptr<T>` 的大小会随 deleter 变大。”**
   libc++ 的 `shared_ptr<T>` 只保存两个指针；deleter 状态在控制块中。`unique_ptr<T, D>` 才会把 `D` 放进对象本身。

---

# 14. 工程结论

- **先决定所有权，再选择 `shared_ptr`。** 如果对象只有一个明确 owner，`unique_ptr` 或值语义更便宜；`shared_ptr` 的价值在于共享生命周期，而不是“自动管理内存”。
- **`weak_ptr` 是观察者，不是延长对象寿命的工具。** 它延长的是控制块；对象是否可用仍由 `lock()` 的返回值决定。
- **区分对象析构与控制块回收。** 设计长时间运行的 observer、缓存或回调表时，要评估 `weak_ptr` 持有控制块的成本。
- **实时路径慎用共享所有权。** 引用计数、原子操作、控制块分配以及最后一个 owner 的同步析构，都会给最坏执行时间带来不确定性。固定生命周期对象图优先考虑值语义、借用和显式关闭协议。
- **原子 RMW 不是免费的。** 每次拷贝/销毁 `shared_ptr` 都是一次原子读改写，多线程下还可能产生缓存行乒乓；实时路径、中断上下文里避免拷贝 `shared_ptr`，能传引用就传引用。
- **源码结论要绑定版本。** libc++ 的符号名、计数偏移、控制块布局都可能变化；本文的结论只对固定 commit 负责。

延伸阅读：

- [Ownership 与 Smart Pointers](../../patterns/ownership-and-smart-pointers.md)：所有权三问、独占/借用/异步关系与三家 STL 对照。
- [Day 57：智能指针与所有权转移](../../daily/day-057-smart-pointers-ownership-transfer.md)
- [Day 60：shared_ptr / weak_ptr 与控制块生命周期](../../daily/day-060-shared-ptr-weak-ptr-lifetime.md)
- [Day 61：enable_shared_from_this 与回调生命周期](../../daily/day-061-enable-shared-from-this-callback-lifetime.md)
- [Day 62：aliasing、cast 与所有权 API](../../daily/day-062-smart-pointer-aliasing-casts-ownership-api.md)
- [Embedded C++ 编码规范索引](../../guidelines/embedded-cpp-guideline-notes.md)

---

# 15. 参考

- libc++ `shared_ptr.h`（固定 revision）：[`6273f264aa88/libcxx/include/__memory/shared_ptr.h`](https://github.com/llvm/llvm-project/blob/6273f264aa88c8fc55d3fec231f80638bca1de13/libcxx/include/__memory/shared_ptr.h)
- libc++ `shared_count.h`（固定 revision）：[`6273f264aa88/libcxx/include/__memory/shared_count.h`](https://github.com/llvm/llvm-project/blob/6273f264aa88c8fc55d3fec231f80638bca1de13/libcxx/include/__memory/shared_count.h)
- libc++ `memory.cpp`（固定 revision）：[`6273f264aa88/libcxx/src/memory.cpp`](https://github.com/llvm/llvm-project/blob/6273f264aa88c8fc55d3fec231f80638bca1de13/libcxx/src/memory.cpp)
- cppreference：[`std::shared_ptr`](https://en.cppreference.com/w/cpp/memory/shared_ptr) · [`std::weak_ptr`](https://en.cppreference.com/w/cpp/memory/weak_ptr)
- ISO C++ 标准：[`[util.smartptr]`](https://eel.is/c++draft/util.smartptr)

> 许可提示：libc++ 采用 Apache-2.0 WITH LLVM-exception。本文以符号导航和短小片段解释原理，不复制大段实现；如需在衍生作品中分发源码片段，请保留对应文件头的许可声明。
