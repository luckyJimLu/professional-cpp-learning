---
day: 55
week: 8
part: II
chapter: 6
chapter_title: Designing for Reuse
title: Chapter 6 Summary and Engineering Exercises
duration: 60
status: published
date: 2026-10-20
topics: [reuse, abstraction, extensibility, usable-interfaces, solid, review]
patterns: [adapter, dependency-injection, composition]
guidelines: [bounded-resources, explicit-timeout, explicit-dependency]
lab:
  path: examples/day-055/main.cpp
previous: 54
next: 56
---

# Day 55 · Chapter 6 Summary and Engineering Exercises

> **主教材主线**：Chapter 6 · Designing for Reuse → Summary / Exercises。今天不提前进入 Chapter 7；先把本章的 abstraction、reuse、extensibility、usable interface 与 SOLID 收束成一套工程判断流程。

## ① 今日章节与建议阅读范围（5 分钟）

回读 Chapter 6 的 Summary / Exercises，并快速回顾本章已经学习的关键主题：abstraction、代码复用、genericity、extensibility、usable interface、successful abstraction 与 SOLID。

今天阅读时只追踪一个问题：**一个组件为什么值得被复用，它的稳定边界究竟是什么？**

## ② 昨日复习 3 问（5 分钟）

1. SOLID 为什么不等于“所有依赖都做成 virtual interface”？
2. DIP 与 ownership 为什么是两个独立问题？required non-owning dependency 应怎样表达？
3. Fake transport 如果不遵守 production timeout/error contract，会破坏哪条原则，又会制造什么测试风险？

## ③ 核心概念（10 分钟）

Chapter 6 可以压缩成一条工程链：

```text
需求变化
  → 找真实变化轴
  → 找稳定语义
  → 建立最小 contract
  → 选择 composition / template / runtime interface
  → 明确 owner / borrow / lifetime
  → 给资源、timeout、注册和错误设置上界
  → 用测试验证替换实现仍保持 contract
```

可复用性不是“支持最多功能”，而是让调用者依赖的语义稳定。一个 API 即使抽象了 UART/POSIX 差异，如果隐藏了无界 retry、动态分配、线程上下文或销毁顺序，在 Embedded 系统中仍然不是成功的 reusable component。

机制选择要服从变化发生的时间：编译期固定变化优先考虑普通 composition、template/concept；运行期确实需要替换且 contract 稳定时才考虑 virtual interface。两者都要审计 flash、RAM、WCET、测试性和生命周期。

## ④ C 写法 vs Modern C++（7 分钟）

传统 C 风格接口常把多个 contract 拆成彼此独立的 primitive：

```c
int modem_send(void* handle,
               const unsigned char* data,
               size_t len,
               int timeout_ms,
               int retry);
```

风险包括：handle 类型不安全、pointer 与 length 可分离、timeout 无单位、retry 语义模糊、ownership 不清楚。

Modern C++ 更适合让 contract 进入类型：

```cpp
Status Send(std::span<const std::byte> command,
            std::chrono::milliseconds timeout);
```

这里没有因为“现代 C++”就增加 Factory/Builder。`span` 和 `chrono` 已经消除了真实错误空间；保持小接口比堆 Pattern 更重要。

## ⑤ 设计模式映射（8 分钟）

### 变化轴与稳定边界

以 Modem command sender 为例：UART、USB、socket transport 可能变化；“发送一个有界 command，并在 timeout 内得到明确状态”是稳定语义。

- **Adapter**：当 HAL/POSIX/第三方 API 形状确实不同，用 Adapter 把差异停在 transport 边界。
- **Dependency Injection**：required transport 在 composition root 显式注入，调用者不通过 service locator 偷取依赖。
- **Composition**：retry、metrics、logging 若是独立能力，优先组合，不把所有职责塞进一个继承树。
- **不使用 Factory**：若启动时只有一个明确 transport，直接构造最透明。
- **不使用 Strategy**：若 retry policy 没有真实替换需求，不提前制造算法层。

Ownership 设计先于 pointer：composition root owns transport，`CommandSender` 只 borrow `ITransport&`，owner 必须晚于 borrower 销毁。若 callback 被异步保存，则必须进一步规定 unsubscribe、销毁顺序和执行线程；本日同步 Lab 不引入 callback，避免虚构复杂度。

