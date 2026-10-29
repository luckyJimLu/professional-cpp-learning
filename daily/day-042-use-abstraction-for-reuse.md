---
day: 42
week: 6
part: II
chapter: 6
chapter_title: Designing for Reuse
title: Use Abstraction for Reuse
status: published
date: 2026-10-08
duration: 60
lab:
  path: examples/day-042/main.cpp
previous: 41
next: 43
topics:
  - use-abstraction-for-reuse
guidelines:
  - explicit-contract
---

# Day 42 · Use Abstraction：用接口/实现分离建立可复用边界

<!-- cpp-standards:start -->
## 本课涉及的 C++ 标准

以下按正文与配套 `.cpp` 示例中出现的特性标注首次标准化版本，不代表整份程序的最低编译版本。仓库主 Lab 统一使用 C++23。

| 特性 | 首次标准化 | 版本边界 |
| --- | --- | --- |
| 列表初始化 | **C++11** | 包括直接列表初始化；窄化检查及 initializer_list 优先规则须单独注意。 |
| `= default` / `= delete` | **C++11** | 显式默认化与删除函数。 |
| `constexpr` | **C++11** | C++14 放宽函数体限制；C++20 继续扩展可用于常量求值的操作。声明不保证每次调用都在编译期执行。 |
| `nullptr` | **C++11** | 空指针字面量；不要与整数 0 的类型混为一谈。 |
| `enum class` | **C++11** | 有作用域枚举。 |
| `override` / `final` | **C++11** | 用于虚函数覆盖检查、限制覆盖或继承。 |
| `[[nodiscard]]` | **C++17** | 带说明字符串的形式从 C++20 起可用。 |
| Concepts / `requires` / `<concepts>` | **C++20** | 语言约束与标准库概念；`std::concepts` 不是标准命名空间。 |
| `<cstdint>` 固定宽度整数 | **C++11** | 精确宽度类型仅在实现提供对应整数类型时存在。 |
| `std::array` | **C++11** | 固定大小容器。 |
| `std::chrono` | **C++11** | 如 duration、time_point、steady_clock；不是所有 chrono 后增 API 都属于 C++11。 |
| chrono 时长字面量 | **C++14** | 如 `100ms`；需要相应头文件与 `std::chrono_literals`。 |
| `std::span` | **C++20** | 连续序列的非拥有视图；不自动延长底层对象生命周期。 |

版本差异、旧机制与工具链检查见 [C++ 标准来源速查](../docs/cpp-feature-standards.md)。
<!-- cpp-standards:end -->

## ① 今日章节与建议阅读范围（5 分钟）

### 新手起步：先知道今天在解决什么

先只保留发送字节这一需求，不把 UART 的所有能力都放进抽象。小接口更容易替换，也更容易设计可控测试。

**前置检查：** 先能解释 [Day 22](day-022-abstraction-stable-interface.md)、[Day 30](day-030-composition-object-responsibilities.md)、[Day 33](day-033-polymorphism-virtual-interfaces.md)、[Day 41](day-041-reuse-contracts-components.md) 的核心例子；不必先掌握整本教材。

**本课最低完成目标：** 能按下面的步骤说明示例如何得到结果，并独立完成一项小修改；高级模式与平台性能分析可第二遍再读。新增导读和拓展练习不计入原有约 60 分钟安排，可分两次完成。

继续 Chapter 6 · **Designing for Reuse**，今天进入 **Use Abstraction**。

建议阅读本节，重点观察教材如何把 abstraction 与 reuse 联系起来：调用者应该依赖“能做什么”的稳定接口，而不是“具体怎样做”的实现细节。今天把这一原则落到 Embedded/Modem 场景：协议层不应该知道 UART 寄存器、DMA channel、RTOS queue 或 Linux fd。

今日目标：

- 区分 interface 与 implementation；
- 识别 abstraction leakage；
- 用小 contract 隔离平台变化；
- 理解 abstraction 不等于“到处加 virtual”；
- 保持 ownership、timeout、buffer 边界显式。

## ② 昨日复习 3 问（5 分钟）

1. 为什么 reusable component 不应该直接访问 `g_uart` 之类可写全局状态？
2. `PacketSender(IByteSink&)` 中引用表达了什么 lifetime/ownership 意图？
3. 为什么“功能最全接口”往往比最小稳定 contract 更难复用？

## ③ 核心概念（12 分钟）

