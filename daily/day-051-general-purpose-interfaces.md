---
day: 51
week: 8
part: II
chapter: 6
chapter_title: Designing for Reuse
title: Design General-Purpose Interfaces
duration: 60
status: published
date: 2026-10-16
topics: [general-purpose-interfaces, policy-mechanism, customization-points, bounded-generality]
patterns: [strategy, dependency-injection]
guidelines: [bounded-customization, explicit-policy, no-hidden-allocation]
lab:
  path: examples/day-051/main.cpp
previous: 50
next: 52
---

# Day 51 · Design General-Purpose Interfaces

> 主教材主线：Chapter 6 · **Designing for Reuse → Design Usable Interfaces → Design General-Purpose Interfaces**。
>
> 今日目标：让接口可以服务一类真实场景，而不是只服务一个调用点；同时避免把“通用”误解为“无限配置”。

## ① 今日章节与建议阅读范围（5 分钟）

### 新手起步：先知道今天在解决什么

把变化分成数值、行为和平台三种。时长适合参数，重试算法可能适合策略，不同设备可能需要适配，不能全部靠 bool 开关拼在一起。

**前置检查：** 先能解释 [Day 26](day-026-tradeoffs-change-stable-boundaries.md)、[Day 42](day-042-use-abstraction-for-reuse.md)、[Day 44](day-044-separate-unrelated-concepts.md)、[Day 48](day-048-design-usable-interfaces.md) 的核心例子；不必先掌握整本教材。

**本课最低完成目标：** 能按下面的步骤说明示例如何得到结果，并独立完成一项小修改；高级模式与平台性能分析可第二遍再读。新增导读和拓展练习不计入原有约 60 分钟安排，可分两次完成。

阅读 Chapter 6 的 **Design General-Purpose Interfaces**。重点思考：

- 哪些需求是稳定 mechanism？
- 哪些差异应成为 customization point？
- 哪些差异只是一次性需求，不值得进入公共 API？
- general-purpose 与 easy-to-use 如何同时成立？

```text
具体需求集合 → 找共同语义 → 固定 mechanism → 暴露有限 variation → 保持 common path 简单
```

## ② 昨日复习 3 问（5 分钟）

1. 为什么 RAII 通常比手工 `Initialize()/Cleanup()` 更容易正确使用？
2. Facade 的价值是什么？什么情况下再包一层 Facade 属于 overengineering？
3. `ModemFacade` 借用 `ModemCore&` 时，销毁顺序为什么属于接口 contract？

## ③ 核心概念与场景对照（23 分钟，含进阶选读）

### 先用白话建立概念

- **机制**：执行操作的方法。
- **策略**：选择行为及限制的规则。

### 跟着本课实验走一遍

1. 找到稳定的单次发送核心。
2. 标出可变 timeout 或策略。
3. 追踪配置如何到达核心。
4. 检查是否出现重复实现。

先尝试口头预测，再到第⑥节运行。下面原有概念、图示与接口对照用于解释这些步骤，短代码片段不一定能单独编译；完整程序以本课 `main.cpp` 为准。

### General-purpose 不等于万能 API

错误方向是不断添加开关：

```cpp
Send(data, size, timeout, retry, priority, trace, async, raw_mode);
```

这会把所有变化压到一个入口，产生 parameter blindness、非法组合和难以界定的 WCET。

更好的设计先区分 **mechanism** 与 **policy**：

```text
mechanism: 怎样可靠地发送 bytes
policy: timeout / retry / priority 如何选择
```

公共 API 应覆盖一类稳定语义；只有真实变化才成为 customization point。

### 通用性的三个层级

1. **值级变化**：timeout、payload、channel → 参数/Options。
2. **行为级变化**：retry/backoff 算法 → Strategy/policy。
3. **平台级变化**：UART/USB/POSIX → Adapter/interface。

不要用同一种机制处理所有变化。

### Embedded 成本

通用性不是免费的：

