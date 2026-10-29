---
day: 8
week: 2
part: I
chapter: 2
chapter_title: "Working with Strings and String Views"
title: "std::string 与 std::string_view：所有权、借用与零拷贝文本接口"
duration: 60
status: published
topics:
  - string-string-view
guidelines:
  - explicit-contract
lab:
  path: examples/day-008/main.cpp
previous: 7
next: 9
---
# Day 08 · std::string 与 std::string_view：所有权、借用与零拷贝文本接口

<!-- cpp-standards:start -->
## 本课涉及的 C++ 标准

以下按正文与配套 `.cpp` 示例中出现的特性标注首次标准化版本，不代表整份程序的最低编译版本。仓库主 Lab 统一使用 C++23。

| 特性 | 首次标准化 | 版本边界 |
| --- | --- | --- |
| 列表初始化 | **C++11** | 包括直接列表初始化；窄化检查及 initializer_list 优先规则须单独注意。 |
| `constexpr` | **C++11** | C++14 放宽函数体限制；C++20 继续扩展可用于常量求值的操作。声明不保证每次调用都在编译期执行。 |
| `nullptr` | **C++11** | 空指针字面量；不要与整数 0 的类型混为一谈。 |
| `enum class` | **C++11** | 有作用域枚举。 |
| 结构化绑定 | **C++17** | 如 `auto [a, b] = value;`。 |
| `auto` 类型推导 | **C++11** | C++14 才支持普通函数返回类型推导；C++20 才支持 `auto` 形参的简写函数模板。 |
| 原始字符串字面量 | **C++11** | 如 `R"(text)"`；不负责字符编码转换。 |
| `std::string_view` | **C++17** | 非拥有视图；其 `starts_with` / `ends_with` 是 C++20 新增。 |
| `string` / `string_view` 的前后缀检查 | **C++20** | `starts_with` / `ends_with`。 |
| `std::optional` / `std::nullopt` | **C++17** | 可选值；不自带错误原因。 |
| `std::from_chars` / `std::to_chars` | **C++17** | 整数及浮点重载均在 C++17 标准化；旧标准库的浮点支持可能滞后。 |
| `std::span` | **C++20** | 连续序列的非拥有视图；不自动延长底层对象生命周期。 |

版本差异、旧机制与工具链检查见 [C++ 标准来源速查](../docs/cpp-feature-standards.md)。
<!-- cpp-standards:end -->

std::string 与 std::string_view：所有权、借用与零拷贝文本接口

**Chapter 2 · Strings and String Views**

今天从第一周的 C→C++ 基础迁移进入字符串主题：重点不是“会拼字符串”，而是区分 std::string 的拥有语义与 std::string_view 的借用语义，并把生命周期思维带入 Modem AT 命令与协议解析。

## ① 今日阅读范围 · 5 分钟

### 新手起步：先知道今天在解决什么

先问结果是否要保存，再决定使用拥有型字符串还是视图。视图复制的是位置和长度，底层字符不会因此多活一会儿。

**前置检查：** 先能解释 [Day 4](day-004-references-parameter-passing.md)、[Day 5](day-005-pointers-nullptr-bounds.md) 的核心例子；不必先掌握整本教材。

**本课最低完成目标：** 能按下面的步骤说明示例如何得到结果，并独立完成一项小修改；高级模式与平台性能分析可第二遍再读。新增导读和拓展练习不计入原有约 60 分钟安排，可分两次完成。

阅读 Chapter 2 开头及 std::string / std::string_view 相关部分。带着三个问题：谁拥有字符内存？是否需要复制？view 的生命周期由谁保证？

## ② 昨日复习 · 5 分钟

- std::span 相比 (pointer,length) 为什么更适合表达缓冲区借用？

- enum class 为什么比整数状态码更利于编译器检查？

- 为什么 static_cast 的显式不等于转换一定安全？

## ③ 核心概念 · 15 分钟

### 先用白话建立概念

- **string**：拥有字符存储的字符串。
- **string_view**：只读借用字符范围。

### 跟着本课实验走一遍

1. 找到 CSQ 响应文本。
2. 识别前缀和分隔符。
3. 解析 RSSI、BER。
4. 对照正常与非法响应的断言。

先尝试口头预测，再到第⑥节运行。下面原有概念、图示与接口对照用于解释这些步骤，短代码片段不一定能单独编译；完整程序以本课 `main.cpp` 为准。

std::string 是拥有者

```cpp
std::string command{"AT+CGSN"};
command += "\r\n";
```

std::string_view 是借用视图

```cpp
bool IsOkResponse(std::string_view response) {
  return response == "OK";
}
```

它通常不拥有字符数据，因此避免为了只读而复制；代价是调用者必须保证源数据活得足够久。

