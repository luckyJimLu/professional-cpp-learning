---
theme: default
title: Professional C++ —— SOLID 设计原则与经典 GoF 设计模式 Modern C++ 重构
lesson: 第 2 课 · SOLID 与 GoF 的 Modern C++ 重构
lang: zh-CN
colorSchema: dark
aspectRatio: 16/9
canvasWidth: 980
transition: fade
highlighter: shiki
lineNumbers: false
drawings:
  persist: false
fonts:
  sans: Noto Sans CJK SC
  mono: Noto Sans Mono CJK SC
  provider: none
mdc: true
layout: cover
ppt: 1
---

<div class="pc-kicker">Professional C++ · 第 2 课 · 上节回顾：语言机制与资源管理</div>

# SOLID 与 GoF 的 Modern C++ 重构

<div class="pc-subtitle">以可维护性与解耦为中心，Design for Change vs YAGNI</div>

<div class="pc-tags mt-10"><span class="pc-tag">SOLID</span><span class="pc-tag">Modern C++</span><span class="pc-tag">Maintainability</span></div>

<!--
* 开场破除误区：很多C++程序员觉得“SOLID 是给 Java 这种纯 OOP 语言用的，我们写模板和泛型不需要”。大错特错！在 Modern C++ 中，SOLID 不仅适用于继承体系，更深刻地指导着模板、Concepts 和自由函数的设计。
  * 强调辩证思维：提前抽象是一场赌博。如果你明确知道系统接下来要支持多种渲染引擎，请立刻应用 SOLID 留好扩展点；如果完全不知道未来怎么变，保持简单（KISS），等第一次变更需求来临时再果断重构。
-->

---
ppt: 1
---

# SOLID 是面向变化的架构罗盘

<div class="pc-svg-hero">
<svg viewBox="0 0 900 300" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="SOLID 架构罗盘：拆解耦合、塑造依赖方向、保障抽象契约可靠性">
<circle cx="450" cy="150" r="92" fill="var(--pc-surface)" stroke="var(--pc-accent)" stroke-width="2"/>
<text x="450" y="142" text-anchor="middle" fill="var(--pc-text)" font-size="22" style="font-size: 22px">可维护性 · 解耦</text>
<text x="450" y="174" text-anchor="middle" fill="var(--pc-muted)" font-size="14" style="font-size: 14px">Maintainability · Decoupling</text>
<g v-click="1" fill="var(--pc-accent)">
<path d="M 100 80 H 320 V 120 H 356 M 100 220 H 320 V 180 H 356" fill="none" stroke="var(--pc-accent)" stroke-width="2"/>
<text x="40" y="50" font-size="19" style="font-size: 19px">S · SRP 单一职责</text><text x="40" y="246" font-size="19" style="font-size: 19px">I · ISP 接口隔离</text><text x="40" y="148" font-size="15" style="font-size: 15px">拆解耦合</text>
</g>
<g v-click="2" fill="var(--pc-good)">
<path d="M 544 120 H 580 V 80 H 840 M 544 180 H 580 V 220 H 840" fill="none" stroke="var(--pc-good)" stroke-width="2"/>
<text x="616" y="50" font-size="19" style="font-size: 19px">O · OCP 开闭原则</text><text x="616" y="246" font-size="19" style="font-size: 19px">D · DIP 依赖倒置</text><text x="664" y="148" font-size="15" style="font-size: 15px">塑造依赖方向</text>
</g>
<g v-click="3" fill="var(--pc-text)"><text x="450" y="24" text-anchor="middle" font-size="19" style="font-size: 19px">L · LSP 里氏替换</text><text x="450" y="286" text-anchor="middle" font-size="15" style="font-size: 15px">保障抽象契约可靠性</text></g>
</svg>
</div>

<div class="pc-next">五大原则共同降低修改成本</div>

<!--
对应大纲 PPT 1：呈现方式：SOLID 架构罗盘图。
[click] SRP 与 ISP 拆解耦合，分别面对变化原因与客户端需要。
[click] OCP 与 DIP 塑造依赖方向：对扩展开放，让底层依赖高层抽象。
[click] LSP 保障抽象契约可靠性。
-->

---
ppt: 1
---

# 五大原则共同降低修改成本

| 原则 | 契约 |
| :--- | :--- |
| SRP | 一个实体只有一个引起它变化的原因 |
| OCP | 对扩展开放，对修改关闭 |
| LSP | 遵守基类／概念／重载集的预期行为契约 |
| ISP | 拒绝不使用的方法或模板约束 |
| DIP | 高层策略拥有抽象接口；底层依赖高层抽象 |

<div class="pc-next">使用 SOLID 达成可维护性</div>

<!--
对应大纲 PPT 1：重点内容：SOLID 五大原则在 Modern C++ 中的全景定位。
-->

---
ppt: 1
---

# 使用 SOLID 达成可维护性

<div class="pc-tags mb-3"><span class="pc-tag">Rigidity · 僵化</span><span class="pc-tag">Fragility · 脆弱</span><span class="pc-tag">YAGNI</span></div>

<Quote author="Katerina Trajchevska" zh="不要试图达成 SOLID，而要用 SOLID 达成可维护性。">Don't try to achieve SOLID, use SOLID to achieve maintainability.</Quote>

<div v-click class="mt-6">

<Callout type="info" title="Design for Change vs YAGNI">

变化方向尚不清楚，盲目过度抽象反而阻碍真正的变化。

</Callout>

</div>

<div class="pc-next">SRP 聚焦变化的原因</div>

<!--
对应大纲 PPT 1：重点内容：核心哲学与 Katerina Trajchevska 原话。
[click] 变化方向尚不清楚时，盲目过度抽象反而阻碍真正的变化；回到 YAGNI。
-->

---
ppt: 2
---

# SRP 聚焦变化的原因

<Quote author="SRP 定义（大纲）" zh="一个类应该只有一个引起它变化的原因。">A class should have only one reason to change.</Quote>

<div class="grid grid-cols-2 gap-4 mt-4">
<div class="pc-card info"><h3>Journal</h3><p class="pc-card-lead">add() 管理日记条目<br>save(filename) 写盘；本地文件变云存储将迫使业务类修改</p></div>
<div class="pc-card info"><h3>Document</h3><p class="pc-card-lead">exportToJSON()<br>serialize(ByteStream&amp;)</p></div>
</div>
<div class="pc-tags mt-4"><span class="pc-tag">Variation Points</span><span class="pc-tag">Cohesion · 高内聚</span></div>

<div class="pc-next">导出职责单向依赖纯净的 Document</div>

<!--
* 重点拆解 `Document` 反例：为什么往基类里塞 `exportToJSON()` 看起来很“面向对象”，实际上却是架构毒药？因为它把“文档领域模型”和“特定数据格式导出”这两个变化频率完全不同（正交）的维度焊死在了一起。
  * 呼应第 1 课的可测试性法则：当你发现一个类的 `private` 函数复杂到你想用 `#define private public` 去写单元测试时，这就是代码在向你发出强烈的求救信号——**你违反了 SRP，赶紧把它拆出去！**
-->

---
ppt: 2
---

# 导出职责单向依赖纯净的 Document

