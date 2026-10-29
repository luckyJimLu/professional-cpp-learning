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
| `<cstdint>` 固定宽度整数 | **C++11** | 精确宽度类型仅在实现提供对应整数类型时存在。 |
| `std::array` | **C++11** | 固定大小容器。 |
| 标准智能指针与 `std::make_shared` | **C++11** | `unique_ptr`、`shared_ptr`、`weak_ptr`、`enable_shared_from_this`；不要据此把所有相关辅助函数都标为 C++11。 |
| `std::make_unique` | **C++14** | 晚于 C++11 的 `std::unique_ptr`。 |
| `std::chrono` | **C++11** | 如 duration、time_point、steady_clock；不是所有 chrono 后增 API 都属于 C++11。 |
| `std::span` | **C++20** | 连续序列的非拥有视图；不自动延长底层对象生命周期。 |

版本差异、旧机制与工具链检查见 [C++ 标准来源速查](../docs/cpp-feature-standards.md)。
<!-- cpp-standards:end -->

## ① 今日章节与建议阅读范围（5 分钟）

### 新手起步：先知道今天在解决什么

先理解接口调用，再学习如何防止签名写错。`override` 让编译器检查覆写，`final` 限制扩展，二者不是性能保证。

**前置检查：** 先能解释 [Day 31](day-031-ownership-lifetime-resource-boundaries.md)、[Day 32](day-032-inheritance-is-a-hierarchies-mixins.md)、[Day 33](day-033-polymorphism-virtual-interfaces.md) 的核心例子；不必先掌握整本教材。

**本课最低完成目标：** 能按下面的步骤说明示例如何得到结果，并独立完成一项小修改；高级模式与平台性能分析可第二遍再读。新增导读和拓展练习不计入原有约 60 分钟安排，可分两次完成。

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

### 先用白话建立概念

- **override**：要求匹配基类虚函数。
- **虚析构**：通过基类删除时正确执行派生清理。

### 跟着本课实验走一遍

1. 查看基类析构和虚发送函数。
2. 对照覆写签名。
3. 连续调用成功与失败路径。
4. 核对 fake 的两次记录。

先尝试口头预测，再到第⑥节运行。下面原有概念、图示与接口对照用于解释这些步骤，短代码片段不一定能单独编译；完整程序以本课 `main.cpp` 为准。

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
std::unique_ptr<ITransport> transport = std::make_unique<UartTransport>();
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
  virtual Status Write(std::span<const std::uint8_t> data, std::chrono::milliseconds timeout) = 0;
};

class UartTransport final : public ITransport {
public:
  Status Write(std::span<const std::uint8_t> data, std::chrono::milliseconds timeout) override;
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
Status Write(std::span<const std::uint8_t> data, std::chrono::milliseconds timeout) override;
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

### 第一次做：先运行，再只改一件事

1. 在仓库根目录打开 [`examples/day-034/main.cpp`](../examples/day-034/main.cpp)，先读 `main()`，圈出输入、调用与结果检查。
2. 运行原版，把实际输出和退出状态记下来，再与本节预期对照。无输出也可能成功，必须结合退出码与断言判断。
3. 修改前先写预期；若失败，先读第一条编译错误或失败断言，再回到对应概念，不同时重写多个函数。

**本课小改动：** 在实验副本给覆写函数故意改错参数类型，预期带 `override` 的声明编译失败；还原后再运行。

<details>
<summary>练习提示：卡住时再展开</summary>

把上面的执行步骤当作检查点；保留原版作为对照。若练习故意让编译或断言失败，请只在实验副本操作，解释失败后还原，不把负例混入日常通过用例。不要执行越界、悬空解引用或重复释放来“观察效果”。

</details>

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

### 分层自测：从解释到判断

1. **理解：** 不看代码，用三句话复述本课示例的输入、关键步骤和结果。
2. **应用：** 说明第⑥节小改动的预期，以及实际结果是否符合预期。
3. **辨析：** 基类有一个虚函数就一定有虚析构吗？

<details>
<summary>辨析题参考答案与通过依据</summary>

不一定；若允许经基类指针销毁派生对象，必须明确正确的析构策略。

能运行只是第一步。只有能解释本课具体步骤、完成小改动，并说清一个不适用条件，才算完成本次自测；不清楚时回看第③节，不以阅读次数当作掌握证据。

</details>

### 原课检查题

1. 为什么即使“不写也能编译”，团队仍应要求 virtual override 写 `override`？
2. `ITransport` 与 `Stm32UartTransport` 中，哪个通常更适合 `final`？为什么？

**答案要点：** override 能在基类签名变化和重构时发现契约漂移；通常具体平台实现更适合 final，而抽象接口本身就是扩展边界。

### 对照现有资料库

- [拥有、借用与对象协作](<../patterns/ownership-and-smart-pointers.md>)。
- [模式选型：先看无模式基线](<../patterns/engineering-workshop.md>)。

先完成本课小实验，再查对照资料；专题中的线程、网络、板端或模式不是本课默认前置。以上为本项目已有讲解和工程对照，不冒充标准条文，也不表示所有示例已在目标板验证。

### 今日 Code Review 快检
- [ ] 多态基类有明确析构策略
- [ ] 所有覆写函数使用 override
- [ ] 叶子实现是否应 final
- [ ] 接口未泄漏平台细节
- [ ] ownership / borrowing 清楚
- [ ] 实时路径未意外引入动态分配
- [ ] timeout、buffer 长度、错误模型强类型化

## 下一步

Day 35 继续 Chapter 5，聚焦 **object slicing、base reference/pointer、dynamic type 与多态对象生命周期边界**。
