---
day: 7
week: 1
part: I
chapter: 2
chapter_title: Professional C++ Basics
title: Week 1 Review - Modem Control Module
duration: 60
status: published

topics:
  - week-review
  - modem-control
  - initialization
  - references
  - pointers
  - enum-class

guidelines:
  - review

lab:
  path: examples/day-007/main.cpp
previous: 6
next: 8
---

# Day 07 · 第一周复盘：Modem 控制模块

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
| `<cstdint>` 固定宽度整数 | **C++11** | 精确宽度类型仅在实现提供对应整数类型时存在。 |
| `std::array` | **C++11** | 固定大小容器。 |
| `std::chrono` | **C++11** | 如 duration、time_point、steady_clock；不是所有 chrono 后增 API 都属于 C++11。 |
| chrono 时长字面量 | **C++14** | 如 `100ms`；需要相应头文件与 `std::chrono_literals`。 |
| `std::span` | **C++20** | 连续序列的非拥有视图；不自动延长底层对象生命周期。 |

版本差异、旧机制与工具链检查见 [C++ 标准来源速查](../docs/cpp-feature-standards.md)。
<!-- cpp-standards:end -->

## ① 今日章节与建议阅读范围（5 分钟）

### 新手起步：先知道今天在解决什么

这是整合课，不是新增语法竞赛。先把命令数据、超时和返回状态串成一条完整调用，再说明每个对象由谁创建和销毁。

**前置检查：** 先能解释 [Day 1](day-001-from-c-to-modern-cpp.md)、[Day 4](day-004-references-parameter-passing.md)、[Day 5](day-005-pointers-nullptr-bounds.md)、[Day 6](day-006-enum-class-state-machine.md) 的核心例子；不必先掌握整本教材。

**本课最低完成目标：** 能按下面的步骤说明示例如何得到结果，并独立完成一项小修改；高级模式与平台性能分析可第二遍再读。新增导读和拓展练习不计入原有约 60 分钟安排，可分两次完成。

回看《Professional C++, Sixth Edition》Chapter 1 已学习内容：程序结构、初始化、`const/constexpr`、引用、指针与 `nullptr`、数组边界、`enum class` 与结构化返回值。

本日不引入大量新语法，而是把这些知识串成一个小型 **Modem 控制模块**。

## ② 昨日复习 3 问（5 分钟）

1. 为什么状态值优先使用 `enum class`，而不是裸 `int`？
2. “必须存在的借用对象”为什么通常更适合引用而不是裸指针？
3. 为什么协议缓冲区接口应同时表达地址和长度？

## ③ 核心概念：从 C 代码迁移到可审查的 C++ 接口（10 分钟）

### 先用白话建立概念

- **契约**：调用前后双方共同遵守的规则。
- **fake**：受控的测试实现。

### 跟着本课实验走一遍

1. 从测试创建 transport。
2. 将它交给 Modem。
3. 发送固定命令。
4. 检查状态及记录的发送长度。

先尝试口头预测，再到第⑥节运行。下面原有概念、图示与接口对照用于解释这些步骤，短代码片段不一定能单独编译；完整程序以本课 `main.cpp` 为准。

本周迁移的重点不是把 `.c` 改成 `.cpp`，而是让**意图进入类型系统**：

- 常量 → `constexpr`
- 可能为空 → 指针
- 必须存在 → 引用
- 状态 → `enum class`
- 缓冲区 → `std::span`
- 多返回值 → 结构体
- 不能隐式转换的单参数构造 → `explicit`

## ④ C 写法 vs 现代 C++（10 分钟）

### C 风格

```c
#define MODEM_READY 1
#define MODEM_ERROR 2

int modem_send(
    void* ctx,
    const unsigned char* data,
    unsigned int len,
    int timeout_ms);
```

问题：

- 状态值没有类型边界；
- `ctx` 的真实类型未知；
- 长度类型和容器脱离；
- timeout 单位只能靠命名约定。

### C++ 风格

```cpp
#include <chrono>
#include <cstdint>
#include <span>

enum class Status {
  kOk,
  kTimeout,
  kInvalidArgument,
};

class ITransport {
public:
  virtual ~ITransport() = default;

  virtual Status Write(std::span<const std::uint8_t> data, std::chrono::milliseconds timeout) = 0;
};
```

## ⑤ 今日编码规范（10 分钟）

