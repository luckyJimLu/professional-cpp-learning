---
day: 59
week: 9
part: III
chapter: 7
chapter_title: Memory Management
title: Custom Deleters · Non-Memory Resources and RAII Boundaries
duration: 60
status: published
date: 2026-10-24
topics: [custom-deleter, unique-ptr, raii, resource-handle, teardown]
patterns: [raii, adapter, dependency-injection]
guidelines: [single-owner, explicit-teardown, required-borrow]
lab:
  path: examples/day-059/main.cpp
previous: 58
next: 60
---

# Day 59 · Custom Deleters：Non-Memory Resources and RAII Boundaries

<!-- cpp-standards:start -->
## 本课涉及的 C++ 标准

以下按正文与配套 `.cpp` 示例中出现的特性标注首次标准化版本，不代表整份程序的最低编译版本。仓库主 Lab 统一使用 C++23。

| 特性 | 首次标准化 | 版本边界 |
| --- | --- | --- |
| 列表初始化 | **C++11** | 包括直接列表初始化；窄化检查及 initializer_list 优先规则须单独注意。 |
| `nullptr` | **C++11** | 空指针字面量；不要与整数 0 的类型混为一谈。 |
| `auto` 类型推导 | **C++11** | C++14 才支持普通函数返回类型推导；C++20 才支持 `auto` 形参的简写函数模板。 |
| `noexcept` | **C++11** | 从 C++17 起异常说明成为函数类型的一部分。 |
| `[[nodiscard]]` | **C++17** | 带说明字符串的形式从 C++20 起可用。 |
| 标准智能指针与 `std::make_shared` | **C++11** | `unique_ptr`、`shared_ptr`、`weak_ptr`、`enable_shared_from_this`；不要据此把所有相关辅助函数都标为 C++11。 |

版本差异、旧机制与工具链检查见 [C++ 标准来源速查](../docs/cpp-feature-standards.md)。
<!-- cpp-standards:end -->

> **主教材主线**：Chapter 7 · Memory Management。承接 Day 58 的 allocation/resource boundary，今天把 RAII 从 heap memory 推广到文件、driver handle、socket、DMA mapping 等“不是用 `delete` 释放”的资源。

## ① 今日章节与建议阅读范围（5 分钟）

### 新手起步：先知道今天在解决什么

先写一张获取和释放配对表。文件句柄不应使用 delete，设备关闭还可能需要特定线程、先取消回调等额外顺序。

**前置检查：** 先能解释 [Day 31](day-031-ownership-lifetime-resource-boundaries.md)、[Day 56](day-056-memory-management-ownership-raii.md)、[Day 57](day-057-smart-pointers-ownership-transfer.md)、[Day 58](day-058-allocation-failure-resource-boundaries.md) 的核心例子；不必先掌握整本教材。

**本课最低完成目标：** 能按下面的步骤说明示例如何得到结果，并独立完成一项小修改；高级模式与平台性能分析可第二遍再读。新增导读和拓展练习不计入原有约 60 分钟安排，可分两次完成。

继续 Chapter 7 中智能指针与资源管理相关内容，重点理解 `unique_ptr` 的 deleter 参数、资源 acquire/release 配对，以及为什么 RAII 的本质是 lifetime-bound cleanup，而不是“只管理 new 出来的对象”。

阅读时追问：资源是谁 acquire 的？唯一 owner 是谁？正确 release API 是什么？release 是否允许阻塞？teardown 必须在哪个线程发生？

## ② 昨日复习 3 问（5 分钟）

1. 为什么 RAII 正确释放资源仍不能证明 heap allocation 适合实时 hot path？
2. `unique_ptr<T[]>` 与 `span<T>` 分别表达 owner 和 borrow 的哪一部分 contract？
3. 当 RX task 禁止动态分配时，fixed pool / caller-provided storage 如何改变资源边界？

## ③ 核心概念与场景对照（24 分钟，含进阶选读）

### 先用白话建立概念

- **自定义删除器**：规定释放资源的可调用对象。
- **资源配对**：获取 API 与对应释放 API 的关系。

### 跟着本课实验走一遍

1. 找到资源取得入口。
2. 确认匹配的 close 函数。
3. 绑定唯一 owner 和删除器。
4. 检查提前返回时的清理。

