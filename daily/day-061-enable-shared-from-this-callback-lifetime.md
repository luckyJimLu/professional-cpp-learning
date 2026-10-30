---
day: 61
week: 9
part: III
chapter: 7
chapter_title: Memory Management
title: enable_shared_from_this · Async Callback Lifetime and Teardown
duration: 60
status: published
date: 2026-10-26
topics: [enable-shared-from-this, weak-from-this, callback-lifetime, teardown, shared-ownership]
patterns: [observer, dependency-injection]
guidelines: [explicit-lifetime, weak-callback, deterministic-teardown]
lab:
  path: examples/day-061/main.cpp
previous: 60
next: 62
---

# Day 61 · `enable_shared_from_this`：异步 Callback Lifetime 与 Teardown

<!-- cpp-standards:start -->
## 本课涉及的 C++ 标准

以下按正文与配套 `.cpp` 示例中出现的特性标注首次标准化版本，不代表整份程序的最低编译版本。仓库主 Lab 统一使用 C++23。

| 特性 | 首次标准化 | 版本边界 |
| --- | --- | --- |
| 列表初始化 | **C++11** | 包括直接列表初始化；窄化检查及 initializer_list 优先规则须单独注意。 |
| lambda 表达式 | **C++11** | 泛型 lambda（auto 形参）、初始化捕获从 C++14 起可用；显式模板形参列表从 C++20 起可用。 |
| `auto` 类型推导 | **C++11** | C++14 才支持普通函数返回类型推导；C++20 才支持 `auto` 形参的简写函数模板。 |
| `noexcept` | **C++11** | 从 C++17 起异常说明成为函数类型的一部分。 |
| `[[nodiscard]]` | **C++17** | 带说明字符串的形式从 C++20 起可用。 |
| 标准智能指针与 `std::make_shared` | **C++11** | `unique_ptr`、`shared_ptr`、`weak_ptr`、`enable_shared_from_this`；不要据此把所有相关辅助函数都标为 C++11。 |
| `enable_shared_from_this::weak_from_this` | **C++17** | `shared_from_this()` 从 C++11 起已有。 |
| 移动语义 / `std::move` / `std::forward` | **C++11** | `std::move` 本身执行类型转换，不直接搬运资源。 |
| `std::function` | **C++11** | 可调用对象包装；可能分配内存。 |
| `std::string_view` | **C++17** | 非拥有视图；其 `starts_with` / `ends_with` 是 C++20 新增。 |

版本差异、旧机制与工具链检查见 [C++ 标准来源速查](../docs/cpp-feature-standards.md)。
<!-- cpp-standards:end -->

> **主教材主线**：Chapter 7 · Memory Management。承接 Day 60 的 `shared_ptr` / `weak_ptr`，今天聚焦对象如何安全地产生指向自身的 shared/weak handle，以及异步 callback 为什么必须同时设计 lifetime 与 teardown。

## ① 今日章节与建议阅读范围（5 分钟）

### 新手起步：先知道今天在解决什么

先有兼容的共享所有权，再谈获取自身引用。不能通过 `shared_ptr(this)` 再造一个独立控制块；异步回调还需区分延长寿命和仅观察。

**前置检查：** 先能解释 [Day 33](day-033-polymorphism-virtual-interfaces.md)、[Day 57](day-057-smart-pointers-ownership-transfer.md)、[Day 60](day-060-shared-ptr-weak-ptr-lifetime.md) 的核心例子；不必先掌握整本教材。

**本课最低完成目标：** 能按下面的步骤说明示例如何得到结果，并独立完成一项小修改；高级模式与平台性能分析可第二遍再读。新增导读和拓展练习不计入原有约 60 分钟安排，可分两次完成。

继续 Chapter 7 的 smart pointer 高级内容，重点阅读 `enable_shared_from_this`、`shared_from_this()` 与 shared ownership 的构造约束。结合 Day 60 的 control block 理解：不能从裸 `this` 随意创建新的 `shared_ptr`，否则会形成独立 control block。

阅读时带着两个问题：callback 是否应该延长 owner lifetime？callback source 在 owner 销毁前是否能够确定地停止或 unsubscribe？

## ② 昨日复习 3 问（5 分钟）

1. 为什么“多个使用者”不能直接推出“多个共同 owner”？
2. `weak_ptr::lock()` 成功后，为什么得到的是临时 strong owner？
3. `Service` 与 `Worker` 双向保存 `shared_ptr` 为什么会让析构不发生？

## ③ 核心概念与场景对照（25 分钟，含进阶选读）

### 先用白话建立概念

- **shared_from_this**：复用已有共享所有权。
- **teardown**：停止活动并释放依赖的过程。

### 跟着本课实验走一遍

