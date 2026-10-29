---
day: 64
week: 10
part: III
chapter: 7
chapter_title: Memory Management
title: Object Lifetime, Placement Construction and Fixed Storage Reuse
duration: 60
status: published
date: 2026-10-29
topics: [object-lifetime, placement-construction, construct-at, destroy-at, fixed-storage]
patterns: [object-pool, dependency-injection]
guidelines: [explicit-lifetime, bounded-storage, no-dangling-borrow]
lab:
  path: examples/day-064/main.cpp
previous: 63
next: 65
---

# Day 64 · Object Lifetime / Placement Construction：固定存储不等于对象一直存在

> **主教材主线**：Chapter 7 · Memory Management。承接 Day 63 的 bounded allocation，今天继续讨论动态内存管理中“storage 与 object lifetime 分离”的关键机制，并把它映射到 Embedded 固定容量对象复用。Object Pool 仅作为工程辅线，不改变教材顺序。

## ① 今日章节与建议阅读范围（5 分钟）

### 新手起步：先知道今天在解决什么

先区分有地址和有对象。对齐与空间大小只是前提，构造成功后对象才存在；归还和再次构造之间，旧借用不应继续使用。

**前置检查：** 先能解释 [Day 5](day-005-pointers-nullptr-bounds.md)、[Day 28](day-028-class-invariants-minimal-interface.md)、[Day 56](day-056-memory-management-ownership-raii.md)、[Day 57](day-057-smart-pointers-ownership-transfer.md)、[Day 63](day-063-pmr-bounded-allocation-resource-policy.md) 的核心例子；不必先掌握整本教材。

**本课最低完成目标：** 能按下面的步骤说明示例如何得到结果，并独立完成一项小修改；高级模式与平台性能分析可第二遍再读。新增导读和拓展练习不计入原有约 60 分钟安排，可分两次完成。

继续 Chapter 7 中内存分配、对象构造/销毁、placement construction 与资源复用相关内容。阅读时区分四件事：storage 是否存在、对象 lifetime 是否已开始、谁负责 destroy、borrow 是否跨越了 destroy/reconstruct 边界。

建议把 `std::construct_at` / `std::destroy_at` 视为现代 C++ 对显式对象生命周期操作的清晰入口；不要把 raw storage 当作已经构造好的 `T`。

## ② 昨日复习 3 问（5 分钟）

1. PMR container 是否拥有它引用的 `memory_resource`？resource 应满足什么 lifetime 关系？
2. 为什么 `reserve(32)` 仍不足以完整表达实时路径的容量 contract？
3. 固定 firmware 只有一种容量策略时，为什么 `std::array` / static-capacity 方案可能优于 runtime Strategy？

## ③ 核心概念与场景对照（25 分钟，含进阶选读）

### 先用白话建立概念

- **原始存储**：尚未必存在目标类型对象的字节区域。
- **构造就地对象**：在合法存储中开始对象生命周期。

### 跟着本课实验走一遍

1. 准备正确对齐的槽位。
2. construct_at 开始生命周期。
3. 通过有效 lease 使用。
4. destroy_at 结束生命周期。
5. 槽位才允许复用。

先尝试口头预测，再到第⑥节运行。下面原有概念、图示与接口对照用于解释这些步骤，短代码片段不一定能单独编译；完整程序以本课 `main.cpp` 为准。

内存管理必须区分 **storage duration** 与 **object lifetime**。一块对齐的字节存储可以长期存在，但其中的 `T` 只有在 construction 完成后才存在；`destroy_at()` 后，即使地址未改变，旧对象的 lifetime 已结束。

```text
raw aligned storage
      |
      | construct_at
      v
 live T object  ---- borrow/reference valid only under owner contract
      |
      | destroy_at
      v
raw aligned storage
      |
      | construct_at
      v
 new T object
```

这也是对象池最容易产生 bug 的地方：**地址复用不等于对象身份/lifetime 连续**。任何 callback、pointer、reference、span 或 handle 若跨过 release/reuse 边界，都必须重新验证。