<div class="pc-svg-hero">
<svg viewBox="0 0 900 300" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="srp-title srp-desc">
<title id="srp-title">SRP 依赖方向 Before / After</title>
<desc id="srp-desc">箭头从依赖方指向被依赖方；空心三角表示继承或实现。</desc>
<defs><marker id="srp-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M 0 0 L 10 5 L 0 10" fill="none" stroke="var(--pc-accent)" stroke-width="1.5"/></marker><marker id="srp-inherit" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="10" markerHeight="10" orient="auto"><path d="M 0 0 L 10 5 L 0 10 Z" fill="var(--pc-bg)" stroke="var(--pc-accent)" stroke-width="1.5"/></marker></defs>
<path d="M 196 108 H 232" fill="none" stroke="var(--pc-accent)" stroke-width="2" stroke-dasharray="5 4" marker-end="url(#srp-arrow)"/>
<path d="M 328 140 V 212" fill="none" stroke="var(--pc-accent)" stroke-width="2" stroke-dasharray="5 4" marker-end="url(#srp-arrow)"/>
<path d="M 660 108 H 704" fill="none" stroke="var(--pc-accent)" stroke-width="2" stroke-dasharray="5 4" marker-end="url(#srp-arrow)"/>
<path d="M 792 212 V 140" fill="none" stroke="var(--pc-accent)" stroke-width="2" stroke-dasharray="5 4" marker-end="url(#srp-arrow)"/>
<rect x="24" y="76" width="172" height="64" rx="6" fill="var(--pc-surface)" stroke="var(--pc-accent)" stroke-width="1.5"/>
<text x="110.0" y="102" text-anchor="middle" fill="var(--pc-text)" font-size="17" style="font-size: 17px">User</text>
<text x="110.0" y="125" text-anchor="middle" fill="var(--pc-muted)" font-size="13" style="font-size: 13px">使用 Document</text>
<rect x="232" y="76" width="192" height="64" rx="6" fill="var(--pc-surface)" stroke="var(--pc-accent)" stroke-width="1.5"/>
<text x="328.0" y="102" text-anchor="middle" fill="var(--pc-text)" font-size="17" style="font-size: 17px">Document</text>
<text x="328.0" y="125" text-anchor="middle" fill="var(--pc-muted)" font-size="13" style="font-size: 13px">exportToJSON / serialize</text>
<rect x="232" y="212" width="192" height="64" rx="6" fill="var(--pc-surface)" stroke="var(--pc-accent)" stroke-width="1.5"/>
<text x="328.0" y="238" text-anchor="middle" fill="var(--pc-text)" font-size="17" style="font-size: 17px">JSON Library</text>
<text x="328.0" y="261" text-anchor="middle" fill="var(--pc-muted)" font-size="13" style="font-size: 13px">ByteStream</text>
<rect x="488" y="76" width="172" height="64" rx="6" fill="var(--pc-surface)" stroke="var(--pc-accent)" stroke-width="1.5"/>
<text x="574.0" y="102" text-anchor="middle" fill="var(--pc-text)" font-size="17" style="font-size: 17px">User</text>
<text x="574.0" y="125" text-anchor="middle" fill="var(--pc-muted)" font-size="13" style="font-size: 13px">使用 Document</text>
<rect x="704" y="76" width="172" height="64" rx="6" fill="var(--pc-surface)" stroke="var(--pc-accent)" stroke-width="1.5"/>
<text x="790.0" y="102" text-anchor="middle" fill="var(--pc-text)" font-size="17" style="font-size: 17px">Document</text>
<text x="790.0" y="125" text-anchor="middle" fill="var(--pc-muted)" font-size="13" style="font-size: 13px">纯净领域模型</text>
<rect x="704" y="212" width="172" height="64" rx="6" fill="var(--pc-surface)" stroke="var(--pc-accent)" stroke-width="1.5"/>
<text x="790.0" y="238" text-anchor="middle" fill="var(--pc-text)" font-size="17" style="font-size: 17px">JSON / Serialization</text>
<text x="790.0" y="261" text-anchor="middle" fill="var(--pc-muted)" font-size="13" style="font-size: 13px">PersistenceManager</text>
<text x="24" y="28" fill="var(--pc-muted)" font-size="15" style="font-size: 15px">Before · 传递性物理耦合</text>
<text x="488" y="28" fill="var(--pc-muted)" font-size="15" style="font-size: 15px">After · 导出组件依赖领域模型</text>
</svg>
</div>

<div class="pc-next">正交职责捆绑产生三大恶果</div>

<!--
对应大纲 PPT 2：呈现方式：Before / After 依赖对比图。
-->

---
ppt: 2
---

# 正交职责捆绑产生三大恶果

<v-clicks>

- User 传递性依赖 JSON 库与 ByteStream
- PDF、Word 被迫耦合同一套第三方库
- Widget::updateCollection 难以独立黑盒单测

</v-clicks>

<Callout type="info" title="关注点分离">

提取独立组件或非成员自由函数。

</Callout>

<div class="pc-next">新增过滤条件，不修改已测试的类</div>

<!--
对应大纲 PPT 2：重点内容：传递性物理耦合、实现强绑定、破坏可测试性。
[click] User 仅使用 Document 基础功能，却被迫依赖 JSON 库与 ByteStream。
[click] PDF 与 Word 的实现也被绑定到同一套第三方库。
[click] 把 Widget::updateCollection 提取为独立组件或非成员自由函数，才能独立黑盒测试。
-->

---
ppt: 3
---

# 新增过滤条件，不修改已测试的类

<div class="pc-chain mt-6"><div class="pc-card info">by_color()</div><span class="pc-arrow">→</span><div class="pc-card info">by_size()</div><span class="pc-arrow">→</span><div class="pc-card info">by_color_and_size()</div></div>

<div v-click class="mt-8">

<Callout type="info" title="OCP">

对扩展开放（Open for extension），对修改关闭（Closed for modification）。

</Callout>

</div>

<div class="pc-next">Specification 分离判定与过滤</div>

<!--
* 描述业务开发中最真实的噩梦：一个跑了三年、极其稳定的核心模块，因为要加一个新商品属性过滤，你不得不打开它的 `.cpp` 文件往 `if-else` 里加代码，手都在抖，生怕把老逻辑改崩。
  * 指出 SRP 与 OCP 的因果关系：**关注点分离（SRP）是实现开闭原则（OCP）的前提**。把容易变化的地方（过滤条件、序列化格式）抽离成独立的扩展点（Customization Point），老代码才能真正做到“关门谢客（Closed for modification）”。
[click] 对扩展开放，对修改关闭；把反复修改的过滤条件抽成扩展点。
-->

---
ppt: 3
---

# Specification 分离判定与过滤

<div class="grid grid-cols-2 gap-4 [&_pre]:whitespace-pre-wrap [&_code]:!whitespace-pre-wrap [&_code]:!break-all">
<div>

### 修改 ProductFilter

```cpp
by_color();
by_size();
by_color_and_size();
```

<div class="pc-muted text-sm">演进示意：不是完整可编译接口</div>

</div>
<div v-click>

### 新增、组合 Specification

```cpp
// ✅ 遵循 OCP 的 Specification 模式 + C++ 运算符重载组合
template <typename T> struct Specification {
    virtual bool is_satisfied(T* item) const = 0;
};
auto spec = ColorSpecification(Color::Green) && SizeSpecification(Size::Large);
auto results = BetterFilter{}.filter(all_products, spec);
```

</div>
</div>

<div class="pc-tags mt-4"><span class="pc-tag">Specification&lt;T&gt;</span><span class="pc-tag">Filter&lt;T&gt;</span><span class="pc-tag">AndSpecification&lt;T&gt;</span></div>

<div class="pc-next">编译期扩展同样遵守 OCP</div>

<!--
对应大纲 PPT 3：呈现方式：原始 Specification 代码；重点内容：operator&& 与 SRP。
大纲为接口片段，省略具体 Specification 与 Filter 的定义。实现组合规范时必须审查子规范的生命周期：若组合只保存引用，不能在临时子规范销毁后继续使用 spec；可选择按值保存子规范。原代码按大纲保留。
[click] 右栏新增 Specification 判定谓词，使用 operator&& 组合；保留原始 BetterFilter 调用。
-->

---
ppt: 3
---

# 编译期扩展同样遵守 OCP

<div class="grid grid-cols-2 gap-4 mt-4">
<div class="pc-card info"><h3>自由函数重载</h3><p class="pc-card-lead">自定义 swap：不触碰原库源码</p></div>
<div class="pc-card info"><h3>类模板特化</h3><p class="pc-card-lead">std::hash&lt;CustomType&gt;：注入新类型行为</p></div>
</div>
<Callout type="info" title="Customization Point">

关注点分离（SRP）是实现开闭原则（OCP）的前提。

</Callout>

<div class="pc-next">继承必须保持行为契约</div>

<!--
对应大纲 PPT 3：重点内容：Modern C++ 编译期非侵入式 OCP。
-->

---
ppt: 4
---

# 继承必须保持行为契约

<Callout type="info" title="Behavioral Subtyping · Barbara Liskov & Jeannette Wing">

用任何子类 S 替换超类 T，程序行为必须保持正确且符合预期。

</Callout>

<div class="grid grid-cols-2 gap-4 mt-4">
<div class="pc-card info"><h3>Rectangle 契约</h3><p class="pc-card-lead">setHeight() 不改变 getWidth()</p></div>
<div class="pc-card info"><h3>Square 不变式</h3><p class="pc-card-lead">四边相等：setHeight() 连带修改 width</p></div>
</div>

<div class="pc-next">Square 破坏 transform 的断言</div>

