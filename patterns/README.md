# C++ Design Patterns · 工程化学习指南

> 面向已有 C / Embedded 背景的 C++ 开发者。
>
> 核心观点：**设计模式不是“类图模板”，而是前人总结出来的一批建立稳定边界、隔离变化、管理依赖的方法。**

本专题与《Professional C++, Sixth Edition》Chapter 33 · **Applying Design Patterns** 对齐，但不替代后续 Day 课程；它作为提前建立全局认知的专题索引。

## 书籍案例与可运行示例

- [分类索引、来源与运行方法](book-examples.md)：依据三本 C++ 书籍整理，覆盖 GoF 23 种模式、9项补充与1个定价变体，共33个独立 C++17 程序。
- [创建型](01-creational-patterns.md) · [结构型](02-structural-patterns.md) · [行为型](03-behavioral-patterns.md) · [C++ 补充惯用法](04-cpp-techniques.md) · [装饰器定价案例](05-decorator-pricing.md)。

每项包含书中案例及改写说明、使用场景、使用原因、好处、取舍与完整源码。运行 `python3 tools/check-examples.py --patterns-only` 验证本专题；默认的全仓库示例检查也会包含这些源码。

---

## 1. 先区分：Design Technique vs Design Pattern

《Professional C++》把两者区分为：

- **Design Technique**：更偏 C++ 语言本身的技巧，例如 RAII、mixin、double dispatch 等；
- **Design Pattern**：更通用的面向对象组织方式，不依赖某一种语言。

因此：

```text
Technique 更像：
“C++ 这个语言怎么更好地表达？”

Pattern 更像：
“系统中哪里应该形成稳定边界？”
```

例如：

```text
Strategy Pattern
        ↓
定义“可替换算法”这一稳定边界
        ↓
C++ 可以用多种 Technique 实现：
virtual interface / template / function object / lambda / std::function
```

**模式是设计意图，C++ 特性只是实现工具。**

---

# 2. 设计模式真正解决什么

设计模式通常在处理下面四类变化：

```text
对象怎么创建？
    ↓
Creational Boundary

对象怎么连接？
    ↓
Structural Boundary

对象怎么协作？
    ↓
Behavioral Boundary

对象生命周期谁负责？
    ↓
Ownership Boundary
```

可以把模式统一理解成：

```text
变化源
  ↓
稳定接口 / 稳定协议
  ↓
可替换实现
```

例如一个 Modem 系统：

```text
AT Engine
   ↓
ITransport                  ← Stable Boundary
   ↓
UART / USB / Fake / TCP     ← Variation
```

这就是模式思维最核心的价值。

---

# 3. 《Professional C++》Chapter 33 模式地图

Chapter 33 重点讲解以下模式：

| 模式 | 类型 | 建立的稳定边界 | C++ 常见实现 |
|---|---|---|---|
| Strategy | Behavioral | 算法/策略 | virtual、template、lambda、function object |
| Abstract Factory | Creational | 产品族创建 | abstract interface + `unique_ptr` |
| Factory Method | Creational | 子类决定单个对象创建 | virtual factory；静态工厂作为单独创建惯用法 |
| Adapter | Structural | 不兼容接口转换 | composition / wrapper |
| Proxy | Structural | 访问控制 | wrapper + lazy/remote/access policy |
| Iterator | Behavioral | 遍历协议 | iterator / range |
| Observer | Behavioral | 事件通知 | callback / observer list / signal |
| Decorator | Structural | 横向能力叠加 | composition + same interface |
| Chain of Responsibility | Behavioral | 请求处理链 | handler chain |
| Singleton | Creational-ish | 全局唯一实例 | function-local static；谨慎使用 |

如果只记模式名字，价值很低。

建议始终用下面的方式理解：

```text
问题是什么？
变化在哪里？
稳定边界在哪里？
谁拥有谁？
什么时候不该用？
```

---

# 4. Strategy Pattern

## 4.1 解决的问题

同一个动作存在多个算法，而且算法需要替换：

```text
RetryStrategy
├── FixedRetry
├── ExponentialBackoff
└── NoRetry
```

稳定的是：

```text
Retry Decision
```

变化的是：

```text
具体算法
```

## 4.2 运行时 Strategy

```cpp
class IRetryStrategy {
public:
  virtual ~IRetryStrategy() = default;

  virtual bool ShouldRetry(std::size_t attempt) const = 0;
};
```

调用者只依赖：

```cpp
IRetryStrategy&
```

适合：

- 策略运行时切换；
- 配置驱动；
- host test / fake；
- 插件式扩展。

## 4.3 编译期 Strategy

```cpp
template <typename RetryPolicy>
class Sender {
public:
  explicit Sender(RetryPolicy policy) : policy_(std::move(policy)) {}

private:
  RetryPolicy policy_;
};
```

