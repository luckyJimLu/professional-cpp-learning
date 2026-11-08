# Day 75 · Summary of Compiler-Generated Constructors：让编译器生成的操作符合对象语义

> **日期**：2026-11-08  
> **主教材**：Marc Gregoire, *Professional C++, Sixth Edition*（C++23），Chapter 8 · *Gaining Proficiency with Classes and Objects*，p.285 · **Summary of Compiler-Generated Constructors**。  
> **前置课程**：[Day 74 · Converting Constructors and Explicit Constructors](day-074-converting-constructors-explicit.md)。  
> **辅教材**：Dmitri Nesteruk, *Design Patterns in Modern C++*；今天只借助 RAII、composition 与 Rule of Zero 的工程思想，不为了覆盖 GoF 模式而引入无关层次。

**今天要回答的问题：编译器替一个类生成默认构造和复制构造时，究竟依据什么规则？这些默认行为是否真的符合类的资源语义？**

**学习目标**：识别隐式生成的默认构造函数和复制构造函数；理解 `= default` / `= delete`；区分“语法上可复制”和“语义上应该复制”；通过成员组合表达值语义或唯一资源所有权；使用 type traits 将能力约束固化为编译期检查。

**60 分钟安排**：阅读 7 分钟 → 复习 4 分钟 → 概念 15 分钟 → C/C++ 对照 5 分钟 → 设计映射 6 分钟 → Embedded 场景 7 分钟 → 规范 4 分钟 → Lab/练习 9 分钟 → 常见坑 2 分钟 → 检查题 1 分钟。

---

## ① 今日章节与建议阅读范围（7 分钟）

**Chapter 8，p.285：Summary of Compiler-Generated Constructors。** 今天只围绕本小节梳理编译器生成的构造操作，不提前进入 p.286 的 *Object Destruction*，也不提前展开 p.288–291 的 assignment operator 专题。

建议阅读时标记四件事：

1. 什么情况下编译器会隐式声明 default constructor；
2. 什么情况下编译器会隐式声明 copy constructor，以及 memberwise copy 的含义；
3. 某个 base/member 不可默认构造或不可复制时，生成的操作会怎样；
4. `= default` 与 `= delete` 如何把类作者的意图写进接口。

**范围边界**：今天重点是 default constructor 与 copy constructor。Copy assignment 会在本章后续小节讨论；move constructor / move assignment 的完整规则留到 Chapter 9 的 Move Semantics 主线，不在今天提前展开。

阅读时问自己：如果类里新增一个 `std::unique_ptr`、一个引用成员或一个 raw pointer，原先的默认构造和复制语义是否仍然正确？

## ② 昨日复习 3 问（4 分钟）

承接 Day 74：

1. **核心机制**：`explicit Milliseconds(std::uint32_t)` 仍然允许 `Milliseconds{500U}` 吗？它阻止的是直接构造，还是隐式转换？
2. **工程判断**：为什么 `Milliseconds` 与 `RetryCount` 应是不同类型，而不是两个 `using` alias？
3. **代码细节**：`std::is_constructible_v<T, U>` 与 `std::is_convertible_v<U, T>` 分别检查什么？为什么两者不能互相替代？

复习要点：`explicit` 不阻止 direct-init；强类型区分语义；`is_constructible` 检查直接构造表达式，`is_convertible` 检查隐式转换路径；两者都不负责运行期范围验证。

## ③ 核心概念：Compiler-Generated Constructors（15 分钟）

### 1. Default constructor：不是“每个类自动都有”

如果类没有任何 user-declared constructor，编译器会隐式声明一个 default constructor。**一旦类声明了任意构造函数，编译器就不会再自动补一个无参 default constructor。**

```cpp
struct ModemProfile {
    std::uint32_t timeout_ms{500U};
    std::uint8_t retry_limit{3U};
};

class UartConfig {
public:
    explicit UartConfig(std::uint32_t baud_rate) noexcept
        : baud_rate_{baud_rate} {}

    // 如果确实需要合法默认状态，应明确写出：
    UartConfig() = default;

private:
    std::uint32_t baud_rate_{115200U};
};
```

`ModemProfile` 没有 user-declared constructor，因此可以默认构造；`UartConfig` 声明了带参数构造函数，所以必须显式提供 `UartConfig() = default`，才能再次支持无参构造。

