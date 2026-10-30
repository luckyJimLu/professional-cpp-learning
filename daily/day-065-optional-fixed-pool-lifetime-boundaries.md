---
day: 65
week: 10
part: III
chapter: 7
chapter_title: Memory Management
title: Optional Lifetime and Fixed-Pool Safety Boundaries
duration: 60
status: published
date: 2026-10-30
topics: [optional, object-lifetime, fixed-pool, stale-handle, bounded-memory]
patterns: [object-pool, dependency-injection]
guidelines: [value-semantics-first, explicit-lifetime, bounded-storage]
lab:
  path: examples/day-065/main.cpp
previous: 64
next: 66
---

# Day 65 · Optional Lifetime / Fixed Pool：先用标准 RAII 表达“有或无”，再决定是否需要手写 Pool

> **主教材主线**：Chapter 7 · Memory Management。承接 Day 64 的 storage/object lifetime 分离，今天收束显式对象复用：比较手工 placement lifetime、`std::optional<T>`、固定容量 pool 与长期存活 value object。设计模式仅作为工程辅线。

## ① 今日章节与建议阅读范围（5 分钟）

继续 Chapter 7 中对象构造/销毁、动态内存管理与资源所有权相关内容。阅读时重点问：是否真的需要 raw storage？对象只是“当前存在/不存在”时，标准 RAII wrapper 能否直接表达 lifetime？

建议阅读顺序：对象 lifetime 与析构 → placement construction 回顾 → 标准 RAII/value 方案比较。今天不把 Object Pool 当目标，而把它当需要证明合理性的优化。

## ② 昨日复习 3 问（5 分钟）

1. storage 仍存在时，`destroy_at()` 后旧 `T*` 为什么不能自动代表新对象？
2. pool owns storage、lease owns occupancy、业务 borrow `T&`，三者 lifetime 应如何排序？
3. 对象数量固定且贯穿系统生命周期时，为什么 `std::array<T,N>` 通常比 Object Pool 更稳定？

## ③ 核心概念与工程场景（24 分钟，含进阶选读）

### `std::optional<T>` 是一个重要的 lifetime 工具

`optional<T>` 自己拥有内联 storage；`emplace()` 开始其中 `T` 的 lifetime，`reset()` 结束 lifetime。它没有为 `T` 单独执行 heap allocation，因此特别适合“一个槽位最多存在一个对象”的状态。

这与手写 `alignas(T) std::byte storage[sizeof(T)] + construct_at/destroy_at + bool engaged` 的目标相似，但标准类型已经封装了对齐、engaged 状态和析构协议。

### 编译期 / 运行期影响

`optional<T>` 的容量在类型层面就是 0 或 1；固定 `array<optional<T>, N>` 可以把最大 slot 数变成编译期上界。代价是每个 slot 需要状态，并且线性扫描的 `Acquire()` 是 O(N)。实时系统不能只说“没有 heap”，还要证明扫描、锁、构造、析构和失败路径的 WCET。

### 思维链

```text
需求变化：最多 N 个短生命周期 command
→ 变化轴：并发数量 / acquire failure / reuse
→ 稳定边界：slot occupancy，而不是 raw storage
→ C++ 机制：optional + array
→ Pattern：只有业务确实需要 acquire/release 才使用 Object Pool
→ ownership：pool owns slots；调用者只能获得受约束 borrow/lease
→ Embedded：N、扫描次数、锁、callback teardown 必须有上界
→ Code Review：检查 stale pointer / double release / hidden allocation
```

### 设计模式映射：只有确实需要 bounded reuse 时才用 Object Pool

**候选：Object Pool + Dependency Injection。**

真实变化轴是短生命周期对象的并发数量和获取失败策略；稳定边界是“有限 slot 的 occupancy”。如果上层只需要一个长期存在的 Driver，则根本没有 pool 变化轴，直接 composition/value member 最正确。

不要把 Factory 与 Pool 混为一谈：Factory 解决创建策略/具体类型选择，Pool 解决有限资源复用。也不要用 `shared_ptr` 解决 occupancy；共享引用计数会模糊谁负责归还 slot。

runtime polymorphism 也不是必需条件。固定 firmware 的 slot 类型已知时，`array<optional<T>,N>` 是 static composition；只有对象类型需要 runtime replacement 时才另行评估 virtual interface/type erasure。

**ownership/lifetime**：pool 是 owner；lease 应是 move-only occupancy token；同步业务只 borrow `T&`。callback 若保存 borrow，release 前必须 unsubscribe/cancel 并等待 in-flight callback。否则 slot reuse 后可能形成 dangling/stale callback。

### Embedded / System Design 场景

