---
day: 19
week: 3
part: II
chapter: 4
chapter_title: "Designing Professional C++ Programs"
title: "Designing Professional C++ Programs：从需求到架构边界"
duration: 60
status: published
topics:
  - requirements-architecture-boundaries
guidelines:
  - explicit-contract
lab:
  path: examples/day-019/main.cpp
previous: 18
next: 20
---
# Day 19 · Designing Professional C++ Programs：从需求到架构边界

<!-- cpp-standards:start -->
## 本课涉及的 C++ 标准

以下按正文与配套 `.cpp` 示例中出现的特性标注首次标准化版本，不代表整份程序的最低编译版本。仓库主 Lab 统一使用 C++23。

| 特性 | 首次标准化 | 版本边界 |
| --- | --- | --- |
| 列表初始化 | **C++11** | 包括直接列表初始化；窄化检查及 initializer_list 优先规则须单独注意。 |
| `= default` / `= delete` | **C++11** | 显式默认化与删除函数。 |
| `enum class` | **C++11** | 有作用域枚举。 |
| `override` / `final` | **C++11** | 用于虚函数覆盖检查、限制覆盖或继承。 |
| `std::chrono` | **C++11** | 如 duration、time_point、steady_clock；不是所有 chrono 后增 API 都属于 C++11。 |
| chrono 时长字面量 | **C++14** | 如 `100ms`；需要相应头文件与 `std::chrono_literals`。 |
| `std::string_view` | **C++17** | 非拥有视图；其 `starts_with` / `ends_with` 是 C++20 新增。 |
| `std::span` | **C++20** | 连续序列的非拥有视图；不自动延长底层对象生命周期。 |

版本差异、旧机制与工具链检查见 [C++ 标准来源速查](../docs/cpp-feature-standards.md)。
<!-- cpp-standards:end -->

**Chapter 4 · Designing Professional C++ Programs**

主题：从需求到架构边界
今天正式进入 Part II：从“写好一个函数”上升到“先设计程序，再写代码”。
## ① 今日章节与建议阅读范围（5 分钟）

### 新手起步：先知道今天在解决什么

先写“连接需要发什么命令”，再决定“由谁发送字节”。业务流程不应为了换 UART 而重写；测试可以提供一个只记录调用的 transport。

**前置检查：** 先能解释 [Day 7](day-007-week1-review-modem-control.md)、[Day 13](day-013-coding-with-style-foundations.md)、[Day 17](day-017-errors-assert-control-flow.md) 的核心例子；不必先掌握整本教材。

**本课最低完成目标：** 能按下面的步骤说明示例如何得到结果，并独立完成一项小修改；高级模式与平台性能分析可第二遍再读。新增导读和拓展练习不计入原有约 60 分钟安排，可分两次完成。

阅读 Chapter 4 开始部分，关注专业程序设计、需求、设计与实现之间的关系。阅读时不断问：系统负责什么？哪些变化应该被隔离？组件之间交换什么？

## ② 昨日复习 3 问（5 分钟）

- 为什么可恢复的 Modem timeout 不应使用 assert？

- early return 如何降低嵌套复杂度？

- enum class 相比 int 状态码提供什么静态保证？

## ③ 核心概念讲解（15 分钟）

### 先用白话建立概念

- **策略**：决定做什么及何时做。
- **机制**：实现具体动作的方法。

### 跟着本课实验走一遍

1. 从 Attach 的调用点读配置。
2. 进入会话流程生成命令。
3. 交给 transport。
4. 把返回状态带回调用者。

先尝试口头预测，再到第⑥节运行。下面原有概念、图示与接口对照用于解释这些步骤，短代码片段不一定能单独编译；完整程序以本课 `main.cpp` 为准。

专业 C++ 程序设计不是先决定“我要几个 class”，而是先识别职责、变化轴和依赖方向。嵌入式项目尤其应区分 Policy 与 Mechanism：Attach 策略不直接操作 UART 寄存器；协议解析不应知道 RTOS queue；BSP/Driver 把平台差异压在系统边缘。

