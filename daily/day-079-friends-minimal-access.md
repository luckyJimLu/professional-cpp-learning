# Day 79 · Friends：受控访问与最小信任边界

> **日期**：2026-11-19（恢复任务后的补课）  
> **主教材**：Marc Gregoire, *Professional C++, Sixth Edition*（C++23），Chapter 9 · *Mastering Classes and Objects*，从 **Friends** 小节开始。Chapter 9 页码为 p.295–355。  
> **前置课程**：[Day 78 · Assignment Operators](day-078-assignment-operators.md)、[Day 67 · Class Encapsulation](day-067-class-encapsulation-member-functions.md)。  
> **辅教材**：Dmitri Nesteruk, *Design Patterns in Modern C++*；仓库中的 ownership/lifetime 与稳定接口专题。  
> **课程边界**：今天只学习 friend function / friend class 的访问权限语义与设计边界；不提前跳到 Chapter 15 的一般运算符重载。

**今天要回答的问题：当一个外部函数确实需要读取类的内部状态时，应该开放 public getter、提供成员 API，还是授予 friend 权限？如何避免 friend 变成绕过封装的后门？**

**60 分钟安排**：阅读 7 分钟 → 复习 4 分钟 → 概念 14 分钟 → C/C++ 对照 5 分钟 → 设计映射 6 分钟 → Embedded 场景 7 分钟 → 规范 4 分钟 → Lab/练习 9 分钟 → 常见坑 2 分钟 → 检查题 2 分钟。

---

## ① 今日章节与建议阅读范围（7 分钟）

**Chapter 9，Friends 小节**。从本章开头读到 friend functions / friend classes 的定义、声明位置与访问规则；完成本课后暂停，不提前阅读后续 Dynamic Memory Allocation in Objects。

