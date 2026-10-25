# 全系列统一风格规范（Slidev 版）

> 视觉 token 全部定义在 `assets/theme/style.css` 的 `:root` 中。改风格只改那里。
> 本系列与 NotebookLM 版（`skills/notebooklm-ppt-prompt`）共用同一套配色，保证两种产物观感一致。

## 气质

工程师向、克制、专业，类似 CppCon / Meeting C++ 演讲。拒绝卡通、拒绝营销腔、拒绝花哨动画。

## 配色（只能通过 CSS 变量引用）

| 变量 | 值 | 用途 |
|---|---|---|
| `--pc-bg` | #0F172A | 背景（深海军蓝） |
| `--pc-surface` | #1E293B | 卡片 / 层 |
| `--pc-text` | #E2E8F0 | 主文字 |
| `--pc-muted` | #94A3B8 | 次要文字、英文副标题 |
| `--pc-accent` | #38BDF8 | 关键词、标题下划线、`**粗体**` |
| `--pc-good` | #22C55E | 正面 / 推荐 / ✅ |
| `--pc-bad` | #EF4444 | 反面 / 警告 / ❌ |
| `--pc-quote` | #F59E0B | **仅**用于金句 |
| `--pc-violet` | #A78BFA | 跨层 / 横切关注点（如 Idioms） |

一页内强调色最多 2 种（accent + good/bad 其一）；金句琥珀色每页最多 1 处。

## 版式

- 16:9，`canvasWidth: 980`；标题居左，下方青蓝细线（由主题自动生成，`# 标题` 即可）。
- 左上角页眉「第 X 课 · 短标题」（来自 headmatter `lesson`），右下角「PPT N · 页码」（来自 frontmatter `ppt`）——均由 `global-top.vue` 自动渲染，**不要手写**。
- 正文要点 ≤ 5 条，每条 ≤ 25 字；页面留白 ≥ 30%。
- 图示：扁平线框、圆角卡片、分层图；不用照片、不用 3D、不用 emoji 装饰（卡片标题前的单个功能性图标除外）。

## 语言

- 标题：结论式短句（✅「新特性 ≠ 好设计」 / ❌「新特性介绍」）。
- 正文：关键词化；完整解释写进备注。
- 备注：口语化、有画面感，保留大纲中的痛点故事与比喻，用 `[click]` 标注揭示时机。
- 简体中文为主；C++ 关键字、类型名、标准库名、模式名保持英文原样。

## 字体

- 正文与标题默认使用 `Noto Sans CJK SC`，并由 `style.css` 的 `--pc-font-sans` 管理本地回退栈。
- 繁体中文按内容地区切换为 TC/HK 变体；代码使用 `--pc-font-mono`，中文注释回退到 `Noto Sans Mono CJK SC`。
- 禁止远程字体依赖。导出前按 `diagram-and-fonts.md` 检查本机字体、缺字、换行与投影可读性。

## 交互

- 只用 `v-click` / `<v-clicks>`，顺序与讲述顺序一致；每页 ≤ 5 次。
- 全局转场 `transition: fade`，单页不覆盖。
- 不使用 `v-motion`、自动播放、声音。

## 衔接

- 第一页为封面（`layout: cover`），kicker 写「Professional C++ · 第 X 课 · 上节回顾/系列开篇」。
- 每页底部 `pc-next` 一句启下；每课最后一页改为「下节预告」卡片。
