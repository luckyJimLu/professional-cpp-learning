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

### 新手起步：先知道今天在解决什么

先确认确实有多个独立 owner，再使用 shared_ptr。访问者很多不等于所有者很多；只需偶尔观察对象的关系可考虑 weak_ptr。

**前置检查：** 先能解释 [Day 31](day-031-ownership-lifetime-resource-boundaries.md)、[Day 56](day-056-memory-management-ownership-raii.md)、[Day 57](day-057-smart-pointers-ownership-transfer.md)、[Day 59](day-059-custom-deleters-non-memory-resources.md) 的核心例子；不必先掌握整本教材。

**本课最低完成目标：** 能按下面的步骤说明示例如何得到结果，并独立完成一项小修改；高级模式与平台性能分析可第二遍再读。新增导读和拓展练习不计入原有约 60 分钟安排，可分两次完成。

继续 Chapter 7 的 smart pointer 内容，重点阅读 `shared_ptr`、`make_shared`、引用计数、`weak_ptr` 与循环引用。阅读时始终区分：**多个使用者** 与 **多个共同 owner** 不是同一件事。

## ② 昨日复习 3 问（5 分钟）

1. custom deleter 为什么能把 `FILE*` / driver handle 变成 RAII owner？
2. RAII 为什么不能自动保证 teardown 发生在正确线程？
3. parser 与 RX worker 都使用 UART 时，为什么不必因此使用 `shared_ptr`？

## ③ 核心概念与场景对照（24 分钟，含进阶选读）

### 先用白话建立概念

- **控制块**：共享所有权计数等管理状态。
- **弱引用**：不延长对象生命周期的观察关系。

### 跟着本课实验走一遍

1. 复制一个 shared_ptr。
2. 观察对象仍存活。
3. 保存 weak_ptr。
4. 释放强 owner。
5. lock 失败时跳过访问。

先尝试口头预测，再到第⑥节运行。下面原有概念、图示与接口对照用于解释这些步骤，短代码片段不一定能单独编译；完整程序以本课 `main.cpp` 为准。

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

### 进阶选读：模式映射

今天最相关的是 **Observer 的 lifetime 边界**，而不是 Observer 本身必须用 `shared_ptr`。

- **变化轴**：diagnostics/UI/telemetry observer 可能独立于 session 暂时存在。
- **稳定边界**：observer 不应强迫 session 永远存活。
- **机制**：`weak_ptr` 可表达“可失效观察”；同步、严格嵌套 lifetime 时引用更简单。
- **DI**：required dependency 仍优先显式注入；不要用 shared global/service locator 隐藏 owner。
- **Pattern 滥用**：为了 callback 方便，把整个对象图改成 `shared_ptr`，会让 teardown 顺序不可推理。

runtime polymorphism 与 shared ownership 是两个独立维度。若实现集合编译期固定，template/concept 仍可能比 virtual + shared_ptr 更适合 Embedded。

### 进阶选读：嵌入式与系统场景

Modem session 由 connection manager 管理；diagnostics task 允许晚于 session 请求一次状态，但不能阻止 modem shutdown。此时 diagnostics 可以持有 `weak_ptr`，每次使用前 `lock()`；shutdown 后得到 unavailable，而不是 dangling callback。

若 RTOS 中对象 lifetime 本来由静态 task graph 保证，则不要为此引入 shared ownership。实时路径还要审计 control block allocation、atomic refcount、最后一个 owner 的析构线程以及 WCET。

callback teardown 仍遵循：停止事件源 → unsubscribe/cancel → 等待 in-flight callback → 释放 owner。

## ④ C 写法 vs Modern C++（7 分钟）

传统 C 常见做法是全局对象 + 手工 refcount：容易出现增减不配对、并发竞态和隐藏 ownership。

Modern C++ 可以用 `shared_ptr` 明确真正的共同 ownership，并用 `weak_ptr` 表达 non-owning observer。但如果 system owner 的生命周期天然覆盖所有消费者，**value/unique owner + reference borrow 仍然更简单**。

## ⑤ 今日编码规范（7 分钟）

