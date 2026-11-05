# 专题 001 · 用 libc++ 源码读懂 `shared_ptr`：引用计数、控制块与内存序

Day 31 解决的是"什么时候用 `shared_ptr`"（所有权与生命周期边界）；
本专题解决的是"`shared_ptr` 里面是什么"——以 LLVM libc++ 为主阅读对象，
把引用计数、控制块、内存序这三个黑盒打开。

> 源码核实日期：2026-11-05，基于 `llvm/llvm-project` 的 `main` 分支。
> `main` 会持续演进，类名若有变化，以仓库当前版本为准。

## 1. 为什么是 libc++

先区分两个概念：

- **Clang**：C/C++ 编译器；
- **libc++**：LLVM 项目的 C++ 标准库实现。

Clang 可以搭配 libc++，也可以搭配 libstdc++。选 libc++ 做主阅读对象有三个理由：

1. **实现集中**：`shared_ptr` 的核心逻辑收拢在两个小文件里
  （`__memory/shared_count.h` 仅 118 行），比 libstdc++ 更易追踪；
2. **注释坦率**：内存序的选择直接写明了依据（`https://llvm.org/PR22803`），
   还附带了 `__release_weak` 快路径优化的论证注释；
3. **对照友好**：三套主流 STL（libc++ / libstdc++ / MSVC STL）
   在这个问题上的设计是同构的（见第 10 节对照表），读懂一套，
   另外两套只是换名字。

## 2. 源码入口

公开头文件只是转发层，真正的实现在三个文件里：

| 文件 | 内容 |
|---|---|
| `libcxx/include/memory` | 公开头文件，转发到 `__memory/*` |
| `libcxx/include/__memory/shared_ptr.h` | `shared_ptr` / `weak_ptr`、`__shared_ptr_pointer`（deleter 路径）、`__shared_ptr_emplace`（`make_shared` 路径） |
| `libcxx/include/__memory/shared_count.h` | `__shared_count`、`__shared_weak_count`、`__libcpp_atomic_refcount_increment/decrement` |
| `libcxx/src/memory.cpp` | `lock()`、`__release_weak()` 等非内联实现 |

## 3. 建议阅读路线

不要一开始通读整个 `memory`，按这条调用链追踪 6 个入口：

1. `shared_ptr`（`shared_ptr.h`）：公开接口。注意它只有两个成员——
   `__ptr_`（对象指针）与 `__cntrl_`（控制块指针），其余全是转发。
2. `__shared_count`（`shared_count.h`）：强引用计数，`__on_zero_shared()`
   纯虚函数是"强计数归零时做什么"的扩展点。
3. `__shared_weak_count`（`shared_count.h`，注意它是 **private 继承**
   `__shared_count`）：弱引用计数，外加 `lock()`。
4. `__libcpp_atomic_refcount_increment` / `decrement`（`shared_count.h` 顶部）：
   原子操作与内存序，全部答案都在 20 行代码里。
5. `make_shared` → `__shared_ptr_emplace`（`shared_ptr.h`）：对象和控制块的
   分配策略。
6. 自定义 deleter → `__shared_ptr_pointer`（`shared_ptr.h`）：资源销毁与类型擦除。

```text
make_shared<T>() ──一次分配──▶ __shared_ptr_emplace
                                    │  (__buffer_ 内嵌对象 + 计数)
                                    ▼
                              shared_ptr<T>（__ptr_ + __cntrl_）
                                    │
                                    ▼
                              control block
                               ├── 强计数 __shared_owners_（存的是 count−1，见第 8 节）
                               ├── 弱计数 __shared_weak_owners_
                               ├── 强计数归零 → __on_zero_shared() → 析构对象 / 调 deleter
                               └── 弱计数归零 → __on_zero_shared_weak() → 释放整块内存
```

## 4. 四个关键问题

### Q1：对象什么时候析构？

强计数归零时。`__shared_count::__release_shared()`：

```cpp
if (__libcpp_atomic_refcount_decrement(__shared_owners_) == -1) {
  __on_zero_shared();  // 虚函数：各控制块决定"销毁对象"具体做什么
  return true;
}
```

