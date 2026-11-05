# Day 71 · Copy Constructors：复制语义与独立对象边界

> **主教材**：Marc Gregoire，《Professional C++》，Sixth Edition，Chapter 8 · *Gaining Proficiency with Classes and Objects*。
>
> **今日范围**：p.279–280，*Copy Constructors*。严格承接 Day 70 的 constructor initializer list；今天只学习复制构造函数及其成员复制语义，停止在下一小节 *Initializer-List Constructors*（p.281）之前。
>
> **设计模式辅线**：Dmitri Nesteruk，《Design Patterns in Modern C++》。今天以 value semantics、composition 为主；只在“运行时多态对象必须保留动态类型并克隆”这一真实需求下讨论 Prototype，不把普通 copy constructor 包装成模式。
>
> **前置课程**：[Day 70 · 构造函数成员初始化列表与成员顺序](day-070-constructor-initializer-list-member-order.md)；[所有权与智能指针专题](../patterns/ownership-and-smart-pointers.md)。

**今天只解决一个问题：从已有对象创建新对象时，究竟复制了值、共享了资源，还是只复制了一个借用地址？**

**学习目标**

- 能识别 copy constructor 与 copy assignment 的边界。
- 理解隐式 copy constructor 的 memberwise copy，以及每个成员类型决定的复制语义。
- 识别 raw pointer、自引用成员、borrowed view、unique_ptr 与 shared_ptr 的不同复制结果。
- 为 RTOS 消息帧建立有界、可测试、生命周期清晰的 value semantics。

**60 分钟安排**：阅读 6 分钟 → 昨日复习 4 分钟 → 核心概念 14 分钟 → C/C++ 对照 6 分钟 → 设计模式映射 7 分钟 → Embedded 场景 7 分钟 → 规范 4 分钟 → Lab/练习 8 分钟 → 常见坑 2 分钟 → 检查题 2 分钟。

---

## ① 今日章节与建议阅读范围（6 分钟）

**Chapter 8，p.279–280：Copy Constructors。**

建议按以下顺序阅读：

1. copy constructor 的用途与典型声明形式；
2. 从同类型对象创建新对象时，编译器如何选择 copy constructor；
3. compiler-generated copy constructor 的 memberwise copy 行为；
4. 成员自身的复制能力如何影响外层类；
5. pointer member 为什么容易造成浅复制与生命周期问题。

今天不要提前进入 p.281 的 *Initializer-List Constructors*，也不展开后续对象销毁章节。不要把 copy assignment、move constructor 或完整 Rule of Five 当作今天的主线。

阅读时持续追问：

- `T second{first};` 是构造还是赋值？
- 编译器生成的 copy constructor 是逐字节 memcpy 吗？
- 一个成员是 std::array、std::unique_ptr、std::shared_ptr 或 std::span 时，复制结果分别是什么？
- 一个对象的成员指针指向它自己的另一个成员，默认复制后指针会指向谁？

## ② 昨日复习 3 问（4 分钟）

承接 Day 70：

1. **初始化机制**：为什么 const member、reference member 和没有可用默认构造函数的成员，必须在 constructor initializer list 中建立状态？
2. **工程判断**：成员声明顺序为什么同时决定初始化顺序和析构顺序？owner 与 borrower 应如何排列？
3. **代码细节**：如果成员有 default member initializer，而 constructor initializer list 又显式指定该成员，最终使用哪个值？

**快速核对**

- initializer list 是直接初始化，不是 constructor body 中的赋值。
- 成员按声明顺序初始化；析构顺序相反。
- 显式 constructor initializer 覆盖该成员的 default member initializer。

## ③ 核心概念：复制构造函数究竟复制什么（14 分钟）

### 3.1 Copy constructor 是“创建新对象”

典型声明：

~~~cpp
class Frame {
public:
    Frame(const Frame& other);
};
~~~

第一个参数是同类型对象的引用，通常写成 const T&。这样既能从 const 源对象复制，也不会在复制过程中修改源对象。

以下形式会创建新对象并可能调用 copy constructor：

~~~cpp
Frame first;
Frame second{first};       // direct-initialization
Frame third = first;       // copy-initialization

void Consume(Frame frame);
Consume(first);            // 按值传参，需要形成参数对象
~~~

而下面是对已经存在对象进行赋值，不是 copy construction：

~~~cpp
Frame target;
target = first;            // copy assignment，不是今天的阅读范围
~~~

**判断标准**：左侧对象是否正在被创建？如果是新对象，考虑 constructor；如果对象已经存在，考虑 assignment。

