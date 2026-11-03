# Day 69 · 对象创建与构造函数：让对象从出生起就有效

> **主教材**：Marc Gregoire，《Professional C++》，Sixth Edition，Chapter 8 · *Gaining Proficiency with Classes and Objects*。
>
> **今日范围**：pp.269–275：*Understanding Object Life Cycles*、*Object Creation*、*Writing Constructors*、*Using Constructors*、*Providing Multiple Constructors*、*Default Constructors*。
>
> **辅教材**：Dmitri Nesteruk，《Design Patterns in Modern C++》。今天只把构造函数看作对象创建边界，并用依赖注入（Dependency Injection）解释 required dependency 的显式表达；不为了覆盖 Factory 等模式改变主教材顺序。
>
> **前置课程**：[Day 67 · class 封装与对象不变量](day-067-class-encapsulation-member-functions.md)；[Day 68 · 对象存储期、this 与 C++23 显式对象参数](day-068-object-storage-this-explicit-object-parameter.md)。

**今天只解决一个问题：对象什么时候真正可用，以及谁负责在构造完成时保证它处于合法状态？**

**学习目标**

- 区分 storage duration 与 object lifetime，理解“有一块存储”不等于“对象已经可以使用”。
- 能写默认构造函数、参数化构造函数和多个构造路径，并理解编译器何时生成默认构造函数。
- 让构造函数建立有效不变量，把可失败的硬件初始化留给显式、可返回 Status 的操作。

**60 分钟安排**：阅读 8 分钟 → 昨日复习 5 分钟 → 核心概念 17 分钟 → C/C++ 对照 6 分钟 → 设计映射 6 分钟 → Embedded 场景 5 分钟 → 规范 4 分钟 → Lab/练习 6 分钟 → 坑与检查 3 分钟。

---

## ① 今日章节与建议阅读范围（8 分钟）

**Chapter 8，pp.269–275。严格按教材顺序：**

1. *Understanding Object Life Cycles*（p.269）
2. *Object Creation*（p.269）
3. *Writing Constructors*（p.270）
4. *Using Constructors*（p.270）
5. *Providing Multiple Constructors*（p.271）
6. *Default Constructors*（p.272 起，今天读到 p.275）

**今天不要提前展开 p.276 的 *Constructor Initializers aka Ctor-Initializers***；也不要跳到 p.279 的 Copy Constructors、p.281 的 Initializer-List Constructors 或 p.286 的 Object Destruction。下一课再按顺序学习成员初始化列表。

阅读时重点标注：

- 对象的存储期和对象生命周期分别描述什么？
- 构造函数何时被调用？构造函数完成前，对象是否已经能交给其他模块使用？
- 声明了参数化构造函数后，编译器还会不会自动提供无参构造函数？
- 多个构造函数是否都能产生满足同一 class invariant 的对象？
- 构造函数适合做哪些工作，哪些工作应该放在 Start/Init 这样的显式操作中？

## ② 昨日复习 3 问（5 分钟）

承接 Day 68：

1. **概念**：automatic storage duration 描述对象存放期；object lifetime 描述对象何时处于可用生命周期。二者为什么不能简单画等号？
2. **工程判断**：成员函数中的 this 是 owner 还是 borrow？如果异步回调保存 this，除了保证对象还活着，还需要怎样 teardown？
3. **代码细节**：类里已经写了 UartPort(PortId, BaudPreset)，此时 UartPort port; 是否仍然能编译？为什么？

复习检查点：存储期不负责表达 ownership；this 不拥有对象；一旦声明了其他构造函数，不能再假设编译器会自动生成默认构造函数。

## ③ 核心概念：构造函数是对象不变量的第一道边界（17 分钟）

### 1. Storage Duration 与 Object Lifetime

- **Storage duration**：对象所使用的存储何时分配、何时释放。常见类别包括 automatic、static、thread 和 dynamic storage duration。
- **Object lifetime**：某个特定对象何时开始成为一个有效对象，何时结束其生命周期。
- 对 class object 来说，生命周期通常在初始化完成后开始，在析构开始、存储被释放或被用于新对象时结束。

