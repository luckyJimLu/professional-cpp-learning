# Day 80 · Dynamic Memory Allocation in Objects：对象内部的动态存储与 Rule of Zero

> **主教材**：Marc Gregoire, *Professional C++, Sixth Edition*（C++23），Chapter 9 · Mastering Classes and Objects。  
> **学习目标**：掌握 Dynamic Memory Allocation in Objects 的语言规则，并把对象语义映射到 Embedded / Systems Engineering。

## ① 今日章节与阅读范围

阅读 Chapter 9 的 **Dynamic Memory Allocation in Objects** 小节；按原书顺序推进。建议 7 分钟，标记规则、反例和一个工程场景。

## ② 昨日复习三问

1. 回顾上一课的核心规则，并说明它如何影响今天的设计。
2. 指出一个可能破坏 ownership、lifetime 或 error contract 的实现。
3. 给出一个能在编译期或测试中发现问题的方法。

## ③ 核心概念

动态容量由 std::vector、std::string 或 std::unique_ptr<T[]> 等 RAII 成员管理。优先 Rule of Zero；只有资源语义特殊时才实现 Rule of Five。裸 owning pointer 会把析构、复制、移动和异常回滚都变成类作者的责任。

阅读时把每个资源/成员标注为对象所有、类级共享、借用或编译期常量；无法归类通常意味着契约不清晰。

## ④ C 写法 vs Modern C++

C 用 malloc/free 配对；C++ 把 owner 放入对象成员，构造失败自动回滚、析构自动释放。

现代 C++ 的重点不是语法更短，而是把生命周期、访问权限、类型约束和错误模型写进接口。

## ⑤ 设计模式映射与稳定边界

RAII 是资源边界。固定容量实时 buffer 可用 std::array；启动时确定大小、运行期不扩容可用 vector reserve/resize 或 unique_ptr<T[]>，需明确容量与失败策略。

先识别真实变化轴，再确定 owner 和稳定契约；不要为了“使用设计模式”而增加间接层。

## ⑥ Embedded / System Design 场景

动态分配放在启动/配置阶段；ISR 和硬实时路径不分配。明确最大容量、碎片、allocator 生命周期和失败模型。

检查资源上界、最坏执行时间、并发/中断上下文、失败传播和 host test 可替代性。硬件细节留在 HAL/Driver 边界。

## ⑦ 今日编码规范

优先 Rule of Zero；MUST：拥有资源的成员使用 RAII，动态容量有上限；析构不抛异常。

- 编译告警：-Wall -Wextra -Wconversion -Wpedantic。
- 公共接口表达单位、所有权、可失败性和生命周期。
- 实时路径明确分配、阻塞、锁和执行时间结论。

## ⑧ 可编译 Lab / 练习

所有文件都是独立 C++23 程序，包含自己的 int main()。

### 主 Lab

源码：[examples/day-080/main.cpp](../examples/day-080/main.cpp)

~~~bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic examples/day-080/main.cpp -o day80
./day80
~~~

**观察重点**：解释输出如何证明本课的对象语义或接口契约，不要只确认“能编译”。

### Exercise 01

源码：[examples/day-080/exercise-01.cpp](../examples/day-080/exercise-01.cpp)

~~~bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic examples/day-080/exercise-01.cpp -o day80-ex01
./day80-ex01
~~~

**练习任务**：#include <cstddef>
#include <iostream>
#include <memory>
class Buffer {
public:
 explicit Buffer(std::size_t n): data_(std::make_unique<int[]>(n)), size_(n) {}
 Buffer(const Buffer&)=delete; Buffer& operator=(const Buffer&)=delete;
 bool Set(std::size_t i,int v) noexcept { if(i>=size_) return false; data_[i]=v; return true; }
 int Sum() const noexcept { int s=0; for(std::size_t i=0;i<size_;++i) s+=data_[i]; return s; }
private: std::unique_ptr<int[]> data_; std::size_t size_;
};
int main(){ Buffer b{4U}; b.Set(2U,7); std::cout<<"sum="<<b.Sum()<<'\n'; }

## ⑨ 三个常见坑

1. **裸 owning pointer 默认复制导致 double-free。,只写析构函数却忘记复制/移动语义。,实时路径 vector 扩容隐藏不可预测分配。**
2. **为什么 vector<byte> 成员通常比 byte* 更适合表达动态 buffer？**
3. **动态分配放在启动/配置阶段；ISR 和硬实时路径不分配。明确最大容量、碎片、allocator 生命周期和失败模型。**

## ⑩ 检查题

1. 裸 owning pointer 默认复制导致 double-free。,只写析构函数却忘记复制/移动语义。,实时路径 vector 扩容隐藏不可预测分配。
2. 为什么 vector<byte> 成员通常比 byte* 更适合表达动态 buffer？

**设计题**：何时选择 unique_ptr<T[]>，何时选择 vector<T>？

给出类型草图、ownership/lifetime、失败模型、并发约束和测试策略；如使用模式，说明隔离的真实变化轴。

## 本课完成标准

- [ ] 能解释今天主题的对象模型与调用规则。
- [ ] 能指出至少一个错误设计及其失败方式。
- [ ] 主 Lab 独立编译运行，输出符合预期。
- [ ] Exercise 01 独立编译运行，并完成改造要求。
- [ ] 能映射到 Embedded 场景中的资源、生命周期与并发约束。
