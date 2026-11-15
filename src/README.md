# Web 控制台前端源码 (src)

`src` 目录包含基于 React 19、Vite、TypeScript 与 Tailwind CSS 4 构建的单页应用（SPA）源码，遵循**内容元数据、领域逻辑/状态、展示视图与样式分离**的分层架构，提供 C++ 课程导航、交互式 Lab、内存可视化工具、RTOS 调度模拟器与速查小册子等功能。

## 目录用途

作为在线学习平台的前端核心，按职责划分为静态元数据层（`data/`）、无状态领域服务层（`lib/`）、通用状态 Hook 层（`hooks/`）、展示视图与文档渲染组件（`components/`）、独立工作台子系统（`visualizer/`、`rtos-sim/`）及模块化样式层（`styles/`），并在浏览器端通过 WebAssembly 实现 C++ 代码编译与运行。

## 目录结构

```text
src/
├── App.tsx                    # 应用主入口，处理视图路由与懒加载
├── main.tsx                   # React 挂载点
├── index.css                  # 全局样式总入口（Tailwind 指令与 legacy 分层导入）
├── data/                      # 内容与静态元数据（阶段说明、周主题、学习入口、FAQ 概览、C++ 演示预设）
│   ├── courseMetadata.ts
│   └── visualizerPresets.ts
├── hooks/                     # 跨视图通用状态与交互 Hook
│   ├── useAsyncContent.ts     # 统一异步加载 / 重试 / 错误状态机
│   └── useHeadingScrollSpy.ts # 标题锚点提取与目录滚动高亮
├── lib/                       # 领域服务层（内容运行时、课程/专题/小册子/搜索/导航/进度与编译客户端）
├── components/                # UI 与展示组件库
│   ├── Shell.tsx              # 全局导航壳层
│   ├── common/                # 跨视图通用布局部件（PageHeader、CompileRail、Icon）
│   ├── markdown/              # Markdown、代码高亮、Mermaid、PlantUML 与延迟加载边界
│   ├── slides/                # Slidev 课件渲染与控制组件
│   ├── ui/                    # 基于 Radix UI 的原子组件
│   └── views/                 # 全部顶层路由视图（Today、Lessons、Lesson、Topics、CodeSearch、Lab 等）
├── rtos-sim/                  # RTOS 并发模拟器引擎与专属 UI
├── visualizer/                # C++ 内存可视化工作台与 Trace 播放引擎（含 useSplitPane）
├── workers/                   # Web Worker（Clang WASM 与 RTOS 模拟）
├── styles/                    # 模块化样式表（theme、base、workspace、docs、product-ui、booklets、slides）
└── types/                     # 全局 TypeScript 类型声明
```

## 关键模块表

| 模块 / 文件 | 主要功能 |
| --- | --- |
| [App.tsx](App.tsx) | 应用路由主入口，管理全局 View 切换与页面预加载 |
| [data/courseMetadata.ts](data/courseMetadata.ts) | 课程标题回退、周次主题、学习阶段描述与 FAQ 速览卡片配置 |
| [data/visualizerPresets.ts](data/visualizerPresets.ts) | Lab 与内存可视化工作台共享的 C++ 演示源码预设 |
| [hooks/useAsyncContent.ts](hooks/useAsyncContent.ts) | 通用异步加载状态与重试 Hook |
| [hooks/useHeadingScrollSpy.ts](hooks/useHeadingScrollSpy.ts) | 文档标题目录提取与滚动高亮 Hook |
| [lib/browserCompiler.ts](lib/browserCompiler.ts) | 驱动浏览器端 Clang WASM 编译与运行 |
| [lib/booklets.ts](lib/booklets.ts) | 解析并管理 C/C++ 独立速查小册子 Markdown 数据 |
| [lib/course.ts](lib/course.ts) | 课程 Day 列表、预计算阅读统计、进度与大纲数据检索 |
| [lib/search.ts](lib/search.ts) | 全站代码与课程内容检索逻辑 |
| [components/markdown/Markdown.tsx](components/markdown/Markdown.tsx) | Markdown、代码块、Mermaid 与 PlantUML 统一渲染入口 |
| [visualizer/VisualizerWorkbench.tsx](visualizer/VisualizerWorkbench.tsx) | C++ 堆栈与指针内存可视化交互工作台 |
| [rtos-sim/RtosApp.tsx](rtos-sim/RtosApp.tsx) | RTOS 任务调度、信号量与事件组并发模拟器 |
| [workers/clang.worker.ts](workers/clang.worker.ts) | Web Worker 隔离执行 WASM 编译任务 |

## 与仓库其他部分的关系

- **根目录构建工具**：[vite.config.ts](../vite.config.ts) 配置别名 `@` 指向 `src/`，并定义 `index.html` 与 `rtos.html` 双入口。
- **静态资源依赖**：[lib/browserCompiler.ts](lib/browserCompiler.ts) 加载 [../public/clang/](../public/clang/) 中的 WASM 运行时；[visualizer/presetTraces.ts](visualizer/presetTraces.ts) 加载 [../public/traces/](../public/traces/) 中的内存帧 JSON。
- **文档内容源**：[lib/contentRuntime.ts](lib/contentRuntime.ts) 读取 [../scripts/build-content.py](../scripts/build-content.py) 编译生成到 `public/content/` 的清单与正文产物（含预计算的 `stats`）。

## 相关命令

相关 npm 脚本定义在 [package.json](../package.json) 中：

```bash
# 启动本地开发服务器
npm run dev

# 检查 TypeScript 类型
npm run lint

# 构建生产环境产物
npm run build

# 构建用于 GitHub Pages 部署的产物
npm run build:pages
```
