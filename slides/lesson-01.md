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

<div class="pc-subtitle">从内存所有权、RAII 到零开销抽象</div>

<div class="mt-10 text-sm pc-muted">
Memory Ownership · RAII · Concepts · CRTP · Overload Sets
</div>

<!--
系列开篇。今天不讲花哨新语法，先回答一个问题：我们学了那么多 C++ 特性、用上了 C++20/23，为什么项目还是越改越难改？这一课打通 Modern C++ 的「任督二脉」：如何写出安全、高效、零泄漏的局部代码。
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

<div v-click class="mt-4">
<Callout type="info" title="以 C++20 Modules 为例">
  Modules 只能<strong>映射</strong>现有设计并<strong>暴露</strong>其缺陷，<br>
  无法自动修复糟糕的耦合。
</Callout>
</div>

</div>

<div v-click="2">

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
  <p class="!text-base !text-[var(--pc-text)]">在 C++ 中，内存所有权即「对象所有权」：<br>明确<strong>谁有责任管理对象的生命周期并将其销毁</strong>。</p>
</div>

<v-clicks>

- C++ 没有垃圾回收器，销毁责任必须显式归属
- 泄漏 / Double Free / 野指针的共同根因：**所有权语义模糊**
- `Widget*` 这个类型承载了太多歧义

</v-clicks>

</div>

<div class="flex items-center">
<Callout type="bad" title="问题不在记性差">
  不是程序员记性差，<br>而是类型系统<strong>没有记录</strong>谁该释放它。
</Callout>
</div>

</div>

<div class="pc-next">那所有权到底有几种？</div>

<!--
进入第 2 个话题：内存所有权。
[click] C++ 与 Java/Python 最大的区别是没有 GC，谁负责销毁必须显式说清楚。
[click] 传统 C++ 里内存泄漏、Double Free、野指针满天飞的根本原因，不是程序员记性差，而是 Widget* 这个类型承载了太多模糊语义——它既可能拥有，也可能只是借用，编译器根本无从判断。
-->

---
ppt: 2
---

# 三种核心所有权状态

<div class="grid grid-cols-3 gap-4 mt-6">

<div v-click class="pc-card info">
  <h3>非所有权</h3>
  <p class="pc-muted text-xs mb-2">Non-owning</p>
  <p class="!text-[var(--pc-text)]">仅使用或观察对象，<strong>绝不销毁</strong>，也不延长其生命周期。</p>
</div>

<div v-click class="pc-card good">
  <h3>独占所有权</h3>
  <p class="pc-muted text-xs mb-2">Exclusive Ownership</p>
  <p class="!text-[var(--pc-text)]">单一实体全权负责创建与销毁，<strong>不可复制</strong>，可显式转移。</p>
</div>

<div v-click class="pc-card info">
  <h3>共享所有权</h3>
  <p class="pc-muted text-xs mb-2">Shared Ownership</p>
  <p class="!text-[var(--pc-text)]">多个实体平等共同拥有，<strong>最后一个</strong>所有者销毁时释放。</p>
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
- 夺取独占所有权时，接口强制客户端**显式交出**
- 共享所有权时，接口**显式声明**
- 任何代码片段都能**仅凭类型签名**判断是否需要 `delete`

</v-clicks>

</div>

<div v-click="5">

<div class="pc-bad text-sm mb-1">❌ 糟糕设计：所有权完全成谜</div>

