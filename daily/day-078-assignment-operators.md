# Day 78 · Assignment Operators：Copy / Move Assignment 与资源语义

> **日期**：2026-11-11  
> **主教材**：Marc Gregoire, *Professional C++, Sixth Edition*（C++23），Chapter 8 · *Gaining Proficiency with Classes and Objects*，**p.288–293：Assignment Operators**。Day 77 已在仓库确认本节为下一主题；Chapter 8 的页码范围为 259–293，Chapter 9 从 p.295 开始。建议读完本节并在 Chapter 9 标题处停止。  
> **前置课程**：[Day 77 · 第 11 周复盘](day-077-week11-review-constructors-destruction.md)、[Day 75 · 编译器生成的构造函数](day-075-summary-compiler-generated-constructors.md)、[Day 76 · Object Destruction](day-076-object-destruction-raii-teardown.md)。  
> **辅教材**：Dmitri Nesteruk, *Design Patterns in Modern C++*；结合仓库 `patterns/ownership-and-smart-pointers.md` 中的 ownership/lifetime 决策。  
> **课程边界**：本课讨论类的 copy assignment / move assignment 及其资源语义；不提前进入 Chapter 15 的一般运算符重载，也不展开 Chapter 9 的后续类特性。

**今天要回答的问题：给一个已经存在的对象重新赋值时，旧状态由谁处理？新状态如何接管？如果对象拥有 DMA channel，普通的 memberwise assignment 是否安全？**

**学习目标**：区分 copy construction 与 copy assignment；理解编译器生成的 copy assignment；掌握 `operator=` 的返回约定、自赋值安全与成员语义；判断何时删除赋值；理解 move assignment 对唯一资源的释放与转移；在无异常、固定容量的嵌入式代码中选择可预测的赋值策略。

**60 分钟安排**：阅读 7 分钟 → 复习 4 分钟 → 概念 14 分钟 → C/C++ 对照 5 分钟 → 设计映射 6 分钟 → Embedded 场景 7 分钟 → 规范 4 分钟 → Lab/练习 9 分钟 → 常见坑 2 分钟 → 检查题 2 分钟。

---

## ① 今日章节与建议阅读范围（7 分钟）

**Chapter 8，p.288–293：Assignment Operators。** 先按本节讲解顺序阅读，再对照本课 Lab。完成本节后停止；下一章从 p.295 开始，不提前阅读 Chapter 9。

阅读时重点标记：

1. copy assignment 与 copy constructor 的触发条件差异；
2. 编译器生成的 copy assignment 如何逐成员赋值；
3. 为什么通常返回 `T&`，以及 `a = b = c` 的链式赋值如何工作；
4. self-assignment 对资源类有什么影响；
5. 哪些成员（例如 reference member、const member、`std::unique_ptr`）会限制或删除默认赋值；
6. 资源所有者的赋值究竟是复制资源，还是转移资源。

**与 Chapter 15 的边界**：本课的 `operator=(...)` 是类的 special member function。Chapter 15 的一般运算符重载会讨论更广泛的运算符语义；不要因为本课出现 `operator=` 就跳到 Chapter 15。

## ② 昨日复习 3 问（4 分钟）

承接 Day 77 的对象语义复盘：

1. **生命周期**：`CallbackRegistration` 借用 `Transport` 时，为什么 `Transport` 应先声明、后销毁？
2. **工程判断**：`Stop(timeout)` 可能失败，而 destructor 不能返回 `Status`；资源类的 assignment 是否也应该承担可能失败的硬件关闭流程？为什么？
3. **代码细节**：`std::unique_ptr<T>` 的 copy assignment 为什么不可用？如果一个类包含 `unique_ptr`，默认 copy assignment 会发生什么？

复习要点：owner/dependency 先构造后销毁；可失败关闭放在显式 API；`unique_ptr` 表达唯一所有权，因此默认 memberwise copy assignment 不成立，编译器会删除相应操作或使其不可用。

## ③ 核心概念：Assignment Operators（14 分钟）

### 1. Assignment 与 Construction 不同