## ⑥ Embedded / System Design 场景（6 分钟）

在 RTOS Modem middleware 中，可复用边界应明确：

- ISR 不进入 blocking transport；只投递有界事件。
- task-context API 显式 timeout，不允许无限等待。
- command/payload 有最大长度；实时路径不做无界增长。
- transport owner 在 middleware borrower 之后销毁。
- Fake 与真实 transport 保持相同 error/timeout contract。
- runtime registration 若确实需要，固定容量并限制在初始化阶段。

这使 HAL 替换、host test 与目标板运行共享同一个业务 contract，同时仍可审计内存和 WCET。

## ⑦ 今日编码规范（7 分钟）

### MUST：资源与时间上界属于公共 contract

错误：

```cpp
bool Send(const void* data, int length, int timeout);
```

推荐：

```cpp
Status Send(std::span<const std::byte> data,
            std::chrono::milliseconds timeout);
```

### MUST：required dependency 显式注入并明确 borrow

错误：从全局 registry/service locator 获取 transport。  
推荐：构造函数接收 `ITransport&`；若拥有依赖则使用值或明确 owner 类型，不因多态默认 `shared_ptr`。

### SHOULD：Pattern 必须对应已识别变化轴

如果普通 value semantics / composition 已经解决问题，不增加 Factory、Strategy 或多层 virtual hierarchy。

## ⑧ 可编译 Lab / 练习（8 分钟）

### 主 Lab：有界 CommandSender

文件：`examples/day-055/main.cpp`

```bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic \
  examples/day-055/main.cpp -o day055
./day055
```

Lab 使用 `std::span`、`std::chrono::milliseconds`、小型 `ITransport` contract 与显式 borrow。观察 transport 收到的字节数、timeout 和最终 status。

### Exercise 01：Code Review 后重构可运行 starter

文件：`examples/day-055/exercise-01.cpp`

```bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic \
  examples/day-055/exercise-01.cpp -o day055-ex01
./day055-ex01
```

Starter 已可独立编译运行，但故意保留工程违规：裸 pointer + length、无单位 `int timeout_ms`、`bool retry`、发送路径动态分配、职责边界不清。

任务：

1. 先运行，记录当前输出；
2. 用 `std::span` 与 `std::chrono` 收紧 contract；
3. 删除发送热路径上的不必要 `std::vector` copy；
4. 判断 retry 是否真的需要 Strategy；若只有一种固定策略，保持简单；
5. 若引入 transport dependency，明确 owner/borrow/lifetime；
6. 重构后保持可观察业务行为，并补 empty/max/max+1/timeout 边界测试。

## ⑨ 3 个常见坑（2 分钟）

1. **把“可复用”理解成“万能”**：参数、模式、插件点越堆越多，contract 反而越不稳定。
2. **先选 Pattern 再找问题**：Factory/Strategy/Observer 没有真实变化轴时只增加 lifetime 与测试负担。
3. **抽象掉关键成本**：隐藏 allocation、retry、blocking 或 callback thread context，使实时预算不可审计。

## ⑩ 检查题（2 分钟）

### Q1
为什么 `std::span + std::chrono` 不只是语法现代化，而是在缩小 API 的非法状态空间？

### Q2
固定产品只在编译期选择 UART 或 USB transport。比较普通 composition、template/concept 和 virtual interface，哪种边界更合适？为什么？

### Q3 · 设计题
一个 Embedded Linux / RTOS 共用的 Modem middleware 需要替换 transport，但 retry 固定、日志可选、callback 由上层注册。请决定哪些地方保持简单、哪些使用 composition/Adapter/DI，以及是否需要 Observer/Strategy。必须说明变化轴、稳定边界、owner/borrow、callback unsubscribe/teardown、线程上下文、timeout、容量和 WCET 上界。

## 今日结论

> **Chapter 6 的核心不是“多做抽象”，而是把真实变化隔离在最小稳定边界内，同时让 lifetime、资源与实时成本保持可见。**

下一课按教材顺序进入 **Chapter 7 · Memory Management**。
