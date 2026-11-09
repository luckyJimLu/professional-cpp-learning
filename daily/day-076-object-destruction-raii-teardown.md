# Day 76 · Object Destruction：析构顺序、RAII 与可控 Teardown

> **日期**：2026-11-09  
> **主教材**：Marc Gregoire, *Professional C++, Sixth Edition*（C++23），Chapter 8 · *Gaining Proficiency with Classes and Objects*，p.286 起 · **Object Destruction**。建议读完该小节，并在原书下一标题处停止；不提前展开后续 assignment operator 内容。  
> **前置课程**：[Day 75 · Summary of Compiler-Generated Constructors](day-075-summary-compiler-generated-constructors.md)；[Day 70 · Constructor Initializer Lists and Member Initialization Order](day-070-constructor-initializer-list-member-order.md)。  
> **辅教材**：Dmitri Nesteruk, *Design Patterns in Modern C++*。今天使用 RAII、Composition 与 Adapter 的工程思想；RAII 是 C++ 资源管理惯用法，不把它误称为 GoF 模式。

**今天要回答的问题：对象生命周期结束时，谁负责清理资源？多个成员互相依赖时，怎样保证析构顺序不会先销毁被依赖对象？**

**学习目标**：识别析构函数的调用时机与顺序；理解析构函数体、成员和基类的销毁顺序；判断多态基类是否需要 virtual destructor；区分“显式、可失败的 Stop/Close”与“不可失败的析构兜底”；为 callback registration、transport 和硬件资源设计安全 teardown。

**60 分钟安排**：阅读 7 分钟 → 复习 4 分钟 → 概念 15 分钟 → C/C++ 对照 5 分钟 → 设计映射 6 分钟 → Embedded 场景 7 分钟 → 规范 4 分钟 → Lab/练习 9 分钟 → 常见坑 2 分钟 → 检查题 1 分钟。

---

## ① 今日章节与建议阅读范围（7 分钟）

**Chapter 8，p.286 起：Object Destruction。** 以原书该小节为准，读完析构函数与对象销毁相关内容，在下一个小节标题处停止。仓库 Day 75 已把本节标为 Chapter 8 的下一主题；今天不跳到 assignment operator。

阅读时标记五件事：

1. 析构函数的声明形式，以及它与构造函数的区别；
2. 自动对象、动态对象、临时对象和静态对象分别在什么时候结束生命周期；
3. 一个完整对象销毁时，析构函数体、成员和基类按什么顺序执行；
4. 通过基类指针删除派生对象时，为什么需要虚析构函数；
5. 析构函数为什么不适合承担可能失败、需要 timeout 或可能阻塞的业务操作。

**阅读边界**：今天关注 destruction 与 teardown 的责任边界。Move constructor / move assignment 的完整规则仍留给 Chapter 9；这里只提醒：user-declared destructor 会影响编译器隐式生成 move special members 的规则，不在本课提前展开。

## ② 昨日复习 3 问（4 分钟）

承接 Day 75：

1. **核心机制**：编译器生成的 copy constructor 对 raw pointer 成员做了什么？它会自动复制指向的数据吗？
2. **工程判断**：一个类包含 std::unique_ptr<Buffer>，为什么默认复制能力会被限制？这与“对象是否应该共享资源”有什么关系？
3. **代码细节**：std::is_copy_constructible_v<T> 为 true，是否足以证明复制 T 不会 double-release？还需要检查哪些语义？

复习要点：memberwise copy 复制成员语义；raw pointer 只复制地址；unique_ptr 表达唯一所有权并自然阻止复制；type traits 检查表达式能力，不证明运行期资源语义。

## ③ 核心概念：Object Destruction（15 分钟）

### 1. 析构函数是对象生命周期结束时的清理入口

析构函数名称是 ~TypeName()，没有返回类型、没有参数，同一个类不能通过参数列表重载多个析构函数。

~~~cpp
class UartPort {
public:
    explicit UartPort(int handle) noexcept : handle_{handle} {}
    ~UartPort() noexcept = default;

private:
    int handle_;
};
~~~

析构函数的责任是释放对象拥有的资源、解除对象建立的局部关系，并维持 teardown 后的系统不变量。它不是普通业务 API：调用方不能从析构函数接收 Status，也不能通过参数选择不同的关闭策略。

