---
day: 39
week: 6
part: II
chapter: 5
chapter_title: Designing with Classes
title: Multiple Inheritance and Multiple Contracts
duration: 60
status: published
date: 2026-10-05
topics:
  - multiple-inheritance
  - interface-contracts
  - ambiguity
  - composition
  - embedded-design
guidelines:
  - multiple-inheritance-only-for-clear-contracts
  - avoid-stateful-multiple-inheritance
  - prefer-composition-for-implementation-reuse
lab:
  path: examples/day-039/main.cpp
previous: 38
next: 40
---

# Day 39 · Multiple Inheritance：多个基类何时代表真实 contract

## ① 今日章节与建议阅读范围（5 分钟）

继续 Chapter 5 · **Designing with Classes**，沿类层级设计进入 **Multiple Inheritance**。

今天不把多继承当作语法技巧，而是回答工程问题：

> 一个 concrete type 同时满足两个独立 contract 时，是否可以公开继承两个小接口？什么时候应该改用 composition？

建议阅读时重点关注：

- 一个类从多个 base class 继承时表达了什么关系；
- 多个 base 带来的名字冲突、二义性与维护成本；
- interface-like base 与带状态/实现的 base 风险不同；
- hierarchy 是否仍然表达真实 is-a；
- 如果目的只是实现复用，composition 往往更清晰。

嵌入式映射：一个 modem endpoint 可以同时是 `ITransport` 和 `IHealthSource`，但它不应该为了复用 UART buffer、logger、retry helper 而继承一串带状态实现类。

---

## ② 昨日复习 3 问（5 分钟）

1. 一个中间基类值得保留，至少应该提供什么？
2. 为什么 hierarchy 应尽量保持浅？
3. logging、retry、metrics 为什么通常更适合 composition，而不是继续扩展继承树？

---

## ③ 核心概念（12 分钟）

### 1. 多继承首先是“多个 is-a”声明

```cpp
class ITransport {
 public:
  virtual ~ITransport() = default;
  virtual Status Write(std::span<const std::uint8_t> data,
                       std::chrono::milliseconds timeout) = 0;
};

class IHealthSource {
 public:
  virtual ~IHealthSource() = default;
  virtual HealthSnapshot ReadHealth() const = 0;
};

class ModemEndpoint final : public ITransport,
                            public IHealthSource {
  // ...
};
```

这段设计只有在下面两句话都成立时才合理：

```text
ModemEndpoint is-an ITransport
ModemEndpoint is-an IHealthSource
```

调用者可以独立地只依赖其中任一 contract。

### 2. 小而正交的接口比“大一统基类”更清楚

错误方向：

```cpp
class IEverythingDevice {
 public:
  virtual Status Write(...) = 0;
  virtual HealthSnapshot ReadHealth() const = 0;
  virtual void Reset() = 0;
  virtual void DumpDiagnostics() = 0;
};
```

这会强迫不需要全部能力的类型实现无关 API。

如果能力确实独立，可以让客户端分别依赖：

```cpp
void SendCommand(ITransport& transport);
void ReportHealth(const IHealthSource& health_source);
```

### 3. 带状态的多继承风险更高

```cpp
class UartBuffer {
 protected:
  std::array<std::uint8_t, 256> buffer_{};
};

class RetryState {
 protected:
  int retry_count_{0};
};

class Modem : public UartBuffer,
              public RetryState {
};
```

这里继承并没有表达清晰的 is-a，只是在偷用实现。

更好的模型：

```cpp
class Modem {
 private:
  UartBuffer buffer_;
  RetryPolicy retry_policy_;
};
```

状态归属、初始化顺序和生命周期都更直接。

### 4. 名字冲突是设计信号

两个 base 都提供同名成员时：

```cpp
class A {
 public:
  void Reset();
};

class B {
 public:
  void Reset();
};

class C : public A, public B {};
```

调用 `c.Reset()` 会产生二义性。

虽然可以限定：

```cpp
c.A::Reset();
```

但在工程设计中应进一步问：为什么一个对象拥有两个互不协调的 `Reset()` contract？是否应该重命名、拆接口或使用 composition？

### 5. 多继承不解决 ownership

即使一个类实现多个 interface，依赖的所有权仍应单独表达：

```cpp
class ModemEndpoint final : public ITransport,
                            public IHealthSource {
 public:
  explicit ModemEndpoint(UartDriver& uart)
      : uart_(uart) {}

 private:
  UartDriver& uart_;  // borrowed dependency
};
```

继承表达 type relationship；成员表达 dependency / lifetime relationship。

---

## ④ C 写法 vs Modern C++（8 分钟）

### C：多个 capability table

嵌入式 C 中经常把能力拆成函数指针表：

```c
struct transport_ops {
  int (*write)(void* ctx, const unsigned char* data, unsigned int size);
};

struct health_ops {
  int (*read_health)(void* ctx, int* temperature_c);
};
```