`= default` 不是“空函数体”。它要求编译器按语言规则生成默认实现；如果某个成员无法默认构造，defaulted constructor 仍可能被定义为 deleted。

### 2. Copy constructor：默认是 memberwise copy

若没有 user-declared copy constructor，编译器会隐式声明 copy constructor。其默认语义是逐个复制 base subobject 与 non-static data members：

```cpp
struct ModemProfile {
    std::uint32_t timeout_ms{500U};
    std::uint8_t retry_limit{3U};
};

const ModemProfile factory_profile{};
ModemProfile runtime_profile{factory_profile}; // 隐式生成的 copy constructor
```

对值成员（整数、`std::array`、值对象），memberwise copy 往往正是想要的独立快照。但对 raw pointer，memberwise copy 只复制地址，不会复制指向的数据，也不会自动建立新的资源所有权。

### 3. 生成失败时，编译器可以把操作定义为 deleted

当类的某个 base/member 没有可用的对应构造操作时，编译器生成的操作可能被定义为 deleted。一个典型例子是包含 `std::unique_ptr` 的 owner：

```cpp
#include <cstdint>
#include <memory>
#include <type_traits>

struct DmaBufferOwner {
    std::unique_ptr<std::uint8_t[]> bytes;
};

static_assert(!std::is_copy_constructible_v<DmaBufferOwner>);
static_assert(std::is_move_constructible_v<DmaBufferOwner>);
```

这里没有手写 copy constructor。成员 `unique_ptr` 本身不可复制，因此组合类的隐式 copy constructor 不可用；而在没有阻止隐式 move 的 user-declared special member 的前提下，组合类可以获得移动构造能力。移动规则今天只作为预告，完整判断放在 Chapter 9。

### 4. `= default` 与 `= delete` 是接口声明，不是装饰

```cpp
class DmaLeaseToken {
public:
    explicit DmaLeaseToken(std::uint8_t channel) noexcept
        : channel_{channel} {}

    DmaLeaseToken(const DmaLeaseToken&) = delete;
    DmaLeaseToken& operator=(const DmaLeaseToken&) = delete;

private:
    std::uint8_t channel_;
};
```

- `= default`：请求编译器生成该操作；成员/基类不满足条件时，操作仍可能被定义为 deleted。
- `= delete`：明确禁止调用该操作，错误在编译期暴露。
- `= delete` 的价值是让“不可复制”成为类型契约，而不是靠注释要求调用者小心。

如果一个类确实是纯值对象，默认生成的复制通常比手写复制更可靠；如果它代表唯一资源 lease、DMA channel、socket handle 或锁所有权，就必须阻止无意复制，或采用一个本身不可复制的 RAII 成员来表达所有权。

### 5. `type_traits` 检查能力，但不能证明语义

```cpp
#include <type_traits>

static_assert(std::is_default_constructible_v<ModemProfile>);
static_assert(std::is_copy_constructible_v<ModemProfile>);
static_assert(!std::is_copy_constructible_v<DmaLeaseToken>);
```

- `is_default_constructible`：检查能否构造一个 `T`；
- `is_copy_constructible`：检查能否从 `const T&` 构造 `T`；
- `is_copy_assignable`：检查能否用另一个 `T` 给现有对象赋值；
- `is_trivially_copy_constructible`：检查复制构造是否满足 trivial 条件。

这些 trait 只能检查表达式/能力，不能证明复制后的资源语义正确。一个 raw pointer 类即使 `is_copy_constructible_v<T>` 为 true，也可能在析构时 double-release。

### 6. Default initialization 与 value initialization 不要混淆

```cpp
struct UnsafeConfig {
    std::uint32_t timeout_ms;
    UnsafeConfig() = default;
};

UnsafeConfig a;   // default-initialization：标量成员没有自动获得业务默认值
UnsafeConfig b{}; // value-initialization：本例 defaulted default constructor 非 user-provided，先 zero-initialize
```

不要把 `T{}` 的零初始化行为当成类不变量设计。业务默认值应通过 in-class member initializer 明确表达，例如 `timeout_ms{500U}`；不要依赖调用者必须记得使用花括号。

### 7. 编译期 / 运行期成本

