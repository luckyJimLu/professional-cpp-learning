---
day: 38
week: 6
part: II
chapter: 5
chapter_title: Designing with Classes
title: Hierarchies
duration: 60
status: published
date: 2026-10-01
topics:
  - hierarchies
  - abstract-base-class
  - shallow-hierarchy
  - stable-contract
  - composition
guidelines:
  - keep-hierarchies-shallow
  - stable-base-contract
  - prefer-composition-for-orthogonal-behavior
lab:
  path: examples/day-038/main.cpp
previous: 37
next: 39
---

# Day 38 · Hierarchies：什么时候类层级真正有价值

## ① 今日章节与建议阅读范围（5 分钟）

继续 Chapter 5 · **Designing with Classes**，进入 **Hierarchies**。

过去两天我们先排除了两种常见误区：

- Day 36：has-a 与 is-a 不要混淆；
- Day 37：现实世界中的分类不等于代码中的继承关系。

今天进一步回答：

> 当 hierarchy 确实存在时，怎样让它保持有意义、可替换、可维护，而不是不断长成“继承树迷宫”？

本节重点不是继承语法，而是**层级结构设计**：

- root abstraction 应该提供稳定 contract；
- 中间层只有在增加真实抽象价值时才存在；
- concrete leaf 承担平台/设备差异；
- hierarchy 越深，理解与变更成本越高；
- 横向能力通常更适合 composition，而不是继续增加继承层级。

> 教材主线聚焦类之间的关系及其设计陷阱；下面的 RTOS / Driver 示例属于面向嵌入式场景的工程化延伸。

---

## ② 昨日复习 3 问（5 分钟）

1. 为什么“Modem 和 Sensor 都是 Hardware”不足以证明应该拥有共同基类？
2. 判断候选基类是否有意义时，应先列出哪些内容？
3. 为什么没有可被客户端真正使用的 contract 时，空基类通常只是噪声？

---

## ③ 核心概念（12 分钟）

### 1. 好 hierarchy 的根部是稳定 contract

例如：

```cpp
class ITransport {
 public:
  virtual ~ITransport() = default;

  virtual Status Write(
      std::span<const std::uint8_t> data,
      std::chrono::milliseconds timeout) = 0;
};
```

这个 root abstraction 有明确意义：

> “任何 ITransport 都能在给定 timeout 下发送一段字节。”

调用者可以只依赖 contract，而不用知道底层是 UART、USB CDC 还是测试替身。

---

### 2. Concrete leaf 承担变化

```text
ITransport
├── UartTransport
├── UsbCdcTransport
└── FakeTransport
```

这里每个 leaf 都满足同一个 contract，但实现细节不同。

这类 hierarchy 的价值来自：

- 调用者能够统一使用它们；
- 替换不会改变上层接口；
- 测试替身可参与同一 contract；
- 平台差异留在叶子实现。

---

### 3. 谨慎增加中间层

危险设计：

```text
ITransport
  └── ISerialTransport
       └── IAsyncSerialTransport
            └── IUartLikeTransport
                 └── Stm32UartTransport
```

每一层都要求维护者回答：

- 这一层增加了什么新 contract？
- 哪些客户端真正通过这一层编程？
- 它是否只是为了共享实现？

如果回答不清楚，就不应该存在。

更简单：

```text
ITransport
├── UartTransport
├── UsbCdcTransport
└── FakeTransport
```

---

### 4. 横向能力不一定属于 hierarchy

假设你想给所有 Transport 增加日志。

不要马上：

```text
ITransport
 └── LoggingTransport
      └── UartTransport
```

更灵活的办法是 decorator/composition：

```text
TracingTransport --has-a--> ITransport
```

它对外仍满足 `ITransport`，但日志能力不污染原始类层级。

---

### 5. hierarchy 深度本身不是目标

层级的目的不是展示 OOP 技巧。

真正应该优化的是：

- 调用者理解成本；
- contract 稳定性；
- 变更传播范围；
- 测试可替换性；
- ownership / lifetime 可读性。

---

## ④ C 写法 vs Modern C++（8 分钟）

### C：tag + switch

```c
enum transport_type {
  TRANSPORT_UART,
  TRANSPORT_USB,
};

struct transport {
  enum transport_type type;
};

int transport_write(struct transport* t) {
  switch (t->type) {
    case TRANSPORT_UART:
      return uart_write();
    case TRANSPORT_USB:
      return usb_write();
  }
  return -1;
}
```

优点是结构直接，但随着类型增加，中心 switch 会不断扩大。

