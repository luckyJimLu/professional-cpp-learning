---
theme: default
title: Professional C++ —— 从语言机制到软件设计
lesson: 第 1 课 · 语言特性 vs 软件设计
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

<div class="pc-subtitle">为什么会写 C++20，不等于会做软件设计</div>

<div class="mt-10 text-sm pc-muted">
Three Levels of Software Development · Dependencies · Abstractions
</div>

<!--
系列开篇。今天不讲任何新语法，先回答一个问题：我们学了那么多 C++ 特性，为什么项目还是越改越难改？
-->

---
ppt: 1
---

# 一个「2 个故事点」的小需求

<div class="pc-chain mt-6 text-lg">
  <div v-click class="pc-card info">改动 <strong>模块 A</strong></div>
  <span v-click="2" class="pc-arrow">→</span>
  <div v-click="2" class="pc-card bad">模块 B <span class="pc-bad">编译失败</span></div>
  <span v-click="3" class="pc-arrow">→</span>
  <div v-click="3" class="pc-card bad">夜间 CI：模块 C、D <span class="pc-bad">挂了</span></div>
</div>

<div v-click="4" class="mt-12">
<Callout type="bad" title="罪魁祸首">
  不是需求太难，而是<strong>失控的依赖（Dependencies）</strong>：A 的一处改动沿着看不见的依赖链扩散。
</Callout>
</div>

<div class="pc-next">问题出在哪一层？先看软件开发的三个层次</div>

<!--
开场痛点：评估为 2 个故事点的小需求。[click] 你只改了模块 A，[click] 结果模块 B 编译失败，[click] 晚上 CI 跑挂了模块 C 和 D。
[click] 这不是谁写错了某一行代码，而是依赖失控——改动的成本由依赖结构决定，而不是由改动本身的大小决定。
-->

---
ppt: 1
---

# 软件开发的三层金字塔

<div class="grid gap-x-4 gap-y-2 mt-2" style="grid-template-columns: 88px 1fr 230px; grid-template-rows: repeat(3, auto);">

  <div class="pc-axis" style="grid-row: 1 / span 3;">
    <span class="pc-accent">Design Level</span>
    <div class="pc-axis-line"></div>
    <span class="pc-good">Code Level</span>
  </div>

  <div v-click class="pc-layer" style="grid-column: 2; grid-row: 1;">
    <span class="pc-layer-title">1 · 软件架构</span><span class="pc-layer-en">Software Architecture</span>
    <div class="pc-layer-desc">宏观决策、系统级模式 · <span class="pc-bad">后期极难更改</span></div>
    <div class="pc-tags"><span class="pc-tag">Microservices</span><span class="pc-tag">Client/Server</span><span class="pc-tag">Plugin</span></div>
  </div>

  <div v-click class="pc-layer" style="grid-column: 2; grid-row: 2;">
    <span class="pc-layer-title">2 · 软件设计</span><span class="pc-layer-en">Software Design</span>
    <div class="pc-layer-desc">管理组件间的逻辑与物理依赖，引入合理的抽象</div>
    <div class="pc-tags"><span class="pc-tag">Visitor</span><span class="pc-tag">Strategy</span><span class="pc-tag">External Polymorphism</span></div>
  </div>

  <div v-click class="pc-layer" style="grid-column: 2; grid-row: 3; border-left-color: var(--pc-good);">
    <span class="pc-layer-title">3 · 实现细节</span><span class="pc-layer-en">Implementation Details</span>
    <div class="pc-layer-desc">语言特性、内存分配、异常安全、实现模式</div>
    <div class="pc-tags"><span class="pc-tag">std::make_unique</span><span class="pc-tag">RAII</span><span class="pc-tag">Copy-and-Swap</span><span class="pc-tag">SFINAE</span></div>
  </div>

  <div v-click class="pc-span" style="grid-column: 3; grid-row: 2 / span 2;">
    <div class="pc-span-title">惯用法（Idioms）</div>
    <div>横跨两层：</div>
    <div>设计层 <span class="pc-tag violet">Pimpl</span> <span class="pc-tag violet">NVI</span></div>
    <div>实现层 <span class="pc-tag violet">RAII</span> <span class="pc-tag violet">Copy-and-Swap</span></div>
  </div>

