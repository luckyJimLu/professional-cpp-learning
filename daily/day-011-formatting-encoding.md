# Day 11 · 字符串格式化、字符编码与嵌入式文本边界

> 历史课程迁移自原 Gmail 正文；已转换为 Markdown。

字符串格式化、字符编码与嵌入式文本边界

**Chapter 2 · Working with Strings and String Views**

今天继续 Chapter 2。在已经掌握 std::string / std::string_view 的拥有与借用模型后，进一步理解格式化、字符类型与文本边界。重点不是“把字符串拼出来”，而是建立适合 Modem / 日志 / 协议代码的可审查文本处理方式。

## ① 今日章节与建议阅读范围 · 5分钟

继续 Chapter 2 中字符串格式化、字符类型/编码以及相关字符串工具内容。阅读时重点回答：格式化结果是否拥有内存？输入文本采用什么编码？协议字节与人类文本是否应该混用同一种抽象？

## ② 昨日复习 3 问 · 5分钟

- 为什么 std::string_view 不应该返回对局部 std::string 的视图？

- remove_prefix() 为什么是零拷贝操作？

- 为什么协议数字解析通常优先 std::from_chars 而不是 atoi？

## ③ 核心概念 · 15分钟

格式化 ≠ 字符串拼接

连续 operator+ 会把格式散落在控制流里，并可能产生临时对象。C++20/23 的 std::format（工具链支持时）能集中表达格式。但嵌入式工程必须继续问：是否允许动态分配？ROM/RAM 成本多少？最坏时延是多少？

```cpp
const std::string message = std::format("rssi={} dBm, retry={}", rssi_dbm, retry_count);
```

字符不等于字节

协议 payload 本质上可能是二进制字节。二进制数据更适合 std::byte / std::uint8_t 与 std::span；文本接口与二进制接口分离，可避免编码、\0 与符号扩展问题混进协议逻辑。

编码是接口契约

std::string 只是 char 序列，并不自动保证 UTF-8。工程接口应明确编码约定。

## ④ C 写法 vs 现代 C++ · 10分钟

风险较高的 C 风格：

```c
char log_buf[64];
sprintf(log_buf, "RSSI=%d, retry=%u", rssi, retry);
```

现代 C++（非实时且工具链支持）：

```cpp
const std::string message = std::format(
"RSSI={} dBm, retry={}", rssi_dbm, retry_count);
```

固定缓冲区边界场景仍可使用 snprintf，但应封装在边界层并检查返回值。

## ⑤ 今日编码规范 · 10分钟

MUST：硬实时路径禁止无界操作；std::string/std::format 可能涉及动态内存，不能未经测量直接进入 ISR 或硬实时任务。

SHOULD：单位进入类型或变量名，如 rssi_dbm、timeout_ms。

SHOULD：平台差异集中隔离。若 MCU 标准库不支持 std::format，把替代策略集中在 adapter，而不是让 #ifdef 铺满业务层。

## ⑥ 可编译实验 · 20分钟：Modem Diagnostic Formatter

```cpp
#include <array>
#include <cstdint>
#include <cstdio>
#include <iostream>
```

```cpp
struct RadioStatus {
int rssi_dbm {};
std::uint32_t timeout_ms {};
std::uint8_t retry_count {};
};
```

bool FormatRadioStatusToBuffer(
```cpp
const RadioStatus& status, std::array<char, 96>& output) {
```
const int written = std::snprintf(
output.data(), output.size(),
"RSSI=%d dBm, timeout=%u ms, retry=%u",
status.rssi_dbm,
static_cast<unsigned int>(status.timeout_ms),
```cpp
static_cast<unsigned int>(status.retry_count));
```
if (written < 0) { return false; }
```cpp
return static_cast<std::size_t>(written) < output.size();
}

int main() {
const RadioStatus status {-73, 5000U, 3U};
std::array<char, 96> output {};
```
if (!FormatRadioStatusToBuffer(status, output)) { return 1; }
```cpp
std::cout << output.data() << '\n';
}
```

任务 B：把缓冲区缩小到 16 字节，观察截断检测；解释为什么检查 snprintf 返回值属于接口契约。

任务 C · Code Review：重构 print_status(int a, int b) + sprintf + printf(buf) 风格代码，至少修复命名/单位、越界、格式串风险、职责与错误状态。

编译

```bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic day11.cpp -o day11
./day11
```

## ⑦ 3 个常见坑 · 5分钟

- 把 std::string 当成“UTF-8 类型”——编码其实是接口契约。

- 认为 std::format 一定比 snprintf 更适合嵌入式——先测 ROM/RAM/分配/时延。

- 忽略格式化截断——snprintf 返回值决定结果是否完整。

## ⑧ 检查题 · 5分钟

Q1：硬实时任务生成诊断文本时，最先确认什么？
答案：是否允许动态分配，以及最坏执行时间和缓冲区上界。

Q2：为什么二进制 Modem payload 不宜直接建模成 std::string？
答案：文本语义会掩盖二进制字节、编码与边界契约。
今日 Code Review 快检：文本还是二进制？谁拥有结果？是否可能分配？缓冲区上界是否明确？单位是否进入名称？格式化返回值是否检查？平台差异是否被隔离？
明日预告：Day 12 完成 Chapter 2 的工程化收束，并把字符串接口与接口契约、边界输入测试、头文件依赖结合起来，为 Chapter 3 · Coding with Style 做准备。