编译期固定容量可以消除 heap growth；运行期 Object Pool 可以提供 bounded reuse，但会增加 slot 状态、并发、generation/ABA、归还协议等复杂度。先确认变化轴真的需要 pool。

### 进阶选读：模式映射

今天相关的是 **Object Pool（条件使用）+ Dependency Injection**。

- **需求变化**：请求对象频繁创建/销毁，但最大并发数已知，heap 不允许进入实时路径。
- **变化轴**：并发 slot 数、对象类型、获取失败策略、线程上下文。
- **稳定边界**：`Acquire()` / `Release()` 或更安全的 move-only lease，而不是向业务层暴露 raw storage。
- **C++ 机制**：fixed storage、`construct_at`/`destroy_at`、RAII lease、generation counter。
- **ownership**：pool owns storage；lease owns 当前占用权；业务函数通常只 borrow `T&`。

如果对象数量固定且生命周期等同系统生命周期，**不使用 Object Pool** 更正确：直接 value semantics / `std::array`，没有 acquire/release 协议，也没有 stale handle。

### 进阶选读：嵌入式与系统场景

Modem AT transaction manager 最大同时 4 个 transaction。初始化时预留 4 个 slot；task context 获取 slot 并构造 transaction；完成/timeout/cancel 后先停止 callback，再结束 transaction lifetime，最后归还 slot。

审计点：pool exhaustion 返回明确错误；ISR 不做复杂 construction/destruction；callback 不保存裸 `T*` 穿越 slot reuse；多 task 访问需要明确锁/无锁协议及 WCET；若地址会复用，外部 handle 可加入 generation 防止 ABA/stale handle；shutdown 必须先停止 producer，再等待 in-flight transaction，最后销毁 pool。

## ④ C 写法 vs Modern C++（7 分钟）

C/旧式代码常见 `uint8_t storage[N]` + 强制转换 + 手工 init/deinit；容易漏掉 alignment、构造/析构与重复释放状态。

Modern C++ 可以使用 `alignas(T)` 的 storage，并用 `std::construct_at` / `std::destroy_at` 显式建立和结束 lifetime；更高层再用 RAII wrapper 封装 engaged 状态，让 teardown 自动发生。

但如果类型简单、数量固定且一直存活，直接 `std::array<T, N>` 更简单。不要因为学了 placement construction 就把所有对象改成 pool。

## ⑤ 今日编码规范（6 分钟）

### MUST：storage lifetime 与 object lifetime 必须显式区分

错误：把 `std::byte[]` reinterpret_cast 后直接当已构造对象使用。

推荐：对齐 storage，并通过 `construct_at` / `destroy_at` 或封装后的 RAII slot 管理 lifetime。

### MUST：borrow 不得跨越 destroy/reuse 边界

错误：缓存 pool slot 的裸指针，slot release 后继续在 callback 中使用。

推荐：callback 在 release 前 unsubscribe/cancel；跨异步边界使用可验证的 handle/generation 或更高层 lifetime protocol。

### SHOULD：固定生命周期优先 value semantics，而不是 Object Pool

Pool 只有在 bounded reuse 是真实需求时才引入；不要为“减少 new”而制造复杂 acquire/release 状态机。

## ⑥ 可编译 Lab / 练习（7 分钟）

### 第一次做：先运行，再只改一件事

1. 在仓库根目录打开 [`examples/day-064/main.cpp`](../examples/day-064/main.cpp)，先读 `main()`，圈出输入、调用与结果检查。
2. 运行原版，把实际输出和退出状态记下来，再与本节预期对照。无输出也可能成功，必须结合退出码与断言判断。
3. 修改前先写预期；若失败，先读第一条编译错误或失败断言，再回到对应概念，不同时重写多个函数。

**本课小改动：** 在纸上画两次申请的时间线，标出旧借用失效点；若使用 generation，解释它验证的是哪个版本的占用。

<details>
<summary>练习提示：卡住时再展开</summary>

把上面的执行步骤当作检查点；保留原版作为对照。若练习故意让编译或断言失败，请只在实验副本操作，解释失败后还原，不把负例混入日常通过用例。不要执行越界、悬空解引用或重复释放来“观察效果”。

