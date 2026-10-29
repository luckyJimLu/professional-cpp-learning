---
day: 54
week: 8
part: II
chapter: 6
chapter_title: Designing for Reuse
title: The SOLID Principles
duration: 60
status: published
date: 2026-10-19
topics: [solid, srp, ocp, lsp, isp, dip, stable-boundaries]
patterns: [adapter, dependency-injection]
guidelines: [small-interface, explicit-dependency, composition-first]
lab:
  path: examples/day-054/main.cpp
previous: 53
next: 55
---

# Day 54 · The SOLID Principles

<!-- cpp-standards:start -->
## 本课涉及的 C++ 标准

以下按正文与配套 `.cpp` 示例中出现的特性标注首次标准化版本，不代表整份程序的最低编译版本。仓库主 Lab 统一使用 C++23。

| 特性 | 首次标准化 | 版本边界 |
| --- | --- | --- |
| 列表初始化 | **C++11** | 包括直接列表初始化；窄化检查及 initializer_list 优先规则须单独注意。 |
| lambda 表达式 | **C++11** | 泛型 lambda（auto 形参）、初始化捕获从 C++14 起可用；显式模板形参列表从 C++20 起可用。 |
| `= default` / `= delete` | **C++11** | 显式默认化与删除函数。 |
| `constexpr` | **C++11** | C++14 放宽函数体限制；C++20 继续扩展可用于常量求值的操作。声明不保证每次调用都在编译期执行。 |
| `enum class` | **C++11** | 有作用域枚举。 |
| `auto` 类型推导 | **C++11** | C++14 才支持普通函数返回类型推导；C++20 才支持 `auto` 形参的简写函数模板。 |
| `override` / `final` | **C++11** | 用于虚函数覆盖检查、限制覆盖或继承。 |
| Concepts / `requires` / `<concepts>` | **C++20** | 语言约束与标准库概念；`std::concepts` 不是标准命名空间。 |
| `std::chrono` | **C++11** | 如 duration、time_point、steady_clock；不是所有 chrono 后增 API 都属于 C++11。 |
| `std::byte` | **C++17** | 字节枚举类型，不是整数算术类型。 |
| `std::span` | **C++20** | 连续序列的非拥有视图；不自动延长底层对象生命周期。 |

版本差异、旧机制与工具链检查见 [C++ 标准来源速查](../docs/cpp-feature-standards.md)。
<!-- cpp-standards:end -->

> **主教材主线**：Chapter 6 · Designing for Reuse → **The SOLID Principles**。  
> **辅线说明**：SOLID 是设计判断工具；Adapter / Dependency Injection 仅用于说明真实变化轴，不把 Pattern 当目标。

## ① 今日章节与建议阅读范围（5 分钟）

### 新手起步：先知道今天在解决什么

先用一个发送模块学习五条原则，不必背缩写后立即造类。每条原则都应回答一种实际修改为何不应影响无关模块。

**前置检查：** 先能解释 [Day 24](day-024-coupling-cohesion-dependencies.md)、[Day 32](day-032-inheritance-is-a-hierarchies-mixins.md)、[Day 42](day-042-use-abstraction-for-reuse.md)、[Day 47](day-047-design-for-extensibility.md)、[Day 53](day-053-designing-successful-abstraction.md) 的核心例子；不必先掌握整本教材。

**本课最低完成目标：** 能按下面的步骤说明示例如何得到结果，并独立完成一项小修改；高级模式与平台性能分析可第二遍再读。新增导读和拓展练习不计入原有约 60 分钟安排，可分两次完成。

阅读 Chapter 6 中 **The SOLID Principles**。重点理解 SRP、OCP、LSP、ISP、DIP 如何帮助建立可复用、可替换且可测试的边界，而不是背诵五个缩写。

建议带着一个问题阅读：**当 Modem middleware 发生需求变化时，哪一种变化应该被哪个边界吸收？**

## ② 昨日复习 3 问（5 分钟）

1. 成功 abstraction 应隐藏 mechanism，但为什么不能隐藏 timeout、capacity、thread context？
2. required non-owning dependency 为什么优先用引用表达？
3. 固件编译期已经固定 transport 时，template/concept 为什么可能比 virtual interface 更合适？

## ③ 核心概念与场景对照（26 分钟，含进阶选读）

### 先用白话建立概念

- **SOLID**：关于职责与依赖边界的五条设计原则。
- **替换契约**：不同实现维持的共同语义。

### 跟着本课实验走一遍

1. 找职责分离对应 SRP。
2. 找扩展点对应 OCP。
3. 比较 fake 失败语义对应 LSP。
4. 核对小接口 ISP 与依赖方向 DIP。

