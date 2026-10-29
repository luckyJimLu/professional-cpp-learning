---
day: 30
week: 5
part: II
chapter: 5
chapter_title: "Designing with Classes"
title: "Composition：用对象组合分配职责"
duration: 60
status: published
topics:
  - composition-object-responsibilities
guidelines:
  - explicit-contract
lab:
  path: examples/day-030/main.cpp
previous: 29
next: 31
---
# Day 30 · Composition：用对象组合分配职责

<!-- cpp-standards:start -->
## 本课涉及的 C++ 标准

以下按正文与配套 `.cpp` 示例中出现的特性标注首次标准化版本，不代表整份程序的最低编译版本。仓库主 Lab 统一使用 C++23。

| 特性 | 首次标准化 | 版本边界 |
| --- | --- | --- |
| `= default` / `= delete` | **C++11** | 显式默认化与删除函数。 |
| `constexpr` | **C++11** | C++14 放宽函数体限制；C++20 继续扩展可用于常量求值的操作。声明不保证每次调用都在编译期执行。 |
| `nullptr` | **C++11** | 空指针字面量；不要与整数 0 的类型混为一谈。 |
| `enum class` | **C++11** | 有作用域枚举。 |
| `override` / `final` | **C++11** | 用于虚函数覆盖检查、限制覆盖或继承。 |
| `[[nodiscard]]` | **C++17** | 带说明字符串的形式从 C++20 起可用。 |
| `<cstdint>` 固定宽度整数 | **C++11** | 精确宽度类型仅在实现提供对应整数类型时存在。 |
| `std::array` | **C++11** | 固定大小容器。 |
| 标准智能指针与 `std::make_shared` | **C++11** | `unique_ptr`、`shared_ptr`、`weak_ptr`、`enable_shared_from_this`；不要据此把所有相关辅助函数都标为 C++11。 |
| 移动语义 / `std::move` / `std::forward` | **C++11** | `std::move` 本身执行类型转换，不直接搬运资源。 |
| `std::chrono` | **C++11** | 如 duration、time_point、steady_clock；不是所有 chrono 后增 API 都属于 C++11。 |
| chrono 时长字面量 | **C++14** | 如 `100ms`；需要相应头文件与 `std::chrono_literals`。 |
| `std::span` | **C++20** | 连续序列的非拥有视图；不自动延长底层对象生命周期。 |

版本差异、旧机制与工具链检查见 [C++ 标准来源速查](../docs/cpp-feature-standards.md)。
<!-- cpp-standards:end -->

**Chapter 5 · Designing with Classes**

Composition：用对象组合分配职责

今日目标：从“一个类做所有事情”转向“对象各司其职，再通过 has-a 关系协作”。重点理解组合、借用依赖与所有权不是同一个概念，并把它应用到 Modem/Driver 结构中。

## ① 今日章节与建议阅读范围（5分钟）

### 新手起步：先知道今天在解决什么

先画对象关系，再画销毁顺序。一个对象需要另一个对象提供服务，不等于它应决定对方的生命周期。

**前置检查：** 先能解释 [Day 4](day-004-references-parameter-passing.md)、[Day 19](day-019-requirements-architecture-boundaries.md)、[Day 28](day-028-class-invariants-minimal-interface.md)、[Day 29](day-029-constructors-initialization-valid-state.md) 的核心例子；不必先掌握整本教材。

**本课最低完成目标：** 能按下面的步骤说明示例如何得到结果，并独立完成一项小修改；高级模式与平台性能分析可第二遍再读。新增导读和拓展练习不计入原有约 60 分钟安排，可分两次完成。

继续 Chapter 5 · Designing with Classes。围绕类之间的关系、职责分配、对象作为成员，以及接口如何表达协作关系阅读。重点问：对象是否真正拥有另一个对象？只是借用服务吗？生命周期是否天然绑定？

## ② 昨日复习 3 问（5分钟）

- 为什么“构造完成即有效”有利于维护 invariant？

- 单参数 constructor 为什么通常应 explicit？

- 为什么可能失败、阻塞的硬件启动过程通常不适合偷偷放进 constructor？

参考：constructor 建立对象自身不变量；explicit 防止意外转换；硬件启动属于运行期可恢复操作，应通过 Start/Open 等显式 API 返回统一 Status。

## ③ 核心概念讲解（15分钟）

