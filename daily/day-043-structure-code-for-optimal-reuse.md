---
day: 43
week: 7
part: II
chapter: 6
chapter_title: Designing for Reuse
title: Structure Your Code for Optimal Reuse
status: published
date: 2026-10-09
duration: 60
lab:
  path: examples/day-043/main.cpp
previous: 42
next: 44
topics:
  - structure-code-for-optimal-reuse
guidelines:
  - explicit-contract
---

# Day 43 · Structure Your Code for Optimal Reuse：按职责与依赖方向组织代码

## ① 今日章节与建议阅读范围（5 分钟）

### 新手起步：先知道今天在解决什么

先区分复用核心、平台适配和对象装配。核心若直接包含某块板卡头文件，即使类名很抽象也仍被平台绑定。

**前置检查：** 先能解释 [Day 14](day-014-headers-iwyu-dependencies.md)、[Day 24](day-024-coupling-cohesion-dependencies.md)、[Day 41](day-041-reuse-contracts-components.md)、[Day 42](day-042-use-abstraction-for-reuse.md) 的核心例子；不必先掌握整本教材。

**本课最低完成目标：** 能按下面的步骤说明示例如何得到结果，并独立完成一项小修改；高级模式与平台性能分析可第二遍再读。新增导读和拓展练习不计入原有约 60 分钟安排，可分两次完成。

继续 Chapter 6 · **Designing for Reuse**，进入 **Structure Your Code for Optimal Reuse**。

昨天解决“用 abstraction 隔离实现”，今天继续解决更大的问题：即使单个接口设计得很好，如果协议、平台、业务编排、资源管理全部塞在同一模块里，代码仍然难以复用。

重点观察：可复用代码应把稳定逻辑与应用/平台特有逻辑分开，让依赖方向指向稳定 contract，而不是让通用组件反向依赖具体产品。

## ② 昨日复习 3 问（5 分钟）

1. 为什么 `Write(span, milliseconds)` 比暴露 DMA channel 更适合作为 reusable contract？
2. abstraction 是否等于必须使用 virtual？
3. required non-owning dependency 为什么优先引用？

## ③ 核心概念（12 分钟）

### 先用白话建立概念

- **模块边界**：代码与依赖的组织边界。
- **组合根**：集中创建并连接对象的位置。

### 跟着本课实验走一遍

1. 从 main 找到对象装配。
2. 跟踪 client 依赖的接口。
3. 分别进入生产和 fake sink。
4. 确认业务核心未切换平台条件。

先尝试口头预测，再到第⑥节运行。下面原有概念、图示与接口对照用于解释这些步骤，短代码片段不一定能单独编译；完整程序以本课 `main.cpp` 为准。

### 按职责拆，而不是按“一个大 Manager”堆功能

不利于复用：

```text
ModemManager
├── UART/HAL
├── AT framing
├── retry
├── product policy
└── logging
```

更清晰：

```text
Application Policy
       |
       v
   AtClient --------> IByteSink
       |                  ^
       |                  |
 protocol logic       UartSink / FakeSink
```

`AtClient` 只承担 AT 命令组织；`IByteSink` 是稳定边界；平台 adapter 承担 HAL/RTOS/Linux 差异；应用层决定业务策略。

### 依赖方向决定复用范围

如果 middleware include BSP/HAL 头文件，它就被具体平台绑住。更好的方向是：

```text
app -> middleware -> contract <- platform adapter
```

高层协议不需要知道 STM32、NuttX 或 Linux 的具体 API。

### 公共头文件是复用成本的入口

公共 `.h` 每多暴露一个平台类型，调用者就多承担一项编译与耦合成本。保持 header 自包含，同时只 include contract 真正需要的类型。

### 把变化频率不同的代码拆开

协议 framing 可能多年稳定；板级 UART 初始化会随芯片变化；产品 retry policy 又可能随需求变化。把它们拆成独立职责，变化才不会互相传播。

## ④ C 写法 vs Modern C++（8 分钟）

C 项目常见模块：

```c
int modem_send_at(struct uart_handle* uart,
                  const char* command,
                  unsigned int retry_count,
                  unsigned int timeout_ms);
```

一个函数同时知道 transport、协议和 policy。

Modern C++ 可以把稳定职责分开：

```cpp
class AtClient {
public:
  explicit AtClient(IByteSink& sink) : sink_(sink) {}
  Status Send(std::span<const std::uint8_t> command, std::chrono::milliseconds timeout);

private:
  IByteSink& sink_;
};
```

retry 是否执行、执行几次，可以留给更高层 policy，而不是硬编码进通用协议组件。

## ⑤ 今日编码规范（8 分钟）

### MUST：通用层不得反向依赖具体 platform/BSP

错误：

```cpp
#include "stm32_uart.h"

class AtClient {
  Stm32Uart& uart_;
};
```

推荐：

