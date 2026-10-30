---
day: 44
week: 7
part: II
chapter: 6
chapter_title: Designing for Reuse
title: "避免合并不相关或逻辑独立的概念"
status: published
date: 2026-10-10
duration: 60
lab:
  path: examples/day-044/main.cpp
previous: 43
next: 45
topics:
  - separate-unrelated-concepts
guidelines:
  - explicit-contract
---

# Day 44 · 避免合并不相关或逻辑独立的概念

<!-- cpp-standards:start -->
## 本课涉及的 C++ 标准

以下按正文与配套 `.cpp` 示例中出现的特性标注首次标准化版本，不代表整份程序的最低编译版本。仓库主 Lab 统一使用 C++23。

| 特性 | 首次标准化 | 版本边界 |
| --- | --- | --- |
| 列表初始化 | **C++11** | 包括直接列表初始化；窄化检查及 initializer_list 优先规则须单独注意。 |
| `= default` / `= delete` | **C++11** | 显式默认化与删除函数。 |
| `constexpr` | **C++11** | C++14 放宽函数体限制；C++20 继续扩展可用于常量求值的操作。声明不保证每次调用都在编译期执行。 |
| `enum class` | **C++11** | 有作用域枚举。 |
| `override` / `final` | **C++11** | 用于虚函数覆盖检查、限制覆盖或继承。 |
| `[[nodiscard]]` | **C++17** | 带说明字符串的形式从 C++20 起可用。 |
| `<cstdint>` 固定宽度整数 | **C++11** | 精确宽度类型仅在实现提供对应整数类型时存在。 |
| `std::array` | **C++11** | 固定大小容器。 |
| `std::chrono` | **C++11** | 如 duration、time_point、steady_clock；不是所有 chrono 后增 API 都属于 C++11。 |
| chrono 时长字面量 | **C++14** | 如 `100ms`；需要相应头文件与 `std::chrono_literals`。 |
| `std::span` | **C++20** | 连续序列的非拥有视图；不自动延长底层对象生命周期。 |

版本差异、旧机制与工具链检查见 [C++ 标准来源速查](../docs/cpp-feature-standards.md)。
<!-- cpp-standards:end -->

## ① 今日章节与建议阅读范围（5 分钟）

### 新手起步：先知道今天在解决什么

将发送一次与决定是否重试分开。重试策略可以改变，底层发送只需报告一次操作的结果，两者不能混成无限循环。

**前置检查：** 先能解释 [Day 24](day-024-coupling-cohesion-dependencies.md)、[Day 30](day-030-composition-object-responsibilities.md)、[Day 41](day-041-reuse-contracts-components.md)、[Day 43](day-043-structure-code-for-optimal-reuse.md) 的核心例子；不必先掌握整本教材。

**本课最低完成目标：** 能按下面的步骤说明示例如何得到结果，并独立完成一项小修改；高级模式与平台性能分析可第二遍再读。新增导读和拓展练习不计入原有约 60 分钟安排，可分两次完成。

继续 Chapter 6 · **Designing for Reuse**，按教材顺序学习 **Avoid Combining Unrelated or Logically Separate Concepts**（约 p.201 起）。

Day 43 从依赖方向讨论代码结构；今天进一步看复用失败的高频根因：一个组件把协议、传输、重试、日志、持久化等逻辑绑成一个不可拆整体。可复用组件应围绕一个清晰概念建立边界，让调用者只为真正需要的能力付出依赖成本。

## ② 昨日复习 3 问（5 分钟）

1. 为什么 `app -> middleware -> contract <- platform adapter` 更容易跨平台？
2. 公共头文件为什么也是复用成本的一部分？
3. 哪些信号说明 retry 应从 protocol component 中拆出？

## ③ 核心概念（12 分钟）

### 先用白话建立概念

- **关注点分离**：独立职责使用独立边界。
- **重试预算**：允许的最大尝试次数。

