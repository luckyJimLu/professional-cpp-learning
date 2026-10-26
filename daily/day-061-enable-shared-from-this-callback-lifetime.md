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

> **主教材主线**：Chapter 7 · Memory Management。承接 Day 60 的 `shared_ptr` / `weak_ptr`，今天聚焦对象如何安全地产生指向自身的 shared/weak handle，以及异步 callback 为什么必须同时设计 lifetime 与 teardown。

## ① 今日章节与建议阅读范围（5 分钟）

继续 Chapter 7 的 smart pointer 高级内容，重点阅读 `enable_shared_from_this`、`shared_from_this()` 与 shared ownership 的构造约束。结合 Day 60 的 control block 理解：不能从裸 `this` 随意创建新的 `shared_ptr`，否则会形成独立 control block。

阅读时带着两个问题：callback 是否应该延长 owner lifetime？callback source 在 owner 销毁前是否能够确定地停止或 unsubscribe？

## ② 昨日复习 3 问（5 分钟）

1. 为什么“多个使用者”不能直接推出“多个共同 owner”？
2. `weak_ptr::lock()` 成功后，为什么得到的是临时 strong owner？
3. `Service` 与 `Worker` 双向保存 `shared_ptr` 为什么会让析构不发生？

## ③ 核心概念（10 分钟）

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

## ⑤ 设计模式映射（8 分钟）

今天最相关的是 **Observer 的 callback lifetime 边界**。

- **需求变化**：事件源和 observer 的停止时间可能不同。
- **变化轴**：observer 是否仍存在、callback 是否仍在队列中、执行线程何时结束。
- **稳定边界**：callback 不得解引用已经死亡的 observer，也不应无意间永久延长其 lifetime。
- **C++ 机制**：严格嵌套 lifetime 用 reference；可失效异步观察可用 `weak_ptr`；真正共同决定 lifetime 才使用 strong `shared_ptr`。
- **DI**：EventSource 作为 required dependency 显式注入，不通过 service locator 隐藏关系。

这里不需要额外引入 Factory、Command 或 State。callback 本身虽然“像 Command”，但如果没有排队、撤销、统一命令接口等真实变化轴，命名成 Command Pattern 只会增加概念负担。

**Pattern 滥用**：为了避免 dangling callback，把所有 lambda 都捕获 `shared_from_this()`。这可能把内存安全问题变成 shutdown 永远推迟的问题。

## ⑥ Embedded / System Design 场景（7 分钟）

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

`weak_ptr` 是最后一道 lifetime 防线，不是 teardown protocol。若 callback 在 ISR 中执行，更不能直接进行 `shared_ptr` refcount、锁、heap 或复杂析构；ISR 应把 bounded event 投递给 task context。

固定 RTOS task graph 中，如果 ConnectionManager 的 lifetime 明确覆盖 RX worker，则 reference + explicit stop/join 往往比 shared ownership 更可预测。

## ⑦ 今日编码规范（6 分钟）

### MUST：不得从裸 `this` 构造新的 owning `shared_ptr`

错误：

```cpp
std::shared_ptr<Session> Self() { return std::shared_ptr<Session>(this); }
```

推荐：对象确实处于 shared ownership 时使用 `enable_shared_from_this`；否则重新审视是否根本不需要 shared ownership。

### MUST：异步 callback 必须定义 teardown contract

仅捕获 `weak_ptr` 不够；必须明确 stop、unsubscribe/cancel、in-flight callback 和销毁顺序。

### SHOULD：callback 不需要延长 lifetime 时优先 weak capture

强捕获 `shared_ptr` 必须是有意的 lifetime extension，并在 Code Review 中说明谁最终释放它。

## ⑧ 可编译 Lab / 练习（7 分钟）

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

## ⑨ 3 个常见坑（3 分钟）

1. **`shared_ptr(this)`**：产生第二 control block，最终可能 double delete。
2. **强捕获 self everywhere**：没有 dangling，但对象被 callback source 隐式拥有，shutdown 不可预测。
3. **把 weak capture 当完整 teardown**：它只避免访问死亡对象，不能停止事件源、等待线程或保证硬件释放上下文。

## ⑩ 检查题（2 分钟）

### Q1
为什么 `enable_shared_from_this` 必须复用已有 control block，而不能简单返回 `shared_ptr<T>(this)`？

### Q2
一个 telemetry callback 允许 session 销毁后直接丢弃事件，应强捕获还是 weak capture？为什么？

### Q3 · 设计题
设计 ConnectionManager、ModemSession、RX worker、EventSource 的 shutdown。判断哪些关系是 owner、required borrow、weak observer；说明 unsubscribe、in-flight callback、join、transport close 的顺序，并比较 reference/`weak_ptr`/strong `shared_ptr` 对 heap、atomic refcount、WCET 与线程上下文的影响。

## 今日结论

> **callback 安全不是“捕获一个智能指针”就结束：先决定谁应该延长 lifetime，再设计 stop/unsubscribe/join/teardown；`weak_ptr` 是可失效观察机制，不是生命周期协议。**

下一课继续 Chapter 7，进入 smart pointer 的 aliasing / cast / ownership API 细节与资源边界审计。
