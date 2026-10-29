---
day: 64
week: 10
part: III
chapter: 7
chapter_title: Memory Management
title: Object Lifetime, Placement Construction and Fixed Storage Reuse
duration: 60
status: published
date: 2026-10-29
topics: [object-lifetime, placement-construction, construct-at, destroy-at, fixed-storage]
patterns: [object-pool, dependency-injection]
guidelines: [explicit-lifetime, bounded-storage, no-dangling-borrow]
lab:
  path: examples/day-064/main.cpp
previous: 63
next: 65
---

# Day 64 · Object Lifetime / Placement Construction：固定存储不等于对象一直存在

> **主教材主线**：Chapter 7 · Memory Management。承接 Day 63 的 bounded allocation，今天继续讨论动态内存管理中“storage 与 object lifetime 分离”的关键机制，并把它映射到 Embedded 固定容量对象复用。Object Pool 仅作为工程辅线，不改变教材顺序。

## ① 今日章节与建议阅读范围（5 分钟）

继续 Chapter 7 中内存分配、对象构造/销毁、placement construction 与资源复用相关内容。阅读时区分四件事：storage 是否存在、对象 lifetime 是否已开始、谁负责 destroy、borrow 是否跨越了 destroy/reconstruct 边界。

建议把 `std::construct_at` / `std::destroy_at` 视为现代 C++ 对显式对象生命周期操作的清晰入口；不要把 raw storage 当作已经构造好的 `T`。

## ② 昨日复习 3 问（5 分钟）

1. PMR container 是否拥有它引用的 `memory_resource`？resource 应满足什么 lifetime 关系？
2. 为什么 `reserve(32)` 仍不足以完整表达实时路径的容量 contract？
3. 固定 firmware 只有一种容量策略时，为什么 `std::array` / static-capacity 方案可能优于 runtime Strategy？

## ③ 核心概念（10 分钟）

内存管理必须区分 **storage duration** 与 **object lifetime**。一块对齐的字节存储可以长期存在，但其中的 `T` 只有在 construction 完成后才存在；`destroy_at()` 后，即使地址未改变，旧对象的 lifetime 已结束。

```text
raw aligned storage
      |
      | construct_at
      v
 live T object  ---- borrow/reference valid only under owner contract
      |
      | destroy_at
      v
raw aligned storage
      |
      | construct_at
      v
 new T object
```

这也是对象池最容易产生 bug 的地方：**地址复用不等于对象身份/lifetime 连续**。任何 callback、pointer、reference、span 或 handle 若跨过 release/reuse 边界，都必须重新验证。

编译期固定容量可以消除 heap growth；运行期 Object Pool 可以提供 bounded reuse，但会增加 slot 状态、并发、generation/ABA、归还协议等复杂度。先确认变化轴真的需要 pool。

## ④ C 写法 vs Modern C++（7 分钟）

C/旧式代码常见 `uint8_t storage[N]` + 强制转换 + 手工 init/deinit；容易漏掉 alignment、构造/析构与重复释放状态。

Modern C++ 可以使用 `alignas(T)` 的 storage，并用 `std::construct_at` / `std::destroy_at` 显式建立和结束 lifetime；更高层再用 RAII wrapper 封装 engaged 状态，让 teardown 自动发生。

但如果类型简单、数量固定且一直存活，直接 `std::array<T, N>` 更简单。不要因为学了 placement construction 就把所有对象改成 pool。

## ⑤ 设计模式映射（8 分钟）

今天相关的是 **Object Pool（条件使用）+ Dependency Injection**。

- **需求变化**：请求对象频繁创建/销毁，但最大并发数已知，heap 不允许进入实时路径。
- **变化轴**：并发 slot 数、对象类型、获取失败策略、线程上下文。
- **稳定边界**：`Acquire()` / `Release()` 或更安全的 move-only lease，而不是向业务层暴露 raw storage。
- **C++ 机制**：fixed storage、`construct_at`/`destroy_at`、RAII lease、generation counter。
- **ownership**：pool owns storage；lease owns 当前占用权；业务函数通常只 borrow `T&`。

如果对象数量固定且生命周期等同系统生命周期，**不使用 Object Pool** 更正确：直接 value semantics / `std::array`，没有 acquire/release 协议，也没有 stale handle。

## ⑥ Embedded / System Design 场景（7 分钟）

