---
theme: default
title: Professional C++ —— 架构解耦、依赖倒置与 Modern C++ 值语义多态设计
lesson: 第 3 课 · 架构解耦与值语义多态
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

<div class="pc-kicker">Professional C++ · 第 3 课 · 上节回顾：SOLID 与 GoF 重构</div>

# 架构解耦与值语义多态

<div class="pc-subtitle">物理依赖 · 依赖倒置 · 非侵入式运行时多态</div>

<div class="pc-tags mt-10"><span class="pc-tag">Compilation Firewall</span><span class="pc-tag">Value Semantics</span><span class="pc-tag">Type Erasure</span></div>

<!--
* 灵魂发问：“为什么我在类的 `private` 区加了一个谁也访问不到的私有变量，结果整个公司的项目重新编译了两个小时？”因为 C++ 的编译模型决定了：`private` 防君子不防编译器！
  * 强调在大厂大型 C++ 工程中，**管理物理依赖（构建速度与 ABI 稳定性）与管理逻辑依赖同等重要**。
-->

---
ppt: 1
---

# private 控制访问，不隐藏布局

<div class="grid grid-cols-2 gap-4 mt-4">
<div class="pc-card info"><h3>Logical Coupling · 逻辑耦合</h3><p class="pc-card-lead">类 A 调用类 B 的成员函数或使用其类型名</p></div>
<div class="pc-card info"><h3>Physical Dependency · 物理依赖</h3><p class="pc-card-lead">#include &lt;ElectricEngine.h&gt; 引入文件依赖</p></div>
</div>
<Callout type="info" title="Access Label ≠ Visibility Label">

sizeof(ElectricCar) 需要完整布局：ElectricEngine engine_; 仍要求完整定义。

</Callout>

<div class="pc-next">头文件改动触发级联重编译</div>

<!--
大纲 PPT 1：重点内容：John Lakos 两种核心依赖；private 与 sizeof。
-->

---
ppt: 1
---

# 头文件改动触发级联重编译

<div class="pc-svg-hero">
<svg viewBox="0 0 900 300" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="l3-include-title l3-include-desc">
<title id="l3-include-title">include 爆炸传染树：底层改动与业务重编译</title>
<desc id="l3-include-desc">include 爆炸传染树：底层改动与业务重编译；依赖箭头由使用方向指向被依赖方，空心三角表示继承。</desc>
<defs><marker id="l3-include-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M 0 0 L 10 5 L 0 10" fill="none" stroke="var(--pc-accent)" stroke-width="1.5"/></marker><marker id="l3-include-inherit" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="9" markerHeight="9" orient="auto"><path d="M 0 0 L 10 5 L 0 10 Z" fill="var(--pc-bg)" stroke="var(--pc-accent)" stroke-width="1.5"/></marker></defs>
<path d="M 450 84 V 60" fill="none" stroke="var(--pc-accent)" stroke-width="2" stroke-dasharray="5 4" marker-end="url(#l3-include-arrow)"/><path d="M 450 160 V 136" fill="none" stroke="var(--pc-accent)" stroke-width="2" stroke-dasharray="5 4" marker-end="url(#l3-include-arrow)"/><path d="M 134 244 V 232 Q 134 224 142 224 H 342 Q 350 224 350 216 V 212" fill="none" stroke="var(--pc-accent)" stroke-width="2" stroke-dasharray="5 4" marker-end="url(#l3-include-arrow)"/><path d="M 450 244 V 212" fill="none" stroke="var(--pc-accent)" stroke-width="2" stroke-dasharray="5 4" marker-end="url(#l3-include-arrow)"/><path d="M 766 244 V 232 Q 766 224 758 224 H 558 Q 550 224 550 216 V 212" fill="none" stroke="var(--pc-accent)" stroke-width="2" stroke-dasharray="5 4" marker-end="url(#l3-include-arrow)"/><rect x="280" y="8" width="340" height="52" rx="6" fill="var(--pc-surface)" stroke="var(--pc-accent)" stroke-width="1.5"/><text x="450.0" y="34" text-anchor="middle" fill="var(--pc-text)" font-size="17" style="font-size: 17px">&lt;EngineInternal.h&gt;</text><text x="450.0" y="57" text-anchor="middle" fill="var(--pc-muted)" font-size="13" style="font-size: 13px">增加 int cache_size_;</text><rect x="280" y="84" width="340" height="52" rx="6" fill="var(--pc-surface)" stroke="var(--pc-accent)" stroke-width="1.5"/><text x="450.0" y="110" text-anchor="middle" fill="var(--pc-text)" font-size="17" style="font-size: 17px">&lt;ElectricEngine.h&gt;</text><text x="450.0" y="133" text-anchor="middle" fill="var(--pc-muted)" font-size="13" style="font-size: 13px">实现细节变动</text><rect x="280" y="160" width="340" height="52" rx="6" fill="var(--pc-surface)" stroke="var(--pc-accent)" stroke-width="1.5"/><text x="450.0" y="186" text-anchor="middle" fill="var(--pc-text)" font-size="17" style="font-size: 17px">&lt;ElectricCar.h&gt;</text><text x="450.0" y="209" text-anchor="middle" fill="var(--pc-muted)" font-size="13" style="font-size: 13px">业务代码的公开入口</text><rect x="24" y="244" width="220" height="52" rx="6" fill="var(--pc-surface)" stroke="var(--pc-bad)" stroke-width="1.5"/><text x="134.0" y="270" text-anchor="middle" fill="var(--pc-text)" font-size="17" style="font-size: 17px">业务 .cpp</text><text x="134.0" y="293" text-anchor="middle" fill="var(--pc-muted)" font-size="13" style="font-size: 13px">Recompile!</text><rect x="340" y="244" width="220" height="52" rx="6" fill="var(--pc-surface)" stroke="var(--pc-bad)" stroke-width="1.5"/><text x="450.0" y="270" text-anchor="middle" fill="var(--pc-text)" font-size="17" style="font-size: 17px">业务 .cpp × 数百</text><text x="450.0" y="293" text-anchor="middle" fill="var(--pc-muted)" font-size="13" style="font-size: 13px">Recompile!</text><rect x="656" y="244" width="220" height="52" rx="6" fill="var(--pc-surface)" stroke="var(--pc-bad)" stroke-width="1.5"/><text x="766.0" y="270" text-anchor="middle" fill="var(--pc-text)" font-size="17" style="font-size: 17px">业务 .cpp</text><text x="766.0" y="293" text-anchor="middle" fill="var(--pc-muted)" font-size="13" style="font-size: 13px">Recompile!</text>
</svg>
</div>

<div class="pc-muted text-sm">include 依赖向上；改动影响反向传播。私有布局变化可能造成 ABI Breakage。</div>

<div class="pc-next">编译防火墙隔离物理实现</div>

<!--
大纲 PPT 1：呈现方式：#include 爆炸传染树；重点内容：级联重编译与 ABI。

教学边界：依赖箭头指向被 include 的头文件；改动影响沿反方向传播。源图将数百个业务 .cpp 聚合为文字说明，不虚构业务文件名。
-->

---
ppt: 1
---

# 编译防火墙隔离物理实现

<div class="pc-svg-hero">
<svg viewBox="0 0 900 300" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="l3-firewall-title l3-firewall-desc">
<title id="l3-firewall-title">Compilation Firewall：Pimpl / Bridge</title>
<desc id="l3-firewall-desc">Compilation Firewall：Pimpl / Bridge；依赖箭头由使用方向指向被依赖方，空心三角表示继承。</desc>
<defs><marker id="l3-firewall-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M 0 0 L 10 5 L 0 10" fill="none" stroke="var(--pc-accent)" stroke-width="1.5"/></marker><marker id="l3-firewall-inherit" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="9" markerHeight="9" orient="auto"><path d="M 0 0 L 10 5 L 0 10 Z" fill="var(--pc-bg)" stroke="var(--pc-accent)" stroke-width="1.5"/></marker></defs>
<path d="M 408 80 L 450 64 L 492 80 V 116 Q 492 150 450 166 Q 408 150 408 116 Z" fill="var(--pc-surface)" stroke="var(--pc-good)" stroke-width="2"/><text x="450" y="112" text-anchor="middle" fill="var(--pc-good)" font-size="16" style="font-size: 16px">Pimpl</text><path d="M 616 116 H 492" fill="none" stroke="var(--pc-accent)" stroke-width="2" stroke-dasharray="5 4" marker-end="url(#l3-firewall-arrow)"/><path d="M 408 116 H 284" fill="none" stroke="var(--pc-accent)" stroke-width="2" stroke-dasharray="5 4" marker-end="url(#l3-firewall-arrow)"/><rect x="24" y="80" width="260" height="72" rx="6" fill="var(--pc-surface)" stroke="var(--pc-accent)" stroke-width="1.5"/><text x="154.0" y="106" text-anchor="middle" fill="var(--pc-text)" font-size="17" style="font-size: 17px">&lt;ElectricCar.h&gt;</text><text x="154.0" y="129" text-anchor="middle" fill="var(--pc-muted)" font-size="13" style="font-size: 13px">不再暴露实现布局</text><rect x="616" y="80" width="260" height="72" rx="6" fill="var(--pc-surface)" stroke="var(--pc-accent)" stroke-width="1.5"/><text x="746.0" y="106" text-anchor="middle" fill="var(--pc-text)" font-size="17" style="font-size: 17px">.cpp</text><text x="746.0" y="129" text-anchor="middle" fill="var(--pc-muted)" font-size="13" style="font-size: 13px">ElectricEngine / 实现细节</text><text x="270" y="228" text-anchor="start" fill="var(--pc-good)" font-size="20" style="font-size: 20px">Compilation Firewall (Pimpl / Bridge)</text>
</svg>
</div>

<div class="pc-next">Bridge 与 Pimpl 分离变化维度</div>

<!--
大纲 PPT 1：重点内容：实现细节隔离到 .cpp；呈现方式：防火墙盾牌。
-->

---
ppt: 2
---

# Bridge 与 Pimpl 分离变化维度

<div class="pc-svg-hero">
<svg viewBox="0 0 900 300" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="l3-pimpl-title l3-pimpl-desc">
<title id="l3-pimpl-title">Bridge 组合与 Pimpl 私有实现</title>
<desc id="l3-pimpl-desc">Bridge 组合与 Pimpl 私有实现；依赖箭头由使用方向指向被依赖方，空心三角表示继承。</desc>
<defs><marker id="l3-pimpl-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M 0 0 L 10 5 L 0 10" fill="none" stroke="var(--pc-accent)" stroke-width="1.5"/></marker><marker id="l3-pimpl-inherit" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="9" markerHeight="9" orient="auto"><path d="M 0 0 L 10 5 L 0 10 Z" fill="var(--pc-bg)" stroke="var(--pc-accent)" stroke-width="1.5"/></marker></defs>
<path d="M 324 90 H 564" fill="none" stroke="var(--pc-accent)" stroke-width="2" stroke-dasharray="5 4" marker-end="url(#l3-pimpl-arrow)"/><path d="M 564 234 H 324" fill="none" stroke="var(--pc-accent)" stroke-width="2" stroke-dasharray="5 4" marker-end="url(#l3-pimpl-arrow)"/><rect x="24" y="56" width="300" height="68" rx="6" fill="var(--pc-surface)" stroke="var(--pc-accent)" stroke-width="1.5"/><text x="174.0" y="82" text-anchor="middle" fill="var(--pc-text)" font-size="17" style="font-size: 17px">Car · Abstraction</text><text x="174.0" y="105" text-anchor="middle" fill="var(--pc-muted)" font-size="13" style="font-size: 13px">unique_ptr&lt;Engine&gt; pimpl_</text><rect x="564" y="56" width="312" height="68" rx="6" fill="var(--pc-surface)" stroke="var(--pc-accent)" stroke-width="1.5"/><text x="720.0" y="82" text-anchor="middle" fill="var(--pc-text)" font-size="17" style="font-size: 17px">Engine · Implementation</text><text x="720.0" y="105" text-anchor="middle" fill="var(--pc-muted)" font-size="13" style="font-size: 13px">独立变化</text><rect x="24" y="200" width="300" height="68" rx="6" fill="var(--pc-surface)" stroke="var(--pc-accent)" stroke-width="1.5"/><text x="174.0" y="226" text-anchor="middle" fill="var(--pc-text)" font-size="17" style="font-size: 17px">Person.h</text><text x="174.0" y="249" text-anchor="middle" fill="var(--pc-muted)" font-size="13" style="font-size: 13px">struct Impl; unique_ptr&lt;Impl&gt;</text><rect x="564" y="200" width="312" height="68" rx="6" fill="var(--pc-surface)" stroke="var(--pc-accent)" stroke-width="1.5"/><text x="720.0" y="226" text-anchor="middle" fill="var(--pc-text)" font-size="17" style="font-size: 17px">Person.cpp</text><text x="720.0" y="249" text-anchor="middle" fill="var(--pc-muted)" font-size="13" style="font-size: 13px">Person::Impl 完整定义</text>
</svg>
</div>

