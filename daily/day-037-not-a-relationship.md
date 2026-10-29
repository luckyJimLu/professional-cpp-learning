---
day: 37
week: 6
part: II
chapter: 5
chapter_title: Designing with Classes
title: The Not-a Relationship
duration: 60
status: published
date: 2026-09-30
topics:
  - not-a
  - over-classification
  - functional-relationships
  - hierarchy-design
guidelines:
  - avoid-artificial-hierarchies
  - single-responsibility
  - reader-first
lab:
  path: examples/day-037/main.cpp
previous: 36
next: 38
---

# Day 37 · Not-a：不要把现实世界分类机械搬进代码层次

<!-- cpp-standards:start -->
## 本课涉及的 C++ 标准

以下按正文与配套 `.cpp` 示例中出现的特性标注首次标准化版本，不代表整份程序的最低编译版本。仓库主 Lab 统一使用 C++23。

| 特性 | 首次标准化 | 版本边界 |
| --- | --- | --- |
| 列表初始化 | **C++11** | 包括直接列表初始化；窄化检查及 initializer_list 优先规则须单独注意。 |
| `= default` / `= delete` | **C++11** | 显式默认化与删除函数。 |
| `constexpr` | **C++11** | C++14 放宽函数体限制；C++20 继续扩展可用于常量求值的操作。声明不保证每次调用都在编译期执行。 |
| `enum class` | **C++11** | 有作用域枚举。 |
| `override` / `final` | **C++11** | 用于虚函数覆盖检查、限制覆盖或继承。 |
| `[[nodiscard]]` | **C++17** | 带说明字符串的形式从 C++20 起可用。 |
| `<cstdint>` 固定宽度整数 | **C++11** | 精确宽度类型仅在实现提供对应整数类型时存在。 |
| `std::array` | **C++11** | 固定大小容器。 |
| `std::chrono` | **C++11** | 如 duration、time_point、steady_clock；不是所有 chrono 后增 API 都属于 C++11。 |
| chrono 时长字面量 | **C++14** | 如 `100ms`；需要相应头文件与 `std::chrono_literals`。 |
| `std::span` | **C++20** | 连续序列的非拥有视图；不自动延长底层对象生命周期。 |

版本差异、旧机制与工具链检查见 [C++ 标准来源速查](../docs/cpp-feature-standards.md)。
<!-- cpp-standards:end -->

## ① 今日章节与建议阅读范围（5 分钟）

### 新手起步：先知道今天在解决什么

当两个对象不存在可替换关系时，不要硬凑父子类。例如看门狗和发送器都与设备有关，但职责与失败模式不同。

**前置检查：** 先能解释 [Day 24](day-024-coupling-cohesion-dependencies.md)、[Day 30](day-030-composition-object-responsibilities.md)、[Day 32](day-032-inheritance-is-a-hierarchies-mixins.md) 的核心例子；不必先掌握整本教材。

**本课最低完成目标：** 能按下面的步骤说明示例如何得到结果，并独立完成一项小修改；高级模式与平台性能分析可第二遍再读。新增导读和拓展练习不计入原有约 60 分钟安排，可分两次完成。

继续 Chapter 5 · **Designing with Classes**，对应主教材 **The Not-a Relationship**。

本节核心观点非常工程化：

> 两个概念在现实世界里“有关联”，并不意味着它们在代码中必须存在继承关系。

对象模型应该描述**程序需要的功能关系**，而不是构建百科全书式分类树。

今天重点：

- 识别 not-a；
- 避免 over-classification；
- hierarchy 必须有行为/属性上的实际意义；
- 不要为了“面向对象”而制造基类；
- 在写继承树前先列出各类真正拥有的 properties / behaviors。

---

## ② 昨日复习 3 问（5 分钟）

1. has-a 与 is-a 的核心语义差异是什么？
2. 为什么“复用代码”不是继承的充分理由？
3. composition 以后仍然需要明确哪些 ownership / lifetime 问题？

---

## ③ 核心概念（12 分钟）

### 先用白话建立概念

- **正交职责**：可以独立变化的能力。
- **协作**：通过明确入口共同完成任务。

### 跟着本课实验走一遍

1. 识别 transport 的发送职责。
2. 识别 watchdog 的保活职责。
3. 查看业务如何组合调用。
4. 分别检查计数。

先尝试口头预测，再到第⑥节运行。下面原有概念、图示与接口对照用于解释这些步骤，短代码片段不一定能单独编译；完整程序以本课 `main.cpp` 为准。

### 1. 现实分类 ≠ 软件关系

现实里：

```text
Device
 ├─ Communication Device
 │   └─ Modem
 └─ Input Device
     └─ Keyboard
```

看起来很“合理”。

但如果代码里 `Device` 没有统一的可用 contract，这个 hierarchy 可能没有价值。

### 2. Functional relationship 才是判断标准

在 Modem 软件中真正重要的关系可能是：

```text
ModemSession --uses--> ITransport
ITransport   <|--      UartTransport
ITransport   <|--      UsbTransport
```

而不是：

```text
ElectronicDevice
  └── CommunicationDevice
      └── WirelessDevice
          └── Modem
```

后者可能只是名词分类，没有带来任何稳定行为。

### 3. 空基类是危险信号

```cpp
class CommunicationDevice {
public:
  virtual ~CommunicationDevice() = default;
};
```

如果它：

- 没有真正 contract；
- 没有共享 invariant；
- 派生类几乎全部自己实现；
- 客户端也不通过它工作；

那它很可能只是“为了有基类而有基类”。

### 4. 先列 properties / behaviors

在决定继承前，为每个类写：

