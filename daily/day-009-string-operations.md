---
day: 9
week: 2
part: I
chapter: 2
chapter_title: "Working with Strings and String Views"
title: "std::string 的构造、修改、搜索与数值转换"
duration: 60
status: published
topics:
  - string-operations
guidelines:
  - explicit-contract
lab:
  path: examples/day-009/main.cpp
previous: 8
next: 10
---
# Day 09 · std::string 的构造、修改、搜索与数值转换

<!-- cpp-standards:start -->
## 本课涉及的 C++ 标准

以下按正文与配套 `.cpp` 示例中出现的特性标注首次标准化版本，不代表整份程序的最低编译版本。仓库主 Lab 统一使用 C++23。

| 特性 | 首次标准化 | 版本边界 |
| --- | --- | --- |
| 列表初始化 | **C++11** | 包括直接列表初始化；窄化检查及 initializer_list 优先规则须单独注意。 |
| `constexpr` | **C++11** | C++14 放宽函数体限制；C++20 继续扩展可用于常量求值的操作。声明不保证每次调用都在编译期执行。 |
| `enum class` | **C++11** | 有作用域枚举。 |
| 结构化绑定 | **C++17** | 如 `auto [a, b] = value;`。 |
| `auto` 类型推导 | **C++11** | C++14 才支持普通函数返回类型推导；C++20 才支持 `auto` 形参的简写函数模板。 |
| `std::string_view` | **C++17** | 非拥有视图；其 `starts_with` / `ends_with` 是 C++20 新增。 |
| `std::optional` / `std::nullopt` | **C++17** | 可选值；不自带错误原因。 |
| `std::from_chars` / `std::to_chars` | **C++17** | 整数及浮点重载均在 C++17 标准化；旧标准库的浮点支持可能滞后。 |

版本差异、旧机制与工具链检查见 [C++ 标准来源速查](../docs/cpp-feature-standards.md)。
<!-- cpp-standards:end -->

**Chapter 2 · Working with Strings and String Views
主题：std::string 的构造、修改、搜索与数值转换
今日目标：在 Day 8 的所有权/借用基础上，掌握拥有型文本操作，并把 C 字符数组习惯迁移为边界更清楚的现代 C++。
## ① 今日章节与建议阅读范围 · 5分钟

### 新手起步：先知道今天在解决什么

将“寻找位置”“提取字段”“转换数值”看成三个步骤，分别处理失败。字符串拼接成功不等于拼出的命令符合协议。

**前置检查：** 先能解释 [Day 2](day-002-variables-initialization-casts.md)、[Day 8](day-008-string-string-view.md) 的核心例子；不必先掌握整本教材。

**本课最低完成目标：** 能按下面的步骤说明示例如何得到结果，并独立完成一项小修改；高级模式与平台性能分析可第二遍再读。新增导读和拓展练习不计入原有约 60 分钟安排，可分两次完成。

继续 Chapter 2 的 std::string：构造、拼接、比较、查找、substring、数值转换。把它理解为拥有资源的值类型，而不是“更方便的 char*”。

## ② 昨日复习 · 5分钟

- string 与 string_view 的所有权区别？

- 为什么不能返回指向临时 string 的 view？

- AT 响应解析为什么适合优先使用 view？

## ③ 核心概念 · 15分钟

### 先用白话建立概念

- **npos**：字符串查找未命中的标记。
- **from_chars**：带错误结果的字符数值转换。

### 跟着本课实验走一遍

1. 观察 `AT+CSQ` 如何补上结束符。
2. 读取带参数命令的构造。
3. 检查注册响应如何得到枚举状态。

先尝试口头预测，再到第⑥节运行。下面原有概念、图示与接口对照用于解释这些步骤，短代码片段不一定能单独编译；完整程序以本课 `main.cpp` 为准。

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

### 第一次做：先运行，再只改一件事

1. 在仓库根目录打开 [`examples/day-009/main.cpp`](../examples/day-009/main.cpp)，先读 `main()`，圈出输入、调用与结果检查。
2. 运行原版，把实际输出和退出状态记下来，再与本节预期对照。无输出也可能成功，必须结合退出码与断言判断。
3. 修改前先写预期；若失败，先读第一条编译错误或失败断言，再回到对应概念，不同时重写多个函数。

**本课小改动：** 为查找过程增加不存在的分隔符输入，预期进入失败路径，不能拿 `npos` 继续当有效位置使用。

<details>
<summary>练习提示：卡住时再展开</summary>

