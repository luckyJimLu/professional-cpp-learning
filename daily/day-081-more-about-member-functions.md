# Day 81 · More About Member Functions：const、static 与 ref-qualifier

> **主教材**：Marc Gregoire, Professional C++, Sixth Edition（C++23），Chapter 9 · Mastering Classes and Objects。  
> **目标**：理解对象模型、访问/生命周期契约，并映射到 Embedded Systems。

## ① 今日章节与阅读范围

阅读本节主题：More About Member Functions。建议先读原书，再逐项运行 Lab；严格按章节顺序推进。

## ② 昨日复习三问

1. 回顾上一课核心规则，并说明它如何影响今天的设计。
2. 指出一个可能破坏 ownership、lifetime 或 error contract 的实现。
3. 如何用编译器、测试或静态约束尽早发现该问题？

## ③ 核心概念

const 成员函数表达逻辑只读；static 成员函数没有 this；& / && ref-qualifier 可限制函数只作用于左值或右值对象。const 不代表同步。

**阅读检查**：把每个资源/成员标注为对象所有、类级共享、借用或编译期常量；不能清楚归类时，先修正契约。

## ④ C 写法 vs Modern C++

C 函数显式传入 struct*；C++ 成员函数有隐式对象参数 this。

Modern C++ 的重点不是语法更短，而是把生命周期、访问权限、类型约束和错误模型写进接口。

## ⑤ 设计模式映射与稳定边界

优先确定真实变化轴、owner 和稳定契约。RAII、组合和类型约束通常比引入额外抽象更重要；只有存在可替换变化点时才使用 Strategy / Adapter。

## ⑥ Embedded / System Design 场景

查询 API 用 const；对象由 owner task 修改；&& 限定可将资源从临时对象移出。

检查资源上界、最坏执行时间、并发/中断上下文、失败传播和 host test 可替代性。硬件细节留在 HAL/Driver 边界。

## ⑦ 今日编码规范

- MUST：接口明确表达所有权、生命周期和失败方式。
- SHOULD：开启 -Wall -Wextra -Wconversion -Wpedantic。
- MUST：实时路径明确分配、阻塞、锁和执行时间结论。

## ⑧ 可编译 Lab / 练习

所有程序均为独立 C++23 源文件，包含自己的 main 函数。

### 主 Lab

源码：[examples/day-081/main.cpp](../examples/day-081/main.cpp)

~~~bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic examples/day-081/main.cpp -o day81
./day81
~~~

### Exercise 01

源码：[examples/day-081/exercise-01.cpp](../examples/day-081/exercise-01.cpp)

~~~bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic examples/day-081/exercise-01.cpp -o day81-ex01
./day81-ex01
~~~

**练习任务**：对示例进行一次有目的的改造，覆盖边界条件，并说明 ownership/lifetime/error contract；starter 应先可编译运行，再完成改造。

## ⑨ 三个常见坑

1. **const 不等于线程安全。**
2. **static 函数没有 this，不能访问实例成员。**
3. **过度使用 && 重载会让 API 难懂。**

## ⑩ 检查题

1. const 成员函数对 this 有什么影响？static 函数为什么没有 this？
2. 写出一个违反本课规则的代码例子，并说明它会导致什么问题。

**设计题**：TelemetrySnapshot 多 task 读取、采集 task 更新。const 无法替代哪些同步机制？ 请给出类型草图、ownership/lifetime、失败模型、并发约束和测试策略。

## 本课完成标准

- [ ] 能解释本课对象模型与调用规则。
- [ ] 能指出至少一个错误设计及其失败方式。
- [ ] 主 Lab 与 Exercise 01 独立编译运行。
- [ ] 能映射到 Embedded 场景的资源、生命周期与并发约束。
