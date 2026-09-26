---
day: 32
week: 5
part: II
chapter: 5
chapter_title: Designing with Classes
title: is-a, Hierarchies and Mixins - When to Inherit
duration: 60
status: published

topics:
  - inheritance
  - is-a
  - mixins
  - hierarchies

guidelines:
  - prefer-composition
  - stable-interface

previous: 31
next: 33
---

# Day 32 · is-a、not-a、类层次与 Mixin：什么时候才应该继承

> **历史重建**：本日课程在邮件流程停止后生成，本文件作为 GitHub 迁移后的连续历史记录。

## ① 今日章节与建议阅读范围（5 分钟）

继续 Chapter 5 · **Designing with Classes**，聚焦类之间的：

- `is-a`
- `not-a`
- class hierarchy
- inheritance
- mixin classes

今天的判断原则：

> 继承首先表达语义关系，其次才可能带来代码复用。

## ② 昨日复习 3 问（5 分钟）

1. ownership 与 borrowing 的核心区别是什么？
2. required borrow 为什么通常适合引用？
3. RAII 为什么能减少错误路径上的资源泄漏？

## ③ 核心概念（15 分钟）

### 真正的 is-a

如果 `UartTransport` 可以在所有需要 `ITransport` 的地方被使用，它满足接口语义上的替换关系：

```text
ITransport
├── UartTransport
├── UsbTransport
└── FakeTransport
```

### not-a

`ModemSession` **不是** `UartTransport`。

它只是**使用** transport，因此应优先 composition：

```text
ModemSession --uses--> ITransport
```

### 类层次

良好的 hierarchy 应围绕稳定抽象，而不是硬件型号堆叠出深层继承树。

### Mixin

Mixin 可以用于给类型叠加小而正交的能力，但不应成为替代清晰 composition 的技巧。

## ④ C 写法 vs 现代 C++（10 分钟）

### 错误：为了复用 UART 功能而继承

```cpp
class Modem : public UartDriver {
 public:
  void SendAt();
};
```

这表达了错误语义：Modem 并不是一种 UART Driver。

### 推荐：组合 + 抽象接口

```cpp
class ModemSession {
 public:
  explicit ModemSession(ITransport& transport) : transport_(transport) {}

 private:
  ITransport& transport_;
};
```

## ⑤ 今日编码规范（10 分钟）

### MUST：继承必须能解释为 is-a

如果描述更像“uses-a / has-a”，优先 composition。

### SHOULD：基类接口保持小且稳定

不要把 UART 寄存器、DMA 配置、GPIO 细节全塞进通用 Transport。

### MUST：借用生命周期明确

多态接口并不自动解决对象生命周期。

## ⑥ 可编译实验（20 分钟）

```cpp
#include <array>
#include <cassert>
#include <chrono>
#include <cstddef>
#include <cstdint>
#include <span>

using namespace std::chrono_literals;

enum class Status {
  kOk,
  kInvalidArgument,
};

class ITransport {
 public:
  virtual ~ITransport() = default;

  virtual Status Write(
      std::span<const std::uint8_t> data,
      std::chrono::milliseconds timeout) = 0;
};

class FakeTransport final : public ITransport {
 public:
  Status Write(
      std::span<const std::uint8_t> data,
      std::chrono::milliseconds timeout) override {
    if (data.empty() || timeout <= 0ms) {
      return Status::kInvalidArgument;
    }
    write_count_++;
    return Status::kOk;
  }

  [[nodiscard]] std::size_t WriteCount() const { return write_count_; }

 private:
  std::size_t write_count_{0};
};

class ModemSession {
 public:
  explicit ModemSession(ITransport& transport) : transport_(transport) {}

  Status Send(std::span<const std::uint8_t> command,
              std::chrono::milliseconds timeout) {
    return transport_.Write(command, timeout);
  }

 private:
  ITransport& transport_;
};

int main() {
  FakeTransport transport;
  ModemSession modem{transport};

  constexpr std::array<std::uint8_t, 4> kAt{0x41, 0x54, 0x0D, 0x0A};

  assert(modem.Send(kAt, 100ms) == Status::kOk);
  assert(transport.WriteCount() == 1);
}
```

### 规范修复练习

重构：

```cpp
class Modem : public UartDriver {
 public:
  bool Send(std::uint8_t* data, int size, bool wait, bool retry);
};
```

要求：

- 去掉错误继承；
- 使用窄接口；
- 使用 `std::span`；
- timeout 强类型化；
- 避免多个 bool；
- 统一 `Status`。

## ⑦ 3 个常见坑（5 分钟）

1. 把继承当作代码复用工具，而不检查替换关系。
2. 构造深层 hierarchy，使硬件差异渗透到上层。
3. mixin 过度叠加，导致方法来源和状态关系难以追踪。

## ⑧ 检查题（5 分钟）

1. `ModemSession : public UartTransport` 最大的问题是什么？
2. `FakeTransport : public ITransport` 为什么通常是合理的？

**答案要点**：前者不是自然的 is-a；后者实现相同的 transport contract，可以作为测试替身参与替换。

## 下一步

Day 33 继续 Chapter 5，从类层次进一步学习 **polymorphism、虚函数接口成本与嵌入式取舍**。
