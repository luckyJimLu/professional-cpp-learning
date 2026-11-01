---
day: 67
week: 10
part: III
chapter: 8
chapter_title: Gaining Proficiency with Classes and Objects
title: Class Encapsulation and Member Functions
duration: 60
status: published
date: 2026-11-01
topics: [classes, access-control, member-functions, in-class-initializers, invariants, value-semantics]
patterns: [encapsulation, information-hiding, composition]
guidelines: [private-state, explicit-invariants, in-class-member-initializers]
lab:
  path: examples/day-067/main.cpp
previous: 66
next: 68
---

# Day 67 · 从数据结构到封装：class、成员函数与对象不变量

> **主教材**：Marc Gregoire，《Professional C++》，Sixth Edition，Chapter 8 · *Gaining Proficiency with Classes and Objects*。
>
> **今天范围**：从 Spreadsheet 示例进入 class definition、class members、access control、成员函数和 in-class member initializers；今天不提前展开 constructors、copy/assignment 与完整 object lifecycle。
>
> **设计模式辅线**：以封装（Encapsulation）和信息隐藏（Information Hiding）解释稳定边界。它们是设计原则，不是今天必须套用的 GoF 模式。

**学习目标**：把一组可被任意修改的字段，重构为一个能保护自身不变量的类型；同时判断这个类型是否真的需要堆分配、继承或运行时多态。

**60 分钟安排**：阅读 5 分钟 → 昨日复习 5 分钟 → 核心概念 12 分钟 → C/C++ 对照 6 分钟 → 设计映射 8 分钟 → Embedded 场景 6 分钟 → 规范 6 分钟 → Lab/练习 8 分钟 → 常见坑 2 分钟 → 检查题 2 分钟。

## ① 今日章节与建议阅读范围（5 分钟）

**Chapter 8，建议阅读 pp.260–264：**

- Introducing the Spreadsheet Example
- Writing Classes / Class Definitions
- Class Members / Access Control / Order of Declarations
- In-Class Member Initializers
- Defining Member Functions
- Accessing Data Members / Calling Other Member Functions

按顺序阅读，不要先跳到 constructors 或 copy operations。对象存储位置与完整生命周期会在本章后续小节继续展开；今天只用一个自动存储期对象观察 class 的基本行为。

阅读时标注三件事：

1. 哪些状态是对象自己的数据，哪些操作是对象对外承诺的行为？
2. 哪些字段必须一起变化，才能维持一个合法状态？
3. 如果调用者直接写字段，是否可能绕过校验或破坏状态机？

## ② 昨日复习 3 问（5 分钟）

承接上一课 Memory Management 的资源边界决策树：

1. **ownership**：一个 UART Driver 由系统长期持有，多个 middleware 同步使用。为什么通常是一个 owner 加多个 reference borrow，而不是每层都保存 shared_ptr？
2. **allocation**：unique_ptr 能表达单一所有权，为什么它本身不能证明对象创建和销毁适合硬实时路径？
3. **lifetime**：固定容量 transaction slot 释放后再复用，为什么旧指针即使数值地址相同，也不能继续当作原对象的有效 borrow？

复习目标不是背智能指针名称，而是把 owner、borrow、storage、object lifetime 和 teardown 分开判断。

## ③ 核心概念：class 是类型边界，也是不变量边界（12 分钟）

### 1. 从“字段集合”到“具有规则的对象”

C 的 struct 很适合组织数据；但当字段之间存在约束时，单靠 struct 并不能阻止调用者构造非法组合。例如：

- baud rate 必须处于硬件支持范围；
- data bits 只能是 7 或 8；
- UART 已启动时不能随意改写配置；
- 发送操作只能发生在 started 状态。

class 把数据与操作放在同一个类型边界中。它的价值不是“把函数搬进 class”，而是让公共 API 成为维护不变量的唯一入口。

### 2. class 与 struct 的访问控制

- class 的默认成员访问级别是 private。
- struct 的默认成员访问级别是 public。
- 两者都可以拥有数据成员、成员函数和访问控制区段；它们不是两种不同的对象模型。
- 对外只暴露调用者需要的操作；状态细节尽量留在 private。

