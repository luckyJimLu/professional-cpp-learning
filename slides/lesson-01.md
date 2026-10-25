---
theme: default
title: Professional C++ —— 从语言机制到软件设计
lesson: 第 1 课 · 语言特性 vs 软件设计
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

<div class="pc-subtitle">从内存所有权、RAII 到零开销抽象</div>

<div class="mt-10 text-sm pc-muted">
Memory Ownership · RAII · Concepts · CRTP · Overload Sets
</div>

<!--
系列开篇。开场抛出痛点：为什么评估为“2 个故事点”的小需求，改了模块 A 却导致模块 B 编译失败，晚上 CI 跑挂了模块 C 和 D？罪魁祸首是失控的依赖（Dependencies）。今天我们先看软件开发的三个层次。
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
    <!-- 左侧底部向中层的焦点跃迁弧形箭头 -->
    <path d="M 105,268 C 68,230 68,175 142,158" fill="none" stroke="var(--pc-accent)" stroke-width="3" />
    <polygon points="138,151 152,156 141,165" fill="var(--pc-accent)" />
  </g>

  <!-- 第 1 层：金字塔尖（软件架构） -->
  <g v-click="1">
    <polygon points="270,18 355,112 185,112" fill="rgba(30, 41, 59, 0.92)" stroke="var(--pc-accent)" stroke-width="2" />
    <text x="270" y="78" fill="var(--pc-text)" font-size="15" font-weight="700" text-anchor="middle">1 · 软件架构</text>
    <text x="270" y="98" fill="var(--pc-muted)" font-size="10.5" text-anchor="middle">Software Architecture</text>
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

<div class="pc-next">新特性能帮我们解决哪一层的问题？</div>

<!--
Klaus Iglberger 的三层模型。从上往下，是从设计层走向代码层。
[click] 架构：宏观决策，比如微服务、C/S、插件架构，一旦定下来后期极难更改。
[click] 设计：管理组件之间的依赖，引入合适的抽象，比如 Visitor、Strategy、External Polymorphism——这是本系列的主战场。
[click] 实现细节：make_unique、RAII、Copy-and-Swap、SFINAE，这是大多数 C++ 教程停留的地方。
[click] 右侧虚线框：惯用法不属于某一层。Pimpl、NVI 解决依赖与接口问题，属于设计；RAII、Copy-and-Swap 解决资源与异常安全，属于实现。
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

</div>

<div v-click>

<div class="pc-card info">
  <h3>以 C++20 Modules 为例</h3>
  <p class="pc-card-lead">Modules 只能<strong>映射</strong>现有设计并<strong>暴露</strong>缺陷，无法自动修复糟糕的耦合。</p>
</div>

<div v-click="2" class="mt-4">
<Callout type="good" title="核心边界">

语言特性负责局部实现细节；而组件间「谁依赖谁」属于<strong>软件设计</strong>范畴。

</Callout>
</div>

</div>

</div>

<div class="pc-next">那么，「软件设计」到底是什么？</div>

<!--
很多人以为学完 C++20/23 就是高级工程师了。
[click] 以 Modules 为例：它改变的是物理组织方式，但模块边界画在哪里、谁依赖谁，仍然是设计决定的。糟糕的耦合放进 Modules，只会被更清楚地暴露出来。
[click] 打个比方：C++ 的语法特性（Lambda、智能指针）只是木匠手里的电钻和锯子，而软件设计是决定房屋承重墙在哪里的建筑蓝图。工具再先进，没有蓝图也盖不出能抗震的大楼。
-->

---
ppt: 1
---

# 软件设计：管理依赖的艺术

<div class="grid grid-cols-[1.3fr_1fr] gap-8 mt-4">

<div>

<div class="pc-card info">
  <h3>定义</h3>
  <p class="pc-card-lead">管理软件组件间<strong>相互依赖</strong>的艺术<br><span class="pc-muted text-sm">The art of managing interdependencies</span></p>
</div>

<v-clicks>

- **最小化**人为（技术）依赖（Artificial Dependencies）
- **引入**必要的抽象（Abstractions）
- **权衡**不可避免的妥协（Trade-offs）

</v-clicks>

</div>

<div class="flex items-center">
<Quote v-click="4" author="Kent Beck" zh="依赖是一切规模软件开发中的核心问题。">
  Dependency is the key problem in software development at all scales.
</Quote>
</div>

</div>

<div class="pc-next">先看最底层的资源：谁拥有它、谁负责销毁它？</div>

<!--
所以，软件设计的真正定义：管理软件组件之间相互依赖的艺术。
[click] 第一，尽量消除人为的、技术性的依赖；[click] 第二，在需要变化的地方引入抽象；[click] 第三，接受并显式权衡妥协。
[click] Kent Beck 的这句话是整个系列的锚点：依赖是一切规模软件开发中的核心问题。回到开头那个 2 个故事点的需求——我们后面每一课，都是在学习如何让它真的只花 2 个故事点。
-->

---
ppt: 2
---

# 所有权，才是内存管理的真正问题

<div class="grid grid-cols-[1.3fr_1fr] gap-8 mt-4">

<div>

<div class="pc-card info">
  <h3>内存所有权（Memory Ownership）</h3>
  <p class="pc-card-lead">在 C++ 中，内存所有权是「对象所有权」的代名词：<br>明确<strong>谁有责任管理特定对象/资源的生命周期并将其销毁</strong>。</p>
</div>

<v-clicks>

- C++ 没有垃圾回收器，销毁责任必须显式归属
- 泄漏 / Double Free / 野指针的共同根因：**所有权语义模糊**
- `Widget*` 这个类型承载了太多歧义

</v-clicks>

</div>

<div class="flex items-center">
<Callout type="bad" title="类型系统失职">

当指针类型未记录销毁职责时，<br>调用者与实现者只能靠猜测管理生命周期。

</Callout>
</div>

</div>

<div class="pc-next">那所有权到底有几种？</div>

<!--
进入第 2 个话题：内存所有权。
[click] C++ 与 Java/Python 最大的区别是没有 GC，谁负责销毁必须显式说清楚。
[click] 传统 C++ 里内存泄漏、Double Free 和野指针满天飞的根本原因，不是程序员记性差，而是 Widget* 这个类型承载了太多模糊的语义。
[click] 现代 C++ 的核心哲学是将所有权语义编码进类型系统，让编译器替我们做生命周期的静态检查，而不是靠写文档注释“Please do not delete”。
-->

---
ppt: 2
---

# 三种核心所有权状态

<div class="grid grid-cols-3 gap-4 mt-6">

<div v-click class="pc-card info">
  <h3>非所有权</h3>
  <p class="pc-card-meta">Non-owning</p>
  <p class="pc-card-lead">仅使用或观察对象，<strong>绝不销毁</strong>，也不延长其生命周期。</p>
</div>

<div v-click class="pc-card good">
  <h3>独占所有权</h3>
  <p class="pc-card-meta">Exclusive Ownership</p>
  <p class="pc-card-lead">单一实体全权负责创建与销毁，<strong>不可复制</strong>，可显式转移。</p>
</div>

<div v-click class="pc-card info">
  <h3>共享所有权</h3>
  <p class="pc-card-meta">Shared Ownership</p>
  <p class="pc-card-lead">多个实体平等共同拥有，<strong>最后一个</strong>所有者销毁时释放。</p>
</div>

</div>

<div v-click="4" class="mt-8 text-center">
<div class="pc-tags justify-center">
  <span class="pc-tag">栈变量 / std::unique_ptr</span>
  <span class="pc-tag">std::shared_ptr</span>
  <span class="pc-tag">T* / T& / std::span</span>
</div>
<p class="mt-4 pc-accent">现代 C++ 的核心哲学：把所有权语义编码进类型系统。</p>
</div>

<div class="pc-next">一个「好」的所有权设计长什么样？</div>

<!--
[click] 非所有权：我只借用看看，绝不负责销毁。
[click] 独占所有权：一个实体说了算，比如栈变量、unique_ptr，不能复制但可以显式转移。
[click] 共享所有权：多个平权实体共同拥有，最后一个走的人负责关灯，比如 shared_ptr。
[click] 现代 C++ 的核心哲学就是：把所有权语义编码进类型系统，让编译器替我们做生命周期的静态检查，而不是靠注释写「Please do not delete」。
-->

---
ppt: 2
---

# 良好所有权设计的四个标志

<div class="grid grid-cols-2 gap-6 mt-2">

