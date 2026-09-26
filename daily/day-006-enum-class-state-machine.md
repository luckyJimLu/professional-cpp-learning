# Day 06 · enum class、结构化绑定与类型安全状态机

> 历史课程迁移自原 Gmail 正文；已转换为 Markdown。

enum class、结构化绑定与类型安全状态机
今日目标：把 C 中“整数状态码 + 输出参数 + switch”升级为强类型枚举、结构化返回值与可审查的状态机接口。
## ① 今日章节与建议阅读范围 · 5分钟

继续 Chapter 1 中枚举、结构化绑定、函数返回值与相关现代 C++ 语法。重点观察类型系统怎样消灭一部分非法状态和参数误用。

## ② 昨日复习 · 5分钟

- nullptr 相比 0/NULL 为什么更适合表达空指针？

- 为什么 (pointer, length) 接口容易出现边界错误？

- 裸指针在现代 C++ 中通常应表达借用还是所有权？

## ③ 核心概念 · 15分钟

1. enum class 替代裸整数状态

```cpp
enum class ModemState {
kOff, kBooting, kRegistering, kReady, kError,
};
```

enum class 不会隐式转换成整数，也不会把枚举值泄漏到外层作用域。

2. switch 覆盖强类型状态

状态机代码的目标不是“短”，而是让状态空间显式、可审查；新增枚举值后，应让编译告警帮助发现漏处理分支。

3. 多个相关返回值优先返回值对象

struct SignalInfo {
int rssi_dbm {};
int quality_percent {};
};

auto [rssi_dbm, quality_percent] = ReadSignal();

## ④ C 写法 vs 现代 C++ · 10分钟

C 风格

#define MODEM_READY 3
int modem_get_signal(int *rssi, int *quality) {
if (rssi == NULL || quality == NULL) return -1;
*rssi = -75; *quality = 65; return 0;
}

现代 C++

struct SignalInfo {
int rssi_dbm {};
int quality_percent {};
};

[[nodiscard]] SignalInfo ReadSignal() {
return {.rssi_dbm = -75, .quality_percent = 65};
}

输出参数 → 返回值；裸宏状态 → 类型；字段单位 → 名称；调用者无需传入可空写指针。

## ⑤ 今日编码规范 · 10分钟

MUST：状态集合使用 enum class，不要用裸整数或宏模拟枚举。

SHOULD：单位写进类型或名称，例如 rssi_dbm、timeout_ms。

SHOULD：switch 覆盖有效状态，并打开编译告警；不要用无条件 default 悄悄吞掉新增状态遗漏。

## ⑥ 20分钟实验：Modem 状态机

#include <iostream>
#include <string_view>

namespace modem {
enum class State { kOff, kBooting, kRegistering, kReady, kError };
struct SignalInfo { int rssi_dbm {}; int quality_percent {}; };

[[nodiscard]] constexpr std::string_view ToString(State state) {
switch (state) {
case State::kOff: return "off";
case State::kBooting: return "booting";
case State::kRegistering: return "registering";
case State::kReady: return "ready";
case State::kError: return "error";
}
return "invalid";
}
[[nodiscard]] SignalInfo ReadSignal() { return {-75, 65}; }
} // namespace modem

int main() {
const modem::State state {modem::State::kReady};
const auto [rssi_dbm, quality_percent] = modem::ReadSignal();
std::cout << modem::ToString(state) << '\n';
}

```bash
g++ -std=c++20 -Wall -Wextra -Wconversion -Wpedantic -Wswitch-enum day06.cpp -o day06
./day06
```

实验 A：新增 State::kShuttingDown，暂不修改 ToString()，观察告警。

实验 B · 规范修复：重构 int get_status(int* state, int* rssi, int* quality, bool verbose);：状态改为 enum class；相关结果组成结构体；消除输出指针；不要用含义模糊的 bool 控制行为。

## ⑦ 3 个常见坑 · 5分钟

- enum class 后又到处转成 int，主动绕开类型安全。

- switch 用 default 隐藏新增状态遗漏。

- 为了结构化绑定而打包互不相关的数据；返回对象应表达真实概念。

## ⑧ 检查题 · 5分钟

Q1：为什么 Modem 状态更适合 enum class 而不是 #define MODEM_READY 3？

Q2：ReadSignal(int* rssi, int* quality) 改成返回 SignalInfo 后，在接口语义和错误面上分别减少了什么？

明日预告：Day 7 周复盘——用小型 Modem 控制模块串联 Day 1–6，并做第一次完整 Code Review。
