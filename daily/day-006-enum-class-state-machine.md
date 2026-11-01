# Day 06 · enum class、结构化绑定与类型安全状态机

<!-- cpp-standards:start -->

## 本课涉及的 C++ 标准

以下按正文与配套 `.cpp` 示例中出现的特性标注首次标准化版本，不代表整份程序的最低编译版本。仓库主 Lab 统一使用 C++23。

| 特性               | 首次标准化 | 版本边界                                                                                     |
| ------------------ | ---------- | -------------------------------------------------------------------------------------------- |
| 列表初始化         | **C++11**  | 包括直接列表初始化；窄化检查及 initializer_list 优先规则须单独注意。                         |
| `constexpr`        | **C++11**  | C++14 放宽函数体限制；C++20 继续扩展可用于常量求值的操作。声明不保证每次调用都在编译期执行。 |
| `nullptr`          | **C++11**  | 空指针字面量；不要与整数 0 的类型混为一谈。                                                  |
| `enum class`       | **C++11**  | 有作用域枚举。                                                                               |
| 结构化绑定         | **C++17**  | 如 `auto [a, b] = value;`。                                                                  |
| `[[nodiscard]]`    | **C++17**  | 带说明字符串的形式从 C++20 起可用。                                                          |
| `std::string_view` | **C++17**  | 非拥有视图；其 `starts_with` / `ends_with` 是 C++20 新增。                                   |

版本差异、旧机制与工具链检查见 [C++ 标准来源速查](../docs/cpp-feature-standards.md)。

<!-- cpp-standards:end -->

enum class、结构化绑定与类型安全状态机
今日目标：把 C 中“整数状态码 + 输出参数 + switch”升级为强类型枚举、结构化返回值与可审查的状态机接口。

## ① 今日章节与建议阅读范围 · 5分钟

### 新手起步：先知道今天在解决什么

把状态、事件和转移结果分开。`enum class` 防止混用不同枚举类型，不能单独保证每次业务转移都合法。结构化绑定用于拆开一个返回值对象。这段话总结了在现代 C++ 中实现状态机（State Machine）或业务流转逻辑时的三个关键设计原则：**关注点分离**、**强类型枚举的边界**以及**多值返回与解包**。结合 C++ 语言特性与设计准则，具体拆解如下：

**1. 把状态（State）、事件（Event）和转移结果（Transition Result）分开**
在软件设计中，应当遵循单一职责原则（SRP）来分离关注点（Separate Concerns），避免将正交、不相关的概念强行耦合在一起：

* **用独立的强类型枚举表示状态与事件**：不要用泛化的整型（`int`）或同一个枚举去混装“当前所处的状态”和“触发流转的事件”。应当分别定义独立的强类型枚举，例如 `enum class State { Unknown, Started, Finished };` 与 `enum class Error { None, BadInput, DiskFull, Unknown };`（或独立的 `Event` 枚举）。

* **用专门的结构体或词汇类型封装“转移结果”**：C++ 函数的返回类型只能有唯一一个，而一次状态转移往往既要返回“转移后的新状态”，又要返回“转移是否成功 / 错误原因”。此时不应使用输出参数，而应将它们封装为一个专门的返回值对象——例如自定义一个包含具名字段的小型 `struct`（比用 `std::pair` 的 `.first` 和 `.second` 更具可读性），或者使用 `std::optional`、`std::expected`（C++23）等词汇类型按值返回。

**2. `enum class` 防止混用不同枚举类型，但不能单独保证每次业务转移都合法**
强类型枚举（`enum class`）解决的是**类型安全与作用域污染**问题，而业务流转的合法性则必须靠**状态转移逻辑**来保障：

* **`enum class` 能防什么（编译期类型边界）**：旧式枚举（unscoped `enum`）不是类型安全的，它们总是被隐式当作整数解释，导致程序员可能不小心拿两个完全不同枚举类型的枚举值去比较，或把错误的枚举传给函数，甚至对代表棋子类型的整型做 `+ 1` 或赋值为 `-1`。而 `enum class` 不会自动导出枚举名到外部作用域（允许 `State::Unknown` 和 `Error::Unknown` 和平共存且不冲突），也不会自动隐式转换为整数（除非在 C++23 中显式调用 `std::to_underlying()`），从而在编译期彻底阻止了不同枚举类型的混用。

* **`enum class` 不能防什么（运行期业务转移规则）**：`enum class` 只是严格界定了一个变量的合法取值集合（例如 `State` 只能取 `Unknown`、`Started`、`Finished`）。但单靠 `enum class` 本身，编译器无法阻止你在业务代码中直接写出从 `State::Finished` 倒退回 `State::Started` 的非法状态赋值。

* **如何保障业务转移合法**：必须编写显式的状态转移函数来校验当前 `(State, Event)` 组合。在使用 `switch` 语句处理枚举分支时，建议**显式列出所有枚举值而不要写 `default` 分支**——这样未来一旦在枚举中新增了状态或事件，编译器就会对未处理该分支的 `switch` 语句发出警告，防止新状态被 `default` 分支静默吞掉而产生非法转移。

**3. 结构化绑定（Structured Bindings）用于拆开一个返回值对象**
当你将状态转移的结果封装为一个 `struct`、`std::pair`、`std::tuple` 或 `std::array` 并从函数按值返回后，调用方可以使用 C++17 引入的**结构化绑定**一次性将其拆解（Decompose）为多个独立的局部变量：

* **直观拆解返回值**：只要返回值 `struct` 的所有非静态数据成员都是 `public` 的（或者返回的是 `pair`/`tuple`），就可以使用 `auto [var1, var2] { func() };` 直接拆开接收（注意必须使用 `auto` 关键字，且声明的变量数量必须与返回值对象中的元素数量严格一致）。

* **结合引用与 `const**`：结构化绑定同样支持声明为引用或 `const` 引用（如 `auto& [a, b]` 或 `const auto& [a, b]`），方便在不产生多余拷贝的情况下直接读取或原地修改被拆解对象的成员。

**综合代码示例**

```cpp
// 1. 分离状态、事件与转移结果
enum class State { Unknown, Started, Finished };
enum class Event { Start, Complete, Reset };
enum class Error { None, InvalidTransition };

struct TransitionResult {
    State nextState;
    Error error;
};

// 2. 显式校验业务转移合法性（enum class 防止传错类型，switch 不写 default 防止漏分支）
TransitionResult step(State current, Event event) {
    switch (current) {
        using enum State;
        case Unknown:
            if (event == Event::Start) { return { Started, Error::None }; }
            break;
        case Started:
            if (event == Event::Complete) { return { Finished, Error::None }; }
            break;
        case Finished:
            if (event == Event::Reset) { return { Unknown, Error::None }; }
            break;
    }
    return { current, Error::InvalidTransition };
}

int main() {
    // 3. 使用结构化绑定直接拆开返回值对象
    auto [newState, err] { step(State::Finished, Event::Start) };
    if (err == Error::None) {
        // 转移成功，使用 newState...
    }
}
```

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

- 使用 enum class 后又到处强转成 int，主动放弃类型安全。

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