<div>

<v-clicks>

- 不改变所有权时，调用者与实现者**一目了然**
- 夺取独占所有权时，接口强制客户端**显式交出（Consent to move）**
- 共享所有权时，接口**显式声明**
- 任何代码片段都能**仅凭类型签名**判断是否需要 `delete`

</v-clicks>

</div>

<div v-click="5">

<div class="pc-bad text-sm mb-1">❌ 糟糕设计的典型反例 vs ✅ 现代所有权显式表达</div>

```cpp
// ❌ 糟糕设计：所有权完全成谜，看代码上下文猜谜语
Widget* w = MakeWidget();        // 我需要 delete w 吗？用 delete 还是 free？
Widget* w1 = Transmogrify(w);    // w 被销毁了吗？还是悬空了？

// ✅ 现代显式表达：类型签名即契约
std::unique_ptr<Widget> MakeWidget();
void Inspect(const Widget* w);              // 仅借用观察
void Consume(std::unique_ptr<Widget> w);    // 显式交出独占所有权
```

</div>

</div>

<div class="pc-next">先给被误解最深的 T* 和 T& 正名</div>

<!--
良好所有权设计的四个标志。
[click] 第一个，不改变所有权，双方一眼能看出。
[click] 第二个，函数要夺取独占所有权，接口就强制调用方显式交出，这就是所谓的 consent to move。
[click] 第三个，共享所有权一定要在接口上显式声明出来。
[click] 第四个，任何一段代码，光看类型签名就能知道自己要不要调用 delete。
[click] 右侧对比：上面 Widget* w = MakeWidget() 全靠猜；下面用 unique_ptr 与 const Widget* 把所有权契约写进类型签名。
-->

---
ppt: 3
---

# T* 不是过街老鼠：为原始指针正名

<div class="grid grid-cols-2 gap-6 mt-4">

<div>

<div class="pc-card info">
  <h3>Core Guideline R.3</h3>
  <p class="pc-card-lead">A raw pointer is <strong>non-owning</strong>.<br><span class="pc-muted text-sm">裸指针清晰传达「我仅借用访问，绝不负责销毁」。</span></p>
</div>

<v-clicks>

- 现代 C++ 代码里，**绝大多数指针依然是 `T*`**
- 不能为空时，优先 `T&` 或 `gsl::not_null<T*>`
- 只读/仅修改内容的函数参数**严禁滥用 `std::shared_ptr`**

</v-clicks>

</div>

<div class="flex items-center">
<Callout type="bad" title="警惕反模式">

在只读或仅修改内容的参数中滥用 <code>std::shared_ptr</code>，<br>会强加无谓的共享所有权契约与原子计数开销。

</Callout>
</div>

</div>

<div class="pc-next">那「拥有」与「观察」如何一一对应？</div>

<!--
先给被误解最深的原始指针正名。
[click] Core Guideline R.3 明确写着：raw pointer is non-owning。它的职责就是清晰地表达「我只是借用访问，不负责销毁」。
[click] 所以在遵循良好所有权规范的现代 C++ 代码里，绝大多数指针依然是 T*。不能为空时就优先用 T& 或 gsl::not_null。
[click] 澄清学员最常见的误区：“学了 C++11 后，代码里是不是一个 * 都不能出现了？”——错！把所有参数都改成 shared_ptr 是典型的“膝跳反射式”劣质设计。
-->

---
ppt: 3
---

# 富独占指针与视图的对称矩阵

| 底层资源类型 | 独占所有权容器 (Owning) | 现代非所有权视图 (Non-owning View) |
| :--- | :--- | :--- |
| 单一堆对象 | `std::unique_ptr<T>` | `T*` 或 `T&` |
| 字符序列 | `std::string` | `std::string_view` |
| 连续内存数组 | `std::vector<T>` / `std::array` | `std::span<T>` / `std::span<const T>` |
| 任意容器序列 | `std::list<T>` 等 | `std::ranges::view` |

<div v-click class="mt-6">
<Callout type="info" title="富独占指针（Rich Owning Pointers）与视图">

`std::string` / `std::vector<T>` 本质是**带大小元数据的富独占指针**；`std::string_view`（C++17）与 `std::span<T>`（C++20）是携带长度信息的轻量级非所有权句柄。

</Callout>
</div>

<div class="pc-next">视图很轻，但滥用共享指针会制造反模式</div>

<!--
这张表是「拥有者 vs 非拥有视图」的完美映射。
[click] 点出“富指针（Rich Pointer）”的概念：为什么我们对 unique_ptr<char[]> 知道传 char*，到了 std::string 却习惯传引用？因为以前缺一个既包含指针又包含长度的非所有权类型，现在 string_view 和 span 补齐了这块拼图。
-->

---
ppt: 3
---

# 警惕反模式：共享指针不是万能参数

<div class="grid grid-cols-2 gap-4 mt-4">
<div>

<div class="pc-bad text-sm mb-1">❌ 反例（Pikus 书中）</div>

```cpp
// 只读、只改内容，却要求共享所有权
double Double(
    std::shared_ptr<std::vector<int>> v);
```

<div class="mt-3 pc-card bad">
  <h3>代价</h3>
  <p>无谓的共享所有权契约 + 原子引用计数开销</p>
</div>

</div>
<div v-click>

<div class="pc-good text-sm mb-1">✅ 推荐</div>

```cpp
// 只借用，不涉及生命周期
double Double(std::vector<int>& v);
// 只读视图
double Sum(std::span<const int> v);
```

<div class="mt-3 pc-card good">
  <h3>收益</h3>
  <p>接口意图明确，零计数开销，可接收任意连续内存</p>
</div>

</div>
</div>

<div class="pc-next">如果真的需要独占，怎么表达？</div>

<!--
[click] 反面：Double 这个函数只是读一下、改一下内容，却要求传 shared_ptr，等于强加无谓的共享所有权契约与原子计数开销。只借用就传引用或 span，接口意图清清楚楚。
-->

---
ppt: 4
---

# 最自然的独占所有权：栈对象

<div class="grid grid-cols-2 gap-6 mt-4">

<div>

<v-clicks>

- **栈对象（Stack variable）** 是首选的独占所有权形式
- 大小未知（多态）/ 体积过大 / 生命周期跨作用域时
- 才改用 `std::unique_ptr<T>` 封装堆内存
- 独占 = 不可复制，但**可显式转移**

</v-clicks>

</div>

<div v-click="5" class="flex items-center">

```cpp
std::unique_ptr<Widget> WidgetFactory();

std::unique_ptr<Widget> w = WidgetFactory();
// w 独占；拷贝 w 直接编译失败
// std::unique_ptr<Widget> w2 = w;  // ❌
```

</div>

</div>

<div class="pc-next">智能指针真的会拖慢性能吗？</div>

<!--
独占所有权最自然的表达，其实是栈对象。
[click] 能放栈上就放栈上，它天然独占、天然自动析构。
[click] 只有对象大小未知（多态）、体积太大、或者生命周期要跨越作用域时。
[click] 才用 unique_ptr 封装堆内存。
[click] 独占意味着不可复制，但可以显式转移。
[click] 看右侧代码，工厂返回 unique_ptr，拷贝 w 直接编译失败。
-->

---
ppt: 4
---

# 零开销抽象：实测数据说话

<div class="pc-tag mb-4">来源：Pikus《Hands-On Design Patterns with C++》第 5、6 章 · Google Benchmark</div>

<div class="grid grid-cols-2 gap-6 mt-2">

<div class="pc-card info">
  <h3>解引用吞吐量</h3>
  <p class="pc-muted text-xs mb-2">Dereference</p>
  <p class="pc-card-lead mb-1"><code>rawptr</code> — 3.42 ns · 9.35 G/s</p>
  <p class="pc-card-lead"><code>unique_ptr</code> — 3.42 ns · 9.36 G/s</p>
  <p class="mt-2 pc-good">完全零开销</p>
</div>

<div v-click class="pc-card good">
  <h3>创建与销毁</h3>
  <p class="pc-muted text-xs mb-2">Construct & Destroy</p>
  <p class="pc-card-lead mb-1"><code>BM_rawptr</code> — 8.72 ns</p>
  <p class="pc-card-lead"><code>BM_uniqueptr</code> — 8.82 ns</p>
  <p class="mt-2 pc-good">处于测量误差范围内</p>
</div>

</div>

