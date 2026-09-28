---
day: 35
week: 5
part: II
chapter: 5
chapter_title: Designing with Classes
title: Object Slicing, Dynamic Type and Lifetime Boundaries
duration: 60
status: published
date: 2026-09-28
topics:
  - object-slicing
  - dynamic-type
  - base-reference
  - base-pointer
  - polymorphic-lifetime
guidelines:
  - avoid-slicing
  - explicit-lifetime
  - single-owner
  - small-interface
lab:
  path: examples/day-035/main.cpp
previous: 34
next: 36
---

# Day 35 · Object Slicing、Dynamic Type 与多态对象生命周期边界

## ① 今日章节与建议阅读范围（5 分钟）

继续 Chapter 5 · **Designing with Classes**。

Day 33 学了运行时多态，Day 34 学了 `override / final` 与安全析构。今天进一步解决一个常见但隐蔽的问题：

> 为什么把派生对象“按值”传给基类会丢失动态类型信息，以及为什么多态对象通常应该通过 reference / pointer 使用，而不是复制基类值。

重点理解：

- static type 与 dynamic type；
- base reference / base pointer；
- object slicing；
- polymorphic lifetime；
- owning handle 与 non-owning borrow；
- 为什么容器里直接保存 base object 往往会破坏多态语义。

---

## ② 昨日复习 3 问（5 分钟）

1. 为什么所有真正的 virtual override 都应该显式写 `override`？
2. 为什么多态基类通常需要 virtual destructor？
3. `final` 更适合稳定抽象接口，还是具体叶子实现？为什么？

建议先口头回答，再继续。

---

## ③ 核心概念（12 分钟）

### 1. Static type 与 dynamic type

看下面代码：

```cpp
UartTransport uart;
ITransport& transport = uart;
```

这里：

- `transport` 的 **static type** 是 `ITransport&`；
- 实际对象的 **dynamic type** 是 `UartTransport`。

调用 virtual function 时，运行时会根据 dynamic type 选择派生实现。

---

### 2. Base reference / pointer 保留多态语义

```cpp
Status SendCommand(ITransport& transport) {
  // virtual dispatch 保留
}
```

或：

```cpp
Status SendCommand(ITransport* transport) {
  if (transport == nullptr) {
    return Status::kInvalidArgument;
  }
}
```

区别：

- reference：表达 required non-owning dependency；
- pointer：可以表达 optional borrow，但必须定义 `nullptr` 语义。

---

### 3. Object slicing

错误示例：

```cpp
void UseTransport(ITransport transport);
```

如果传入：

```cpp
UartTransport uart;
UseTransport(uart);
```

参数是 **by value**，于是只复制 base subobject。

派生对象额外状态被“切掉”，这就是 **object slicing**。

工程上最危险的地方不是“少复制了一些字段”，而是：

> 代码看起来仍然像在使用多态类型，但动态类型已经丢失。

---

### 4. 容器中的 slicing

下面这种设计通常是错误的：

```cpp
std::array<ITransport, 2> transports;
```

如果 `ITransport` 是抽象类，它甚至不能实例化。

即使基类不是抽象类，按值保存也会让 derived portion 消失。

多态对象容器更常见的是：

```cpp
std::array<ITransport*, 2> transports;
```

或者真正需要 owning polymorphism 时：

```cpp
std::vector<std::unique_ptr<ITransport>> transports;
```

但在嵌入式实时路径中，应优先在初始化阶段建立对象图，避免运行期无界动态分配。

---

### 5. 多态不等于共享所有权

以下代码经常被误用：

```cpp
std::shared_ptr<ITransport>
```

仅仅“需要多态”并不意味着“需要 shared ownership”。

应该分别问：

1. 是否需要运行时多态？
2. 谁拥有对象？
3. 谁只是借用？
4. 生命周期边界在哪里？

这四个问题必须分开回答。

---

## ④ C 写法 vs Modern C++（8 分钟）

### C：void* + 函数表

```c
struct TransportOps {
  int (*write)(void* context,
               const uint8_t* data,
               size_t size,
               uint32_t timeout_ms);
};

struct Transport {
  void* context;
  const struct TransportOps* ops;
};
```

它可以保留运行时动态行为，但生命周期和 context 类型安全主要依靠人工约束。

---

### Modern C++：reference 保留 dynamic type

```cpp
class ITransport {
 public:
  virtual ~ITransport() = default;

  virtual Status Write(
      std::span<const std::uint8_t> data,
      std::chrono::milliseconds timeout) = 0;
};

Status SendCommand(
    ITransport& transport,
    std::span<const std::uint8_t> command,
    std::chrono::milliseconds timeout) {
  return transport.Write(command, timeout);
}
```

