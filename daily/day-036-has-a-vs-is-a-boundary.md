---
day: 36
week: 6
part: II
chapter: 5
chapter_title: Designing with Classes
title: The Fine Line Between Has-a and Is-a
duration: 60
status: published
date: 2026-09-29
topics:
  - has-a
  - is-a
  - composition
  - inheritance
  - delegation
guidelines:
  - prefer-composition-when-ambiguous
  - small-interface
  - explicit-ownership
lab:
  path: examples/day-036/main.cpp
previous: 35
next: 37
---

# Day 36 · Has-a 与 Is-a 的边界：优先用关系表达真实设计

## ① 今日章节与建议阅读范围（5 分钟）

继续 Chapter 5 · **Designing with Classes**，对应主教材 **The Fine Line Between Has-a and Is-a**。

今天只解决一个设计问题：

> 当两个类既可以用继承表达，也可以用组合表达时，怎样判断哪种关系更准确、更容易维护？

本章在这一节强调：同一个设计问题可能有多种可行方案；当 has-a 与 is-a 都说得通时，应谨慎评估继承是否真的表达稳定的替换关系。

重点关注：

- has-a：一个对象包含/使用另一个对象；
- is-a：一个类型真正属于另一个抽象类型；
- delegation：组合后把部分工作委托给成员；
- inheritance：不是“复用代码”的默认工具；
- 设计选择应服务于未来变化。

---

## ② 昨日复习 3 问（5 分钟）

1. object slicing 为什么会让 dynamic type 丢失？
2. `ITransport&` 与 `std::unique_ptr<ITransport>` 分别表达 borrow 还是 ownership？
3. 多态对象为什么不能因为“用了 virtual”就默认改成 `shared_ptr`？

---

## ③ 核心概念（12 分钟）

### Has-a：组合表达“我使用它”

```cpp
class ModemSession {
 public:
  explicit ModemSession(ITransport& transport)
      : transport_(transport) {}

 private:
  ITransport& transport_;
};
```

这里的语义是：

```text
ModemSession uses-a / has-a ITransport
```

ModemSession 并不是 Transport 的一种。

### Is-a：继承表达“我就是这种抽象”

```cpp
class UartTransport final : public ITransport {
 public:
  Status Write(std::span<const std::uint8_t> data,
               std::chrono::milliseconds timeout) override;
};
```

这里的语义是：

```text
UartTransport is-a ITransport
```

### 边界判断：先问“能否替换”

不要先问：

> 继承能不能让我少写几行代码？

应该先问：

> 任何需要 ITransport 的地方，UartTransport 是否都能自然满足同一个 contract？

如果答案只是“它内部刚好用到了 UART”，那更可能是 has-a。

### 组合 + delegation

组合并不意味着把所有实现复制一遍。

```cpp
class BufferedTransport final : public ITransport {
 public:
  explicit BufferedTransport(ITransport& inner)
      : inner_(inner) {}

  Status Write(std::span<const std::uint8_t> data,
               std::chrono::milliseconds timeout) override {
    return inner_.Write(data, timeout);
  }

 private:
  ITransport& inner_;
};
```

这里 `BufferedTransport` 对外仍是 ITransport，但内部对另一个 transport 使用 has-a/delegation。

---

## ④ C 写法 vs Modern C++（8 分钟）

### C：结构体嵌套 + 函数

```c
struct uart {
  unsigned int baudrate_bps;
};

struct modem {
  struct uart* uart;
};
```

关系是明确的组合/借用，但 contract 容易散落在函数命名中。

### Modern C++：用类型区分关系

```cpp
class ITransport {
 public:
  virtual ~ITransport() = default;
  virtual Status Write(std::span<const std::uint8_t> data,
                       std::chrono::milliseconds timeout) = 0;
};

class UartTransport final : public ITransport {
  // is-a
};

class ModemSession {
 public:
  explicit ModemSession(ITransport& transport)
      : transport_(transport) {}

 private:
  ITransport& transport_;  // has-a / uses-a
};
```

继承和组合在代码里承担不同语义，而不是同一种“复用手段”。

---

## ⑤ 今日编码规范（8 分钟）

### SHOULD：关系不明确时优先组合

错误写法：

```cpp
class Modem : public UartDriver {
  // 只是因为 Modem 内部需要 UART
};
```

推荐写法：

```cpp
class Modem {
 public:
  explicit Modem(UartDriver& uart) : uart_(uart) {}

 private:
  UartDriver& uart_;
};
```

### MUST：接口保持小

如果基类只为了让派生类拿到一堆内部工具函数，它可能不是一个真实抽象。

### MUST：组合仍需明确 ownership

```cpp
UartDriver& uart_;  // borrow
```

和：

```cpp
std::unique_ptr<UartDriver> uart_;  // owner
```

含义完全不同。

---

## ⑥ 可编译实验 / 练习（15 分钟）

实验文件：

```text
examples/day-036/main.cpp
```

实验展示三种关系：

```text
UartTransport  is-a   ITransport
ModemSession   uses-a ITransport
TracingTransport has-a ITransport and is-a ITransport
```

编译：

```bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic   examples/day-036/main.cpp -o day036
./day036
```

### 规范修复题

重构：

```cpp
class Logger {
 public:
  void Log(const char* text);
};

class Modem : public Logger {
 public:
  void Send();
};
```

要求回答：

1. Modem 真的是一种 Logger 吗？
2. 如果只是需要日志能力，应如何改成 composition？
3. Logger 生命周期由谁负责？
4. 如果日志是可选依赖，引用还是指针更合适？

---

## ⑦ 3 个常见坑（3 分钟）

1. **为了复用实现就继承**  
   结果 hierarchy 表达了错误语义。

2. **把 composition 理解成性能更差**  
   是否有实际成本必须测量，不能凭结构猜测。

3. **组合后继续暴露成员全部接口**  
   `GetUart().ConfigureDma()` 之类调用会重新击穿抽象边界。

---

## ⑧ 检查题（4 分钟）

### Q1

`UartTransport : public ITransport` 为什么是合理的 is-a，而 `Modem : public UartTransport` 通常不是？

### Q2

如果 has-a 与 is-a 两种设计都能实现功能，为什么通常应优先考虑 composition？

**答案要点：**

- is-a 应满足同一抽象 contract，而不是“内部依赖某个实现”；
- composition 降低耦合、限制继承契约、让 ownership 与替换边界更清晰。

---

## 下一步

Day 37 继续 Chapter 5 的 **The Not-a Relationship**：不是所有现实世界中的分类关系都应该进入代码 hierarchy。
