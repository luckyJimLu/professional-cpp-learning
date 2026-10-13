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

Chapter 3 中风格一致性与自动检查。区分格式、静态分析、编译诊断与运行时测试。

阅读目标：能解释本课规则的适用条件，并在下面的实验中验证它。

## ② 昨日复习 · 5 分钟

名字能替代类型约束吗？超时单位怎样表达？错误返回如何传达失败原因？

先合上资料口头回答；不确定的部分记录到复习队列。

## ③ 核心概念 · 12 分钟

clang-format 只处理布局；clang-tidy 分析部分易错模式；编译器告警检查类型转换和控制流；测试验证行为。它们互补。开启 `-Wall -Wextra -Wconversion -Wpedantic`，修复告警时解释数值范围，而非无条件添加 cast。实时路径还需人工审查分配、阻塞和最坏时间。

```mermaid
flowchart LR
    A["源代码"] --> B["clang-format：布局"]
    B --> C["clang-tidy：静态分析"]
    C --> D["告警编译：类型与控制流"]
    D --> E["测试：行为与边界"]
```

图表展示关键步骤与判断；请结合下面的代码检查失败分支。

## ④ C 写法 vs Modern C++ · 8 分钟

对从容器 size() 到 int 的转换，不要为了消除告警直接 cast。优先保留 size_t；必须窄化时用边界检查并返回明确失败。

改写时分别检查：类型是否表达意图、失败是否可见、所有权是否清楚。

## ⑤ 今日编码规范 · 8 分钟

提交前运行格式检查和告警编译；新代码避免扩大警告抑制范围；检查工具版本和项目规则后再批量格式化。

Code Review 时说明规则如何帮助当前场景，不将风格约定当成运行时安全证明。

## ⑥ 可编译实验 · 15 分钟

实现受检大小转换，用最大 size_t 验证失败分支。可用 clang-format --dry-run --Werror 检查格式，用 clang-tidy 执行项目选定规则。

完整源码：[main.cpp](../examples/day-016/main.cpp)。

```cpp
#include <cassert>
#include <cstddef>
#include <iostream>
#include <limits>
#include <optional>
std::optional<int> CheckedCount(std::size_t size) {
  if (size > static_cast<std::size_t>(std::numeric_limits<int>::max())) { return std::nullopt; }
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

检查实验是否覆盖了失败分支；只有正常输入通过不足以证明边界行为正确。

## ⑧ 自测 · 4 分钟

格式化能检测整数截断吗？哪些缺陷仍需要测试？

<details>
<summary>参考答案（先独立回答）</summary>

不能。分支行为、协议语义、边界输入及生命周期设计仍需测试与审查。

</details>

## 下一步

继续 Day 17；若实验或自测仍不确定，先回到对应概念再复盘。
