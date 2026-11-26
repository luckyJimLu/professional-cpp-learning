# Day 93 · Inheritance for Reuse：继承复用、父类生命周期与安全的扩展边界

> **主教材**：Marc Gregoire, *Professional C++, Sixth Edition*（C++23），Chapter 10 · Discovering Inheritance Techniques。  
> **今日小节**：Inheritance for Reuse，目录范围 pp.370–379。  
> **小节覆盖**：WeatherPrediction 示例、Adding Functionality in a Derived Class、Replacing Functionality in a Derived Class、Respect Your Parents、Parent Constructors / Destructors、构造与析构期间的 virtual dispatch、Referring to Parent Names、Casting Up and Down。  
> **辅教材**：Dmitri Nesteruk, *Design Patterns in Modern C++*；仅用于判断 Template Method、Strategy、Decorator 与 composition 的边界。  
> **仓库扩展**：[组合优于继承与行为模式](../patterns/03-behavioral-patterns.md)；结合既有 ownership / lifetime 课程。  
> **预计用时**：60 分钟。

## ① 今日章节与建议阅读范围（约 6 分钟）

今天沿 Chapter 10 的原书顺序，承接 Day 92 的 Preventing Overriding：

- **Chapter 10 · Discovering Inheritance Techniques**
- 今日小节：**Inheritance for Reuse**
- **建议阅读：pp.370–379**。按小节顺序阅读：
  1. WeatherPrediction：p.370
  2. Adding Functionality in a Derived Class：p.371
  3. Replacing Functionality in a Derived Class：p.373
  4. Respect Your Parents / Parent Constructors / Parent Destructors：pp.373–376
  5. virtual Member Function Calls within Constructors and Destructor：p.376
  6. Referring to Parent Names：p.377
  7. Casting Up and Down：p.379
- 阅读时持续追问：**我是在表达 is-a，还是只想复用几行代码？父类是否拥有必须保持的不变量？派生类能否真正替代父类？**
- **下一小节**：Inheritance for Polymorphism，p.380；今天不提前展开 SpreadsheetCell 多态层次。

**60 分钟安排**：教材阅读 6 分钟 → 昨日复习 5 分钟 → 继承复用与生命周期 14 分钟 → C / Modern C++ 对照 6 分钟 → Pattern 判断 7 分钟 → Embedded 场景 8 分钟 → 编码规范与 Lab 9 分钟 → 检查题 5 分钟。

## ② 昨日复习 3 问（约 5 分钟）

1. Day 92 中，class-level final 与 virtual member-level final 分别关闭什么扩展点？如果 UART 和 USB 都要实现同一个稳定 transport contract，哪个类不应被标记为 final？
2. Day 92 的 NVI 中，为什么 public Send() 保持 non-virtual，而 DoSend() 是 virtual hook？如果在 DoSend() 中增加日志，是否自动解决了异步 DMA buffer 的生命周期？
3. 阅读下面声明，判断它是“真正重写”还是“隐藏名称”：派生类声明了与基类同名、但参数不同的非虚函数。若要保留基类同名重载集合，应该使用什么声明？

**复习要点：**

- final 是编译期继承约束，不是 ownership、线程安全或 WCET 证明。
- NVI 把稳定流程留在非虚 public API，把变化点放在受控 hook；hook 的 owner、调用上下文和生命周期仍需单独定义。
- 不同签名的同名函数不等于 override；派生类声明会隐藏基类同名 overload set，可用 using 声明恢复可见性。

## ③ 核心概念：继承可以复用实现，但不能把“复用”误写成 is-a（约 14 分钟）

### 3.1 两个不同问题：类型替代与代码复用

继承至少涉及两个不同设计问题：

- **Substitutability（可替代性）**：调用方拿到 Base& / Base* 时，Derived 是否能遵守 Base 的全部前置条件、后置条件、错误语义和生命周期约定？这是 public inheritance 的核心承诺。
- **Implementation reuse（实现复用）**：两个类型是否只是恰好需要相同的计数、缓存、校验或转换代码？相同代码并不自动意味着 is-a。