### 2. 常见销毁时机

| 对象来源 | 生命周期结束的典型时机 | 工程提醒 |
|---|---|---|
| automatic storage 对象 | 离开所在作用域 | 按构造顺序的逆序销毁 |
| dynamic storage 对象 | 对应 delete 表达式，或 owner 执行释放 | 优先用 unique_ptr / 容器管理 |
| 临时对象 | 通常在创建它的 full-expression 结束时 | 不要把临时对象地址保存到异步 callback |
| static storage 对象 | 程序正常终止阶段 | 跨 translation unit 的静态析构依赖要谨慎 |
| thread storage 对象 | 对应线程结束时 | 不要假设它比所有后台任务活得更久 |

数组对象销毁时，元素按构造的逆序销毁。std::unique_ptr<T[]> 使用数组删除语义；不要混用 new[] 与标量 delete。

### 3. 一个对象内部的销毁顺序

对一个完整的派生对象，核心顺序可以记为：

1. 先执行最派生类的 destructor body；
2. 再按成员声明顺序的逆序销毁 non-static data members；
3. 再销毁直接基类子对象（按构造顺序的逆序）；
4. 最后处理虚基类子对象（按语言规定的逆序销毁顺序）。

局部对象也遵循逆构造顺序。这个规则直接决定成员声明顺序：**如果 CallbackRegistration 的析构需要访问 Transport，那么 Transport 必须先构造、后销毁。** 因此应先声明 transport_，再声明 callback_：

~~~cpp
class ModemService {
private:
    FakeTransport transport_;          // 先构造，后销毁
    CallbackRegistration callback_;    // 后构造，先销毁
};
~~~

构造时 transport_ 先于 callback_；销毁时 callback_ 先于 transport_。构造函数 initializer list 的书写顺序不会改变成员实际初始化顺序，成员声明顺序才是依据。

### 4. 多态基类要正确设计析构函数

如果客户端可能通过 Base* 或 std::unique_ptr<Base> 删除派生对象，基类析构函数必须是 public virtual：

~~~cpp
class ITransport {
public:
    virtual ~ITransport() noexcept = default;
    virtual Status Stop(std::uint32_t timeout_ms) noexcept = 0;
};
~~~

通过没有 virtual destructor 的基类指针删除动态类型为派生类的对象，行为未定义。若基类明确不允许通过基类指针删除对象，可以考虑 protected non-virtual destructor；不要公开一个可被 delete Base* 调用的 non-virtual destructor。

还要记住：在基类 destructor body 执行时，派生类部分已经销毁。不要在构造函数或析构函数中调用 virtual function，并期待得到最派生类的行为。

### 5. 析构函数不应该承担可失败的业务关闭流程

析构函数不能返回 Status，因此它不适合表达：

- 等待 DMA idle，且等待可能超时；
- flush 数据，且 flush 可能失败；
- 关闭网络连接，且对端响应不确定；
- 获取可能阻塞的锁或等待另一个 RTOS task；
- 注册/注销 callback 后还需要等待 in-flight callback drain。

推荐分成两个层次：

~~~cpp
class ModemTransport {
public:
    [[nodiscard]] Status Stop(std::uint32_t timeout_ms) noexcept;
    ~ModemTransport() noexcept; // 有界、no-throw 的安全兜底
};
~~~

调用方在正确线程上下文显式执行 Stop(timeout)，检查结果并决定重试、降级或记录故障；析构函数只执行不阻塞、不抛异常的最后兜底。不要把“析构一定会被调用”误解为“析构可以可靠完成一项可能失败的业务协议”。

### 6. 析构函数与异常、noexcept

本项目按 Embedded Guideline 默认禁用异常。析构函数必须不抛异常，并应明确标注 noexcept。在一般 C++ 中，析构函数的隐式异常规格受成员和基类析构函数影响；若析构期间异常逃逸，尤其是在 stack unwinding 已经发生时，会导致 std::terminate。

std::is_nothrow_destructible_v<T> 可以检查类型的析构表达式是否为 nothrow，但它不能证明析构不会阻塞、不会访问已销毁对象，也不能证明释放硬件资源的时序正确。

