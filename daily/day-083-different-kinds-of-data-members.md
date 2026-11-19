# Day 83 · Different Kinds of Data Members：实例、static、const 与 mutable

> **主教材**：Marc Gregoire, Professional C++, Sixth Edition（C++23），Chapter 9 · Mastering Classes and Objects。  
> **目标**：理解对象模型、访问/生命周期契约，并映射到 Embedded Systems。

## ① 今日章节与阅读范围

阅读本节主题：Different Kinds of Data Members。建议先读原书，再逐项运行 Lab；严格按章节顺序推进。

## ② 昨日复习三问

1. 回顾上一课核心规则，并说明它如何影响今天的设计。
2. 指出一个可能破坏 ownership、lifetime 或 error contract 的实现。
3. 如何用编译器、测试或静态约束尽早发现该问题？

## ③ 核心概念

非静态成员属于每个对象；static 属于类本身；const 成员初始化后不可变；mutable 允许 const 成员函数修改特定缓存。

**阅读检查**：把每个资源/成员标注为对象所有、类级共享、借用或编译期常量；不能清楚归类时，先修正契约。

## ④ C 写法 vs Modern C++

C 常用全局变量模拟类型级状态；C++ static member 明确归属，但仍需同步与初始化策略。

Modern C++ 的重点不是语法更短，而是把生命周期、访问权限、类型约束和错误模型写进接口。

## ⑤ 设计模式映射与稳定边界

优先确定真实变化轴、owner 和稳定契约。RAII、组合和类型约束通常比引入额外抽象更重要；只有存在可替换变化点时才使用 Strategy / Adapter。

## ⑥ Embedded / System Design 场景

类级状态不等于 Singleton 合理。mutable 只用于不改变逻辑值的缓存或同步原语。

检查资源上界、最坏执行时间、并发/中断上下文、失败传播和 host test 可替代性。硬件细节留在 HAL/Driver 边界。

## ⑦ 今日编码规范

- MUST：接口明确表达所有权、生命周期和失败方式。
- SHOULD：开启 -Wall -Wextra -Wconversion -Wpedantic。
- MUST：实时路径明确分配、阻塞、锁和执行时间结论。

## ⑧ 可编译 Lab / 练习

所有程序均为独立 C++23 源文件，包含自己的 main 函数。

### 主 Lab

源码：[examples/day-083/main.cpp](../examples/day-083/main.cpp)

~~~bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic examples/day-083/main.cpp -o day83
./day83
~~~

### Exercise 01

源码：[examples/day-083/exercise-01.cpp](../examples/day-083/exercise-01.cpp)

~~~bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic examples/day-083/exercise-01.cpp -o day83-ex01
./day83-ex01
~~~

**练习任务**：对示例进行一次有目的的改造，覆盖边界条件，并说明 ownership/lifetime/error contract；starter 应先可编译运行，再完成改造。

## ⑨ 三个常见坑

1. **static 成员不是每对象一份。**
2. **mutable 不能绕过业务不变量。**
3. **跨翻译单元 static 初始化顺序会产生依赖。**

## ⑩ 检查题

1. static 与 non-static 成员归属差异？mutable 的合理用途是什么？
2. 写出一个违反本课规则的代码例子，并说明它会导致什么问题。

**设计题**：多个 Sensor 共享采样统计，但各自拥有校准偏移。设计成员归属与并发策略。 请给出类型草图、ownership/lifetime、失败模型、并发约束和测试策略。

## 本课完成标准

- [ ] 能解释本课对象模型与调用规则。
- [ ] 能指出至少一个错误设计及其失败方式。
- [ ] 主 Lab 与 Exercise 01 独立编译运行。
- [ ] 能映射到 Embedded 场景的资源、生命周期与并发约束。
