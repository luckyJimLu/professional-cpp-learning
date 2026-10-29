---
day: 22
week: 4
part: II
chapter: 4
chapter_title: "Designing Professional C++ Programs"
title: "抽象：稳定接口与隐藏实现"
duration: 60
status: published
topics:
  - abstraction-stable-interface
guidelines:
  - explicit-contract
lab:
  path: examples/day-022/main.cpp
previous: 21
next: 23
---
# Day 22 · 抽象：稳定接口与隐藏实现

<!-- cpp-standards:start -->
## 本课涉及的 C++ 标准

以下按正文与配套 `.cpp` 示例中出现的特性标注首次标准化版本，不代表整份程序的最低编译版本。仓库主 Lab 统一使用 C++23。

| 特性 | 首次标准化 | 版本边界 |
| --- | --- | --- |
| 列表初始化 | **C++11** | 包括直接列表初始化；窄化检查及 initializer_list 优先规则须单独注意。 |
| `= default` / `= delete` | **C++11** | 显式默认化与删除函数。 |
| `enum class` | **C++11** | 有作用域枚举。 |
| `override` / `final` | **C++11** | 用于虚函数覆盖检查、限制覆盖或继承。 |
| `[[nodiscard]]` | **C++17** | 带说明字符串的形式从 C++20 起可用。 |
| `std::chrono` | **C++11** | 如 duration、time_point、steady_clock；不是所有 chrono 后增 API 都属于 C++11。 |
| chrono 时长字面量 | **C++14** | 如 `100ms`；需要相应头文件与 `std::chrono_literals`。 |
| `std::string_view` | **C++17** | 非拥有视图；其 `starts_with` / `ends_with` 是 C++20 新增。 |
| `std::byte` | **C++17** | 字节枚举类型，不是整数算术类型。 |
| `std::span` | **C++20** | 连续序列的非拥有视图；不自动延长底层对象生命周期。 |

版本差异、旧机制与工具链检查见 [C++ 标准来源速查](../docs/cpp-feature-standards.md)。
<!-- cpp-standards:end -->

**Chapter 4 · 抽象：稳定接口与隐藏实现**

今天继续 Designing Professional C++ Programs。主教材把 abstraction 与 reuse 作为有效 C++ 设计的两条基本主线。今天只聚焦 abstraction，并用嵌入式 Modem/Transport 例子练习如何把硬件实现细节藏在稳定接口之后。

## ① 今日章节与建议阅读范围（5分钟）

### 新手起步：先知道今天在解决什么

先说调用者需要“发送字节”，再隐藏串口寄存器。隐藏的不是所有信息：超时、错误和容量会影响调用者，仍应写在契约里。

**前置检查：** 先能解释 [Day 19](day-019-requirements-architecture-boundaries.md)、[Day 20](day-020-requirements-use-cases-decisions.md)、[Day 21](day-021-weekly-review-testable-modem-architecture.md) 的核心例子；不必先掌握整本教材。

**本课最低完成目标：** 能按下面的步骤说明示例如何得到结果，并独立完成一项小修改；高级模式与平台性能分析可第二遍再读。新增导读和拓展练习不计入原有约 60 分钟安排，可分两次完成。

阅读 Chapter 4 的 Two Rules for Your Own C++ Designs → Abstraction → Benefiting from Abstraction → Incorporating Abstraction in Your Design。重点问自己：调用者真正需要知道什么？哪些实现选择不应该成为 API 契约？

## ② 昨日复习 3 问（5分钟）

- 功能需求回答 what 还是 how？答：what；设计负责 how。

- 为什么 timeout 应进入接口契约？它是阻塞行为的可观察约束，嵌入式系统不能隐藏为无限等待。

- 为什么 Application 不应直接调用 UART/MMIO？否则业务策略与具体硬件耦合，测试、移植、替换成本上升。

## ③ 核心概念讲解（15分钟）

### 先用白话建立概念

- **抽象**：保留调用者所需语义的模型。
- **实现细节**：可在边界内部替换的做法。

### 跟着本课实验走一遍

1. 从会话调用发送能力。
2. 查看接口约定。
3. 换成 fake 实现。
4. 验证上层无需知道具体硬件。