</div>

<div class="pc-next">新特性能帮我们解决哪一层的问题？</div>

<!--
Klaus Iglberger 的三层模型。从上往下，是从设计层走向代码层。
[click] 架构：宏观决策，比如微服务、C/S、插件架构，一旦定下来后期极难更改。
[click] 设计：管理组件之间的依赖，引入合适的抽象，比如 Visitor、Strategy、External Polymorphism——这是本系列的主战场。
[click] 实现细节：make_unique、RAII、Copy-and-Swap、SFINAE，这是大多数 C++ 教程停留的地方。
[click] 特别注意右侧虚线框：惯用法不属于某一层。Pimpl、NVI 解决的是依赖与接口问题，属于设计；RAII、Copy-and-Swap 解决的是资源与异常安全，属于实现。
-->

---
ppt: 1
---

# 打破迷思：新特性 ≠ 好设计

<div class="grid grid-cols-2 gap-6 mt-4">

<div>

<div class="pc-tags mb-3">
  <span class="pc-tag">Smart Pointers</span><span class="pc-tag">Lambdas</span><span class="pc-tag">Coroutines</span><span class="pc-tag">Modules</span>
</div>

<Callout type="bad" title="迷思">
  掌握 C++20/23 新特性，就能写出高质量软件。
</Callout>

<div v-click class="mt-4">
<Callout type="info" title="以 C++20 Modules 为例">
  Modules 只能<strong>映射</strong>现有设计并<strong>暴露</strong>其缺陷，<br>
  无法自动修复糟糕的耦合。
</Callout>
</div>

</div>

<div v-click>

### 工具 vs 蓝图

<div class="pc-card mt-3">
  <h3>🔧 语言特性 = 电钻和锯子</h3>
  <p>Lambda、智能指针：让「怎么做」更高效</p>
</div>

<div class="pc-card info mt-3">
  <h3>📐 软件设计 = 建筑蓝图</h3>
  <p>决定承重墙在哪里：「做什么、谁依赖谁」</p>
</div>

<p class="mt-4 text-sm pc-muted">工具再先进，没有蓝图也盖不出抗震的大楼。</p>

</div>

</div>

<div class="pc-next">那么，「软件设计」到底是什么？</div>

<!--
很多人以为学完 C++20/23 就是高级工程师了。
[click] 以 Modules 为例：它改变的是物理组织方式，但模块边界画在哪里、谁依赖谁，仍然是设计决定的。糟糕的耦合放进 Modules，只会被更清楚地暴露出来。
[click] 打个比方：Lambda、智能指针是木匠手里的电钻和锯子；软件设计是决定承重墙在哪里的建筑蓝图。工具再先进，没有蓝图也盖不出能抗震的大楼。
-->

---
ppt: 1
---

# 软件设计：管理依赖的艺术

<div class="grid grid-cols-[1.3fr_1fr] gap-8 mt-4">

<div>

<div class="pc-card info">
  <h3>定义</h3>
  <p class="!text-base !text-[var(--pc-text)]">管理软件组件间<strong>相互依赖</strong>的艺术<br><span class="pc-muted text-sm">The art of managing interdependencies</span></p>
</div>

<v-clicks>

- **最小化**人为（技术）依赖（Artificial Dependencies）
- **引入**必要的抽象（Abstractions）
- **权衡**不可避免的妥协（Trade-offs）

</v-clicks>

</div>

<div class="flex items-center">
<Quote v-click author="Kent Beck" zh="依赖是一切规模软件开发中的核心问题。">
  Dependency is the key problem in software development at all scales.
</Quote>
</div>

</div>

<div class="pc-next">本系列主线：用 C++ 的语言机制，服务于依赖管理</div>

<!--
所以，软件设计的真正定义：管理软件组件之间相互依赖的艺术。
[click] 第一，尽量消除人为的、技术性的依赖；[click] 第二，在需要变化的地方引入抽象；[click] 第三，接受并显式权衡妥协。
[click] Kent Beck 的这句话是整个系列的锚点：依赖是一切规模软件开发中的核心问题。回到开头那个 2 个故事点的需求——我们后面每一课，都是在学习如何让它真的只花 2 个故事点。
-->