### 7. 对象生命周期结束，不等于底层存储一定被释放

对象析构结束的是对象生命周期。底层存储可能来自固定 pool、静态 byte buffer 或 placement construction 场景，并不一定立即归还给 heap。手工管理存储时应优先使用 std::construct_at / std::destroy_at 等明确表达对象生命周期的工具；不要对普通自动对象手工调用 destructor 后，又让作用域退出时再次析构。

std::shared_ptr 的最后一个 strong owner 释放时会销毁被管理对象；这个析构可能发生在最后一次 reset() 的线程上。若对象析构会访问 RTOS、HAL 或线程亲和资源，就不能忽略“最后一个 owner 在哪个线程释放”的问题。

### 8. user-declared destructor 对后续 special members 的影响

为类手写 destructor 不只是增加清理代码。它还会影响编译器隐式生成 move constructor / move assignment 的规则。今天先记住这个风险：**不要为了日志而给每个类机械添加自定义 destructor。** 优先 Rule of Zero，让 RAII 成员完成清理；完整 move 规则按 Chapter 9 学习。

## ④ C 写法 vs Modern C++（5 分钟）

### C：资源创建与销毁依赖调用方配对

~~~c
struct uart_handle {
    int fd;
    int is_open;
};

int uart_open(struct uart_handle *handle);
int uart_close(struct uart_handle *handle);

void modem_task(void)
{
    struct uart_handle uart = {-1, 0};
    if (uart_open(&uart) != 0) {
        return;
    }

    /* 使用 UART。每条 return / error path 都必须审查 close。 */
    (void)uart_close(&uart);
}
~~~

C 可以通过 init/close/destroy API、统一 cleanup label 或 opaque handle 实现资源管理，但调用方必须遵守配对规则；新增 early return 时容易遗漏清理。

### Modern C++：RAII 把资源释放绑定到 owner 生命周期

~~~cpp
class UartHandle {
public:
    explicit UartHandle(int fd) noexcept : fd_{fd} {}
    UartHandle(const UartHandle&) = delete;
    UartHandle& operator=(const UartHandle&) = delete;
    ~UartHandle() noexcept { if (fd_ >= 0) { HalCloseNoWait(fd_); } }

    [[nodiscard]] Status Close(std::uint32_t timeout_ms) noexcept;

private:
    int fd_{-1};
};
~~~

| 维度 | C 手工配对 | Modern C++ RAII |
|---|---|---|
| 资源释放 | 每条退出路径显式 close | owner 生命周期结束时自动兜底 |
| 错误处理 | close 返回值可由调用方检查 | 可失败关闭仍用显式 Close/Stop 返回 Status；析构只兜底 |
| 所有权 | 依赖 API 约定与注释 | move-only owner 可在类型层禁止复制 |
| 可测试性 | 测试遗漏 close 与重复 close | 测试 scope exit、显式关闭失败和 destructor fallback |
| 实时成本 | 取决于手写清理路径 | 析构成本仍需审计；RAII 不会自动保证有界或非阻塞 |

RAII 不是“析构里做所有事”。正确做法是让 owner 自动保证资源最终进入安全状态，同时把可失败、需要 timeout 的流程保留为显式 API。

## ⑤ 设计模式映射：RAII、Composition 与 Adapter（6 分钟）

**真实变化轴**：底层 HAL / OS 句柄的释放方式可能因平台而异；callback registration 与 transport 有先后依赖；Stop 可能失败或超时。稳定边界是资源 owner 的生命周期与显式状态转换。

| 设计问题 | 推荐做法 | 是否需要 GoF Pattern |
|---|---|---|
| C HAL handle 需要析构释放 | 小型 RAII wrapper | 可用 Adapter 隔离 C API；不需要复杂 Factory |
| callback 注册必须先于 transport 销毁而注销 | 独立 registration guard + Composition | 不需要为了它构造完整 Observer 框架 |
| 多平台 close API 不同 | HAL Adapter | 只有真实平台变化轴存在时才引入 |
| Stop 需要 timeout / retry | 显式生命周期 API + Status | 不需要 State Pattern，除非状态转换规则已经复杂且独立变化 |

