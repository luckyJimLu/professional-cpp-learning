# Day 81 · More About Member Functions：const、static 与 ref-qualifier

> **主教材**：Marc Gregoire, *Professional C++, Sixth Edition*（C++23），Chapter 9 · Mastering Classes and Objects。  
> **学习目标**：掌握 More About Member Functions 的语言规则，并把对象语义映射到 Embedded / Systems Engineering。

## ① 今日章节与阅读范围

阅读 Chapter 9 的 **More About Member Functions** 小节；按原书顺序推进。建议 7 分钟，标记规则、反例和一个工程场景。

## ② 昨日复习三问

1. 回顾上一课的核心规则，并说明它如何影响今天的设计。
2. 指出一个可能破坏 ownership、lifetime 或 error contract 的实现。
3. 给出一个能在编译期或测试中发现问题的方法。

## ③ 核心概念

成员函数签名是对象能力契约。const 成员函数承诺不修改非 mutable 状态；static 成员函数没有 this；& / && ref-qualifier 可限制函数作用于左值或右值对象。

阅读时把每个资源/成员标注为对象所有、类级共享、借用或编译期常量；无法归类通常意味着契约不清晰。

## ④ C 写法 vs Modern C++

C 函数显式传入 struct*；C++ 成员函数有隐式对象参数 this。const 表达逻辑只读，不代表同步。

现代 C++ 的重点不是语法更短，而是把生命周期、访问权限、类型约束和错误模型写进接口。

## ⑤ 设计模式映射与稳定边界

不要为了复用把所有函数做成 static。成员函数表达对象不变量；对称算法可用自由函数。只有对象值类别敏感时才使用 ref-qualifier。

先识别真实变化轴，再确定 owner 和稳定契约；不要为了“使用设计模式”而增加间接层。

## ⑥ Embedded / System Design 场景

查询 API 使用 const；对象由 owner task 修改；const 不等于线程安全。移动资源可用 && 限定的 Take()。

检查资源上界、最坏执行时间、并发/中断上下文、失败传播和 host test 可替代性。硬件细节留在 HAL/Driver 边界。

## ⑦ 今日编码规范

查询函数标记 const；不依赖对象状态的算法优先自由函数或 static；ref-qualifier 应有明确用途。

- 编译告警：-Wall -Wextra -Wconversion -Wpedantic。
- 公共接口表达单位、所有权、可失败性和生命周期。
- 实时路径明确分配、阻塞、锁和执行时间结论。

## ⑧ 可编译 Lab / 练习

所有文件都是独立 C++23 程序，包含自己的 int main()。

### 主 Lab

源码：[examples/day-081/main.cpp](../examples/day-081/main.cpp)

~~~bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic examples/day-081/main.cpp -o day81
./day81
~~~

**观察重点**：解释输出如何证明本课的对象语义或接口契约，不要只确认“能编译”。

### Exercise 01

源码：[examples/day-081/exercise-01.cpp](../examples/day-081/exercise-01.cpp)

~~~bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic examples/day-081/exercise-01.cpp -o day81-ex01
./day81-ex01
~~~

**练习任务**：#include <iostream>
class SensorReading {
public:
 explicit SensorReading(int v): value_(v) {}
 int Value() const noexcept { return value_; }
 void Set(int v) noexcept { value_=v; }
 int AverageWith(const SensorReading& other) const noexcept { return (value_+other.value_)/2; }
 static bool IsInRange(int v) noexcept { return v>=0 && v<=1000; }
private: int value_;
};
int main(){ const SensorReading a{40}; const SensorReading b{44}; std::cout<<"valid="<<SensorReading::IsInRange(a.Value())<<" average="<<a.AverageWith(b)<<'\n'; }

## ⑨ 三个常见坑

1. **const 不等于线程安全。,static 函数没有 this，不能访问实例成员。,过度使用 && 重载会让 API 难懂。**
2. **const 成员函数对 this 的类型意味着什么？**
3. **查询 API 使用 const；对象由 owner task 修改；const 不等于线程安全。移动资源可用 && 限定的 Take()。**

## ⑩ 检查题

1. const 不等于线程安全。,static 函数没有 this，不能访问实例成员。,过度使用 && 重载会让 API 难懂。
2. const 成员函数对 this 的类型意味着什么？

**设计题**：static member function 为什么没有 this？

给出类型草图、ownership/lifetime、失败模型、并发约束和测试策略；如使用模式，说明隔离的真实变化轴。

## 本课完成标准

- [ ] 能解释今天主题的对象模型与调用规则。
- [ ] 能指出至少一个错误设计及其失败方式。
- [ ] 主 Lab 独立编译运行，输出符合预期。
- [ ] Exercise 01 独立编译运行，并完成改造要求。
- [ ] 能映射到 Embedded 场景中的资源、生命周期与并发约束。