</details>

### 主 Lab：SingleSlot + construct/destroy

文件：`examples/day-064/main.cpp`

```bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic examples/day-064/main.cpp -o day064
./day064
```

观察同一块 storage 先构造 transaction 64，显式销毁后再构造 transaction 65；`SingleSlot` 自身负责最后 teardown。

### Exercise 01：审计跨 reuse 的 stale borrow

文件：`examples/day-064/exercise-01.cpp`

```bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic examples/day-064/exercise-01.cpp -o day064-ex01
./day064-ex01
```

Starter 可正常运行，并刻意保留 `borrowed` 指针。它没有在旧对象销毁后解引用，因此当前程序没有 UB；你的任务是重构 API，使旧 borrow **无法被误认为仍然有效**。

要求：
1. 封装 storage，不允许业务层直接调用 `construct_at`/`destroy_at`；
2. 用 move-only lease 或等价 ownership token 表达占用权；
3. release 后旧 handle 必须可检测为 stale，必要时加入 generation；
4. 增加 acquire → release → reuse → stale-handle 测试；
5. 说明单线程固定对象若直接 `std::array<Command, N>` 就足够时，为什么不应引入 Pool。

## ⑦ 3 个常见坑（3 分钟）

1. **地址相同就认为对象没变**：destroy/reconstruct 已改变 object lifetime；旧 borrow 不能凭地址相同继续成立。
2. **Pool 自动等于实时安全**：仍需证明 Acquire/Release、锁、扫描 slot、析构和 failure path 的 WCET 上界。
3. **Pattern 过度设计**：固定数量、系统全生命周期对象用 Pool 反而增加状态和 stale-handle 风险。

## ⑧ 检查题（2 分钟）

### 分层自测：从解释到判断

1. **理解：** 不看代码，用三句话复述本课示例的输入、关键步骤和结果。
2. **应用：** 说明第⑥节小改动的预期，以及实际结果是否符合预期。
3. **辨析：** 同一地址再次装入同类型对象，就能无条件继续使用旧借用吗？

<details>
<summary>辨析题参考答案与通过依据</summary>

不能无条件这样做；语言中的替换规则、资源池身份和接口契约都有限制，新手应重新取得有效借用而不是靠地址相等判断。

能运行只是第一步。只有能解释本课具体步骤、完成小改动，并说清一个不适用条件，才算完成本次自测；不清楚时回看第③节，不以阅读次数当作掌握证据。

</details>

### 原课检查题

### Q1
为什么 backing storage 仍存在，并不能证明其中的 `T` 仍处于 lifetime 内？

### Q2
对象池复用相同地址时，异步 callback 保存 raw pointer 会出现什么风险？generation handle 能解决哪一部分？

### Q3 · 设计题
RTOS modem 同时最多 4 条 AT transaction，timeout 后 slot 可复用。请选择 `std::array<T,4>`、optional-like slot、Object Pool 或动态 allocation；解释变化轴、稳定边界、owner/borrow、timeout/callback teardown、pool exhaustion、ABA/stale handle、锁/WCET 与 IRQ/task context。若选择保持简单，明确说明为什么。

### 对照现有资料库

- [所有权与智能指针](<../patterns/ownership-and-smart-pointers.md>)。
- [实验环境与能力边界](<../docs/lab-environments.md>)。

先完成本课小实验，再查对照资料；专题中的线程、网络、板端或模式不是本课默认前置。以上为本项目已有讲解和工程对照，不冒充标准条文，也不表示所有示例已在目标板验证。

### 今日结论
> **固定 storage 只解决“内存在哪里”，不自动解决“对象现在是否活着”。Embedded 对象复用必须把 construction、destruction、borrow invalidation 和 slot reuse 作为同一个 lifetime protocol 设计。**

下一课继续 Chapter 7，收束自定义内存管理/对象复用的安全边界，并进一步讨论避免手写 allocator/pool 时应优先使用的标准 RAII/value 方案。
