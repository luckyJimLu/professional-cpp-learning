---
day: 33
week: 5
part: II
chapter: 5
chapter_title: Designing with Classes
title: "多态与虚接口"
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

# Day 33 · 多态与虚接口

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

先分清引用的静态类型与对象的实际类型。调用者只见接口，运行时仍可能执行不同实现，前提是契约一致。

**前置检查：** 先能解释 [Day 22](day-022-abstraction-stable-interface.md)、[Day 30](day-030-composition-object-responsibilities.md)、[Day 32](day-032-inheritance-is-a-hierarchies-mixins.md) 的核心例子；不必先掌握整本教材。

**本课最低完成目标：** 能按下面的步骤说明示例如何得到结果，并独立完成一项小修改；高级模式与平台性能分析可第二遍再读。新增导读和拓展练习不计入原有约 60 分钟安排，可分两次完成。

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

### 先用白话建立概念

- **虚函数**：按实际对象类型选择实现的成员函数。
- **动态多态**：通过统一接口调用不同实现。

### 跟着本课实验走一遍

1. 从接口引用发起发送。
2. 定位实际 transport 对象。
3. 查看被调用的覆写。
4. 核对长度和首字节记录。

先尝试口头预测，再到第⑥节运行。下面原有概念、图示与接口对照用于解释这些步骤，短代码片段不一定能单独编译；完整程序以本课 `main.cpp` 为准。

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
virtual Status Write(std::span<const std::uint8_t> data, std::chrono::milliseconds timeout) = 0;
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

  virtual Status Write(std::span<const std::uint8_t> data, std::chrono::milliseconds timeout) = 0;
};
```

接口的意义是“能够做什么”，而不是“内部怎么做”。

## ④ C 写法 vs Modern C++（8 分钟）

### C 风格：函数指针 + context

```cpp
typedef int (*write_fn)(void* context, const uint8_t* data, size_t size, uint32_t timeout_ms);

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

  virtual Status Write(std::span<const std::uint8_t> data, std::chrono::milliseconds timeout) = 0;
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

### 第一次做：先运行，再只改一件事

1. 在仓库根目录打开 [`examples/day-033/main.cpp`](../examples/day-033/main.cpp)，先读 `main()`，圈出输入、调用与结果检查。
2. 运行原版，把实际输出和退出状态记下来，再与本节预期对照。无输出也可能成功，必须结合退出码与断言判断。
3. 修改前先写预期；若失败，先读第一条编译错误或失败断言，再回到对应概念，不同时重写多个函数。

**本课小改动：** 对相同输入分别使用 fake 和现有实现，检查成功、空输入和超时约定，不能只比较函数签名。

<details>
<summary>练习提示：卡住时再展开</summary>

把上面的执行步骤当作检查点；保留原版作为对照。若练习故意让编译或断言失败，请只在实验副本操作，解释失败后还原，不把负例混入日常通过用例。不要执行越界、悬空解引用或重复释放来“观察效果”。

</details>

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

  virtual Status Write(std::span<const std::uint8_t> data, std::chrono::milliseconds timeout) = 0;
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
bool Send(unsigned char* data, int size, int timeout, bool wait, bool retry);
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

### 分层自测：从解释到判断

1. **理解：** 不看代码，用三句话复述本课示例的输入、关键步骤和结果。
2. **应用：** 说明第⑥节小改动的预期，以及实际结果是否符合预期。
3. **辨析：** 多态会自动保证线程安全或无分配吗？

<details>
<summary>辨析题参考答案与通过依据</summary>

不会；它解决实现选择，执行上下文、同步和资源成本仍需单独约定。

能运行只是第一步。只有能解释本课具体步骤、完成小改动，并说清一个不适用条件，才算完成本次自测；不清楚时回看第③节，不以阅读次数当作掌握证据。

</details>

### 原课检查题

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

### 对照现有资料库

- [拥有、借用与对象协作](<../patterns/ownership-and-smart-pointers.md>)。
- [模式选型：先看无模式基线](<../patterns/engineering-workshop.md>)。

先完成本课小实验，再查对照资料；专题中的线程、网络、板端或模式不是本课默认前置。以上为本项目已有讲解和工程对照，不冒充标准条文，也不表示所有示例已在目标板验证。

## 下一步

Day 34 继续 Chapter 5，聚焦 **override / final、virtual destructor 的细节，以及 Driver interface 的错误 hierarchy 设计**。
