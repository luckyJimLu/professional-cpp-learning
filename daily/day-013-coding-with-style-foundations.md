---
day: 13
week: 2
part: I
chapter: 3
chapter_title: Coding with Style
title: "可读性、命名与接口契约"
duration: 60
status: published

topics:
  - readability
  - naming
  - interface-contracts

guidelines:
  - small-interface
  - naming-intent

lab:
  path: examples/day-013/main.cpp
previous: 12
next: 14
---

# Day 13 · Coding with Style：可读性、命名与接口契约

<!-- cpp-standards:start -->
## 本课涉及的 C++ 标准

以下按正文与配套 `.cpp` 示例中出现的特性标注首次标准化版本，不代表整份程序的最低编译版本。仓库主 Lab 统一使用 C++23。

| 特性 | 首次标准化 | 版本边界 |
| --- | --- | --- |
| 列表初始化 | **C++11** | 包括直接列表初始化；窄化检查及 initializer_list 优先规则须单独注意。 |
| `constexpr` | **C++11** | C++14 放宽函数体限制；C++20 继续扩展可用于常量求值的操作。声明不保证每次调用都在编译期执行。 |
| `enum class` | **C++11** | 有作用域枚举。 |
| `auto` 类型推导 | **C++11** | C++14 才支持普通函数返回类型推导；C++20 才支持 `auto` 形参的简写函数模板。 |
| `<cstdint>` 固定宽度整数 | **C++11** | 精确宽度类型仅在实现提供对应整数类型时存在。 |
| `std::chrono` | **C++11** | 如 duration、time_point、steady_clock；不是所有 chrono 后增 API 都属于 C++11。 |
| chrono 时长字面量 | **C++14** | 如 `100ms`；需要相应头文件与 `std::chrono_literals`。 |
| `std::string_view` | **C++17** | 非拥有视图；其 `starts_with` / `ends_with` 是 C++20 新增。 |

版本差异、旧机制与工具链检查见 [C++ 标准来源速查](../docs/cpp-feature-standards.md)。
<!-- cpp-standards:end -->

## ① 今日章节与建议阅读范围（5 分钟）

### 新手起步：先知道今天在解决什么

从调用者视角读代码：不要先背命名规范，而要找“这个参数是什么、单位是什么、失败怎么办”。风格服务于减少猜测。

**前置检查：** 先能解释 [Day 2](day-002-variables-initialization-casts.md)、[Day 4](day-004-references-parameter-passing.md)、[Day 6](day-006-enum-class-state-machine.md) 的核心例子；不必先掌握整本教材。

**本课最低完成目标：** 能按下面的步骤说明示例如何得到结果，并独立完成一项小修改；高级模式与平台性能分析可第二遍再读。新增导读和拓展练习不计入原有约 60 分钟安排，可分两次完成。

进入 Chapter 3 · **Coding with Style**。今天先建立三条主线：

- 可读性优先；
- 一致性优先；
- 让接口本身表达契约，而不是依靠调用者猜测。

## ② 昨日复习 3 问（5 分钟）

1. raw string literal 最适合解决什么问题？
2. 协议文本常量为什么适合 `constexpr std::string_view`？
3. 文本协议为什么仍必须明确 CR/LF 等实际字节边界？

## ③ 核心概念（15 分钟）

### 先用白话建立概念

- **接口**：调用方可见的使用入口。
- **契约**：入口的有效输入与结果约定。

### 跟着本课实验走一遍

1. 先读调用点的 options。
2. 再看类型和默认值。
3. 最后追踪 Attach 的结果如何被检查。

先尝试口头预测，再到第⑥节运行。下面原有概念、图示与接口对照用于解释这些步骤，短代码片段不一定能单独编译；完整程序以本课 `main.cpp` 为准。

专业代码风格并不等于“排版漂亮”。它的目标是降低维护者理解代码所需的推理量。

### 读者优先（Reader-first）

调用者应能从类型和名称中直接看出：

- 输入是什么；
- 输出是什么；
- 是否可能失败；
- 单位是什么；
- 谁拥有对象；
- 是否允许为空。

### 一致性（Consistency）

团队统一采用一套约定，比每个文件选择“个人最喜欢”的风格更重要。

### 契约（Contract）

以下接口迫使调用者猜测：

```cpp
int Send(int type, int timeout, bool wait, bool retry);
```

更清晰的方向是强类型 + 配置对象。

## ④ C 写法 vs 现代 C++（10 分钟）

```c
int modem_attach(int mode, int timeout, int retry);
```

改为：

