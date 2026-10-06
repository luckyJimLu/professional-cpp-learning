---
day: 40
week: 6
part: II
chapter: 5
chapter_title: Designing with Classes
title: Mixin Classes
duration: 60
status: published
date: 2026-10-06
topics:
  - mixin-classes
  - behavior-composition
  - templates
  - inheritance
  - embedded-design
guidelines:
  - keep-mixins-stateless-or-small
  - make-mixin-requirements-explicit
  - prefer-composition-when-runtime-substitution-is-needed
lab:
  path: examples/day-040/main.cpp
previous: 39
next: 41
---

# Day 40 · Mixin Classes：用小型可组合行为扩展类型

## ① 今日章节与建议阅读范围（5 分钟）

继续 Chapter 5 · **Designing with Classes**，沿教材顺序进入 **Mixin Classes**。

昨天讨论 Multiple Inheritance：多个 public base 只有在分别代表真实、独立的 is-a contract 时才合理。今天看另一种更受约束的继承用途：**mixin**。

阅读时重点关注：

- mixin 的目标是给类型加入一小块可复用行为，而不是建立领域分类树；
- mixin 通常不作为独立业务对象使用；
- 多个小 mixin 可以组合能力，但会增加编译期耦合；
- 如果能力需要运行时替换、独立 ownership 或复杂状态，composition 往往更合适；
- mixin 不应成为“为了少写几行代码就继承”的借口。

嵌入式映射：可以把轻量统计、计数或边界检查做成受控的编译期行为组合；UART driver、logger、RTOS queue 等有资源和生命周期的对象仍优先 composition。

---

## ② 昨日复习 3 问（5 分钟）

1. public 多继承什么时候能读成多个真实 is-a contract？
2. 为什么 `Modem : public UartDriver, public Logger` 通常比 composition 更差？
3. 两个 base 出现同名 `Reset()` 时，为什么不应只满足于写限定名消除二义性？

---

## ③ 核心概念（12 分钟）

### 1. Mixin 是“加入行为”，不是“建立分类”

一个简单 mixin 可以只提供一项正交能力：

```cpp
class TxCounterMixin {
 public:
  [[nodiscard]] std::size_t TxCount() const {
    return tx_count_;
  }

 protected:
  void RecordTx() {
    ++tx_count_;
  }

 private:
  std::size_t tx_count_{0};
};
```

concrete type 使用它：

```cpp
class UartTransport final : private TxCounterMixin {
 public:
  using TxCounterMixin::TxCount;

  Status Write(std::span<const std::uint8_t> data) {
    if (data.empty()) {
      return Status::kInvalidArgument;
    }
    RecordTx();
    return Status::kOk;
  }
};
```

这里 `UartTransport` 并不是业务意义上的 `TxCounterMixin`；继承只是受控地复用一小块行为。

### 2. Mixin 应小、正交、依赖少

适合 mixin 的候选能力通常具有这些特点：

```text
- 行为单一
- 状态很少或无状态
- 不拥有复杂资源
- 不需要独立运行时身份
- 不要求运行时替换
```

例如计数、轻量检查、编译期 instrumentation 比“完整 Logger/Driver/Queue”更像 mixin。

### 3. Template mixin 可以在编译期组合能力

```cpp
template <typename Derived>
class HealthCheckMixin {
 public:
  [[nodiscard]] bool Healthy() const {
    const auto& self = static_cast<const Derived&>(*this);
    return self.ErrorCount() == 0U;
  }
};
```

派生类提供约定接口：

```cpp
class Modem final : public HealthCheckMixin<Modem> {
 public:
  [[nodiscard]] std::size_t ErrorCount() const {
    return error_count_;
  }

 private:
  std::size_t error_count_{0};
};
```

这类 CRTP 风格可以避免 runtime virtual dispatch，但代价是要求在编译期满足隐含/显式 contract。

### 4. Mixin 与 runtime polymorphism 解决不同问题

```text
virtual interface:
  目标：运行时通过共同 contract 替换对象

mixin:
  目标：编译期给 concrete type 组合一小块行为

composition:
  目标：对象拥有/借用另一个对象并委托工作
```

不要因为 mixin 可以避免 virtual 就机械替换所有接口。

### 5. 嵌入式中要关注代码体积与可预测性

模板 mixin 可能为多个 concrete type 生成实例化代码。对于 MCU 项目，应配合 map file、size report 和 LTO 检查，而不是假设“模板一定零成本”。

---

## ④ C 写法 vs Modern C++（8 分钟）

### C：宏或 helper 函数注入重复行为

```c
#define RECORD_TX(counter) (++(counter))

struct uart_transport {
  unsigned int tx_count;
};
```

或者：

```c
static inline void record_tx(unsigned int* counter) {
  ++(*counter);
}
```

优点是直接；缺点是宏缺乏类型边界，状态与行为的关系主要靠约定。

### Modern C++：受控 mixin