<div class="pc-next">头文件只声明不完整类型</div>

<!--
* 逐行剖析那个困扰无数中级 C++ 程序员的编译报错：“我明明用了 `std::unique_ptr` 自动管理内存，为什么用了 Pimpl 后一编译就报 `invalid application of 'sizeof' to incomplete type`？”——因为你没在 `.cpp` 里定义析构函数！把这个原理讲透，学员对模板实例化时机与编译单元的理解会瞬间上一个新的台阶。
  * 顺带对比 **Bridge（结构型模式）** 与 **Strategy（行为型模式）** 的区别（Iglberger 第 7 章）：虽然代码看起来都有个指针，但 Strategy 的指针是从外部构造函数注入的（旨在解耦逻辑行为），而 Bridge/Pimpl 的指针通常是在类内部自己创建的（旨在斩断物理编译依赖）。

教学边界：上行是对象组合／使用关系，下行是实现文件对公开头文件的编译依赖。Bridge 与 Pimpl 的指针结构相似，不等于所有使用指针的设计都是同一种意图。
-->

---
ppt: 2
---

# 头文件只声明不完整类型

<div class="[&_pre]:whitespace-pre-wrap [&_code]:!whitespace-pre-wrap [&_code]:!break-normal [&_code]:[overflow-wrap:anywhere]">

```cpp
// ---- <Person.h> (极致纯净，零多余 #include，ABI 绝对稳定) ----
#include <memory>
class Person {
public:
    Person();
    ~Person();                              // ⚠️ 仅声明！绝不可在头文件中 = default
    Person(Person const& other);            // 深拷贝声明
    Person& operator=(Person const& other);
    Person(Person&& other) noexcept;
    Person& operator=(Person&& other) noexcept;
    int year_of_birth() const;
private:
    struct Impl;                            // 前向声明（Incomplete Type）
    std::unique_ptr<Impl> pimpl_;           // 固定 8 字节大小！
};
```

</div>

<div class="pc-next">在 Impl 完整后定义析构函数</div>

<!--
大纲 PPT 2：呈现方式：Person.h 原代码。

教学边界：大纲原注释“ABI 绝对稳定”“固定 8 字节”按原样保留，但它们不是标准保证：指针／unique_ptr 大小与平台、删除器和 ABI 有关；公开接口、编译器、标准库 ABI 等变化仍可破坏兼容性。
-->

---
ppt: 2
---

# 在 Impl 完整后定义析构函数

<div class="[&_pre]:whitespace-pre-wrap [&_code]:!whitespace-pre-wrap [&_code]:!break-normal [&_code]:[overflow-wrap:anywhere]">

```cpp
// ---- <Person.cpp> (隐藏所有头文件与实现细节) ----
#include <Person.h>
#include <string>
struct Person::Impl { std::string forename, surname, address; int year_of_birth; };
Person::Person() : pimpl_(std::make_unique<Impl>()) {}
Person::~Person() = default;                // ✅ 此时 Impl 已是完整类型，安全析构！
Person::Person(Person const& other) : pimpl_(std::make_unique<Impl>(*other.pimpl_)) {}
```

</div>

<div class="pc-next">Rule of 5 必须管理完整类型</div>

<!--
大纲 PPT 2：呈现方式：Person.cpp 原代码。

教学边界：大纲为范式片段，不是完整程序：拷贝赋值、移动操作与 year_of_birth() 只给出声明；从已移走对象拷贝前必须定义空状态策略，不能无条件解引用空 pimpl_。
-->

---
ppt: 2
---

# Rule of 5 必须管理完整类型

<div class="grid grid-cols-2 gap-4">
<div>

### Person.h · 声明与布局

<div class="[&_pre]:whitespace-pre-wrap [&_code]:!whitespace-pre-wrap [&_code]:!break-normal [&_code]:[overflow-wrap:anywhere]">

```cpp
~Person();
Person(Person const& other);
Person& operator=(Person const& other);
Person(Person&& other) noexcept;
Person& operator=(Person&& other) noexcept;
struct Impl;
std::unique_ptr<Impl> pimpl_;
```

</div>

</div>
<div>

### Person.cpp · Impl 完整后

<div class="[&_pre]:whitespace-pre-wrap [&_code]:!whitespace-pre-wrap [&_code]:!break-normal [&_code]:[overflow-wrap:anywhere]">

```cpp
Person::Person() : pimpl_(std::make_unique<Impl>()) {}
Person::~Person() = default;
Person::Person(Person const& other) : pimpl_(std::make_unique<Impl>(*other.pimpl_)) {}
```

</div>

<div class="pc-muted text-sm">关键声明／定义对照；完整原始范式见前两页。</div>

</div>
</div>

<v-clicks>

- .h 声明析构；.cpp 定义析构
- 拷贝构造与赋值需显式实现
- 深拷贝 *other.pimpl_
- 移动操作管理原资源与完整类型

</v-clicks>

<div class="pc-next">Pimpl 用运行成本换取编译边界</div>

<!--
大纲 PPT 2：重点内容：析构陷阱与拷贝／移动语义。

[click] 头文件内生成默认析构可能实例化不完整 Impl 的删除逻辑。
[click] 深拷贝必须知道 Impl 完整定义。
[click] 拷贝赋值同样要确定异常安全与空状态策略。
[click] 移动赋值会销毁旧资源，也应在能看到完整类型的位置定义。
-->

---
ppt: 3
---

# Pimpl 用运行成本换取编译边界

<v-clicks>

- 成员访问增加指针间接解引用
- 构造伴随动态堆分配（make_unique）
- 跨编译单元内联受限（除非 LTO）
- 增加 8 字节指针开销（大纲示例）

</v-clicks>

<div class="pc-next">冷热分离改善缓存行利用率</div>

<!--
* 这是一个极具颠覆性的架构性能案例！常规思维认为“加一层 Pimpl 指针肯定会变慢（如 `Person2` 慢了 11%~13%）”。
  * 但当我们运用数据导向设计（Data-Oriented Design）的冷热分离思想，把 Pimpl 改造成 **Partial Pimpl（`Person3`）** 时，主对象大小直接缩减了一半多（刚好塞进一个 64 字节 Cache Line），CPU 缓存命中率飙升，**不仅享受了 Pimpl 隐藏冷数据物理依赖的好处，性能反而比不加 Pimpl 的原始类还快了 14%！**

[click] 成员访问需要间接寻址。
[click] 默认堆分配实现带来分配成本。
[click] 跨编译单元内联通常需要 LTO 等优化。
[click] 8 字节是大纲示例，不是所有 ABI 的固定值。
-->

---
ppt: 3
---

# 冷热分离改善缓存行利用率

<div class="pc-svg-hero">
<svg viewBox="0 0 900 300" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="l3-cache-title l3-cache-desc">
<title id="l3-cache-title">CPU 缓存行利用率示意</title>
<desc id="l3-cache-desc">CPU 缓存行利用率示意；依赖箭头由使用方向指向被依赖方，空心三角表示继承。</desc>
<defs><marker id="l3-cache-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M 0 0 L 10 5 L 0 10" fill="none" stroke="var(--pc-accent)" stroke-width="1.5"/></marker><marker id="l3-cache-inherit" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="9" markerHeight="9" orient="auto"><path d="M 0 0 L 10 5 L 0 10 Z" fill="var(--pc-bg)" stroke="var(--pc-accent)" stroke-width="1.5"/></marker></defs>
<text x="24" y="89" text-anchor="start" fill="var(--pc-text)" font-size="16" style="font-size: 16px">Person1 · 64 B Cache Line</text><rect x="360" y="64" width="512" height="48" fill="var(--pc-surface)" stroke="var(--pc-border)"/><line x1="360" y1="64" x2="360" y2="112" stroke="var(--pc-border)"/><line x1="424" y1="64" x2="424" y2="112" stroke="var(--pc-border)"/><line x1="488" y1="64" x2="488" y2="112" stroke="var(--pc-border)"/><line x1="552" y1="64" x2="552" y2="112" stroke="var(--pc-border)"/><line x1="616" y1="64" x2="616" y2="112" stroke="var(--pc-border)"/><line x1="680" y1="64" x2="680" y2="112" stroke="var(--pc-border)"/><line x1="744" y1="64" x2="744" y2="112" stroke="var(--pc-border)"/><line x1="808" y1="64" x2="808" y2="112" stroke="var(--pc-border)"/><line x1="872" y1="64" x2="872" y2="112" stroke="var(--pc-border)"/><rect x="360" y="64" width="32" height="48" fill="var(--pc-good)" opacity="0.35"/><text x="360" y="139" text-anchor="start" fill="var(--pc-muted)" font-size="14" style="font-size: 14px">4 B year_of_birth；其余为冷数据</text><text x="24" y="217" text-anchor="start" fill="var(--pc-text)" font-size="16" style="font-size: 16px">Person3 · Partial Pimpl</text><rect x="360" y="192" width="512" height="48" fill="var(--pc-surface)" stroke="var(--pc-border)"/><line x1="360" y1="192" x2="360" y2="240" stroke="var(--pc-border)"/><line x1="424" y1="192" x2="424" y2="240" stroke="var(--pc-border)"/><line x1="488" y1="192" x2="488" y2="240" stroke="var(--pc-border)"/><line x1="552" y1="192" x2="552" y2="240" stroke="var(--pc-border)"/><line x1="616" y1="192" x2="616" y2="240" stroke="var(--pc-border)"/><line x1="680" y1="192" x2="680" y2="240" stroke="var(--pc-border)"/><line x1="744" y1="192" x2="744" y2="240" stroke="var(--pc-border)"/><line x1="808" y1="192" x2="808" y2="240" stroke="var(--pc-border)"/><line x1="872" y1="192" x2="872" y2="240" stroke="var(--pc-border)"/><rect x="360" y="192" width="512" height="48" fill="var(--pc-good)" opacity="0.35"/><text x="360" y="267" text-anchor="start" fill="var(--pc-muted)" font-size="14" style="font-size: 14px">热数据与 pimpl_ 紧凑；冷数据移至 Impl</text>
</svg>
</div>

<div class="pc-muted text-sm">Person1：6 个 string + 1 个 int；只读 year_of_birth 时约 94% 带宽用于冷数据。</div>

<div class="pc-next">Partial Pimpl 的收益依赖工作负载</div>

<!--
大纲 PPT 3：呈现方式：CPU 缓存行对比；重点内容：Partial Pimpl。

