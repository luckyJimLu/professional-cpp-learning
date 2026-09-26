# Professional C++ Learning

基于 **Marc Gregoire · Professional C++, Sixth Edition（C++23）** 的每日工程化学习仓库。

面向已有 **C / Embedded** 基础的学习者，重点不是从零学习语法，而是完成：

> C 思维 → Modern C++ → Professional C++ → Embedded / Systems Engineering

## 当前进度

- **已完成：Day 1–32**
- **下一课：Day 33**
- 当前主线：**Chapter 5 · Designing with Classes**
- 更新方式：**GitHub Markdown only**
- Gmail 邮件投递：**已停止**

## 快速入口

- [16 周学习路线](docs/learning-plan.md)
- [完整学习进度](progress.md)
- [Embedded C++ 编码规范索引](guidelines/embedded-cpp-guideline-notes.md)
- [每日课程目录](daily/)
- [周复盘目录](weekly/)

## 最近课程

- [Day 32 · is-a、not-a、类层次与 Mixin](daily/day-032-inheritance-is-a-hierarchies-mixins.md)
- [Day 31 · 对象所有权、生命周期与资源管理边界](daily/day-031-ownership-lifetime-resource-boundaries.md)
- [Day 30 · Composition：用对象组合分配职责](daily/day-030-composition-object-responsibilities.md)
- [Day 29 · 构造函数、初始化与让非法状态难以表示](daily/day-029-constructors-initialization-valid-state.md)
- [Day 28 · 类的不变量与最小公共接口](daily/day-028-class-invariants-minimal-interface.md)

## 每日课程结构

每节约 60 分钟：

1. 今日章节与建议阅读范围
2. 昨日复习 3 问
3. 核心概念讲解
4. C 写法 vs Modern C++
5. 今日编码规范
6. 可编译小实验 / 代码练习
7. 3 个常见坑
8. 2 道检查题

每 7 天安排一次工程化周复盘。

## 仓库结构

```text
.
├── README.md
├── progress.md
├── docs/
│   └── learning-plan.md
├── daily/
│   ├── day-001-*.md
│   ├── ...
│   └── day-032-*.md
├── examples/
│   └── day-XXX/
├── weekly/
│   ├── week-01-review.md
│   └── ...
└── guidelines/
    └── embedded-cpp-guideline-notes.md
```

## 编码规范基线

课程示例持续遵循以下规则：

- 类型：`PascalCase`
- 函数：`PascalCase`
- 变量 / 参数：`snake_case`
- 成员：`snake_case_`
- 常量：`kPascalCase`
- 强类型枚举：`enum class`
- 所有权清晰，优先 RAII / value semantics
- required borrow 优先引用，optional borrow 明确 `nullptr` 语义
- 实时路径避免无界动态分配
- 阻塞 API 必须显式 timeout
- 避免 magic number
- 开启 `-Wall -Wextra -Wconversion`
- 持续引入 clang-format / clang-tidy / tests / CI

## 历史迁移说明

Day 1–30 的大部分课程由原 Gmail 正文转换为 Markdown。

以下课程因当时邮件投递失败或邮件流程已停止，依据既有学习记录重建：

- Day 7
- Day 13
- Day 31
- Day 32

后续课程直接以 Markdown 作为唯一主版本，不再维护邮件版。
