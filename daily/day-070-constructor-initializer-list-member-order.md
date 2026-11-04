# Day 70 · 构造函数成员初始化列表：直接初始化与成员顺序

> **主教材**：Marc Gregoire，《Professional C++》，Sixth Edition，Chapter 8 · *Gaining Proficiency with Classes and Objects*。
>
> **今日范围**：pp.276–278，*Constructor Initializers aka Ctor-Initializers*。按教材顺序承接 Day 69；下一节 Copy Constructors 从 p.279 起，不在今天提前展开。
>
> **辅教材**：Dmitri Nesteruk，《Design Patterns in Modern C++》。今天只讨论构造期依赖注入、组合与必要时的 Adapter；不为了模式而增加 Factory 或运行时继承层次。
>
> **前置课程**：[Day 68 · 对象存储期、this 与 C++23 显式对象参数](day-068-object-storage-this-explicit-object-parameter.md)；[Day 69 · 对象创建与构造函数](day-069-object-creation-constructors.md)。

**今天只解决一个问题：成员应该在什么时候、按什么顺序、以什么值真正构造出来？**

**学习目标**

- 使用 constructor member-initializer list 直接初始化 base class 与 data members。
- 理解成员初始化顺序由类中的声明顺序决定，而不是由初始化列表书写顺序决定。
- 识别 reference、const、没有默认构造函数的成员为什么必须在初始化列表中初始化。
- 将依赖关系、成员销毁顺序与 Embedded Driver 的 ownership/lifetime 一起设计。

**60 分钟安排**：阅读 6 分钟 → 昨日复习 4 分钟 → 核心概念 15 分钟 → C/C++ 对照 5 分钟 → 设计模式映射 6 分钟 → Embedded 场景 6 分钟 → 规范 4 分钟 → Lab/练习 10 分钟 → 常见坑 2 分钟 → 检查题 2 分钟。

---

## ① 今日章节与建议阅读范围（6 分钟）

**Chapter 8，pp.276–278：Constructor Initializers aka Ctor-Initializers。**

建议按以下顺序阅读：constructor initializer list 的语法；base class 与 non-static data members 的初始化；member declaration order；default member initializer 与 constructor initializer 的优先关系；const/reference/non-default-constructible members 的约束。

阅读时思考：

- 在 constructor body 中赋值，与在 initializer list 中直接初始化，差在哪里？
- 初始化列表写成 A、B、C，但成员声明顺序是 B、A、C，实际按哪种顺序？
- 一个成员借用另一个成员时，声明顺序会如何影响构造和析构？
- 如果成员有 in-class default member initializer，显式指定时哪个值生效？

今天不提前跳到 p.279 的 Copy Constructors，也不展开 assignment operator。

## ② 昨日复习 3 问（4 分钟）

承接 Day 69：

1. **对象不变量**：构造函数正常返回时，对象必须满足什么条件？为什么不能把“调用者稍后记得 Init”当作默认安全策略？
2. **工程判断**：为什么 UART Driver 的硬件探测、无界等待和 callback 注册应放在显式 Start/Init，而不是 constructor body？
3. **代码细节**：类已经声明参数化构造函数后，编译器是否还会自动提供无参默认构造函数？如果仍有合法默认状态，应如何表达？

复习检查点：constructor 建立对象初始合法状态；可失败硬件动作使用显式 Status/timeout；默认构造函数是否存在必须由真实 API 决定。

## ③ 核心概念：initializer list 是初始化，不是赋值（15 分钟）

### 1. 基本语法

constructor initializer list 写在参数列表之后、函数体之前：

~~~cpp
class UartDriver {
public:
    UartDriver(IUartHal& hal,
               UartChannel channel,
               std::uint32_t baud_rate) noexcept
        : hal_{hal},
          channel_{channel},
          baud_rate_{baud_rate},
          tx_buffer_{},
          ready_{false} {}

private:
    IUartHal& hal_;
    const UartChannel channel_;
    const std::uint32_t baud_rate_;
    std::array<std::uint8_t, 16U> tx_buffer_;
    bool ready_;
};
~~~

