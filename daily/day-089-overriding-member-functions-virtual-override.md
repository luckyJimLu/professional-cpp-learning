# Day 89 · Overriding Member Functions：从 virtual 到 override 的运行时契约

> **主教材**：Marc Gregoire, *Professional C++, Sixth Edition*（C++23），Chapter 10 · Discovering Inheritance Techniques。  
> **辅教材**：Dmitri Nesteruk, *Design Patterns in Modern C++*；仓库 [patterns/03-behavioral-patterns.md](../patterns/03-behavioral-patterns.md) 中的 Strategy。  
> **本课边界**：只覆盖 virtual、成员函数重写语法、base reference 的调用者视角和 override。今天不提前展开 vtable 实现、virtual 的性能细节、纯虚函数 / 抽象基类、虚函数 final 与多态析构的完整专题。  
> **预计用时**：60 分钟。

## ① 今日章节与建议阅读范围（约 7 分钟）

Day 88 已完成 Chapter 10 的 Building Classes with Inheritance 起始内容。今天沿原书下一节继续：

- **Chapter 10 · Discovering Inheritance Techniques**
- 今日小节：**Overriding Member Functions**
  - The virtual Keyword：p.362
  - Syntax for Overriding a Member Function：p.363
  - A Client’s View of Overridden Member Functions：p.363
  - The override Keyword：p.365
- **建议阅读：pp.362–365**。读到 The override Keyword 结束即可；下一节 **The Truth about virtual** 从 p.366 开始，留给后续课程。
- 阅读时标记三件事：基类何时声明 virtual、派生类何时真正 override、调用点的静态类型与对象动态类型分别决定什么。

**60 分钟安排**：阅读 7 分钟 → 昨日复习 5 分钟 → 机制与 C/C++ 对照 18 分钟 → Strategy / Embedded 边界 12 分钟 → Lab 与修复练习 13 分钟 → 检查题 5 分钟。

## ② 昨日复习 3 问（约 5 分钟）

1. Day 88 为什么说 public inheritance 是对调用者作出的 substitutability 承诺，而不是代码复用快捷键？
2. class 标记为 final 与成员函数标记为 virtual 是两种什么不同的扩展边界？
3. 如果 UartPort 对象绑定到 const Device&，调用者能否访问 UartPort 独有的 BaudRate()？这和今天的 virtual 有什么关系？

**复习要点：**

- public inheritance 让调用者可以把派生对象当作基类使用；因此基类的每个公开操作都必须对派生对象保持语义正确。
- class final 关闭继续派生的扩展面；virtual 则允许派生类为一个基类操作提供动态分派的最终实现。
- base reference 只暴露基类声明的 API。virtual 可以改变调用哪个实现，但不会把派生类新增成员加入基类接口。

## ③ 核心概念：virtual、override 与调用者视角（约 10 分钟）

### 3.1 同名函数不自动等于 override

先看没有 virtual 的基类：

~~~cpp
class BaseTransport {
 public:
  Status Write() noexcept { return Status::kOk; }
};

class UartTransport : public BaseTransport {
 public:
  Status Write() noexcept { return Status::kTimeout; }
};
~~~

UartTransport 声明了同名函数，但它只是隐藏了基类同名成员；通过 BaseTransport& 调用时，调用的是 BaseTransport::Write()。这不是运行时重写。

**正确的第一步是在基类声明 virtual：**

~~~cpp
class BaseTransport {
 public:
  virtual Status Write() noexcept { return Status::kNotSupported; }
  virtual ~BaseTransport() = default;
};

class UartTransport : public BaseTransport {
 public:
  Status Write() noexcept override { return Status::kOk; }
};
~~~

基类的 virtual 声明建立动态分派契约；派生类用 override 明确表示“我打算重写这个基类虚函数”。

### 3.2 override 是编译期检查，不是新的运行时机制

override 的价值是让编译器验证派生类成员确实重写了某个基类虚函数。它不会单独开启动态分派；动态分派来自基类 virtual 声明。

下面的签名存在细微差异：

~~~cpp
class Base {
 public:
  virtual std::size_t MaxPayloadBytes() const noexcept;
};

class Derived : public Base {
 public:
  // 错误：少了 const；这不是 Base 的重写。
  std::size_t MaxPayloadBytes() noexcept;
};
~~~

如果把派生类声明改成下面这样，编译器就能验证契约：

~~~cpp
class Derived : public Base {
 public:
  std::size_t MaxPayloadBytes() const noexcept override;
};
~~~