<!--
* 借用这个例子彻底打破新手对继承的迷信：**面向对象中的 `public` 继承代表的绝不是现实世界生物学或几何学的分类（IS-A），而是“行为契约的兼容性（IS-SUBSTITUTABLE-FOR）”！**（同理，如果 `Bird` 基类有 `fly()`，那么企鹅 `Penguin` 在 C++ 里就绝不是 `Bird`）。
  * 提醒学员：如果在业务代码里看到有人写 `if (dynamic_cast<SpecialDerived*>(&base))` 来做特殊分支处理，这百分百是架构中出现了违反 LSP 的坏味道。
-->

---
ppt: 4
---

# Square 破坏 transform 的断言

```cpp
void transform(Rectangle& r) {
    r.setWidth(7);
    r.setHeight(4);
    assert(r.getArea() == 28); // 💥 当传入 Square 时，面积变成了 16，断言直接崩溃！
}
```

<div class="pc-next">LSP 约束行为，也约束 Concepts</div>

<!--
对应大纲 PPT 4：呈现方式：案发现场 transform(Rectangle&) 原代码。
-->

---
ppt: 4
---

# LSP 约束行为，也约束 Concepts

| 契约法则 | 约束 |
| :--- | :--- |
| Preconditions | 不能强化：i > 0 不能变成 i > 10 |
| Postconditions | 不能弱化：保证 > 0 不能返回负数 |
| Invariants | 子类保持基类不变式 |
| Covariant / Contravariant | 返回值协变；参数逆变（C++ 未直接支持） |

<div class="pc-tags mt-4"><span class="pc-tag">Concepts：前向迭代器多遍遍历保证</span><span class="pc-tag">swap：交换全部可观测状态</span></div>

<div class="pc-next">接口由客户端需要决定</div>

<!--
对应大纲 PPT 4：重点内容：大纲实际列出的四项形式化法则与泛型扩展。
大纲标题称“五大”，实际列出四项，最后一项同时包含协变与逆变。未补造第五项。C++ 的协变返回仅适用于特定的虚函数指针／引用返回类型，不能解读为任意类型都支持协变。
-->

---
ppt: 5
---

# 接口由客户端需要决定

<Callout type="info" title="ISP">

Clients should not be forced to depend on methods that they do not use.

</Callout>

| 胖接口 | 隔离后的依赖 |
| :--- | :--- |
| IMachine：print / scan / fax | IPrinter、IScanner；多重继承组合 |
| Document：JSON 与序列化 | JSONExportable、Serializable |
| exportDoc(JSONExportable const&) | 不再依赖 ByteStream 头文件 |

<div class="pc-next">拆分胖接口，组合最小能力</div>

<!--
* 指出 ISP 与 SRP 的关系：如果说 SRP 是从“组件实现者”的角度要求高内聚，那么 **ISP 就是从“接口调用者（Client）”的角度要求最小化耦合**。
  * 举个工程实践中的痛点：当你给某个大型系统写插件，继承它的 `IPlugin` 接口时，发现里面有 25 个纯虚函数，其中 20 个你根本用不上，只能苦哈哈地写满 `{ return nullptr; }` 空实现——这就是原作者严重违反 ISP 留下的技术债。
-->

---
ppt: 5
---

# 拆分胖接口，组合最小能力

<div class="pc-svg-hero">
<svg viewBox="0 0 900 300" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="isp-title isp-desc">
<title id="isp-title">胖接口拆分与客户端依赖</title>
<desc id="isp-desc">箭头从依赖方指向被依赖方；空心三角表示继承或实现。</desc>
<defs><marker id="isp-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M 0 0 L 10 5 L 0 10" fill="none" stroke="var(--pc-accent)" stroke-width="1.5"/></marker><marker id="isp-inherit" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="10" markerHeight="10" orient="auto"><path d="M 0 0 L 10 5 L 0 10 Z" fill="var(--pc-bg)" stroke="var(--pc-accent)" stroke-width="1.5"/></marker></defs>
<path d="M 216 96 H 248 Q 256 96 256 88 V 68 Q 256 60 264 60 H 304" fill="none" stroke="var(--pc-accent)" stroke-width="2" stroke-dasharray="5 4" marker-end="url(#isp-arrow)"/>
<path d="M 216 120 H 248 Q 256 120 256 128 V 176 Q 256 184 264 184 H 304" fill="none" stroke="var(--pc-accent)" stroke-width="2" stroke-dasharray="5 4" marker-end="url(#isp-arrow)"/>
<rect x="24" y="76" width="192" height="64" rx="6" fill="var(--pc-surface)" stroke="var(--pc-accent)" stroke-width="1.5"/>
<text x="120.0" y="102" text-anchor="middle" fill="var(--pc-text)" font-size="17" style="font-size: 17px">IMachine</text>
<text x="120.0" y="125" text-anchor="middle" fill="var(--pc-muted)" font-size="13" style="font-size: 13px">print / scan / fax</text>
<rect x="304" y="28" width="220" height="64" rx="6" fill="var(--pc-surface)" stroke="var(--pc-accent)" stroke-width="1.5"/>
<text x="414.0" y="54" text-anchor="middle" fill="var(--pc-text)" font-size="17" style="font-size: 17px">IPrinter</text>
<text x="414.0" y="77" text-anchor="middle" fill="var(--pc-muted)" font-size="13" style="font-size: 13px">print()</text>
<rect x="304" y="152" width="220" height="64" rx="6" fill="var(--pc-surface)" stroke="var(--pc-accent)" stroke-width="1.5"/>
<text x="414.0" y="178" text-anchor="middle" fill="var(--pc-text)" font-size="17" style="font-size: 17px">IScanner</text>
<text x="414.0" y="201" text-anchor="middle" fill="var(--pc-muted)" font-size="13" style="font-size: 13px">scan()</text>
<rect x="600" y="28" width="272" height="64" rx="6" fill="var(--pc-surface)" stroke="var(--pc-accent)" stroke-width="1.5"/>
<text x="736.0" y="54" text-anchor="middle" fill="var(--pc-text)" font-size="17" style="font-size: 17px">JSONExportable</text>
<text x="736.0" y="77" text-anchor="middle" fill="var(--pc-muted)" font-size="13" style="font-size: 13px">exportDoc(JSONExportable const&amp;)</text>
<rect x="600" y="152" width="272" height="64" rx="6" fill="var(--pc-surface)" stroke="var(--pc-accent)" stroke-width="1.5"/>
<text x="736.0" y="178" text-anchor="middle" fill="var(--pc-text)" font-size="17" style="font-size: 17px">Serializable</text>
<text x="736.0" y="201" text-anchor="middle" fill="var(--pc-muted)" font-size="13" style="font-size: 13px">ByteStream</text>
<text x="24" y="264" fill="var(--pc-muted)" font-size="15" style="font-size: 15px">Document → JSONExportable / Serializable：切断无关依赖</text>
</svg>
</div>

<div class="pc-next">算法不索取更强的模板约束</div>

<!--
对应大纲 PPT 5：呈现方式：OOP 接口拆分对比图。
-->

---
ppt: 5
---

# 算法不索取更强的模板约束

```cpp
template <typename I> concept input_or_output_iterator = /*...*/;
template <typename I> concept input_iterator = input_or_output_iterator<I> && /*...*/;
template <typename I> concept forward_iterator = input_iterator<I> && /*...*/;
```

<div class="pc-card info mt-4"><h3>std::copy(InputIt, InputIt, OutputIt)</h3><p class="pc-card-lead">不要求 forward_iterator 或 random_access_iterator；istream_iterator 可单遍读取。</p></div>

<div class="pc-next">Builder 消除伸缩式构造函数</div>

<!--
对应大纲 PPT 5：呈现方式：Concept 层级原代码；重点内容：STL 最小参数约束。
Concept 代码中的 /*...*/ 是大纲占位，不是可编译实现。
-->

---
ppt: 6
---

# Builder 消除伸缩式构造函数

<div class="grid grid-cols-2 gap-4">
<div>

### Fluent Builder / Named Arguments

```cpp
City::DayEvents().SetFire().SetFestival()
```

### Groovy 风格 HTML DSL

```cpp
P{ IMG{"pikachu.png"} }
```

</div>
<div>

<div class="pc-card info"><h3>返回 *this 引用</h3><p class="pc-card-lead">避免十几个同类型布尔／整型参数传错顺序；优化后与位置参数零性能差异。</p></div>
<div class="pc-card info mt-4"><h3>std::initializer_list 与继承</h3><p class="pc-card-lead">构造 HTML 树形领域特定语言。</p></div>

</div>
</div>

<div class="pc-next">Composite Builder 平滑切换子建造者</div>

