---
day: 11
week: 2
part: I
chapter: 2
chapter_title: "Working with Strings and String Views"
title: "字符串格式化、字符编码与嵌入式文本边界"
duration: 60
status: published
topics:
  - formatting-encoding
guidelines:
  - explicit-contract
lab:
  path: examples/day-011/main.cpp
previous: 10
next: 12
---
# Day 11 · 字符串格式化、字符编码与嵌入式文本边界

<!-- cpp-standards:start -->
## 本课涉及的 C++ 标准

以下按正文与配套 `.cpp` 示例中出现的特性标注首次标准化版本，不代表整份程序的最低编译版本。仓库主 Lab 统一使用 C++23。

| 特性 | 首次标准化 | 版本边界 |
| --- | --- | --- |
| 列表初始化 | **C++11** | 包括直接列表初始化；窄化检查及 initializer_list 优先规则须单独注意。 |
| `<cstdint>` 固定宽度整数 | **C++11** | 精确宽度类型仅在实现提供对应整数类型时存在。 |
| `std::array` | **C++11** | 固定大小容器。 |
| `std::string_view` | **C++17** | 非拥有视图；其 `starts_with` / `ends_with` 是 C++20 新增。 |
| `std::from_chars` / `std::to_chars` | **C++17** | 整数及浮点重载均在 C++17 标准化；旧标准库的浮点支持可能滞后。 |
| `std::byte` | **C++17** | 字节枚举类型，不是整数算术类型。 |
| `std::span` | **C++20** | 连续序列的非拥有视图；不自动延长底层对象生命周期。 |
| `std::format` / `std::format_to` | **C++20** | 需标准库实现支持；仅启用编译器语言选项并不足够。 |

版本差异、旧机制与工具链检查见 [C++ 标准来源速查](../docs/cpp-feature-standards.md)。
<!-- cpp-standards:end -->

字符串格式化、字符编码与嵌入式文本边界

**Chapter 2 · Working with Strings and String Views**

今天继续 Chapter 2。在已经掌握 std::string / std::string_view 的拥有与借用模型后，进一步理解格式化、字符类型与文本边界。重点不是“把字符串拼出来”，而是建立适合 Modem / 日志 / 协议代码的可审查文本处理方式。

## ① 今日章节与建议阅读范围 · 5分钟

### 新手起步：先知道今天在解决什么

先把文本和二进制分开，再讨论如何输出。UTF-8 的一个汉字通常由多个字节组成，`string::size()` 统计的是 `char` 元素，不是用户眼中的字符数。

**前置检查：** 先能解释 [Day 8](day-008-string-string-view.md)、[Day 9](day-009-string-operations.md) 的核心例子；不必先掌握整本教材。

**本课最低完成目标：** 能按下面的步骤说明示例如何得到结果，并独立完成一项小修改；高级模式与平台性能分析可第二遍再读。新增导读和拓展练习不计入原有约 60 分钟安排，可分两次完成。

继续 Chapter 2 中字符串格式化、字符类型/编码以及相关字符串工具内容。阅读时重点回答：格式化结果是否拥有内存？输入文本采用什么编码？协议字节与人类文本是否应该混用同一种抽象？

## ② 昨日复习 3 问 · 5分钟

- 为什么 std::string_view 不应该返回对局部 std::string 的视图？

- remove_prefix() 为什么是零拷贝操作？

- 为什么协议数字解析通常优先 std::from_chars 而不是 atoi？

## ③ 核心概念 · 15分钟

### 先用白话建立概念

- **编码**：字符与字节的对应约定。
- **格式化**：按规则把值转换为文本。

### 跟着本课实验走一遍

1. 找到被格式化的数值。
2. 看单位和分隔符如何进入输出。
3. 检查输出缓冲区或工具链的限制。

先尝试口头预测，再到第⑥节运行。下面原有概念、图示与接口对照用于解释这些步骤，短代码片段不一定能单独编译；完整程序以本课 `main.cpp` 为准。

格式化 ≠ 字符串拼接

连续 operator+ 会把格式散落在控制流里，并可能产生临时对象。C++20/23 的 std::format（工具链支持时）能集中表达格式。但嵌入式工程必须继续问：是否允许动态分配？ROM/RAM 成本多少？最坏时延是多少？

```cpp
const std::string message = std::format("rssi={} dBm, retry={}", rssi_dbm, retry_count);
```

字符不等于字节

协议 payload 本质上可能是二进制字节。二进制数据更适合 std::byte / std::uint8_t 与 std::span；文本接口与二进制接口分离，可避免编码、\0 与符号扩展问题混进协议逻辑。

编码是接口契约

std::string 只是 char 序列，并不自动保证 UTF-8。工程接口应明确编码约定。

## ④ C 写法 vs 现代 C++ · 10分钟

风险较高的 C 风格：

```c
char log_buf[64];
sprintf(log_buf, "RSSI=%d, retry=%u", rssi, retry);
```

现代 C++（非实时且工具链支持）：

