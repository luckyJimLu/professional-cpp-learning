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

## ① 今日章节与建议阅读范围（5 分钟）

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

### Q1

为什么“Modem 和 Sensor 都是硬件设备”不一定足以建立共同基类？

### Q2

判断一个候选基类是否有意义时，最值得先写下什么？

**答案要点：**

- 软件 hierarchy 应围绕客户端真正使用的功能 contract，而不是现实分类；
- 先列出类的 properties、behaviors、invariants，以及调用者是否真的通过该抽象工作。

---

## 下一步

Day 38 继续 Chapter 5 的 **Hierarchies**：什么时候层级本身有价值，以及如何控制层级深度与抽象边界。
