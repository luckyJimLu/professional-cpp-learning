# Professional C++ 学习路线与章节里程碑

主教材：*Professional C++, Sixth Edition*（Marc Gregoire，C++23）

辅教材：

- *Embedded C++ Coding Guideline · Google-based · v1.0*
- *Design Patterns in Modern C++*：作为设计模式辅线；只在当天主教材主题确有变化轴/稳定边界时引入，不改变《Professional C++》章节顺序。

## 目标

从现代 C++ 入门逐步建立工程能力，保留 C / 嵌入式进阶场景。零基础先按[新手入门手册](beginner-start.md)认识变量、函数与编译运行，再依[逐课前置导航](beginner-course-map.md)进入主线；示例贴近 RTOS、BSP、Driver、Middleware、Modem 与 Embedded Linux，但不要求一开始就理解这些平台。

## 当前执行方式

原始 16 周路线用于说明章节顺序，不作为当前完成日期承诺。实际已发布 Day 1–64，Day 55 完成 Chapter 6，目前在 Chapter 7；下一课为 Day 65。原计划第 3 周覆盖 Ch4–6，而实际持续至第 8 周，应使用已发布课程和验收证据校准节奏。

| 里程碑 | 完成条件 | 当前状态 |
| --- | --- | --- |
| Ch1–3 基础与风格 | 能说明类型、借用与错误边界，运行对应 Lab | 已发布；个人能力需独立自测 |
| Ch4–6 设计与复用 | 明确变化轴、不变量、接口与资源约束，完成章末评审 | 已发布至 Day 55；见 [Chapter 6 评审](chapter-06-review.md) |
| Ch7 内存管理 | 按教材小节发布；完成所有权、RAII 与生命周期用例 | 进行中；Day 56–64 已发布，下一课 Day 65 |
| Ch8–24 语言与标准库 | 每章主 Lab、错误路径与小结均可运行 | 后续逐章规划 |
| Ch25–34 并发与工程 | 跨模块实验、性能／资源证据、测试与调试闭环 | 后续逐章规划 |

每章开始时列出小节和实验目标；章末根据实际用时调整剩余安排。`week` 继续表示 Day 的组织周次；周复盘按七天归档，章末评审不必等到周末。章末总结可以先完成，但周复盘必须覆盖实际发布的七天，不能提前标记一整周完成。

总入口：[内容覆盖矩阵](content-map.md) · [实验环境](lab-environments.md) · [贯穿实验](engineering-learning-path.md)。

## 原始 16 周顺序参考（非当前日历承诺）

- **第 1–2 周 · Part I**
  - Ch1 A Crash Course in C++ and the Standard Library
  - Ch2 Strings and String Views
  - Ch3 Coding with Style
- **第 3 周 · Part II**
  - Ch4 Designing Professional C++ Programs
  - Ch5 Designing with Classes
  - Ch6 Designing for Reuse
- **第 4–11 周 · Part III**
  - Ch7 Memory Management ➔ *(推荐结合 [patterns/ownership-and-smart-pointers.md](../patterns/ownership-and-smart-pointers.md) 与 [frameworks/asio/SESSION_LIFECYCLE.md](../frameworks/asio/SESSION_LIFECYCLE.md) 研读 ownership、智能指针与异步生命周期)*
  - Ch8–9 Classes and Objects
  - Ch10 Inheritance
  - Ch11 Modules / Header Files / Miscellaneous
  - Ch12 Templates
  - Ch13 I/O ➔ *(推荐结合 [frameworks/asio/ARCHITECTURE.md](../frameworks/asio/ARCHITECTURE.md) 研读 Proactor/Reactor 事件驱动网络 I/O)*
  - Ch14 Error Handling ➔ *(推荐结合 [frameworks/asio/COMPLETION_HANDLER.md](../frameworks/asio/COMPLETION_HANDLER.md) 研读 error_code 错误交付与 operation_aborted 语义)*
  - Ch15 Operator Overloading
  - Ch16 Standard Library Overview
  - Ch17 Iterators / Ranges ➔ *(推荐结合 [patterns/README.md](../patterns/README.md) 中 Iterator / Range 部分理解“遍历协议”这一稳定边界)*
  - Ch18 Containers
  - Ch19 Function Pointers / Function Objects / Lambdas ➔ *(推荐结合 [patterns/README.md](../patterns/README.md) 的 Strategy / Observer 部分，以及 [frameworks/asio/COMPLETION_HANDLER.md](../frameworks/asio/COMPLETION_HANDLER.md) 研读 callable、callback 与完成签名契约)*
  - Ch20 Algorithms
  - Ch21 Localization / Regex
  - Ch22 Date / Time
  - Ch23 Random
  - Ch24 Vocabulary Types
