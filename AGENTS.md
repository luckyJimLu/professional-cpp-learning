# AGENTS.md

本文件为 AI 编码代理在本仓库工作时提供上下文与约束。

## 项目概述

基于 Marc Gregoire《Professional C++, 6th Edition》(C++23) 的**每日工程化 C++ 学习仓库**,
附带一个部署在 GitHub Pages 上的**在线学习平台**(React + Vite)。

- 学习路线:C 思维 → Modern C++ → Professional C++ → Embedded/Systems
- 核心设计原则:先识别变化再建立稳定边界;先设计 lifetime 再选择 pointer
- 内容侧**以 Markdown 为源码**,前端平台按需读取编译产物

## 目录结构

| 路径 | 用途 |
| --- | --- |
| `daily/` | 每日课程(day-001 ~ day-068),元数据在 `lessons.meta.json` |
| `examples/day-XXX/` | 每课可编译源码(`main.cpp` + `exercise-XX.cpp`),CI 会全部编译运行 |
| `weekly/` / `patterns/` / `booklets/` / `guidelines/` | 周复盘、设计模式、速查册、Embedded C++ 规范 |
| `topics/` | 独立专题(正文 `README.md` + `lab/` 可编译实验),不占用 Day 编号 |
| `frameworks/` | asio / openharmony / trace32 平台专题 |
| `references/` | 参考资料(system-design-notes、reading-paths 书单) |
| `src/` | 学习平台前端(React 19 + TS + TailwindCSS 4 + shadcn/Radix) |
| `src/workers/` | `clang.worker.ts`(浏览器内 C++ 编译,基于 @live-codes/clang-wasm)、`rtos.worker.ts` |
| `src/rtos-sim/` | RTOS 调度模拟器(kernel / interpreter / frontend) |
| `src/visualizer/` | 内存轨迹可视化工作台 |
| `scripts/build-content.py` | 内容管道,产出 manifest.json / search-index.json 并镜像到 `public/content` |
| `tools/` | Python 检查器(check-course、check-examples、check-slides 等) |
| `tests/` | Playwright E2E 与单测 |
| `slides/` | Slidev 课件工程(源大纲在 `PPT/`) |
| `.agents/skills/`、`.opencode/skills/` | 已安装的 AI agent skills |

## 常用命令

```bash
npm install

npm run check:course        # 课程契约校验(Python)
npm run check:examples      # 示例代码可编译性检查(CI 同款)
npm run build:content       # 重建内容管道产物到 public/content
npm run build               # tsc --noEmit && vite build(prebuild 自动跑 prepare:clang 与 build:content)
npm run build:pages         # GitHub Pages 构建
npm run dev                 # 本地开发(predev 自动跑 prepare:clang)
npm run test:e2e            # Playwright E2E

# 课件(Slidev)
npm run ppt:all             # ppt:sync && ppt:check && ppt:build
npm run ppt:check:strict    # 课件严格校验
```

## 修改内容时必须遵守

1. **改了 `daily/`、`weekly/`、`patterns/`、`topics/` 等 Markdown 后,必须重新 `npm run build:content`**;
   平台运行时读取的是 `public/content` 的编译产物,而不是原始 Markdown。
2. 新增/修改 C++ 示例代码须保证在
   `-Wall -Wextra -Wconversion -Wpedantic` 下编译通过,并通过 `npm run check:examples`。
3. 课程文件须通过 `npm run check:course`(固定 10 部分结构等契约),改课件须通过 `npm run ppt:check`。
4. C++ 代码遵循仓库内 clang-format / clang-tidy 配置;可用 `npm run format:cpp` 格式化
   Markdown 内嵌代码块,`format:cpp:check` 校验。
5. `frameworks/asio` 自带 CMakeLists,新增框架示例保持同样结构。

## CI 与部署

- GitHub Actions 双流水线:
  - 仅改 Markdown 内容 → `content` 快速通道(复用缓存 dist,只刷新内容子树)
  - 改 `src/` / 资源 / 配置 → `app` 全量构建并部署 GitHub Pages
- 本地完整验证流程:
  `npm install && npm run check:course && npm run check:examples && npm run build:content && npm run build`

## 技术栈速查

- 前端:React 19、TypeScript、Vite 8、TailwindCSS 4、shadcn/Radix UI、CodeMirror、Playwright
- 浏览器内 C++ 编译:`@live-codes/clang-wasm`(由 Web Worker 驱动,资源在 `public/clang`)
- 内容管道:Python 3(`scripts/build-content.py` + `tools/*.py`)
- 课件:Slidev(npm --prefix slides)
