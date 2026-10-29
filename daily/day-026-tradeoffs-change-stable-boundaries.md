---
day: 26
week: 4
part: II
chapter: 4
chapter_title: "Designing Professional C++ Programs"
title: "设计取舍、变化管理与稳定边界"
duration: 60
status: published
topics:
  - tradeoffs-change-stable-boundaries
guidelines:
  - explicit-contract
lab:
  path: examples/day-026/main.cpp
previous: 25
next: 27
---
# Day 26 · 设计取舍、变化管理与稳定边界

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
| 标准智能指针与 `std::make_shared` | **C++11** | `unique_ptr`、`shared_ptr`、`weak_ptr`、`enable_shared_from_this`；不要据此把所有相关辅助函数都标为 C++11。 |
| `std::chrono` | **C++11** | 如 duration、time_point、steady_clock；不是所有 chrono 后增 API 都属于 C++11。 |
| chrono 时长字面量 | **C++14** | 如 `100ms`；需要相应头文件与 `std::chrono_literals`。 |
| `std::byte` | **C++17** | 字节枚举类型，不是整数算术类型。 |
| `std::span` | **C++20** | 连续序列的非拥有视图；不自动延长底层对象生命周期。 |

版本差异、旧机制与工具链检查见 [C++ 标准来源速查](../docs/cpp-feature-standards.md)。
<!-- cpp-standards:end -->

**Chapter 4：设计取舍、变化管理与稳定边界**

今天继续 Chapter 4。目标不是寻找“永远正确”的架构，而是识别变化轴，把易变实现留在稳定接口之后，并用证据记录设计取舍。

## ① 今日章节与建议阅读范围（5分钟）

### 新手起步：先知道今天在解决什么

先判断变化发生在编译时还是运行时，再选择参数、组合、模板或虚接口。不要只比较语法长短。

**前置检查：** 先能解释 [Day 19](day-019-requirements-architecture-boundaries.md)、[Day 22](day-022-abstraction-stable-interface.md)、[Day 25](day-025-design-doc-contract-prototype.md) 的核心例子；不必先掌握整本教材。

**本课最低完成目标：** 能按下面的步骤说明示例如何得到结果，并独立完成一项小修改；高级模式与平台性能分析可第二遍再读。新增导读和拓展练习不计入原有约 60 分钟安排，可分两次完成。

继续阅读 Chapter 4 · Designing Professional C++ Programs 中关于设计、抽象、复用和设计决策的内容。重点问：哪些需求最可能变化？哪些接口应保持稳定？一次设计决策带来了什么成本？

## ② 昨日复习 3 问（5分钟）

- 为什么接口契约应包含 timeout、容量、错误语义，而不仅是函数名？

- 为什么 buffer 大小应通过测量和约束决定？

- Decision / Evidence / Consequence 分别解决什么问题？

## ③ 核心概念讲解（15分钟）

### 先用白话建立概念

- **变化轴**：可能独立变化的一类需求。
- **取舍**：收益与代价的共同选择。

### 跟着本课实验走一遍

1. 找到 transport 注入位置。
2. 追踪发送到具体实现。
3. 检查发送长度和状态。
4. 列出替换实现需要改的文件。

先尝试口头预测，再到第⑥节运行。下面原有概念、图示与接口对照用于解释这些步骤，短代码片段不一定能单独编译；完整程序以本课 `main.cpp` 为准。

稳定边界不等于抽象越多越好。 抽象的价值是隔离真正可能变化的东西。嵌入式系统常见变化轴包括 UART/USB/SPI transport、RTOS/裸机、modem vendor、板级 MMIO、日志后端与 timeout 策略。

让依赖指向更稳定的一侧。 业务层依赖“发送命令”的能力，而不是 UART 寄存器布局：Application → ModemSession → ITransport → UartTransport → BSP。

Policy 与 mechanism 分离。 重试次数、等待多久属于 policy；如何把 bytes 写入 UART 属于 mechanism。

设计是 trade-off。 虚接口便于运行时替换但存在间接调用；模板可以静态绑定但可能增加编译依赖和代码膨胀。应依据 Flash/RAM、实时性、测试和维护成本选择。

## ④ C 写法 vs 现代 C++ 写法（10分钟）

```c
int modem_send(int type, const char* data, int len) {
if (type == 0) return uart_send(data, len);
if (type == 1) return usb_send(data, len);
return -1;
}
```

上层知道 transport 类型，每新增一种 transport 都修改核心函数。

```cpp
class ITransport {
public:
  virtual ~ITransport() = default;
  virtual Status Send(std::span<const std::byte> data, std::chrono::milliseconds timeout) = 0;
};
```

```cpp
class ModemSession {
public:
  explicit ModemSession(ITransport& transport) : transport_{transport} {}

private:
  ITransport& transport_;  // borrowed, non-owning
};
```
## ⑤ 今日编码规范（10分钟）

- MUST：平台差异集中隔离，BSP/MMIO/RTOS/vendor API 不泄漏到业务层。

- SHOULD：接口保持小而稳定，不为“以后也许会用”提前增加 API。

- MUST：所有权和借用明确。非空借用优先使用引用，不因依赖注入而滥用 shared_ptr。

违反规范

```cpp
std::shared_ptr<UartDriver> g_uart;
class Modem {
public:
  int Send(const char* p, int n, bool retry, bool log) {
    return g_uart->Write(p, n);
  }
};
```

推荐写法

```cpp
struct SendOptions {
  std::chrono::milliseconds timeout{1000};
  std::uint8_t max_retries{0};
};
```

