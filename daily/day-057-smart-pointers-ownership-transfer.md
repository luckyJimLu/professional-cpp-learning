---
day: 57
week: 9
part: III
chapter: 7
chapter_title: Memory Management
title: Smart Pointers · Ownership Transfer and Borrowing
duration: 60
status: published
date: 2026-10-22
topics: [smart-pointers, unique-ptr, ownership-transfer, borrowing, move-semantics]
patterns: [raii, dependency-injection]
guidelines: [single-owner, explicit-borrow, bounded-allocation]
lab:
  path: examples/day-057/main.cpp
previous: 56
next: 58
---

# Day 57 · Smart Pointers：Ownership Transfer and Borrowing

> **主教材主线**：Chapter 7 · Memory Management。承接 Day 56 的 RAII 与 single ownership，今天进一步区分 owning handle、ownership transfer 与 non-owning borrow，并把 `std::unique_ptr`、move semantics、reference/pointer/span 放到同一套 lifetime 模型里。

## ① 今日章节与建议阅读范围（5 分钟）

### 新手起步：先知道今天在解决什么

先把 owner 画成唯一箭头。`std::move` 本身只是允许移动的类型转换，具体是否转移由被调用操作决定；unique_ptr 的移动会转移其管理对象。

**前置检查：** 先能解释 [Day 4](day-004-references-parameter-passing.md)、[Day 31](day-031-ownership-lifetime-resource-boundaries.md)、[Day 56](day-056-memory-management-ownership-raii.md) 的核心例子；不必先掌握整本教材。

**本课最低完成目标：** 能按下面的步骤说明示例如何得到结果，并独立完成一项小修改；高级模式与平台性能分析可第二遍再读。新增导读和拓展练习不计入原有约 60 分钟安排，可分两次完成。

继续 Chapter 7 中动态内存与现代资源管理部分。重点阅读 smart pointer 的动机、`unique_ptr` 的独占所有权、移动所有权、数组资源，以及裸 pointer/reference 作为非 owning access 时应满足的 lifetime 条件。

阅读时不要只记 API，持续问：**谁 owner？谁只 borrow？ownership 是否会 transfer？teardown 谁负责？**

## ② 昨日复习 3 问（5 分钟）

1. RAII 为什么能解决多条 return path 上的释放问题，却不能证明 heap allocation 适合实时路径？
2. 固定 256-byte RX buffer 为什么通常应先考虑 `std::array`，而不是 `unique_ptr<byte[]>`？
3. DMA callback 借用 session-owned buffer 时，正确 teardown 顺序为什么必须先停止生产者/回调，再销毁 buffer？

## ③ 核心概念与场景对照（24 分钟，含进阶选读）

### 先用白话建立概念

- **移动**：允许从源对象转移资源的机制。
- **唯一所有权**：同一时刻只有一个释放责任主体。

### 跟着本课实验走一遍

1. 建立 unique_ptr。
2. 借用其目标。
3. 移动到新 owner。
4. 检查原 unique_ptr 为空。
5. 由新 owner 负责释放。

先尝试口头预测，再到第⑥节运行。下面原有概念、图示与接口对照用于解释这些步骤，短代码片段不一定能单独编译；完整程序以本课 `main.cpp` 为准。

把 pointer 选择还原为 lifetime 决策：

```text
对象需要动态生命周期？
  ├─ 否 → value / std::array
  └─ 是
      ├─ 单一 owner → std::unique_ptr
      │    └─ ownership 要转移 → std::move
      └─ 访问者不拥有 → T& / const T& / T* / span
```

`unique_ptr` 的价值不是“自动 delete”这么简单，而是**类型系统禁止隐式复制 ownership**。移动构造/移动赋值显式表达 owner 迁移。

borrow 不应偷偷延长 lifetime。required dependency 通常用引用；optional dependency 才考虑可空 pointer。连续内存 view 优先 `std::span`，避免 `pointer + length` 分裂。

`shared_ptr` 只有在业务事实真的是 shared ownership 时才成立。线程多、callback 多、访问者多都不自动等于 shared ownership。