### 3.2 隐式 Copy constructor：逐成员复制，不是无条件 memcpy

当类没有自定义复制语义，且相关成员可复制时，编译器可以生成 copy constructor。其核心行为是对 base classes 与 non-static data members 逐成员执行复制，成员顺序遵循类中的声明顺序。

~~~cpp
struct ValueFrame {
    std::array<std::uint8_t, 8U> bytes{};
    std::size_t length{0U};
};

ValueFrame first;
ValueFrame second{first};
~~~

这里的 std::array 是值成员：复制 first 时，second 获得自己的数组元素。它不是让两个对象指向同一段数组。

但不能把 memberwise copy 理解为“所有成员都深复制”：

- 整数、枚举：复制值；
- std::array：复制每个元素；
- std::string / std::vector：调用其自身的复制语义，通常得到独立内容存储，可能产生动态分配；
- raw pointer：复制地址值，不复制指向的对象；
- std::span：复制地址与长度，仍然只是借用视图；
- std::unique_ptr：不可复制，因此包含它的类通常也不能隐式复制；
- std::shared_ptr：复制共享所有权句柄，引用计数增加，但底层对象没有被深复制。

**外层类的复制语义由成员类型共同决定。** C++ 不会猜测 raw pointer 是 owner 还是 borrower。

### 3.3 三种看起来相似、语义完全不同的“复制”

| 成员类型 | 复制后的含义 | 主要风险 / 成本 |
|---|---|---|
| std::array / 固定值成员 | 新对象获得独立元素 | 复制成本 O(N)，N 必须有界 |
| raw pointer / std::span | 新对象复制地址或 view | 源对象/外部资源必须继续存活 |
| std::shared_ptr | 新句柄共享同一对象 | 隐式共享、原子计数成本、teardown 更复杂 |
| std::unique_ptr | 不允许复制 | 明确表达唯一所有权，需另行定义 clone 需求 |

不要把“copy constructor 被调用”误解成“资源一定被复制”。复制的是成员；资源最终如何处理取决于成员类型。

### 3.4 自引用成员：默认复制可能保留旧对象地址

考虑一个类同时保存内部数组和指向该数组的指针：

~~~cpp
class Frame {
private:
    std::array<std::uint8_t, 8U> storage_{};
    std::uint8_t* data_{storage_.data()};
};
~~~

构造第一个对象时，data_ 指向第一个对象的 storage_。如果使用编译器生成的 copy constructor：

- storage_ 的元素被复制到新对象；
- data_ 的指针值也被复制；
- 新对象的 data_ 仍然指向源对象的 storage_，而不是新对象自己的 storage_。

只要源对象还活着，这个错误可能表现为两个对象意外共享数据；源对象销毁后，新对象的 data_ 就可能成为 dangling pointer。

优先修复方式不是增加更多指针管理，而是**删除可推导的自引用指针**，成员函数直接访问 storage_。如果确实需要缓存内部地址，则必须提供自定义 copy constructor，在新对象的成员初始化完成后将指针重新绑定到新对象自己的存储，并单独测试生命周期。

### 3.5 Copy constructor 何时发生，以及编译器优化

常见触发位置：

- 从同类型 lvalue 创建新对象；
- 按值传递参数；
- 某些按值返回对象的场景；
- 容器或算法在需要复制元素时。

但不要仅凭源代码中出现“返回临时对象”就断言一定调用 copy constructor。C++17 起，某些 prvalue 初始化场景具有保证的 copy elision；其他场景也可能发生可选的省略。今天先掌握语义，不做汇编级优化分析。

### 3.6 编译期与运行期成本

- copy constructor 的可用性会影响类型是否可复制，部分错误可在编译期被拒绝。
- 固定容量 std::array 的复制成本与容量成正比，容易建立上界。
- std::vector / std::string 的复制可能分配内存；不能仅凭接口名称认为它适合 ISR 或硬实时路径。
- 自定义 copy constructor 可以执行任意代码；它不是天然的轻量操作。
- 只有当所有成员复制都满足项目的无异常契约时，才应声明 noexcept；不要为了让类型“看起来现代”而盲目添加 noexcept。

## ④ C 写法 vs Modern C++（6 分钟）

### C：结构体复制可能只复制指针字段

~~~c
typedef struct {
    uint8_t* data;
    size_t length;
} frame_t;

frame_t copied = source;  /* data 地址被复制，payload 没有被复制 */
~~~