- 隐式声明、`=default`、`=delete` 和 type traits 都主要影响编译期可用性与重载决议；它们不会在运行期增加一个“是否允许复制”的分支。
- memberwise copy 的运行成本取决于成员类型与大小。固定数组复制仍然是有界工作，但在 ISR / hard real-time path 中也要计算字节数与 WCET。
- 类型 trait 不能替代运行期边界测试，也不能证明 copy 不分配内存；例如复制 `std::string` 可能分配。
- 不要对非 trivially-copyable 类型随意使用 `memcpy`；“复制构造可用”不等于“可按字节复制”。

## ④ C 写法 vs Modern C++（5 分钟）

### C：结构体赋值复制的是成员值，指针成员仍然只是地址

```c
#include <stdint.h>

struct DmaLease {
    uint8_t channel;
    void *driver_context;
};

void CopyLease(struct DmaLease *destination,
               const struct DmaLease *source)
{
    *destination = *source; /* 指针值被复制，资源没有被克隆 */
}
```

C 可以通过隐藏结构体、`init/clone/destroy` 函数和不公开内部布局来管理资源，但必须由 API 约定调用顺序与复制语义。

### Modern C++：把“可复制值”与“唯一资源”编码成不同类型

```cpp
#include <array>
#include <cstdint>

struct ModemProfile {
    std::uint32_t timeout_ms{500U};
    std::uint8_t retries{3U};
    std::array<std::uint8_t, 4> flags{};
}; // 编译器生成值语义复制

class DmaLeaseToken {
public:
    explicit DmaLeaseToken(std::uint8_t channel) noexcept
        : channel_{channel} {}
    DmaLeaseToken(const DmaLeaseToken&) = delete;
    DmaLeaseToken& operator=(const DmaLeaseToken&) = delete;
private:
    std::uint8_t channel_;
}; // 唯一 lease 不允许 memberwise copy
```

| 维度 | C 结构体约定 | Modern C++ 类型语义 |
|---|---|---|
| 类型安全 | copy/init/clone 规则依赖 API 约定 | copyability 可由编译器检查 |
| 资源管理 | 手工配对 acquire/release | RAII owner 可在析构时释放 |
| 可测试性 | 需要测试重复释放、浅复制 | `static_assert` 可先验证复制能力，运行期仍需测试 teardown |
| 扩展性 | 新增字段时需审查所有复制函数 | memberwise value copy 自动包含新成员；owner 成员可传播不可复制语义 |
| 成本 | 简单、显式，但约定容易漂移 | 编译期规则更强；值复制成本仍与成员大小相关 |

## ⑤ 设计模式映射：Rule of Zero、RAII 与 Composition（6 分钟）

**真实变化轴**不是“未来可能有多少种 DMA 实现”，而是对象代表的是**可独立复制的配置值**，还是**唯一的外部资源所有权**。

| 对象语义 | 推荐机制 | 是否需要 GoF Pattern |
|---|---|---|
| Modem 配置快照 | 值成员、默认生成 copy constructor | 不需要 |
| 固定长度 payload | `std::array` + memberwise copy | 不需要 |
| DMA channel lease | RAII owner + 删除 copy | 不需要 |
| 底层驱动差异 | 只有确有多平台变化时才加 Adapter | 可能需要 Adapter，但不是今天的目标 |
| 运行时可替换算法 | 需要真实变化轴时再评估 Strategy | 今天没有这个需求 |

**Rule of Zero**：若成员本身已经正确管理资源（例如 `std::array`、`std::string`、`std::unique_ptr`），优先不手写析构、复制与赋值逻辑，让成员类型组合出类语义。

**Rule of Five / Rule of Three 只作边界提醒**：一旦类直接管理 raw resource，并自行定义析构/复制/移动操作，就必须整体审查相关 special members。不要只补一个 copy constructor 就认为资源语义完整；移动语义会在 Chapter 9 系统学习。

**Ownership / Borrow / Lifetime**：

- `ModemProfile` 拥有自己的值成员，复制后是独立快照；
- `DmaLease` 拥有“释放 DMA lease 的责任”，但可以借用 `DmaPool` / Driver 服务；被借用服务必须活得比 lease 更久；
- 不要用 `shared_ptr` 把唯一 DMA lease 变成“看起来可复制”；如果多个模块需要访问，应传递明确的 borrow/view 或稳定 ID，由单一 owner 管理；
- 如果 lease 要跨任务转移，应该设计明确的 move/transfer API，并定义源对象失效、目标对象接管与失败回滚；不要把复制当作转移。