<div v-click="2" class="mt-6">
<Callout type="good" title="结论">
  编译器优化后，<code>unique_ptr</code> 生成的汇编与手写 <code>new/delete</code> <strong>毫秒不差</strong>。
</Callout>
</div>

<div class="pc-next">所有权如何在函数接口上显式流动？</div>

<!--
拿实测数据说话，打消老派 C 程序员对「智能指针拖慢性能」的顾虑：解引用 rawptr 和 unique_ptr 都是 3.42 ns，吞吐 9.3 G/s 级，完全零开销。
[click] 创建与销毁：8.72 ns 对 8.82 ns，处于测量误差范围内。
[click] 结论：编译器优化后，unique_ptr 生成的汇编指令与手写 new/delete 毫秒不差。
-->

---
ppt: 4
---

# 移动语义：所有权显式流动

<div class="grid grid-cols-2 gap-4 mt-4">
<div>

<div class="pc-good text-sm mb-1">流出 · Factory</div>

```cpp
// 工厂返回 unique_ptr，语法上强制调用者接管
std::unique_ptr<Widget> WidgetFactory();
```

<div v-click class="pc-card good mt-3">
  <h3>流入 · Sink</h3>
  <p>按值接收或 <code>Widget&&</code>，强制调用端写出 <code>std::move</code></p>
</div>

</div>
<div v-click="2">

<div class="pc-good text-sm mb-1">显式签署「放弃所有权同意书」</div>

```cpp
void Consume(Widget&& w);

Consume(w1);            // ❌ 编译失败！
                        //    防止意外丢失所有权

Consume(std::move(w1)); // ✅ 显式同意转移
                        //    w1 进入 moved-from 状态
```

</div>
</div>

<div class="pc-next">一对一好办，多个平权实体怎么办？</div>

<!--
流出：工厂函数返回 unique_ptr，语法层面就强制调用者接管所有权，传给裸指针函数直接编译失败。
[click] 流入：接收 Widget&& 或按值接收 unique_ptr，强制调用端写出 std::move。
[click] 重点看右侧：直接 Consume(w1) 会编译失败，必须写 std::move(w1)。std::move 不只是类型转换（rvalue cast），更是代码审查时的高亮警示灯——告诉所有人「从这一行往下，原变量 w1 已经空了，别再碰它」。
-->

---
ppt: 5
---

# 共享所有权：何时才真正需要

<div class="grid grid-cols-2 gap-6 mt-4">

<div>

<v-clicks>

- 多个平权实体**共同决定**资源生死
- 没有任何一方是「主拥有者」
- 典型：并发链表的迭代器、图结构节点
- 其他场景，先问：**真的没人能当主吗？**

</v-clicks>

</div>

<div v-click="5" class="flex items-center">

<div class="pc-card info">
  <h3>std::shared_ptr</h3>
  <p>多个实体平等持有，最后一个析构时释放资源。</p>
</div>

</div>

</div>

<div class="pc-next">这份「平权」的代价是什么？</div>

<!--
共享所有权的适用场景其实很窄。
[click] 多个平权实体共同决定资源生死。
[click] 没有任何一方是主拥有者。
[click] 比如多线程环境下无锁或并发链表的迭代器、图结构节点。
[click] 其他绝大多数场景，你该先问自己：真的没有人能当主拥有者吗？
[click] 只有真正平权共享时才用 std::shared_ptr，由最后一个析构的持有者释放资源。
-->

---
ppt: 5
---

# shared_ptr 的三重代价

<div class="grid grid-cols-[1.15fr_1fr] gap-6 mt-2">

<div>

<div class="pc-svg-hero">
<svg viewBox="0 0 460 155" class="w-full h-auto" xmlns="http://www.w3.org/2000/svg">
  <text x="8" y="18" fill="var(--pc-bad)" font-size="11" font-family="var(--pc-font-mono)" font-weight="600">shared_ptr&lt;T&gt;(new T) · 两次独立堆分配</text>
  <rect x="8" y="26" width="170" height="40" rx="5" fill="var(--pc-surface)" stroke="var(--pc-bad)" stroke-width="1.5"/>
  <text x="93" y="45" text-anchor="middle" fill="var(--pc-text)" font-size="11" font-weight="600">Control Block</text>
  <text x="93" y="59" text-anchor="middle" fill="var(--pc-muted)" font-size="9.5" font-family="var(--pc-font-mono)">strong / weak / deleter</text>
  <line x1="178" y1="46" x2="238" y2="46" stroke="var(--pc-bad)" stroke-width="1.5" stroke-dasharray="4 3"/>
  <rect x="238" y="26" width="140" height="40" rx="5" fill="var(--pc-surface)" stroke="var(--pc-bad)" stroke-width="1.5"/>
  <text x="308" y="50" text-anchor="middle" fill="var(--pc-text)" font-size="11" font-weight="600">Heap Object T</text>

  <text x="8" y="94" fill="var(--pc-good)" font-size="11" font-family="var(--pc-font-mono)" font-weight="600">std::make_shared&lt;T&gt;() · 单次连续堆分配</text>
  <rect x="8" y="102" width="370" height="42" rx="5" fill="rgba(16, 185, 129, 0.10)" stroke="var(--pc-good)" stroke-width="1.75"/>
  <line x1="195" y1="102" x2="195" y2="144" stroke="var(--pc-good)" stroke-width="1.2" stroke-dasharray="3 3"/>
  <text x="101" y="127" text-anchor="middle" fill="var(--pc-good)" font-size="11" font-weight="600">Control Block (强/弱计数)</text>
  <text x="286" y="127" text-anchor="middle" fill="var(--pc-text)" font-size="11" font-weight="600">In-place Object T</text>
</svg>
</div>

<div v-click="1" class="pc-card bad mt-2">
  <h3>原子操作开销</h3>
  <p>多线程下拷贝与析构必须执行<strong>原子递增/递减</strong>，引发 CPU 缓存行同步开销。</p>
</div>

</div>

<div v-click="2">

<div class="pc-tag mb-3">Google Benchmark 实测耗时 · 越低越好</div>

<div class="pc-bars">
  <div class="pc-bar-row">
    <span class="pc-bar-label">unique_ptr</span>
    <div class="pc-bar-track">
      <div class="pc-bar-fill good" style="width: 38.5%;">8.82 ns</div>
    </div>
  </div>
  <div class="pc-bar-row">
    <span class="pc-bar-label">make_shared</span>
    <div class="pc-bar-track">
      <div class="pc-bar-fill info" style="width: 76.4%;">17.5 ns</div>
    </div>
  </div>
  <div class="pc-bar-row">
    <span class="pc-bar-label">shared_ptr(new)</span>
    <div class="pc-bar-track">
      <div class="pc-bar-fill bad" style="width: 100%;">22.9 ns</div>
    </div>
  </div>
</div>

<div v-click="3" class="mt-4">
<Callout type="bad" title="实测对比结论">
  <code>make_shared</code> (17.5 ns) 与 <code>shared_ptr</code> (22.9 ns) 相较 <code>unique_ptr</code> (8.82 ns) <strong>慢 2~2.6 倍</strong>。
</Callout>
</div>

</div>

</div>

<div class="pc-next">共享所有权还有一个隐蔽的陷阱</div>

<!--
直接 new 构造 shared_ptr 需要分配对象内存 + 控制块内存（引用计数、弱计数、类型擦除 Deleter），两次堆分配；使用 std::make_shared 可以合并为单次连续分配。
[click] 第二重代价是原子操作开销：多线程下拷贝与析构必须执行原子递增/递减，引发 CPU 缓存行同步开销。
[click] 看右侧柱状图：unique_ptr 8.82 ns，make_shared 17.5 ns，shared_ptr 22.9 ns。
[click] 实测结论：shared_ptr 比 unique_ptr 慢 2 到 2.6 倍。而且如果存在长生命周期的 weak_ptr，由于合并分配，make_shared 会导致对象内存直到所有 weak_ptr 也销毁时才能归还给操作系统。
-->

---
ppt: 5
---

# 循环引用：引用计数永远归不了零

<div class="grid grid-cols-[1.05fr_1.15fr] gap-6 mt-2">

<div>

