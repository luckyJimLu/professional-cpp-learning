---
day: 48
week: 7
part: II
chapter: 6
chapter_title: Designing for Reuse
title: Design Usable Interfaces
duration: 60
status: published
date: 2026-10-14
topics:
  - usable-interfaces
  - contracts
  - type-safety
  - explicit-units
  - timeout
guidelines:
  - make-invalid-states-hard
  - express-units-in-types
  - keep-interfaces-small
lab:
  path: examples/day-048/main.cpp
previous: 47
next: 49
---

# Day 48 · Design Usable Interfaces

## ① 今日章节与建议阅读范围（5 分钟）

### 新手起步：先知道今天在解决什么

从一行调用开始检查：能否看出 payload、超时和单位？减少调用者猜测，比减少接口声明中的字符更重要。

**前置检查：** 先能解释 [Day 13](day-013-coding-with-style-foundations.md)、[Day 15](day-015-naming-interface-intent.md)、[Day 17](day-017-errors-assert-control-flow.md)、[Day 46](day-046-checks-safeguards.md) 的核心例子；不必先掌握整本教材。

**本课最低完成目标：** 能按下面的步骤说明示例如何得到结果，并独立完成一项小修改；高级模式与平台性能分析可第二遍再读。新增导读和拓展练习不计入原有约 60 分钟安排，可分两次完成。

继续 Chapter 6 · **Designing for Reuse**，沿教材顺序进入 **Design Usable Interfaces**。

今天从“组件能否扩展”转向“调用者是否容易正确使用”。一个 reusable component 即使内部实现优秀，如果公开 API 允许参数顺序混淆、单位不明、非法状态轻易构造、错误原因丢失，它仍然很难复用。

建议阅读时重点关注：

- interface 是调用者看到的 contract，而不是实现函数的集合；
- API 是否让正确用法自然、错误用法困难；
- 参数数量、参数顺序、单位和可空性是否清晰；
- implementation detail 是否泄漏到调用方；
- interface 的一致性与最小惊讶原则。

---

## ② 昨日复习 3 问（5 分钟）

1. 为什么 OCP 不意味着所有扩展点都必须使用 virtual interface？
2. required dependency 为什么优先显式注入，而不是通过 service locator 获取？
3. 为什么 embedded runtime extensibility 必须同时约束容量、生命周期与 WCET？

---

## ③ 核心概念（12 分钟）

### 先用白话建立概念

- **易用性**：正确调用所需记忆负担较小。
- **强类型**：把不同语义分成不同类型。

### 跟着本课实验走一遍

1. 先读调用点。
2. 追踪参数类型及默认值。
3. 找无效参数的拒绝分支。
4. 确认失败可被调用者识别。

先尝试口头预测，再到第⑥节运行。下面原有概念、图示与接口对照用于解释这些步骤，短代码片段不一定能单独编译；完整程序以本课 `main.cpp` 为准。

### 1. 好接口首先减少调用者需要记忆的隐含规则

考虑一个 UART 发送接口：

```cpp
int Send(const uint8_t* data, int len, int timeout, int flags);
```

调用者必须额外知道：

- `data` 能否为 `nullptr`？
- `len` 是字节还是元素数量？
- `timeout` 是 ms、tick 还是 us？
- `0` timeout 是立即返回还是永久等待？
- `flags` 的 bit 各表示什么？
- `-1` 到底是 timeout、busy 还是 invalid argument？

这些都是隐藏 contract。

Modern C++ 可以把 contract 放进类型：

```cpp
SendResult Send(std::span<const std::byte> payload, std::chrono::milliseconds timeout);
```

### 2. Make invalid states hard to represent

不要用多个弱类型参数承载不同语义：

```cpp
Configure(115200, 8, 0, 1);
```

更好的接口让参数本身可读：

```cpp
enum class Parity { kNone, kEven, kOdd };

enum class StopBits { kOne, kTwo };

struct UartConfig {
  uint32_t baud_rate;
  uint8_t data_bits;
  Parity parity;
  StopBits stop_bits;
};
```

### 3. Interface 应隐藏实现机制

如果业务层必须传入 `UART_HandleTypeDef*`、RTOS semaphore、Linux fd 或 DMA channel 才能发送业务帧，通常说明 abstraction boundary 泄漏了。

上层应该表达“我要发送 payload，并允许等待多久”，底层 adapter 决定 HAL、DMA、poll、epoll 或 RTOS queue 如何完成。

### 4. Usability 包括错误模型

`bool` 很简单，但经常不够可用：

```cpp
enum class SendError {
  kNone,
  kInvalidPayload,
  kBusy,
  kTimeout,
  kTransportFailure,
};
```

调用者可以区分 retry、drop、reset 或上报，而不需要解析日志或依赖隐藏全局状态。

---

## ④ C 写法 vs Modern C++（8 分钟）

### C：弱类型 + 隐含约定

```c
int modem_send(const void* data,
               unsigned len,
               unsigned timeout,
               int mode);
```

调用点：

```c
modem_send(buf, 64, 1000, 1);
```

代码本身无法告诉 reviewer `1000` 的单位，也无法说明 `1` 的语义。

### Modern C++：让调用点携带语义

```cpp
enum class SendMode {
  kNormal,
  kUrgent,
};

SendResult Send(std::span<const std::byte> payload, std::chrono::milliseconds timeout,
                SendMode mode);
```

调用点：

```cpp
transport.Send(payload, std::chrono::milliseconds{1000}, SendMode::kNormal);
```

类型本身成为一部分文档，并给编译器更多检查机会。

---

## ⑤ 今日编码规范（10 分钟）

### MUST：单位和边界进入接口，不依赖注释猜测

错误：

