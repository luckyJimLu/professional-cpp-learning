# Day 25 · 设计文档、接口契约与原型验证

> 历史课程迁移自原 Gmail 正文；已转换为 Markdown。

**Chapter 4 · Designing Professional C++ Programs
主题：设计文档、接口契约与原型验证
目标：把“设计”从脑中的想法变成可审查、可验证的工程契约。今天继续 Chapter 4，不进入 Chapter 5。
## ① 今日章节与建议阅读范围（5分钟）

阅读 Chapter 4 中围绕 professional program design、接口/抽象、设计决策和验证思路的相关段落。记录：系统必须保证什么？哪些约束属于接口契约？哪些风险必须先做 prototype 验证？

## ② 昨日复习 3 问（5分钟）

- 高内聚、低耦合分别解决什么问题？

- 为什么依赖注入 ITransport& 不代表所有权转移？

- 为什么 Application 不应该直接依赖 UART 寄存器或 BSP 细节？

答案：高内聚让模块围绕一个职责变化，低耦合减少变化传播；引用通常表达借用；硬件细节应被 Driver/HAL 边界隔离。

## ③ 核心概念讲解（15分钟）

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
virtual Status Send(std::span<const std::byte> data,
const SendOptions& options) = 0;
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
Status Transfer(std::span<const std::byte> data,
const TransferOptions& options);
```

嵌入式注意：不要为了抽象自动引入 heap、shared_ptr 或无界容器。抽象同样要接受 latency、Flash/RAM 和 worst-case behavior 审计。

## ⑥ 可编译小实验（20分钟）

实现固定容量 Modem command buffer：无异常、运行路径无动态分配。

```cpp
#include <array>
#include <cstddef>
#include <iostream>
#include <span>
```

```cpp
enum class Status { kOk, kEmptyCommand, kCommandTooLarge };
```

```cpp
class CommandBuffer {
```
public:
```cpp
static constexpr std::size_t kCapacity = 64;

Status Store(std::span<const std::byte> command) {
if (command.empty()) return Status::kEmptyCommand;
if (command.size() > buffer_.size()) return Status::kCommandTooLarge;
```
for (std::size_t i = 0; i < command.size(); ++i) buffer_[i] = command[i];
```cpp
size_ = command.size();
return Status::kOk;
}
```

[[nodiscard]] std::span<const std::byte> View() const {
```cpp
return {buffer_.data(), size_};
}
```

private:
```cpp
std::array<std::byte, kCapacity> buffer_{};
std::size_t size_{0};
};

int main() {
const std::array command{std::byte{'A'}, std::byte{'T'}};
CommandBuffer buffer;
if (buffer.Store(command) != Status::kOk) return 1;
std::cout << "stored bytes: " << buffer.View().size() << '\n';
}
```

```bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic day25.cpp -o day25
./day25
```

练习：测试 empty、64 bytes、65 bytes；把容量改为 8/32/128 并记录 sizeof(CommandBuffer)。修复下面代码：

C++ · 违反规范

#define BUF_SIZE 128
```cpp
int Send(char* p, int len, int wait, bool retry) {
char* tmp = new char[BUF_SIZE];
```
// ...
```cpp
return -1;
}
```

要求改为：std::array + std::span + std::chrono::milliseconds + SendOptions + enum class Status，并保证实时路径不 new。

Prototype：针对最大 AT command 256 bytes 的需求，测量 64/128/256-byte 固定 buffer 的 RAM 成本，把结果写成一条 Decision / Evidence / Consequence 记录。

## ⑦ 3 个常见坑（5分钟）

- 把函数签名误认为完整接口契约。

- prototype 未经清理逐渐变成 production code。

- 没有 benchmark/WCET 证据就提前采用复杂对象池、手写容器或 lock-free。

## ⑧ 2 道检查题（5分钟）

Q1：哪些契约应优先进入类型系统，哪些仍需文档？
Q2：什么时候应先做 prototype？

答案：单位、离散状态、buffer 范围、明显 borrow/non-null 关系尽量类型化；线程安全、调用时序、硬件副作用等仍需契约说明。工具链、性能、内存、实时性或硬件行为存在高成本未知时，应先做最小 prototype。

今日完成标准：在写 class 之前，能够先写一页轻量设计说明，并把关键约束分别落实到“类型、代码检查、文档、测试”。

Day 26：继续 Chapter 4——设计取舍、变化管理与稳定边界，为 Chapter 5 Class Design 做准备。
