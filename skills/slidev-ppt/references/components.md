# 组件、类名与页面版式词汇表

> 生成幻灯片时 **只能** 使用本文件列出的组件、`pc-*` 类名与 UnoCSS 布局工具类（`grid`、`grid-cols-2`、`gap-*`、`mt-*`、`flex`、`items-center`、`text-sm` 等）。
> 颜色一律用 `var(--pc-*)` 或语义类（`pc-accent` / `pc-good` / `pc-bad` / `pc-muted`），禁止内联十六进制色值。

## Headmatter（每课只写一次，在文件最开头）

```yaml
---
theme: default
title: Professional C++ —— 从语言机制到软件设计
lesson: 第 X 课 · <课程短标题>
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
| `<Quote author zh>` | `<Quote author="Kent Beck" zh="中文译文">English text</Quote>` | 金句框（琥珀色） |
| `<Callout type title>` | `<Callout type="bad" title="迷思">内容</Callout>` | `type`: `info` / `good` / `bad` |

## CSS 类

| 类名 | 用途 |
|---|---|
| `pc-kicker` / `pc-subtitle` | 封面小标签 / 副标题 |
| `pc-card` + `info`/`good`/`bad` | 卡片（可带左色条），内部用 `<h3>` + `<p>` |
| `pc-layers` / `pc-layer` | 分层模型容器 / 单层；内部 `pc-layer-title`、`pc-layer-en`、`pc-layer-desc`、`pc-tags` |
| `pc-axis` + `pc-axis-line` | 纵向轴线（如 Design Level ↓ Code Level） |
| `pc-span` + `pc-span-title` | 跨层虚线框（紫色，横切关注点） |
| `pc-tag` (+ `violet`) | 等宽小标签：标识符、模式名 |
| `pc-chain` + `pc-arrow` | 横向因果链 / 流程 |
| `pc-next` | 页底启下钩子（自动加前缀「下一页 →」） |

## 页面版式片段

### A. 封面

```md
<div class="pc-kicker">Professional C++ · 第 X 课 · 上节回顾：……</div>

# <课程标题>

<div class="pc-subtitle"><一句话副标题></div>
```

### B. 痛点链（因果逐步揭示）

```md
# <结论式标题>

<div class="pc-chain mt-6 text-lg">
  <div v-click class="pc-card info">起因</div>
  <span v-click="2" class="pc-arrow">→</span>
  <div v-click="2" class="pc-card bad">后果 1</div>
</div>

<div v-click="3" class="mt-12">
<Callout type="bad" title="罪魁祸首">……</Callout>
</div>
```

### C. 分层模型（视觉中心）

三列网格：左轴线 / 中间各层 / 右侧跨层虚线框，用 `grid-row` 控制跨越范围：

```md
<div class="grid gap-x-4 gap-y-2" style="grid-template-columns: 88px 1fr 230px;">
  <div class="pc-axis" style="grid-row: 1 / span 3;">
    <span class="pc-accent">Top Label</span><div class="pc-axis-line"></div><span class="pc-good">Bottom Label</span>
  </div>
  <div v-click class="pc-layer" style="grid-column: 2; grid-row: 1;">
    <span class="pc-layer-title">1 · 中文</span><span class="pc-layer-en">English</span>
    <div class="pc-layer-desc">一句话说明</div>
    <div class="pc-tags"><span class="pc-tag">Example</span></div>
  </div>
  <!-- 其余层同理 -->
  <div v-click class="pc-span" style="grid-column: 3; grid-row: 2 / span 2;">
    <div class="pc-span-title">横切概念</div>
  </div>
</div>
```

### D. 对比双栏（迷思 / 比喻 / 旧 vs 新）

```md
<div class="grid grid-cols-2 gap-6 mt-4">
<div>

<Callout type="bad" title="迷思">……</Callout>

</div>
<div v-click>

### 小标题

<div class="pc-card info"><h3>……</h3><p>……</p></div>

</div>
</div>
```

### E. 定义 + 金句

```md
<div class="grid grid-cols-[1.3fr_1fr] gap-8 mt-4">
<div>

<div class="pc-card info"><h3>定义</h3><p>……</p></div>

<v-clicks>

- **要点一**
- **要点二**

</v-clicks>

</div>
<div class="flex items-center">
<Quote v-click author="作者" zh="中文译文">English original.</Quote>
</div>
</div>
```

### F. 代码对照（❌ / ✅）

````md
<div class="grid grid-cols-2 gap-4">
<div>

<div class="pc-bad text-sm mb-1">❌ 反例</div>

```cpp
// 用户原始代码
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
  <div v-click class="pc-card info"><h3>收获 1</h3><p>……</p></div>
  <div v-click class="pc-card info"><h3>收获 2</h3><p>……</p></div>
  <div v-click class="pc-card info"><h3>收获 3</h3><p>……</p></div>
</div>

<div v-click class="mt-8">
<Callout type="good" title="下节预告">……</Callout>
</div>
```

## 注意事项

- HTML 标签与其内部 Markdown 之间必须留空行，否则 Markdown 不会被解析。
- 备注写在每页最后的 `<!-- ... -->` 中；它必须是该页的最后一个块。
- `v-click="N"` 可让多个元素在同一次点击出现（用于箭头 + 卡片同时出现）。