先尝试口头预测，再到第⑥节运行。下面原有概念、图示与接口对照用于解释这些步骤，短代码片段不一定能单独编译；完整程序以本课 `main.cpp` 为准。

SOLID 可以统一理解为：**让不同原因导致的变化，不要穿透同一个不稳定边界。**

- **SRP**：一个模块应围绕一个内聚职责/变化原因。不要把 transport、协议、日志、诊断、存储塞进万能 `Manager`。
- **OCP**：真实扩展点应允许增加实现而少改稳定调用方；不是提前为所有假想需求做插件系统。
- **LSP**：替换实现必须保持 contract。`FakeTransport` 若永不模拟 timeout，就可能让测试误判真实行为。
- **ISP**：调用者只依赖它真正需要的小 contract。application sender 不应被迫依赖 reset/diagnostics。
- **DIP**：高层业务依赖稳定抽象，不直接依赖 UART/POSIX/RTOS mechanism；依赖在 composition root 显式注入。

### 编译期与运行期成本

SOLID 不等于 virtual。运行期替换需要 virtual interface 时，要审计 vtable/间接调用、lifetime 与 teardown；固件配置固定时，template/concept 或普通 composition 可能更简单，但需检查模板实例化导致的 flash 增长。

### 进阶选读：模式映射

### 变化轴

硬件/OS transport 会变化；packet validation 与业务发送语义相对稳定。

### 稳定边界

```mermaid
classDiagram
  class PacketSender {
    +Send(payload, timeout) Status
  }
  class ITransport {
    <<interface>>
    +Write(data, timeout) Status
  }
  class UartTransport
  class FakeTransport
  PacketSender --> ITransport : borrow
  ITransport <|.. UartTransport
  ITransport <|.. FakeTransport
```

这里 **Adapter + Dependency Injection** 支撑 DIP：UART/POSIX 差异由 Adapter 吸收，`PacketSender` 只借用 `ITransport&`。

ISP 则提醒我们不要创建一个 `IModemEverything`，把 Send、Reset、Diagnostics、Storage、Metrics 全塞进去。

今天不需要 Factory：composition root 中对象组装简单，直接构造最清楚。也不需要 Strategy：packet validation 暂无独立算法变化轴。

### Ownership / lifetime

composition root 拥有具体 transport；`PacketSender` 只 borrow。owner 必须晚于 borrower 销毁。不要为了 DIP 使用 `shared_ptr`；依赖倒置与共享所有权是两个问题。

### 进阶选读：嵌入式与系统场景

以 RTOS Modem middleware 为例：

- ISR 只采集/投递最小事件，不调用 blocking sender；
- transport API 必须显式 timeout；
- protocol/parser 与 UART driver 分离，避免一个变化牵动全部代码；
- diagnostics 可以依赖独立 `IDiagnostics`，application 不需要看到它；
- runtime registration 若存在，必须有固定容量与注册阶段；
- Fake 必须保持 production contract，包括 timeout/error semantics。

SOLID 在 Embedded 中的目标不是层数更多，而是让内存、WCET、线程上下文、ownership 和替换成本更可审计。

## ④ C 写法 vs Modern C++（7 分钟）

传统写法容易把平台依赖直接传播到业务层：

```c
int modem_send(void* uart, const uint8_t* data, size_t len, uint32_t timeout_ms);
```

Modern C++ 可以让高层依赖业务 contract：

```cpp
class ITransport {
public:
  virtual ~ITransport() = default;
  virtual Status Write(std::span<const std::byte> data, std::chrono::milliseconds timeout) = 0;
};
```

这不是为了“面向对象”，而是因为 transport 确实是运行期/测试期变化轴。若没有这个变化需求，直接 composition 可能更好。

## ⑤ 今日编码规范（7 分钟）

### MUST：required dependency 显式注入，不用隐藏全局/service locator

错误：

```cpp
Status Send(Packet packet) {
  return GlobalServices::GetTransport().Write(packet);
}
```

推荐：

```cpp
explicit PacketSender(ITransport& transport) : transport_(transport) {}
```

### SHOULD：接口按 caller purpose 拆小

错误：application 被迫依赖包含 reset/diagnostics/storage 的巨大 `IModemService`。  
推荐：按真实 caller 需求建立小 contract；不要为了 ISP 把每个函数都拆成一个 interface。

### MAY：固定固件配置优先评估 static polymorphism

若实现只在编译期变化，可评估 template/concept；但必须检查 flash size、编译时间和 WCET，不假设模板天然零成本。