如果 UartSender 和 AtCommandSession 都需要 RetryBudget，它们并不是一种 RetryBudget。把 RetryBudget 设为 public base 会把内部策略暴露给调用者，调用者甚至可以绕过各自的发送流程直接消耗重试次数。

优先选择：

1. **Composition**：把可复用行为建模为成员对象；成员可以是值语义、固定容量、独立可测试的小组件。
2. **Private inheritance**：只在确有语言层面的基类关系需求、且组合表达不合适时考虑；它隐藏外部可见的 is-a 转换，但仍引入基类实现耦合、初始化顺序和脆弱基类问题。
3. **Public inheritance**：仅当派生类必须能被所有 Base API 使用者安全替代时使用。
4. **Template / concept**：若变化在编译期已确定，优先评估静态多态；不要为了少写一个虚函数就引入庞大模板框架。

### 3.2 添加功能与替换功能不是一回事

**Adding functionality**：派生类增加新的数据或操作。新增能力只对派生类静态类型可见；通过 Base& 调用时，调用方仍只能看到 Base contract。

**Replacing functionality**：只有基类函数是 virtual，派生类声明匹配的 override，才会通过基类视角动态分派。若基类函数非 virtual，派生类写一个同名函数只是 name hiding，不会改变基类调用行为。

~~~cpp
class Sensor {
 public:
  void Reset() noexcept { ResetHardware(); }

  virtual int ReadRaw() noexcept { return 0; }
  virtual ~Sensor() = default;

 protected:
  virtual void ResetHardware() noexcept {}
};

class AdcSensor final : public Sensor {
 public:
  int ReadRaw() noexcept override { return 123; }

  // 这是新增能力，不属于 Sensor 的公共契约。
  int ReadMillivolts() noexcept { return 1230; }
};
~~~

不要为了“子类能访问”而把所有数据成员改成 protected。protected state 会让每个派生类都成为父类不变量的共同维护者；优先 private state + protected 小型操作函数。

### 3.3 父类构造与析构：先建立基类，再建立派生类

构造顺序（忽略虚基类时）：

1. 直接基类，按基类声明顺序；
2. 成员对象，按成员声明顺序；
3. 派生类构造函数体。

析构顺序相反：

1. 派生类析构函数体；
2. 派生类成员，按声明逆序析构；
3. 基类析构函数体。

必须通过成员初始化列表显式传递基类构造参数：

~~~cpp
class Device {
 public:
  explicit Device(int device_id) noexcept : device_id_(device_id) {}
  virtual ~Device() = default;

 private:
  int device_id_;
};

class UartDevice final : public Device {
 public:
  UartDevice(int device_id, int baud_rate) noexcept
      : Device(device_id), baud_rate_(baud_rate) {}

 private:
  int baud_rate_;
};
~~~

不应在派生类析构函数中手工调用 Base::~Base()。语言会自动完成基类销毁；手动调用会导致对象生命周期被破坏或重复析构。

### 3.4 构造 / 析构期间的 virtual dispatch 有边界

在 Base 构造函数或 Base 析构函数中调用 virtual function，动态分派不会进入更派生层的 override，而只会落在当前正在构造 / 析构的类层级。

原因是：Base 构造期间，Derived 部分尚未建立；Base 析构期间，Derived 部分已经销毁。语言不允许把尚未开始或已经结束生命周期的派生部分当成有效对象使用。

**危险写法：**

~~~cpp
class Base {
 public:
  Base() { Initialize(); }
  virtual ~Base() { Shutdown(); }

 protected:
  virtual void Initialize() noexcept {}
  virtual void Shutdown() noexcept {}
};

class Derived final : public Base {
 protected:
  void Initialize() noexcept override { /* 期望访问派生成员 */ }
  void Shutdown() noexcept override { /* 期望访问派生成员 */ }
};
~~~

