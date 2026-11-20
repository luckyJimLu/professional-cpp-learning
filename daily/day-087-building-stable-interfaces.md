# Day 87 · Building Stable Interfaces：用 Interface / Implementation 分离稳定 API

> **主教材**：Marc Gregoire, *Professional C++, Sixth Edition*（C++23），Chapter 9 · Mastering Classes and Objects。  
> **辅教材**：Dmitri Nesteruk, *Design Patterns in Modern C++*；仓库 patterns/ 中的 Adapter、Bridge 相关边界与 ownership 资料。  
> **学习目标**：把“调用者依赖什么”与“类内部如何实现”分开；理解 PImpl 的收益、成本和生命周期约束。  
> **预计用时**：60 分钟。

## ① 今日章节与建议阅读范围（约 8 分钟）

**严格沿主教材顺序：**

- Chapter 9 · Mastering Classes and Objects，整章范围 pp.295–355。
- 今日小节：**Building Stable Interfaces**，紧接 Day 86 的 Operator Overloading。
- 阅读重点：interface class 与 implementation class 的分离、隐藏实现细节、private implementation（PImpl）思路，以及本章 Summary。
- 建议范围：从 **Building Stable Interfaces** 小节开始读到 Chapter 9 Summary；纸书页码以该小节实际起始页为准（位于本章末段，约 pp.350–355）。

今天不提前进入 Chapter 10，也不把 PImpl 扩展成模板或继承专题。主教材讲的是如何写出稳定、可维护的类接口；PImpl 是本节重要的 C++ 工程实现手段。

**60 分钟安排**：阅读 8 分钟 → 复习 5 分钟 → 概念与对照 18 分钟 → 模式和 Embedded 设计 14 分钟 → Lab / 修复练习 10 分钟 → 检查题 5 分钟。

## ② 昨日复习 3 问（约 5 分钟）

1. Day 86 中，为什么 operator+ 应表达值运算，而不应隐藏 UART 写入、锁等待或设备重配置？
2. 对一个 ByteCount 值类型，为什么 operator+= 通常返回 ByteCount&，而 operator+ 通常返回新值？
3. 如果两个参数分别表示毫秒和字节数，应该如何阻止调用者把它们误传到同一个 uint32_t 参数位置？

**复习要点**：自然语法必须保持直观语义；值类型优先 value semantics；物理单位和调用契约尽量进入类型，而不是依赖注释。

## ③ 核心概念：稳定接口与隐藏实现（约 10 分钟）

### 3.1 Interface 是调用者依赖的契约

一个类的 public API 不只是函数签名，还包括：

- 参数、返回值和错误模型；
- 调用顺序、状态前置条件；
- 对象所有权、借用和生命周期；
- 线程上下文、阻塞和 timeout；
- 对调用者可见的类型、头文件依赖与 ABI 约束。

**Implementation** 则是完成这些契约的内部数据结构、算法、第三方库和平台细节。

例如，AT 命令控制器的调用者需要的是：

- Start()、SendAt()、Stop()；
- 明确的 Status；
- 命令最大长度和 timeout 规则。

调用者不应该依赖：

- 某个厂商 UART SDK 的头文件；
- DMA descriptor 的布局；
- 内部 ring buffer 的容量字段；
- 具体如何维护命令队列。

即使成员被声明为 private，如果它们直接出现在公共头文件中，类的对象布局和编译依赖仍会暴露给编译器及包含该头文件的客户端。private 解决访问控制，不等于完全隐藏实现表示。

### 3.2 PImpl：把实现对象移到实现文件

公共头文件只声明一个不完整类型，并持有唯一 owner：

~~~cpp
class ModemController {
 public:
  ~ModemController();
  ModemController(ModemController&&) noexcept;
  ModemController& operator=(ModemController&&) noexcept;

  ModemController(const ModemController&) = delete;
  ModemController& operator=(const ModemController&) = delete;

 private:
  struct Impl;
  std::unique_ptr<Impl> impl_;
};
~~~

在 .cpp 中再定义 ModemController::Impl，并实现析构、移动操作和业务函数。

关键规则：

1. Impl 在头文件中只有前置声明；客户端不需要知道它的成员布局。
2. std::unique_ptr<Impl> 表达 ModemController 对实现对象的唯一所有权。
3. **析构函数必须在 Impl 完整可见的实现文件中定义**。移动赋值也可能释放旧的 Impl，因此同样放在实现文件中定义更稳妥。
4. 默认删除复制，除非确实定义了有意义的深拷贝语义。不能因为 PImpl 使用指针就让两个控制器意外共享同一个实现。
5. PImpl 不是免费的：通常多一次间接访问、一次初始化分配、额外指针空间，并且部分函数失去跨边界内联机会。

