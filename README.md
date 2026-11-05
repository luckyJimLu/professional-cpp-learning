# Professional C++ Learning

基于 **Marc Gregoire · Professional C++, Sixth Edition（C++23）** 的每日工程化学习仓库。

面向现代 C++ 入门学习者，保留 C / Embedded 工程进阶路径。零基础先看[新手入门手册](docs/beginner-start.md)，已有 C 基础可按前置导航查缺补漏：

> C 思维 → Modern C++ → Professional C++ → Embedded / Systems Engineering

## 在线学习平台

- [学习控制台](https://luckyJimLu.github.io/professional-cpp-learning/)：课程、专题、Lab、代码搜索与学习复盘。
- [RTOS 并发模拟器](https://luckyJimLu.github.io/professional-cpp-learning/rtos.html)：独立的调度与同步机制教学工作台。

## 当前进度

- **已发布：Day 1–71**
- **下一课：Day 72 · Chapter 8 · Initializer-List Constructors**
- 当前主线：**Chapter 8 进行中；Day 71 完成 Copy Constructors 与 value semantics**
- 更新方式：**GitHub Markdown only**（每日课程正文 + `daily/lessons.meta.json` 元数据条目，两者同步提交）

## 快速入口

- [C++ 常见问题与核心概念辨析 (FAQ)](docs/faq.md)（含修饰符、限定符与属性全景）
- [C++ 新特性与标准来源速查](docs/cpp-feature-standards.md)（各课课首标注版本）
- [C / C++ 独立速查小册子与关键字查找](booklets/README.md)（网页主导航「小册子」）
- [新手起步：编辑、编译、运行与学习方法](docs/beginner-start.md)
- [Day 1–67 逐课导航与前置知识](docs/beginner-course-map.md)
- [完整学习进度](progress.md)
- [章节里程碑与 16 周顺序参考](docs/learning-plan.md)
- [可运行练习审计与契约](docs/maint/runnable-exercise-audit.md)
- [C++ Design Patterns · 工程化专题](patterns/)
- [所有权与智能指针](patterns/ownership-and-smart-pointers.md)
- [Embedded C++ 编码规范索引](guidelines/embedded-cpp-guideline-notes.md)
- [每日课程](daily/)
- [周复盘](weekly/)

## 学习原则

设计模式专题不占用每日 Day 编号；每日课程仍严格按《Professional C++》章节顺序推进。设计模式只用于解释真实变化轴和稳定边界。

核心原则：**先识别变化，再建立稳定边界；先设计 lifetime，再选择 pointer。**

优先使用值语义、组合和小接口，仅在需要运行时替换时才引入虚接口。嵌入式场景需持续审计堆内存、锁、阻塞调用、回调、注册机制、Flash/RAM 占用与 WCET 上界。

## 最近课程

- [Day 71 · Copy Constructors：复制语义与独立对象边界](daily/day-071-copy-constructors-value-semantics.md)
- [Day 70 · 构造函数成员初始化列表：直接初始化与成员顺序](daily/day-070-constructor-initializer-list-member-order.md)
- [Day 69 · 对象创建与构造函数：让对象从出生起就有效](daily/day-069-object-creation-constructors.md)
- [Day 68 · 对象存储期、this 与 C++23 显式对象参数](daily/day-068-object-storage-this-explicit-object-parameter.md)
- [Day 67 · class 封装、成员函数与对象不变量](daily/day-067-class-encapsulation-member-functions.md)
- [Day 66 · Memory Management 资源边界决策树](daily/day-066-memory-management-resource-boundary-decision-tree.md)
- [Day 65 · optional 生命周期与固定池安全边界](daily/day-065-optional-fixed-pool-lifetime-boundaries.md)
- [Day 64 · 对象生命周期、placement 构造与固定存储复用](daily/day-064-object-lifetime-placement-construction-fixed-pool.md)
- [Day 63 · PMR、有界分配与内存资源策略](daily/day-063-pmr-bounded-allocation-resource-policy.md)

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

代码类“修复/重构/实现/调试”练习须落地为独立的 `exercise-XX.cpp`，可直接编译运行；纯知识问答与设计题不强制生成源码。CI 会编译并运行 `examples/day-*/*.cpp` 下的全部独立 C++ 源文件。

每 7 天安排工程化周复盘，并增加 Design Review：变化轴、稳定边界、Pattern 选择、ownership/lifetime 与 overengineering 检查。

## 仓库结构

```text
.
├── README.md
├── progress.md
├── daily/                       # 已发布课程 Day 1–70
├── weekly/                      # 周复盘
├── patterns/                    # 设计模式专题（含书籍示例源码 examples/）
├── examples/                    # 每日课程 main.cpp 与独立 exercise-XX.cpp
│   └── day-XXX/
├── booklets/                    # C / C++ 独立速查小册子（含配套源码 examples/）
├── guidelines/                  # 编码规范与评审标准
├── frameworks/                  # 平台专题：asio / openharmony / trace32
├── references/                  # 迁移参考资料（system-design-notes 冻结基线；reading-paths 书单导读）
├── assets/                      # 内容资源镜像树（正文目录仅允许 .md 文本）
├── docs/                        # 内容区①文档 + design/（产品与设计规范）+ maint/（维护者文档与归档）
├── slides/                      # Slidev 课件工程（lesson-01..03）
├── PPT/                         # 课件大纲源
├── include/                     # RTOS 模拟器声明头
├── src/                         # 学习平台前端（React/Vite）
├── public/                      # 运行时静态资源（clang-wasm、内存轨迹）
├── scripts/                     # 内容管道（build-content.py）
├── utils/                       # Windows 远程脚本运行器等工具
├── books/                       # 参考书籍 PDF
├── tools/                       # CI 检查器（check-course/check-examples/…）
├── tests/                       # Playwright/单元测试
└── .github/workflows/           # 构建、部署与内容路径过滤
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
npm run build:content     # 内容契约校验 + manifest/搜索索引 + 内容镜像 public/content
npm run build             # 前端构建（prebuild 自动执行 build:content，vite 复制到 dist/content）
```

课程与专题正文以仓库 Markdown 为内容源，经 `scripts/build-content.py` 生成 `manifest.json`、`search-index.json` 与内容镜像，Web 端在运行时按需读取：内容变更不再触发前端重构建。契约说明见 [docs/maint/content-contract.md](docs/maint/content-contract.md)。

CI 发布分两条流水线：仅改内容（daily/weekly/booklets/docs 区① 等）时走 `content` 快速通道，只跑 Python 管道并用缓存的上一次 `dist/` 直接刷新内容子树；前端或公共资源变更则走全量 `app` 重建（`deploy.yml` 双 job 分流）。`web-build.yml` 对 `docs/maint/**`、`docs/design/**`、`README.md` 不触发。

GitHub Pages 必须选择 **GitHub Actions** 作为发布来源，由 Vite 构建并部署 `dist/`。
配置与故障排查见 [GitHub Pages 部署说明](docs/github-pages.md)。

## 课件（Slidev PPT）

课程大纲 `PPT/设计模式大纲.md` 由 [`.opencode/skills/slidev-ppt`](.opencode/skills/slidev-ppt) 技能生成工程蓝图风格的交互式课件（`slides/lesson-0X.md`）。课件生成已集成到本仓库的脚本与 CI 中。

```bash
npm run ppt:sync
npm run ppt:install
npm run ppt:check
npm run ppt:build
npm run ppt:export
npm run ppt:all
```

- 校验器 CLI：`python3 .opencode/skills/slidev-ppt/scripts/check_slides.py DECK --outline PPT/设计模式大纲.md --lesson N`（`--strict` 将 warning 视为 error）。
- 技能体系说明：[`.opencode/skills/README.md`](.opencode/skills/README.md)。
- CI：`.github/workflows/web-build.yml` 与 `deploy.yml` 在构建前执行 `npm run ppt:check`。

### 第 2 课：SOLID 与 GoF 的 Modern C++ 重构

- [43 页课件](slides/lesson-02.md)：覆盖大纲 12 个 PPT 单元，含原始代码、完整演讲者备注、依赖对照图与性能表。
- [页面溯源、术语与大纲歧义说明](slides/lesson-02-traceability.md)。主站「课件」选择器自动发现第 2 课。

```bash
npm --prefix slides run dev:02
npm --prefix slides run build:02
npm --prefix slides run export:02
npm --prefix slides run build:all
```

### 第 3 课：架构解耦与值语义多态

- [44 页课件](slides/lesson-03.md)：覆盖物理依赖、Pimpl／Bridge、DIP、外部多态、Prototype、Type Erasure、SBO 与 Concepts。
- [页面溯源、术语与技术边界](slides/lesson-03-traceability.md)。主站「课件」选择器自动发现第 3 课；这是全课程终章。

```bash
npm --prefix slides run dev:03
npm --prefix slides run build:03
npm --prefix slides run export:03
npm --prefix slides run build:all
npm run ppt:build
```
