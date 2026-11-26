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