### MUST：接口显式表达意图

不要使用 `void*`、裸整数状态和多个语义不明的布尔参数。

### MUST：单位进入类型或名称

优先：

```cpp
std::chrono::milliseconds timeout
```

至少也应写成 `timeout_ms`，不要只写 `timeout`。

### SHOULD：优先静态检查

建议本周实验始终使用：

```bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic main.cpp
```

## ⑥ 周工程：类型安全的 Modem 控制模块（20 分钟）

### 第一次做：先运行，再只改一件事

1. 在仓库根目录打开 [`examples/day-007/main.cpp`](../examples/day-007/main.cpp)，先读 `main()`，圈出输入、调用与结果检查。
2. 运行原版，把实际输出和退出状态记下来，再与本节预期对照。无输出也可能成功，必须结合退出码与断言判断。
3. 修改前先写预期；若失败，先读第一条编译错误或失败断言，再回到对应概念，不同时重写多个函数。

**本课小改动：** 用另一条非空命令替换原命令，预期记录长度随输入变化；不要把固定长度硬编码在 fake 中。

<details>
<summary>练习提示：卡住时再展开</summary>

把上面的执行步骤当作检查点；保留原版作为对照。若练习故意让编译或断言失败，请只在实验副本操作，解释失败后还原，不把负例混入日常通过用例。不要执行越界、悬空解引用或重复释放来“观察效果”。

</details>

完整源码：[main.cpp](../examples/day-007/main.cpp)。

```cpp
#include <array>
#include <cassert>
#include <chrono>
#include <cstdint>
#include <span>

using namespace std::chrono_literals;

enum class Status {
  kOk,
  kTimeout,
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
    if (data.empty()) {
      return Status::kInvalidArgument;
    }
    if (timeout <= 0ms) {
      return Status::kTimeout;
    }
    last_size_ = data.size();
    return Status::kOk;
  }

  [[nodiscard]] std::size_t LastSize() const {
    return last_size_;
  }

private:
  std::size_t last_size_{0};
};

class ModemController {
public:
  explicit ModemController(ITransport& transport) : transport_(transport) {}

  Status SendAt(std::span<const std::uint8_t> command, std::chrono::milliseconds timeout) {
    return transport_.Write(command, timeout);
  }

private:
  ITransport& transport_;
};

int main() {
  FakeTransport transport;
  ModemController modem{transport};

  constexpr std::array<std::uint8_t, 4> kAt{0x41, 0x54, 0x0D, 0x0A};

  assert(modem.SendAt(kAt, 100ms) == Status::kOk);
  assert(transport.LastSize() == kAt.size());
}
```

在仓库根目录运行：

```bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic examples/day-007/main.cpp -o /tmp/day-007
/tmp/day-007
```

## ⑦ 3 个常见坑（5 分钟）

1. 把 `enum class` 又强转回裸整数到处传。
2. `std::span` 指向生命周期已经结束的对象。
3. 为“方便”重新引入全局可写状态。

## ⑧ 检查题（5 分钟）

### 分层自测：从解释到判断

1. **理解：** 不看代码，用三句话复述本课示例的输入、关键步骤和结果。
2. **应用：** 说明第⑥节小改动的预期，以及实际结果是否符合预期。
3. **辨析：** 不接真实串口的测试有什么用，又证明不了什么？

<details>
<summary>辨析题参考答案与通过依据</summary>

能验证调用与错误处理逻辑；不能证明真实驱动、硬件时序或线上的数据一定正确。

能运行只是第一步。只有能解释本课具体步骤、完成小改动，并说清一个不适用条件，才算完成本次自测；不清楚时回看第③节，不以阅读次数当作掌握证据。

</details>

### 原课检查题

1. 为什么 `std::span` 不能解决生命周期本身的问题？
2. `ITransport&` 表达的是所有权还是借用？

**答案要点**：`span` 只携带视图和长度，不延长底层对象生命周期；引用表达 non-owning borrow。

### 对照现有资料库

- [实验环境与工具链边界](<../docs/lab-environments.md>)。
- [类型、借用与错误处理规范](<../guidelines/embedded-cpp-guideline-notes.md>)。

先完成本课小实验，再查对照资料；专题中的线程、网络、板端或模式不是本课默认前置。以上为本项目已有讲解和工程对照，不冒充标准条文，也不表示所有示例已在目标板验证。