```cpp
// 看代码上下文猜谜语：我需要 delete w 吗？
std::Widget* w = MakeWidget();      // delete 还是 free？

std::Widget* w1 = Transmogrify(w);  // w 被销毁了？还是悬空了？
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
[click] 反过来看右侧这个糟糕设计：Widget* w = MakeWidget(); 它到底拥有还是不拥有？w1 = Transmogrify(w) 之后 w 还在不在？全靠猜。这就是类型系统失职。
-->

---
ppt: 3
---

# T* 不是过街老鼠：为原始指针正名

<div class="grid grid-cols-2 gap-6 mt-4">

<div>

<div class="pc-card info">
  <h3>Core Guideline R.3</h3>
  <p class="!text-[var(--pc-text)]">A raw pointer is <strong>non-owning</strong>.<br><span class="pc-muted text-sm">裸指针表示「我仅借用访问，绝不负责销毁」。</span></p>
</div>

<v-clicks>

- 现代 C++ 代码里，**绝大多数指针依然是 `T*`**
- 不能为空时，优先 `T&` 或 `gsl::not_null<T*>`
- 学习 C++11 后，代码里**不必**消灭所有 `*`

</v-clicks>

</div>

<div class="flex items-center">
<Callout type="bad" title="膝跳反射式劣质设计">
  把所有参数都改成 <code>std::shared_ptr</code>，<br>凭空强加共享所有权契约与原子计数开销。
</Callout>
</div>

</div>

<div class="pc-next">那「拥有」与「观察」如何一一对应？</div>

<!--
先给被误解最深的原始指针正名。
[click] Core Guideline R.3 明确写着：raw pointer is non-owning。它的职责就是清晰地表达「我只是借用访问，不负责销毁」。
[click] 所以在遵循良好所有权规范的现代 C++ 代码里，绝大多数指针依然是 T*。不能为空时就优先用 T& 或 gsl::not_null。
[click] 学员最常见的误区是「学了 C++11 后，代码里是不是一个 * 都不能出现了」——完全错。把所有参数都改成 shared_ptr，是典型的膝跳反射式劣质设计。
-->

---
ppt: 3
---

# 富指针与视图的对称矩阵

| 底层资源类型 | 独占所有权容器 (Owning) | 现代非所有权视图 (Non-owning View) |
| :--- | :--- | :--- |
| 单一堆对象 | `std::unique_ptr<T>` | `T*` 或 `T&` |
| 字符序列 | `std::string` | `std::string_view` |
| 连续内存数组 | `std::vector<T>` / `std::array` | `std::span<T>` / `std::span<const T>` |
| 任意容器序列 | `std::list<T>` 等 | `std::ranges::view` |

<div v-click class="mt-6">
<Callout type="info" title="富指针（Rich Pointer）">
  <code>std::string</code> / <code>std::vector&lt;T&gt;</code> 本质是<strong>带大小元数据的富独占指针</strong>；
  <code>string_view</code>（C++17）与 <code>span</code>（C++20）正是补齐了「指针 + 长度」的非所有权拼图。
</Callout>
</div>

<div class="pc-next">视图很轻，但滥用会制造反模式</div>

<!--
这张表是「拥有者 vs 非拥有视图」的完美映射。
[click] 注意「富指针」这个概念：std::string、std::vector 本质上就是带大小元数据的富独占指针。以前我们对 unique_ptr<char[]> 知道该传 char*，但到了 std::string 却习惯传引用，就是因为缺一个既包含指针又包含长度的非所有权类型。现在 string_view 和 span 补齐了这块拼图。
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
[click] 反面：Double 这个函数只是读一下、改一下内容，却要求传 shared_ptr，等于凭空强加了一份共享所有权契约，还搭上原子引用计数的开销。
[click] 正面：只借用就传引用或 span。接口意图清清楚楚，零计数开销，还能接收任意连续内存。
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
[click] 独占意味着不可复制，但可以显式转移；看右侧代码，拷贝 unique_ptr 直接编译失败。
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
  <p class="!text-[var(--pc-text)] !text-base mb-1"><code>rawptr</code> — 3.42 ns · 9.35 G/s</p>
  <p class="!text-[var(--pc-text)] !text-base"><code>unique_ptr</code> — 3.42 ns · 9.36 G/s</p>
  <p class="mt-2 pc-good">完全零开销</p>
</div>

<div v-click class="pc-card good">
  <h3>创建与销毁</h3>
  <p class="pc-muted text-xs mb-2">Construct & Destroy</p>
  <p class="!text-[var(--pc-text)] !text-base mb-1"><code>BM_rawptr</code> — 8.72 ns</p>
  <p class="!text-[var(--pc-text)] !text-base"><code>BM_uniqueptr</code> — 8.82 ns</p>
  <p class="mt-2 pc-good">处于测量误差范围内</p>
</div>

</div>

<div v-click="3" class="mt-6">
<Callout type="good" title="结论">
  编译器优化后，<code>unique_ptr</code> 生成的汇编与手写 <code>new/delete</code> <strong>毫秒不差</strong>。
</Callout>
</div>

<div class="pc-next">所有权如何在函数接口上显式流动？</div>

<!--
用实测数据打消老派 C 程序员对「智能指针拖慢性能」的顾虑。
[click] 解引用：rawptr 和 unique_ptr 都是 3.42 ns，吞吐 9.3 G/s 级，完全零开销。
[click] 创建与销毁：8.72 对 8.82 ns，处于测量误差范围内。
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

<div class="pc-card good mt-3">
  <h3>流入 · Sink</h3>
  <p>按值接收或 <code>Widget&&</code>，强制调用端写出 <code>std::move</code></p>
</div>

</div>
<div v-click>

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
[click] 流出：工厂函数返回 unique_ptr，语法层面就强制调用者接管所有权。
[click] 流入：接收 Widget&& 或按值接收，强制调用端写出 std::move。
[click] 重点看右侧：直接 Consume(w1) 会编译失败，必须写 std::move(w1)。std::move 不只是类型转换，它是代码审查时的高亮警示灯——告诉所有人「从这一行往下，w1 已经空了，别再碰它」。
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
[click] 比如多线程环境下并发链表的迭代器、图结构节点。
[click] 其他绝大多数场景，你该先问自己：真的没有人能当主拥有者吗？如果有一个，就用 unique_ptr。
-->

---
ppt: 5
---

# shared_ptr 的三重代价

<div class="grid grid-cols-2 gap-6 mt-2">

<div>

<v-clicks>

- **控制块（Control Block）**：对象内存 + 控制块内存，两次分配
- `std::make_shared` 可合并为**单次分配**
- **原子操作开销**：拷贝/析构须原子增减，触发缓存行同步

</v-clicks>

<div v-click="4" class="mt-4">

```cpp
std::shared_ptr<T> a(new T);   // 两块分离堆内存
auto b = std::make_shared<T>(); // 单块连续堆内存
```

</div>

</div>

<div v-click="5">

<div class="pc-tag mb-3">实测耗时 · 越低越好</div>

<div class="flex items-center gap-3 mb-2">
  <span class="pc-tag w-28">unique_ptr</span>
  <div class="flex-1 pc-card good" style="padding:0.25rem 0.5rem; border-left:none;"><span class="pc-muted text-xs">8.82 ns</span></div>
</div>

<div class="flex items-center gap-3 mb-2">
  <span class="pc-tag w-28">make_shared</span>
  <div class="flex-1 pc-card" style="padding:0.25rem 0.5rem; border-left:4px solid var(--pc-accent);"><span class="pc-muted text-xs">17.5 ns</span></div>
</div>

<div class="flex items-center gap-3">
  <span class="pc-tag w-28">shared_ptr</span>
  <div class="flex-1 pc-card" style="padding:0.25rem 0.5rem; border-left:4px solid var(--pc-bad);"><span class="pc-muted text-xs">22.9 ns</span></div>
</div>

<p class="mt-3 pc-bad">相较 unique_ptr 慢 2~2.6 倍</p>

</div>

</div>

<div class="pc-next">共享所有权还有一个隐蔽的陷阱</div>

<!--
[click] 控制块代价：直接 new 构造要分配对象内存 + 控制块内存（引用计数、弱计数、类型擦除的 deleter），两次分配；make_shared 能合并成一次。
[click] 原子操作开销：多线程下拷贝和析构必须做原子递增/递减，引发 CPU 缓存行同步。
[click] 看代码：一种是两块分离堆内存，一种是单块连续堆内存。
[click] 实测：unique_ptr 8.82、make_shared 17.5、shared_ptr 22.9 ns，慢 2 到 2.6 倍。
-->

---
ppt: 5
---

# 循环引用：引用计数永远归不了零

<div class="grid grid-cols-[1fr_1.2fr] gap-6 mt-2">

<div>

<div class="pc-card bad">
  <h3>致命死结</h3>
  <p>双向链表 / 父子节点互相持有 <code>shared_ptr</code>，计数永远不归零 → 内存泄漏。</p>
</div>

<div v-click="2" class="pc-card good mt-3">
  <h3>破解之道</h3>
  <p>把其中一个方向降级为 <strong><code>std::weak_ptr</code></strong>：对可能已销毁对象的安全探测指针。</p>
</div>

</div>

<div v-click="3">

```cpp
struct ListNode {
  std::shared_ptr<ListNode> next; // 拥有下一个
  std::weak_ptr<ListNode>  prev;  // 只观察上一个（破环）
};
```

<div v-click="4" class="mt-4">
<Callout type="bad" title="严厉警告">
  不要把 <code>shared_ptr</code> 当作懒于梳理生命周期的<strong>垃圾回收避风港</strong>！
</Callout>
</div>

</div>

</div>

<div class="pc-next">资源不只有内存，还有锁、文件、连接……</div>

<!--
[click] 循环引用是共享所有权的隐蔽陷阱：双向链表或父子节点互相持有 shared_ptr，引用计数永远无法归零，直接内存泄漏。
[click] 破解之道：把其中一个方向降级成 weak_ptr，它是一种对可能已销毁对象的安全探测指针。
[click] 看代码：next 用 shared_ptr 拥有，prev 用 weak_ptr 只观察，环就破了。
[click] 严厉警告：很多项目里满屏 shared_ptr，本质上是架构师根本没想清楚谁该负责销毁资源——别把它当成懒于梳理生命周期的 GC 避风港。
-->

---
ppt: 6
---

# RAII：C++ 皇冠上的明珠

<div class="grid grid-cols-2 gap-6 mt-4">

<div>

<div class="pc-card info">
  <h3>Resource Acquisition Is Initialization</h3>
  <p class="!text-[var(--pc-text)]">把（广义）资源的<strong>获取绑定在构造函数</strong>，<strong>释放绑定在析构函数</strong>——借用 C++ 唯一保证自动调用的机制。</p>
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
RAII 虽然名字起得极糟糕，其实应该叫 Destruction Is Resource Release，但它是 C++ 皇冠上的明珠。
[click] 核心思想：把广义资源——内存、mutex、文件句柄、Socket、数据库连接——的获取绑定在构造函数，释放绑定在析构函数。因为栈对象离开作用域时的析构函数，是 C++ 唯一保证自动调用的机制。
[click] 三大优势：封装性、异常安全性、局部性。
[click] 资源种类远不止内存。
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

<div class="pc-bad text-sm mb-1">❌ 直接原地修改</div>

```cpp
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