```cpp
bool Wait(uint32_t timeout);
```

推荐：

```cpp
bool Wait(std::chrono::milliseconds timeout);
```

### SHOULD：避免多个同类型位置参数表达不同概念

错误：

```cpp
Configure(115200, 8, 0, 1);
```

推荐：

```cpp
UartConfig config{
    .baud_rate = 115200,
    .data_bits = 8,
    .parity = Parity::kNone,
    .stop_bits = StopBits::kOne,
};
```

### MUST：公开接口不要泄漏与业务 contract 无关的平台 handle

错误：

```cpp
Send(UART_HandleTypeDef* hal_uart, const uint8_t* data, size_t size);
```

推荐：

```cpp
SendResult Send(std::span<const std::byte> payload, std::chrono::milliseconds timeout);
```

HAL handle 留在 concrete adapter 内部。

---

## ⑥ 可编译实验 / 练习（15 分钟）

### 第一次做：先运行，再只改一件事

1. 在仓库根目录打开 [`examples/day-048/main.cpp`](../examples/day-048/main.cpp)，先读 `main()`，圈出输入、调用与结果检查。
2. 运行原版，把实际输出和退出状态记下来，再与本节预期对照。无输出也可能成功，必须结合退出码与断言判断。
3. 修改前先写预期；若失败，先读第一条编译错误或失败断言，再回到对应概念，不同时重写多个函数。

**本课小改动：** 把一个含糊的布尔选项改写成具名选项的设计草稿，再解释可读性收益和兼容成本。

<details>
<summary>练习提示：卡住时再展开</summary>

把上面的执行步骤当作检查点；保留原版作为对照。若练习故意让编译或断言失败，请只在实验副本操作，解释失败后还原，不把负例混入日常通过用例。不要执行越界、悬空解引用或重复释放来“观察效果”。

</details>

实验文件：

```text
examples/day-048/main.cpp
```

实现一个 `ModemTransport`：

- payload 使用 `std::span<const std::byte>`；
- timeout 使用 `std::chrono::milliseconds`；
- mode 使用 `enum class`；
- 返回 `SendResult`，保留具体错误原因；
- transport 借用 `ByteSink&`，不拥有底层 driver；
- 不在发送路径动态分配。

编译：

```bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic \
  examples/day-048/main.cpp -o day048
./day048
```

### 修复违规代码

```cpp
int Send(void* driver, const unsigned char* data, int len, int timeout, int urgent) {
  if (!data) {
    return -1;
  }
  return low_level_send(driver, data, len, timeout, urgent);
}
```

至少修复：

1. `void*` 泄漏底层实现并丢失类型安全；
2. pointer + length 容易产生边界错误；
3. `timeout` 单位不明确；
4. `urgent` 是 bool/int blindness；
5. `-1` 丢失错误原因；
6. `len` 使用有符号整数表达 buffer size；
7. required dependency 的 ownership/lifetime 不明确。

---

## ⑦ 3 个常见坑（3 分钟）

1. **把短 API 当成好 API**：参数少不代表 contract 清楚；`Foo(int, int, int)` 往往比一个明确的 config 类型更难使用。
2. **为了“通用”暴露底层 handle**：这会让所有调用者绑定 HAL/RTOS/Linux 实现，破坏 reusable boundary。
3. **只设计成功路径**：timeout、busy、invalid input 和 partial failure 都是接口可用性的一部分。

---

## ⑧ 检查题（2 分钟）

### 分层自测：从解释到判断

1. **理解：** 不看代码，用三句话复述本课示例的输入、关键步骤和结果。
2. **应用：** 说明第⑥节小改动的预期，以及实际结果是否符合预期。
3. **辨析：** 参数变少就一定更容易使用吗？

<details>
<summary>辨析题参考答案与通过依据</summary>

不是；若只是把规则藏进全局状态或魔法默认值，调用者仍需猜测。

能运行只是第一步。只有能解释本课具体步骤、完成小改动，并说清一个不适用条件，才算完成本次自测；不清楚时回看第③节，不以阅读次数当作掌握证据。

</details>

### 原课检查题

### Q1

为什么 `std::chrono::milliseconds` 通常比 `uint32_t timeout_ms` 更适合作为 reusable C++ API 参数？

### Q2

为什么把 `UART_HandleTypeDef*` 暴露给业务层会降低接口的可复用性？

**答案要点：**

- chrono duration 把单位编码进类型，可进行类型安全转换，减少调用者传错 us/ms/tick 的机会；
- HAL handle 是平台实现细节，一旦进入公共 contract，上层测试、移植和替换 transport 都被具体平台耦合。

---

### 对照现有资料库

- [模式选型工作坊](<../patterns/engineering-workshop.md>)。
- [复用契约章末评审](<../docs/chapter-06-review.md>)。

先完成本课小实验，再查对照资料；专题中的线程、网络、板端或模式不是本课默认前置。以上为本项目已有讲解和工程对照，不冒充标准条文，也不表示所有示例已在目标板验证。

### 今日 Code Review 快检
- [ ] 参数名称、类型和单位是否足以理解调用点
- [ ] 是否存在多个相同基础类型参数导致顺序混淆
- [ ] required / optional dependency 是否显式
- [ ] buffer 是否同时携带地址与边界
- [ ] timeout 是否进入公开 contract
- [ ] 错误返回是否保留调用者真正需要的原因
- [ ] 是否泄漏 HAL / RTOS / fd / DMA 等实现细节
- [ ] 是否让非法状态更难构造
- [ ] 实时路径是否保持有界且无无界动态分配

## 下一步

Day 49 继续 Chapter 6，沿教材顺序推进 reusable interface 的后续主题，并进行第 7 周工程化复盘。