先尝试口头预测，再到第⑥节运行。下面原有概念、图示与接口对照用于解释这些步骤，短代码片段不一定能单独编译；完整程序以本课 `main.cpp` 为准。

很多系统资源不是 `delete`：

```text
FILE*           -> fclose
socket fd       -> close
BSP handle      -> DriverClose
DMA mapping     -> UnmapDma
RTOS object     -> OsDestroy...
```

`std::unique_ptr<T, Deleter>` 可以把“唯一 ownership + 正确 release 操作”绑定到类型。这样 early return、错误路径和正常退出都共享同一 teardown 规则。

但 custom deleter 不应隐藏影响系统正确性的 contract：release 是否阻塞、是否要求特定线程、是否必须先 cancel callback、是否依赖 device 仍处于 powered state，这些仍需在稳定边界中明确。

编译期上，deleter 是 `unique_ptr` 类型的一部分；无状态 functor 通常可以被优化。运行期上，析构时调用 deleter，因此 teardown latency 仍属于系统时序预算。

### 进阶选读：模式映射

今天真正相关的是 **RAII + 小型 Adapter**，而不是为了模式而引入 Factory hierarchy。

- **变化轴**：平台资源句柄和 acquire/release API 不同。
- **稳定边界**：上层只依赖一个 move-only owner 或 required borrow，不直接散落 `DriverClose()`。
- **Adapter**：deleter/owner wrapper 把 C API 的 acquire/release 适配为 C++ lifetime。
- **Dependency Injection**：业务对象需要使用 driver 时，优先借用已建立的稳定接口，不在内部偷偷 open 全局设备。
- **Factory**：只有创建策略本身需要 runtime 选择时才值得引入；固定 BSP 通常不需要。

不使用 `shared_ptr` 的原因：资源有多个使用者不等于有多个 owner。若 shutdown 顺序可由系统架构明确，single owner + borrow 更清晰、更低成本。

### 进阶选读：嵌入式与系统场景

以 Modem UART driver handle 为例：system init acquire UART；ModemService 是 owner；parser/AT engine 只是 borrow；shutdown 时先停止 RX、取消 callback、等待 worker 离开，再销毁 handle。

```text
System owner
   |
   +-- owns UART RAII handle
          |
          +-- ModemService borrows
          +-- RX worker borrows
          +-- callback borrows temporarily

shutdown: stop source -> unregister callback -> join worker -> release handle
```

如果 deleter 在高优先级 task 中执行且内部可能等待硬件，应显式把 teardown 调度到允许阻塞的 context。RAII 决定“必定清理”，不自动决定“在哪个线程清理”。

## ④ C 写法 vs Modern C++（7 分钟）

传统 C 常见写法：

```c
FILE* f = fopen(path, "w");
if (f == NULL) return ERR_OPEN;
if (write_failed) {
    fclose(f);
    return ERR_WRITE;
}
fclose(f);
```

每增加一个 return 分支，都必须人工维护 cleanup。

Modern C++：

```cpp
struct FileCloser {
  void operator()(std::FILE* f) const noexcept {
    if (f != nullptr) std::fclose(f);
  }
};
using UniqueFile = std::unique_ptr<std::FILE, FileCloser>;
```

owner 的类型直接携带 teardown policy；消费者如果只使用文件，不应复制 ownership，而应 borrow。

## ⑤ 今日编码规范（7 分钟）

### MUST：acquire/release 必须由同一个 ownership abstraction 配对

错误：业务代码到处保存 raw handle，并在不同错误路径手工 `DriverClose()`。

推荐：move-only RAII owner + custom deleter。

### SHOULD：消费者只 borrow，不复制 owner

错误：为了让 callback “安全”而把所有 driver handle 包成 `shared_ptr`。

推荐：先定义 teardown 顺序；同步 required dependency 用引用，异步 callback 必须有 cancel/unregister contract。

### MUST：deleter 的线程与时延约束必须可审计

如果 release 可能阻塞、拿锁或访问硬件，不得把析构成本假设为零。

## ⑥ 可编译 Lab / 练习（8 分钟）

### 第一次做：先运行，再只改一件事