```cpp {2|3-4|5}
void transmogrify(const std::vector<C>& in,
                  std::vector<C>& out) {
    std::vector<C> tmp;          // 1. 准备副本（抛异常则 out 毫发无损）
    tmp.reserve(in.size());
    for (const auto& x : in)
        tmp.push_back(transform(x));
    out.swap(tmp);               // 2. noexcept 极速提交，旧数据随 tmp 析构
}
```

</div>
</div>

<div class="pc-next">还有更通用的声明式清理手法</div>

<!--
[click] 反面：直接原地修改 out，一旦中途抛异常，out 就处于半死不活的损坏状态。
[click] 正面 Copy-and-Swap：先在栈上的临时副本 tmp 里完成所有可能抛异常的修改。
[click] 若中途抛异常，out 毫发无损，风险全被 tmp 带走。
[click] 最后一行 out.swap(tmp) 是保证不抛异常的 noexcept 操作，完成原子级状态提交，旧数据随 tmp 自动析构。这就是事务思维：Commit-or-Rollback。
-->

---
ppt: 7
---

# 多步操作的清理之痛

<div class="grid grid-cols-2 gap-6 mt-4">

<div>

<div class="pc-card info">
  <h3>场景</h3>
  <p class="!text-[var(--pc-text)]">先写磁盘 <code>Storage::insert</code>，再更新内存索引 <code>Index::insert</code>，失败时需 <code>finalize</code> 或 <code>undo</code>。</p>
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
[click] 当一个操作包含多个跨组件步骤，比如先写磁盘 Storage::insert，再更新内存索引 Index::insert，而且需要 finalize 或 undo 时，问题就来了。
[click] 手写嵌套 try-catch 会破坏代码的可组合性，N 步操作的嵌套层次会膨胀。
[click] 而为每个一次性操作都手写一个专用 RAII 类又太繁琐。
[click] 传统痛点：清理和回滚逻辑散落在层层 catch 里，把「做什么」和「出错怎么善后」强行拆散。
-->