一个实用判断是：如果硬件型号改变，哪些代码必须变化？如果协议改变，哪些代码必须变化？ 两个答案如果高度重叠，边界通常划错了。

目标依赖方向

Application / Policy
↓
ModemSession
↓
Transport capability
↓
UART / RTOS / BSP / MMIO

## ④ C 写法 vs 现代 C++ 写法（10 分钟）

C 风格：依赖隐藏在全局环境中

```c
int g_state;
int modem_attach(bool verbose) {
uart_write("AT+CGATT=1\r\n");
return uart_wait(5000);
}
```

现代 C++：让依赖与配置出现在接口上

```cpp
enum class Status { kOk, kTimeout, kIoError };
```

```cpp
struct SessionOptions {
  std::chrono::milliseconds timeout;
};

class Transport {
public:
  virtual Status Send(std::string_view data) = 0;
  virtual Status Receive(std::span<char> out, std::chrono::milliseconds timeout) = 0;
  virtual ~Transport() = default;
};
```

## ⑤ 今日编码规范（10 分钟）

MUST：接口小而明确，并显式表达依赖。
MUST：避免可写全局状态。
SHOULD：平台差异集中隔离。

不要在业务逻辑内部散落 #ifdef BOARD_A。让 BoardA/BoardB 的差异停留在 Driver/BSP 层；让 timeout 进入 SessionOptions；让 transport 作为借用依赖进入对象。

违反规范

```cpp
extern int g_timeout_ms;
extern int g_state;
int Attach();  // 依赖全部隐藏
```

推荐写法

```cpp
class ModemSession {
public:
  ModemSession(Transport& transport, SessionOptions options)
      : transport_(transport), options_(options) {}

  Status Attach();

private:
  Transport& transport_;  // 借用，不拥有
  SessionOptions options_;
};
```
## ⑥ 可编译小实验 / 代码练习（20 分钟）

### 第一次做：先运行，再只改一件事

1. 在仓库根目录打开 [`examples/day-019/main.cpp`](../examples/day-019/main.cpp)，先读 `main()`，圈出输入、调用与结果检查。
2. 运行原版，把实际输出和退出状态记下来，再与本节预期对照。无输出也可能成功，必须结合退出码与断言判断。
3. 修改前先写预期；若失败，先读第一条编译错误或失败断言，再回到对应概念，不同时重写多个函数。

**本课小改动：** 增加一个返回超时的 fake 路径，预期会话不会把超时转换成成功；不需要接入真实板卡。

<details>
<summary>练习提示：卡住时再展开</summary>

把上面的执行步骤当作检查点；保留原版作为对照。若练习故意让编译或断言失败，请只在实验副本操作，解释失败后还原，不把负例混入日常通过用例。不要执行越界、悬空解引用或重复释放来“观察效果”。

</details>

实现一个 ModemSession：Attach() 只编排 AT 命令流程，不访问 UART/MMIO；输入输出使用有界视图；无全局可写状态；无 magic timeout；实时路径不新增动态分配。

练习 A：实现一个 FakeTransport，记录最后发送的命令，并让 Receive 可配置返回 kOk/kTimeout/kIoError。验证 ModemSession 无需真实 UART 就能测试。

练习 B — Code Review 修复：把一个同时包含 uart_write、volatile UART_REG、5000 magic timeout、g_state 和 #ifdef BOARD_A 的 modem_attach(bool verbose) 拆成至少三层：

Board/UART Driver → Transport → ModemSession

并为每层写一句“它为什么会变化”。这比单纯画类图更重要。

编译

完整源码：[main.cpp](../examples/day-019/main.cpp)。