C 结构体赋值本身不会理解 data 指向的内存由谁拥有。若需要深复制，C API 必须显式提供目标容量、分配策略、失败返回值和释放责任。

若 C struct 使用内嵌固定数组：

~~~c
typedef struct {
    uint8_t data[16];
    size_t length;
} fixed_frame_t;

fixed_frame_t copied = source;  /* 数组成员随结构体一起复制 */
~~~

这同样可以建立值语义，关键是数据布局和资源边界，而不是语言标签。

### Modern C++：用成员类型表达复制语义

~~~cpp
class AtFrame {
public:
    AtFrame(const AtFrame&) noexcept = default;

private:
    std::array<std::uint8_t, 16U> data_{};
    std::size_t length_{0U};
};
~~~

| 维度 | C struct + pointer | Modern C++ value members |
|---|---|---|
| 类型安全 | owner / borrow 常依赖文档约定 | 成员类型表达可复制性与资源语义 |
| 资源管理 | clone/free 协议由调用方遵守 | 成员 RAII 与复制语义组合 |
| 可测试性 | 需分别测试 alias、clone、容量和释放 | 可直接验证复制后两个对象是否独立 |
| 扩展性 | 手工维护 clone 函数和错误码 | 可组合标准库值类型与自定义成员 |
| 成本 | pointer 轻量，但生命周期风险高 | 固定数组复制 O(N)；动态容器可能分配 |

**不要过度现代化**：C ABI、DMA descriptor 或硬件寄存器布局可能必须保留固定 C struct。真正要解决的是 owner / borrow / copy contract，而不是机械地把所有结构体改成 class。

## ⑤ 设计模式映射：默认选择 Value Semantics，而不是模式（7 分钟）

### 真实变化轴与稳定边界

今天的变化轴不是“对象创建算法要切换”，而是**复制后的对象应该独立、共享，还是继续借用**。

对 Modem AT command frame，稳定 contract 通常是：

- 一帧具有明确长度与最大容量；
- 复制一帧后，复制品可独立修改；
- 不允许复制越界或把外部临时缓冲区的生命周期隐藏起来；
- 复制成本有上界，失败语义明确。

因此默认选择：

- composition：Frame 由固定容量数组和长度组成；
- value semantics：复制后拥有独立内容；
- 小接口：Load、SetByte、payload；
- 不额外引入 Strategy、Factory 或 Observer。

### Prototype 什么时候才值得考虑？

如果系统通过 runtime polymorphism 持有不同协议对象，并且调用方必须在不知道具体派生类型的情况下复制对象、保留动态类型，才可能需要 Prototype 风格的 Clone contract。

例如概念上：

~~~cpp
class IProtocol {
public:
    virtual ~IProtocol() = default;
    [[nodiscard]] virtual std::unique_ptr<IProtocol> Clone() const = 0;
};
~~~

这不是普通 copy constructor 的替代拼写，而是一个运行时多态克隆接口。它通常涉及动态分配、owner 返回值、析构策略和失败模型；固定协议集合可优先评估 std::variant，单一固件配置可优先评估模板/概念。

### Ownership / Borrow / Lifetime 决策

- 值成员复制：新对象拥有自己的值；对象生命周期相互独立。
- raw owning pointer 默认复制：两个对象可能声称拥有同一资源，容易 double delete；禁止默认接受这种语义。
- raw borrowed pointer / span 复制：只是复制借用关系，不延长被借用对象的 lifetime。
- 指向自身成员的 pointer 复制：默认复制地址后通常仍指向 source；必须删除冗余 pointer 或在自定义 copy constructor 中重新绑定。
- shared_ptr 复制：共享同一对象，不是复制对象状态；不要用它掩盖“应该独立复制还是共享”的设计决定。

**Pattern 不是目标**：如果一个固定容量值类型的默认 memberwise copy 已经正确，显式声明 `= default` 即可；不需要 Clone、Factory 或 shared_ptr。

## ⑥ Embedded / System Design 场景：Modem AT Frame 与 RTOS Message Queue（7 分钟）

设 Modem Task 组装一条 AT 命令，随后投递给 Tx Task：

~~~text
Command Builder
    │  AtFrame value
    ▼
Bounded Queue
    │  value copy / queue copy
    ▼
Tx Task
    │  HAL write
    ▼
UART / DMA
~~~

工程边界：

