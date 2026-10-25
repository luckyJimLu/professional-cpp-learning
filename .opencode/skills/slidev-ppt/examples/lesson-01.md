---
theme: default
title: Professional C++ —— 从语言机制到软件设计
lesson: 第 1 课 · C++ 语言机制、内存所有权与 RAII 资源管理
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

<div class="pc-kicker">Professional C++ · 第 1 课 · 系列开篇</div>

# 语言特性 vs 软件设计

<div class="pc-subtitle">从语言特性（Features）走向软件设计（Software Design）的依赖管理艺术</div>

<div class="mt-10 text-sm pc-muted">
Three Levels of Software Development · Dependencies · Abstractions
</div>

<!--
系列开篇。开场抛出痛点：为什么评估为“2 个故事点”的小需求，改了模块 A 却导致模块 B 编译失败，晚上 CI 跑挂了模块 C 和 D？罪魁祸首是失控的依赖（Dependencies）。今天我们先看清软件开发的三个层次。
-->

---
ppt: 1
---

# 软件开发的三层金字塔

<div class="pc-svg-hero">
<svg viewBox="0 0 900 335" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="软件开发的三层金字塔">
  <!-- 左侧 Design Level -> Code Level 标尺轴线与跃迁弧线 -->
  <g>
    <text x="58" y="34" fill="var(--pc-accent)" font-size="12" font-weight="700" text-anchor="middle">Design Level</text>
    <line x1="58" y1="46" x2="58" y2="296" stroke="var(--pc-border)" stroke-width="1.5" stroke-dasharray="4 3" />
    <polygon points="53,294 63,294 58,304" fill="var(--pc-good)" />
    <text x="58" y="322" fill="var(--pc-good)" font-size="12" font-weight="700" text-anchor="middle">Code Level</text>
    <!-- 左侧底部向中层的焦点跃迁弧形箭头（致敬蓝图叙事） -->
    <path d="M 105,268 C 68,230 68,175 142,158" fill="none" stroke="var(--pc-accent)" stroke-width="3" />
    <polygon points="138,151 152,156 141,165" fill="var(--pc-accent)" />
  </g>

  <!-- 第 1 层：金字塔尖（软件架构） -->
  <g v-click="1">
    <polygon points="270,18 355,112 185,112" fill="rgba(30, 41, 59, 0.92)" stroke="var(--pc-accent)" stroke-width="2" />
    <text x="270" y="78" fill="var(--pc-text)" font-size="15" font-weight="700" text-anchor="middle">1 · 软件架构</text>
    <text x="270" y="98" fill="var(--pc-muted)" font-size="10.5" text-anchor="middle">Software Architecture</text>
    <!-- 右侧引线与工程标注框 -->
    <line x1="332" y1="76" x2="468" y2="56" stroke="var(--pc-accent)" stroke-width="1.5" />
    <circle cx="332" cy="76" r="3" fill="var(--pc-accent)" />
    <rect x="468" y="18" width="252" height="76" rx="6" fill="var(--pc-surface)" stroke="var(--pc-border)" stroke-width="1.5" />
    <text x="482" y="42" fill="var(--pc-text)" font-size="12.5" font-weight="600">宏观决策、系统级模式 · <tspan fill="var(--pc-bad)">后期极难更改</tspan></text>
    <text x="482" y="64" fill="var(--pc-accent)" font-size="11.5" font-family="var(--pc-font-mono)">[微服务]  [C/S]  [插件架构]</text>
    <text x="482" y="82" fill="var(--pc-muted)" font-size="10.5">决定系统的宏观拓扑与边界</text>
  </g>

  <!-- 第 2 层：金字塔中腰（软件设计 —— 视觉焦点高亮层） -->
  <g v-click="2">
    <polygon points="185,118 355,118 425,212 115,212" fill="rgba(56, 189, 248, 0.22)" stroke="var(--pc-accent)" stroke-width="2.5" />
    <text x="270" y="162" fill="var(--pc-text)" font-size="17" font-weight="700" text-anchor="middle">2 · 软件设计</text>
    <text x="270" y="184" fill="var(--pc-accent)" font-size="11.5" font-weight="600" text-anchor="middle">Software Design（核心主战场）</text>
    <!-- 右侧引线与工程标注框 -->
    <line x1="392" y1="165" x2="468" y2="152" stroke="var(--pc-accent)" stroke-width="2" />
    <circle cx="392" cy="165" r="3.5" fill="var(--pc-accent)" />
    <rect x="468" y="112" width="252" height="84" rx="6" fill="rgba(56, 189, 248, 0.12)" stroke="var(--pc-accent)" stroke-width="1.8" />
    <text x="482" y="136" fill="var(--pc-text)" font-size="12.5" font-weight="600">管理组件间的逻辑与物理依赖</text>
    <text x="482" y="154" fill="var(--pc-muted)" font-size="11.5">引入合理的抽象，决定系统可维护性</text>
    <text x="482" y="178" fill="var(--pc-accent)" font-size="11.5" font-family="var(--pc-font-mono)">[Visitor] [Strategy] [External Poly]</text>
  </g>

  <!-- 第 3 层：金字塔宽底座（实现细节） -->
  <g v-click="3">
    <polygon points="115,218 425,218 495,312 45,312" fill="rgba(34, 197, 94, 0.12)" stroke="var(--pc-good)" stroke-width="2" />
    <text x="270" y="262" fill="var(--pc-text)" font-size="16" font-weight="700" text-anchor="middle">3 · 实现细节</text>
    <text x="270" y="284" fill="var(--pc-good)" font-size="11" text-anchor="middle">Implementation Details</text>
    <!-- 右侧引线与工程标注框 -->
    <line x1="462" y1="265" x2="468" y2="265" stroke="var(--pc-good)" stroke-width="1.5" />
    <rect x="468" y="216" width="252" height="88" rx="6" fill="var(--pc-surface)" stroke="var(--pc-good)" stroke-width="1.5" />
    <text x="482" y="240" fill="var(--pc-text)" font-size="12.5" font-weight="600">具体语言特性、内存分配、异常安全</text>
    <text x="482" y="262" fill="var(--pc-good)" font-size="11" font-family="var(--pc-font-mono)">[std::make_unique] [RAII]</text>
    <text x="482" y="282" fill="var(--pc-good)" font-size="11" font-family="var(--pc-font-mono)">[Copy-and-Swap]    [SFINAE]</text>
  </g>

  <!-- 最右侧跨层虚线框：Idioms（惯用法）横跨第 2 层与第 3 层 -->
  <g v-click="4">
    <path d="M 724,152 L 742,152 L 742,262 L 724,262" fill="none" stroke="var(--pc-violet)" stroke-width="2" />
    <line x1="742" y1="207" x2="754" y2="207" stroke="var(--pc-violet)" stroke-width="2" />
    <rect x="754" y="122" width="140" height="172" rx="8" fill="rgba(167, 139, 250, 0.08)" stroke="var(--pc-violet)" stroke-width="2" stroke-dasharray="6 4" />
    <text x="824" y="148" fill="var(--pc-violet)" font-size="13.5" font-weight="700" text-anchor="middle">Idioms（惯用法）</text>
    <text x="824" y="168" fill="var(--pc-muted)" font-size="11" text-anchor="middle">横跨设计层与实现层</text>
    <line x1="768" y1="178" x2="880" y2="178" stroke="var(--pc-border)" stroke-width="1" />
    <text x="768" y="198" fill="var(--pc-text)" font-size="11.5" font-weight="600">设计层：</text>
    <text x="768" y="216" fill="var(--pc-violet)" font-size="11" font-family="var(--pc-font-mono)">Pimpl · NVI</text>
    <text x="768" y="244" fill="var(--pc-text)" font-size="11.5" font-weight="600">实现层：</text>
    <text x="768" y="262" fill="var(--pc-violet)" font-size="11" font-family="var(--pc-font-mono)">RAII · Copy-and-Swap</text>
  </g>
