---
day: 25
week: 4
part: II
chapter: 4
chapter_title: "Designing Professional C++ Programs"
title: "设计文档、接口契约与原型验证"
duration: 60
status: published
topics:
  - design-doc-contract-prototype
guidelines:
  - explicit-contract
lab:
  path: examples/day-025/main.cpp
previous: 24
next: 26
---
# Day 25 · 设计文档、接口契约与原型验证

**Chapter 4 · Designing Professional C++ Programs
主题：设计文档、接口契约与原型验证
目标：把“设计”从脑中的想法变成可审查、可验证的工程契约。今天继续 Chapter 4，不进入 Chapter 5。
## ① 今日章节与建议阅读范围（5分钟）

### 新手起步：先知道今天在解决什么

先用文字写清容量、错误和所有权，再用最小程序证明关键假设。原型不是自动合格的生产实现。

**前置检查：** 先能解释 [Day 20](day-020-requirements-use-cases-decisions.md)、[Day 22](day-022-abstraction-stable-interface.md)、[Day 24](day-024-coupling-cohesion-dependencies.md) 的核心例子；不必先掌握整本教材。

**本课最低完成目标：** 能按下面的步骤说明示例如何得到结果，并独立完成一项小修改；高级模式与平台性能分析可第二遍再读。新增导读和拓展练习不计入原有约 60 分钟安排，可分两次完成。

阅读 Chapter 4 中围绕 professional program design、接口/抽象、设计决策和验证思路的相关段落。记录：系统必须保证什么？哪些约束属于接口契约？哪些风险必须先做 prototype 验证？

## ② 昨日复习 3 问（5分钟）

- 高内聚、低耦合分别解决什么问题？

- 为什么依赖注入 ITransport& 不代表所有权转移？

- 为什么 Application 不应该直接依赖 UART 寄存器或 BSP 细节？

答案：高内聚让模块围绕一个职责变化，低耦合减少变化传播；引用通常表达借用；硬件细节应被 Driver/HAL 边界隔离。

## ③ 核心概念讲解（15分钟）

### 先用白话建立概念

- **不变量**：对象有效期间必须保持的条件。
- **原型**：验证风险的最小实现。

### 跟着本课实验走一遍

1. 找到固定缓冲区容量。
2. 看写入前如何检查剩余空间。
3. 检查写入后视图长度。
4. 对照成功断言。

先尝试口头预测，再到第⑥节运行。下面原有概念、图示与接口对照用于解释这些步骤，短代码片段不一定能单独编译；完整程序以本课 `main.cpp` 为准。

设计文档不是“写很多文档”

轻量设计记录至少回答：Problem、Constraints、Interface、Ownership/Lifetime、Error model、Timing/Memory budget、Dependencies、Alternatives、Validation。Modem 场景应明确 deadline、buffer、heap、错误语义与平台边界。

Interface contract 不只是函数签名

契约还包含 precondition、postcondition、lifetime、error semantics、timing/resource bounds。即使使用 std::span 和 std::chrono，仍应说明空输入、返回范围、timeout 后数据有效性、阻塞与线程安全。

用类型编码稳定约束

enum class 表达状态；std::span 表达连续借用范围；std::chrono::milliseconds 表达时间单位；reference 表达非空借用；Options 聚合相关配置。

Prototype 是风险消除工具

针对 C++23 工具链支持、DMA/ring buffer 峰值、抽象开销、固定 buffer 容量等高风险假设做最小实验。输出应该是延迟、RAM/Flash、丢包率和兼容性等证据，而不是感觉。

## ④ C 写法 vs 现代 C++（10分钟）

```c
int modem_send(void* ctx, const char* data, int len, int timeout, int retry);
```

ctx 生命周期、len 合法范围、timeout 单位和 retry 语义都不清楚。

```cpp
enum class Status { kOk, kTimeout, kIoError, kInvalidArgument };
struct SendOptions {
  std::chrono::milliseconds timeout{1000ms};
  unsigned retry_count{0};
};
class ITransport {
public:
  virtual ~ITransport() = default;
  virtual Status Send(std::span<const std::byte> data, const SendOptions& options) = 0;
};
```

## ⑤ 今日编码规范（10分钟）

MUST：显式表达意图。
SHOULD：接口尽量小。
SHOULD：性能优化必须有证据。

违反规范

```cpp
int Transfer(void* p, int n, int t, bool fast, bool retry);
Transfer(buf, 128, 1000, true, false);
```

推荐写法

```cpp
struct TransferOptions {
  std::chrono::milliseconds timeout{1000ms};
  unsigned retry_count{0};
};
Status Transfer(std::span<const std::byte> data, const TransferOptions& options);
```

