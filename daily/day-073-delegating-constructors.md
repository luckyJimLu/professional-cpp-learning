# Day 73 · Delegating Constructors：让所有构造入口汇聚到同一条不变量路径

> **日期**：2026-11-06  
> **主教材**：Marc Gregoire, *Professional C++, Sixth Edition*（C++23），Chapter 8 · *Gaining Proficiency with Classes and Objects*。  
> **今日阅读**：p.283，*Delegating Constructors*。只学习构造函数委托；下一小节 *Converting Constructors and Explicit Constructors* 留到下一课 p.284。  
> **辅教材**：Dmitri Nesteruk, *Design Patterns in Modern C++*。本日不套用 GoF 模式，重点是构造入口收敛、类不变量与组合。  
> **前置课程**：[Day 70 · Constructor Initializer Lists and Member Initialization Order](day-070-constructor-initializer-list-member-order.md)、[Day 71 · Copy Constructors and Value Semantics](day-071-copy-constructors-value-semantics.md)、[Day 72 · Initializer-List Constructors](day-072-initializer-list-constructors.md)。

**今天只解决一个问题：一个类有多个构造入口时，怎样保证每条入口都建立完全相同的类不变量，而不复制一套容易逐渐漂移的初始化代码？**

**学习目标**

- 能写出 default / convenience constructor 委托给 canonical constructor 的代码。
- 能解释委托目标、成员初始化与构造函数体的执行顺序。
- 能区分 delegating constructor、constructor initializer list 与普通构造函数体内的临时对象构造。
- 能判断什么时候用委托构造，什么时候应使用命名工厂、Options 值对象或显式初始化阶段。
- 能把构造期的纯初始化与 Embedded 硬件启动、RTOS 注册、回调安装等有失败/副作用的操作分开。

**60 分钟安排**：阅读 7 分钟 → 昨日复习 4 分钟 → 核心概念 14 分钟 → C/C++ 对照 5 分钟 → 设计映射 6 分钟 → Embedded 场景 7 分钟 → 规范 5 分钟 → Lab/练习 9 分钟 → 常见坑 2 分钟 → 检查题 1 分钟。

---

## ① 今日章节与建议阅读范围（7 分钟）

**Chapter 8，p.283：Delegating Constructors。**

阅读时重点标注：

1. 一个构造函数如何通过 mem-initializer 调用同一个类的另一个构造函数；
2. 哪个构造函数真正初始化 base/member；
3. 委托构造函数体与目标构造函数体的先后顺序；
4. 多个 convenience constructors 如何委托给一个 canonical constructor；
5. 构造函数委托与成员初始化列表、普通函数调用之间的差别。

**今天不提前学习 p.284 的 Converting Constructors and Explicit Constructors。** 也不扩展到继承构造函数；它们属于后续主题。

概念边界：

- **constructor initializer list / ctor-initializer**：构造函数冒号后初始化 base/member 的语法，Day 70 已学习。
- **delegating constructor**：其 mem-initializer 指向同一类的另一个构造函数；它把初始化工作委托出去。
- **canonical constructor**：本课程使用的工程术语，指集中建立类不变量、真正初始化成员的主构造函数；它不是 C++ 标准中的特殊语法类别。

## ② 昨日复习 3 问（4 分钟）

承接 Day 72：

1. **核心机制**：为什么 ByteFrame 的花括号初始化可能调用 std::initializer_list 构造函数，而不是 (count, fill) 构造函数？
2. **工程判断**：一个构造函数收到 std::initializer_list 后，如果对象要长期保存这些元素，应该保存列表视图，还是复制到自己的 owner 成员？为什么？
3. **代码细节**：std::initializer_list 的元素为什么不能被常见 move constructor 正常移动？它的 backing array 生命周期由谁保证？

复习检查点：花括号重载优先级可能改变 API 语义；initializer-list 是只读借用视图；长期保存 payload 必须建立自己的 owner。

## ③ 核心概念：Delegating Constructors（14 分钟）

### 1. 多个构造入口容易让不变量漂移

假设 UartConfig 有四种创建方式：默认配置、只指定 baud rate、指定 baud rate 与 parity、指定所有字段。

如果每个构造函数都独立初始化所有成员，默认值、边界和后续新增成员就需要在多处同步维护。漏改一处，类就可能出现“同一种配置通过不同入口构造，得到不同默认行为”的问题。

### 2. 用一个 canonical constructor 收敛初始化