```cpp
const std::string message = std::format("RSSI={} dBm, retry={}", rssi_dbm, retry_count);
```

固定缓冲区边界场景仍可使用 snprintf，但应封装在边界层并检查返回值。

## ⑤ 今日编码规范 · 10分钟

MUST：硬实时路径禁止无界操作；std::string/std::format 可能涉及动态内存，不能未经测量直接进入 ISR 或硬实时任务。

SHOULD：单位进入类型或变量名，如 rssi_dbm、timeout_ms。

SHOULD：平台差异集中隔离。若 MCU 标准库不支持 std::format，把替代策略集中在 adapter，而不是让 #ifdef 铺满业务层。

## ⑥ 可编译实验 · 20分钟：Modem Diagnostic Formatter

### 第一次做：先运行，再只改一件事

1. 在仓库根目录打开 [`examples/day-011/main.cpp`](../examples/day-011/main.cpp)，先读 `main()`，圈出输入、调用与结果检查。
2. 运行原版，把实际输出和退出状态记下来，再与本节预期对照。无输出也可能成功，必须结合退出码与断言判断。
3. 修改前先写预期；若失败，先读第一条编译错误或失败断言，再回到对应概念，不同时重写多个函数。

**本课小改动：** 给日志加入一个明确的单位并记录输出长度；若工具链不支持 `std::format`，先运行仓库现有实验，不为此改用未知库。

<details>
<summary>练习提示：卡住时再展开</summary>

把上面的执行步骤当作检查点；保留原版作为对照。若练习故意让编译或断言失败，请只在实验副本操作，解释失败后还原，不把负例混入日常通过用例。不要执行越界、悬空解引用或重复释放来“观察效果”。

</details>

完整源码：[main.cpp](../examples/day-011/main.cpp)。

```cpp
#include <array>
#include <cassert>
#include <cstdint>
#include <cstdio>
#include <iostream>

struct RadioStatus {
  int rssi_dbm{};
  std::uint32_t timeout_ms{};
  std::uint8_t retry_count{};
};

bool FormatRadioStatusToBuffer(const RadioStatus& status, std::array<char, 96>& output) {
  const int written = std::snprintf(
      output.data(), output.size(), "RSSI=%d dBm, timeout=%u ms, retry=%u", status.rssi_dbm,
      static_cast<unsigned int>(status.timeout_ms), static_cast<unsigned int>(status.retry_count));
  if (written < 0) {
    return false;
  }
  return static_cast<std::size_t>(written) < output.size();
}

int main() {
  const RadioStatus status{-73, 5000U, 3U};
  std::array<char, 96> output{};
  const bool ok = FormatRadioStatusToBuffer(status, output);
  assert(ok);
  std::cout << output.data() << '\n';
  return 0;
}
```

在仓库根目录运行：

```bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic examples/day-011/main.cpp -o /tmp/day-011
/tmp/day-011
```

## ⑦ 3 个常见坑 · 5分钟

- 把 std::string 当成“UTF-8 类型”——编码其实是接口契约。

- 认为 std::format 一定比 snprintf 更适合嵌入式——先测 ROM/RAM/分配/时延。

- 忽略格式化截断——snprintf 返回值决定结果是否完整。

## ⑧ 检查题 · 5分钟

### 分层自测：从解释到判断

1. **理解：** 不看代码，用三句话复述本课示例的输入、关键步骤和结果。
2. **应用：** 说明第⑥节小改动的预期，以及实际结果是否符合预期。
3. **辨析：** 格式化接口会自动保证没有分配和实时性问题吗？

<details>
<summary>辨析题参考答案与通过依据</summary>

不会；具体实现、输出目标和调用方式仍需测量与审计。

能运行只是第一步。只有能解释本课具体步骤、完成小改动，并说清一个不适用条件，才算完成本次自测；不清楚时回看第③节，不以阅读次数当作掌握证据。

</details>

### 原课检查题

Q1：硬实时任务生成诊断文本时，最先确认什么？
答案：是否允许动态分配，以及最坏执行时间和缓冲区上界。

Q2：为什么二进制 Modem payload 不宜直接建模成 std::string？
答案：文本语义会掩盖二进制字节、编码与边界契约。
今日 Code Review 快检：文本还是二进制？谁拥有结果？是否可能分配？缓冲区上界是否明确？单位是否进入名称？格式化返回值是否检查？平台差异是否被隔离？
明日预告：Day 12 完成 Chapter 2 的工程化收束，并把字符串接口与接口契约、边界输入测试、头文件依赖结合起来，为 Chapter 3 · Coding with Style 做准备。

### 对照现有资料库

- [实验环境与工具链边界](<../docs/lab-environments.md>)。
- [类型、借用与错误处理规范](<../guidelines/embedded-cpp-guideline-notes.md>)。

先完成本课小实验，再查对照资料；专题中的线程、网络、板端或模式不是本课默认前置。以上为本项目已有讲解和工程对照，不冒充标准条文，也不表示所有示例已在目标板验证。
