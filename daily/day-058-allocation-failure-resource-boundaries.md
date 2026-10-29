---
day: 58
week: 9
part: III
chapter: 7
chapter_title: Memory Management
title: Allocation Failure · Arrays and Resource Boundaries
duration: 60
status: published
date: 2026-10-23
topics: [allocation-failure, nothrow-new, arrays, resource-boundaries, error-model]
patterns: [raii, dependency-injection]
guidelines: [bounded-allocation, explicit-errors, required-borrow]
lab:
  path: examples/day-058/main.cpp
previous: 57
next: 59
---

# Day 58 · Allocation Failure：Arrays and Resource Boundaries

<!-- cpp-standards:start -->
## 本课涉及的 C++ 标准

以下按正文与配套 `.cpp` 示例中出现的特性标注首次标准化版本，不代表整份程序的最低编译版本。仓库主 Lab 统一使用 C++23。

| 特性 | 首次标准化 | 版本边界 |
| --- | --- | --- |
| 列表初始化 | **C++11** | 包括直接列表初始化；窄化检查及 initializer_list 优先规则须单独注意。 |
| `= default` / `= delete` | **C++11** | 显式默认化与删除函数。 |
| `nullptr` | **C++11** | 空指针字面量；不要与整数 0 的类型混为一谈。 |
| `enum class` | **C++11** | 有作用域枚举。 |
| `auto` 类型推导 | **C++11** | C++14 才支持普通函数返回类型推导；C++20 才支持 `auto` 形参的简写函数模板。 |
| `noexcept` | **C++11** | 从 C++17 起异常说明成为函数类型的一部分。 |
| `[[nodiscard]]` | **C++17** | 带说明字符串的形式从 C++20 起可用。 |
| `std::array` | **C++11** | 固定大小容器。 |
| 标准智能指针与 `std::make_shared` | **C++11** | `unique_ptr`、`shared_ptr`、`weak_ptr`、`enable_shared_from_this`；不要据此把所有相关辅助函数都标为 C++11。 |
| `std::byte` | **C++17** | 字节枚举类型，不是整数算术类型。 |
| `std::span` | **C++20** | 连续序列的非拥有视图；不自动延长底层对象生命周期。 |

版本差异、旧机制与工具链检查见 [C++ 标准来源速查](../docs/cpp-feature-standards.md)。
<!-- cpp-standards:end -->

> **主教材主线**：Chapter 7 · Memory Management。承接 Day 57 的 ownership transfer 与 borrowing，今天把重点推进到动态分配失败、动态数组以及资源边界：RAII 负责释放，但系统仍必须决定“能不能分配、何时分配、失败如何传播”。

## ① 今日章节与建议阅读范围（5 分钟）

### 新手起步：先知道今天在解决什么

先区分分配内存失败与对象构造失败，再选择错误模型。固定容量、普通 new 和 nothrow new 有不同约束，不能只换一个关键字就宣称实时安全。

**前置检查：** 先能解释 [Day 5](day-005-pointers-nullptr-bounds.md)、[Day 17](day-017-errors-assert-control-flow.md)、[Day 56](day-056-memory-management-ownership-raii.md)、[Day 57](day-057-smart-pointers-ownership-transfer.md) 的核心例子；不必先掌握整本教材。

**本课最低完成目标：** 能按下面的步骤说明示例如何得到结果，并独立完成一项小修改；高级模式与平台性能分析可第二遍再读。新增导读和拓展练习不计入原有约 60 分钟安排，可分两次完成。

继续 Chapter 7 的动态内存管理内容，重点关注 `new` / `delete`、数组形式、分配失败、智能指针管理动态数组，以及资源管理代码如何避免泄漏和不明确的错误路径。

阅读时用 Embedded 视角追问：分配发生在 init 还是 hot path？容量是否有上界？失败能否恢复？是否应该改为固定容量或预分配？

## ② 昨日复习 3 问（5 分钟）

1. `unique_ptr<T>` 传值与 `const T&` 分别表达什么 ownership/lifetime contract？
2. 为什么 `.get()` 不能成为修补错误接口设计的长期方案？
3. borrow 如果进入异步 queue，为什么原本的同步 lifetime contract 不再成立？

## ③ 核心概念与场景对照（24 分钟，含进阶选读）

### 先用白话建立概念

- **分配失败**：无法取得所需存储。
- **nothrow new**：分配失败时返回空指针的形式。

### 跟着本课实验走一遍