- runtime virtual：间接调用、vtable、生命周期；
- templates：实例化导致 flash 增长；
- `std::function`：可能引入 type erasure / allocation；
- runtime registry：容量、查找和 teardown 必须有界。

所以 Embedded 的 general-purpose API 必须同时有**功能边界与资源边界**。

### 进阶选读：模式映射

### 变化轴

今天的主要变化轴：**发送 mechanism 稳定，但 retry policy 可能因产品/链路而变化。**

### 稳定边界

```mermaid
classDiagram
  class IByteTransport {
    <<interface>>
    +Write(payload, timeout) Status
  }
  class RetryPolicy {
    +ShouldRetry(status, attempt) bool
  }
  class Sender {
    -IByteTransport& transport_
    +Send(payload, options) Status
  }
  Sender --> IByteTransport : borrow
  Sender --> RetryPolicy : value/policy
```

### Strategy：什么时候值得用？

当 retry/backoff 存在多个真实、独立、可替换算法时，Strategy 是合理边界。

但 Embedded 固件若 policy 在编译时固定，优先考虑 template policy：

```cpp
template <typename RetryPolicy>
class Sender;
```

这避免 runtime ownership 与 virtual dispatch，但要审计 template 实例化数量和 flash。

### 为什么今天不需要 Factory / Observer？

- 没有复杂创建族，不需要 Factory。
- 没有事件广播，不需要 Observer。
- policy 可以 value-owned，不需要 `shared_ptr`。

### Ownership / lifetime

实验采用：

```text
main owns FakeTransport
Sender borrows IByteTransport&
Sender owns RetryPolicy by value
```

先设计 lifetime，再决定 pointer；这里没有共享 ownership，因此 `shared_ptr` 是错误信号。

### 进阶选读：嵌入式与系统场景

Modem middleware 的发送路径：

```text
Protocol
  ↓
BoundedSender
  ↓
IByteTransport
  ↓
UART / USB Adapter
```

产品 A：弱链路允许 3 次 retry；产品 B：实时控制只允许 1 次。

共同 mechanism 是发送；变化的是 retry policy。实时要求：

- `max_attempts` 必须有上限；
- timeout 必须显式；
- retry 总 WCET 可计算；
- 发送路径不动态分配；
- ISR 不直接执行 blocking retry；
- 如果跨 task，排队时间是否计入 deadline 必须定义。

## ④ C 写法 vs Modern C++（7 分钟）

### C：flags + callback 组合

```c
int transport_send(transport_t* transport,
                   const uint8_t* data,
                   size_t size,
                   uint32_t timeout_ms,
                   int retry_count,
                   int flags);
```

### Modern C++：类型化 common path + 有限 policy

```cpp
struct SendOptions {
  std::chrono::milliseconds timeout{500};
  std::uint8_t max_attempts{1};
};

Status Send(std::span<const std::byte> payload, SendOptions options = {});
```

如果 retry 行为真的有多个长期实现，再把它提升成 policy，而不是预先加入十几个 flags。

## ⑤ 今日编码规范（7 分钟）

### MUST：通用接口的 customization point 必须对应真实变化轴

错误：

```cpp
Status Send(Buffer data, int mode, int flags, void* extension);
```

推荐：

```cpp
Status Send(std::span<const std::byte> payload, SendOptions options = {});
```

### MUST：实时路径的“可配置”必须有资源上界

错误：

```cpp
options.max_attempts = user_value;  // 无上限
```

推荐：验证并限制 attempts，使总 timeout/WCET 可审计。

### SHOULD：编译期固定 policy 优先 value/template；不要默认 runtime virtual + shared_ptr

错误：

```cpp
std::shared_ptr<IRetryStrategy> retry_;
```

推荐：若生命周期与变化时机允许，使用 value policy 或 template policy。

这些规则延续规范中的“读者优先、显式意图、优先静态检查、实时路径有界”。

## ⑥ 可编译 Lab / 练习（8 分钟）

### 第一次做：先运行，再只改一件事

