---
day: 31
week: 5
part: II
chapter: 5
chapter_title: Designing with Classes
title: "对象所有权、生命周期与资源边界"
duration: 60
status: published

topics:
  - ownership
  - lifetime
  - raii
  - resource-management

guidelines:
  - explicit-lifetime
  - raii-ownership

lab:
  path: examples/day-031/main.cpp
previous: 30
next: 32
---

# Day 31 · 对象所有权、生命周期与资源边界

<!-- cpp-standards:start -->
## 本课涉及的 C++ 标准

以下按正文与配套 `.cpp` 示例中出现的特性标注首次标准化版本，不代表整份程序的最低编译版本。仓库主 Lab 统一使用 C++23。

| 特性 | 首次标准化 | 版本边界 |
| --- | --- | --- |
| 列表初始化 | **C++11** | 包括直接列表初始化；窄化检查及 initializer_list 优先规则须单独注意。 |
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

## ① 今日章节与建议阅读范围（5 分钟）

### 新手起步：先知道今天在解决什么

把“能访问资源”和“负责释放资源”分开。先用纸上的箭头标出唯一释放责任，再决定使用值、唯一所有权或借用。

**前置检查：** 先能解释 [Day 4](day-004-references-parameter-passing.md)、[Day 28](day-028-class-invariants-minimal-interface.md)、[Day 30](day-030-composition-object-responsibilities.md) 的核心例子；不必先掌握整本教材。

**本课最低完成目标：** 能按下面的步骤说明示例如何得到结果，并独立完成一项小修改；高级模式与平台性能分析可第二遍再读。新增导读和拓展练习不计入原有约 60 分钟安排，可分两次完成。

继续 Chapter 5 · **Designing with Classes**。从 Day 30 的 composition 进一步追问：

> 一个成员到底是 **owned**、**borrowed**，还是只在调用期间临时使用？

## ② 昨日复习 3 问（5 分钟）

1. `has-a` 为什么不等于 `owns-a`？
2. 什么时候成员引用比 `shared_ptr` 更清晰？
3. 为什么组合通常比“为了复用实现而继承”更容易维护？

## ③ 核心概念（15 分钟）

### 先用白话建立概念

- **所有者**：决定资源释放的对象。
- **RAII**：用对象生命周期管理资源。

### 跟着本课实验走一遍

1. 找到资源创建入口。
2. 追踪所有权交给会话的位置。
3. 发送时只借用能力。
4. 离开作用域沿析构释放。

先尝试口头预测，再到第⑥节运行。下面原有概念、图示与接口对照用于解释这些步骤，短代码片段不一定能单独编译；完整程序以本课 `main.cpp` 为准。

### 所有权（Ownership）

负责资源生命周期结束的对象才是 owner。

### 借用（Borrowing）

借用对象不负责销毁资源，要求被借用对象活得更久。

### RAII

把资源释放和对象生命周期绑定，使 cleanup 不依赖手工路径。

### 嵌入式中的重点

在 RTOS / Driver / Modem 工程中，常见做法是：

- 启动阶段构建 ownership tree；
- 运行期通过引用借用长期存在的驱动对象；
- hard real-time path 避免 heap allocation；
- 只有确实存在所有权转移时才使用 `std::unique_ptr`。

## ④ C 写法 vs 现代 C++（10 分钟）

### C：所有权靠约定

```c
struct Modem {
  struct Uart* uart;
};

void modem_deinit(struct Modem* modem) {
  free(modem->uart);  // uart 真的是 modem 创建的吗？
}
```

### C++：借用直接写进类型

```cpp
class ModemSession {
public:
  explicit ModemSession(ITransport& transport) : transport_(transport) {}

private:
  ITransport& transport_;  // non-owning borrow
};
```

若对象真正独占一个运行期创建的实现：

```cpp
std::unique_ptr<ITransport> transport_;
```

## ⑤ 今日编码规范（10 分钟）

### MUST：默认单一所有者

能够明确唯一 owner 时，不要使用共享所有权。

### SHOULD：借用使用引用或裸指针

- required borrow → reference
- optional borrow → pointer，并明确 `nullptr` 语义

### MUST：实时路径避免动态分配

对象图尽量在初始化阶段建立。

### 错误写法

```cpp
class ModemSession {
public:
  explicit ModemSession(std::shared_ptr<ITransport> transport) : transport_(std::move(transport)) {}

private:
  std::shared_ptr<ITransport> transport_;
};
```

如果会话不需要共享拥有 transport，这会模糊生命周期。

### 推荐写法

```cpp
class ModemSession {
public:
  explicit ModemSession(ITransport& transport) : transport_(transport) {}

private:
  ITransport& transport_;
};
```

### 工业界特例：异步环境下的共享所有权与自驱动生命周期

