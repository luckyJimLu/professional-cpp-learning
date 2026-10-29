---
day: 1
week: 1
part: I
chapter: 1
chapter_title: "A Crash Course in C++ and the Standard Library"
title: "从 C 进入现代 C++"
duration: 60
status: published
topics:
  - chapter-1
  - from-c-to-modern-cpp
guidelines:
  - explicit-contract
  - boundary-validation
lab:
  path: examples/day-001/main.cpp
previous: -1
next: 2
---
# Day 01 · 从 C 进入现代 C++

## ① 今日阅读范围 · 5 分钟

### 新手起步：先知道今天在解决什么

先让一个程序完成“输入已知数据→计算→输出”，再讨论面向对象。`std::` 表示名字来自标准库，`#include` 提供声明，函数体中的语句按控制流执行。

**前置检查：** 无需先学 C；先按[新手入门手册](../docs/beginner-start.md)完成编辑、编译和运行。

**本课最低完成目标：** 能按下面的步骤说明示例如何得到结果，并独立完成一项小修改；高级模式与平台性能分析可第二遍再读。新增导读和拓展练习不计入原有约 60 分钟安排，可分两次完成。

Chapter 1 中程序结构、main、命名空间和标准输出。先使用头文件与普通翻译单元；C++20 modules 留到工具链支持后再尝试。

## ② 昨日复习 · 5 分钟

C 程序从哪里开始执行？头文件声明与源文件定义有什么区别？返回值如何传给调用者？

## ③ 核心概念 · 12 分钟

### 先用白话建立概念

- **翻译单元**：一个源文件及其展开的头文件。
- **命名空间**：组织名字的作用域。

### 跟着本课实验走一遍

1. 从 `main()` 找到数组 `{3,4,5}`。
2. 进入 `Sum()`，`total` 从 0 依次变成 3、7、12。
3. 返回 12，断言检查结果，再输出。

先尝试口头预测，再到第⑥节运行。下面原有概念、图示与接口对照用于解释这些步骤，短代码片段不一定能单独编译；完整程序以本课 `main.cpp` 为准。

C++ 可以继续使用值和普通函数。先把相关函数放进命名空间，避免全局名字冲突。`main` 返回 `int`，成功返回 0；`std::cout` 来自 `<iostream>`，`std::array` 来自 `<array>`。标准库不是语言关键字，必须显式包含对应头文件。固定长度数据用 `std::array` 表达容量，范围 for 遍历元素，不需要手工维护下标。

```mermaid
flowchart LR
    A["源文件与头文件"] --> B["编译每个翻译单元"]
    B --> C["链接目标文件"]
    C --> D["执行 main"]
```

## ④ C 写法 vs Modern C++ · 8 分钟

C 常通过宏、全局函数和裸数组组织代码；本课用 `constexpr` 常量、命名空间和 `std::array` 表达同一意图。保留 C 接口时在适配层转换，不必一次改写整个系统。

## ⑤ 今日编码规范 · 8 分钟

不在头文件写 `using namespace std;`；不靠间接包含获得声明；可明确类型时避免无意义的强制转换。

## ⑥ 可编译实验 · 15 分钟

### 第一次做：先运行，再只改一件事

1. 在仓库根目录打开 [`examples/day-001/main.cpp`](../examples/day-001/main.cpp)，先读 `main()`，圈出输入、调用与结果检查。
2. 运行原版，把实际输出和退出状态记下来，再与本节预期对照。无输出也可能成功，必须结合退出码与断言判断。
3. 修改前先写预期；若失败，先读第一条编译错误或失败断言，再回到对应概念，不同时重写多个函数。

**本课小改动：** 把三个值改成 `{0,0,0}`，同步调整断言，预期总和为 0；不改变函数参数中的数组长度。

<details>
<summary>练习提示：卡住时再展开</summary>

把上面的执行步骤当作检查点；保留原版作为对照。若练习故意让编译或断言失败，请只在实验副本操作，解释失败后还原，不把负例混入日常通过用例。不要执行越界、悬空解引用或重复释放来“观察效果”。

</details>

定义三个固定信号值，计算总和并输出。先把一个元素从 5 改成 6，并同步更新断言，确认总和变为 13；再将三个元素都改成 0，验证总和为 0。这里数组长度是函数参数类型的一部分，本课不要求改变长度。

完整源码：[main.cpp](../examples/day-001/main.cpp)。

```cpp
#include <array>
#include <cassert>
#include <iostream>
namespace modem {
int Sum(const std::array<int, 3>& signals) {
  int total{0};
  for (const int signal : signals) {
    total += signal;
  }
  return total;
}
}  // namespace modem
int main() {
  const std::array<int, 3> signals{3, 4, 5};
  const int total = modem::Sum(signals);
  assert(total == 12);
  std::cout << "signal sum=" << total << '\n';
}
```

在仓库根目录运行：

```bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic examples/day-001/main.cpp -o /tmp/day-001
/tmp/day-001
```

预期输出：`signal sum=12`。实验中的断言用于验证用例，不代替生产代码的错误处理。请勿使用 `-DNDEBUG` 运行这些自测。

## ⑦ 常见坑 · 3 分钟

把 `std::cout` 当成无需头文件的内建语法；数组长度和循环边界分离；把命名空间误认为所有权或生命周期管理机制。

## ⑧ 自测 · 4 分钟

### 分层自测：从解释到判断

1. **理解：** 不看代码，用三句话复述本课示例的输入、关键步骤和结果。
2. **应用：** 说明第⑥节小改动的预期，以及实际结果是否符合预期。
3. **辨析：** 为什么这里不能只把数组改成长度 0？

<details>
<summary>辨析题参考答案与通过依据</summary>

`Sum` 参数写死了 `std::array<int,3>`，长度也是类型的一部分。空数组需要另行改造接口，不是简单改一个数字。

能运行只是第一步。只有能解释本课具体步骤、完成小改动，并说清一个不适用条件，才算完成本次自测；不清楚时回看第③节，不以阅读次数当作掌握证据。

</details>

### 原课检查题

命名空间能自动释放资源吗？为何使用范围 for 而不是硬编码循环三次？

<details>
<summary>参考答案（先独立回答）</summary>

不能，命名空间只组织名字。范围 for 根据容器范围迭代，增加元素时无需修改循环边界。

</details>

### 对照现有资料库

- [实验环境与工具链边界](<../docs/lab-environments.md>)。
- [类型、借用与错误处理规范](<../guidelines/embedded-cpp-guideline-notes.md>)。

先完成本课小实验，再查对照资料；专题中的线程、网络、板端或模式不是本课默认前置。以上为本项目已有讲解和工程对照，不冒充标准条文，也不表示所有示例已在目标板验证。

## 下一步

继续 Day 2；若实验或自测仍不确定，先回到对应概念再复盘。
