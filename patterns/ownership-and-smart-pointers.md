# Design Patterns 下的 Ownership 与 Smart Pointers

> 设计模式解决“对象如何协作”，智能指针解决“对象由谁负责活着”。
>
> 在 C++ 中，这两个问题必须一起设计。

---

# 1. 为什么 C++ 设计模式必须讨论指针

在 Java / C# 的经典模式图中，经常只看到：

```text
A ----> B
```

但在 C++ 中，这条箭头远远不够。

还必须明确：

```text
A owns B ?
A borrows B ?
B can be null ?
B can outlive A ?
A transfers B ?
A shares B ?
```

因此 C++ 中最重要的不是“用哪个智能指针”，而是先回答：

> **对象关系的所有权语义是什么？**

智能指针只是把这个语义写进类型系统。

---

# 2. 四种最常见关系

## 2.1 Required Borrow

调用者必须提供对象，但当前对象不拥有它。

优先：

```cpp
T&
```

例如：

```cpp
class ModemSession {
 public:
  explicit ModemSession(ITransport& transport)
      : transport_(transport) {}

 private:
  ITransport& transport_;
};
```

语义：

```text
ModemSession borrows Transport
Transport 必须比 ModemSession 活得更久
```

---

## 2.2 Optional Borrow

依赖可以不存在，但仍不拥有。

常见：

```cpp
T*
```

例如：

```cpp
class Driver {
 public:
  explicit Driver(ILogger* logger)
      : logger_(logger) {}

 private:
  ILogger* logger_;  // nullable, non-owning
};
```

必须明确：

```text
nullptr = logging disabled
```

裸指针并不等于“不安全”。

如果它明确表示 non-owning optional reference，就是合理用途。

---

## 2.3 Exclusive Ownership

一个对象独占负责另一个对象生命周期。

使用：

```cpp
std::unique_ptr<T>
```

例如 Factory：

```cpp
std::unique_ptr<ITransport> CreateTransport();
```

语义：

```text
caller becomes owner
```

`unique_ptr` 应该是动态 ownership 的默认选择。

---

## 2.4 Shared Ownership

多个对象共同决定某个对象何时销毁。

使用：

```cpp
std::shared_ptr<T>
```

这不是：

```text
“我不知道谁拥有，所以大家一起拥有”
```

而应该是：

```text
业务模型本身确实存在多个共同 owner
```

例如：

```text
一个异步 Session
同时被 operation A / B / C 持有
最后一个 operation 完成后 Session 才能销毁
```

这类场景 shared ownership 才有明确意义。

---

# 3. weak_ptr 的真实作用

`weak_ptr` 不拥有对象。

它解决的问题是：

```text
我需要观察一个 shared-owned object
但不应该延长它生命周期
```

例如 Observer：

```cpp
std::vector<std::weak_ptr<IObserver>> observers_;
```

通知：

```cpp
for (auto& weak_observer : observers_) {
  if (auto observer = weak_observer.lock()) {
    observer->OnEvent();
  }
}
```

同时避免：

```text
Publisher → Observer → Publisher
```

形成 `shared_ptr` cycle。

---

# 4. 智能指针不是“更现代的裸指针”

不要机械转换：

```cpp
T*
```

变成：

```cpp
std::shared_ptr<T>
```

这实际上修改了系统的生命周期模型。

正确顺序：

```text
先画 ownership
    ↓
再选择类型
```

常用决策：

| 语义 | C++ 表达 |
|---|---|
| 值 | `T` |
| 必须存在的借用 | `T&` |
| 可空借用 | `T*` |
| 独占 owner | `std::unique_ptr<T>` |
| 共享 owner | `std::shared_ptr<T>` |
| 不延长共享对象生命周期的观察者 | `std::weak_ptr<T>` |

---

# 5. Strategy Pattern 中怎么用指针

## Borrowed Strategy

如果策略由外部长期管理：

```cpp
class Sender {
 public:
  explicit Sender(IRetryStrategy& strategy)
      : strategy_(strategy) {}

 private:
  IRetryStrategy& strategy_;
};
```

