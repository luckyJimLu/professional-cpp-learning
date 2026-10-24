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

> **主教材主线**：Chapter 7 · Memory Management。承接 Day 58 的 allocation/resource boundary，今天把 RAII 从 heap memory 推广到文件、driver handle、socket、DMA mapping 等“不是用 `delete` 释放”的资源。

## ① 今日章节与建议阅读范围（5 分钟）

继续 Chapter 7 中智能指针与资源管理相关内容，重点理解 `unique_ptr` 的 deleter 参数、资源 acquire/release 配对，以及为什么 RAII 的本质是 lifetime-bound cleanup，而不是“只管理 new 出来的对象”。

阅读时追问：资源是谁 acquire 的？唯一 owner 是谁？正确 release API 是什么？release 是否允许阻塞？teardown 必须在哪个线程发生？

## ② 昨日复习 3 问（5 分钟）

1. 为什么 RAII 正确释放资源仍不能证明 heap allocation 适合实时 hot path？
2. `unique_ptr<T[]>` 与 `span<T>` 分别表达 owner 和 borrow 的哪一部分 contract？
3. 当 RX task 禁止动态分配时，fixed pool / caller-provided storage 如何改变资源边界？

## ③ 核心概念（10 分钟）

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

## ⑤ 设计模式映射（8 分钟）

今天真正相关的是 **RAII + 小型 Adapter**，而不是为了模式而引入 Factory hierarchy。

- **变化轴**：平台资源句柄和 acquire/release API 不同。
- **稳定边界**：上层只依赖一个 move-only owner 或 required borrow，不直接散落 `DriverClose()`。
- **Adapter**：deleter/owner wrapper 把 C API 的 acquire/release 适配为 C++ lifetime。
- **Dependency Injection**：业务对象需要使用 driver 时，优先借用已建立的稳定接口，不在内部偷偷 open 全局设备。
- **Factory**：只有创建策略本身需要 runtime 选择时才值得引入；固定 BSP 通常不需要。

不使用 `shared_ptr` 的原因：资源有多个使用者不等于有多个 owner。若 shutdown 顺序可由系统架构明确，single owner + borrow 更清晰、更低成本。

## ⑥ Embedded / System Design 场景（6 分钟）

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

## ⑦ 今日编码规范（7 分钟）

### MUST：acquire/release 必须由同一个 ownership abstraction 配对

错误：业务代码到处保存 raw handle，并在不同错误路径手工 `DriverClose()`。

推荐：move-only RAII owner + custom deleter。

### SHOULD：消费者只 borrow，不复制 owner

错误：为了让 callback “安全”而把所有 driver handle 包成 `shared_ptr`。

推荐：先定义 teardown 顺序；同步 required dependency 用引用，异步 callback 必须有 cancel/unregister contract。

### MUST：deleter 的线程与时延约束必须可审计

如果 release 可能阻塞、拿锁或访问硬件，不得把析构成本假设为零。

## ⑧ 可编译 Lab / 练习（8 分钟）

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

## ⑨ 3 个常见坑（2 分钟）

1. **把 custom deleter 当万能封装**：隐藏了 close 的 blocking/thread requirement。
2. **使用者多就改 shared ownership**：混淆 use relationship 与 ownership relationship。
3. **析构顺序靠“应该没问题”**：callback/worker 仍在运行时 owner 已释放，形成 dangling borrow。

## ⑩ 检查题（2 分钟）

### Q1
为什么 `unique_ptr<T, Deleter>` 可以管理不是 `new` 创建的资源？deleter 在类型和 runtime teardown 中分别承担什么角色？

### Q2
如果 `ModemService` 必须使用 UART，但不负责关闭 UART，构造参数应该优先表达 owner 还是 borrow？为什么？

### Q3 · 设计题
设计 Embedded Linux modem transport：UART fd 由 system layer 创建，RX thread 与 AT parser 使用，shutdown 时必须停止 epoll、退出线程、注销 callback、最后 close fd。给出 owner/borrow/lifetime/teardown 顺序，并判断使用 RAII Adapter、DI、Factory、shared_ptr 中哪些必要、哪些属于 overengineering。

## 今日结论

> **RAII 的稳定边界不是“智能指针”，而是把资源的唯一 owner 与正确 teardown 绑定到 lifetime；custom deleter 不能替你设计线程、callback 和 shutdown 顺序。**

下一课继续 Chapter 7，深入 shared ownership、`shared_ptr` / `weak_ptr` 的控制块、适用边界与 Embedded 成本。
