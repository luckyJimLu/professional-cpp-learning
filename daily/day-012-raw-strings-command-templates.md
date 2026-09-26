# Day 12 · 原始字符串字面量、文本常量与安全命令模板

> 历史课程迁移自原 Gmail 正文；已转换为 Markdown。

原始字符串字面量、文本常量与安全命令模板

**Chapter 2 · Working with Strings and String Views
今日目标：正确选择普通字符串字面量与 raw string literal，减少转义噪声，同时把协议文本的所有权、生命周期和字节边界表达清楚。
## ① 今日章节与建议阅读范围 · 5分钟

继续 Chapter 2 中 string literals / raw string literals 及字符串收尾内容。阅读时重点问：文本是拥有的数据、非拥有视图，还是编译期常量？转义字符是在表达协议本身，还是只是在满足 C++ 语法？

## ② 昨日复习 3 问 · 5分钟

- 为什么格式化日志不能默认进入硬实时路径？

- snprintf 返回值为什么必须检查？

- 文本编码为什么属于接口契约，而不是 UI 细节？

## ③ 核心概念 · 15分钟

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

```cpp
#include <iostream>
#include <string_view>
```

```cpp
namespace modem {
inline constexpr std::string_view kQuerySignal{"AT+CSQ\r\n"};
```
inline constexpr std::string_view kExpectedTranscript{R"(AT+CSQ
+CSQ: 18,99
OK
```cpp
)"};
```

```cpp
bool IsAtCommand(std::string_view text) {
return text.starts_with("AT");
}

void PrintBytes(std::string_view text) {
for (const unsigned char ch : text) {
std::cout << static_cast<unsigned int>(ch) << ' ';
}
std::cout << '\n';
}
```
} // namespace modem

```cpp
int main() {
std::cout << modem::kQuerySignal;
std::cout << modem::kExpectedTranscript;
std::cout << std::boolalpha << modem::IsAtCommand(modem::kQuerySignal) << '\n';
modem::PrintBytes(modem::kQuerySignal);
}
```

```bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic day12.cpp -o day12
./day12
```

实验 A：观察 kQuerySignal 最后的字节，确认 CR=13、LF=10。

实验 B：把多行 transcript 改为普通 literal，对比测试 fixture 的可读性。

实验 C · Code Review 修复：把 #define PREFIX "+CREG:" 和 bool parse(char* p) 重构为 constexpr string_view + string_view::find；要求只读输入、有长度边界、函数 PascalCase、参数 snake_case、无需 NUL 终止。

## ⑦ 3 个常见坑 · 5分钟

- 看到反斜杠就机械改 raw string，反而让 CR/LF 难以 Review。

- 认为 string_view 指向任何表达式都安全；它不拥有数据。

- 把任意二进制帧当字符串处理，导致 NUL、编码和边界语义混乱。

## ⑧ 检查题 · 5分钟

Q1：多行 JSON fixture 含大量双引号时优先考虑？ A 更多转义 / B raw string literal / C malloc / D 宏。

Q2：固定 AT 命令常量的默认表达？ A #define / B 可写 char[] / C constexpr string_view / D 每次构造 string。
完成标准：能根据可读性、所有权、生命周期和实时约束，在普通 literal、raw literal、string_view、string 之间做选择。
下一节：Day 13 开始 Chapter 3 · Coding with Style，把可读性、命名、格式、注释与工程一致性系统化。