```cpp
FixedFrame source;
FixedFrame target;       // target 已经存在
target = source;         // copy assignment：替换 target 的当前值

FixedFrame copy{source}; // copy construction：创建一个新对象
```

判断标准不是语法里有没有 `=`，而是左侧对象是否已经完成生命周期开始：

- copy constructor：创建新对象，初始化其成员；
- copy assignment：目标对象已存在，替换其当前值；
- move assignment：目标对象已存在，从右侧对象转移资源/状态。

赋值不重新创建左侧对象，也不会改变左侧对象的地址或存储期。

### 2. 编译器生成的 copy assignment

对满足条件的类，编译器可以生成类似逐成员赋值的操作：

```cpp
class ModemConfig {
public:
    ModemConfig& operator=(const ModemConfig&) = default;

private:
    std::uint32_t baud_rate_{115200U};
    std::uint8_t retry_count_{3U};
};
```

其语义大体上是按成员顺序对 base subobject 与 non-static data members 进行赋值；每个成员使用自己的赋值语义。它不会自动理解业务上的“深复制”“重新打开设备”或“释放 DMA”。

当所有成员的 memberwise assignment 正好满足类不变量时，优先 `= default`，不要为了展示 C++ 技巧而手写相同逻辑。

### 3. `operator=` 通常返回 `T&`

```cpp
class FixedFrame {
public:
    FixedFrame& operator=(const FixedFrame&) noexcept = default;
};
```

返回左侧对象的引用有两个作用：

- 保持常见 C++ 赋值表达式语义；
- 支持 `a = b = c`，因为 `b = c` 的结果仍是 `b`，再赋给 `a`。

不要返回 `void`，也不要无理由返回一个新对象。返回 `T&` 不意味着赋值可以在任何情况下安全链式调用；它只是遵循赋值运算符的常见接口契约。

### 4. Self-assignment：`x = x`

赋值运算符可能收到与 `*this` 相同的对象：

```cpp
frame = frame;
```

对 `std::array` 等纯值成员，默认赋值自然安全。自定义资源赋值必须避免先释放自身资源，再从已经失效的源读取同一资源。

常见策略：

- 纯值类型：优先 defaulted assignment；
- 资源类：先定义资源复制或转移语义，再实现赋值；
- 自定义 move assignment：可用 `if (this != &other)` 防止自移动路径破坏自身状态；
- 需要异常强保证的通用类可研究 copy-and-swap，但固定容量、禁异常的嵌入式类型通常不需要为此引入复杂交换层。

### 5. 为什么有些类型不应该可赋值

赋值不是每个类都必须提供的 API：

```cpp
class DmaLease {
public:
    DmaLease(const DmaLease&) = delete;
    DmaLease& operator=(const DmaLease&) = delete;
};
```

以下情况应认真考虑删除 copy assignment：

- 类是唯一资源 owner，例如 DMA channel、文件描述符、socket 或独占硬件会话；
- 对象包含 reference member，无法重新绑定引用；
- 对象身份固定，赋值会破坏地址注册、IRQ table 或外部句柄关系；
- 类不变量不允许将另一个对象的状态覆盖进来。

`const` data member 也不能通过普通赋值重新赋值；这会使隐式 copy assignment 被删除。不要为了“让代码编译”而把语义上不可替换的成员改成可变裸指针。

### 6. Move assignment：把资源从一个已存在对象转移到另一个对象

对于唯一资源 owner，move assignment 的责任通常是：

1. 安全处理目标当前拥有的资源；
2. 从 source 接管资源句柄；
3. 将 source 置于可析构、可再次赋值的有效状态；
4. 返回 `*this`。

```cpp
DmaLease& operator=(DmaLease&& other) noexcept {
    if (this != &other) {
        Reset();  // 先释放目标原来拥有的资源
        channel_ = std::exchange(other.channel_, -1);
    }
    return *this;
}
```

注意：move assignment 不是“把右侧指针地址复制过来”。它是 owner contract 的状态转移。移动后的 source 必须保持有效且可析构；具体值通常处于 moved-from 状态，不能假定仍持有原资源。

本课只用一个小型 `DmaLease` Lab 演示转移。完整的 special-member generation rules 与 Rule of Five 组合关系应结合原书后续内容继续学习，不在本课扩展成独立专题。

