# Professional C++ Learning

基于 **Marc Gregoire · Professional C++, Sixth Edition（C++23）** 的每日工程化学习仓库。

面向已有 **C / Embedded** 基础的学习者，重点不是从零学习语法，而是完成：

> C 思维 → Modern C++ → Professional C++ → Embedded / Systems Engineering

## 当前进度

- **已发布：Day 1–42**
- **下一课：Day 43**
- 当前主线：**Chapter 6 · Designing for Reuse**
- 更新方式：**GitHub Markdown only**
- Gmail 邮件投递：**已停止**

## 快速入口

- [16 周学习路线](docs/learning-plan.md)
- [完整学习进度](progress.md)
- [经典工业级框架解构 · Asio](frameworks/asio/)
- [Embedded C++ 编码规范索引](guidelines/embedded-cpp-guideline-notes.md)
- [每日课程目录](daily/)
- [周复盘目录](weekly/)

## 经典工业级框架解构（Framework Case Studies）

除了跟随教材逐步推进，本仓库还设立工业级框架深度解构专题，将抽象语言机制与顶级生产级基础设施直接对照：

- **[Asio 框架解构专栏](frameworks/asio/)**：总体分层架构、异步生命周期与 C++20 协程实战。

## 最近课程

- [Day 42 · Use Abstraction：用接口/实现分离建立可复用边界](daily/day-042-use-abstraction-for-reuse.md)
- [Day 41 · Designing for Reuse：复用从稳定 Contract 开始](daily/day-041-reuse-contracts-components.md)
- [Day 40 · Mixin Classes：用小型可组合行为扩展类型](daily/day-040-mixin-classes.md)
- [Day 39 · Multiple Inheritance：多个基类何时代表真实 contract](daily/day-039-multiple-inheritance-contracts.md)
- [Day 38 · Hierarchies：什么时候类层级真正有价值](daily/day-038-hierarchies.md)

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
├── frameworks/
│   └── asio/
├── daily/
│   ├── day-001-*.md
│   ├── ...
│   └── day-042-*.md
├── examples/
│   └── day-XXX/
├── weekly/
│   ├── week-01-review.md
│   └── ...
└── guidelines/
    └── embedded-cpp-guideline-notes.md
```

## 编码规范基线

- 类型：`PascalCase`；函数：`PascalCase`
- 变量 / 参数：`snake_case`；成员：`snake_case_`；常量：`kPascalCase`
- 强类型枚举：`enum class`
- 所有权清晰，优先 RAII / value semantics
- required borrow 优先引用，optional borrow 明确 `nullptr` 语义
- 实时路径避免无界动态分配
- 阻塞 API 必须显式 timeout
- 避免 magic number
- 开启 `-Wall -Wextra -Wconversion`
- 持续引入 clang-format / clang-tidy / tests / CI

## 历史迁移说明

Day 1–30 的大部分课程由原 Gmail 正文转换为 Markdown；Day 7、13、31、32 依据既有学习记录重建。后续课程直接以 Markdown 作为唯一主版本，不再维护邮件版。

## Learning Console

仓库包含 **Professional C++ Learning Console**。课程 Markdown 是唯一内容源，Web UI 负责学习流、Lab、复盘与进度状态。

### 本地运行

```bash
npm install
npm run dev
```

生产构建：

```bash
npm run build
npm run preview
```

### 第一版页面

- Today：根据 `progress.md` 和现有 Day 自动确定当前位置
- Roadmap：按 Week / Part 生成纵向课程路径
- Lessons：从 `daily/*.md` 自动建立课程索引
- Lesson：Compile Rail + 8 阶段学习流
- Lab：可编辑 C++ 代码 + 浏览器内 Clang/WASM Compile & Run
- Review：每 7 天复盘入口
- Guidelines：直接渲染 Embedded C++ Guideline Markdown
- Progress：课程覆盖与学习证据

设计与 Agent 约束：[DESIGN.md](DESIGN.md) · [UX-CONTRACT.md](UX-CONTRACT.md) · [Learning UX](docs/learning-ux.md)

> Day 1–32 无需批量迁移即可使用。Day 33 起使用 YAML frontmatter + 独立 Lab 文件作为新内容契约示范。

### 浏览器 C++ 编译

Lab 使用 `@live-codes/clang-wasm` 在 Web Worker 中懒加载 Clang 22 工具链，默认 `gnu++23`，编译参数为 `-Wall -Wextra -Wconversion -Wpedantic`。工具链仅在首次 Compile & Run 时加载，避免首屏预加载大型 runtime。