适合：

- 类型编译期已知；
- 热路径希望内联；
- 不需要 runtime replacement。

### Embedded 判断

不要问：

> virtual 和 template 哪个更高级？

应该问：

> 这个变化发生在编译期还是运行期？

---

# 5. Abstract Factory Pattern

## 5.1 解决的问题

需要创建“一组互相匹配的对象”。

例如：

```text
PlatformFactory
├── LinuxPlatformFactory
└── RtosPlatformFactory

create transport
create timer
create logger
```

稳定边界：

```text
“创建某一平台的一整套组件”
```

## 5.2 C++ 所有权

Factory 创建出来的对象通常应该清晰表达 ownership：

```cpp
class IPlatformFactory {
public:
  virtual ~IPlatformFactory() = default;

  virtual std::unique_ptr<ITransport> CreateTransport() = 0;
};
```

默认优先：

```text
unique_ptr
```

因为创建出来的对象通常有一个明确 owner。

不要因为使用多态就默认：

```cpp
std::shared_ptr<ITransport>
```

---

# 6. Factory Method Pattern

Factory Method 解决的是：

> **谁决定创建哪个具体对象？**

例如：

```cpp
class Session {
protected:
  virtual std::unique_ptr<ITransport> CreateTransport() = 0;
};
```

派生类决定：

```text
UART
USB
Fake
```

现代 C++ 项目里，经常不必机械使用继承式 Factory Method。

一个显式 factory function 往往更简单：

```cpp
std::unique_ptr<ITransport> CreateTransport(TransportType type, const TransportConfig& config);
```

设计模式的目标是创建边界清楚，不是强迫使用某张 GoF 类图。

---

# 7. Adapter Pattern

Adapter 的核心：

```text
Existing API
    ↓
Adapter
    ↓
Expected Interface
```

例如旧 C UART API：

```c
int uart_write(const uint8_t* data, size_t len, uint32_t timeout_ms);
```

新 C++ 上层希望：

```cpp
class ITransport {
public:
  virtual Status Write(std::span<const std::uint8_t> data, std::chrono::milliseconds timeout) = 0;
};
```

可以写：

```cpp
class UartAdapter final : public ITransport {
public:
  Status Write(std::span<const std::uint8_t> data, std::chrono::milliseconds timeout) override;
};
```

Adapter 是嵌入式 C → C++ 迁移中非常重要的模式。

特别适合隔离：

- BSP；
- HAL；
- C library；
- vendor SDK；
- POSIX API；
- RTOS API。

---

# 8. Proxy Pattern

Proxy 与 Adapter 很容易混淆。

```text
Adapter：改变接口
Proxy：保持接口，控制访问
```

例如：

```text
ITransport
   ↑
RemoteTransportProxy
   ↓
IPC / RPC / shared memory
```

Proxy 可以承担：

- lazy initialization；
- remote access；
- access control；
- caching；
- synchronization；
- resource throttling。

## Embedded 示例

```text
Sensor API
   ↓
SensorProxy
   ↓
IPC
   ↓
Sensor Service Task
```

上层看到的是同步 API，真正硬件访问在另一任务完成。

注意：Proxy 很容易隐藏 blocking / latency。

因此接口必须显式 timeout 或 async contract。

---

# 9. Iterator Pattern

Iterator 建立的是：

> **容器内部结构与遍历算法之间的边界。**

调用者只看到：

```text
begin
end
++
*
```

而不需要知道：

```text
array
linked list
tree
ring buffer
```

现代 C++ 里 Iterator 已经深度进入标准库。

更进一步是：

```text
Iterator → Range
```

例如：

```cpp
for (const auto& packet : packets) {
  Process(packet);
}
```

算法与数据结构之间因此形成稳定遍历协议。

### Embedded 提示

自定义 RingBuffer 如果实现 iterator/range，可以直接复用标准算法，但要评估：

- iterator invalidation；
- ISR/concurrency；
- boundary；
- 是否存在隐式拷贝。

---

# 10. Observer Pattern

Observer 解决：

```text
一个对象状态变化
        ↓
通知多个订阅者
```

例如：

```text
ModemStateMachine
  ├── UI
  ├── Logger
  └── Telemetry
```

核心边界：

```text
Publisher 不应该知道 Observer 的具体业务。
```

## 最大风险不是 callback，而是生命周期

危险：

```cpp
std::vector<IObserver*> observers_;
```

如果 observer 已销毁：

```text
dangling pointer
```

因此 Observer 必须明确：

- 谁注册；
- 谁注销；
- publisher 是否拥有 observer；
- callback 是否允许重入；
- callback 是否跨线程；
- notification 是否同步。

共享生命周期场景可考虑：

```cpp
std::weak_ptr<IObserver>
```