### 先用白话建立概念

- **组合**：对象通过成员或协作者完成任务。
- **借用依赖**：使用但不负责销毁的协作者。

### 跟着本课实验走一遍

1. 外部创建 transport。
2. Modem 保存引用。
3. 发送正常命令。
4. 空命令或无效超时沿错误路径返回。

先尝试口头预测，再到第⑥节运行。下面原有概念、图示与接口对照用于解释这些步骤，短代码片段不一定能单独编译；完整程序以本课 `main.cpp` 为准。

### 3.1 从“类”转向“对象关系”

若 ModemSession 同时负责 UART 寄存器、AT 编码、超时、重试、状态机和日志，很快会成为 God Object。更好的边界是：

Text
Application → ModemSession → ITransport → UartTransport → HAL

ModemSession 负责 modem 会话策略；Transport 负责字节传输；HAL 负责硬件细节。

### 3.2 Composition：has-a

当生命周期天然绑定时，可直接把子对象作为成员。没有裸 new/delete，生命周期由语言管理。

C++
```cpp
class PacketQueue {
  std::array<Packet, 8> packets_;
};
```

### 3.3 has-a 不一定等于 owns-a

ModemSession 需要 Transport，不代表必须拥有 Transport。若 Transport 生命周期由平台层管理，可以保存引用，表达 borrowing。

C++
```cpp
explicit ModemSession(ITransport& transport) : transport_(transport) {}
```

### 3.4 Composition 与 inheritance

- “X 是 Y 的一种”才考虑 is-a / inheritance。

- “X 使用/包含 Y”优先 composition。

- 只为了复用实现，不要急着继承。

## ④ C 写法 vs 现代 C++ 写法（10分钟）

传统 C：依赖藏在全局状态。

C
```cpp
static UartHandle* g_uart;
```
int modem_init(UartHandle* uart) { g_uart = uart; return 0; }
```cpp
int modem_send(const uint8_t* data, size_t size) {
  return uart_write(g_uart, data, size);
}
```

现代 C++：依赖在接口中可见。

C++
```cpp
class ITransport {
public:
  virtual ~ITransport() = default;
  virtual Status Write(std::span<const std::uint8_t> data, std::chrono::milliseconds timeout) = 0;
};

class ModemSession {
public:
  explicit ModemSession(ITransport& transport) : transport_(transport) {}

private:
  ITransport& transport_;  // borrowed
};
```
## ⑤ 今日编码规范（10分钟）

MUST：非拥有访问用引用/裸指针，并明确生命周期；SHOULD：接口尽量小；MUST：实时路径避免动态分配。

违反规范：

C++
```cpp
class Modem {
public:
  Modem(std::shared_ptr<Uart> uart) : uart_(std::move(uart)) {}

private:
  std::shared_ptr<Uart> uart_;
};
```

若 Modem 根本不参与 UART 所有权，shared_ptr 制造了虚假生命周期语义。

推荐：

C++
```cpp
class Modem {
public:
  explicit Modem(Uart& uart) : uart_(uart) {}

private:
  Uart& uart_;
};
```

## ⑥ 可编译小实验（20分钟）

### 第一次做：先运行，再只改一件事

1. 在仓库根目录打开 [`examples/day-030/main.cpp`](../examples/day-030/main.cpp)，先读 `main()`，圈出输入、调用与结果检查。
2. 运行原版，把实际输出和退出状态记下来，再与本节预期对照。无输出也可能成功，必须结合退出码与断言判断。
3. 修改前先写预期；若失败，先读第一条编译错误或失败断言，再回到对应概念，不同时重写多个函数。

**本课小改动：** 在纸上排列创建与销毁顺序，保证 Modem 的借用不越过 transport 生命周期；不通过制造悬空访问验证。

<details>
<summary>练习提示：卡住时再展开</summary>

把上面的执行步骤当作检查点；保留原版作为对照。若练习故意让编译或断言失败，请只在实验副本操作，解释失败后还原，不把负例混入日常通过用例。不要执行越界、悬空解引用或重复释放来“观察效果”。

</details>

实现可替换 Transport 的 ModemSession：发送路径无 heap、依赖为 borrowing、timeout 强类型化。

C++

完整源码：[main.cpp](../examples/day-030/main.cpp)。