教学边界：图是大纲 64 B 缓存行利用示意，不承诺各实现的精确字段偏移。大纲 Person1 有 6 个 string + 1 个 int，152~200 B；遍历 25,000 个 Person 时只读 year_of_birth，4/64=6.25%，约 94% 无用。Person3 的 GCC 大小仍是 80 B，不一定恰好装入一条缓存行。
-->

---
ppt: 3
---

# Partial Pimpl 的收益依赖工作负载

<div class="pc-tag mb-3">来源：大纲引述 Iglberger 第 7 章 · 25,000 个 Person 查找最年长者</div>

| 实现方案 | 对象大小 (Clang / GCC) | GCC 11.1 归一化耗时 | Clang 11.1 归一化耗时 | 性能评价 |
| :--- | :--- | :--- | :--- | :--- |
| `Person1` (传统类，无 Pimpl) | 152 B / 200 B | `1.000` (基准) | `1.000` (基准) | 缓存行严重浪费 |
| `Person2` (全量 Pimpl) | 8 B (+堆块) | `1.110` (-11.0%) | `1.131` (-13.1%) | 指针跳转拖累性能 |
| **`Person3` (Partial Pimpl)** | **64 B / 80 B** | **`0.860` (+14.0% 提速!)** | **`0.935` (+6.5% 提速!)** | **热数据紧凑，超越传统类！** |

<div class="pc-next">Fast-Pimpl 消除默认堆分配</div>

<!--
大纲 PPT 3：呈现方式：Clang／GCC 大小与归一化耗时原表。

教学边界：原表“+14.0% 提速”描述的是归一化耗时减少 14%，严格的吞吐率增幅应另行计算；不改写原表标签。152 B / 200 B、64 B / 80 B 的平台差异也必须同时解释。所有数据为大纲引述，未在本仓库重新跑基准。
-->

---
ppt: 3
---

# Fast-Pimpl 消除默认堆分配

<div class="grid grid-cols-2 gap-4 mt-4">
<div class="pc-card info"><h3>Partial Pimpl</h3><p class="pc-card-lead">forename / surname / year_of_birth 留在主类<br>address / city / zip 移入 Impl</p></div>
<div class="pc-card info"><h3>Fast-Pimpl</h3><p class="pc-card-lead">alignas + std::array&lt;std::byte, Size&gt;<br>对象内部预留存储，牺牲部分 ABI 弹性</p></div>
</div>

<div class="pc-next">高层拥有需求，低层提供实现</div>

<!--
大纲 PPT 3：重点内容：冷热数据名单；Fast-Pimpl。

教学边界：内部缓冲区随对象位于栈、堆或容器中，不能把“对象内部存储”无条件等同于栈内存；大小、对齐、生命周期及移动策略需要显式管理。
-->

---
ppt: 4
---

# 高层拥有需求，低层提供实现

<div class="grid grid-cols-2 gap-4 mt-4">
<div class="pc-card info"><h3>High Level</h3><p class="pc-card-lead">核心业务规则、领域策略<br>高稳定性、低依赖性</p></div>
<div class="pc-card info"><h3>Low Level</h3><p class="pc-card-lead">UI、数据库、外设驱动、第三方插件<br>高易变性、高依赖性</p></div>
</div>
<Callout type="info" title="Robert C. Martin · DIP">

高层与低层都依赖抽象；抽象不依赖细节，细节依赖抽象。

</Callout>

<div class="pc-next">抽象放错包，依赖仍然向下</div>

<!--
* **重点强调：这是整个课程中最核心的一张架构幻灯片！** 很多高级工程师写了十年接口，却从来没思考过“接口头文件到底应该放在哪个目录/哪个 CMake Target 里”。
  * 记住这条铁律：**谁提出需求，谁就拥有抽象接口（Client Owns the Interface）**。就像 STL 的 `std::copy_if` 定义并拥有迭代器 Concept 契约，你的自定义容器去迎合它的契约；你的核心主程序 `Editor` 定义并拥有 `Plugin` 接口，全世界的插件开发者去 `#include` 你的接口。这才是真正的依赖倒置！
-->

---
ppt: 4
---

# 抽象放错包，依赖仍然向下

<div class="pc-svg-hero">
<svg viewBox="0 0 900 300" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="l3-dip-title l3-dip-desc">
<title id="l3-dip-title">DIP 三阶段架构演进</title>
<desc id="l3-dip-desc">DIP 三阶段架构演进；依赖箭头由使用方向指向被依赖方，空心三角表示继承。</desc>
<defs><marker id="l3-dip-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M 0 0 L 10 5 L 0 10" fill="none" stroke="var(--pc-accent)" stroke-width="1.5"/></marker><marker id="l3-dip-inherit" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="9" markerHeight="9" orient="auto"><path d="M 0 0 L 10 5 L 0 10 Z" fill="var(--pc-bg)" stroke="var(--pc-accent)" stroke-width="1.5"/></marker></defs>
<text x="16" y="24" text-anchor="start" fill="var(--pc-text)" font-size="18" style="font-size: 18px">架构腐化</text><rect x="16" y="44" width="280" height="104" rx="6" fill="none" stroke="var(--pc-border)" stroke-dasharray="5 4"/><rect x="16" y="180" width="280" height="104" rx="6" fill="none" stroke="var(--pc-border)" stroke-dasharray="5 4"/><text x="24" y="64" text-anchor="start" fill="var(--pc-muted)" font-size="13" style="font-size: 13px">High Level</text><text x="24" y="200" text-anchor="start" fill="var(--pc-muted)" font-size="13" style="font-size: 13px">Low Level</text><path d="M 156 136 V 220" fill="none" stroke="var(--pc-accent)" stroke-width="2" stroke-dasharray="5 4" marker-end="url(#l3-dip-arrow)"/><rect x="40" y="76" width="232" height="60" rx="6" fill="var(--pc-surface)" stroke="var(--pc-accent)" stroke-width="1.5"/><text x="156.0" y="102" text-anchor="middle" fill="var(--pc-text)" font-size="17" style="font-size: 17px">Editor</text><rect x="40" y="220" width="232" height="56" rx="6" fill="var(--pc-surface)" stroke="var(--pc-accent)" stroke-width="1.5"/><text x="156.0" y="246" text-anchor="middle" fill="var(--pc-text)" font-size="17" style="font-size: 17px">VimModePlugin</text><text x="316" y="24" text-anchor="start" fill="var(--pc-text)" font-size="18" style="font-size: 18px">伪 DIP · 局部反转</text><rect x="316" y="44" width="280" height="104" rx="6" fill="none" stroke="var(--pc-border)" stroke-dasharray="5 4"/><rect x="316" y="180" width="280" height="104" rx="6" fill="none" stroke="var(--pc-border)" stroke-dasharray="5 4"/><text x="324" y="64" text-anchor="start" fill="var(--pc-muted)" font-size="13" style="font-size: 13px">High Level</text><text x="324" y="200" text-anchor="start" fill="var(--pc-muted)" font-size="13" style="font-size: 13px">Low Level</text><path d="M 388 136 V 220" fill="none" stroke="var(--pc-accent)" stroke-width="2" stroke-dasharray="5 4" marker-end="url(#l3-dip-arrow)"/><path d="M 548 246 H 464" fill="none" stroke="var(--pc-accent)" stroke-width="2" marker-end="url(#l3-dip-inherit)"/><rect x="340" y="76" width="232" height="60" rx="6" fill="var(--pc-surface)" stroke="var(--pc-accent)" stroke-width="1.5"/><text x="456.0" y="102" text-anchor="middle" fill="var(--pc-text)" font-size="17" style="font-size: 17px">Editor</text><rect x="324" y="220" width="140" height="56" rx="6" fill="var(--pc-surface)" stroke="var(--pc-accent)" stroke-width="1.5"/><text x="394.0" y="246" text-anchor="middle" fill="var(--pc-text)" font-size="17" style="font-size: 17px">Plugin</text><rect x="480" y="220" width="108" height="56" rx="6" fill="var(--pc-surface)" stroke="var(--pc-accent)" stroke-width="1.5"/><text x="534.0" y="246" text-anchor="middle" fill="var(--pc-text)" font-size="14" style="font-size: 14px">VimModePlugin</text><text x="616" y="24" text-anchor="start" fill="var(--pc-text)" font-size="18" style="font-size: 18px">真 DIP · 全局反转</text><rect x="616" y="44" width="280" height="104" rx="6" fill="none" stroke="var(--pc-border)" stroke-dasharray="5 4"/><rect x="616" y="180" width="280" height="104" rx="6" fill="none" stroke="var(--pc-border)" stroke-dasharray="5 4"/><text x="624" y="64" text-anchor="start" fill="var(--pc-muted)" font-size="13" style="font-size: 13px">High Level</text><text x="624" y="200" text-anchor="start" fill="var(--pc-muted)" font-size="13" style="font-size: 13px">Low Level</text><path d="M 732 106 H 772" fill="none" stroke="var(--pc-accent)" stroke-width="2" stroke-dasharray="5 4" marker-end="url(#l3-dip-arrow)"/><path d="M 832 220 V 136" fill="none" stroke="var(--pc-accent)" stroke-width="2" marker-end="url(#l3-dip-inherit)"/><rect x="624" y="76" width="108" height="60" rx="6" fill="var(--pc-surface)" stroke="var(--pc-accent)" stroke-width="1.5"/><text x="678.0" y="102" text-anchor="middle" fill="var(--pc-text)" font-size="17" style="font-size: 17px">Editor</text><rect x="772" y="76" width="116" height="60" rx="6" fill="var(--pc-surface)" stroke="var(--pc-accent)" stroke-width="1.5"/><text x="830.0" y="102" text-anchor="middle" fill="var(--pc-text)" font-size="17" style="font-size: 17px">Plugin</text><rect x="640" y="220" width="232" height="56" rx="6" fill="var(--pc-surface)" stroke="var(--pc-accent)" stroke-width="1.5"/><text x="756.0" y="246" text-anchor="middle" fill="var(--pc-text)" font-size="17" style="font-size: 17px">VimModePlugin</text>
</svg>
</div>

<div class="pc-next">高层定义并拥有 Plugin 接口</div>

<!--
大纲 PPT 4：呈现方式：腐化、局部反转、全局反转三阶段图。

教学边界：图中的 High Level 与 Low Level 是模块所有权边界；箭头从依赖方指向契约，第三图的跨边界箭头向上。
-->

---
ppt: 4
---

# 高层定义并拥有 Plugin 接口

| 抽象所在模块 | Editor 的 include | 结果 |
| :--- | :--- | :--- |
| 底层第三方插件包 | `#include <thirdparty/Plugin.h>` | 仍跨边界依赖底层 |
| 高层需求模块 | `#include <yourcode/Plugin.h>` | 插件反向包含高层头文件 |

<div class="pc-card info mt-4"><h3>Ownership of Abstractions</h3><p class="pc-card-lead">Plugin 表示高层对底层提出的需求契约。</p></div>

<div class="pc-next">const 视图不等于深层 const</div>

<!--
大纲 PPT 4：重点内容：抽象所有权、插件接口的物理位置。
-->

---
ppt: 5
---

# const 视图不等于深层 const

<div class="[&_pre]:whitespace-pre-wrap [&_code]:!whitespace-pre-wrap [&_code]:!break-normal [&_code]:[overflow-wrap:anywhere]">

```cpp
std::span<int> const s{v};
s[2] = 99;
```

</div><div class="grid grid-cols-2 gap-4 mt-4">
<div class="pc-card info"><h3>浅层 const</h3><p class="pc-card-lead">相当于 int* const；元素仍可修改</p></div>
<div class="pc-card info"><h3>悬空视图</h3><p class="pc-card-lead">原 vector 扩容重分配后，span 失效；使用会触发 UB</p></div>
</div>

