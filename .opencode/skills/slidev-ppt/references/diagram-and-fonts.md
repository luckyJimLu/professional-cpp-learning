# Slidev 多技能协同绘图与字体规范（Hub-and-Spoke 视觉统一协议）

本文件定义了以 `slidev-ppt` 为中心枢纽，协同调度 `diagram-orchestrator`、`mermaid-diagrams`、`plantuml-skill`、`diagram-design`、`draw-io`、`excalidraw` 与 `ppt-chinese-fonts` 的**逻辑严密性规则**与**跨工具视觉同步规范**。

---

## 一、 为什么需要多技能协同？（逻辑严密性原则）

在技术演示 PPT 中，“一图胜千言”的前提是**图型与底层逻辑结构严格同构**：
- **切忌把所有图都画成同一种框图**：层次结构用分层栈（`pc-layers`），定量实测对比用比例条形图（`pc-bars`），二维正交分类用矩阵表（`<table>`），时序与有向依赖用流图（`Mermaid`），复杂类继承与接口所有权倒置用标准 UML（`PlantUML`），而底层物理内存布局（如堆内存块、vptr/vtable 跳转、缓存行）与架构前后演进（Before/After Delta）则用精确坐标的 SVG 出版级示意图（`diagram-design`）。
- **逻辑严密性三原则**：
  1. **单一结论（One Slide, One Proof）**：每张图表必须直接证明当前页标题的结论（例如标题为“make_shared 合并单次分配，省去二次寻址”，左图就必须直观对比“两次独立堆分配”与“单块连续内存”）。
  2. **100% 大纲锚定（Zero Invented Nodes）**：图中的每一个类名、函数名、模块名、箭头方向与耗时数值，必须 100% 来自大纲的 `重点内容` 与 `呈现方式`；严禁为了填满画面而编造大纲未提及的节点（如凭空造出“夜间 CI”节点）。
  3. **视觉编码一致（Semantic Color Coding）**：全套课件中，无论用哪个绘图工具，**青蓝 `#38BDF8` 永远代表核心机制/接口，翠绿 `#22C55E` 永远代表现代推荐方案/零开销/正向收益，珊瑚红 `#EF4444` 永远代表反模式/泄漏/编译失败/高开销瓶颈，琥珀金 `#F59E0B` 永远代表核心洞察/金句，紫罗兰 `#A78BFA` 永远代表横切关注点/Mixin/元编程技巧**。

---

## 二、 五级图表选型路由矩阵（5-Tier Visual Routing Matrix）

当解析大纲 `呈现方式` 时，按以下决策表选择最匹配的实现方式：

| 级别 | 大纲 `呈现方式` 描述特征 | 调用的 Skill / 机制 | 产物形式与嵌入方式 | 典型课程场景举例 |
| :--- | :--- | :--- | :--- | :--- |
| **Tier 1**<br>原生组件 | 三层/多层金字塔、Benchmark 耗时柱状图、二元对称矩阵表、线性知识链、左右代码对照 | `slidev-ppt` 原生<br>(`pc-layers` / `pc-bars` / `<table>` / `pc-chain` / `pc-card`) | 直接写在 `slides.md` 中，配合 `v-click` 逐项揭示 | Klaus 三层模型、Owning vs View 对称矩阵、`unique_ptr` vs `shared_ptr` 耗时条形图 |
| **Tier 2**<br>轻量流图 | 节点 ≤ 8 的依赖链、双向指针破环、ADL 查找流、`#include` 传染树、模块串联思维导图 | **`mermaid-diagrams`** | 直接内嵌 ` ```mermaid ` 代码块（必须带 Slidev Dark 主题头） | `ListNode` 的 `shared_ptr`/`weak_ptr` 破环图、`#include` 物理依赖传染树、课末知识链路流程图 |
| **Tier 3**<br>出版级 SVG | 物理内存布局（堆栈/控制块/缓存行）、vptr→vtable 跳转、架构演进前后对比（Delta）、罗盘/象限图 | **`diagram-design`**<br>(经 `diagram-orchestrator` 路由) | 源文件与导出 SVG 存于 `slides/public/diagrams/`，用 `<div class="pc-diagram"><img src="/diagrams/xxx.svg"/></div>` 嵌入 | `shared_ptr(new T)` vs `make_shared` 内存布局对比、CPU 缓存行连续内存 vs 指针追逐、SOLID 架构罗盘图 |
| **Tier 4**<br>严谨 UML | 复杂 GoF 类继承层次、双重分发（Double Dispatch）、编译防火墙（Pimpl/Bridge）、DIP 抽象所有权倒置 | **`plantuml-skill`**<br>(经 `diagram-orchestrator` 路由) | `.puml` 源码与本地渲染 `.svg` 存于 `slides/public/diagrams/`，用 `.pc-diagram` 嵌入 | Visitor 模式循环依赖死结图、Singleton 依赖注入架构反转图、Type Erasure 三层内部类图 |
| **Tier 5**<br>矢量/白板 | 用户明确要求可手工拖拽微调（`.drawio`）或手绘白板推演草图（`.excalidraw`） | **`draw-io`** 或 **`excalidraw`** | `.drawio` / `.excalidraw` 源文件 + 导出透明底 `.svg`/`.png` | 系统部署拓扑手调图、算法白板草图 |