**不使用 Factory / Prototype / Observer 的原因**：今天没有复杂创建流程、运行时克隆需求或事件订阅关系。Factory 不能修复错误的 copy semantics；Prototype 也不能替代唯一资源所有权。用 composition + RAII 已足够。

```text
识别对象语义 → 值对象还是唯一资源 owner
      → 选择成员类型 / 默认生成 / =delete
      → 检查 owner 与 borrow lifetime
      → 评估复制字节数、分配与 WCET
      → 用 traits + 运行期测试验证
```

## ⑥ Embedded / System Design：Modem 配置快照与 DMA Lease（7 分钟）

### 场景 A：RTOS 消息队列传递配置快照

`ModemProfile` 只包含固定宽度标量和固定容量数组，可以按值复制给工作任务。要审查：

- 最大结构体尺寸是否纳入 queue RAM 预算；
- 一次 enqueue/dequeue 的复制字节数是否有界；
- 复制是否发生在 ISR；若发生，是否满足 ISR 时间预算；
- 配置更新是否需要一致快照，避免生产者写一半、消费者读一半；
- 若结构体未来加入 `std::string`、`std::vector` 或 `std::span`，是否改变了分配、ownership 或 borrow lifetime。

### 场景 B：DMA channel lease 是唯一 owner

DMA lease 的析构负责归还通道。默认复制会让两个对象持有相同 channel id，最终造成 double-release。正确边界是：

- 单一 lease owner；
- `DmaPool` / HAL 是被借用的服务，生命周期由 composition root 保证；
- 复制构造和复制赋值删除；
- 若需要跨 task 转移，使用明确的 move/transfer contract（后续 Chapter 9 学习）；
- 析构释放路径必须有界、不可阻塞、不可抛异常；如果硬件 stop 需要等待或可能失败，应在析构前显式执行 `Stop(timeout)`，析构只做安全兜底。

**线程 / IRQ 边界**：lease 不应同时被两个任务无同步地销毁或转移；`volatile` 不是所有权或线程同步机制。若 DMA completion callback 访问 lease，必须定义 callback owner、注销、in-flight drain 与 teardown 顺序，避免对象析构后回调继续访问。

## ⑦ 今日编码规范（4 分钟）

### MUST 1：默认构造必须建立确定、合法的初始状态

错误：依赖 `T{}` 的调用习惯让成员“碰巧归零”。推荐为每个标量成员设置明确的 in-class initializer；若类声明了其他构造函数且确实需要默认状态，显式写 `T() = default`，并验证所有成员都可默认构造。

### MUST 2：唯一资源 owner 不得意外复制

错误：拥有 raw handle 的类保留编译器生成的 copy constructor，导致两个对象释放同一个资源。推荐用 RAII 成员表达资源，或明确删除 copy constructor 与 copy assignment。不要用 `shared_ptr` 掩盖唯一所有权。

### SHOULD 3：用编译期 trait 验证能力，用运行期测试验证语义

错误：只看 `is_copy_constructible_v<T>` 为 true，就认定复制安全。推荐同时审查成员语义、资源副作用、固定容量、复制成本与 teardown；对关键契约增加 `static_assert`，并测试复制后的独立修改与资源只释放一次。

## ⑧ 可编译 Lab / 练习（9 分钟）

所有文件都是独立编译单元，各自包含 `int main()`，必须分别编译运行。

### 主 Lab：观察默认生成、memberwise copy 与删除复制

源码：[examples/day-075/main.cpp](../examples/day-075/main.cpp)

```bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic examples/day-075/main.cpp -o day075
./day075
```

主 Lab 中：

- `ModemProfile` 没有 user-declared constructor，编译器提供默认构造与复制构造；
- 复制后修改 `snapshot.retry_limit`，原对象保持不变；
- `DmaLeaseToken` 的 copy constructor / copy assignment 显式删除；
- `static_assert` 在编译期验证两种对象的能力差异。

预期输出：

```text
explicitly defaulted config window=1000 ms
default profile: timeout=500 ms, retries=3
copied profile: timeout=500 ms, retries=5
copy source remains unchanged: true
DMA lease channel=2
ModemProfile copyable: true
DmaLeaseToken copyable: false
```

### Exercise 01：修复 DMA Lease 的隐式浅复制

源码：[examples/day-075/exercise-01.cpp](../examples/day-075/exercise-01.cpp)

```bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic examples/day-075/exercise-01.cpp -o day075-ex01
./day075-ex01
```

