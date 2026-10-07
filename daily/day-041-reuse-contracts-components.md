---
day: 41
week: 6
part: II
chapter: 6
chapter_title: Designing for Reuse
title: Reuse Starts with Stable Contracts
status: published
date: 2026-10-07
duration: 60
lab:
  path: examples/day-041/main.cpp
previous: 40
next: 42
---

# Day 41 · Designing for Reuse：复用从稳定 Contract 开始

## ① 今日章节与建议阅读范围（5 分钟）

进入 Chapter 6 · **Designing for Reuse**。今天先建立本章主线：可复用代码不是“把函数放进 utils”，而是让组件拥有清晰职责、最小依赖、稳定 contract 与可替换边界。

建议阅读 Chapter 6 开篇与 reuse/design principles 相关部分，重点思考：一个只在当前 Modem 工程可工作的类，与一个可被 UART、USB、测试替身共同使用的组件，设计上差在哪里？

## ② 昨日复习 3 问（5 分钟）

1. mixin 与 runtime polymorphism 分别适合什么变化时机？
2. 为什么 mixin 不应该隐藏复杂资源 ownership？
3. CRTP/mixin 在嵌入式项目中为什么仍要检查 flash/RAM 成本？

## ③ 核心概念（12 分钟）

### 复用的第一条件：依赖稳定抽象

```cpp
class IByteSink {
 public:
  virtual ~IByteSink() = default;
  virtual Status Write(std::span<const std::uint8_t> data,
                       std::chrono::milliseconds timeout) = 0;
};
```

上层 PacketSender 不需要知道 UART 寄存器、DMA channel 或 Linux fd。

### 可复用组件应拥有自己的 invariant

```text
PacketSender contract
- 输入 payload 不得为空
- frame 大小有固定上限
- Write 必须显式 timeout
- 不拥有底层 sink
```

contract 越清楚，组件越容易在新环境复用。

### 复用 ≠ 泛化一切

不要一开始就设计“万能 TransportFramework”。先提取真实变化点：数据输出 contract、buffer 上限、timeout、错误模型。过早泛化通常会把平台细节变成公共 API。

### 依赖方向

推荐：

```text
Application -> Reusable Component -> Small Contract <- Platform Adapter
```

而不是：

```text
Reusable Component -> STM32 HAL / RTOS global / Linux fd
```

## ④ C 写法 vs Modern C++（8 分钟）

C 项目常通过 function pointer 做可替换后端：

```c
struct byte_sink {
  int (*write)(void* ctx, const unsigned char* data, size_t size,
               unsigned int timeout_ms);
  void* ctx;
};
```

这是有效的 contract 思维，但类型与 lifetime 约束主要靠约定。

Modern C++ 可把 contract、borrow 与单位表达得更清楚：

```cpp
class PacketSender {
 public:
  explicit PacketSender(IByteSink& sink) : sink_(sink) {}

 private:
  IByteSink& sink_;  // required non-owning dependency
};
```

重点不是“C++ 比 C 高级”，而是让调用点直接读出 contract 与 lifetime 意图。

## ⑤ 今日编码规范（8 分钟）

### MUST：可复用组件不得偷偷依赖可写全局状态

错误：

```cpp
extern UartDriver g_uart;

class PacketSender {
 public:
  Status Send(std::span<const std::uint8_t> data) {
    return g_uart.Write(data, 100);
  }
};
```

推荐：

```cpp
class PacketSender {
 public:
  explicit PacketSender(IByteSink& sink) : sink_(sink) {}

 private:
  IByteSink& sink_;
};
```

### MUST：阻塞 contract 显式表达 timeout 与单位

错误：

```cpp
Status Send(Data data, int timeout);
```

推荐：

```cpp
Status Send(std::span<const std::uint8_t> data,
            std::chrono::milliseconds timeout);
```

### SHOULD：公共接口只暴露真正稳定的最小能力

不要为了“以后可能用到”把 DMA、IRQ、fd、RTOS handle 泄漏进通用接口。

这些规则延续规范中的读者优先、显式意图、小接口、避免可写全局状态与阻塞 API 显式 timeout。辅教材明确要求代码可读、意图显式，并优先静态检查。 

## ⑥ 可编译实验 / 练习（15 分钟）

实验：`examples/day-041/main.cpp`

目标：实现一个与具体 UART 无关的 `PacketSender`，通过小型 `IByteSink` contract 同时支持生产 adapter 与测试 fake。

```bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic \
  examples/day-041/main.cpp -o day041
./day041
```

### 修复违规代码

```cpp
UartDriver* g_uart;

class Protocol {
 public:
  bool Send(const uint8_t* p, int len) {
    return g_uart->Write(p, len, 1000) == 0;
  }
};
```

要求：

1. 去掉可写全局依赖；
2. 明确 borrow/ownership；
3. 用 `std::span` 表达 buffer；
4. timeout 使用带单位类型；
5. 用项目统一 Status，而不是把所有错误压成 bool。

## ⑦ 3 个常见坑（3 分钟）

1. **把复用理解为复制代码到 common/**：目录位置不会自动产生稳定 contract。
2. **为了通用暴露所有底层能力**：接口越大，平台耦合通常越强。
3. **复用组件自己创建硬件/线程资源**：ownership 和测试边界会迅速变模糊。

## ⑧ 检查题（4 分钟）

### Q1

为什么 `PacketSender(IByteSink&)` 比内部直接访问 `g_uart` 更容易复用和测试？

### Q2

设计 reusable component 时，为什么“最小稳定 contract”通常比“功能最全接口”更重要？

**答案要点：**依赖注入让平台实现可替换并显式表达 borrow；小 contract 减少耦合、变化传播和测试组合数量。

## 下一步

Day 42 继续 Chapter 6，深入 reusable component 的抽象边界、依赖与接口设计。