Modem middleware 同时最多 4 个 AT transaction：task context 从固定 pool acquire；无空槽立即返回 `Busy/NoCapacity`；transaction 完成、timeout 或 cancel 后先停止事件源，再解除 callback，确认无 in-flight work，最后归还 slot。

实时审计：ISR 不做 pool 扫描/复杂析构；N 必须有明确上界；Acquire 的最坏扫描次数是 N；多线程访问明确锁或单 owner task；timeout 使用带单位类型；错误模型不能只用含糊 `bool`；若外部 handle 跨 reuse，加入 generation 或更强 lease contract。

## ④ C 写法 vs Modern C++（7 分钟）

传统 C 常见 `uint8_t storage[N][SIZE]` + used bitmap + init/deinit；类型、对齐、构造/析构协议都靠约定。

Modern C++ 若只是 optional lifetime，可优先：

```cpp
std::array<std::optional<Transaction>, 4> slots;
```

而不是直接手写 raw storage。类型安全、自动析构、测试性更好，内存上界仍然静态可知。只有 allocator/layout/DMA/特殊地址等要求超出标准 wrapper 能力时，才下沉到显式 storage 管理。

## ⑤ 今日编码规范（6 分钟）

### MUST：能用标准 value/RAII wrapper 表达 lifetime 时，不手写 raw storage 状态机

错误：`byte[] + bool engaged + reinterpret_cast` 只是为了表示“有/无对象”。

推荐：`std::optional<T>`；固定多个槽位使用 `std::array<std::optional<T>, N>`。

### MUST：Pool API 不得把可跨 release/reuse 的裸指针伪装成稳定 handle

错误：`Command* h = pool.Acquire(); pool.Release(h);` 后仍长期保存 `h`。

推荐：move-only lease，或 `{index, generation}` 可验证 handle；短同步路径才使用受 owner lifetime 约束的 borrow。

### SHOULD：实时路径的容量和失败策略显式化

禁止隐式 heap fallback。`N`、Acquire 最坏成本、exhaustion 结果和 teardown 顺序都应可测试。

## ⑥ 可编译实验（7 分钟）

### 主 Lab：用 `optional` 封装单槽对象 lifetime

文件：[`examples/day-065/main.cpp`](../examples/day-065/main.cpp)

```bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic examples/day-065/main.cpp -o day065
./day065
```

观察 `Emplace → borrow → Reset → Emplace`。对比 Day 64：这里无需业务层直接调用 `construct_at/destroy_at`。

### Exercise 01：修复固定 Pool 的 stale-handle 边界

文件：[`examples/day-065/exercise-01.cpp`](../examples/day-065/exercise-01.cpp)

```bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic examples/day-065/exercise-01.cpp -o day065-ex01
./day065-ex01
```

Starter 可正常运行，但 `Acquire()` 返回裸 `Command*`；release/reuse 后旧地址可能再次代表另一个 command。请重构：

1. 保持容量 2，禁止 heap；
2. 用 move-only lease 或 `{slot, generation}` 替代长期裸 handle；
3. 增加 acquire 3 次的 exhaustion 测试；
4. 增加 release → reuse → old handle rejected 测试；
5. 若采用 lease，明确 destructor 是否自动归还以及 pool 必须比 lease 活得更久；
6. 解释为什么这里不需要 `shared_ptr`、Factory 或 Observer。

## ⑦ 常见坑（2 分钟）

1. **把 `optional` 当 pointer**：它表达值是否存在并拥有该值，不是 non-owning borrow。
2. **没有 heap 就等于实时安全**：线性扫描、锁、析构、callback teardown 仍可能破坏 WCET。
3. **Pool Pattern 滥用**：长期固定对象使用 pool 只会制造 occupancy、stale handle 和 teardown 状态。

## ⑧ 检查题（2 分钟）

1. `optional<T>::reset()` 后，之前取得的 `T&` 是否还能使用？为什么？
2. `array<optional<T>,4>` 相比手写 raw storage，哪些 lifetime invariant 已由标准库承担？
3. **设计题**：RTOS 中有 4 个固定 UART channel，系统启动时创建、关机时销毁；另有最多 8 个短生命周期 modem request。分别选择 value composition、optional、Object Pool 或其他方案。说明变化轴、稳定边界、owner/borrow/lifetime、callback teardown、RAM/WCET，并指出哪些 Pattern 不应该使用。

---

## 今日结论

**先选择最简单、能正确表达 lifetime 的标准 RAII/value 类型，再考虑手写对象池。Pool 的价值是 bounded reuse，不是“看起来更底层”；它必须用额外的 occupancy、stale-handle、并发与 WCET 证明来支付复杂度成本。**

下一课继续 Chapter 7，完成 Memory Management 的工程化收束：把 ownership、RAII、smart pointer、PMR、object lifetime 与 bounded allocation 汇总成一套资源边界决策树。