**Ownership / Borrow / Lifetime**：

- ModemService 拥有 FakeTransport 与 registration guard；
- CallbackRegistration 借用 FakeTransport，所以 transport 必须比 registration 活得更久；
- callback 捕获 this 时，必须先 unregister/cancel，再等待 in-flight callback 退出，最后才销毁对象；仅仅把 token 析构了，不一定代表异步执行中的 callback 已经停止；
- 不要用 shared_ptr 让 transport 与 callback 互相延长生命周期来掩盖 teardown 顺序；先明确单一 owner、borrow 和 teardown contract。

**为什么今天不使用 Observer / Factory / Strategy**：今天的核心是资源生命周期，而不是多种算法或运行时创建策略。Observer 会增加订阅表、并发回调、注销与 in-flight 管理成本；Factory 不会修复析构顺序；Strategy 也不是处理资源释放的工具。小型 RAII registration token + Composition 已足够。

设计检查顺序：

~~~text
需求变化 → 找出资源与依赖 → 确定唯一 owner / borrow
→ 排列成员声明顺序 → 设计显式 Stop(timeout)
→ 设计 no-throw destructor fallback
→ 验证 callback unregister / in-flight drain / teardown
~~~

## ⑥ Embedded / System Design：RTOS Modem Driver teardown（7 分钟）

假设 ModemService 由一个控制 task 拥有，内部包含 UART transport、DMA channel lease 和 callback registration。

推荐销毁顺序：

1. 控制 task 收到 shutdown request，在允许阻塞的 task context 执行 Stop(timeout)；
2. 停止接收新的事件，并 unregister callback；
3. 等待已经进入的 callback 完成（in-flight drain），超时则返回明确 Status，不直接销毁仍被使用的对象；
4. 停止 DMA / UART，释放硬件资源；
5. 退出 scope，registration guard 作为兜底先销毁，transport 与 HAL owner 后销毁。

### 必须审查的系统约束

- **线程上下文**：析构可能在最后一个 owner 所在的线程执行；shared_ptr 最后一次释放不保证发生在指定 RTOS task。
- **IRQ**：不要在 ISR 中执行可能阻塞、获取普通 mutex、等待 callback drain 或复杂析构的路径。ISR 只投递有界事件，由 owner task 完成 teardown。
- **timeout**：Stop(timeout_ms) 必须明确单位、零 timeout 语义、超时后的对象状态和重试规则；禁止 WaitForever 藏在 destructor 里。
- **callback**：注销注册关系与等待 in-flight callback 是两件事。必须有 unregister、cancel 或 generation/token 机制，并定义线程同步与销毁顺序。
- **内存上界**：析构路径不应隐式分配；registration list、日志缓冲与回调队列要有容量上界。
- **WCET**：清理步骤应有可分析的最大工作量；不能因为“RAII 自动执行”就认为它满足硬实时约束。
- **错误传播**：可失败 shutdown 通过 Status 返回给管理 task；析构 fallback 不抛异常、不无限等待，只能做安全、幂等、有界的兜底动作。
- **硬件可替换性**：FakeTransport 可在 host test 中验证生命周期顺序；实际 HAL Adapter 只在平台边界处理寄存器、IRQ 和 RTOS API。

## ⑦ 今日编码规范（4 分钟）

### MUST 1：析构函数必须 no-throw、非阻塞、有界

错误：在 ~DmaDriver() 中等待 DMA idle、获取无 timeout 的锁或执行可能失败的网络关闭。推荐把可失败流程放入 Stop(timeout) / Close(timeout)，返回 Status；析构只做幂等、非阻塞的安全兜底，并显式标注 noexcept。

### MUST 2：多态删除必须有正确的析构契约

错误：接口基类提供 public non-virtual destructor，却允许 std::unique_ptr<Base> 持有派生对象。推荐 public virtual destructor；若禁止通过基类销毁，则使用 protected non-virtual destructor 并让 API 明确表达这一限制。

### MUST 3：成员声明顺序必须满足 teardown 依赖

错误：先声明 callback guard，后声明它借用的 transport，导致 reverse destruction 先销毁 transport。推荐先声明 owner/dependency，再声明 borrower/registration；评审时同时检查构造顺序、析构顺序与 callback in-flight drain。

