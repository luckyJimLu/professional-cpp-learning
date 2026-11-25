# Day 92 · Preventing Overriding：用 final 关闭不应再变化的继承点

> **主教材**：Marc Gregoire, *Professional C++, Sixth Edition*（C++23），Chapter 10 · Discovering Inheritance Techniques。  
> **今日小节**：Preventing Overriding，约 p.370。  
> **辅教材**：Dmitri Nesteruk, *Design Patterns in Modern C++*；只映射与本节相关的 Template Method / Strategy 设计判断，不改变主教材顺序。  
> **仓库扩展**：[Template Method / Non-Virtual Interface](../patterns/03-behavioral-patterns.md#模板方法) 与现有 Inheritance / ownership notes。  
> **预计用时**：60 分钟。

## ① 今日章节与建议阅读范围（约 6 分钟）

今天继续 Chapter 10，不跳章：

- **Chapter 10 · Discovering Inheritance Techniques**
- 今日小节：**Preventing Overriding**
- **建议阅读：p.370**。先回顾 Day 89–90 的 virtual、override、final overrider 与虚析构契约（约 pp.362–369），再阅读 final 如何阻止继续重写。
- 阅读时重点回答：
  1. final 加在类名后与加在虚函数声明后，分别关闭什么变化？
  2. final 关闭的是整个类层级，还是某一个虚函数槽位？
  3. 哪些行为必须固定，哪些扩展点仍应保留？
- **下一小节**：Inheritance for Reuse，按原书顺序继续。

**60 分钟安排**：阅读 6 分钟 → 昨日复习 5 分钟 → final 语言机制 12 分钟 → C / Modern C++ 对照 6 分钟 → Pattern 映射 8 分钟 → Embedded 场景 8 分钟 → 规范与 Lab 10 分钟 → 检查题 5 分钟。

## ② 昨日复习 3 问（约 5 分钟）

1. Day 91 复盘中，为什么 ModemController 通过 composition 持有 ByteTransport，而不是 public inherit ByteTransport？
2. 通过 TxPipeline& 调用对象，与通过 std::unique_ptr<TxPipeline> 拥有对象，分别表达什么？virtual 是否会替调用方延长对象生命周期？
3. 固件编译期固定 UART、设备启动时选择 UART / USB、Linux 运行期加载插件，这三种变化轴分别更适合具体类型、Strategy / virtual interface，还是受控插件边界？

**复习要点：**

- public inheritance 是 is-a / substitutability 承诺，不是为了转发函数或复用代码。
- 引用和 span 表示 borrow；owner 必须比 borrower 活得更久。virtual 只负责动态分派，不负责创建、销毁、同步或延长生命周期。
- 只有真实运行时变化轴才值得引入 Strategy / virtual；固定固件配置优先评估具体类型或 template / concept。

## ③ 核心概念：final 是编译期的扩展边界（约 12 分钟）

### 3.1 两种 final，关闭两种不同的变化

**类级 final：禁止继续派生**

~~~cpp
class UartTransport final : public ByteTransport {
 public:
  Status Write(std::span<const std::byte> bytes) noexcept override;
};

// 错误：UartTransport 是 final class，不能再作为基类。
class TracedUartTransport : public UartTransport {};
~~~

类级 final 表示该具体类型不再接受派生类。它仍然可以实现接口、被构造、被组合，也可以通过基类引用参与运行时多态；只是不能再成为其他类的基类。

**成员函数级 final：只关闭一个虚函数重写点**

~~~cpp
class TransportBase {
 public:
  virtual ~TransportBase() = default;
  virtual Status Submit(std::span<const std::byte> bytes) noexcept = 0;
};

class DmaTransport : public TransportBase {
 public:
  Status Submit(std::span<const std::byte> bytes) noexcept override final;
};

class InstrumentedDmaTransport : public DmaTransport {
 public:
  // 可以增加其他成员，也可以重写 DmaTransport 仍开放的其他虚函数。
  // 但不能再次 override Submit()。
};
~~~

成员函数 final 不禁止继续继承这个类，只禁止后续派生类重写这个虚函数。它适合“类仍需开放某些扩展点，但某个步骤已经是必须保持的不变量”的情况。

### 3.2 override 与 final 的职责不同

| 声明 | 编译器检查 / 契约 |
|---|---|
| virtual | 建立虚函数分派契约 |
| override | 要求当前声明确实重写了基类虚函数；签名不匹配就是编译错误 |
| override final | 当前函数是一次有效重写，并且后续派生类不得再重写它 |
| class Name final | 当前类不得再被继承 |

建议统一写成 override final。标准也允许 final override；两者语义相同。final 只能用于虚成员函数，不能把普通非虚函数标记为 final。

### 3.3 final overrider：基类视角仍然进行动态分派

假设 Base::Run() 是 virtual，Derived::Run() 是 override final：

- 通过 Base& 调用 Run()，仍会分派到 Derived::Run()。
- 更深层派生类可以继承这个实现，但不能替换它。
- final 不会把虚函数变成非虚函数，也不会改变已经建立的基类接口。
- 若后续类声明了同名但不同参数的函数，它可能只是 name hiding / overload，并不构成对 final 函数的 override。不要把“同名”误判为“重写”。

### 3.4 final 不等于“冻结整个类的所有行为”

final 不会：

- 禁止组合该对象；
- 禁止新增非虚成员或不同签名的重载；
- 自动保证线程安全、对象生命周期或 ABI 稳定；
- 自动消除 virtual call；
- 自动证明某个实现满足 Liskov Substitution Principle。

final 可能帮助编译器证明某个动态类型并进行 devirtualization，但这是优化机会，不是语言保证，也不是可替代目标平台测量的性能承诺。

### 3.5 什么时候关闭，什么时候保持开放？

- **具体叶子类没有受支持的派生需求**：考虑 class final。
- **中间类仍需扩展，但某个硬件提交步骤必须固定**：只把该 override 标记 final。
- **基类接口需要被 UART、USB、Fake 等多种实现**：不要把接口基类标记 final。
- **需求只是增加日志、计数、限流**：先考虑 composition；只有需要可叠加的透明包装时才考虑 Decorator。
- **需求是替换硬件实现**：让多个具体类型实现稳定接口，而不是通过继承某个具体 UART 类来改变硬件。

## ④ C 写法 vs Modern C++：从约定转为编译器约束（约 6 分钟）

| 维度 | C / 函数表式实现 | Modern C++ |
|---|---|---|
| 动态分派 | struct + function pointer + void* context | virtual interface + override |
| 固定实现 | 通过 const 函数表、模块封装和评审约定 | 具体类可标记 final |
| 禁止替换单个步骤 | 需要封装函数表、限制写入点并依赖约定 | virtual override 可标记 final |
| 签名校验 | 函数指针类型能检查调用签名，但没有类层级 override 关系 | override 检查是否真正重写基类虚函数 |
| 测试替身 | 手工替换函数表和 context | 独立 Fake 实现稳定接口；不必继承具体 final 类 |
| 成本 | C ABI 简单，但生命周期和表的可变性需手工治理 | 编译期约束更明确；仍需评估 vcall、对象布局、代码体积和 WCET |

C 并非不能冻结函数表：可以把函数表对象设为 const，并隐藏修改入口。但 C 没有 C++ 的类继承与 override 规则，因此无法用同一套语言机制表达“这个派生类的某个虚函数是最后一次重写”。

**工程判断**：final 的价值主要是把扩展边界变成编译期契约，而不是把所有代码都改成 final。

## ⑤ 设计模式映射：Template Method / NVI 与选择性 final（约 8 分钟）

### 5.1 真实变化轴

以 DMA UART 提交流程为例：

- 输入校验、长度上限、timeout 检查、成功后的统一记账，是所有实现都必须遵守的稳定流程。
- 底层硬件提交是具体 transport 的实现点。
- 统计、诊断或 trace 可以是可选扩展点。
- 如果产品需要替换 UART / USB，则变化轴是 transport 类型，应使用独立 Strategy 实现，而不是让 USB 继承 UART 具体类。

### 5.2 Template Method / Non-Virtual Interface

NVI 将 public 操作保持为非虚函数，由它统一执行校验和流程，再调用 protected virtual hook。它是 Template Method 思路的一种常见实现方式。

~~~cpp
class TxPipeline {
 public:
  Status Send(std::span<const std::byte> payload) noexcept {
    if (payload.empty()) {
      return Status::kInvalidArgument;
    }
    const Status status = DoSend(payload);
    if (status == Status::kOk) {
      OnAccepted(payload.size());
    }
    return status;
  }

 protected:
  virtual Status DoSend(std::span<const std::byte> payload) noexcept = 0;
  virtual void OnAccepted(std::size_t bytes) noexcept {}
};

class DmaUartPipeline : public TxPipeline {
 protected:
  Status DoSend(std::span<const std::byte> payload) noexcept override final;
  void OnAccepted(std::size_t bytes) noexcept override;
};
~~~

这里 final 不是用来“增加抽象层”，而是把不允许后续派生类改变的硬件提交步骤关闭。OnAccepted 仍然开放，说明变化点是经过选择的，而不是全部锁死。

### 5.3 Strategy、Decorator 与不过度设计

- **Strategy**：UART / USB / Fake 是可替换的 transport 策略。由 composition root 选择具体实现；不要让 UsbTransport 继承 UartTransport。
- **Decorator**：当日志、计数、限流等策略需要独立组合、叠加时，可以包装稳定接口。若只是一个局部计数器，普通成员或 composition helper 更简单。
- **不需要 Factory**：若只有一个固定创建点，直接构造即可；不要为了 final 再引入 Factory。
- **不需要 Observer**：本课的 OnAccepted 是同步 protected hook，不是异步事件订阅；没有多个独立订阅者就不要引入 Observer。
- **不需要 shared_ptr**：final 不改变 owner / borrow。composition root 仍是唯一 owner，调用方通过引用借用。

### 5.4 Ownership / Borrow / Lifetime

- Composition root 拥有 concrete transport。
- ModemTask / controller 通过 TxPipeline& 借用接口；borrower 必须先销毁，owner 后销毁。
- main Lab 的 span 只在同步 Send 调用期间借用。
- 若真实 HAL 把 buffer 交给 DMA 异步读取，必须把数据放入固定 DMA ring / pool，并让明确 owner 持有到 completion / cancel / drain。
- 若未来加入异步 callback，必须定义 callback target owner、registration token、unregister / cancel、in-flight drain、线程上下文和销毁顺序。final 不会解决 dangling callback。

## ⑥ Embedded / System Design：RTOS DMA UART 的扩展边界（约 8 分钟）

~~~text
Composition Root
  ├── owns InstrumentedDmaUartPipeline
  └── constructs ModemTask
                 |
                 | borrows TxPipeline&
                 v
             TxPipeline::Send()       非虚 public contract
                 |
                 +-- validate length / timeout
                 |
                 +-- DoSend()         virtual hook
                 |     DmaUartPipeline::DoSend() override final
                 |
                 +-- OnAccepted()     optional extension hook
                       InstrumentedDmaUartPipeline may override
~~~

### 6.1 调用上下文与实时约束

- **Task / ISR**：Send 只允许在约定的 task context 调用。ISR 只记录完成事件或投递固定容量队列，不执行可能阻塞的发送流程。
- **Timeout**：接口使用 std::chrono::milliseconds；HAL 转 RTOS tick 时检查溢出、舍入和最大等待值。
- **内存上界**：Lab 最大 payload 为 8 bytes，使用固定数组 / span，不在发送路径动态分配。真实固件还要核算 DMA descriptor、ring 深度、栈和队列容量。
- **WCET**：final 是编译期约束，不是 WCET 证明。目标板上仍需测量间接调用、锁、cache / flash wait-state、DMA 提交、错误路径和中断干扰。
- **线程安全**：virtual、final 都不提供同步。若 transport 由单一 ModemTask 独占，其他 task 通过消息队列提交请求。
- **错误传播**：空输入、超长帧、timeout、硬件错误应保持可区分的 Status，不折叠成 bool 或日志字符串。
- **DMA buffer lifetime**：本 Lab 是同步 Host 模拟；真实异步 DMA 不能继续读取调用方栈上的临时数组。必须由固定 buffer owner 保证生命周期直到完成。
- **日志**：示例中的 std::cout 仅用于 Host 可观察输出；固件热路径应使用有界 trace / 事件计数，不把格式化和终端 I/O 带入 ISR。

### 6.2 哪些类适合 final？

- 单板产品固定使用的具体 DMA UART driver，且不支持派生扩展：可以 class final。
- 仍需为 telemetry 增加一个受控 hook 的中间类：可只将硬件提交函数 override final，保留其他 hook。
- UART / USB 的共同接口：保持开放，不标记 final。
- Host Fake：实现共同接口即可，不应为了替换测试对象而继承某个 final 具体 driver。

## ⑦ 今日编码规范（MUST / SHOULD）

### MUST 1：所有预期重写都必须标记 override；禁止进一步重写的函数使用 override final

**错误写法：**

~~~cpp
class DmaUartPipeline : public TxPipeline {
 protected:
  Status DoSend(std::span<const std::byte> bytes) noexcept;  // 看不出是否真正 override
};
~~~

**推荐写法：**

~~~cpp
class DmaUartPipeline : public TxPipeline {
 protected:
  Status DoSend(std::span<const std::byte> bytes) noexcept override final;
};
~~~

### SHOULD 2：只有不支持继续派生的具体叶子类才标记 class final

**错误写法：**

~~~cpp
class TxPipeline final {
 public:
  virtual Status Send() noexcept = 0;  // 把所有实现和 Fake 都挡在外面
};
~~~

**推荐写法：**

~~~cpp
class TxPipeline {
 public:
  virtual ~TxPipeline() = default;
  virtual Status Send() noexcept = 0;
};

class UartPipeline final : public TxPipeline {
 public:
  Status Send() noexcept override;
};
~~~

### MUST 3：final 不得作为性能或线程安全的替代证明

**错误判断：**

- “加了 final，虚调用一定消失。”
- “加了 final，类就线程安全。”
- “加了 final，派生对象的生命周期就自动正确。”

**推荐判断**：final 只关闭继承 / override 变化点。性能通过目标编译器与硬件测量；同步、owner / borrow、timeout、buffer lifetime 和 teardown 仍需独立设计。

命名继续遵守 guideline：类型 PascalCase、函数 PascalCase、变量 snake_case、成员 snake_case_、常量 kPascalCase；错误使用 enum class，实时路径优先固定容量，所有阻塞操作定义 timeout。

## ⑧ 可编译 Lab / 练习（约 10 分钟）

每个源文件均包含独立 main()，必须单独编译，不要把两个 main() 链接到同一个程序。

### 主 Lab：用 NVI 固定流程，并选择性关闭一个虚函数

源码：[examples/day-092/main.cpp](../examples/day-092/main.cpp)

~~~bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic examples/day-092/main.cpp -o day92
./day92
~~~

预期输出：

~~~text
dma-submit bytes=4
accepted bytes=4
telemetry bytes=4
ok=ok empty=invalid-argument oversized=too-large timeout=timeout
hardware_writes=1 accepted=1 telemetry=1
instrumented_leaf_is_final=true
NVI keeps validation stable; final closes only the hardware hook
~~~

观察重点：

1. TxPipeline::Send 是非虚 public contract，统一处理空输入、长度上限和 timeout。
2. DmaUartPipeline::DoSend 使用 override final，后续派生类不能改变该硬件提交步骤。
3. OnAccepted 仍然是开放 hook，InstrumentedDmaUartPipeline 可以增加同步 telemetry。
4. InstrumentedDmaUartPipeline 是 concrete leaf，因此标记 class final。
5. 所有对象使用自动存储期；本 Lab 不依赖 heap、shared_ptr 或异步 callback。

### Exercise 01：修复派生类绕过 UART 校验的问题

源码：[examples/day-092/exercise-01.cpp](../examples/day-092/exercise-01.cpp)

~~~bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic examples/day-092/exercise-01.cpp -o day92-ex01
./day92-ex01
~~~

这是一个**逻辑 / 设计违规但可编译运行**的 starter。预期会看到空 payload 和超长 payload 都返回 ok，且没有进入 UartPipeline 的硬件提交计数。问题不是编译器不会检查函数签名，而是当前设计允许 FastUartPipeline 合法 override 整个 Send()，从而绕过基类校验。

请完成重构：

1. 判断 UartPipeline 是否是受支持的扩展基类。如果它只是一个具体硬件实现，将它标记为 class final。
2. 删除 FastUartPipeline 这种通过继承重写 Send() 的实现；不能通过修改 Status 或忽略参数来保留漏洞。
3. 如果确实需要计数 / telemetry，使用一个持有 TxPipeline& 的 wrapper 或普通 composition helper；明确该引用是 borrow，底层 pipeline 必须先构造、后销毁。
4. wrapper 必须委托给底层 Send()，不能复制一份校验逻辑，更不能绕过长度和 timeout 检查。
5. 增加验证：空输入返回 invalid-argument，超长输入返回 too-large，两个失败路径都不能增加硬件写计数。
6. 如果 telemetry 只有一个局部计数器，说明为什么普通成员可能比 Decorator 更合适；只有存在可叠加包装需求时才引入 Decorator。

重构后必须仍然能单独编译运行：

~~~bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic examples/day-092/exercise-01.cpp -o day92-ex01
./day92-ex01
~~~

**通过标准**：不存在绕过校验的派生类；接口仍允许独立 Fake / USB 实现；具体 UART 实现的扩展边界明确；owner / borrow 和调用上下文可解释。

## ⑨ 三个常见坑

1. **把 final 加在非虚函数上**：final 的成员函数形式只适用于虚函数。普通函数不需要 final；若编译器报告 marked final but is not virtual，先检查继承契约，而不是机械添加 virtual。
2. **过早把所有类标记 final**：这会关闭本来需要的 Fake、产品变体和扩展点。应先识别变化轴，再决定是关闭整个类、单个虚函数，还是保持接口开放。
3. **把 final 当成 ownership / concurrency / performance 工具**：final 不会拥有对象、不延长 span 生命周期、不取消 callback、不提供锁，也不保证 devirtualization。实时路径仍要审查分配、阻塞、锁、DMA buffer、WCET 和 teardown。

## ⑩ 检查题（约 5 分钟）

### 知识 / 代码检查

1. Base::Process() 是 virtual，Derived::Process() 声明为 override final。再派生类可以继承 Derived::Process() 吗？可以新增其他虚函数吗？能否用同名不同参数的函数构成 override？逐项解释。
2. 为什么 final 不能用于普通非虚成员函数？如果一个类标记为 final，它实现的基类 virtual function 还会不会通过 Base& 动态分派？

### 设计题：Modem DMA Driver 的扩展策略

某产品有一个 DmaUartDriver，DMA 提交步骤必须保证 buffer 对齐、长度不超过固定 descriptor 上限，并且只允许 ModemTask 调用。现在提出三个变化：

- A：某一具体板型永远使用同一个 DMA 提交算法；
- B：同一产品系列需要在启动时选择 UART 或 USB；
- C：多个产品都需要可选的 trace / accepted-byte counter，但不能改变 DMA 安全检查。

请分别判断保持简单、composition、Template Method / NVI、Strategy / virtual interface 或 Decorator 是否必要。回答必须覆盖：

- A 的硬件提交 hook 是否应 override final，具体 driver 是否应 class final；
- B 的变化轴在哪里，为什么不能通过继承 UART 具体类实现 USB；
- C 是否真需要 Decorator，还是一个普通成员 / composition helper 已足够；
- composition root、owner、borrow、析构顺序和 Fake 测试替换；
- DMA buffer owner 如何活到 completion / cancel / drain；
- Task / ISR 上下文、timeout、线程安全、RAM / Flash、WCET 和边界测试。

### 今日设计决策路径

需求变化 → 识别变化轴 → 寻找稳定边界 → 选择 C++ 语言机制 → 判断是否需要 Pattern → 设计 owner / borrow / lifetime → 检查 Embedded / 实时约束 → Code Review。

**本日结论：final 是“关闭明确不允许变化的继承点”，不是“把设计全部封死”。先确定哪些行为必须稳定，再选择 class final 或 override final；真正需要变化的部分继续通过小接口、composition 或 Strategy 暴露。**

## 参考

- Marc Gregoire, *Professional C++, Sixth Edition*, Chapter 10 · Discovering Inheritance Techniques；Preventing Overriding，约 p.370。
- [O’Reilly · Professional C++, 6th Edition · Chapter 10](https://www.oreilly.com/library/view/professional-c-6th/9781394193172/c10.xhtml)
- [cppreference · final specifier](https://en.cppreference.com/w/cpp/language/final)
- [cppreference · virtual functions and final overrider](https://en.cppreference.com/w/cpp/language/virtual)
- [仓库 · Template Method / Non-Virtual Interface](../patterns/03-behavioral-patterns.md#模板方法)
- [仓库 · Embedded C++ Coding Guideline notes](../guidelines/embedded-cpp-guideline-notes.md)