### 进阶选读：模式映射

今天仍然不需要为了 smart pointer 强行套 GoF Pattern。

- **变化轴**：资源 owner 可能从初始化模块移交到 session/driver。
- **稳定边界**：owner transfer 与 borrow 必须在函数签名中可见。
- **C++ 机制**：RAII、`unique_ptr`、move、reference/span。
- **Dependency Injection**：注入 `Transport&` 表示 required borrow；只有组件真正接管 transport 生命周期时才接受 `unique_ptr<Transport>`。
- **Factory**：若未来有多种 runtime transport 创建策略，Factory 可以返回 `unique_ptr<ITransport>`；当前只有单实现时不需要。
- **shared_ptr 滥用**：用引用计数逃避 teardown 设计会隐藏真正 owner，尤其容易让 modem callback、worker task、driver 相互延长生命周期。

思维链：需求变化 → owner 是否变化 → 稳定 lifetime contract → 选择 value/reference/unique_ptr → 判断是否需要 Factory/DI → teardown → 实时预算。

### 进阶选读：嵌入式与系统场景

以 Modem RX pipeline 为例：初始化阶段创建 frame pool；session 拥有 pool，parser 只借用 frame view。若 session 被替换，ownership transfer 必须发生在 worker/callback 已停止之后。

实时审计：

- heap allocation 是否仅发生在 init/config 阶段；
- move 本身是否只移动 handle，而不是复制大 buffer；
- borrow 是否跨异步边界；
- callback 是否可能在 owner teardown 后触发；
- shutdown 是否按 cancel → stop producer → join worker → destroy resource 执行。

ISR 不应创建 smart pointer 来“解决生命周期”；ISR 更适合访问初始化阶段已经建立、地址稳定、容量有界的资源。

## ④ C 写法 vs Modern C++（7 分钟）

传统 C 常通过约定表达 owner：

```c
struct Buffer* buffer_create(size_t size);
void buffer_destroy(struct Buffer* buffer);
```

调用者必须知道返回值是否拥有、何时 destroy，接口本身无法阻止复制地址或遗漏释放。

Modern C++ 单 owner：

```cpp
auto buffer = std::make_unique<Buffer>(size);
Consume(std::move(buffer));
```

required borrow：

```cpp
void Inspect(const Buffer& buffer);
```

相比 `void Inspect(Buffer*)`，引用直接消除了“不知道是否允许 null”的接口状态。

## ⑤ 今日编码规范（7 分钟）

### MUST：ownership transfer 必须在类型/调用点显式

错误：

```cpp
void SetBuffer(Buffer* buffer);  // 接管还是借用？
```

推荐：

```cpp
void SetBuffer(std::unique_ptr<Buffer> buffer);  // 明确接管
```

### SHOULD：required borrow 使用引用

错误：

```cpp
void Inspect(const Buffer* buffer);  // 如果不允许 null，制造了无效状态
```

推荐：

```cpp
void Inspect(const Buffer& buffer);
```

### MUST：不要因为异步/多线程就默认 `shared_ptr`

先画 teardown/lifetime，再判断是否真的存在多个独立 owner；否则保持单 owner + borrow + cancel/join contract。

## ⑥ 可编译 Lab / 练习（8 分钟）

### 第一次做：先运行，再只改一件事

1. 在仓库根目录打开 [`examples/day-057/main.cpp`](../examples/day-057/main.cpp)，先读 `main()`，圈出输入、调用与结果检查。
2. 运行原版，把实际输出和退出状态记下来，再与本节预期对照。无输出也可能成功，必须结合退出码与断言判断。
3. 修改前先写预期；若失败，先读第一条编译错误或失败断言，再回到对应概念，不同时重写多个函数。

**本课小改动：** 在不解引用空指针的前提下检查移动后的源 owner；再写出借用者应受哪一个生命周期约束。

<details>
<summary>练习提示：卡住时再展开</summary>