</svg>
</div>

<div class="pc-next">掌握了 C++20/23 新特性，就等于做好了软件设计吗？</div>

<!--
Klaus Iglberger 经典的三层模型图，左侧从上至下为 Design Level 到 Code Level。
[click] 第一层，软件架构（Software Architecture）：宏观决策，系统级模式（如微服务、C/S、插件架构），后期极难更改。
[click] 第二层，软件设计（Software Design）：管理组件间的逻辑与物理依赖，引入合理的抽象（如 Visitor、Strategy、External Polymorphism）。
[click] 第三层，实现细节（Implementation Details）：具体语言特性、内存分配、异常安全与实现模式（如 std::make_unique、RAII、Copy-and-Swap、SFINAE）。
[click] 右侧跨层虚线框标出 Idioms（惯用法）的特殊性——它横跨设计层（如 Pimpl、NVI）与实现层（如 RAII、Copy-and-Swap）。
-->

---
ppt: 1
---

# 打破迷思：语言特性 ≠ 高质量软件

<div class="grid grid-cols-2 gap-6 mt-4">

<div>

<div class="pc-tags mb-3">
  <span class="pc-tag">Smart Pointers</span><span class="pc-tag">Lambdas</span><span class="pc-tag">Coroutines</span><span class="pc-tag">Modules</span>