Base::Base() 中的 Initialize() 不会分派到 Derived::Initialize()；Base::~Base() 中的 Shutdown() 也不会分派到 Derived::Shutdown()。若构造 / 析构期间调用纯虚函数，程序行为未定义。

**推荐**：构造函数只建立本层不变量；派生层初始化依赖在派生构造函数体或显式工厂步骤中完成。析构函数只清理本层拥有的资源；跨层 teardown 使用明确的 Stop / Close 协议，并在对象销毁前完成异步任务 drain。

### 3.5 引用父类名称：using 与 Base::Function() 的差别

派生类声明同名函数会隐藏基类同名 overload set：

~~~cpp
class Base {
 public:
  void Read() noexcept {}
  void Read(int channel) noexcept {}
};

class Derived : public Base {
 public:
  using Base::Read;  // 恢复 Base::Read() 与 Base::Read(int) 的可见性
  void Read(double scale) noexcept {}
};
~~~

如果明确要调用基类实现，可以写 Base::Read()。当该函数是 virtual 时，显式限定的 Base::Read() 会抑制虚分派，直接调用基类版本。这是一个有意的实现选择，不是普通的“调用父类”语法糖。

### 3.6 Upcast / Downcast：向上转换自然，向下转换必须证明

- **Upcast**：Derived* / Derived& 到 Base* / Base& 是隐式转换；调用方只依赖稳定基类契约。
- **dynamic_cast**：对 polymorphic base 做运行期安全向下转换；指针形式失败返回 nullptr，引用形式失败抛出 std::bad_cast。它要求 RTTI，且带有运行期检查成本。
- **static_cast**：向下转换不做运行期类型检查。只有外部不变量已经证明对象确实属于目标派生类型时才可用；错误类型转换会导致未定义行为。
- **不建议在核心业务路径频繁向下转换**：如果调用方必须先 dynamic_cast 才能调用某个关键能力，通常说明 Base contract 不完整或类型边界选错了。

嵌入式项目若关闭 RTTI，不要用不安全 static_cast 伪装安全检查。优先调整接口、用 enum class + 已验证的 tag、std::variant（类型集合封闭时）或在创建边界保留具体类型信息。

## ④ C 写法 vs Modern C++：从共享代码到明确的关系（约 6 分钟）

| 维度 | C / 旧式实现 | Modern C++ |
|---|---|---|
| 复用状态 | 复制字段 / 公共 struct / void* context | 小型 value component 作为成员 |
| 动态替换 | 函数表与手工类型约定 | public interface + override，前提是真正 is-a |
| 私有实现复用 | 宏、公共 helper、手工前缀 | composition；必要时才 private inheritance |
| 生命周期 | create/destroy 与调用顺序靠约定 | 基类构造 / 析构自动参与对象生命周期，成员 RAII |
| 类型检查 | 函数表签名可检查，关系语义较弱 | override、访问控制、类型转换规则在编译期检查 |
| 测试 | 替换函数表和 void* context | Fake 实现稳定接口；helper 可单独测试 |
| 成本 | 代码直观但约束分散 | 关系更明确；仍需审查 vcall、RTTI、代码体积和耦合成本 |

现代 C++ 并不要求所有复用都走继承。把共享实现做成一个独立小组件，通常更容易单测、替换和复用，也更容易给 RAM / WCET 设上界。

## ⑤ 设计模式映射：Strategy、Template Method、Decorator 与 Composition（约 7 分钟）

### 5.1 先识别真实变化轴

以 Modem transport 为例：

- UART / USB / Fake 的底层写入机制不同，且设备启动时可能选择实现：这是运行时变化轴，适合 Strategy（稳定 Transport interface + composition）。
- 重试预算、字节计数、校验策略被多个业务类使用：这是共享实现，不是 is-a；优先把 RetryBudget / ByteCounter 作为成员对象。
- 所有实现都必须执行同一套验证、再调用一个硬件 hook：可以考虑 Template Method / NVI，但只在流程确实稳定且 hook 受控时使用。
- trace / metrics 需要独立叠加在 transport 外部：可考虑 Decorator；如果只有一个计数器，普通成员或 helper 更简单。

