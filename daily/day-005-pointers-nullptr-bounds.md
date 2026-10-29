---
day: 5
week: 1
part: I
chapter: 1
chapter_title: "A Crash Course in C++ and the Standard Library"
title: "指针、nullptr 与数组边界"
duration: 60
status: published
topics:
  - pointers-nullptr-bounds
guidelines:
  - explicit-contract
lab:
  path: examples/day-005/main.cpp
previous: 4
next: 6
---
# Day 05 · 指针、nullptr 与数组边界

指针、nullptr 与数组边界

**Chapter 1 · 今日目标：把 C 的地址操作升级为“可空性、借用关系与边界显式化”的现代 C++ 接口思维。**

## ① 今日阅读范围 · 5分钟

### 新手起步：先知道今天在解决什么

先判断是否有对象可访问，再判断有多少元素可访问。指针非空不代表缓冲区足够长；`span` 携带长度，但不延长底层数组的生命周期。

**前置检查：** 先能解释 [Day 2](day-002-variables-initialization-casts.md)、[Day 4](day-004-references-parameter-passing.md) 的核心例子；不必先掌握整本教材。

**本课最低完成目标：** 能按下面的步骤说明示例如何得到结果，并独立完成一项小修改；高级模式与平台性能分析可第二遍再读。新增导读和拓展练习不计入原有约 60 分钟安排，可分两次完成。

继续 Chapter 1 的 pointers、nullptr、arrays。重点观察 nullptr、裸指针借用语义，以及数组退化后长度信息为何丢失。

## ② 昨日复习 · 5分钟

- const T& 通常表达什么语义？

- 何时 T* 比 T& 更合理？

- 为什么裸指针不等于所有权？

## ③ 核心概念 · 15分钟

### 先用白话建立概念

- **nullptr**：空指针值。
- **span**：不拥有元素的连续范围视图。

### 跟着本课实验走一遍

1. 从帧数据构造视图。
2. 先检查至少有头部需要的字节数。
3. 读出类型与长度，再处理短帧失败。

先尝试口头预测，再到第⑥节运行。下面原有概念、图示与接口对照用于解释这些步骤，短代码片段不一定能单独编译；完整程序以本课 `main.cpp` 为准。

nullptr 表达空指针

```cpp
Device* device{nullptr};
```

不要用 0 表达空指针。可空借用可用指针；不可空借用优先引用。

数组边界

C 风格的地址 + 长度容易失配；现代 C++ 可用 std::span 表达非拥有范围，用 std::array 表达固定容量。

## ④ C vs Modern C++ · 10分钟

std::optional<std::uint8_t> ParseFrame(
std::span<const std::uint8_t> frame)
```cpp
{
  constexpr std::size_t kMinimumFrameSize{2};
  if (frame.size() < kMinimumFrameSize) {
    return std::nullopt;
  }
  return frame.front();
}
```

## ⑤ 今日编码规范 · 10分钟

- MUST：明确 nullptr 语义；可空才使用指针。

- SHOULD：裸指针/引用只表达借用，不表达所有权。

- MUST：边界输入必须验证，禁止 magic number。

## ⑥ 20分钟实验：Modem TLV Reader

### 第一次做：先运行，再只改一件事

1. 在仓库根目录打开 [`examples/day-005/main.cpp`](../examples/day-005/main.cpp)，先读 `main()`，圈出输入、调用与结果检查。
2. 运行原版，把实际输出和退出状态记下来，再与本节预期对照。无输出也可能成功，必须结合退出码与断言判断。
3. 修改前先写预期；若失败，先读第一条编译错误或失败断言，再回到对应概念，不同时重写多个函数。

**本课小改动：** 对照正常帧和短帧断言，增加一个空视图输入；预期解析失败而不是越界读取。

<details>
<summary>练习提示：卡住时再展开</summary>

把上面的执行步骤当作检查点；保留原版作为对照。若练习故意让编译或断言失败，请只在实验副本操作，解释失败后还原，不把负例混入日常通过用例。不要执行越界、悬空解引用或重复释放来“观察效果”。

</details>

完整源码：[main.cpp](../examples/day-005/main.cpp)。

```cpp
#include <array>
#include <cassert>
#include <cstddef>
#include <cstdint>
#include <iostream>
#include <optional>
#include <span>

constexpr std::size_t kHeaderSize{2};

struct TlvHeader {
  std::uint8_t type{};
  std::uint8_t length{};
};

std::optional<TlvHeader> ParseTlvHeader(std::span<const std::uint8_t> frame) {
  if (frame.size() < kHeaderSize) {
    return std::nullopt;
  }
  return TlvHeader{frame[0], frame[1]};
}

int main() {
  const std::array<std::uint8_t, 4> valid_frame{0x01, 0x02, 0xAA, 0xBB};
  const auto header = ParseTlvHeader(valid_frame);
  assert(header.has_value());
  assert(header->type == 0x01);
  assert(header->length == 0x02);

  const std::array<std::uint8_t, 1> short_frame{0x01};
  assert(!ParseTlvHeader(short_frame).has_value());

  std::cout << "TLV Header parsed: type=" << static_cast<int>(header->type)
            << ", len=" << static_cast<int>(header->length) << '\n';
  return 0;
}
```

在仓库根目录运行：

```bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic examples/day-005/main.cpp -o /tmp/day-005
/tmp/day-005
```

## ⑦ 3 个常见坑

- nullptr 检查防不了悬空指针。

- const T* 与 T* const 的 const 对象不同。

- std::span 不拥有数据，必须保证底层 buffer 生命周期。

## ⑧ 检查题

### 分层自测：从解释到判断

1. **理解：** 不看代码，用三句话复述本课示例的输入、关键步骤和结果。
2. **应用：** 说明第⑥节小改动的预期，以及实际结果是否符合预期。
3. **辨析：** 有 `span` 就不需要检查协议长度了吗？

<details>
<summary>辨析题参考答案与通过依据</summary>

仍需要；`span` 描述可访问范围，协议头或字段长度是否满足业务要求由解析器检查。

能运行只是第一步。只有能解释本课具体步骤、完成小改动，并说清一个不适用条件，才算完成本次自测；不清楚时回看第③节，不以阅读次数当作掌握证据。

</details>

### 原课检查题

Q1：不能为空且不接管所有权：T* / T& / unique_ptr / void*？

Q2：为什么 span 通常优于 (pointer, size)？
今日 Code Review 肌肉记忆：这个指针是否可空？是否拥有资源？长度在哪里？生命周期由谁保证？边界是否检查？
明日：数组/容器与固定容量缓冲区，把类型安全和嵌入式内存预算结合起来。

### 对照现有资料库

- [实验环境与工具链边界](<../docs/lab-environments.md>)。
- [类型、借用与错误处理规范](<../guidelines/embedded-cpp-guideline-notes.md>)。

先完成本课小实验，再查对照资料；专题中的线程、网络、板端或模式不是本课默认前置。以上为本项目已有讲解和工程对照，不冒充标准条文，也不表示所有示例已在目标板验证。
