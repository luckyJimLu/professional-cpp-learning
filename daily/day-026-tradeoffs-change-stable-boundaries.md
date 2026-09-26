# Day 26 · 设计取舍、变化管理与稳定边界

> 历史课程迁移自原 Gmail 正文；已转换为 Markdown。

**Chapter 4：设计取舍、变化管理与稳定边界**

今天继续 Chapter 4。目标不是寻找“永远正确”的架构，而是识别变化轴，把易变实现留在稳定接口之后，并用证据记录设计取舍。

## ① 今日章节与建议阅读范围（5分钟）

继续阅读 Chapter 4 · Designing Professional C++ Programs 中关于设计、抽象、复用和设计决策的内容。重点问：哪些需求最可能变化？哪些接口应保持稳定？一次设计决策带来了什么成本？

## ② 昨日复习 3 问（5分钟）

- 为什么接口契约应包含 timeout、容量、错误语义，而不仅是函数名？

- 为什么 buffer 大小应通过测量和约束决定？

- Decision / Evidence / Consequence 分别解决什么问题？

## ③ 核心概念讲解（15分钟）

稳定边界不等于抽象越多越好。 抽象的价值是隔离真正可能变化的东西。嵌入式系统常见变化轴包括 UART/USB/SPI transport、RTOS/裸机、modem vendor、板级 MMIO、日志后端与 timeout 策略。

让依赖指向更稳定的一侧。 业务层依赖“发送命令”的能力，而不是 UART 寄存器布局：Application → ModemSession → ITransport → UartTransport → BSP。

Policy 与 mechanism 分离。 重试次数、等待多久属于 policy；如何把 bytes 写入 UART 属于 mechanism。

设计是 trade-off。 虚接口便于运行时替换但存在间接调用；模板可以静态绑定但可能增加编译依赖和代码膨胀。应依据 Flash/RAM、实时性、测试和维护成本选择。

## ④ C 写法 vs 现代 C++ 写法（10分钟）

```c
int modem_send(int type, const char* data, int len) {
if (type == 0) return uart_send(data, len);
if (type == 1) return usb_send(data, len);
return -1;
}
```

上层知道 transport 类型，每新增一种 transport 都修改核心函数。

```cpp
class ITransport {
public:
virtual ~ITransport() = default;
virtual Status Send(std::span<const std::byte> data,
std::chrono::milliseconds timeout) = 0;
};
```

class ModemSession {
public:
explicit ModemSession(ITransport& transport) : transport_{transport} {}
private:
ITransport& transport_; // borrowed, non-owning
};

## ⑤ 今日编码规范（10分钟）

- MUST：平台差异集中隔离，BSP/MMIO/RTOS/vendor API 不泄漏到业务层。

- SHOULD：接口保持小而稳定，不为“以后也许会用”提前增加 API。

- MUST：所有权和借用明确。非空借用优先使用引用，不因依赖注入而滥用 shared_ptr。

违反规范

```cpp
std::shared_ptr<UartDriver> g_uart;
class Modem {
public:
int Send(const char* p, int n, bool retry, bool log) {
return g_uart->Write(p, n);
}
};
```

推荐写法

```cpp
struct SendOptions {
std::chrono::milliseconds timeout{1000};
std::uint8_t max_retries{0};
};
```

class ModemSession {
public:
explicit ModemSession(ITransport& transport) : transport_{transport} {}
Status Send(std::span<const std::byte> data,
const SendOptions& options);
private:
ITransport& transport_;
};

嵌入式注意：抽象不能掩盖无界等待或 heap allocation。硬实时路径必须能审计最坏执行时间和内存行为。

## ⑥ 可编译的小实验 / 代码练习（20分钟）

实现可在 UART 与 Fake transport 之间替换的发送层，发送路径不动态分配。

```cpp
#include <array>
#include <chrono>
#include <cstddef>
#include <cstdint>
#include <span>
using namespace std::chrono_literals;
```

enum class Status { kOk, kTimeout, kIoError, kInvalidArgument };

class ITransport {
public:
virtual ~ITransport() = default;
virtual Status Send(std::span<const std::byte> data,
std::chrono::milliseconds timeout) = 0;
};

class FakeTransport final : public ITransport {
public:
Status Send(std::span<const std::byte> data,
std::chrono::milliseconds timeout) override {
if (timeout <= 0ms || data.size() > last_frame_.size())
return Status::kInvalidArgument;
for (std::size_t i = 0; i < data.size(); ++i) last_frame_[i] = data[i];
last_size_ = data.size();
return Status::kOk;
}
[[nodiscard]] std::size_t LastSize() const { return last_size_; }
private:
std::array<std::byte, 64> last_frame_{};
std::size_t last_size_{0};
};

struct SendOptions { std::chrono::milliseconds timeout{1000}; };

class ModemSession {
public:
explicit ModemSession(ITransport& transport) : transport_{transport} {}
Status Send(std::span<const std::byte> command, const SendOptions& options) {
if (command.empty()) return Status::kInvalidArgument;
return transport_.Send(command, options.timeout);
}
private:
ITransport& transport_;
};

int main() {
FakeTransport transport;
ModemSession modem{transport};
constexpr std::array command{std::byte{'A'}, std::byte{'T'}, std::byte{'\r'}};
const Status status = modem.Send(command, SendOptions{500ms});
return status == Status::kOk && transport.LastSize() == command.size() ? 0 : 1;
}

```bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic day26.cpp -o day26
./day26
```

练习 A：增加 UartTransport，但不修改 ModemSession。

练习 B（规范修复）：重构 int Send(int type, char* p, int len, int timeout, bool retry);：去掉 magic type、裸长度组合和弱类型参数；明确 timeout 单位与只读数据；使用强类型错误；不得新增 heap allocation。

练习 C：比较虚接口与模板静态注入对 Flash、测试替换、编译依赖、间接调用的影响。没有测量数据时，不声称哪一个性能更高。

## ⑦ 3 个常见坑（5分钟）

- 为了低耦合制造几十个接口——抽象也有成本。

- 把依赖注入等同于 shared_ptr——DI 与 ownership 是两个问题。

- 接口隐藏实时风险——漂亮的 Send() 若无限阻塞或分配内存仍不合格。

## ⑧ 2 道检查题（5分钟）

- 为什么把 UART/MMIO 类型直接暴露给 ModemSession 会扩大硬件变化的影响范围？

- ITransport 虚接口与模板静态注入都可工作时，你会收集哪些证据再决定？

今日完成标准：能够指出系统中的一个变化轴，建立稳定边界，并明确说明该抽象的成本，而不只是说“这样更面向对象”。
下一节 Day 27：Chapter 4 收束——从需求、抽象、复用到可演进设计，为 Chapter 5 Designing with Classes 建立过渡。