### Modern C++：stable contract + concrete leaves

```cpp
class ITransport {
 public:
  virtual ~ITransport() = default;
  virtual Status Write(
      std::span<const std::uint8_t> data,
      std::chrono::milliseconds timeout) = 0;
};
```

叶子类：

```cpp
class UartTransport final : public ITransport {
 public:
  Status Write(
      std::span<const std::uint8_t> data,
      std::chrono::milliseconds timeout) override;
};
```

调用者：

```cpp
Status SendAt(ITransport& transport);
```

关键不是“用了 virtual”，而是：

> dispatch 从中央 type switch 转移到各自实现，同时 root contract 保持稳定。

---

## ⑤ 今日编码规范（8 分钟）

### MUST：基类必须提供真实 contract

错误：

```cpp
class Device {
 public:
  virtual ~Device() = default;
};
```

如果没有可供调用者使用的行为，这个基类可能没有价值。

推荐：

```cpp
class ITransport {
 public:
  virtual ~ITransport() = default;

  virtual Status Write(
      std::span<const std::uint8_t> data,
      std::chrono::milliseconds timeout) = 0;
};
```

### SHOULD：保持 hierarchy 浅

错误方向：

```text
Device
→ CommunicationDevice
→ SerialDevice
→ AsyncSerialDevice
→ UartDevice
→ Stm32UartDevice
```

推荐：

```text
ITransport
├── UartTransport
└── UsbCdcTransport
```

中间抽象只有在它真的提供独立 contract 时才增加。

### SHOULD：正交能力优先 composition

例如 trace、metrics、retry policy 等能力，通常更适合作为：

- wrapper；
- policy；
- member object；
- decorator。

不要为了增加一个横向能力把整个 hierarchy 再复制一层。

---

## ⑥ 可编译实验 / 练习（15 分钟）

实验文件：

```text
examples/day-038/main.cpp
```

实验结构：

```text
                   ITransport
                  /          \
         UartTransport    FakeTransport
                  ^
                  |
        TracingTransport
        (wraps ITransport)
```

这里：

- UartTransport / FakeTransport 是 concrete leaves；
- ModemSession 只借用 ITransport；
- TracingTransport 用 composition 增加横向能力；
- 不建立无意义的中间 inheritance layer；
- 运行路径无 heap allocation。

编译：

```bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic   examples/day-038/main.cpp -o day038
./day038
```

### 规范修复练习

重构：

```cpp
class Device {};
class CommunicationDevice : public Device {};
class SerialDevice : public CommunicationDevice {};
class UartDevice : public SerialDevice {};
class Modem : public UartDevice {};
```

要求：

1. 删除没有真实 contract 的层；
2. 区分 Modem 与 Transport 的关系；
3. 让 UART 成为 `ITransport` 的实现；
4. 让 Modem 组合/借用 `ITransport`；
5. 如果需要 trace，使用 wrapper，而不是增加 `LoggedUartDevice` 层。

---

## ⑦ 3 个常见坑（3 分钟）

1. **把“层级越完整”误认为设计越专业**  
   深度本身不产生价值。

2. **中间基类只为了共享两三个 helper function**  
   这通常是实现复用问题，不一定是类型关系问题。

3. **hierarchy 正确，但 ownership 仍然模糊**  
   多态关系和生命周期关系仍然必须独立设计。

---

## ⑧ 检查题（4 分钟）

### Q1

一个中间基类值得保留，至少应该满足什么条件？

### Q2

为什么 logging / retry / metrics 这类能力常常更适合 composition，而不是再增加一层 inheritance？

**答案要点：**

- 中间基类应提供可独立描述、可被客户端真正依赖的 contract 或 invariant；
- 横向能力通常与“是什么类型”正交，composition 可以避免 hierarchy 爆炸，并能独立替换或组合。

---

## 今日 Code Review 快检

- [ ] root abstraction 有明确 contract
- [ ] 是否存在仅为分类而存在的中间层
- [ ] hierarchy 是否可以进一步变浅
- [ ] concrete leaf 是否承担具体平台差异
- [ ] trace / retry / metrics 是否更适合 composition
- [ ] ownership / borrowing 是否仍然清晰
- [ ] 多态参数没有 object slicing
- [ ] 实时路径没有无界动态分配

---

## 下一步

Day 39 继续 Chapter 5 的 **Multiple Inheritance**：什么时候多个基类代表真实的多个 contract，以及为什么状态型多继承需要格外谨慎。