## ⑧ 可编译 Lab / 练习（9 分钟）

所有源码都是独立编译单元，各自包含 int main()，必须分别编译运行。

### 主 Lab：显式 Stop 与 destructor fallback

源码：[examples/day-076/main.cpp](../examples/day-076/main.cpp)

~~~bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic examples/day-076/main.cpp -o day076
./day076
~~~

观察两条路径：

1. 显式 Stop(2U) 超时，调用方得到 Status::timeout；随后 Stop(20U) 成功；
2. 第二个对象故意不调用 Stop()，析构时 callback registration 先注销，transport 再执行非阻塞 fallback。

预期输出：

~~~text
=== explicit shutdown ===
transport started
callback registered
transport callback endpoint released
callback unregistered
transport stop timed out
first Stop: timeout
transport stopped
second Stop: ok
transport destroyed
=== destructor fallback ===
transport started
callback registered
transport callback endpoint released
callback unregistered
transport destructor: non-blocking fallback disable
transport destroyed
~~~

主 Lab 的关键不是模拟真实 UART，而是验证显式可失败操作与析构兜底分层，以及 member destruction order。

### Exercise 01：修复 callback 与 transport 的析构顺序

源码：[examples/day-076/exercise-01.cpp](../examples/day-076/exercise-01.cpp)

~~~bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic examples/day-076/exercise-01.cpp -o day076-ex01
./day076-ex01
~~~

Starter 是完整、可编译、可运行的逻辑缺陷示例。它用外部 LifetimeProbe 记录 transport 与 callback 的生命周期，避免通过解引用已销毁对象来制造未定义行为。

当前预期输出：

~~~text
callback registered
transport constructed
leaving ModemService scope
transport destroyed
ERROR: callback teardown ran after transport destruction
order violation observed: true
~~~

**修复任务**：

1. 解释为什么析构顺序与 constructor initializer list 的书写顺序不是一回事；
2. 将 ModemService 成员声明顺序改为 FakeTransport transport_ 在前、CallbackRegistration callback_ 在后；
3. 同步调整 constructor initializer list，使其与成员声明顺序一致；
4. 重新编译运行，预期变为 callback unregistered while transport is alive，且 order violation observed: false；
5. 解释为什么 LifetimeProbe 必须比 ModemService 活得更久，以及真实异步 callback 还需要 in-flight drain，不能只依赖析构顺序。

## ⑨ 3 个常见坑（2 分钟）

1. **误把 destructor 当作可失败的 Close API**：析构没有返回值；超时、flush、网络关闭等应显式执行并检查 Status，析构只兜底。
2. **成员依赖顺序写反**：成员按声明顺序构造、逆序销毁；borrower 的析构若访问 owner，owner 必须先声明、后销毁。
3. **以为注销 callback 就代表没有 callback 正在运行**：unregister 只阻止未来注册/派发不等于 in-flight 已完成；必须定义同步、drain、timeout 和线程上下文。

## ⑩ 检查题（1 分钟）

### Q1 · 知识检查

Derived 对象通过 Base* 删除。若 Base 的析构函数不是 virtual，会有什么问题？std::unique_ptr<Base> 是否会自动帮你补上虚析构语义？

### Q2 · 代码检查

ModemService 中 CallbackRegistration 的析构会调用 Transport::Unregister()。成员声明应先写 transport_ 还是 callback_？请说明构造顺序与析构顺序。

### Q3 · Design Review：DMA / Modem teardown

设计一个 ModemService，拥有 UART transport、DMA lease 和 callback registration。回答：

- 哪些对象是 owner，哪些只是 borrow？
- 是否需要 Observer / shared_ptr，还是 RAII registration + Composition 足够？
- Stop(timeout) 失败后对象处于什么状态，谁负责重试或恢复？
- callback unregister 与 in-flight drain 如何区分？
- 哪些操作允许在 task context 阻塞，哪些绝不能在 ISR 或 destructor 中执行？
- 如何给析构路径定义最大工作量、内存上界与错误模型？

**判断标准**：先画出依赖和 teardown 顺序，再选择 C++ 机制；不要先决定使用哪个 Pattern。