- **第 12–13 周 · Part IV**
  - Ch25 Extending the Standard Library
  - Ch26 Advanced Templates
  - Ch27 Multithreading ➔ *(推荐结合 [frameworks/asio/EVENT_LOOP_RUNNER.md](../frameworks/asio/EVENT_LOOP_RUNNER.md) 研读线程捕获与工作池，结合 [ARCHITECTURE.md](../frameworks/asio/ARCHITECTURE.md) 研读 C++20 协程落地范式)*
- **第 14–16 周 · Part V**
  - Ch28 Software Engineering Methods
  - Ch29 Efficient C++
  - Ch30 Testing
  - Ch31 Debugging
  - Ch32 Design Techniques / Frameworks ➔ *(推荐结合 [frameworks/asio/](../frameworks/asio/) 研读 Service Registry 模式与泛型架构设计)*
  - Ch33 Design Patterns ➔ **专题预习：[C++ Design Patterns · 工程化学习指南](../patterns/README.md)**；重点模式：Strategy、Abstract Factory、Factory Method、Adapter、Proxy、Iterator、Observer、Decorator、Chain of Responsibility、Singleton；同时结合 [Ownership & Smart Pointers](../patterns/ownership-and-smart-pointers.md) 理解 C++ 特有的生命周期问题
  - Ch34 Cross-Platform / Cross-Language Development

## 每日约 60 分钟结构

1. 今日章节与建议阅读范围
2. 昨日复习 3 问
3. 核心概念讲解
4. C 写法 vs Modern C++
5. 设计模式映射：变化轴 → 稳定边界 → 是否需要 Pattern → ownership/lifetime
6. Embedded / System Design 场景
7. 今日编码规范（MUST/SHOULD/MAY + 错误/推荐对照）
8. 可编译 Lab / 修复违规代码
9. 3 个常见坑与 Pattern 滥用
10. 2 道检查题 + 1 道设计题

### 第 8 节 Runnable Exercise Contract

主 Lab 必须落到 `examples/day-XXX/main.cpp`，完整、可独立编译并运行。

如果当天包含“修复代码 / 重构 / 实现 / 调试”类练习，则不能只给 Markdown 片段；必须同时提供独立 runnable source：

```text
examples/day-XXX/
├── main.cpp
├── exercise-01.cpp
└── exercise-01-solution.cpp   # 有必要时提供
```

其中：

- starter 优先保持可编译、可运行，但设计/语义存在待修复问题；
- 每个 standalone `.cpp` 必须有 `int main()`；
- 学习路径是：运行 → 观察 → 修改 → 严格 warnings 编译 → 再运行 → 对照解法；
- 默认编译门禁：`-std=c++23 -Wall -Wextra -Wconversion -Wpedantic`；
- 纯知识问答和纯架构设计题不强制生成额外 source；
- Embedded 练习必须显式说明 ownership/lifetime、timeout、capacity、thread/ISR context 等边界。

完整规范见 [Runnable Exercise Audit & Contract](runnable-exercise-audit.md)。

## 每 7 天复盘

复盘至少检查：

- 头文件依赖
- 命名
- 所有权 / 生命周期
- 实时路径动态分配
- 错误模型
- ISR / volatile
- magic number
- 边界测试

并增加 Design Review：

- 本周变化轴与稳定边界
- Strategy / Factory / Adapter / Observer / State / Command 等模式是否真的需要
- value semantics / composition / runtime polymorphism / static polymorphism 的选择
- ownership / borrow / callback lifetime / teardown
- 过度 virtual、过度 shared_ptr、service locator、无界 runtime registration 等 overengineering 风险

## GitHub 目录

```text
daily/       每日完整课程
examples/    当日可编译 Lab 与 runnable exercises
patterns/    C++ Design Patterns 与 ownership 专题
frameworks/  经典工业框架源码解构（Asio 专题）
weekly/      周复盘
guidelines/  编码规范学习索引
docs/        学习路线、练习 Contract 与说明
progress.md  连续学习进度
```