`__shared_ptr_emplace`（`make_shared` 路径）的 `__on_zero_shared()` 只析构
内嵌对象；`__shared_ptr_pointer`（deleter 路径）的版本则调用
`__deleter_(__ptr_)`。**对象析构 ≠ 控制块释放**，这是下一问的起点。

### Q2：控制块什么时候释放？

弱计数归零时。`__shared_weak_count::__release_shared()` 在强计数归零后会
顺手调一次 `__release_weak()`；每个 `weak_ptr` 的拷贝/销毁对应
`__add_weak()` / `__release_weak()`。`__release_weak()` 递减到零才调
`__on_zero_shared_weak()` 释放整块内存。

推论（`make_shared` 的著名副作用）：`make_shared` 把对象内嵌在控制块里
（`__shared_ptr_emplace::__buffer_`），所以**只要还有 `weak_ptr` 活着，
整块内存（含已析构对象的存储）就不会释放**。大对象 + 长寿命 `weak_ptr`
的组合要警惕内存驻留。

### Q3：为什么递增和递减用不同的内存序？

```cpp
// shared_count.h 顶部注释：
// NOTE: Relaxed and acq/rel atomics (for increment and decrement respectively)
// should be sufficient for thread safety. See https://llvm.org/PR22803

// 递增：__ATOMIC_RELAXED
return __atomic_add_fetch(std::addressof(__t), 1, __ATOMIC_RELAXED);
// 递减：__ATOMIC_ACQ_REL
return __atomic_add_fetch(std::addressof(__t), -1, __ATOMIC_ACQ_REL);
```

- **递增用 `relaxed`**：执行拷贝的线程必然已经持有一个有效引用
  （否则它连拷贝的对象都没有），递增本身不发布任何新数据，
  只需要"原子地加一"，`relaxed` 足够。
- **递减用 `acq_rel`**：把计数带到零的那个线程接下来要销毁对象，
  它必须看到此前所有持有者对该对象的一切写入。每次递减的 `release`
  语义与"看到零"的那次递减的 `acquire` 语义配对
  （经由同一原子变量的 release sequence），从而把 happens-before
  传递给销毁线程。若递减只用 `relaxed`，销毁线程可能看到计数归零，
  却看不到其他线程先前对对象的修改。

### Q4：`weak_ptr::lock()` 如何避免"判活后、加一前"的竞态？

`weak_ptr::lock()`（`shared_ptr.h`）调 `__cntrl_->lock()`，
后者是 `src/memory.cpp` 里的 CAS 循环：

```cpp
__shared_weak_count* __shared_weak_count::lock() noexcept {
  long object_owners = __libcpp_atomic_load(&__shared_owners_);
  while (object_owners != -1) {   // −1 即强计数为零（见第 8 节）
    if (__libcpp_atomic_compare_exchange(&__shared_owners_, &object_owners, object_owners + 1))
      return this;
  }
  return nullptr;
}
```

- 先原子 load：若已是 −1（对象已死或正在死），直接返回 `nullptr`，
  不碰它；
- 否则 CAS 加一：**只有当"判零"与"加一"之间没有其他线程把它减到零，
  CAS 才会成功**；成功的那一刻调用者即持有强引用，对象不可能在此时被析构；
- 若 CAS 失败（有并发递减），用最新值重试。

不存在"判断还活着、还没加一、对象已被销毁"的窗口——要么拿到一个
有效的强引用，要么明确失败。这也是 `lock()` 不抛异常而
`shared_ptr(wp)` 会抛 `bad_weak_ptr` 的原因：前者把"过期"表达为返回值。

## 5. 自定义 deleter：类型擦除长什么样

`shared_ptr<T>(ptr, deleter)` 创建 `__shared_ptr_pointer<T, Dp, Alloc>` 控制块：

```cpp
class __shared_ptr_pointer final : public __shared_weak_count {
  _Alloc __alloc_;
  _Dp __deleter_;   // deleter 的具体类型 Dp 只活在这里
  _Tp __ptr_;
  void __on_zero_shared() noexcept override {
    __deleter_(__ptr_);   // 强计数归零时调用
    ...
  }
};
```

`shared_ptr` 的类型签名里没有 `Dp` 的位置——这就是类型擦除：
`shared_ptr<void>` 可以持有任意 deleter，而 `get_deleter<Dp>` 经 RTTI
（`typeid(_Dp)` 比对）把当初存进去的 deleter 取回来。