1. 确定容量。
2. 申请存储。
3. 先检查失败结果。
4. 构造拥有者与借用视图。
5. 走正常和清理路径。

先尝试口头预测，再到第⑥节运行。下面原有概念、图示与接口对照用于解释这些步骤，短代码片段不一定能单独编译；完整程序以本课 `main.cpp` 为准。

动态分配要拆成三个问题：

```text
需要运行期决定容量？
  ├─ 否 → value / std::array / fixed pool
  └─ 是 → 是否允许 heap？
          ├─ 否 → arena / pool / caller-provided storage
          └─ 是 → owner + allocation failure + teardown contract
```

普通 `new` 分配失败通常通过 `std::bad_alloc` 表达；在禁异常或受限 Embedded 环境中，工程上常需要显式失败路径，例如 `new (std::nothrow)` 返回 null。关键不是背 API，而是让错误模型与项目策略一致。

动态数组的 owner 应同时掌握地址与长度。`unique_ptr<T[]>` 可以表达数组 ownership，但 borrow 侧仍更适合 `std::span<T>`，因为它把 pointer + length 合并为一个 view。

RAII 只保证已经获得的资源最终释放，不保证 allocation 有界，也不保证 allocation latency 满足 WCET。

### 进阶选读：模式映射

今天仍以 **RAII + explicit dependency/resource boundary** 为主，不强行引入 GoF Pattern。

- **变化轴**：存储策略可能从 heap 改成 static buffer、pool、DMA region。
- **稳定边界**：消费者只依赖 buffer view 与明确 error contract，不依赖分配机制。
- **Adapter**：如果 BSP/DMA allocator 返回平台句柄，可用小型 RAII Adapter 封装 acquire/release。
- **Factory**：只有 runtime 确实需要选择 heap/pool/特殊内存区时才考虑；固定产品配置更适合 compile-time policy 或直接 composition。
- **Dependency Injection**：caller-provided storage 可让算法借用存储，消除内部 heap allocation。

ownership 必须落在具体 owner；borrow 不延长 lifetime；异步 callback 必须在 storage teardown 前 cancel/unregister。

### 进阶选读：嵌入式与系统场景

以 Modem RX 为例：AT parser 最大 frame 长度已知时，实时接收路径优先固定 pool；只有配置阶段才能确定的大型诊断 buffer，可以在 init 阶段一次分配并检查失败。

必须审计：heap fragmentation、allocation latency、DMA alignment/cache coherency、ISR 是否触碰 allocator、worker teardown、callback 是否持有悬空 view，以及 OOM 后系统是降级、重启模块还是拒绝启动。

不要在 IRQ/高优先级实时路径里用 `new` + smart pointer 作为“安全方案”。安全 ownership 与确定性 allocation 是两个不同问题。

## ④ C 写法 vs Modern C++（7 分钟）

传统 C：

```c
unsigned char* p = malloc(size);
if (p == NULL) {
    return ERR_NO_MEMORY;
}
/* ... */
free(p);
```

问题不在 `malloc` 本身，而在 owner、长度和释放职责依赖约定传播。

Modern C++ 在允许 heap、禁异常的边界可把 owner 收拢：

```cpp
auto p = std::unique_ptr<std::byte[]>{new (std::nothrow) std::byte[size]};
if (!p) {
  return Error::kNoMemory;
}
```

访问方则接收 `std::span<std::byte>`，避免获得 ownership。

## ⑤ 今日编码规范（7 分钟）

### MUST：动态分配必须有明确失败策略

错误：

```cpp
auto p = new Buffer(size);  // 禁异常系统却没有失败 contract
```

推荐：使用项目统一 error model；若采用 nothrow，则立即检查并向稳定边界传播明确错误。

### SHOULD：动态数组 owner 与 borrow 分离

错误：`unsigned char* + size_t` 在多个 API 间散落。

推荐：owner 使用 RAII handle；borrow 使用 `std::span`。

### MUST：实时路径优先证明“不分配”

能在 init 预分配、使用 fixed pool 或 caller-provided storage 时，不要把 heap latency/fragmentation 引入 hot path。

## ⑥ 可编译 Lab / 练习（8 分钟）

### 第一次做：先运行，再只改一件事

1. 在仓库根目录打开 [`examples/day-058/main.cpp`](../examples/day-058/main.cpp)，先读 `main()`，圈出输入、调用与结果检查。
2. 运行原版，把实际输出和退出状态记下来，再与本节预期对照。无输出也可能成功，必须结合退出码与断言判断。
3. 修改前先写预期；若失败，先读第一条编译错误或失败断言，再回到对应概念，不同时重写多个函数。