```cpp
class TxCounterMixin {
 protected:
  void RecordTx() { ++tx_count_; }

 public:
  [[nodiscard]] std::size_t TxCount() const { return tx_count_; }

 private:
  std::size_t tx_count_{0};
};
```

然后由 concrete type 选择性暴露 API。

重点不是“C++ 写法更短”，而是：

> mixin 把一项正交行为封装在类型系统中，并限制可访问边界。

---

## ⑤ 今日编码规范（8 分钟）

### SHOULD：Mixin 保持无状态或小状态

错误写法：

```cpp
class LoggingMixin {
 protected:
  std::vector<std::string> logs_;
  FileHandle file_;
  Mutex mutex_;
};
```

它拥有复杂资源、动态内存和同步状态，更像独立对象。

推荐写法：

```cpp
class TxCounterMixin {
 protected:
  void RecordTx() { ++tx_count_; }

 private:
  std::size_t tx_count_{0};
};
```

### MUST：Mixin 对派生类的要求必须可读

错误写法：

```cpp
template <typename T>
class RetryMixin {
 public:
  void Retry() {
    static_cast<T*>(this)->DoSomethingMagic();
  }
};
```

推荐至少使用清晰命名，并在现代代码中用 concept/约束表达要求：

```cpp
template <typename T>
concept HasErrorCount = requires(const T& value) {
  { value.ErrorCount() } -> std::convertible_to<std::size_t>;
};
```

### SHOULD：需要运行时替换、ownership 或复杂资源时优先 composition

错误方向：

```cpp
class Modem : public LoggerMixin,
              public QueueMixin,
              public UartMixin {
};
```

推荐：

```cpp
class Modem {
 public:
  Modem(UartDriver& uart, ILogger& logger)
      : uart_(uart), logger_(logger) {}

 private:
  UartDriver& uart_;
  ILogger& logger_;
};
```

---

## ⑥ 可编译实验 / 练习（15 分钟）

实验文件：

```text
examples/day-040/main.cpp
```

实验使用一个小型 `TxCounterMixin` 给两个 concrete transport 加入发送计数能力，同时保留 `ITransport` 作为运行时 contract：

```text
ITransport <--------- UartTransport
                         |
                         +-- private TxCounterMixin

ITransport <--------- FakeTransport
                         |
                         +-- private TxCounterMixin
```

这样可以清楚看到：

- `ITransport` 负责 runtime substitution；
- `TxCounterMixin` 负责 compile-time behavior reuse；
- `ModemSession` 仍只借用 `ITransport&`；
- 没有 heap allocation；
- 阻塞发送仍显式携带 timeout。

编译：

```bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic \
  examples/day-040/main.cpp -o day040
./day040
```

### 修复违规代码

重构：

```cpp
class DriverMixin {
 protected:
  std::vector<std::uint8_t> rx_buffer_;
  Mutex mutex_;
  virtual int ReadHardware() = 0;
};

class Modem : public DriverMixin {
};
```

要求：

1. 把硬件资源和 buffer ownership 移入明确的 driver/component；
2. 如果只需要轻量统计，拆成独立小 mixin；
3. 实时路径避免无界动态分配；
4. blocking read 显式提供 timeout；
5. 说明哪些能力需要 runtime interface，哪些只需要 compile-time reuse。

---

## ⑦ 3 个常见坑（3 分钟）

1. **把 mixin 当成新的万能继承模式**  
   如果 mixin 开始拥有大量状态、线程、锁和资源，它已经偏离“小行为组合”。

2. **CRTP contract 隐藏在模板报错里**  
   使用清晰命名、concept 或静态断言让要求尽早暴露。

3. **假设模板组合一定没有成本**  
   嵌入式工程仍要检查 flash、RAM、实例化数量和实时路径。

---

## ⑧ 检查题（4 分钟）

### Q1

`ITransport` 与 `TxCounterMixin` 分别解决什么问题？为什么它们可以同时存在？

### Q2

什么时候应该把一个候选 mixin 改成 composition？

**答案要点：**

- `ITransport` 是运行时可替换 contract；`TxCounterMixin` 是编译期复用的小型正交行为；
- 当能力拥有复杂资源/ownership、需要独立生命周期、运行时替换、同步或大量状态时，composition 通常更清晰。

---

## 今日 Code Review 快检

- [ ] mixin 是否只承担一个可命名的小行为
- [ ] 是否无状态或只有小型、有界状态
- [ ] 是否隐藏了 heap / mutex / file / device ownership
- [ ] 对 Derived 的要求是否明确可读
- [ ] runtime substitution 是否仍由明确 interface 负责
- [ ] 实时路径是否避免无界动态分配
- [ ] blocking API 是否显式 timeout
- [ ] 是否检查模板实例化对 flash / RAM 的影响

---

## 下一步

Day 41 将继续严格依据 Chapter 5 后续教材顺序推进；生成前再次读取仓库和主教材定位，不预先硬编码下一主题。