但如果系统本来没有共享 ownership，不应为了 Observer 强行引入 `shared_ptr`。

---

# 11. Decorator Pattern

Decorator 建立：

```text
同一个接口
   ↓
不断叠加能力
```

例如：

```text
ITransport
   ↑
TracingTransport
   ↑
RetryTransport
   ↑
MetricsTransport
   ↑
UartTransport
```

更准确地说，每个 Decorator：

```text
is-a ITransport
has-a ITransport
```

例如：

```cpp
class TracingTransport final : public ITransport {
public:
  explicit TracingTransport(ITransport& inner) : inner_(inner) {}

private:
  ITransport& inner_;
};
```

Decorator 很适合：

- tracing；
- retry；
- metrics；
- validation；
- compression；
- encryption。

这比制造：

```text
LoggedRetriedEncryptedUartTransport
```

这种组合爆炸要健康得多。

---

# 12. Chain of Responsibility

核心结构：

```text
Request
  ↓
Handler A
  ↓ not handled
Handler B
  ↓
Handler C
```

每个 handler 只关心自己能处理的情况。

Embedded 很常见：

```text
AT response
   ↓
URC handler
   ↓
Command response handler
   ↓
Generic error handler
```

或者：

```text
Packet
 ↓
CRC check
 ↓
Protocol version
 ↓
Command dispatch
```

需要警惕：

- 链过长；
- 隐式顺序依赖；
- handler 吞掉错误；
- 动态分配节点；
- 无界处理时间。

实时系统最好使用固定容量或编译期已知的 handler chain。

---

# 13. Singleton Pattern

Singleton 是最容易被滥用的模式之一。

它试图保证：

```text
全系统只有一个实例
+
全局访问点
```

现代 C++ 最简单的实现：

```cpp
class Logger {
public:
  static Logger& Instance() {
    static Logger instance;
    return instance;
  }

private:
  Logger() = default;
};
```

但核心问题并不是“怎么写 Singleton”。

而是：

> 为什么这个对象必须成为全局依赖？

Singleton 容易导致：

- 隐藏依赖；
- 单元测试困难；
- 初始化顺序复杂；
- 全局可变状态；
- 并发竞争；
- 无法替换实现。

因此在本仓库的 Embedded C++ 规范下：

```text
优先显式 dependency injection
而不是 Singleton
```

只有真正的 process-wide stateless/service identity 才应认真考虑 Singleton。

---

# 14. Pattern 与智能指针

这是 C++ 与 Java/C# 最大的工程差别之一。

设计模式图通常只画：

```text
A ---> B
```

但 C++ 必须继续问：

```text
A owns B ?
A borrows B ?
B optional ?
B lifetime ?
```

因此每次使用模式都应补一张 Ownership 图。

例如 Decorator：

### Borrowing decorator

```cpp
ITransport& inner_;
```

表示：

```text
Decorator 不拥有 inner
inner 必须活得更久
```

### Owning decorator

```cpp
std::unique_ptr<ITransport> inner_;
```

表示：

```text
Decorator 独占拥有下一层
```

进一步说明见：

- [Ownership & Smart Pointers in Design Patterns](ownership-and-smart-pointers.md)：包含三问决策流程、独占/借用/异步关系的 UML 类图与时序图。
- [可运行指针选择实验](../examples/pointer-choice.cpp)：验证所有权转移、借用、强捕获与弱捕获的销毁时机。

---

# 15. Pattern 与现代 C++ 的关系

经典 GoF 模式产生于 C++ 早期时代。

现代 C++ 的一些能力会让模式实现明显简化：

| 经典需求 | 现代 C++ 工具 |
|---|---|
| Strategy | lambda / template / concept / `std::function` |
| Iterator | STL iterator / range |
| RAII resource wrapper | destructor / move semantics |
| Callback | lambda / callable |
| Factory ownership | `std::unique_ptr` |
| Shared observer lifetime | `std::weak_ptr` |
| Decorator | composition + move-only owner |
| Static strategy | concepts / templates |
| Type-erased behavior | `std::function` / custom type erasure |

因此：

> **现代 C++ 不是“不需要设计模式”，而是很多模式可以更直接、更类型安全地表达。**

---

# 16. Pattern 与 SOLID

模式解决具体结构问题，SOLID 更像模式背后的设计压力。

```text
SRP
一个模块只有一个主要变化原因

OCP
增加实现时尽量不修改稳定调用者

LSP
派生类型必须真正可替换基类

ISP
接口保持小、按能力拆分

DIP
高层依赖 abstraction，而不是具体平台实现
```

对应关系：

| 原则 | 常见模式 |
|---|---|
| OCP | Strategy / Decorator / Observer |
| LSP | Strategy / Factory / Adapter contract |
| ISP | Adapter / Proxy / Observer interface |
| DIP | Factory / Strategy / Adapter |
| SRP | Decorator / Chain / Adapter |