```cpp
#include <cassert>
#include <chrono>
#include <iostream>
#include <span>
#include <string>
#include <string_view>

using namespace std::chrono_literals;

enum class Status { kOk, kTimeout, kIoError };

struct SessionOptions {
  std::chrono::milliseconds timeout{1000ms};
};

class Transport {
public:
  virtual ~Transport() = default;
  virtual Status Send(std::string_view data) = 0;
  virtual Status Receive(std::span<char> out, std::chrono::milliseconds timeout) = 0;
};

class FakeTransport final : public Transport {
public:
  Status Send(std::string_view data) override {
    last_sent_ = data;
    return Status::kOk;
  }

  Status Receive(std::span<char> out, std::chrono::milliseconds timeout) override {
    (void)timeout;
    if (out.size() < canned_response_.size()) return Status::kIoError;
    for (std::size_t i = 0; i < canned_response_.size(); ++i) {
      out[i] = canned_response_[i];
    }
    return mock_status_;
  }

  std::string last_sent_;
  std::string canned_response_{"OK\r\n"};
  Status mock_status_{Status::kOk};
};

class ModemSession {
public:
  ModemSession(Transport& transport, SessionOptions options)
      : transport_(transport), options_(options) {}

  Status Attach() {
    Status s = transport_.Send("AT+CFUN=1\r\n");
    if (s != Status::kOk) return s;
    char buffer[32]{};
    return transport_.Receive(buffer, options_.timeout);
  }

private:
  Transport& transport_;
  SessionOptions options_;
};

int main() {
  FakeTransport transport;
  SessionOptions options{500ms};
  ModemSession session{transport, options};

  Status s = session.Attach();
  assert(s == Status::kOk);
  assert(transport.last_sent_ == "AT+CFUN=1\r\n");

  std::cout << "ModemSession attached successfully over FakeTransport\n";
  return 0;
}
```

在仓库根目录运行：

```bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic examples/day-019/main.cpp -o /tmp/day-019
/tmp/day-019
```

## ⑦ 3 个常见坑（5 分钟）

- 设计阶段立即制造大量 class，却没有识别变化轴。

- 建立巨大的 IPlatform，把几十个无关能力塞进一个接口。

- 为了“解耦”到处使用 shared_ptr，导致生命周期与所有权反而更模糊。

## ⑧ 2 道检查题（5 分钟）

### 分层自测：从解释到判断

1. **理解：** 不看代码，用三句话复述本课示例的输入、关键步骤和结果。
2. **应用：** 说明第⑥节小改动的预期，以及实际结果是否符合预期。
3. **辨析：** 为什么不先设计十个接口？

<details>
<summary>辨析题参考答案与通过依据</summary>

接口应由真实职责和变化点支持；为了假想需求增加层次会提高理解和维护成本。

能运行只是第一步。只有能解释本课具体步骤、完成小改动，并说清一个不适用条件，才算完成本次自测；不清楚时回看第③节，不以阅读次数当作掌握证据。

</details>

### 原课检查题

- 为什么 ModemSession 依赖 Transport 能力比直接依赖 UartDriver 更容易测试和复用？

- 若 Transport 由系统静态创建且保证长于 ModemSession，引用、裸指针、unique_ptr、shared_ptr 中哪一种最直接表达“借用而不拥有”？为什么？

C++23 工具链提示：本课主要使用 string_view、span、chrono、enum class 等成熟设施。嵌入式交叉工具链应按实际标准库能力验证，不能只看编译器版本。

明日：继续 Chapter 4，深入需求分析、组件职责与接口契约。

### 对照现有资料库

- [需求与约束贯穿实验](<../docs/engineering-learning-path.md>)。
- [系统架构资料：进阶对照](<../references/system-design-notes/content/33. Cpp System Architecture/index.zh.md>)。

先完成本课小实验，再查对照资料；专题中的线程、网络、板端或模式不是本课默认前置。以上为本项目已有讲解和工程对照，不冒充标准条文，也不表示所有示例已在目标板验证。
