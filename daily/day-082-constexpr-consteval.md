# Day 82 · constexpr and consteval：编译期计算与强制常量求值

> **主教材**：Marc Gregoire, *Professional C++, Sixth Edition*（C++23），Chapter 9 · Mastering Classes and Objects。  
> **学习目标**：掌握 constexpr and consteval 的语言规则，并把对象语义映射到 Embedded / Systems Engineering。

## ① 今日章节与阅读范围

阅读 Chapter 9 的 **constexpr and consteval** 小节；按原书顺序推进。建议 7 分钟，标记规则、反例和一个工程场景。

## ② 昨日复习三问

1. 回顾上一课的核心规则，并说明它如何影响今天的设计。
2. 指出一个可能破坏 ownership、lifetime 或 error contract 的实现。
3. 给出一个能在编译期或测试中发现问题的方法。

## ③ 核心概念

constexpr 函数可在满足常量表达式条件时编译期求值，也可运行期调用；consteval immediate function 的每次潜在求值调用都必须产生编译期常量。C++23 放宽了 constexpr 函数体限制，但调用上下文仍决定是否为常量表达式。

阅读时把每个资源/成员标注为对象所有、类级共享、借用或编译期常量；无法归类通常意味着契约不清晰。

## ④ C 写法 vs Modern C++

C 宏和 enum 常量承担编译期配置但类型检查弱；C++ constexpr 函数和 static_assert 可把配置验证交给编译器。

现代 C++ 的重点不是语法更短，而是把生命周期、访问权限、类型约束和错误模型写进接口。

## ⑤ 设计模式映射与稳定边界

编译期校验是 fail-fast 边界，不替代运行期外部输入校验。

先识别真实变化轴，再确定 owner 和稳定契约；不要为了“使用设计模式”而增加间接层。

## ⑥ Embedded / System Design 场景

引脚号、固定帧长、环形缓冲区容量适合 constexpr/consteval；来自 NVM/网络/UART 的值仍需运行期检查。

检查资源上界、最坏执行时间、并发/中断上下文、失败传播和 host test 可替代性。硬件细节留在 HAL/Driver 边界。

## ⑦ 今日编码规范

consteval 只用于确实必须编译期计算的函数；外部输入必须运行期验证。

- 编译告警：-Wall -Wextra -Wconversion -Wpedantic。
- 公共接口表达单位、所有权、可失败性和生命周期。
- 实时路径明确分配、阻塞、锁和执行时间结论。

## ⑧ 可编译 Lab / 练习

所有文件都是独立 C++23 程序，包含自己的 int main()。

### 主 Lab

源码：[examples/day-082/main.cpp](../examples/day-082/main.cpp)

~~~bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic examples/day-082/main.cpp -o day82
./day82
~~~

**观察重点**：解释输出如何证明本课的对象语义或接口契约，不要只确认“能编译”。

### Exercise 01

源码：[examples/day-082/exercise-01.cpp](../examples/day-082/exercise-01.cpp)

~~~bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic examples/day-082/exercise-01.cpp -o day82-ex01
./day82-ex01
~~~

**练习任务**：#include <iostream>
constexpr unsigned Popcount8(unsigned v) noexcept { unsigned n=0U; for(unsigned i=0;i<8U;++i) n+=(v>>i)&1U; return n; }
consteval unsigned ProtocolTag(unsigned major,unsigned minor) { if(major>15U || minor>15U) throw "field out of range"; return (major<<4U)|minor; }
int main(){ constexpr unsigned tag=ProtocolTag(2U,3U); static_assert(Popcount8(tag)==3U); std::cout<<"tag="<<tag<<" bits="<<Popcount8(tag)<<'\n'; }

## ⑨ 三个常见坑

1. **把 constexpr 误解成强制编译期执行。,把运行期配置传给 consteval。,static_assert 不能验证运行期 UART 数据。**
2. **constexpr 与 consteval 的调用约束有什么不同？**
3. **引脚号、固定帧长、环形缓冲区容量适合 constexpr/consteval；来自 NVM/网络/UART 的值仍需运行期检查。**

## ⑩ 检查题

1. 把 constexpr 误解成强制编译期执行。,把运行期配置传给 consteval。,static_assert 不能验证运行期 UART 数据。
2. constexpr 与 consteval 的调用约束有什么不同？

**设计题**：static_assert 能否验证运行期从 UART 收到的长度？

给出类型草图、ownership/lifetime、失败模型、并发约束和测试策略；如使用模式，说明隔离的真实变化轴。

## 本课完成标准

- [ ] 能解释今天主题的对象模型与调用规则。
- [ ] 能指出至少一个错误设计及其失败方式。
- [ ] 主 Lab 独立编译运行，输出符合预期。
- [ ] Exercise 01 独立编译运行，并完成改造要求。
- [ ] 能映射到 Embedded 场景中的资源、生命周期与并发约束。