最大风险：悬空 view

```cpp
std::string_view Bad() {
  std::string text{"OK"};
  return text;  // text 销毁后 view 悬空
}
```
view 的生命周期不能超过它观察的数据。
## ④ C vs Modern C++ · 10 分钟

C 风格

```cpp
int is_ok_response(const char* response) {
  if (response == NULL) return 0;
  return strcmp(response, "OK") == 0;
}
```

现代 C++

```cpp
bool IsOkResponse(std::string_view response) {
  return response == "OK";
}
```

## ⑤ 今日编码规范 · 10 分钟

绑定三条规则：显式表达意图、非拥有访问明确为借用、接口保持小而清晰。

违反规范

```cpp
int Parse(char* p, int n, bool copy);
```

推荐

```cpp
enum class StorageMode { kBorrow, kCopy };
Status ParseResponse(std::string_view response, StorageMode storage_mode);
```

若函数只解析、不保存，进一步简化为 Status ParseResponse(std::string_view response);

## ⑥ 20 分钟实验：Modem AT Response Parser

### 第一次做：先运行，再只改一件事

1. 在仓库根目录打开 [`examples/day-008/main.cpp`](../examples/day-008/main.cpp)，先读 `main()`，圈出输入、调用与结果检查。
2. 运行原版，把实际输出和退出状态记下来，再与本节预期对照。无输出也可能成功，必须结合退出码与断言判断。
3. 修改前先写预期；若失败，先读第一条编译错误或失败断言，再回到对应概念，不同时重写多个函数。

**本课小改动：** 增加一个缺少数值的响应，预期返回无结果；再说明解析出的数值为何不依赖原字符串继续存在。

<details>
<summary>练习提示：卡住时再展开</summary>

把上面的执行步骤当作检查点；保留原版作为对照。若练习故意让编译或断言失败，请只在实验副本操作，解释失败后还原，不把负例混入日常通过用例。不要执行越界、悬空解引用或重复释放来“观察效果”。

</details>

目标：解析 +CSQ: <rssi>,<ber>，不为输入创建动态副本。

完整源码：[main.cpp](../examples/day-008/main.cpp)。

```cpp
#include <cassert>
#include <charconv>
#include <iostream>
#include <optional>
#include <string_view>

namespace modem {
struct SignalQuality {
  int rssi{};
  int ber{};
};

std::optional<int> ParseInt(std::string_view text) {
  int value{};
  const char* begin = text.data();
  const char* end = text.data() + text.size();
  const auto [ptr, error] = std::from_chars(begin, end, value);
  if (error != std::errc{} || ptr != end) return std::nullopt;
  return value;
}

std::optional<SignalQuality> ParseCsq(std::string_view response) {
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
}  // namespace modem

int main() {
  const auto quality = modem::ParseCsq("+CSQ: 18,99");
  assert(quality.has_value());
  assert(quality->rssi == 18);
  assert(quality->ber == 99);

  assert(!modem::ParseCsq("+ERROR").has_value());
  assert(!modem::ParseCsq("+CSQ: invalid").has_value());

  std::cout << "Parsed CSQ: rssi=" << quality->rssi << ", ber=" << quality->ber << '\n';
  return 0;
}
```

在仓库根目录运行：

```bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic examples/day-008/main.cpp -o /tmp/day-008
/tmp/day-008
```

## ⑦ 三个常见坑 · 5 分钟

- 把 string_view 当拥有者，导致悬空。

- 假设 data() 一定 NUL 终止；子 view 不保证 C 字符串语义。

- 为了“零拷贝”牺牲生命周期安全；先正确，再测量。

## ⑧ 检查题 · 5 分钟

### 分层自测：从解释到判断

1. **理解：** 不看代码，用三句话复述本课示例的输入、关键步骤和结果。
2. **应用：** 说明第⑥节小改动的预期，以及实际结果是否符合预期。
3. **辨析：** 从函数返回局部 `string` 的视图安全吗？

<details>
<summary>辨析题参考答案与通过依据</summary>

不安全；局部字符串销毁后视图失效。需要独立保存时返回拥有型结果。

能运行只是第一步。只有能解释本课具体步骤、完成小改动，并说清一个不适用条件，才算完成本次自测；不清楚时回看第③节，不以阅读次数当作掌握证据。

</details>

### 原课检查题

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

### 对照现有资料库

- [实验环境与工具链边界](<../docs/lab-environments.md>)。
- [类型、借用与错误处理规范](<../guidelines/embedded-cpp-guideline-notes.md>)。

先完成本课小实验，再查对照资料；专题中的线程、网络、板端或模式不是本课默认前置。以上为本项目已有讲解和工程对照，不冒充标准条文，也不表示所有示例已在目标板验证。