<div class="pc-svg-hero">
<svg viewBox="0 0 420 150" class="w-full h-auto" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <marker id="arr-solid" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M 0 1 L 8 5 L 0 9 z" fill="var(--pc-accent)"/>
    </marker>
    <marker id="arr-weak" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M 0 1 L 8 5 L 0 9 z" fill="var(--pc-good)"/>
    </marker>
  </defs>
  <rect x="20" y="42" width="125" height="64" rx="6" fill="var(--pc-surface)" stroke="var(--pc-accent)" stroke-width="1.5"/>
  <text x="82" y="69" text-anchor="middle" fill="var(--pc-text)" font-size="13" font-weight="700">ListNode A</text>
  <text x="82" y="89" text-anchor="middle" fill="var(--pc-muted)" font-size="10" font-family="var(--pc-font-mono)">strong = 1</text>

  <rect x="275" y="42" width="125" height="64" rx="6" fill="var(--pc-surface)" stroke="var(--pc-accent)" stroke-width="1.5"/>
  <text x="337" y="69" text-anchor="middle" fill="var(--pc-text)" font-size="13" font-weight="700">ListNode B</text>
  <text x="337" y="89" text-anchor="middle" fill="var(--pc-muted)" font-size="10" font-family="var(--pc-font-mono)">strong = 1</text>

  <!-- next: shared_ptr -->
  <path d="M 147 56 C 190 30, 230 30, 272 56" fill="none" stroke="var(--pc-accent)" stroke-width="2" marker-end="url(#arr-solid)"/>
  <text x="210" y="30" text-anchor="middle" fill="var(--pc-accent)" font-size="10.5" font-family="var(--pc-font-mono)">next (shared_ptr)</text>

  <!-- prev: weak_ptr -->
  <path d="M 273 92 C 230 118, 190 118, 148 92" fill="none" stroke="var(--pc-good)" stroke-width="2" stroke-dasharray="5 3" marker-end="url(#arr-weak)"/>
  <text x="210" y="132" text-anchor="middle" fill="var(--pc-good)" font-size="10.5" font-family="var(--pc-font-mono)">prev (weak_ptr · 破环)</text>
</svg>
</div>

<div v-click="1" class="pc-card bad mt-2">
  <h3>循环引用（Circular Dependency）</h3>
  <p>双向链表或父子节点互相持有 <code>shared_ptr</code> 会导致引用计数永远无法归零。</p>
</div>

</div>

<div v-click="2">

```cpp
struct ListNode {
  std::shared_ptr<ListNode> next; // 拥有下一个节点
  std::weak_ptr<ListNode>   prev; // 仅观察上一个（破环）
};
```

<div v-click="3" class="mt-4">
<Callout type="good" title="破解之道：std::weak_ptr">
  将其中一个方向降级为 <code>std::weak_ptr</code>——提供对<strong>可能已销毁对象的安全探测指针</strong>，不增加强引用计数。
</Callout>
</div>

</div>

</div>

<div class="pc-next">资源不只有内存，还有锁、文件、连接……</div>

<!--
看左图：ListNode 的 next 用 shared_ptr，prev 用 weak_ptr 破环。
[click] 如果双向链表或父子节点互相持有 shared_ptr，引用计数永远无法归零，直接导致内存泄漏。
[click] 代码实现上，ListNode 的 next 用 shared_ptr 拥有，prev 降级为 weak_ptr。
[click] weak_ptr 提供对可能已销毁对象的安全探测指针。这里也要严厉警告：不要把 shared_ptr 当作懒于梳理架构生命周期的「垃圾回收避风港」！很多项目里满屏的 shared_ptr，本质上是因为架构师根本没想清楚谁该负责销毁资源。
-->

---
ppt: 6
---

# RAII：C++ 皇冠上的明珠

<div class="grid grid-cols-2 gap-6 mt-4">

<div>

<div class="pc-card info">
  <h3>Resource Acquisition Is Initialization</h3>
  <p class="pc-card-lead">把（广义）资源的<strong>获取绑定在构造函数</strong>，<strong>释放绑定在析构函数</strong>——借用 C++ 唯一保证自动调用的机制。</p>
</div>

</div>

<div>

<v-clicks>

- **封装性（Encapsulation）**：释放逻辑集中定义
- **异常安全性（Exception Safety）**：栈展开自动释放
- **局部性（Locality）**：获取与释放写在一起

</v-clicks>

</div>

</div>

<div v-click="4" class="mt-8">
<div class="pc-tags justify-center">
  <span class="pc-tag">内存</span><span class="pc-tag">std::mutex</span><span class="pc-tag">文件句柄</span><span class="pc-tag">Socket</span><span class="pc-tag">数据库连接</span>
</div>
</div>

<div class="pc-next">一个健壮的 RAII 类必须守哪些铁律？</div>

<!--
RAII 虽然名字起得极其糟糕（其实应该叫 Destruction Is Resource Release），但它是 C++ 皇冠上的明珠。核心思想是利用栈对象离开作用域时的析构函数，把资源获取绑定在构造、释放绑定在析构。
[click] 优势一：封装性（释放逻辑集中定义）。
[click] 优势二：异常安全性（栈展开 Stack Unwinding 自动释放）。
[click] 优势三：局部性（获取与释放紧挨着定义）。
[click] 广义资源不仅包括内存，还包括互斥锁 std::mutex、文件句柄、Socket、数据库连接。
-->

---
ppt: 6
---

# 设计 RAII 类的三条铁律

<div class="grid grid-cols-3 gap-4 mt-6">

<div v-click class="pc-card bad">
  <h3>1 · 禁用拷贝</h3>
  <p><code>= delete</code> 拷贝构造与拷贝赋值，防止<strong>双重释放 / 重复 unlock</strong>。</p>
</div>

<div v-click class="pc-card bad">
  <h3>2 · 析构绝不抛异常</h3>
  <p>C++11 起析构默认 <code>noexcept</code>；栈展开期间再抛异常 → <code>std::terminate()</code>。</p>
</div>

<div v-click class="pc-card info">
  <h3>3 · 支持提前释放</h3>
  <p>提供 <code>reset()</code>，或用 <code>const std::unique_ptr&lt;T&gt;</code> 打造严格作用域守卫。</p>
</div>

</div>

<div v-click="4" class="mt-8">
<Callout type="info" title="为什么「双重释放」如此致命">
  拷贝一个持有锁的守卫，会让两个对象在析构时对同一把锁 unlock → 未定义行为。
</Callout>
</div>

<div class="pc-next">多步操作中途失败，如何保证状态一致？</div>

<!--
[click] 铁律一：禁用拷贝。拷贝构造和拷贝赋值都要 = delete，否则两个对象析构时会对同一份资源释放两次，也就是双重释放或重复 unlock。
[click] 铁律二：析构绝不抛异常。C++11 起析构函数默认 noexcept；如果栈展开期间析构又抛异常，两个异常同时传播会直接触发 std::terminate。
[click] 铁律三：支持提前释放，提供 reset()，或用 const unique_ptr 做不可移动的严格作用域守卫。
[click] 补充：为什么双重释放致命——拷贝一个持有锁的守卫，两个对象析构时对同一把锁 unlock，就是未定义行为。
-->

---
ppt: 6
---

# Copy-and-Swap：强异常安全模板

<div class="grid grid-cols-2 gap-4 mt-4">
<div>

<div class="pc-bad text-sm mb-1">❌ 手动管理多把锁 / 原地修改</div>

```cpp
// 手动管理 m1.lock(), m2.lock() 或原地 clear：
// 早退 (Early return) 与异常分支下千疮百孔
void transmogrify(const std::vector<C>& in,
                  std::vector<C>& out) {
    out.clear();                 // 一旦后续抛异常，
    out.reserve(in.size());      // out 就半死不活
    for (const auto& x : in)
        out.push_back(transform(x));
}
```

</div>
<div v-click>

<div class="pc-good text-sm mb-1">✅ Copy-and-Swap（Commit-or-Rollback）</div>

```cpp {3-6|7}
void transmogrify(const std::vector<C>& in,
                  std::vector<C>& out) {
    std::vector<C> tmp;          // 1. 准备副本（若抛异常，out 毫发无损）
    tmp.reserve(in.size());
    for (const auto& x : in)
        tmp.push_back(transform(x));
    out.swap(tmp);               // 2. noexcept 极速交换提交，旧数据随 tmp 自动析构！
}
```

</div>
</div>

<div class="pc-next">还有更通用的声明式清理手法</div>

<!--
反面：手动管理多个锁（m1.lock(), m2.lock()）在早退和异常分支下千疮百孔，或者直接原地修改 out，一旦中途抛异常，数据结构就处于半死不活的损坏状态。
[click] 正面：结合 Copy-and-Swap 惯用法实现强异常安全保证（Commit-or-Rollback），先在栈上临时副本 tmp 完成所有可能抛异常的修改。
[click] 最后一行 out.swap(tmp) 是保证不抛异常的 noexcept 操作，极速交换提交状态，旧数据随 tmp 自动析构。
-->