<!--
* 调侃那句著名的老笑话：*"I had a problem and tried to use Java, now I have a ProblemFactory."* 在 Modern C++ 中，由于一等公民函数对象和 Lambda 的存在，传统 GoF 工厂里大量只为了实现一个 `make()` 虚函数而存在的工厂子类，已经彻底被一行 Lambda 取代了。
  * 再次强化第 1 课与第 3 章的核心认知：区分 Design Pattern 和 Implementation Pattern。问问自己：这个 `make_xxx` 有没有帮我解耦具体类型？如果没有，它就只是个语法糖或实现细节。
这里是大纲调用片段，省略类型定义。大纲只给出 Fluent Builder 与位置参数优化后零性能差异的定性结论，未提供可复现实测环境，不补造数值。
-->

---
ppt: 6
---

# Composite Builder 平滑切换子建造者

<div class="grid grid-cols-2 gap-4 mt-4">
<div class="pc-card info"><h3>PersonBuilderBase</h3><p class="pc-card-lead">共享引用的基类</p></div>
<div class="pc-card info"><h3>lives() / works()</h3><p class="pc-card-lead">在子建造者间平滑切换</p></div>
</div>
<Callout type="info" title="三种现代形态">

Fluent Builder · Composite Builder · Groovy 风格隐式 Builder（DSL）

</Callout>

<div class="pc-muted text-sm mt-4">构造函数不能是虚函数；(x, y) 与 (r, theta) 无法仅靠同类型参数名区分。</div>

<div class="pc-next">Lambda 注册创建逻辑替代工厂子类</div>

<!--
对应大纲 PPT 6：重点内容：Builder 三种形态与复合建造者。
-->

---
ppt: 6
---

# Lambda 注册创建逻辑替代工厂子类

<div class="pc-svg-hero">
<svg viewBox="0 0 900 300" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="factory-title factory-desc">
<title id="factory-title">Abstract Factory 与 Functional Factory 对照</title>
<desc id="factory-desc">箭头从依赖方指向被依赖方；空心三角表示继承或实现。</desc>
<defs><marker id="factory-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M 0 0 L 10 5 L 0 10" fill="none" stroke="var(--pc-accent)" stroke-width="1.5"/></marker><marker id="factory-inherit" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="10" markerHeight="10" orient="auto"><path d="M 0 0 L 10 5 L 0 10 Z" fill="var(--pc-bg)" stroke="var(--pc-accent)" stroke-width="1.5"/></marker></defs>
<path d="M 116 200 V 124" fill="none" stroke="var(--pc-accent)" stroke-width="2" stroke-dasharray="none" marker-end="url(#factory-inherit)"/>
<path d="M 328 200 V 156 Q 328 148 320 148 H 236 Q 228 148 228 140 V 124" fill="none" stroke="var(--pc-accent)" stroke-width="2" stroke-dasharray="none" marker-end="url(#factory-inherit)"/>
<path d="M 684 124 V 200" fill="none" stroke="var(--pc-accent)" stroke-width="2" stroke-dasharray="5 4" marker-end="url(#factory-arrow)"/>
<rect x="24" y="60" width="240" height="64" rx="6" fill="var(--pc-surface)" stroke="var(--pc-accent)" stroke-width="1.5"/>
<text x="144.0" y="86" text-anchor="middle" fill="var(--pc-text)" font-size="17" style="font-size: 17px">Factory</text>
<text x="144.0" y="109" text-anchor="middle" fill="var(--pc-muted)" font-size="13" style="font-size: 13px">make()</text>
<rect x="24" y="200" width="184" height="64" rx="6" fill="var(--pc-surface)" stroke="var(--pc-accent)" stroke-width="1.5"/>
<text x="116.0" y="226" text-anchor="middle" fill="var(--pc-text)" font-size="17" style="font-size: 17px">CoffeeFactory</text>
<text x="116.0" y="249" text-anchor="middle" fill="var(--pc-muted)" font-size="13" style="font-size: 13px">工厂子类</text>
<rect x="248" y="200" width="160" height="64" rx="6" fill="var(--pc-surface)" stroke="var(--pc-accent)" stroke-width="1.5"/>
<text x="328.0" y="226" text-anchor="middle" fill="var(--pc-text)" font-size="17" style="font-size: 17px">TeaFactory</text>
<text x="328.0" y="249" text-anchor="middle" fill="var(--pc-muted)" font-size="13" style="font-size: 13px">工厂子类</text>
<rect x="504" y="60" width="360" height="64" rx="6" fill="var(--pc-surface)" stroke="var(--pc-accent)" stroke-width="1.5"/>
<text x="684.0" y="86" text-anchor="middle" fill="var(--pc-text)" font-size="17" style="font-size: 17px">std::map + std::function</text>
<text x="684.0" y="109" text-anchor="middle" fill="var(--pc-muted)" font-size="13" style="font-size: 13px">Lambda 注册创建逻辑</text>
<rect x="504" y="200" width="360" height="64" rx="6" fill="var(--pc-surface)" stroke="var(--pc-accent)" stroke-width="1.5"/>
<text x="684.0" y="226" text-anchor="middle" fill="var(--pc-text)" font-size="17" style="font-size: 17px">HotDrink</text>
<text x="684.0" y="249" text-anchor="middle" fill="var(--pc-muted)" font-size="13" style="font-size: 13px">std::unique_ptr&lt;HotDrink&gt;</text>
<text x="24" y="28" fill="var(--pc-muted)" font-size="15" style="font-size: 15px">传统 Abstract Factory</text>
<text x="504" y="28" fill="var(--pc-muted)" font-size="15" style="font-size: 15px">现代 Functional Factory</text>
</svg>
</div>

<div class="pc-next">make_unique 是实现模式</div>

<!--
对应大纲 PPT 6：呈现方式：传统 Abstract Factory 类图 vs Functional Factory。
此处 Factory 为大纲 Abstract Factory 的抽象工厂角色，CoffeeFactory / TeaFactory 保留大纲标识符。SVG 为本地原生矢量示意，不声称由 PlantUML 渲染。
-->

---
ppt: 6
---

# make_unique 是实现模式

```cpp
// 现代 Functional Factory：告别繁琐的 CoffeeFactory / TeaFactory 派生类！
class DrinkWithVolumeFactory {
    std::map<std::string, std::function<std::unique_ptr<HotDrink>()>> factories;
public:
    DrinkWithVolumeFactory() {
        factories["tea"] = [] {
            auto tea = std::make_unique<Tea>();
            tea->prepare(200);
            return tea;
        };
    }
};
```

<div class="pc-muted text-sm mt-3">std::make_unique&lt;T&gt;() 写死 new T，没有引入抽象与解耦。</div>

<div class="pc-next">Adapter 转换接口，Decorator 叠加职责</div>

<!--
对应大纲 PPT 6：呈现方式：DrinkWithVolumeFactory 完整原代码；重点内容：Factory 概念正名。
构造函数不能是虚函数；同类型参数的构造函数不能仅靠参数名区分笛卡尔坐标 (x, y) 与极坐标 (r, theta)。这些动机构成工厂命名入口的背景。原代码不额外补全 HotDrink / Tea。
-->

---
ppt: 7
---

# Adapter 转换接口，Decorator 叠加职责

| 模式 | 接口与职责 | 大纲案例 |
| :--- | :--- | :--- |
| Adapter | 转换接口，不增加新职责 | OpenPages::convertToBytes() → Document::serialize() |
| Adapter | 保持行为契约 | deque → stack；警惕 Turkey → Duck 违反 LSP |
| Decorator | 接口不变，递归组合 Has-A + Is-A | Taxed + Discounted；LockDecorator + DebugDecorator |

<div class="pc-next">静态装饰以灵活性换取内联</div>

<!--
* 对比动态与静态 Decorator 的工程权衡（Trade-off）：静态模板 `Taxed<0.15, Discounted<0.2, Ticket>>` 快得令人发指，因为编译器把三层函数调用全内联成了一行浮点乘法！但代价是什么？你不能在运行时根据用户在界面上输入的折扣码动态套壳了。
  * 引导学员再次欣赏 C++17 PMR 内存库的设计：短短几行分配器代码，把 Decorator、Adapter、Strategy、Singleton、NVI 五大模式用得炉火纯青，这就是顶级标准库架构师的功力。
-->

---
ppt: 7
---

# 静态装饰以灵活性换取内联

<div class="pc-tag mb-3">来源：大纲引述 Iglberger 第 9 章 · 相对耗时（越低越好）</div>

