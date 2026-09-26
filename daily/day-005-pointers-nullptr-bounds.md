# Day 05 · 指针、nullptr 与数组边界

> 历史课程迁移自原 Gmail 正文；已转换为 Markdown。

指针、nullptr 与数组边界

**Chapter 1 · 今日目标：把 C 的地址操作升级为“可空性、借用关系与边界显式化”的现代 C++ 接口思维。**

## ① 今日阅读范围 · 5分钟

继续 Chapter 1 的 pointers、nullptr、arrays。重点观察 nullptr、裸指针借用语义，以及数组退化后长度信息为何丢失。

## ② 昨日复习 · 5分钟

- const T& 通常表达什么语义？

- 何时 T* 比 T& 更合理？

- 为什么裸指针不等于所有权？

## ③ 核心概念 · 15分钟

nullptr 表达空指针

Device* device {nullptr};

不要用 0 表达空指针。可空借用可用指针；不可空借用优先引用。

数组边界

C 风格的地址 + 长度容易失配；现代 C++ 可用 std::span 表达非拥有范围，用 std::array 表达固定容量。

## ④ C vs Modern C++ · 10分钟

std::optional<std::uint8_t> ParseFrame(
std::span<const std::uint8_t> frame)
{
constexpr std::size_t kMinimumFrameSize {2};
if (frame.size() < kMinimumFrameSize) {
return std::nullopt;
}
return frame.front();
}

## ⑤ 今日编码规范 · 10分钟

- MUST：明确 nullptr 语义；可空才使用指针。

- SHOULD：裸指针/引用只表达借用，不表达所有权。

- MUST：边界输入必须验证，禁止 magic number。

## ⑥ 20分钟实验：Modem TLV Reader

constexpr std::size_t kHeaderSize {2};

struct TlvHeader {
std::uint8_t type {};
std::uint8_t length {};
};

std::optional<TlvHeader> ParseTlvHeader(
std::span<const std::uint8_t> frame)
{
if (frame.size() < kHeaderSize) {
return std::nullopt;
}
return TlvHeader{frame[0], frame[1]};
}

编译：

g++ -std=c++20 -Wall -Wextra -Wconversion -Wpedantic day05.cpp -o day05

规范修复题：重构 int Read(const unsigned char* p, int len, bool strict);：长度不可为负，范围与长度绑定，不使用含义模糊的 bool 参数，并明确失败语义。

## ⑦ 3 个常见坑

- nullptr 检查防不了悬空指针。

- const T* 与 T* const 的 const 对象不同。

- std::span 不拥有数据，必须保证底层 buffer 生命周期。

## ⑧ 检查题

Q1：不能为空且不接管所有权：T* / T& / unique_ptr / void*？

Q2：为什么 span 通常优于 (pointer, size)？
今日 Code Review 肌肉记忆：这个指针是否可空？是否拥有资源？长度在哪里？生命周期由谁保证？边界是否检查？
明日：数组/容器与固定容量缓冲区，把类型安全和嵌入式内存预算结合起来。
