# Day 86 · Operator Overloading：让语法糖保持类型语义

> **主教材**：Marc Gregoire, Professional C++, Sixth Edition（C++23），Chapter 9 · Mastering Classes and Objects。  
> **目标**：理解对象模型、类型边界与接口契约，并映射到 Embedded Systems。

## ① 今日章节与阅读范围

阅读本节主题：Operator Overloading。建议先读原书，再逐项运行 Lab；严格按章节顺序推进。

## ② 昨日复习三问

1. 回顾上一课核心规则，并说明它如何影响今天的设计。
2. 指出一个可能破坏 ownership、lifetime 或 error contract 的实现。
3. 如何用编译器、测试或静态约束尽早发现该问题？

## ③ 核心概念

运算符重载提供自然语法，但不能改变优先级/结合性，也不能发明新运算符。复合赋值通常返回 T&；二元算术可由值参数副本调用 +=。

## ④ C 写法 vs Modern C++

C struct 通常通过函数调用实现操作；C++ 可重载 +、==、<=>，但语义必须符合预期。

现代 C++ 的重点是把生命周期、访问权限、类型约束和错误模型写进接口。

## ⑤ 设计模式映射与稳定边界

优先确定真实变化轴、owner 和稳定契约。不要为了使用模式而增加间接层；有可替换变化点时才考虑 Strategy / Adapter。

## ⑥ Embedded / System Design 场景

ByteCount/Duration 适合值语义运算符；I2C transaction、DMA submit、设备重配置不应伪装成 + 或 =。

检查资源上界、最坏执行时间、并发/中断上下文、失败传播和 host test 可替代性。

## ⑦ 今日编码规范

- MUST：接口明确表达所有权、生命周期和失败方式。
- SHOULD：开启 -Wall -Wextra -Wconversion -Wpedantic。
- MUST：外部输入先验证，再进入类型化业务逻辑。

## ⑧ 可编译 Lab / 练习

所有程序均为独立 C++23 源文件，包含自己的 main 函数。

### 主 Lab

源码：[examples/day-086/main.cpp](../examples/day-086/main.cpp)

~~~bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic examples/day-086/main.cpp -o day86
./day86
~~~

### Exercise 01

源码：[examples/day-086/exercise-01.cpp](../examples/day-086/exercise-01.cpp)

~~~bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic examples/day-086/exercise-01.cpp -o day86-ex01
./day86-ex01
~~~

**练习任务**：扩展示例，覆盖边界条件，并说明类型契约、失败模型与测试策略。

## ⑨ 三个常见坑

1. **operator+ 不应隐藏 I/O 或阻塞。**
2. **operator= 返回 void 会破坏链式赋值。**
3. **比较运算符必须保持一致并处理 const。**

## ⑩ 检查题

1. operator+= 为什么返回 T&？哪些设备操作不应伪装成运算符？
2. 写出一个违反本课规则的代码例子，并说明失败方式。

**设计题**：定义 ByteCount 与 PacketSize 的安全关系，防止不同单位混算。 请给出类型草图、ownership/lifetime、失败模型、并发约束和测试策略。

## 本课完成标准

- [ ] 能解释本课语言规则与类型边界。
- [ ] 能指出至少一个错误设计及其失败方式。
- [ ] 主 Lab 与 Exercise 01 独立编译运行。
- [ ] 能映射到 Embedded 场景的资源、生命周期与并发约束。
