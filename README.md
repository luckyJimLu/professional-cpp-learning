# Professional C++ Learning

基于 **Marc Gregoire · Professional C++, Sixth Edition（C++23）** 的每日工程化学习仓库。

面向现代 C++ 入门学习者，保留 C / Embedded 工程进阶路径。零基础先看[新手入门手册](docs/beginner-start.md)，已有 C 基础可按前置导航查缺补漏：

> C 思维 → Modern C++ → Professional C++ → Embedded / Systems Engineering

## 在线学习平台

- [Learning Console](https://luckyJimLu.github.io/professional-cpp-learning/)：课程、专题、Lab、代码搜索与学习复盘。
- [RTOS 并发模拟器](https://luckyJimLu.github.io/professional-cpp-learning/rtos.html)：独立的调度与同步机制教学工作台。

## 当前进度

- **已发布：Day 1–64**
- **下一课：Day 65 · Chapter 7 · Memory Management**
- 当前主线：**Chapter 7 · Memory Management：ownership / resource policy / bounded allocation / object lifetime**
- 更新方式：**GitHub Markdown only**

## 快速入口

- [C++ 新特性与标准来源速查](docs/cpp-feature-standards.md)（各课课首标注版本）
- [C 语言速查小册子与关键字查找](booklets/README.md)（网页主导航「小册子」）

- [新手起步：编辑、编译、运行与学习方法](docs/beginner-start.md)
- [Day 1–64 逐课导航与前置知识](docs/beginner-course-map.md)

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

- [Day 64 · Object Lifetime, Placement Construction and Fixed Storage Reuse](daily/day-064-object-lifetime-placement-construction-fixed-pool.md)
- [Day 63 · PMR, Bounded Allocation and Memory-Resource Policy](daily/day-063-pmr-bounded-allocation-resource-policy.md)
- [Day 62 · Smart Pointer Aliasing, Casts and Ownership API Boundaries](daily/day-062-smart-pointer-aliasing-casts-ownership-api.md)
- [Day 61 · enable_shared_from_this · Async Callback Lifetime and Teardown](daily/day-061-enable-shared-from-this-callback-lifetime.md)
- [Day 60 · Shared Ownership · shared_ptr, weak_ptr and Lifetime Cycles](daily/day-060-shared-ptr-weak-ptr-lifetime.md)

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
├── daily/                       # 已发布课程 Day 1–64
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

GitHub Pages 必须选择 **GitHub Actions** 作为发布来源，由 Vite 构建并部署 `dist/`。
配置与故障排查见 [GitHub Pages 部署说明](docs/github-pages.md)。

## 课件（Slidev PPT）

课程大纲 `PPT/设计模式大纲.md` 由 [`.opencode/skills/slidev-ppt`](.opencode/skills/slidev-ppt) 技能生成工程蓝图风格的交互式课件（`slides/lesson-0X.md`）。课件生成已集成到本仓库的脚本与 CI 中。

```bash
npm run ppt:sync       # 同步技能主题（style.css / global-top.vue / components）到 slides/
npm run ppt:install    # 首次安装 slides/ 依赖
npm run ppt:check      # 校验全部 slides/lesson-*.md（三栏防幻觉 + 结构/词表/资源）+ 技能回归测试
npm run ppt:build      # 构建静态站点到 slides/dist/
npm run ppt:export     # 导出 PDF
npm run ppt:all        # sync -> check -> build
```

- 校验器 CLI：`python3 .opencode/skills/slidev-ppt/scripts/check_slides.py DECK --outline PPT/设计模式大纲.md --lesson N`（`--strict` 将 warning 视为 error）。
- 技能体系说明：[`.opencode/skills/README.md`](.opencode/skills/README.md)。
- CI：`.github/workflows/web-build.yml` 与 `deploy.yml` 在构建前执行 `npm run ppt:check`。

### 第 2 课：SOLID 与 GoF 的 Modern C++ 重构

- [43 页课件](slides/lesson-02.md)：覆盖大纲 12 个 PPT 单元，含原始代码、完整演讲者备注、依赖对照图与性能表。
- [页面溯源、术语与大纲歧义说明](slides/lesson-02-traceability.md)。主站「课件」选择器自动发现第 2 课。

```bash
npm --prefix slides run dev:02       # 交互预览第 2 课
npm --prefix slides run build:02     # 构建至 slides/dist/lesson-02
npm --prefix slides run export:02    # 导出第 2 课 PDF
npm --prefix slides run build:all    # 构建第 1、2 课
```

### 第 3 课：架构解耦与值语义多态

- [44 页课件](slides/lesson-03.md)：覆盖物理依赖、Pimpl／Bridge、DIP、外部多态、Prototype、Type Erasure、SBO 与 Concepts。
- [页面溯源、术语与技术边界](slides/lesson-03-traceability.md)。主站「课件」选择器自动发现第 3 课；这是全课程终章。

```bash
npm --prefix slides run dev:03       # 交互预览
npm --prefix slides run build:03     # 构建至 slides/dist/lesson-03
npm --prefix slides run export:03    # 导出第 3 课 PDF
npm --prefix slides run build:all    # 构建第 1、2、3 课
npm run ppt:build                    # 构建全部三课
```