| 实现 | 相对耗时 | 工程权衡 |
| :--- | :--- | :--- |
| Classic Runtime Decorator | 1.0x | unique_ptr&lt;Item&gt;；运行时组装、指针跳转 |
| Compile-time Template Decorator | **0.078x** | 快 12.8 倍；保留底层特有接口 |
| 函数式 Decorator | 未提供数据 | 变参模板与完美转发，包装任意 Callable |

<div class="pc-muted text-sm mt-4">动态装饰无法直接访问 Knight::charge()；静态版本使用转发构造函数。</div>

<div class="pc-next">嵌套 Mixin 在编译期展开</div>

<!--
对应大纲 PPT 7：呈现方式：性能对比表；重点内容：三种 Decorator 形态。
大纲另以“耗时仅为 8%”概述同一比例。这里保留精确 0.078x 与快 12.8 倍。所有性能数字均为大纲引述，未在本项目重新测量，不能泛化为所有硬件与工作负载。
-->

---
ppt: 7
---

# 嵌套 Mixin 在编译期展开

```cpp
// 零虚函数、零堆分配、全内联的编译期嵌套装饰！
Taxed<0.15, Discounted<0.2, ConferenceTicket>> item{ "Core C++", 499.0 };
Money const totalPrice = item.price(); // 编译期直接展开为算术乘法
```

<div class="pc-card info mt-4"><h3>Concept 约束的静态 Decorator</h3><p class="pc-card-lead">template &lt;double rate, PricedItem Item&gt; class Taxed : public Item</p></div>

<div class="pc-next">PMR 融合多种设计意图</div>

<!--
对应大纲 PPT 7：呈现方式：Taxed / Discounted 原代码；重点内容：Concept 约束。
-->

---
ppt: 7
---

# PMR 融合多种设计意图

<div class="pc-chain mt-6"><div class="pc-card info">polymorphic_allocator<br><span class="pc-muted">Adapter</span></div><span class="pc-arrow">→</span><div class="pc-card info">monotonic_buffer_resource<br><span class="pc-muted">Decorator · upstream</span></div><span class="pc-arrow">→</span><div class="pc-card info">null_memory_resource<br><span class="pc-muted">upstream</span></div></div>

<div class="pc-tags mt-8"><span class="pc-tag">C++17 std::pmr::memory_resource</span><span class="pc-tag">Template Method（NVI）</span></div>

<div class="pc-next">Strategy 关注 How，Command 关注 What</div>

<!--
对应大纲 PPT 7：呈现方式：PMR 装饰链；重点内容：Decorator / Adapter / NVI。
-->

---
ppt: 8
---

# Strategy 关注 How，Command 关注 What

| 模式 | 意图 | 典型用途 |
| :--- | :--- | :--- |
| Strategy | 如何做某事（How） | 排序比较器、Circle 渲染引擎、分配器 |
| Command | 做什么事（What） | 计算器加减、线程池任务、std::for_each |
| Command | 请求、参数、接收者封装 | 立即执行或排队；支持 undo() |

<div class="pc-card info mt-4"><h3>结构相同，意图不同</h3><p class="pc-card-lead">Strategy 通常用于配置对象。</p></div>

<div class="pc-next">策略抽象也必须遵守 ISP</div>

<!--
* 重点提醒那个 90% 程序员都会踩的坑：在写 `DrawStrategy` 基类时，千万别图省事把所有子类 `Circle`, `Square` 的 `draw` 全塞进同一个策略接口里！一旦这么做，每当你新增一个 `Triangle`，所有的策略类和图形类全都要重新编译，面向对象“易于添加新类型”的核心优势瞬间荡然无存。
  * 演示换用 `std::function` 后的清爽感：客户端再也不用为了画个圆去专门写一个继承自 `DrawStrategy` 的类并 `make_unique` 了，直接传一个捕获了颜色配置上下文的 Lambda 表达式即可完成依赖注入！
-->

---
ppt: 8
---

# 策略抽象也必须遵守 ISP

<div class="pc-svg-hero">
<svg viewBox="0 0 900 300" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="strategy-title strategy-desc">
<title id="strategy-title">Strategy 的 ISP 陷阱与正确隔离</title>
<desc id="strategy-desc">箭头从依赖方指向被依赖方；空心三角表示继承或实现。</desc>
<defs><marker id="strategy-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M 0 0 L 10 5 L 0 10" fill="none" stroke="var(--pc-accent)" stroke-width="1.5"/></marker><marker id="strategy-inherit" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="10" markerHeight="10" orient="auto"><path d="M 0 0 L 10 5 L 0 10 Z" fill="var(--pc-bg)" stroke="var(--pc-accent)" stroke-width="1.5"/></marker></defs>
<path d="M 104 208 V 128" fill="none" stroke="var(--pc-accent)" stroke-width="2" stroke-dasharray="5 4" marker-end="url(#strategy-arrow)"/>
<path d="M 304 208 V 128" fill="none" stroke="var(--pc-accent)" stroke-width="2" stroke-dasharray="5 4" marker-end="url(#strategy-arrow)"/>
<path d="M 684 208 V 128" fill="none" stroke="var(--pc-accent)" stroke-width="2" stroke-dasharray="5 4" marker-end="url(#strategy-arrow)"/>
<rect x="24" y="52" width="360" height="76" rx="6" fill="var(--pc-surface)" stroke="var(--pc-accent)" stroke-width="1.5"/>
<text x="204.0" y="78" text-anchor="middle" fill="var(--pc-text)" font-size="17" style="font-size: 17px">DrawStrategy</text>
<text x="204.0" y="101" text-anchor="middle" fill="var(--pc-muted)" font-size="13" style="font-size: 13px">draw(Circle const&amp;) / draw(Square const&amp;)</text>
<rect x="24" y="208" width="160" height="64" rx="6" fill="var(--pc-surface)" stroke="var(--pc-accent)" stroke-width="1.5"/>
<text x="104.0" y="234" text-anchor="middle" fill="var(--pc-text)" font-size="17" style="font-size: 17px">Circle</text>
<text x="104.0" y="257" text-anchor="middle" fill="var(--pc-muted)" font-size="13" style="font-size: 13px">耦合所有图形</text>
<rect x="224" y="208" width="160" height="64" rx="6" fill="var(--pc-surface)" stroke="var(--pc-accent)" stroke-width="1.5"/>
<text x="304.0" y="234" text-anchor="middle" fill="var(--pc-text)" font-size="17" style="font-size: 17px">Square</text>
<text x="304.0" y="257" text-anchor="middle" fill="var(--pc-muted)" font-size="13" style="font-size: 13px">耦合所有图形</text>
<rect x="504" y="52" width="360" height="76" rx="6" fill="var(--pc-surface)" stroke="var(--pc-accent)" stroke-width="1.5"/>
<text x="684.0" y="78" text-anchor="middle" fill="var(--pc-text)" font-size="17" style="font-size: 17px">DrawStrategy&lt;Circle&gt;</text>
<text x="684.0" y="101" text-anchor="middle" fill="var(--pc-muted)" font-size="13" style="font-size: 13px">或 DrawCircleStrategy</text>
<rect x="504" y="208" width="360" height="64" rx="6" fill="var(--pc-surface)" stroke="var(--pc-accent)" stroke-width="1.5"/>
<text x="684.0" y="234" text-anchor="middle" fill="var(--pc-text)" font-size="17" style="font-size: 17px">Circle</text>
<text x="684.0" y="257" text-anchor="middle" fill="var(--pc-muted)" font-size="13" style="font-size: 13px">仅依赖自己的策略</text>
<text x="24" y="28" fill="var(--pc-muted)" font-size="15" style="font-size: 15px">ISP 陷阱：大一统接口</text>
<text x="504" y="28" fill="var(--pc-muted)" font-size="15" style="font-size: 15px">正确：独立策略抽象</text>
</svg>
</div>

<div class="pc-next">按值接收策略，移动注入</div>

<!--
对应大纲 PPT 8：呈现方式：ISP 陷阱 vs 正确隔离架构图。
-->

---
ppt: 8
---

# 按值接收策略，移动注入

```cpp
class Circle : public Shape {
public:
    using DrawStrategy = std::function<void(Circle const&)>;
    explicit Circle(double r, DrawStrategy drawer)
        : radius_(r), drawer_(std::move(drawer)) {} // 值语义：按值接收，移动构造！
    void draw() const override { drawer_(*this); }
private:
    double radius_;
    DrawStrategy drawer_; // 无需 unique_ptr，支持函数指针、仿函数、有状态 Lambda！
};
```

<div class="pc-next">Policy 模板参数实现静态 Strategy</div>

