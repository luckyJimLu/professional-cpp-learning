---
day: 41
week: 6
part: II
chapter: 6
chapter_title: Designing for Reuse
title: Reuse Starts with Stable Contracts
status: published
date: 2026-10-07
duration: 60
lab:
  path: examples/day-041/main.cpp
previous: 40
next: 42
topics:
  - reuse-contracts-components
guidelines:
  - explicit-contract
---

# Day 41 · Designing for Reuse：复用从稳定 Contract 开始

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

从“正常输入、空输入、无效超时”三类用例理解复用。相同签名不够，调用者还需要稳定的边界和错误结果。

**前置检查：** 先能解释 [Day 17](day-017-errors-assert-control-flow.md)、[Day 22](day-022-abstraction-stable-interface.md)、[Day 25](day-025-design-doc-contract-prototype.md) 的核心例子；不必先掌握整本教材。

**本课最低完成目标：** 能按下面的步骤说明示例如何得到结果，并独立完成一项小修改；高级模式与平台性能分析可第二遍再读。新增导读和拓展练习不计入原有约 60 分钟安排，可分两次完成。

进入 Chapter 6 · **Designing for Reuse**。今天先建立本章主线：可复用代码不是“把函数放进 utils”，而是让组件拥有清晰职责、最小依赖、稳定 contract 与可替换边界。

建议阅读 Chapter 6 开篇与 reuse/design principles 相关部分，重点思考：一个只在当前 Modem 工程可工作的类，与一个可被 UART、USB、测试替身共同使用的组件，设计上差在哪里？

## ② 昨日复习 3 问（5 分钟）

1. mixin 与 runtime polymorphism 分别适合什么变化时机？
2. 为什么 mixin 不应该隐藏复杂资源 ownership？
3. CRTP/mixin 在嵌入式项目中为什么仍要检查 flash/RAM 成本？

## ③ 核心概念（12 分钟）

### 先用白话建立概念

- **稳定契约**：不同实现都遵守的输入输出约定。
- **复用**：在新场景保持同一语义。

### 跟着本课实验走一遍

1. 正常 packet 进入 sender。
2. 检查 sink 记录长度。
3. 再沿空输入与无效超时分支。
4. 核对错误类别。

先尝试口头预测，再到第⑥节运行。下面原有概念、图示与接口对照用于解释这些步骤，短代码片段不一定能单独编译；完整程序以本课 `main.cpp` 为准。

### 复用的第一条件：依赖稳定抽象

```cpp
class IByteSink {
public:
  virtual ~IByteSink() = default;
  virtual Status Write(std::span<const std::uint8_t> data, std::chrono::milliseconds timeout) = 0;
};
```

上层 PacketSender 不需要知道 UART 寄存器、DMA channel 或 Linux fd。

### 可复用组件应拥有自己的 invariant

```text
PacketSender contract
- 输入 payload 不得为空
- frame 大小有固定上限
- Write 必须显式 timeout
- 不拥有底层 sink
```

contract 越清楚，组件越容易在新环境复用。

### 复用 ≠ 泛化一切

不要一开始就设计“万能 TransportFramework”。先提取真实变化点：数据输出 contract、buffer 上限、timeout、错误模型。过早泛化通常会把平台细节变成公共 API。

### 依赖方向

推荐：

```text
Application -> Reusable Component -> Small Contract <- Platform Adapter
```

而不是：

```text
Reusable Component -> STM32 HAL / RTOS global / Linux fd
```

## ④ C 写法 vs Modern C++（8 分钟）

C 项目常通过 function pointer 做可替换后端：

```c
struct byte_sink {
  int (*write)(void* ctx, const unsigned char* data, size_t size,
               unsigned int timeout_ms);
  void* ctx;
};
```

这是有效的 contract 思维，但类型与 lifetime 约束主要靠约定。

Modern C++ 可把 contract、borrow 与单位表达得更清楚：

```cpp
class PacketSender {
public:
  explicit PacketSender(IByteSink& sink) : sink_(sink) {}

private:
  IByteSink& sink_;  // required non-owning dependency
};
```

重点不是“C++ 比 C 高级”，而是让调用点直接读出 contract 与 lifetime 意图。

## ⑤ 今日编码规范（8 分钟）

### MUST：可复用组件不得偷偷依赖可写全局状态

错误：

```cpp
extern UartDriver g_uart;

class PacketSender {
public:
  Status Send(std::span<const std::uint8_t> data) {
    return g_uart.Write(data, 100);
  }
};
```

