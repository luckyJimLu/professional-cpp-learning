# Day 77 · 第 11 周复盘：Copy、Construction、Destruction 与 Lifetime Contract

> **日期**：2026-11-10  
> **复盘范围**：Day 71–76 · Chapter 8 · *Gaining Proficiency with Classes and Objects*  
> **主教材状态**：本日为工程化周复盘，不新增或跳过 Marc Gregoire 主教材小节。  
> **下一主教材主题**：Assignment Operators（原书 p.288 起），Day 78 按原书顺序继续。  
> **预计时间**：60 分钟

本周把六节课串成一条对象语义链：

`copy contract → initialization → canonical constructor → conversion boundary → generated special members → destruction / teardown`

核心原则：**先定义对象语义和不变量，再决定 special members；先明确 owner / borrow / lifetime，再安排成员顺序与 teardown。**

---

## ① 今日章节与建议阅读范围（5 分钟）

今天不推进新的主教材小节。复盘范围：

| Day | 原书主题 | 关键判断 |
|---:|---|---|
| [71](day-071-copy-constructors-value-semantics.md) | Copy Constructors | 复制后是独立值、共享资源，还是复制了借用地址？ |
| [72](day-072-initializer-list-constructors.md) | Initializer-List Constructors | `{}` 如何影响重载决议？backing array 谁拥有？ |
| [73](day-073-delegating-constructors.md) | Delegating Constructors | 多个入口如何建立同一组 invariant？ |
| [74](day-074-converting-constructors-explicit.md) | Converting / Explicit Constructors | 隐式转换与单位语义是否明确？ |
| [75](day-075-summary-compiler-generated-constructors.md) | Compiler-Generated Constructors | 默认生成操作是否符合真实资源语义？ |
| [76](day-076-object-destruction-raii-teardown.md) | Object Destruction | 谁先销毁？析构是否有界？失败关闭放在哪里？ |

建议重读六节的第 ⑤–⑨ 部分，并独立编译 `examples/day-071/` 至 `examples/day-076/` 的主 Lab 与练习。重点是变化轴、稳定边界、owner/borrow 和成本上界，而非重复抄写语法。

## ② 昨日复习 3 问（5 分钟）

承接 Day 76：

1. 完整对象销毁时，析构函数体、成员和基类的大致销毁顺序是什么？
2. `Stop(timeout)` 可能失败，而 destructor 不能返回 `Status`；两者分别承担什么责任？
3. `CallbackRegistration` 借用 `Transport` 时，两个成员谁应先声明？为什么 initializer-list 的书写顺序不能修正声明顺序？

检查点：析构函数体先执行，成员按声明顺序逆序销毁，再销毁基类；可失败关闭放在显式 API；owner/dependency 先声明，borrower/registration 后声明。

## ③ 核心概念：六节课的对象语义闭环（12 分钟）

### Copy 是语义决策

- **独立值**：固定容量 AT Frame，复制后各自拥有数据。
- **共享资源**：确有共享生命周期时才考虑 `shared_ptr`。
- **借用视图**：`std::span` / `initializer_list` 复制 view 不会延长 payload 生命周期。
- **唯一资源**：DMA lease 通常删除 copy；跨 task 交接应定义 move/transfer。

Memberwise copy 只按成员类型复制，不理解 raw pointer 背后的 ownership，也不会自动修复 self-pointer。

### 初始化与不变量

- `initializer_list` 是只读 view；长期保存必须复制到 owner 成员。
- `{}` 优先考虑 initializer-list constructors；`{count, fill}` 意图冲突时使用命名工厂或 tag type。
- Delegating constructor 把便利入口收敛到 canonical constructor，避免默认值漂移。
- `explicit` 控制隐式转换，不负责运行期范围校验；单位必须用 distinct strong types，而非同一整数的 alias。

### 编译器生成操作与销毁

`=default` 表示接受成员操作语义，`=delete` 表示该操作不属于类型契约。Type traits 只检查表达式能力，不证明深复制、资源唯一性、线程安全或 WCET。优先 Rule of Zero；析构是 lifetime contract 的最后一环：