嵌入式注意：不要为了抽象自动引入 heap、shared_ptr 或无界容器。抽象同样要接受 latency、Flash/RAM 和 worst-case behavior 审计。

## ⑥ 可编译小实验（20分钟）

### 第一次做：先运行，再只改一件事

1. 在仓库根目录打开 [`examples/day-025/main.cpp`](../examples/day-025/main.cpp)，先读 `main()`，圈出输入、调用与结果检查。
2. 运行原版，把实际输出和退出状态记下来，再与本节预期对照。无输出也可能成功，必须结合退出码与断言判断。
3. 修改前先写预期；若失败，先读第一条编译错误或失败断言，再回到对应概念，不同时重写多个函数。

**本课小改动：** 补一个容量耗尽用例，预期失败且原有有效内容不被破坏；将结论补回接口契约。

<details>
<summary>练习提示：卡住时再展开</summary>

把上面的执行步骤当作检查点；保留原版作为对照。若练习故意让编译或断言失败，请只在实验副本操作，解释失败后还原，不把负例混入日常通过用例。不要执行越界、悬空解引用或重复释放来“观察效果”。

</details>

实现固定容量 Modem command buffer：无异常、运行路径无动态分配。

完整源码：[main.cpp](../examples/day-025/main.cpp)。

```cpp
#include <array>
#include <cassert>
#include <cstddef>
#include <iostream>
#include <span>

enum class Status { kOk, kEmptyCommand, kCommandTooLarge };

class CommandBuffer {
public:
  static constexpr std::size_t kCapacity = 64;

  Status Store(std::span<const std::byte> command) {
    if (command.empty()) return Status::kEmptyCommand;
    if (command.size() > buffer_.size()) return Status::kCommandTooLarge;
    for (std::size_t i = 0; i < command.size(); ++i) {
      buffer_[i] = command[i];
    }
    size_ = command.size();
    return Status::kOk;
  }

  [[nodiscard]] std::span<const std::byte> View() const {
    return {buffer_.data(), size_};
  }

private:
  std::array<std::byte, kCapacity> buffer_{};
  std::size_t size_{0};
};

int main() {
  const std::array command{std::byte{'A'}, std::byte{'T'}};
  CommandBuffer buffer;
  const Status s = buffer.Store(command);
  assert(s == Status::kOk);
  assert(buffer.View().size() == 2);
  std::cout << "stored bytes: " << buffer.View().size() << '\n';
  return 0;
}
```

在仓库根目录运行：

```bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic examples/day-025/main.cpp -o /tmp/day-025
/tmp/day-025
```

## ⑦ 3 个常见坑（5分钟）

- 把函数签名误认为完整接口契约。

- prototype 未经清理逐渐变成 production code。

- 没有 benchmark/WCET 证据就提前采用复杂对象池、手写容器或 lock-free。

## ⑧ 2 道检查题（5分钟）

### 分层自测：从解释到判断

1. **理解：** 不看代码，用三句话复述本课示例的输入、关键步骤和结果。
2. **应用：** 说明第⑥节小改动的预期，以及实际结果是否符合预期。
3. **辨析：** 一次成功输出能证明容量策略正确吗？

<details>
<summary>辨析题参考答案与通过依据</summary>

不能；必须检查空、刚好装满、超出容量及失败后的状态。

能运行只是第一步。只有能解释本课具体步骤、完成小改动，并说清一个不适用条件，才算完成本次自测；不清楚时回看第③节，不以阅读次数当作掌握证据。

</details>

### 原课检查题

Q1：哪些契约应优先进入类型系统，哪些仍需文档？
Q2：什么时候应先做 prototype？

答案：单位、离散状态、buffer 范围、明显 borrow/non-null 关系尽量类型化；线程安全、调用时序、硬件副作用等仍需契约说明。工具链、性能、内存、实时性或硬件行为存在高成本未知时，应先做最小 prototype。

今日完成标准：在写 class 之前，能够先写一页轻量设计说明，并把关键约束分别落实到“类型、代码检查、文档、测试”。

Day 26：继续 Chapter 4——设计取舍、变化管理与稳定边界，为 Chapter 5 Class Design 做准备。

### 对照现有资料库

- [需求与约束贯穿实验](<../docs/engineering-learning-path.md>)。
- [系统架构资料：进阶对照](<../references/system-design-notes/content/33. Cpp System Architecture/index.zh.md>)。

先完成本课小实验，再查对照资料；专题中的线程、网络、板端或模式不是本课默认前置。以上为本项目已有讲解和工程对照，不冒充标准条文，也不表示所有示例已在目标板验证。