- **内存上界**：Frame 使用固定容量数组；每次复制最多复制固定 N 字节，不依赖 heap。
- **CPU / WCET**：复制成本 O(N)，N 由类型容量固定；必须结合目标 MCU、优化级别和队列实现测量。
- **Queue contract**：如果队列按值复制，入队时得到独立快照；若队列只保存 pointer/span，生产者必须保证 payload 在消费完成前存活且不被复用。
- **Borrow contract**：std::span 复制不会延长 buffer lifetime。不要把指向栈上临时数组的 span 放进异步队列。
- **DMA ownership**：复制一个 descriptor 不等于复制 DMA 正在读取的 payload，也不代表 DMA 生命周期结束。必须定义 buffer owner、completion callback、cancel/unregister 和 in-flight drain。
- **线程安全**：copy constructor 不提供同步。一个任务正在修改 source 时，另一个任务同时复制 source 仍可能构成 data race；使用队列所有权交接、互斥或不可变快照。
- **IRQ**：ISR 不应调用可能分配、阻塞或执行无界用户代码的自定义 copy constructor。固定字节数组的复制也要核算长度和 WCET；更大对象优先在任务上下文完成复制。
- **错误传播**：容量超限返回明确失败；本日 Lab 的 Load 在超限时保持旧帧不变，避免半更新状态。
- **可测试性**：host test 验证 copy 后独立修改、空帧、最大长度、max+1 和失败后状态不变；Fake HAL 可验证发送内容。
- **硬件可替换性**：Frame 不暴露 UART handle、DMA channel 或 RTOS queue 类型；平台差异留在 transport adapter。

## ⑦ 今日编码规范（4 分钟）

### MUST 1：Copy constructor 首选 const T&

错误写法：

~~~cpp
Frame(Frame& other);  // 无法从 const Frame 复制
~~~

推荐写法：

~~~cpp
Frame(const Frame& other);
~~~

复制构造通常不应修改源对象。若一个类型故意采用非 const 复制语义，必须有强理由并在 API 中明确；普通 value type 不要这样设计。

### MUST 2：拥有的数据优先用值成员；不要存储可推导的 self pointer

错误写法：

~~~cpp
std::array<std::uint8_t, 16U> storage_{};
std::uint8_t* data_{storage_.data()};  // 默认复制会复制旧对象地址
~~~

推荐写法：

~~~cpp
std::array<std::uint8_t, 16U> storage_{};

[[nodiscard]] std::uint8_t* data() noexcept {
    return storage_.data();
}
~~~

如果 pointer 不是独立状态，就不要把它存成成员。避免自引用指针、隐藏 ownership 与复制后的 dangling borrow。

### SHOULD 3：默认复制正确时显式 default；复制不正确时重新设计成员

错误做法：为每个类都手写 copy constructor，复制所有字段后再猜测 pointer 应如何处理。

推荐做法：

~~~cpp
Frame(const Frame&) noexcept = default;
~~~

只有当成员的默认复制语义不满足类 contract 时才自定义 copy constructor。若包含动态资源，必须同时审查 owner、失败模型、释放责任和后续 assignment / destruction 语义。noexcept 只能在成员复制确实不抛异常时使用。

## ⑧ 可编译 Lab / 练习（8 分钟）

所有源码均为独立编译单元，每个文件有自己的 int main()；不要把多个示例合并成一个编译单元。

### 主 Lab：固定容量 AT Frame 的独立值复制

源码：[examples/day-071/main.cpp](../examples/day-071/main.cpp)

~~~bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic examples/day-071/main.cpp -o day071
./day071
~~~

程序使用 std::array 保存 payload，并显式 default copy constructor。复制后修改 copied 的第一个字节，original 必须保持不变。Load 遇到 max+1 输入时拒绝更新，并保留原状态。

预期输出：

~~~text
original (3 bytes): 65 84 13
copy (3 bytes): 90 84 13
const-reference borrow length=3
by-value parameter length=3
oversized load: rejected, original length=3
~~~

观察点：

- copy constructor 复制的是值成员；
- const-reference 只借用，不创建新 Frame；
- 按值参数形成独立参数对象；
- 容量错误不造成部分更新；
- 没有 heap allocation、shared_ptr 或运行时多态。

### Exercise 01：修复自引用指针导致的错误复制

源码：[examples/day-071/exercise-01.cpp](../examples/day-071/exercise-01.cpp)

~~~bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic examples/day-071/exercise-01.cpp -o day071-ex01
./day071-ex01
~~~

这是完整、可独立编译运行的 starter，包含自己的 int main()。它故意让 data_ 指向对象自己的 storage_，但没有自定义 copy constructor。程序先复制对象，再修改复制品，并输出两个对象的首字节。

Starter 预期输出：