```text
构造：Transport → CallbackRegistration
销毁：CallbackRegistration → Transport
```

真实 callback 还需区分 unregister/cancel 与 in-flight drain。最后一个 `shared_ptr` owner 在哪个线程释放，也必须纳入 HAL / RTOS teardown 设计。

## ④ C 写法 vs Modern C++（6 分钟）

| 问题 | C / 旧式做法 | Modern C++ |
|---|---|---|
| 值复制 | `memcpy` / 结构体赋值，指针字段仍是地址 | 值成员、明确 copy contract、必要时 `=delete` |
| 初始化入口 | 多个 `init_*()` 重复默认值 | delegating constructor + canonical invariant |
| 单位区分 | 多个 `uint32_t` 参数 | strong types + `explicit` |
| 资源释放 | 每条错误路径手工 close | RAII owner + 显式 `Stop(timeout)` |
| 依赖替换 | 全局函数、宏、service locator | 小接口 / template DI / HAL Adapter |

现代 C++ 不自动消除成本：固定数组复制仍是 O(N)，`std::string` copy 可能分配，`shared_ptr` 有 refcount 成本，virtual call 有间接调用成本。按目标平台 RAM、线程上下文和 WCET 预算验证。

## ⑤ 设计模式映射：Rule of Zero + Composition（6 分钟）

**变化轴**：payload 是否需要独立快照、初始化参数组合、HAL 实现差异、资源 teardown 依赖。  
**稳定边界**：值对象 invariant、唯一资源 owner、最小 HAL contract、显式生命周期 API。

| 候选 | 本周结论 |
|---|---|
| Value Semantics / Composition / Rule of Zero | 默认选择 |
| Adapter | 仅在厂商 C API 与稳定 contract 不一致时采用 |
| Prototype | 只有需在未知动态类型下 clone 才考虑 |
| Builder / Factory | 配置或运行时创建变化真实存在时才采用 |
| Observer | 多订阅者需求成立且 unsubscribe/drain/capacity 有界时才采用 |
| `shared_ptr` | 不作为默认依赖注入方式；确有共享生命周期再使用 |

设计流程：需求变化 → 识别变化轴 → 找稳定 contract / invariant → 选择值成员、RAII owner 或 borrow view → 决定 copy/move/delete → 排列成员顺序 → 定义 Stop 与 destructor fallback → 检查 callback lifetime、线程上下文和 WCET。

本周多数问题是对象语义和生命周期，不是运行时算法替换。Factory、Strategy、Observer 或 service locator 不会自动修复浅复制、错误单位、dangling borrow 或析构顺序。

## ⑥ Embedded / System Design：Modem TX 与 DMA Lease（7 分钟）

- `AtFrame`：固定容量 value type；按值入队后生产者可复用缓冲区，复制上界为最大帧长度。
- `std::span<const std::byte>`：用于同步解析或明确 borrow 区间；不能把临时 view 保存到异步 queue。
- `DmaLease`：唯一资源 owner，禁止复制；跨 task 交接用明确 transfer 或有界 pool handle。
- `ModemConfig`：值对象；构造入口委托到 canonical constructor；timeout / retry / baud rate 使用不同类型。
- `Transport` 与 `CallbackRegistration`：Transport 先构造、后销毁；registration 后构造、先销毁。
- `Stop(timeout)`：在 owner task 中 unregister、drain、停止 DMA/UART 并传播失败；析构只做幂等、非阻塞 fallback。

审查 RAM / queue / pool 上界、最大复制字节数、WCET、锁与阻塞、ISR 上下文、错误传播、Fake HAL 可测试性及 vendor HAL 隔离。`volatile` 不是线程同步；ISR 不执行分配、等待或复杂析构。

## ⑦ 今日编码规范（5 分钟）

### MUST 1：先定义 copy contract，再决定 default

错误：含 raw owning pointer / DMA handle 的类依赖隐式 memberwise copy。  
推荐：值类型使用值成员并在语义正确时 `=default`；唯一资源 owner 删除 copy；borrow view 明确 lifetime。

