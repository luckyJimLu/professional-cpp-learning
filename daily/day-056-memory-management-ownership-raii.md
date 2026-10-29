---
day: 56
week: 8
part: III
chapter: 7
chapter_title: Memory Management
title: Memory Management Foundations · Ownership and RAII
duration: 60
status: published
date: 2026-10-21
topics: [memory-management, ownership, raii, heap, lifetime]
patterns: [raii, dependency-injection]
guidelines: [single-owner, no-naked-owning-pointer, bounded-allocation]
lab:
  path: examples/day-056/main.cpp
previous: 55
next: 57
---

# Day 56 · Memory Management Foundations：Ownership and RAII

<!-- cpp-standards:start -->
## 本课涉及的 C++ 标准

以下按正文与配套 `.cpp` 示例中出现的特性标注首次标准化版本，不代表整份程序的最低编译版本。仓库主 Lab 统一使用 C++23。

| 特性 | 首次标准化 | 版本边界 |
| --- | --- | --- |
| 列表初始化 | **C++11** | 包括直接列表初始化；窄化检查及 initializer_list 优先规则须单独注意。 |
| `= default` / `= delete` | **C++11** | 显式默认化与删除函数。 |
| `constexpr` | **C++11** | C++14 放宽函数体限制；C++20 继续扩展可用于常量求值的操作。声明不保证每次调用都在编译期执行。 |
| `auto` 类型推导 | **C++11** | C++14 才支持普通函数返回类型推导；C++20 才支持 `auto` 形参的简写函数模板。 |
| `noexcept` | **C++11** | 从 C++17 起异常说明成为函数类型的一部分。 |
| `[[nodiscard]]` | **C++17** | 带说明字符串的形式从 C++20 起可用。 |
| `std::array` | **C++11** | 固定大小容器。 |
| 标准智能指针与 `std::make_shared` | **C++11** | `unique_ptr`、`shared_ptr`、`weak_ptr`、`enable_shared_from_this`；不要据此把所有相关辅助函数都标为 C++11。 |
| `std::make_unique` | **C++14** | 晚于 C++11 的 `std::unique_ptr`。 |
| `std::chrono` | **C++11** | 如 duration、time_point、steady_clock；不是所有 chrono 后增 API 都属于 C++11。 |
| `std::byte` | **C++17** | 字节枚举类型，不是整数算术类型。 |
| `std::span` | **C++20** | 连续序列的非拥有视图；不自动延长底层对象生命周期。 |

版本差异、旧机制与工具链检查见 [C++ 标准来源速查](../docs/cpp-feature-standards.md)。
<!-- cpp-standards:end -->

> **主教材主线**：Chapter 7 · Memory Management。今天从内存生命周期、动态分配与资源所有权开始，重点不是背 `new/delete`，而是建立“谁拥有、何时释放、失败路径是否仍安全”的工程模型。

## ① 今日章节与建议阅读范围（5 分钟）

### 新手起步：先知道今天在解决什么

先用局部值对象理解构造和析构，再讨论动态创建。栈或堆只是常见实现用语，核心问题是由谁负责结束资源生命周期。

**前置检查：** 先能解释 [Day 4](day-004-references-parameter-passing.md)、[Day 28](day-028-class-invariants-minimal-interface.md)、[Day 30](day-030-composition-object-responsibilities.md)、[Day 31](day-031-ownership-lifetime-resource-boundaries.md) 的核心例子；不必先掌握整本教材。

**本课最低完成目标：** 能按下面的步骤说明示例如何得到结果，并独立完成一项小修改；高级模式与平台性能分析可第二遍再读。新增导读和拓展练习不计入原有约 60 分钟安排，可分两次完成。

进入 Chapter 7 开头关于内存管理、动态内存与对象生命周期的内容。阅读时重点追踪：自动存储期与动态存储期的差异、分配与释放为何必须配对、资源泄漏/重复释放如何产生，以及现代 C++ 如何把释放责任绑定到对象生命周期。

## ② 昨日复习 3 问（5 分钟）

1. Chapter 6 中“稳定边界”为什么不能隐藏 allocation、timeout 等影响系统正确性的成本？
2. required dependency 使用引用表达 borrow 时，owner 与 borrower 的销毁顺序应满足什么条件？
3. `std::span + std::chrono` 如何减少接口非法状态？

## ③ 核心概念与场景对照（24 分钟，含进阶选读）

