---
day: 12
week: 2
part: I
chapter: 2
chapter_title: "Working with Strings and String Views"
title: "原始字符串字面量、文本常量与安全命令模板"
duration: 60
status: published
topics:
  - raw-strings-command-templates
guidelines:
  - explicit-contract
lab:
  path: examples/day-012/main.cpp
previous: 11
next: 13
---
# Day 12 · 原始字符串字面量、文本常量与安全命令模板

<!-- cpp-standards:start -->
## 本课涉及的 C++ 标准

以下按正文与配套 `.cpp` 示例中出现的特性标注首次标准化版本，不代表整份程序的最低编译版本。仓库主 Lab 统一使用 C++23。

| 特性 | 首次标准化 | 版本边界 |
| --- | --- | --- |
| 列表初始化 | **C++11** | 包括直接列表初始化；窄化检查及 initializer_list 优先规则须单独注意。 |
| 范围 `for` | **C++11** | 带初始化语句的范围 for 从 C++20 起可用。 |
| `constexpr` | **C++11** | C++14 放宽函数体限制；C++20 继续扩展可用于常量求值的操作。声明不保证每次调用都在编译期执行。 |
| 原始字符串字面量 | **C++11** | 如 `R"(text)"`；不负责字符编码转换。 |
| `std::string_view` | **C++17** | 非拥有视图；其 `starts_with` / `ends_with` 是 C++20 新增。 |
| `string` / `string_view` 的前后缀检查 | **C++20** | `starts_with` / `ends_with`。 |

版本差异、旧机制与工具链检查见 [C++ 标准来源速查](../docs/cpp-feature-standards.md)。
<!-- cpp-standards:end -->

原始字符串字面量、文本常量与安全命令模板

**Chapter 2 · Working with Strings and String Views
今日目标：正确选择普通字符串字面量与 raw string literal，减少转义噪声，同时把协议文本的所有权、生命周期和字节边界表达清楚。
## ① 今日章节与建议阅读范围 · 5分钟

### 新手起步：先知道今天在解决什么

对比“源文件中看见什么”和“实际发送哪些字节”。原始字符串适合多行样本，不意味着可以忽略协议的 CR、LF 或结束符。

**前置检查：** 先能解释 [Day 8](day-008-string-string-view.md)、[Day 9](day-009-string-operations.md)、[Day 11](day-011-formatting-encoding.md) 的核心例子；不必先掌握整本教材。

**本课最低完成目标：** 能按下面的步骤说明示例如何得到结果，并独立完成一项小修改；高级模式与平台性能分析可第二遍再读。新增导读和拓展练习不计入原有约 60 分钟安排，可分两次完成。

继续 Chapter 2 中 string literals / raw string literals 及字符串收尾内容。阅读时重点问：文本是拥有的数据、非拥有视图，还是编译期常量？转义字符是在表达协议本身，还是只是在满足 C++ 语法？

## ② 昨日复习 3 问 · 5分钟

- 为什么格式化日志不能默认进入硬实时路径？

- snprintf 返回值为什么必须检查？

- 文本编码为什么属于接口契约，而不是 UI 细节？

## ③ 核心概念 · 15分钟

### 先用白话建立概念

- **转义**：用特殊写法表达控制字符。
- **原始字符串**：减少引号与反斜杠的转义。

### 跟着本课实验走一遍

1. 找到命令常量。
2. 逐字节辨认末尾 `\r\n`。
3. 检查命令识别函数对输入的要求。

先尝试口头预测，再到第⑥节运行。下面原有概念、图示与接口对照用于解释这些步骤，短代码片段不一定能单独编译；完整程序以本课 `main.cpp` 为准。

普通 literal：短小协议文本如 "AT+CSQ\r\n" 很清楚，CR/LF 的转义本身就在表达协议。

Raw string literal：当文本包含大量引号、反斜杠或多行 fixture 时，R"(...)" 可减少视觉噪声。但它不是“更现代所以总该用”；如果会隐藏控制字符，普通 literal 反而更好。

类型选择：只读编译期文本优先 constexpr std::string_view；需要拥有和修改时使用 std::string。字符串字面量具有静态存储期，因此由 string_view 借用是安全的；临时 std::string 则不是。

## ④ C 写法 vs 现代 C++ · 10分钟

C · 违反规范

#define CMD "AT+CFUN=1\r\n"
#define PREFIX "+CREG:"

C++ · 推荐

```cpp
inline constexpr std::string_view kSetFullFunctionality{"AT+CFUN=1\r\n"};
inline constexpr std::string_view kRegistrationPrefix{"+CREG:"};
```

宏没有类型和正常作用域；具名 constexpr 常量更容易搜索、检查和 Review。