先尝试口头预测，再到第⑥节运行。下面原有概念、图示与接口对照用于解释这些步骤，短代码片段不一定能单独编译；完整程序以本课 `main.cpp` 为准。

Abstraction 的核心不是“多写一层 class”，而是把稳定能力暴露给调用者，把可能变化的实现藏起来。ModemSession 需要的是 Send/Receive 能力，而不是 UART 寄存器、DMA channel 或 ring-buffer layout。

好的抽象边界有三个特征：调用点只表达业务意图；内部表示可改变而不迫使调用者修改；约束在边界内集中维护。例如 Transport 从 polling UART 换成 DMA UART，只要契约不变，ModemSession 就不应改变。

抽象也不等于继承。函数、class、template、concept、type-erasure 都能形成抽象。今天使用简单的 class/interface 思维；继承会在后续章节系统学习。

“隐藏实现”也不是机械增加 getter/setter。RingBuffer 若直接暴露 write_index，调用者可以破坏 invariant；更好的 API 是 Push()/Pop()/Size()，让索引环绕规则只存在一处。

## ④ C 写法 vs 现代 C++ 写法（10分钟）

```c
int modem_send(void* uart, const unsigned char* data,
unsigned int len, int timeout_ms);
```

调用者必须知道 uart handle、裸 buffer/length 配对、timeout 单位和错误码约定。

```cpp
enum class Status { kOk, kTimeout, kIoError, kInvalidArgument };
struct SendOptions {
  std::chrono::milliseconds timeout{1000};
};
class Transport {
public:
  virtual ~Transport() = default;
  virtual Status Send(std::span<const std::byte> data, const SendOptions& options) = 0;
};
```

## ⑤ 今日编码规范（10分钟）

SHOULD：接口尽量小。 只暴露调用者真正需要的 API，实现细节保持 private。
MUST：避免可写全局状态。 硬件实例、缓冲区和状态应封装或显式注入。
MUST/SHOULD：显式表达意图。 状态用 enum class，时间/长度用有单位的类型或名称。

违反规范

```cpp
extern int g_uart_port;
class Modem {
public:
  int uart_fd;
  unsigned char* rx_buf;
  int Send(unsigned char* p, int n, int timeout);
};
```

推荐写法

```cpp
class ModemSession {
public:
  explicit ModemSession(Transport& transport) : transport_(transport) {}
  Status Execute(std::string_view command, std::chrono::milliseconds timeout);

private:
  Transport& transport_;  // borrowed, non-owning
};
```
嵌入式注意：抽象层不能成为“性能免责层”。硬实时路径仍需审计 virtual dispatch、动态分配、锁、日志和最坏执行时间。不要为了架构漂亮而增加无法证明价值的层次。
## ⑥ 可编译的小实验 / 代码练习（20分钟）

### 第一次做：先运行，再只改一件事

1. 在仓库根目录打开 [`examples/day-022/main.cpp`](../examples/day-022/main.cpp)，先读 `main()`，圈出输入、调用与结果检查。
2. 运行原版，把实际输出和退出状态记下来，再与本节预期对照。无输出也可能成功，必须结合退出码与断言判断。
3. 修改前先写预期；若失败，先读第一条编译错误或失败断言，再回到对应概念，不同时重写多个函数。

**本课小改动：** 列一张表：波特率寄存器位置可隐藏，最大发送长度不可隐瞒；各写出一个理由。

<details>
<summary>练习提示：卡住时再展开</summary>

把上面的执行步骤当作检查点；保留原版作为对照。若练习故意让编译或断言失败，请只在实验副本操作，解释失败后还原，不把负例混入日常通过用例。不要执行越界、悬空解引用或重复释放来“观察效果”。

</details>

目标：实现一个不依赖真实 UART 的 ModemSession，并证明 transport 实现可替换。

完整源码：[main.cpp](../examples/day-022/main.cpp)。