### 先用白话建立概念

- **存储期**：保存对象的存储存在多久。
- **生命周期**：对象何时开始与结束存在。

### 跟着本课实验走一遍

1. 定位资源创建。
2. 沿业务借用读取。
3. 找到提前返回。
4. 确认 owner 的析构仍执行。
5. 比较手动释放的风险。

先尝试口头预测，再到第⑥节运行。下面原有概念、图示与接口对照用于解释这些步骤，短代码片段不一定能单独编译；完整程序以本课 `main.cpp` 为准。

内存管理先问 lifetime，再问 pointer：

```text
资源需求
  → 生命周期是否局部且固定？
  → 能否直接用值/array？
  → 若必须动态创建，谁是唯一 owner？
  → borrow 如何表达且不延长 lifetime？
  → 析构是否自动完成释放？
  → allocation 是否允许出现在实时路径？
```

自动对象通常随作用域结束析构；动态对象的生命周期不由创建表达式所在作用域自动结束。裸 `new/delete` 把正确性分散在控制流中，early return、错误路径和后续维护都可能打破配对。RAII 的核心是把资源获取与对象构造绑定，把释放与析构绑定，使正常退出和多条返回路径共享同一 teardown 机制。

`std::unique_ptr<T>` 表达单一动态 owner；裸 pointer/reference/span 更适合表达 borrow/view。`std::shared_ptr` 不是“更安全的默认指针”，它引入共享生命周期、引用计数和更复杂 teardown，只有真实 shared ownership 才值得使用。

### 进阶选读：模式映射

今天最重要的不是 GoF Pattern，而是 **RAII + explicit ownership boundary**。

- **变化轴**：buffer 的实现/容量来源可能变化。
- **稳定边界**：一个 owner 管理资源，消费者只借用 view。
- **C++ 机制**：value semantics、destructor、`unique_ptr`、reference/span。
- **Dependency Injection**：若 driver 借用外部 allocator/transport，required dependency 显式注入，但 DI 不等于 ownership transfer。
- **不引入 Factory**：只有一种明确构造方式时，`make_unique`/直接构造已经足够。
- **不引入 shared_ptr**：单 owner 场景使用共享所有权只会模糊 teardown。

若 callback 捕获 borrow，必须保证 callback 不晚于 owner 存活；异步系统要有 unsubscribe/cancel/join 等 teardown contract。

### 进阶选读：嵌入式与系统场景

以 DMA RX buffer 为例：启动阶段可以按产品配置创建 buffer，但 ISR/高优先级实时路径不应临时做无界 heap allocation。推荐在初始化阶段完成资源建立，由 driver/session 唯一拥有；ISR 只访问已经建立且 lifetime 明确的 buffer/view。

审计项包括：最大容量、allocation 时机、OOM 策略、DMA alignment/cache coherency、任务与 ISR 并发、owner 销毁前是否已停止 DMA/callback，以及 host fake 是否保持相同 lifetime contract。

## ④ C 写法 vs Modern C++（7 分钟）

传统 C 风格：

```c
unsigned char* p = malloc(size);
if (p == NULL) return ERR_NO_MEMORY;
/* 多条返回路径都必须记住 free(p) */
free(p);
```

旧式 C++ 直接 owning raw pointer：

```cpp
auto* p = new std::byte[size];
// ...
delete[] p;
```

Modern C++：

```cpp
auto p = std::make_unique<std::byte[]>(size);
```

类型直接表达 ownership，析构自动释放。若容量在编译期固定，则进一步优先 `std::array`，连 heap 都不需要。

## ⑤ 今日编码规范（7 分钟）

### MUST：禁止裸 owning pointer

错误：

```cpp
class Buffer {
  std::byte* data_;
};
```

推荐：

```cpp
std::unique_ptr<std::byte[]> data_;
```

### SHOULD：固定容量优先值语义

容量编译期已知时优先 `std::array<std::byte, N>`，避免不必要 heap 和 allocation failure。

### MUST：实时路径明确 allocation 上界

初始化阶段允许的 allocation 不代表 ISR/控制环中也允许。必须在接口/设计文档中说明 allocation 发生时机和最大次数。

## ⑥ 可编译 Lab / 练习（8 分钟）

### 第一次做：先运行，再只改一件事

