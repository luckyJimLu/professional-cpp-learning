---
day: 62
week: 9
part: III
chapter: 7
chapter_title: Memory Management
title: Smart Pointer Aliasing, Casts and Ownership API Boundaries
duration: 60
status: published
date: 2026-10-27
topics: [shared-ptr-aliasing, pointer-casts, ownership-api, resource-boundary]
patterns: [adapter, dependency-injection]
guidelines: [explicit-ownership, small-interface, avoid-cast-driven-design]
lab:
  path: examples/day-062/main.cpp
previous: 61
next: 63
---

# Day 62 · Smart Pointer Aliasing / Cast / Ownership API：不要让 Pointer 技巧掩盖边界

> **主教材主线**：Chapter 7 · Memory Management。承接 Day 61 的 callback lifetime，今天继续 smart pointer 高级 API：aliasing constructor、pointer cast 与 ownership API 审计。重点不是记 API，而是判断这些机制是否正在掩盖错误的稳定边界。

## ① 今日章节与建议阅读范围（5 分钟）

继续 Chapter 7 smart pointer 高级用法，重点阅读 `shared_ptr` 的 aliasing constructor，以及 `static_pointer_cast`、`dynamic_pointer_cast`、`const_pointer_cast`、`reinterpret_pointer_cast` 等 shared pointer cast API。

阅读时区分两件事：**stored pointer 指向谁**，以及 **control block 拥有谁**。Aliasing `shared_ptr` 可以指向 owner 对象的 subobject，但仍通过同一 control block 延长完整 owner lifetime。

## ② 昨日复习 3 问（5 分钟）

1. `weak_from_this()` 为什么适合“对象活着才处理”的异步 callback？
2. 为什么 weak capture 仍不能替代 unsubscribe / cancel / join？
3. 从裸 `this` 构造 `shared_ptr<T>(this)` 为什么可能产生第二 control block？

## ③ 核心概念（10 分钟）

Aliasing constructor 的关键语义：

```text
shared_ptr<Owner> owner ----> control block ----> Owner lifetime
       |
       +-- alias shared_ptr<Member> ----> Owner::member
                    |
                    +---- shares the SAME control block
```

因此 alias pointer 的 `get()` 可以是成员地址，而 ownership 仍对应完整 `Owner`。这适合在明确的 ownership graph 中暴露 subobject lifetime，但也可能制造隐藏 lifetime extension。

Pointer casts 同样要分清：cast 改变“如何观察对象”，通常不应成为修补架构边界的工具。大量 `dynamic_pointer_cast<Concrete>()` 往往说明抽象接口缺少真正需要的 capability，或者调用者知道了不该知道的具体类型。

运行期方面，`dynamic_pointer_cast` 依赖 RTTI/type check；shared ownership 仍承担 control block/refcount 成本。Embedded 构建可能禁用 RTTI，实时路径也应审计 atomic refcount、cache traffic 与析构线程。

## ④ C 写法 vs Modern C++（7 分钟）

传统 C 常通过 `void*` + tag 恢复具体对象：

```c
if (device->type == DEVICE_UART) {
    struct uart_device* uart = (struct uart_device*)device->context;
    uart_reset_fifo(uart);
}
```

这依赖人工维护 type/tag/cast 一致性。

Modern C++ 可以用 polymorphic interface 表达稳定 capability：

```cpp
struct Driver {
    virtual ~Driver() = default;
    virtual void Poll() = 0;
};
```

但如果业务层随后不断 `dynamic_pointer_cast<UartDriver>`，类型安全只是改善了 cast 本身，并没有改善边界。更好的问题是：`ResetFifo()` 是否属于稳定 Driver contract？是否应由更小的 capability interface、Adapter 或 transport-specific layer 承担？

## ⑤ 设计模式映射（8 分钟）

今天真正相关的是 **Adapter + explicit Dependency Injection**，而不是为了 cast 再增加 Factory。

- **需求变化**：底层 UART/SPI/USB transport 不同，具体 capability 不完全相同。
- **变化轴**：硬件实现、transport-specific operation、runtime replacement 是否真的需要。
- **稳定边界**：上层 Modem/Protocol 只依赖它真正需要的最小能力。
- **C++ 机制**：小接口、reference borrow；确需 runtime replacement 时使用 virtual interface；编译期固定实现比较 template/concept。
- **ownership**：接口类型与 ownership 是两个维度。`shared_ptr<Driver>` 不应只是为了获得 polymorphism；owner 唯一时仍可 `unique_ptr<Driver>`，required dependency 可直接 `Driver&`。

如果只有一个固定 UART driver，最简单的 composition/reference 可能比 Strategy/Factory/Adapter 全套模式更正确。Pattern 必须服务真实变化轴。