<!--
对应大纲 PPT 8：呈现方式：现代值语义 Strategy 原代码。
原代码按大纲保留，省略 Shape 定义与相关头文件。std::function 的值语义不等于零分配或零类型擦除开销，不将 Policy 的零开销结论移植到此实现。
-->

---
ppt: 8
---

# Policy 模板参数实现静态 Strategy

<div class="grid grid-cols-2 gap-4 mt-4">
<div class="pc-card info"><h3>运行时值语义</h3><p class="pc-card-lead">std::function&lt;void(Circle const&amp;)&gt;<br>函数指针、仿函数、有状态 Lambda</p></div>
<div class="pc-card info"><h3>Policy-Based Design</h3><p class="pc-card-lead">template &lt;typename DrawStrategy&gt; class Circle<br>std::unique_ptr&lt;T, Deleter&gt;</p></div>
</div>

<div class="pc-next">类型与操作构成二维扩展困境</div>

<!--
对应大纲 PPT 8：重点内容：std::function 与 Policy-Based Design。
-->

---
ppt: 9
---

# 类型与操作构成二维扩展困境

| 范式 | 添加新类型 | 添加新操作 |
| :--- | :--- | :--- |
| OOP 动态多态 | 新增派生类 | 基类新增虚函数，污染所有子类 |
| Procedural：enum + switch | 修改枚举与所有 switch | 新增操作 |

<Callout type="info" title="The Expression Problem">

经典 Visitor 为 OOP 体系引入“轻松添加新操作”，代价是锁死类型集合。

</Callout>

<div class="pc-next">双重分发锁死类型集合</div>

<!--
* 剖析为什么 Visitor 模式在 GoF 二十三式里名声最差、最难懂：因为它本质上是在“用面向对象的锤子，硬砸过程式编程的钉子”。
  * 告诉学员：不要迷信所谓的 Acyclic Visitor 奇技淫巧。在 C++ 中，`dynamic_cast` 进行跨分支横向转型（Cross-casting）需要在运行时遍历类型信息树，性能代价极其惨重。我们需要的是真正属于 Modern C++ 的降维打击方案。
-->

---
ppt: 9
---

# 双重分发锁死类型集合

<div class="pc-svg-hero">
<svg viewBox="0 0 900 300" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="visitor-title visitor-desc">
<title id="visitor-title">经典 Visitor 循环依赖</title>
<desc id="visitor-desc">箭头从依赖方指向被依赖方；空心三角表示继承或实现。</desc>
<defs><marker id="visitor-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M 0 0 L 10 5 L 0 10" fill="none" stroke="var(--pc-accent)" stroke-width="1.5"/></marker><marker id="visitor-inherit" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="10" markerHeight="10" orient="auto"><path d="M 0 0 L 10 5 L 0 10 Z" fill="var(--pc-bg)" stroke="var(--pc-accent)" stroke-width="1.5"/></marker></defs>
<path d="M 256 116 H 596" fill="none" stroke="var(--pc-accent)" stroke-width="2" stroke-dasharray="5 4" marker-end="url(#visitor-arrow)"/>
<path d="M 732 176 V 232 Q 732 240 724 240 H 568" fill="none" stroke="var(--pc-accent)" stroke-width="2" stroke-dasharray="5 4" marker-end="url(#visitor-arrow)"/>
<path d="M 316 240 H 152 Q 144 240 144 232 V 176" fill="none" stroke="var(--pc-accent)" stroke-width="2" stroke-dasharray="none" marker-end="url(#visitor-inherit)"/>
<rect x="32" y="88" width="224" height="88" rx="6" fill="var(--pc-surface)" stroke="var(--pc-accent)" stroke-width="1.5"/>
<text x="144.0" y="114" text-anchor="middle" fill="var(--pc-text)" font-size="17" style="font-size: 17px">Shape</text>
<text x="144.0" y="137" text-anchor="middle" fill="var(--pc-muted)" font-size="13" style="font-size: 13px">accept(ShapeVisitor const&amp;)</text>
<rect x="596" y="88" width="272" height="88" rx="6" fill="var(--pc-surface)" stroke="var(--pc-accent)" stroke-width="1.5"/>
<text x="732.0" y="114" text-anchor="middle" fill="var(--pc-text)" font-size="17" style="font-size: 17px">ShapeVisitor</text>
<text x="732.0" y="137" text-anchor="middle" fill="var(--pc-muted)" font-size="13" style="font-size: 13px">visit(Circle) / visit(Square)</text>
<rect x="316" y="208" width="252" height="64" rx="6" fill="var(--pc-surface)" stroke="var(--pc-accent)" stroke-width="1.5"/>
<text x="442.0" y="234" text-anchor="middle" fill="var(--pc-text)" font-size="17" style="font-size: 17px">Circle / Square</text>
<text x="442.0" y="257" text-anchor="middle" fill="var(--pc-muted)" font-size="13" style="font-size: 13px">具体子类</text>
<text x="32" y="32" fill="var(--pc-muted)" font-size="15" style="font-size: 15px">Shape → ShapeVisitor → Circle / Square → Shape</text>
<text x="320" y="296" fill="var(--pc-muted)" font-size="15" style="font-size: 15px">双重分发：accept() + visit()</text>
</svg>
</div>

<div class="pc-next">经典 Visitor 的设计代价</div>

<!--
对应大纲 PPT 9：呈现方式：循环依赖死结图；重点内容：Double Dispatch。
Shape 中侵入式植入 virtual void accept(ShapeVisitor const&) = 0；图中从具体子类指向 Shape 的实线为继承，从 Shape 和 Visitor 出发的虚线为依赖。
-->

---
ppt: 9
---

# 经典 Visitor 的设计代价

<v-clicks>

- 循环依赖：锁死类型集合
- 侵入设计：必须植入 accept()
- 接口僵化：返回类型写死
- 双重虚跳转与零散堆分配
- Acyclic Visitor：Cross-cast 代价

</v-clicks>

<div class="pc-muted text-sm">Translate 对所有图形逻辑相同，仍需重写每个 visit。</div>

<div class="pc-next">Acyclic Visitor 付出近九倍耗时</div>

<!--
对应大纲 PPT 9：重点内容：大纲实际列出的五项 Visitor 阵痛。
大纲称“六大阵痛”但实际列出五项，未补造第六项。
[click] 循环依赖锁死了类型集合。
[click] accept() 必须侵入原有类层级。
[click] 返回类型被固定，Translate 仍要为每种图形重写 visit。
[click] accept() 与 visit() 双重虚表跳转，加上零散堆分配。
[click] Acyclic Visitor 以多重继承与 Cross-cast 换取无环，代价在下一页展开。
-->

---
ppt: 9
---

# Acyclic Visitor 付出近九倍耗时

<div class="pc-tag mb-3">来源：大纲引述 Iglberger 实测 · 同一案例运行时间</div>

| 方案 | 运行时间 |
| :--- | :--- |
| Cyclic Visitor | 1.61s |
| Acyclic Visitor | **14.34s** |

<Callout type="bad" title="多重继承 + dynamic_cast Cross-cast">

慢近 9 倍！大纲概述为 5~10 倍（从 1.6s 恶化至 14.3s）。

</Callout>

<div class="pc-next">variant 让图形回归独立值类型</div>

<!--
对应大纲 PPT 9：呈现方式：Acyclic Visitor 性能警告框与精确实测数字。
按大纲区分概述值 1.6s / 14.3s 与精确值 1.61s / 14.34s；不视为本项目的实测承诺。
-->

---
ppt: 10
---

# variant 让图形回归独立值类型

<div class="pc-card info"><h3>C++17 Sum Type · Type-safe Union</h3><p class="pc-card-lead">为最大备选类型预留空间；无需基类与 accept()。</p></div>

```cpp
using Shape = std::variant<Circle, Square>;
using RoundShapes = std::variant<Circle, Ellipse>;
```

<div class="pc-tags mt-4"><span class="pc-tag">Non-intrusive Design</span><span class="pc-tag">Closed set of types</span></div>

<div class="pc-next">overloaded 在调用处组合 Lambda</div>

<!--
* 现场带领学员感受这场“代码大扫除”的爽快感：基类没了，虚析构没了，`accept()` 没了，`unique_ptr` 没了！`std::vector<Shape>` 里所有图形紧凑地排列在一段连续内存里，CPU 预取器（Prefetcher）狂喜，性能直接反超传统虚函数！
  * 客观指出 `std::variant` 的适用边界：它依然是一个 Visitor 方案，意味着它要求**封闭的类型集合（Closed set of types）**；且如果某个备选类型特别巨大，会导致所有小类型跟着浪费内存（此时可结合 Bridge/Pimpl 指针包装大对象）。
