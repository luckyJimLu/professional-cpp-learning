# Day 08 · std::string 与 std::string_view：所有权、借用与零拷贝文本接口

> 历史课程迁移自原 Gmail 正文；已转换为 Markdown。

std::string 与 std::string_view：所有权、借用与零拷贝文本接口

**Chapter 2 · Strings and String Views**

今天从第一周的 C→C++ 基础迁移进入字符串主题：重点不是“会拼字符串”，而是区分 std::string 的拥有语义与 std::string_view 的借用语义，并把生命周期思维带入 Modem AT 命令与协议解析。

## ① 今日阅读范围 · 5 分钟

阅读 Chapter 2 开头及 std::string / std::string_view 相关部分。带着三个问题：谁拥有字符内存？是否需要复制？view 的生命周期由谁保证？

## ② 昨日复习 · 5 分钟

- std::span 相比 (pointer,length) 为什么更适合表达缓冲区借用？

- enum class 为什么比整数状态码更利于编译器检查？

- 为什么 static_cast 的显式不等于转换一定安全？

## ③ 核心概念 · 15 分钟

std::string 是拥有者

std::string command{"AT+CGSN"};
command += "\r\n";

std::string_view 是借用视图

bool IsOkResponse(std::string_view response)
{
return response == "OK";
}

它通常不拥有字符数据，因此避免为了只读而复制；代价是调用者必须保证源数据活得足够久。

最大风险：悬空 view

std::string_view Bad()
{
std::string text{"OK"};
return text; // text 销毁后 view 悬空
}
view 的生命周期不能超过它观察的数据。
④ C vs Modern C++ · 10 分钟

C 风格

int is_ok_response(const char* response)
{
if (response == NULL) return 0;
return strcmp(response, "OK") == 0;
}

现代 C++

bool IsOkResponse(std::string_view response)
{
return response == "OK";
}

## ⑤ 今日编码规范 · 10 分钟

绑定三条规则：显式表达意图、非拥有访问明确为借用、接口保持小而清晰。

违反规范

int Parse(char* p, int n, bool copy);

推荐

enum class StorageMode { kBorrow, kCopy };
Status ParseResponse(std::string_view response, StorageMode storage_mode);

若函数只解析、不保存，进一步简化为 Status ParseResponse(std::string_view response);

## ⑥ 20 分钟实验：Modem AT Response Parser

目标：解析 +CSQ: <rssi>,<ber>，不为输入创建动态副本。

#include <charconv>
#include <iostream>
#include <optional>
#include <string_view>

namespace modem {
struct SignalQuality { int rssi{}; int ber{}; };

std::optional<int> ParseInt(std::string_view text)
{
int value{};
const char* begin = text.data();
const char* end = text.data() + text.size();
const auto [ptr, error] = std::from_chars(begin, end, value);
if (error != std::errc{} || ptr != end) return std::nullopt;
return value;
}

std::optional<SignalQuality> ParseCsq(std::string_view response)
{
constexpr std::string_view kPrefix{"+CSQ:"};
if (!response.starts_with(kPrefix)) return std::nullopt;
response.remove_prefix(kPrefix.size());
const std::size_t comma = response.find(',');
if (comma == std::string_view::npos) return std::nullopt;
auto rssi_text = response.substr(0, comma);
auto ber_text = response.substr(comma + 1);
while (!rssi_text.empty() && rssi_text.front() == ' ') rssi_text.remove_prefix(1);
const auto rssi = ParseInt(rssi_text);
const auto ber = ParseInt(ber_text);
if (!rssi || !ber) return std::nullopt;
return SignalQuality{.rssi = *rssi, .ber = *ber};
}
} // namespace modem

编译：

g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic day08.cpp -o day08
./day08

练习：测试边界输入；把 int parse_line(const char* data, int len, bool keep) 重构为明确的借用/保存接口；修复返回局部 string 的 string_view 的生命周期错误。

## ⑦ 三个常见坑 · 5 分钟

- 把 string_view 当拥有者，导致悬空。

- 假设 data() 一定 NUL 终止；子 view 不保证 C 字符串语义。

- 为了“零拷贝”牺牲生命周期安全；先正确，再测量。

## ⑧ 检查题 · 5 分钟

Q1：同步日志函数只读 tag 且不保存，char* / std::string 按值 / std::string_view / void* 中哪个最合适？

Q2：为什么不能返回观察局部 std::string 的 std::string_view？请用“所有权 + 生命周期”解释。

Code Review 快检

- 是否无必要复制字符串？

- view 是否可能比源数据活得更久？

- 是否错误假设 data() NUL 终止？

- 接口是否明确借用/保存语义？

- 是否 Include What You Use？

C++23 / 编译器提示

核心能力在 C++17/20 已可用；std::string_view::starts_with 需要 C++20。旧嵌入式 GCC/libstdc++ 若不支持，可用 substr(0, prefix.size()) == prefix 替代。

明日 Day 9：继续 Chapter 2，深入字符串构造、搜索、拼接、格式化与嵌入式动态分配成本。