<div class="pc-muted text-sm">nullptr · 生命周期纠缠 · Dangling references · 数据竞争 · 碎片化堆内存</div>

<div class="pc-next">remove 的 value 可能别名到容器</div>

<!--
* 用 `std::remove` + `std::max_element` 这个连标准库老手都会栽跟头的经典 Bug，给学员留下一生难忘的教训：哪怕只是一个看似无害的 `const T&` 引用参数，在别名（Aliasing）和状态变更面前也会变成定时炸弹！
  * 引用 Sean Parent 的核心思想：C++ 与 Java/C# 最大的不同，就是 C++ 从骨子里支持真正的**值语义**。在现代 C++ 架构设计中，我们的终极追求就是：**对外暴露如 `int` 一般简单安全的值类型接口，将多态与指针彻底封印在类的内部**。

教学边界：指针与引用还带来 nullptr、生命周期纠缠、悬空引用、数据竞争及碎片化堆内存等风险；这不是禁止一切借用，而是要求显式管理借用边界。
-->

---
ppt: 5
---

# remove 的 value 可能别名到容器

<div class="[&_pre]:whitespace-pre-wrap [&_code]:!whitespace-pre-wrap [&_code]:!break-normal [&_code]:[overflow-wrap:anywhere]">

```cpp
auto const pos = std::max_element(begin(vec), end(vec)); // 指向第一个最大值 42
vec.erase(std::remove(begin(vec), end(vec), *pos), end(vec)); // 💥 Bug!
```

</div>

<div class="pc-next">覆盖元素会改变后续删除目标</div>

<!--
大纲 PPT 5：重点内容：std::remove 原始反例；呈现方式：灾难现场。

教学边界：先检查容器非空，才可解引用 max_element 的结果；反例中 T const& value 与容器元素存在别名。
-->

---
ppt: 5
---

# 覆盖元素会改变后续删除目标

<div class="pc-svg-hero">
<svg viewBox="0 0 900 300" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="l3-remove-title l3-remove-desc">
<title id="l3-remove-title">std::remove 别名步进</title>
<desc id="l3-remove-desc">std::remove 别名步进；依赖箭头由使用方向指向被依赖方，空心三角表示继承。</desc>
<defs><marker id="l3-remove-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M 0 0 L 10 5 L 0 10" fill="none" stroke="var(--pc-accent)" stroke-width="1.5"/></marker><marker id="l3-remove-inherit" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="9" markerHeight="9" orient="auto"><path d="M 0 0 L 10 5 L 0 10 Z" fill="var(--pc-bg)" stroke="var(--pc-accent)" stroke-width="1.5"/></marker></defs>
<g><text x="24" y="64" text-anchor="start" fill="var(--pc-text)" font-size="16" style="font-size: 16px">pos → 42</text><rect x="420" y="36" width="72" height="44" fill="var(--pc-surface)" stroke="var(--pc-border)"/><text x="456" y="65" text-anchor="middle" fill="var(--pc-text)" font-size="20" style="font-size: 20px">1</text><rect x="500" y="36" width="72" height="44" fill="var(--pc-surface)" stroke="var(--pc-bad)"/><text x="536" y="65" text-anchor="middle" fill="var(--pc-text)" font-size="20" style="font-size: 20px">42</text><rect x="580" y="36" width="72" height="44" fill="var(--pc-surface)" stroke="var(--pc-border)"/><text x="616" y="65" text-anchor="middle" fill="var(--pc-text)" font-size="20" style="font-size: 20px">4</text><rect x="660" y="36" width="72" height="44" fill="var(--pc-surface)" stroke="var(--pc-border)"/><text x="696" y="65" text-anchor="middle" fill="var(--pc-text)" font-size="20" style="font-size: 20px">42</text><rect x="740" y="36" width="72" height="44" fill="var(--pc-surface)" stroke="var(--pc-border)"/><text x="776" y="65" text-anchor="middle" fill="var(--pc-text)" font-size="20" style="font-size: 20px">4</text></g><g v-click="1"><text x="24" y="156" text-anchor="start" fill="var(--pc-bad)" font-size="16" style="font-size: 16px">4 覆盖索引 1；pos → 4</text><rect x="420" y="128" width="72" height="44" fill="var(--pc-surface)" stroke="var(--pc-border)"/><text x="456" y="157" text-anchor="middle" fill="var(--pc-text)" font-size="20" style="font-size: 20px">1</text><rect x="500" y="128" width="72" height="44" fill="var(--pc-surface)" stroke="var(--pc-bad)"/><text x="536" y="157" text-anchor="middle" fill="var(--pc-text)" font-size="20" style="font-size: 20px">4</text><rect x="580" y="128" width="72" height="44" fill="var(--pc-surface)" stroke="var(--pc-border)"/><text x="616" y="157" text-anchor="middle" fill="var(--pc-text)" font-size="20" style="font-size: 20px">4</text><rect x="660" y="128" width="72" height="44" fill="var(--pc-surface)" stroke="var(--pc-border)"/><text x="696" y="157" text-anchor="middle" fill="var(--pc-text)" font-size="20" style="font-size: 20px">42</text><rect x="740" y="128" width="72" height="44" fill="var(--pc-surface)" stroke="var(--pc-border)"/><text x="776" y="157" text-anchor="middle" fill="var(--pc-text)" font-size="20" style="font-size: 20px">4</text></g><g v-click="2"><text x="24" y="248" text-anchor="start" fill="var(--pc-text)" font-size="16" style="font-size: 16px">有效结果：[1, 4, 42]</text><rect x="420" y="220" width="72" height="44" fill="var(--pc-surface)" stroke="var(--pc-border)"/><text x="456" y="249" text-anchor="middle" fill="var(--pc-text)" font-size="20" style="font-size: 20px">1</text><rect x="500" y="220" width="72" height="44" fill="var(--pc-surface)" stroke="var(--pc-bad)"/><text x="536" y="249" text-anchor="middle" fill="var(--pc-text)" font-size="20" style="font-size: 20px">4</text><rect x="580" y="220" width="72" height="44" fill="var(--pc-surface)" stroke="var(--pc-border)"/><text x="616" y="249" text-anchor="middle" fill="var(--pc-text)" font-size="20" style="font-size: 20px">42</text></g>
</svg>
</div>

<div class="pc-next">先复制独立值，再调用修改算法</div>

<!--
大纲 PPT 5：呈现方式：数组 [1,42,4,42,4]、pos 突变与动画。

教学边界：大纲焦点描述“误删所有 4”过于概括：给定数组在典型标准库实现中的最终有效结果是 [1,4,42]，已经前移的 4 仍保留。此图按算法逐步演算，不把源描述直接画成错误结果。

[click] 把索引 2 的 4 移到索引 1 后，别名 value 从 42 变成 4。
[click] 后续 42 不再匹配新的 value，典型 remove 实现最终保留 [1,4,42]。
-->

---
ppt: 5
---

# 先复制独立值，再调用修改算法

<div class="[&_pre]:whitespace-pre-wrap [&_code]:!whitespace-pre-wrap [&_code]:!break-normal [&_code]:[overflow-wrap:anywhere]">

```cpp
auto const greatest = *pos;
```

</div>

| 值语义特征 | 收益 |
| :--- | :--- |
| Deep copy | 独立所有权 |
| Deep constness | 深层 const 传递 |
| No spooky action at a distance | 局部修改不产生远程副作用 |
| `std::optional<int>` | 替代返回裸指针／输出参数 |

<div class="pc-next">多态行为从业务数据类中剥离</div>

<!--
大纲 PPT 5：重点内容：值语义四项收益与 optional；呈现方式：greatest 修复。

教学边界：复制 greatest 后，用独立值作为 remove 的第三实参。value semantics 要由具体类型及其成员实现保证，并非任意自称“值包装器”的类型都自动获得深 const 或无别名。
-->

---
ppt: 6
---

# 多态行为从业务数据类中剥离

<div class="pc-svg-hero">
<svg viewBox="0 0 900 300" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="l3-external-title l3-external-desc">
<title id="l3-external-title">External Polymorphism 双组件架构</title>
<desc id="l3-external-desc">External Polymorphism 双组件架构；依赖箭头由使用方向指向被依赖方，空心三角表示继承。</desc>
<defs><marker id="l3-external-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M 0 0 L 10 5 L 0 10" fill="none" stroke="var(--pc-accent)" stroke-width="1.5"/></marker><marker id="l3-external-inherit" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="9" markerHeight="9" orient="auto"><path d="M 0 0 L 10 5 L 0 10 Z" fill="var(--pc-bg)" stroke="var(--pc-accent)" stroke-width="1.5"/></marker></defs>
<path d="M 460 132 V 84" fill="none" stroke="var(--pc-accent)" stroke-width="2" marker-end="url(#l3-external-inherit)"/><path d="M 360 196 V 220 Q 360 228 352 228 H 284" fill="none" stroke="var(--pc-accent)" stroke-width="2" stroke-dasharray="5 4" marker-end="url(#l3-external-arrow)"/><path d="M 560 196 V 220 Q 560 228 568 228 H 616" fill="none" stroke="var(--pc-accent)" stroke-width="2" stroke-dasharray="5 4" marker-end="url(#l3-external-arrow)"/><rect x="320" y="20" width="280" height="64" rx="6" fill="var(--pc-surface)" stroke="var(--pc-accent)" stroke-width="1.5"/><text x="460.0" y="46" text-anchor="middle" fill="var(--pc-text)" font-size="17" style="font-size: 17px">ShapeConcept</text><text x="460.0" y="69" text-anchor="middle" fill="var(--pc-muted)" font-size="13" style="font-size: 13px">virtual draw() const</text><rect x="280" y="132" width="360" height="64" rx="6" fill="var(--pc-surface)" stroke="var(--pc-accent)" stroke-width="1.5"/><text x="460.0" y="158" text-anchor="middle" fill="var(--pc-text)" font-size="17" style="font-size: 17px">ShapeModel&lt;ShapeT, DrawStrategy&gt;</text><text x="460.0" y="181" text-anchor="middle" fill="var(--pc-muted)" font-size="13" style="font-size: 13px">唯一继承自 ShapeConcept 的模板</text><rect x="24" y="232" width="260" height="64" rx="6" fill="var(--pc-surface)" stroke="var(--pc-accent)" stroke-width="1.5"/><text x="154.0" y="258" text-anchor="middle" fill="var(--pc-text)" font-size="17" style="font-size: 17px">ShapeT shape_</text><text x="154.0" y="281" text-anchor="middle" fill="var(--pc-muted)" font-size="13" style="font-size: 13px">Circle / Square / int</text><rect x="616" y="232" width="260" height="64" rx="6" fill="var(--pc-surface)" stroke="var(--pc-accent)" stroke-width="1.5"/><text x="746.0" y="258" text-anchor="middle" fill="var(--pc-text)" font-size="17" style="font-size: 17px">DrawStrategy drawer_</text><text x="746.0" y="281" text-anchor="middle" fill="var(--pc-muted)" font-size="13" style="font-size: 13px">转发绘制调用</text>
</svg>
</div>

<div class="pc-next">纯数据类不再继承 Shape</div>

<!--
* 告诉学员：这是整个现代 C++ 架构设计中最激动人心的一跃！在传统 OOP 里，“多态性”是刻在类骨子里的基因（必须从生下来就继承 `Shape`）；而在 External Polymorphism 里，**“多态性”变成了一件随时可以穿上和脱下的外套**！
  * 现场演示一个脑洞大开的例子：只要你写一个 `void draw(int)` 函数，你甚至可以用 `std::make_unique<ShapeModel<int>>(42)` 把一个 `int` 塞进 `ShapeConcept` 数组里跟圆和正方形一起画出来！这证明了我们的多态体系实现了真正的**零侵入（100% Non-intrusive）**。
