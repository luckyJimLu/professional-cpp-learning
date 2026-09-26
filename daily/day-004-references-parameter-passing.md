# Day 04 · 引用、const 引用与参数传递

> 历史课程迁移自原 Gmail 正文；已转换为 Markdown。

**Chapter 1：引用、const 引用与参数传递**

今日目标：从 C 的“指针传参”习惯，迁移到 C++ 的“值 / 引用 / const 引用 / 指针分别表达不同语义”。

## ① 今日阅读范围（5分钟）

继续 Chapter 1，重点阅读 References、const、function parameters 相关内容。观察引用必须绑定对象、引用不表达所有权，以及 const T& 如何避免复制并限制修改。

## ② 昨日复习（5分钟）

- const 与 constexpr 的核心区别是什么？

- 为什么协议/硬件常量应使用具名 constexpr，而不是 magic number？

- static_assert() 相比运行期 assert() 有什么优势？

## ③ 核心概念（15分钟）

引用是对象的别名

```cpp
int retry_count {3};
int& retry_ref {retry_count};
retry_ref = 5;
```

const T&：大型只读对象常用形式

struct ModemConfig
```cpp
{
std::uint32_t baud_rate_bps {115200};
std::uint32_t timeout_ms {5000};
};

void PrintConfig(const ModemConfig& config)
{
```
// 借用、只读、不复制
```cpp
}
```

对于 int、bool、enum 等小型对象，通常直接按值传递更自然。

T& 表达“必须存在，而且会修改”

```cpp
void ResetRetryCount(std::uint8_t& retry_count)
{
retry_count = 0;
}
```

指针适合表达“可能为空”

```cpp
void SetLogger(Logger* logger);
```

如果 nullptr 有明确业务含义，指针比引用更自然。

引用不等于所有权

T& / const T& / T* -> 通常表示借用
unique_ptr<T> -> 后续用于表达唯一所有权

## ④ C 写法 vs 现代 C++（10分钟）

C：

```cpp
void modem_set_timeout(modem_config_t* config, uint32_t timeout_ms)
{
if (config == NULL) {
return;
}
config->timeout_ms = timeout_ms;
}
```

C++：如果 config 逻辑上不能为空，用引用直接表达约束：

```cpp
void SetTimeout(ModemConfig& config, std::uint32_t timeout_ms)
{
config.timeout_ms = timeout_ms;
}
```

## ⑤ 今日编码规范（10分钟）

MUST：借用对象时明确是否可空。 不可空借用优先 T& / const T&；可空借用使用 T* / const T*，并明确 nullptr 语义。

SHOULD：只读大型对象优先 const T&。

错误：

```cpp
void PrintConfig(ModemConfig config);
```

推荐：

```cpp
void PrintConfig(const ModemConfig& config);
```

MUST：接口表达意图。 裸指针不要暗示所有权转移。嵌入式中的 ISR、DMA 或共享对象还必须另外定义生命周期和同步策略。

## ⑥ Coding 实验（20分钟）

```cpp
#include <cstdint>
#include <iostream>
```

namespace modem
```cpp
{
```
struct Config
```cpp
{
std::uint32_t baud_rate_bps {115200};
std::uint32_t timeout_ms {5000};
std::uint8_t retry_count {3};
};

void SetTimeout(Config& config, std::uint32_t timeout_ms)
{
config.timeout_ms = timeout_ms;
}

void PrintConfig(const Config& config)
{
std::cout << "timeout = " << config.timeout_ms << " ms\n";
}
}

int main()
{
modem::Config config {};
modem::SetTimeout(config, 3000);
modem::PrintConfig(config);
}
```

编译：

g++ -std=c++20 -Wall -Wextra -Wconversion -Wpedantic day04.cpp -o day04
./day04

规范修复题

下面接口至少存在命名、类型、单位、可空性和 bool 参数语义问题：

```cpp
void update(ModemConfig* cfg, int timeout, bool reset);
```

建议拆为：

```cpp
void SetTimeout(ModemConfig& config, std::uint32_t timeout_ms);
void ResetConfig(ModemConfig& config);
```

## ⑦ 三个常见坑（5分钟）

- 引用不解决对象生命周期，仍可能产生悬空引用。

- 不要机械地给所有小型参数使用 const 引用。

- 看到裸指针要问：可空吗？谁拥有？能修改吗？生命周期由谁保证？

## ⑧ 检查题（5分钟）

Q1：函数只读取较大的 ModemConfig 且不能为空，优先选择：

A. ModemConfig* B. ModemConfig C. const ModemConfig& D. void*

Q2：如果 nullptr 明确表示“当前没有 Logger”，哪个接口更自然？

A. SetLogger(Logger&) B. SetLogger(Logger*) C. SetLogger(Logger) D. SetLogger(void*)

今日完成标准

T 值语义 / 独立副本
const T& 必须存在、借用、只读
T& 必须存在、借用、可修改
const T* / T* 借用且可能为空

今日 Code Review 肌肉记忆：每看到裸指针，都问一次“它为什么必须是指针？”

明日预告：Day 5 — 函数重载、默认参数与 [[nodiscard]]：设计更难误用的嵌入式接口。