Starter 是完整、可编译、可运行的程序。`DmaLease` 保存 pool 借用指针和 channel id，析构时归还通道；但它没有声明 copy 操作，因此编译器生成的 memberwise copy 会复制同一 pool 地址与 channel id。

预期输出会出现：

```text
acquired DMA channel 0
copy path compiled; duplicate lease created
released DMA channel 0
ERROR: duplicate release of DMA channel 0
pool active after lease scope: false
```

**修复任务**：

1. 先运行并解释为什么 `TryCopy()` 能创建第二个 lease；
2. 在 `DmaLease` 中删除 copy constructor 与 copy assignment：`DmaLease(const DmaLease&) = delete;`、`DmaLease& operator=(const DmaLease&) = delete;`；
3. 将两个 `static_assert` 改为验证 copy constructible / copy assignable 均为 false；
4. 再次运行，确认输出为 `copy is disabled at compile time`，且 DMA channel 只释放一次；
5. 解释 `pool_` 是 borrow，为什么 `FakeDmaPool` 必须比 `DmaLease` 活得更久；
6. 说明如果未来需要跨任务转移 lease，应设计 move/transfer 语义，而不是重新允许 copy。

**答案检查点**：修复后模板中的 `if constexpr` 会选择不可复制分支，非法复制表达式不参与该模板实例化；程序仍可独立编译运行。不要通过 `shared_ptr` 让 lease 变成共享所有权。

## ⑨ 3 个常见坑（2 分钟）

1. **以为每个类都有默认构造函数**：只要声明了任意构造函数，隐式 default constructor 就不会自动补上；需要合法默认状态时显式 `= default`。
2. **把 memberwise copy 当成深复制**：raw pointer 复制的是地址；如果地址代表唯一资源，默认 copy 可能造成 double-release、use-after-free 或两个对象争用同一硬件资源。
3. **把 type trait 当作设计证明**：`is_copy_constructible` 只证明表达式可构造，不证明复制后的语义、实时成本、线程安全或 callback lifetime 正确。

## ⑩ 检查题（1 分钟）

### Q1 · 知识检查

类声明了 `explicit UartConfig(std::uint32_t baud_rate)`，但没有 `UartConfig()`。`UartConfig config{};` 是否一定可编译？如果该类确实有合法默认状态，应如何声明默认构造函数？

### Q2 · 代码检查

一个类包含 `std::unique_ptr<std::uint8_t[]> buffer;`，没有自行声明 copy/move special members。判断 `is_copy_constructible_v<T>` 与 `is_move_constructible_v<T>` 的结果，并解释原因。不要把“可移动”误说成“可复制”。

### Q3 · Design Review：Modem Driver 的两类对象

设计一个 `ModemProfile`（固定容量配置快照）和 `DmaLease`（唯一硬件资源 lease）。请决定哪些操作允许默认生成、哪些应 `=default`、哪些应 `=delete`。说明变化轴、稳定边界、Rule of Zero / composition 是否足够、owner/borrow/lifetime、跨任务转移、ISR/WCET、分配/锁/阻塞和 callback teardown。为什么不需要 Factory、Prototype 或 `shared_ptr`？

**自检原则**：先识别对象是值还是唯一资源，再决定 copy；先设计 owner/borrow/lifetime，再选择 pointer；编译期 trait 验证能力，运行期测试验证资源语义；Pattern 是工具不是目标。

---

## 下一课

**Day 76 · Chapter 8 · Object Destruction，原书 p.286。** 继续沿原书顺序学习析构函数、对象结束生命周期与资源清理边界；不提前跳到 assignment operator 专题。

## 参考资料

- [Day 74 · Converting Constructors and Explicit Constructors](day-074-converting-constructors-explicit.md)
- [C++ draft · Default constructors](https://eel.is/c++draft/class.default.ctor)
- [C++ draft · Copy constructors](https://eel.is/c++draft/class.copy.ctor)
- [C++ draft · Deleted definitions](https://eel.is/c++draft/dcl.fct.def.delete)
- [cppreference · Default constructor](https://en.cppreference.com/w/cpp/language/default_constructor)
- [cppreference · Copy constructor](https://en.cppreference.com/w/cpp/language/copy_constructor)
- [Wiley · Professional C++, Sixth Edition](https://www.wiley.com/en-us/professional-c-6th-edition-p-9781394193189)
