---
day: 32
week: 5
part: II
chapter: 5
chapter_title: Designing with Classes
title: is-a, Hierarchies and Mixins - When to Inherit
duration: 60
status: published

topics:
  - inheritance
  - is-a
  - mixins
  - hierarchies

guidelines:
  - prefer-composition
  - stable-interface

lab:
  path: examples/day-032/main.cpp
previous: 31
next: 33
---

# Day 32 · is-a、not-a、类层次与 Mixin：什么时候才应该继承

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

不要因为能调用基类函数就建立继承。先问派生对象能否用于所有合法的基类调用，再决定是否存在真正的 is-a。

**前置检查：** 先能解释 [Day 22](day-022-abstraction-stable-interface.md)、[Day 28](day-028-class-invariants-minimal-interface.md)、[Day 30](day-030-composition-object-responsibilities.md) 的核心例子；不必先掌握整本教材。

**本课最低完成目标：** 能按下面的步骤说明示例如何得到结果，并独立完成一项小修改；高级模式与平台性能分析可第二遍再读。新增导读和拓展练习不计入原有约 60 分钟安排，可分两次完成。

继续 Chapter 5 · **Designing with Classes**，聚焦类之间的：

- `is-a`
- `not-a`
- class hierarchy
- inheritance
- mixin classes

今天的判断原则：

> 继承首先表达语义关系，其次才可能带来代码复用。

## ② 昨日复习 3 问（5 分钟）

1. ownership 与 borrowing 的核心区别是什么？
2. required borrow 为什么通常适合引用？
3. RAII 为什么能减少错误路径上的资源泄漏？

## ③ 核心概念（15 分钟）

### 先用白话建立概念

- **is-a**：满足可替换契约的类型关系。
- **has-a**：通过协作组合能力的关系。

### 跟着本课实验走一遍

1. 找到抽象发送契约。
2. 查看具体 transport 实现。
3. 由 Modem 使用该能力。
4. 检查一次成功发送的计数。

先尝试口头预测，再到第⑥节运行。下面原有概念、图示与接口对照用于解释这些步骤，短代码片段不一定能单独编译；完整程序以本课 `main.cpp` 为准。

### 真正的 is-a

如果 `UartTransport` 可以在所有需要 `ITransport` 的地方被使用，它满足接口语义上的替换关系：

```text
ITransport
├── UartTransport
├── UsbTransport
└── FakeTransport
```

### not-a

`ModemSession` **不是** `UartTransport`。

它只是**使用** transport，因此应优先 composition：

```text
ModemSession --uses--> ITransport
```

### 类层次

良好的 hierarchy 应围绕稳定抽象，而不是硬件型号堆叠出深层继承树。

### Mixin

Mixin 可以用于给类型叠加小而正交的能力，但不应成为替代清晰 composition 的技巧。

## ④ C 写法 vs 现代 C++（10 分钟）

### 错误：为了复用 UART 功能而继承

```cpp
class Modem : public UartDriver {
public:
  void SendAt();
};
```

这表达了错误语义：Modem 并不是一种 UART Driver。

### 推荐：组合 + 抽象接口

```cpp
class ModemSession {
public:
  explicit ModemSession(ITransport& transport) : transport_(transport) {}

private:
  ITransport& transport_;
};
```

## ⑤ 今日编码规范（10 分钟）

### MUST：继承必须能解释为 is-a

如果描述更像“uses-a / has-a”，优先 composition。

### SHOULD：基类接口保持小且稳定

不要把 UART 寄存器、DMA 配置、GPIO 细节全塞进通用 Transport。

### MUST：借用生命周期明确

多态接口并不自动解决对象生命周期。

## ⑥ 可编译实验（20 分钟）

### 第一次做：先运行，再只改一件事

1. 在仓库根目录打开 [`examples/day-032/main.cpp`](../examples/day-032/main.cpp)，先读 `main()`，圈出输入、调用与结果检查。
2. 运行原版，把实际输出和退出状态记下来，再与本节预期对照。无输出也可能成功，必须结合退出码与断言判断。
3. 修改前先写预期；若失败，先读第一条编译错误或失败断言，再回到对应概念，不同时重写多个函数。

