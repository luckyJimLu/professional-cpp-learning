# Day 09 · std::string 的构造、修改、搜索与数值转换

> 历史课程迁移自原 Gmail 正文；已转换为 Markdown。

**Chapter 2 · Working with Strings and String Views
主题：std::string 的构造、修改、搜索与数值转换
今日目标：在 Day 8 的所有权/借用基础上，掌握拥有型文本操作，并把 C 字符数组习惯迁移为边界更清楚的现代 C++。
## ① 今日章节与建议阅读范围 · 5分钟

继续 Chapter 2 的 std::string：构造、拼接、比较、查找、substring、数值转换。把它理解为拥有资源的值类型，而不是“更方便的 char*”。

## ② 昨日复习 · 5分钟

- string 与 string_view 的所有权区别？

- 为什么不能返回指向临时 string 的 view？

- AT 响应解析为什么适合优先使用 view？

## ③ 核心概念 · 15分钟

- std::string 拥有字符存储，适合保存、修改、拼接。

- size()/empty() 代替反复 strlen()。

- find() 返回位置或 npos；substr() 创建拥有型字符串。

- C++ 内部直接比较字符串；c_str() 只作为 C API 边界工具。

- 嵌入式默认禁异常时，协议数值解析优先 std::from_chars，而不是依赖异常的转换路径。

## ④ C 写法 vs 现代 C++ · 10分钟

C：固定数组 + strcat/strstr/atoi，容量、NUL、错误码均需人工管理。
Modern C++：拥有结果用 string；只读借用用 string_view；数值字段用 from_chars；遗留 C API 才使用 c_str()。

## ⑤ 今日编码规范 · 10分钟

- MUST：接口表达所有权与生命周期。

- SHOULD：Include What You Use：直接包含 <string>、<string_view>、<charconv>。

- MUST：硬实时路径避免无界操作；不要把 std::string 的潜在动态分配当成确定时延。

错误：const char* 到处传、反复 strlen、保存借用指针却无生命周期契约。
推荐：借用接口 string_view；拥有接口 string；C API 适配集中在边界。

## ⑥ 可编译实验 · 20分钟

Modem AT 命令构建 + CREG 解析

C++23

#include <charconv>
#include <iostream>
#include <optional>
#include <string>
#include <string_view>

namespace modem {
enum class RegistrationState {
kNotRegistered = 0, kRegisteredHome = 1, kSearching = 2,
kDenied = 3, kUnknown = 4, kRegisteredRoaming = 5
};

std::string BuildAtCommand(std::string_view command, std::string_view argument) {
std::string result{"AT"};
result += command;
if (!argument.empty()) { result += '='; result += argument; }
result += "\r\n";
return result;
}

std::optional<RegistrationState> ParseRegistrationState(std::string_view response) {
constexpr std::string_view kPrefix{"+CREG: "};
const auto prefix_pos = response.find(kPrefix);
if (prefix_pos == std::string_view::npos) return std::nullopt;
const auto text = response.substr(prefix_pos + kPrefix.size());
int value{};
const auto [ptr, error] = std::from_chars(text.data(), text.data()+text.size(), value);
if (error != std::errc{} || ptr == text.data()) return std::nullopt;
switch (value) {
case 0: return RegistrationState::kNotRegistered;
case 1: return RegistrationState::kRegisteredHome;
case 2: return RegistrationState::kSearching;
case 3: return RegistrationState::kDenied;
case 4: return RegistrationState::kUnknown;
case 5: return RegistrationState::kRegisteredRoaming;
default: return std::nullopt;
}
}
} // namespace modem

```bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic -Wswitch-enum day09.cpp -o day09
./day09
```

练习：① 支持无参数 AT+CSQ；② 测试 CREG 0/1/5/99/abc；③ 把使用 char[64] + strcat + atoi 的旧代码重构，并标出“拥有/借用”。

## ⑦ 3 个常见坑 · 5分钟

- 误以为 string 永不分配；SSO 不是实时保证。

- 保存指向被销毁或扩容 string 的 view。

- 无条件把所有 const char* 改为 string，制造无意义分配。

## ⑧ 检查题 · 5分钟

Q1：只在调用期间读取且不保存文本，优先参数？ 答：std::string_view。

Q2：为什么硬实时路径不能默认用可增长 string？ 答：增长可能动态分配/拷贝，时延和内存行为缺乏确定上界。

今日完成标准：能按“拥有 / 借用 / C 边界 / 实时路径”选择 string、string_view 或固定缓冲区；能用 find/substr/from_chars 完成无异常协议解析。

明日预告：Day 10 — string_view 深入：生命周期陷阱、substring、接口设计与零拷贝解析。
