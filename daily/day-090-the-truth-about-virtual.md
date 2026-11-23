# Day 90 · The Truth about virtual：vtable 心智模型、动态分派成本与虚析构边界

> **主教材**：Marc Gregoire, *Professional C++, Sixth Edition*（C++23），Chapter 10 · Discovering Inheritance Techniques。  
> **辅教材**：Dmitri Nesteruk, *Design Patterns in Modern C++*；本课只把 Strategy 作为 virtual 的设计意图映射，并参考仓库 [Strategy 行为模式](../patterns/03-behavioral-patterns.md#策略strategy) 与 [Ownership / Smart Pointers](../patterns/ownership-and-smart-pointers.md)。  
> **本课边界**：解释虚函数的典型实现模型、运行成本与析构契约；不把 vtable/vptr 当成标准规定的对象布局，也不提前展开下一节 Preventing Overriding。  
> **预计用时**：60 分钟。

## ① 今日章节与建议阅读范围（约 7 分钟）

沿 Chapter 10 的原书顺序，Day 89 已完成 **Overriding Member Functions**。今天继续下一节：

- **Chapter 10 · Discovering Inheritance Techniques**
- 今日小节：**The Truth about virtual**
  - Hiding Instead of Overriding：回顾 Day 89 的 base-view 现象
  - How virtual Is Implemented：动态分派的典型实现模型
  - The Justification for virtual：虚函数的运行时与对象空间成本
  - The Need for virtual Destructors：多态销毁契约
- **建议阅读：pp.366–369**。读完 The Need for virtual Destructors 即可；下一节 **Preventing Overriding** 从 p.370 开始，留给 Day 91。
- 阅读时回答三个问题：调用点何时需要动态选择？典型 ABI 如何实现？谁有权通过基类销毁派生对象？

**60 分钟安排**：阅读 7 分钟 → 昨日复习 5 分钟 → vtable / 成本 / 析构机制 18 分钟 → Strategy 与 Embedded 边界 12 分钟 → Lab / 修复练习 13 分钟 → 检查题 5 分钟。

## ② 昨日复习 3 问（约 5 分钟）

1. Day 89 中，基类的 Write() 若不是 virtual，派生类声明同名 Write() 后，通过 ByteTransport& 调用会发生什么？
2. override 能保证什么，又不能保证什么？
3. ModemSender 保存 ByteTransport& 时，谁拥有 UART / USB 对象？如果要通过 std::unique_ptr<ByteTransport> 销毁派生对象，基类析构应如何声明？

**复习要点：**

- 非 virtual 的同名派生函数只是隐藏基类成员，不会建立动态重写契约。
- override 让编译器检查重写签名；它不证明派生实现满足 timeout、容量、错误语义或 Liskov Substitution Principle。
- ModemSender 借用 transport；composition root 拥有具体对象。允许通过基类 owner 销毁派生对象时，基类析构必须是 public virtual。

## ③ 核心概念：动态分派如何工作，以及成本在哪里（约 12 分钟）

### 3.1 Static Binding 与 Dynamic Binding

非虚函数的调用目标由静态类型与重载决议确定。基类函数声明为 virtual 后，程序才建立“通过基类接口调用时，按对象动态类型选择最终重写”的语义。

~~~cpp
class ByteTransport {
 public:
  virtual ~ByteTransport() = default;
  virtual Status Write(std::span<const std::byte> bytes) noexcept = 0;
};

class UartTransport final : public ByteTransport {
 public:
  Status Write(std::span<const std::byte> bytes) noexcept override;
};

UsbTransport usb;
ByteTransport& selected = usb;
selected.Write(frame);  // 通过 base reference 调用最终重写
~~~

这里要分清：

- **静态类型** ByteTransport&：决定调用点可见哪些成员。
- **动态类型** UsbTransport：决定 virtual 调用的最终重写实现。
- 动态分派不会把 UsbTransport 独有的成员加入 ByteTransport API；它只决定执行哪个实现。
- 如果编译器在调用点已经证明最终类型唯一，便可能把 virtual call 去虚化（devirtualization），生成直接调用。优化不改变语言语义。

### 3.2 vtable / vptr：有用的实现模型，不是标准保证

常见 ABI 会使用以下结构实现动态分派：

- **vtable**：每个多态类通常有一张虚函数表，保存对应虚函数最终实现的入口。
- **vptr**：多态对象通常保存一个指向相应虚函数表的隐藏指针。
- 经 Base& / Base* 调用 virtual 时，编译器生成通过对象动态分派信息找到最终实现的代码。

~~~text
ByteTransport&  selected
       |
       v
   对象中的 vptr
       |
       v
 UartTransport 的 vtable
       |
       +---- Write -> UartTransport::Write
       +---- ~Base -> UartTransport 的析构链
~~~

**重要边界：C++ 标准规定 virtual call 的行为，不规定必须使用 vtable、vptr，也不规定它们的布局。** 具体对象布局、表项、thunk、RTTI 组织方式属于编译器 / ABI 实现细节。多重继承、虚继承和跨 ABI 场景还可能更复杂。

因此：

- 可以用 vtable / vptr 建立心智模型。
- 不要把某个编译器的对象内存布局写进业务协议、持久化格式或跨编译器 ABI。
- 不要断言“每个 virtual 对象一定多 8 字节”；实际大小受目标 ABI、对齐、继承结构和编译器影响。

### 3.3 virtual 的成本不是一个固定数字

需要评估的成本至少有四类：

1. **调用成本**：可能多一次间接加载和间接分支；分支预测、缓存、目标 CPU 都会影响实际延迟。
2. **对象空间**：常见 ABI 会在多态对象中保存隐藏指针；对象数量很大时，单对象增量可能累积成显著 RAM 成本。
3. **代码与只读数据**：虚函数表、重写实现、链接与重定位可能增加 Flash / image size。
4. **优化机会**：间接调用可能妨碍内联；若编译器能证明动态类型，LTO / 优化器可能去虚化。

不要从“virtual 一定很慢”或“现代 CPU 下 virtual 免费”开始设计。正确做法是：

- 先确认是否真的需要运行时替换。
- 在目标编译器、目标优化级别、真实调用频率和真实硬件上测量。
- 检查 map / disassembly / cycle counter；把间接调用、缓存、锁、DMA 提交和错误路径分开评估。
- 对百万级小对象、紧凑数组或高频数值循环，额外对象空间和间接访问值得认真审查；对低频的设备初始化与 transport 适配，通常不应为了消除一个 virtual 而牺牲清晰边界。

**virtual 不会自动执行 new，也不会自动引入 heap allocation。** 栈对象、静态对象和成员对象同样可以有 virtual function。

### 3.4 为什么多态基类需要正确的析构策略

如果允许调用者通过 Base* 或 std::unique_ptr<Base> 销毁 Derived 对象，基类析构必须是 public virtual：

~~~cpp
class ByteTransport {
 public:
  virtual ~ByteTransport() = default;
  virtual Status Write(std::span<const std::byte>) noexcept = 0;
};
~~~

若基类析构是 public non-virtual，却通过 Base* 执行 delete，而实际对象是 Derived，行为未定义。不能把“通常只调用了 Base 析构”当作可依赖的结果；派生对象的资源成员也可能无法按预期释放。

另一种合法设计是：**明确禁止通过基类销毁对象**。此时可以使用 protected non-virtual destructor，让调用者只能借用基类接口，而不能对 Base* 执行 delete。接口必须把这个限制表达清楚。

判断规则：

| 使用方式 | 基类析构策略 |
|---|---|
| 允许 delete Base* / std::unique_ptr<Base> 管理派生对象 | public virtual destructor |
| 基类仅用于借用，不允许调用者通过 Base 销毁对象 | protected non-virtual destructor 可行 |
| 具体类标记 final，且不会作为可派生基类 | 通常不需要为派生销毁而引入 virtual destructor |

析构策略与对象是否动态分配是两回事：一个栈上创建的派生对象也可以经基类引用借用；一个堆上创建的具体类型也可以由 std::unique_ptr<Derived> 管理。

### 3.5 运行时多态 vs 编译期多态

固定固件配置可以用模板 / concept 表达静态策略：

~~~cpp
template <typename T>
concept ByteTransportLike = requires(
    T& transport,
    std::span<const std::byte> bytes,
    std::chrono::milliseconds timeout) {
  { transport.Write(bytes, timeout) } -> std::same_as<Status>;
};

template <ByteTransportLike T>
[[nodiscard]] Status SendStatic(
    T& transport,
    std::span<const std::byte> bytes,
    std::chrono::milliseconds timeout) noexcept {
  return transport.Write(bytes, timeout);
}
~~~

| 维度 | virtual / runtime interface | template / concept |
|---|---|---|
| 类型选择 | 运行时通过基类接口选择最终实现 | 编译期确定具体类型 |
| 异构对象 | 可通过同一基类接口处理不同派生对象 | 通常每种类型生成不同实例 |
| 调用优化 | 可能间接分派，也可能去虚化 | 通常更容易内联 |
| 代价 | 对象 / vtable / 间接分派及 ABI 边界 | 模板实例化、编译时间和潜在 Flash 代码膨胀 |
| 适合场景 | 启动期选择 UART / USB、Host Fake、运行时插件 | 固定板型、固定驱动、编译期策略 |

不要把 static polymorphism 当成无成本，也不要为了避免一个 virtual 把整个 Middleware 模板化。

## ④ C 写法 vs Modern C++（约 7 分钟）

### 4.1 C：手工函数表与 context

~~~c
#include <stddef.h>
#include <stdint.h>

typedef int transport_status_t;

struct transport;
typedef transport_status_t (*transport_write_fn)(
    void* context,
    const uint8_t* bytes,
    size_t size,
    uint32_t timeout_ms);

struct transport_ops {
  transport_write_fn write;
};

struct transport {
  void* context;
  const struct transport_ops* ops;
};

static transport_status_t transport_write(
    struct transport* self,
    const uint8_t* bytes,
    size_t size,
    uint32_t timeout_ms) {
  return self->ops->write(self->context, bytes, size, timeout_ms);
}
~~~

C 函数表本质上也能实现动态分派：调用者通过 ops 找到具体函数，通过 context 找到具体对象状态。代价是函数表、context 类型、初始化顺序、空指针检查和资源销毁规则都需要团队手工维护。

### 4.2 Modern C++：语言提供重写与销毁契约

~~~cpp
class ByteTransport {
 public:
  virtual ~ByteTransport() = default;

  [[nodiscard]] virtual Status Write(
      std::span<const std::byte> bytes,
      std::chrono::milliseconds timeout) noexcept = 0;
};

class UartTransport final : public ByteTransport {
 public:
  [[nodiscard]] Status Write(
      std::span<const std::byte> bytes,
      std::chrono::milliseconds timeout) noexcept override;
};
~~~

| 维度 | C 函数表 | Modern C++ virtual |
|---|---|---|
| 类型安全 | 函数指针签名明确，但 context 常依赖 void* | 基类 / 派生类签名由编译器检查，override 锁定重写关系 |
| 分派机制 | 显式读取 ops 函数指针 | 语言定义 virtual call 语义，常见 ABI 使用 vtable |
| 资源管理 | owner / context / release 通常手工约定 | RAII、unique_ptr、引用分别表达 owner 与 borrow |
| 可测试性 | 注入 Fake ops 与 Fake context | 注入 Fake 派生类，复用相同接口契约 |
| 二进制边界 | C ABI 通常更适合跨语言 / 稳定插件边界，但仍需版本化 | C++ 虚接口布局受编译器 / ABI 影响，不能假定跨工具链稳定 |
| 成本 | 函数表、context 与间接调用 | 可能有对象元数据、间接调用和 vtable；需要目标平台测量 |

**工程判断：** C++ virtual 减少了手工分派与类型擦除的样板，但不会替你设计 ownership、ABI 版本、线程安全或实时预算。

## ⑤ 设计模式映射：Strategy 是意图，virtual 是一种实现（约 6 分钟）

今天不新增一个模式。继续使用 Day 89 的 **Strategy**，但把重点从“如何 override”转到“为何需要运行时分派、成本是否值得”。

### 5.1 真实变化轴与稳定边界

Modem Middleware 的发送语义保持稳定，底层 transport 可变化：

- 产品 A：UART。
- 产品 B：USB CDC。
- Host test：Fake transport。
- Linux 版本：如果确有需求，可在受控边界加载插件。

稳定契约是 Write 的输入 buffer、timeout、错误语义、最大 payload、调用上下文和 buffer 生命周期。变化轴是具体 transport 的实现方式。

### 5.2 Strategy 的实现选择

- **运行时替换真实存在**：使用 ByteTransport virtual interface；由 composition root 在启动时选择 UART / USB / Fake。
- **固件构建期固定**：直接组合具体类型，或用 template / concept 做静态策略。
- **只有一个实现且没有替换 / 测试需求**：保持简单，不要为了“未来可扩展”创建虚接口。

Strategy 的意图不是“必须有 vtable”，而是把可变化的行为隔离在稳定契约后面。函数对象、模板、virtual 都可以承载策略；按变化发生的时间选择实现机制。

### 5.3 Ownership / Borrow / Lifetime

- composition root 拥有 UartTransport / UsbTransport。
- ModemSender 保存 ByteTransport&，只借用，不负责 delete。
- transport 先构造，sender 后构造；销毁顺序相反。
- 若策略由 std::unique_ptr<ByteTransport> 拥有，基类必须允许安全的多态销毁，即 public virtual destructor。
- 不因为 virtual 就引入 shared_ptr；只有确实存在多个独立 owner 时才讨论共享所有权。

### 5.4 不需要的模式与过度设计

- 不需要 Factory：只有一个启动期配置分支时，composition root 直接构造即可。
- 不需要 Observer：今天没有异步事件订阅需求。
- 不需要 Decorator：没有独立变化的日志 / 加密 / 计量行为需要动态叠加。
- 不需要 Service Locator：required dependency 应显式注入。
- 不需要无界插件注册：若 Linux 版本真的支持插件，必须定义最大数量、注册 / 注销、并发访问、卸载前 drain 和 ABI 版本；RTOS 固件优先静态注册表或编译期配置。

## ⑥ Embedded / System Design：Modem Transport 的实时预算（约 6 分钟）

~~~text
Composition Root
  ├── owns UartTransport / UsbTransport
  └── constructs ModemSender
                 |
                 | borrows ByteTransport&
                 v
            ByteTransport
              /      \
             v        v
          UART HAL   USB CDC
~~~

### 6.1 调用上下文与 WCET

- **Task context**：Write 的接口契约必须写清允许由哪个 task 调用；多任务共享时定义单 owner task 或明确的串行化策略。
- **ISR**：不是 virtual 语法本身禁止 ISR 调用；真正的限制是目标实现是否会阻塞、取锁、分配、等待 DMA 或执行无界工作。常见做法是 ISR 只写入固定容量事件队列，由 ModemTask 执行发送。
- **Timeout**：继续使用 std::chrono::milliseconds；HAL 转换为 RTOS tick 时检查溢出、舍入与最大等待值。
- **内存**：本课 Lab 使用栈对象与固定 std::array；发送热路径不分配 heap。若改用动态策略注册，必须限制注册容量和初始化时机。
- **WCET**：测量目标 MCU 上的 indirect call、cache / flash wait-state、锁、DMA 提交与失败路径；不要用 Host 的 std::cout benchmark 代表实时性能。
- **并发**：virtual 不提供线程安全。若 UART 只能由 ModemTask 访问，其他 task 必须通过消息队列提交请求。
- **Buffer lifetime**：同步 Write 中 span 默认只借用到函数返回；如果 HAL 将 buffer 交给 DMA 异步读取，必须由 owner 保证 buffer 活到 DMA completion / cancel / drain。
- **Teardown**：策略对象析构前停止新请求；异步 DMA / callback 先 cancel、unregister、drain，再销毁 transport 与 sender。不要把 this 捕获进长期 callback 后直接析构。
- **可测试性**：Host Fake 验证状态、超时和错误映射；目标板 HIL 验证 DMA、IRQ、真实 WCET 与电气行为。

### 6.2 什么时候值得为 virtual 付费？

- UART / USB 在启动期按产品配置选择，并且上层需要一个稳定调用接口：值得。
- 一个固定板型只会使用 UART，且没有 Fake / 替换需求：优先具体类型或静态策略。
- 每个 packet 都创建一个 polymorphic 小对象，数量巨大且遍历频繁：先测量对象 RAM 与调用成本，再决定是否改成紧凑值类型或静态分派。
- 不要把“去掉 virtual”作为没有测量证据的性能优化目标。

## ⑦ 今日编码规范（MUST / SHOULD）

### MUST 1：允许通过基类销毁派生对象时，基类析构必须 public virtual

**错误写法：**

~~~cpp
class ByteTransport {
 public:
  virtual Status Write(std::span<const std::byte>) noexcept = 0;
  ~ByteTransport() = default;  // 若经 Base* 删除 Derived，这是错误的销毁契约
};
~~~

**推荐写法：**

~~~cpp
class ByteTransport {
 public:
  virtual ~ByteTransport() = default;
  virtual Status Write(std::span<const std::byte>) noexcept = 0;
};
~~~

若设计明确只允许借用、不允许通过基类销毁，可把析构函数设为 protected non-virtual，并让接口限制可被编译器检查；不要保留 public non-virtual destructor 再依赖调用者“记得别 delete”。

### MUST 2：把 vtable 当作实现模型，不当作标准布局契约

**错误写法：**

~~~cpp
static_assert(sizeof(ByteTransport) == sizeof(void*));  // 不可移植
~~~

**推荐写法：**

~~~cpp
static_assert(std::has_virtual_destructor_v<ByteTransport>);
static_assert(std::is_polymorphic_v<ByteTransport>);
~~~

用类型 traits 检查语言契约；对象大小、vtable 布局和实际调用成本应在目标 ABI 上观察，不要写成跨平台断言。

### SHOULD 3：只为真实运行时变化轴声明 virtual

**错误写法：**

~~~cpp
class PacketHeader {
 public:
  virtual std::uint16_t Length() const noexcept;
  virtual std::uint8_t Type() const noexcept;
};
~~~

若 PacketHeader 是固定布局值类型，且没有派生行为，virtual 会让对象表示和 ABI 复杂化。

**推荐方向：**

- 固定数据模型使用普通值类型与非虚成员函数。
- 需要运行时替换的行为放入小型 interface，例如 ByteTransport。
- 固定固件配置评估 template / concept；比较 Flash、RAM、编译时间与测试成本。
- 不因为 virtual 自动引入 heap、Factory 或 shared_ptr。

## ⑧ 可编译 Lab / 练习（约 13 分钟）

所有可修改程序都位于独立 .cpp，包含自己的 int main()；分别编译、分别运行。

### 主 Lab：同一 Transport 契约的 runtime 与 static dispatch

源码：[examples/day-090/main.cpp](../examples/day-090/main.cpp)

~~~bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic examples/day-090/main.cpp -o day90
./day90
~~~

本 Lab 同时展示：

1. ByteTransport& 运行时选择 USB 实现。
2. template / concept 在编译期选择 UART 实现。
3. virtual destructor 与 polymorphic trait 的编译期检查。
4. PlainTag 与 PolymorphicTag 的 sizeof 对比。输出数字只代表当前工具链 / ABI，不是标准保证。
5. 所有对象均为自动存储期，没有 new / delete，也没有发送热路径动态分配。

**当前验证环境的预期输出：**

~~~text
USB write bytes=3
UART1 write bytes=3
runtime=ok static=ok timeout=timeout empty=invalid-argument
usb_calls=1 uart_calls=1
polymorphic=true virtual_destructor=true
sizeof PlainTag=1 PolymorphicTag=16 (ABI-dependent)
All virtual-dispatch and static-policy checks passed
~~~

sizeof 的具体数值可能因目标架构和 ABI 不同而变化；测试只检查行为，不把数值写死。

### Exercise 01：修复多态基类的析构契约

源码：[examples/day-090/exercise-01.cpp](../examples/day-090/exercise-01.cpp)

~~~bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic examples/day-090/exercise-01.cpp -o day90-ex01
./day90-ex01
~~~

Starter 是**逻辑 / 设计违规但可编译运行**的版本。它不执行有问题的 Base* delete，而是用 std::has_virtual_destructor_v 安全地暴露契约缺陷。

Starter 预期输出：

~~~text
base operation
base_has_virtual_destructor=false
UartTransport destructor
derived_destructor_calls=1
Review finding: deleting Derived through Base* is not safe
Fix: make the base destructor virtual and mark the derived destructor override
~~~

请在本地副本修复：

1. 将 BaseTransport 的析构改为 public virtual destructor。
2. 将 UartTransport 的析构显式标记 override。
3. 保留 stack object 测试，不要为了演示而执行非 virtual Base* delete；那会触发未定义行为。
4. 重新独立编译并运行，确认 base_has_virtual_destructor=true，最后输出 Base destructor contract is polymorphic-safe。
5. 解释为什么 virtual destructor 解决多态销毁问题，却不代表对象一定由 heap 分配。

修复后预期输出：

~~~text
base operation
base_has_virtual_destructor=true
UartTransport destructor
derived_destructor_calls=1
Base destructor contract is polymorphic-safe
~~~

## ⑨ 三个常见坑

1. **把 vtable 当成 C++ 标准规定的对象布局**：标准保证 virtual call 语义，不保证 vptr 的位置、vtable 的形状、对象增加几个字节或跨编译器 ABI 兼容。
2. **只检查 virtual function，却漏掉 destructor contract**：能通过 Base& 调用派生实现，不等于可以安全地通过 Base* delete。借用与拥有必须分开判断。
3. **把所有函数都 virtual，或凭直觉判断性能**：虚函数可能增加间接分派、对象空间和代码体积；也可能被去虚化。固定固件优先评估静态策略，实时结论必须来自目标平台测量。

## ⑩ 检查题

### 知识 / 代码检查

1. 解释 vtable / vptr 的典型工作方式。哪些是 C++ 语言保证，哪些属于编译器 / ABI 实现细节？为什么不能断言所有 polymorphic object 都固定增加一个指针大小？
2. 一个 API 只接受 ByteTransport& 借用对象，从不拥有或销毁对象；另一个 API 接受 std::unique_ptr<ByteTransport>。这两种 API 对基类析构函数有什么不同要求？说明原因。

### 设计题

一个 Modem 产品线有三种构建：

- A：UART 在编译期固定，发送路径有严格 WCET 预算。
- B：启动时按产品配置选择 UART 或 USB，并且 Host 测试需要 Fake。
- C：Linux Middleware 允许运行时加载 transport 插件，但插件数量、ABI 版本和卸载过程必须受控。

请分别选择直接 composition、template / concept、Strategy / virtual interface，或保持简单。回答必须覆盖：

- 每种构建的真实变化轴与稳定 Write contract；
- vtable / indirect call / object size 是否值得付出，如何在目标平台验证；
- composition root、owner、borrow、析构与插件 unload 顺序；
- timeout、错误模型、线程上下文、ISR 与 WCET；
- DMA buffer 和 callback 的 owner / lifetime / cancel / drain；
- 是否需要 Factory、shared_ptr、Service Locator 或 runtime registry，为什么。

### 今日设计决策路径

需求变化 → 识别变化轴 → 建立稳定行为契约 → 判断是否需要运行时选择 → 选择 virtual 或 template / concept → 设计 owner / borrow / lifetime → 选择正确析构策略 → 测量 RAM / Flash / WCET → 检查 task / ISR / timeout / teardown → Code Review。

**核心结论：virtual 提供运行时行为分派；vtable 是常见实现模型而非标准布局承诺；虚析构解决多态销毁契约。它们都不能替代 ownership、lifetime、ABI 与实时预算设计。**

## 参考

- Marc Gregoire, *Professional C++, Sixth Edition*, Chapter 10 · Discovering Inheritance Techniques，The Truth about virtual，pp.366–369。
- [O’Reilly：Chapter 10 · Discovering Inheritance Techniques](https://www.oreilly.com/library/view/professional-c-6th/9781394193172/c10.xhtml)
- [Wiley：Professional C++, 6th Edition](https://www.wiley.com/en-us/Professional%2BC%2B%2B%2C%2B6th%2BEdition-p-9781394193202)
- 仓库扩展：[Strategy 与行为模式](../patterns/03-behavioral-patterns.md#策略strategy) · [Ownership 与 Smart Pointers](../patterns/ownership-and-smart-pointers.md)
