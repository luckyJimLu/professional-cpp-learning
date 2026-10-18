# Professional C++ Learning

基于 **Marc Gregoire · Professional C++, Sixth Edition（C++23）** 的每日工程化学习仓库。

面向已有 **C / Embedded** 基础的学习者：

> C 思维 → Modern C++ → Professional C++ → Embedded / Systems Engineering

## 在线学习平台

- 🌐 [Learning Console](https://luckyJimLu.github.io/professional-cpp-learning/)
- 支持课程阅读、Compile Rail、C++23 WebAssembly Lab、代码/Markdown 搜索与 Mermaid 图表。

## 当前进度

- **已发布：Day 1–53**
- **下一课：Day 54**
- 当前主线：**Chapter 6 · Designing for Reuse**
- 更新方式：**GitHub Markdown only**

## 快速入口

- [16 周学习路线](docs/learning-plan.md)
- [Runnable Exercise Audit & Contract](docs/runnable-exercise-audit.md)
- [完整学习进度](progress.md)
- [C++ Design Patterns · 工程化专题](patterns/)
- [Ownership & Smart Pointers](patterns/ownership-and-smart-pointers.md)
- [Asio 框架解构](frameworks/asio/)
- [OpenHarmony · Mini／轻量系统文档模块](frameworks/openharmony/README.md)
- [TRACE32 · RTOS 稳定性分析](frameworks/trace32/README.md)
- [Utils · 工程实用工具](utils/)
- [Windows Remote Script Runner · Remote-SSH + SCP Hook](utils/windows-remote-script-runner/README.md)
- [Embedded C++ 编码规范索引](guidelines/embedded-cpp-guideline-notes.md)
- [每日课程](daily/)
- [周复盘](weekly/)
- [Mermaid 图表指南](docs/mermaid.md)

## 学习原则

设计模式专题不占用每日 Day 编号；每日课程仍严格按《Professional C++》章节顺序推进。设计模式只用于解释真实变化轴和稳定边界。

核心原则：**先识别变化，再建立稳定边界；先设计 lifetime，再选择 pointer。**

优先 value semantics / composition / 小接口；需要 runtime replacement 时才引入 virtual interface。Embedded 场景持续审计 heap、锁、blocking、callback、registration、flash/RAM 与 WCET 上界。

## 最近课程

- [Day 53 · Designing a Successful Abstraction](daily/day-053-designing-successful-abstraction.md)
- [Day 52 · Reconciling Generality and Ease of Use](daily/day-052-reconciling-generality-ease-of-use.md)
- [Day 51 · Design General-Purpose Interfaces](daily/day-051-general-purpose-interfaces.md)
- [Day 50 · Design Interfaces That Are Easy to Use](daily/day-050-easy-to-use-interfaces.md)
- [Day 49 · Consider the Audience and Purpose](daily/day-049-consider-audience-purpose.md)

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
├── docs/
│   └── runnable-exercise-audit.md
├── patterns/
├── frameworks/
│   └── openharmony/
├── utils/
│   └── windows-remote-script-runner/
├── daily/
│   ├── day-001-*.md
│   ├── ...
│   └── day-053-*.md
├── examples/
│   └── day-XXX/
│       ├── main.cpp
│       ├── exercise-01.cpp
│       └── exercise-01-solution.cpp
├── weekly/
└── guidelines/
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

## Learning Console

课程 Markdown 是唯一内容源，Web UI 负责学习流、Lab、复盘与进度。

```bash
npm install
npm run dev
npm run check:course
npm run build
npm run test:e2e
```

Lab 使用浏览器内 Clang/WASM，默认 C++23。设计与 Agent 约束见 [DESIGN.md](DESIGN.md)、[UX-CONTRACT.md](UX-CONTRACT.md) 与 [Learning UX](docs/learning-ux.md)。

从 `system-design-notes` 导入的资料位于 `references/system-design-notes/`，详见 [迁移说明](docs/content-migration.md)。
