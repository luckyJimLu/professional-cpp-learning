# Day 91 · 第 13 周复盘：从类接口到运行时多态的稳定边界

> **主教材**：Marc Gregoire, *Professional C++, Sixth Edition*（C++23），复盘 Chapter 9 · Mastering Classes and Objects 与 Chapter 10 · Discovering Inheritance Techniques。  
> **复盘范围**：Day 85–90；本课是每七天一次的工程复盘，不插入新的教材小节，也不改变主教材顺序。  
> **辅教材**：Dmitri Nesteruk, *Design Patterns in Modern C++*；结合仓库 patterns/ 中的 Facade、Strategy、Adapter、Composition 与 ownership/lifetime 资料。  
> **预计用时**：60 分钟。

## ① 今日章节与建议阅读范围（约 8 分钟）

本周不是随机跳章，而是把最近连续完成的类与继承主题串成一个工程判断链：

| Day | 主教材小节 | 本周要保留的判断 |
|---:|---|---|
| 85 | Chapter 9 · Enumerations Inside Classes，p.339 | 状态域属于哪个类型；外部整数必须先验证 |
| 86 | Chapter 9 · Operator Overloading，pp.339–349 | 运算符必须保持自然的值语义，不隐藏 I/O / 阻塞 |
| 87 | Chapter 9 · Building Stable Interfaces，pp.350–354 | public contract 与 implementation 分离；PImpl 的 owner 和分配时机 |
| 88 | Chapter 10 · Building Classes with Inheritance，约 pp.358–362 | base subobject、访问视角、public inheritance 的 is-a 承诺 |
| 89 | Chapter 10 · Overriding Member Functions，pp.362–365 | virtual 建立运行时扩展点，override 检查重写契约 |
| 90 | Chapter 10 · The Truth about virtual，pp.366–369 | vtable 是常见实现模型；虚析构与多态销毁边界 |

**建议阅读**：重读 Day 85–90 对应的小节和本周实验；重点不是重复抄写定义，而是给每个 API 标注 value / owner / borrow / runtime extension。今天不提前讲授下一节。

**下一节**：Day 92 按原书顺序进入 Chapter 10 · **Preventing Overriding**（目录页码 p.370）。Day 91 只做复盘，不把下一节内容提前算入本课。

**60 分钟安排**：教材回顾 8 分钟 → 昨日复习 5 分钟 → 机制整合 12 分钟 → C/C++ 与模式映射 10 分钟 → Embedded 设计评审 10 分钟 → Lab / 重构练习 10 分钟 → 检查题 5 分钟。

## ② 昨日复习 3 问（约 5 分钟）

1. Day 90 中，C++ 标准保证的是 virtual call 的语义，还是 vptr 的位置、vtable 的布局和固定字节数？为什么不能把某个 ABI 的 sizeof 结果写成跨平台断言？
2. 通过 Base& 借用派生对象，与通过 std::unique_ptr<Base> 拥有派生对象，对基类析构函数的要求有何不同？
3. 固件在编译期固定使用 UART、产品启动时才选择 UART / USB、Linux 运行期加载插件，这三种变化轴分别更适合具体类型 / template-concept、Strategy / virtual interface，还是受控插件边界？

**复习要点**：virtual 负责行为分派，不负责对象创建、所有权或线程安全；允许经 base owner 销毁派生对象时需要 public virtual destructor；性能结论必须在目标 ABI 和真实调用路径上测量。

## ③ 核心概念：把六天内容收敛成一条设计链（约 12 分钟）

### 3.1 类型先表达领域语义

Day 85 的类内 enum class 把状态集合收进所属类型。来自 UART、Modem 或协议报文的原始 byte 仍是不可信输入：先 decode / validate，再进入状态机。指定底层类型可以控制表示宽度，但不会自动验证输入值。

### 3.2 运算符只表达调用者自然预期的值语义

Day 86 的 ByteCount / Duration 适合 +、+=、比较等值操作。设备重配置、发送 AT 命令、等待 DMA、获取锁或写寄存器不应伪装成运算符。算术边界也要有策略：若计数可能溢出，使用 checked operation 或明确前置条件，不要让自然语法掩盖失败。

### 3.3 稳定接口与实现隐藏是不同于继承的边界

Day 87 的 PImpl 将实现表示从公共头文件移走。std::unique_ptr<Impl> 表达唯一 owner；Impl 中的 IAtTransport& 仍然是 borrow。工厂中的 nothrow allocation 属于创建路径，不代表发送热路径可以随意分配。PImpl 也不自动提供跨工具链 ABI 稳定性。