**本课小改动：** 列出长度为 0、正常长度和过大请求三类预期；使用可控失败入口测试，不依赖把机器内存真的耗尽。

<details>
<summary>练习提示：卡住时再展开</summary>

把上面的执行步骤当作检查点；保留原版作为对照。若练习故意让编译或断言失败，请只在实验副本操作，解释失败后还原，不把负例混入日常通过用例。不要执行越界、悬空解引用或重复释放来“观察效果”。

</details>

### 主 Lab：显式 allocation failure + RAII array owner

文件：`examples/day-058/main.cpp`

```bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic examples/day-058/main.cpp -o day058
./day058
```

观察 `FrameStorage` 如何用 `nothrow` 建立显式失败路径、用 `unique_ptr<byte[]>` 负责 teardown，并通过 `span` 暴露 borrow view。

### Exercise 01：修复 required borrow 与 bool error blindness

文件：`examples/day-058/exercise-01.cpp`

```bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic examples/day-058/exercise-01.cpp -o day058-ex01
./day058-ex01
```

Starter 可直接编译运行，但 `Process(RxBuffer*)` 同时制造 optional-looking dependency 与 `bool` error blindness。

任务：

1. required dependency 改为 `RxBuffer&`；
2. 用 `enum class ProcessResult { kOk, kNoMemory, kInvalidState };` 替代 `bool`；
3. 保持 `RxBuffer` 为唯一 owner，不引入 `shared_ptr`；
4. 解释如果 buffer 位于 DMA pool，哪些 acquire/release 细节应该被 RAII Adapter 隐藏，哪些 alignment/cache/timeout contract 仍必须暴露；
5. 判断实时 RX hot path 是否应该保留本例的 heap allocation，并给出 fixed pool/caller-provided storage 的替代方案。

## ⑦ 3 个常见坑（2 分钟）

1. **RAII = 可以随便 heap allocate**：释放正确不代表时延和碎片可接受。
2. **用 bool 吞掉 OOM 原因**：上层无法决定 retry、degrade、restart 还是 fail-fast。
3. **Pattern 包装 allocator 后隐藏所有成本**：抽象不能隐藏影响正确性的容量、alignment、timeout、线程上下文和 WCET。

## ⑧ 检查题（2 分钟）

### 分层自测：从解释到判断

1. **理解：** 不看代码，用三句话复述本课示例的输入、关键步骤和结果。
2. **应用：** 说明第⑥节小改动的预期，以及实际结果是否符合预期。
3. **辨析：** 用了 nothrow new 就保证构造过程不抛异常吗？

<details>
<summary>辨析题参考答案与通过依据</summary>

不能；它改变分配失败的处理，构造函数自身仍可能抛异常，必须符合项目错误策略。

能运行只是第一步。只有能解释本课具体步骤、完成小改动，并说清一个不适用条件，才算完成本次自测；不清楚时回看第③节，不以阅读次数当作掌握证据。

</details>

### 原课检查题

### Q1
`new`、`new (std::nothrow)` 的失败表达方式有什么差异？在禁异常 Embedded 项目中为什么必须统一错误模型？

### Q2
为什么 `unique_ptr<byte[]>` 适合表达 owner，而 parser 参数往往更适合 `span<const byte>`？

### Q3 · 设计题
设计一个 modem frame storage：init 时决定 4 KB 总预算，RX task 不允许动态分配，parser 只同步读取，diagnostic task 可能异步保留一帧。请选择 fixed pool / heap / caller storage，定义 owner、borrow、异步 transfer、OOM/满池错误、shutdown 顺序，并说明是否需要 Factory/Adapter/DI；如果不需要 Pattern，也要说明原因。

### 对照现有资料库

- [所有权与智能指针](<../patterns/ownership-and-smart-pointers.md>)。
- [实验环境与能力边界](<../docs/lab-environments.md>)。

先完成本课小实验，再查对照资料；专题中的线程、网络、板端或模式不是本课默认前置。以上为本项目已有讲解和工程对照，不冒充标准条文，也不表示所有示例已在目标板验证。

### 今日结论
> **RAII 解决“资源最终释放”，资源边界还必须回答“何时获取、容量多大、失败怎么办、实时成本是否有界”。**

下一课继续 Chapter 7，深入自定义资源释放、deleter 与非内存资源的 RAII 边界。