1. 在仓库根目录打开 [`examples/day-056/main.cpp`](../examples/day-056/main.cpp)，先读 `main()`，圈出输入、调用与结果检查。
2. 运行原版，把实际输出和退出状态记下来，再与本节预期对照。无输出也可能成功，必须结合退出码与断言判断。
3. 修改前先写预期；若失败，先读第一条编译错误或失败断言，再回到对应概念，不同时重写多个函数。

**本课小改动：** 画一张包含正常返回和提前返回的流程图，两条路径都应到达同一个 owner 清理规则。

<details>
<summary>练习提示：卡住时再展开</summary>

把上面的执行步骤当作检查点；保留原版作为对照。若练习故意让编译或断言失败，请只在实验副本操作，解释失败后还原，不把负例混入日常通过用例。不要执行越界、悬空解引用或重复释放来“观察效果”。

</details>

### 主 Lab：单 owner DMA buffer

文件：`examples/day-056/main.cpp`

```bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic examples/day-056/main.cpp -o day056
./day056
```

观察 `DmaBuffer` 如何用 `unique_ptr<byte[]>` 表达唯一 ownership，并通过 `span` 暴露 non-owning view；copy 被禁用，move 保留 ownership transfer 语义。

### Exercise 01：修复 Rule-of-Three / owning raw pointer 风险

文件：`examples/day-056/exercise-01.cpp`

```bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic examples/day-056/exercise-01.cpp -o day056-ex01
./day056-ex01
```

Starter 可以编译运行，但 `PacketBuffer` 拥有裸指针且仍可被隐式复制；一旦复制，就可能让两个对象释放同一地址。

任务：先运行观察输出；然后优先用 `std::unique_ptr<unsigned char[]>` 重构并删除 copy、保留 move；再判断若容量固定是否应直接改成 `std::array`。补充 move 后状态和边界容量测试。不要用 `shared_ptr` 掩盖单 owner 事实。

## ⑦ 3 个常见坑（2 分钟）

1. **把裸指针同时当 owner 和 borrow**：接口无法看出谁负责释放。
2. **看到 lifetime 问题就上 shared_ptr**：共享 ownership 可能让资源活得过久，并使 teardown 不确定。
3. **RAII 正确但实时位置错误**：`unique_ptr` 解决释放，不代表 heap allocation 满足 ISR/WCET 约束。

## ⑧ 检查题（2 分钟）

### 分层自测：从解释到判断

1. **理解：** 不看代码，用三句话复述本课示例的输入、关键步骤和结果。
2. **应用：** 说明第⑥节小改动的预期，以及实际结果是否符合预期。
3. **辨析：** RAII 能保证所有资源一定及时释放吗？

<details>
<summary>辨析题参考答案与通过依据</summary>

它约束正常生命周期退出的清理；泄漏所有权、循环引用、异常终止等仍需另外处理，也不保证清理时延。

能运行只是第一步。只有能解释本课具体步骤、完成小改动，并说清一个不适用条件，才算完成本次自测；不清楚时回看第③节，不以阅读次数当作掌握证据。

</details>

### 原课检查题

### Q1
为什么 `unique_ptr` 解决的是 ownership/lifetime 表达，而不是“所有动态内存问题”？

### Q2
一个固定 256-byte UART RX buffer，`std::array` 和 `unique_ptr<byte[]>` 哪个更合适？从 failure mode、RAM、WCET 和 lifetime 解释。

### Q3 · 设计题
RTOS modem session 在启动时创建 RX/TX buffers，worker task 和 DMA callback 都会访问它们。设计 owner/borrow/lifetime/teardown：谁拥有 buffer？callback 如何避免 dangling？停止 DMA、取消 callback、join task、销毁 buffer 的顺序是什么？是否需要 shared ownership？说明 allocation 上界与实时约束。

### 对照现有资料库

- [所有权与智能指针](<../patterns/ownership-and-smart-pointers.md>)。
- [实验环境与能力边界](<../docs/lab-environments.md>)。

先完成本课小实验，再查对照资料；专题中的线程、网络、板端或模式不是本课默认前置。以上为本项目已有讲解和工程对照，不冒充标准条文，也不表示所有示例已在目标板验证。

### 今日结论
> **先决定 lifetime 与 owner，再选择 pointer；RAII 让 teardown 成为类型行为，但 Embedded 系统仍必须单独审计 allocation 的时间、容量和 WCET。**

下一课继续 Chapter 7 的动态内存管理与安全资源管理主线。