### 先用白话建立概念

- **依赖倒置**：业务依赖所需能力而非平台细节。
- **替身**：用于验证接口语义的实现。

### 跟着本课实验走一遍

1. 生产 client 绑定 UART。
2. 测试 client 绑定 fake。
3. 分别发送相同命令。
4. 比较状态和记录。

先尝试口头预测，再到第⑥节运行。下面原有概念、图示与接口对照用于解释这些步骤，短代码片段不一定能单独编译；完整程序以本课 `main.cpp` 为准。

### Abstraction 隔离变化

上层真正需要的是：

```text
发送一段 bytes，并在明确 timeout 内返回统一 Status
```

而不是：

```text
设置 UART DMA channel -> 等待 RTOS semaphore -> 检查 STM32 HAL 状态
```

因此公共边界可以是：

```cpp
class IByteSink {
public:
  virtual ~IByteSink() = default;
  virtual Status Write(std::span<const std::uint8_t> data, std::chrono::milliseconds timeout) = 0;
};
```

平台 adapter 再处理 UART/HAL/Linux 细节。

### Interface 与 implementation 分离

```text
Protocol / PacketSender
        |
        v
     IByteSink          <- stable abstraction
      /    \
     v      v
UartSink   FakeSink     <- changing implementations
```

上层不随 UART HAL、USB、测试 fake 的变化而修改。

### Abstraction leakage

下面虽然有接口，但仍然泄漏平台实现：

```cpp
class IByteSink {
public:
  virtual Status WriteDma(std::uint32_t dma_channel, const std::uint8_t* data,
                          std::size_t size) = 0;
};
```

`dma_channel` 是实现细节；Linux socket 或测试 fake 并不天然拥有它。

更稳定的 contract：

```cpp
virtual Status Write(std::span<const std::uint8_t> data, std::chrono::milliseconds timeout) = 0;
```

### Abstraction 不等于 virtual

如果变化发生在编译期，也可以用 template/concept；如果只是一个拥有固定成员的对象，也可以直接 composition。关键问题是：**公共边界是否隐藏了不该泄漏的实现决策。**

## ④ C 写法 vs Modern C++（8 分钟）

C 中常用 function table 隔离实现：

```c
struct byte_sink_ops {
  int (*write)(void* context,
               const unsigned char* data,
               size_t size,
               unsigned int timeout_ms);
};
```

这是有效的 abstraction，但 buffer、单位、context 类型和 lifetime 多靠约定。

Modern C++ 可以把意图放进类型：

```cpp
Status Write(std::span<const std::uint8_t> data, std::chrono::milliseconds timeout);
```

- `span`：非 owning 连续 buffer view；
- `const`：sink 不修改调用者 payload；
- `milliseconds`：单位显式；
- `Status`：统一错误模型。

Modern C++ 的价值不是把 C function pointer 全部换成 virtual，而是让 contract 更难误用。

## ⑤ 今日编码规范（8 分钟）

### MUST：公共 abstraction 不泄漏平台句柄

错误：

```cpp
class ITransport {
public:
  virtual Status Send(UART_HandleTypeDef* uart, int dma_channel, const std::uint8_t* data,
                      int length) = 0;
};
```

推荐：

```cpp
class IByteSink {
public:
  virtual Status Write(std::span<const std::uint8_t> data, std::chrono::milliseconds timeout) = 0;
};
```

### MUST：借用与所有权必须从接口读出来

错误：

```cpp
PacketSender(IByteSink* sink);
```

如果 `nullptr` 并非合法状态，这个接口制造了不必要分支。

推荐：

```cpp
explicit PacketSender(IByteSink& sink) : sink_(sink) {}
```

### SHOULD：abstraction 保持最小，不预埋猜测性能力

错误：

```cpp
class ITransport {
public:
  virtual void SetDmaChannel(int) = 0;
  virtual void SetIrqPriority(int) = 0;
  virtual void SetLinuxFd(int) = 0;
  virtual Status Write(...) = 0;
};
```

推荐：只保留调用者真正稳定需要的能力；平台配置留给 concrete adapter 的构造/config。

## ⑥ 可编译实验 / 练习（15 分钟）

### 第一次做：先运行，再只改一件事