### 跟着本课实验走一遍

1. 定位最大尝试次数。
2. 观察前两次失败。
3. 第三次成功。
4. 核对记录的尝试数。
5. 检查零次预算被拒绝。

先尝试口头预测，再到第⑥节运行。下面原有概念、图示与接口对照用于解释这些步骤，短代码片段不一定能单独编译；完整程序以本课 `main.cpp` 为准。

### 1. 一起使用，不代表属于同一个 abstraction

Modem 常同时需要 AT framing、UART、retry 和 logging，但这些概念变化原因不同：

```text
ModemSession -> AtClient -> ITransport
      |            |
 RetryPolicy     protocol

Logger <--------- optional observation
```

产品可能换 retry 策略而协议不变，也可能 UART 换 USB 而业务不变。把它们塞进 `ModemManager` 会让每次变化都触碰同一组件。

### 2. 用“变化原因”识别逻辑边界

如果两个功能具有不同的：

- 使用者；
- 生命周期；
- 平台依赖；
- 测试方式；
- 变化频率；

它们通常值得成为独立概念。

### 3. 可组合优于万能配置对象

一个类出现 `enable_log`、`retry_count`、`uart_port`、`persist_history` 等互不相关配置时，往往是在掩盖多个 abstraction。拆分后，上层 orchestration 负责组合，而底层组件保持专注。

### 4. 嵌入式收益尤其明显

职责拆分并不意味着运行时必须动态分配。对象可以静态/栈上构造，通过引用组合；这样既保持零 heap 路径，又能独立测试 protocol、transport 与 policy。

## ④ C 写法 vs Modern C++（8 分钟）

C 项目常见“大上下文”：

```c
struct modem {
  uart_handle_t* uart;
  int retry_count;
  bool logging_enabled;
  flash_handle_t* history_flash;
};
```

这会让 AT 协议代码同时知道 UART、日志和 Flash。

Modern C++ 不应只是把它改成大 class，而应表达概念：

```cpp
class AtClient {
public:
  explicit AtClient(ITransport& transport) : transport_(transport) {}
  Status Send(std::span<const std::uint8_t> command, std::chrono::milliseconds timeout);

private:
  ITransport& transport_;
};
```

retry、logging、history 可以在需要它们的层组合，而不是成为 `AtClient` 的永久依赖。

## ⑤ 今日编码规范（8 分钟）

### MUST：一个 reusable component 不得强制携带无关依赖

错误：

```cpp
class AtClient {
  UartDriver& uart_;
  Logger& logger_;
  FlashStore& history_;
  int retry_count_;
};
```

推荐：

```cpp
class AtClient {
public:
  explicit AtClient(ITransport& transport) : transport_(transport) {}

private:
  ITransport& transport_;
};
```

### SHOULD：按独立变化原因拆分 policy / mechanism / observation

错误：协议组件内部硬编码三次 retry 并直接打印日志。

推荐：协议只完成一次发送；上层 `RetrySender` 决定 retry；日志作为独立 observer/wrapper。

### SHOULD：拆分后仍保持 ownership 和实时成本显式

错误：为了“解耦”把所有组件都改成 `shared_ptr` 和运行时注册表。

推荐：required borrow 使用引用，owner 保持单一；实时路径使用有界循环和固定容量数据。

## ⑥ 可编译实验 / 练习（15 分钟）

### 第一次做：先运行，再只改一件事

1. 在仓库根目录打开 [`examples/day-044/main.cpp`](../examples/day-044/main.cpp)，先读 `main()`，圈出输入、调用与结果检查。
2. 运行原版，把实际输出和退出状态记下来，再与本节预期对照。无输出也可能成功，必须结合退出码与断言判断。
3. 修改前先写预期；若失败，先读第一条编译错误或失败断言，再回到对应概念，不同时重写多个函数。

**本课小改动：** 让 fake 一直失败，预期到达预算后返回失败；不可为了“最终成功”写无界循环。

