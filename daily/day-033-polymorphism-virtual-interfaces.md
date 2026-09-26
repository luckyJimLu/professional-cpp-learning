---
day: 33
week: 5
part: II
chapter: 5
chapter_title: Designing with Classes
title: Polymorphism and Virtual Interfaces
duration: 60
status: published

topics:
  - polymorphism
  - virtual-functions
  - interface-design
  - embedded-cost

guidelines:
  - small-interface
  - virtual-destructor
  - explicit-lifetime
  - avoid-realtime-allocation

lab:
  path: examples/day-033/main.cpp

previous: 32
next: 34
---

# Day 33 · Polymorphism and Virtual Interfaces

## ① 今日章节与建议阅读范围（5 分钟）

继续 Chapter 5 · **Designing with Classes**。

今天只解决一个问题：

> 什么时候值得为了稳定接口使用运行时多态，以及在嵌入式系统里应该为它付出哪些成本？

重点关注：

- virtual function / dynamic dispatch；
- abstract interface；
- virtual destructor；
- interface segregation；
- object lifetime；
- vtable / indirect call 带来的工程成本；
- 什么时候 composition + template/static polymorphism 更合适。

今天不把“virtual”当成高级语法，而把它看成一个**架构边界工具**。

## ② 昨日复习 3 问（5 分钟）

1. 为什么 `ModemSession : public UartTransport` 通常表达了错误的关系？
2. `is-a` 和 `uses-a` 在代码结构上通常分别对应什么？
3. 继承为什么不能自动解决 ownership / lifetime 问题？

建议先口头回答，再继续阅读。

## ③ 核心概念（12 分钟）

### 运行时多态的价值

如果上层只依赖一个稳定 contract，就可以把 UART、USB、测试替身隐藏在接口之后：

```text
            ITransport
           /    |      \
          /     |       \
       UART    USB     Fake
          \     |       /
           \    |      /
            ModemSession
```

`ModemSession` 不需要知道底层 transport 的具体类型，只关心：

```cpp
virtual Status Write(
    std::span<const std::uint8_t> data,
    std::chrono::milliseconds timeout) = 0;
```

这带来的主要收益不是“少写代码”，而是：

- 上层依赖更稳定；
- 更容易替换硬件实现；
- 更容易做 host-side test；
- 编译依赖可以更清晰；
- 平台差异可以集中隔离。

### dynamic dispatch 的代价

运行时多态不是免费抽象。

常见成本包括：

- 每个多态对象通常需要保存 vptr；
- virtual call 通常是间接调用；
- 更难被编译器内联；
- 某些极端实时路径中会影响可预测性；
- hierarchy 设计错误时，维护成本远高于函数调用成本。

因此，不应该得出“嵌入式禁止 virtual”这种绝对结论。

更合理的问题是：

> 这个调用是否处在真正敏感的实时路径？  
> 这个接口是否真的需要运行时替换？  
> 稳定边界带来的工程收益是否大于间接调用成本？

### 抽象基类只表达 contract

一个好的接口类通常：

- 几乎没有状态；
- API 很小；
- 没有硬件寄存器细节；
- 析构函数是 virtual；
- 对 ownership 不做含糊表达。

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

接口的意义是“能够做什么”，而不是“内部怎么做”。

## ④ C 写法 vs Modern C++（8 分钟）

### C 风格：函数指针 + context

```cpp
typedef int (*write_fn)(
    void* context,
    const uint8_t* data,
    size_t size,
    uint32_t timeout_ms);

typedef struct {
  void* context;
  write_fn write;
} transport_t;
```

这种方式完全可以工作，而且在很多底层 C ABI 中依然很合理。

问题在于：

- `context` 类型安全弱；
- callback 与 context 的约束需要人工维护；
- timeout 单位只能靠命名表达；
- 接口扩展后容易形成大结构体；
- lifecycle 约束通常散落在注释里。

### Modern C++：窄接口 + 强类型

```cpp
class ITransport {
 public:
  virtual ~ITransport() = default;

  virtual Status Write(
      std::span<const std::uint8_t> data,
      std::chrono::milliseconds timeout) = 0;
};
```

此时：