1. 创建共享对象。
2. 注册弱捕获回调。
3. 执行时 lock。
4. 对象已销毁则退出。
5. 关闭流程停止后续活动。

先尝试口头预测，再到第⑥节运行。下面原有概念、图示与接口对照用于解释这些步骤，短代码片段不一定能单独编译；完整程序以本课 `main.cpp` 为准。

`std::enable_shared_from_this<T>` 让一个已经由兼容 `shared_ptr` 管理的对象安全获得共享自身 control block 的 `shared_ptr`。关键不是少写一个参数，而是**复用同一个 ownership control block**。

```text
错误方向：this -> shared_ptr<T>(this)
                  -> 新 control block
                  -> double delete / ownership corruption

正确方向：make_shared<T>()
             -> 唯一 control block
             -> shared_from_this() / weak_from_this()
```

但 `shared_from_this()` 仍然意味着**延长 lifetime**。异步 callback 若只需要“对象还活着就处理，否则跳过”，更合适的边界通常是 `weak_from_this()`，callback 执行时 `lock()`。

编译期成本主要是类型关系；运行期仍包含 control block、引用计数以及 `lock()`。Embedded 中还必须考虑 callback 执行线程、最后一个 strong owner 的释放线程、allocation 和 WCET。

### 进阶选读：模式映射

今天最相关的是 **Observer 的 callback lifetime 边界**。

- **需求变化**：事件源和 observer 的停止时间可能不同。
- **变化轴**：observer 是否仍存在、callback 是否仍在队列中、执行线程何时结束。
- **稳定边界**：callback 不得解引用已经死亡的 observer，也不应无意间永久延长其 lifetime。
- **C++ 机制**：严格嵌套 lifetime 用 reference；可失效异步观察可用 `weak_ptr`；真正共同决定 lifetime 才使用 strong `shared_ptr`。
- **DI**：EventSource 作为 required dependency 显式注入，不通过 service locator 隐藏关系。

这里不需要额外引入 Factory、Command 或 State。callback 本身虽然“像 Command”，但如果没有排队、撤销、统一命令接口等真实变化轴，命名成 Command Pattern 只会增加概念负担。

**Pattern 滥用**：为了避免 dangling callback，把所有 lambda 都捕获 `shared_from_this()`。这可能把内存安全问题变成 shutdown 永远推迟的问题。

### 进阶选读：嵌入式与系统场景

考虑 Modem RX worker：UART/IPC event source 在 worker thread 上产生事件，`ModemSession` 由 ConnectionManager 管理。

推荐 teardown 顺序：

```text
ConnectionManager requests stop
  -> stop new event production
  -> unsubscribe / cancel callback
  -> wait for in-flight callback / join worker
  -> destroy ModemSession
  -> close transport / hardware resource
```

`weak_ptr` 是最后一道 lifetime 防线，不是 teardown protocol。若 callback 在 ISR 中执行，更不能直接操作 `shared_ptr` 引用计数、锁、heap 或复杂析构；ISR 应把 bounded event 投递给 task context。

固定 RTOS task graph 中，如果 ConnectionManager 的 lifetime 明确覆盖 RX worker，则 reference + explicit stop/join 往往比 shared ownership 更可预测。

## ④ C 写法 vs Modern C++（7 分钟）

传统 C/旧式代码常把 `void* context` 或裸 `this` 注册给异步 C API：

```cpp
RegisterCallback(this);
```

如果 unregister 与对象析构不同步，callback 可能在对象销毁后触发，形成 use-after-free。

Modern C++ 可以用 `weak_ptr` 表达可失效 callback：

```cpp
auto weak_self = weak_from_this();
source.Subscribe([weak_self] {
  if (auto self = weak_self.lock()) {
    self->HandleEvent();
  }
});
```

它提升 lifetime 可见性，但并不替代 unsubscribe、cancel、join 或硬件 teardown。对于严格嵌套、同步调用，普通 reference borrow 仍更简单且成本更低。

## ⑤ 今日编码规范（6 分钟）

### MUST：不得从裸 `this` 构造新的 owning `shared_ptr`

错误：

```cpp
std::shared_ptr<Session> Self() {
  return std::shared_ptr<Session>(this);
}
```

推荐：对象确实处于 shared ownership 时使用 `enable_shared_from_this`；否则重新审视是否根本不需要 shared ownership。

### MUST：异步 callback 必须定义 teardown contract

仅捕获 `weak_ptr` 不够；必须明确 stop、unsubscribe/cancel、in-flight callback 和销毁顺序。

### SHOULD：callback 不需要延长 lifetime 时优先 weak capture

强捕获 `shared_ptr` 必须是有意的 lifetime extension，并在 Code Review 中说明谁最终释放它。

## ⑥ 可编译 Lab / 练习（7 分钟）

### 第一次做：先运行，再只改一件事

