---
day: 3
week: 1
part: I
chapter: 1
chapter_title: "A Crash Course in C++ and the Standard Library"
title: "const、constexpr 与编译期思维"
duration: 60
status: published
topics:
  - const-constexpr
guidelines:
  - explicit-contract
lab:
  path: examples/day-003/main.cpp
previous: 2
next: 4
---
# Day 03 · const、constexpr 与编译期思维

**Chapter 1 · const、constexpr 与编译期思维
今日目标：把“这个值不会变”升级为由类型系统和编译器验证的约束，并逐步消除嵌入式代码中的 magic number。
## ① 今日阅读范围 · 5 分钟

### 新手起步：先知道今天在解决什么

先用 `const` 表达不允许通过当前对象修改，再用 `constexpr` 表达可参与常量表达式的声明。不要把“我知道值是多少”当成编译器一定能在常量表达式中使用它。

**前置检查：** 先能解释 [Day 1](day-001-from-c-to-modern-cpp.md)、[Day 2](day-002-variables-initialization-casts.md) 的核心例子；不必先掌握整本教材。

**本课最低完成目标：** 能按下面的步骤说明示例如何得到结果，并独立完成一项小修改；高级模式与平台性能分析可第二遍再读。新增导读和拓展练习不计入原有约 60 分钟安排，可分两次完成。

继续 Chapter 1 中与 const、constexpr、常量表达式、类型与初始化相关的部分。重点区分：const 表示对象不可通过当前接口修改；constexpr 进一步允许值进入常量表达式并鼓励编译期求值。

## ② 昨日复习 · 5 分钟

- 为什么 int x{value}; 更容易暴露窄化转换？

- static_cast 为什么更适合 code review？

- 协议规定 32-bit 无符号字段时，为什么 std::uint32_t 更明确？

## ③ 核心概念 · 15 分钟

### 先用白话建立概念

- **常量表达式**：满足编译期求值规则的表达式。
- **static_assert**：编译期间的条件检查。

### 跟着本课实验走一遍

1. 定位默认超时和最大重试次数。
2. 手算超时乘积。
3. 对照 `static_assert`，区分编译失败与运行时断言失败。

先尝试口头预测，再到第⑥节运行。下面原有概念、图示与接口对照用于解释这些步骤，短代码片段不一定能单独编译；完整程序以本课 `main.cpp` 为准。

1. const：把“不修改”写进接口

```cpp
const std::uint32_t timeout_ms{5000};
void PrintConfig(const ModemConfig& config);
```

这表达“借用 config，并且不修改它”，比注释约定更可靠。

2. constexpr：编译期常量语义

```cpp
constexpr std::uint32_t kDefaultTimeoutMs{5000U};
constexpr std::size_t kRxBufferSize{512U};
std::array<std::uint8_t, kRxBufferSize> rx_buffer{};
```

3. constexpr 函数 + static_assert

```cpp
constexpr std::uint32_t SecondsToMs(std::uint32_t seconds) {
  return seconds * 1000U;
}
constexpr auto kBootTimeoutMs = SecondsToMs(5U);
static_assert(kBootTimeoutMs == 5000U);
```

当输入是常量表达式时，纯计算可以前移到编译期；static_assert 则把错误挡在构建阶段。

4. const 不等于 constexpr

```cpp
std::uint32_t ReadTimeoutFromNvram();
const std::uint32_t timeout_ms{ReadTimeoutFromNvram()};
```

它初始化后不变，但值来自运行期，因此不是编译期常量。

## ④ C 写法 vs 现代 C++ · 10 分钟

C 风格

#define MODEM_TIMEOUT 5000
#define RX_BUF_SIZE 512
int calc_timeout(int retry) { return MODEM_TIMEOUT * retry; }

现代 C++

```cpp
namespace modem {
constexpr std::uint32_t kDefaultTimeoutMs{5000U};
constexpr std::size_t kRxBufferSize{512U};
constexpr std::uint32_t CalculateTimeoutMs(std::uint32_t retry_count) {
  return kDefaultTimeoutMs * retry_count;
}
static_assert(CalculateTimeoutMs(3U) == 15000U);
}  // namespace modem
```

## ⑤ 今日编码规范 · 10 分钟

MUST：语义常量使用 kPascalCase；SHOULD：单位进入名称；SHOULD：可静态检查的约束优先交给类型系统、constexpr、编译告警和静态分析。

错误：

```cpp
const int timeout = 5000;
```
if (elapsed_ms > 5000U) { ResetModem(); }

推荐：

