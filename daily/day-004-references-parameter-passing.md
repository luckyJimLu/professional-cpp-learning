---
day: 4
week: 1
part: I
chapter: 1
chapter_title: "A Crash Course in C++ and the Standard Library"
title: "引用、const 引用与参数传递"
duration: 60
status: published
topics:
  - references-parameter-passing
guidelines:
  - explicit-contract
lab:
  path: examples/day-004/main.cpp
previous: 3
next: 5
---
# Day 04 · 引用、const 引用与参数传递

**Chapter 1：引用、const 引用与参数传递**

今日目标：从 C 的“指针传参”习惯，迁移到 C++ 的“值 / 引用 / const 引用 / 指针分别表达不同语义”。

## ① 今日阅读范围（5分钟）

### 新手起步：先知道今天在解决什么

先画出调用者的对象，再标出参数是副本还是别名。`T&` 可修改原对象，`const T&` 限制通过该引用修改，二者都不会自动取得对象所有权。

**前置检查：** 先能解释 [Day 2](day-002-variables-initialization-casts.md)、[Day 3](day-003-const-constexpr.md) 的核心例子；不必先掌握整本教材。

**本课最低完成目标：** 能按下面的步骤说明示例如何得到结果，并独立完成一项小修改；高级模式与平台性能分析可第二遍再读。新增导读和拓展练习不计入原有约 60 分钟安排，可分两次完成。

继续 Chapter 1，重点阅读 References、const、function parameters 相关内容。观察引用必须绑定对象、引用不表达所有权，以及 const T& 如何避免复制并限制修改。

## ② 昨日复习（5分钟）

- const 与 constexpr 的核心区别是什么？

- 为什么协议/硬件常量应使用具名 constexpr，而不是 magic number？

- static_assert() 相比运行期 assert() 有什么优势？

## ③ 核心概念（15分钟）

### 先用白话建立概念

- **按值**：参数获得独立副本。
- **引用**：已有对象的别名。

### 跟着本课实验走一遍

1. 找到 `config` 的初始超时 5000。
2. 调用 `SetTimeout(config,3000)`。
3. 沿引用回到同一个 `config`，验证成员变为 3000。

先尝试口头预测，再到第⑥节运行。下面原有概念、图示与接口对照用于解释这些步骤，短代码片段不一定能单独编译；完整程序以本课 `main.cpp` 为准。

引用是对象的别名

```cpp
int retry_count{3};
int& retry_ref{retry_count};
retry_ref = 5;
```

const T&：大型只读对象常用形式

```cpp
struct ModemConfig {
  std::uint32_t baud_rate_bps{115200};
  std::uint32_t timeout_ms{5000};
};

void PrintConfig(const ModemConfig& config) {
  // 借用、只读、不复制
}
```

对于 int、bool、enum 等小型对象，通常直接按值传递更自然。

T& 表达“必须存在，而且会修改”

```cpp
void ResetRetryCount(std::uint8_t& retry_count) {
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
void modem_set_timeout(modem_config_t* config, uint32_t timeout_ms) {
  if (config == NULL) {
    return;
  }
  config->timeout_ms = timeout_ms;
}
```

C++：如果 config 逻辑上不能为空，用引用直接表达约束：

```cpp
void SetTimeout(ModemConfig& config, std::uint32_t timeout_ms) {
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

### 第一次做：先运行，再只改一件事

1. 在仓库根目录打开 [`examples/day-004/main.cpp`](../examples/day-004/main.cpp)，先读 `main()`，圈出输入、调用与结果检查。
2. 运行原版，把实际输出和退出状态记下来，再与本节预期对照。无输出也可能成功，必须结合退出码与断言判断。
3. 修改前先写预期；若失败，先读第一条编译错误或失败断言，再回到对应概念，不同时重写多个函数。

**本课小改动：** 在实验副本中把参数改为按值传递，预期调用者仍为 5000，原来的 3000 断言会失败；解释原因后还原。

<details>
<summary>练习提示：卡住时再展开</summary>

把上面的执行步骤当作检查点；保留原版作为对照。若练习故意让编译或断言失败，请只在实验副本操作，解释失败后还原，不把负例混入日常通过用例。不要执行越界、悬空解引用或重复释放来“观察效果”。

</details>

完整源码：[main.cpp](../examples/day-004/main.cpp)。

```cpp
#include <cassert>
#include <cstdint>
#include <iostream>

namespace modem {
struct Config {
  std::uint32_t baud_rate_bps{115200};
  std::uint32_t timeout_ms{5000};
  std::uint8_t retry_count{3};
};

void SetTimeout(Config& config, std::uint32_t timeout_ms) {
  config.timeout_ms = timeout_ms;
}

void PrintConfig(const Config& config) {
  std::cout << "timeout = " << config.timeout_ms << " ms\n";
}
}  // namespace modem

int main() {
  modem::Config config{};
  modem::SetTimeout(config, 3000);
  assert(config.timeout_ms == 3000);
  modem::PrintConfig(config);
  return 0;
}
```

在仓库根目录运行：

```bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic examples/day-004/main.cpp -o /tmp/day-004
/tmp/day-004
```

## ⑦ 三个常见坑（5分钟）

- 引用不解决对象生命周期，仍可能产生悬空引用。

- 不要机械地给所有小型参数使用 const 引用。

- 看到裸指针要问：可空吗？谁拥有？能修改吗？生命周期由谁保证？

## ⑧ 检查题（5分钟）

### 分层自测：从解释到判断

1. **理解：** 不看代码，用三句话复述本课示例的输入、关键步骤和结果。
2. **应用：** 说明第⑥节小改动的预期，以及实际结果是否符合预期。
3. **辨析：** `const T&` 能保证别人也不修改对象吗？

<details>
<summary>辨析题参考答案与通过依据</summary>

不能；它限制的是这条访问路径，并不提供跨线程同步或全局不可变保证。

能运行只是第一步。只有能解释本课具体步骤、完成小改动，并说清一个不适用条件，才算完成本次自测；不清楚时回看第③节，不以阅读次数当作掌握证据。

</details>

### 原课检查题

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

明日预告：[Day 5 · 指针、nullptr 与数组边界](day-005-pointers-nullptr-bounds.md)，继续区分可空借用与缓冲区范围。

### 对照现有资料库

- [实验环境与工具链边界](<../docs/lab-environments.md>)。
- [类型、借用与错误处理规范](<../guidelines/embedded-cpp-guideline-notes.md>)。

先完成本课小实验，再查对照资料；专题中的线程、网络、板端或模式不是本课默认前置。以上为本项目已有讲解和工程对照，不冒充标准条文，也不表示所有示例已在目标板验证。
