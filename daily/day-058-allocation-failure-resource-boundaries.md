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

> **主教材主线**：Chapter 7 · Memory Management。承接 Day 57 的 ownership transfer 与 borrowing，今天把重点推进到动态分配失败、动态数组以及资源边界：RAII 负责释放，但系统仍必须决定“能不能分配、何时分配、失败如何传播”。

## ① 今日章节与建议阅读范围（5 分钟）

继续 Chapter 7 的动态内存管理内容，重点关注 `new` / `delete`、数组形式、分配失败、智能指针管理动态数组，以及资源管理代码如何避免泄漏和不明确的错误路径。

阅读时用 Embedded 视角追问：分配发生在 init 还是 hot path？容量是否有上界？失败能否恢复？是否应该改为固定容量或预分配？

## ② 昨日复习 3 问（5 分钟）

1. `unique_ptr<T>` 传值与 `const T&` 分别表达什么 ownership/lifetime contract？
2. 为什么 `.get()` 不能成为修补错误接口设计的长期方案？
3. borrow 如果进入异步 queue，为什么原本的同步 lifetime contract 不再成立？

## ③ 核心概念（10 分钟）

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

## ⑤ 设计模式映射（8 分钟）

今天仍以 **RAII + explicit dependency/resource boundary** 为主，不强行引入 GoF Pattern。

- **变化轴**：存储策略可能从 heap 改成 static buffer、pool、DMA region。
- **稳定边界**：消费者只依赖 buffer view 与明确 error contract，不依赖分配机制。
- **Adapter**：如果 BSP/DMA allocator 返回平台句柄，可用小型 RAII Adapter 封装 acquire/release。
- **Factory**：只有 runtime 确实需要选择 heap/pool/特殊内存区时才考虑；固定产品配置更适合 compile-time policy 或直接 composition。
- **Dependency Injection**：caller-provided storage 可让算法借用存储，消除内部 heap allocation。

ownership 必须落在具体 owner；borrow 不延长 lifetime；异步 callback 必须在 storage teardown 前 cancel/unregister。

## ⑥ Embedded / System Design 场景（6 分钟）

以 Modem RX 为例：AT parser 最大 frame 长度已知时，实时接收路径优先固定 pool；只有配置阶段才能确定的大型诊断 buffer，可以在 init 阶段一次分配并检查失败。

必须审计：heap fragmentation、allocation latency、DMA alignment/cache coherency、ISR 是否触碰 allocator、worker teardown、callback 是否持有悬空 view，以及 OOM 后系统是降级、重启模块还是拒绝启动。

不要在 IRQ/高优先级实时路径里用 `new` + smart pointer 作为“安全方案”。安全 ownership 与确定性 allocation 是两个不同问题。

## ⑦ 今日编码规范（7 分钟）

### MUST：动态分配必须有明确失败策略

错误：

```cpp
auto p = new Buffer(size); // 禁异常系统却没有失败 contract
```

推荐：使用项目统一 error model；若采用 nothrow，则立即检查并向稳定边界传播明确错误。

### SHOULD：动态数组 owner 与 borrow 分离

错误：`unsigned char* + size_t` 在多个 API 间散落。

推荐：owner 使用 RAII handle；borrow 使用 `std::span`。

### MUST：实时路径优先证明“不分配”

能在 init 预分配、使用 fixed pool 或 caller-provided storage 时，不要把 heap latency/fragmentation 引入 hot path。

## ⑧ 可编译 Lab / 练习（8 分钟）

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

## ⑨ 3 个常见坑（2 分钟）

1. **RAII = 可以随便 heap allocate**：释放正确不代表时延和碎片可接受。
2. **用 bool 吞掉 OOM 原因**：上层无法决定 retry、degrade、restart 还是 fail-fast。
3. **Pattern 包装 allocator 后隐藏所有成本**：抽象不能隐藏影响正确性的容量、alignment、timeout、线程上下文和 WCET。

## ⑩ 检查题（2 分钟）

### Q1
`new`、`new (std::nothrow)` 的失败表达方式有什么差异？在禁异常 Embedded 项目中为什么必须统一错误模型？

### Q2
为什么 `unique_ptr<byte[]>` 适合表达 owner，而 parser 参数往往更适合 `span<const byte>`？

### Q3 · 设计题
设计一个 modem frame storage：init 时决定 4 KB 总预算，RX task 不允许动态分配，parser 只同步读取，diagnostic task 可能异步保留一帧。请选择 fixed pool / heap / caller storage，定义 owner、borrow、异步 transfer、OOM/满池错误、shutdown 顺序，并说明是否需要 Factory/Adapter/DI；如果不需要 Pattern，也要说明原因。

## 今日结论

> **RAII 解决“资源最终释放”，资源边界还必须回答“何时获取、容量多大、失败怎么办、实时成本是否有界”。**

下一课继续 Chapter 7，深入自定义资源释放、deleter 与非内存资源的 RAII 边界。
