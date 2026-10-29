---
day: 6
week: 1
part: I
chapter: 1
chapter_title: "A Crash Course in C++ and the Standard Library"
title: "enum class、结构化绑定与类型安全状态机"
duration: 60
status: published
topics:
  - enum-class-state-machine
guidelines:
  - explicit-contract
lab:
  path: examples/day-006/main.cpp
previous: 5
next: 7
---
# Day 06 · enum class、结构化绑定与类型安全状态机

enum class、结构化绑定与类型安全状态机
今日目标：把 C 中“整数状态码 + 输出参数 + switch”升级为强类型枚举、结构化返回值与可审查的状态机接口。
## ① 今日章节与建议阅读范围 · 5分钟

### 新手起步：先知道今天在解决什么

把状态、事件和转移结果分开。`enum class` 防止混用不同枚举类型，不能单独保证每次业务转移都合法。结构化绑定用于拆开一个返回值对象。

**前置检查：** 先能解释 [Day 2](day-002-variables-initialization-casts.md)、[Day 4](day-004-references-parameter-passing.md)、[Day 5](day-005-pointers-nullptr-bounds.md) 的核心例子；不必先掌握整本教材。

**本课最低完成目标：** 能按下面的步骤说明示例如何得到结果，并独立完成一项小修改；高级模式与平台性能分析可第二遍再读。新增导读和拓展练习不计入原有约 60 分钟安排，可分两次完成。

继续 Chapter 1 中枚举、结构化绑定、函数返回值与相关现代 C++ 语法。重点观察类型系统怎样消灭一部分非法状态和参数误用。

## ② 昨日复习 · 5分钟

- nullptr 相比 0/NULL 为什么更适合表达空指针？

- 为什么 (pointer, length) 接口容易出现边界错误？

- 裸指针在现代 C++ 中通常应表达借用还是所有权？

## ③ 核心概念 · 15分钟

### 先用白话建立概念

- **枚举**：一组具名取值。
- **状态转移**：由事件触发状态变化。

### 跟着本课实验走一遍

1. 找到状态初值。
2. 沿实验中的事件查看 `switch` 分支。
3. 再检查信号结构体如何拆成 RSSI 和质量两个值。

先尝试口头预测，再到第⑥节运行。下面原有概念、图示与接口对照用于解释这些步骤，短代码片段不一定能单独编译；完整程序以本课 `main.cpp` 为准。

1. enum class 替代裸整数状态

```cpp
enum class ModemState {
  kOff,
  kBooting,
  kRegistering,
  kReady,
  kError,
};
```

enum class 不会隐式转换成整数，也不会把枚举值泄漏到外层作用域。

2. switch 覆盖强类型状态

状态机代码的目标不是“短”，而是让状态空间显式、可审查；新增枚举值后，应让编译告警帮助发现漏处理分支。

3. 多个相关返回值优先返回值对象

```cpp
struct SignalInfo {
  int rssi_dbm{};
  int quality_percent{};
};

auto [rssi_dbm, quality_percent] = ReadSignal();
```

## ④ C 写法 vs 现代 C++ · 10分钟

C 风格

```cpp
#define MODEM_READY 3
int modem_get_signal(int *rssi, int *quality) {
  if (rssi == NULL || quality == NULL) return -1;
  *rssi = -75;
  *quality = 65;
  return 0;
}
```

现代 C++

```cpp
struct SignalInfo {
  int rssi_dbm{};
  int quality_percent{};
};

[[nodiscard]] SignalInfo ReadSignal() {
  return {.rssi_dbm = -75, .quality_percent = 65};
}
```

输出参数 → 返回值；裸宏状态 → 类型；字段单位 → 名称；调用者无需传入可空写指针。

## ⑤ 今日编码规范 · 10分钟

MUST：状态集合使用 enum class，不要用裸整数或宏模拟枚举。

SHOULD：单位写进类型或名称，例如 rssi_dbm、timeout_ms。

SHOULD：switch 覆盖有效状态，并打开编译告警；不要用无条件 default 悄悄吞掉新增状态遗漏。