### 5.2 模式与 C++ 机制

| 机制 / Pattern | 适用变化 | 主要成本 / 边界 |
|---|---|---|
| Composition | 复用状态或实现；has-a | 成员生命周期、调用委托；通常最清楚 |
| Strategy | 运行期替换 transport / 算法 | virtual call、对象组装、owner / borrow |
| Template Method / NVI | 固定算法骨架 + 少量受控 hook | 基类需要稳定且可验证的不变量；避免过深继承 |
| Decorator | 多个可独立叠加的包装行为 | 包装链长度、顺序、生命周期和调用开销 |
| Private inheritance | 仅内部实现复用且确有基类语义需求 | 仍耦合基类布局、protected 细节和初始化顺序 |
| Template / concept | 编译期固定实现 | 代码膨胀、编译时间、实例化复杂度 |

### 5.3 Ownership / Borrow / Lifetime

- Composition root 拥有 UartTransport / UsbTransport 具体对象。
- ModemSender 通过 Transport& 借用策略；Transport owner 必须比 ModemSender 活得更久。
- RetryBudget 由 ModemSender 按值拥有；没有共享所有权需求，不使用 shared_ptr。
- 如果 transport 将 buffer 交给 DMA 异步读取，span 只描述借用范围，不延长 buffer 生命周期；必须由固定 buffer pool / ring 的明确 owner 持有，直到 completion、cancel 或 drain。
- 若添加 callback，必须定义 registration token、unregister、in-flight callback drain、执行线程 / ISR 上下文和销毁顺序。继承关系不负责这些事情。

### 5.4 何时保持简单

- 只有一个实现且没有测试替身需求：具体类型 + composition 即可。
- 多个实现需要运行时替换：Strategy。
- 多个类型只是共享计数器：成员对象，不建 RetryCounter 基类。
- 不要为了“以后可能复用”先做 BaseManager、Factory、ServiceLocator 和多层 abstract base。

## ⑥ Embedded / System Design：Modem transport 与重试策略（约 8 分钟）

推荐边界：

~~~text
Composition Root
  ├── owns UartTransport / UsbTransport
  └── constructs ModemSender
                 |
                 | borrows Transport&
                 v
            Transport::Write()
                 |
        +--------+---------+
        |                  |
   UartTransport      UsbTransport
        |
        v
    HAL / DMA

ModemSender
  └── owns RetryBudget by value
~~~

### 6.1 构造与 teardown

- 先构造 HAL / transport，再构造借用它的 ModemSender；销毁顺序必须反过来。
- 不在 Base constructor 中调用 virtual hook 来启动派生 HAL；派生对象尚未完整建立。
- 停止 DMA、取消 callback、等待 in-flight completion 必须发生在 transport 资源销毁之前。
- 不在 Base destructor 中期望派生 override 执行硬件关闭；Derived teardown 应先完成自己的异步 drain，再让 Base 析构。

### 6.2 实时与线程约束

- **重试上界**：RetryBudget 使用固定宽度计数，最多 N 次重试；禁止 while(true) 无界重试。每次重试还必须受 monotonic deadline / timeout 约束。
- **阻塞**：不能在 ISR 中调用可能等待 DMA、获取 mutex 或 sleep 的 Send。ISR 只投递固定容量事件，由 ModemTask 处理。
- **内存**：发送热路径不 new、不构造动态字符串、不建立无界包装链；Lab 的 frame 使用 std::array。
- **WCET**：预算需覆盖最多 N+1 次 Write、锁等待、DMA 提交和错误路径；virtual dispatch 本身通常不是唯一成本。
- **RTTI**：若固件关闭 RTTI，核心流程不依赖 dynamic_cast；类型选择应在 composition root 完成。
- **错误传播**：busy、timeout、invalid argument、hardware failure 应保留不同状态，不能只返回 bool。
- **硬件可替换性**：Host Fake 与生产 UART / USB 实现遵守相同 Write contract，包括空输入、最大长度、timeout 和线程上下文。

