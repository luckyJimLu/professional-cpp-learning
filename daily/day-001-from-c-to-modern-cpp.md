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

Chapter 1 中程序结构、main、命名空间和标准输出。先使用头文件与普通翻译单元；C++20 modules 留到工具链支持后再尝试。

阅读目标：能解释本课规则的适用条件，并在下面的实验中验证它。

## ② 昨日复习 · 5 分钟

C 程序从哪里开始执行？头文件声明与源文件定义有什么区别？返回值如何传给调用者？

先合上资料口头回答；不确定的部分记录到复习队列。

## ③ 核心概念 · 12 分钟

C++ 可以继续使用值和普通函数。先把相关函数放进命名空间，避免全局名字冲突。`main` 返回 `int`，成功返回 0；`std::cout` 来自 `<iostream>`，`std::array` 来自 `<array>`。标准库不是语言关键字，必须显式包含对应头文件。固定长度数据用 `std::array` 表达容量，范围 for 遍历元素，不需要手工维护下标。

```mermaid
flowchart LR
    A["源文件与头文件"] --> B["编译每个翻译单元"]
    B --> C["链接目标文件"]
    C --> D["执行 main"]
```

图表展示关键步骤与判断；请结合下面的代码检查失败分支。

## ④ C 写法 vs Modern C++ · 8 分钟

C 常通过宏、全局函数和裸数组组织代码；本课用 `constexpr` 常量、命名空间和 `std::array` 表达同一意图。保留 C 接口时在适配层转换，不必一次改写整个系统。

改写时分别检查：类型是否表达意图、失败是否可见、所有权是否清楚。

## ⑤ 今日编码规范 · 8 分钟

不在头文件写 `using namespace std;`；不靠间接包含获得声明；可明确类型时避免无意义的强制转换。

Code Review 时说明规则如何帮助当前场景，不将风格约定当成运行时安全证明。

## ⑥ 可编译实验 · 15 分钟

定义三个固定信号值，计算总和并输出。增加一个值后确认输出变化，再把数组长度改成 0，观察总和的结果。

完整源码：[main.cpp](../examples/day-001/main.cpp)。

```cpp
#include <array>
#include <cassert>
#include <iostream>
namespace modem {
int Sum(const std::array<int, 3>& signals) {
  int total{0};
  for (const int signal : signals) { total += signal; }
  return total;
}
}
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

检查实验是否覆盖了失败分支；只有正常输入通过不足以证明边界行为正确。

## ⑧ 自测 · 4 分钟

命名空间能自动释放资源吗？为何使用范围 for 而不是硬编码循环三次？

<details>
<summary>参考答案（先独立回答）</summary>

不能，命名空间只组织名字。范围 for 根据容器范围迭代，增加元素时无需修改循环边界。

</details>

## 下一步

继续 Day 2；若实验或自测仍不确定，先回到对应概念再复盘。
