---
day: 16
week: 3
part: I
chapter: 3
chapter_title: "Coding with Style"
title: "clang-format、clang-tidy 与编译告警"
duration: 60
status: published
topics:
  - chapter-3
  - format-tidy-warnings
guidelines:
  - explicit-contract
  - boundary-validation
lab:
  path: examples/day-016/main.cpp
previous: 15
next: 17
---
# Day 16 · clang-format、clang-tidy 与编译告警

## ① 今日阅读范围 · 5 分钟

### 新手起步：先知道今天在解决什么

先让编译器指出类型和控制流问题，再解释告警的原因。自动格式化只改布局，静态分析也不能替代运行测试。

**前置检查：** 先能解释 [Day 2](day-002-variables-initialization-casts.md)、[Day 13](day-013-coding-with-style-foundations.md)、[Day 14](day-014-headers-iwyu-dependencies.md) 的核心例子；不必先掌握整本教材。

**本课最低完成目标：** 能按下面的步骤说明示例如何得到结果，并独立完成一项小修改；高级模式与平台性能分析可第二遍再读。新增导读和拓展练习不计入原有约 60 分钟安排，可分两次完成。

Chapter 3 中风格一致性与自动检查。区分格式、静态分析、编译诊断与运行时测试。

## ② 昨日复习 · 5 分钟

名字能替代类型约束吗？超时单位怎样表达？错误返回如何传达失败原因？

## ③ 核心概念 · 12 分钟

### 先用白话建立概念

- **告警**：工具指出的潜在问题。
- **静态分析**：不运行程序的代码检查。

### 跟着本课实验走一遍

1. 找到 size 类型到目标整数的转换。
2. 核对上界检查。
3. 运行正常值与极大值的断言。

先尝试口头预测，再到第⑥节运行。下面原有概念、图示与接口对照用于解释这些步骤，短代码片段不一定能单独编译；完整程序以本课 `main.cpp` 为准。

clang-format 只处理布局；clang-tidy 分析部分易错模式；编译器告警检查类型转换和控制流；测试验证行为。它们互补。开启 `-Wall -Wextra -Wconversion -Wpedantic`，修复告警时解释数值范围，而非无条件添加 cast。实时路径还需人工审查分配、阻塞和最坏时间。

```mermaid
flowchart LR
    A["源代码"] --> B["clang-format：布局"]
    B --> C["clang-tidy：静态分析"]
    C --> D["告警编译：类型与控制流"]
    D --> E["测试：行为与边界"]
```

## ④ C 写法 vs Modern C++ · 8 分钟

对从容器 size() 到 int 的转换，不要为了消除告警直接 cast。优先保留 size_t；必须窄化时用边界检查并返回明确失败。

## ⑤ 今日编码规范 · 8 分钟

提交前运行格式检查和告警编译；新代码避免扩大警告抑制范围；检查工具版本和项目规则后再批量格式化。

## ⑥ 可编译实验 · 15 分钟

### 第一次做：先运行，再只改一件事

1. 在仓库根目录打开 [`examples/day-016/main.cpp`](../examples/day-016/main.cpp)，先读 `main()`，圈出输入、调用与结果检查。
2. 运行原版，把实际输出和退出状态记下来，再与本节预期对照。无输出也可能成功，必须结合退出码与断言判断。
3. 修改前先写预期；若失败，先读第一条编译错误或失败断言，再回到对应概念，不同时重写多个函数。

**本课小改动：** 在实验副本移除范围检查并观察告警或测试变化，随后还原；不要用强制转换或关闭告警作为修复。

<details>
<summary>练习提示：卡住时再展开</summary>

把上面的执行步骤当作检查点；保留原版作为对照。若练习故意让编译或断言失败，请只在实验副本操作，解释失败后还原，不把负例混入日常通过用例。不要执行越界、悬空解引用或重复释放来“观察效果”。

</details>

实现受检大小转换，用最大 size_t 验证失败分支。可用 clang-format --dry-run --Werror 检查格式，用 clang-tidy 执行项目选定规则。

完整源码：[main.cpp](../examples/day-016/main.cpp)。

```cpp
#include <cassert>
#include <cstddef>
#include <iostream>
#include <limits>
#include <optional>
std::optional<int> CheckedCount(std::size_t size) {
  if (size > static_cast<std::size_t>(std::numeric_limits<int>::max())) {
    return std::nullopt;
  }
  return static_cast<int>(size);
}
int main() {
  assert(CheckedCount(3).value() == 3);
  assert(!CheckedCount(std::numeric_limits<std::size_t>::max()));
  std::cout << "size conversion checked\n";
}
```

在仓库根目录运行：

```bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic examples/day-016/main.cpp -o /tmp/day-016
/tmp/day-016
```

预期输出：`size conversion checked`。实验中的断言用于验证用例，不代替生产代码的错误处理。请勿使用 `-DNDEBUG` 运行这些自测。

## ⑦ 常见坑 · 3 分钟

把零告警当成没有逻辑错误；用强制转换隐藏截断；运行 clang-format 后认为已经做过静态分析。

## ⑧ 自测 · 4 分钟

### 分层自测：从解释到判断

1. **理解：** 不看代码，用三句话复述本课示例的输入、关键步骤和结果。
2. **应用：** 说明第⑥节小改动的预期，以及实际结果是否符合预期。
3. **辨析：** 工具没有报错能证明程序无 bug 吗？

<details>
<summary>辨析题参考答案与通过依据</summary>

不能；工具覆盖有限，业务规则、并发时序和外部输入仍需专门验证。

能运行只是第一步。只有能解释本课具体步骤、完成小改动，并说清一个不适用条件，才算完成本次自测；不清楚时回看第③节，不以阅读次数当作掌握证据。

</details>

### 原课检查题

格式化能检测整数截断吗？哪些缺陷仍需要测试？

<details>
<summary>参考答案（先独立回答）</summary>

不能。分支行为、协议语义、边界输入及生命周期设计仍需测试与审查。

</details>

### 对照现有资料库

- [编码规范与错误处理](<../guidelines/embedded-cpp-guideline-notes.md>)。
- [代码评审依据](<../guidelines/review-rubric.md>)。

先完成本课小实验，再查对照资料；专题中的线程、网络、板端或模式不是本课默认前置。以上为本项目已有讲解和工程对照，不冒充标准条文，也不表示所有示例已在目标板验证。

## 下一步

继续 Day 17；若实验或自测仍不确定，先回到对应概念再复盘。