hal_ 在构造时绑定到传入的 HAL；channel_ 与 baud_rate_ 出生时就获得确定值；tx_buffer_ 直接构造成固定容量缓冲区；ready_ 直接初始化为 false。initializer list 决定成员如何开始自己的生命周期。

### 2. 直接初始化 vs 先默认构造再赋值

不推荐：

~~~cpp
class DmaChannel {
public:
    DmaChannel(DmaChannelId channel, std::size_t capacity) noexcept {
        channel_ = channel;
        buffer_ = DmaBuffer{capacity};
    }

private:
    DmaChannelId channel_{DmaChannelId::kDma1};
    DmaBuffer buffer_{};
};
~~~

这段代码先构造默认状态，再在 constructor body 中赋新值。对资源对象而言，可能产生多余初始化、复制/赋值或资源操作；对 const/reference member 和不可默认构造成员，这种写法无法表达所需语义。

推荐：

~~~cpp
class DmaChannel {
public:
    DmaChannel(DmaChannelId channel, std::size_t capacity) noexcept
        : channel_{channel},
          buffer_{capacity} {}

private:
    const DmaChannelId channel_;
    const DmaBuffer buffer_;
};
~~~

对象从创建开始就拥有最终配置。若配置不应在对象生命周期中变化，const 还能把设计意图落实到类型系统。

### 3. 真正的初始化顺序由成员声明顺序决定

C++ 的初始化顺序是：

1. virtual base classes；
2. direct base classes，按 base-specifier list 顺序；
3. non-static data members，按它们在 class 中的声明顺序；
4. constructor body。

例如：

~~~cpp
class Device {
public:
    Device() noexcept
        : second_{2},
          first_{1} {}

private:
    int first_;
    int second_;
};
~~~

实际仍然先初始化 first_，再初始化 second_。编译器通常会给出 reorder warning；不要依赖初始化列表的视觉顺序。**initializer list 应按成员声明顺序书写。**

### 4. default member initializer 与 constructor initializer

~~~cpp
class RetryPolicy {
public:
    RetryPolicy() noexcept = default;

    explicit RetryPolicy(std::uint8_t retries) noexcept
        : retries_{retries} {}

private:
    std::uint8_t retries_{3U};
};
~~~

默认构造路径没有在 initializer list 指定 retries_，因此使用 in-class default member initializer 的 3；参数化构造路径显式初始化 retries_，因此使用传入值。constructor initializer 对同一成员的显式初始化优先于 default member initializer。

如果成员既没有 initializer list 初始化，也没有 default member initializer，标量成员可能处于 indeterminate state。不要把“存储已经分配”误认为“每个成员都已有安全值”。

### 5. 哪些成员必须在 initializer list 中初始化？

- **reference member**：必须在创建时绑定，不能先留空再赋值；
- **const data member**：构造完成后不可再赋值；
- **没有可用默认构造函数的成员**：无法先默认构造再在 body 中替换；
- **base class**：通过 base mem-initializer 明确选择构造方式；
- **资源成员**：需要避免多余默认构造/赋值时，应直接构造最终资源状态。

### 6. 初始化顺序也是 lifetime 与 teardown 设计

假设 TransferEngine 借用 DmaBuffer：

~~~cpp
class TransferEngine {
public:
    explicit TransferEngine(DmaBuffer& buffer) noexcept
        : buffer_{buffer} {}

private:
    DmaBuffer& buffer_;
};

class ModemDma {
private:
    DmaBuffer buffer_;
    TransferEngine transfer_;
};
~~~

buffer_ 先构造，transfer_ 后构造；销毁时顺序相反，transfer_ 先销毁，再销毁 buffer_。这满足 borrower 先 teardown、owner 后销毁的要求。

**成员声明顺序同时决定初始化顺序与析构顺序**，因此它是 ownership/lifetime 设计的一部分，不只是代码格式。

### 7. 编译期与运行期成本

- initializer list 本身不引入 heap allocation、vtable 或 reference counting；
- 直接构造通常避免不必要的默认构造与赋值；
- 具体成本取决于成员类型的 constructor，而不是 initializer list 这个语法；
- 固定容量 std::array 的存储随对象布局确定，适合可审计的 Driver；
- 如果 constructor 里调用硬件、等待锁或注册 callback，仍然会引入相应运行期开销。