把上面的执行步骤当作检查点；保留原版作为对照。若练习故意让编译或断言失败，请只在实验副本操作，解释失败后还原，不把负例混入日常通过用例。不要执行越界、悬空解引用或重复释放来“观察效果”。

</details>

Modem AT 命令构建 + CREG 解析

C++23

完整源码：[main.cpp](../examples/day-009/main.cpp)。

```cpp
#include <cassert>
#include <charconv>
#include <iostream>
#include <optional>
#include <string>
#include <string_view>

namespace modem {
enum class RegistrationState {
  kNotRegistered = 0,
  kRegisteredHome = 1,
  kSearching = 2,
  kDenied = 3,
  kUnknown = 4,
  kRegisteredRoaming = 5
};

std::string BuildAtCommand(std::string_view command, std::string_view argument) {
  std::string result{"AT"};
  result += command;
  if (!argument.empty()) {
    result += '=';
    result += argument;
  }
  result += "\r\n";
  return result;
}

std::optional<RegistrationState> ParseRegistrationState(std::string_view response) {
  constexpr std::string_view kPrefix{"+CREG: "};
  const auto prefix_pos = response.find(kPrefix);
  if (prefix_pos == std::string_view::npos) return std::nullopt;
  const auto text = response.substr(prefix_pos + kPrefix.size());
  int value{};
  const auto [ptr, error] = std::from_chars(text.data(), text.data() + text.size(), value);
  if (error != std::errc{} || ptr == text.data()) return std::nullopt;
  switch (value) {
    case 0:
      return RegistrationState::kNotRegistered;
    case 1:
      return RegistrationState::kRegisteredHome;
    case 2:
      return RegistrationState::kSearching;
    case 3:
      return RegistrationState::kDenied;
    case 4:
      return RegistrationState::kUnknown;
    case 5:
      return RegistrationState::kRegisteredRoaming;
    default:
      return std::nullopt;
  }
}
}  // namespace modem

int main() {
  const auto cmd = modem::BuildAtCommand("+CSQ", "");
  assert(cmd == "AT+CSQ\r\n");

  const auto cmd_with_arg = modem::BuildAtCommand("+CFUN", "1");
  assert(cmd_with_arg == "AT+CFUN=1\r\n");

  const auto reg = modem::ParseRegistrationState("+CREG: 1");
  assert(reg == modem::RegistrationState::kRegisteredHome);

  std::cout << "Built: " << cmd_with_arg;
  std::cout << "Registration parsed: home network\n";
  return 0;
}
```

在仓库根目录运行：

```bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic examples/day-009/main.cpp -o /tmp/day-009
/tmp/day-009
```

## ⑦ 3 个常见坑 · 5分钟

- 误以为 `std::string` 永远不会触发动态分配；SSO 不提供实时时延保证。

- 保存指向已销毁或重新分配内存的 `std::string` 的视图。

- 无条件把所有 const char* 改为 string，制造无意义分配。

## ⑧ 检查题 · 5分钟

### 分层自测：从解释到判断

1. **理解：** 不看代码，用三句话复述本课示例的输入、关键步骤和结果。
2. **应用：** 说明第⑥节小改动的预期，以及实际结果是否符合预期。
3. **辨析：** 解析出一个数字就表示整段文本有效吗？

<details>
<summary>辨析题参考答案与通过依据</summary>

不一定；还要确认解析指针是否到达要求的末尾，例如 `12x` 不能自动当作合法整数 12。

能运行只是第一步。只有能解释本课具体步骤、完成小改动，并说清一个不适用条件，才算完成本次自测；不清楚时回看第③节，不以阅读次数当作掌握证据。

</details>

### 原课检查题

Q1：只在调用期间读取且不保存文本，优先参数？ 答：std::string_view。

Q2：为什么硬实时路径不能默认用可增长 string？ 答：增长可能动态分配/拷贝，时延和内存行为缺乏确定上界。

今日完成标准：能按“拥有 / 借用 / C 边界 / 实时路径”选择 string、string_view 或固定缓冲区；能用 find/substr/from_chars 完成无异常协议解析。

明日预告：Day 10 — string_view 深入：生命周期陷阱、substring、接口设计与零拷贝解析。

### 对照现有资料库

- [实验环境与工具链边界](<../docs/lab-environments.md>)。
- [类型、借用与错误处理规范](<../guidelines/embedded-cpp-guideline-notes.md>)。

先完成本课小实验，再查对照资料；专题中的线程、网络、板端或模式不是本课默认前置。以上为本项目已有讲解和工程对照，不冒充标准条文，也不表示所有示例已在目标板验证。