-->

---
ppt: 6
---

# 纯数据类不再继承 Shape

<div class="[&_pre]:whitespace-pre-wrap [&_code]:!whitespace-pre-wrap [&_code]:!break-normal [&_code]:[overflow-wrap:anywhere]">

```cpp
// 1. 纯粹的几何数据类：无基类、无虚函数、零图形库依赖！
class Circle { double radius_; /*...*/ };
class Square { double side_;   /*...*/ };

// 2. 外部多态桥接层：将非多态类型适配进多态体系
class ShapeConcept {
public:
    virtual ~ShapeConcept() = default;
    virtual void draw() const = 0;
};
```

</div>

<div class="pc-next">Model 按值组合数据与策略</div>

<!--
大纲 PPT 6：呈现方式：Circle、Square、ShapeConcept 原代码。

教学边界：ShapeConcept 是外部适配层的虚接口；Circle 与 Square 不受该继承要求侵入。
-->

---
ppt: 6
---

# Model 按值组合数据与策略

<div class="[&_pre]:whitespace-pre-wrap [&_code]:!whitespace-pre-wrap [&_code]:!break-normal [&_code]:[overflow-wrap:anywhere]">

```cpp
template <typename ShapeT, typename DrawStrategy>
class ShapeModel : public ShapeConcept {
public:
    explicit ShapeModel(ShapeT shape, DrawStrategy drawer)
        : shape_(std::move(shape)), drawer_(std::move(drawer)) {}
    void draw() const override { drawer_(shape_); }
private:
    ShapeT shape_;
    DrawStrategy drawer_;
};
```

</div>

<div class="pc-next">无关类型也能参与运行时多态</div>

<!--
大纲 PPT 6：呈现方式：ShapeModel 完整模板原代码。
-->

---
ppt: 6
---

# 无关类型也能参与运行时多态

<div class="grid grid-cols-2 gap-4 mt-4">
<div class="pc-card info"><h3>数据类型无公共基类</h3><p class="pc-card-lead">第三方闭源类、内置 int 都可适配</p></div>
<div class="pc-card info"><h3>统一运行时契约</h3><p class="pc-card-lead">ShapeConcept + ShapeModel&lt;ShapeT, DrawStrategy&gt;</p></div>
</div>
<div class="pc-tag mt-6">External Polymorphism · Cleeland et al., 1996</div>

<div class="pc-next">Prototype 提供虚拟拷贝构造</div>

<!--
大纲 PPT 6：重点内容：零侵入、运行时处理与来源。

教学边界：原演讲要点的 ShapeModel<int> 调用是概念性简写，本课完整模板需要 ShapeT 与 DrawStrategy 两个参数，实际构造也须传入数据和策略。不将该简写当作可直接编译示例。
-->

---
ppt: 7
---

# Prototype 提供虚拟拷贝构造

<div class="pc-svg-hero">
<svg viewBox="0 0 900 300" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="l3-dolly-title l3-dolly-desc">
<title id="l3-dolly-title">Dolly 克隆隐喻：独立副本</title>
<desc id="l3-dolly-desc">Dolly 克隆隐喻：独立副本；依赖箭头由使用方向指向被依赖方，空心三角表示继承。</desc>
<defs><marker id="l3-dolly-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M 0 0 L 10 5 L 0 10" fill="none" stroke="var(--pc-accent)" stroke-width="1.5"/></marker><marker id="l3-dolly-inherit" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="9" markerHeight="9" orient="auto"><path d="M 0 0 L 10 5 L 0 10 Z" fill="var(--pc-bg)" stroke="var(--pc-accent)" stroke-width="1.5"/></marker></defs>
<path d="M 316 136 H 560" fill="none" stroke="var(--pc-accent)" stroke-width="2" stroke-dasharray="5 4" marker-end="url(#l3-dolly-arrow)"/><ellipse cx="200" cy="136" rx="92" ry="48" fill="var(--pc-surface)" stroke="var(--pc-accent)" stroke-width="2"/><ellipse cx="288" cy="120" rx="24" ry="32" fill="var(--pc-surface)" stroke="var(--pc-accent)" stroke-width="2"/><path d="M 152 174 V 212" stroke="var(--pc-accent)" stroke-width="5"/><path d="M 248 174 V 212" stroke="var(--pc-accent)" stroke-width="5"/><text x="200" y="260" text-anchor="middle" fill="var(--pc-text)" font-size="19" style="font-size: 19px">Dolly · 原型</text><ellipse cx="660" cy="136" rx="92" ry="48" fill="var(--pc-surface)" stroke="var(--pc-accent)" stroke-width="2"/><ellipse cx="748" cy="120" rx="24" ry="32" fill="var(--pc-surface)" stroke="var(--pc-accent)" stroke-width="2"/><path d="M 612 174 V 212" stroke="var(--pc-accent)" stroke-width="5"/><path d="M 708 174 V 212" stroke="var(--pc-accent)" stroke-width="5"/><text x="660" y="260" text-anchor="middle" fill="var(--pc-text)" font-size="19" style="font-size: 19px">clone · 独立副本</text><text x="450" y="116" text-anchor="middle" fill="var(--pc-muted)" font-size="16" style="font-size: 16px">复制原型</text>
</svg>
</div>

<div class="pc-next">clone 在具体 Model 中知道确切类型</div>

<!--
* 引用餐厅点餐的幽默比喻：“服务员，我不知道隔壁桌吃的是什么菜（没有具体类型信息），但看起来太香了，请给我来一份一模一样的（`clone()`）！”
  * 指出 Prototype 模式在现代 C++ 中的真正历史使命：单独使用 `Animal::clone()` 的场景已经越来越少，但它作为三大核心基石之一，是打通“外部多态（引用语义）”与“Type Erasure（值语义）”之间任督二脉的**唯一钥匙**！

教学边界：图中的羊是大纲明确要求的克隆隐喻，采用工程线稿，不是额外的业务类型。抽象复制用于开放类型集合，避免对象切片。
-->

---
ppt: 7
---

# clone 在具体 Model 中知道确切类型

<div class="[&_pre]:whitespace-pre-wrap [&_code]:!whitespace-pre-wrap [&_code]:!break-normal [&_code]:[overflow-wrap:anywhere]">

```cpp
virtual std::unique_ptr<ShapeConcept> clone() const = 0;
```

</div>

<div class="[&_pre]:whitespace-pre-wrap [&_code]:!whitespace-pre-wrap [&_code]:!break-normal [&_code]:[overflow-wrap:anywhere]">

```cpp
std::unique_ptr<ShapeConcept> clone() const override {
    return std::make_unique<ShapeModel>(*this); // 编译期已知确切类型，直接调用自身拷贝构造！
}
```

</div>

<div class="pc-next">跨层 clone 返回独立多态对象</div>

<!--
大纲 PPT 7：重点内容：ShapeConcept 的 clone 声明与 ShapeModel 原代码。

教学边界：std::variant 拷贝适合封闭类型集；Prototype 的 clone 服务于开放类型集。
-->

---
ppt: 7
---

# 跨层 clone 返回独立多态对象

<div class="pc-svg-hero">
<svg viewBox="0 0 900 300" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="l3-clone-title l3-clone-desc">
<title id="l3-clone-title">clone 调用与返回时序</title>
<desc id="l3-clone-desc">clone 调用与返回时序；依赖箭头由使用方向指向被依赖方，空心三角表示继承。</desc>
<defs><marker id="l3-clone-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M 0 0 L 10 5 L 0 10" fill="none" stroke="var(--pc-accent)" stroke-width="1.5"/></marker><marker id="l3-clone-inherit" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="9" markerHeight="9" orient="auto"><path d="M 0 0 L 10 5 L 0 10 Z" fill="var(--pc-bg)" stroke="var(--pc-accent)" stroke-width="1.5"/></marker></defs>
<path d="M 216 98 H 244" fill="none" stroke="var(--pc-accent)" stroke-width="2" stroke-dasharray="5 4" marker-end="url(#l3-clone-arrow)"/><path d="M 452 98 H 480" fill="none" stroke="var(--pc-accent)" stroke-width="2" stroke-dasharray="5 4" marker-end="url(#l3-clone-arrow)"/><path d="M 680 98 H 708" fill="none" stroke="var(--pc-accent)" stroke-width="2" stroke-dasharray="5 4" marker-end="url(#l3-clone-arrow)"/><path d="M 796 132 V 212 Q 796 220 788 220 H 124 Q 116 220 116 212 V 132" fill="none" stroke="var(--pc-accent)" stroke-width="2" stroke-dasharray="5 4" marker-end="url(#l3-clone-arrow)"/><rect x="16" y="64" width="200" height="68" rx="6" fill="var(--pc-surface)" stroke="var(--pc-accent)" stroke-width="1.5"/><text x="116.0" y="90" text-anchor="middle" fill="var(--pc-text)" font-size="17" style="font-size: 17px">other.pimpl_</text><text x="116.0" y="113" text-anchor="middle" fill="var(--pc-muted)" font-size="13" style="font-size: 13px">高层值包装器</text><rect x="244" y="64" width="208" height="68" rx="6" fill="var(--pc-surface)" stroke="var(--pc-accent)" stroke-width="1.5"/><text x="348.0" y="90" text-anchor="middle" fill="var(--pc-text)" font-size="17" style="font-size: 17px">ShapeModel&lt;Circle&gt;</text><text x="348.0" y="113" text-anchor="middle" fill="var(--pc-muted)" font-size="13" style="font-size: 13px">动态分发 clone()</text><rect x="480" y="64" width="200" height="68" rx="6" fill="var(--pc-surface)" stroke="var(--pc-accent)" stroke-width="1.5"/><text x="580.0" y="90" text-anchor="middle" fill="var(--pc-text)" font-size="17" style="font-size: 17px">自身拷贝构造</text><text x="580.0" y="113" text-anchor="middle" fill="var(--pc-muted)" font-size="13" style="font-size: 13px">new ShapeModel(*this)</text><rect x="708" y="64" width="176" height="68" rx="6" fill="var(--pc-surface)" stroke="var(--pc-accent)" stroke-width="1.5"/><text x="796.0" y="90" text-anchor="middle" fill="var(--pc-text)" font-size="17" style="font-size: 17px">unique_ptr</text><text x="796.0" y="113" text-anchor="middle" fill="var(--pc-muted)" font-size="13" style="font-size: 13px">ShapeConcept</text><text x="244" y="262" text-anchor="start" fill="var(--pc-text)" font-size="17" style="font-size: 17px">返回抽象指针，保留动态类型；避免 Object Slicing</text>
</svg>
</div>

<div class="pc-next">Type Erasure 组合三种设计意图</div>

<!--
大纲 PPT 7：呈现方式：ShapeConcept::clone 跨层调用时序。

教学边界：图中的 ShapeModel<Circle> 延续大纲时序简写，完整模板还包含 DrawStrategy；完整 clone 通过 make_unique<ShapeModel>(*this) 复制自身。
-->

---
ppt: 8
---

# Type Erasure 组合三种设计意图

