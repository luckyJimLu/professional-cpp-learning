---
day: 10
week: 2
part: I
chapter: 2
chapter_title: "Working with Strings and String Views"
title: "string_view 深入：生命周期、子视图与安全解析"
duration: 60
status: published
topics:
  - string-view-lifetime
guidelines:
  - explicit-contract
lab:
  path: examples/day-010/main.cpp
previous: 9
next: 11
---
# Day 10 · string_view 深入：生命周期、子视图与安全解析

<!-- cpp-standards:start -->
## 本课涉及的 C++ 标准

以下按正文与配套 `.cpp` 示例中出现的特性标注首次标准化版本，不代表整份程序的最低编译版本。仓库主 Lab 统一使用 C++23。

| 特性 | 首次标准化 | 版本边界 |
| --- | --- | --- |
| 列表初始化 | **C++11** | 包括直接列表初始化；窄化检查及 initializer_list 优先规则须单独注意。 |
| `constexpr` | **C++11** | C++14 放宽函数体限制；C++20 继续扩展可用于常量求值的操作。声明不保证每次调用都在编译期执行。 |
| `nullptr` | **C++11** | 空指针字面量；不要与整数 0 的类型混为一谈。 |
| 结构化绑定 | **C++17** | 如 `auto [a, b] = value;`。 |
| `auto` 类型推导 | **C++11** | C++14 才支持普通函数返回类型推导；C++20 才支持 `auto` 形参的简写函数模板。 |
| 原始字符串字面量 | **C++11** | 如 `R"(text)"`；不负责字符编码转换。 |
| `std::string_view` | **C++17** | 非拥有视图；其 `starts_with` / `ends_with` 是 C++20 新增。 |
| `string` / `string_view` 的前后缀检查 | **C++20** | `starts_with` / `ends_with`。 |
| `std::optional` / `std::nullopt` | **C++17** | 可选值；不自带错误原因。 |
| `std::from_chars` / `std::to_chars` | **C++17** | 整数及浮点重载均在 C++17 标准化；旧标准库的浮点支持可能滞后。 |

版本差异、旧机制与工具链检查见 [C++ 标准来源速查](../docs/cpp-feature-standards.md)。
<!-- cpp-standards:end -->

string_view 深入：生命周期、子视图与安全解析

**Chapter 2 · Strings and String Views
今天把 std::string_view 当成“只读、非拥有、带长度的文本视图”，重点训练协议解析中的生命周期与边界意识。
## ① 今日章节与建议阅读范围 · 5分钟

### 新手起步：先知道今天在解决什么

把原字符串画成长条，前缀、字段都是其中的范围。切片可以不复制，但源字符串的销毁、重分配等行为可能使视图失效。

**前置检查：** 先能解释 [Day 5](day-005-pointers-nullptr-bounds.md)、[Day 8](day-008-string-string-view.md)、[Day 9](day-009-string-operations.md) 的核心例子；不必先掌握整本教材。

**本课最低完成目标：** 能按下面的步骤说明示例如何得到结果，并独立完成一项小修改；高级模式与平台性能分析可第二遍再读。新增导读和拓展练习不计入原有约 60 分钟安排，可分两次完成。

继续 Chapter 2 中 string_view 的构造、访问、子视图以及与 string 的关系。阅读时持续回答：谁拥有字符存储？view 能活多久？什么时候必须复制？

## ② 昨日复习 · 5分钟

- string 与 string_view 最核心的所有权区别？

- 为什么 from_chars 更适合协议字段解析？

- 为什么硬实时路径不能默认依赖不断增长的 string？

## ③ 核心概念 · 15分钟

### 先用白话建立概念

- **子视图**：原数据中更小的借用范围。
- **悬空**：访问目标生命周期已经结束。

### 跟着本课实验走一遍

1. 确认 `+CREG:` 前缀。
2. 缩小视图到字段。
3. 分别解析 mode 与 status。
4. 检查缺字段和非数字路径。