~~~cpp
class UartConfig {
public:
    UartConfig() noexcept
        : UartConfig(BaudRate::k115200, Parity::kNone, StopBits::kOne) {}

    explicit UartConfig(BaudRate baud_rate) noexcept
        : UartConfig(baud_rate, Parity::kNone, StopBits::kOne) {}

    UartConfig(BaudRate baud_rate, Parity parity) noexcept
        : UartConfig(baud_rate, parity, StopBits::kOne) {}

    UartConfig(BaudRate baud_rate, Parity parity, StopBits stop_bits) noexcept
        : baud_rate_(baud_rate), parity_(parity), stop_bits_(stop_bits) {}

private:
    BaudRate baud_rate_;
    Parity parity_;
    StopBits stop_bits_;
};
~~~

前三个构造函数没有直接初始化成员，而是把参数补齐后委托给最后一个构造函数。最后一个构造函数是唯一的成员初始化路径。

### 3. 语法与执行顺序

~~~cpp
UartConfig() noexcept
    : UartConfig(BaudRate::k115200, Parity::kNone, StopBits::kOne) {}
~~~

这里 UartConfig(...) 是 mem-initializer 中的委托目标，不是在函数体里创建另一个临时 UartConfig。

~~~text
调用 UartConfig()
       |
       v
选择委托目标 UartConfig(baud, parity, stop_bits)
       |
       v
目标构造函数初始化 base / members
       |
       v
执行目标构造函数体
       |
       v
执行 UartConfig() 自己的构造函数体
       |
       v
对象构造完成
~~~

要点：

- 委托目标必须是同一个类的另一个构造函数。
- 委托构造函数的 mem-initializer 只能包含这个委托目标，不能同时再写 member_(...) 或其他 base/member 初始化项。
- 真正的 base/member 初始化由目标构造函数完成；委托构造函数体在目标构造函数成功完成后才执行。
- 委托目标由构造函数重载决议选择，因此参数类型、explicit、默认参数和重载集合仍然重要。
- 直接或间接形成构造函数委托环是非法程序；不要设计 A() -> A(int) -> A() 这样的循环。

### 4. 委托构造不是函数体内“再调用一次构造函数”

下面不是委托构造：

~~~cpp
UartConfig() noexcept {
    UartConfig(BaudRate::k115200, Parity::kNone, StopBits::kOne);
    // 这会构造一个临时对象，不会初始化当前 this 对象。
}
~~~

对象的成员在进入构造函数体前就必须完成初始化。函数体中写一个同名构造表达式，只会创建另一个临时对象，当前对象的成员仍保持原来的状态。

### 5. 编译期与运行期影响

- 委托目标的选择、参数匹配、访问控制和成员初始化规则由编译器在编译期确定。
- 委托不会创建第二个 UartConfig 对象，也不意味着堆分配；它仍然是在初始化同一个对象。
- 编译器可能内联目标构造函数，但不要把“必然零成本”当作语言保证；复杂构造仍应测量。
- 委托本身不提供错误处理。若运行期输入可能非法，应该先在边界验证，或用返回 Status / std::expected 的命名工厂创建有效对象，而不是让构造函数悄悄产生半有效状态。
- 如果目标构造函数包含动态分配、锁、阻塞或硬件 I/O，所有委托入口都会继承这些成本；委托并不会自动让构造变得实时安全。

### 6. 委托构造与默认成员初始化器

默认成员初始化器仍然遵循目标构造函数的规则：目标构造函数显式初始化某个成员时，使用它给出的值；目标构造函数没有显式初始化该成员时，才会使用该成员的默认成员初始化器（若存在）。因此要把“默认值在哪里定义”作为一项明确的类设计决策，不要在多个构造函数中重复写一套默认值。

## ④ C 写法 vs Modern C++（5 分钟）

### C：用公共初始化函数复用逻辑

~~~c
#include <stdint.h>

typedef struct {
    uint32_t baud_rate;
    uint8_t parity;
    uint8_t stop_bits;
} uart_config_t;

static void uart_config_init_common(uart_config_t* config,
                                    uint32_t baud_rate,
                                    uint8_t parity,
                                    uint8_t stop_bits) {
    config->baud_rate = baud_rate;
    config->parity = parity;
    config->stop_bits = stop_bits;
}

void uart_config_init_default(uart_config_t* config) {
    uart_config_init_common(config, 115200U, 0U, 1U);
}

