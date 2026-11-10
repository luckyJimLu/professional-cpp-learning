# 周复盘与设计评审（Weekly Reviews）

本目录存放每 7 天安排的工程化周复盘文档。复盘不只是巩固语法知识，更包含针对真实系统的 Design Review，重点审查变化轴、稳定边界、模式选择与资源生命周期。

## 复盘节奏与机制

每满 7 天课程进行一次周复盘。周复盘结合代码审查与架构评审，评估本周知识链在工程实践中的落地方案。

部分周复盘在 `daily/` 目录下配套了完整的工程实践或章节收束课程：

* [Day 7 · 第 1 周复盘：Modem 控制模块](../daily/day-007-week1-review-modem-control.md)
* [Day 21 · 周复盘：可测试 Modem 架构](../daily/day-021-weekly-review-testable-modem-architecture.md)
* [Day 27 · Chapter 4 收束：稳定设计与变更验证](../daily/day-027-chapter4-wrap-stable-design.md)
* [Day 55 · 第 6 章小结与工程练习](../daily/day-055-chapter6-review-exercises.md)
* [Day 66 · Memory Management 资源边界决策树](../daily/day-066-memory-management-resource-boundary-decision-tree.md)

## 周复盘清单

| 周次 | 对应课程 | 复盘主题与重点 | 复盘文档 |
| --- | --- | --- | --- |
| 第 01 周 | Day 1–7 | C 到 Modern C++ 基础迁移、初始化、const/constexpr 与 Modem 控制模块 | [week-01-review.md](week-01-review.md) |
| 第 02 周 | Day 8–14 | std::string 与 std::string_view 零拷贝文本处理、代码风格与头文件依赖边界 | [week-02-review.md](week-02-review.md) |
| 第 03 周 | Day 15–21 | 命名规范、工具链门禁、错误模型与 Chapter 4 需求到架构演进 | [week-03-review.md](week-03-review.md) |
| 第 04 周 | Day 22–28 | 抽象与复用、内聚与耦合、设计契约以及 Chapter 5 类不变量起点 | [week-04-review.md](week-04-review.md) |
| 第 05 周 | Day 29–35 | Chapter 5 对象设计判断框架：构造函数、组合、所有权与虚接口多态 | [week-05-review.md](week-05-review.md) |
| 第 06 周 | Day 36–42 | 类关系演进、Has-a 与 Is-a 边界、多继承契约与面向复用设计 | [week-06-review.md](week-06-review.md) |
| 第 07 周 | Day 43–49 | 可复用代码结构、概念模板、扩展性设计与易用接口原则 | [week-07-review.md](week-07-review.md) |
| 第 08 周 | Day 50–56 | 复用边界收束、分层 API、设计模式审查与内存所有权基础 | [week-08-review.md](week-08-review.md) |
| 第 09 周 | Day 57–63 | 智能指针所有权转移、回调生命周期拆除、PMR 与资源分配策略 | [week-09-review.md](week-09-review.md) |
| 第 10 周 | Day 64–70 | 对象生命周期、固定存储、class invariant、构造函数与成员初始化顺序 | [week-10-review.md](week-10-review.md) |
| 第 11 周 | Day 71–77 | Copy、initializer-list、delegating/explicit constructors、compiler-generated operations、destruction 与 callback teardown | [week-11-review.md](week-11-review.md) |
