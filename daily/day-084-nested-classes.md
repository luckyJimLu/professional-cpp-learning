# Day 84 · Nested Classes：把辅助类型收进所有权边界

> **主教材**：Marc Gregoire, *Professional C++, Sixth Edition*（C++23），Chapter 9 · Mastering Classes and Objects。  
> **学习目标**：掌握 Nested Classes 的语言规则，并把对象语义映射到 Embedded / Systems Engineering。

## ① 今日章节与阅读范围

阅读 Chapter 9 的 **Nested Classes** 小节；按原书顺序推进。建议 7 分钟，标记规则、反例和一个工程场景。

## ② 昨日复习三问

1. 回顾上一课的核心规则，并说明它如何影响今天的设计。
2. 指出一个可能破坏 ownership、lifetime 或 error contract 的实现。
3. 给出一个能在编译期或测试中发现问题的方法。

## ③ 核心概念

嵌套类位于外围类作用域内，适合表示只服务于外围类型的节点、游标、句柄或状态类型。嵌套类成员可访问外围类 private；外围类不会自动获得嵌套类 private 访问权。嵌套对象没有隐式外围对象指针。

阅读时把每个资源/成员标注为对象所有、类级共享、借用或编译期常量；无法归类通常意味着契约不清晰。

## ④ C 写法 vs Modern C++

C 通常把辅助 struct 放在文件级；C++ nested class 可把类型名和实现边界收束到外围类。

现代 C++ 的重点不是语法更短，而是把生命周期、访问权限、类型约束和错误模型写进接口。

## ⑤ 设计模式映射与稳定边界

嵌套类是作用域/封装工具，不是自动持有 outer object 的 inner class。若类型需要独立复用，应放在 namespace。

先识别真实变化轴，再确定 owner 和稳定契约；不要为了“使用设计模式”而增加间接层。

## ⑥ Embedded / System Design 场景

DMA descriptor、ring cursor、内部状态标签可嵌套；不要把需公开稳定 ABI 的类型隐藏在 private nested class。

检查资源上界、最坏执行时间、并发/中断上下文、失败传播和 host test 可替代性。硬件细节留在 HAL/Driver 边界。

## ⑦ 今日编码规范

只被一个类型使用的辅助类型可考虑 nested；不要假设 nested object 自动持有 outer this。

- 编译告警：-Wall -Wextra -Wconversion -Wpedantic。
- 公共接口表达单位、所有权、可失败性和生命周期。
- 实时路径明确分配、阻塞、锁和执行时间结论。

## ⑧ 可编译 Lab / 练习

所有文件都是独立 C++23 程序，包含自己的 int main()。

### 主 Lab

源码：[examples/day-084/main.cpp](../examples/day-084/main.cpp)

~~~bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic examples/day-084/main.cpp -o day84
./day84
~~~

**观察重点**：解释输出如何证明本课的对象语义或接口契约，不要只确认“能编译”。

### Exercise 01

源码：[examples/day-084/exercise-01.cpp](../examples/day-084/exercise-01.cpp)

~~~bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic examples/day-084/exercise-01.cpp -o day84-ex01
./day84-ex01
~~~

**练习任务**：#include <iostream>
class DmaQueue {
private: struct Descriptor { unsigned id{0U}; bool owned{false}; };
public:
 void Submit(unsigned id) noexcept { descriptor_.id=id; descriptor_.owned=true; }
 bool Complete(unsigned id) noexcept { if(!descriptor_.owned || descriptor_.id!=id) return false; descriptor_.owned=false; return true; }
 bool HasPending() const noexcept { return descriptor_.owned; }
private: Descriptor descriptor_{};
};
int main(){ DmaQueue q; q.Submit(17U); const bool wrong=q.Complete(18U); const bool done=q.Complete(17U); std::cout<<"wrong="<<wrong<<" done="<<done<<" pending="<<q.HasPending()<<'\n'; }

## ⑨ 三个常见坑

1. **嵌套类实例不会自动拥有外围对象引用。,外围类不自动访问嵌套类 private。,可复用公共类型不应被过度隐藏。**
2. **嵌套类与外围类之间有哪些访问权限规则？**
3. **DMA descriptor、ring cursor、内部状态标签可嵌套；不要把需公开稳定 ABI 的类型隐藏在 private nested class。**

## ⑩ 检查题

1. 嵌套类实例不会自动拥有外围对象引用。,外围类不自动访问嵌套类 private。,可复用公共类型不应被过度隐藏。
2. 嵌套类与外围类之间有哪些访问权限规则？

**设计题**：嵌套类对象是否自动包含 outer this？

给出类型草图、ownership/lifetime、失败模型、并发约束和测试策略；如使用模式，说明隔离的真实变化轴。

## 本课完成标准

- [ ] 能解释今天主题的对象模型与调用规则。
- [ ] 能指出至少一个错误设计及其失败方式。
- [ ] 主 Lab 独立编译运行，输出符合预期。
- [ ] Exercise 01 独立编译运行，并完成改造要求。
- [ ] 能映射到 Embedded 场景中的资源、生命周期与并发约束。
