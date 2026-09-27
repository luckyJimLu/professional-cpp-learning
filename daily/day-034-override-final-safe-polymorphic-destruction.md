---
day: 34
week: 5
part: II
chapter: 5
chapter_title: Designing with Classes
title: override, final and Safe Polymorphic Destruction
duration: 60
status: published
date: 2026-09-27
topics: [override, final, virtual-destructor, driver-interface]
guidelines: [override-explicitly, virtual-destructor, small-interface]
lab:
  path: examples/day-034/main.cpp
previous: 33
next: 35
---

# Day 34 · override、final 与安全的多态析构

## ① 今日章节与建议阅读范围（5 分钟）

继续 Chapter 5 · **Designing with Classes**，承接 Day 33 的运行时多态。今天聚焦：显式覆写、安全析构，以及如何让 Driver hierarchy 在重构时仍由编译器检查契约。

重点：
- 派生类覆写函数显式写 `override`；
- 理解 `final` 对类和虚函数的约束；
- 多态基类的 virtual destructor；
- 借用基类引用与 owning polymorphic handle 的区别；
- 避免签名漂移。

## ② 昨日复习 3 问（5 分钟）

1. 为什么 `ITransport&` + virtual interface 能隔离 UART / USB / Fake 实现？
2. virtual dispatch 在嵌入式中应该评估哪些真实成本？
3. 为什么 virtual interface 不会自动解决 ownership / lifetime？

## ③ 核心概念（12 分钟）

### override 是可静态验证的意图

~~~cpp
class ITransport {
 public:
  virtual ~ITransport() = default;
  virtual Status Write(std::span<const std::uint8_t> data) = 0;
};
~~~

如果派生类误写为：

~~~cpp
Status Write(std::span<std::uint8_t> data) override;
~~~

由于签名不同，编译器会拒绝。于是“我认为这是覆写”不再只是开发者假设。

### final 表达扩展边界终点

~~~cpp
class UartTransport final : public ITransport {
  // concrete leaf implementation
};
~~~

它适合具体叶子实现，不应无差别使用。

### virtual destructor

当对象可能通过基类 owning handle 管理时：

~~~cpp
std::unique_ptr<ITransport> transport =
    std::make_unique<UartTransport>();
~~~

基类应提供：

~~~cpp
virtual ~ITransport() = default;
~~~

### 借用仍然保持简单

~~~cpp
UartTransport uart;
ModemSession modem{uart};
~~~

若 `ModemSession` 只是 non-owning borrower，不要因为使用多态就自动引入 shared ownership。

## ④ C 写法 vs Modern C++（8 分钟）

C 中常用函数表：

~~~c
struct transport_ops {
  int (*write)(void* ctx, const uint8_t* data, size_t size);
  void (*close)(void* ctx);
};
~~~

它适合 C ABI 和底层边界，但 context 类型、函数签名与销毁协议主要靠人工保持一致。

Modern C++ 可以把契约交给类型系统：

~~~cpp
class ITransport {
 public:
  virtual ~ITransport() = default;
  virtual Status Write(
      std::span<const std::uint8_t> data,
      std::chrono::milliseconds timeout) = 0;
};

class UartTransport final : public ITransport {
 public:
  Status Write(
      std::span<const std::uint8_t> data,
      std::chrono::milliseconds timeout) override;
};
~~~

## ⑤ 今日编码规范（8 分钟）

### MUST：所有 virtual override 显式写 override

错误：

~~~cpp
Status Write(std::span<std::uint8_t> data);
~~~

推荐：

~~~cpp
Status Write(
    std::span<const std::uint8_t> data,
    std::chrono::milliseconds timeout) override;
~~~

### MUST：多态基类提供安全析构策略

推荐：

~~~cpp
virtual ~ITransport() = default;
~~~

### SHOULD：没有继续扩展需求的具体 Driver 使用 final

~~~cpp
class UartTransport final : public ITransport {};
~~~

这表达设计边界；性能收益不能靠猜测，仍需测量。

## ⑥ 可编译实验 / 练习（15 分钟）

实验文件：

~~~text
examples/day-034/main.cpp
~~~

结构：

~~~text
ITransport
├── UartTransport
└── FakeTransport

ModemSession --borrows--> ITransport
~~~

要求：
- 基类 virtual destructor；
- 所有覆写函数使用 override；
- 具体实现使用 final；
- ModemSession 只借用 ITransport&；
- 不使用 heap allocation；
- Fake 验证动态分派；
- 开启常用编译告警。

修复下面的违规接口：

~~~cpp
class Driver {
 public:
  virtual bool Send(unsigned char* data, int len) = 0;
  ~Driver() = default;
};

class UartDriver : public Driver {
 public:
  bool Send(const unsigned char* data, int len);
};
~~~

至少检查：析构策略、签名一致性、buffer const/boundary、signed length、错误模型、override、final。

编译：

~~~bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic examples/day-034/main.cpp -o day034
./day034
~~~

## ⑦ 3 个常见坑（3 分钟）

1. 同名函数不一定是 override；参数或限定符变化都可能破坏覆写。
2. 基类有 virtual method，却没有明确析构策略。
3. 为了复用实现继续从具体 Driver 派生，导致 hierarchy 不断加深。

## ⑧ 检查题（4 分钟）

1. 为什么即使“不写也能编译”，团队仍应要求 virtual override 写 `override`？
2. `ITransport` 与 `Stm32UartTransport` 中，哪个通常更适合 `final`？为什么？

**答案要点：** override 能在基类签名变化和重构时发现契约漂移；通常具体平台实现更适合 final，而抽象接口本身就是扩展边界。

## 今日 Code Review 快检

- [ ] 多态基类有明确析构策略
- [ ] 所有覆写函数使用 override
- [ ] 叶子实现是否应 final
- [ ] 接口未泄漏平台细节
- [ ] ownership / borrowing 清楚
- [ ] 实时路径未意外引入动态分配
- [ ] timeout、buffer 长度、错误模型强类型化

## 下一步

Day 35 继续 Chapter 5，聚焦 **object slicing、base reference/pointer、dynamic type 与多态对象生命周期边界**。