```cpp
#include <cassert>
#include <chrono>
#include <cstddef>
#include <iostream>
#include <span>
#include <string_view>

using namespace std::chrono_literals;

enum class Status { kOk, kTimeout, kIoError, kInvalidArgument };
struct SendOptions {
  std::chrono::milliseconds timeout{1000ms};
};

class Transport {
public:
  virtual ~Transport() = default;
  virtual Status Send(std::span<const std::byte> data, const SendOptions& options) = 0;
};

class FakeTransport final : public Transport {
public:
  Status Send(std::span<const std::byte> data, const SendOptions& options) override {
    if (data.empty()) return Status::kInvalidArgument;
    if (options.timeout <= 0ms) return Status::kTimeout;
    ++send_count_;
    last_size_ = data.size();
    return Status::kOk;
  }

  [[nodiscard]] std::size_t SendCount() const {
    return send_count_;
  }
  [[nodiscard]] std::size_t LastSize() const {
    return last_size_;
  }

private:
  std::size_t send_count_{0};
  std::size_t last_size_{0};
};

class ModemSession {
public:
  explicit ModemSession(Transport& transport) : transport_(transport) {}

  Status Execute(std::string_view command, std::chrono::milliseconds timeout) {
    if (command.empty()) return Status::kInvalidArgument;
    const auto* begin = reinterpret_cast<const std::byte*>(command.data());
    const std::span<const std::byte> bytes{begin, command.size()};
    return transport_.Send(bytes, SendOptions{.timeout = timeout});
  }

private:
  Transport& transport_;
};

int main() {
  FakeTransport transport;
  ModemSession modem{transport};
  const Status status = modem.Execute("AT+CSQ\r\n", 500ms);
  assert(status == Status::kOk);
  std::cout << "send_count=" << transport.SendCount() << ", bytes=" << transport.LastSize() << '\n';
  return 0;
}
```

在仓库根目录运行：

```bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic examples/day-022/main.cpp -o /tmp/day-022
/tmp/day-022
```

## ⑦ 3 个常见坑（5分钟）

- 加 interface 就等于低耦合：接口若仍暴露 UART fd、DMA channel，耦合只是换了位置。

- Getter/Setter 泛滥：private + 全量可写 setter 仍可能破坏 invariant；优先暴露业务动作。

- 过度抽象：没有变化轴、测试边界或契约价值时，不要机械创建五层 wrapper。

## ⑧ 2 道检查题（5分钟）

### 分层自测：从解释到判断

1. **理解：** 不看代码，用三句话复述本课示例的输入、关键步骤和结果。
2. **应用：** 说明第⑥节小改动的预期，以及实际结果是否符合预期。
3. **辨析：** 抽象等于把所有细节藏起来吗？

<details>
<summary>辨析题参考答案与通过依据</summary>

不是；会影响正确使用或资源预算的性质必须公开，隐藏它们只会制造隐含依赖。

能运行只是第一步。只有能解释本课具体步骤、完成小改动，并说清一个不适用条件，才算完成本次自测；不清楚时回看第③节，不以阅读次数当作掌握证据。

</details>

### 原课检查题

Q1：ModemSession 返回 UartDmaDescriptor 是好的抽象吗？
答：通常不是，它泄漏底层 UART/DMA 实现，使替换 transport 时上层也必须变化。

Q2：为什么 std::span<const std::byte> 比 const uint8_t* + size_t 更适合借用 buffer？
答：pointer 与长度绑定成非拥有 view，const 表达只读借用，减少错配；但底层生命周期仍必须由调用者保证。

今日完成标准：你能在自己的项目中画出一条边界，并回答“接口承诺什么、实现隐藏什么、谁拥有资源、哪些约束必须由类型表达”。

Day 23：继续 Chapter 4，进入 Reuse——什么时候复用标准库/第三方库，什么时候自己实现，以及嵌入式项目如何评估依赖成本。

### 对照现有资料库

- [需求与约束贯穿实验](<../docs/engineering-learning-path.md>)。
- [系统架构资料：进阶对照](<../references/system-design-notes/content/33. Cpp System Architecture/index.zh.md>)。

先完成本课小实验，再查对照资料；专题中的线程、网络、板端或模式不是本课默认前置。以上为本项目已有讲解和工程对照，不冒充标准条文，也不表示所有示例已在目标板验证。
