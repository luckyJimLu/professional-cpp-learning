# Slidev 交互式课件项目（Slidev PPT Decks）

本目录包含 Modern C++ 课程的 Slidev 交互式课件工程。课件由 [.opencode/skills/slidev-ppt](../.opencode/skills/slidev-ppt) 技能依据 [PPT/设计模式大纲.md](../PPT/设计模式大纲.md) 自动分发与编译构建。

## 目录结构

* `lesson-01.md`: 第 1 课课件（语言机制、内存所有权与 RAII）。
* `lesson-02.md`: 第 2 课课件（SOLID 原则与 GoF 模式 Modern C++ 重构，43 页）。
* `lesson-02-traceability.md`: 第 2 课大纲映射、溯源与术语说明。
* `lesson-03.md`: 第 3 课课件（架构解耦与值语义多态，44 页终章）。
* `lesson-03-traceability.md`: 第 3 课大纲映射、技术边界与溯源说明。
* `components/`: 主题自定义组件，包括 [Callout.vue](components/Callout.vue) 与 [Quote.vue](components/Quote.vue)。
* `global-top.vue` & `style.css`: 统一定制的 Slidev Dark Blueprint 蓝图全局排版样式。
* `package.json`: Slidev 本地依赖配置与运行脚本。
* `dist/`: 构建生成的静态 HTML / PDF 产物，属于自动生成文件，切勿手动修改。
* `node_modules/`: 本地依赖库目录，无需手动干预。

## 主题样式与同步

课件视觉风格基于 Slidev Dark Blueprint 设计系统。如需更新主题模板资产，可通过根目录脚本同步：

```bash
npm run ppt:sync
```

该命令会将 `.opencode/skills/slidev-ppt/assets/theme/` 中的组件与全局样式同步覆盖至 `slides/` 目录。

## 常用命令汇总

项目同时提供根目录集中命令与 `slides/` 目录下的局部执行脚本：

### 1. 根目录命令（适用于 CI / CD 及整体运维）

| 脚本命令 | 说明 |
| --- | --- |
| `npm run ppt:sync` | 将技能模版中的主题资产同步至 `slides/` 目录 |
| `npm run ppt:install` | 自动安装 `slides/` 目录下的 Node.js 依赖包 |
| `npm run ppt:check` | 依据大纲校验 `slides/lesson-0X.md` 映射正确性 |
| `npm run ppt:check:strict` | 严格校验模式（将 warning 视为 error 拦截构建） |
| `npm run ppt:build` | 执行所有课件的静态 HTML 构建 |
| `npm run ppt:export` | 导出课件为 PDF 格式产物 |
| `npm run ppt:all` | 链式执行 `ppt:sync` -> `ppt:check` -> `ppt:build` |

### 2. 本地局部命令（在 `slides/` 目录下执行）

| 脚本命令 | 说明 |
| --- | --- |
| `npm run dev` | 启动第 1 课本地预览模式 |
| `npm run dev:02` | 启动第 2 课本地预览模式 (`lesson-02.md`) |
| `npm run dev:03` | 启动第 3 课本地预览模式 (`lesson-03.md`) |
| `npm run build:01` | 单独构建第 1 课静态 HTML (`dist/lesson-01`) |
| `npm run build:02` | 单独构建第 2 课静态 HTML (`dist/lesson-02`) |
| `npm run build:03` | 单独构建第 3 课静态 HTML (`dist/lesson-03`) |
| `npm run export:02` | 单独导出第 2 课 PDF 产物 (`dist/lesson-02.pdf`) |
| `npm run export:03` | 单独导出第 3 课 PDF 产物 (`dist/lesson-03.pdf`) |
| `npm run build:all` | 顺序构建 lesson-01, lesson-02, lesson-03 |