### 3.3 PImpl 能解决什么，不能保证什么

| 目标 | PImpl 的作用 | 仍需注意 |
|---|---|---|
| 降低头文件依赖 | 隐藏实现类型和重型 include | 公共 API 自身仍需稳定 |
| 减少重新编译范围 | 仅修改 Impl 通常只需重编译实现文件 | 修改头文件声明仍需重编译客户端 |
| 隐藏对象布局 | 对外类布局通常只保留固定的指针成员 | 修改基类、虚函数、公开签名仍可能破坏 ABI |
| 隔离厂商 SDK | SDK 头文件可以留在 .cpp | 不要把厂商类型重新暴露到 public API |
| 实时性能 | 热路径可以不再分配 | 间接访问仍有成本；构造阶段分配必须有上界 |

PImpl **不是 ABI 永久兼容的自动保证**。编译器、标准库、编译选项、调用约定、虚函数布局和公共函数签名仍可能影响二进制兼容性。

### 3.4 PImpl 与 C++ Modules 的区别

- **Modules** 主要改善编译依赖、模块边界和构建组织。
- **PImpl** 主要隐藏类表示和实现依赖，并让公开对象布局不随 Impl 成员变化。
- Modules 不会自动让导出的类布局变成 ABI 稳定；PImpl 也不是所有模块项目都必须使用。

这只是本课的边界判断，不提前展开 Chapter 11 的 Modules 内容。

## ④ C 写法 vs Modern C++（约 8 分钟）

### 4.1 C 的 opaque handle

C 项目常用不透明句柄隐藏实现：

~~~c
typedef struct modem_controller modem_controller_t;

modem_controller_t* modem_create(unsigned int timeout_ms);
int modem_send(modem_controller_t* modem, const unsigned char* data,
               unsigned int length);
void modem_destroy(modem_controller_t* modem);
~~~

调用者只知道句柄和函数契约，不知道结构体内部成员。这种方式可行，但需要显式管理 create/destroy 配对和错误返回。

### 4.2 C++ 的 RAII / PImpl

C++ 可以把同一边界包装成对象：

~~~cpp
class ModemController {
 public:
  static CreateResult Create(IAtTransport& transport,
                             std::chrono::milliseconds timeout) noexcept;
  ~ModemController();

  Status SendAt(std::string_view command) noexcept;

 private:
  struct Impl;
  explicit ModemController(std::unique_ptr<Impl> impl) noexcept;
  std::unique_ptr<Impl> impl_;
};
~~~

| 维度 | C opaque handle | 直接暴露成员的 C++ 类 | C++ PImpl |
|---|---|---|---|
| 类型安全 | 依赖函数和调用约定 | 有类型，但客户端看到成员类型 | 有类型，隐藏实现表示 |
| 资源管理 | 手工 destroy，容易漏配对 | 可 RAII，但头文件依赖较重 | RAII owner 管理 Impl |
| 可测试性 | 可替换函数实现或句柄 | 可测试，但容易依赖平台细节 | 可注入 transport，内部可替换 |
| 扩展性 | ABI 边界清楚但 API 易变复杂 | 实现成员变化影响客户端编译 | 内部结构可独立演进 |
| 成本 | C 风格句柄与函数调用 | 通常无额外 PImpl 间接层 | 指针、一次分配、间接访问 |

结论不是“PImpl 一定更现代”。如果类很小、只在一个模块内部使用、没有 ABI 或编译隔离需求，直接私有成员往往更简单、更快。

## ⑤ 设计模式映射：PImpl、Bridge 与 Adapter（约 7 分钟）

### 5.1 真实变化轴是什么？

以 Modem Middleware 为例：

- **稳定部分**：AT 命令 API、错误语义、timeout 单位和生命周期。
- **变化部分**：内部队列、缓存、诊断字段、厂商 SDK、传输细节。
- **稳定边界**：公共 ModemController API；必要时再抽出小型 IAtTransport。

PImpl 是 C++ 常用的 **implementation-hiding idiom**。它与 Bridge 的“分离抽象与实现”有相似思想，但不要把 PImpl 和 GoF Bridge 当成完全相同的模式。

### 5.2 什么时候还需要 Adapter？

如果旧 C UART API 与上层 transport contract 不一致，可以使用 Adapter：

~~~text
ModemController
      |
  IAtTransport        <- 稳定协议
      |
  UartAdapter         <- 适配变化
      |
  Vendor UART / HAL   <- 平台实现
~~~

