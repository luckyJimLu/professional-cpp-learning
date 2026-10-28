---
day: 63
week: 9
part: III
chapter: 7
chapter_title: Memory Management
title: PMR, Bounded Allocation and Memory-Resource Policy
duration: 60
status: published
date: 2026-10-28
topics: [pmr, memory-resource, bounded-allocation, monotonic-buffer-resource]
patterns: [dependency-injection, strategy]
guidelines: [bounded-allocation, explicit-resource-policy, no-unbounded-hot-path-allocation]
lab:
  path: examples/day-063/main.cpp
previous: 62
next: 64
---

# Day 63 · PMR / Bounded Allocation：把“从哪里分配”变成显式资源策略

> **主教材主线**：Chapter 7 · Memory Management。承接 Day 62 的 ownership API 审计，今天把关注点从“谁拥有对象”推进到“内存从哪里来、何时分配、失败是否可控”。工程扩展使用 C++23 `std::pmr` 展示 allocator/resource boundary；它服务于 Chapter 7 的内存管理主线，不改变教材章节顺序。

## ① 今日章节与建议阅读范围（5 分钟）

继续 Chapter 7 中动态内存、分配控制、资源管理相关内容。阅读时重点问：

- allocation 是否发生在初始化阶段还是实时热路径；
- 容量是否有明确上界；
- allocation failure 如何传播；
- container 与具体 allocator 是否被不必要地绑定。

工程扩展阅读 `std::pmr::memory_resource`、`std::pmr::vector`、`std::pmr::monotonic_buffer_resource`。不要把 PMR 当成“更快的 allocator”；它首先是**资源策略边界**。

## ② 昨日复习 3 问（5 分钟）

1. aliasing `shared_ptr` 的 stored pointer 与真正被 control block 延长生命周期的 owner 有何区别？
2. 为什么函数只同步使用 `Driver` 时，`Driver&` 通常比 `shared_ptr<Driver>` 更准确？
3. 业务层频繁 `dynamic_pointer_cast<ConcreteDriver>` 通常暴露了什么架构问题？

## ③ 核心概念（10 分钟）

传统 allocator 设计容易把“容器语义”和“内存来源”粘在一起。PMR 提供 runtime resource policy：

```text
pmr::vector<T>
      |
      v
pmr::memory_resource   <-- stable allocation boundary
      |
      +-- monotonic arena
      +-- pool resource
      +-- custom RTOS/region resource
```

`std::pmr::monotonic_buffer_resource` 很适合 phase-based lifetime：一批对象在一个阶段内创建，阶段结束统一回收。配合调用方提供的固定 buffer 和 `std::pmr::null_memory_resource()`，可以禁止 arena 耗尽后偷偷 fallback 到 global heap。

但“固定 backing buffer”不等于每次操作都确定性：容器增长仍可能请求资源；因此实时路径应在初始化阶段 `reserve()` 或使用真正固定容量结构，并把 capacity invariant 写进 contract/test。

编译期 vs 运行期：模板 allocator policy 能做 compile-time 绑定；PMR 用 type-erased `memory_resource` 换取 runtime resource replacement。若 firmware 资源策略完全固定，static policy/固定容量容器可能更简单。

## ④ C 写法 vs Modern C++（7 分钟）

C 中常见做法：模块接收 arena 指针、offset 和容量，并手工 bump allocation。优点是成本透明；缺点是 ownership、alignment、container integration 与错误传播都需要自行维护。

Modern C++ 可以让标准 PMR container 依赖显式 `memory_resource`，把 container algorithm 与 resource policy 分开。测试环境可以使用普通 resource，Embedded 初始化阶段可以注入固定 arena。

但不要为了“Modern”而替换成熟的 fixed-block allocator。若系统已有经过 WCET/碎片验证的 RTOS pool，最合理的边界可能是给它做薄 `memory_resource` Adapter。

## ⑤ 设计模式映射（8 分钟）

今天真正相关的是 **Dependency Injection + Strategy（轻量资源策略）**。

- **需求变化**：host test、Linux service、RTOS 固定内存区使用不同资源来源。
- **变化轴**：allocation source / lifetime phase / capacity policy。
- **稳定边界**：业务对象只依赖 `memory_resource` 或更窄的 allocator contract。
- **C++ 机制**：PMR runtime polymorphism；固定 firmware 可比较 template/static policy。
- **ownership**：resource 通常由系统/arena owner 持有，PMR container 只是 borrow；resource 必须比所有使用它的 container 活得更久。