1. 在仓库根目录打开 [`examples/day-051/main.cpp`](../examples/day-051/main.cpp)，先读 `main()`，圈出输入、调用与结果检查。
2. 运行原版，把实际输出和退出状态记下来，再与本节预期对照。无输出也可能成功，必须结合退出码与断言判断。
3. 修改前先写预期；若失败，先读第一条编译错误或失败断言，再回到对应概念，不同时重写多个函数。

**本课小改动：** 为两个真实调用场景列出只变化的字段，说明为何一个 Options 就够用或为何确需策略。

<details>
<summary>练习提示：卡住时再展开</summary>

把上面的执行步骤当作检查点；保留原版作为对照。若练习故意让编译或断言失败，请只在实验副本操作，解释失败后还原，不把负例混入日常通过用例。不要执行越界、悬空解引用或重复释放来“观察效果”。

</details>

实验：`examples/day-051/main.cpp`。

目标：

- transport 是 runtime platform boundary；
- retry 是 value-owned policy；
- common path 只有 `Send(payload)`；
- 最大尝试次数编译期有界；
- 无 heap allocation；
- 明确 timeout 与 Status。

```bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic \
  examples/day-051/main.cpp -o day051
./day051
```

### 修复违规代码

```cpp
class UniversalDevice {
public:
  bool Execute(void* data, int len, int mode, int retries, bool async, bool trace,
               void* user_context);
};
```

至少修复：`void*`、有符号 length、magic mode、bool flags、无界 retries、错误原因丢失、purpose 不清、lifetime 不清。然后判断：哪些变化只是 Options，哪些真的值得 Strategy/Adapter。

## ⑦ 3 个常见坑（3 分钟）

1. **为通用而通用**：把未来所有假想变化都变成参数/virtual interface。
2. **runtime polymorphism 默认化**：本来编译期固定的 policy 被做成 heap-owned Strategy，增加 lifetime 与 WCET 成本。
3. **隐藏无界成本**：接口看起来通用，实际 retry、callback、registry 或 allocation 没有上限。

## ⑧ 检查题（2 分钟）

### 分层自测：从解释到判断

1. **理解：** 不看代码，用三句话复述本课示例的输入、关键步骤和结果。
2. **应用：** 说明第⑥节小改动的预期，以及实际结果是否符合预期。
3. **辨析：** general-purpose 是否意味着支持所有未来需求？

<details>
<summary>辨析题参考答案与通过依据</summary>

不是；它服务一类稳定语义，过度泛化会增加无效组合、学习成本和资源风险。

能运行只是第一步。只有能解释本课具体步骤、完成小改动，并说清一个不适用条件，才算完成本次自测；不清楚时回看第③节，不以阅读次数当作掌握证据。

</details>

### 原课检查题

### Q1

为什么 timeout 属于值级变化，而 retry 算法可能属于行为级变化？

### Q2

固定固件构建中，template policy 相比 virtual Strategy 的主要收益和主要风险分别是什么？

### Q3 · 设计题

一个 BSP sensor reader 要支持两个产品：A 使用固定 SPI sensor；B 使用 I2C sensor，host test 还需要 fake。采样周期 1 ms，禁止运行时 heap。

判断应采用 concrete class、Adapter、runtime Strategy/interface、template policy 还是 Factory，并解释：

- 变化轴；
- 稳定边界；
- compile-time vs runtime replacement；
- owner / borrow / teardown；
- flash/RAM/WCET；
- 哪些设计属于 overengineering。

### 对照现有资料库

- [模式选型工作坊](<../patterns/engineering-workshop.md>)。
- [复用契约章末评审](<../docs/chapter-06-review.md>)。

先完成本课小实验，再查对照资料；专题中的线程、网络、板端或模式不是本课默认前置。以上为本项目已有讲解和工程对照，不冒充标准条文，也不表示所有示例已在目标板验证。

### 今日结论
> **General-purpose 的本质不是提供最多选项，而是用最小、稳定的 contract 覆盖一类真实需求，并让 variation 有边界、有成本模型。**

下一课 Day 52 继续 Chapter 6，沿教材顺序讨论 generality 与 ease-of-use 的平衡。
