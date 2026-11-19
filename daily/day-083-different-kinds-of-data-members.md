# Day 83 · Different Kinds of Data Members：实例状态、static、const 与 mutable

> **主教材**：Marc Gregoire, *Professional C++, Sixth Edition*（C++23），Chapter 9 · Mastering Classes and Objects。  
> **学习目标**：掌握 Different Kinds of Data Members 的语言规则，并把对象语义映射到 Embedded / Systems Engineering。

## ① 今日章节与阅读范围

阅读 Chapter 9 的 **Different Kinds of Data Members** 小节；按原书顺序推进。建议 7 分钟，标记规则、反例和一个工程场景。

## ② 昨日复习三问

1. 回顾上一课的核心规则，并说明它如何影响今天的设计。
2. 指出一个可能破坏 ownership、lifetime 或 error contract 的实现。
3. 给出一个能在编译期或测试中发现问题的方法。

## ③ 核心概念

非静态成员属于每个对象；static data member 属于类本身；const 成员初始化后不可变；mutable 允许 const 成员函数修改特定缓存/同步字段。C++17 起 inline static 可在类内定义。

阅读时把每个资源/成员标注为对象所有、类级共享、借用或编译期常量；无法归类通常意味着契约不清晰。

## ④ C 写法 vs Modern C++

C 常用全局变量模拟类型级状态；C++ static member 明确归属，但仍需考虑同步与初始化顺序。

现代 C++ 的重点不是语法更短，而是把生命周期、访问权限、类型约束和错误模型写进接口。

## ⑤ 设计模式映射与稳定边界

类级状态不等于 Singleton 合理。mutable 只用于不改变逻辑值的缓存或同步原语。

先识别真实变化轴，再确定 owner 和稳定契约；不要为了“使用设计模式”而增加间接层。

## ⑥ Embedded / System Design 场景

统计计数器、设备能力表、每实例配置分别归属；跨 task 更新 static counter 必须原子或锁。

检查资源上界、最坏执行时间、并发/中断上下文、失败传播和 host test 可替代性。硬件细节留在 HAL/Driver 边界。

## ⑦ 今日编码规范

static 状态必须说明同步策略；const 成员影响赋值能力；mutable 不得绕过业务不变量。

- 编译告警：-Wall -Wextra -Wconversion -Wpedantic。
- 公共接口表达单位、所有权、可失败性和生命周期。
- 实时路径明确分配、阻塞、锁和执行时间结论。

## ⑧ 可编译 Lab / 练习

所有文件都是独立 C++23 程序，包含自己的 int main()。

### 主 Lab

源码：[examples/day-083/main.cpp](../examples/day-083/main.cpp)

~~~bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic examples/day-083/main.cpp -o day83
./day83
~~~

**观察重点**：解释输出如何证明本课的对象语义或接口契约，不要只确认“能编译”。

### Exercise 01

源码：[examples/day-083/exercise-01.cpp](../examples/day-083/exercise-01.cpp)

~~~bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic examples/day-083/exercise-01.cpp -o day83-ex01
./day83-ex01
~~~

**练习任务**：#include <atomic>
#include <iostream>
class DriverStats {
public:
 DriverStats(){ ++instances_; } ~DriverStats(){ --instances_; }
 void RecordTx() noexcept { ++tx_count_; }
 unsigned TxCount() const noexcept { return tx_count_; }
 static unsigned Instances() noexcept { return instances_.load(); }
private: unsigned tx_count_{0U}; inline static std::atomic<unsigned> instances_{0U};
};
int main(){ DriverStats a; { DriverStats b; a.RecordTx(); b.RecordTx(); std::cout<<"inside="<<DriverStats::Instances()<<'\n'; } std::cout<<"tx="<<a.TxCount()<<" outside="<<DriverStats::Instances()<<'\n'; }

## ⑨ 三个常见坑

1. **把 static 成员误认为每对象一份。,mutable 被用于任意修改业务状态。,跨翻译单元 static 初始化顺序产生依赖。**
2. **static 与 non-static data member 的存储归属差异？**
3. **统计计数器、设备能力表、每实例配置分别归属；跨 task 更新 static counter 必须原子或锁。**

## ⑩ 检查题

1. 把 static 成员误认为每对象一份。,mutable 被用于任意修改业务状态。,跨翻译单元 static 初始化顺序产生依赖。
2. static 与 non-static data member 的存储归属差异？

**设计题**：mutable 的合理用途是什么？

给出类型草图、ownership/lifetime、失败模型、并发约束和测试策略；如使用模式，说明隔离的真实变化轴。

## 本课完成标准

- [ ] 能解释今天主题的对象模型与调用规则。
- [ ] 能指出至少一个错误设计及其失败方式。
- [ ] 主 Lab 独立编译运行，输出符合预期。
- [ ] Exercise 01 独立编译运行，并完成改造要求。
- [ ] 能映射到 Embedded 场景中的资源、生命周期与并发约束。