Adapter 解决“不兼容接口转换”；PImpl 解决“隐藏类内部表示和依赖”。二者可以同时存在，但不是必须一起出现。

### 5.3 runtime polymorphism 还是 compile-time composition？

- 固件构建时已经固定唯一 transport：直接组合具体类型，或用 template / concept 表达 compile-time variation。
- 运行时确实需要在 UART、USB、TCP 之间切换，或需要统一 Fake 接口：小型 virtual interface 更合理。
- PImpl 与多态是两个独立维度：PImpl 不要求 virtual；使用 virtual 也不要求 shared_ptr。

**Ownership / borrow / lifetime：**

- ModemController 拥有 Impl：unique_ptr。
- Impl 可以借用 IAtTransport&：transport 由 composition root 拥有，必须比 controller 活得更久。
- SendAt(std::string_view) 只在同步调用期间借用命令内容，不能把 view 保存到异步队列。
- 若改成异步发送，必须复制到有界队列、转移拥有型消息，或使用明确的 pool handle；还要定义取消、回调注销和 in-flight drain。

不要为了“解耦”给每个类都套一层 interface、factory、proxy 和 shared ownership。只有真实变化轴才值得建立边界。

## ⑥ Embedded / System Design：Modem AT Middleware（约 7 分钟）

建议的对象关系：

~~~mermaid
flowchart TD
  A[Application Task] --> B[ModemController public API]
  B --> C[unique_ptr owns Impl]
  C --> D[IAtTransport reference: borrowed]
  D --> E[UartAdapter]
  E --> F[Vendor HAL / DMA]
  G[Composition Root owns transport] --> D
~~~

### 6.1 内存与实时约束

- PImpl 分配发生在启动 / composition root 阶段；不能把 new 放进每条 AT 命令的发送路径。
- 热路径命令长度有明确上界；Lab 使用 32 字节最大命令作为教学 contract。
- 若项目禁用堆或禁止异常，应使用静态存储 / 固定对象池 / 项目级工厂，不要把 new (std::nothrow) 当作所有平台都能工作的万能方案。
- 不能只凭“用了 PImpl”就声称 WCET 可预测；仍需测量间接调用、锁、DMA 提交、缓存和驱动等待。

### 6.2 线程、IRQ 与 callback

- AT 命令发送属于 task context；不要从 ISR 直接调用可能阻塞的发送接口。
- 真实实现应明确串行化策略：单 owner task、互斥锁或有界消息队列三者择一，并说明 WCET / timeout。
- 析构函数不应等待 DMA 或线程结束。需要可失败的关闭流程时，先执行 Stop(timeout)，注销 callback 并 drain in-flight work，再销毁对象。
- 如果 callback 捕获 this，必须保证注销、取消和 drain 完成后才销毁 Impl。
- IAtTransport& 是 borrow：composition root 必须先构造 transport，再构造 controller；销毁顺序相反。

### 6.3 可测试性

Lab 用 FakeAtTransport 验证成功、timeout、断开和非法输入。生产实现只需提供同一 contract 的 UartAdapter，上层业务逻辑不需要知道厂商 SDK 类型。

## ⑦ 今日编码规范（1–3 条）

### MUST 1：公共头文件只暴露稳定契约

**错误写法：**

~~~cpp
class ModemController {
 public:
  VendorUartHandle uart;
  bool started;
  VendorDmaDescriptor descriptors[8];
};
~~~

**推荐写法：**

~~~cpp
class ModemController {
 public:
  Status Start() noexcept;
  Status Stop(std::chrono::milliseconds timeout) noexcept;

 private:
  struct Impl;
  std::unique_ptr<Impl> impl_;
};
~~~

不要把 HAL 头文件、DMA descriptor 或内部缓存布局泄漏给上层。

### MUST 2：PImpl 的 owner、析构和移动边界必须明确

**错误写法：**

~~~cpp
class ModemController {
 private:
  struct Impl;
  std::unique_ptr<Impl> impl_;
 public:
  ~ModemController() = default;  // 可能在 Impl 不完整处实例化删除器
};
~~~

**推荐写法：**

~~~cpp
class ModemController {
 public:
  ~ModemController();
  ModemController(ModemController&&) noexcept;
  ModemController& operator=(ModemController&&) noexcept;
  ModemController(const ModemController&) = delete;
  ModemController& operator=(const ModemController&) = delete;

 private:
  struct Impl;
  std::unique_ptr<Impl> impl_;
};
~~~

在 .cpp 中、Impl 完整定义之后再 = default 析构和移动操作。若复制确有业务语义，必须实现独立的深拷贝，不要共享同一 Impl。