适合：

- static object graph；
- stack/static allocation；
- Embedded firmware；
- strategy 生命周期明确。

## Owned Strategy

如果 Sender 独占策略：

```cpp
class Sender {
 public:
  explicit Sender(std::unique_ptr<IRetryStrategy> strategy)
      : strategy_(std::move(strategy)) {}

 private:
  std::unique_ptr<IRetryStrategy> strategy_;
};
```

适合 runtime factory/config creation。

## 不推荐默认 shared_ptr

如果不存在真实 shared ownership：

```cpp
std::shared_ptr<IRetryStrategy>
```

只会增加：

- ref count；
- 生命周期复杂度；
- atomic cost（实现相关）；
- reasoning cost。

---

# 6. Factory Pattern 中怎么用指针

Factory 是 `unique_ptr` 最经典的使用场景。

```cpp
std::unique_ptr<ITransport> CreateTransport(
    const TransportConfig& config);
```

它明确表达：

```text
Factory 创建
   ↓
ownership transfer
   ↓
Caller 拥有
```

如果对象不需要动态多态，也可以直接返回值：

```cpp
Transport CreateTransport();
```

优先级通常是：

```text
Value
↓
unique_ptr
↓
shared_ptr（只有真实共享 ownership 才用）
```

---

# 7. Abstract Factory 中的 ownership

```cpp
class IPlatformFactory {
 public:
  virtual ~IPlatformFactory() = default;

  virtual std::unique_ptr<ITransport> CreateTransport() = 0;
  virtual std::unique_ptr<ITimer> CreateTimer() = 0;
};
```

此时 factory 本身通常不保留创建对象的 ownership。

但如果产品对象必须共享某个底层 service：

```text
Transport ─┐
           ├──> EventLoop
Timer ─────┘
```

不要直接得出：

```text
EventLoop 一定 shared_ptr
```

更常见的静态系统可以：

```cpp
EventLoop&
```

由 Application Root 管理所有 lifetime。

---

# 8. Adapter Pattern 中怎么用指针

Adapter 经常只是 borrow 被适配对象：

```cpp
class VendorUartAdapter final : public ITransport {
 public:
  explicit VendorUartAdapter(VendorUart& uart)
      : uart_(uart) {}

 private:
  VendorUart& uart_;
};
```

关系：

```text
Adapter borrows Adaptee
```

如果 Adapter 负责创建和销毁底层对象，则可拥有：

```cpp
std::unique_ptr<VendorUart>
```

不要只因为 Adapter “包了一层”就默认 owns。

---

# 9. Decorator Pattern 中怎么用指针

Decorator 有两种典型 ownership 模式。

## Borrowing Decorator

```cpp
class TracingTransport final : public ITransport {
 public:
  explicit TracingTransport(ITransport& inner)
      : inner_(inner) {}

 private:
  ITransport& inner_;
};
```

适合固定 object graph：

```text
main()
 ├── UartTransport
 ├── TracingTransport(uart)
 └── ModemSession(tracing)
```

无 heap，非常适合 Embedded。

## Owning Decorator

```cpp
class TracingTransport final : public ITransport {
 public:
  explicit TracingTransport(std::unique_ptr<ITransport> inner)
      : inner_(std::move(inner)) {}

 private:
  std::unique_ptr<ITransport> inner_;
};
```

可以动态拼接：

```text
Retry
  owns
Tracing
  owns
UART
```

这是一个明确的 ownership chain。

---

# 10. Proxy Pattern 中怎么用指针

Proxy 不代表固定 ownership。

### Proxy borrows remote/service client

```cpp
class SensorProxy {
 public:
  explicit SensorProxy(IRpcClient& client)
      : client_(client) {}

 private:
  IRpcClient& client_;
};
```

### Proxy owns implementation

```cpp
std::unique_ptr<IBackend>
```

### Async Proxy

如果 operation 必须保证 proxy/session 在 callback 前一直活着，才可能出现：

```cpp
std::shared_ptr<Session>
```