## ⑥ 可编译 Lab / 练习（8 分钟）

### 第一次做：先运行，再只改一件事

1. 在仓库根目录打开 [`examples/day-054/main.cpp`](../examples/day-054/main.cpp)，先读 `main()`，圈出输入、调用与结果检查。
2. 运行原版，把实际输出和退出状态记下来，再与本节预期对照。无输出也可能成功，必须结合退出码与断言判断。
3. 修改前先写预期；若失败，先读第一条编译错误或失败断言，再回到对应概念，不同时重写多个函数。

**本课小改动：** 选其中一条原则，写出违反前的具体改动成本，再提出最小修复；不要一次重写整套架构。

<details>
<summary>练习提示：卡住时再展开</summary>

把上面的执行步骤当作检查点；保留原版作为对照。若练习故意让编译或断言失败，请只在实验副本操作，解释失败后还原，不把负例混入日常通过用例。不要执行越界、悬空解引用或重复释放来“观察效果”。

</details>

### 主 Lab：DIP + 小接口 + 显式 borrow

文件：`examples/day-054/main.cpp`

```bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic \
  examples/day-054/main.cpp -o day054
./day054
```

预期可观察输出包含发送字节数、timeout 和最终 status。Lab 展示 `PacketSender` 不依赖具体 UART，实现由 composition root 注入。

### Exercise 01：拆解万能 ModemService

文件：`examples/day-054/exercise-01.cpp`

```bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic \
  examples/day-054/exercise-01.cpp -o day054-ex01
./day054-ex01
```

Starter **可直接编译运行**，但 `ModemService` 同时承担发送、信号读取、硬件 reset、diagnostics。任务：

1. 先运行并记录行为；
2. 识别哪些 caller 真正需要哪些能力；
3. 用 composition 和小 contract 重构，优先解决 SRP/ISP；
4. 只有 transport 确实需要替换时才引入 runtime interface；
5. 明确 owner、borrow、teardown 与 timeout；
6. 重构后保持相同可观察业务结果。

不要把五条 SOLID 各造一个 class；目标是减少变化传播，而不是增加类型数量。

## ⑦ 3 个常见坑（3 分钟）

1. **SOLID = virtual everywhere**：把编译期固定关系也做成动态多态，增加 flash、间接调用与 lifetime 复杂度。
2. **DIP = shared_ptr/interface**：依赖抽象并不意味着共享 ownership；borrow 仍应清晰。
3. **ISP 过度拆分**：每个方法一个 interface，导致组装和导航成本超过变化隔离收益。

## ⑧ 检查题（4 分钟）

### 分层自测：从解释到判断

1. **理解：** 不看代码，用三句话复述本课示例的输入、关键步骤和结果。
2. **应用：** 说明第⑥节小改动的预期，以及实际结果是否符合预期。
3. **辨析：** SOLID 是否要求所有类都继承接口？

<details>
<summary>辨析题参考答案与通过依据</summary>

不要求；普通函数、值对象、组合和模板也可以形成清晰边界，机制服从需求。

能运行只是第一步。只有能解释本课具体步骤、完成小改动，并说清一个不适用条件，才算完成本次自测；不清楚时回看第③节，不以阅读次数当作掌握证据。

</details>

### 原课检查题

### Q1
为什么 LSP 在 Embedded Fake/Mock 中同样重要？如果 Fake 永不 timeout，会造成什么测试风险？

### Q2
一个只在编译期选择 SPI/UART 的固件，DIP 是否必须通过 virtual interface 实现？比较 composition、template/concept 与 runtime polymorphism。

### Q3 · 设计题
一个 RTOS Modem 模块同时提供 send、signal query、reset、diagnostics，并有 application、factory test、diagnostics task 三类 caller。判断应保持简单、使用 composition，还是引入 Adapter/Facade/Strategy 等 Pattern。说明变化轴、稳定边界、SRP/ISP/DIP、owner/borrow/teardown、timeout、ISR/task context 与内存/WCET 上界。

### 对照现有资料库

- [模式选型工作坊](<../patterns/engineering-workshop.md>)。
- [复用契约章末评审](<../docs/chapter-06-review.md>)。

先完成本课小实验，再查对照资料；专题中的线程、网络、板端或模式不是本课默认前置。以上为本项目已有讲解和工程对照，不冒充标准条文，也不表示所有示例已在目标板验证。

### 今日结论
> **SOLID 的价值不是增加抽象层，而是让真实变化停在正确边界；在 Embedded 中，这个边界还必须同时守住 lifetime、memory 与 WCET。**

下一课继续 Chapter 6 后续内容，严格按教材顺序推进。