- 参数类型表达了边界；
- timeout 带单位；
- 子类必须满足同一 contract；
- fake implementation 可以自然参与测试。

### 不要为了 virtual 而 virtual

如果类型在编译期固定，并且调用位于极端性能敏感路径，可以考虑：

- template；
- policy class；
- CRTP；
- plain composition。

目标不是“全部改成 virtual”，而是为**真正需要运行时替换的边界**使用它。

## ⑤ 今日编码规范（8 分钟）

### MUST：多态基类具有 virtual destructor

如果对象可能通过基类指针或基类引用管理其动态类型行为，基类析构必须明确。

推荐：

```cpp
virtual ~ITransport() = default;
```

### MUST：接口保持小而稳定

不要把这些内容放入通用 transport：

- UART baudrate；
- USB endpoint；
- DMA channel；
- GPIO pin；
- chipset-specific retry。

这些属于具体实现或更高层配置。

### MUST：生命周期必须在接口之外仍然清晰

```cpp
class ModemSession {
 public:
  explicit ModemSession(ITransport& transport) : transport_(transport) {}

 private:
  ITransport& transport_;
};
```

这里是 non-owning reference。

因此 contract 必须明确：

> `transport` 的生命周期必须覆盖 `ModemSession`。

virtual interface 并不会替你解决这个问题。

### SHOULD：实时路径先测量，再拒绝 abstraction

不要凭感觉认为一次 virtual call 一定不可接受。

先定位：

- 调用频率；
- deadline；
- cache 行为；
- 是否能被调度抖动淹没；
- 整条路径的真实热点。

性能优化需要证据。

## ⑥ 可编译实验（15 分钟）

实验文件：

```text
examples/day-033/main.cpp
```

目标：实现一个最小 transport contract，让 `ModemSession` 同时支持真实实现和测试替身。

核心接口：

```cpp
class ITransport {
 public:
  virtual ~ITransport() = default;

  virtual Status Write(
      std::span<const std::uint8_t> data,
      std::chrono::milliseconds timeout) = 0;
};
```

实验要求：

- `ITransport` 使用 virtual destructor；
- `Write()` 参数使用 `std::span`；
- timeout 使用 `std::chrono::milliseconds`；
- `ModemSession` 只依赖 `ITransport&`；
- `FakeTransport` 可以统计调用次数和最后一次写入；
- 不使用 heap allocation；
- 使用 `-Wall -Wextra -Wconversion -Wpedantic` 编译。

### 重构题

把下面接口：

```cpp
bool Send(
    unsigned char* data,
    int size,
    int timeout,
    bool wait,
    bool retry);
```

重构为：

- 输入不可变；
- 长度不使用 signed int；
- timeout 有单位；
- 去掉多个 bool；
- 返回项目统一的 `Status`。

## ⑦ 3 个常见坑（3 分钟）

1. **基类没有 virtual destructor**  
   hierarchy 看起来可用，但通过基类进行销毁时会留下严重隐患。

2. **接口泄漏硬件细节**  
   一旦 `ITransport` 暴露 UART / USB 专属配置，上层就重新和平台耦合。

3. **把运行时多态用到所有地方**  
   稳定边界需要 polymorphism，不代表内部每一个小对象都要 hierarchy。

## ⑧ 检查题（4 分钟）

### Q1

为什么以下接口不够专业？

```cpp
class ITransport {
 public:
  virtual bool Write(uint8_t* data, int size, int timeout) = 0;
};
```

至少指出 4 个问题。

### Q2

以下两个方案什么时候各自更合理？

```text
A. ITransport + virtual dispatch
B. template <typename Transport> ModemSession
```

**答案要点：**

Q1：

- 缺少 virtual destructor；
- 输入不应该是可写裸指针；
- 长度使用 signed int；
- timeout 没有单位；
- bool 错误模型信息过少；
- buffer 边界没有类型化。

Q2：

- 运行时需要替换实现、需要稳定 ABI/测试边界时，A 更自然；
- 类型编译期固定、追求内联和零运行时分派时，B 更自然。

## 下一步

Day 34 继续 Chapter 5，聚焦 **override / final、virtual destructor 的细节，以及 Driver interface 的错误 hierarchy 设计**。