---
ppt: 7
---

# ScopeGuard 模式演进

<div class="grid grid-cols-2 gap-6 mt-2">

<div>

<div class="pc-card info">
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

<div class="pc-bad text-sm mb-1">❌ C++98 的残废接口</div>

```cpp
bool std::uncaught_exception(); // 返回 bool
```

<div class="pc-card bad mt-2">
  <p>析构期间本身已有 1 个异常在传播，即使内部完全成功，也返回 <code>true</code> → 误回滚。</p>
</div>

</div>
<div v-click>

<div class="pc-good text-sm mb-1">✅ C++17 的计数接口</div>

```cpp
int std::uncaught_exceptions(); // 返回 int 计数
```

<div v-click="3" class="mt-3">

```cpp
void Database::insert(const Record& r) {
    S.insert(r);
    ON_SCOPE_EXIT    { S.finalize(); }; // 无论成败，必执行清理
    ON_SCOPE_FAILURE { S.undo(); };     // 仅当栈展开新增异常，自动回滚
    I.insert(r);                        // 此处抛异常 → 逆序触发 undo → finalize
}
```

</div>

</div>
</div>

<div class="pc-next">清理自动化了，接口契约还缺一层保障</div>

<!--
[click] C++98 的 std::uncaught_exception() 返回 bool，是残废的。因为如果在一个析构函数执行期间——此时本身就有 1 个未捕获异常在传播——调用了 Database::insert，即使 insert 内部完全成功，旧接口也会返回 true，导致误回滚。
[click] C++17 的 uncaught_exceptions() 返回 int 计数：进入作用域时记录当前活跃异常数量，离开时对比差值，就能精准判断「是不是我这边新增了异常」。
[click] 看这段声明式代码：finalize 无论成败都执行，undo 仅在栈展开新增异常时回滚。把「做什么」和「善后」紧挨着写在一起，符合人脑直觉。
-->

---
ppt: 8
---

# 模板契约的缺失之痛

<div class="grid grid-cols-2 gap-6 mt-4">

<div>

<div class="pc-card info">
  <h3>普通模板</h3>
  <p class="!text-[var(--pc-text)]"><code>template &lt;typename T&gt;</code> 允许传入<strong>任何类型</strong>，不表达任何契约。</p>
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
[click] 普通模板 template <typename T> 允许传入任何类型，它不表达任何契约。
[click] 如果类型不满足函数体内使用到的操作，比如没有 operator+，错误会在模板实例化的最深处爆出来。
[click] 结果是天书般的编译错误，彻底违背「接口即契约」的原则。
[click] 问题本质：接口本该声明「我需要一个能做加法、可遍历的类型」，但 typename T 什么也没说。
-->

---
ppt: 8
---

# SFINAE：替换失败非错

<div class="grid grid-cols-2 gap-6 mt-2">

<div>

<div class="pc-card info">
  <h3>自然 SFINAE</h3>
  <p>利用类型自身属性，如 <code>typename T::value_type</code>。</p>
</div>

<div v-click="2" class="pc-card info mt-3">
  <h3>人为 SFINAE</h3>
  <p>用 <code>std::enable_if_t<..., bool> = true</code> 或尾置 <code>decltype(a + b)</code> 故意制造替换失败，从重载集剔除函数。</p>
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
[click] 局限：它只对函数模板的参数推导替换阶段生效；函数体内部的错误仍然是硬错误。而且对非模板成员函数，还得引入冗余的默认模板参数 template<typename U = T> 来绕弯。
[click] 所以 SFINAE 本质上是早期为了让重载正常工作的语言补丁，不该拿来炫技。
-->