---

## 三、 跨工具统一视觉 Token 映射表（Visual Style Sync Contract）

所有子技能在为 Slidev 生成图表时，**严禁使用默认的白底亮色皮肤或杂乱彩虹色**，必须强制注入以下 **Professional C++ Dark Engineering Tokens**：

| 语义角色 | Slidev CSS 变量 | Hex 色值 | Mermaid 变量映射 | PlantUML `skinparam` 映射 | `diagram-design` / `draw-io` 映射 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **画布底色** | `--pc-bg` | `#0F172A` | `background: transparent` | `backgroundColor transparent` | `paper: #0F172A`（或透明 SVG） |
| **节点/卡片填充** | `--pc-surface` | `#1E293B` | `primaryColor: "#1E293B"` | `ClassBackgroundColor #1E293B` | `paper-2: #1E293B` / `fillColor=#1E293B` |
| **默认边框** | `--pc-border` | `#334155` | `nodeBorder: "#334155"` | `ClassBorderColor #334155` | `rule-solid: #334155` / `strokeColor=#334155` |
| **主文字** | `--pc-text` | `#E2E8F0` | `primaryTextColor: "#E2E8F0"` | `defaultFontColor #E2E8F0` | `ink: #E2E8F0` / `fontColor=#E2E8F0` |
| **次要文字/默认连线** | `--pc-muted` | `#94A3B8` | `lineColor: "#94A3B8"` | `ArrowColor #94A3B8` | `muted: #94A3B8` |
| **核心强调（青蓝）** | `--pc-accent` | `#38BDF8` | `primaryBorderColor: "#38BDF8"` | `stereotypeCBackgroundColor #38BDF8` | `accent: #38BDF8` |
| **正向/推荐（翠绿）** | `--pc-good` | `#22C55E` | `classDef good stroke:#22C55E` | `<<good>> BorderColor #22C55E` | 正向节点边框 `#22C55E`，底色 `rgba(34,197,94,0.12)` |
| **反向/警告（珊瑚红）** | `--pc-bad` | `#EF4444` | `classDef bad stroke:#EF4444` | `<<bad>> BorderColor #EF4444` | 警告节点边框 `#EF4444`，底色 `rgba(239,68,68,0.12)` |
| **金句/批注（琥珀）** | `--pc-quote` | `#F59E0B` | `noteBkgColor: "#1E293B"` | `NoteBorderColor #F59E0B` | 批注高亮 `#F59E0B` |
| **横切/泛型（紫罗兰）** | `--pc-violet` | `#A78BFA` | `classDef violet stroke:#A78BFA` | `<<violet>> BorderColor #A78BFA` | 跨层/模板虚线框 `#A78BFA` |

### 1. 内嵌 Mermaid 标准头部模板（复制即用）

在 `slides/lesson-0X.md` 中编写 Mermaid 图时，必须使用以下配置头（保证暗色统一与紧凑间距），并优先使用 `flowchart LR`：

