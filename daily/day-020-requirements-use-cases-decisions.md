---
day: 20
week: 3
part: II
chapter: 4
chapter_title: "Designing Professional C++ Programs"
title: "Chapter 4：需求、用例与设计决策"
duration: 60
status: published
topics:
  - requirements-use-cases-decisions
guidelines:
  - explicit-contract
lab:
  path: examples/day-020/main.cpp
previous: 19
next: 21
---
# Day 20 · Chapter 4：需求、用例与设计决策

**Chapter 4：需求、用例与设计决策**

今日目标：从“先写类”切换到“先明确系统要做什么、边界在哪里、哪些约束必须显式化”。以嵌入式 Modem 子系统为例，把需求转成可测试接口与设计决策。

## ① 今日章节与建议阅读范围（5 分钟）

### 新手起步：先知道今天在解决什么

先把需求改写成可检验句子。不要把“可靠、快速”当作已经足够明确的需求，需要说明输入、成功、失败及限制。

**前置检查：** 先能解释 [Day 17](day-017-errors-assert-control-flow.md)、[Day 19](day-019-requirements-architecture-boundaries.md) 的核心例子；不必先掌握整本教材。

**本课最低完成目标：** 能按下面的步骤说明示例如何得到结果，并独立完成一项小修改；高级模式与平台性能分析可第二遍再读。新增导读和拓展练习不计入原有约 60 分钟安排，可分两次完成。

继续 Chapter 4 — Designing Professional C++ Programs 中程序设计过程、需求、设计与工程权衡相关内容。阅读时重点观察：不要过早进入实现；区分功能需求与质量属性；设计应服务于可维护性、可测试性与变化。

## ② 昨日复习 3 问（5 分钟）

- 为什么 ModemSession 不应该直接访问 UART/MMIO？

- Policy 与 Mechanism 分离解决的主要变化问题是什么？

- FakeTransport 为什么能降低测试成本？

## ③ 核心概念讲解（15 分钟）

### 先用白话建立概念

- **用例**：用户目标对应的一段交互。
- **验收条件**：判断目标是否完成的可观察证据。

### 跟着本课实验走一遍

1. 读正常用例。
2. 列出无效参数。
3. 追踪实验返回的状态。
4. 核对两个分支各自对应的需求。

先尝试口头预测，再到第⑥节运行。下面原有概念、图示与接口对照用于解释这些步骤，短代码片段不一定能单独编译；完整程序以本课 `main.cpp` 为准。

1. 需求先于类。先写系统行为：SendCommand(command, timeout)；成功返回响应；超时返回 Timeout；I/O 故障返回 IoError；任何路径都不能无限等待。

2. 功能需求与质量属性。功能需求描述“做什么”；质量属性描述“做到什么程度”。嵌入式系统尤其关注确定性、内存上界、可测试性、可移植性和故障可诊断性。

3. 用例帮助找到边界。Application → ModemSession → Transport → Driver。应用层不应该知道 UART 寄存器；Parser 不应该控制 UART。

4. 重要约束进入接口。timeout 不应成为实现中的 magic number；缓冲区容量应有明确上界；错误应是强类型状态而不是含义模糊的 -1。

5. 记录设计决策。例如：为什么禁用异常？为什么实时路径避免动态分配？为什么 Transport 是借用依赖？工程代码需要记录“为什么”。

## ④ C 写法 vs 现代 C++ 写法（10 分钟）

C 风格接口常把 uart id、buffer、长度、timeout 和输出状态塞进一个函数，调用者必须记住大量隐含约定。现代 C++ 可以用 enum class、std::span、chrono duration 和小型结果类型表达契约。

## ⑤ 今日编码规范（10 分钟）

- MUST：阻塞 API 必须有 timeout；禁止 magic number。

- SHOULD：参数过多使用 Options/Config；单位进入类型或名称。

- MUST：可恢复错误不能用 assert；assert 只验证不变量。

违反规范

```cpp
int SendAt(const char* cmd, char* out, int len) {
  assert(cmd);
  return uart_send(cmd, out, len, 3000);
}
```

推荐写法

```cpp
enum class Status { kOk, kTimeout, kIoError, kInvalidArgument };
struct CommandOptions {
  std::chrono::milliseconds timeout;
};
Status SendCommand(std::string_view command, std::span<char> response, CommandOptions options);
```

## ⑥ 可编译小实验（20 分钟）

### 第一次做：先运行，再只改一件事

1. 在仓库根目录打开 [`examples/day-020/main.cpp`](../examples/day-020/main.cpp)，先读 `main()`，圈出输入、调用与结果检查。
2. 运行原版，把实际输出和退出状态记下来，再与本节预期对照。无输出也可能成功，必须结合退出码与断言判断。
3. 修改前先写预期；若失败，先读第一条编译错误或失败断言，再回到对应概念，不同时重写多个函数。

