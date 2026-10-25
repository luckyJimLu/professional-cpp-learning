# 全系列统一风格规范与防幻觉准则（Slidev 版）

> 视觉 token 全部定义在 `assets/theme/style.css` 的 `:root` 中。改风格只改那里。
> 本系列所有辅助绘图技能（`mermaid-diagrams`、`plantuml-skill`、`diagram-design`、`draw-io`、`excalidraw`）与字体技能（`ppt-chinese-fonts`）均对齐本规范中的色彩与字体 Token。

## 气质

工程师向、克制、专业，类似 CppCon / Meeting C++ 演讲。拒绝卡通、拒绝营销腔、拒绝花哨动画、**拒绝脱离大纲的自由发挥**。

## 大纲三栏保真与防幻觉准则（最高优先级）

1. **三栏严格隔离**：
   - **`重点内容` + `呈现方式` → 幻灯片画面（Slide Canvas）**：画面上的每一个标题、要点、卡片、表格、条形图、代码块、金句，必须能在 `重点内容` 或 `呈现方式` 中找到直接依据。
   - **`演讲要点` → 演讲者备注（Speaker Notes `<!-- ... -->`）**：`演讲要点` 中的痛点引入故事（如“评估为 2 个故事点的小需求……晚上 CI 跑挂了模块 C 和 D”）、口头比喻（如“电钻和锯子 vs 建筑蓝图”）、面试追问，**严禁升格为独立幻灯片或画面卡片**，只能原汁原味放入对应页的 `<!-- ... -->` 备注中。
2. **原文原词锚定（Zero-Paraphrase）**：
   - 严禁将大纲中的特定表述替换为同义词（例如严禁把大纲中的“晚上 CI”改写为“夜间 CI”）。
   - 所有 Benchmark 数据（如 `3.42 ns`、`8.82 ns`、`17.5 ns`、`22.9 ns`、`1.60 ns`、`9.04 ns`、`1.55 ns`）及出处说明必须与大纲分毫不差。
3. **代码与类型名零篡改**：
   - 大纲给出的代码块必须保留原始类型名与签名。
   - 仅标准库组件（`std::unique_ptr`、`std::vector`、`std::span` 等）使用 `std::`；**严禁给大纲中的示例类/领域类（如 `Widget`、`Record`、`Storage`、`DenseVector`、`StrongType`）伪造 `std::` 前缀**。

## 配色（只能通过 CSS 变量引用）

| 变量 | 值 | 用途 | 子技能图表对应角色 |
|---|---|---|---|
| `--pc-bg` | `#0F172A` | 背景（深海军蓝） | Canvas / Paper (dark) |
| `--pc-surface` | `#1E293B` | 卡片 / 层 / 表头底色 | Node fill / Surface |
| `--pc-border` | `#334155` | 细边框 / 分隔线 | Border / Hairline rule |
| `--pc-text` | `#E2E8F0` | 主文字 | Primary ink / Text |
| `--pc-muted` | `#94A3B8` | 次要文字、英文副标题、连接线 | Muted text / Default arrow |
| `--pc-accent` | `#38BDF8` | 关键词、标题下划线、`**粗体**` | Focal border / Primary accent |
| `--pc-good` | `#22C55E` | 正面 / 推荐 / ✅ / 低耗时条形 | Success / Modern C++ solution |
| `--pc-bad` | `#EF4444` | 反面 / 警告 / ❌ / 高耗时条形 | Error / Anti-pattern / Bottleneck |
| `--pc-quote` | `#F59E0B` | **仅**用于金句与高亮批注 | Quote / Note border |
| `--pc-violet` | `#A78BFA` | 跨层 / 横切关注点（如 Idioms） | Cross-cutting / Mixin highlight |

一页内强调色最多 2 种（`accent` + `good`/`bad` 其一）；金句琥珀色每页最多 1 处。

## 版式

- 16:9，`canvasWidth: 980`；标题居左，下方青蓝细线（由主题自动生成，`# 标题` 即可）。
- 左上角页眉「第 X 课 · 短标题」（来自 headmatter `lesson`），右下角「PPT N · 页码」（来自 frontmatter `ppt`）——均由 `global-top.vue` 自动渲染，**不要手写**。
- 正文要点 ≤ 5 条，每条 ≤ 25 字；页面留白 ≥ 30%。
- 图示：扁平线框、圆角卡片、分层图、受控高度（`≤ 310px`）的 Mermaid 或外部 SVG；不用照片、不用 3D、不用 emoji 装饰（`<Callout>` 组件内置的功能性图标除外）。

## 语言

- 标题：结论式短句（✅「新特性 ≠ 好设计」 / ❌「新特性介绍」），直接提炼自 `重点内容`。
- 正文：关键词化，保留大纲原词；完整口头解释与故事比喻写进备注。
- 备注：口语化、有画面感，**完整保留大纲 `演讲要点` 中的痛点故事、比喻与深度问答**，用 `[click]` 标注揭示时机。
- 简体中文为主；C++ 关键字、类型名、标准库名、模式名保持英文原样。

## 字体

- 正文与标题默认使用 `Noto Sans CJK SC`，并由 `style.css` 的 `--pc-font-sans` 管理本地回退栈。
- 繁体中文按内容地区切换为 TC/HK 变体；代码使用 `--pc-font-mono`，中文注释回退到 `Noto Sans Mono CJK SC`。
- 禁止远程字体依赖。导出前按 `diagram-and-fonts.md` 运行 `check_ppt_fonts.py --check-mono` 检查本机字体。

## 交互

- 只用 `v-click` / `<v-clicks>`，顺序与讲述顺序一致；每页 ≤ 5 次。
- 备注中的 `[click]` 标记数量必须与该页实际点击步数严格相等。
- 全局转场 `transition: fade`，单页不覆盖。
- 不使用 `v-motion`、自动播放、声音。

## 衔接

- 第一页为封面（`layout: cover`），kicker 写「Professional C++ · 第 X 课 · 上节回顾/系列开篇」。
- 每页（除封面与最后一页）底部 `<div class="pc-next">…</div>` 一句启下；每课最后一页底部为「下节预告」`<Callout>`。