<div class="pc-svg-hero">
<svg viewBox="0 0 900 300" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="l3-erasure-title l3-erasure-desc">
<title id="l3-erasure-title">Type Erasure 全景架构</title>
<desc id="l3-erasure-desc">Type Erasure 全景架构；依赖箭头由使用方向指向被依赖方，空心三角表示继承。</desc>
<defs><marker id="l3-erasure-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M 0 0 L 10 5 L 0 10" fill="none" stroke="var(--pc-accent)" stroke-width="1.5"/></marker><marker id="l3-erasure-inherit" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="9" markerHeight="9" orient="auto"><path d="M 0 0 L 10 5 L 0 10 Z" fill="var(--pc-bg)" stroke="var(--pc-accent)" stroke-width="1.5"/></marker></defs>
<path d="M 324 54 H 572" fill="none" stroke="var(--pc-accent)" stroke-width="2" stroke-dasharray="5 4" marker-end="url(#l3-erasure-arrow)"/><path d="M 724 132 V 88" fill="none" stroke="var(--pc-accent)" stroke-width="2" marker-end="url(#l3-erasure-inherit)"/><path d="M 174 88 V 132" fill="none" stroke="var(--pc-accent)" stroke-width="2" stroke-dasharray="5 4" marker-end="url(#l3-erasure-arrow)"/><path d="M 324 166 H 572" fill="none" stroke="var(--pc-accent)" stroke-width="2" stroke-dasharray="5 4" marker-end="url(#l3-erasure-arrow)"/><rect x="24" y="20" width="300" height="68" rx="6" fill="var(--pc-surface)" stroke="var(--pc-accent)" stroke-width="1.5"/><text x="174.0" y="46" text-anchor="middle" fill="var(--pc-text)" font-size="17" style="font-size: 17px">Shape · 值语义外壳</text><text x="174.0" y="69" text-anchor="middle" fill="var(--pc-muted)" font-size="13" style="font-size: 13px">非侵入式；开放类型集合</text><rect x="572" y="20" width="304" height="68" rx="6" fill="var(--pc-surface)" stroke="var(--pc-accent)" stroke-width="1.5"/><text x="724.0" y="46" text-anchor="middle" fill="var(--pc-text)" font-size="17" style="font-size: 17px">Concept</text><text x="724.0" y="69" text-anchor="middle" fill="var(--pc-muted)" font-size="13" style="font-size: 13px">draw() + clone() · Prototype</text><rect x="572" y="132" width="304" height="68" rx="6" fill="var(--pc-surface)" stroke="var(--pc-accent)" stroke-width="1.5"/><text x="724.0" y="158" text-anchor="middle" fill="var(--pc-text)" font-size="17" style="font-size: 17px">OwningModel&lt;ShapeT, DrawStrategy&gt;</text><text x="724.0" y="181" text-anchor="middle" fill="var(--pc-muted)" font-size="13" style="font-size: 13px">External Polymorphism</text><rect x="24" y="132" width="300" height="68" rx="6" fill="var(--pc-surface)" stroke="var(--pc-accent)" stroke-width="1.5"/><text x="174.0" y="158" text-anchor="middle" fill="var(--pc-text)" font-size="17" style="font-size: 17px">unique_ptr&lt;Concept&gt; pimpl_</text><text x="174.0" y="181" text-anchor="middle" fill="var(--pc-muted)" font-size="13" style="font-size: 13px">Bridge (Pimpl)</text><text x="24" y="268" text-anchor="start" fill="var(--pc-text)" font-size="19" style="font-size: 19px">Type Erasure = External Polymorphism + Bridge + Prototype</text>
</svg>
</div>

<div class="pc-next">模板构造函数隐藏具体类型</div>

<!--
* **全课最高潮**！带学员仔细品味客户端那 4 行代码：没有 `public Shape` 继承，没有 `unique_ptr`，没有 `make_unique`，却同时拥有了**面向对象的开放类型扩展能力**、**Strategy 的行为解耦能力**以及**如 `int` 般丝滑的值语义深拷贝体验**！这就是 `std::function` 和 `std::any` 背后的终极魔法。
  * 同时保持架构师的冷静，指出 Type Erasure 的局限性：它极度擅长一元操作（如 `draw(s1)`），但很难处理**二元操作（Binary Operations，如判断两个 `Shape` 是否相等 `s1 == s2`）**，且不要将它与 `void*` 或封闭集合的 `std::variant` 混为一谈。
-->

---
ppt: 8
---

# 模板构造函数隐藏具体类型

<div class="[&_pre]:whitespace-pre-wrap [&_code]:!whitespace-pre-wrap [&_code]:!break-normal [&_code]:[overflow-wrap:anywhere]">

```cpp
class Shape {
private:
    struct Concept {
        virtual ~Concept() = default;
        virtual void draw() const = 0;
        virtual std::unique_ptr<Concept> clone() const = 0;       // [1] Prototype
    };
    template <typename ShapeT, typename DrawStrategy>
    struct OwningModel : Concept { /* 实现 draw() 与 clone() */ }; // [2] External Polymorphism
    std::unique_ptr<Concept> pimpl_;                              // [3] Bridge (Pimpl)
public:
    template <typename ShapeT, typename DrawStrategy>
    Shape(ShapeT shape, DrawStrategy drawer)                      // 自动类型擦除入口！
        : pimpl_(std::make_unique<OwningModel<ShapeT, DrawStrategy>>(
              std::move(shape), std::move(drawer))) {}
```

</div>

<div class="pc-next">客户端像复制 int 一样复制 Shape</div>

<!--
大纲 PPT 8：呈现方式：Shape 核心代码前半，Concept／OwningModel／构造入口。

教学边界：这是大纲中的浓缩代码，OwningModel 的 draw/clone 只以注释占位，不是可直接编译的完整实现；具体类型信息对外部使用者隐藏，并非对象运行时真的不再具有具体类型。
-->

---
ppt: 8
---

# 客户端像复制 int 一样复制 Shape

<div class="[&_pre]:whitespace-pre-wrap [&_code]:!whitespace-pre-wrap [&_code]:!break-normal [&_code]:[overflow-wrap:anywhere]">

```cpp
Shape(Shape const& other) : pimpl_(other.pimpl_->clone()) {}  // 值语义深拷贝！
    // ... operator= (Copy-and-Swap), 移动构造/赋值 (= default), friend void draw(Shape const&)
};

// 🎉 客户端代码：无基类、无指针、无 new/make_unique、纯粹的值语义与开放扩展！
Shape s1{ Circle{3.14}, [](Circle const& c) { /* OpenGL draw */ } };
draw(s1);
Shape s2 = s1; // 像 int 一样自然地深拷贝多态对象！
```

</div>

<div class="pc-next">Rule of 5 把指针封装在内部</div>

<!--
大纲 PPT 8：呈现方式：Shape 核心代码续页与完整客户端用法。

教学边界：源码承接上一页的 class Shape。已移走对象可能持有空 pimpl_；生产实现应定义空状态的拷贝与 draw 行为，不能无条件 other.pimpl_->clone()。客户端片段也是类型与方法定义省略后的演示。
-->

---
ppt: 8
---

# Rule of 5 把指针封装在内部

<v-clicks>

- clone() 实现值语义深拷贝
- Copy-and-Swap 实现拷贝赋值
- 默认移动保留高效所有权转移
- Hidden Friend 暴露 draw(Shape const&)

</v-clicks>

<div class="pc-next">内存布局与分发机制都可优化</div>

<!--
大纲 PPT 8：重点内容：值语义特殊成员函数与 Hidden Friend。

教学边界：原始演讲要点中的二元操作难题完整保留在本单元首张备注。不可把 Type Erasure 等同于 void*，也不可与封闭类型集合的 variant 混淆。

[click] 拷贝新建独立模型，而不是共享旧 pimpl_。
[click] 拷贝成功后再交换，避免半更新状态。
[click] 移动必须同时约定被移走对象的有效状态。
[click] 外部只见自由函数 draw 与值类型 Shape。
-->

---
ppt: 9
---

# 内存布局与分发机制都可优化

<div class="pc-svg-hero">
<svg viewBox="0 0 900 300" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="l3-storage-title l3-storage-desc">
<title id="l3-storage-title">Heap → SBO → Manual Vtable</title>
<desc id="l3-storage-desc">Heap → SBO → Manual Vtable；依赖箭头由使用方向指向被依赖方，空心三角表示继承。</desc>
<defs><marker id="l3-storage-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M 0 0 L 10 5 L 0 10" fill="none" stroke="var(--pc-accent)" stroke-width="1.5"/></marker><marker id="l3-storage-inherit" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="9" markerHeight="9" orient="auto"><path d="M 0 0 L 10 5 L 0 10 Z" fill="var(--pc-bg)" stroke="var(--pc-accent)" stroke-width="1.5"/></marker></defs>
<text x="24" y="24" text-anchor="start" fill="var(--pc-text)" font-size="20" style="font-size: 20px">Heap</text><text x="324" y="24" text-anchor="start" fill="var(--pc-text)" font-size="20" style="font-size: 20px">SBO</text><text x="624" y="24" text-anchor="start" fill="var(--pc-text)" font-size="20" style="font-size: 20px">Manual Vtable</text><path d="M 152 108 V 172" fill="none" stroke="var(--pc-accent)" stroke-width="2" stroke-dasharray="5 4" marker-end="url(#l3-storage-arrow)"/><rect x="32" y="56" width="240" height="52" rx="6" fill="var(--pc-surface)" stroke="var(--pc-accent)" stroke-width="1.5"/><text x="152.0" y="82" text-anchor="middle" fill="var(--pc-text)" font-size="17" style="font-size: 17px">Shape · pimpl_</text><rect x="32" y="172" width="240" height="64" rx="6" fill="var(--pc-surface)" stroke="var(--pc-accent)" stroke-width="1.5"/><text x="152.0" y="198" text-anchor="middle" fill="var(--pc-text)" font-size="17" style="font-size: 17px">OwningModel</text><text x="152.0" y="221" text-anchor="middle" fill="var(--pc-muted)" font-size="13" style="font-size: 13px">独立堆块</text><rect x="332" y="56" width="240" height="180" rx="6" fill="none" stroke="var(--pc-good)" stroke-width="2"/><text x="452" y="84" text-anchor="middle" fill="var(--pc-text)" font-size="18" style="font-size: 18px">Shape</text><rect x="348" y="112" width="208" height="88" rx="6" fill="var(--pc-surface)" stroke="var(--pc-good)" stroke-width="1.5"/><text x="452.0" y="138" text-anchor="middle" fill="var(--pc-text)" font-size="17" style="font-size: 17px">buffer_ · 32 B</text><text x="452.0" y="161" text-anchor="middle" fill="var(--pc-muted)" font-size="13" style="font-size: 13px">对齐内部存储</text><rect x="632" y="56" width="240" height="64" rx="6" fill="var(--pc-surface)" stroke="var(--pc-accent)" stroke-width="1.5"/><text x="752.0" y="82" text-anchor="middle" fill="var(--pc-text)" font-size="17" style="font-size: 17px">Shape</text><text x="752.0" y="105" text-anchor="middle" fill="var(--pc-muted)" font-size="13" style="font-size: 13px">DrawOperation* / CloneOperation*</text><path d="M 752 120 V 172" fill="none" stroke="var(--pc-accent)" stroke-width="2" stroke-dasharray="5 4" marker-end="url(#l3-storage-arrow)"/><rect x="632" y="172" width="240" height="64" rx="6" fill="var(--pc-surface)" stroke="var(--pc-accent)" stroke-width="1.5"/><text x="752.0" y="198" text-anchor="middle" fill="var(--pc-text)" font-size="17" style="font-size: 17px">函数指针分发</text><text x="752.0" y="221" text-anchor="middle" fill="var(--pc-muted)" font-size="13" style="font-size: 13px">1 次间接跳转</text>
</svg>
</div>

<div class="pc-next">SBO 在对齐缓冲区中原位构造</div>