注意：constructor initializer list 与 std::initializer_list<T> 是两个不同概念。前者是对象初始化语法；后者是标准库提供的只读列表类型。

## ④ C 写法 vs Modern C++（5 分钟）

### C：显式 init 函数

~~~c
typedef struct {
    uint8_t channel;
    size_t capacity;
    uint8_t storage[64];
} dma_channel_t;

int dma_channel_init(dma_channel_t* channel,
                     uint8_t id,
                     size_t capacity) {
    if (channel == NULL || capacity > sizeof(channel->storage)) {
        return -1;
    }

    channel->channel = id;
    channel->capacity = capacity;
    return 0;
}
~~~

C 可以通过 opaque handle、私有实现文件和 init/deinit 协议建立边界，但调用者必须遵守初始化顺序；公开结构体时也可能绕过协议。

### Modern C++：在对象创建点完成直接初始化

~~~cpp
class DmaChannel {
public:
    DmaChannel(DmaChannelId channel, std::size_t capacity) noexcept
        : channel_{channel},
          buffer_{capacity} {}

private:
    const DmaChannelId channel_;
    const DmaBuffer buffer_;
};
~~~

| 维度 | C struct + init | Modern C++ initializer list |
|---|---|---|
| 类型安全 | 可用 opaque handle 强化，但依赖 API 约定 | const/reference/成员类型直接参与约束 |
| 资源管理 | init/deinit 配对由调用方遵守 | 成员生命周期自动纳入对象生命周期 |
| 可测试性 | 需测试 init 前后状态和重复调用 | 可直接测试构造路径及成员不变量 |
| 扩展性 | 函数表、opaque handle、平台封装 | composition、构造注入、模板/概念 |
| 成本 | 简单、适合 C ABI | 可减少默认构造/赋值；无隐含 heap |

不要为了“现代化”把所有 C struct 都改成 class。跨 ABI 的固定布局数据仍可保留 C struct；当对象需要隐藏状态、约束生命周期和建立不变量时，再使用 C++ class。

## ⑤ 设计模式映射：先确定依赖变化发生在哪里（6 分钟）

### 真实变化轴

今天的变化不是“算法要运行时切换”，而是 **Driver 依赖的 HAL 实现可能因板卡或测试环境而变化**：

- 生产固件：STM32 / NuttX / RTOS HAL；
- host test：FakeUartHal；
- 旧厂商 SDK：C 风格 uart_write / uart_configure 函数。

稳定边界是 Driver 所需的最小能力：Configure、Write、错误语义、容量与线程上下文契约。

### Pattern 与 C++ 机制选择

- **Composition + 显式依赖注入**：Driver 构造时接收 HAL，不从全局 service locator 取依赖。
- **Adapter**：厂商 C API 与 Driver contract 不一致时，用薄 Adapter 做参数、错误码和单位转换；如果 API 已经一致，不额外套一层。
- **模板 + concept（本日 Lab）**：一个固件构建只选择一个 HAL 实现，且不需要运行时替换时，compile-time DI 可以避免 virtual dispatch。
- **runtime interface**：只有运行时确实需要替换设备、插件或独立 ABI 时才考虑；评估 vptr、dispatch、对象数量和 teardown。
- **不使用 Factory / Strategy**：当前只有固定 HAL 类型与固定 Driver 行为；Factory/Strategy 不隔离真实变化，只会增加创建层和间接调用。

### Ownership / Borrow / Lifetime

- Board Composition Root owns HAL 与 Driver；
- Driver 通过 Hal& borrow HAL，HAL 必须比 Driver 活得更久；
- 若 Driver 内部某个成员 borrow 另一个成员，owner member 必须先声明，使 borrower 后构造、先销毁；
- 不因模板或 Adapter 引入 shared_ptr；
- 若未来加入 callback，必须定义 unregister/cancel、in-flight drain、执行线程和析构顺序。

设计判断链：需求变化 → 识别变化轴 → 找到稳定 contract → 选择语言机制 → 判断 Pattern 是否必要 → 明确 owner/borrow/lifetime → 检查实时约束。

