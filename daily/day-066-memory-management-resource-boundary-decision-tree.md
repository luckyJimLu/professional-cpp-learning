---
day: 66
week: 10
part: III
chapter: 7
chapter_title: Memory Management
title: Memory Management Resource Boundary Decision Tree
duration: 60
status: published
date: 2026-10-31
topics: [ownership, raii, smart-pointers, pmr, object-lifetime, bounded-allocation]
patterns: [dependency-injection, object-pool, strategy]
guidelines: [value-semantics-first, explicit-ownership, bounded-real-time-path]
lab:
  path: examples/day-066/main.cpp
previous: 65
next: 67
---

# Day 66 · Memory Management 收束：资源边界决策树

> **主教材主线**：Chapter 7 · Memory Management。今天不跳章，而是把本章已经学习的 ownership、RAII、smart pointer、PMR、object lifetime 与 bounded allocation 收束成工程决策流程；设计模式仍是辅线。

## ① 今日章节与建议阅读范围（5 分钟）

回看 Chapter 7 中动态内存、RAII、智能指针和资源管理相关小节，重点不是再记 API，而是回答五个工程问题：资源是否必须动态存在？谁拥有？谁只借用？分配何时发生？释放发生在哪个线程/上下文？

建议阅读：本章 smart pointer 与动态内存相关段落 → 对照 Day 56–65 → 用今天的决策树重新审计一个实际 Driver/Modem 模块。

## ② 昨日复习 3 问（5 分钟）

1. `optional<T>` 与 `T*` 的语义根本区别是什么？
2. 固定 Pool 中为什么“地址仍然相同”不代表旧 borrow 在 slot reuse 后仍然有效？
3. 哪种情况下 `array<T,N>` 比 Object Pool 更正确？

## ③ 核心概念（15 分钟）

### 资源边界决策树

```text
对象能否直接作为 value member/local？
├─ 能 → value semantics / array / optional
└─ 不能
   ↓
是否只有一个 owner？
├─ 是 → unique_ptr / 专用 RAII handle
└─ 否 → 先证明是否真的需要 shared lifetime
          ├─ 真共享 → shared_ptr；observer 优先 weak_ptr
          └─ 只是多个使用者 → owner + reference/span borrow

然后继续审计：
资源是否允许 heap？
├─ 否 → array / optional / fixed pool / bounded arena
└─ 是 → 分配是否离开实时路径？失败策略是否明确？

最后审计 teardown：
stop source → unsubscribe/cancel → drain/join → destroy resource
```

### compile-time 与 runtime 成本

`array<T,N>`、value composition 和模板策略把容量/实现更多地固定在编译期，RAM/WCET 更容易推导。virtual interface、`shared_ptr`、runtime allocator/PMR 提供运行期弹性，但增加间接调用、控制块、allocation/refcount 或资源策略成本。不要把“现代 C++”误解成必须 runtime abstraction。

### ownership 与 allocation 是两个轴

`unique_ptr` 回答 owner，不回答 allocator 是否适合实时路径；PMR 回答 allocation source，不回答业务 lifetime；`optional` 回答 0/1 value lifetime，不是 borrow；RAII 回答 teardown 绑定 lifetime，不保证 teardown 可以在 ISR 或任意线程执行。

## ④ C 写法 vs Modern C++（6 分钟）

传统 C 常把 `malloc/free`、handle、used bitmap、cleanup label 分散在业务流程中，ownership 依赖注释和调用顺序。

Modern C++ 优先把 contract 放进类型：长期固定对象用 value；0/1 lifetime 用 `optional`; 单 owner 用 `unique_ptr`; required borrow 用 `T&`; 连续 borrow 用 `span`; 特殊资源用 RAII handle/custom deleter；有界动态工作集才评估 pool/PMR。

差异不是“代码更短”，而是非法 ownership/lifetime 状态更少、测试边界更清楚。成本则必须审计模板代码尺寸、virtual dispatch、refcount、heap、锁和析构路径。

## ⑤ 设计模式映射（8 分钟）

**真实变化轴**：硬件实现替换、资源创建策略、短生命周期对象并发量、内存来源。

**稳定边界**：required dependency、single owner、bounded slot、allocator/resource policy。

- Dependency Injection：required dependency 显式传入，通常是 `T&`，不等于 shared ownership。
- Strategy：只有运行期确实需要替换资源策略时使用；固定 firmware 优先 template/static composition。
- Object Pool：只有 bounded reuse 是真实需求时使用；长期固定 Driver 不应放进 Pool。
- Factory：只有创建具体类型是变化轴时才有价值，不能替代 ownership 设计。
- Observer：事件变化轴存在时可用，但必须写清 unsubscribe、callback thread、in-flight work 与 owner teardown。