<!--
* 指着表格最后两行向全场宣布：**谁说软件解耦和架构优雅一定要牺牲 C++ 的性能？！** 经过 SBO 和手动虚表优化的 Type Erasure，不仅实现了地球上最彻底的非侵入式解耦，而且在运行速度上**正面击败了强耦合的传统 OOP 虚函数继承体系**！
  * 顺带展示 Pikus 第 6 章中 `std::function`（30 行汇编）与手写尾调用优化 `Function`（仅 1 行 `jmpq *0x10(%r8)` 汇编！）的对比，告诉学员为什么要理解底层机制——当你懂原理时，连标准库的性能瓶颈你都能亲手突破。
-->

---
ppt: 9
---

# SBO 在对齐缓冲区中原位构造

<div class="[&_pre]:whitespace-pre-wrap [&_code]:!whitespace-pre-wrap [&_code]:!break-normal [&_code]:[overflow-wrap:anywhere]">

```cpp
alignas(Alignment) std::array<std::byte, Capacity> buffer_;
```

</div><v-clicks>

- std::construct_at / Placement new 原位构造
- std::destroy_at 显式结束生命周期
- DynamicStorage vs InClassStorage
- 小对象走 SBO；大对象回退堆分配

</v-clicks>

<div class="pc-next">手动虚表与非拥有引用各有边界</div>

<!--
大纲 PPT 9：重点内容：SBO 原理与进阶策略。

教学边界：32 B 是大纲示例；需按 sizeof(OwningModel) 而不是只按 sizeof(ShapeT) 判断是否可内联。对齐要求、异常安全和生命周期均不能省略。

[click] 大小与对齐都满足时才能原位构造。
[click] 只销毁实际处于活动状态的对象。
[click] 存储策略与业务接口分离。
[click] SBO 的移动／交换还需 move(Concept* memory) 等类型相关操作。
-->

---
ppt: 9
---

# 手动虚表与非拥有引用各有边界

<div class="grid grid-cols-2 gap-4 mt-4">
<div class="pc-card info"><h3>Manual Virtual Dispatch</h3><p class="pc-card-lead">pimpl_ → vptr → vtable → func<br>直接函数指针：1 次间接跳转</p></div>
<div class="pc-card info"><h3>ShapeConstRef / function_ref</h3><p class="pc-card-lead">void const* shape_ / drawer_<br>DrawOperation* draw_：3 个指针大小</p></div>
</div>
<div class="pc-tags mt-6"><span class="pc-tag">static constexpr vtable_t vtable&lt;T&gt;</span><span class="pc-tag">DrawOperation* / CloneOperation*</span></div>

<div class="pc-next">优化结果应同时看两套工具链</div>

<!--
大纲 PPT 9：重点内容：Manual Virtual Dispatch；非拥有轻量擦除引用。

教学边界：一次／两次跳转为大纲的机制示意，最终机器码依赖 ABI 与编译器优化；无状态 Lambda 转函数指针不等于任何闭包都可直接转换。ShapeConstRef 不能延长被借用对象或策略的生命周期。
-->

---
ppt: 9
---

# 优化结果应同时看两套工具链

<div class="pc-tag mb-3">来源：大纲引述 Iglberger 第 8 章、Pikus 第 6 章 · 未在本仓库重测</div>

| 多态实现方案 | GCC 11.1 耗时 | Clang 11.1 耗时 | 核心架构特征 |
| :--- | :--- | :--- | :--- |
| `std::function` (标准库通用擦除) | 2.1782 s | 1.4884 s | 含空指针检查与栈参数移位开销 |
| Classic GoF Strategy (指针+基类) | 1.6372 s | 1.4046 s | 双重堆分配 + 指针跳转 |
| Type Erasure (基础堆分配版) | 1.5298 s | 1.1561 s | 值语义封装，单一模型分配 |
| 传统 OOP 侵入式继承 (耦合基准线) | 1.5205 s | 1.1480 s | 强耦合，无解耦弹性 |
| **Type Erasure + SBO (栈缓冲)** | **`1.3591 s`** | **`1.0348 s`** | **零堆分配，反超传统 OOP 10%！** |
| **Type Erasure + 手动虚表分发** | **`1.1476 s`** | `1.1599 s` | **消除 vptr 二次跳转，GCC 提速 25%！** |

<div class="pc-next">静态抽象走向非侵入式 Concepts</div>

<!--
大纲 PPT 9：呈现方式：完整六项性能原表。

教学边界：“GCC 提速 25%”是大纲的近似描述；Clang 手动虚表 1.1599 s 并未优于 OOP 1.1480 s，不能以 GCC 结论泛化。测试硬件与完整基准条件未给出；保留所有原始数据而不自行生成性能承诺。
-->

---
ppt: 10
---

# 静态抽象走向非侵入式 Concepts

<div class="grid grid-cols-2 gap-4">
<div>

### Intrusive CRTP

```cpp
class DynamicVector
    : public DenseVector<DynamicVector<T>>
```

<div class="pc-muted text-sm">大纲语法片段，省略模板声明与类体</div>

</div>
<div>

<div class="pc-card info"><h3>Non-intrusive Concept</h3><p class="pc-card-lead">size() / operator[] / begin() / end()<br>语法检查 + 显式 Opt-in</p></div>

</div>
</div>

<div class="pc-next">Trait Opt-in 防止语义误匹配</div>

<!--
* 帮学员梳理清晰的技术演进脉络：无论是运行时多态（从基类继承演进到 Type Erasure），还是编译期多态（从 CRTP 基类继承演进到 C++20 Concepts），Modern C++ 架构演进的大方向高度一致——**全面走向非侵入式设计（Non-intrusive Design）**！
  * 特别强调 `IsDenseVector<T>` 这个精妙技巧：C++20 Concepts 本质上是结构化类型匹配（Duck Typing），光检查有没有 `size()` 和 `operator[]` 会把 `std::vector` 也放进来当成线性代数向量做数学运算。加上一行布尔特征特化（Trait Opt-in），既不需要改类定义，又实现了严格的语义类型隔离。

教学边界：大纲把 C++20 之前的 CRTP 描述为“唯一的方法”是教学性简化：此前也有 Traits、SFINAE 和检测惯用法。Concepts 表达静态约束，不自动验证语义公理，也不自动完成 CRTP 提供的代码注入。
-->

---
ppt: 10
---

# Trait Opt-in 防止语义误匹配

<div class="[&_pre]:whitespace-pre-wrap [&_code]:!whitespace-pre-wrap [&_code]:!break-normal [&_code]:[overflow-wrap:anywhere]">

```cpp
// ✅ C++20 非侵入式静态抽象：结合语法检查与显式特征注册 (Opt-in Trait)
template <typename T>
struct IsDenseVector : std::is_base_of<DenseVectorTag, T> {};

template <typename T>
concept DenseVector = requires (T t, size_t i) {
    t.size(); t[i]; t.begin(); t.end();
} && IsDenseVector<T>::value; // 阻止 std::vector 误入数学向量重载集！

// 第三方或独立向量类无需继承任何基类，只需非侵入式特化 Trait 即可融入体系：
template <typename T, size_t N> class StaticVector { /* 纯净实现 */ };
template <typename T, size_t N>
struct IsDenseVector<StaticVector<T, N>> : std::true_type {};
```

</div>

<div class="pc-next">CRTP 仍适合实现 Static Mixin</div>

<!--
大纲 PPT 10：呈现方式：Concept + IsDenseVector 完整原代码。

教学边界：DenseVectorTag、头文件与 size_t 名字查找是省略的上下文；大纲注释“无需任何基类”由 StaticVector 的 Trait 偏特化实现，默认 Traits 仍可采用标记基类。不要添加 std::DenseVector 等伪造命名空间。
-->

---
ppt: 10
---

# CRTP 仍适合实现 Static Mixin

<div class="grid grid-cols-2 gap-4 mt-4">
<div class="pc-card info"><h3>静态抽象接口</h3><p class="pc-card-lead">Concepts + IsDenseVector&lt;T&gt;<br>避免 vector / string 语法误匹配</p></div>
<div class="pc-card info"><h3>代码注入与复用</h3><p class="pc-card-lead">CRTP Static Mixin<br>StrongType 技能包</p></div>
</div>
<div class="pc-muted text-sm mt-4">CRTP 的痛点：侵入性、无公共基类、接触它的函数被传染成模板。</div>

<div class="pc-next">遗留绘图系统有三类耦合</div>

<!--
大纲 PPT 10：重点内容：三大痛点；CRTP 的退位与留守。
-->

---
ppt: 11
---

# 遗留绘图系统有三类耦合

<div class="pc-svg-hero">
<svg viewBox="0 0 900 300" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="l3-legacy-title l3-legacy-desc">
<title id="l3-legacy-title">重构前绘图系统的物理与逻辑依赖</title>
<desc id="l3-legacy-desc">重构前绘图系统的物理与逻辑依赖；依赖箭头由使用方向指向被依赖方，空心三角表示继承。</desc>
<defs><marker id="l3-legacy-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M 0 0 L 10 5 L 0 10" fill="none" stroke="var(--pc-accent)" stroke-width="1.5"/></marker><marker id="l3-legacy-inherit" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="9" markerHeight="9" orient="auto"><path d="M 0 0 L 10 5 L 0 10 Z" fill="var(--pc-bg)" stroke="var(--pc-accent)" stroke-width="1.5"/></marker></defs>
<path d="M 144 100 V 136 Q 144 144 152 144 H 400 Q 408 144 408 152 V 188" fill="none" stroke="var(--pc-accent)" stroke-width="2" stroke-dasharray="5 4" marker-end="url(#l3-legacy-arrow)"/><path d="M 748 100 V 120 Q 748 128 740 128 H 520 V 188" fill="none" stroke="var(--pc-accent)" stroke-width="2" stroke-dasharray="5 4" marker-end="url(#l3-legacy-arrow)"/><path d="M 144 188 V 164 Q 144 156 152 156 H 648 V 100" fill="none" stroke="var(--pc-accent)" stroke-width="2" marker-end="url(#l3-legacy-inherit)"/><path d="M 576 68 H 620" fill="none" stroke="var(--pc-accent)" stroke-width="2" stroke-dasharray="5 4" marker-end="url(#l3-legacy-arrow)"/><path d="M 144 252 V 272 Q 144 280 152 280 H 740 Q 748 280 748 272 V 252" fill="none" stroke="var(--pc-accent)" stroke-width="2" stroke-dasharray="5 4" marker-end="url(#l3-legacy-arrow)"/><rect x="24" y="36" width="240" height="64" rx="6" fill="var(--pc-surface)" stroke="var(--pc-accent)" stroke-width="1.5"/><text x="144.0" y="62" text-anchor="middle" fill="var(--pc-text)" font-size="17" style="font-size: 17px">&lt;Canvas.h&gt;</text><text x="144.0" y="85" text-anchor="middle" fill="var(--pc-muted)" font-size="13" style="font-size: 13px">物理头文件依赖</text><rect x="336" y="36" width="240" height="64" rx="6" fill="var(--pc-surface)" stroke="var(--pc-accent)" stroke-width="1.5"/><text x="456.0" y="62" text-anchor="middle" fill="var(--pc-text)" font-size="17" style="font-size: 17px">vector&lt;Shape*&gt;</text><text x="456.0" y="85" text-anchor="middle" fill="var(--pc-muted)" font-size="13" style="font-size: 13px">手动管理；泄漏与悬空</text><rect x="620" y="36" width="256" height="64" rx="6" fill="var(--pc-surface)" stroke="var(--pc-accent)" stroke-width="1.5"/><text x="748.0" y="62" text-anchor="middle" fill="var(--pc-text)" font-size="17" style="font-size: 17px">&lt;Shape.h&gt;</text><text x="748.0" y="85" text-anchor="middle" fill="var(--pc-muted)" font-size="13" style="font-size: 13px">侵入式基类</text><rect x="24" y="188" width="240" height="64" rx="6" fill="var(--pc-surface)" stroke="var(--pc-accent)" stroke-width="1.5"/><text x="144.0" y="214" text-anchor="middle" fill="var(--pc-text)" font-size="17" style="font-size: 17px">Circle / Square</text><text x="144.0" y="237" text-anchor="middle" fill="var(--pc-muted)" font-size="13" style="font-size: 13px">继承与职责捆绑</text><rect x="336" y="188" width="240" height="64" rx="6" fill="var(--pc-surface)" stroke="var(--pc-accent)" stroke-width="1.5"/><text x="456.0" y="214" text-anchor="middle" fill="var(--pc-text)" font-size="17" style="font-size: 17px">&lt;OpenGLContext.h&gt;</text><text x="456.0" y="237" text-anchor="middle" fill="var(--pc-muted)" font-size="13" style="font-size: 13px">第三方图形库</text><rect x="620" y="188" width="256" height="64" rx="6" fill="var(--pc-surface)" stroke="var(--pc-accent)" stroke-width="1.5"/><text x="748.0" y="214" text-anchor="middle" fill="var(--pc-text)" font-size="17" style="font-size: 17px">OpenGLRenderer::instance()</text><text x="748.0" y="237" text-anchor="middle" fill="var(--pc-muted)" font-size="13" style="font-size: 13px">硬编码；无 GPU 单测受阻</text>
</svg>
</div>