此时 shared ownership 来自**异步生命周期**，不是 Proxy 模式本身。

---

# 11. Observer Pattern 是生命周期高风险区

Observer 的典型错误：

```cpp
class Publisher {
 private:
  std::vector<IObserver*> observers_;
};
```

它不一定错。

但必须保证：

```text
Observer unregister before destruction
```

常用方案有三类。

## 方案 A：严格 borrow + registration token

```text
Publisher 不拥有 Observer
Observer 析构前必须 unsubscribe
```

优点：

- 无 ref count；
- 无 shared ownership；
- deterministic。

适合 Embedded。

## 方案 B：weak_ptr observer

前提：Observer 本来就存在 shared ownership。

```cpp
std::weak_ptr<IObserver>
```

Publisher 不延长其生命周期。

## 方案 C：callback token

注册 lambda：

```cpp
Subscription Subscribe(Callback callback);
```

`Subscription` 使用 RAII，在析构时自动 unregister。

这通常比暴露 Observer 指针更现代。

---

# 12. Chain of Responsibility 中怎么用指针

动态链：

```cpp
class Handler {
 public:
  void SetNext(std::unique_ptr<Handler> next) {
    next_ = std::move(next);
  }

 private:
  std::unique_ptr<Handler> next_;
};
```

形成：

```text
A owns B owns C owns D
```

销毁方向天然清晰。

Embedded 更推荐固定拓扑：

```cpp
Handler& next_;
```

或者：

```cpp
std::array<Handler*, N>
```

避免运行时 heap allocation。

---

# 13. Iterator 不应该拥有 Container

通常：

```text
Container owns data
Iterator borrows container/data
```

因此 iterator 内部常见的是：

```cpp
T*
```

而不是：

```cpp
std::shared_ptr<Container>
```

Iterator 的生命周期契约通常是：

> container / underlying storage 必须仍然有效。

这也是 iterator invalidation 的本质。

---

# 14. Singleton 与智能指针

Singleton 通常根本不需要智能指针。

推荐形式：

```cpp
Logger& Logger::Instance() {
  static Logger logger;
  return logger;
}
```

不要为了 Singleton 写：

```cpp
static std::shared_ptr<Logger> instance;
```

除非生命周期模型真的需要它。

Singleton 已经隐含：

```text
process lifetime
```

再加入 shared ownership 通常只会增加复杂度。

---

# 15. PImpl：unique_ptr 的另一个经典场景

PImpl 严格说不属于 Chapter 33 的模式清单，但在 C++ 稳定接口设计中非常重要。

```cpp
class Modem {
 public:
  Modem();
  ~Modem();

 private:
  class Impl;
  std::unique_ptr<Impl> impl_;
};
```

语义非常自然：

```text
Modem exclusively owns Impl
```

同时：

- public header 不暴露实现；
- 降低编译依赖；
- ABI 边界更稳定。

---

# 16. RAII：所有模式的生命周期底座

设计模式经常描述：

```text
register
lock
open
subscribe
start
```

真正专业的 C++ 还必须回答：

```text
什么时候 unregister？
什么时候 unlock？
什么时候 close？
什么时候 unsubscribe？
什么时候 stop？
```

优先让对象析构承担 cleanup：

```text
Constructor / Acquire
        ↓
Object Lifetime
        ↓
Destructor / Release
```

这就是 RAII。

典型：

```cpp
std::unique_ptr
std::lock_guard
std::jthread
fstream
SubscriptionToken
SessionGuard
```

因此：

> **设计模式决定对象协作结构，RAII 决定这些结构是否有可靠生命周期。**

---

# 17. shared_ptr 常见误区

## 误区 1：多态必须 shared_ptr

错误。

```cpp
ITransport&
```

同样支持 virtual dispatch。

## 误区 2：异步必须 shared_ptr

错误。

只有当 operation 确实需要延长 object lifetime 时才需要 shared ownership。

也可以使用：

- owner task；
- static lifetime；
- cancellation + join；
- externally guaranteed lifetime。

