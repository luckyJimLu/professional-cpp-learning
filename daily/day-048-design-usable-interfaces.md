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

### Q1

为什么 `std::chrono::milliseconds` 通常比 `uint32_t timeout_ms` 更适合作为 reusable C++ API 参数？

### Q2

为什么把 `UART_HandleTypeDef*` 暴露给业务层会降低接口的可复用性？

**答案要点：**

- chrono duration 把单位编码进类型，可进行类型安全转换，减少调用者传错 us/ms/tick 的机会；
- HAL handle 是平台实现细节，一旦进入公共 contract，上层测试、移植和替换 transport 都被具体平台耦合。

---

## 今日 Code Review 快检

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