</div>

<Callout type="bad" title="常见迷思">

掌握 C++20/23 新特性（Smart Pointers、Lambdas、Coroutines、Modules）**不等于**写出高质量软件。

</Callout>

</div>

<div v-click>

<div class="pc-card info">
  <h3>以 C++20 Modules 为例</h3>
  <p class="pc-card-lead">Modules 只能<strong>映射</strong>现有设计并<strong>暴露</strong>缺陷，无法自动修复糟糕的耦合。</p>
</div>

<div v-click="2" class="mt-4">
<Callout type="good" title="核心认知">

语言特性解决的是局部「实现细节」，而组件间「谁依赖谁」由<strong>软件设计</strong>决定。

</Callout>
</div>

</div>

</div>

<div class="pc-next">那么，「软件设计」的真正定义是什么？</div>

<!--
很多人误以为掌握了 C++20/23 新特性就能自动写出高质量软件。
[click] 例如，C++20 Modules 只能映射现有设计并暴露缺陷，无法自动修复糟糕的耦合。
[click] 打个比方：C++ 的语法特性（Lambda、智能指针）只是木匠手里的电钻和锯子，而软件设计是决定房屋承重墙在哪里的建筑蓝图。工具再先进，没有蓝图也盖不出能抗震的大楼。
-->

---
ppt: 1
---

# 软件设计的真正定义：管理依赖的艺术

<div class="grid grid-cols-[1.3fr_1fr] gap-8 mt-4">

<div>

<div class="pc-card info">
  <h3>软件设计（Software Design）</h3>
  <p class="pc-card-lead">管理软件组件间<strong>相互依赖</strong>的艺术<br><span class="pc-muted text-sm">The art of managing interdependencies</span></p>
</div>

<v-clicks>

- **最小化人为（技术）依赖**
- **引入必要的抽象**（Abstractions）
- **权衡不可避免的妥协**（Trade-offs）

</v-clicks>

</div>

<div class="flex items-center">
<Quote v-click="4" author="Kent Beck" zh="依赖是一切规模软件开发中的核心问题。">
  Dependency is the key problem in software development at all scales.
</Quote>
</div>

</div>

<div class="pc-next">从最底层的生命周期依赖开始：C++ 内存所有权模型</div>

<!--
软件设计的真正定义：管理软件组件间相互依赖的艺术（The art of managing interdependencies）。
[click] 第一，最小化人为（技术）依赖；[click] 第二，引入必要的抽象；[click] 第三，管理与权衡妥协。
[click] 引用 Kent Beck 名言："Dependency is the key problem in software development at all scales." 这就是为什么开头那个“2 个故事点”的小需求会因为失控的依赖而挂掉晚上 CI 的模块 C 和 D。
-->
