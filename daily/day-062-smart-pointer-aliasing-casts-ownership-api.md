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

<!-- cpp-standards:start -->
## 本课涉及的 C++ 标准

以下按正文与配套 `.cpp` 示例中出现的特性标注首次标准化版本，不代表整份程序的最低编译版本。仓库主 Lab 统一使用 C++23。

| 特性 | 首次标准化 | 版本边界 |
| --- | --- | --- |
| 列表初始化 | **C++11** | 包括直接列表初始化；窄化检查及 initializer_list 优先规则须单独注意。 |
| `= default` / `= delete` | **C++11** | 显式默认化与删除函数。 |
| `auto` 类型推导 | **C++11** | C++14 才支持普通函数返回类型推导；C++20 才支持 `auto` 形参的简写函数模板。 |
| `override` / `final` | **C++11** | 用于虚函数覆盖检查、限制覆盖或继承。 |
| 标准智能指针与 `std::make_shared` | **C++11** | `unique_ptr`、`shared_ptr`、`weak_ptr`、`enable_shared_from_this`；不要据此把所有相关辅助函数都标为 C++11。 |
| `enable_shared_from_this::weak_from_this` | **C++17** | `shared_from_this()` 从 C++11 起已有。 |

版本差异、旧机制与工具链检查见 [C++ 标准来源速查](../docs/cpp-feature-standards.md)。
<!-- cpp-standards:end -->

> **主教材主线**：Chapter 7 · Memory Management。承接 Day 61 的 callback lifetime，今天继续 smart pointer 高级 API：aliasing constructor、pointer cast 与 ownership API 审计。重点不是记 API，而是判断这些机制是否正在掩盖错误的稳定边界。

## ① 今日章节与建议阅读范围（5 分钟）

### 新手起步：先知道今天在解决什么

把“保存的地址”与“负责保持谁存活”画成两条线。alias 可以指向成员，却仍共享完整 owner 的生命周期，不是成员被单独复制了。

**前置检查：** 先能解释 [Day 4](day-004-references-parameter-passing.md)、[Day 33](day-033-polymorphism-virtual-interfaces.md)、[Day 60](day-060-shared-ptr-weak-ptr-lifetime.md)、[Day 61](day-061-enable-shared-from-this-callback-lifetime.md) 的核心例子；不必先掌握整本教材。

**本课最低完成目标：** 能按下面的步骤说明示例如何得到结果，并独立完成一项小修改；高级模式与平台性能分析可第二遍再读。新增导读和拓展练习不计入原有约 60 分钟安排，可分两次完成。

继续 Chapter 7 smart pointer 高级用法，重点阅读 `shared_ptr` 的 aliasing constructor，以及 `static_pointer_cast`、`dynamic_pointer_cast`、`const_pointer_cast`、`reinterpret_pointer_cast` 等 shared pointer cast API。

阅读时区分两件事：**stored pointer 指向谁**，以及 **control block 拥有谁**。Aliasing `shared_ptr` 可以指向 owner 对象的 subobject，但仍通过同一 control block 延长完整 owner lifetime。

## ② 昨日复习 3 问（5 分钟）

1. `weak_from_this()` 为什么适合“对象活着才处理”的异步 callback？
2. 为什么 weak capture 仍不能替代 unsubscribe / cancel / join？
3. 从裸 `this` 构造 `shared_ptr<T>(this)` 为什么可能产生第二 control block？

## ③ 核心概念与场景对照（25 分钟，含进阶选读）

### 先用白话建立概念

- **别名共享指针**：共享 owner 但观察不同地址。
- **类型转换**：改变观察对象的类型方式。

### 跟着本课实验走一遍

1. 建立完整 owner。
2. 创建成员 alias。
3. 比较访问地址。
4. 释放原 owner 变量。
5. alias 仍保持整体所有权。

先尝试口头预测，再到第⑥节运行。下面原有概念、图示与接口对照用于解释这些步骤，短代码片段不一定能单独编译；完整程序以本课 `main.cpp` 为准。

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

### 进阶选读：模式映射

今天真正相关的是 **Adapter + explicit Dependency Injection**，而不是为了 cast 再增加 Factory。

- **需求变化**：底层 UART/SPI/USB transport 不同，具体 capability 不完全相同。
- **变化轴**：硬件实现、transport-specific operation、runtime replacement 是否真的需要。
- **稳定边界**：上层 Modem/Protocol 只依赖它真正需要的最小能力。
- **C++ 机制**：小接口、reference borrow；确需 runtime replacement 时使用 virtual interface；编译期固定实现比较 template/concept。
- **ownership**：接口类型与 ownership 是两个维度。`shared_ptr<Driver>` 不应只是为了获得 polymorphism；owner 唯一时仍可 `unique_ptr<Driver>`，required dependency 可直接 `Driver&`。

如果只有一个固定 UART driver，最简单的 composition/reference 可能比 Strategy/Factory/Adapter 全套模式更正确。Pattern 必须服务真实变化轴。

### 进阶选读：嵌入式与系统场景

考虑 Modem middleware 同时支持 UART 与 USB transport。Protocol 层只需要：

```text
Send(bytes, timeout)
Receive(buffer, timeout)
Cancel()
```