## ⑤ 今日编码规范 · 10分钟

- MUST — 显式表达意图：协议命令使用具名、带类型常量，不用无类型宏。

- MUST — 避免惊讶：raw string 仅在确实提升可读性时使用；协议控制字符应易于识别。

- SHOULD — 静态检查优先：固定前缀、终止符、字段名尽量 constexpr。

嵌入式：硬实时发送路径不要仅为了拼接常量创建临时 std::string；优先直接发送 view/span 或预分配缓冲区。

## ⑥ 可编译实验 · 20分钟

### 第一次做：先运行，再只改一件事

1. 在仓库根目录打开 [`examples/day-012/main.cpp`](../examples/day-012/main.cpp)，先读 `main()`，圈出输入、调用与结果检查。
2. 运行原版，把实际输出和退出状态记下来，再与本节预期对照。无输出也可能成功，必须结合退出码与断言判断。
3. 修改前先写预期；若失败，先读第一条编译错误或失败断言，再回到对应概念，不同时重写多个函数。

**本课小改动：** 抄出正常命令的字节序列，再构造不带结束符的对照输入；按当前识别规则解释差异。

<details>
<summary>练习提示：卡住时再展开</summary>

把上面的执行步骤当作检查点；保留原版作为对照。若练习故意让编译或断言失败，请只在实验副本操作，解释失败后还原，不把负例混入日常通过用例。不要执行越界、悬空解引用或重复释放来“观察效果”。

</details>

完整源码：[main.cpp](../examples/day-012/main.cpp)。

```cpp
#include <cassert>
#include <iostream>
#include <string_view>

namespace modem {
inline constexpr std::string_view kQuerySignal{"AT+CSQ\r\n"};
inline constexpr std::string_view kExpectedTranscript{
    "AT+CSQ\r\n"
    "+CSQ: 18,99\r\n"
    "OK\r\n"};

bool IsAtCommand(std::string_view text) {
  return text.starts_with("AT");
}

void PrintBytes(std::string_view text) {
  for (const unsigned char ch : text) {
    std::cout << static_cast<unsigned int>(ch) << ' ';
  }
  std::cout << '\n';
}
}  // namespace modem

int main() {
  std::cout << modem::kQuerySignal;
  std::cout << modem::kExpectedTranscript;
  assert(modem::IsAtCommand(modem::kQuerySignal));
  std::cout << std::boolalpha << modem::IsAtCommand(modem::kQuerySignal) << '\n';
  modem::PrintBytes(modem::kQuerySignal);
  return 0;
}
```

在仓库根目录运行：

```bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic examples/day-012/main.cpp -o /tmp/day-012
/tmp/day-012
```

## ⑦ 3 个常见坑 · 5分钟

- 看到反斜杠就机械改用原始字符串，反而降低 CR/LF 等控制字符的可读性。

- 认为 string_view 指向任何表达式都安全；它不拥有数据。

- 把任意二进制帧当字符串处理，导致 NUL、编码和边界语义混乱。

## ⑧ 检查题 · 5分钟

### 分层自测：从解释到判断

1. **理解：** 不看代码，用三句话复述本课示例的输入、关键步骤和结果。
2. **应用：** 说明第⑥节小改动的预期，以及实际结果是否符合预期。
3. **辨析：** 原始字符串里的反斜杠 r 会变成回车吗？

<details>
<summary>辨析题参考答案与通过依据</summary>

不会；原始字符串保留这两个普通字符，控制字符必须另行明确构造。

能运行只是第一步。只有能解释本课具体步骤、完成小改动，并说清一个不适用条件，才算完成本次自测；不清楚时回看第③节，不以阅读次数当作掌握证据。

</details>

### 原课检查题

Q1：多行 JSON fixture 含大量双引号时优先考虑？ A 更多转义 / B raw string literal / C malloc / D 宏。

Q2：固定 AT 命令常量的默认表达？ A #define / B 可写 char[] / C constexpr string_view / D 每次构造 string。
完成标准：能根据可读性、所有权、生命周期和实时约束，在普通 literal、raw literal、string_view、string 之间做选择。
下一节：Day 13 开始 Chapter 3 · Coding with Style，把可读性、命名、格式、注释与工程一致性系统化。

### 对照现有资料库

- [实验环境与工具链边界](<../docs/lab-environments.md>)。
- [类型、借用与错误处理规范](<../guidelines/embedded-cpp-guideline-notes.md>)。

先完成本课小实验，再查对照资料；专题中的线程、网络、板端或模式不是本课默认前置。以上为本项目已有讲解和工程对照，不冒充标准条文，也不表示所有示例已在目标板验证。