---
ppt: 7
---

# 多步操作的清理之痛

<div class="grid grid-cols-2 gap-6 mt-4">

<div>

<div class="pc-card info">
  <h3>场景</h3>
  <p class="pc-card-lead">先写磁盘 <code>Storage::insert</code>，再更新内存索引 <code>Index::insert</code>，失败时需 <code>finalize</code> 或 <code>undo</code>。</p>
</div>

</div>

<div>

<v-clicks>

- 手写嵌套 `try-catch` 破坏**可组合性（Composability）**
- $N$ 步操作 → 嵌套层次指数级膨胀
- 为每个一次性操作手写专用 RAII 类，**太繁琐**

</v-clicks>

</div>

</div>

<div v-click="4" class="mt-8">
<Callout type="bad" title="传统痛点">
  清理与回滚逻辑散落在层层 <code>catch</code> 里，<br>「做什么」和「出错怎么办」被强行拆散。
</Callout>
</div>

<div class="pc-next">有没有办法把善后逻辑就地声明？</div>

<!--
当一个操作包含多个跨组件步骤，比如先写磁盘 Storage::insert，再更新内存索引 Index::insert，而且需要 finalize 或 undo 时，问题就来了。
[click] 手写嵌套 try-catch 会破坏代码的可组合性。
[click] N 步操作的嵌套层次会膨胀。
[click] 而为每个一次性操作都手写一个专用 RAII 类又太繁琐。
[click] 传统痛点：清理和回滚逻辑散落在层层 catch 里，把「做什么」和「出错怎么善后」强行拆散。
-->

---
ppt: 7
---

# ScopeGuard 模式演进

<div class="grid grid-cols-2 gap-6 mt-2">

<div>

<div v-click class="pc-card info">
  <h3>C++03 经典版（Alexandrescu）</h3>
  <p>用 <code>const Base&</code> 绑定临时派生类对象延长生命周期，配 <code>mutable bool commit_</code> 控制是否回滚。</p>
</div>

</div>

<div v-click="2">

<div class="pc-card good">
  <h3>C++11/17 现代泛型版</h3>
  <p>基于模板推导 + Lambda，将任意代码块封装为栈上 RAII 对象：<strong>零堆分配、零虚函数开销</strong>。</p>
</div>

</div>

</div>

<div v-click="3" class="mt-6">
<Callout type="bad" title="性能警告">
  实测证明：<code>std::function</code> 类型擦除版的 ScopeGuard 会<strong>慢 2~3 倍</strong>——泛型模板才是正解。
</Callout>
</div>

<div class="pc-next">如何在 C++17 自动检测「是否正在抛异常」？</div>

<!--
[click] C++03 的经典版（Alexandrescu）：利用 const Base& 绑定临时派生类对象来延长生命周期，再用一个 mutable bool commit_ 标志控制是否回滚。
[click] C++11/17 的现代泛型版：基于模板推导和 Lambda，把任意代码块封装成栈上 RAII 对象，零堆分配、零虚函数开销。
[click] 性能警告：实测 std::function 类型擦除版的 ScopeGuard 会慢 2 到 3 倍，所以泛型模板才是正解。
-->

---
ppt: 7
---

# uncaught_exceptions：精准的异常检测

<div class="grid grid-cols-2 gap-4 mt-4">
<div>

<div class="pc-bad text-sm mb-1">❌ C++98 已废除接口</div>

```cpp
bool std::uncaught_exception(); // 返回 bool
```

<div v-click="1" class="pc-card bad mt-2">
  <p>析构期间本身已有 1 个异常在传播，即使内部完全成功，也返回 <code>true</code> → 误回滚。</p>
</div>

</div>
<div v-click="2">

<div class="pc-good text-sm mb-1">✅ C++17 活跃异常计数接口</div>

```cpp
int std::uncaught_exceptions(); // 返回 int 计数
```

<div v-click="3" class="mt-3">

```cpp
void Database::insert(const Record& r) {
    S.insert(r);
    ON_SCOPE_EXIT    { S.finalize(); }; // 无论成功失败，必执行清理
    ON_SCOPE_FAILURE { S.undo(); };     // 仅当栈展开新增异常时，自动回滚！
    I.insert(r);                        // 若此处抛异常，逆序触发 undo -> finalize
}
```

</div>

</div>
</div>

<div class="pc-next">清理自动化了，接口契约还缺一层保障</div>

<!--
为什么 C++98 的 std::uncaught_exception() 返回 bool 是残废的？
[click] 因为如果在一个析构函数执行期间——此时本身就有 1 个未捕获异常在传播——调用了 Database::insert，即使 insert 内部完全成功，旧接口也会返回 true，导致误回滚。
[click] C++17 的 uncaught_exceptions() 返回 int 计数：进入作用域时记录当前活跃异常数量，离开时对比数量差，精准判断是不是新增了异常。
[click] 看这段声明式代码：ON_SCOPE_EXIT 无论成功失败都执行清理，ON_SCOPE_FAILURE 仅在栈展开新增异常时回滚。把「做什么」和「善后」紧挨着写在一起，符合人脑直觉。
-->

---
ppt: 8
---

# 模板契约的缺失之痛

<div class="grid grid-cols-2 gap-6 mt-4">

<div>

<div class="pc-card info">
  <h3>普通模板</h3>
  <p class="pc-card-lead"><code>template &lt;typename T&gt;</code> 允许传入<strong>任何类型</strong>，不表达任何契约。</p>
</div>

</div>

<div>

<v-clicks>

- 类型不满足函数体内的操作（如 `a + b`）
- 报错发生在模板实例化的**最深处**
- 天书般的编译错误，违背「**接口即契约**」

</v-clicks>

</div>

</div>

<div v-click="4" class="mt-6">
<Callout type="bad" title="问题本质">
  接口该说「我需要一个能做加法、可遍历的类型」，<br>但 <code>typename T</code> 什么也没说。
</Callout>
</div>

<div class="pc-next">C++ 先辈们如何强行表达模板约束？</div>

<!--
普通模板 template <typename T> 允许传入任何类型，它不表达任何契约。
[click] 如果类型不满足函数体内使用到的操作（如 a + b）。
[click] 错误会在模板实例化的最深处爆出来。
[click] 结果是天书般的编译错误，彻底违背「接口即契约」原则。
[click] 问题本质：接口本该声明「我需要一个能做加法、可遍历的类型」，但 typename T 什么也没说。
-->

---
ppt: 8
---

# SFINAE：替换失败非错

<div class="grid grid-cols-2 gap-6 mt-2">

<div>

<div v-click="1" class="pc-card info">
  <h3>自然 SFINAE</h3>
  <p>利用类型自身属性，如 <code>typename T::value_type</code>。</p>
</div>

<div v-click="2" class="pc-card info mt-3">
  <h3>人为 SFINAE</h3>
  <p>用 <code>std::enable_if_t&lt;..., bool&gt; = true</code> 或尾置 <code>decltype(a + b)</code> 故意制造替换失败，从重载集剔除函数。</p>
</div>

</div>

<div v-click="3">

<div class="pc-card bad">
  <h3>局限性</h3>
  <p>仅对函数模板参数推导替换阶段生效；<strong>函数体内部错误仍是硬错误</strong>。</p>
</div>

<div v-click="4" class="mt-3">

```cpp
// 非模板成员函数还得靠冗余默认参数绕弯
template <typename U = T>
std::enable_if_t<...> foo(U u);
```

</div>

</div>

</div>

<div class="pc-next">C++20 给出了干净的答案</div>

<!--
[click] 自然 SFINAE：利用类型自身属性，比如 typename T::value_type。
[click] 人为 SFINAE：用 enable_if 或尾置返回类型 decltype(a+b)，故意制造替换失败，目的是把不满足条件的函数从重载集里剔除。
[click] 局限：它只对函数模板的参数推导替换阶段生效；函数体内部的错误仍然是硬错误。
[click] 而且对非模板成员函数，还得引入冗余的默认模板参数 template<typename U = T> 来绕弯。所以不要把 SFINAE 当作炫技的资本，它本质上是早期为了让重载正常工作的语言补丁。
-->

---
ppt: 8
---

# Concepts：把模板约束变成一等公民