void uart_config_init_baud(uart_config_t* config, uint32_t baud_rate) {
    uart_config_init_common(config, baud_rate, 0U, 1U);
}
~~~

C 可以通过 init_common() 达到类似的代码复用，但对象存储与初始化阶段由调用者管理：调用者必须确保传入非空指针、对象存储有效，并且不能在忘记初始化时就使用结构体。

### Modern C++：让构造路径成为语言级初始化关系

C++ 的 delegating constructor 把“某个构造入口依赖另一个构造入口”表达在构造语法中。目标构造函数负责初始化 const member、reference member、值成员和组合对象；调用者不能在对象构造完成前观察一个未初始化的实例。

| 维度 | C init function | C++ delegating constructor |
|---|---|---|
| 类型安全 | 字段常用整数/宏表示，需手动校验 | enum class、强类型参数和重载可表达约束 |
| 初始化 | 调用者管理存储与 init 顺序 | 对象创建时自动进入构造链，成员按语言规则初始化 |
| 不变量 | 公共 helper 约定，可能被绕过 | 所有公开构造入口可汇聚到 canonical constructor |
| 可测试性 | 每个 init 函数分别测试 | 测试每种入口，并验证共同不变量 |
| 扩展成本 | 新字段要检查所有 helper | 主要修改 canonical path，减少遗漏 |
| 运行成本 | 普通函数调用，可内联 | 目标构造可能内联；不额外创建对象或分配内存 |

**结论：**C++ 的优势不是“少写几行”，而是把对象有效状态的建立纳入语言的对象生命周期模型。C 项目也可以通过公共初始化函数做到相似的工程收敛，但必须更严格地管理调用协议。

## ⑤ 设计模式映射：不需要 GoF Pattern，先建立唯一初始化路径（6 分钟）

### 真实变化轴与稳定边界

变化轴是**调用者提供多少配置参数**：有时使用默认配置，有时覆盖 baud rate，有时还覆盖 parity/stop bits。稳定边界是 UartConfig 的字段语义、默认值和有效状态。

### Pattern 决策

- **不使用 Factory Method**：没有运行时需要替换的产品层次，也没有一组平台工厂需要隔离。
- **不使用 Builder**：配置只有少量字段，构造入口清晰；引入逐步构建对象只会增加中间状态和 API 面积。
- **不使用 Template Method**：没有一组算法步骤需要由派生类覆盖。
- **使用 Composition / Value Semantics**：UartConfig 由 baud rate、parity、stop bits 等值成员组成；配置对象没有隐式 owner，也不需要 shared_ptr。
- **使用 delegating constructors**：它是语言机制，用来复用同一类的初始化路径，不是 GoF Pattern。

如果未来出现“UART、USB、Socket 三种 runtime transport 可替换”，那是独立变化轴，应该在 composition root 选择具体 Adapter/Strategy 并显式注入；不要把这个未来需求塞进今天的构造函数委托里。

### Ownership / Borrow / Lifetime

- 本日 UartConfig 是小型值对象，字段由对象自己拥有；复制配置只复制值，不共享资源。
- 委托构造不改变成员的 ownership 语义：目标构造函数里初始化 unique_ptr 仍表示独占拥有，初始化引用仍表示 borrow。
- required dependency 用引用表达，并确保被借用对象活得比 borrower 更久；不能为了消除重复初始化而把引用改成 shared_ptr。
- 如果构造函数要保存 callback，必须另行定义 callback target 的 owner、注册者、注销时机、in-flight callback drain 和线程上下文。构造委托不会解决 dangling callback。

### 设计流程

~~~text
需求变化（构造参数多少不同）
  -> 识别变化轴（默认值 / 局部覆盖 / 完整配置）
  -> 寻找稳定边界（同一组成员不变量）
  -> 选择 C++ 机制（delegating constructor）
  -> 判断是否需要 Pattern（本例不需要）
  -> 设计 ownership / borrow / lifetime
  -> 检查 Embedded 副作用与实时上界
  -> Code Review：是否只有一条 canonical initialization path
~~~

## ⑥ Embedded / System Design 场景：Modem 配置与启动生命周期（7 分钟）

### 配置构造与设备启动必须分开

~~~cpp
class ModemController {
public:
    explicit ModemController(IUart& uart) noexcept
        : ModemController(uart, ModemConfig{}) {}

    ModemController(IUart& uart, ModemConfig config) noexcept
        : uart_(uart), config_(config) {}