虽然同步系统应默认单一所有权，但在**异步网络/并发事件驱动**体系中，任务完成回调的时机完全独立于发起者的栈帧生命周期。此时通过 `std::shared_ptr` 与 `std::enable_shared_from_this` 延长生命周期是行业公认的标准解法：

> 典型如 Asio 的经典单行 `std::make_shared<session>(std::move(socket))->start();`，将会话生命周期安全移交给内核事件队列，杜绝 use-after-free。详见专栏深度解析：[Asio 经典单行拆解与异步生命周期实践](../frameworks/asio/SESSION_LIFECYCLE.md#21-深度拆解经典单行stdmake_sharedsessionstdmovesocket-start)。

## ⑥ 可编译实验（20 分钟）

### 第一次做：先运行，再只改一件事

1. 在仓库根目录打开 [`examples/day-031/main.cpp`](../examples/day-031/main.cpp)，先读 `main()`，圈出输入、调用与结果检查。
2. 运行原版，把实际输出和退出状态记下来，再与本节预期对照。无输出也可能成功，必须结合退出码与断言判断。
3. 修改前先写预期；若失败，先读第一条编译错误或失败断言，再回到对应概念，不同时重写多个函数。

**本课小改动：** 在作用域结束前标出每一条借用失效的时间点；若新增提前返回，解释资源由谁回收。

<details>
<summary>练习提示：卡住时再展开</summary>

把上面的执行步骤当作检查点；保留原版作为对照。若练习故意让编译或断言失败，请只在实验副本操作，解释失败后还原，不把负例混入日常通过用例。不要执行越界、悬空解引用或重复释放来“观察效果”。

</details>

完整源码：[main.cpp](../examples/day-031/main.cpp)。

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
  kTimeout,
};

class ITransport {
public:
  virtual ~ITransport() = default;
  virtual Status Write(std::span<const std::uint8_t> data, std::chrono::milliseconds timeout) = 0;
};

class FakeTransport final : public ITransport {
public:
  Status Write(std::span<const std::uint8_t> data, std::chrono::milliseconds timeout) override {
    if (data.empty()) {
      return Status::kInvalidArgument;
    }
    if (timeout <= 0ms) {
      return Status::kTimeout;
    }
    last_size_ = data.size();
    return Status::kOk;
  }

  [[nodiscard]] std::size_t LastSize() const {
    return last_size_;
  }

private:
  std::size_t last_size_{0};
};

class ModemSession {
public:
  explicit ModemSession(ITransport& transport) : transport_(transport) {}

  Status Send(std::span<const std::uint8_t> data, std::chrono::milliseconds timeout) {
    return transport_.Write(data, timeout);
  }

private:
  ITransport& transport_;
};

int main() {
  FakeTransport transport;
  ModemSession modem{transport};

  constexpr std::array<std::uint8_t, 4> kAt{0x41, 0x54, 0x0D, 0x0A};

  assert(modem.Send(kAt, 100ms) == Status::kOk);
  assert(transport.LastSize() == kAt.size());
}
```

在仓库根目录运行：

```bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic examples/day-031/main.cpp -o /tmp/day-031
/tmp/day-031
```

## ⑦ 3 个常见坑（5 分钟）

1. 把 `shared_ptr` 当作“省事指针”。
2. 把 borrowed raw pointer 误当成 owning pointer。
3. 对象销毁顺序与引用成员生命周期不匹配。

## ⑧ 检查题（5 分钟）

### 分层自测：从解释到判断

1. **理解：** 不看代码，用三句话复述本课示例的输入、关键步骤和结果。
2. **应用：** 说明第⑥节小改动的预期，以及实际结果是否符合预期。
3. **辨析：** 裸指针和引用会自动延长资源寿命吗？

<details>
<summary>辨析题参考答案与通过依据</summary>

不会；借用者必须受所有者生命周期约束，RAII 也不会自动修复保存了过久的借用。

能运行只是第一步。只有能解释本课具体步骤、完成小改动，并说清一个不适用条件，才算完成本次自测；不清楚时回看第③节，不以阅读次数当作掌握证据。

</details>

### 原课检查题

1. required non-owning dependency 更适合引用还是 `unique_ptr`？
2. `unique_ptr` 最重要的语义是什么？

**答案要点**：引用；`unique_ptr` 表达独占所有权以及可移动的所有权转移。

### 对照现有资料库

- [拥有、借用与对象协作](<../patterns/ownership-and-smart-pointers.md>)。
- [模式选型：先看无模式基线](<../patterns/engineering-workshop.md>)。

先完成本课小实验，再查对照资料；专题中的线程、网络、板端或模式不是本课默认前置。以上为本项目已有讲解和工程对照，不冒充标准条文，也不表示所有示例已在目标板验证。