---
ppt: 8
---

# Concepts：把模板约束变成一等公民

<div class="mt-2">

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
  无需任何 dummy 模板参数即可约束类模板的普通成员函数，<br>且编译器直接报告违反了<strong>哪一条语义契约</strong>。
</Callout>
</div>

<div class="pc-next">编译期的抽象还有另一条不靠继承的路</div>

<!--
[click] 看第一代 SFINAE 写法：enable_if 塞在模板参数里，晦涩难懂。
[click] 第二代 C++20 Concepts：先把约束定义成一个命名的 concept，比如 Range，然后直接用 template <Range R> 或 Range auto&& 约束。既清晰又自文档化。
[click] 核心跨越：不需要任何 dummy 模板参数，就能直接约束类模板的普通成员函数；而且编译器会直接告诉你违反了哪一条语义契约，而不是甩你一堆天书。
-->

---
ppt: 9
---

# 虚函数的代价：一次调用慢 5 倍

<div class="grid grid-cols-2 gap-6 mt-2">

<div>

<v-clicks>

- 虚调用需 `vptr → vtable → 函数指针` 两次解引用跳转
- 更致命：**阻碍编译器内联（Inlining）**
- 实测：虚调用 9.04 ns vs 普通调用 1.60 ns

</v-clicks>

</div>

<div v-click="4">

<div class="pc-tag mb-3">极简调用耗时</div>

<div class="flex items-center gap-3 mb-2">
  <span class="pc-tag w-28">BM_none</span>
  <div class="pc-card good" style="padding:0.2rem 0.5rem; width:18%; border-left:none;"><span class="text-xs">1.60</span></div>
</div>

<div class="flex items-center gap-3 mb-2">
  <span class="pc-tag w-28">BM_dynamic</span>
  <div class="pc-card bad" style="padding:0.2rem 0.5rem; width:100%; border-left:none;"><span class="text-xs">9.04</span></div>
</div>

<div class="flex items-center gap-3">
  <span class="pc-tag w-28">BM_static</span>
  <div class="pc-card good" style="padding:0.2rem 0.5rem; width:17%; border-left:none;"><span class="text-xs">1.55</span></div>
</div>

<p class="mt-3 pc-bad">虚函数比普通/内联调用慢 5~6 倍</p>

</div>

</div>

<div class="pc-next">能不能在编译期就确定调用哪个函数？</div>

<!--
[click] 虚函数调用要经过 vptr 到 vtable 再到函数指针两次解引用跳转。
[click] 更致命的是它阻碍编译器内联。
[click] Google Benchmark 实测：极简虚函数调用 9.04 ns，普通或内联调用只要 1.60 ns。
[click] 看图：BM_dynamic 的柱子是 BM_none 的五倍多，而 CRTP 静态版只有 1.55 ns，跟普通调用几乎一样，真正零开销。
-->

---
ppt: 9
---

# CRTP：让基类在编译期认识派生类

<div class="grid grid-cols-[1.1fr_1fr] gap-6 mt-2">

<div>

<div class="pc-card info">
  <h3>Curiously Recurring Template Pattern</h3>
  <p class="!text-[var(--pc-text)]">派生类 <code>D</code> 继承自以自身为模板实参的基类 <code>B&lt;D&gt;</code>，基类在<strong>编译期即获知</strong>派生类确切类型。</p>
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

<div class="pc-card bad mt-3">
  <h3>鸡生蛋悖论？</h3>
  <p>C++ 只在真正调用成员函数时才实例化函数体，那一刻 <code>D</code> 已是完整类型。</p>
</div>

</div>

</div>

<div class="pc-next">CRTP 写进工程，还要防几个坑</div>

<!--
[click] CRTP，奇特循环模板模式：派生类 D 继承自以自身为模板实参的基类 B&lt;D&gt;。
[click] 看这行 class D : public B&lt;D&gt;，看起来像鸡生蛋蛋生鸡的死循环。但 C++ 只在真正调用成员函数时才实例化函数体，而在那一刻 D 已经是完整类型了，所以能编译通过。
[click] 基类在编译期就拿到了派生类的确切类型，通过 static_cast&lt;D*&gt;(this) 直接向下转型调用，无需虚表，可以完全内联——这就是静态多态、零开销多态。
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
    ~DenseVector() = default;  // 非虚保护析构，遵守 C.35
