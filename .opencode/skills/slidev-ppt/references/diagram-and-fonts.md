# Slidev 图示与字体规范

本文件是 `slidev-ppt` 的独立分发回退规则。宿主可用 `diagram-orchestrator` 与 `ppt-chinese-fonts` 时，优先加载专业 skill；不可用时按本文件执行。

## 图示路由

| 讲述目标 | 默认方式 | 产物规则 |
|---|---|---|
| 简单因果链、概念卡片、分层模型 | 主题 HTML + `pc-*` 类 | 保持 Slidev 原生可编辑；不为装饰而画图 |
| 流程、时序、状态、依赖、普通架构 | Mermaid | 直接写入 Markdown；先验语法，再验页面高度 |
| 精确 UML、复杂类/组件/部署关系 | PlantUML | 保存 `.puml`；本地导出 SVG/PNG；禁止未经授权上传源码到公共渲染器 |
| 需要人工继续拖拽编辑 | draw.io | 保存 `.drawio` 和导出预览；源文件与 deck 同步版本控制 |
| 白板讲解或手绘感 | Excalidraw | 保存 `.excalidraw`；复杂 JSON 操作交给独立子任务处理 |
| 高完成度编辑图、特殊图型 | diagram-design | 保存自包含 HTML/SVG；导出图不是唯一源文件 |

一页只放一个主要图示。优先删除次要节点与重复箭头；标签用短语而不是段落。投影环境中，图中文字不得小于同页正文的约 75%。复杂图拆成“总览 + 局部”，不要缩成一张不可读的大图。

外部图建议放在 `assets/diagrams/`：源文件与发布文件使用同一 basename，例如 `ownership-flow.puml` 与 `ownership-flow.svg`。不得把仓库结构、代码或图源发送给公共渲染服务，除非用户明确授权。

## 字体默认值

中文默认使用思源黑体 / Noto Sans CJK：

- 简体或未标明地区：`Noto Sans CJK SC`
- 台湾繁体：`Noto Sans CJK TC`
- 香港繁体：`Noto Sans CJK HK`
- 日文：`Noto Sans CJK JP`
- 韩文：`Noto Sans CJK KR`
- 含中文注释的代码：`Noto Sans Mono CJK SC` 作为等宽回退

SC、TC、HK 的区域字形和标点位置不能静默互换。简体课程默认 SC；内容切换为繁体时同步调整 CSS 字体变量和页面语言。

## Slidev 字体层级

| 角色 | 字重 | 建议范围 |
|---|---:|---:|
| 封面标题 | Bold / Black | 30–44 pt 等效尺寸 |
| 页标题 | Bold | 26–34 pt |
| 正文 | Regular | 18–24 pt |
| 小标题与数据强调 | Medium / Bold | 与上下文一致 |
| 来源与页脚 | Regular | 12–16 pt |
| 代码 | Regular / Medium | 14–20 pt |

不要为投影正文使用 Thin/Light，不要合成粗体或中文斜体。普通课程最多使用两个字体家族，优先通过字号、字重、间距和颜色建立层级。

## 字体可用性与发布

主题不得使用远程 `@import` 或依赖演示现场网络。生成或导出前检查本机是否实际安装目标字体；缺失时按以下顺序回退：

```text
Noto Sans CJK SC
Source Han Sans SC
Noto Sans SC
PingFang SC
Microsoft YaHei
system-ui
sans-serif
```

检查封面、密集正文、表格、代码和 Mermaid 页的缺字、换行、裁切、字重与标点。跨机器交付时，同时提供视觉验收过的 PDF；字体嵌入或打包前检查具体字体版本的许可证，不要假设“免费”就允许任意再分发。
