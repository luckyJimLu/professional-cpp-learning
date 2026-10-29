---
day: 46
week: 7
part: II
chapter: 6
chapter_title: Designing for Reuse
title: Provide Appropriate Checks and Safeguards
duration: 60
status: published
date: 2026-10-12
topics:
  - preconditions
  - validation
  - invariants
  - defensive-interfaces
  - bounded-operations
guidelines:
  - validate-external-input
  - recoverable-errors-not-assert
  - explicit-bounds-and-timeouts
lab:
  path: examples/day-046/main.cpp
previous: 45
next: 47
---

# Day 46 · Provide Appropriate Checks and Safeguards

## ① 今日章节与建议阅读范围（5 分钟）

### 新手起步：先知道今天在解决什么

先问输入是谁提供的，再决定检查放在哪里。外部帧可能为空或超长，必须显式返回错误，不能把它当成调用者永不犯错的假设。

**前置检查：** 先能解释 [Day 5](day-005-pointers-nullptr-bounds.md)、[Day 17](day-017-errors-assert-control-flow.md)、[Day 28](day-028-class-invariants-minimal-interface.md)、[Day 41](day-041-reuse-contracts-components.md) 的核心例子；不必先掌握整本教材。

**本课最低完成目标：** 能按下面的步骤说明示例如何得到结果，并独立完成一项小修改；高级模式与平台性能分析可第二遍再读。新增导读和拓展练习不计入原有约 60 分钟安排，可分两次完成。

继续 Chapter 6 · **Designing for Reuse**，沿教材顺序进入 **Provide Appropriate Checks and Safeguards**。

可复用组件面对的调用者、输入和运行环境比单一应用更不可控，因此接口不能只在“正确使用”时工作。今天重点学习如何把合法输入范围、失败模式和安全边界变成 contract，而不是散落在调用者脑中。

建议阅读时重点关注：

- 哪些检查属于公共接口边界；
- precondition、invariant 与可恢复运行时错误的区别；
- 为什么 `assert` 不能代替外部输入验证；
- 如何避免检查本身引入无界延迟或动态分配；
- reusable API 如何让错误可观察、可测试。

---

## ② 昨日复习 3 问（5 分钟）

1. 为什么 template 参数应只表达真实的 compile-time variation？
2. `FixedQueue<T, Capacity>` 为什么比实时路径中的自动扩容容器更容易审计？
3. 什么情况下 runtime interface 比 template/concept 更合适？

---

## ③ 核心概念（12 分钟）

### 先用白话建立概念

- **信任边界**：输入从不受控区域进入的位置。
- **防护**：失败可见且状态仍有效的处理。

### 跟着本课实验走一遍

1. 依次检查空帧、长度上限、超时。
2. 只有合法输入才调用底层。
3. 核对不同错误枚举。

先尝试口头预测，再到第⑥节运行。下面原有概念、图示与接口对照用于解释这些步骤，短代码片段不一定能单独编译；完整程序以本课 `main.cpp` 为准。

### 1. Safeguard 首先是 contract，而不是补丁

如果 UART 发送接口要求非空数据、最大长度和有限 timeout，应在接口边界统一检查，而不是要求每个调用者重复检查。

```cpp
enum class SendStatus {
  kOk,
  kEmpty,
  kTooLarge,
  kTimeout,
};
```

明确错误集合后，调用者可以稳定处理失败，也可以为每个边界写测试。

### 2. 区分 programmer error 与 runtime error

`assert` 适合验证“程序逻辑若正确就永远成立”的内部不变量：

```cpp
assert(head_ < kCapacity);
```

但来自 modem、socket、配置文件或用户的输入可能天然无效，这属于运行时错误，必须进入正常控制流：

```cpp
if (frame.size() > kMaxFrameBytes) {
  return SendStatus::kTooLarge;
}
```

### 3. 检查应靠近信任边界

典型 embedded trust boundary：

- ISR / DMA 交给 task 的数据；
- modem AT response；
- UART/SPI 接收帧；
- IPC/socket 输入；
- 配置文件、NVM 参数；
- 上层传入 driver/middleware 的 buffer。

越靠近边界验证，越少无效状态进入系统深处。

### 4. Safeguard 也必须有实时上界

“为了安全”不等于可以无限扫描、重试或等待。检查自身也应满足时间和空间预算。

```cpp
SendStatus Send(std::span<const std::byte> frame, std::chrono::milliseconds timeout);
```

长度有界、timeout 显式、失败可观察，才能用于可审计的实时路径。

---

## ④ C 写法 vs Modern C++（8 分钟）

### C：裸指针 + 长度 + 隐式约定

```c
int modem_send(const unsigned char* data, unsigned int len, unsigned int timeout_ms) {
  if (data == 0) {
    return -1;
  }
  if (len > 256) {
    return -1;
  }
  return uart_write(data, len, timeout_ms);
}
```

问题是 `-1` 丢失失败原因，单位只靠变量名，且 pointer/length 组合容易形成非法状态。

### Modern C++：让边界与错误进入类型和接口

```cpp
#include <chrono>
#include <cstddef>
#include <span>

enum class SendStatus {
  kOk,
  kEmpty,
  kTooLarge,
  kTimeout,
};

SendStatus Send(std::span<const std::byte> frame, std::chrono::milliseconds timeout);
```

`std::span` 把 buffer 与长度绑定，`std::chrono` 明确时间单位，`enum class` 保留错误语义。

---

## ⑤ 今日编码规范（10 分钟）