    [[nodiscard]] Status Start(std::chrono::milliseconds timeout);

private:
    IUart& uart_;        // borrow：IUart owner 必须活得更久
    ModemConfig config_; // value owner：控制器拥有配置副本
};
~~~

上面是架构示意，IUart 由 BSP/HAL Adapter 实现。默认构造入口只把默认配置补齐并委托给完整构造入口；完整构造入口负责绑定依赖和保存配置。

**不要在构造函数里执行 uart.Open()、创建 RTOS task、注册全局 callback 或启动 DMA。** 这些操作可能失败、阻塞、依赖调度器或需要明确 teardown。它们应放到显式 Start(timeout) / Stop() 生命周期 API 中，返回统一 Status，并定义失败回滚和销毁顺序。

### Embedded 约束清单

- **HAL 隔离**：ModemController 依赖小接口 IUart，不直接包含 vendor UART handle 或寄存器结构；平台差异由 Adapter 实现。
- **ownership**：ModemController 借用 IUart&，调用方/平台组合根负责保证 UART adapter 生命周期；ModemConfig 按值保存。
- **线程边界**：配置对象构造不启动线程；task 创建由系统启动阶段统一编排，避免对象构造顺序与调度器启动顺序耦合。
- **callback teardown**：若 Start() 注册 URC callback，Stop() 必须先禁止新事件，再注销并等待 in-flight callback 退出，最后销毁被捕获的状态；不得让回调捕获一个已经销毁的 this。
- **timeout / error**：硬件打开、AT 同步和握手均显式传递 timeout；错误返回 Status，不要在禁异常工程中用异常跨任务/驱动边界。
- **内存上界**：配置使用固定大小 enum/value 字段，不引入 vector、string 或动态插件表；构造入口不做动态分配。
- **CPU/WCET**：delegation 的调用路径很短，但目标构造函数若增加校验/复制，应根据最大数据量估算并测量；不在 ISR 中构造复杂配置对象。
- **ISR / volatile**：构造函数不是同步原语；共享状态必须使用明确的锁/原子/临界区策略，volatile 不能代替线程同步。
- **可测试性**：Host 测试注入 Fake IUart，构造阶段只验证依赖绑定；Start/Stop 单独测试成功、超时、部分启动失败和重复调用。

## ⑦ 今日编码规范（5 分钟）

### MUST 1：所有 convenience constructors 应委托给唯一的 canonical constructor

**错误写法：**每个重载分别复制所有字段初始化，新增 retry_count_ 时只改了两个构造函数，第三个仍保留旧值。

~~~cpp
ModemConfig() noexcept
    : baud_rate_(115200U), timeout_ms_(1000U), retry_count_(3U) {}

explicit ModemConfig(std::uint32_t baud_rate) noexcept
    : baud_rate_(baud_rate), timeout_ms_(1000U), retry_count_(0U) {}
~~~

**推荐写法：**

~~~cpp
ModemConfig() noexcept
    : ModemConfig(kDefaultBaudRate, kDefaultTimeoutMs, kDefaultRetryCount) {}

explicit ModemConfig(std::uint32_t baud_rate) noexcept
    : ModemConfig(baud_rate, kDefaultTimeoutMs, kDefaultRetryCount) {}

ModemConfig(std::uint32_t baud_rate, std::uint32_t timeout_ms) noexcept
    : ModemConfig(baud_rate, timeout_ms, kDefaultRetryCount) {}

ModemConfig(std::uint32_t baud_rate, std::uint32_t timeout_ms,
            std::uint8_t retry_count) noexcept
    : baud_rate_(baud_rate), timeout_ms_(timeout_ms), retry_count_(retry_count) {}
~~~

### MUST 2：构造函数只建立对象不变量；可失败的硬件操作放在显式生命周期 API

**错误写法：**在构造函数中打开 UART、创建线程、注册 callback；构造失败时调用者无法从普通构造表达式得到统一错误状态，也很难安排 teardown。

**推荐写法：**构造函数只保存依赖和值配置；Start(timeout) 返回 Status，Stop() 负责注销、drain 与资源释放。若输入校验会失败，先在 factory/boundary 验证，再构造有效对象。

### SHOULD 3：单参数构造函数保持 explicit，配置语义使用强类型

**错误写法：**用 int 同时表达 baud rate、timeout、retry count，并允许隐式转换构造。

**推荐写法：**对可枚举的硬件选项使用 enum class；单参数构造函数默认 explicit；时间使用 std::chrono::duration 或带单位的类型/名称。不要让委托构造掩盖参数语义。