## ⑥ 20分钟实验：Modem 状态机

### 第一次做：先运行，再只改一件事

1. 在仓库根目录打开 [`examples/day-006/main.cpp`](../examples/day-006/main.cpp)，先读 `main()`，圈出输入、调用与结果检查。
2. 运行原版，把实际输出和退出状态记下来，再与本节预期对照。无输出也可能成功，必须结合退出码与断言判断。
3. 修改前先写预期；若失败，先读第一条编译错误或失败断言，再回到对应概念，不同时重写多个函数。

**本课小改动：** 在纸上列出每个状态可接受的事件；选择一个非法事件，写出应拒绝还是保持原状态的规则，再补断言。

<details>
<summary>练习提示：卡住时再展开</summary>

把上面的执行步骤当作检查点；保留原版作为对照。若练习故意让编译或断言失败，请只在实验副本操作，解释失败后还原，不把负例混入日常通过用例。不要执行越界、悬空解引用或重复释放来“观察效果”。

</details>

完整源码：[main.cpp](../examples/day-006/main.cpp)。

```cpp
#include <cassert>
#include <iostream>
#include <string_view>

namespace modem {
enum class State { kOff, kBooting, kRegistering, kReady, kError };

struct SignalInfo {
  int rssi_dbm{};
  int quality_percent{};
};

[[nodiscard]] constexpr std::string_view ToString(State state) {
  switch (state) {
    case State::kOff:
      return "off";
    case State::kBooting:
      return "booting";
    case State::kRegistering:
      return "registering";
    case State::kReady:
      return "ready";
    case State::kError:
      return "error";
  }
  return "invalid";
}

[[nodiscard]] SignalInfo ReadSignal() {
  return {-75, 65};
}
}  // namespace modem

int main() {
  const modem::State state{modem::State::kReady};
  const auto [rssi_dbm, quality_percent] = modem::ReadSignal();
  assert(modem::ToString(state) == "ready");
  assert(rssi_dbm == -75);
  std::cout << "State: " << modem::ToString(state) << ", RSSI: " << rssi_dbm << " dBm"
            << ", Quality: " << quality_percent << "%\n";
  return 0;
}
```

在仓库根目录运行：

```bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic examples/day-006/main.cpp -o /tmp/day-006
/tmp/day-006
```

## ⑦ 3 个常见坑 · 5分钟

- enum class 后又到处转成 int，主动绕开类型安全。

- switch 用 default 隐藏新增状态遗漏。

- 为了结构化绑定而打包互不相关的数据；返回对象应表达真实概念。

## ⑧ 检查题 · 5分钟

### 分层自测：从解释到判断

1. **理解：** 不看代码，用三句话复述本课示例的输入、关键步骤和结果。
2. **应用：** 说明第⑥节小改动的预期，以及实际结果是否符合预期。
3. **辨析：** 枚举类型能阻止所有非法状态转移吗？

<details>
<summary>辨析题参考答案与通过依据</summary>

不能；类型限定取值类别，转移是否允许还需由状态机逻辑和测试保证。

能运行只是第一步。只有能解释本课具体步骤、完成小改动，并说清一个不适用条件，才算完成本次自测；不清楚时回看第③节，不以阅读次数当作掌握证据。

</details>

### 原课检查题

Q1：为什么 Modem 状态更适合 enum class 而不是 #define MODEM_READY 3？

Q2：ReadSignal(int* rssi, int* quality) 改成返回 SignalInfo 后，在接口语义和错误面上分别减少了什么？

明日预告：Day 7 周复盘——用小型 Modem 控制模块串联 Day 1–6，并做第一次完整 Code Review。

### 对照现有资料库

- [实验环境与工具链边界](<../docs/lab-environments.md>)。
- [类型、借用与错误处理规范](<../guidelines/embedded-cpp-guideline-notes.md>)。

先完成本课小实验，再查对照资料；专题中的线程、网络、板端或模式不是本课默认前置。以上为本项目已有讲解和工程对照，不冒充标准条文，也不表示所有示例已在目标板验证。