因此：**storage 已经存在，不代表其中的对象已经构造完成；地址仍然可见，也不代表原对象生命周期仍然有效。**

Day 68 讲了 automatic/dynamic storage duration；今天开始把“存储”与“对象”拆开思考。placement construction、union、optional 等更复杂的生命周期切换先不展开。

### 2. Constructor 的职责

构造函数有与 class 相同的名字，没有返回类型，在创建对象时由初始化语法触发。它不是普通的 Init 函数，也不是一个可以对已存在对象任意再次调用的成员函数。

构造函数最重要的职责是：

1. 为成员建立初始值；
2. 验证或约束构造参数；
3. 在构造完成前建立对象不变量；
4. 不让一个“半初始化对象”逃逸到其他模块。

一个对象从构造函数正常返回后，调用者就应当能依赖 class 对外承诺的合法状态。不要把“先构造一个无效对象，等调用者记得 Init”当作默认设计。

### 3. Default Constructor 与默认成员初始化器

默认构造函数是可以不提供实参调用的构造函数。它可以由编译器隐式声明，也可以由程序员显式声明：

~~~cpp
class UartPort {
public:
    UartPort() noexcept = default;

private:
    std::uint32_t baud_rate_{115'200U};
    bool started_{false};
};
~~~

这里的 = default 明确要求编译器生成默认构造函数；成员的默认成员初始化器为默认状态提供值。

**关键规则**：如果类声明了其他构造函数，编译器不会再因为“类需要一个无参构造函数”而自动补上默认构造函数。若业务确实存在合法默认状态，应显式保留 UartPort() = default;；如果没有合法默认状态，就不要为了让代码通过编译而伪造一个。

默认构造函数也可能被定义为 deleted，例如某个成员本身无法默认构造。不要只看类名推断它一定可默认构造。

### 4. Multiple Constructors：多个入口，同一套不变量

多个构造函数适合表达少数几种真实、合法的创建方式，例如：

- 默认 UART1 + 115200；
- 指定 UART 端口和一个受控的速率预设。

多个入口不是多个对象规则。无论走哪个构造函数，调用者都应得到满足相同 invariant 的 UartPort。

避免使用多个 bool 参数表达创建模式：

~~~cpp
UartPort port{true, false, true}; // 调用点无法读出语义
~~~

更好的方向是使用 enum class 或具名 Options。今天的 Lab 用 PortId 与 BaudPreset 表达两个离散选择。

### 5. Object Creation：先值语义，再考虑动态存储

~~~cpp
UartPort local_port{};  // 自动存储期对象，离开作用域自动结束生命周期

auto owned_port = std::make_unique<UartPort>();
// owned_port 是局部 owner；它管理的 UartPort 具有动态存储期
~~~

第一种是默认选择：对象直接作为局部值存在。第二种只在需要独立动态生命周期、运行时延长生命周期或通过接口转移 ownership 时才考虑。

不要因为“这是一个 Driver class”就默认 new；class、heap allocation、virtual dispatch 是三个独立决定。

### 6. 构造函数不应承担可失败的设备启动

构造函数没有 Status 返回通道。嵌入式项目又通常禁用异常，因此不要把可能失败的 MMIO 初始化、设备探测、永久等待、锁等待或 callback 注册塞进构造函数。

建议分成两个阶段：

- **Construction**：建立一个内存和状态上有效、尚未启动硬件的对象。
- **Start/Init**：在明确的任务上下文执行可失败操作，返回 Status，并接收明确的 timeout。

不要在构造函数中把 this 注册给外部事件源；否则回调可能在对象尚未完成构造时进入，或者在 teardown 不完整时访问半失效对象。

**编译期 / 运行期成本**：普通构造函数调用不意味着 heap、vtable 或引用计数。构造函数中的工作才决定初始化成本；把设备探测放在构造函数里，会让创建对象本身变成难以预测的运行期操作。

## ④ C 写法 vs Modern C++（6 分钟）

### C：结构体 + 显式 init 协议

~~~c
typedef struct {
    uint32_t timeout_ms;
    uint8_t retry_count;
    bool initialized;
} modem_session_t;

int modem_session_init(modem_session_t* session,
                       uint32_t timeout_ms,
                       uint8_t retry_count) {
    if (session == NULL || timeout_ms == 0U || retry_count > 5U) {
        return -1;
    }
    session->timeout_ms = timeout_ms;
    session->retry_count = retry_count;
    session->initialized = true;
    return 0;
}
~~~

风险不是 C 做不到封装，而是公开 struct 允许调用者绕过 init 协议；所有调用点都必须记住初始化顺序。C 也可以用 opaque handle 把状态隐藏起来。

### Modern C++：构造有效默认状态，运行期配置走显式 API

~~~cpp
class ModemSession {
public:
    ModemSession() noexcept = default;