```cpp
class ModemSession {
public:
  explicit ModemSession(ITransport& transport) : transport_{transport} {}
  Status Send(std::span<const std::byte> data, const SendOptions& options);

private:
  ITransport& transport_;
};
```

嵌入式注意：抽象不能掩盖无界等待或 heap allocation。硬实时路径必须能审计最坏执行时间和内存行为。

## ⑥ 可编译的小实验 / 代码练习（20分钟）

### 第一次做：先运行，再只改一件事

1. 在仓库根目录打开 [`examples/day-026/main.cpp`](../examples/day-026/main.cpp)，先读 `main()`，圈出输入、调用与结果检查。
2. 运行原版，把实际输出和退出状态记下来，再与本节预期对照。无输出也可能成功，必须结合退出码与断言判断。
3. 修改前先写预期；若失败，先读第一条编译错误或失败断言，再回到对应概念，不同时重写多个函数。

**本课小改动：** 为 UART 与 fake 写下相同契约，再比较两者的阻塞与错误路径；结果相同不代表资源成本相同。

<details>
<summary>练习提示：卡住时再展开</summary>

把上面的执行步骤当作检查点；保留原版作为对照。若练习故意让编译或断言失败，请只在实验副本操作，解释失败后还原，不把负例混入日常通过用例。不要执行越界、悬空解引用或重复释放来“观察效果”。

</details>

实现可在 UART 与 Fake transport 之间替换的发送层，发送路径不动态分配。

完整源码：[main.cpp](../examples/day-026/main.cpp)。

```cpp
#include <array>
#include <cassert>
#include <chrono>
#include <cstddef>
#include <cstdint>
#include <iostream>
#include <span>

using namespace std::chrono_literals;

enum class Status { kOk, kTimeout, kIoError, kInvalidArgument };

class ITransport {
public:
  virtual ~ITransport() = default;
  virtual Status Send(std::span<const std::byte> data, std::chrono::milliseconds timeout) = 0;
};

class FakeTransport final : public ITransport {
public:
  Status Send(std::span<const std::byte> data, std::chrono::milliseconds timeout) override {
    if (timeout <= 0ms || data.size() > last_frame_.size()) {
      return Status::kInvalidArgument;
    }
    for (std::size_t i = 0; i < data.size(); ++i) {
      last_frame_[i] = data[i];
    }
    last_size_ = data.size();
    return Status::kOk;
  }

  [[nodiscard]] std::size_t LastSize() const {
    return last_size_;
  }

private:
  std::array<std::byte, 64> last_frame_{};
  std::size_t last_size_{0};
};

struct SendOptions {
  std::chrono::milliseconds timeout{1000ms};
};

class ModemSession {
public:
  explicit ModemSession(ITransport& transport) : transport_{transport} {}

  Status Send(std::span<const std::byte> command, const SendOptions& options) {
    if (command.empty()) return Status::kInvalidArgument;
    return transport_.Send(command, options.timeout);
  }

private:
  ITransport& transport_;
};

int main() {
  FakeTransport transport;
  ModemSession modem{transport};
  constexpr std::array command{std::byte{'A'}, std::byte{'T'}, std::byte{'\r'}};
  const Status status = modem.Send(command, SendOptions{500ms});
  assert(status == Status::kOk);
  assert(transport.LastSize() == command.size());
  std::cout << "Sent " << transport.LastSize() << " bytes successfully\n";
  return 0;
}
```

在仓库根目录运行：

```bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic examples/day-026/main.cpp -o /tmp/day-026
/tmp/day-026
```

## ⑦ 3 个常见坑（5分钟）

- 为了低耦合制造几十个接口——抽象也有成本。

- 把依赖注入等同于 shared_ptr——DI 与 ownership 是两个问题。

- 接口隐藏实时风险——漂亮的 Send() 若无限阻塞或分配内存仍不合格。

## ⑧ 2 道检查题（5分钟）

### 分层自测：从解释到判断

1. **理解：** 不看代码，用三句话复述本课示例的输入、关键步骤和结果。
2. **应用：** 说明第⑥节小改动的预期，以及实际结果是否符合预期。
3. **辨析：** 虚接口是不是永远比模板更灵活？

<details>
<summary>辨析题参考答案与通过依据</summary>

它便于运行期替换，但也有间接调用与生命周期成本；模板适合某些编译期配置，需看需求。

能运行只是第一步。只有能解释本课具体步骤、完成小改动，并说清一个不适用条件，才算完成本次自测；不清楚时回看第③节，不以阅读次数当作掌握证据。

</details>

### 原课检查题

- 为什么把 UART/MMIO 类型直接暴露给 ModemSession 会扩大硬件变化的影响范围？

- ITransport 虚接口与模板静态注入都可工作时，你会收集哪些证据再决定？

今日完成标准：能够指出系统中的一个变化轴，建立稳定边界，并明确说明该抽象的成本，而不只是说“这样更面向对象”。
下一节 Day 27：Chapter 4 收束——从需求、抽象、复用到可演进设计，为 Chapter 5 Designing with Classes 建立过渡。

### 对照现有资料库

- [需求与约束贯穿实验](<../docs/engineering-learning-path.md>)。
- [系统架构资料：进阶对照](<../references/system-design-notes/content/33. Cpp System Architecture/index.zh.md>)。

先完成本课小实验，再查对照资料；专题中的线程、网络、板端或模式不是本课默认前置。以上为本项目已有讲解和工程对照，不冒充标准条文，也不表示所有示例已在目标板验证。