先尝试口头预测，再到第⑥节运行。下面原有概念、图示与接口对照用于解释这些步骤，短代码片段不一定能单独编译；完整程序以本课 `main.cpp` 为准。

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
  return cmd;  // dangling view
}
```

✅ 推荐方向

```cpp
std::string BuildCommand() {
  return std::string{"AT+CSQ"};
}
```

## ⑥ 20分钟实验：Modem +CREG 零拷贝解析器

### 第一次做：先运行，再只改一件事

1. 在仓库根目录打开 [`examples/day-010/main.cpp`](../examples/day-010/main.cpp)，先读 `main()`，圈出输入、调用与结果检查。
2. 运行原版，把实际输出和退出状态记下来，再与本节预期对照。无输出也可能成功，必须结合退出码与断言判断。
3. 修改前先写预期；若失败，先读第一条编译错误或失败断言，再回到对应概念，不同时重写多个函数。

**本课小改动：** 增加合法响应的一个边界值和一个多余尾部字符用例，先依据当前接口约定判断是否应接受。

<details>
<summary>练习提示：卡住时再展开</summary>

把上面的执行步骤当作检查点；保留原版作为对照。若练习故意让编译或断言失败，请只在实验副本操作，解释失败后还原，不把负例混入日常通过用例。不要执行越界、悬空解引用或重复释放来“观察效果”。

</details>

目标：解析 +CREG: 2,1，拒绝非法格式；输入借用，结果使用值语义。

完整源码：[main.cpp](../examples/day-010/main.cpp)。

```cpp
#include <cassert>
#include <charconv>
#include <iostream>
#include <optional>
#include <string_view>

struct CregStatus {
  int mode{};
  int status{};
};

std::optional<int> ParseInt(std::string_view text) {
  int value{};
  const char* const begin = text.data();
  const char* const end = begin + text.size();
  const auto [ptr, ec] = std::from_chars(begin, end, value);
  if (ec != std::errc{} || ptr != end) {
    return std::nullopt;
  }
  return value;
}

std::optional<CregStatus> ParseCreg(std::string_view response) {
  constexpr std::string_view kPrefix{"+CREG:"};
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

int main() {
  const auto creg = ParseCreg("+CREG: 2,1");
  assert(creg.has_value());
  assert(creg->mode == 2);
  assert(creg->status == 1);

  assert(!ParseCreg("+CREG:").has_value());
  assert(!ParseCreg("+CREG: x,1").has_value());
  assert(!ParseCreg("ERROR").has_value());

  std::cout << "Parsed +CREG: mode=" << creg->mode << ", status=" << creg->status << '\n';
  return 0;
}
```

在仓库根目录运行：

```bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic examples/day-010/main.cpp -o /tmp/day-010
/tmp/day-010
```

## ⑦ 3 个常见坑 · 5分钟

- 视图指向临时 `std::string`，导致后置悬空。

- 把 `view.data()` 当作 NUL 结尾的 C 字符串。

- from_chars 只检查 ec，不检查 ptr == end，错误接受尾部垃圾。

## ⑧ 检查题 · 5分钟

### 分层自测：从解释到判断

1. **理解：** 不看代码，用三句话复述本课示例的输入、关键步骤和结果。
2. **应用：** 说明第⑥节小改动的预期，以及实际结果是否符合预期。
3. **辨析：** `string_view::data()` 可以直接交给 `strlen` 吗？

<details>
<summary>辨析题参考答案与通过依据</summary>

不能默认如此；视图不保证在它的范围末尾存在 NUL，C 接口需要明确的长度或专门转换。

能运行只是第一步。只有能解释本课具体步骤、完成小改动，并说清一个不适用条件，才算完成本次自测；不清楚时回看第③节，不以阅读次数当作掌握证据。

</details>

### 原课检查题

Q1：函数只在调用期间读取 AT response，最能表达非拥有语义的参数通常是？
A. string*　B. string　C. string_view　D. char*

Q2：为什么 string_view 绑定到临时 string 很危险？
因为 view 不拥有底层存储，临时对象销毁后 view 会悬空。
今日肌肉记忆：看到 string_view，立即问：谁拥有数据？能活多久？真的需要复制吗？
C++23 工具链提示：string_view、starts_with 与整数 from_chars 在较新的 GCC/Clang 标准库中已较成熟；嵌入式交叉工具链仍需核对 libstdc++/libc++ 版本。

### 对照现有资料库

- [实验环境与工具链边界](<../docs/lab-environments.md>)。
- [类型、借用与错误处理规范](<../guidelines/embedded-cpp-guideline-notes.md>)。

先完成本课小实验，再查对照资料；专题中的线程、网络、板端或模式不是本课默认前置。以上为本项目已有讲解和工程对照，不冒充标准条文，也不表示所有示例已在目标板验证。