## ⑦ 今日编码规范（MUST / SHOULD / MAY）

### MUST 1：public inheritance 必须表达可替代关系；仅共享状态 / 算法时使用 composition

**错误写法：**

~~~cpp
class RetryBudget {
 public:
  bool Consume() noexcept;
};

class UartSender : public RetryBudget {};  // UartSender 并不是一种 RetryBudget
~~~

**推荐写法：**

~~~cpp
class UartSender {
 public:
  explicit UartSender(std::uint8_t retries) noexcept
      : retry_budget_(retries) {}

 private:
  RetryBudget retry_budget_;  // UartSender owns its policy component.
};
~~~

### MUST 2：不得在构造 / 析构期间调用依赖派生 override 的 virtual hook

**错误写法：**

~~~cpp
Base::Base() { Initialize(); }  // 不会分派到 Derived::Initialize()
~~~

**推荐写法：**

~~~cpp
Derived::Derived() : Base() {
  InitializeDerivedResources();  // 当前对象的派生部分已开始构造
}
~~~

异步资源还必须有明确失败回滚和 teardown 顺序；不要把可能失败的硬件启动藏进构造函数而又无法表达失败。

### SHOULD 3：向下转换必须有可审计的类型证明；优先消除业务层 downcast

**错误写法：**

~~~cpp
auto* uart = static_cast<UartTransport*>(transport);  // 没有证明
~~~

**推荐写法：**

~~~cpp
if (auto* uart = dynamic_cast<UartTransport*>(transport)) {
  uart->ReadDiagnostics();
} else {
  return Status::kUnsupported;
}
~~~

如果目标固件不支持 RTTI，优先把诊断能力放入独立接口或在创建边界保留受验证的类型信息，不要把 static_cast 当成运行期检查。

命名、enum class、explicit、小接口、RAII、错误模型和固定容量要求继续沿用既有 guideline；新增继承层级必须在 Code Review 中写明 is-a 证明、owner / borrow 和 teardown 规则。

## ⑧ 可编译 Lab / 练习（约 9 分钟）

每个文件都包含自己的 int main()，必须独立编译运行。不要把多个 main() 链接到同一个程序。

### 主 Lab：真实 is-a 用 Strategy，代码复用用 Composition

源码：[examples/day-093/main.cpp](../examples/day-093/main.cpp)

~~~bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic examples/day-093/main.cpp -o day93
./day93
~~~

预期输出：

~~~text
transport=UART result=ok attempts=2 retries_left=0
transport=USB result=ok writes=1
shared retry behavior uses composition; runtime transport uses is-a
~~~

观察：

1. UartTransport / UsbTransport 是 Transport，因为它们都满足同一个 Write contract。
2. ModemSender 不继承 RetryBudget，而是按值拥有 RetryBudget。
3. ModemSender 通过 Transport& 借用策略对象；main 中 owner 比 borrower 活得更久。
4. RetryBudget 的重试次数有界，Lab 不分配 heap，不引入 shared_ptr。
5. 运行时替换只发生在真正变化的 Transport 轴上。

### Exercise 01：修复“为了复用而 public inherit”的设计

Starter：[examples/day-093/exercise-01.cpp](../examples/day-093/exercise-01.cpp)

~~~bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic examples/day-093/exercise-01.cpp -o day93-ex01
./day93-ex01
~~~

这是**逻辑 / 设计违规但可编译运行**的 starter。它故意让 UartSender 与 AtCommandSession public inherit RetryBudget。运行时会显示两个类型都能隐式转换为 RetryBudget*，外部调用方还能直接消耗内部重试额度。

请重构：