**要点：** 参数类型、成员函数的 const / volatile 与 ref-qualifier 等都属于重写匹配需要关注的签名条件；返回类型通常必须一致，协变返回类型是专门的例外。异常说明也必须满足重写兼容规则。不要靠肉眼猜测，直接使用 override。

### 3.3 virtual 在继承链中持续生效

一旦基类成员声明为 virtual，后续派生类中的对应重写仍然是虚函数，不需要每一层重复写 virtual。推荐在每个派生类重写点写 override：

~~~cpp
class Transport {
 public:
  virtual Status Write() noexcept;
};

class UartTransport : public Transport {
 public:
  Status Write() noexcept override;
};

class BoardSpecificUart : public UartTransport {
 public:
  Status Write() noexcept override;
};
~~~

这让代码评审者能快速识别扩展点，也让签名变化在编译期暴露。

### 3.4 Client’s View：静态接口 + 动态实现

~~~cpp
UartTransport uart;
Transport& transport = uart;

transport.Write();  // 调用 UartTransport 的最终重写
// transport.ResetDma();  // 若 ResetDma 只在 UartTransport 中声明，则不能通过 Transport& 调用
~~~

这里有两个不同问题：

- **静态类型 Transport&** 决定调用点可以使用哪些成员。
- **对象的动态类型 UartTransport** 决定 virtual 调用最终执行哪个重写实现。

virtual 只改变被调用的实现，不扩大基类 API。引用仍然只是 borrow，不会拥有对象，也不会延长对象生命周期。

### 3.5 override、overload 与 name hiding

| 机制 | 条件 | 调用效果 |
|---|---|---|
| Override | 基类函数是 virtual，派生类提供匹配签名 | 经基类引用 / 指针调用时按动态类型分派 |
| Overload | 同一作用域存在不同参数列表的函数 | 编译期重载决议选择匹配版本 |
| Hiding | 派生类声明同名成员但没有正确重写，或基类成员本身非 virtual | 派生声明可能隐藏基类同名成员 / 重载集合 |

using Base::Function 可以把基类重载集合重新引入派生类作用域，但它不会把一个不匹配的函数变成 override。真正的重写仍要靠 virtual 契约与 override 检查。

### 3.6 virtual 与所有权是两个独立维度

- virtual 决定行为分派，不意味着对象必须通过 new 创建。
- Base& / Base* 可以借用派生对象；borrower 不能超过对象 owner 的生命周期。
- 如果允许通过 Base* 或 std::unique_ptr<Base> 销毁派生对象，基类析构函数应为 public virtual。
- 如果明确禁止通过基类销毁对象，可考虑 protected non-virtual destructor，但必须让接口限制足够清楚。
- 不要因为引入 virtual 就机械地引入 shared_ptr。

本课主 Lab 使用栈对象与引用借用，没有动态分配；基类提供 public virtual destructor，以保持未来通过基类 owner 管理对象时的安全契约。

### 3.7 运行时多态的成本边界

本课先记录成本类别，不提前展开下一节的 vtable 实现细节：

- 调用路径可能包含间接分派，目标不一定在调用点静态可见。
- 多态对象通常需要额外的对象级元数据；具体布局是 ABI / 编译器实现细节，不是 C++ 标准规定的固定 vtable 结构。
- virtual 不会自动触发 heap allocation。
- 如果目标类型在编译期固定，可考虑 template / concept 的 static polymorphism；它减少运行时分派，但可能增加模板实例化和代码体积。
- 如果产品配置在启动时才决定 UART / USB，且需要同一个上层对象在运行时替换实现，runtime interface 才有明确价值。

## ④ C 写法 vs Modern C++（约 8 分钟）

### 4.1 C：函数表 + context 指针

~~~c
#include <stddef.h>
#include <stdint.h>

typedef int status_t;