**本课小改动：** 给发送需求增加一条“空输入如何处理”的验收条件，再补对应测试；先写预期再改代码。

<details>
<summary>练习提示：卡住时再展开</summary>

把上面的执行步骤当作检查点；保留原版作为对照。若练习故意让编译或断言失败，请只在实验副本操作，解释失败后还原，不把负例混入日常通过用例。不要执行越界、悬空解引用或重复释放来“观察效果”。

</details>

Bounded Modem Command API：不使用异常，调用路径不动态分配；调用者提供固定输出缓冲区，timeout 显式传入。

完整源码：[main.cpp](../examples/day-020/main.cpp)。

```cpp
#include <array>
#include <cassert>
#include <chrono>
#include <iostream>
#include <span>
#include <string_view>

using namespace std::chrono_literals;

enum class Status { kOk, kTimeout, kIoError, kInvalidArgument };

struct CommandOptions {
  std::chrono::milliseconds timeout{1000ms};
};

class Transport {
public:
  virtual ~Transport() = default;
  virtual Status Exchange(std::string_view request, std::span<char> response,
                          std::chrono::milliseconds timeout) = 0;
};

class FakeTransport final : public Transport {
public:
  Status Exchange(std::string_view request, std::span<char> response,
                  std::chrono::milliseconds timeout) override {
    (void)request;
    if (timeout <= 0ms) return Status::kTimeout;
    constexpr std::string_view kReply = "OK";
    if (response.size() < kReply.size()) return Status::kInvalidArgument;
    for (std::size_t i = 0; i < kReply.size(); ++i) response[i] = kReply[i];
    return Status::kOk;
  }
};

class ModemSession {
public:
  explicit ModemSession(Transport& transport) : transport_(transport) {}

  Status SendCommand(std::string_view command, std::span<char> response, CommandOptions options) {
    if (command.empty() || response.empty() || options.timeout.count() <= 0) {
      return Status::kInvalidArgument;
    }
    return transport_.Exchange(command, response, options.timeout);
  }

private:
  Transport& transport_;
};

int main() {
  FakeTransport transport;
  ModemSession session{transport};
  std::array<char, 16> buf{};

  Status s = session.SendCommand("AT", buf, CommandOptions{500ms});
  assert(s == Status::kOk);

  Status bad = session.SendCommand("", buf, CommandOptions{500ms});
  assert(bad == Status::kInvalidArgument);

  std::cout << "Command exchanged successfully with result=" << buf.data() << '\n';
  return 0;
}
```

在仓库根目录运行：

```bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic examples/day-020/main.cpp -o /tmp/day-020
/tmp/day-020
```

## ⑦ 3 个常见坑（5 分钟）

- 一看到需求就创建大量类，类结构只是实现猜测而不是问题模型。

- timeout、buffer size、retry count 藏在实现内部，调用者看不到契约。

- 为“可扩展”提前引入 shared_ptr、复杂继承或动态注册，而当前需求没有证明需要这些成本。

## ⑧ 2 道检查题（5 分钟）

### 分层自测：从解释到判断

1. **理解：** 不看代码，用三句话复述本课示例的输入、关键步骤和结果。
2. **应用：** 说明第⑥节小改动的预期，以及实际结果是否符合预期。
3. **辨析：** 用例与类图谁应先出现？

<details>
<summary>辨析题参考答案与通过依据</summary>

通常先弄清目标和约束；类图是实现边界的一种表达，不能替代需求确认。

能运行只是第一步。只有能解释本课具体步骤、完成小改动，并说清一个不适用条件，才算完成本次自测；不清楚时回看第③节，不以阅读次数当作掌握证据。

</details>

### 原课检查题

- 为什么 std::span<char> 比 char* + 隐含容量更适合表达借用输出缓冲区？

- 若产品要求“SendCommand 最坏 20 ms 返回”，除函数正确性外，还必须审查哪些因素？提示：底层阻塞、锁、动态分配、日志和重试。

今日完成标准：先写出 5 条可测试需求，再画出 Application → ModemSession → Transport → Driver 的依赖方向，并能解释每一层为什么存在。
明日：继续 Chapter 4，学习设计抽象、耦合/内聚与依赖管理。

### 对照现有资料库

- [需求与约束贯穿实验](<../docs/engineering-learning-path.md>)。
- [系统架构资料：进阶对照](<../references/system-design-notes/content/33. Cpp System Architecture/index.zh.md>)。

先完成本课小实验，再查对照资料；专题中的线程、网络、板端或模式不是本课默认前置。以上为本项目已有讲解和工程对照，不冒充标准条文，也不表示所有示例已在目标板验证。