public:
    Derived& derived() { return static_cast<Derived&>(*this); }
    decltype(auto) operator[](size_t i) { return derived()[i]; }
};
```

</div>
<div v-click>

<div class="pc-card info">
  <h3>工程细节三连</h3>
</div>

<v-clicks>

- **编译期纯虚函数**：基类 `f()` 转发到派生类 `f_impl()`，避免忘记重写引发无限递归
- **防呆保护**：私有构造 + `friend Derived`，阻止 `class D2 : public B<D1>` 写错模板参数
- **不完整类型限制**：基类声明中不能直接引用 `typename D::value_type`

</v-clicks>

</div>
</div>

<div class="pc-next">CRTP 还能不靠继承地「注入」功能</div>

<!--
[click] 这是标准的、安全的 CRTP 模板。看关键几行：构造函数私有，再声明 friend Derived——这是防呆，阻止同事复制粘贴时写错模板参数，比如 class Bad : public DenseVector&lt;Good&gt;。
[click] 编译期纯虚：基类公开的 f() 转发调用派生类的 f_impl()，避免忘记重写时引发无限递归死循环。
[click] 私有构造 + friend Derived 防呆。
[click] 不完整类型限制：基类实例化时派生类还没定义完，所以基类声明里不能直接用 typename D::value_type，要放到成员函数体内或用 decltype(auto) 推导返回类型。
-->

---
ppt: 10
---

# CRTP 的两种截然不同的角色

<div class="grid grid-cols-2 gap-6 mt-6">

<div v-click class="pc-card info">
  <h3>1 · 作为设计模式</h3>
  <p class="pc-muted text-xs mb-2">Design Pattern</p>
  <p class="!text-[var(--pc-text)]">引入静态类型分类抽象（如 <code>DenseVector&lt;Derived&gt;</code>），外部算法通过泛型接收基类引用实现静态多态。</p>
</div>

<div v-click="2" class="pc-card good">
  <h3>2 · 作为实现模式</h3>
  <p class="pc-muted text-xs mb-2">Implementation Pattern / Static Mixin</p>
  <p class="!text-[var(--pc-text)]">基类 <code>private</code> 继承，不提供多态抽象，仅向派生类<strong>非侵入式注入通用功能</strong>。</p>
</div>

</div>

<div v-click="3" class="mt-8">
<Callout type="info" title="Iglberger 的分类">
  同一个语法机制，意图不同、用法不同：一个是「是什么」，一个是「会什么」。
</Callout>
</div>

<div class="pc-next">如何优雅地为自定义类型补齐运算符？</div>

<!--
[click] 同一个 CRTP，有两种截然不同的角色。第一种，作为设计模式：引入静态类型分类抽象，比如 DenseVector&lt;Derived&gt;，外部泛型算法接收基类引用，实现静态多态。
[click] 第二种，作为实现模式，也叫 Static Mixin：基类用 private 继承，不提供任何多态抽象，只是向派生类非侵入式地注入通用功能。这是两种不同意图、不同用法。
-->

---
ppt: 10
---

# Friend Factory（Barton-Nackman Trick）

<div class="grid grid-cols-2 gap-6 mt-2">

<div>

<div class="pc-card info">
  <h3>为什么二元运算符不能是成员函数？</h3>
  <p>成员函数不支持左操作数的隐式类型转换。</p>
</div>

<div v-click="2" class="pc-card good mt-3">
  <h3>Hidden Friend</h3>
  <p>在 CRTP 基类内用 <code>friend</code> <strong>内联定义</strong>非模板自由函数，仅通过 ADL 可见。</p>
</div>

</div>

<div v-click="3">

```cpp
template <typename Derived>
struct Addable {
    friend Derived operator+(Derived const& lhs,
                             Derived const& rhs) {
        return Derived{ lhs.get() + rhs.get() }; // Hidden Friend
    }
};
```

</div>

</div>

<div class="pc-next">把能力做成可插拔的积木</div>

<!--
[click] 为什么二元运算符和流输出不能用成员函数？因为成员函数不支持左操作数的隐式类型转换。
[click] 解法是 Friend Factory，也叫 Barton-Nackman Trick：在 CRTP 基类内部用 friend 内联定义一个非模板自由函数。
[click] 看代码：每当 CRTP 基类模板实例化一次，就会自动在外部作用域制造出一个支持隐式转换的普通非模板友元函数，而且只通过 ADL 查找可见。
-->

---
ppt: 10
---

# StrongType：一行代码组装能力

<div class="grid grid-cols-[1fr_1fr] gap-6 mt-2">

<div>

<v-clicks>

- 用 `long` 表示「米」和「千米」→ **单位混加**灾难
- 封装成类后重写全套运算符 → 累死人
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
<Callout type="good" title="CRTP + Hidden Friend 的神仙组合">
  零成本代码复用 + 缩小重载集加快编译 + 完美支持隐式转换。
</Callout>
</div>

<div class="pc-next">说起重载，C++ 还有第三大抽象机制</div>

<!--
[click] 演示痛点：用 long 表示「米」和「千米」，极易发生单位混加的灾难，比如火星气候探测器就因此坠毁。
[click] 封装成类后，重写全套运算符又会累死人。
[click] 用变参模板模板参数 template<typename> class... Skills，把能力做成可插拔积木。
[click] 看代码：Meter 组装了 Addable 和 Printable 两个技能；Surname 只组装 Printable，所以姓氏不可相加。CRTP + Hidden Friend 不仅零成本复用，还因内联 friend 天然缩小重载集、加快编译，并支持隐式类型转换。
-->

---
ppt: 11
---

# 自由函数：第三大抽象机制

<div class="grid grid-cols-2 gap-6 mt-4">

<div>

<v-clicks>

- C++ 的三大抽象机制：**继承**、**Concepts**、**函数重载集**
- 成员函数是**侵入式**的：无法给 `int`、C 数组加成员
- 自由函数遵循**开闭原则（OCP）**，无需改原类即可扩展

</v-clicks>

</div>

<div v-click="4">

<div class="pc-card info">
  <h3>非侵入式扩展（Non-intrusive Extension）</h3>
  <p class="!text-[var(--pc-text)]"><code>std::begin(arr)</code>、自定义 <code>swap(a, b)</code>——在任意命名空间为新类型注入行为。</p>
</div>

</div>

</div>

<div v-click="5" class="mt-8">
<Callout type="bad" title="封装性反直觉">
  类里成员函数越多，能直接读写 <code>private</code> 的代码就越多，<strong>封装性反而越差</strong>。
</Callout>
</div>

<div class="pc-next">自由函数怎么找到「正确的那个」重载？</div>

<!--
[click] 除了继承基类和 Concepts，C++ 的第三大抽象机制是函数重载集。
[click] 成员函数是侵入式的：你没法给 int、C 数组或第三方闭源类添加成员函数。
[click] 自由函数遵循开闭原则，不改原类定义就能扩展新行为。
[click] 这就是非侵入式扩展的威力，比如 std::begin、自定义 swap。
[click] 挑战传统 OOP 观念：很多程序员觉得把所有函数塞进 class 才叫封装。恰恰相反——类里成员函数越多，能直接读写 private 的代码就越多，封装性反而越差。对比臃肿的 std::string 和极其克制的 std::vector + algorithm。
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
// 左：原生数组直接编译报错
// int a[6]; a.begin();   // ❌

// 右：ADL 畅通无阻
using std::begin;
begin(range);            // ✅ 自动找到最佳匹配
```