```cpp
class AtClient {
public:
  explicit AtClient(IByteSink& sink) : sink_(sink) {}

private:
  IByteSink& sink_;
};
```

### SHOULD：公共接口只 include 自己真正使用的依赖

错误：公共协议头文件 include RTOS、HAL、logger、board config，只因 `.cc` 里可能使用。

推荐：header 自包含且最小；实现专用依赖留在 `.cc` 或 concrete adapter。

### SHOULD：不同变化原因拆成不同组件

错误：`ModemManager` 同时负责 framing、UART、retry、logging、产品状态机。

推荐：协议、transport adapter、policy、application orchestration 分层，让每个组件只有一个清晰变化原因。

## ⑥ 可编译实验 / 练习（15 分钟）

### 第一次做：先运行，再只改一件事

1. 在仓库根目录打开 [`examples/day-043/main.cpp`](../examples/day-043/main.cpp)，先读 `main()`，圈出输入、调用与结果检查。
2. 运行原版，把实际输出和退出状态记下来，再与本节预期对照。无输出也可能成功，必须结合退出码与断言判断。
3. 修改前先写预期；若失败，先读第一条编译错误或失败断言，再回到对应概念，不同时重写多个函数。

**本课小改动：** 画出头文件依赖箭头，检查是否有从核心指向板级实现的箭头；解释它会妨碍哪类测试。

<details>
<summary>练习提示：卡住时再展开</summary>

把上面的执行步骤当作检查点；保留原版作为对照。若练习故意让编译或断言失败，请只在实验副本操作，解释失败后还原，不把负例混入日常通过用例。不要执行越界、悬空解引用或重复释放来“观察效果”。

</details>

实验：`examples/day-043/main.cpp`

实现一个不依赖具体平台的 `AtClient`，分别接入 `FixedBufferSink` 与 `FakeSink`。整个示例不需要 heap allocation。

```bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic \
  examples/day-043/main.cpp -o day043
./day043
```

### 修复违规代码

```cpp
class ModemManager {
public:
  Status Send(const char* command) {
    HAL_UartWrite(command);
    Log("sent");
    for (int i = 0; i < 3; ++i) {
      // retry + product policy
    }
    return Status::kOk;
  }
};
```

要求：

1. transport 通过小 contract 注入；
2. protocol 不 include HAL；
3. retry policy 与 framing 分离；
4. timeout 单位显式；
5. 不引入可写全局状态；
6. 保持实时路径有界。

## ⑦ 3 个常见坑（3 分钟）

1. **目录分层了，依赖却没分层**：`middleware/` 仍直接 include `bsp/`，只是换了文件夹。
2. **为了复用做成万能组件**：配置项不断增加，最终接口比专用实现更难理解。
3. **拆得过细**：每个两行函数都做接口会增加导航和维护成本；抽象必须对应真实变化边界。

## ⑧ 检查题（4 分钟）

### 分层自测：从解释到判断

1. **理解：** 不看代码，用三句话复述本课示例的输入、关键步骤和结果。
2. **应用：** 说明第⑥节小改动的预期，以及实际结果是否符合预期。
3. **辨析：** 把代码拆到多个文件就完成模块化了吗？

<details>
<summary>辨析题参考答案与通过依据</summary>

没有；依赖方向、接口职责和构建边界才决定是否真正能独立复用。

能运行只是第一步。只有能解释本课具体步骤、完成小改动，并说清一个不适用条件，才算完成本次自测；不清楚时回看第③节，不以阅读次数当作掌握证据。

</details>

### 原课检查题

### Q1

为什么 `app -> middleware -> contract <- platform adapter` 比 `middleware -> STM32 HAL` 更容易复用？

### Q2

什么时候应该把 retry 从 `AtClient` 中拆出去？

**答案要点：**依赖稳定 contract 后，协议逻辑不随平台变化；当 retry 属于产品策略、变化频率或测试维度与 framing 不同时，应拆成独立 policy/orchestration。

### 对照现有资料库

- [模式选型工作坊](<../patterns/engineering-workshop.md>)。
- [复用契约章末评审](<../docs/chapter-06-review.md>)。

先完成本课小实验，再查对照资料；专题中的线程、网络、板端或模式不是本课默认前置。以上为本项目已有讲解和工程对照，不冒充标准条文，也不表示所有示例已在目标板验证。

### 今日 Code Review 快检
- [ ] 公共头文件自包含且没有无关平台依赖
- [ ] 命名能反映组件职责
- [ ] ownership / lifetime 明确
- [ ] 实时路径无无界动态分配或等待
- [ ] 错误模型统一且保留上下文
- [ ] ISR 最小化，未误用 `volatile` 做同步
- [ ] 无裸 magic number，单位显式
- [ ] 空输入、最大长度、timeout 等边界有测试

## 下一步

Day 44 继续按 Chapter 6 教材顺序推进，并在生成前再次核对仓库与教材上下文。
