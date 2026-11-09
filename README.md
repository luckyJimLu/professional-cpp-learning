# Professional C++ Learning

基于 **Marc Gregoire · Professional C++, Sixth Edition（C++23）** 的每日工程化学习仓库。

面向已有 **C / Embedded** 基础的学习者，重点不是从零学习语法，而是完成：

> C 思维 → Modern C++ → Professional C++ → Embedded / Systems Engineering

## 当前进度

- **已发布：Day 1–76**
- **当前课程：Day 76（已发布 / 待学习）**
- **下一课：Day 77 · 第 11 周复盘（Day 71–76）：构造、对象销毁与 teardown**
- **主教材后续：Assignment Operators（p.288 起；周复盘后继续）**
- 当前主线：**Chapter 8 · Gaining Proficiency with Classes and Objects**
- 更新方式：**GitHub Markdown only**
- Gmail 邮件投递：**已停止**

## 快速入口

- [16 周学习路线](docs/learning-plan.md)
- [完整学习进度](progress.md)
- [Embedded C++ 编码规范索引](guidelines/embedded-cpp-guideline-notes.md)
- [每日课程目录](daily/)
- [周复盘目录](weekly/)
- [专题目录](topics/)（跨 Day 的源码精读 / 深挖主题）

## 专题

不占用 Day 编号的深挖内容，自成目录（含正文与可编译实验）：

- [shared_ptr 实现原理：控制块、引用计数与内存序](topics/stdlib/shared-ptr-internals/)（衔接 Day 60 智能指针主题）

## 最近课程

- [Day 76 · Object Destruction：析构顺序、RAII 与可控 Teardown](daily/day-076-object-destruction-raii-teardown.md)
- [Day 75 · Summary of Compiler-Generated Constructors：默认生成、显式 default/delete 与资源语义](daily/day-075-summary-compiler-generated-constructors.md)
- [Day 74 · Converting Constructors and Explicit Constructors：显式转换与强类型边界](daily/day-074-converting-constructors-explicit.md)
- [Day 73 · Delegating Constructors：统一构造入口与类不变量](daily/day-073-delegating-constructors.md)
- [Day 72 · Initializer-List Constructors：花括号初始化的重载规则与边界](daily/day-072-initializer-list-constructors.md)
- [Day 71 · Copy Constructors and Value Semantics](daily/day-071-copy-constructors-value-semantics.md)
- [Day 70 · 构造函数成员初始化列表与成员顺序](daily/day-070-constructor-initializer-list-member-order.md)
- [Day 69 · 对象创建与构造函数](daily/day-069-object-creation-constructors.md)
- [Day 68 · 对象存储期、this 与 C++23 显式对象参数](daily/day-068-object-storage-this-explicit-object-parameter.md)
- [Day 67 · Class Encapsulation and Member Functions](daily/day-067-class-encapsulation-member-functions.md)

## 每日课程结构

每节约 60 分钟，固定十个环节：

1. 今日章节与建议阅读范围
2. 昨日复习 3 问
3. 核心概念
4. C 写法 vs Modern C++
5. 设计模式映射与稳定边界
6. Embedded / System Design 场景
7. 今日编码规范
8. 可独立编译运行的 Lab / 练习
9. 3 个常见坑
10. 检查题（2 道知识/代码题 + 1 道设计题）

每 7 天安排一次包含 Code Review 与 Design Review 的工程化周复盘。

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
│   └── day-075-*.md
├── examples/
│   └── day-XXX/
├── topics/
│   └── stdlib/
│       └── shared-ptr-internals/     # 专题：正文 README.md + lab/main.cpp
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


## Learning Console

仓库现已包含第一版 **Professional C++ Learning Console**。课程 Markdown 仍然是唯一内容源，Web UI 只负责学习流、Lab、复盘与进度状态。

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
- Lesson：Compile Rail + 10 阶段学习流
- Lab：可编辑 C++ 代码 + 浏览器内 Clang/WASM Compile & Run
- Review：每 7 天复盘入口
- Guidelines：直接渲染 Embedded C++ Guideline Markdown
- Progress：课程覆盖与学习证据

仓库内部（设计与维护）：

- [设计规范](docs/design/DESIGN.md)
- [交互契约](docs/design/UX-CONTRACT.md)
- [学习体验规范](docs/design/learning-ux.md)
- [内容契约](docs/maint/content-contract.md)

> 历史课程保留 Markdown 正文；课程 metadata 集中在 `daily/lessons.meta.json`，独立 Lab 源码位于 `examples/day-XXX/`。


### 浏览器 C++ 编译

Lab 使用 `@live-codes/clang-wasm` 在 Web Worker 中懒加载 Clang 22 工具链：

- 浏览器本地编译与运行，不需要编译服务账号；
- 默认 `gnu++23`；
- 编译参数：`-Wall -Wextra -Wconversion -Wpedantic`；
- 首次点击 Compile & Run 时才下载工具链；
- 后续编译复用同一页面会话中的 WASM runtime；
- `npm run dev` / `npm run build` 会自动把 runtime assets 复制到 `public/clang`。

工具链体积较大，因此不在 Today / Lesson 首屏预加载。