</div>

</div>

<div v-click="5" class="mt-6">
<Callout type="bad" title="重载集的语义约束（LSP）">
  Core Guideline C.162/C.163：仅对<strong>语义等价</strong>的操作进行重载——加入重载集就像继承基类，必须履行契约。
</Callout>
</div>

<div class="pc-next">最后，用一句金律收束这一章</div>

<!--
[click] 两步法：先 using std::swap，再 swap(a, b)。
[click] 编译器会自动在实参所属的命名空间里查找最匹配的自定义函数。
[click] 自定义的 swap、begin 就是所谓的 Shim 或函数适配器。
[click] 看对比：左图对原生数组调用 a.begin() 直接编译报错；右图用 using std::begin 配合 ADL 畅通无阻。
[click] 但要记住重载集的语义约束：Core Guideline C.162/C.163 要求只对语义等价的操作重载。加入重载集就像继承基类，必须履约——写一个只交换一半成员的 swap，或者把启动线程的函数叫 begin，会摧毁泛型代码的信任基石。
-->

---
ppt: 11
---

# 优先非成员非友元函数

<div class="grid grid-cols-[1.3fr_1fr] gap-8 mt-6">

<div>

<div class="pc-card info">
  <h3>Scott Meyers · Effective C++ Item 23</h3>
  <p>自由函数组成的重载集是可扩展的抽象点，也是非侵入式设计的基础。</p>
</div>

<div v-click="2" class="mt-4">
<div class="pc-tags">
  <span class="pc-tag">std::begin</span><span class="pc-tag">swap</span><span class="pc-tag">operator&lt;&lt;</span><span class="pc-tag">std::hash</span>
</div>
</div>

</div>

<div class="flex items-center">
<Quote v-click="3" author="Scott Meyers" zh="优先使用非成员非友元函数，替换成员函数。">
  Prefer non-member non-friend functions to member functions.
</Quote>
</div>

</div>

<div class="pc-next">把这一课的武器串成一条链路</div>

<!--
[click] Scott Meyers 在 Effective C++ Item 23 给出的金律：优先使用非成员非友元函数替换成员函数。
[click] 这些自由函数点——std::begin、swap、operator&lt;&lt;、std::hash——就是非侵入式设计的扩展点。
[click] 记住这句话：自由函数的重载集是一把双刃剑，既然它是抽象，就必须遵守里氏替换原则。
-->

---
ppt: 12
---

# 第 1 课知识链路复盘

<div class="pc-chain mt-8 text-base">
  <div v-click class="pc-card info">所有权显式化<br><span class="pc-muted text-xs">unique_ptr / shared_ptr / T* / span</span></div>
  <span v-click="2" class="pc-arrow">→</span>
  <div v-click="2" class="pc-card good">生命周期自动化<br><span class="pc-muted text-xs">RAII / Copy-and-Swap / ScopeGuard</span></div>
  <span v-click="3" class="pc-arrow">→</span>
  <div v-click="3" class="pc-card info">编译期零开销抽象<br><span class="pc-muted text-xs">Concepts / CRTP / 自由函数重载集</span></div>
