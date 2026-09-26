# Day 30 · Composition：用对象组合分配职责

> 历史课程迁移自原 Gmail 正文；已转换为 Markdown。

**Chapter 5 · Designing with Classes**

Composition：用对象组合分配职责

今日目标：从“一个类做所有事情”转向“对象各司其职，再通过 has-a 关系协作”。重点理解组合、借用依赖与所有权不是同一个概念，并把它应用到 Modem/Driver 结构中。

## ① 今日章节与建议阅读范围（5分钟）

继续 Chapter 5 · Designing with Classes。围绕类之间的关系、职责分配、对象作为成员，以及接口如何表达协作关系阅读。重点问：对象是否真正拥有另一个对象？只是借用服务吗？生命周期是否天然绑定？

## ② 昨日复习 3 问（5分钟）

- 为什么“构造完成即有效”有利于维护 invariant？

- 单参数 constructor 为什么通常应 explicit？

- 为什么可能失败、阻塞的硬件启动过程通常不适合偷偷放进 constructor？

参考：constructor 建立对象自身不变量；explicit 防止意外转换；硬件启动属于运行期可恢复操作，应通过 Start/Open 等显式 API 返回统一 Status。

## ③ 核心概念讲解（15分钟）

### 3.1 从“类”转向“对象关系”

若 ModemSession 同时负责 UART 寄存器、AT 编码、超时、重试、状态机和日志，很快会成为 God Object。更好的边界是：

Text
Application → ModemSession → ITransport → UartTransport → HAL

ModemSession 负责 modem 会话策略；Transport 负责字节传输；HAL 负责硬件细节。

### 3.2 Composition：has-a

当生命周期天然绑定时，可直接把子对象作为成员。没有裸 new/delete，生命周期由语言管理。

C++
class PacketQueue {
std::array<Packet, 8> packets_;
};

### 3.3 has-a 不一定等于 owns-a

ModemSession 需要 Transport，不代表必须拥有 Transport。若 Transport 生命周期由平台层管理，可以保存引用，表达 borrowing。

C++
explicit ModemSession(ITransport& transport) : transport_(transport) {}

### 3.4 Composition 与 inheritance

- “X 是 Y 的一种”才考虑 is-a / inheritance。

- “X 使用/包含 Y”优先 composition。

- 只为了复用实现，不要急着继承。

## ④ C 写法 vs 现代 C++ 写法（10分钟）

传统 C：依赖藏在全局状态。

C
static UartHandle* g_uart;
int modem_init(UartHandle* uart) { g_uart = uart; return 0; }
int modem_send(const uint8_t* data, size_t size) {
return uart_write(g_uart, data, size);
}

现代 C++：依赖在接口中可见。

C++
class ITransport {
public:
virtual ~ITransport() = default;
virtual Status Write(std::span<const std::uint8_t> data,
std::chrono::milliseconds timeout) = 0;
};

class ModemSession {
public:
explicit ModemSession(ITransport& transport) : transport_(transport) {}
private:
ITransport& transport_; // borrowed
};

## ⑤ 今日编码规范（10分钟）

MUST：非拥有访问用引用/裸指针，并明确生命周期；SHOULD：接口尽量小；MUST：实时路径避免动态分配。

违反规范：

C++
class Modem {
public:
Modem(std::shared_ptr<Uart> uart) : uart_(std::move(uart)) {}
private:
std::shared_ptr<Uart> uart_;
};

若 Modem 根本不参与 UART 所有权，shared_ptr 制造了虚假生命周期语义。

推荐：

C++
class Modem {
public:
explicit Modem(Uart& uart) : uart_(uart) {}
private:
Uart& uart_;
};

## ⑥ 可编译小实验（20分钟）

实现可替换 Transport 的 ModemSession：发送路径无 heap、依赖为 borrowing、timeout 强类型化。

C++
#include <array>
#include <cassert>
#include <chrono>
#include <cstddef>
#include <cstdint>
#include <span>

using namespace std::chrono_literals;

enum class Status { kOk, kInvalidArgument, kBufferTooSmall, kTimeout };

class ITransport {
public:
virtual ~ITransport() = default;
virtual Status Write(std::span<const std::uint8_t> data,
std::chrono::milliseconds timeout) = 0;
};

class FakeTransport final : public ITransport {
public:
Status Write(std::span<const std::uint8_t> data,
std::chrono::milliseconds timeout) override {
if (timeout <= 0ms) return Status::kTimeout;
if (data.size() > buffer_.size()) return Status::kBufferTooSmall;
size_ = data.size();
for (std::size_t i = 0; i < size_; ++i) buffer_[i] = data[i];
return Status::kOk;
}
[[nodiscard]] std::size_t Size() const { return size_; }
private:
static constexpr std::size_t kCapacity = 64;
std::array<std::uint8_t, kCapacity> buffer_{};
std::size_t size_ = 0;
};

class ModemSession {
public:
explicit ModemSession(ITransport& transport) : transport_(transport) {}
Status Send(std::span<const std::uint8_t> data,
std::chrono::milliseconds timeout) {
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
}

Bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic day30.cpp -o day30
./day30

练习 A：增加 kNotStarted 和强类型 session state，Start 成功前禁止 Send。

练习 B（规范修复）：重构 class Modem : public UartDriver { bool Send(uint8_t*, int, bool, bool); };：禁止错误继承；使用窄 Transport；span；Options/enum class；显式 timeout；统一 Status；Send 无动态分配。

练习 C：比较 ITransport&、unique_ptr<ITransport>、shared_ptr<ITransport> 的生命周期语义，并为 BSP 唯一 UART、运行期创建 USB transport、真正共享服务选择合适表达。

## ⑦ 3 个常见坑（5分钟）

- 为了代码复用而继承：继承首先是语义关系。

- 所有依赖都 shared_ptr：它表达共享所有权，不是通用依赖容器。

- 组合后仍暴露底层全部接口：GetUart().WriteRegister() 会击穿抽象边界。

## ⑧ 2 道检查题（5分钟）

Q1：为什么 ITransport& 比 ITransport* 更适合“transport 必须存在”的契约？

Q2：若对象独占运行期创建的 transport 且负责销毁，成员应优先引用、unique_ptr 还是 shared_ptr？

答案：引用排除 nullptr 并表达 required non-owning dependency；独占所有权优先 unique_ptr。
今日完成标准：看到两个类时，先问 is-a、has-a、uses-a、owns-a，而不是先问“要不要继承”。
C++23 支持提示：今天使用的 span、chrono、array、enum class 并不依赖最新 C++23 库特性；嵌入式工具链仍应确认标准库配置。

Day 31：继续 Chapter 5，学习对象所有权、生命周期与资源管理边界。
