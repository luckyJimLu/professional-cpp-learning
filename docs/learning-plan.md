# Professional C++ 16 周学习路线

主教材：*Professional C++, Sixth Edition*（Marc Gregoire，C++23）

辅教材：*Embedded C++ Coding Guideline · Google-based · v1.0*

## 目标

面向已有 C / 嵌入式开发基础的学习者，建立现代 C++ 工程能力，并尽量将示例贴近 RTOS、BSP、Driver、Middleware、Modem 与 Embedded Linux。

## 16 周路线

- **第 1–2 周 · Part I**
  - Ch1 A Crash Course in C++ and the Standard Library
  - Ch2 Strings and String Views
  - Ch3 Coding with Style
- **第 3 周 · Part II**
  - Ch4 Designing Professional C++ Programs
  - Ch5 Designing with Classes
  - Ch6 Designing for Reuse
- **第 4–11 周 · Part III**
  - Ch7 Memory Management ➔ *(推荐结合 [frameworks/asio/SESSION_LIFECYCLE.md](../frameworks/asio/SESSION_LIFECYCLE.md) 研读智能指针与异步生命周期)*
  - Ch8–9 Classes and Objects
  - Ch10 Inheritance
  - Ch11 Modules / Header Files / Miscellaneous
  - Ch12 Templates
  - Ch13 I/O ➔ *(推荐结合 [frameworks/asio/ARCHITECTURE.md](../frameworks/asio/ARCHITECTURE.md) 研读 Proactor/Reactor 事件驱动网络 I/O)*
  - Ch14 Error Handling
  - Ch15 Operator Overloading
  - Ch16 Standard Library Overview
  - Ch17 Iterators / Ranges
  - Ch18 Containers
  - Ch19 Function Pointers / Function Objects / Lambdas
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
  - Ch33 Design Patterns
  - Ch34 Cross-Platform / Cross-Language Development

## 每日约 60 分钟结构

1. 今日章节与建议阅读范围
2. 昨日复习 3 问
3. 核心概念讲解
4. C 写法 vs 现代 C++ 写法
5. 今日编码规范
6. 可编译小实验 / 代码练习
7. 3 个常见坑
8. 2 道检查题

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

## GitHub 目录

```text
daily/       每日完整课程
examples/    当日可编译代码
frameworks/  经典工业框架源码解构（Asio 专题）
weekly/      周复盘
guidelines/  编码规范学习索引
docs/        学习路线与说明
progress.md  连续学习进度
```