不要再套 Factory/Service Locator。resource 是 required dependency 时显式注入最清楚；全局默认 resource 会隐藏 allocation policy。

## ⑥ Embedded / System Design 场景（7 分钟）

以 Modem telemetry batch 为例：启动时为一次上报周期准备 512 B arena，预留 32 个 sample；采集热路径只写入已预留容量。上传结束后整个 arena reset，而不是逐对象 free。

需要审计：

- 512 B 是否包含 container 元数据/alignment 后仍足够；
- `reserve(32)` 是否在进入实时路径前完成；
- 第 33 个 sample 怎么处理：drop、backpressure 还是错误状态；
- arena reset 时是否还有 callback/span/reference 指向旧对象；
- ISR 不直接执行 PMR allocation；IRQ 只投递到有界 queue/task context；
- 若 resource 不是 thread-safe，哪些 task 可以访问它。

## ⑦ 今日编码规范（6 分钟）

### MUST：实时路径的 allocation 必须有上界或被移出热路径

错误：callback/ISR/task loop 中让 `vector` 无限制增长。

推荐：初始化阶段 reserve，或使用 fixed-capacity container/pool，并测试容量边界。

### MUST：resource lifetime 必须长于所有借用它的 PMR object

错误：返回使用局部 `monotonic_buffer_resource` 的 `pmr::vector`。

推荐：resource 由更高层 owner 持有，通过引用注入，teardown 顺序显式。

### SHOULD：禁止不可见的 heap fallback

对需要严格 bounded allocation 的 arena，使用 `null_memory_resource()` 作为 upstream，并在非实时初始化边界处理 exhaustion。

## ⑧ 可编译 Lab / 练习（7 分钟）

### 主 Lab：固定 arena + PMR vector

文件：`examples/day-063/main.cpp`

```bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic examples/day-063/main.cpp -o day063
./day063
```

观察：1 KiB caller-owned storage 支撑 64 个 sample；upstream 被设置为 `null_memory_resource()`，arena 不允许隐式转向 global heap。

### Exercise 01：审计 reserve invariant

文件：`examples/day-063/exercise-01.cpp`

```bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic examples/day-063/exercise-01.cpp -o day063-ex01
./day063-ex01
```

Starter 可正常运行。`Prepare(32)` 把 allocation 移到初始化阶段，但 `Push()` 仍没有编码 capacity contract。

重构要求：

1. 让第 33 次写入得到明确、无异常的错误结果；
2. 不允许热路径触发新的 allocation；
3. 明确 `TelemetryBatch` 不拥有 resource；
4. 增加边界测试：0、31、32、33 个 sample；
5. 比较 PMR runtime policy 与固定 `std::array`/static-capacity container 的复杂度，若只有一个固定容量，说明为什么“不使用 Strategy”可能更正确。

## ⑨ 3 个常见坑（3 分钟）

1. **把 PMR 当性能魔法**：它主要解耦 resource policy；是否更快必须测量。
2. **arena 有界但操作无界**：固定 backing storage 不自动证明每次 `push_back()` 的成本和成功性有界。
3. **resource dangling**：PMR container 不拥有 `memory_resource`，resource 先销毁会留下危险 lifetime 关系。

## ⑩ 检查题（2 分钟）

### Q1
为什么 `monotonic_buffer_resource(buffer, size, null_memory_resource())` 比默认 upstream 更适合严格禁止 heap fallback 的 Embedded arena？

### Q2
已经 `reserve(32)` 后，为什么仍需要把 capacity invariant 写入 API，而不能只依赖开发者“记住最多 32 个”？

### Q3 · 设计题
一个 RTOS Modem task 需要解析最大 2 KiB 的响应，并生成最多 40 个 token。请选择 fixed array、pool、自定义 `memory_resource` 或 PMR arena；解释变化轴、稳定资源边界、谁 owner backing storage、parser/token 谁 borrow、allocation failure、IRQ/task context、WCET、并发与 teardown。若不需要 Strategy/Factory，也要明确说明原因。

## 今日结论

> **Ownership 回答“谁负责释放”，allocator/resource policy 回答“资源从哪里来、什么时候可能失败”。Embedded C++ 要把两者都做成可见边界，才能真正讨论内存上界和 WCET。**

下一课继续 Chapter 7，进入内存池/对象生命周期复用、placement construction 与固定容量资源的工程边界。