struct transport;
typedef status_t (*transport_write_fn)(
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

status_t transport_write(
    struct transport* self,
    const uint8_t* bytes,
    size_t size,
    uint32_t timeout_ms) {
  return self->ops->write(self->context, bytes, size, timeout_ms);
}
~~~

C 的函数表同样可以实现运行时分派。它灵活、ABI 直观，但需要手工维护函数指针、context 类型、初始化顺序和资源生命周期。

### 4.2 Modern C++：基类虚函数 + override

~~~cpp
class ByteTransport {
 public:
  virtual ~ByteTransport() = default;

  virtual Status Write(
      std::span<const std::byte> bytes,
      std::chrono::milliseconds timeout) noexcept {
    static_cast<void>(bytes);
    static_cast<void>(timeout);
    return Status::kNotSupported;
  }
};

class UartTransport final : public ByteTransport {
 public:
  Status Write(
      std::span<const std::byte> bytes,
      std::chrono::milliseconds timeout) noexcept override;
};
~~~

| 维度 | C 函数表 | Modern C++ virtual |
|---|---|---|
| 类型安全 | 函数指针签名由团队维护；context 常需 void* | 基类与派生类由编译器检查；override 能捕获签名漂移 |
| 资源管理 | context owner 与释放顺序通常手工约定 | 对象可直接组合；RAII、引用和 unique_ptr 表达 owner / borrow |
| 可测试性 | 可以注入 Fake 函数表 | 可以注入 Fake 派生类；测试遵守同一接口契约 |
| 扩展性 | 新实现填充函数表 | 新实现重写虚函数；调用者依赖稳定基类契约 |
| 成本 | 间接函数调用、函数表与 context | 间接分派及对象元数据；不自动需要 heap |

### 4.3 固定固件配置：用 concept 做编译期策略

如果某个产品构建永远只使用 UART，运行时没有替换需求，可以考虑模板 / concept：

~~~cpp
#include <concepts>
#include <span>
#include <chrono>

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

模板实例化时检查接口能力，调用目标可静态确定；代价是不同类型可能生成不同实例，增加编译时间与 Flash 代码体积。不要把 static polymorphism 当作无成本，也不要为了避免一个 virtual 就把整个系统模板化。

## ⑤ 设计模式映射：Strategy 与运行时替换（约 6 分钟）

今天真正相关的辅线是 **Strategy**，而不是为了使用继承而建立更深的类层级。

### 5.1 真实变化轴

Modem Middleware 的发送语义稳定，但底层 transport 可能因产品配置而不同：

- 产品 A：UART transport。
- 产品 B：USB CDC transport。
- Host test：Fake transport。

稳定边界是发送契约：输入 buffer、timeout、错误语义和调用上下文。变化轴是具体 transport 实现。

### 5.2 Strategy 的结构

~~~text
Composition Root
  ├── owns UartTransport / UsbTransport
  └── constructs ModemSender with ByteTransport&

ModemSender
  └── borrows ByteTransport
        ├── UartTransport
        ├── UsbTransport
        └── FakeTransport
~~~

ModemSender 是 context；ByteTransport 的 virtual operation 是策略边界；Uart / USB / Fake 是具体策略。运行时选择由 composition root 在启动阶段完成，不需要在每次发送时查询 service locator。

### 5.3 Ownership / Borrow / Lifetime

- composition root 拥有具体 transport。
- ModemSender 保存 ByteTransport&，只借用，不负责 delete。
- transport 必须先构造，sender 后构造；销毁顺序相反，sender 先销毁。
- 如果以后改为 std::unique_ptr<ByteTransport> 转移所有权，基类析构必须保持 public virtual。
- override 只检查函数签名，不保证行为满足 Liskov Substitution Principle。UART、USB 和 Fake 必须一致遵守 timeout、最大长度、错误传播、线程上下文和 buffer 生命周期契约。

### 5.4 什么时候不需要 Strategy？

- 固件只支持一种 transport，且编译期已固定：直接组合具体类型或使用 template / concept。
- 只有一个实现且没有可测试替换需求：先保持简单，不为了“可扩展”引入多层 interface。
- 需要运行时选择、host fake 或产品线替换：Strategy / runtime interface 有真实变化轴。

不需要额外 Factory：如果选择逻辑只有一个启动期 if / 配置分支，由 composition root 直接创建即可。没有异步事件也不需要 Observer。

## ⑥ Embedded / System Design：Modem Transport 与 RTOS 任务边界（约 6 分钟）

### 6.1 典型边界

~~~text
ModemTask
   |
   v
ModemSender
   |
   | borrow: ByteTransport&
   v
ByteTransport virtual contract
   |                 |
   v                 v
UartTransport     UsbTransport
   |                 |
   v                 v
BSP / HAL / USB CDC
~~~

### 6.2 实时与资源约束

- **初始化**：由启动期 composition root 选择具体 transport；对象可放静态存储或受控的启动期存储，不需要在发送热路径分配。
- **任务上下文**：Write 的调用上下文必须写入接口契约。若 HAL 只能从特定 task 调用，不能让任意线程直接调用。
- **ISR**：不要从 ISR 调用可能阻塞、获取普通 mutex、分配内存或执行无界回调的发送路径。virtual 本身不是“禁止在 ISR 使用”的语法规则，但间接目标必须可审计且 WCET 有证据。
- **timeout**：用 std::chrono::milliseconds 表达单位；驱动层转换 RTOS tick 时要检查溢出与 tick rounding，禁止无 timeout 等待。
- **内存**：本 Lab 的 UART / USB / Sender 都是栈对象，没有 heap allocation；真实 driver 仍需报告静态 RAM、DMA buffer 和栈预算。
- **WCET**：目标集合有限且初始化后不变；测量 indirect call、锁、DMA 提交和错误路径。不能仅凭“virtual 很慢 / virtual 很快”做设计判断。
- **并发**：优先单一 ModemTask 拥有 transport 调用权；若多任务共享，必须定义串行化、锁顺序和有界等待。
- **buffer lifetime**：本 Lab 的 Write 是同步接口，span 只借用到函数返回。如果真实 HAL 将 buffer 交给 DMA 异步使用，必须延长 buffer owner 生命周期，直到 DMA completion / cancel 完成。
- **callback teardown**：本课没有注册 callback。若后续增加完成回调，必须定义 callback target owner、取消 / unregister、in-flight drain 和销毁顺序；不能把 this 捕获进长期回调后直接析构对象。
- **可测试性**：Host Fake 验证状态与错误映射；真实寄存器和 DMA 行为留在 HAL / HIL 验证，不把 std::cout 或复杂日志放入实时发送路径。

## ⑦ 今日编码规范（MUST / SHOULD）

### MUST 1：基类声明 virtual，派生类重写必须标记 override

**错误写法：**

~~~cpp
class Transport {
 public:
  virtual Status Write(std::span<const std::byte> bytes) noexcept;
};

class UartTransport : public Transport {
 public:
  Status Write(std::span<const std::byte> bytes) noexcept;  // 漏写 override
};
~~~

签名变化时，派生类可能悄悄变成另一个函数，基类引用仍调用旧实现。

**推荐写法：**

~~~cpp
class UartTransport : public Transport {
 public:
  Status Write(std::span<const std::byte> bytes) noexcept override;
};
~~~

### MUST 2：重写签名必须与基类契约一致

**错误写法：**

~~~cpp
class Transport {
 public:
  virtual std::size_t MaxPayloadBytes() const noexcept;
};

class UsbTransport : public Transport {
 public:
  std::size_t MaxPayloadBytes() noexcept;  // 少了 const
};
~~~

**推荐写法：**

~~~cpp
class UsbTransport : public Transport {
 public:
  std::size_t MaxPayloadBytes() const noexcept override;
};
~~~

不要为了消除编译错误而随意删掉基类 const；先判断调用者是否需要通过 const base view 使用该操作。

### SHOULD 3：多态边界与 owner / borrow 分开设计

- required non-owning transport 用引用注入；sender 不得隐式 delete transport。
- 允许通过 base owner 销毁派生对象时，base destructor 必须 public virtual。
- 实时路径中的 virtual dispatch 必须有有限目标集合、无无界注册、无无界分配，并通过目标平台测量 WCET。
- 若接口改为异步 DMA，重新设计 buffer 与 callback lifetime，不得继续假设 span 只借用到函数返回。

## ⑧ 可编译 Lab / 练习（约 13 分钟）

所有可修改代码都在独立 .cpp 中，包含自己的 int main()；两个文件必须分别编译，不能链接成一个程序。

### 主 Lab：用 virtual / override 替换 Modem Transport 行为

源码：[examples/day-089/main.cpp](../examples/day-089/main.cpp)

~~~bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic \
  examples/day-089/main.cpp -o day89
./day89
~~~

预期输出：

~~~text
UART1 TX 4 bytes
USB TX 4 bytes
uart=ok usb=ok timeout=timeout empty=invalid-argument
uart_calls=1 usb_calls=1
All virtual override checks passed
~~~

检查点：

1. ModemSender 只依赖 ByteTransport 的稳定 virtual contract。
2. UartTransport 与 UsbTransport 都显式 override。
3. ModemSender 保存引用，不拥有 transport；主函数中的声明顺序保证 borrower 先销毁。
4. timeout 与空 payload 通过 Status 显式表达。
5. 没有 new / delete、没有动态注册、没有异步 callback；host 输出不代表真实 RTOS 实时实现。

### Exercise 01：修复签名漂移造成的“看似重写”

源码：[examples/day-089/exercise-01.cpp](../examples/day-089/exercise-01.cpp)

~~~bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic \
  examples/day-089/exercise-01.cpp -o day89-ex01
./day89-ex01
~~~

Starter 是**逻辑 / 设计违规但可编译运行**的版本。派生类少写 const，也没有 override。GCC 可能给出 -Woverloaded-virtual 提示；这条 warning 是线索，不是编译失败。

Starter 预期输出：

~~~text
concrete-view-limit=512
base-view-limit=64
Bug reproduced: the base view still calls the base implementation
Fix: add const and override to UsbTransport::MaxPayloadBytes()
~~~

请在本地副本修复：

1. 把 UsbTransport::MaxPayloadBytes() 改成 const noexcept override。
2. 保留基类的 const 契约，不要通过删掉基类 const 来迁就派生类。
3. 重新独立编译并运行；修复后 concrete view 与 base view 都应显示 512。
4. 解释 override 为什么能把签名漂移提前变成编译错误，以及为什么没有 override 时程序仍然可以编译。

修复后的关键声明：

~~~cpp
[[nodiscard]] std::size_t MaxPayloadBytes() const noexcept override {
  return 512U;
}
~~~

修复后预期输出：

~~~text
concrete-view-limit=512
base-view-limit=512
Override contract satisfied through the base view
~~~

## ⑨ 三个常见坑

1. **把同名误认为重写**：基类非 virtual，或派生签名不匹配时，派生函数可能只是 hiding。通过 base reference 调用仍可能执行基类版本。
2. **漏写 override**：const、参数类型、ref-qualifier 或基类接口重命名后，派生类可能静默偏离契约。把 override 作为所有预期重写的强制 Code Review 项。
3. **把 virtual 当成所有权方案**：virtual 不创建对象、不管理资源、不延长 borrower 生命周期。多态基类销毁策略、transport owner、buffer lifetime、异步 callback teardown 必须分别设计。

## ⑩ 检查题

### 知识 / 代码检查

1. Base 声明 virtual Status Read() const noexcept；Derived 写成 Status Read() noexcept override。为什么编译器拒绝？如果删掉 override，问题会如何变化？
2. Derived object 绑定到 Base& 后，为什么可以动态调用 Derived 的重写实现，却不能通过 Base& 调用 Derived 新增的 ConfigureDma()？

### 设计题

某 Modem 产品线有三种形态：

- 固件 A：UART 在编译期固定，硬实时发送路径；
- 固件 B：启动时按产品配置选择 UART 或 USB，并需要 Host Fake；
- Linux Middleware：运行时可加载 transport 插件，但插件数量和生命周期必须可控。

请分别选择直接 composition、template / concept、Strategy / runtime interface，或保持简单。回答必须覆盖：

- 真实变化轴与稳定的 Write contract；
- override 只能验证签名、不能自动保证 LSP 行为；
- 哪个对象 owner，哪个对象 borrow，销毁顺序如何；
- span 的同步 / 异步 buffer lifetime；
- timeout、错误传播、线程上下文与 ISR 限制；
- runtime registration 数量、初始化分配、WCET 和测试替换成本；
- 为什么不应默认引入 shared_ptr、Factory 或 service locator。

### 今日设计决策流程

需求变化 → 识别变化轴 → 建立稳定 base contract → 判断运行时替换是否真实存在 → 选择 virtual Strategy 或 template / concept → 使用 override 锁定签名 → 明确 owner / borrow / lifetime → 检查 timeout、并发、ISR 与 WCET → Code Review。

**核心结论：virtual 在基类声明行为扩展点，override 在派生类验证契约；运行时多态是行为分派机制，不是所有权、生命周期或实时性设计的替代品。**

## 参考

- Marc Gregoire, *Professional C++, Sixth Edition*, Chapter 10 · Discovering Inheritance Techniques，Overriding Member Functions，pp.362–365。
- [O’Reilly：Chapter 10 · Discovering Inheritance Techniques](https://www.oreilly.com/library/view/professional-c-6th/9781394193172/c10.xhtml)
- [Wiley：Professional C++, 6th Edition](https://www.wiley.com/en-us/Professional%2BC%2B%2B%2C%2B6th%2BEdition-p-9781394193202)
- 仓库扩展：[Strategy 与行为模式](../patterns/03-behavioral-patterns.md) · [Ownership 与 Smart Pointers](../patterns/ownership-and-smart-pointers.md)