推荐：

```cpp
class PacketSender {
public:
  explicit PacketSender(IByteSink& sink) : sink_(sink) {}

private:
  IByteSink& sink_;
};
```

### MUST：阻塞 contract 显式表达 timeout 与单位

错误：

```cpp
Status Send(Data data, int timeout);
```

推荐：

```cpp
Status Send(std::span<const std::uint8_t> data, std::chrono::milliseconds timeout);
```

### SHOULD：公共接口只暴露真正稳定的最小能力

不要为了“以后可能用到”把 DMA、IRQ、fd、RTOS handle 泄漏进通用接口。

这些规则延续规范中的读者优先、显式意图、小接口、避免可写全局状态与阻塞 API 显式 timeout。辅教材明确要求代码可读、意图显式，并优先静态检查。 

## ⑥ 可编译实验 / 练习（15 分钟）

### 第一次做：先运行，再只改一件事

1. 在仓库根目录打开 [`examples/day-041/main.cpp`](../examples/day-041/main.cpp)，先读 `main()`，圈出输入、调用与结果检查。
2. 运行原版，把实际输出和退出状态记下来，再与本节预期对照。无输出也可能成功，必须结合退出码与断言判断。
3. 修改前先写预期；若失败，先读第一条编译错误或失败断言，再回到对应概念，不同时重写多个函数。

**本课小改动：** 为刚好达到容量上限的输入补测试；先根据现有容量约定给出预期。

<details>
<summary>练习提示：卡住时再展开</summary>

把上面的执行步骤当作检查点；保留原版作为对照。若练习故意让编译或断言失败，请只在实验副本操作，解释失败后还原，不把负例混入日常通过用例。不要执行越界、悬空解引用或重复释放来“观察效果”。

</details>

实验：`examples/day-041/main.cpp`

目标：实现一个与具体 UART 无关的 `PacketSender`，通过小型 `IByteSink` contract 同时支持生产 adapter 与测试 fake。

```bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic \
  examples/day-041/main.cpp -o day041
./day041
```

### 修复违规代码

```cpp
UartDriver* g_uart;

class Protocol {
public:
  bool Send(const uint8_t* p, int len) {
    return g_uart->Write(p, len, 1000) == 0;
  }
};
```

要求：

1. 去掉可写全局依赖；
2. 明确 borrow/ownership；
3. 用 `std::span` 表达 buffer；
4. timeout 使用带单位类型；
5. 用项目统一 Status，而不是把所有错误压成 bool。

## ⑦ 3 个常见坑（3 分钟）

1. **把复用理解为复制代码到 common/**：目录位置不会自动产生稳定 contract。
2. **为了通用暴露所有底层能力**：接口越大，平台耦合通常越强。
3. **复用组件自己创建硬件/线程资源**：ownership 和测试边界会迅速变模糊。

## ⑧ 检查题（4 分钟）

### 分层自测：从解释到判断

1. **理解：** 不看代码，用三句话复述本课示例的输入、关键步骤和结果。
2. **应用：** 说明第⑥节小改动的预期，以及实际结果是否符合预期。
3. **辨析：** 复制一段代码到另一个项目算稳定复用吗？

<details>
<summary>辨析题参考答案与通过依据</summary>

只能算代码搬运；若语义、依赖和资源约束不清楚，复制后仍容易出现分叉与错误。

能运行只是第一步。只有能解释本课具体步骤、完成小改动，并说清一个不适用条件，才算完成本次自测；不清楚时回看第③节，不以阅读次数当作掌握证据。

</details>

### 原课检查题

### Q1

为什么 `PacketSender(IByteSink&)` 比内部直接访问 `g_uart` 更容易复用和测试？

### Q2

设计 reusable component 时，为什么“最小稳定 contract”通常比“功能最全接口”更重要？

**答案要点：**依赖注入让平台实现可替换并显式表达 borrow；小 contract 减少耦合、变化传播和测试组合数量。

### 对照现有资料库

- [模式选型工作坊](<../patterns/engineering-workshop.md>)。
- [复用契约章末评审](<../docs/chapter-06-review.md>)。

先完成本课小实验，再查对照资料；专题中的线程、网络、板端或模式不是本课默认前置。以上为本项目已有讲解和工程对照，不冒充标准条文，也不表示所有示例已在目标板验证。

## 下一步

Day 42 继续 Chapter 6，深入 reusable component 的抽象边界、依赖与接口设计。