### 3.4 继承先回答 is-a，再回答如何复用

Day 88 的 public inheritance 是 substitutability 承诺。base view 只暴露 base contract；derived 新增的操作不会因为继承而自动成为 base API。若对象只是“使用一个 UART”或“把命令交给 transport”，通常是 has-a / uses-a，应使用 composition。

### 3.5 virtual 与 override 是运行时契约，不是 ownership

Day 89 的 virtual 建立动态分派点，override 让编译器验证签名确实重写。Day 90 解释常见 vtable / vptr 实现模型与虚析构策略。两者都不意味着必须 new，也不意味着必须 shared_ptr。

### 3.6 编译期与运行期扩展要分别付费

- **Compile-time**：具体类型、模板、concept；目标可静态确定，可能增加模板实例化、编译时间和 Flash。
- **Runtime**：virtual interface / Strategy；可在启动期替换实现，需承担间接分派、对象表示和更复杂的生命周期治理。
- **Stable ABI / implementation hiding**：PImpl；隐藏表示，但通常引入间接访问和初始化分配成本。
- 不能把这三种机制混成“多态都一样”，也不能仅为追求抽象而同时引入 PImpl、virtual、Factory 和 shared_ptr。

## ④ C 写法 vs Modern C++（约 6 分钟）

| 维度 | C / 旧式实现 | Modern C++ |
|---|---|---|
| 状态域 | enum + 手工约定整数范围 | enum class + decode / validate |
| 资源接口 | struct + function pointer + void* context | 小型 interface、明确引用借用、RAII owner |
| 实现隐藏 | opaque handle + create/destroy | PImpl + unique_ptr，析构在 Impl 完整处定义 |
| 复用 | 嵌入公共 struct、复制函数表 | 先 composition；只有真实 is-a 才 public inheritance |
| 运行时扩展 | 手工函数表 | virtual / override / Strategy |
| 固件固定配置 | 手工宏与函数指针 | 具体类型或 template / concept |
| 测试 | 替换函数表和 context | Fake 实现注入同一稳定 contract |
| 成本 | ABI 直观，但 context / teardown 易散落 | 类型检查更强；仍需审查间接调用、分配、代码体积与生命周期 |

Modern C++ 的价值不是“所有东西都变成 class”，而是把类型语义、资源所有权和替换边界放在编译器可检查的位置。

## ⑤ 设计模式映射：Facade、Strategy 与 Composition（约 7 分钟）

### 5.1 本周模式选择

- **Facade**：ModemController 面向 AT command 提供高层 API，隐藏帧编码与底层 transport。它应该包含 ByteTransport&，而不是为了转发 Write() 就继承 ByteTransport。
- **Strategy**：UART / USB / Fake 确实需要在启动期替换时，ByteTransport 是稳定策略接口；若固件编译期只使用一种 transport，则优先具体类型或 template / concept。
- **Adapter**：当 vendor HAL 的签名、错误码、timeout 或 buffer 语义与上层 contract 不一致时，在 HAL 边界做适配。
- **PImpl**：这是实现隐藏 idiom，不是 GoF 模式。只有编译依赖、对象表示或 ABI 边界值得付出时才使用。
- **Decorator**：日志、计数或限流是独立变化轴且确实需要透明包装时才考虑；不要只为一个 printf 增加多层 wrapper。
- **不需要**：没有异步事件就不加 Observer；没有多种运行期创建路径就不加 Factory；没有共享生命周期需求就不加 shared_ptr；不使用 Service Locator 隐藏 required dependency。

### 5.2 Ownership / Borrow / Lifetime

- Composition root 拥有 UartTransport / UsbTransport。
- ModemController 通过 ByteTransport& 借用 transport；transport 必须先构造、后销毁。
- AtCommandEncoder 是无资源的值成员，由 ModemController 直接拥有。
- 同步 Write 中 span 只借用到调用返回。若 HAL 将 buffer 交给 DMA 异步读取，必须由固定 buffer owner 保证它活到 completion / cancel / drain。
- 若增加 callback，必须定义 target owner、registration token、unregister / cancel、in-flight drain、线程上下文与销毁顺序。

### 5.3 Pattern 滥用检查

一个 interface 只有在调用者确实需要运行时替换、独立测试替身或稳定插件边界时才值得存在。不要因为“未来可能扩展”就让每个类都 virtual；也不要把 required dependency 放进全局 registry。