1. 在仓库根目录打开 [`examples/day-042/main.cpp`](../examples/day-042/main.cpp)，先读 `main()`，圈出输入、调用与结果检查。
2. 运行原版，把实际输出和退出状态记下来，再与本节预期对照。无输出也可能成功，必须结合退出码与断言判断。
3. 修改前先写预期；若失败，先读第一条编译错误或失败断言，再回到对应概念，不同时重写多个函数。

**本课小改动：** 列出接口中哪些方法是 client 真正需要的；不要为了给测试方便而暴露驱动私有句柄。

<details>
<summary>练习提示：卡住时再展开</summary>

把上面的执行步骤当作检查点；保留原版作为对照。若练习故意让编译或断言失败，请只在实验副本操作，解释失败后还原，不把负例混入日常通过用例。不要执行越界、悬空解引用或重复释放来“观察效果”。

</details>

实验：`examples/day-042/main.cpp`

目标：实现一个 `AtCommandClient`，只依赖 `IByteSink` abstraction；同一 client 可接生产风格 `UartSink` 和测试 `FakeSink`，运行路径不需要 heap allocation。

```bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic \
  examples/day-042/main.cpp -o day042
./day042
```

### 修复违规代码

```cpp
class ModemProtocol {
public:
  bool Send(UART_HandleTypeDef* huart, int dma_channel, const uint8_t* data, int length) {
    return HAL_UART_Transmit_DMA(huart, data, length) == 0;
  }
};
```

要求：

1. 去掉协议层的 HAL/DMA 知识；
2. 用小型 byte sink abstraction；
3. 用 `std::span` 表达 buffer；
4. 明确 timeout 单位；
5. 使用统一 `Status`，不把错误压缩成 `bool`；
6. 明确 sink 是 required borrow。

## ⑦ 3 个常见坑（3 分钟）

1. **接口存在就等于 abstraction 做好了**：接口若暴露 DMA/fd/RTOS handle，仍然是 implementation leakage。
2. **为了抽象而抽象**：只有一个稳定实现且没有变化边界时，不必机械增加 virtual 层。
3. **隐藏 ownership**：抽象可以隐藏实现，但不能隐藏谁拥有资源、borrow 活多久。

## ⑧ 检查题（4 分钟）

### 分层自测：从解释到判断

1. **理解：** 不看代码，用三句话复述本课示例的输入、关键步骤和结果。
2. **应用：** 说明第⑥节小改动的预期，以及实际结果是否符合预期。
3. **辨析：** 抽象接口越大，复用场景就越多吗？

<details>
<summary>辨析题参考答案与通过依据</summary>

不一定；大接口让每个实现和调用者承担无关依赖，小而完整的契约通常更稳定。

能运行只是第一步。只有能解释本课具体步骤、完成小改动，并说清一个不适用条件，才算完成本次自测；不清楚时回看第③节，不以阅读次数当作掌握证据。

</details>

### 原课检查题

### Q1

为什么 `Write(span, milliseconds)` 通常比 `WriteDma(channel, ptr, len)` 更适合作为 reusable protocol 的依赖？

### Q2

“Use Abstraction” 是否意味着所有可复用组件都应该使用虚基类？为什么？

**答案要点：**前者描述调用者真正需要的能力并隔离平台细节；abstraction 是接口与实现决策的分离，可由 runtime interface、template/concept 或 composition 实现，并不等于强制 virtual。

### 对照现有资料库

- [模式选型工作坊](<../patterns/engineering-workshop.md>)。
- [复用契约章末评审](<../docs/chapter-06-review.md>)。

先完成本课小实验，再查对照资料；专题中的线程、网络、板端或模式不是本课默认前置。以上为本项目已有讲解和工程对照，不冒充标准条文，也不表示所有示例已在目标板验证。

### 今日 Code Review 快检
- [ ] 公共接口是否泄漏 HAL/RTOS/Linux 平台类型
- [ ] 头文件是否只包含 contract 真正需要的依赖
- [ ] required borrow 是否用引用表达
- [ ] timeout / buffer / hardware 单位是否显式
- [ ] 实时路径是否避免无界动态分配
- [ ] 错误模型是否统一
- [ ] 是否把 `volatile` 错当同步机制
- [ ] 是否存在 magic number
- [ ] 空 buffer、0 timeout、最大长度等边界是否测试

## 下一步

Day 43 继续 Chapter 6 · **Structure Your Code for Optimal Reuse**，学习如何通过职责拆分与依赖方向让 reusable component 保持可组合。