**本课小改动：** 用一句话解释“Modem 使用 transport”而非“Modem 是 transport”；再列一个成立的接口实现关系。

<details>
<summary>练习提示：卡住时再展开</summary>

把上面的执行步骤当作检查点；保留原版作为对照。若练习故意让编译或断言失败，请只在实验副本操作，解释失败后还原，不把负例混入日常通过用例。不要执行越界、悬空解引用或重复释放来“观察效果”。

</details>

完整源码：[main.cpp](../examples/day-032/main.cpp)。

```cpp
#include <array>
#include <cassert>
#include <chrono>
#include <cstddef>
#include <cstdint>
#include <span>

using namespace std::chrono_literals;

enum class Status {
  kOk,
  kInvalidArgument,
};

class ITransport {
public:
  virtual ~ITransport() = default;

  virtual Status Write(std::span<const std::uint8_t> data, std::chrono::milliseconds timeout) = 0;
};

class FakeTransport final : public ITransport {
public:
  Status Write(std::span<const std::uint8_t> data, std::chrono::milliseconds timeout) override {
    if (data.empty() || timeout <= 0ms) {
      return Status::kInvalidArgument;
    }
    write_count_++;
    return Status::kOk;
  }

  [[nodiscard]] std::size_t WriteCount() const {
    return write_count_;
  }

private:
  std::size_t write_count_{0};
};

class ModemSession {
public:
  explicit ModemSession(ITransport& transport) : transport_(transport) {}

  Status Send(std::span<const std::uint8_t> command, std::chrono::milliseconds timeout) {
    return transport_.Write(command, timeout);
  }

private:
  ITransport& transport_;
};

int main() {
  FakeTransport transport;
  ModemSession modem{transport};

  constexpr std::array<std::uint8_t, 4> kAt{0x41, 0x54, 0x0D, 0x0A};

  assert(modem.Send(kAt, 100ms) == Status::kOk);
  assert(transport.WriteCount() == 1);
}
```

在仓库根目录运行：

```bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic examples/day-032/main.cpp -o /tmp/day-032
/tmp/day-032
```

## ⑦ 3 个常见坑（5 分钟）

1. 把继承当作代码复用工具，而不检查替换关系。
2. 构造深层 hierarchy，使硬件差异渗透到上层。
3. mixin 过度叠加，导致方法来源和状态关系难以追踪。

## ⑧ 检查题（5 分钟）

### 分层自测：从解释到判断

1. **理解：** 不看代码，用三句话复述本课示例的输入、关键步骤和结果。
2. **应用：** 说明第⑥节小改动的预期，以及实际结果是否符合预期。
3. **辨析：** 只是想复用几行实现，可以优先怎么做？

<details>
<summary>辨析题参考答案与通过依据</summary>

优先考虑普通函数或组合；继承应由替换语义支持，不能只为减少重复代码。

能运行只是第一步。只有能解释本课具体步骤、完成小改动，并说清一个不适用条件，才算完成本次自测；不清楚时回看第③节，不以阅读次数当作掌握证据。

</details>

### 原课检查题

1. `ModemSession : public UartTransport` 最大的问题是什么？
2. `FakeTransport : public ITransport` 为什么通常是合理的？

**答案要点**：前者不是自然的 is-a；后者实现相同的 transport contract，可以作为测试替身参与替换。

### 对照现有资料库

- [拥有、借用与对象协作](<../patterns/ownership-and-smart-pointers.md>)。
- [模式选型：先看无模式基线](<../patterns/engineering-workshop.md>)。

先完成本课小实验，再查对照资料；专题中的线程、网络、板端或模式不是本课默认前置。以上为本项目已有讲解和工程对照，不冒充标准条文，也不表示所有示例已在目标板验证。

## 下一步

Day 33 继续 Chapter 5，从类层次进一步学习 **polymorphism、虚函数接口成本与嵌入式取舍**。