```text
Properties:
- ?

Behaviors:
- ?
```

如果基类没有自己的明确职责，应重新审视是否存在真实关系。

---

## ④ C 写法 vs Modern C++（8 分钟）

### C 项目里常见的“类型码 + 大 switch”

```c
enum device_type {
  DEVICE_MODEM,
  DEVICE_SENSOR,
  DEVICE_DISPLAY,
};

struct device {
  enum device_type type;
};
```

这不一定错，但如果只是为了统一“所有设备”而建立总入口，最后很容易产生：

```c
switch (device->type) {
  // 完全不同的行为
}
```

### Modern C++ 也可能犯同样的建模错误

```cpp
class Device {
public:
  virtual ~Device() = default;
};

class Modem : public Device {};
class Sensor : public Device {};
class Display : public Device {};
```

语法更现代，但如果没有共同 contract，设计依然没有价值。

更好的做法是按功能边界拆接口：

```cpp
class ITransport {
public:
  virtual ~ITransport() = default;
  virtual Status Write(...) = 0;
};
```

只让真正满足该能力 contract 的类型参与 hierarchy。

---

## ⑤ 今日编码规范（8 分钟）

### MUST：避免让类型系统表达不存在的关系

错误：

```cpp
class HardwareDevice {};
class Modem : public HardwareDevice {};
```

如果 HardwareDevice 没有任何真实 contract，这只是噪声。

### SHOULD：类保持单一可命名职责

一个抽象应该回答：

> “这个类型向调用者承诺什么？”

如果回答只是：

> “它们在现实世界里都属于硬件。”

通常不够。

### MUST：读者优先

无意义 hierarchy 会迫使维护者理解大量没有行为价值的层级。

删除一个没有 contract 的抽象，往往比再增加一层抽象更专业。

---

## ⑥ 可编译实验 / 练习（15 分钟）

### 第一次做：先运行，再只改一件事

1. 在仓库根目录打开 [`examples/day-037/main.cpp`](../examples/day-037/main.cpp)，先读 `main()`，圈出输入、调用与结果检查。
2. 运行原版，把实际输出和退出状态记下来，再与本节预期对照。无输出也可能成功，必须结合退出码与断言判断。
3. 修改前先写预期；若失败，先读第一条编译错误或失败断言，再回到对应概念，不同时重写多个函数。

**本课小改动：** 改变保活策略时检查是否需要修改发送接口；若两者不相关，应保持独立边界。

<details>
<summary>练习提示：卡住时再展开</summary>

把上面的执行步骤当作检查点；保留原版作为对照。若练习故意让编译或断言失败，请只在实验副本操作，解释失败后还原，不把负例混入日常通过用例。不要执行越界、悬空解引用或重复释放来“观察效果”。

</details>

实验文件：

```text
examples/day-037/main.cpp
```

实验目标：比较“人工大类层级”和“按 capability 建模”。

错误方向：

```text
HardwareDevice
 ├─ Modem
 ├─ Sensor
 └─ Display
```

推荐方向：

```text
ITransport
 ├─ UartTransport
 └─ FakeTransport

ModemSession --uses--> ITransport
```

### 规范修复题

重构下面设计：

```cpp
class Component {
public:
  virtual ~Component() = default;
};

class Modem : public Component {};
class Logger : public Component {};
class Watchdog : public Component {};
```

问题：

1. `Component` 的共同 contract 是什么？
2. 客户端是否真的需要通过 `Component&` 统一使用这些对象？
3. 如果没有，应不应该保留这个 hierarchy？
4. 哪些关系其实是 uses-a / has-a？

---

## ⑦ 3 个常见坑（3 分钟）

1. **把组织架构、产品分类直接映射成继承树**  
   软件需要的是功能关系，不是目录树。

2. **基类什么都不做，却让所有对象都继承它**  
   这只会增加认知与耦合。

3. **看到两个类都有“设备”属性，就强行抽公共父类**  
   相似字段不等于存在稳定抽象。

---

## ⑧ 检查题（4 分钟）

### 分层自测：从解释到判断

1. **理解：** 不看代码，用三句话复述本课示例的输入、关键步骤和结果。
2. **应用：** 说明第⑥节小改动的预期，以及实际结果是否符合预期。
3. **辨析：** 共享同一个业务名词就应继承同一个基类吗？

<details>
<summary>辨析题参考答案与通过依据</summary>

不应；共同词汇不是可替换契约，优先依据职责与依赖关系建模。

能运行只是第一步。只有能解释本课具体步骤、完成小改动，并说清一个不适用条件，才算完成本次自测；不清楚时回看第③节，不以阅读次数当作掌握证据。

</details>

### 原课检查题

### Q1

为什么“Modem 和 Sensor 都是硬件设备”不一定足以建立共同基类？

### Q2

判断一个候选基类是否有意义时，最值得先写下什么？

**答案要点：**

- 软件 hierarchy 应围绕客户端真正使用的功能 contract，而不是现实分类；
- 先列出类的 properties、behaviors、invariants，以及调用者是否真的通过该抽象工作。

---

### 对照现有资料库

- [拥有、借用与对象协作](<../patterns/ownership-and-smart-pointers.md>)。
- [模式选型：先看无模式基线](<../patterns/engineering-workshop.md>)。

先完成本课小实验，再查对照资料；专题中的线程、网络、板端或模式不是本课默认前置。以上为本项目已有讲解和工程对照，不冒充标准条文，也不表示所有示例已在目标板验证。

## 下一步

Day 38 继续 Chapter 5 的 **Hierarchies**：什么时候层级本身有价值，以及如何控制层级深度与抽象边界。