<details>
<summary>练习提示：卡住时再展开</summary>

把上面的执行步骤当作检查点；保留原版作为对照。若练习故意让编译或断言失败，请只在实验副本操作，解释失败后还原，不把负例混入日常通过用例。不要执行越界、悬空解引用或重复释放来“观察效果”。

</details>

实验：`examples/day-044/main.cpp`。

实现三个独立概念：`ITransport`、只发送一次的 `AtClient`、负责有限重试的 `RetrySender`。使用 `FakeTransport` 验证重试，不使用 heap allocation。

```bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic \
  examples/day-044/main.cpp -o day044
./day044
```

### 修复违规代码

```cpp
class ModemManager {
public:
  Status Send(std::span<const std::uint8_t> data) {
    Log(data);
    SaveToFlash(data);
    for (int i = 0; i < 3; ++i) {
      if (UartWrite(data)) return Status::kOk;
    }
    return Status::kTimeout;
  }
};
```

要求：

1. transport 抽成稳定 contract；
2. 单次发送与 retry policy 分离；
3. logging / persistence 不成为协议的强制依赖；
4. timeout 使用明确单位；
5. retry 次数有明确上界；
6. required dependency 使用引用表达 borrow。

## ⑦ 3 个常见坑（3 分钟）

1. **把同时发生误认为同一职责**：发送时会记录日志，不代表 transport 必须拥有 logger。
2. **拆类但不拆依赖**：文件变多了，所有类仍 include HAL/logger/flash，耦合并没有下降。
3. **为了通用而引入复杂 service locator**：表面减少参数，实际隐藏依赖、生命周期和实时成本。

## ⑧ 检查题（4 分钟）

### 分层自测：从解释到判断

1. **理解：** 不看代码，用三句话复述本课示例的输入、关键步骤和结果。
2. **应用：** 说明第⑥节小改动的预期，以及实际结果是否符合预期。
3. **辨析：** 重试三次是否自动保证总耗时有界？

<details>
<summary>辨析题参考答案与通过依据</summary>

不一定；每次发送本身也必须有时间上界，总预算还应包含等待与调度等成本。

能运行只是第一步。只有能解释本课具体步骤、完成小改动，并说清一个不适用条件，才算完成本次自测；不清楚时回看第③节，不以阅读次数当作掌握证据。

</details>

### 原课检查题

### Q1

判断两个功能是否应属于同一 reusable component，最重要的设计问题是什么？

### Q2

为什么把 retry 从 `AtClient` 拆到 `RetrySender` 后，反而更容易在嵌入式系统里保证实时性？

**答案要点：**检查它们是否具有同一职责与变化原因；拆分 retry 后可以独立规定最大尝试次数和 timeout，使循环上界与阻塞预算显式、可测试。

### 对照现有资料库

- [模式选型工作坊](<../patterns/engineering-workshop.md>)。
- [复用契约章末评审](<../docs/chapter-06-review.md>)。

先完成本课小实验，再查对照资料；专题中的线程、网络、板端或模式不是本课默认前置。以上为本项目已有讲解和工程对照，不冒充标准条文，也不表示所有示例已在目标板验证。

### 今日 Code Review 快检
- [ ] 公共头文件依赖最小且自包含
- [ ] 类型/函数/变量命名符合规范
- [ ] owner 与 borrow 生命周期明确
- [ ] 实时路径无无界动态分配、retry 或等待
- [ ] 可恢复错误不依赖 assert
- [ ] ISR 最小化，未用 volatile 代替同步
- [ ] retry/timeout/容量没有裸 magic number
- [ ] 空输入、最大长度、失败次数、timeout 边界已覆盖

## 下一步

Day 45 按教材顺序进入 **Use Templates for Generic Data Structures and Algorithms**，学习何时把类型差异提升为编译期参数，以及如何避免为了“泛型”制造不必要复杂度。
