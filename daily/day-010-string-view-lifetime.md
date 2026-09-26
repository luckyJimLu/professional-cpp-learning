# Day 10 · string_view 深入：生命周期、子视图与安全解析

> 历史课程迁移自原 Gmail 正文；已转换为 Markdown。

string_view 深入：生命周期、子视图与安全解析

**Chapter 2 · Strings and String Views
今天把 std::string_view 当成“只读、非拥有、带长度的文本视图”，重点训练协议解析中的生命周期与边界意识。
## ① 今日章节与建议阅读范围 · 5分钟

继续 Chapter 2 中 string_view 的构造、访问、子视图以及与 string 的关系。阅读时持续回答：谁拥有字符存储？view 能活多久？什么时候必须复制？

## ② 昨日复习 · 5分钟

- string 与 string_view 最核心的所有权区别？

- 为什么 from_chars 更适合协议字段解析？

- 为什么硬实时路径不能默认依赖不断增长的 string？

## ③ 核心概念 · 15分钟

1. string_view 不拥有字符

它通常只保存指针和长度。复制很便宜，但底层字符必须继续有效。

2. 子视图适合协议切片

remove_prefix()、substr()、find() 可以在不复制数据的情况下缩小解析窗口，非常适合 AT response、URC 和日志字段。

3. 生命周期优先于零拷贝

绝不能为了“零拷贝”返回指向局部 string 的 view。结果若需要独立存在，应返回拥有型对象。

4. data() 不等于 C 字符串

string_view 不保证 NUL 结尾，因此不能默认把 data() 交给依赖 NUL 的 C API。

## ④ C 写法 vs 现代 C++ · 10分钟

C：const char* + size_t，调用双方共同维护边界。
Modern C++：std::string_view 把地址与长度绑定成一个非拥有值对象，接口直接表达 bounded text。

## ⑤ 今日编码规范 · 10分钟

- MUST：借用关系必须明确，view 不得比底层对象活得更久。

- SHOULD：只读文本接口保持小而通用；无需拥有时考虑 string_view。

- MUST：协议解析测试空输入、缺字段、非法数字、边界值和尾部垃圾。

❌ 违反规范

```cpp
std::string_view BuildCommand() {
std::string cmd{"AT+CSQ"};
```
return cmd; // dangling view
```cpp
}
```

✅ 推荐方向

```cpp
std::string BuildCommand() {
return std::string{"AT+CSQ"};
}
```

## ⑥ 20分钟实验：Modem +CREG 零拷贝解析器

目标：解析 +CREG: 2,1，拒绝非法格式；输入借用，结果使用值语义。

```cpp
#include <charconv>
#include <optional>
#include <string_view>
```

```cpp
struct CregStatus {
int mode {};
int status {};
};

std::optional<int> ParseInt(std::string_view text)
{
int value {};
const char* const begin = text.data();
const char* const end = begin + text.size();
const auto [ptr, ec] = std::from_chars(begin, end, value);
if (ec != std::errc{} || ptr != end) {
return std::nullopt;
}
return value;
}

std::optional<CregStatus> ParseCreg(std::string_view response)
{
constexpr std::string_view kPrefix {"+CREG:"};
if (!response.starts_with(kPrefix)) return std::nullopt;
response.remove_prefix(kPrefix.size());
while (!response.empty() && response.front() == ' ') response.remove_prefix(1);
const auto comma = response.find(',');
if (comma == std::string_view::npos) return std::nullopt;
const auto mode = ParseInt(response.substr(0, comma));
const auto status = ParseInt(response.substr(comma + 1));
if (!mode || !status) return std::nullopt;
return CregStatus{.mode = *mode, .status = *status};
}
```

```bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic day10.cpp -o day10
./day10
```

边界测试： +CREG: 2,1、+CREG: 0,5、+CREG:、+CREG: x,1、+CREG: 2,1junk、ERROR、空字符串。

## ⑦ 3 个常见坑 · 5分钟

- view 指向临时 string，随后悬空。

- 把 view.data() 当 NUL-terminated 字符串。

- from_chars 只检查 ec，不检查 ptr == end，错误接受尾部垃圾。

## ⑧ 检查题 · 5分钟

Q1：函数只在调用期间读取 AT response，最能表达非拥有语义的参数通常是？
A. string*　B. string　C. string_view　D. char*

Q2：为什么 string_view 绑定到临时 string 很危险？
因为 view 不拥有底层存储，临时对象销毁后 view 会悬空。
今日肌肉记忆：看到 string_view，立即问：谁拥有数据？能活多久？真的需要复制吗？
C++23 工具链提示：string_view、starts_with 与整数 from_chars 在较新的 GCC/Clang 标准库中已较成熟；嵌入式交叉工具链仍需核对 libstdc++/libc++ 版本。
