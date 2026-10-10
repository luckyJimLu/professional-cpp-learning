---
day: 44
week: 7
part: II
chapter: 6
chapter_title: Designing for Reuse
title: Avoid Combining Unrelated or Logically Separate Concepts
status: published
date: 2026-10-10
duration: 60
lab:
  path: examples/day-044/main.cpp
previous: 43
next: 45
---

# Day 44 · Avoid Combining Unrelated or Logically Separate Concepts：不要把无关职责绑在一起

## ① 今日章节与建议阅读范围（5 分钟）

继续 Chapter 6 · **Designing for Reuse**，按教材顺序学习 **Avoid Combining Unrelated or Logically Separate Concepts**（约 p.201 起）。

Day 43 从依赖方向讨论代码结构；今天进一步看复用失败的高频根因：一个组件把协议、传输、重试、日志、持久化等逻辑绑成一个不可拆整体。可复用组件应围绕一个清晰概念建立边界，让调用者只为真正需要的能力付出依赖成本。

## ② 昨日复习 3 问（5 分钟）

1. 为什么 `app -> middleware -> contract <- platform adapter` 更容易跨平台？
2. 公共头文件为什么也是复用成本的一部分？
3. 哪些信号说明 retry 应从 protocol component 中拆出？

## ③ 核心概念（12 分钟）

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
  Status Send(std::span<const std::uint8_t> command,
              std::chrono::milliseconds timeout);
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

### Q1

判断两个功能是否应属于同一 reusable component，最重要的设计问题是什么？

### Q2

为什么把 retry 从 `AtClient` 拆到 `RetrySender` 后，反而更容易在嵌入式系统里保证实时性？

**答案要点：**检查它们是否具有同一职责与变化原因；拆分 retry 后可以独立规定最大尝试次数和 timeout，使循环上界与阻塞预算显式、可测试。

## 今日 Code Review 快检

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
