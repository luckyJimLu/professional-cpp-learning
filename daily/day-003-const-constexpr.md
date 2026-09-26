# Day 03 · const、constexpr 与编译期思维

> 历史课程迁移自原 Gmail 正文；已转换为 Markdown。

**Chapter 1 · const、constexpr 与编译期思维
今日目标：把“这个值不会变”升级为由类型系统和编译器验证的约束，并逐步消除嵌入式代码中的 magic number。
## ① 今日阅读范围 · 5 分钟

继续 Chapter 1 中与 const、constexpr、常量表达式、类型与初始化相关的部分。重点区分：const 表示对象不可通过当前接口修改；constexpr 进一步允许值进入常量表达式并鼓励编译期求值。

## ② 昨日复习 · 5 分钟

- 为什么 int x{value}; 更容易暴露窄化转换？

- static_cast 为什么更适合 code review？

- 协议规定 32-bit 无符号字段时，为什么 std::uint32_t 更明确？

## ③ 核心概念 · 15 分钟

1. const：把“不修改”写进接口

const std::uint32_t timeout_ms {5000};
void PrintConfig(const ModemConfig& config);

这表达“借用 config，并且不修改它”，比注释约定更可靠。

2. constexpr：编译期常量语义

constexpr std::uint32_t kDefaultTimeoutMs {5000U};
constexpr std::size_t kRxBufferSize {512U};
std::array<std::uint8_t, kRxBufferSize> rx_buffer {};

3. constexpr 函数 + static_assert

constexpr std::uint32_t SecondsToMs(std::uint32_t seconds)
{
return seconds * 1000U;
}
constexpr auto kBootTimeoutMs = SecondsToMs(5U);
static_assert(kBootTimeoutMs == 5000U);

当输入是常量表达式时，纯计算可以前移到编译期；static_assert 则把错误挡在构建阶段。

4. const 不等于 constexpr

std::uint32_t ReadTimeoutFromNvram();
const std::uint32_t timeout_ms {ReadTimeoutFromNvram()};

它初始化后不变，但值来自运行期，因此不是编译期常量。

## ④ C 写法 vs 现代 C++ · 10 分钟

C 风格

#define MODEM_TIMEOUT 5000
#define RX_BUF_SIZE 512
int calc_timeout(int retry) { return MODEM_TIMEOUT * retry; }

现代 C++

namespace modem {
constexpr std::uint32_t kDefaultTimeoutMs {5000U};
constexpr std::size_t kRxBufferSize {512U};
constexpr std::uint32_t CalculateTimeoutMs(std::uint32_t retry_count)
{
return kDefaultTimeoutMs * retry_count;
}
static_assert(CalculateTimeoutMs(3U) == 15000U);
}

## ⑤ 今日编码规范 · 10 分钟

MUST：语义常量使用 kPascalCase；SHOULD：单位进入名称；SHOULD：可静态检查的约束优先交给类型系统、constexpr、编译告警和静态分析。

错误：

const int timeout = 5000;
if (elapsed_ms > 5000U) { ResetModem(); }

推荐：

constexpr std::uint32_t kResponseTimeoutMs {5000U};
if (elapsed_ms > kResponseTimeoutMs) { ResetModem(); }

## ⑥ Coding 实验 · 20 分钟

#include <array>
#include <cstddef>
#include <cstdint>
#include <iostream>

namespace modem {
constexpr std::uint32_t kDefaultTimeoutMs {5000U};
constexpr std::uint32_t kMaxRetryCount {3U};
constexpr std::size_t kRxBufferSize {512U};

constexpr std::uint32_t CalculateTotalTimeoutMs(std::uint32_t retry_count)
{
return kDefaultTimeoutMs * retry_count;
}

static_assert(kRxBufferSize >= 256U);
static_assert(CalculateTotalTimeoutMs(kMaxRetryCount) == 15000U);

struct Config {
std::uint32_t timeout_ms {kDefaultTimeoutMs};
std::uint32_t retry_count {kMaxRetryCount};
};

void PrintConfig(const Config& config)
{
std::cout << "timeout_ms = " << config.timeout_ms << '\n';
}
} // namespace modem

int main()
{
std::array<std::uint8_t, modem::kRxBufferSize> rx_buffer {};
const modem::Config config {};
modem::PrintConfig(config);
std::cout << rx_buffer.size() << '\n';
}

编译：

g++ -std=c++20 -Wall -Wextra -Wconversion -Wpedantic day03.cpp -o day03
./day03

实验 A：把 buffer 改为 500，并用 static_assert 检查其必须为 2 的幂。
实验 B：创建运行期读取的 const 超时值，尝试把它作为模板参数，理解为何失败。

规范修复题：把下面代码改为无不必要宏、函数 PascalCase、变量 snake_case、常量 kPascalCase、单位明确、无 magic number、可编译期计算。

#define TIMEOUT 5000
#define SIZE 512
int calc(int n) { return TIMEOUT * n; }
void wait_modem(int t) { if (t > 5000) { } }

## ⑦ 3 个常见坑 · 5 分钟

- 把所有 const 都理解成编译期常量。

- 为了“性能”到处加 constexpr；首要价值是表达约束，性能仍需测量。

- 用宏定义硬件/协议常量却忽略类型和作用域。

## ⑧ 检查题 · 5 分钟

Q1：固定 RX buffer 大小最适合：A int size=512；B 运行期 const；C constexpr std::size_t kRxBufferSize{512U}；D 宏。

Q2：static_assert 对嵌入式配置的主要价值：A 自动减 RAM；B 把部分配置错误提前到编译期；C 替代所有运行期错误；D 自动修复越界。

今日完成标准

能解释 const、constexpr、static_assert 的区别；能把 C 宏常量改成有类型、有作用域、有单位语义的 C++ 常量。

明日预告：Day 4 — 引用、指针、nullptr 与接口语义：如何在函数签名里表达“不能为空”“可能为空”“只是借用”。
