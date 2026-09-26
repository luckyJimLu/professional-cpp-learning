# Day 20 · Chapter 4：需求、用例与设计决策

> 历史课程迁移自原 Gmail 正文；已转换为 Markdown。

**Chapter 4：需求、用例与设计决策**

今日目标：从“先写类”切换到“先明确系统要做什么、边界在哪里、哪些约束必须显式化”。以嵌入式 Modem 子系统为例，把需求转成可测试接口与设计决策。

## ① 今日章节与建议阅读范围（5 分钟）

继续 Chapter 4 — Designing Professional C++ Programs 中程序设计过程、需求、设计与工程权衡相关内容。阅读时重点观察：不要过早进入实现；区分功能需求与质量属性；设计应服务于可维护性、可测试性与变化。

## ② 昨日复习 3 问（5 分钟）

- 为什么 ModemSession 不应该直接访问 UART/MMIO？

- Policy 与 Mechanism 分离解决的主要变化问题是什么？

- FakeTransport 为什么能降低测试成本？

## ③ 核心概念讲解（15 分钟）

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
Status SendCommand(std::string_view command,
std::span<char> response,
CommandOptions options);
```

## ⑥ 可编译小实验（20 分钟）

Bounded Modem Command API：不使用异常，调用路径不动态分配；调用者提供固定输出缓冲区，timeout 显式传入。

```cpp
#include <chrono>
#include <span>
#include <string_view>
```

using namespace std::chrono_literals;

enum class Status { kOk, kTimeout, kIoError, kInvalidArgument };

struct CommandOptions {
std::chrono::milliseconds timeout{1000ms};
};

class Transport {
public:
virtual ~Transport() = default;
virtual Status Exchange(std::string_view request,
std::span<char> response,
std::chrono::milliseconds timeout) = 0;
};

class ModemSession {
public:
explicit ModemSession(Transport& transport) : transport_(transport) {}

Status SendCommand(std::string_view command,
std::span<char> response,
CommandOptions options) {
if (command.empty() || response.empty() || options.timeout.count() <= 0) {
return Status::kInvalidArgument;
}
return transport_.Exchange(command, response, options.timeout);
}

private:
Transport& transport_;
};

练习 A：实现 FakeTransport，分别测试成功、超时、I/O 错误。

练习 B — Code Review 修复：重构 int modem_cmd(int port, const char* cmd, char* out, int size, int wait, bool retry);。要求 timeout 有单位；retry 不再是含义不清的 bool；错误不能用 -1；输出缓冲区有边界；实时路径不增加动态分配。

练习 C：写 5 条可测试需求，例如“timeout 到期后必须在有限时间内返回 Status::kTimeout”。

```bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic main.cpp -o modem_day20
```

## ⑦ 3 个常见坑（5 分钟）

- 一看到需求就创建大量类，类结构只是实现猜测而不是问题模型。

- timeout、buffer size、retry count 藏在实现内部，调用者看不到契约。

- 为“可扩展”提前引入 shared_ptr、复杂继承或动态注册，而当前需求没有证明需要这些成本。

## ⑧ 2 道检查题（5 分钟）

- 为什么 std::span<char> 比 char* + 隐含容量更适合表达借用输出缓冲区？

- 若产品要求“SendCommand 最坏 20 ms 返回”，除函数正确性外，还必须审查哪些因素？提示：底层阻塞、锁、动态分配、日志和重试。

今日完成标准：先写出 5 条可测试需求，再画出 Application → ModemSession → Transport → Driver 的依赖方向，并能解释每一层为什么存在。
明日：继续 Chapter 4，学习设计抽象、耦合/内聚与依赖管理。
