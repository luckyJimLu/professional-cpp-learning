---
day: 7
week: 1
part: I
chapter: 2
chapter_title: Professional C++ Basics
title: Week 1 Review - Modem Control Module
duration: 60
status: published

topics:
  - week-review
  - modem-control
  - initialization
  - references
  - pointers
  - enum-class

guidelines:
  - review

previous: 6
next: 8
---

# Day 07 · 第一周复盘：Modem 控制模块

> **历史重建**：原邮件发送未成功。本文件依据 Day 1–6 的既有课程进度与既定 60 分钟课程结构重建。

## ① 今日章节与建议阅读范围（5 分钟）

回看《Professional C++, Sixth Edition》Chapter 1 已学习内容：程序结构、初始化、`const/constexpr`、引用、指针与 `nullptr`、数组边界、`enum class` 与结构化返回值。

本日不引入大量新语法，而是把这些知识串成一个小型 **Modem 控制模块**。

## ② 昨日复习 3 问（5 分钟）

1. 为什么状态值优先使用 `enum class`，而不是裸 `int`？
2. “必须存在的借用对象”为什么通常更适合引用而不是裸指针？
3. 为什么协议缓冲区接口应同时表达地址和长度？

## ③ 核心概念：从 C 代码迁移到可审查的 C++ 接口（10 分钟）

本周迁移的重点不是把 `.c` 改成 `.cpp`，而是让**意图进入类型系统**：

- 常量 → `constexpr`
- 可能为空 → 指针
- 必须存在 → 引用
- 状态 → `enum class`
- 缓冲区 → `std::span`
- 多返回值 → 结构体
- 不能隐式转换的单参数构造 → `explicit`

## ④ C 写法 vs 现代 C++（10 分钟）

### C 风格

```c
#define MODEM_READY 1
#define MODEM_ERROR 2

int modem_send(
    void* ctx,
    const unsigned char* data,
    unsigned int len,
    int timeout_ms);
```

问题：

- 状态值没有类型边界；
- `ctx` 的真实类型未知；
- 长度类型和容器脱离；
- timeout 单位只能靠命名约定。

### C++ 风格

```cpp
#include <chrono>
#include <cstdint>
#include <span>

enum class Status {
  kOk,
  kTimeout,
  kInvalidArgument,
};

class ITransport {
 public:
  virtual ~ITransport() = default;

  virtual Status Write(
      std::span<const std::uint8_t> data,
      std::chrono::milliseconds timeout) = 0;
};
```

## ⑤ 今日编码规范（10 分钟）

### MUST：接口显式表达意图

不要使用 `void*`、裸整数状态和多个语义不明的布尔参数。

### MUST：单位进入类型或名称

优先：

```cpp
std::chrono::milliseconds timeout
```

至少也应写成 `timeout_ms`，不要只写 `timeout`。

### SHOULD：优先静态检查

建议本周实验始终使用：

```bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic main.cpp
```

## ⑥ 周工程：类型安全的 Modem 控制模块（20 分钟）

```cpp
#include <array>
#include <cassert>
#include <chrono>
#include <cstdint>
#include <span>

using namespace std::chrono_literals;

enum class Status {
  kOk,
  kTimeout,
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
    if (data.empty()) {
      return Status::kInvalidArgument;
    }
    if (timeout <= 0ms) {
      return Status::kTimeout;
    }
    last_size_ = data.size();
    return Status::kOk;
  }

  [[nodiscard]] std::size_t LastSize() const { return last_size_; }

 private:
  std::size_t last_size_{0};
};

class ModemController {
 public:
  explicit ModemController(ITransport& transport) : transport_(transport) {}

  Status SendAt(std::span<const std::uint8_t> command,
                std::chrono::milliseconds timeout) {
    return transport_.Write(command, timeout);
  }

 private:
  ITransport& transport_;
};

int main() {
  FakeTransport transport;
  ModemController modem{transport};

  constexpr std::array<std::uint8_t, 4> kAt{0x41, 0x54, 0x0D, 0x0A};

  assert(modem.SendAt(kAt, 100ms) == Status::kOk);
  assert(transport.LastSize() == kAt.size());
}
```

## Code Review 检查

- [ ] 头文件依赖是否最小且显式？
- [ ] 类型、函数、变量、成员命名是否符合约定？
- [ ] 所有权/借用关系是否能从接口读出来？
- [ ] 实时路径是否发生动态分配？
- [ ] 错误模型是否统一？
- [ ] 是否误把 `volatile` 当成同步手段？
- [ ] 是否存在 magic number？
- [ ] 空输入、超时、最大长度等边界是否测试？

## ⑦ 3 个常见坑（5 分钟）

1. 把 `enum class` 又强转回裸整数到处传。
2. `std::span` 指向生命周期已经结束的对象。
3. 为“方便”重新引入全局可写状态。

## ⑧ 检查题（5 分钟）

1. 为什么 `std::span` 不能解决生命周期本身的问题？
2. `ITransport&` 表达的是所有权还是借用？

**答案要点**：`span` 只携带视图和长度，不延长底层对象生命周期；引用表达 non-owning borrow。
