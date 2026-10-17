---
day: 52
week: 8
part: II
chapter: 6
chapter_title: Designing for Reuse
title: Reconciling Generality and Ease of Use
duration: 60
status: published
date: 2026-10-17
topics: [generality, ease-of-use, layered-api, common-case, expert-interface]
patterns: [facade, adapter, dependency-injection]
guidelines: [safe-defaults, layered-interface, bounded-options]
lab:
  path: examples/day-052/main.cpp
previous: 51
next: 53
---

# Day 52 · Reconciling Generality and Ease of Use

> 主教材主线：Chapter 6 · **Designing for Reuse → Reconciling Generality and Ease of Use**。
>
> 今日目标：理解 reusable API 的核心张力——既要覆盖多种真实用途，又不能把复杂度全部转嫁给调用者。

## ① 今日章节与建议阅读范围（5 分钟）

阅读 Chapter 6 的 **Reconciling Generality and Ease of Use**。

重点观察两个方向：

- **Supply Multiple Interfaces**：为 common case 和 advanced case 提供不同层次的入口；
- **Make Common Functionality Easy to Use**：最常见、最安全的路径应最短。

不要把它理解成“同一个功能写很多重复 API”。真正目标是：

```text
稳定 mechanism
   ↓
高级、完整、显式的底层接口
   ↓
安全默认值 + 受限配置
   ↓
简单、面向常见任务的入口
```

## ② 昨日复习 3 问（5 分钟）

1. Day 51 为什么把 variation 分为值级、行为级和平台级？
2. 固定 firmware 中，为什么 template/value policy 有时比 runtime Strategy 更合适？
3. 一个“通用 API”如果允许无界 retry，会给 WCET 分析带来什么问题？

## ③ 核心概念（10 分钟）

### Generality 和 ease-of-use 的冲突

越通用的接口，往往越需要调用者理解更多选项；越简单的接口，又容易只适配单一场景。

错误的折中是把所有能力压进一个函数：

```cpp
Status Send(std::span<const std::byte> payload,
            int channel,
            int timeout,
            int retries,
            bool trace,
            bool urgent,
            bool raw_mode);
```

这既不真正通用，也不容易使用：调用点必须理解所有 policy，而且大量参数可以组成无意义状态。

### 分层 API

更好的设计通常有两个层次：

```cpp
Status Send(std::span<const std::byte> payload);
Status SendAdvanced(std::span<const std::byte> payload,
                    SendOptions options);
```

common path 使用安全默认值；advanced path 才暴露必要 customization。

### 一份 mechanism，不要复制两套实现

两个入口应该汇聚到同一实现核心：

```text
Send(payload) ───────┐
                     ├─> SendWith(options) -> transport
SendWith(options) ───┘
```

否则“易用 API”和“高级 API”很快产生语义漂移。

### Embedded 中的额外要求

默认值不只是 UX 问题，也是资源 contract：

- 默认 timeout 必须有限；
- 默认 retry 必须有限；
- advanced options 也必须验证上界；
- easy API 不能偷偷做 heap allocation；
- 两个入口必须具有一致的线程安全和错误语义。

## ④ C 写法 vs Modern C++（7 分钟）

### C：flags 驱动的万能入口

```c
int modem_send(modem_t* modem,
               const uint8_t* data,
               size_t len,
               uint32_t timeout_ms,
               unsigned retries,
               unsigned flags);
```

调用者需要知道 flag 位、单位、组合合法性和默认策略。

### Modern C++：common case + typed advanced options

```cpp
struct SendOptions {
  std::chrono::milliseconds timeout{500};
  std::uint8_t max_attempts{1};
  Priority priority{Priority::kNormal};
};

Status Send(std::span<const std::byte> payload);
Status SendWith(std::span<const std::byte> payload,
                SendOptions options);
```

类型系统承担单位和状态表达；common case 不要求调用者理解全部高级配置。

## ⑤ 设计模式映射（8 分钟）

### 变化轴

今天不是 transport 算法本身变化，而是**调用者能力层级不同**：

- 大多数调用者只需要安全默认发送；
- 少数 middleware/diagnostics 需要显式 timeout、attempts、priority。

### 稳定边界

```mermaid
classDiagram
  class IByteTransport {
    <<interface>>
    +Write(payload, timeout) Status
  }
  class Sender {
    +Send(payload) Status
    +SendWith(payload, options) Status
    -IByteTransport& transport_
  }
  Sender --> IByteTransport : borrow
```

### Facade：什么时候有价值？

如果底层 subsystem 已经包含 transport、protocol framing、deadline、retry 等真实复杂度，那么面向 application 的简单入口具有 **Facade** 味道：它隐藏复杂协作，但不隐藏成本边界。

如果底层只有一个 `Write()`，再额外创建 `FacadeManagerService` 没有价值。