### 7. 赋值操作不适合隐藏可失败的业务流程

在本项目的 no-exception Embedded 约束下，普通 `operator=` 不适合暗中执行可能失败的设备重配置、等待、DMA flush 或 heap allocation。

如果替换操作确实可能失败，优先提供有名字、可返回状态的 API：

```cpp
[[nodiscard]] Status TryLoad(const ConfigView& config) noexcept;
```

若是同容量、无资源副作用的值类型，则可以使用 `noexcept` copy assignment。`noexcept` 必须由成员操作和实现保证，不能只为了消除 warning 而添加。

## ④ C 写法 vs Modern C++（5 分钟）

### C：通过函数显式复制结构体

```c
#include <stddef.h>

struct modem_frame {
    unsigned char bytes[8];
    unsigned int length;
};

void modem_frame_assign(struct modem_frame *dst,
                        const struct modem_frame *src)
{
    if (dst == NULL || src == NULL) {
        return;
    }
    *dst = *src; /* 结构体值复制；不复制其指针所指向的 payload */
}
```

C 的结构体赋值可以复制固定数组成员，但 C 没有 C++ 的 operator overload，也没有类型系统层面的 move-only owner 约束。资源句柄通常依赖手工约定。

### Modern C++：值类型默认赋值，唯一资源显式转移

```cpp
class ModemFrame {
public:
    ModemFrame& operator=(const ModemFrame&) noexcept = default;
private:
    std::array<std::uint8_t, 8> bytes_{};
    std::size_t length_{0U};
};

class DmaLease {
public:
    DmaLease(const DmaLease&) = delete;
    DmaLease& operator=(const DmaLease&) = delete;
    DmaLease& operator=(DmaLease&& other) noexcept;
};
```

| 维度 | C struct + 函数 | Modern C++ |
|---|---|---|
| 值复制 | `*dst = *src` | defaulted copy assignment，成员语义可检查 |
| 资源唯一性 | 依赖 API 约定 | `= delete` 阻止复制，move assignment 表达转移 |
| 自赋值 | 由函数实现负责 | 默认值成员赋值通常自然安全；自定义资源逻辑仍需审查 |
| 可测试性 | 需要测试每个资源配对路径 | 可静态检查 copy/move 能力，并测试转移后 owner 状态 |
| 成本 | 固定 struct 复制成本明确 | `std::array` 仍是固定容量复制；动态成员可能分配或复制大量数据 |

## ⑤ 设计模式映射：Value Semantics、RAII 与 Ownership Transfer（6 分钟）

**真实变化轴**：Frame 内容需要按值替换；DMA channel 需要唯一 owner；底层 HAL 资源释放方式可能随平台变化。稳定边界不是一个复杂的对象工厂，而是“值可以复制，资源 owner 不可复制，只能明确转移”。

| 问题 | 选择 | 原因 |
|---|---|---|
| 固定容量 Frame 需要覆盖内容 | defaulted copy assignment | memberwise value assignment 正好符合语义 |
| DMA channel 只有一个释放责任人 | delete copy + move assignment | 避免 double-release 与隐藏共享所有权 |
| 赋值前需要跨平台释放 HAL 资源 | 小型 RAII Adapter | 隔离平台 API；不让业务类散布 `hal_release()` |
| 运行期替换传输算法 | 只有出现真实变化轴才考虑 Strategy | 本课的赋值语义本身不需要 Strategy |

**为什么不引入 Factory / Builder / Observer / State**：本课解决的是既有对象的状态替换与资源转移，不是对象创建、复杂状态机或事件订阅。为 `operator=` 包一层 Factory 不会修复资源泄漏；用 `shared_ptr` 共享 DMA channel 也会模糊唯一释放责任。

**Ownership / Borrow / Lifetime**：

- `FixedFrame` 拥有自己的 `std::array`，copy assignment 复制 payload；两个 Frame 之后独立修改。
- `DmaLease` 是唯一 owner；copy assignment 删除，move assignment 转移 owner 身份。
- `std::span` / raw pointer 如果出现在 Frame API 中，只表示 borrow view，不因赋值而延长底层 buffer lifetime。
- 若资源绑定某个 RTOS task 或线程，move assignment 还必须遵守线程亲和性；不能因为语法允许移动就跨线程随意转移。