<div v-click="1" class="mt-2">

```cpp
// 1. C++11/14 SFINAE (晦涩的元编程技巧)
template <typename R,
          std::enable_if_t<Range<std::decay_t<R>>, bool> = true>
void sort(R&& r);
```

</div>

<div v-click="2" class="mt-4">

```cpp
// 2. C++20 Concept 定义与使用 (清晰、自文档化的静态契约)
template <typename R>
concept Range = requires (R r) { std::begin(r); std::end(r); };

template <Range R> void sort(R&& r);   // 或简写：void sort(Range auto&& r);
```

</div>

<div v-click="3" class="mt-6">
<Callout type="good" title="核心跨越">
  无需任何 dummy 模板参数即可约束类模板的普通成员函数（如 <code>void sort() requires Range&lt;T&gt;</code>），<br>且编译器直接报告违反了<strong>哪一条语义契约</strong>。
</Callout>
</div>

<div class="pc-next">编译期的抽象还有另一条不靠继承的路</div>

<!--
[click] 看第一代 SFINAE 写法：enable_if 塞在模板参数里，晦涩难懂。
[click] 第二代 C++20 Concepts：先把约束定义成一个命名的 concept，比如 Range，然后直接用 template <Range R> 或 Range auto&& 约束。既清晰又自文档化。
[click] 核心跨越：不需要任何 dummy 模板参数，就能直接约束类模板的普通成员函数；而且编译器会直接告诉你违反了哪一条语义契约。即使团队目前还在用 C++14/17，也应当学习 Concepts 的设计思维。
-->

---
ppt: 9
---

# 虚函数的代价：一次调用慢 5 倍

<div class="grid grid-cols-[1.15fr_1fr] gap-6 mt-2">

<div>

<div class="pc-svg-hero">
<svg viewBox="0 0 450 135" class="w-full h-auto" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <marker id="v-arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M 0 1 L 8 5 L 0 9 z" fill="var(--pc-bad)"/>
    </marker>
  </defs>
  <rect x="10" y="34" width="110" height="58" rx="6" fill="var(--pc-surface)" stroke="var(--pc-bad)" stroke-width="1.5"/>
  <text x="65" y="57" text-anchor="middle" fill="var(--pc-text)" font-size="11.5" font-weight="700">Object</text>
  <text x="65" y="76" text-anchor="middle" fill="var(--pc-bad)" font-size="10" font-family="var(--pc-font-mono)">vptr</text>

  <line x1="120" y1="63" x2="170" y2="63" stroke="var(--pc-bad)" stroke-width="1.8" marker-end="url(#v-arr)"/>
  <text x="145" y="54" text-anchor="middle" fill="var(--pc-muted)" font-size="9.5">跳转 1</text>

  <rect x="172" y="26" width="120" height="74" rx="6" fill="var(--pc-surface)" stroke="var(--pc-bad)" stroke-width="1.5"/>
  <text x="232" y="48" text-anchor="middle" fill="var(--pc-text)" font-size="11.5" font-weight="700">vtable</text>
  <text x="232" y="68" text-anchor="middle" fill="var(--pc-muted)" font-size="9.5" font-family="var(--pc-font-mono)">[0] &amp;D::operator[]</text>
  <text x="232" y="84" text-anchor="middle" fill="var(--pc-muted)" font-size="9.5" font-family="var(--pc-font-mono)">[1] &amp;D::~D</text>

  <line x1="292" y1="63" x2="342" y2="63" stroke="var(--pc-bad)" stroke-width="1.8" marker-end="url(#v-arr)"/>
  <text x="317" y="54" text-anchor="middle" fill="var(--pc-muted)" font-size="9.5">跳转 2</text>

  <rect x="344" y="34" width="96" height="58" rx="6" fill="rgba(239,68,68,0.12)" stroke="var(--pc-bad)" stroke-width="1.5"/>
  <text x="392" y="58" text-anchor="middle" fill="var(--pc-bad)" font-size="11" font-weight="700">函数指针</text>
  <text x="392" y="76" text-anchor="middle" fill="var(--pc-muted)" font-size="9.5">阻碍 Inlining</text>
</svg>
</div>

<v-clicks>

- 虚调用需 `vptr → vtable → 函数指针` **两次解引用跳转**
- 更致命：**阻碍编译器内联（Inlining）**

</v-clicks>

</div>

<div v-click="3">

<div class="pc-tag mb-3">Google Benchmark 极简调用耗时</div>

<div class="pc-bars">
  <div class="pc-bar-row">
    <span class="pc-bar-label">BM_none</span>
    <div class="pc-bar-track">
      <div class="pc-bar-fill good" style="width: 17.7%;">1.60 ns</div>
    </div>
  </div>
  <div class="pc-bar-row">
    <span class="pc-bar-label">BM_dynamic</span>
    <div class="pc-bar-track">
      <div class="pc-bar-fill bad" style="width: 100%;">9.04 ns</div>
    </div>
  </div>
  <div class="pc-bar-row">
    <span class="pc-bar-label">BM_static (CRTP)</span>
    <div class="pc-bar-track">
      <div class="pc-bar-fill good" style="width: 17.1%;">1.55 ns</div>
    </div>
  </div>
</div>

<div v-click="4" class="mt-4">
<Callout type="bad" title="实测对比结论">
  极简虚函数调用（9.04 ns）比普通/内联调用（1.60 ns）与 CRTP（1.55 ns）<strong>慢 5~6 倍</strong>。
</Callout>
</div>

</div>

</div>

<div class="pc-next">能不能在编译期就确定调用哪个函数？</div>

<!--
看左侧示意图：虚函数调用过程。
[click] 虚函数调用需要经过 vptr 到 vtable 再到函数指针两次解引用跳转。
[click] 更致命的是它阻碍了编译器内联（Inlining）。
[click] 看右侧 Google Benchmark 实测柱状图：BM_none 1.60 ns，BM_dynamic 9.04 ns，BM_static (CRTP) 1.55 ns。
[click] 结论：虚函数比普通调用和 CRTP 静态多态慢 5 到 6 倍；CRTP 实现了真正的零开销多态。
-->

---
ppt: 9
---

# CRTP：让基类在编译期认识派生类

<div class="grid grid-cols-[1.1fr_1fr] gap-6 mt-2">

<div>

<div v-click="1" class="pc-card info">
  <h3>Curiously Recurring Template Pattern</h3>
  <p class="pc-card-lead">派生类 <code>D</code> 继承自以自身为模板实参的基类模板 <code>B&lt;D&gt;</code>，基类在<strong>编译期即获知</strong>派生类的确切类型。</p>
</div>

<div v-click="2" class="mt-3 text-center">

```cpp
template <typename D> class B { /* ... */ };
class D : public B<D> { /* ... */ };
```

</div>

</div>

<div v-click="3">

<div class="pc-card good">
  <h3>静态多态（Static Polymorphism）</h3>
  <p>通过 <code>static_cast&lt;D*&gt;(this)</code> 直接向下转型调用，<strong>无需虚表、可完全内联</strong>。</p>
</div>

<div class="pc-card info mt-3">
  <h3>延迟实例化与不完整类型（Incomplete Type）</h3>
  <p>基类实例化时派生类尚未定义完毕；C++ 仅在真正调用成员函数时才实例化函数体，此时 <code>D</code> 已是完整类型。</p>
</div>

</div>

</div>

<div class="pc-next">CRTP 写进工程，还要防几个坑</div>

<!--
[click] CRTP（奇特循环模板模式，James Coplien 1995 年提出）：派生类 D 继承自以自身为模板实参的基类 B<D>。
[click] 看这行 class D : public B<D>，看起来像「鸡生蛋、蛋生鸡」的死循环，为什么能编译通过？
[click] 因为 C++ 只有在真正调用成员函数时才会实例化函数体，而在那一刻派生类 D 已经是完整类型了！基类通过 static_cast<D*>(this) 直接向下转型调用，无需虚表、可完全内联。
-->

---
ppt: 9
---

# 标准安全 CRTP 模板

<div class="grid grid-cols-2 gap-4 mt-2">
<div>

<div class="pc-good text-sm mb-1">✅ 防呆 + 编译期纯虚</div>

```cpp
template <typename Derived>
class DenseVector {
    DenseVector() = default;
    friend Derived;  // 防呆：阻止 class Bad : public DenseVector<Good>
protected:
    ~DenseVector() = default;  // 非虚保护析构，遵守 Core Guideline C.35
public:
    Derived& derived() { return static_cast<Derived&>(*this); }
    decltype(auto) operator[](size_t i) { return derived()[i]; }
};
```

