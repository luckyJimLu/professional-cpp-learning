---
day: 60
week: 9
part: III
chapter: 7
chapter_title: Memory Management
title: Shared Ownership · shared_ptr, weak_ptr and Lifetime Cycles
duration: 60
status: published
date: 2026-10-25
topics: [shared-ptr, weak-ptr, control-block, ownership-cycle, lifetime]
patterns: [observer, dependency-injection]
guidelines: [prefer-single-owner, explicit-shared-ownership, break-cycles]
lab:
  path: examples/day-060/main.cpp
previous: 59
next: 61
---

# Day 60 · Shared Ownership：`shared_ptr`、`weak_ptr` 与 Lifetime Cycles

> **主教材主线**：Chapter 7 · Memory Management。承接 Day 59 的 move-only resource owner，今天只在“生命周期确实需要共同延长”时引入 shared ownership，并理解 control block、`weak_ptr` 与 ownership cycle。

## ① 今日章节与建议阅读范围（5 分钟）

继续 Chapter 7 的 smart pointer 内容，重点阅读 `shared_ptr`、`make_shared`、引用计数、`weak_ptr` 与循环引用。阅读时始终区分：**多个使用者** 与 **多个共同 owner** 不是同一件事。

## ② 昨日复习 3 问（5 分钟）

1. custom deleter 为什么能把 `FILE*` / driver handle 变成 RAII owner？
2. RAII 为什么不能自动保证 teardown 发生在正确线程？
3. parser 与 RX worker 都使用 UART 时，为什么不必因此使用 `shared_ptr`？

## ③ 核心概念（10 分钟）

`shared_ptr<T>` 通常由对象指针与 control block 协作：control block 维护 strong/weak reference count 以及 deleter 等状态。复制 `shared_ptr` 表示**共享 ownership**，不是普通 borrow。

`weak_ptr<T>` 不延长对象 lifetime；`lock()` 成功时临时获得一个 strong owner，因此适合“对象可能已经消失”的异步观察关系。

工程判断顺序：

```text
谁决定对象死亡？
  -> 单一 owner 可确定：unique_ptr/value + borrow
  -> 多个独立异步参与者必须延长 lifetime：评估 shared_ptr
  -> 只观察且不能延长 lifetime：weak_ptr
```

运行期开销包括引用计数更新、control block、可能的原子操作与释放路径；因此 Embedded hot path 不应把 `shared_ptr` 当默认 pointer。

## ④ C 写法 vs Modern C++（7 分钟）

传统 C 常见做法是全局对象 + 手工 refcount：容易出现增减不配对、并发竞态和隐藏 ownership。

Modern C++ 可以用 `shared_ptr` 明确真正的共同 ownership，并用 `weak_ptr` 表达 non-owning observer。但如果 system owner 的生命周期天然覆盖所有消费者，**value/unique owner + reference borrow 仍然更简单**。

## ⑤ 设计模式映射（8 分钟）

今天最相关的是 **Observer 的 lifetime 边界**，而不是 Observer 本身必须用 `shared_ptr`。

- **变化轴**：diagnostics/UI/telemetry observer 可能独立于 session 暂时存在。
- **稳定边界**：observer 不应强迫 session 永远存活。
- **机制**：`weak_ptr` 可表达“可失效观察”；同步、严格嵌套 lifetime 时引用更简单。
- **DI**：required dependency 仍优先显式注入；不要用 shared global/service locator 隐藏 owner。
- **Pattern 滥用**：为了 callback 方便，把整个对象图改成 `shared_ptr`，会让 teardown 顺序不可推理。

runtime polymorphism 与 shared ownership 是两个独立维度。若实现集合编译期固定，template/concept 仍可能比 virtual + shared_ptr 更适合 Embedded。

## ⑥ Embedded / System Design 场景（6 分钟）

Modem session 由 connection manager 管理；diagnostics task 允许晚于 session 请求一次状态，但不能阻止 modem shutdown。此时 diagnostics 可以持有 `weak_ptr`，每次使用前 `lock()`；shutdown 后得到 unavailable，而不是 dangling callback。

若 RTOS 中对象 lifetime 本来由静态 task graph 保证，则不要为此引入 shared ownership。实时路径还要审计 control block allocation、atomic refcount、最后一个 owner 的析构线程以及 WCET。

callback teardown 仍遵循：停止事件源 → unsubscribe/cancel → 等待 in-flight callback → 释放 owner。

## ⑦ 今日编码规范（7 分钟）

### MUST：只有真正共同决定 lifetime 时才使用 `shared_ptr`

错误：函数只读一个对象，却按值接收 `shared_ptr<T>`。

推荐：required borrow 使用 `T&` / `const T&`；只有函数确实需要延长 lifetime 时才复制 owner。

### MUST：ownership graph 不得形成 strong cycle

双向关系至少一侧必须是 non-owning（例如 `weak_ptr`），并明确谁负责 teardown。

### SHOULD：实时路径审计 shared ownership 成本

不得假设 refcount 是零成本；评估 allocation、atomic 操作、cache contention 与 final destruction context。

## ⑧ 可编译 Lab / 练习（8 分钟）

### 主 Lab：`weak_ptr` observer

文件：`examples/day-060/main.cpp`

```bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic examples/day-060/main.cpp -o day060
./day060
```

观察：diagnostics 不增加 strong owner；session 销毁后 `lock()` 失败并输出 unavailable。

### Exercise 01：修复 strong ownership cycle

文件：`examples/day-060/exercise-01.cpp`

```bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic examples/day-060/exercise-01.cpp -o day060-ex01
./day060-ex01
```

Starter 可编译运行，但 `Service` 与 `Worker` 互持 `shared_ptr`，退出时析构函数不会执行。Code Review：

1. 先确定真正 owner；
2. 将反向关系改为 `weak_ptr` 或 required borrow；
3. 让输出能够观察两个析构函数执行；
4. 说明为什么不能简单把所有边都改成 `weak_ptr`；
5. 若 worker 是线程，补充 stop/join/callback teardown 顺序。

## ⑨ 3 个常见坑（2 分钟）

1. **shared_ptr everywhere**：使用关系被误建模成 ownership，生命周期图失控。
2. **只靠 weak_ptr 修环**：没有先定义真正 owner，类型虽然不环了，架构仍不清楚。
3. **最后一个 owner 在错误线程释放**：析构可能阻塞、join 或释放硬件，破坏实时预算。

## ⑩ 检查题（2 分钟）

### Q1
`shared_ptr` control block 为什么带来比普通 reference borrow 更高的运行时成本？

### Q2
一个 callback 只需在执行期间访问 `ModemSession`，它是否应该永久保存 `shared_ptr<ModemSession>`？请从 lifetime extension 解释。

### Q3 · 设计题
ConnectionManager、ModemSession、RX worker、Diagnostics observer 四者如何建模 owner/borrow？判断哪些关系适合 value/`unique_ptr`、reference、`weak_ptr` 或真正 `shared_ptr`，并说明 shutdown、线程和 WCET 约束。

## 今日结论

> **`shared_ptr` 不是“更安全的默认指针”，而是昂贵且语义明确的 shared-lifetime 工具；先画 ownership graph，再决定是否真的需要它。**

下一课继续 Chapter 7，深入 `enable_shared_from_this`、异步 callback lifetime 与 shared ownership 的高级陷阱。