## 6. `make_shared`：为什么只有一次分配

`__shared_ptr_emplace` 把对象直接构造在控制块内部的 `__buffer_` 里，
一次 `new` 同时拿下"计数 + 对象"的内存。对比 `shared_ptr(new T)`：
先一次 `new` 建对象，再一次 `new` 建控制块，共两次——且若第二次分配抛异常，
第一次 `new` 出来的对象会泄漏。这就是"优先用 `make_shared`"
的两条硬理由：**少一次分配**、**异常安全**。

## 7. 实现细节：计数是"减一存储"的

`__shared_owners_` 存的不是 `use_count()`，而是 `use_count() - 1`：

```cpp
long use_count() const noexcept {
  return __atomic_load_n(&__shared_owners_, __ATOMIC_RELAXED) + 1;
}
```

所以"归零"的判定是 `decrement(...) == -1`，`lock()` 里判的是 `!= -1`。
读到源码里 `-1` 这个魔法数字时，记得它就是"零"的化身。

## 8. 嵌入式视角

- **原子 RMW 不是免费的**：每次拷贝/销毁 `shared_ptr` 都是一次原子
  读-改-写，多线程下还是缓存行乒乓。实时路径、中断上下文里避免拷贝
  `shared_ptr`，能传引用就传引用。
- **计数线程安全 ≠ 对象线程安全**：引用计数只保护控制块本身，
  对象成员的并发访问仍要自己同步。
- **`make_shared` + 长寿命 `weak_ptr`**：整块内存驻留（第 4 节 Q2），
  内存受限系统里要算这笔账。
- **实时路径避免无界动态分配**：`shared_ptr(new T)` 的两次分配本就该避免；
  即使 `make_shared` 的一次分配，在硬实时路径上也要掂量。

## 9. 三套 STL 对照表

掌握 libc++ 这套后，读另外两套只是换名字：

| 概念 | libc++ | libstdc++ | MSVC STL |
|---|---|---|---|
| 强计数基类 | `__shared_count` | `_Sp_counted_base` | `_Ref_count_base` |
| 弱计数 | `__shared_weak_count` | `_Sp_counted_base::_M_weak_count` | `_Ref_count_base::_Weaks` |
| deleter 控制块 | `__shared_ptr_pointer` | `_Sp_counted_ptr` | `_Ref_count_resource` |
| `make_shared` 控制块 | `__shared_ptr_emplace` | `_Sp_counted_ptr_inplace` | `_Ref_count_obj` |
| 递增 / 递减内存序 | relaxed / acq_rel | relaxed / acq_rel | relaxed / acq_rel |

## 10. 可编译实验

`lab/main.cpp` 用全局 `new/delete` 计数 + 析构打点，把上面的模型变成
可观测行为（不依赖任何一家标准库源码，g++ / clang++ 通用）：

```bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic lab/main.cpp -o lab_main
./lab_main
```

| 实验 | 观测 | 对应正文 |
|---|---|---|
| 1. `make_shared` | `new +1`，`delete +1` | 第 6 节：一次分配 |
| 2. `shared_ptr(new T)` | `new +2`，`delete +2` | 第 6 节：两次分配 + 异常安全 |
| 3. `weak_ptr` 存活时 `sp.reset()` | 对象已析构，但 `delete +0`（控制块还在）；`wp.reset()` 后 `delete +1` | 第 4 节 Q1/Q2 |
| 4. 两个不同 lambda deleter 的 `shared_ptr<void>` | 类型相同，各 deleter 恰好调用 1 次 | 第 5 节：类型擦除 |
| 5. `weak_ptr::lock()` | 存活时成功（`use_count` 2），过期时返回空、不抛异常 | 第 4 节 Q4 |

## 11. 延伸阅读

- `https://llvm.org/PR22803` —— 内存序选择的原始讨论；
- `libcxx/include/__memory/shared_count.h` 全文 118 行，读完即毕业；
- libstdc++ 对应实现：`libstdc++-v3/include/bits/shared_ptr_base.h`；
- 回到课程：Day 31（对象所有权、生命周期与资源管理边界）讲"何时用"，
  本专题讲"里面是什么"，两篇对照看。
