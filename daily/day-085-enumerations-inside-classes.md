# Day 85 · Enumerations Inside Classes：把状态域绑定到类型边界

> **主教材**：Marc Gregoire, *Professional C++, Sixth Edition*（C++23），Chapter 9 · Mastering Classes and Objects。  
> **学习目标**：掌握 Enumerations Inside Classes 的语言规则，并把对象语义映射到 Embedded / Systems Engineering。

## ① 今日章节与阅读范围

阅读 Chapter 9 的 **Enumerations Inside Classes** 小节；按原书顺序推进。建议 7 分钟，标记规则、反例和一个工程场景。

## ② 昨日复习三问

1. 回顾上一课的核心规则，并说明它如何影响今天的设计。
2. 指出一个可能破坏 ownership、lifetime 或 error contract 的实现。
3. 给出一个能在编译期或测试中发现问题的方法。

## ③ 核心概念

类内 enum class 可把状态集合限定到拥有它的类型，例如 Modem::State。强类型枚举避免隐式转 int；显式指定底层类型可稳定存储宽度，但协议编码仍需显式转换与范围验证。

阅读时把每个资源/成员标注为对象所有、类级共享、借用或编译期常量；无法归类通常意味着契约不清晰。

## ④ C 写法 vs Modern C++

C enum 常隐式转整数，容易产生命名冲突和非法值；enum class 提供作用域与类型安全。

现代 C++ 的重点不是语法更短，而是把生命周期、访问权限、类型约束和错误模型写进接口。

## ⑤ 设计模式映射与稳定边界

状态集合是类型契约；用 switch 显式处理每个状态，不用 magic number。

先识别真实变化轴，再确定 owner 和稳定契约；不要为了“使用设计模式”而增加间接层。

## ⑥ Embedded / System Design 场景

外部 byte 解码为枚举前必须验证合法值；不要把任意整数 static_cast 后直接当成有效状态。

检查资源上界、最坏执行时间、并发/中断上下文、失败传播和 host test 可替代性。硬件细节留在 HAL/Driver 边界。

## ⑦ 今日编码规范

外部整数到 enum 前验证；协议宽度明确时指定 underlying type，并用显式解码函数。

- 编译告警：-Wall -Wextra -Wconversion -Wpedantic。
- 公共接口表达单位、所有权、可失败性和生命周期。
- 实时路径明确分配、阻塞、锁和执行时间结论。

## ⑧ 可编译 Lab / 练习

所有文件都是独立 C++23 程序，包含自己的 int main()。

### 主 Lab

源码：[examples/day-085/main.cpp](../examples/day-085/main.cpp)

~~~bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic examples/day-085/main.cpp -o day85
./day85
~~~

**观察重点**：解释输出如何证明本课的对象语义或接口契约，不要只确认“能编译”。

### Exercise 01

源码：[examples/day-085/exercise-01.cpp](../examples/day-085/exercise-01.cpp)

~~~bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic examples/day-085/exercise-01.cpp -o day85-ex01
./day85-ex01
~~~

**练习任务**：#include <cstdint>
#include <iostream>
#include <optional>
class DmaChannel {
public:
 enum class Status: std::uint8_t { Idle=0U, Busy=1U, Complete=2U, Fault=3U };
 static std::optional<Status> Parse(std::uint8_t raw) noexcept { switch(raw){ case 0U:return Status::Idle; case 1U:return Status::Busy; case 2U:return Status::Complete; case 3U:return Status::Fault; default:return std::nullopt; } }
};
int main(){ auto s=DmaChannel::Parse(3U); auto bad=DmaChannel::Parse(7U); std::cout<<"fault="<<(s && *s==DmaChannel::Status::Fault)<<" invalid_rejected="<<!bad<<'\n'; }

## ⑨ 三个常见坑

1. **enum class 不会自动验证输入值。,枚举底层值不一定等于协议编码。,switch 处理遗漏状态时需有错误路径。**
2. **enum class 相比 C enum 提供哪些类型安全？**
3. **外部 byte 解码为枚举前必须验证合法值；不要把任意整数 static_cast 后直接当成有效状态。**

## ⑩ 检查题

1. enum class 不会自动验证输入值。,枚举底层值不一定等于协议编码。,switch 处理遗漏状态时需有错误路径。
2. enum class 相比 C enum 提供哪些类型安全？

**设计题**：为何 static_cast 到 enum 不会自动验证输入？

给出类型草图、ownership/lifetime、失败模型、并发约束和测试策略；如使用模式，说明隔离的真实变化轴。

## 本课完成标准

- [ ] 能解释今天主题的对象模型与调用规则。
- [ ] 能指出至少一个错误设计及其失败方式。
- [ ] 主 Lab 独立编译运行，输出符合预期。
- [ ] Exercise 01 独立编译运行，并完成改造要求。
- [ ] 能映射到 Embedded 场景中的资源、生命周期与并发约束。