## ⑥ Embedded / System Design 场景（7 分钟）

考虑 Modem middleware 同时支持 UART 与 USB transport。Protocol 层只需要：

```text
Send(bytes, timeout)
Receive(buffer, timeout)
Cancel()
```

若 Protocol 层为了清 FIFO 不断 downcast 到 `UartDriver`，说明 HAL/transport boundary 泄漏。可以把 FIFO reset 留在 UART adapter 的 recovery policy 中，或者设计明确的 recovery capability，而不是让上层认识具体 driver。

Aliasing `shared_ptr` 也要谨慎用于 DMA descriptor/sub-buffer：alias 虽只指向 descriptor/member，却会延长整个 owning arena/session 的 lifetime。若 arena teardown 受 RTOS task、DMA completion 或 IRQ 约束，这种隐藏延长必须在设计图中显式说明。

## ⑦ 今日编码规范（6 分钟）

### MUST：API 必须表达 ownership，而不是只表达 pointer shape

错误：所有 dependency 都传 `shared_ptr<T>`，即使函数既不保存也不延长 lifetime。

推荐：required synchronous borrow 用 `T&`；optional borrow 用 `T*`；ownership transfer 用 `unique_ptr<T>`；只有真实 shared lifetime 才用 `shared_ptr<T>`。

### SHOULD：出现重复 downcast 时审计稳定接口

错误：业务层通过 `dynamic_pointer_cast<ConcreteDriver>` 获取具体能力。

推荐：把真正稳定的 capability 放到小接口，或在 Adapter 内吸收硬件差异。

### MAY：aliasing `shared_ptr` 只用于明确记录过 lifetime 关系的 subobject view

必须说明 alias 为什么需要延长完整 owner lifetime，以及 teardown 是否因此改变。

## ⑧ 可编译 Lab / 练习（7 分钟）

### 主 Lab：Aliasing `shared_ptr`

文件：`examples/day-062/main.cpp`

```bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic examples/day-062/main.cpp -o day062
./day062
```

观察：`signal_view` 指向 `ModemSession::signal_dbm`，但与 `session` 共享 control block。原 `session` reset 后，alias 仍使完整 `ModemSession` 存活。

### Exercise 01：Code Review cast-driven interface

文件：`examples/day-062/exercise-01.cpp`

```bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic examples/day-062/exercise-01.cpp -o day062-ex01
./day062-ex01
```

Starter 可正常运行，但 `ServiceDriver()` 先接受 `shared_ptr<Driver>`，随后 `dynamic_pointer_cast<UartDriver>` 才能调用 `ResetFifo()`。

重构要求：

1. 判断 `ServiceDriver()` 是否真的需要 shared ownership；
2. 若只同步使用，改为 required borrow；
3. 判断 FIFO reset 应进入稳定接口、独立 capability interface，还是封装在 UART Adapter 内；
4. 若 firmware 只有 UART 单实现，比较 template/concept/static composition 是否比 runtime polymorphism 更合理；
5. 保持程序独立可编译运行并让输出可观察。

## ⑨ 3 个常见坑（3 分钟）

1. **alias pointer == owner 的误解**：alias 的 stored pointer 与 control-block owner 可以不同，容易隐藏完整对象 lifetime extension。
2. **用 cast 修接口**：重复 downcast 通常意味着稳定边界错误，而不是缺少一个更方便的 cast helper。
3. **把 polymorphism 与 shared ownership 绑定**：virtual interface 不要求 `shared_ptr`；ownership 应独立设计。

## ⑩ 检查题（2 分钟）

### Q1
Aliasing `shared_ptr<int>{owner, &owner->member}` 在 `owner.reset()` 后为什么仍能安全访问 member？真正被延长 lifetime 的是什么？

### Q2
一个函数只在调用期间使用 `Driver`，既不保存也不异步调用，参数为什么通常应是 `Driver&` 而不是 `shared_ptr<Driver>`？

### Q3 · 设计题
Modem protocol 同时支持 UART/USB。业务层偶尔需要 transport recovery。选择保持简单、composition、Adapter 或 runtime polymorphism，并解释：真实变化轴、稳定 boundary、recovery capability 放在哪里、谁 owner transport、谁只 borrow、是否需要 RTTI/cast，以及 heap/refcount/WCET/IRQ/teardown 约束。

## 今日结论

> **高级 pointer API 不能替代架构判断：stored pointer、owner 与 stable capability 必须分别设计；如果 cast 很聪明但 ownership graph 更难解释，通常边界正在变差。**

下一课继续 Chapter 7，进入内存资源策略、分配控制与 Embedded 中 bounded allocation / allocator boundary 的工程审计。