<div class="pc-next">三步重构分别修复三种边界</div>

<!--
* 带着学员像外科手术医生一样，用前两节课和本课学到的所有工具，一步步切掉遗留代码的毒瘤。
  * 让学员直观看到重构后的巨大工程收益：现在领域层里的 `Circle` 和 `Square` 干净得像一张白纸，算几何面积的单测毫秒级编译运行；换渲染引擎只需在 `main` 函数组装处换一个 Strategy 函数对象；新增图形插件无需触碰任何已有代码，且全程没有任何一个裸指针和 `new/delete`！
-->

---
ppt: 11
---

# 三步重构分别修复三种边界

<v-clicks>

- Pimpl / Partial Bridge：编译防火墙
- DIP + Strategy：高层拥有接口，注入 MockDrawer
- 封闭类型集：variant；开放类型集：SBO Type Erasure

</v-clicks>

<div class="pc-next">可插拔细节依赖高层契约</div>

<!--
大纲 PPT 11：重点内容：Three-Step Refactoring 路线图。

[click] 先隔离渲染上下文与冷数据，限制物理依赖传播。
[click] 然后用高层策略契约隔离 OpenGLRenderer 的具体实现。
[click] 根据扩展轴选择 variant 或开放集合的值包装器，而不是机械套模式。
-->

---
ppt: 11
---

# 可插拔细节依赖高层契约

<div class="pc-svg-hero">
<svg viewBox="0 0 900 300" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="l3-dag-title l3-dag-desc">
<title id="l3-dag-title">重构后的分层 DAG 与两条架构边界</title>
<desc id="l3-dag-desc">重构后的分层 DAG 与两条架构边界；依赖箭头由使用方向指向被依赖方，空心三角表示继承。</desc>
<defs><marker id="l3-dag-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M 0 0 L 10 5 L 0 10" fill="none" stroke="var(--pc-accent)" stroke-width="1.5"/></marker><marker id="l3-dag-inherit" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="9" markerHeight="9" orient="auto"><path d="M 0 0 L 10 5 L 0 10 Z" fill="var(--pc-bg)" stroke="var(--pc-accent)" stroke-width="1.5"/></marker></defs>
<path d="M 156 232 V 228 Q 156 220 164 220 H 292 Q 300 220 300 212 V 88" fill="none" stroke="var(--pc-accent)" stroke-width="2" stroke-dasharray="5 4" marker-end="url(#l3-dag-arrow)"/><path d="M 450 232 V 88" fill="none" stroke="var(--pc-accent)" stroke-width="2" stroke-dasharray="5 4" marker-end="url(#l3-dag-arrow)"/><path d="M 744 232 V 228 Q 744 220 736 220 H 608 Q 600 220 600 212 V 88" fill="none" stroke="var(--pc-accent)" stroke-width="2" stroke-dasharray="5 4" marker-end="url(#l3-dag-arrow)"/><path d="M 16 104 H 884 M 16 208 H 884" stroke="var(--pc-good)" stroke-width="2" stroke-dasharray="6 4"/><rect x="216" y="16" width="468" height="72" rx="6" fill="var(--pc-surface)" stroke="var(--pc-accent)" stroke-width="1.5"/><text x="450.0" y="42" text-anchor="middle" fill="var(--pc-text)" font-size="17" style="font-size: 17px">Shape / Concept / Model</text><text x="450.0" y="65" text-anchor="middle" fill="var(--pc-muted)" font-size="13" style="font-size: 13px">Top · 核心契约层</text><rect x="24" y="124" width="256" height="64" rx="6" fill="var(--pc-surface)" stroke="var(--pc-accent)" stroke-width="1.5"/><text x="152.0" y="150" text-anchor="middle" fill="var(--pc-text)" font-size="17" style="font-size: 17px">Circle</text><text x="152.0" y="173" text-anchor="middle" fill="var(--pc-muted)" font-size="13" style="font-size: 13px">Middle · 纯净领域层</text><rect x="620" y="124" width="256" height="64" rx="6" fill="var(--pc-surface)" stroke="var(--pc-accent)" stroke-width="1.5"/><text x="748.0" y="150" text-anchor="middle" fill="var(--pc-text)" font-size="17" style="font-size: 17px">Square</text><text x="748.0" y="173" text-anchor="middle" fill="var(--pc-muted)" font-size="13" style="font-size: 13px">零依赖、纯值类型</text><rect x="16" y="232" width="280" height="64" rx="6" fill="var(--pc-surface)" stroke="var(--pc-accent)" stroke-width="1.5"/><text x="156.0" y="258" text-anchor="middle" fill="var(--pc-text)" font-size="17" style="font-size: 17px">OpenGLDrawStrategy</text><rect x="312" y="232" width="280" height="64" rx="6" fill="var(--pc-surface)" stroke="var(--pc-accent)" stroke-width="1.5"/><text x="452.0" y="258" text-anchor="middle" fill="var(--pc-text)" font-size="17" style="font-size: 17px">VulkanDrawStrategy</text><rect x="608" y="232" width="280" height="64" rx="6" fill="var(--pc-surface)" stroke="var(--pc-accent)" stroke-width="1.5"/><text x="748.0" y="258" text-anchor="middle" fill="var(--pc-text)" font-size="17" style="font-size: 17px">TestMockStrategy</text>
</svg>
</div>

<div class="pc-next">五条金律指向长期可维护性</div>

<!--
大纲 PPT 11：呈现方式：三层 DAG、两条黄金边界与向上依赖。

教学边界：上行箭头表示策略适配层满足高层需求契约；不表示任意 Callable 在源码中必须 include 包装器头文件。Model 会组合具体数据与策略，该实例化关系不应被误画成领域类反向依赖包装器。大纲“编译耗时 <0.1s、100% 独立单测”是给定教学场景的收益描述，不是本项目实测或覆盖率承诺。
-->

---
ppt: 12
---

# 五条金律指向长期可维护性

<div class="pc-svg-hero">
<svg viewBox="0 0 900 300" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="l3-golden-title l3-golden-desc">
<title id="l3-golden-title">Modern C++ 软件设计五大金律</title>
<desc id="l3-golden-desc">Modern C++ 软件设计五大金律；依赖箭头由使用方向指向被依赖方，空心三角表示继承。</desc>
<defs><marker id="l3-golden-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M 0 0 L 10 5 L 0 10" fill="none" stroke="var(--pc-accent)" stroke-width="1.5"/></marker><marker id="l3-golden-inherit" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="9" markerHeight="9" orient="auto"><path d="M 0 0 L 10 5 L 0 10 Z" fill="var(--pc-bg)" stroke="var(--pc-accent)" stroke-width="1.5"/></marker></defs>
<polygon points="450.0,42.0 478.2,115.2 556.5,119.4 495.7,168.8 515.8,244.6 450.0,202.0 384.2,244.6 404.3,168.8 343.5,119.4 421.8,115.2" fill="var(--pc-surface)" stroke="var(--pc-accent)" stroke-width="2"/><text x="450" y="24" text-anchor="middle" fill="var(--pc-text)" font-size="18" style="font-size: 18px">最小化人为依赖</text><text x="760" y="104" text-anchor="middle" fill="var(--pc-text)" font-size="18" style="font-size: 18px">坚持关注点分离</text><text x="712" y="280" text-anchor="middle" fill="var(--pc-text)" font-size="18" style="font-size: 18px">组合优先于继承</text><text x="188" y="280" text-anchor="middle" fill="var(--pc-text)" font-size="18" style="font-size: 18px">非侵入式设计</text><text x="140" y="104" text-anchor="middle" fill="var(--pc-text)" font-size="18" style="font-size: 18px">值语义优先</text>
</svg>
</div>

<div class="pc-next">按变化意图选择模式：操作与行为</div>

<!--
* 结语升华：合上这 36 张幻灯片，希望大家走出教室后，再面对 C++ 代码时，眼里看到的不再仅仅是 `auto`、`constexpr` 或某个炫酷的语法糖，而是能透过代码看到背后**依赖箭头的流动方向**。
  * 送给所有学员最后一句赠言：语法特性决定了你写代码有多快，而软件设计与架构决定了你的代码能活多久。愿大家都能成为驾驭复杂性、构建出历经数十年需求演进依然优雅如初的卓越 C++ 架构师！

教学边界：大纲结语提到“36 张幻灯片”，是原大纲的讲稿原话，不用它作为本次拆页后的页数。
-->

---
ppt: 12
---

# 按变化意图选择模式：操作与行为

| When to use what | 模式 |
| :--- | :--- |
| 扩展操作（封闭类型） | Visitor（std::variant） |
| 配置行为（How） | Strategy（std::function / Policy） |
| 封装请求（What / Undo） | Command |
| 状态变更通知（1-to-N） | Observer |
| 转换不兼容接口 | Adapter |

<div class="pc-next">按变化意图选择模式：抽象与存储</div>

<!--
大纲 PPT 12：呈现方式：Cheat Sheet 实际十项的前五项。
-->

---
ppt: 12
---

# 按变化意图选择模式：抽象与存储

| When to use what | 模式 |
| :--- | :--- |
| 编译期类型分类／注入技能 | Concepts / CRTP Mixin |
| 隐藏物理实现细节 | Bridge（Pimpl） |
| 多态深拷贝 | Prototype（clone） |
| 非侵入式多态 + 值语义（开放类型） | External Polymorphism + Type Erasure |
| 层级叠加职责 | Decorator |

<div class="pc-next">让架构决策成为团队习惯</div>

<!--
大纲 PPT 12：呈现方式：Cheat Sheet 实际十项的后五项。

教学边界：大纲称“11 大核心模式”，实际给出十个触发条件条目；本课完整保留十项，不补造第十一项。
-->

---
ppt: 12
---

# 让架构决策成为团队习惯

<v-clicks>

- 维护 Architectural Document
- 记录高层边界与核心依赖方向
- 结合静态分析守护架构边界

</v-clicks>
<div class="mt-6">

<Callout type="good" title="后续实践预告">

记录一次架构决策：变化点、边界与依赖方向；以静态分析守护约定。

</Callout>

</div>

<!--
大纲 PPT 12：重点内容：架构决策文档、边界与静态分析。

教学边界：这是第三课及全课程的终章。实践预告来自本单元重点内容，不虚构不存在的第 4 课。

[click] 轻量文档记录长期需要保持的架构约定。
[click] 画清高层边界与核心依赖方向。
[click] 用工具守护边界，快速反馈与优秀设计共同支持变化。
-->