把上面的执行步骤当作检查点；保留原版作为对照。若练习故意让编译或断言失败，请只在实验副本操作，解释失败后还原，不把负例混入日常通过用例。不要执行越界、悬空解引用或重复释放来“观察效果”。

</details>

### 主 Lab：移动唯一 ownership

文件：`examples/day-057/main.cpp`

```bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic examples/day-057/main.cpp -o day057
./day057
```

观察 `FrameBuffer` 如何禁止 copy、允许 move，并用 `span` 暴露 borrow view。注意 move 转移的是 owning handle/lifetime responsibility，不应被理解为复制整个动态 buffer。

### Exercise 01：把 optional-looking pointer borrow 重构为 required borrow

文件：`examples/day-057/exercise-01.cpp`

```bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic examples/day-057/exercise-01.cpp -o day057-ex01
./day057-ex01
```

Starter 可直接运行，但 `Inspect(const ModemPacket*)` 实际并不需要 optional dependency，却暴露了 null 状态并要求调用者 `.get()`。

任务：

1. 将 `Inspect` 重构为 `Inspect(const ModemPacket&)`；
2. 调用点改为 `Inspect(*packet)`；
3. 保持 `packet` 的 ownership 不变；
4. 解释为什么这里不应把参数改成 `unique_ptr` 或 `shared_ptr`；
5. 再思考：如果 `Inspect` 把 packet 保存到异步队列，当前 reference contract 为什么立即失效？应如何重新设计消息 ownership？

## ⑦ 3 个常见坑（2 分钟）

1. **见 pointer 就换 shared_ptr**：没有先确定 owner，反而让 teardown 更模糊。
2. **把 `.get()` 当万能适配器**：如果 API 不允许 null，应修正 API contract，而不是长期传 raw pointer。
3. **borrow 穿越异步边界**：函数返回后 owner 可能销毁；callback/queue 必须重新设计 lifetime，而不能靠注释保证。

## ⑧ 检查题（2 分钟）

### 分层自测：从解释到判断

1. **理解：** 不看代码，用三句话复述本课示例的输入、关键步骤和结果。
2. **应用：** 说明第⑥节小改动的预期，以及实际结果是否符合预期。
3. **辨析：** 移动后的所有类型都会变成空吗？

<details>
<summary>辨析题参考答案与通过依据</summary>

不一定；本课 unique_ptr 的移动有明确空源语义，不能推广成所有类型移动后都为空。

能运行只是第一步。只有能解释本课具体步骤、完成小改动，并说清一个不适用条件，才算完成本次自测；不清楚时回看第③节，不以阅读次数当作掌握证据。

</details>

### 原课检查题

### Q1
`unique_ptr<T>` 传值参数与 `T&` 参数分别表达什么 lifetime/ownership contract？什么时候调用者必须写 `std::move`？

### Q2
某 parser 只在 `Parse()` 调用期间读取 RX frame。为什么 `span<const byte>` 往往比 `shared_ptr<vector<byte>>` 更准确？

### Q3 · 设计题
Modem manager 创建 transport，session 使用 transport，worker task 执行收发，callback 上报事件。请决定 transport/session/worker/callback 各自是 owner 还是 borrower，给出 shutdown 顺序，并判断 runtime 可替换 transport 时应该采用 `unique_ptr<ITransport>` + Factory、引用注入，还是 compile-time template。说明 heap/WCET/thread teardown 的代价。

### 对照现有资料库

- [所有权与智能指针](<../patterns/ownership-and-smart-pointers.md>)。
- [实验环境与能力边界](<../docs/lab-environments.md>)。

先完成本课小实验，再查对照资料；专题中的线程、网络、板端或模式不是本课默认前置。以上为本项目已有讲解和工程对照，不冒充标准条文，也不表示所有示例已在目标板验证。

### 今日结论
> **smart pointer 的核心不是“更聪明的指针”，而是把 ownership contract 写进类型系统；borrow 仍必须受 owner lifetime 约束。**

下一课继续 Chapter 7，深入动态分配失败、数组/自定义资源以及安全资源管理边界。