若 Protocol 层为了清 FIFO 不断 downcast 到 `UartDriver`，说明 HAL/transport boundary 泄漏。可以把 FIFO reset 留在 UART adapter 的 recovery policy 中，或者设计明确的 recovery capability，而不是让上层认识具体 driver。

Aliasing `shared_ptr` 也要谨慎用于 DMA descriptor/sub-buffer：alias 虽只指向 descriptor/member，却会延长整个 owning arena/session 的 lifetime。若 arena teardown 受 RTOS task、DMA completion 或 IRQ 约束，这种隐藏延长必须在设计图中显式说明。

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

## ⑤ 今日编码规范（6 分钟）

### MUST：API 必须表达 ownership，而不是只表达 pointer shape

错误：所有 dependency 都传 `shared_ptr<T>`，即使函数既不保存也不延长 lifetime。

推荐：required synchronous borrow 用 `T&`；optional borrow 用 `T*`；ownership transfer 用 `unique_ptr<T>`；只有真实 shared lifetime 才用 `shared_ptr<T>`。

### SHOULD：出现重复 downcast 时审计稳定接口

错误：业务层通过 `dynamic_pointer_cast<ConcreteDriver>` 获取具体能力。

推荐：把真正稳定的 capability 放到小接口，或在 Adapter 内吸收硬件差异。

### MAY：aliasing `shared_ptr` 只用于明确记录过 lifetime 关系的 subobject view

必须说明 alias 为什么需要延长完整 owner lifetime，以及 teardown 是否因此改变。

## ⑥ 可编译 Lab / 练习（7 分钟）

### 第一次做：先运行，再只改一件事

1. 在仓库根目录打开 [`examples/day-062/main.cpp`](../examples/day-062/main.cpp)，先读 `main()`，圈出输入、调用与结果检查。
2. 运行原版，把实际输出和退出状态记下来，再与本节预期对照。无输出也可能成功，必须结合退出码与断言判断。
3. 修改前先写预期；若失败，先读第一条编译错误或失败断言，再回到对应概念，不同时重写多个函数。

**本课小改动：** 画出 alias 持有期间哪些大对象仍不能释放；说明仅需临时读取成员时为什么不一定值得共享所有权。

<details>
<summary>练习提示：卡住时再展开</summary>

把上面的执行步骤当作检查点；保留原版作为对照。若练习故意让编译或断言失败，请只在实验副本操作，解释失败后还原，不把负例混入日常通过用例。不要执行越界、悬空解引用或重复释放来“观察效果”。

</details>

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

## ⑦ 3 个常见坑（3 分钟）

1. **alias pointer == owner 的误解**：alias 的 stored pointer 与 control-block owner 可以不同，容易隐藏完整对象 lifetime extension。
2. **用 cast 修接口**：重复 downcast 通常意味着稳定边界错误，而不是缺少一个更方便的 cast helper。
3. **把 polymorphism 与 shared ownership 绑定**：virtual interface 不要求 `shared_ptr`；ownership 应独立设计。

## ⑧ 检查题（2 分钟）

### 分层自测：从解释到判断

1. **理解：** 不看代码，用三句话复述本课示例的输入、关键步骤和结果。
2. **应用：** 说明第⑥节小改动的预期，以及实际结果是否符合预期。
3. **辨析：** 对 `get()` 结果重新构造 shared_ptr 能共享原控制块吗？

<details>
<summary>辨析题参考答案与通过依据</summary>

不能；它通常创建独立控制块并可能导致错误释放，应使用正确的别名构造或共享指针转换工具。

能运行只是第一步。只有能解释本课具体步骤、完成小改动，并说清一个不适用条件，才算完成本次自测；不清楚时回看第③节，不以阅读次数当作掌握证据。

</details>

### 原课检查题

### Q1
Aliasing `shared_ptr<int>{owner, &owner->member}` 在 `owner.reset()` 后为什么仍能安全访问 member？真正被延长 lifetime 的是什么？

### Q2
一个函数只在调用期间使用 `Driver`，既不保存也不异步调用，参数为什么通常应是 `Driver&` 而不是 `shared_ptr<Driver>`？

### Q3 · 设计题
Modem protocol 同时支持 UART/USB。业务层偶尔需要 transport recovery。选择保持简单、composition、Adapter 或 runtime polymorphism，并解释：真实变化轴、稳定 boundary、recovery capability 放在哪里、谁 owner transport、谁只 borrow、是否需要 RTTI/cast，以及 heap/refcount/WCET/IRQ/teardown 约束。

### 对照现有资料库

- [所有权与智能指针](<../patterns/ownership-and-smart-pointers.md>)。
- [实验环境与能力边界](<../docs/lab-environments.md>)。
- [异步会话生命周期：进阶阅读](<../frameworks/asio/SESSION_LIFECYCLE.md>)。

先完成本课小实验，再查对照资料；专题中的线程、网络、板端或模式不是本课默认前置。以上为本项目已有讲解和工程对照，不冒充标准条文，也不表示所有示例已在目标板验证。

### 今日结论
> **高级 pointer API 不能替代架构判断：stored pointer、owner 与 stable capability 必须分别设计；如果 cast 很聪明但 ownership graph 更难解释，通常边界正在变差。**

下一课继续 Chapter 7，进入内存资源策略、分配控制与 Embedded 中 bounded allocation / allocator boundary 的工程审计。