### MUST：外部/运行时输入必须验证，不能用 `assert` 代替

错误：

```cpp
SendStatus ParseFrame(std::span<const std::byte> frame) {
  assert(frame.size() >= 2U);
  return SendStatus::kOk;
}
```

推荐：

```cpp
SendStatus ParseFrame(std::span<const std::byte> frame) {
  if (frame.size() < 2U) {
    return SendStatus::kEmpty;
  }
  return SendStatus::kOk;
}
```

### MUST：阻塞或重试型 safeguard 必须有显式上界

错误：

```cpp
while (!driver.Ready()) {
}
```

推荐：

```cpp
Status WaitReady(Driver& driver, std::chrono::milliseconds timeout);
```

### SHOULD：错误类型保留足够上下文，避免无意义的 `bool` / `-1`

错误：

```cpp
bool Send(Packet packet);
```

推荐：

```cpp
enum class SendStatus {
  kOk,
  kInvalidLength,
  kBusy,
  kTimeout,
};

SendStatus Send(const Packet& packet);
```

---

## ⑥ 可编译实验 / 练习（15 分钟）

### 第一次做：先运行，再只改一件事

1. 在仓库根目录打开 [`examples/day-046/main.cpp`](../examples/day-046/main.cpp)，先读 `main()`，圈出输入、调用与结果检查。
2. 运行原版，把实际输出和退出状态记下来，再与本节预期对照。无输出也可能成功，必须结合退出码与断言判断。
3. 修改前先写预期；若失败，先读第一条编译错误或失败断言，再回到对应概念，不同时重写多个函数。

**本课小改动：** 对最大合法长度与超出一个字节分别补测试，预期前者可继续、后者被拒绝且无底层发送。

<details>
<summary>练习提示：卡住时再展开</summary>

把上面的执行步骤当作检查点；保留原版作为对照。若练习故意让编译或断言失败，请只在实验副本操作，解释失败后还原，不把负例混入日常通过用例。不要执行越界、悬空解引用或重复释放来“观察效果”。

</details>

实验文件：

```text
examples/day-046/main.cpp
```

实现一个固定最大帧长度的 `FrameSender`。它借用 `Transport`，在进入 transport 前检查空帧、长度和 timeout，并返回强类型状态。实验不使用 heap allocation。

编译：

```bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic \
  examples/day-046/main.cpp -o day046
./day046
```

### 修复违规代码

```cpp
bool Send(const unsigned char* data, int length) {
  assert(data != nullptr);
  while (!uart_ready()) {
  }
  uart_write(data, length);
  return true;
}
```

请至少修复：

1. nullable pointer 与有符号长度形成非法状态；
2. 外部输入错误错误地交给 `assert`；
3. 无限等待没有 timeout；
4. 返回 `bool` 丢失错误原因；
5. 最大帧长度没有 contract；
6. 没有覆盖空帧、最大长度、超长和 timeout 边界测试。

---

## ⑦ 3 个常见坑（3 分钟）

1. **过度 defensive programming**：每一层重复检查同一个内部不变量，会增加复杂度和实时成本；明确 trust boundary 与责任层。
2. **把 assert 当错误处理**：release build 可能关闭断言，而且外部输入失败不是 programmer bug。
3. **检查有了但没有上界**：无限重试、无限扫描、等待硬件 ready 都可能把“安全检查”变成实时故障。

---

## ⑧ 检查题（2 分钟）

### 分层自测：从解释到判断

1. **理解：** 不看代码，用三句话复述本课示例的输入、关键步骤和结果。
2. **应用：** 说明第⑥节小改动的预期，以及实际结果是否符合预期。
3. **辨析：** 每一层都重复所有检查一定更安全吗？

<details>
<summary>辨析题参考答案与通过依据</summary>

不一定；应在边界验证并明确内部前置条件，重复且不一致的检查反而可能导致语义分叉。

能运行只是第一步。只有能解释本课具体步骤、完成小改动，并说清一个不适用条件，才算完成本次自测；不清楚时回看第③节，不以阅读次数当作掌握证据。

</details>

### 原课检查题

### Q1

为什么来自 modem 的非法 frame length 应返回运行时错误，而不应该 `assert(false)`？

### Q2

一个 reusable blocking API 除了返回错误码外，为什么还应把 timeout 放进公开 contract？

**答案要点：**

- 外部输入无效是可预期的运行时事件，不代表程序内部不变量被破坏；
- timeout 决定最坏执行时间，是实时性、恢复策略和调用者调度决策的一部分，因此不是隐藏实现细节。

---

### 对照现有资料库

- [模式选型工作坊](<../patterns/engineering-workshop.md>)。
- [复用契约章末评审](<../docs/chapter-06-review.md>)。

先完成本课小实验，再查对照资料；专题中的线程、网络、板端或模式不是本课默认前置。以上为本项目已有讲解和工程对照，不冒充标准条文，也不表示所有示例已在目标板验证。

### 今日 Code Review 快检
- [ ] 外部输入是否在 trust boundary 验证
- [ ] `assert` 是否只用于 programmer invariant
- [ ] 错误类型是否保留失败原因
- [ ] buffer 是否同时表达长度
- [ ] timeout / retry / scan 是否有上界
- [ ] 实时路径检查是否避免 heap allocation
- [ ] magic number 是否转成命名常量或类型 contract
- [ ] 是否测试 empty / min / max / max+1 / timeout

## 下一步

Day 47 继续 Chapter 6，沿教材顺序进入 **Design for Extensibility**。
