# 组件、类名与页面版式词汇表

> 生成幻灯片时 **只能** 使用本文件列出的组件、`pc-*` 类名、原生 Markdown 表格与 UnoCSS 布局工具类（`grid`、`grid-cols-2`、`gap-*`、`mt-*`、`flex`、`items-center`、`text-sm` 等）。
> 颜色一律用 `var(--pc-*)` 或语义类（`pc-accent` / `pc-good` / `pc-bad` / `pc-muted`），禁止内联十六进制色值。
> **防幻觉约束**：所有版式中的卡片、流程链、代码块、表格内容必须 100% 源自大纲的 `重点内容` 与 `呈现方式`；`演讲要点` 中的口头故事与比喻只准写入页底 `<!-- ... -->` 备注。

## Headmatter（每课只写一次，在文件最开头）

```yaml
---
theme: default
title: Professional C++ —— 从语言机制到软件设计
lesson: 第 X 课 · <课程短标题>
lang: zh-CN
colorSchema: dark
aspectRatio: 16/9
canvasWidth: 980
transition: fade
highlighter: shiki
lineNumbers: false
drawings:
  persist: false
mdc: true
layout: cover
ppt: 1
---
```

后续每页：

```yaml
---
ppt: N
---
```

## Vue 组件

| 组件 | 用法 | 说明 |
|---|---|---|
| `<Quote author zh>` | `<Quote author="Kent Beck" zh="中文译文">English text</Quote>` | 金句框（琥珀色，专用于大纲 `呈现方式` 指定的高亮金句） |
| `<Callout type title>` | `<Callout type="bad" title="迷思">内容</Callout>` | `type`: `info` / `good` / `bad` |

## CSS 类

| 类名 | 用途 |
|---|---|
| `pc-kicker` / `pc-subtitle` | 封面小标签 / 副标题 |
| `pc-card` + `info`/`good`/`bad` | 卡片（可带左色条），内部用 `<h3>` + `<p>`；主文字段落可用 `<p class="pc-card-lead">`，英文小副标可用 `<p class="pc-card-meta">` |
| `pc-layers` / `pc-layer` | 分层模型容器 / 单层；内部 `pc-layer-title`、`pc-layer-en`、`pc-layer-desc`、`pc-tags` |
| `pc-axis` + `pc-axis-line` | 纵向轴线（如 Design Level ↓ Code Level） |
| `pc-span` + `pc-span-title` | 跨层虚线框（紫色，横切关注点） |
| `pc-tag` (+ `violet`) | 等宽小标签：C++ 标识符、设计模式名、数据来源角标 |
| `pc-tags` | 标签组容器（自动换行 flex）；可在 `pc-layer` 之内或之外的任意版式中独立使用 |
| `pc-chain` + `pc-arrow` | 横向知识链路 / 阶段演进链（仅用于 `重点内容`/`呈现方式` 中的知识主线） |
| `pc-bars` / `pc-bar-row` / `pc-bar-label` / `pc-bar-track` / `pc-bar-fill` (+ `good`/`bad`/`info`) | Benchmark 实测性能横向对比条形图 |
| `pc-svg-hero` | 全宽工程蓝图内联 `<svg>` 容器（支持 `<g v-click>` 分步揭示与 `var(--pc-*)` CSS 变量，用于几何金字塔、内存块布局、vptr 跳转图、架构罗盘） |
| `pc-diagram` + `pc-diagram-caption` | 外部 SVG/PNG 图表受控容器（限制最大高度 `340px`，防止溢出 16:9 画布） |
| `pc-next` | 页底启下钩子（自动加前缀「下一页 →」） |

## 页面版式片段

### A. 封面

```md
<div class="pc-kicker">Professional C++ · 第 X 课 · 上节回顾：……</div>

# <课程标题>

<div class="pc-subtitle"><一句话副标题></div>
```

### B. 知识链路（横向演进逐步揭示）

```md
# <结论式标题>

<div class="pc-chain mt-6 text-base">
  <div v-click class="pc-card info">阶段 1<br><span class="pc-muted text-xs">核心机制</span></div>
  <span v-click="2" class="pc-arrow">→</span>
  <div v-click="2" class="pc-card good">阶段 2<br><span class="pc-muted text-xs">演进结果</span></div>
</div>

<div v-click="3" class="mt-8">
<Callout type="good" title="核心主线">
  ……
</Callout>
</div>
```

### C. 几何金字塔与工程蓝图模型（视觉中心 —— 严禁用等宽矩形替代金字塔）

当大纲要求绘制「金字塔」、「架构罗盘」、「内存连续/分离布局」或「vptr→vtable 跳转」时，**必须使用 `<div class="pc-svg-hero"><svg viewBox="0 0 900 335">...</svg></div>` 绘制真实几何图形**（利用 `<polygon>` 梯形/三角形、引线标注框、弧形跃迁箭头与跨层括号），并在 `<g v-click="N">` 上绑定分步揭示，所有颜色引用 `var(--pc-*)`：

