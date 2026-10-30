# Professional C++ Learning

基于 **Marc Gregoire · Professional C++, Sixth Edition（C++23）** 的每日工程化学习仓库。

面向现代 C++ 入门学习者，保留 C / Embedded 工程进阶路径。零基础先看[新手入门手册](docs/beginner-start.md)，已有 C 基础可按前置导航查缺补漏：

> C 思维 → Modern C++ → Professional C++ → Embedded / Systems Engineering

## 在线学习平台

- [学习控制台](https://luckyJimLu.github.io/professional-cpp-learning/)：课程、专题、Lab、代码搜索与学习复盘。
- [RTOS 并发模拟器](https://luckyJimLu.github.io/professional-cpp-learning/rtos.html)：独立的调度与同步机制教学工作台。

## 当前进度

- **已发布：Day 1–65**
- **下一课：Day 66 · Chapter 7 · Memory Management**
- 当前主线：**Chapter 7 · Memory Management：ownership / resource policy / bounded allocation / object lifetime**
- 更新方式：**GitHub Markdown only**

## 快速入口

- [C++ 常见问题与核心概念辨析 (FAQ)](docs/faq.md)（含修饰符、限定符与属性全景）
- [C++ 新特性与标准来源速查](docs/cpp-feature-standards.md)（各课课首标注版本）
- [C / C++ 独立速查小册子与关键字查找](booklets/README.md)（网页主导航「小册子」）
- [新手起步：编辑、编译、运行与学习方法](docs/beginner-start.md)
- [Day 1–65 逐课导航与前置知识](docs/beginner-course-map.md)
- [完整学习进度](progress.md)
- [章节里程碑与 16 周顺序参考](docs/learning-plan.md)
- [可运行练习审计与契约](docs/runnable-exercise-audit.md)
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

- [Day 65 · optional 生命周期与固定池安全边界](daily/day-065-optional-fixed-pool-lifetime-boundaries.md)
- [Day 64 · 对象生命周期、placement 构造与固定存储复用](daily/day-064-object-lifetime-placement-construction-fixed-pool.md)
- [Day 63 · PMR、有界分配与内存资源策略](daily/day-063-pmr-bounded-allocation-resource-policy.md)
- [Day 62 · 智能指针别名、类型转换与所有权 API 边界](daily/day-062-smart-pointer-aliasing-casts-ownership-api.md)
- [Day 61 · enable_shared_from_this：异步回调生命周期与拆除](daily/day-061-enable-shared-from-this-callback-lifetime.md)

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
├── daily/                       # 已发布课程 Day 1–65
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