    [[nodiscard]] Status Configure(std::uint32_t timeout_ms,
                                   std::uint8_t retry_count) noexcept;
    [[nodiscard]] Status Connect() noexcept;

private:
    std::uint32_t timeout_ms_{1'000U};
    std::uint8_t retry_count_{3U};
};
~~~

| 维度 | C struct + init | Modern C++ class |
|---|---|---|
| 类型安全 | 可以实现，但公开字段容易绕过协议 | private state + 构造函数集中创建入口 |
| 资源管理 | 需要约定 init/deinit 配对 | 对象生命周期可与 RAII 配合 |
| 可测试性 | 测试函数顺序与未初始化状态 | 可直接测试每种构造路径和 invariant |
| 扩展性 | opaque handle / 函数表也能建立边界 | 构造重载、值成员与组合自然表达创建方式 |
| 成本 | 简单直接，适合 C ABI | 普通 class 不必分配 heap；额外成本取决于构造函数实际做什么 |

**不要过度**：不是所有 C struct 都要改成 class。若数据只是跨 C ABI 的简单布局，保持 struct 可能更合适；若状态需要不变量保护，才建立 class 创建边界。

## ⑤ 设计模式映射：构造函数不是 Factory Pattern（6 分钟）

### 需求变化 → 变化轴 → 稳定边界

今天的真实变化轴是“对象以哪种合法初始配置创建”，不是“运行时替换哪种算法”。稳定边界是 UartPort 的创建入口和构造完成后的状态不变量。

### Pattern 决策

- **不使用 Strategy**：波特率预设是配置数据，不是需要运行时替换的算法。
- **不使用 Factory / Abstract Factory**：当前只有一个具体 UartPort 类型，创建过程简单；直接构造比额外工厂层更清楚。
- **可以使用 Constructor Injection（依赖注入）**：真实 Driver 需要 HAL 时，把 required dependency 显式交给构造函数，而不是从全局 service locator 取。它是依赖边界，不要求建立一套工厂继承体系。
- **不使用 Observer**：今天没有事件订阅需求；更不能为了“对象创建时注册 callback”而提前引入 Observer。

### Ownership / Borrow / Lifetime

- UartPort local_port：对象由当前作用域直接拥有，优先值语义。
- std::unique_ptr<UartPort>：只有需要动态存储期和单一 owner 时才使用。
- IUartHal& 若由 Driver 保存，表示 required borrow；HAL owner 必须比 Driver 活得更久。
- 如果 callback 捕获 this，必须明确 owner、unsubscribe/cancel、in-flight drain 与销毁顺序；构造期间不要发布 this。

### 什么时候才需要 Factory？

当产品配置、平台选择或运行时插件确实决定创建不同具体类型时，Factory 才可能隔离创建变化。若 UART 类型在固件编译期固定，composition root 直接创建具体对象通常更简单。Pattern 是识别变化后的结果，不是今天的作业目标。

## ⑥ Embedded / System Design 场景：Modem 启动路径（5 分钟）

推荐把对象创建与硬件启动拆开：

~~~text
Board Composition Root
    ├── owns Uart HAL / BSP adapter
    └── owns UartPort
             ↑
       Modem Middleware borrows UartPort
             |
       Start(timeout_ms) -> Status
~~~

工程边界：

- **构造期**：只建立成员和不变量；复杂度 O(1)，不做无界分配、设备等待或不可控锁操作。
- **启动期**：在 Driver task / 初始化任务调用 Start；硬件未就绪、时钟失败或设备忙必须进入 Status 错误模型。
- **timeout**：等待 TX-ready、DMA idle 或设备响应时，timeout 必须显式带单位；禁止永久等待。
- **线程与 IRQ**：对象由一个明确 owner task 管理；ISR 不负责创建复杂 C++ 对象，不做动态分配。跨任务状态通过消息队列、atomic 或明确临界区保护。
- **callback**：注册应发生在完整构造之后；停止时先禁止新事件，再 unregister/cancel，等待 in-flight callback 退出，最后销毁对象。
- **内存与 WCET**：初始化阶段和实时路径分别评估。构造函数应有界；热路径的 allocation、lock、blocking、callback 数量和执行上界都要可审计。
- **测试**：host 测试可以验证构造后的默认状态、非法配置不改变状态、Start 失败传播；硬件访问由 Fake HAL 替代。

## ⑦ 今日编码规范（4 分钟）

### MUST 1：构造完成时对象必须满足 invariant

错误写法：

~~~cpp
class ModemSession {
public:
    ModemSession(std::uint32_t timeout_ms) noexcept {
        timeout_ms_ = timeout_ms; // 允许 0，构造后对象可能无效
    }
private:
    std::uint32_t timeout_ms_{0U};
};
~~~

推荐方向：默认成员初始化器提供合法默认值；外部运行期参数通过 Configure 校验，全部校验通过后再更新状态。若没有合法默认状态，就要求调用者提供不可缺少的构造参数，不要制造半初始化对象。

### MUST 2：构造函数不得隐藏可失败或无界的硬件操作

错误写法：

~~~cpp
Modem::Modem() {
    OpenDevice();
    WaitUntilReady(); // 无 timeout，且构造函数无法返回 Status
    RegisterCallback(this);
}
~~~

推荐方向：

~~~cpp
Modem::Modem() noexcept = default;

[[nodiscard]] Status Modem::Start(std::uint32_t timeout_ms) noexcept {
    // 有界硬件初始化；失败通过 Status 返回
}
~~~

Start 的实现必须定义线程上下文、timeout 和失败后的回滚；停止时必须 unregister 并 drain callback。

### SHOULD 3：构造重载表达不同的合法模式，不使用 bool 组合

错误写法：Device{true, false, true}。

推荐写法：使用 enum class 或具名 Config/Options。只有确实存在合法默认状态时才保留默认构造函数；声明其他构造函数后，若仍需要无参创建，显式写出 Device() = default;。

## ⑧ 可编译 Lab / 练习（6 分钟）

### 主 Lab：两种构造路径与状态不变量

源码：[examples/day-069/main.cpp](../examples/day-069/main.cpp)

~~~bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic examples/day-069/main.cpp -o day069
./day069
~~~

程序展示：

1. 默认构造产生 UART1 / 115200 / stopped 的合法状态；
2. 参数化构造产生 UART2 / 921600 / stopped 的合法状态；
3. Configure(0) 返回 invalid argument，旧配置不变；
4. Start 后发送 4 字节成功；
5. 运行中重新配置返回 busy，Stop 后结束。

预期输出：

~~~text
default: UART1 115200 baud, stopped
preset: UART2 921600 baud, stopped
configure(0): invalid argument; baud remains 115200
start: ok
send: ok, bytes_sent=4
configure while started: busy
stop: ok
~~~

说明：本日源码用简单标量成员和默认成员初始化器，构造函数体中的赋值仅用于隔离“构造函数重载”的主题。下一课会按教材顺序学习成员初始化列表，并把“先默认初始化再赋值”改为直接初始化。

### Exercise 01：修复会创建无效对象的构造函数

源码：[examples/day-069/exercise-01.cpp](../examples/day-069/exercise-01.cpp)

~~~bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic examples/day-069/exercise-01.cpp -o day069-ex01
./day069-ex01
~~~

Starter 是**故意存在设计错误、但可独立编译运行**的完整程序，包含自己的 int main()。先运行，观察它允许 timeout=0ms、retry_count=9 的无效配置进入对象。

请在这个文件中重构：

1. 让默认构造函数产生合法默认状态（1000ms / 3 次重试）；
2. 增加 Configure(timeout_ms, retry_count)，使用统一 Status 返回错误；
3. 必须先完成全部输入校验，再更新成员；失败时原配置保持不变；
4. Connect 不应再承担“发现对象出生时就是无效状态”的职责；
5. 不引入 new、shared_ptr、Factory、全局状态或异常；
6. 增加输出，证明非法 Configure 被拒绝且旧配置未变化，合法 Configure 后 Connect 成功。

Starter 当前预期输出：

~~~text
constructed session: timeout=0ms, retries=9
connect: invalid argument
~~~

验收重点：先运行基线，再重构；每个阶段都能单独编译运行。不要用 assert 代替可恢复配置错误。

## ⑨ 3 个常见坑

1. **声明参数化构造函数后仍假设存在默认构造函数**：编译器不会自动补上无参构造函数；只有合法默认状态时才显式 = default。
2. **把 storage duration 当成 object lifetime**：存储地址存在不代表对象已经完成初始化，也不代表原对象生命周期尚未结束；不要访问未构造或已销毁对象。
3. **在构造函数中做硬件启动、阻塞等待或注册 this**：构造函数没有 Status 返回通道，还可能让半构造对象逃逸；把可失败动作移到有 timeout 的 Start/Init，并定义 teardown。

## ⑩ 检查题（3 分钟）

### Q1 · 知识 / 编译判断

~~~cpp
class Device {
public:
    Device(std::uint32_t id) noexcept;
};

Device device;
~~~

这段代码能否编译？如果 Device 确实有合法默认状态，应如何修正？如果没有，应该怎样设计调用方？

**答案要点**：不能仅凭编译器“会自动补默认构造函数”来假设它可编译。类声明了参数化构造函数后，隐式默认构造函数不会生成。合法默认状态存在时显式声明 Device() = default；不存在时要求调用方提供必需参数。

### Q2 · 代码 / 工程判断

为什么不建议在 UartPort 构造函数里打开设备、等待寄存器 ready 并注册 callback？请指出至少三个风险。

**答案要点**：硬件操作可能失败，但 constructor 没有 Status 返回通道；等待可能无界，破坏 WCET；callback 可能在对象完成构造前触发或在销毁后访问 this；构造期还可能发生动态分配、锁和不可控线程切换。应拆为构造 + 显式 Start(timeout) + 确定性 teardown。

### Q3 · 设计题

一个 Modem 产品有 UART1、UART2 两个固定端口，host test 需要 Fake HAL；运行时不需要动态加载 Driver。

请判断保持简单、composition、Constructor Injection、Factory 中哪些需要，哪些不需要，并画出 owner/borrow 关系。

**答案要点**：

- Board Composition Root 创建并拥有 HAL adapter 与 UartPort；Modem Middleware 通过引用借用 UartPort。
- UartPort 若必须依赖 HAL，可通过构造函数显式注入 required reference；HAL owner 必须比 UartPort 活得更久。
- UART1/UART2 是固定实例时，直接组合即可；不需要 Strategy 或运行时 Factory。
- host test 用 Fake HAL 替换真实 HAL，重点是同一稳定 contract，而不是 shared_ptr。
- Start/Stop 的任务上下文、timeout、callback drain 和内存上界必须写进接口契约。

---

## 下一步

Day 70 沿 Chapter 8 继续进入 p.276 起的 *Constructor Initializers aka Ctor-Initializers*：成员初始化列表、成员声明顺序与初始化顺序；再逐步进入 copy constructor。今天不要提前跳到 copy/assignment。

## 参考资料

- [Wiley · Professional C++, Sixth Edition（Chapter 8 章节信息）](https://onlinelibrary.wiley.com/doi/book/10.1002/9781394193202)
- [仓库 patterns/README.md · 设计模式与稳定边界](../patterns/README.md)
- [仓库 ownership-and-smart-pointers.md](../patterns/ownership-and-smart-pointers.md)
- [Embedded C++ Coding Guideline 学习索引](../guidelines/embedded-cpp-guideline-notes.md)