1. 在仓库根目录打开 [`examples/day-061/main.cpp`](../examples/day-061/main.cpp)，先读 `main()`，圈出输入、调用与结果检查。
2. 运行原版，把实际输出和退出状态记下来，再与本节预期对照。无输出也可能成功，必须结合退出码与断言判断。
3. 修改前先写预期；若失败，先读第一条编译错误或失败断言，再回到对应概念，不同时重写多个函数。

**本课小改动：** 分别模拟回调早于与晚于 owner 释放的情形，预期晚到回调安全跳过；不要通过悬空 this 试验。

<details>
<summary>练习提示：卡住时再展开</summary>

把上面的执行步骤当作检查点；保留原版作为对照。若练习故意让编译或断言失败，请只在实验副本操作，解释失败后还原，不把负例混入日常通过用例。不要执行越界、悬空解引用或重复释放来“观察效果”。

</details>

### 主 Lab：`weak_from_this()` callback

文件：`examples/day-061/main.cpp`

```bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic examples/day-061/main.cpp -o day061
./day061
```

观察：session 存活时 callback 正常工作；外部 owner reset 后 session 立即析构，之后 callback 安全输出 expired，而不是访问悬空 `this`。

### Exercise 01：Code Review 强捕获导致的隐藏 lifetime extension

文件：`examples/day-061/exercise-01.cpp`

```bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic examples/day-061/exercise-01.cpp -o day061-ex01
./day061-ex01
```

Starter 完全可编译运行，但 EventSource 保存的 lambda 强捕获 `shared_from_this()`，所以外部 owner 离开作用域后 controller 仍然存活，事件仍被处理，直到 EventSource 自己销毁才析构。

重构要求：

1. 判断 EventSource 是否应该拥有 Controller；
2. 若不应该，改为 `weak_from_this()` / `weak_ptr::lock()`；
3. 增加显式 `Unsubscribe()` 或 token/RAII subscription，使 teardown 不只依赖 weak pointer；
4. 让输出清楚显示外部 owner 离开后 controller 的销毁时刻；
5. 说明如果 callback 来自 worker thread，需要怎样处理 in-flight callback 与 join。

## ⑦ 3 个常见坑（3 分钟）

1. **`shared_ptr(this)`**：产生第二 control block，最终可能 double delete。
2. **强捕获 self everywhere**：没有 dangling，但对象被 callback source 隐式拥有，shutdown 不可预测。
3. **把 weak capture 当完整 teardown**：它只避免访问死亡对象，不能停止事件源、等待线程或保证硬件释放上下文。

## ⑧ 检查题（2 分钟）

### 分层自测：从解释到判断

1. **理解：** 不看代码，用三句话复述本课示例的输入、关键步骤和结果。
2. **应用：** 说明第⑥节小改动的预期，以及实际结果是否符合预期。
3. **辨析：** 有 weak_ptr 是否就不需要停止定时器和注销回调？

<details>
<summary>辨析题参考答案与通过依据</summary>

仍需要；弱引用解决部分对象访问寿命问题，不自动终止外部活动或保证关闭次序。

能运行只是第一步。只有能解释本课具体步骤、完成小改动，并说清一个不适用条件，才算完成本次自测；不清楚时回看第③节，不以阅读次数当作掌握证据。

</details>

### 原课检查题

### Q1
为什么 `enable_shared_from_this` 必须复用已有 control block，而不能简单返回 `shared_ptr<T>(this)`？

### Q2
一个 telemetry callback 允许 session 销毁后直接丢弃事件，应强捕获还是 weak capture？为什么？

### Q3 · 设计题
设计 ConnectionManager、ModemSession、RX worker、EventSource 的 shutdown。判断哪些关系是 owner、required borrow、weak observer；说明 unsubscribe、in-flight callback、join、transport close 的顺序，并比较 reference/`weak_ptr`/strong `shared_ptr` 对 heap、atomic refcount、WCET 与线程上下文的影响。

### 对照现有资料库

- [所有权与智能指针](<../patterns/ownership-and-smart-pointers.md>)。
- [实验环境与能力边界](<../docs/lab-environments.md>)。
- [异步会话生命周期：进阶阅读](<../frameworks/asio/SESSION_LIFECYCLE.md>)。

先完成本课小实验，再查对照资料；专题中的线程、网络、板端或模式不是本课默认前置。以上为本项目已有讲解和工程对照，不冒充标准条文，也不表示所有示例已在目标板验证。

### 今日结论
> **callback 安全不是“捕获一个智能指针”就结束：先决定谁应该延长 lifetime，再设计 stop/unsubscribe/join/teardown；`weak_ptr` 是可失效观察机制，不是生命周期协议。**

下一课继续 Chapter 7，进入 smart pointer 的 aliasing / cast / ownership API 细节与资源边界审计。