````markdown
```mermaid
%%{init: {
  'theme': 'base',
  'themeVariables': {
    'background': 'transparent',
    'primaryColor': '#1e293b',
    'primaryTextColor': '#e2e8f0',
    'primaryBorderColor': '#38bdf8',
    'lineColor': '#94a3b8',
    'secondaryColor': '#0f172a',
    'tertiaryColor': '#1e293b',
    'fontFamily': 'Noto Sans CJK SC, JetBrains Mono, sans-serif',
    'fontSize': '14px'
  }
}}%%
flowchart LR
  classDef good fill:#1e293b,stroke:#22c55e,stroke-width:2px,color:#e2e8f0
  classDef bad fill:#1e293b,stroke:#ef4444,stroke-width:2px,color:#e2e8f0
  classDef info fill:#1e293b,stroke:#38bdf8,stroke-width:2px,color:#e2e8f0
  classDef violet fill:#1e293b,stroke:#a78bfa,stroke-width:2px,stroke-dasharray: 5 5,color:#e2e8f0
```
````

> **C++ 模板语法转义警告**：在 Mermaid 节点标签中写 `std::unique_ptr<T>` 时，必须用双引号包裹并将 `<` `>` 写为 `&lt;` `&gt;`（如 `A["std::unique_ptr&lt;T&gt;"]`），否则会被 Slidev 的 Vue/Markdown 解析器误认为 HTML 标签而吞掉！

### 2. 外部图表尺寸与画布预算（16:9 投影防溢出）

- Slidev 画布尺寸为 `980 × 551 px`（16:9），扣除顶部标题与底部 `pc-next` 后，内容区可用高度约为 **`340 px`**。
- 单图全屏页：SVG `viewBox` 推荐宽高比为 `16:7` 或 `2.4:1`（例如 `viewBox="0 0 840 320"`）。
- 左右分栏页（左图右文 / 左图右表）：左侧图 `viewBox` 推荐 `440 × 300`。
- 一页只放一个主图，节点数 **≤ 8 个**；图中最小字号不得低于 `13px`（相当于同页正文的 75%）。
- 外部图源文件与导出的 `.svg` 必须同名存放在 `slides/public/diagrams/` 下（例如 `lesson-01-ppt05-shared-memory.svg`），在 Markdown 中通过 `<div class="pc-diagram"><img src="/diagrams/lesson-01-ppt05-shared-memory.svg" alt="..." /></div>` 引用。

---

## 四、 思源黑体与代码等宽字体规范（协同 `ppt-chinese-fonts`）

### 1. 默认字体栈

- **中文正文与标题（`--pc-font-sans`）**：
  `'Noto Sans CJK SC', 'Source Han Sans SC', 'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', system-ui, sans-serif`
  （繁体内容按地区切换为 `TC` 或 `HK` 变体，严禁将 SC 与 TC/HK 混用）。
- **C++ 代码与带中文注释的代码块（`--pc-font-mono`）**：
  `'JetBrains Mono', 'Noto Sans Mono CJK SC', 'Sarasa Mono SC', 'Fira Code', monospace`

### 2. Slidev 字体层级

| 角色 | 字重 | 建议范围 |
|---|---:|---:|
| 封面标题 | Bold / Black (700) | 30–44 pt 等效尺寸 (`2.6rem`) |
| 页标题 (`h1`) | Bold (700) | 26–34 pt (`2.0rem`) |
| 小标题 (`h2` / `h3`) | SemiBold (600) | 18–22 pt (`1.05–1.35rem`) |
| 正文与卡片主文 | Regular (400) | 16–20 pt (`0.95–1.05rem`) |
| 卡片说明与表格 | Regular (400) | 14–16 pt (`0.85–0.90rem`) |
| 代码块 (`pre.slidev-code`) | Regular / Medium | 13–16 pt (`0.82rem`) |
| 来源角标与页脚 | Regular (400) | 11–13 pt (`0.72rem`) |

### 3. 字体可用性自检命令

生成或导出 PDF/PNG 前，运行 `ppt-chinese-fonts` 的检测脚本验证正文字体与等宽字体：

```bash
python3 .opencode/skills/ppt-chinese-fonts/scripts/check_ppt_fonts.py --check-mono
```

禁止在 CSS 或 SVG 图表中使用远程 Google Fonts `@import`，确保离线演示与 Playwright PDF 导出 100% 一致。