同一个对象可以注册两套 capability。

优点是能力边界明确；缺点是 `void*` context、函数表和生命周期约束依赖人工维护。

### Modern C++：多个小 contract

```cpp
class ITransport {
 public:
  virtual ~ITransport() = default;
  virtual Status Write(...) = 0;
};

class IHealthSource {
 public:
  virtual ~IHealthSource() = default;
  virtual HealthSnapshot ReadHealth() const = 0;
};
```

concrete type 同时实现两个 contract，但业务函数仍只接收自己需要的最小接口：

```cpp
Status SendAt(ITransport& transport);
bool IsHealthy(const IHealthSource& source);
```

这比把所有能力塞进一个 `IDevice` 更符合小接口原则。

---

## ⑤ 今日编码规范（8 分钟）

### SHOULD：多继承只用于清晰、独立的小 contract

错误写法：

```cpp
class Modem : public UartDriver,
              public Logger,
              public RetryManager {
};
```

这些大多是 implementation dependency，不是 Modem 的类型身份。

推荐写法：

```cpp
class ModemEndpoint final : public ITransport,
                            public IHealthSource {
 public:
  ModemEndpoint(UartDriver& uart, ILogger& logger)
      : uart_(uart), logger_(logger) {}

 private:
  UartDriver& uart_;
  ILogger& logger_;
};
```

### MUST：不要用继承隐藏 ownership / lifetime

错误写法：

```cpp
class Modem : private UartDriver {
  // 谁拥有 UART 硬件资源？为什么 Modem 是 UartDriver？
};
```

推荐写法：

```cpp
class Modem {
 public:
  explicit Modem(UartDriver& uart) : uart_(uart) {}

 private:
  UartDriver& uart_;
};
```

### SHOULD：出现状态型多继承时优先重新评估 composition

如果多个 base 都有数据成员、初始化约束或资源生命周期，Code Review 默认要求解释为什么 composition 不够。

---

## ⑥ 可编译实验 / 练习（15 分钟）

实验文件：

```text
examples/day-039/main.cpp
```

实验设计：

```text
          ITransport       IHealthSource
               \             /
                \           /
                 ModemEndpoint
                      |
                      | borrows
                      v
                  UartDriver
```

`ModemEndpoint` 同时满足两个独立 contract，但 UART driver 使用 composition/borrowing，不通过实现继承复用。

编译：

```bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic \
  examples/day-039/main.cpp -o day039
./day039
```

### 修复违规代码

把下面代码重构为“小接口多 contract + composition”：

```cpp
class DriverBase {
 protected:
  int error_count_{0};
};

class LoggerBase {
 protected:
  void Log(const char* text);
};

class HealthBase {
 public:
  virtual bool Healthy() const = 0;
};

class Modem : public DriverBase,
              public LoggerBase,
              public HealthBase {
};
```

要求：

1. `HealthBase` 改成职责明确的小接口；
2. logger 改为借用依赖；
3. driver 改为 member object 或借用；
4. 错误计数由真正拥有该状态的对象管理；
5. 不在实时发送路径新增动态分配。

---

## ⑦ 3 个常见坑（3 分钟）

1. **把“能继承”当成“应该继承”**  
   多继承必须对应多个真实 is-a contract，而不是多个可复用实现。

2. **多个 base 各自携带状态和生命周期**  
   初始化、析构、资源归属和名字查找都会变复杂。

3. **用一个巨大 `IDevice` 逃避多接口设计**  
   大接口同样会制造耦合；客户端应依赖自己真正需要的 capability。

---

## ⑧ 检查题（4 分钟）

### Q1

`ModemEndpoint : public ITransport, public IHealthSource` 在什么条件下是合理的？

### Q2

为什么 `Modem : public UartDriver, public Logger` 通常比 `Modem` 持有/借用 `UartDriver` 和 `ILogger` 更差？

**答案要点：**

- 两个 base 必须是独立、稳定、可被客户端分别依赖的真实 contract；
- UART 与 logger 通常是实现依赖而非 Modem 的类型身份，composition 能更明确表达职责、ownership 和 lifetime，并避免状态型多继承复杂度。

---

## 今日 Code Review 快检

- [ ] 每个 base 都能读成真实的 “is-a”
- [ ] base interface 足够小且职责单一
- [ ] 没有仅为共享实现而继承
- [ ] 多个 base 没有隐藏的资源 ownership
- [ ] 名字冲突是否暴露了 contract 设计问题
- [ ] 状态型 base 是否能改成 composition
- [ ] 实时路径没有新增无界动态分配
- [ ] 阻塞 API 仍有显式 timeout

---

## 下一步

Day 40 继续 Chapter 5 的 **Mixin Classes**：把可组合行为与传统运行时多态区分开，并评估 mixin 在嵌入式 C++ 中的收益与约束。