```cpp
#include <chrono>
#include <cstdint>

enum class AttachMode {
  kAutomatic,
  kManual,
};

struct AttachOptions {
  AttachMode mode{AttachMode::kAutomatic};
  std::chrono::milliseconds timeout{5000};
  std::uint8_t retry_count{2};
};
```

## ⑤ 今日编码规范（10 分钟）

### MUST：命名表达角色和单位

```cpp
auto timeout_ms = 5000;  // 至少明确单位
```

优先进一步使用：

```cpp
std::chrono::milliseconds timeout{5000};
```

### SHOULD：参数过多时使用 Options / Config

错误：

```cpp
Status Attach(int mode, int timeout, bool retry, bool force);
```

推荐：

```cpp
Status Attach(const AttachOptions& options);
```

### MUST：注释解释“为什么”

低价值：

```cpp
// Set timeout to 5000.
timeout_ms = 5000;
```

更有价值：

```cpp
// The module may take several seconds to register after RF is enabled.
timeout_ms = 5000;
```

## ⑥ 可编译小实验（20 分钟）

### 第一次做：先运行，再只改一件事

1. 在仓库根目录打开 [`examples/day-013/main.cpp`](../examples/day-013/main.cpp)，先读 `main()`，圈出输入、调用与结果检查。
2. 运行原版，把实际输出和退出状态记下来，再与本节预期对照。无输出也可能成功，必须结合退出码与断言判断。
3. 修改前先写预期；若失败，先读第一条编译错误或失败断言，再回到对应概念，不同时重写多个函数。

**本课小改动：** 挑一个含糊的变量名，改成带业务含义的名称并同步调用点；行为和实验结果应保持不变。

<details>
<summary>练习提示：卡住时再展开</summary>

把上面的执行步骤当作检查点；保留原版作为对照。若练习故意让编译或断言失败，请只在实验副本操作，解释失败后还原，不把负例混入日常通过用例。不要执行越界、悬空解引用或重复释放来“观察效果”。

</details>

完整源码：[main.cpp](../examples/day-013/main.cpp)。

```cpp
#include <cassert>
#include <chrono>
#include <cstdint>

using namespace std::chrono_literals;

enum class Status {
  kOk,
  kInvalidArgument,
};

enum class AttachMode {
  kAutomatic,
  kManual,
};

struct AttachOptions {
  AttachMode mode{AttachMode::kAutomatic};
  std::chrono::milliseconds timeout{5000ms};
  std::uint8_t retry_count{2};
};

class ModemSession {
public:
  Status Attach(const AttachOptions& options) {
    if (options.timeout <= 0ms) {
      return Status::kInvalidArgument;
    }
    options_ = options;
    return Status::kOk;
  }

private:
  AttachOptions options_{};
};

int main() {
  ModemSession modem;
  AttachOptions options;
  options.timeout = 3s;

  assert(modem.Attach(options) == Status::kOk);
}
```

在仓库根目录运行：

```bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic examples/day-013/main.cpp -o /tmp/day-013
/tmp/day-013
```

## ⑦ 3 个常见坑（5 分钟）

1. 通过长注释弥补糟糕接口，而不是先修接口。
2. 参数名称虽然清晰，但弱类型依然允许误传。
3. 每个模块发明自己的命名风格。

## ⑧ 检查题（5 分钟）

### 分层自测：从解释到判断

1. **理解：** 不看代码，用三句话复述本课示例的输入、关键步骤和结果。
2. **应用：** 说明第⑥节小改动的预期，以及实际结果是否符合预期。
3. **辨析：** 统一命名是否就等于接口安全？

<details>
<summary>辨析题参考答案与通过依据</summary>

不是；还需检查输入范围、错误结果、所有权和生命周期，排版无法替代这些约束。

能运行只是第一步。只有能解释本课具体步骤、完成小改动，并说清一个不适用条件，才算完成本次自测；不清楚时回看第③节，不以阅读次数当作掌握证据。

</details>

### 原课检查题

1. “读者优先”为什么通常会推动更小的接口？
2. 多个 `bool` 参数为什么经常是 API smell？

**答案要点**：接口越小，契约越容易理解和测试；多个 `bool` 在调用点缺乏自描述性，且组合状态会快速增加。

### 对照现有资料库

- [编码规范与错误处理](<../guidelines/embedded-cpp-guideline-notes.md>)。
- [代码评审依据](<../guidelines/review-rubric.md>)。

先完成本课小实验，再查对照资料；专题中的线程、网络、板端或模式不是本课默认前置。以上为本项目已有讲解和工程对照，不冒充标准条文，也不表示所有示例已在目标板验证。