1. 在仓库根目录打开 [`examples/day-059/main.cpp`](../examples/day-059/main.cpp)，先读 `main()`，圈出输入、调用与结果检查。
2. 运行原版，把实际输出和退出状态记下来，再与本节预期对照。无输出也可能成功，必须结合退出码与断言判断。
3. 修改前先写预期；若失败，先读第一条编译错误或失败断言，再回到对应概念，不同时重写多个函数。

**本课小改动：** 给实验已有资源记录释放次数，正常结束和提前返回都应恰好释放一次；不得对失效句柄重复释放。

<details>
<summary>练习提示：卡住时再展开</summary>

把上面的执行步骤当作检查点；保留原版作为对照。若练习故意让编译或断言失败，请只在实验副本操作，解释失败后还原，不把负例混入日常通过用例。不要执行越界、悬空解引用或重复释放来“观察效果”。

</details>

### 主 Lab：`FILE*` custom deleter

文件：`examples/day-059/main.cpp`

```bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic examples/day-059/main.cpp -o day059
./day059
```

观察 `UniqueFile` 如何把 `fclose()` 绑定到 owner lifetime，并让 early return 不再需要手工 cleanup。

### Exercise 01：Driver handle 的 ownership boundary

文件：`examples/day-059/exercise-01.cpp`

```bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic examples/day-059/exercise-01.cpp -o day059-ex01
./day059-ex01
```

Starter 已可独立编译运行。Code Review 任务：

1. 保持 `UniqueDriver` 为唯一 owner；
2. 增加一个 `ModemService`，构造函数接收 required borrow，而不是接管 ownership；
3. 明确 callback 注册与注销顺序；
4. 如果 `DriverClose()` 可能阻塞，设计一个允许阻塞的 teardown context；
5. 判断是否真的需要 Factory；固定 BSP 配置下优先保持简单。

## ⑦ 3 个常见坑（2 分钟）

1. **把 custom deleter 当万能封装**：隐藏了 close 的 blocking/thread requirement。
2. **使用者多就改 shared ownership**：混淆 use relationship 与 ownership relationship。
3. **析构顺序靠“应该没问题”**：callback/worker 仍在运行时 owner 已释放，形成 dangling borrow。

## ⑧ 检查题（2 分钟）

### 分层自测：从解释到判断

1. **理解：** 不看代码，用三句话复述本课示例的输入、关键步骤和结果。
2. **应用：** 说明第⑥节小改动的预期，以及实际结果是否符合预期。
3. **辨析：** 删除器能解决所有 teardown 顺序问题吗？

<details>
<summary>辨析题参考答案与通过依据</summary>

不能；依赖仍存活、回调已停止、释放上下文合法等条件必须由更大的生命周期设计保证。

能运行只是第一步。只有能解释本课具体步骤、完成小改动，并说清一个不适用条件，才算完成本次自测；不清楚时回看第③节，不以阅读次数当作掌握证据。

</details>

### 原课检查题

### Q1
为什么 `unique_ptr<T, Deleter>` 可以管理不是 `new` 创建的资源？deleter 在类型和 runtime teardown 中分别承担什么角色？

### Q2
如果 `ModemService` 必须使用 UART，但不负责关闭 UART，构造参数应该优先表达 owner 还是 borrow？为什么？

### Q3 · 设计题
设计 Embedded Linux modem transport：UART fd 由 system layer 创建，RX thread 与 AT parser 使用，shutdown 时必须停止 epoll、退出线程、注销 callback、最后 close fd。给出 owner/borrow/lifetime/teardown 顺序，并判断使用 RAII Adapter、DI、Factory、shared_ptr 中哪些必要、哪些属于 overengineering。

### 对照现有资料库

- [所有权与智能指针](<../patterns/ownership-and-smart-pointers.md>)。
- [实验环境与能力边界](<../docs/lab-environments.md>)。

先完成本课小实验，再查对照资料；专题中的线程、网络、板端或模式不是本课默认前置。以上为本项目已有讲解和工程对照，不冒充标准条文，也不表示所有示例已在目标板验证。

### 今日结论
> **RAII 的稳定边界不是“智能指针”，而是把资源的唯一 owner 与正确 teardown 绑定到 lifetime；custom deleter 不能替你设计线程、callback 和 shutdown 顺序。**

下一课继续 Chapter 7，深入 shared ownership、`shared_ptr` / `weak_ptr` 的控制块、适用边界与 Embedded 成本。