```cpp
constexpr std::uint32_t kResponseTimeoutMs{5000U};
```
if (elapsed_ms > kResponseTimeoutMs) { ResetModem(); }

## ⑥ Coding 实验 · 20 分钟

### 第一次做：先运行，再只改一件事

1. 在仓库根目录打开 [`examples/day-003/main.cpp`](../examples/day-003/main.cpp)，先读 `main()`，圈出输入、调用与结果检查。
2. 运行原版，把实际输出和退出状态记下来，再与本节预期对照。无输出也可能成功，必须结合退出码与断言判断。
3. 修改前先写预期；若失败，先读第一条编译错误或失败断言，再回到对应概念，不同时重写多个函数。

**本课小改动：** 将重试次数改为 4，先计算新的期望超时，再同步更新检查；不要保留原来的 15000 期望。

<details>
<summary>练习提示：卡住时再展开</summary>

把上面的执行步骤当作检查点；保留原版作为对照。若练习故意让编译或断言失败，请只在实验副本操作，解释失败后还原，不把负例混入日常通过用例。不要执行越界、悬空解引用或重复释放来“观察效果”。

</details>

完整源码：[main.cpp](../examples/day-003/main.cpp)。

```cpp
#include <array>
#include <cstddef>
#include <cstdint>
#include <iostream>

namespace modem {
constexpr std::uint32_t kDefaultTimeoutMs{5000U};
constexpr std::uint32_t kMaxRetryCount{3U};
constexpr std::size_t kRxBufferSize{512U};

constexpr std::uint32_t CalculateTotalTimeoutMs(std::uint32_t retry_count) {
  return kDefaultTimeoutMs * retry_count;
}

static_assert(kRxBufferSize >= 256U);
static_assert(CalculateTotalTimeoutMs(kMaxRetryCount) == 15000U);

struct Config {
  std::uint32_t timeout_ms{kDefaultTimeoutMs};
  std::uint32_t retry_count{kMaxRetryCount};
};

void PrintConfig(const Config& config) {
  std::cout << "timeout_ms = " << config.timeout_ms << '\n';
}
}  // namespace modem

int main() {
  std::array<std::uint8_t, modem::kRxBufferSize> rx_buffer{};
  const modem::Config config{};
  modem::PrintConfig(config);
  std::cout << rx_buffer.size() << '\n';
}
```

在仓库根目录运行：

```bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic examples/day-003/main.cpp -o /tmp/day-003
/tmp/day-003
```

## ⑦ 3 个常见坑 · 5 分钟

- 把所有 const 都理解成编译期常量。

- 为了“性能”到处加 constexpr；首要价值是表达约束，性能仍需测量。

- 用宏定义硬件/协议常量却忽略类型和作用域。

## ⑧ 检查题 · 5 分钟

### 分层自测：从解释到判断

1. **理解：** 不看代码，用三句话复述本课示例的输入、关键步骤和结果。
2. **应用：** 说明第⑥节小改动的预期，以及实际结果是否符合预期。
3. **辨析：** `constexpr` 函数每次调用都在编译期执行吗？

<details>
<summary>辨析题参考答案与通过依据</summary>

不一定；运行期输入通常在运行期求值，只有满足常量表达式上下文等条件时才要求编译期求值。

能运行只是第一步。只有能解释本课具体步骤、完成小改动，并说清一个不适用条件，才算完成本次自测；不清楚时回看第③节，不以阅读次数当作掌握证据。

</details>

### 原课检查题

Q1：固定 RX buffer 大小最适合：A int size=512；B 运行期 const；C constexpr std::size_t kRxBufferSize{512U}；D 宏。

Q2：static_assert 对嵌入式配置的主要价值：A 自动减 RAM；B 把部分配置错误提前到编译期；C 替代所有运行期错误；D 自动修复越界。

今日完成标准

能解释 const、constexpr、static_assert 的区别；能把 C 宏常量改成有类型、有作用域、有单位语义的 C++ 常量。

明日预告：Day 4 — 引用、指针、nullptr 与接口语义：如何在函数签名里表达“不能为空”“可能为空”“只是借用”。

### 对照现有资料库

- [实验环境与工具链边界](<../docs/lab-environments.md>)。
- [类型、借用与错误处理规范](<../guidelines/embedded-cpp-guideline-notes.md>)。

先完成本课小实验，再查对照资料；专题中的线程、网络、板端或模式不是本课默认前置。以上为本项目已有讲解和工程对照，不冒充标准条文，也不表示所有示例已在目标板验证。