1. 将 RetryBudget 改为普通独立组件，两个业务类分别按值拥有自己的 RetryBudget。
2. 删除 public inheritance；不要用 private inheritance 仅仅把错误关系藏起来。
3. 只暴露业务需要的操作，例如 TrySubmit() / StartCommand()；不要把 Consume() 直接泄漏给无关调用方。
4. 保留固定容量和无动态分配；错误路径必须可观察。
5. 在 main() 中增加静态检查，证明 UartSender* 不再能隐式转换为 RetryBudget*。
6. 解释为什么这里不需要 Strategy、Factory 或 shared_ptr。

重构后仍使用同一文件、同一命令独立编译运行：

~~~bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic examples/day-093/exercise-01.cpp -o day93-ex01
./day93-ex01
~~~

**通过标准**：业务类不再 is-a RetryBudget；每个 owner 明确拥有自己的 policy；外部无法绕过业务接口修改内部预算；输出能证明重构前后的行为边界。

## ⑨ 三个常见坑

1. **把同名函数当成 override**：基类函数非 virtual，或派生签名不匹配时，不会形成预期动态分派。对每个重写使用 override；需要保留基类 overload set 时使用 using Base::Function。
2. **在构造 / 析构中调用 virtual 初始化或清理派生资源**：构造阶段派生部分尚未建立，析构阶段派生部分已销毁；不要把派生 hook 当成可用的生命周期回调。
3. **为了复用而建立深继承树，再用 downcast 找回具体类型**：这会同时损害 substitutability、可测试性和实时可审计性。先考虑 composition、value component、Strategy 或封闭类型集合；只有真实 is-a 才 public inherit。

## ⑩ 检查题（约 5 分钟）

### 知识 / 代码检查

1. Base 构造函数调用 virtual Initialize()，Derived override 了它。构造 Derived 时实际执行哪个版本？为什么？如果 Initialize 是 pure virtual，会发生什么风险？
2. Derived 声明了 Read(double)，Base 有 Read() 和 Read(int)。Base 的两个重载是否仍可通过 Derived 对象直接调用？如何恢复？若在 Derived 中写 Base::Read()，当 Base::Read 是 virtual 时会不会继续动态分派？

### 设计题：Modem transport 复用方案

某 Modem 子系统有 UART、USB 两种 transport；它们都实现 Write(span)；AT command session 和 firmware updater 都需要重试预算、统计字节数与错误计数。要求：

- 设备启动时选择 UART 或 USB；
- 固件热路径不能动态分配，重试必须有上界；
- ISR 不允许阻塞；
- transport 可以被 Host Fake 替换；
- updater 可能异步 DMA 发送，buffer 必须活到 completion。

请画出对象关系并回答：

1. 哪些类型应该 public inherit？请给出可替代性证明。
2. RetryBudget / ByteCounter 应该用 composition、private inheritance 还是模板？为什么？
3. ModemSender 对 Transport 的依赖是 owner 还是 borrow？谁负责先销毁？
4. 如果要增加 trace，何时普通成员足够，何时 Decorator 才值得引入？
5. 运行期是否真的需要 downcast？若固件禁用 RTTI，如何保持接口完整？
6. DMA buffer、callback registration、timeout、最大重试次数和 WCET 如何形成可审计上界？

**答题检查路径**：需求变化 → 识别变化轴 → 找稳定 contract → 选择 composition / public inheritance / template → 设计 owner / borrow / lifetime → 检查 teardown、RTOS context 与实时上界 → Code Review。

---

## 本日完成标准

- 能解释“代码复用”与“可替代性”是两个不同问题。
- 能正确写出基类构造参数、理解构造 / 析构顺序与 virtual dispatch 边界。
- 能区分 name hiding、using Base::name 与 Base::name() 限定调用。
- 能解释 implicit upcast、dynamic_cast 和 static_cast downcast 的不同保证。
- 能把真实 is-a 留给 public inheritance，把普通共享实现迁移到 composition。
- 主 Lab 与 Exercise 01 都能独立编译运行；Exercise 的重构结果仍能通过同一命令验证。

**下一课 Day 94**：Chapter 10 · Inheritance for Polymorphism，p.380；从 SpreadsheetCell 案例进入抽象基类、纯虚函数与运行时多态接口。