### Adapter 与 Dependency Injection

平台变化仍由 Adapter 隔离；`Sender` 显式借用 `IByteTransport&`，避免 service locator。

### 为什么今天不需要 Strategy？

实验只需要有限的 attempts 数值变化，没有多个长期独立 retry 算法。此时 `SendOptions` 足够。只有 retry/backoff 真正成为独立行为变化轴时才升级为 Strategy/policy。

### Ownership / lifetime

```text
main owns FakeTransport
Sender borrows IByteTransport&
SendOptions is a value
```

没有共享所有权，因此不需要 `shared_ptr`。销毁顺序必须保证 transport 晚于 Sender 销毁。

## ⑥ Embedded / System Design 场景（5 分钟）

Modem middleware 可以给 application 两层入口：

```text
Telemetry Task
   │ Send(payload)
   ▼
BoundedSender
   │
   ├── safe default: 200 ms / 1 attempt
   │
Diagnostics Task
   │ SendWith(payload, options)
   ▼
Validated advanced path
   │
IByteTransport
   ▼
UART Adapter
```

必须明确：

- advanced API 不能突破系统 deadline；
- attempts 有编译期/运行期最大值；
- ISR 不调用 blocking send；
- 如果跨 task，queue delay 是否计入 deadline 必须定义；
- tracing 不能改变实时路径的正确性。

## ⑦ 今日编码规范（7 分钟）

### MUST：common case 使用安全、有界默认值

错误：

```cpp
Status Send(Buffer payload, int timeout = -1);  // -1 = forever
```

推荐：

```cpp
Status Send(std::span<const std::byte> payload);
```

内部使用明确、有限的默认 deadline。

### SHOULD：高级能力使用强类型 Options，而不是 bool/primitive 参数堆积

错误：

```cpp
Send(data, 500, 3, true, false, 2);
```

推荐：

```cpp
SendOptions options{
    .timeout = 500ms,
    .max_attempts = 3,
    .priority = Priority::kHigh,
};
SendWith(data, options);
```

### MUST：easy 与 advanced API 汇聚到同一受验证 mechanism

不要维护两套发送、错误处理或 retry 实现；否则 contract 会漂移。

这些规则延续规范的“读者优先、显式表达意图、避免惊讶、可静态检查就不要运行期猜测”。

## ⑧ 可编译 Lab / 练习（8 分钟）

实验：`examples/day-052/main.cpp`。

目标：

- `Send()` 提供 bounded common path；
- `SendWith()` 提供有限高级配置；
- 两者汇聚到一个实现；
- `SendOptions` 使用 chrono + enum class；
- attempts 有上界；
- transport 为 required borrow；
- 无 heap allocation。

```bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic \
  examples/day-052/main.cpp -o day052
./day052
```

### 修复违规代码

```cpp
bool Send(void* transport,
          void* data,
          int length,
          int timeout,
          int retries,
          bool urgent,
          bool trace);
```

至少修复：

- `void*` 类型丢失；
- ownership/lifetime 不清；
- length 有符号；
- timeout 无单位且可能无界；
- retries 无上界；
- bool 参数 blindness；
- `bool` 丢失错误原因；
- common case 被迫理解全部高级选项。

然后回答：这里需要 Strategy 吗？如果 retry 只是次数配置，答案通常是“不需要”。

## ⑨ 3 个常见坑（3 分钟）

1. **两个接口，两套实现**：common/advanced path 行为逐渐不一致。
2. **安全默认值是假象**：简单 API 内部使用无限 timeout、heap 或不可预测 retry。
3. **为了 Pattern 分层**：只有一个简单 operation，却引入 Facade + Factory + Strategy + Manager，增加 lifetime 与测试成本。

## ⑩ 检查题（2 分钟）

### Q1

为什么“提供多个接口”不等于复制多套实现？

### Q2

为什么 Embedded 的默认参数必须同时考虑 API 易用性和 WCET/resource contract？

### Q3 · 设计题

一个 firmware logging subsystem 有两类调用者：

- 90% 代码只需 `Log(message)`；
- diagnostics 需要 severity、deadline、sink selection；
- ISR 只能写固定容量 ring buffer；
- runtime 禁止 heap。

判断应采用：单一万能函数、overload/Options、Facade、Strategy、Adapter 或 compile-time policy。说明：

- 变化轴与稳定边界；
- common vs advanced API；
- owner / borrow / teardown；
- ISR/thread context；
- buffer capacity 与 overflow policy；
- 哪些 Pattern 属于 overengineering。

## 今日结论

> **通用性与易用性不是二选一：让 common case 最短，让 advanced case 显式且有界，并让两者共享同一个稳定 mechanism。**

下一课 Day 53 继续 Chapter 6，沿教材顺序进入 **Designing a Successful Abstraction**。