这里不会复制 base object，因此不会 slicing。

---

### 错误：按值接收多态基类

```cpp
Status SendCommand(ITransport transport);
```

如果一个类型的核心意义来自 virtual dispatch，就应该高度警惕按值复制。

---

## ⑤ 今日编码规范（8 分钟）

### MUST：多态对象不得无意按值复制

违反规范：

```cpp
void Poll(ITransport transport);
```

推荐：

```cpp
void Poll(ITransport& transport);
```

---

### MUST：借用与拥有分开表达

借用：

```cpp
class ModemSession {
 public:
  explicit ModemSession(ITransport& transport)
      : transport_(transport) {}

 private:
  ITransport& transport_;
};
```

独占所有权：

```cpp
std::unique_ptr<ITransport>
```

共享所有权只有在业务上真的存在共同生命周期时才考虑：

```cpp
std::shared_ptr<ITransport>
```

不要把 `shared_ptr` 当成“不想思考生命周期”的默认答案。

---

### SHOULD：接口保持小

如果一个 base interface 同时负责：

- Write
- GPIO
- DMA
- baudrate
- USB endpoint
- power management
- logging

说明 abstraction 已经过宽。

多态只应该围绕真正稳定的 contract。

---

## ⑥ 可编译实验 / 练习（15 分钟）

实验文件：

```text
examples/day-035/main.cpp
```

目标：

1. 证明通过 `ITransport&` 调用会保留动态分派；
2. 证明对象生命周期由外部 owner 控制；
3. 不使用 heap；
4. 使用强类型 timeout；
5. Fake transport 记录调用结果。

核心结构：

```text
UartTransport / FakeTransport
          │
          └── is-a ──> ITransport
                         ▲
                         │ borrowed reference
                    ModemSession
```

### 规范修复练习

修复下面的设计：

```cpp
class Driver {
 public:
  virtual bool Write(unsigned char* data, int size) {
    return false;
  }
};

class UartDriver : public Driver {
 public:
  bool Write(unsigned char* data, int size) override {
    return true;
  }

 private:
  int baudrate_;
};

void Send(Driver driver) {
  unsigned char data[4]{};
  driver.Write(data, 4);
}
```

至少修复：

- slicing；
- 缺少 virtual destructor；
- mutable buffer；
- signed size；
- bool 错误模型；
- timeout 缺失；
- baudrate 单位不明确；
- ownership / lifetime 契约不清晰。

---

### 编译

```bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic   examples/day-035/main.cpp -o day035

./day035
```

---

## ⑦ 3 个常见坑（3 分钟）

1. **把多态基类按值传参**  
   代码能编译，但 derived portion 被 slicing。

2. **为了避免 slicing，所有东西改成 shared_ptr**  
   解决了一个问题，却引入共享生命周期、引用计数和更复杂的 ownership。

3. **base reference 活得比 derived object 更久**  
   reference 本身不拥有对象，依然可能 dangling。

---

## ⑧ 检查题（4 分钟）

### Q1

为什么下面接口会破坏多态语义？

```cpp
void Process(ITransport transport);
```

### Q2

下面三个成员分别表达什么？

```cpp
ITransport& transport_a_;
ITransport* transport_b_;
std::unique_ptr<ITransport> transport_c_;
```

**答案要点：**

- Q1：参数按值复制 base subobject，导致 object slicing，dynamic type 信息丢失。
- Q2：
  - reference：required non-owning borrow；
  - pointer：通常表示 nullable/optional non-owning borrow，必须定义 nullptr 语义；
  - `unique_ptr`：exclusive ownership。

---

## 今日 Code Review 快检

- [ ] 多态参数是否错误地 by value？
- [ ] base interface 是否有明确析构策略？
- [ ] reference / pointer 是否只是 borrow？
- [ ] owner 是否唯一且清楚？
- [ ] 是否为了方便滥用 shared_ptr？
- [ ] 生命周期是否可能出现 dangling？
- [ ] 实时路径是否意外引入 heap allocation？
- [ ] buffer / timeout / error model 是否强类型化？

---

## 本周复盘触发

Day 35 是第 5 周阶段节点，因此同步生成：

```text
weekly/week-05-review.md
```

本周重点串联 Day 29–35：

- constructor / valid state；
- composition；
- ownership / lifetime；
- inheritance；
- polymorphism；
- override / final；
- object slicing / dynamic type。

---

## 下一步

Day 36 继续 Chapter 5，聚焦 **虚函数调用边界、运行时多态成本、devirtualization 与嵌入式性能取舍**。