## ⑧ 可编译 Lab / 练习（9 分钟）

所有文件都是独立编译单元，每个文件包含自己的 int main()；请分别编译，不要把两个源文件一起链接。

### 主 Lab：把不同配置入口汇聚到一个构造路径

源码：[examples/day-073/main.cpp](../examples/day-073/main.cpp)

~~~bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic examples/day-073/main.cpp -o day073
./day073
~~~

程序使用 enum class 表示 baud rate、parity、stop bits。默认构造、只指定 baud rate、指定 baud rate + parity 的入口都委托给完整构造函数。运行输出应为：

~~~text
default: baud=115200 parity=none stop_bits=1
baud-only: baud=921600 parity=none stop_bits=1
baud+parity: baud=115200 parity=even stop_bits=1
full: baud=9600 parity=odd stop_bits=2
~~~

观察点：所有省略字段都来自同一条 canonical path；没有堆分配、没有 pointer ownership，也没有硬件副作用。

### Exercise 01：修复构造函数默认值漂移

源码：[examples/day-073/exercise-01.cpp](../examples/day-073/exercise-01.cpp)

~~~bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic examples/day-073/exercise-01.cpp -o day073-ex01
./day073-ex01
~~~

这是完整、可独立编译运行的 starter，包含 int main()。当前程序可以正常运行，但 ModemConfig(baud_rate) 把 retry_count_ 初始化为 0，而默认构造与双参数构造使用 3。这模拟了多个构造函数各自复制初始化代码后产生的不变量漂移。

**Starter 当前输出：**

~~~text
default: baud=115200 timeout_ms=1000 retries=3
baud-only: baud=57600 timeout_ms=1000 retries=0
baud+timeout: baud=9600 timeout_ms=2000 retries=3
expected default retries=3
~~~

**修复任务：**

1. 新增一个包含所有字段的 canonical constructor：ModemConfig(baud_rate, timeout_ms, retry_count)。
2. 将默认构造、单参数构造、双参数构造全部改成 delegating constructors。
3. 保证所有省略的字段都使用同一组 kDefault... 常量。
4. 保留 explicit、noexcept 与现有 getter；不要引入 shared_ptr、动态全局对象或 service locator。
5. 再次运行程序，确认三种入口的默认 retry count 均为 3。

**修复后应观察到：**

~~~text
default: baud=115200 timeout_ms=1000 retries=3
baud-only: baud=57600 timeout_ms=1000 retries=3
baud+timeout: baud=9600 timeout_ms=2000 retries=3
expected default retries=3
~~~

## ⑨ 3 个常见坑（2 分钟）

1. **把委托写在函数体里**：UartConfig(args); 只会创建临时对象，不会初始化当前对象；必须写在 mem-initializer 中。
2. **委托构造函数同时初始化成员**：UartConfig() : UartConfig(...), baud_rate_(...) {} 不合法；委托构造函数只能指定委托目标，成员初始化归目标构造函数负责。
3. **把副作用塞进 canonical constructor**：一旦完整构造函数启动硬件/线程/回调，所有 convenience constructors 都继承这些失败与实时成本；配置初始化和设备启动必须分开。

## ⑩ 检查题（1 分钟）

### 知识 / 代码检查

1. UartConfig() : UartConfig(115200U) {} 中，目标构造函数体与 UartConfig() 自己的函数体，哪个先执行？为什么？
2. 为什么 UartConfig() { UartConfig(115200U); } 不能替代委托构造？这段代码创建/初始化了几个对象？

### 设计题

Modem 驱动有默认 UART 配置、只改 baud rate、只改 timeout、完整配置四种创建入口。你会选择：保持多个构造函数 + delegating constructor、改成 Options 值对象，还是引入 Builder？请说明：

- 真正的变化轴是什么，稳定不变量是什么；
- 哪条路径拥有成员初始化的唯一责任；
- IUart 是 owner 还是 borrow，谁保证其生命周期；
- UART open、task 创建、callback 注册为什么不应隐式发生在构造函数中；
- 如果 timeout/配置来自外部运行期输入，错误应在哪个边界返回；
- 最大构造成本、动态分配、锁/阻塞和 teardown 如何验证。

**自检原则：**先识别变化，再找稳定边界；先建立有效对象，再执行可能失败的启动动作；先设计 lifetime，再选择 pointer；Pattern 是工具不是目标。