```cpp
#include <array>
#include <cassert>
#include <chrono>
#include <cstddef>
#include <cstdint>
#include <iostream>
#include <span>

using namespace std::chrono_literals;

enum class Status { kOk, kInvalidArgument, kBufferTooSmall, kTimeout };

class ITransport {
public:
  virtual ~ITransport() = default;
  virtual Status Write(std::span<const std::uint8_t> data, std::chrono::milliseconds timeout) = 0;
};

class FakeTransport final : public ITransport {
public:
  Status Write(std::span<const std::uint8_t> data, std::chrono::milliseconds timeout) override {
    if (timeout <= 0ms) return Status::kTimeout;
    if (data.size() > buffer_.size()) return Status::kBufferTooSmall;
    size_ = data.size();
    for (std::size_t i = 0; i < size_; ++i) {
      buffer_[i] = data[i];
    }
    return Status::kOk;
  }

  [[nodiscard]] std::size_t Size() const {
    return size_;
  }

private:
  static constexpr std::size_t kCapacity = 64;
  std::array<std::uint8_t, kCapacity> buffer_{};
  std::size_t size_ = 0;
};

class ModemSession {
public:
  explicit ModemSession(ITransport& transport) : transport_(transport) {}

  Status Send(std::span<const std::uint8_t> data, std::chrono::milliseconds timeout) {
    if (data.empty()) return Status::kInvalidArgument;
    return transport_.Write(data, timeout);
  }

private:
  ITransport& transport_;
};

int main() {
  FakeTransport transport;
  ModemSession modem{transport};
  constexpr std::array<std::uint8_t, 4> command{0x41, 0x54, 0x0D, 0x0A};
  assert(modem.Send(command, 100ms) == Status::kOk);
  assert(transport.Size() == command.size());
  const std::span<const std::uint8_t> empty;
  assert(modem.Send(empty, 100ms) == Status::kInvalidArgument);
  assert(modem.Send(command, 0ms) == Status::kTimeout);
  std::cout << "ModemSession verified with size=" << transport.Size() << '\n';
  return 0;
}
```

在仓库根目录运行：

```bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic examples/day-030/main.cpp -o /tmp/day-030
/tmp/day-030
```

## ⑦ 3 个常见坑（5分钟）

- 为了代码复用而继承：继承首先是语义关系。

- 所有依赖都 shared_ptr：它表达共享所有权，不是通用依赖容器。

- 组合后仍暴露底层全部接口：GetUart().WriteRegister() 会击穿抽象边界。

## ⑧ 2 道检查题（5分钟）

### 分层自测：从解释到判断

1. **理解：** 不看代码，用三句话复述本课示例的输入、关键步骤和结果。
2. **应用：** 说明第⑥节小改动的预期，以及实际结果是否符合预期。
3. **辨析：** 组合是否意味着必须使用 shared_ptr？

<details>
<summary>辨析题参考答案与通过依据</summary>

不是；值成员、引用、unique_ptr 等都可能参与组合，选型依据是实际所有权。

能运行只是第一步。只有能解释本课具体步骤、完成小改动，并说清一个不适用条件，才算完成本次自测；不清楚时回看第③节，不以阅读次数当作掌握证据。

</details>

### 原课检查题

Q1：为什么 ITransport& 比 ITransport* 更适合“transport 必须存在”的契约？

Q2：若对象独占运行期创建的 transport 且负责销毁，成员应优先引用、unique_ptr 还是 shared_ptr？

答案：引用排除 nullptr 并表达 required non-owning dependency；独占所有权优先 unique_ptr。
今日完成标准：看到两个类时，先问 is-a、has-a、uses-a、owns-a，而不是先问“要不要继承”。
C++23 支持提示：今天使用的 span、chrono、array、enum class 并不依赖最新 C++23 库特性；嵌入式工具链仍应确认标准库配置。

Day 31：继续 Chapter 5，学习对象所有权、生命周期与资源管理边界。

### 对照现有资料库

- [拥有、借用与对象协作](<../patterns/ownership-and-smart-pointers.md>)。
- [模式选型：先看无模式基线](<../patterns/engineering-workshop.md>)。

先完成本课小实验，再查对照资料；专题中的线程、网络、板端或模式不是本课默认前置。以上为本项目已有讲解和工程对照，不冒充标准条文，也不表示所有示例已在目标板验证。