**明确不使用 Pattern 的情况**：一个 BSP UART 从启动活到关机，硬件实现固定。直接 value composition + reference borrow 比 Factory + shared_ptr + Service Locator 更稳定。

## ⑥ Embedded / System Design 场景（7 分钟）

以 Modem middleware 为例：UART Driver 是长期 value/RAII owner；AT parser 通过 `Driver&` required borrow；最多 8 个 transaction 使用固定 Pool；启动阶段可使用 bounded PMR arena 建立表项，但实时收发路径禁止隐式 heap fallback；callback 只保存有界 borrow/可验证 token。

teardown 顺序必须明确：停止 IRQ/event producer → 禁止新 transaction → unsubscribe callback → drain queue/in-flight callback → join worker → 销毁 transaction → 释放 Driver。ISR 中避免 allocation、`shared_ptr` refcount、阻塞锁和复杂 destructor。

## ⑦ 今日编码规范（6 分钟）

### MUST：先写 lifetime/owner，再选 pointer

错误：看到跨模块访问就默认 `shared_ptr<T>`。

推荐：先标出 owner；同步 required dependency 使用 `T&`；只有独立参与者确实需要共同延长 lifetime 才使用 `shared_ptr`。

### MUST：实时路径必须有 allocation 与 teardown 上界

错误：容器可能增长但假设“通常不会超过容量”。

推荐：静态容量、启动阶段 reserve、fixed pool 或 bounded arena，并测试 exhaustion；禁止静默 heap fallback。

### SHOULD：Pattern 必须能对应真实变化轴

错误：固定 UART Driver 仍加入 Factory + Service Locator + shared ownership。

推荐：固定实现用 composition；只有 runtime replacement 是真实需求时才增加抽象层。

## ⑧ 可编译 Lab / 练习（5 分钟）

### 主 Lab：固定 Packet Pool 与显式 borrow

文件：[`examples/day-066/main.cpp`](../examples/day-066/main.cpp)

```bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic examples/day-066/main.cpp -o day066
./day066
```

观察 pool owns slots、业务只在 slot engaged 时 borrow；然后思考如何加入 generation/lease 防止长期 stale handle。

### Exercise 01：资源边界 Code Review

文件：[`examples/day-066/exercise-01.cpp`](../examples/day-066/exercise-01.cpp)

```bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic examples/day-066/exercise-01.cpp -o day066-ex01
./day066-ex01
```

Starter 可直接运行。请逐项说明为什么固定 Driver 用 value + reference、Session 用 single owner、bounded work slots 用 `array<optional<T>,N>`；然后尝试把三者全部改成 `shared_ptr`，记录新增的 ownership ambiguity、allocation/refcount 和 teardown 问题，再恢复最小方案。

## ⑨ 3 个常见坑（1 分钟）

1. **把 smart pointer 当架构**：pointer 只表达 lifetime/ownership 的一部分，不替代稳定边界设计。
2. **只检查 RAM，不检查 WCET**：Pool 扫描、refcount、锁、析构、callback drain 都有时间成本。
3. **Pattern 驱动设计**：为了使用 Factory/Observer/Pool 制造不存在的变化轴，最终隐藏 owner 与 teardown。

## ⑩ 检查题（2 分钟）

1. 为什么 `unique_ptr<T>` 不能证明其 allocation 适合实时路径？
2. 一个 API 参数写成 `shared_ptr<Driver>` 与 `Driver&` 分别向调用者表达什么 contract？
3. **设计题**：设计 RTOS Modem：1 个 UART、2 个长期 parser/dispatcher、最多 8 个 AT transaction、异步 timeout callback。选择 value/composition、`unique_ptr`、`shared_ptr/weak_ptr`、optional/pool、PMR 或 static storage，并说明变化轴、稳定边界、owner/borrow/lifetime、callback teardown、RAM/WCET；明确哪些 Pattern 不使用以及原因。

---

## 今日结论

**Memory Management 的终点不是会使用更多智能指针，而是能把资源决策拆成 ownership、borrow、allocation source、capacity、failure、thread context 与 teardown 七个可审计边界。优先 value semantics/composition；Pattern 与 runtime abstraction 必须由真实变化轴支付其复杂度。**

下一课继续按《Professional C++》章节顺序进入 Chapter 8，开始 Classes and Objects 的工程化学习。
