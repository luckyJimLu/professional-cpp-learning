# Web 控制台前端源码 (src)

`src` 目录包含基于 React 19、Vite、TypeScript 与 Tailwind CSS 4 构建的单页应用（SPA）源码，提供 C++ 课程导航、交互式 Lab、内存可视化工具、RTOS 调度模拟器与速查小册子等功能。

## 目录用途

作为在线学习平台的前端核心，解析仓库中的课程 Markdown、速查小册子与内存 Trace 数据，并在浏览器端通过 WebAssembly 实现 C++ 代码编译与运行。

## 目录结构

```text
src/
├── App.tsx                    # 应用主入口，处理视图路由与状态
├── main.tsx                   # React 挂载点
├── components/                # UI 组件库
│   ├── common/                # 共享布局与基础 UI 控件（Header、Icon 等）
│   ├── slides/                # Slidev 课件渲染与控制组件
│   ├── ui/                    # 基于 Radix UI 的原子组件
│   └── views/                 # 主视图组件（Today、Lessons、Lab、Visualizer 等）
├── lib/                       # 核心业务逻辑、文档解析与数据模型
├── rtos-sim/                  # RTOS 并发模拟器引擎与专属 UI
├── visualizer/                # C++ 内存可视化工作台与 Trace 播放引擎
├── workers/                   # Web Worker（Clang WASM 与 RTOS 模拟）
├── styles/                    # 样式主题定义
├── types/                     # 全局 TypeScript 类型声明
├── index.css                  # 全局基础样式与 Tailwind 指令
├── docs.css                   # 课程 Markdown 专用样式
└── booklets.css               # 速查小册子专用样式
```

## 关键模块表

| 模块 / 文件 | 主要功能 |
| --- | --- |
| [App.tsx](App.tsx) | 应用路由主入口，管理全局 View 切换与页面预加载 |
| [lib/browserCompiler.ts](lib/browserCompiler.ts) | 驱动浏览器端 Clang WASM 编译与运行 |
| [lib/booklets.ts](lib/booklets.ts) | 解析并管理 C/C++ 独立速查小册子 Markdown 数据 |
| [lib/course.ts](lib/course.ts) | 课程 Day 列表、进度与大纲数据检索 |
| [lib/search.ts](lib/search.ts) | 全站代码与课程内容检索逻辑 |
| [visualizer/VisualizerWorkbench.tsx](visualizer/VisualizerWorkbench.tsx) | C++ 堆栈与指针内存可视化交互工作台 |
| [rtos-sim/RtosApp.tsx](rtos-sim/RtosApp.tsx) | RTOS 任务调度、信号量与事件组并发模拟器 |
| [workers/clang.worker.ts](workers/clang.worker.ts) | Web Worker 隔离执行 WASM 编译任务 |

## 与仓库其他部分的关系

- **根目录构建工具**：[vite.config.ts](../vite.config.ts) 配置别名 `@` 指向 `src/`，并定义 `index.html` 与 `rtos.html` 双入口。
- **静态资源依赖**：[lib/browserCompiler.ts](lib/browserCompiler.ts) 加载 [../public/clang/](../public/clang/) 中的 WASM 运行时；[visualizer/presetTraces.ts](visualizer/presetTraces.ts) 加载 [../public/traces/](../public/traces/) 中的内存帧 JSON。
- **文档内容源**：[lib/booklets.ts](lib/booklets.ts) 和 [lib/course.ts](lib/course.ts) 动态读取仓库根目录下的 [../booklets/](../booklets/) 与 [../daily/](../daily/) 等 Markdown 文件。

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