本章主题顺序由原书目录确认：Friends → Dynamic Memory Allocation in Objects → More About Member Functions → constexpr and consteval → Different Kinds of Data Members → Nested Classes → Enumerations Inside Classes → Operator Overloading → Building Stable Interfaces。章节范围为 p.295–355。  
参考目录：[O’Reilly · Professional C++, 6th Edition, Chapter 9](https://www.oreilly.com/library/view/professional-c-6th/9781394193172/c09.xhtml)。

阅读时重点标记：

1. friend function 不是成员函数，但可以访问类的 private / protected 成员；
2. friend 声明可以出现在 class 的任意访问区，但它本身不是 public member；
3. friend class 会把访问权限授予该类的所有成员函数，权限范围明显更大；
4. friendship 不是继承关系，不自动传递，也不具有对称性；
5. friend 应用于紧密协作的边界，而不是替代 public API 或打破封装。

## ② 昨日复习 3 问（4 分钟）

承接 Day 78 的 assignment / ownership 主题：

1. **语义**：copy assignment 与 copy construction 的根本区别是什么？
2. **资源边界**：为什么 DmaLease 这种唯一资源 owner 通常应删除 copy assignment？
3. **工程判断**：如果设备重配置可能超时，为什么更适合 TryConfigure(config, timeout)，而不是隐藏在 operator= 中？

复习要点：赋值目标已经存在；唯一资源不能被 memberwise copy 成两个 owner；可能失败或阻塞的操作应使用具名 API 并显式传播状态。

## ③ 核心概念：Friends（14 分钟）

### 1. Friend function 是非成员函数，但拥有特定访问权限

~~~cpp
class ModemFrame {
public:
    [[nodiscard]] std::size_t length() const noexcept { return length_; }
    friend bool IsValidFrame(const ModemFrame&) noexcept;

private:
    std::array<std::uint8_t, 8> payload_{};
    std::size_t length_{0U};
};

bool IsValidFrame(const ModemFrame& frame) noexcept {
    return frame.length_ <= frame.payload_.size();
}
~~~

IsValidFrame 不是 ModemFrame 的成员函数：它没有隐式 this，调用时也不是 frame.IsValidFrame()。但它可以读取类的 private 成员。

关键区分：

- **成员函数**：属于类的接口，具有隐式对象参数（或显式对象参数），可访问本类私有状态。
- **普通非成员函数**：只能使用 public API。
- **friend 非成员函数**：仍然是非成员函数，但被授予指定类的访问权限。

friend 不会自动把函数加入类的 public API，也不会改变函数的链接属性或调用语法。

### 2. Friend class 的权限范围更大

~~~cpp
class PacketDiagnostics;

class Packet {
    friend class PacketDiagnostics;
private:
    std::array<std::uint8_t, 16> bytes_{};
    std::size_t length_{0U};
};
~~~

PacketDiagnostics 的所有成员函数都可以访问 Packet 的 private / protected 成员。这比授予一个具体 friend function 更宽。

因此，friend class 适用于两个类确实形成紧密实现协作、且需要多个成员共同访问内部表示的场景。若只有一个校验函数需要读两个字段，优先授予单个函数，而不是整个诊断类。

### 3. Friendship 的四条规则

- **不传递**：A friend B，不代表 B 的 friend 也能访问 A。
- **不对称**：A friend B，不代表 A 可以访问 B 的 private。
- **不继承**：派生类不会自动继承基类授予的 friendship。
- **局部授权**：访问权限针对具体类与具体 friend 声明，不是全局开关。

Friend 不是继承、不是组合，也不是“成为朋友后双方互相开放”。

### 4. Friend 与 encapsulation 并不必然冲突

封装的目标不是让所有 private 字段永远不可见，而是控制谁能依赖对象表示、以什么方式依赖、依赖范围有多大。

可以按以下优先级判断：

1. 若调用者只需要稳定业务能力，提供 public member function。
2. 若外部算法需要只读信息，先考虑 const getter、view 或专用查询 API。
3. 若一个非成员操作必须与类的不变量紧密协作，且 public API 会暴露不必要的实现细节，可考虑 friend function。
4. 若整个协作类的多个操作都必须访问内部表示，才考虑 friend class。
5. 若 friend 数量持续增加，说明类边界可能切分不当，或出现了过度耦合。

不要为了一次校验把整个对象的存储布局暴露给外部模块。

### 5. Friend 不是性能优化的默认手段

不要因为“getter 多一次函数调用”就默认使用 friend。优化应由编译器优化、性能测量与接口需求共同决定。小型 getter 通常可以内联；friend 本身不保证更快，也不自动减少拷贝。

## ④ C 写法 vs Modern C++（5 分钟）

### C：结构体字段通常直接暴露

~~~c
#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>

typedef struct {
    uint8_t payload[8];
    size_t length;
} modem_frame_t;

bool modem_frame_is_valid(const modem_frame_t *frame)
{
    return frame != NULL && frame->length <= sizeof(frame->payload);
}
~~~

C 常通过头文件暴露 struct layout。调用方可直接改字段，因此不变量依赖约定、代码审查和测试。

### Modern C++：默认隐藏表示，只授权最小协作点

~~~cpp
class ModemFrame {
public:
    [[nodiscard]] std::size_t length() const noexcept { return length_; }
    friend bool IsValidFrame(const ModemFrame&) noexcept;
private:
    std::array<std::uint8_t, 8> payload_{};
    std::size_t length_{0U};
};
~~~

| 维度 | C struct | Modern C++ class |
|---|---|---|
| 数据访问 | 通常字段可见 | 默认 private，显式控制 |
| 不变量 | 依赖调用约定 | 可将修改限制在成员函数 |
| 外部算法 | 直接读字段 | public API 或窄范围 friend |
| 依赖范围 | include struct 定义后可依赖布局 | friend 依赖内部表示，但授权范围明确 |
| 演进成本 | 字段改动可能影响所有调用方 | 可保持 public contract，局部调整实现 |

## ⑤ 设计模式映射：最小授权、Adapter 与稳定边界（6 分钟）

**真实变化轴**：帧格式与校验规则可能变化；硬件传输层也可能变化。今天不需要引入复杂 Pattern，关键是把“稳定业务接口”与“内部表示访问”区分开。

| 场景 | 推荐方式 | 判断 |
|---|---|---|
| 普通业务调用读取长度 | public const getter | 稳定 API |
| 一个非成员校验算法必须检查多个内部字段 | 单个 friend function | 最小授权 |
| 多个紧密协作操作需要访问表示 | friend class（谨慎） | 授权面较大 |
| 不同 HAL 的寄存器/帧布局不同 | Adapter / HAL boundary | 不要用 friend 把硬件细节扩散到业务层 |
| 多个 friend 才能完成一个简单操作 | 重新审视类职责 | 可能是边界设计问题 |

**为什么不引入 Observer / Strategy / Factory**：本课讨论访问权限，不存在需要运行时替换算法或订阅事件的证据。为了“使用设计模式”而添加接口层，只会增加间接层。

**Ownership / Borrow / Lifetime**：

- friend 不改变对象所有权，也不延长任何对象生命周期。
- 以 const ModemFrame& 接收参数表示借用；函数不得保存引用供调用结束后使用。
- friend function 若启动异步任务，不能把传入引用直接捕获到异步 callback；必须建立明确 owner 或复制必要值。
- 不要让 friend 访问裸句柄后自行释放资源；资源释放仍应由 RAII owner 负责。

设计检查顺序：

~~~text
调用方需要什么能力？
→ public API 是否足够？
→ 是否必须访问内部表示？
→ 授权给一个函数还是整个类？
→ friend 是否引入表示依赖？
→ 是否涉及异步借用、资源释放或线程边界？
~~~

## ⑥ Embedded / System Design：Modem Frame 校验（7 分钟）

设 Modem middleware 接收 AT command frame。帧对象内部维护固定 payload 和 length，要求 length <= capacity。

- **职责边界**：成员函数负责写入并维护不变量；独立的 IsValidFrame 只做只读一致性检查。
- **HAL 隔离**：friend 不应让底层 UART/DMA driver 直接修改业务 Frame 私有字段。驱动只负责收发字节，middleware 负责组帧。
- **内存上界**：固定 std::array，校验只读取长度和容量，不分配内存。
- **WCET**：当前校验是 O(1)；若未来校验 payload CRC，需明确最大长度和最坏执行时间。
- **线程安全**：friend 访问 private 不会自动加锁。若 RX task 与 parser task 并发访问同一 Frame，仍需单一 owner、队列转移或同步。
- **IRQ**：ISR 不应调用会分配或阻塞的诊断函数；可将固定长度事件投递给 task context。
- **错误模型**：校验返回 bool 适合单一有效性判断；若需要区分长度错误、CRC 错误、版本错误，应返回 enum class 状态。
- **可测试性**：host test 通过公开写入 API 构造输入，再调用 friend 校验函数，不需要暴露 private 字段给测试框架。

## ⑦ 今日编码规范（4 分钟）

### MUST 1：优先授予单个 friend function

错误：一个只需要读取两个字段的函数，直接 friend 整个 Diagnostics 类。  
推荐：只声明 friend bool IsValidFrame(const ModemFrame&) noexcept。

### MUST 2：friend 不得成为资源释放旁路

错误：friend 函数直接释放 private DMA handle，绕过 owner 的 teardown 顺序。  
推荐：资源释放由 RAII owner 或明确的 Stop() / Release() API 负责。

### SHOULD 3：异步代码不得保存借来的引用

错误：friend function 把 const Frame& 捕获到延迟执行的 lambda。  
推荐：复制必要的固定容量值，或传递有明确生命周期管理的 owner/token。

## ⑧ 可编译 Lab / 练习（9 分钟）

所有代码均为独立 C++23 程序，包含自己的 int main()。

### 主 Lab：窄范围 friend function

源码：[examples/day-079/main.cpp](../examples/day-079/main.cpp)

~~~bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic examples/day-079/main.cpp -o day079
./day079
~~~

预期输出：

~~~text
set_ok=1 length=2 valid=1
~~~

观察：IsValidFrame 是非成员函数，但可读取 private 字段；调用方仍无法直接修改 payload 或 length。

### Exercise 01：收窄过宽的 friend class 授权

源码：[examples/day-079/exercise-01.cpp](../examples/day-079/exercise-01.cpp)

~~~bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic examples/day-079/exercise-01.cpp -o day079-ex01
./day079-ex01
~~~

Starter 可运行，当前故意把整个 PacketDiagnostics 声明为 friend class。它既能读取内部字段，也能破坏 length 不变量。

预期输出：

~~~text
before=1
after=0 length=5
~~~

**修复任务**：

1. 删除宽范围的 friend class PacketDiagnostics。
2. 把校验操作改成一个独立的 friend function，例如 IsValidPacket(const Packet&) noexcept。
3. 删除能够修改内部字段的 CorruptForDemo；正常诊断代码不应拥有修改权限。
4. 保持 Packet 的 public API 负责维护 length <= capacity。
5. 再次运行，校验始终为 true，且外部诊断代码无法直接修改私有状态。

## ⑨ 3 个常见坑（2 分钟）

1. **把 friend 当成成员函数**：friend function 没有隐式 this，调用方式与普通非成员函数相同。
2. **把 friendship 当成双向/传递授权**：权限不会自动传递、继承或反向授予。
3. **friend class 授权过宽**：一个诊断类获得所有 private 权限后，可能无意中修改不变量或释放资源。

## ⑩ 检查题（2 分钟）

### 知识 / 代码检查

1. friend function 与 public member function 在身份、调用语法和访问权限上有什么区别？
2. A 声明 B 为 friend，B 的派生类或 B 的 friend 是否自动获得 A 的 private 访问权限？解释原因。

### 设计题

Modem middleware 中有 Frame、FrameValidator 和 UartTransport：

- Validator 需要检查 Frame 的 length、payload 和 CRC metadata；
- Transport 只负责搬运字节；
- RX callback 可能异步执行。

请决定应使用 public getter、单个 friend function 还是 friend class。说明谁拥有 Frame、Validator 是否可以保存引用、Transport 是否应该访问 private 字段，以及如何避免 callback dangling reference。

**推荐判断**：先让 Frame 自己维护不变量；Validator 若确实需要组合读取内部表示，可使用单个窄范围 friend function；Transport 不应获得业务对象的私有访问权。异步路径必须传递拥有数据的对象或安全 token，而不是保存短期借用引用。

---

## 本课完成标准

- [ ] 能区分成员函数、普通非成员函数与 friend function。
- [ ] 能解释 friendship 不传递、不对称、不继承。
- [ ] 能比较 friend function 与 friend class 的授权范围。
- [ ] 能判断 public API 是否足够，避免不必要的 friend。
- [ ] 能解释 friend 不改变 ownership / lifetime / thread safety。
- [ ] 主 Lab 与 Exercise 01 分别编译运行，并将过宽授权重构为窄范围 friend。

**下一课**：Day 80 · Chapter 9 · *Dynamic Memory Allocation in Objects*，继续严格按原书章节顺序。