## ⑥ Embedded / System Design 场景：UART DMA Driver（6 分钟）

本日 Lab 使用固定 16 字节 tx_buffer_：

- **内存上界**：缓冲区固定在 Driver 对象内，无运行时扩容和 heap allocation；
- **CPU 上界**：复制成本为 O(n)，且 n 最大为 16；生产实现仍需按最大帧长、总线速率和 WCET 测量；
- **HAL 隔离**：Driver 只依赖 Configure/Write contract，厂商寄存器与 RTOS handle 留在 adapter 内；
- **错误传播**：not-ready、invalid-argument、too-large 使用显式 Status；真实设备错误应保留具体原因；
- **timeout**：本 Lab 的 Fake Write 立即返回；真实 blocking Write 必须显式接收 timeout，并定义超时后 DMA/缓冲区是否仍被硬件引用；
- **线程安全**：明确一个 owner task 负责 Configure/Send/Stop；若多任务共享，使用消息队列或明确同步；
- **IRQ**：ISR 不创建对象、不分配内存、不调用可能阻塞的高层 Send；只采集硬件状态并投递有界事件；
- **callback teardown**：若 DMA completion callback 保存 Driver 指针，Stop 必须先阻止新回调，再 unregister/cancel，等待 in-flight callback 结束，最后销毁 Driver；
- **可测试性**：Fake HAL 可验证配置、发送长度、错误传播和最大容量；硬件替换不需要改变协议层。

构造期只绑定依赖、配置和固定存储；硬件启动仍由显式 Initialize/Start 在允许的任务上下文执行。

## ⑦ 今日编码规范（4 分钟）

### MUST 1：成员在 initializer list 中直接初始化

错误写法：

~~~cpp
DmaChannel(DmaChannelId channel, std::size_t capacity) noexcept {
    channel_ = channel;
    buffer_ = DmaBuffer{capacity};
}
~~~

推荐写法：

~~~cpp
DmaChannel(DmaChannelId channel, std::size_t capacity) noexcept
    : channel_{channel},
      buffer_{capacity} {}
~~~

尤其是 const、reference、不可默认构造成员，必须在初始化阶段建立正确状态。

### MUST 2：initializer list 顺序必须匹配成员声明顺序

错误写法：成员声明为 buffer_、channel_，initializer list 却先写 channel_ 再写 buffer_，并让一个成员的初始化表达式依赖另一个成员。

推荐写法：先设计依赖关系，再按 owner → borrower 的顺序声明成员；initializer list 也按同样顺序书写。编译器的 -Wreorder 警告必须清零。

### SHOULD 3：用 default member initializer 表达稳定默认值

错误写法：遗漏标量成员初始化，寄希望于“调用方总会先设置”。

推荐写法：对真正有合法默认值的成员提供 in-class initializer；构造函数有特殊配置时再由 initializer list 覆盖。不要用伪造默认值掩盖必需依赖。

## ⑧ 可编译 Lab / 练习（10 分钟）

### 主 Lab：用 concept 注入 HAL，并直接初始化 Driver 成员

源码：[examples/day-070/main.cpp](../examples/day-070/main.cpp)

~~~bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic examples/day-070/main.cpp -o day070
./day070
~~~

程序使用 UartHal concept 约束 HAL contract，UartDriver 通过模板参数在编译期绑定 FakeUartHal。Driver 的 HAL 引用、const channel、baud rate、固定发送缓冲区和 ready 状态全部在 initializer list 中直接初始化。

预期输出：

~~~text
initialize: ok, channel=UART2, baud=921600
send 4 bytes: ok, HAL received=4
send 17 bytes: too large, HAL received=4
~~~

观察点：构造 Driver 不会分配 heap，也不会访问硬件；Initialize 才调用 HAL；16 字节容量上限由类型布局与 API 检查共同表达；17 字节请求被拒绝，Fake HAL 的已接收字节数保持 4。

### Exercise 01：Code Review 修复“默认构造后再赋值”

源码：[examples/day-070/exercise-01.cpp](../examples/day-070/exercise-01.cpp)

~~~bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic examples/day-070/exercise-01.cpp -o day070-ex01
./day070-ex01
~~~