variant 本身不额外分配存储空间，备选类型自身仍可持有动态资源。封闭类型集合、最大备选类型造成的空间浪费见大纲演讲要点；这些边界不推导为任意场景中都能消除所有堆分配。
-->

---
ppt: 10
---

# overloaded 在调用处组合 Lambda

```cpp
// 1. 纯粹的值类型（无基类、无虚函数）
class Circle { /*...*/ }; class Square { /*...*/ };
using Shape  = std::variant<Circle, Square>;
using Shapes = std::vector<Shape>; // 连续内存存储，极致 CPU 缓存友好！

// 2. Overloaded 模式：内联 Lambda 访问者
template<class... Ts> struct overloaded : Ts... { using Ts::operator()...; };
template<class... Ts> overloaded(Ts...) -> overloaded<Ts...>;

for (auto const& shape : shapes) {
    std::visit(overloaded{
        [](Circle const& c) { /* draw circle */ },
        [](Square const& s) { /* draw square */ }
    }, shape);
}
```

<div class="pc-next">重载访问者支持多重分发</div>

<!--
对应大纲 PPT 10：呈现方式：std::variant + std::visit + overloaded 完整原代码。
-->

---
ppt: 10
---

# 重载访问者支持多重分发

<v-clicks>

- Draw 提供重载的 operator()
- 自由定义返回值类型
- 模板 operator()(auto const&) 合并 Translate
- 同时传入多个 variant：Multiple Dispatch

</v-clicks>

<div class="pc-next">连续值存储改善访问性能</div>

<!--
对应大纲 PPT 10：重点内容：模式匹配与多重分发。
同一次 std::visit 调用的所有可能分支需满足该重载要求的返回类型一致性；C++20 可用显式返回类型的 visit<R>。不能把“自由定义”解释为同一次调用可任意混用不一致的返回类型。
[click] Draw 通过重载 operator() 匹配不同值类型。
[click] 访问者可以选择自己的返回类型，但同一次 visit 的分支必须满足返回类型要求。
[click] Translate 可用模板 operator()(auto const&) 合并通用操作。
[click] 同时传入多个 variant，即可进行 Multiple Dispatch。
-->

---
ppt: 10
---

# 连续值存储改善访问性能

<div class="pc-tag mb-3">来源：大纲引述 Iglberger 实测 · 运行时间（越低越好）</div>

| 方案 | 运行时间 |
| :--- | :--- |
| Acyclic Visitor | 14.34s |
| Classic Visitor | 1.61s |
| OOP Virtual | 1.52s |
| std::variant + std::visit | **1.19s** |
| std::variant + std::get_if | **1.02s** |

<div class="pc-next">Meyers’ Singleton 只解决唯一实例</div>

<!--
对应大纲 PPT 10：呈现方式：完整五项 Benchmark 性能表。
保持大纲原始数据；这是特定基准的结果，未提供完整硬件／编译器／数据分布，不宣称普遍性能排序。
-->

---
ppt: 11
---

# Meyers’ Singleton 只解决唯一实例

<v-clicks>

- 函数内局部 static：延迟初始化
- C++11 Magic Statics：初始化线程安全
- 封死所有拷贝／移动构造与赋值
- C++17 及以前：Database() {} 避免聚合绕过

</v-clicks>

<div class="pc-muted text-sm">Database() = default; 的聚合初始化绕过漏洞，C++20 已修复。</div>

<Callout type="info" title="Implementation Pattern">

只限制实例数并提供全局访问，没有引入解耦抽象。

</Callout>

<div class="pc-next">硬编码单例隐藏依赖</div>

<!--
* 犀利吐槽：很多程序员嘴上骂着“全局变量是万恶之源”，转身却心安理得地写出了 `Singleton::instance()`——这不就是穿了件马甲的全局变量吗？甚至更糟，它还把你的单元测试路子给堵死了！
  * 给出务实的工程解药：如果系统中确实存在全局唯一的物理设施（如默认内存分配器、只读配置、单向输出的 Logger），请务必用一层**抽象接口（Strategy）**把单例包裹起来，并提供注入接口（Setter 或构造函数参数）。这样既保留了默认调用的便利性，又给单元测试留出了替换 Mock 的后门，还能通过在 `main()` 栈上按序构造彻底消灭 SIOF！
Magic Statics 只保证局部 static 的初始化线程安全，不保证后续成员操作线程安全。聚合绕过与具体类的聚合资格有关，不泛指所有单例类型；大纲指出 C++20 已修复该漏洞。
[click] 局部 static 延迟初始化。
[click] Magic Statics 保证初始化线程安全，不保证实例后续操作线程安全。
[click] 封死所有拷贝、移动构造与赋值入口。
[click] 大纲提醒 C++17 及以前的聚合初始化边界，使用 Database() {}；C++20 已修复该漏洞。
-->

---
ppt: 11
---

# 硬编码单例隐藏依赖

<div class="grid grid-cols-2 gap-4 mt-4">
<div class="pc-card info"><h3>隐式全局可变状态</h3><p class="pc-card-lead">Opaque Global Mutable State<br>并发推理困难；跨编译单元易触发 SIOF</p></div>
<div class="pc-card info"><h3>依赖倒挂与不可测试</h3><p class="pc-card-lead">Widget → Database::instance().read()<br>无法替换为 DummyDatabase 或 Mock</p></div>
</div>

<div class="pc-next">让具体数据库依赖高层抽象</div>

<!--
对应大纲 PPT 11：重点内容：Singleton 三大原罪。
-->

---
ppt: 11
---

# 让具体数据库依赖高层抽象

<div class="pc-svg-hero">
<svg viewBox="0 0 900 300" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="di-title di-desc">
<title id="di-title">Singleton 到依赖注入的依赖反转</title>
<desc id="di-desc">箭头从依赖方指向被依赖方；空心三角表示继承或实现。</desc>
<defs><marker id="di-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M 0 0 L 10 5 L 0 10" fill="none" stroke="var(--pc-accent)" stroke-width="1.5"/></marker><marker id="di-inherit" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="10" markerHeight="10" orient="auto"><path d="M 0 0 L 10 5 L 0 10 Z" fill="var(--pc-bg)" stroke="var(--pc-accent)" stroke-width="1.5"/></marker></defs>
<path d="M 120 128 V 204" fill="none" stroke="var(--pc-accent)" stroke-width="2" stroke-dasharray="5 4" marker-end="url(#di-arrow)"/>
<path d="M 648 96 H 700" fill="none" stroke="var(--pc-accent)" stroke-width="2" stroke-dasharray="5 4" marker-end="url(#di-arrow)"/>
<path d="M 788 204 V 128" fill="none" stroke="var(--pc-accent)" stroke-width="2" stroke-dasharray="none" marker-end="url(#di-inherit)"/>
<rect x="24" y="64" width="192" height="64" rx="6" fill="var(--pc-surface)" stroke="var(--pc-accent)" stroke-width="1.5"/>
<text x="120.0" y="90" text-anchor="middle" fill="var(--pc-text)" font-size="17" style="font-size: 17px">Widget</text>
<text x="120.0" y="113" text-anchor="middle" fill="var(--pc-muted)" font-size="13" style="font-size: 13px">硬编码调用</text>
<rect x="24" y="204" width="320" height="64" rx="6" fill="var(--pc-surface)" stroke="var(--pc-accent)" stroke-width="1.5"/>
<text x="184.0" y="230" text-anchor="middle" fill="var(--pc-text)" font-size="17" style="font-size: 17px">Database Singleton</text>
<text x="184.0" y="253" text-anchor="middle" fill="var(--pc-muted)" font-size="13" style="font-size: 13px">具体底层实现</text>
<rect x="472" y="64" width="176" height="64" rx="6" fill="var(--pc-surface)" stroke="var(--pc-accent)" stroke-width="1.5"/>
<text x="560.0" y="90" text-anchor="middle" fill="var(--pc-text)" font-size="17" style="font-size: 17px">Widget</text>
<text x="560.0" y="113" text-anchor="middle" fill="var(--pc-muted)" font-size="13" style="font-size: 13px">依赖高层抽象</text>
<rect x="700" y="64" width="176" height="64" rx="6" fill="var(--pc-surface)" stroke="var(--pc-accent)" stroke-width="1.5"/>
<text x="788.0" y="90" text-anchor="middle" fill="var(--pc-text)" font-size="17" style="font-size: 17px">PersistenceInterface</text>
<text x="788.0" y="113" text-anchor="middle" fill="var(--pc-muted)" font-size="13" style="font-size: 13px">read()</text>
<rect x="700" y="204" width="176" height="64" rx="6" fill="var(--pc-surface)" stroke="var(--pc-accent)" stroke-width="1.5"/>
<text x="788.0" y="230" text-anchor="middle" fill="var(--pc-text)" font-size="17" style="font-size: 17px">Database</text>
<text x="788.0" y="253" text-anchor="middle" fill="var(--pc-muted)" font-size="13" style="font-size: 13px">实现细节</text>
<text x="24" y="28" fill="var(--pc-muted)" font-size="15" style="font-size: 15px">Before · Concrete Singleton</text>
<text x="472" y="28" fill="var(--pc-muted)" font-size="15" style="font-size: 15px">After · Strategy + DI</text>
</svg>
</div>