设计检查顺序：

```text
需求变化 → 判断目标对象是否已存在
→ 区分 value 与 resource owner
→ 定义 copy / move / delete
→ 确认旧资源处理与 source moved-from 状态
→ 审查 self-assignment / self-move
→ 检查 allocation、blocking、thread affinity 与 WCET
```

## ⑥ Embedded / System Design：Modem Frame 与 DMA Lease（7 分钟）

把 Modem TX 路径分成两类对象：

1. **`FixedFrame`**：固定 8-byte payload，代表已编码的 AT/控制帧。复制成本有上界，适合在非 ISR 的 task context 中按值赋值或放入固定容量队列。
2. **`DmaLease`**：代表唯一 DMA channel。不能复制；所有权从资源管理 task 转移给 TX completion handler 或另一个明确 owner 时，必须有单一、可审查的 move 路径。

### 系统约束

- **内存上界**：固定 Frame 的赋值只复制固定数组与长度字段；不要把动态 `std::vector` 的复制误认为固定成本。
- **WCET**：Frame copy 的工作量与容量成正比且固定；DMA lease 的 move assignment 包含旧资源释放，必须确认 HAL release 是有界、非阻塞的。
- **线程安全**：`operator=` 不会自动加锁。多个 task 同时写同一对象仍是 data race；明确 owner task 或外部同步。
- **IRQ**：ISR 中不要执行可能阻塞、分配或触发复杂 teardown 的赋值。ISR 应投递固定大小事件，由 owner task 更新对象。
- **错误传播**：如果重配置需要硬件 ACK 或可能超时，不要藏在 `operator=`；使用 `TryConfigure()` / `Rebind()` 返回 Status。
- **硬件可替换性**：Fake HAL 只记录 acquire/release，host test 即可验证 move assignment 是否释放旧 channel、是否把 source 清空。
- **callback 生命周期**：若 DMA completion callback 持有 lease 的借用地址，必须保证 lease owner 在 callback 完成前存活；move owner 时还要同步更新 callback token/registration，不允许 callback 继续指向旧 owner 地址。

## ⑦ 今日编码规范（4 分钟）

### MUST 1：值类型的赋值优先 `= default`

错误：手写逐字段复制，漏掉新增成员或忘记同步 metadata。推荐在 memberwise assignment 符合 invariant 时使用 `T& operator=(const T&) = default;`，并用测试验证复制后独立修改。

### MUST 2：唯一资源 owner 禁止 copy assignment

错误：

```cpp
class BadDmaLease {
    int channel_;
}; // 默认复制会复制 channel id，产生两个释放责任人
```

推荐显式删除 copy constructor / copy assignment；只有确实需要转移 owner 时才提供 move operations，并确保目标旧资源先安全释放、source 进入有效 moved-from 状态。

### SHOULD 3：可能失败或阻塞的替换操作使用命名 API

错误：`device = new_config;` 内部偷偷关闭硬件、等待 ACK、申请内存。推荐 `TryConfigure(new_config, timeout)` 返回 Status；普通 `operator=` 只承担无歧义、可预测的值替换或资源转移。

## ⑧ 可编译 Lab / 练习（9 分钟）

所有练习文件均为独立编译单元，包含自己的 `int main()`，并提供可观察输出。

### 主 Lab：值赋值与唯一资源移动赋值

源码：[examples/day-078/main.cpp](../examples/day-078/main.cpp)

```bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic -Werror examples/day-078/main.cpp -o day078
./day078
```

实验观察：

- `FixedFrame` 使用 defaulted copy assignment；修改目标的第一个 byte 不会改变 source。
- `(chained = destination)` 返回 `FixedFrame&`，可验证链式赋值契约。
- `DmaLease` 的 copy assignment 被删除；move assignment 先释放目标原有 channel，再接管 source channel。
- scope 结束后 active channel 数量为 0，release 次数为 2。

