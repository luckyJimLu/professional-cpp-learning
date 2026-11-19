# Day 86 · Operator Overloading：让语法糖保持类型语义

> **主教材**：Marc Gregoire, *Professional C++, Sixth Edition*（C++23），Chapter 9 · Mastering Classes and Objects。  
> **学习目标**：掌握 Operator Overloading 的语言规则，并把对象语义映射到 Embedded / Systems Engineering。

## ① 今日章节与阅读范围

阅读 Chapter 9 的 **Operator Overloading** 小节；按原书顺序推进。建议 7 分钟，标记规则、反例和一个工程场景。

## ② 昨日复习三问

1. 回顾上一课的核心规则，并说明它如何影响今天的设计。
2. 指出一个可能破坏 ownership、lifetime 或 error contract 的实现。
3. 给出一个能在编译期或测试中发现问题的方法。

## ③ 核心概念

运算符重载为用户类型提供自然语法，但不能改变优先级/结合性，也不能发明新运算符。复合赋值通常返回 T&；二元算术可由值参数副本调用 +=；比较运算需保持一致关系。

阅读时把每个资源/成员标注为对象所有、类级共享、借用或编译期常量；无法归类通常意味着契约不清晰。

## ④ C 写法 vs Modern C++

C struct 通常通过函数调用实现操作；C++ 可重载 +、==、<=>，但语义必须符合读者预期。

现代 C++ 的重点不是语法更短，而是把生命周期、访问权限、类型约束和错误模型写进接口。

## ⑤ 设计模式映射与稳定边界

不要为所有类型重载全部运算符。可能阻塞、失败、访问设备或改变外部状态的操作应使用具名 API。

先识别真实变化轴，再确定 owner 和稳定契约；不要为了“使用设计模式”而增加间接层。

## ⑥ Embedded / System Design 场景

ByteCount、Duration、固定点数值适合值语义运算符；I2C transaction、DMA submit、设备重配置不应伪装成 + 或 =。

检查资源上界、最坏执行时间、并发/中断上下文、失败传播和 host test 可替代性。硬件细节留在 HAL/Driver 边界。

## ⑦ 今日编码规范

保持运算符直观；复合赋值返回 *this；避免隐藏 I/O、阻塞、分配和失败。

- 编译告警：-Wall -Wextra -Wconversion -Wpedantic。
- 公共接口表达单位、所有权、可失败性和生命周期。
- 实时路径明确分配、阻塞、锁和执行时间结论。

## ⑧ 可编译 Lab / 练习

所有文件都是独立 C++23 程序，包含自己的 int main()。

### 主 Lab

源码：[examples/day-086/main.cpp](../examples/day-086/main.cpp)

~~~bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic examples/day-086/main.cpp -o day86
./day86
~~~

**观察重点**：解释输出如何证明本课的对象语义或接口契约，不要只确认“能编译”。

### Exercise 01

源码：[examples/day-086/exercise-01.cpp](../examples/day-086/exercise-01.cpp)

~~~bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic examples/day-086/exercise-01.cpp -o day86-ex01
./day86-ex01
~~~

**练习任务**：#include <iostream>
class Milliseconds {
public:
 explicit constexpr Milliseconds(unsigned n) noexcept: value_(n) {}
 constexpr unsigned Value() const noexcept { return value_; }
 constexpr Milliseconds& operator+=(Milliseconds rhs) noexcept { value_+=rhs.value_; return *this; }
 friend constexpr Milliseconds operator+(Milliseconds lhs,Milliseconds rhs) noexcept { lhs+=rhs; return lhs; }
 friend constexpr bool operator==(Milliseconds,Milliseconds) noexcept = default;
 friend constexpr bool operator<(Milliseconds a,Milliseconds b) noexcept { return a.value_<b.value_; }
private: unsigned value_;
};
int main(){ const auto timeout=Milliseconds{100U}+Milliseconds{50U}; std::cout<<"timeout_ms="<<timeout.Value()<<" exceeds="<<(timeout>Milliseconds{120U})<<'\n'; }

## ⑨ 三个常见坑

1. **operator+ 隐藏 I/O 或昂贵分配。,operator= 返回 void 破坏惯用链式赋值。,比较运算不一致或遗漏 const。**
2. **为什么 operator+= 通常返回 T&？**
3. **ByteCount、Duration、固定点数值适合值语义运算符；I2C transaction、DMA submit、设备重配置不应伪装成 + 或 =。**

## ⑩ 检查题

1. operator+ 隐藏 I/O 或昂贵分配。,operator= 返回 void 破坏惯用链式赋值。,比较运算不一致或遗漏 const。
2. 为什么 operator+= 通常返回 T&？

**设计题**：哪些设备操作不应伪装成运算符？

给出类型草图、ownership/lifetime、失败模型、并发约束和测试策略；如使用模式，说明隔离的真实变化轴。

## 本课完成标准

- [ ] 能解释今天主题的对象模型与调用规则。
- [ ] 能指出至少一个错误设计及其失败方式。
- [ ] 主 Lab 独立编译运行，输出符合预期。
- [ ] Exercise 01 独立编译运行，并完成改造要求。
- [ ] 能映射到 Embedded 场景中的资源、生命周期与并发约束。