模式不是为了“满足 SOLID”，而是这些原则能帮助判断一个模式有没有被正确使用。

---

# 17. Embedded C++ 模式选择表

| 场景 | 首选思路 | 备注 |
|---|---|---|
| UART / USB / TCP 可替换 | Strategy / Adapter | runtime boundary |
| BSP C API 封装 | Adapter | 隔离 vendor SDK |
| trace/retry/metrics | Decorator | 避免继承树爆炸 |
| 多级消息处理 | Chain of Responsibility | 控制链长与最坏时延 |
| 状态变化通知 | Observer | 生命周期最重要 |
| 创建平台组件 | Factory | 默认 `unique_ptr` |
| 编译期固定算法 | template Strategy | 零 runtime dispatch |
| 跨进程服务访问 | Proxy | 显式 timeout/error |
| ring buffer 遍历 | Iterator / Range | 注意并发/失效 |
| 全局服务 | 先 DI，再考虑 Singleton | 避免隐式 global state |

---

# 18. 不要“模式驱动开发”

错误思维：

```text
我今天要用一个 Factory
我今天要用一个 Observer
```

正确思维：

```text
哪里发生变化？
        ↓
变化是否需要隔离？
        ↓
边界是什么？
        ↓
ownership 是什么？
        ↓
是否已有简单语言机制能解决？
        ↓
如果结构反复出现，再给它模式名称
```

模式应该是**结果**，不是目标。

---

# 19. Code Review：设计模式检查清单

看到一个 Pattern 时，至少检查：

## Boundary

- [ ] 它隔离的变化是什么？
- [ ] 稳定接口是否真的稳定？
- [ ] 是否只是为了“套模式”？

## Ownership

- [ ] 谁拥有对象？
- [ ] 谁只是 borrow？
- [ ] 是否错误使用 `shared_ptr`？
- [ ] callback / observer 是否可能 dangling？

## Runtime

- [ ] 是否引入 heap allocation？
- [ ] 是否在实时路径分配？
- [ ] virtual dispatch 是否真的需要 runtime replacement？
- [ ] handler chain 是否有最坏执行时间？

## API

- [ ] timeout 是否显式？
- [ ] error model 是否统一？
- [ ] buffer 边界是否类型化？
- [ ] interface 是否过宽？

## Testing

- [ ] 是否容易注入 Fake？
- [ ] 是否能测试 failure path？
- [ ] ownership/lifetime 是否可测试？

---

# 20. 推荐学习顺序

对于 C / Embedded 背景，不建议按 GoF 23 个模式逐个背。

推荐顺序：

```text
1 Strategy
   ↓
2 Adapter
   ↓
3 Factory
   ↓
4 Decorator
   ↓
5 Observer
   ↓
6 Chain of Responsibility
   ↓
7 Proxy
   ↓
8 Iterator / Range
   ↓
9 Singleton（重点学习为什么少用）
```

然后再回头学习：

```text
RAII
PImpl
Type Erasure
CRTP
Policy-based Design
State Machine
Command
Builder
Bridge
```

这些不全部属于 Chapter 33 的清单，但对现代 C++ 工程同样重要。

---

# 21. 和本仓库其他内容的关系

```text
Chapter 5
Class Relationships
        ↓
Chapter 6
Reusable Boundaries
        ↓
Chapter 7
Ownership / Smart Pointer
        ↓
Chapter 10
Inheritance
        ↓
Chapter 12 / 26
Templates / Static Polymorphism
        ↓
Chapter 19
Callable / Lambda
        ↓
Chapter 27
Concurrency
        ↓
Chapter 32
Design Techniques / Frameworks
        ↓
Chapter 33
Design Patterns
```

设计模式并不是独立章节，而是前面所有 C++ 能力最终组合起来的架构表达。

建议配合阅读：

- [Embedded C++ Coding Guideline](../guidelines/embedded-cpp-guideline-notes.md)
- [Asio Framework Case Study](../frameworks/asio/)
- [16 周学习路线](../docs/learning-plan.md)

---

# 22. 一句话记忆

```text
Strategy   = 替换算法
Factory    = 隔离创建
Adapter    = 转换接口
Proxy      = 控制访问
Iterator   = 隔离遍历
Observer   = 解耦通知
Decorator  = 叠加能力
Chain      = 传递请求
Singleton  = 唯一实例，但优先考虑不用它
```

真正要记住的是：

> **模式的本质不是类图，而是让变化停在边界外，让稳定部分长期保持稳定。**

---

## 参考

- Marc Gregoire, *Professional C++, Sixth Edition*, Chapter 32–33.
- Erich Gamma, Richard Helm, Ralph Johnson, John Vlissides, *Design Patterns: Elements of Reusable Object-Oriented Software*.