## 误区 3：shared_ptr 自动线程安全

`shared_ptr` 的引用计数管理具有相应线程安全保证，但：

```text
它不会自动保护 T 的内部 mutable state
```

## 误区 4：shared_ptr 可以解决 ownership 不清晰

恰恰相反。

如果不知道谁应该 owner，先修复设计，不要用 shared ownership 掩盖问题。

---

# 18. cyclic ownership

危险：

```text
A shared_ptr → B
B shared_ptr → A
```

reference count 永远不归零。

解决：

```text
一个方向 owner
另一个方向 observer
```

例如：

```text
Parent shared_ptr → Child
Child weak_ptr   → Parent
```

但再次强调：

> 如果系统并不需要 shared ownership，最好的解决方案可能是根本不用 shared_ptr。

---

# 19. Embedded C++ 推荐 ownership 顺序

在 MCU / RTOS / Driver 代码里，推荐优先级通常是：

```text
Value / static object
        ↓
Reference borrow
        ↓
Raw pointer optional borrow
        ↓
unique_ptr（需要动态 ownership 时）
        ↓
shared_ptr（真实共享生命周期时）
```

原因：

- 生命周期更确定；
- RAM/heap 更可控；
- 实时行为更可预测；
- 调试更简单；
- failure mode 更少。

---

# 20. Application Root：最值得掌握的 ownership 技巧

很多系统根本不需要复杂智能指针。

可以在 Application Root 一次性构建对象图：

```cpp
int main() {
  UartTransport uart{115200U};
  TracingTransport traced{uart};
  RetryPolicy retry;
  ModemSession modem{traced, retry};

  Run(modem);
}
```

这里 ownership 非常简单：

```text
main owns everything by value
components borrow dependencies by reference
```

这是 Embedded C++ 最值得优先采用的方式之一。

---

# 21. Pattern × Ownership 快速表

| Pattern | 常见 ownership |
|---|---|
| Strategy | `T&` / value / `unique_ptr<T>` |
| Factory Method | return value / `unique_ptr<T>` |
| Abstract Factory | `unique_ptr<T>` 最常见 |
| Adapter | borrow `T&` 或 own `unique_ptr<T>` |
| Proxy | 取决于 backend 生命周期 |
| Iterator | non-owning pointer/reference |
| Observer | non-owning + unsubscribe；必要时 `weak_ptr` |
| Decorator | borrow `T&` 或 own `unique_ptr<T>` |
| Chain | fixed borrow chain / `unique_ptr` ownership chain |
| Singleton | function-local static，通常不用智能指针 |

---

# 22. Code Review Checklist

看到智能指针时，不要只问“会不会内存泄漏”。

应该问：

## Ownership

- [ ] 为什么这里需要动态 ownership？
- [ ] 为什么不是 value？
- [ ] 为什么不是 reference borrow？
- [ ] `shared_ptr` 的 shared owners 是谁？
- [ ] ownership transfer 是否明确？

## Lifetime

- [ ] callback 执行时对象是否还活着？
- [ ] Observer 是否可能 dangling？
- [ ] 是否存在 cycle？
- [ ] destructor 是否执行必要 cleanup？

## Realtime

- [ ] 是否在实时路径 `make_shared/make_unique`？
- [ ] 是否存在不可控 heap fragmentation？
- [ ] shared ref-count 操作是否位于热点路径？

## API

- [ ] API 参数用智能指针是否真的表示 ownership transfer？
- [ ] 如果只是 borrow，为什么不用 `T&` / `T*`？
- [ ] 返回 `shared_ptr` 是否把生命周期决策强加给调用者？

---

# 23. 一句话原则

```text
T              = 我就是这个对象
T&             = 我借用，而且必须存在
T*             = 我借用，而且可以不存在
unique_ptr<T>  = 我拥有它
shared_ptr<T>  = 我们共同拥有它
weak_ptr<T>    = 我观察共享对象，但不让它多活
```

最重要的一句：

> **先设计 lifetime，再选择 pointer；不要先选 smart pointer，再让生命周期去适配它。**