## ⑥ Embedded / System Design：Modem AT Middleware（约 7 分钟）

~~~text
Composition Root
  ├── owns FakeUartTransport / UartTransport / UsbTransport
  └── constructs ModemController
                 |
                 | borrows ByteTransport&
                 v
          ModemController (Facade)
            ├── owns AtCommandEncoder by value
            └── calls ByteTransport::Write
                         |
                         v
                    HAL / Driver
~~~

- **Task context**：由 ModemTask 作为 transport 的唯一调用者，或在接口层定义有界串行化。不要让多个 task 随意竞争 UART。
- **ISR**：ISR 只做最小状态记录 / 固定容量队列投递；不要在 ISR 中调用可能阻塞、分配、等待 DMA 或执行无界 callback 的发送路径。
- **Memory**：Lab 的命令帧使用固定 std::array，最大命令长度固定；编码复杂度为 O(n)，n 有明确上界。真实固件还要核算栈、DMA buffer 和 queue 深度。
- **WCET**：将最多 32 字节的编码、virtual indirect call、HAL 提交、锁和失败路径一起测量；Host 输出不能代表目标 MCU WCET。
- **Timeout**：API 使用 std::chrono::milliseconds；HAL 转 RTOS tick 时检查溢出、舍入和最大等待值。
- **Thread safety**：virtual 不提供同步。若 transport 由单一 ModemTask 独占，其他 task 通过消息队列提交请求。
- **Error propagation**：输入非法、timeout、transport failure 必须保持可区分；不要把失败折叠成 bool 或日志文本。
- **Callback / DMA**：本 Lab 是同步借用。异步化后必须重新设计 buffer owner 和 teardown，不能继续借用栈上的 EncodedAtCommand。

## ⑦ 今日编码规范（MUST / SHOULD）

### MUST 1：Facade / orchestrator 通过 composition 使用底层 transport

**错误写法：**

~~~cpp
class ModemController : public ByteTransport {
 public:
  Status Write(std::span<const std::byte> bytes,
               std::chrono::milliseconds timeout) noexcept override {
    return transport_.Write(bytes, timeout);
  }
 private:
  ByteTransport& transport_;
};
~~~

这让高层控制器伪装成底层 transport，并暴露绕过 AT command 校验 / 编码的低层入口。

**推荐写法：**

~~~cpp
class ModemController {
 public:
  explicit ModemController(ByteTransport& transport) noexcept
      : transport_(transport) {}
  Status SendAt(std::string_view command) noexcept;
 private:
  ByteTransport& transport_;  // borrow; owner outlives controller
};
~~~

### MUST 2：required dependency 的 owner / borrow 必须显式

**错误写法：**

~~~cpp
class ModemController {
  ByteTransport* transport_{nullptr};  // required dependency 却允许空状态
};
~~~

**推荐写法：**

~~~cpp
class ModemController {
 public:
  explicit ModemController(ByteTransport& transport) noexcept
      : transport_(transport) {}
 private:
  ByteTransport& transport_;
};
~~~

若依赖确实可选，再用指针或 optional reference wrapper 表达可选语义，并定义缺省行为。

### SHOULD 3：实时路径使用有界存储、显式单位和可审计错误

**错误写法：**

~~~cpp
std::vector<std::byte> frame;
frame.insert(frame.end(), payload.begin(), payload.end());  // 可能扩容
transport.Write(frame, 100);  // 裸整数 timeout
~~~

**推荐方向**：使用固定容量 std::array / 有界 span，timeout 使用 chrono duration，状态使用 enum class，边界长度与超时值用命名常量；若目标路径允许动态分配，必须有预算和失败模型。

## ⑧ 可编译 Lab / 练习（约 10 分钟）

所有程序都在独立源文件中，包含自己的 main()，不得将多个 main() 链接到同一个可执行文件。

### 主 Lab：用 Facade + Composition 组织 Modem AT 发送

源码：[examples/day-091/main.cpp](../examples/day-091/main.cpp)

~~~bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic examples/day-091/main.cpp -o day91
./day91
~~~

预期行为：

~~~text
UART TX bytes=8
sent=ok empty=invalid-argument too_long=invalid-argument timeout=timeout
uart_writes=1
controller_is_transport=false
Facade composes a transport; fixed buffers keep the send path bounded
~~~

检查：ModemController 不继承 ByteTransport；transport 是 required borrow；encoder 和 frame 使用值语义 / 固定容量；只有有效命令到达 transport；没有发送热路径 heap allocation。