不要把 private 理解成安全沙箱。它是编译期接口边界，防止普通调用代码直接访问实现细节；它不替代并发同步、硬件访问权限或输入校验。

### 3. 成员函数与对象状态

成员函数通过当前对象访问其数据成员。调用者表达的是“让这个对象执行一个操作”，而不是从外部任意组合字段写入。成员函数可以在 class 内定义，也可以先声明、在 class 外定义；公开 API 与实现代码因此可以保持清晰。

普通非 virtual 成员函数调用不意味着运行时多态，也不会自动引入堆分配或 vtable。是否动态分配、是否 virtual，是另外两项独立设计决定。

### 4. In-class member initializers

在类定义中给数据成员明确默认值：

~~~cpp
std::uint32_t baud_rate_{115'200U};
std::uint8_t data_bits_{8U};
UartState state_{UartState::kStopped};
~~~

这让默认状态可见、可审查，也避免标量成员在某些初始化路径中保持不确定值。后续构造函数若没有显式覆盖该成员，会使用这个默认成员初始化器；构造函数的完整规则留到本章后续课程。

### 5. 声明顺序与对象布局

成员声明顺序是源码的一部分，影响可读性，也会影响后续构造函数成员初始化的实际顺序。不要把某个编译器观察到的字节布局当成跨 ABI 的通用承诺；需要验证布局时，使用 sizeof、alignof 和目标平台 ABI 证据。

### 6. 编译期与运行期

- 编译期：编译器检查访问权限、成员函数签名、参数类型和调用是否合法；对象类型及成员布局由编译器处理。
- 运行期：成员函数执行状态转换、校验输入并更新对象状态。
- 资源成本：一个普通 class 对象可以完全以内嵌值成员构成；不因为使用 class 就产生 heap、virtual dispatch 或引用计数。

## ④ C 写法 vs Modern C++（6 分钟）

### C：字段和操作分离，调用约定保护状态

~~~c
typedef struct {
    uint32_t baud_rate;
    uint8_t data_bits;
    bool started;
} uart_port_t;

void uart_configure(uart_port_t* port,
                    uint32_t baud_rate,
                    uint8_t data_bits);
void uart_start(uart_port_t* port);
~~~

如果结构体定义对调用方可见，调用方可以直接执行 port->baud_rate = 0；所有函数都必须假设调用者可能绕过约定。C 也能通过 opaque handle 和不透明结构体隐藏状态，但需要额外的头文件/实现边界与句柄生命周期约定。

### Modern C++：把状态约束收进类型

~~~cpp
class UartPort {
public:
    Status Configure(std::uint32_t baud_rate, std::uint8_t data_bits);
    Status Start();
    Status Send(std::span<const std::uint8_t> bytes);

private:
    std::uint32_t baud_rate_{115'200U};
    std::uint8_t data_bits_{8U};
    UartState state_{UartState::kStopped};
};
~~~

| 维度 | C struct + free functions | C++ class |
|---|---|---|
| 类型安全 | 可实现，但字段公开时容易绕过约定 | access control 把普通调用限制在 API |
| 资源管理 | 需另外定义 handle/init/deinit 协议 | 可继续演进到 RAII 与明确生命周期 |
| 可测试性 | 需测试函数组合和非法字段组合 | 可直接测试公共操作与状态转换 |
| 扩展性 | opaque handle / 函数表也能实现 | class 可自然承载值成员与组合 |
| 成本 | 简单直接，C ABI 兼容好 | 无额外 heap/virtual 的必然成本；抽象复杂度仍需控制 |

**结论**：C++ class 的优势是把合法操作收敛到类型接口；不是所有 C struct 都必须改成 class，也不是所有 class 都需要继承。

## ⑤ 设计模式映射：今天不套 GoF 模式（8 分钟）

### 真实变化轴

今天示例中变化的是 UART 配置值和状态转换；它们是同一个 UART 对象需要维护的业务状态，不是可运行时替换的一组算法。

### 稳定边界

稳定边界是：

- 公共操作：Configure / Start / Send / Stop；
- 私有表示：baud rate、data bits、started state、统计计数；
- 不变量：非法配置不能进入对象；启动后不能重新配置；未启动时不能发送。

### Pattern 判断

- **不使用 Strategy**：没有多个需要运行时切换的算法；把 baud rate 不同误认为 Strategy 变化轴是概念混淆。
- **不使用 Factory**：今天没有具体产品类型或创建过程的变化。
- **不使用 Observer**：没有需要通知多个订阅者的状态事件。
- **不使用 Adapter**：当前没有需要转换的 vendor/HAL API；真正封装旧 C Driver 时再评估 Adapter。
- **不增加 virtual interface**：固定固件中的具体 UART 类型已知，普通 class 足够；若未来确有运行时替换需求，再比较 runtime interface 与 template/concept 的成本。

今天采用的是 **Encapsulation + Information Hiding**，不是 GoF Pattern。组合（composition）是组织对象的常用方式，也不意味着必须建立额外层级。

### Ownership / borrow / lifetime

- main 中的 UartPort 是一个自动存储期对象，自己拥有其值成员。
- 不需要 new、unique_ptr 或 shared_ptr。
- 其他模块若只需同步调用，可借用 UartPort&；borrower 不得活得比 owner 更久。
- 今天没有 callback，因此没有 unsubscribe；未来加入异步 DMA/callback 时，必须先定义 buffer owner、完成回调的线程上下文、取消与 drain 顺序，再设计 API。

## ⑥ Embedded / System Design 场景：UART Driver 的状态边界（6 分钟）

一个真实 Driver 可以按以下层次理解：

~~~text
Application / Modem Middleware
              |
       UartPort public API
              |
   private configuration/state
              |
        HAL / BSP registers
              |
          UART hardware
~~~

今天只实现 UartPort 的类型边界，不模拟寄存器写入。真实工程应进一步审计：

- **owner**：由 board/application composition root 创建并持有 Driver；上层借用，不复制硬件所有权。
- **线程上下文**：示例不是线程安全类。可规定单一 Driver task 拥有它；跨任务访问由明确的 queue/lock boundary 处理。
- **IRQ**：ISR 不应因为成员函数存在就随意调用整个对象；IRQ handler 应保持短小，只做有界寄存器处理/事件投递。
- **实时性**：配置和发送路径不引入无界容器、动态分配或阻塞；如果提供 blocking send，timeout 必须显式带单位。
- **异步 buffer**：DMA 尚未完成时，调用者传入的 span 不能提前失效。API 必须定义 buffer 在途期间的 owner 与完成/取消时机。
- **错误传播**：InvalidArgument、Busy、NotReady 等可恢复错误进入 Status；不要用 assert 处理外设输入错误。
- **可测试性**：今天的状态逻辑可在 host 上测试；寄存器访问应留在 HAL/BSP 层，以便替换 Fake。

## ⑦ 今日编码规范（6 分钟）

### MUST 1：可变状态默认 private，所有状态转换经过成员函数

错误写法：

~~~cpp
uart.started = true;
uart.baud_rate = 0;
~~~

推荐写法：

~~~cpp
const Status config_status = uart.Configure(115'200U, 8U);
const Status start_status = uart.Start();
~~~

成员函数负责校验并维护不变量。不要用一组 public setter 重新暴露所有字段；公共 API 应表达合法操作，而不是字段搬运。

### MUST 2：每个标量成员都有明确初始化来源

错误写法：

~~~cpp
class UartPort {
    std::uint32_t baud_rate_;
    bool started_;
};
~~~

推荐写法：

~~~cpp
class UartPort {
    std::uint32_t baud_rate_{115'200U};
    UartState state_{UartState::kStopped};
};
~~~

### SHOULD 3：状态与错误使用 enum class，不使用魔法整数或含糊 bool

错误写法：用 0、1、2 表示 stopped、started、error，并让多个 bool 参数控制 Configure。

推荐写法：用 UartState、Status 等强类型枚举；函数参数按真实语义命名。沿用仓库既定命名：类型/函数 PascalCase，变量 snake_case，成员 snake_case_，常量 kPascalCase。

## ⑧ 可编译 Lab / 练习（8 分钟）

### 主 Lab：封装 UART 配置与状态不变量

文件：[examples/day-067/main.cpp](../examples/day-067/main.cpp)

~~~bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic examples/day-067/main.cpp -o day067
./day067
~~~

程序使用一个普通 class 和内嵌标量成员，不创建 heap 对象。观察：

1. 默认成员初始化器提供 115200 / 8-bit / stopped；
2. 合法配置与启动返回 ok；
3. started 状态下重新配置返回 busy；
4. 非法 baud rate 返回 invalid argument；
5. 发送 4 字节后计数为 4。

预期输出：

~~~text
default: 115200 baud, 8 data bits
configure: ok
start: ok
send: ok
reconfigure while started: busy
invalid baud after stop: invalid argument
final: 4 bytes sent, state=stopped
~~~

### Exercise 01：Code Review 修复公开状态

文件：[examples/day-067/exercise-01.cpp](../examples/day-067/exercise-01.cpp)

~~~bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic examples/day-067/exercise-01.cpp -o day067-ex01
./day067-ex01
~~~

Starter 是**逻辑/设计违规但可编译运行**的完整程序，包含 main()。先运行，观察它允许 baud=0、data_bits=5，同时把 started 设为 true。

请重构这个独立文件：

1. 把 struct 改为 class，并将可变字段设为 private；
2. 使用 enum class 表达状态与错误；
3. 用 Configure / Start / Stop 等成员函数保护状态转换；
4. Configure 先完成全部输入校验，再一次性更新配置，不能留下半更新状态；
5. started 时拒绝重新配置；非法配置不得改变旧配置；
6. 保持固定值成员，不引入 heap、shared_ptr、Factory 或虚接口；
7. 增加可观察输出，证明非法配置被拒绝且对象仍保持原有合法状态。

这是一个可独立运行的重构练习，不依赖主 Lab，也不需要把两个 main() 合并。

## ⑨ 3 个常见坑（2 分钟）

1. **混淆 class 与 struct**：两者都能有成员函数和访问控制；主要语法差异是默认访问级别，不是一个“面向对象”、另一个“只能存数据”。
2. **以为 private 自动保证线程安全**：private 防止外部直接访问，不会自动提供 mutex、IRQ 保护或原子性；线程/中断约束仍要显式设计。
3. **把 class 等同于 heap/virtual**：一个 class 可以是固定大小、自动存储期、无动态分配、无虚函数的普通值对象；不要为“面向对象”引入不必要运行时成本。

## ⑩ 检查题（2 分钟）

### 知识 / 代码检查

1. class 与 struct 的默认成员访问权限分别是什么？把 struct 改为 class 是否会自动改变对象的存储期或分配位置？
2. 为什么把 baud_rate_ 设为 private 后，还需要 Configure() 做输入校验？private 能否阻止同一对象被多个任务并发调用？

### 设计题

Modem Middleware 需要配置 UART、启动/停止端口，并由一个任务发送 AT command。未来可能增加 USB transport，但当前产品固件只启用 UART。

请给出最小设计，并回答：

- 当前真实变化轴是什么？USB 只是未来假设，还是已存在的运行时需求？
- 哪些状态必须由一个 class 不变量保护？
- Driver 的 owner 是谁？Middleware 是借用还是共同拥有？
- 现在应保持简单、使用 composition，还是引入 Adapter/Strategy？说明为什么。
- 如果未来切换到 USB，变化发生在编译期还是运行期？分别如何评估 template/concept 与 runtime interface？
- ISR、DMA buffer lifetime、timeout、错误模型和 teardown 如何约束接口？

**自检标准**：答案必须指出稳定 API、私有状态、唯一 owner/borrow 关系、是否需要运行时多态，以及实时路径的分配/阻塞上界；不能只画类图或列 Pattern 名称。

---

## 今日结论

**class 的价值不在于把数据包进大括号，而在于把合法状态和合法操作放进同一个可审查的类型边界。先用 private state、清晰成员函数和默认成员初始化器建立不变量；没有真实变化轴时，不增加 Factory、Strategy、Observer 或 virtual hierarchy。**

下一课沿 Chapter 8 顺序继续：使用对象、自动/动态存储期、this 指针与 C++23 explicit object parameter，再进入对象生命周期和构造过程。