~~~text
source first=90, copy first=90, copy length=1
self-pointer alias detected: yes
~~~

**修复任务**

1. 先解释为什么 storage_ 已经复制到新对象，data_ 却仍然指向 source 的 storage_。
2. 首选删除 data_ 成员，让 SetFirst / First 直接访问 storage_[0U]。
3. 如果你认为缓存 pointer 有充分理由，提供自定义 copy constructor，并在初始化列表中把 data_ 重新绑定到新对象自己的 storage_；解释成员初始化顺序。
4. 保持完整 main()、可观察输出和独立编译能力。
5. 不允许用 shared_ptr、全局 buffer 或 service locator 掩盖生命周期问题。

修复后预期输出：

~~~text
source first=65, copy first=90, copy length=1
self-pointer alias detected: no
~~~

验收标准：复制品修改后 source 不变；源对象销毁前复制品仍能正确访问自己的 storage；所有源码在 C++23 严格警告选项下独立编译。

## ⑨ 3 个常见坑（2 分钟）

1. **把 memberwise copy 当成深复制**：raw pointer 复制的是地址；std::span 复制的是借用视图。先看成员类型，再判断复制语义。
2. **忽略自引用成员**：指向自身数组、内部节点或成员对象的 pointer 可能在默认复制后仍指向 source；优先删除冗余指针。
3. **把复制当作同步或免费操作**：copy constructor 不加锁、不延长 borrow lifetime；动态容器复制可能分配，固定数组复制也有 O(N) 成本，ISR/WCET 必须单独评估。

## ⑩ 检查题（2 分钟）

### Q1 · 语言机制

下面两个操作有什么区别？

~~~cpp
Frame copy{source};
existing = source;
~~~

**答案要点**：第一行创建新对象，调用 copy constructor；第二行对已存在对象赋值，属于 copy assignment。二者的生命周期时点和函数契约不同。

### Q2 · 成员复制语义

一个类分别含有 std::array<std::uint8_t, 16U>、std::span<const std::uint8_t>、std::unique_ptr<Buffer> 与 std::shared_ptr<Buffer>。默认复制分别会发生什么？

**答案要点**：

- std::array：复制元素，目标对象拥有自己的数组；
- std::span：复制地址与长度，仍借用原 buffer，不延长其 lifetime；
- std::unique_ptr：不可复制，外层默认 copy constructor 通常被删除；
- std::shared_ptr：共享同一对象，增加共享所有权，不会深复制 Buffer。

常见误答是把 shared_ptr copy 说成 deep copy，或认为 span copy 后 buffer 会跟着延长生命周期。

### Q3 · Design Review：Modem Command Queue

Command Builder 产生固定最大长度的 AT Frame；Tx Task 通过 RTOS queue 消费。请判断应该使用 value copy、span borrow、shared_ptr，还是 Prototype Clone。

回答必须覆盖：

- 变化轴是什么，稳定 contract 是什么？
- 复制后生产者能否立即复用自己的 buffer？
- queue 保存值还是保存地址？谁拥有 payload？
- 最大复制长度、WCET、线程上下文和 ISR 约束是什么？
- 若以后增加多种协议对象，是否真的需要 runtime Clone，还是 std::variant / template / composition 已足够？

**答案要点**：如果 queue 按值存储固定容量 Frame，入队复制后生产者可安全复用自己的 Frame，消费方拥有独立快照；成本是有界 O(N)。span 仅适用于显式 borrow 且生产者保证 buffer 在消费结束前存活的场景。shared_ptr 只有在确有共享生命周期需求时才考虑；Prototype 只有在需要运行时保留派生类型并克隆时才考虑。固定协议集合优先 value semantics / std::variant，避免无必要的堆分配、引用计数和无界注册。

---

## 下一步

Day 72 沿 Chapter 8 进入 **Initializer-List Constructors**（p.281 起）；今天先把 copy constructor 与成员复制语义掌握扎实，不提前跳到后续章节。

## 参考资料

- [Day 70 · 构造函数成员初始化列表与成员顺序](day-070-constructor-initializer-list-member-order.md)
- [patterns/ownership-and-smart-pointers.md · 所有权、borrow 与智能指针](../patterns/ownership-and-smart-pointers.md)
- [patterns/README.md · 设计模式与稳定边界](../patterns/README.md)
- [Embedded C++ Coding Guideline 学习索引](../guidelines/embedded-cpp-guideline-notes.md)
- [Wiley · Professional C++, Sixth Edition](https://onlinelibrary.wiley.com/doi/book/10.1002/9781394193202)