### Exercise 01：Code Review 修复“Facade 冒充 Transport”

源码：[examples/day-091/exercise-01.cpp](../examples/day-091/exercise-01.cpp)

~~~bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic examples/day-091/exercise-01.cpp -o day91-ex01
./day91-ex01
~~~

Starter 是**逻辑 / 设计违规但可编译运行**的版本。它故意让 ModemController public inherit ByteTransport 并转发 Write()，因此调用者可以绕过 SendAt() 的高层校验。

请按以下步骤重构：

1. 删除 ModemController 对 ByteTransport 的 public inheritance。
2. 保留 ByteTransport& 作为 required borrowed member；不要改成 shared_ptr。
3. 删除 ModemController 的 Write() override；只暴露 SendAt() 这样的领域 API。
4. SendAt() 直接调用 transport_.Write()，并保留命令长度、空输入、timeout 与错误映射检查。
5. 删除通过 ByteTransport& 指向 ModemController 的调用；这条调用在正确设计中应无法编译。
6. 重新编译运行，检查 controller 不再是 ByteTransport，底层 raw Write 不会通过控制器公开 API 绕过 AT 边界。

主 Lab 提供了一个完整的 composition / Facade 参考实现。

## ⑨ 三个常见坑

1. **把实现细节当标准保证**：vtable / vptr 的具体布局、对象增加的字节数和 ABI 不是可移植的 C++ 标准契约；性能必须在目标平台测量。
2. **把继承当作代码复用快捷键**：如果高层对象只是调用底层 transport，它通常是 has-a / uses-a。继承会扩大可见 API，并可能让调用者绕过领域不变量。
3. **把 borrow 当 owner，或把同步 span 当异步 buffer**：引用、span、string_view 都不会自动延长生命周期。DMA / callback 必须有独立 owner、cancel、drain 与 teardown 顺序。

## ⑩ 检查题

### 知识 / 代码检查

1. 为什么 override 是编译期重写检查，而 virtual 提供运行时分派？如果只通过 Base& 借用对象，是否因此就必须使用 shared_ptr？说明 owner 与 borrower 的区别。
2. Day 87 的 PImpl 使用 unique_ptr<Impl>。为什么析构函数通常放在 Impl 完整定义之后实现？PImpl 的初始化分配能否直接放进 ISR / 硬实时路径？

### 设计题

某 Modem 产品线有三种构建：

- A：单板固件，UART 在编译期固定，严格 WCET 预算；
- B：多 SKU，启动时按配置选择 UART 或 USB，并需要 Host Fake；
- C：Linux Middleware 支持运行时插件，但插件数量、ABI 版本和卸载必须受控。

请分别选择具体类型 / composition、template / concept、Strategy / virtual interface、Facade、Adapter 或受控插件边界。回答必须覆盖：

- 真实变化轴与稳定的 Write / SendAt contract；
- 哪些接口是 runtime extension，哪些应保持普通值类型；
- composition root、owner、borrow、PImpl 和 teardown；
- shared_ptr / Factory / Service Locator 是否必要，为什么；
- DMA buffer、callback unregister / cancel / in-flight drain；
- task / ISR 上下文、timeout、错误传播、RAM / Flash、WCET 与边界测试。

### 今日设计决策路径

需求变化 → 识别变化轴 → 寻找稳定边界 → 选择 C++ 语言机制 → 判断是否需要 Pattern → 设计 owner / borrow / lifetime → 检查 Embedded / 实时约束 → Code Review。

**本周结论：先确定调用者真正需要的契约，再选择 value / composition / inheritance / virtual。Facade 不应为了转发而伪装成底层接口；Strategy 只服务真实运行时变化；ownership 与生命周期始终独立于多态机制。**

## 参考

- Marc Gregoire, *Professional C++, Sixth Edition*, Chapter 9 pp.295–355；Chapter 10 pp.357–419。
- [O’Reilly：Chapter 10 · Discovering Inheritance Techniques](https://www.oreilly.com/library/view/professional-c-6th/9781394193172/c10.xhtml)
- [Wiley：Professional C++, 6th Edition](https://www.wiley.com/en-us/Professional%2BC%2B%2B%2C%2B6th%2BEdition-p-9781394193202)
- 仓库扩展：[Facade / Structural Patterns](../patterns/02-structural-patterns.md) · [Strategy / Behavioral Patterns](../patterns/03-behavioral-patterns.md) · [Ownership and Smart Pointers](../patterns/ownership-and-smart-pointers.md)
