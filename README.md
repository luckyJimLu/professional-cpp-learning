# Professional C++ Learning

基于 **Marc Gregoire · Professional C++, Sixth Edition（C++23）** 的每日工程化学习仓库。

面向已有 **C / Embedded** 基础的学习者：

> C 思维 → Modern C++ → Professional C++ → Embedded / Systems Engineering

## 在线学习平台

- [Learning Console](https://luckyJimLu.github.io/professional-cpp-learning/)：课程、专题、Lab、代码搜索与学习复盘。
- [RTOS 并发模拟器](https://luckyJimLu.github.io/professional-cpp-learning/rtos.html)：独立的调度与同步机制教学工作台。

## 当前进度

- **已发布：Day 1–57**
- **下一课：Day 58 · Chapter 7 · Memory Management**
- 当前主线：**Chapter 7 · Memory Management：smart pointers / ownership transfer / borrowing**
- 更新方式：**GitHub Markdown only**

## 快速入口

- [完整学习进度](progress.md)
- [章节里程碑与 16 周顺序参考](docs/learning-plan.md)
- [Runnable Exercise Audit & Contract](docs/runnable-exercise-audit.md)
- [C++ Design Patterns · 工程化专题](patterns/)
- [Ownership & Smart Pointers](patterns/ownership-and-smart-pointers.md)
- [Embedded C++ 编码规范索引](guidelines/embedded-cpp-guideline-notes.md)
- [每日课程](daily/)
- [周复盘](weekly/)

## 学习原则

设计模式专题不占用每日 Day 编号；每日课程仍严格按《Professional C++》章节顺序推进。设计模式只用于解释真实变化轴和稳定边界。

核心原则：**先识别变化，再建立稳定边界；先设计 lifetime，再选择 pointer。**

优先 value semantics / composition / 小接口；需要 runtime replacement 时才引入 virtual interface。Embedded 场景持续审计 heap、锁、blocking、callback、registration、flash/RAM 与 WCET 上界。

## 最近课程

- [Day 57 · Smart Pointers · Ownership Transfer and Borrowing](daily/day-057-smart-pointers-ownership-transfer.md)
- [Day 56 · Memory Management Foundations · Ownership and RAII](daily/day-056-memory-management-ownership-raii.md)
- [Day 55 · Chapter 6 Summary and Engineering Exercises](daily/day-055-chapter6-review-exercises.md)
- [Day 54 · The SOLID Principles](daily/day-054-solid-principles.md)
- [Day 53 · Designing a Successful Abstraction](daily/day-053-designing-successful-abstraction.md)

## 每日课程结构

每节约 60 分钟：

1. 今日章节与建议阅读范围
2. 昨日复习 3 问
3. 核心概念讲解
4. C 写法 vs Modern C++
5. 设计模式映射：变化轴、稳定边界、Pattern 是否值得使用
6. Embedded / System Design 场景
7. 今日编码规范
8. 可编译 Lab / Runnable Exercise
9. 3 个常见坑与 Pattern 滥用
10. 2 道检查题 + 1 道设计题

代码型“修复 / 重构 / 实现 / 调试”练习必须落成独立 `exercise-XX.cpp`，可以直接编译运行；纯知识问答和纯设计题不强制生成 source。CI 会编译并运行 `examples/day-*/*.cpp` 下的全部 standalone C++ 文件。

每 7 天安排工程化周复盘，并增加 Design Review：变化轴、稳定边界、Pattern 选择、ownership/lifetime 与 overengineering 检查。

## 仓库结构

```text
.
├── README.md
├── progress.md
├── daily/                       # 已发布课程 Day 1–57
├── weekly/
├── patterns/
├── frameworks/
├── docs/
├── examples/
│   └── day-XXX/                 # main.cpp 与独立 exercise-XX.cpp
├── guidelines/
├── tools/
└── tests/
```

## 编码规范基线

- 类型/函数：`PascalCase`
- 变量/参数：`snake_case`；成员：`snake_case_`；常量：`kPascalCase`
- `enum class`、RAII、value semantics、小接口
- required borrow 优先引用；optional borrow 明确 `nullptr`
- 单一 owner 优先；`unique_ptr` 表达 ownership transfer；谨慎 `shared_ptr`
- 实时路径避免无界动态分配；阻塞 API 显式 timeout
- 硬件单位明确、避免 magic number、覆盖边界测试
- `-Wall -Wextra -Wconversion -Wpedantic` + clang-format/clang-tidy/静态分析/单测/CI

## 本地验证

```bash
npm install
npm run check:course
npm run check:examples
npm run build
```

课程与专题正文以仓库 Markdown 为内容源，Web UI 负责导航、阅读、实验及复盘。
