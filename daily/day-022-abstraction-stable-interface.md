# Day 22 · 抽象：稳定接口与隐藏实现

> 历史课程迁移自原 Gmail 正文；已转换为 Markdown。

**Chapter 4 · 抽象：稳定接口与隐藏实现**

今天继续 Designing Professional C++ Programs。主教材把 abstraction 与 reuse 作为有效 C++ 设计的两条基本主线。今天只聚焦 abstraction，并用嵌入式 Modem/Transport 例子练习如何把硬件实现细节藏在稳定接口之后。

## ① 今日章节与建议阅读范围（5分钟）

阅读 Chapter 4 的 Two Rules for Your Own C++ Designs → Abstraction → Benefiting from Abstraction → Incorporating Abstraction in Your Design。重点问自己：调用者真正需要知道什么？哪些实现选择不应该成为 API 契约？

## ② 昨日复习 3 问（5分钟）

- 功能需求回答 what 还是 how？答：what；设计负责 how。

- 为什么 timeout 应进入接口契约？它是阻塞行为的可观察约束，嵌入式系统不能隐藏为无限等待。

- 为什么 Application 不应直接调用 UART/MMIO？否则业务策略与具体硬件耦合，测试、移植、替换成本上升。

## ③ 核心概念讲解（15分钟）

Abstraction 的核心不是“多写一层 class”，而是把稳定能力暴露给调用者，把可能变化的实现藏起来。ModemSession 需要的是 Send/Receive 能力，而不是 UART 寄存器、DMA channel 或 ring-buffer layout。

好的抽象边界有三个特征：调用点只表达业务意图；内部表示可改变而不迫使调用者修改；约束在边界内集中维护。例如 Transport 从 polling UART 换成 DMA UART，只要契约不变，ModemSession 就不应改变。

抽象也不等于继承。函数、class、template、concept、type-erasure 都能形成抽象。今天使用简单的 class/interface 思维；继承会在后续章节系统学习。

“隐藏实现”也不是机械增加 getter/setter。RingBuffer 若直接暴露 write_index，调用者可以破坏 invariant；更好的 API 是 Push()/Pop()/Size()，让索引环绕规则只存在一处。

## ④ C 写法 vs 现代 C++ 写法（10分钟）

```c
int modem_send(void* uart, const unsigned char* data,
unsigned int len, int timeout_ms);
```

调用者必须知道 uart handle、裸 buffer/length 配对、timeout 单位和错误码约定。

```cpp
enum class Status { kOk, kTimeout, kIoError, kInvalidArgument };
struct SendOptions {
std::chrono::milliseconds timeout{1000};
};
class Transport {
public:
virtual ~Transport() = default;
virtual Status Send(std::span<const std::byte> data,
const SendOptions& options) = 0;
};
```

## ⑤ 今日编码规范（10分钟）

SHOULD：接口尽量小。 只暴露调用者真正需要的 API，实现细节保持 private。
MUST：避免可写全局状态。 硬件实例、缓冲区和状态应封装或显式注入。
MUST/SHOULD：显式表达意图。 状态用 enum class，时间/长度用有单位的类型或名称。

违反规范

extern int g_uart_port;
class Modem {
public:
int uart_fd;
unsigned char* rx_buf;
int Send(unsigned char* p, int n, int timeout);
};

推荐写法

class ModemSession {
public:
explicit ModemSession(Transport& transport) : transport_(transport) {}
Status Execute(std::string_view command,
std::chrono::milliseconds timeout);
private:
Transport& transport_; // borrowed, non-owning
};
嵌入式注意：抽象层不能成为“性能免责层”。硬实时路径仍需审计 virtual dispatch、动态分配、锁、日志和最坏执行时间。不要为了架构漂亮而增加无法证明价值的层次。
⑥ 可编译的小实验 / 代码练习（20分钟）

目标：实现一个不依赖真实 UART 的 ModemSession，并证明 transport 实现可替换。

```cpp
#include <chrono>
#include <cstddef>
#include <iostream>
#include <span>
#include <string_view>
```

using namespace std::chrono_literals;

enum class Status { kOk, kTimeout, kIoError, kInvalidArgument };
struct SendOptions { std::chrono::milliseconds timeout{1000}; };

class Transport {
public:
virtual ~Transport() = default;
virtual Status Send(std::span<const std::byte> data,
const SendOptions& options) = 0;
};

class FakeTransport final : public Transport {
public:
Status Send(std::span<const std::byte> data,
const SendOptions& options) override {
if (data.empty()) return Status::kInvalidArgument;
if (options.timeout <= 0ms) return Status::kTimeout;
++send_count_;
last_size_ = data.size();
return Status::kOk;
}
[[nodiscard]] std::size_t SendCount() const { return send_count_; }
[[nodiscard]] std::size_t LastSize() const { return last_size_; }
private:
std::size_t send_count_{0};
std::size_t last_size_{0};
};

class ModemSession {
public:
explicit ModemSession(Transport& transport) : transport_(transport) {}
Status Execute(std::string_view command,
std::chrono::milliseconds timeout) {
if (command.empty()) return Status::kInvalidArgument;
const auto* begin = reinterpret_cast<const std::byte*>(command.data());
const std::span<const std::byte> bytes{begin, command.size()};
return transport_.Send(bytes, SendOptions{.timeout = timeout});
}
private:
Transport& transport_;
};

int main() {
FakeTransport transport;
ModemSession modem{transport};
const Status status = modem.Execute("AT+CSQ\r\n", 500ms);
if (status != Status::kOk) return 1;
std::cout << "send_count=" << transport.SendCount()
<< ", bytes=" << transport.LastSize() << '\n';
return 0;
}

```bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic day22.cpp -o day22
./day22
```

练习 A：FakeTransport 改为始终返回 kTimeout，验证 ModemSession 无需修改。
练习 B：为 Execute() 增加空命令边界测试。
练习 C — 修复违反规范：把公开 fd/buffer、magic timeout 的 Modem 类重构为显式依赖、强类型 timeout、明确借用/所有权和统一 Status。验收：调用者不能直接操作 UART fd；实时路径不新增动态分配。

## ⑦ 3 个常见坑（5分钟）

- 加 interface 就等于低耦合：接口若仍暴露 UART fd、DMA channel，耦合只是换了位置。

- Getter/Setter 泛滥：private + 全量可写 setter 仍可能破坏 invariant；优先暴露业务动作。

- 过度抽象：没有变化轴、测试边界或契约价值时，不要机械创建五层 wrapper。

## ⑧ 2 道检查题（5分钟）

Q1：ModemSession 返回 UartDmaDescriptor 是好的抽象吗？
答：通常不是，它泄漏底层 UART/DMA 实现，使替换 transport 时上层也必须变化。

Q2：为什么 std::span<const std::byte> 比 const uint8_t* + size_t 更适合借用 buffer？
答：pointer 与长度绑定成非拥有 view，const 表达只读借用，减少错配；但底层生命周期仍必须由调用者保证。

今日完成标准：你能在自己的项目中画出一条边界，并回答“接口承诺什么、实现隐藏什么、谁拥有资源、哪些约束必须由类型表达”。

Day 23：继续 Chapter 4，进入 Reuse——什么时候复用标准库/第三方库，什么时候自己实现，以及嵌入式项目如何评估依赖成本。