</div>

<div v-click="4" class="mt-10">
<Callout type="good" title="本课主线">
  用现代语言机制，写出<strong>安全、高效、零泄漏</strong>的局部代码；把尽可能多的工作交给编译器。
</Callout>
</div>

<div class="pc-next">落到你自己的代码库，先自检三件事</div>

<!--
[click] 第 1 课我们打通了 Modern C++ 的任督二脉，核心是一条链路。
[click] 第一段：所有权显式化——unique_ptr、shared_ptr、T*、span，把「谁拥有」写进类型。
[click] 第二段：生命周期自动化——RAII、Copy-and-Swap、ScopeGuard，让栈展开替我们善后。
[click] 第三段：编译期零开销抽象——Concepts、CRTP、自由函数重载集，把运行期开销挪到编译期。
[click] 主线：用现代语言机制写出安全、高效、零泄漏的局部代码。
-->

---
ppt: 12
---

# 代码库自检清单

<div class="grid grid-cols-3 gap-4 mt-10">

<div v-click class="pc-card bad">
  <h3>1 · 所有权</h3>
  <p>还有裸 <code>delete</code> 吗？<br>普通计算函数里是否传了 <code>const std::shared_ptr&lt;T&gt;&</code>？</p>
</div>

<div v-click="2" class="pc-card bad">
  <h3>2 · 异常安全</h3>
  <p>多步事务操作是否存在异常导致的状态不一致风险？</p>
</div>

<div v-click="3" class="pc-card bad">
  <h3>3 · 可测试性</h3>
  <p>本该提取为自由函数的 <code>private</code> 辅助逻辑，是否被锁死在类里无法单测？</p>
</div>

</div>

<div v-click="4" class="mt-8">
<Callout type="info" title="可用工具">
  <code>clang-tidy</code> 的 <code>cppcoreguidelines-owning-memory</code> 与 <code>modernize-*</code> 检查项，可以把一部分自检自动化。
</Callout>
</div>

<div class="pc-next">把今天的武器用到实战作业里</div>

<!--
[click] 第 1 个自检点：所有权。项目里还有裸 delete 吗？普通计算函数里是不是传了 const shared_ptr&lt;T&gt;&？
[click] 第 2 个自检点：异常安全。多步事务操作有没有异常导致状态不一致的风险？
[click] 第 3 个自检点：可测试性。本该提取为自由函数的 private 辅助逻辑，是不是被锁死在类内部，无法单测？
[click] 可以借助 clang-tidy 的 cppcoreguidelines 和 modernize 检查项把一部分自检自动化。
-->

---
ppt: 12
---

# 课后实战作业

<div class="grid grid-cols-[1.1fr_1fr] gap-6 mt-4">

<div>

<div class="pc-card info">
  <h3>任务</h3>
  <p class="!text-[var(--pc-text)]">基于 C++17 <code>std::uncaught_exceptions()</code>，手写一个<strong>零堆内存分配、不可拷贝</strong>的泛型 <code>ScopeGuard</code>，支持 <code>ON_SCOPE_EXIT</code> 与 <code>ON_SCOPE_FAILURE</code>。</p>
</div>

<v-clicks>

- 验证场景一：**正常返回**不触发 failure
- 验证场景二：**异常抛出**触发回滚
- 验证场景三：**析构函数内嵌套调用**仍精准

</v-clicks>

</div>

<div v-click="4">

```cpp
TEST(ScopeGuardTest, NestedException) {
    object_counter counter;          // 资源计数桩
    ComplexOperation op;             // 嵌套异常模拟类
    EXPECT_THROW(op.run(), std::runtime_error);
    EXPECT_EQ(counter.count(), 0);   // 资源已全部释放
}
```

</div>

</div>

<div v-click="5" class="mt-6">
<Callout type="good" title="下节预告 · 第 2 课">
  局部代码写得再漂亮，模块之间耦合成一团乱麻，系统照样腐化。<br>
  下一课正式迈入《软件设计》：用今天的武器重构 <strong>SOLID 原则与经典 GoF 设计模式</strong>。
</Callout>
</div>

<!--
[click] 课后实战作业：基于 C++17 的 std::uncaught_exceptions，手写一个零堆内存分配、不可拷贝的泛型 ScopeGuard，支持 ON_SCOPE_EXIT 和 ON_SCOPE_FAILURE。
[click] 要求覆盖三种场景：正常返回不触发 failure；异常抛出触发回滚；以及最容易写错的——析构函数内嵌套调用时仍要精准。
[click] 右侧给出 Google Test 测试用例模板，含 object_counter 资源计数桩与 ComplexOperation 嵌套异常模拟类。
[click] 下节预告：第 1 课我们打通了局部代码的安全与性能。但局部代码写得再漂亮，如果模块之间耦合得像一团乱麻，系统照样会腐化。下一课，我们正式迈入软件设计的大门，用今天学到的武器去彻底重构 SOLID 原则与经典的 GoF 设计模式！
-->