### SHOULD 3：把分配和借用限制在正确的生命周期

- PImpl 初始化分配只允许发生在有预算的启动路径。
- 实时发送路径不得分配、扩容或做无界工作。
- 必需依赖使用引用；string_view 仅作同步借用，不得跨异步边界保存。
- 阻塞接口显式使用带单位的 timeout；可恢复失败使用明确 Status，不用 assert 代替。

## ⑧ 可编译 Lab / 练习（约 10 分钟）

所有可修改代码均有独立 .cpp 和自己的 int main()，先运行观察，再重构。

### 主 Lab：PImpl + 唯一所有权 + 借用 transport

源码：[examples/day-087/main.cpp](../examples/day-087/main.cpp)

~~~bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic examples/day-087/main.cpp -o day87
./day87
~~~

**观察点：**

- 工厂拒绝 0ms timeout；
- controller 在 Start 前发送返回 not-ready；
- 普通命令成功，timeout / disconnected 映射为不同错误；
- 空命令被拒绝；
- Stop 后再次发送返回 not-ready；
- 成功发送计数为 1。

Lab 中的 Fake 只用于 host test；真实驱动的日志和 I/O 不应放在硬实时路径。

### Exercise 01：Code Review 修复稳定边界

源码：[examples/day-087/exercise-01.cpp](../examples/day-087/exercise-01.cpp)

~~~bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic examples/day-087/exercise-01.cpp -o day87-ex01
./day87-ex01
~~~

**Starter 是故意“逻辑设计违规但可编译运行”的版本。** 先运行，观察 UART 被调用时 timeout 已被调用者改成 0ms，且控制器直接暴露 HAL 指针和可写状态。

请在本地副本完成以下重构：

1. 把 started_ 和 timeout 收入 private，禁止调用者直接破坏 invariant。
2. 必需的 UART 依赖改为明确 borrow（例如构造时传入 UartDriver&），并说明 owner 必须比 controller 活得更久。
3. 用 enum class Status 替代模糊 bool 错误模型。
4. 用 std::chrono::milliseconds 表达 timeout。
5. 如果这个类需要跨模块隐藏实现，再将实现状态迁入 PImpl；不要为了练习而给每个小类都增加 PImpl。
6. 保证发送路径不分配、不保存临时 string_view，并为 timeout、空命令和 moved-from / stopped 状态增加测试。

**完成标准**：先能复现 starter 的错误行为，再让修复版独立编译运行；解释 PImpl owner、transport borrower、teardown 顺序和实时路径成本。

## ⑨ 三个常见坑

1. **不完整类型与 unique_ptr**：把析构函数内联默认定义在头文件中，可能在 Impl 尚不完整时触发删除器实例化错误；析构和相关移动操作应放在实现文件。
2. **PImpl 过度使用**：小型值类型、仅本模块内部使用的类，通常不值得多一次分配和指针间接访问；PImpl 是边界工具，不是类设计的默认模板。
3. **误以为 PImpl 自动解决所有 ABI / 生命周期问题**：公共函数签名、基类、虚函数和工具链仍影响 ABI；borrowed transport、异步 callback、Stop 和析构顺序仍要单独设计。

## ⑩ 检查题

### 知识 / 代码检查

1. 为什么 std::unique_ptr<Impl> 的析构函数通常要在 Impl 完整定义之后实现？移动赋值为什么也值得放在 .cpp？
2. PImpl 与 C++ Modules 分别主要解决什么问题？为什么 Modules 不自动保证二进制 ABI 稳定？

### 设计题

一个 Modem 产品线有三种构建形态：

- 固件 A：UART transport 在编译期固定，硬实时发送路径；
- 固件 B：运行时可选择 UART 或 USB，并需要 Fake transport 测试；
- Linux Middleware：希望以动态库形式发布，减少客户端因内部数据结构变化而重编译。

请分别判断采用直接 composition、template / concept、runtime interface、PImpl 的组合。说明：

- 真实变化轴与稳定边界；
- 哪些对象 owner，哪些只是 borrow；
- 初始化分配、运行期分配、间接调用和 WCET 成本；
- timeout、线程上下文、callback 注销与 teardown 顺序；
- 哪些场景保持简单反而是正确设计。

### 今日设计决策流程

需求变化 → 识别变化轴 → 找到稳定 API → 决定是否隐藏表示 → 选择直接成员 / PImpl / template / runtime interface → 明确 owner 与 borrow → 约束初始化和实时路径 → Code Review。

**核心结论：先稳定调用者依赖的契约，再决定是否隐藏实现；先设计 lifetime，再选择 pointer。**