### MUST：只有真正共同决定 lifetime 时才使用 `shared_ptr`

错误：函数只读一个对象，却按值接收 `shared_ptr<T>`。

推荐：required borrow 使用 `T&` / `const T&`；只有函数确实需要延长 lifetime 时才复制 owner。

### MUST：ownership graph 不得形成 strong cycle

双向关系至少一侧必须是 non-owning（例如 `weak_ptr`），并明确谁负责 teardown。

### SHOULD：实时路径审计 shared ownership 成本

不得假设 refcount 是零成本；评估 allocation、atomic 操作、cache contention 与 final destruction context。

## ⑥ 可编译 Lab / 练习（8 分钟）

### 第一次做：先运行，再只改一件事

1. 在仓库根目录打开 [`examples/day-060/main.cpp`](../examples/day-060/main.cpp)，先读 `main()`，圈出输入、调用与结果检查。
2. 运行原版，把实际输出和退出状态记下来，再与本节预期对照。无输出也可能成功，必须结合退出码与断言判断。
3. 修改前先写预期；若失败，先读第一条编译错误或失败断言，再回到对应概念，不同时重写多个函数。

**本课小改动：** 在最后一个 strong owner 释放前后分别调用 lock，预期前者成功、后者失败；不要访问已失效裸指针。

<details>
<summary>练习提示：卡住时再展开</summary>

把上面的执行步骤当作检查点；保留原版作为对照。若练习故意让编译或断言失败，请只在实验副本操作，解释失败后还原，不把负例混入日常通过用例。不要执行越界、悬空解引用或重复释放来“观察效果”。

</details>

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

## ⑦ 3 个常见坑（2 分钟）

1. **shared_ptr everywhere**：使用关系被误建模成 ownership，生命周期图失控。
2. **只靠 weak_ptr 修环**：没有先定义真正 owner，类型虽然不环了，架构仍不清楚。
3. **最后一个 owner 在错误线程释放**：析构可能阻塞、join 或释放硬件，破坏实时预算。

## ⑧ 检查题（2 分钟）

### 分层自测：从解释到判断

1. **理解：** 不看代码，用三句话复述本课示例的输入、关键步骤和结果。
2. **应用：** 说明第⑥节小改动的预期，以及实际结果是否符合预期。
3. **辨析：** shared_ptr 是否让它指向的对象自动线程安全？

<details>
<summary>辨析题参考答案与通过依据</summary>

不会；计数管理和对象数据同步是不同问题，共享对象的读写仍需同步策略。

能运行只是第一步。只有能解释本课具体步骤、完成小改动，并说清一个不适用条件，才算完成本次自测；不清楚时回看第③节，不以阅读次数当作掌握证据。

</details>

### 原课检查题

### Q1
`shared_ptr` control block 为什么带来比普通 reference borrow 更高的运行时成本？

### Q2
一个 callback 只需在执行期间访问 `ModemSession`，它是否应该永久保存 `shared_ptr<ModemSession>`？请从 lifetime extension 解释。

### Q3 · 设计题
ConnectionManager、ModemSession、RX worker、Diagnostics observer 四者如何建模 owner/borrow？判断哪些关系适合 value/`unique_ptr`、reference、`weak_ptr` 或真正 `shared_ptr`，并说明 shutdown、线程和 WCET 约束。

### 对照现有资料库

- [所有权与智能指针](<../patterns/ownership-and-smart-pointers.md>)。
- [实验环境与能力边界](<../docs/lab-environments.md>)。
- [异步会话生命周期：进阶阅读](<../frameworks/asio/SESSION_LIFECYCLE.md>)。

先完成本课小实验，再查对照资料；专题中的线程、网络、板端或模式不是本课默认前置。以上为本项目已有讲解和工程对照，不冒充标准条文，也不表示所有示例已在目标板验证。

### 今日结论
> **`shared_ptr` 不是“更安全的默认指针”，而是昂贵且语义明确的 shared-lifetime 工具；先画 ownership graph，再决定是否真的需要它。**

下一课继续 Chapter 7，深入 `enable_shared_from_this`、异步 callback lifetime 与 shared ownership 的高级陷阱。