Modem AT transaction manager 最大同时 4 个 transaction。初始化时预留 4 个 slot；task context 获取 slot 并构造 transaction；完成/timeout/cancel 后先停止 callback，再结束 transaction lifetime，最后归还 slot。

审计点：pool exhaustion 返回明确错误；ISR 不做复杂 construction/destruction；callback 不保存裸 `T*` 穿越 slot reuse；多 task 访问需要明确锁/无锁协议及 WCET；若地址会复用，外部 handle 可加入 generation 防止 ABA/stale handle；shutdown 必须先停止 producer，再等待 in-flight transaction，最后销毁 pool。

## ⑦ 今日编码规范（6 分钟）

### MUST：storage lifetime 与 object lifetime 必须显式区分

错误：把 `std::byte[]` reinterpret_cast 后直接当已构造对象使用。

推荐：对齐 storage，并通过 `construct_at` / `destroy_at` 或封装后的 RAII slot 管理 lifetime。

### MUST：borrow 不得跨越 destroy/reuse 边界

错误：缓存 pool slot 的裸指针，slot release 后继续在 callback 中使用。

推荐：callback 在 release 前 unsubscribe/cancel；跨异步边界使用可验证的 handle/generation 或更高层 lifetime protocol。

### SHOULD：固定生命周期优先 value semantics，而不是 Object Pool

Pool 只有在 bounded reuse 是真实需求时才引入；不要为“减少 new”而制造复杂 acquire/release 状态机。

## ⑧ 可编译 Lab / 练习（7 分钟）

### 主 Lab：SingleSlot + construct/destroy

文件：`examples/day-064/main.cpp`

```bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic examples/day-064/main.cpp -o day064
./day064
```

观察同一块 storage 先构造 transaction 64，显式销毁后再构造 transaction 65；`SingleSlot` 自身负责最后 teardown。

### Exercise 01：审计跨 reuse 的 stale borrow

文件：`examples/day-064/exercise-01.cpp`

```bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic examples/day-064/exercise-01.cpp -o day064-ex01
./day064-ex01
```

Starter 可正常运行，并刻意保留 `borrowed` 指针。它没有在旧对象销毁后解引用，因此当前程序没有 UB；你的任务是重构 API，使旧 borrow **无法被误认为仍然有效**。

要求：
1. 封装 storage，不允许业务层直接调用 `construct_at`/`destroy_at`；
2. 用 move-only lease 或等价 ownership token 表达占用权；
3. release 后旧 handle 必须可检测为 stale，必要时加入 generation；
4. 增加 acquire → release → reuse → stale-handle 测试；
5. 说明单线程固定对象若直接 `std::array<Command, N>` 就足够时，为什么不应引入 Pool。

## ⑨ 3 个常见坑（3 分钟）

1. **地址相同就认为对象没变**：destroy/reconstruct 已改变 object lifetime；旧 borrow 不能凭地址相同继续成立。
2. **Pool 自动等于实时安全**：仍需证明 Acquire/Release、锁、扫描 slot、析构和 failure path 的 WCET 上界。
3. **Pattern 过度设计**：固定数量、系统全生命周期对象用 Pool 反而增加状态和 stale-handle 风险。

## ⑩ 检查题（2 分钟）

### Q1
为什么 backing storage 仍存在，并不能证明其中的 `T` 仍处于 lifetime 内？

### Q2
对象池复用相同地址时，异步 callback 保存 raw pointer 会出现什么风险？generation handle 能解决哪一部分？

### Q3 · 设计题
RTOS modem 同时最多 4 条 AT transaction，timeout 后 slot 可复用。请选择 `std::array<T,4>`、optional-like slot、Object Pool 或动态 allocation；解释变化轴、稳定边界、owner/borrow、timeout/callback teardown、pool exhaustion、ABA/stale handle、锁/WCET 与 IRQ/task context。若选择保持简单，明确说明为什么。

## 今日结论

> **固定 storage 只解决“内存在哪里”，不自动解决“对象现在是否活着”。Embedded 对象复用必须把 construction、destruction、borrow invalidation 和 slot reuse 作为同一个 lifetime protocol 设计。**

下一课继续 Chapter 7，收束自定义内存管理/对象复用的安全边界，并进一步讨论避免手写 allocator/pool 时应优先使用的标准 RAII/value 方案。