这是完整、可独立编译运行的 starter，包含自己的 int main()。它故意使用 constructor body 给 channel_ 和 buffer_ 赋值，并通过计数器暴露多余操作。

Starter 预期输出：

~~~text
DMA2 capacity=32
DmaBuffer constructions: default=1, sized=1, copy assignments=1
~~~

请直接修改该独立文件：

1. 把 channel_ 与 buffer_ 移到 constructor initializer list；
2. 如果对象配置不允许构造后修改，将它们改成 const member；
3. 删除不再需要的默认构造/赋值路径，但不要引入 heap、shared_ptr 或 Factory；
4. 确保 initializer list 顺序与成员声明顺序一致；
5. 保持完整 main() 和可观察输出。

重构后预期：

~~~text
DMA2 capacity=32
DmaBuffer constructions: default=0, sized=1, copy assignments=0
~~~

验收标准：同一个 .cpp 文件独立编译运行；输出证明 buffer 只进行一次 sized construction，没有 default construction 和 copy assignment。

## ⑨ 3 个常见坑（2 分钟）

1. **把 initializer list 顺序当成实际初始化顺序**：真正顺序由成员声明决定；依赖关系必须通过声明顺序表达。
2. **把借用成员当作普通值成员**：reference member 绑定的是外部对象，不拥有它；必须保证 borrower 不超过 owner 生命周期。内部 owner/borrower 成员还要利用“先构造、后销毁”顺序。
3. **把直接初始化误解为实时安全保证**：initializer list 不自动消除 constructor 中的阻塞、动态分配或硬件访问；实时路径仍需审计容量、timeout、锁、IRQ 与 WCET。

## ⑩ 检查题（2 分钟）

### Q1 · 语言规则

成员声明顺序为：

~~~cpp
int first_;
int second_;
~~~

initializer list 写成：

~~~cpp
: second_{2}, first_{1}
~~~

实际先初始化哪个成员？为什么必须按声明顺序整理 initializer list？

**答案要点**：first_ 先初始化；成员初始化顺序由声明顺序决定。initializer list 应保持相同顺序，以免误读依赖并消除 reorder warning。

### Q2 · 代码判断

一个 class 含有 const Channel channel_、Hal& hal_ 和一个没有默认构造函数的 DmaBuffer buffer_。是否可以在 constructor body 中逐个赋值？

**答案要点**：不可以。const member、reference member 和不可默认构造成员都需要在构造阶段初始化。使用 initializer list 直接绑定/构造。

### Q3 · 设计题

一个产品固件只使用固定 UART HAL，host test 使用 Fake HAL；Driver 内部的 TransferEngine 借用 DmaBuffer。请判断使用 composition、compile-time template/concept、runtime virtual interface、Adapter、Factory 中哪些必要，并画出 owner/borrow 关系。

**答案要点**：Composition Root owns HAL、DmaBuffer 与 Driver；Driver borrow HAL；TransferEngine borrow DmaBuffer；DmaBuffer 应在 TransferEngine 之前声明，使其先构造、后销毁；固件构建期已确定 HAL 时 template/concept 足够；厂商 C API 不匹配 contract 时才使用 Adapter；没有多产品族创建需求，不需要 Factory；callback/IRQ、timeout、线程上下文和最大缓冲区容量必须写入 contract。

---

## 下一课

Day 71 沿 Chapter 8 继续进入 **Copy Constructors**（p.279 起，按教材实际小节标题和顺序确认）。今天只掌握对象构造阶段的直接初始化与成员顺序，不提前跳到 copy/move semantics。

## 参考资料

- [Day 69 · 对象创建与构造函数](day-069-object-creation-constructors.md)
- [patterns/README.md · 设计模式与稳定边界](../patterns/README.md)
- [patterns/ownership-and-smart-pointers.md](../patterns/ownership-and-smart-pointers.md)
- [Embedded C++ Coding Guideline 学习索引](../guidelines/embedded-cpp-guideline-notes.md)
- [Wiley · Professional C++, Sixth Edition](https://onlinelibrary.wiley.com/doi/book/10.1002/9781394193202)