### Exercise 01：修复 move assignment 的资源泄漏

源码：[examples/day-078/exercise-01.cpp](../examples/day-078/exercise-01.cpp)

```bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic -Werror examples/day-078/exercise-01.cpp -o day078-ex01
./day078-ex01
```

**Starter 可直接运行**，但 `DmaLease::operator=(DmaLease&&)` 故意覆盖目标原有 `channel_`，没有先释放它。预期观察到：

```text
after move assignment: active=2, destination=2, source=-1
after scope: active=1, releases=1
expected after fix: active=0, releases=2
```

**修复要求**：

1. 在 move assignment 中处理目标当前资源；
2. 转移 source 的 channel，并将 source 置为 `-1`；
3. 防止 self-move 破坏对象状态；
4. 保持 `noexcept` 只在实现确实不抛异常时使用；
5. 修复后输出应为 `after scope: active=0, releases=2`。

建议实现：增加幂等 `Reset() noexcept`，在 `this != &other` 分支先调用 `Reset()`，再使用 `std::exchange` 接管资源。不要用 `shared_ptr` 掩盖资源唯一性。

## ⑨ 3 个常见坑（2 分钟）

1. **把 assignment 当成 construction**：`target = source` 不会重新构造 target；它调用目标对象的赋值语义，旧资源必须得到处理。
2. **把 raw handle 的 memberwise copy 当成资源复制**：两个对象得到同一个 DMA channel id，析构时可能 double-release；唯一 owner 应删除 copy assignment。
3. **在实时路径隐藏昂贵操作**：对动态容器赋值可能分配、复制大量数据或触发 allocator；ISR 中也不应执行不受控赋值。固定容量、明确成本，或使用有名字的异步更新 API。

## ⑩ 检查题（2 分钟）

### 知识 / 代码检查

1. 为什么 `operator=(const T&)` 通常返回 `T&`？`a = b = c` 中哪一个对象先被赋值？
2. 一个类只有 `std::array` 成员和一个 `std::unique_ptr<Buffer>` 成员。默认 copy assignment 为什么不能直接满足“复制整个对象”的需求？你会选择删除复制、深复制，还是共享所有权？请说明语义依据。

### 设计题

Modem TX service 有 `Frame`、`DmaLease`、`CallbackRegistration` 三个成员。Frame 是固定容量值；DmaLease 唯一拥有 DMA channel；CallbackRegistration 借用 service 并向 transport 注册完成回调。请设计 copy/move assignment 策略：

- 哪些类型可复制，哪些必须 `= delete`？
- service 本身是否应该可赋值？如果 move assignment 会改变 callback 捕获的对象地址，如何处理注册关系？
- 真实变化轴是 HAL 平台、帧格式还是 callback 生命周期？稳定边界放在哪里？
- 如何保证 unregister、in-flight drain、DMA stop 与成员析构顺序？
- 赋值路径是否允许分配、阻塞或跨 task 转移？如何给出 WCET 与错误模型？

**推荐判断**：Frame 保持值语义；DmaLease move-only；含 callback registration 与固定地址身份的 service 通常删除 copy/move assignment，使用显式 `Reconfigure()` / `Stop()` API。不要为“让所有类都能赋值”而引入共享所有权或复杂的 State/Observer 框架。

---

## 本课完成标准

- [ ] 能解释 copy constructor 与 copy assignment 的调用时机差异。
- [ ] 能解释 `operator=` 返回 `T&` 的原因。
- [ ] 能判断 defaulted copy assignment 是否符合成员语义。
- [ ] 能识别 self-assignment、自移动与 raw handle 浅复制风险。
- [ ] 能为唯一资源 owner 设计 move assignment，先处理目标旧资源，再转移 source。
- [ ] 能解释为什么可能失败的设备重配置不应该隐藏在 `operator=`。
- [ ] 主 Lab 与 Exercise 01 分别编译运行，并修复练习中的资源泄漏。

**下一课**：Day 79 · Chapter 9 · *Mastering Classes and Objects*，从原书 p.295 的章节开头继续；生成前先核验该章实际首个小节标题，不根据猜测跳转。