</div>
<div v-click>

<div class="pc-card info">
  <h3>CRTP 工程实现细节</h3>
</div>

<v-clicks>

- **编译期纯虚函数**：基类 `f()` 转发到派生类 `f_impl()`，避免忘记重写引发无限递归死循环
- **防呆保护**：基类构造函数设为 `private` + `friend Derived;`，防止 `class D2 : public B<D1>` 写错模板参数
- **不完整类型限制**：基类声明中不能直接引用 `typename D::value_type`（需在成员函数体内使用或用 `decltype(auto)`）

</v-clicks>

</div>
</div>

<div class="pc-next">CRTP 还能不靠继承地「注入」功能</div>

<!--
[click] 这是标准的、安全的 CRTP 模板。看关键几行：构造函数私有，再声明 friend Derived——如果不写这行防呆，同事复制粘贴写新类时忘了改模板参数，编译器完全不会报错，直到运行时行为诡异。
[click] 细节一：编译期纯虚函数，基类公开接口 f() 转发调用派生类的 f_impl()，避免忘记重写时引发无限递归死循环。
[click] 细节二：私有构造 + friend Derived 防呆。
[click] 细节三：不完整类型限制，基类实例化时派生类尚未定义完毕，不能在基类声明里直接引用 typename D::value_type，需放到成员函数体内或用 decltype(auto) 推导返回类型。
-->

---
ppt: 10
---

# CRTP 的两种截然不同的角色

<div class="grid grid-cols-2 gap-6 mt-6">

<div v-click class="pc-card info">
  <h3>1 · 作为设计模式</h3>
  <p class="pc-muted text-xs mb-2">Design Pattern</p>
  <p class="pc-card-lead">引入静态类型分类抽象（如 <code>DenseVector&lt;Derived&gt;</code>），外部算法通过泛型接收基类引用实现静态多态。</p>
</div>

<div v-click="2" class="pc-card good">
  <h3>2 · 作为实现模式</h3>
  <p class="pc-muted text-xs mb-2">Implementation Pattern / Static Mixin</p>
  <p class="pc-card-lead">基类采用 <code>private</code> 继承，不提供多态抽象，仅向派生类<strong>非侵入式注入通用功能（Skills）</strong>。</p>
</div>

</div>

<div v-click="3" class="mt-8">
<Callout type="info" title="Iglberger 的分类">
  同一个语法机制，意图不同、用法不同：一个是「静态类型分类抽象」，一个是「非侵入式注入通用功能」。
</Callout>
</div>

<div class="pc-next">如何优雅地为自定义类型补齐运算符？</div>

<!--
[click] 同一个 CRTP，在 Iglberger 的分类中有两种截然不同的角色。第一种，作为设计模式：引入静态类型分类抽象，比如 DenseVector<Derived>，外部泛型算法接收基类引用以实现静态多态。
[click] 第二种，作为实现模式（Static Mixin）：基类采用 private 继承，不提供多态抽象，仅用于向派生类非侵入式地注入通用功能（Skills）。
[click] 总结：一个是提供公共抽象契约，一个是纯粹复用实现细节。
-->

---
ppt: 10
---

# Friend Factory（Barton-Nackman Trick）

<div class="grid grid-cols-2 gap-6 mt-2">

<div>

<div v-click="1" class="pc-card info">
  <h3>为什么二元运算符不能是成员函数？</h3>
  <p>二元运算符（<code>+</code>, <code>==</code>）和流输出（<code>&lt;&lt;</code>）若写成成员函数，<strong>不支持左操作数的隐式类型转换</strong>。</p>
</div>

<div v-click="2" class="pc-card good mt-3">
  <h3>内联（in-situ）friend 定义</h3>
  <p>在 CRTP 基类内用 <code>friend</code> 内联定义非模板自由函数，仅通过 ADL 查找可见。</p>
</div>

</div>

<div v-click="3">

```cpp
template <typename Derived>
struct Addable {
    friend Derived operator+(Derived const& lhs,
                             Derived const& rhs) {
        return Derived{ lhs.get() + rhs.get() }; // Barton-Nackman Trick (Hidden Friend)
    }
};
```

</div>

</div>

<div class="pc-next">把能力做成可插拔的积木</div>

<!--
[click] 为什么二元运算符（+、==）和流输出（<<）不能是成员函数？因为成员函数不支持左操作数的隐式类型转换。
[click] 解法是 Friend Factory 模式（Barton-Nackman Trick）：在 CRTP 基类内部使用 friend 内联（in-situ）定义非模板自由函数。
[click] 看代码：每次 CRTP 基类模板实例化时，都会自动在外部作用域制造出一个支持隐式转换的普通非模板友元函数，而且仅通过 ADL 查找可见。
-->

---
ppt: 10
---

# StrongType：一行代码组装能力

<div class="grid grid-cols-[1fr_1fr] gap-6 mt-2">

<div>

<v-clicks>

- 用 `long` 表示「米」和「千米」→ **单位混加**风险
- 封装成强类型后手写全套运算符 → 样板代码繁重
- 变参模板模板参数：`template<typename> class... Skills`

</v-clicks>

</div>

<div v-click="4">

```cpp
template <typename T, typename Tag,
          template<typename> class... Skills>
struct StrongType
  : private Skills<StrongType<T, Tag, Skills...>>... { /*...*/ };

using Meter   = StrongType<long, struct MeterTag,
                           Addable, Printable>;
using Surname = StrongType<std::string, struct SurnameTag,
                           Printable>; // 姓氏不可相加！
```

</div>

</div>

<div v-click="5" class="mt-4">
<Callout type="good" title="StrongType 技能插件化">
  一行代码按需组装具备 <code>Addable</code>、<code>Printable</code>、<code>Swappable</code> 能力的强类型。
</Callout>
</div>

<div class="pc-next">说起重载，C++ 还有第三大抽象机制</div>

<!--
[click] 演示 StrongType 的痛点：用 long 表示「米」和「千米」极易发生单位混加的灾难（如火星气候探测器的坠毁）。
[click] 但封装成类后，重写全套运算符又会累死人。
[click] 利用变参模板模板参数 template<typename> class... Skills，把技能做成可插拔积木。
[click] 看代码：Meter 组装了 Addable 和 Printable；Surname 只组装 Printable，姓氏不可相加！
[click] 这就是 CRTP + Hidden Friend 的神仙组合：不仅通过 Mixin 实现了零成本代码复用，而且内联 friend 天然缩小了重载集搜索范围、加快编译速度，还能完美支持隐式类型转换。
-->

---
ppt: 11
---

# 自由函数：第三大抽象机制

<div class="grid grid-cols-2 gap-6 mt-4">

<div>

<v-clicks>

- C++ 的三大抽象机制：**继承**、**Concepts**、**函数重载集**
- 成员函数是**侵入式**的：无法给 `int`、C 数组或第三方闭源类加成员 `begin()`
- 自由函数遵循**开闭原则（OCP）**，无需改原类定义即可扩展新行为

</v-clicks>

</div>

<div v-click="4">

<div class="pc-card info">
  <h3>非侵入式扩展（Non-intrusive Extension）</h3>
  <p class="pc-card-lead"><code>std::begin(arr)</code>、自定义 <code>swap(a, b)</code>——在任意命名空间为类型扩展新行为。</p>
</div>

</div>

</div>

<div v-click="5" class="mt-8">
<Callout type="good" title="开闭原则（OCP）落地">
  无需修改原类定义，即可通过自由函数重载集为任意类型非侵入式扩展统一接口。
</Callout>
</div>

<div class="pc-next">自由函数怎么找到「正确的那个」重载？</div>

<!--
[click] 除了继承基类和 Concepts，C++ 的第三大抽象机制是函数重载集（Overload Sets）。
[click] 成员函数是侵入式的：无法给 int、C 数组或第三方库闭源类添加成员函数 begin()。
[click] 自由函数遵循开闭原则（OCP），无需修改原类定义即可在任意命名空间为其扩展新行为。
[click] 比如 std::begin(arr)、自定义 swap(a, b)。
[click] 挑战传统 OOP 观念：很多程序员觉得「把所有函数都塞进 class 里才叫封装」。恰恰相反！类里的成员函数越多，能直接读写 private 成员变量的代码就越多，封装性反而越差（看看臃肿的 std::string 对比极其克制的 std::vector + <algorithm> 自由函数设计）。
-->