```md
<div class="pc-svg-hero">
<svg viewBox="0 0 900 335" xmlns="http://www.w3.org/2000/svg">
  <!-- 左侧标尺与跃迁弧线 -->
  <g>
    <text x="58" y="34" fill="var(--pc-accent)" font-size="12" font-weight="700" text-anchor="middle">Design Level</text>
    <line x1="58" y1="46" x2="58" y2="296" stroke="var(--pc-border)" stroke-width="1.5" stroke-dasharray="4 3" />
    <text x="58" y="322" fill="var(--pc-good)" font-size="12" font-weight="700" text-anchor="middle">Code Level</text>
  </g>
  <!-- 顶层三角形 (Apex) + 右侧引线标注框 -->
  <g v-click="1">
    <polygon points="270,18 355,112 185,112" fill="rgba(30, 41, 59, 0.92)" stroke="var(--pc-accent)" stroke-width="2" />
    <line x1="332" y1="76" x2="468" y2="56" stroke="var(--pc-accent)" stroke-width="1.5" />
    <rect x="468" y="18" width="252" height="76" rx="6" fill="var(--pc-surface)" stroke="var(--pc-border)" stroke-width="1.5" />
  </g>
  <!-- 中层焦点梯形 (Focal Highlight Layer) -->
  <g v-click="2">
    <polygon points="185,118 355,118 425,212 115,212" fill="rgba(56, 189, 248, 0.22)" stroke="var(--pc-accent)" stroke-width="2.5" />
  </g>
  <!-- 底层宽梯形 (Base Layer) + 右侧跨层虚线括号 (pc-violet) -->
</svg>
</div>
```

### D. 对比双栏（迷思 vs 真相 / 机制对比）

```md
<div class="grid grid-cols-2 gap-6 mt-4">
<div>

<Callout type="bad" title="迷思">

……

</Callout>

</div>
<div v-click>

<div class="pc-card info">
  <h3>核心事实</h3>
  <p class="pc-card-lead">……</p>
</div>

</div>
</div>
```

### E. 定义 + 金句

```md
<div class="grid grid-cols-[1.3fr_1fr] gap-8 mt-4">
<div>

<div class="pc-card info">
  <h3>定义</h3>
  <p class="pc-card-lead">……</p>
</div>

<v-clicks>

- **要点一**
- **要点二**

</v-clicks>

</div>
<div class="flex items-center">
<Quote v-click="3" author="作者" zh="中文译文">English original.</Quote>
</div>
</div>
```

### F. 代码对照（❌ 反例 vs ✅ 正例）

````md
<div class="grid grid-cols-2 gap-4 mt-2">
<div>

<div class="pc-bad text-sm mb-1">❌ 反例</div>

```cpp
// 严格保留大纲原代码，严禁伪造 std:: 前缀
```

</div>
<div v-click>

<div class="pc-good text-sm mb-1">✅ 推荐</div>

```cpp {2|3-4}
// 现代写法，可用行高亮分步讲解
```

</div>
</div>
````

### G. 总结 / 下节预告

```md
<div class="grid grid-cols-3 gap-4 mt-6">
  <div v-click class="pc-card info"><h3>要点 1</h3><p>……</p></div>
  <div v-click class="pc-card info"><h3>要点 2</h3><p>……</p></div>
  <div v-click class="pc-card info"><h3>要点 3</h3><p>……</p></div>
</div>

<div v-click="4" class="mt-8">
<Callout type="good" title="下节预告">

……

</Callout>
</div>
```

### H. 性能基准横向条形图（Benchmark 实测对比）

```md
<div class="pc-tag mb-3">实测耗时 · Google Benchmark（越低越好）</div>

<div class="pc-bars">
  <div class="pc-bar-row">
    <span class="pc-bar-label">BM_none</span>
    <div class="pc-bar-track"><div class="pc-bar-fill good" style="width: 18%;">1.60 ns</div></div>
  </div>
  <div class="pc-bar-row">
    <span class="pc-bar-label">BM_dynamic</span>
    <div class="pc-bar-track"><div class="pc-bar-fill bad" style="width: 100%;">9.04 ns</div></div>
  </div>
  <div class="pc-bar-row">
    <span class="pc-bar-label">BM_static</span>
    <div class="pc-bar-track"><div class="pc-bar-fill good" style="width: 17%;">1.55 ns</div></div>
  </div>
</div>
```

### I. 二元对称矩阵表格 / 架构图示页（Table / Mermaid / 外部 SVG）

```md
| 底层资源类型 | 独占所有权容器 (Owning) | 现代非所有权视图 (Non-owning View) |
| :--- | :--- | :--- |
| 单一堆对象 | `std::unique_ptr<T>` | `T*` 或 `T&` |
| 字符序列 | `std::string` | `std::string_view` |
```

或嵌入受控高度的外部 SVG 图表（由 `plantuml-skill` / `diagram-design` / `draw-io` 生成）：

```md
<div class="pc-diagram">
  <img src="/diagrams/lesson-02-ppt09-visitor-cycle.svg" alt="Visitor 循环依赖图" />
  <div class="pc-diagram-caption">经典 Visitor 模式的双向依赖死结</div>
</div>
```

## 注意事项

- HTML 标签与其内部 Markdown 之间必须留空行，否则 Markdown 不会被解析。
- 备注写在每页最后的 `<!-- ... -->` 中；它必须是该页的最后一个块。
- `v-click="N"` 可让多个元素在同一次点击出现；注意 `<v-clicks>` 含 $K$ 个列表项时会消耗 $K$ 次点击，其后的显式 `v-click="M"` 编号必须从前序累计点击数 $+1$ 开始，并与备注中的 `[click]` 一一对应。
- `pc-*` 类名只能使用 `assets/theme/style.css` 与上表已定义的词汇；`check_slides.py` 会把未知 `pc-*` 类判为 error（`--allow-unknown-classes` 可降级）。
- 打印 / PDF 导出的暗色底、工程蓝图网格与「避免分页截断」已由 `style.css` 的 `@media print` 统一处理，页面内**无需**手写任何打印样式。