<div class="pc-next">注入接口恢复可测试性</div>

<!--
对应大纲 PPT 11：呈现方式：Widget → Concrete Database vs PersistenceInterface 架构反转。
大纲另给 ConfigurableRecordFinder(Database& db) 构造注入入口。图展示抽象依赖方向，注入发生于组合根，不意味着由 Widget 创建数据库。
-->

---
ppt: 11
---

# 注入接口恢复可测试性

```cpp
// ✅ 救赎方案 1：效仿 std::pmr 的全局可替换策略抽象
PersistenceInterface* get_persistence_interface();
void set_persistence_interface(PersistenceInterface* persistence); // 支持单测注入 Mock！

// ✅ 救赎方案 2：构造函数显式依赖注入 + 默认回退重载
class Widget {
public:
    void doSomething() { doSomething(get_persistence_interface()); }
    void doSomething(PersistenceInterface* db) { db->read(/*...*/); } // 100% 可测试！
};
```

<div class="pc-next">Modern C++ 保留意图，替换实现</div>

<!--
对应大纲 PPT 11：呈现方式：全局可替换策略抽象与显式注入完整原代码。
大纲代码第二种实际展示的是方法参数注入加默认回退重载，尽管其注释写作“构造函数显式依赖注入”。代码保持原样，授课时须区分两者；可变全局替换入口仍需要约束生命周期及并发访问。
-->

---
ppt: 12
---

# Modern C++ 保留意图，替换实现

| 经典 GoF 模式 | 传统 OOP 实现方式 | Modern C++ 演进方案 | 核心收益 |
| :--- | :--- | :--- | :--- |
| Factory | 工厂派生类体系 | Lambda + std::function 注册表 | 消除样板类，轻量级内联 |
| Strategy / Command | 基类 + unique_ptr | std::function 或 Policy 模板参数 | 值语义、非侵入式、支持内联 |
| Decorator | 指针嵌套包装类 | 变参模板 Mixin / Type Erasure | 编译期展开快 12 倍／值语义 |
| Visitor | accept() + 循环依赖 | std::variant + std::visit | 非侵入式、连续内存、极速访问 |
| Singleton | 硬编码 T::instance() | 抽象接口 + 依赖注入（DI） | 恢复可测试性，符合 DIP |

<div class="pc-next">重构图形与操作，注入日志策略</div>

<!--
* 总结第 2 课的核心思想：**设计模式从来不是具体的代码模板，而是解耦的意图（Intent）**。当语言进化出 `std::variant`、Lambda 和 Concepts 时，我们实现这些意图的方式就会发生脱胎换骨的进化。
  * 预告第 3 课（全课程高潮）：如果我们的系统要求**类型集合必须是开放的**（允许第三方插件随时添加新图形，因此不能用 `std::variant`），但我们依然想要**非侵入式（无基类）**和**纯粹的值语义（无指针）**，该怎么办？下一课，我们将揭开终极解耦架构——**Type Erasure（类型擦除）**的神秘面纱！
“编译期展开快 12 倍”仅指前述 Decorator 基准，不指 Type Erasure；std::function 的支持内联能力也不能理解为所有间接调用必定内联。
-->

---
ppt: 12
---

# 重构图形与操作，注入日志策略

<div class="pc-svg-hero">
<svg viewBox="0 0 900 300" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="homework-title homework-desc">
<title id="homework-title">绘图引擎作业重构前后</title>
<desc id="homework-desc">箭头从依赖方指向被依赖方；空心三角表示继承或实现。</desc>
<defs><marker id="homework-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M 0 0 L 10 5 L 0 10" fill="none" stroke="var(--pc-accent)" stroke-width="1.5"/></marker><marker id="homework-inherit" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="10" markerHeight="10" orient="auto"><path d="M 0 0 L 10 5 L 0 10 Z" fill="var(--pc-bg)" stroke="var(--pc-accent)" stroke-width="1.5"/></marker></defs>
<path d="M 204 136 V 204" fill="none" stroke="var(--pc-accent)" stroke-width="2" stroke-dasharray="5 4" marker-end="url(#homework-arrow)"/>
<path d="M 684 136 V 204" fill="none" stroke="var(--pc-accent)" stroke-width="2" stroke-dasharray="5 4" marker-end="url(#homework-arrow)"/>
<rect x="24" y="64" width="360" height="72" rx="6" fill="var(--pc-surface)" stroke="var(--pc-accent)" stroke-width="1.5"/>
<text x="204.0" y="90" text-anchor="middle" fill="var(--pc-text)" font-size="17" style="font-size: 17px">Circle / Square / Triangle</text>
<text x="204.0" y="113" text-anchor="middle" fill="var(--pc-muted)" font-size="13" style="font-size: 13px">enum ShapeType + switch-case</text>
<rect x="24" y="204" width="360" height="64" rx="6" fill="var(--pc-surface)" stroke="var(--pc-accent)" stroke-width="1.5"/>
<text x="204.0" y="230" text-anchor="middle" fill="var(--pc-text)" font-size="17" style="font-size: 17px">accept(Visitor&amp;)</text>
<text x="204.0" y="253" text-anchor="middle" fill="var(--pc-muted)" font-size="13" style="font-size: 13px">OpenGLLogger::instance()</text>
<rect x="504" y="64" width="360" height="72" rx="6" fill="var(--pc-surface)" stroke="var(--pc-accent)" stroke-width="1.5"/>
<text x="684.0" y="90" text-anchor="middle" fill="var(--pc-text)" font-size="17" style="font-size: 17px">std::variant + std::visit</text>
<text x="684.0" y="113" text-anchor="middle" fill="var(--pc-muted)" font-size="13" style="font-size: 13px">overloaded</text>
<rect x="504" y="204" width="360" height="64" rx="6" fill="var(--pc-surface)" stroke="var(--pc-accent)" stroke-width="1.5"/>
<text x="684.0" y="230" text-anchor="middle" fill="var(--pc-text)" font-size="17" style="font-size: 17px">可注入策略接口</text>
<text x="684.0" y="253" text-anchor="middle" fill="var(--pc-muted)" font-size="13" style="font-size: 13px">无图形硬件单元测试</text>
<text x="24" y="28" fill="var(--pc-muted)" font-size="15" style="font-size: 15px">Before · 侵入与硬编码</text>
<text x="504" y="28" fill="var(--pc-muted)" font-size="15" style="font-size: 15px">After · 值类型与显式依赖</text>
</svg>
</div>

<div class="pc-muted text-sm">计算面积 · 导出 JSON · 平移：抹去所有基类与虚函数。</div>

<div class="pc-next">实践交付：无图形硬件的单元测试</div>

<!--
对应大纲 PPT 12：重点内容：课后实战任务 1/2；呈现方式：作业前后架构拓扑图。
-->

---
ppt: 12
---

# 实践交付：无图形硬件的单元测试

<v-clicks>

- variant / visit / overloaded 重构图形与操作
- OpenGLLogger 改为可注入策略接口
- 编写不依赖任何图形硬件的单元测试

</v-clicks>

<div class="mt-6">

<Callout type="good" title="下节预告 · 第 3 课">

架构解耦、依赖倒置与 Modern C++ 值语义多态设计。

</Callout>

</div>

<!--
对应大纲 PPT 12：重点内容：课后实战作业；下一课课程标题。
下节预告取自课程大纲第 3 课标题，不将本课演讲要点中的 Type Erasure 口头预告扩成独立知识页。
[click] 用 variant、visit 与 overloaded 重构图形及计算面积、导出 JSON、平移操作。
[click] 将 OpenGLLogger 单例重构为符合 DIP 的可注入策略接口。
[click] 用不依赖任何图形硬件的单元测试证明可替换性。
-->