---
ppt: 11
---

# ADL 与两步法（Two-step Idiom）

<div class="grid grid-cols-2 gap-6 mt-4">

<div>

<v-clicks>

- `using std::swap; swap(a, b);` 两步法
- 编译器自动在**实参所属命名空间**查找最匹配的自定义函数
- 自定义 `swap` / `begin` 就是「Shim / 函数适配器」

</v-clicks>

</div>

<div v-click="4">

```cpp
// 左：调用 range.begin()，遇到原生数组直接编译报错
// int a[6]; a.begin();   // ❌

// 右：使用 using std::begin; begin(range); 配合 ADL 畅通无阻
using std::begin;
begin(range);            // ✅ 自动找到最佳匹配
```

</div>

</div>

<div v-click="5" class="mt-6">
<Callout type="bad" title="重载集的语义约束（LSP）">
  Core Guideline C.162/C.163：仅对<strong>语义等价</strong>的操作进行重载——加入重载集就像继承基类一样，必须严格履行预期行为契约。
</Callout>
</div>

<div class="pc-next">最后，用一句金律收束这一章</div>

<!--
[click] 结合 using std::swap; swap(a, b); 两步法（Two-step idiom）。
[click] 编译器会自动在实参所属的命名空间中查找最匹配的自定义函数。
[click] 自定义的 swap 或 begin 就是 Shim / 函数适配器。
[click] 看对比：左图调用 range.begin() 在遇到原生数组 int a[6] 时直接编译报错；右图使用 using std::begin; begin(range); 配合 ADL 畅通无阻。
[click] 提醒学员：自由函数组成的重载集是一把双刃剑。Core Guideline C.162/C.163 要求仅对语义等价的操作进行重载。如果你写了一个只交换一半成员变量的 swap()，或者把启动线程的函数取名叫 begin()，就会彻底摧毁泛型代码的信任基石。
-->

---
ppt: 11
---

# 优先非成员非友元函数

<div class="grid grid-cols-[1.3fr_1fr] gap-8 mt-6">

<div>

<div v-click="1" class="pc-card info">
  <h3>Scott Meyers · Effective C++ Item 23</h3>
  <p>自由函数组成的重载集是可扩展的编译期抽象点，也是非侵入式架构设计的基础。</p>
</div>

<div v-click="2" class="mt-4">
<div class="pc-tags">
  <span class="pc-tag">std::begin</span><span class="pc-tag">swap</span><span class="pc-tag">operator&lt;&lt;</span><span class="pc-tag">std::hash</span>
</div>
</div>

</div>

<div class="flex items-center">
<Quote v-click="3" author="Scott Meyers · Effective C++ Item 23" zh="优先使用非成员非友元函数替换成员函数。">
  Prefer non-member non-friend functions to member functions.
</Quote>
</div>

</div>

<div class="pc-next">把这一课的武器串成一条链路</div>

<!--
[click] Scott Meyers 在 Effective C++ Item 23 给出的设计准则。
[click] std::begin、swap、operator<<、std::hash 都是基于自由函数重载集的非侵入式扩展点。
[click] 记住这句金律：Prefer non-member non-friend functions to member functions（优先使用非成员非友元函数替换成员函数）。
-->

---
ppt: 12
---

# 第 1 课知识链路复盘

<div class="pc-chain mt-8 text-base">
  <div v-click="1" class="pc-card info">所有权显式化<br><span class="pc-muted text-xs">unique_ptr / shared_ptr / T* / span</span></div>
  <span v-click="2" class="pc-arrow">→</span>
  <div v-click="2" class="pc-card good">生命周期自动化<br><span class="pc-muted text-xs">RAII / Copy-and-Swap / ScopeGuard</span></div>
  <span v-click="3" class="pc-arrow">→</span>
  <div v-click="3" class="pc-card info">编译期零开销抽象<br><span class="pc-muted text-xs">Concepts / CRTP / 自由函数重载集</span></div>
</div>

<div v-click="4" class="mt-10">
<Callout type="good" title="核心知识链路">
  所有权显式化 → 生命周期自动化 → 编译期零开销抽象
</Callout>
</div>

<div class="pc-next">落到你自己的代码库，先自检三件事</div>

<!--
第 1 课我们打通了 Modern C++ 的「任督二脉」，核心知识链路串联起三大模块：
[click] 第一模块：所有权显式化（unique_ptr / shared_ptr / T* / span）。
[click] 第二模块：生命周期自动化（RAII / Copy-and-Swap / ScopeGuard）。
[click] 第三模块：编译期零开销抽象（Concepts / CRTP / 自由函数重载集）。
[click] 搞懂了如何用现代语言机制写出安全、高效、零泄漏的局部代码。
-->

---
ppt: 12
---

# 代码库自检清单（Design Reflection）

<div class="grid grid-cols-3 gap-4 mt-10">

<div v-click="1" class="pc-card bad">
  <h3>1 · 所有权检查</h3>
  <p>检查项目中是否还有裸 <code>delete</code>，或在普通计算函数中传递 <code>const std::shared_ptr&lt;T&gt;&</code>？</p>
</div>

<div v-click="2" class="pc-card bad">
  <h3>2 · 异常安全检查</h3>
  <p>检查多步事务操作是否存在异常导致的状态不一致风险？</p>
</div>

<div v-click="3" class="pc-card bad">
  <h3>3 · 可测试性检查</h3>
  <p>检查是否有本该提取为自由函数的 <code>private</code> 辅助逻辑被锁死在类内部导致无法单测？</p>
</div>

</div>

<div v-click="4" class="mt-8">
<Callout type="info" title="Design Reflection">
  从「所有权签名」「多步事务回滚」「非侵入式自由函数」三个维度审视现有代码库。
</Callout>
</div>

<div class="pc-next">把今天的武器用到实战作业里</div>

<!--
[click] 自检第一条：检查项目中是否还有裸 delete，或在普通计算函数中传递 const std::shared_ptr<T>&？
[click] 自检第二条：检查多步事务操作是否存在异常导致的状态不一致风险？
[click] 自检第三条：检查是否有本该提取为自由函数的 private 辅助逻辑被锁死在类内部导致无法单测？
[click] 这三条 Design Reflection 清单可以直接作为团队 Code Review 的基线。
-->

---
ppt: 12
---

# 课后实战作业

<div class="grid grid-cols-[1.1fr_1fr] gap-6 mt-4">

<div>

<div class="pc-card info">
  <h3>任务</h3>
  <p class="pc-card-lead">基于 C++17 <code>std::uncaught_exceptions()</code>，手写一个<strong>零堆内存分配、不可拷贝</strong>的泛型 <code>ScopeGuard</code>（支持 <code>ON_SCOPE_EXIT</code> 与 <code>ON_SCOPE_FAILURE</code>）。</p>
</div>

<v-clicks>

- 编写 Google Test 验证：**正常返回**场景
- 编写 Google Test 验证：**异常抛出**场景
- 编写 Google Test 验证：**析构函数内嵌套调用**场景

</v-clicks>

</div>

<div v-click="4">

```cpp
TEST(ScopeGuardTest, NestedException) {
    object_counter counter;          // 资源计数桩
    ComplexOperation op;             // 嵌套异常模拟类
    EXPECT_THROW(op.run(), std::runtime_error);
    EXPECT_EQ(counter.count(), 0);   // 验证三种场景下的准确性
}
```

</div>

</div>

<div class="pc-next">下一课：SOLID 设计原则与经典 GoF 设计模式 Modern C++ 重构</div>

<!--
课后实战作业：基于 C++17 std::uncaught_exceptions()，手写一个零堆内存分配、不可拷贝的泛型 ScopeGuard，支持 ON_SCOPE_EXIT 与 ON_SCOPE_FAILURE。
[click] 编写 Google Test 单元测试，验证场景一：正常返回。
[click] 验证场景二：异常抛出。
[click] 验证场景三：析构函数内嵌套调用时的准确性。
[click] 右侧给出 Google Test 测试用例模板（含 object_counter 资源计数桩与嵌套异常模拟类 ComplexOperation）。下节伏笔：局部代码写得再漂亮，如果模块之间耦合得像一团乱麻，系统照样会腐化。下一课，我们将正式迈入《软件设计》的大门，用今天学到的武器去彻底重构 SOLID 原则与经典的 GoF 设计模式！
-->