### MUST 2：构造入口统一 invariant，单位进入类型

错误：多个构造函数复制默认值，或 `uint32_t timeout, uint32_t retries` 可传反。  
推荐：delegating constructor + canonical constructor；`Milliseconds`、`RetryCount` 使用 distinct strong types，单参数构造默认 `explicit`。

### MUST 3：析构 no-throw、有界；可失败 teardown 显式化

错误：析构等待 DMA、阻塞锁或 callback drain。  
推荐：`Stop(timeout)` 返回 Status；registration 先注销并 drain；成员声明顺序保证 borrower 先销毁；destructor 只做幂等安全兜底。

## ⑧ 可编译 Lab / 练习（8 分钟）

### 主 Lab：正确的 owner / borrower 销毁顺序

源码：[examples/day-077/main.cpp](../examples/day-077/main.cpp)

```bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic examples/day-077/main.cpp -o day077
./day077
```

观察 `Stop(2U)` 超时、`Stop(20U)` 成功，以及未显式 Stop 时 registration 先注销、transport 再执行 fallback。

### Exercise 01：修复 callback registration 成员顺序

源码：[examples/day-077/exercise-01.cpp](../examples/day-077/exercise-01.cpp)

```bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic examples/day-077/exercise-01.cpp -o day077-ex01
./day077-ex01
```

Starter 是完整 runnable 的逻辑违规程序，预期 `lifetime violation observed: true`。将 `FakeTransport transport_` 声明在 `CallbackRegistration callback_` 之前，并同步调整 initializer list；将断言改为 `assert(!ledger.violation)`。重新运行应得到 `false`。解释为什么只改 initializer-list 文字顺序不改变真实成员顺序。

## ⑨ 3 个常见坑（3 分钟）

1. 把 type traits 的“可构造”误当成深复制、资源唯一、线程安全或 WCET 正确。
2. 把 span、initializer_list、raw pointer 当 owner；异步边界必须复制、转移 owner 或使用有界 pool handle。
3. 把 RAII 误解为析构里能做所有关闭工作；unregister 不等于 in-flight drain，显式 teardown 与 destructor fallback 必须分层。

## ⑩ 检查题（3 分钟）

1. 固定数组 `AtFrame` 与包含 pool borrow 的 `DmaLease`，默认 copy 是否合适？为什么 type trait 不能证明资源语义？
2. `Service { CallbackRegistration callback_; Transport transport_; }` 中 callback 借用 transport，指出生命周期问题及需要同时调整的两个位置。
3. Modem 子系统支持两个 HAL 平台、固定容量 TX queue、DMA callback 与可超时 Stop：选择 composition、Adapter、template/concept、virtual、Observer、Factory 或 shared_ptr 中哪些？说明变化轴、owner/borrow/lifetime、compile-time/runtime extensibility、unregister/drain、线程/IRQ、RAM 与 WCET，并解释为何不能用 shared_ptr/service locator 掩盖 teardown。

---

## 下一步

**Day 78 · Chapter 8 · Assignment Operators（原书 p.288 起）**。下一课先学习 copy assignment operator 与赋值语义；move assignment 按原书后续顺序安排，不提前跳章。

## 参考资料

- [Day 71–76 每日课程](day-071-copy-constructors-value-semantics.md) · [72](day-072-initializer-list-constructors.md) · [73](day-073-delegating-constructors.md) · [74](day-074-converting-constructors-explicit.md) · [75](day-075-summary-compiler-generated-constructors.md) · [76](day-076-object-destruction-raii-teardown.md)
- [Week 11 Code Review 与 Design Review](../weekly/week-11-review.md)
- [Embedded C++ Coding Guideline 学习索引](../guidelines/embedded-cpp-guideline-notes.md)
- [C++ draft · Copy constructors](https://eel.is/c++draft/class.copy.ctor)
- [C++ draft · Destructors](https://eel.is/c++draft/class.dtor)
