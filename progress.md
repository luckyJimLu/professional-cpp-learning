# Professional C++ 学习进度

> 状态校验日期：2026-11-09。每次发布前重新扫描 `daily/day-*.md`；当前最大 Day 为 **76**，没有覆盖或重复既有课程。

- **已发布课程：Day 1–76**
- **最新课程：Day 76 · Chapter 8 · Object Destruction：析构顺序、RAII 与可控 Teardown**
- **下一课：Day 77 · 第 11 周复盘（Day 71–76）：构造、对象销毁与 teardown**
- **主教材后续：Assignment Operators（p.288 起；先完成 Day 77 周复盘）**
- **主教材：** Marc Gregoire, *Professional C++, Sixth Edition*（C++23）
- **唯一课程源：** 本仓库 Markdown；不发送邮件。

## 当前章节进度

| 主教材 | Day 范围 | 当前主题 |
|---|---:|---|
| Chapter 1–2 | 1–12 | C 到现代 C++、初始化、类型、字符串与视图 |
| Chapter 3 | 13–18 | Coding with Style、头文件、命名、错误与控制流 |
| Chapter 4 | 19–27 | 需求、抽象、复用、耦合内聚与设计决策 |
| Chapter 5 | 28–40 | 类、对象、所有权、多态、继承、Mixin |
| Chapter 6 | 41–55 | 复用、模板、可扩展接口与 SOLID |
| Chapter 7 | 56–66 | 内存管理、RAII、智能指针、PMR、固定存储与生命周期 |
| Chapter 8 | 67–76 | 类封装、对象存储期、构造、成员初始化、复制、列表构造、构造委托、转换构造、explicit、编译器生成的构造函数、Object Destruction |

## 完整课程索引

表中“关键点”取自每日课程 metadata；“稳定边界”列记录当天的模式或工程判断重点。

| Day | 日期 | 章节 | 主题与关键点 | Pattern / 稳定边界 | 课程 |
|---:|---|---|---|---|---|
| 001 | — | Chapter 1 | 从 C 进入现代 C++；chapter-1, from-c-to-modern-cpp | explicit-contract, boundary-validation | [Day 001](daily/day-001-from-c-to-modern-cpp.md) |
| 002 | — | Chapter 1 | 变量、统一初始化与安全类型转换；chapter-1, variables-initialization-casts | explicit-contract, boundary-validation | [Day 002](daily/day-002-variables-initialization-casts.md) |
| 003 | — | Chapter 1 | const、constexpr 与编译期思维；const-constexpr | explicit-contract | [Day 003](daily/day-003-const-constexpr.md) |
| 004 | — | Chapter 1 | 引用、const 引用与参数传递；references-parameter-passing | explicit-contract | [Day 004](daily/day-004-references-parameter-passing.md) |
| 005 | — | Chapter 1 | 指针、nullptr 与数组边界；pointers-nullptr-bounds | explicit-contract | [Day 005](daily/day-005-pointers-nullptr-bounds.md) |
| 006 | — | Chapter 1 | enum class、结构化绑定与类型安全状态机；enum-class-state-machine | explicit-contract | [Day 006](daily/day-006-enum-class-state-machine.md) |
| 007 | — | Chapter 2 | 第 1 周复盘：Modem 控制模块；week-review, modem-control, initialization | review | [Day 007](daily/day-007-week1-review-modem-control.md) |
| 008 | — | Chapter 2 | std::string 与 std::string_view：所有权、借用与零拷贝文本接口；string-string-view | explicit-contract | [Day 008](daily/day-008-string-string-view.md) |
| 009 | — | Chapter 2 | std::string 的构造、修改、搜索与数值转换；string-operations | explicit-contract | [Day 009](daily/day-009-string-operations.md) |
| 010 | — | Chapter 2 | string_view 深入：生命周期、子视图与安全解析；string-view-lifetime | explicit-contract | [Day 010](daily/day-010-string-view-lifetime.md) |
| 011 | — | Chapter 2 | 字符串格式化、字符编码与嵌入式文本边界；formatting-encoding | explicit-contract | [Day 011](daily/day-011-formatting-encoding.md) |
| 012 | — | Chapter 2 | 原始字符串字面量、文本常量与安全命令模板；raw-strings-command-templates | explicit-contract | [Day 012](daily/day-012-raw-strings-command-templates.md) |
| 013 | — | Chapter 3 | 可读性、命名与接口契约；readability, naming, interface-contracts | small-interface, naming-intent | [Day 013](daily/day-013-coding-with-style-foundations.md) |
| 014 | — | Chapter 3 | 头文件、自包含与依赖边界；chapter-3, headers-iwyu-dependencies | explicit-contract, boundary-validation | [Day 014](daily/day-014-headers-iwyu-dependencies.md) |
| 015 | — | Chapter 3 | 命名与接口意图；chapter-3, naming-interface-intent | explicit-contract, boundary-validation | [Day 015](daily/day-015-naming-interface-intent.md) |
| 016 | — | Chapter 3 | clang-format、clang-tidy 与编译告警；chapter-3, format-tidy-warnings | explicit-contract, boundary-validation | [Day 016](daily/day-016-format-tidy-warnings.md) |
| 017 | — | Chapter 3 | 错误处理、断言与清晰的控制流；error-handling, assert, control-flow | no-assert-for-recoverable-errors, early-return | [Day 017](daily/day-017-errors-assert-control-flow.md) |
| 018 | — | Chapter 3 | 函数边界与可维护控制流；chapter-3, function-boundaries-control-flow | explicit-contract, boundary-validation | [Day 018](daily/day-018-function-boundaries-control-flow.md) |
| 019 | — | Chapter 4 | Designing Professional C++ Programs：从需求到架构边界；requirements-architecture-boundaries | explicit-contract | [Day 019](daily/day-019-requirements-architecture-boundaries.md) |
| 020 | — | Chapter 4 | Chapter 4：需求、用例与设计决策；requirements-use-cases-decisions | explicit-contract | [Day 020](daily/day-020-requirements-use-cases-decisions.md) |
| 021 | — | Chapter 4 | 周复盘：可测试 Modem 架构；chapter-4, weekly-review-testable-modem-architecture | explicit-contract, boundary-validation | [Day 021](daily/day-021-weekly-review-testable-modem-architecture.md) |
| 022 | — | Chapter 4 | 抽象：稳定接口与隐藏实现；abstraction-stable-interface | explicit-contract | [Day 022](daily/day-022-abstraction-stable-interface.md) |
| 023 | — | Chapter 4 | 复用：标准库、第三方库或自研；chapter-4, reuse-stdlib-third-party-own | explicit-contract, boundary-validation | [Day 023](daily/day-023-reuse-stdlib-third-party-own.md) |
| 024 | — | Chapter 4 | 耦合、内聚与依赖管理；chapter-4, coupling-cohesion-dependencies | explicit-contract, boundary-validation | [Day 024](daily/day-024-coupling-cohesion-dependencies.md) |
| 025 | — | Chapter 4 | 设计文档、接口契约与原型验证；design-doc-contract-prototype | explicit-contract | [Day 025](daily/day-025-design-doc-contract-prototype.md) |
| 026 | — | Chapter 4 | 设计取舍、变化管理与稳定边界；tradeoffs-change-stable-boundaries | explicit-contract | [Day 026](daily/day-026-tradeoffs-change-stable-boundaries.md) |
| 027 | — | Chapter 4 | Chapter 4 收束：稳定设计与变更验证；chapter-4, chapter4-wrap-stable-design | explicit-contract, boundary-validation | [Day 027](daily/day-027-chapter4-wrap-stable-design.md) |
| 028 | — | Chapter 5 | 类的不变量与最小公共接口；chapter-5, class-invariants-minimal-interface | explicit-contract, boundary-validation | [Day 028](daily/day-028-class-invariants-minimal-interface.md) |
| 029 | — | Chapter 5 | 构造、初始化与有效状态；chapter-5, constructors-initialization-valid-state | explicit-contract, boundary-validation | [Day 029](daily/day-029-constructors-initialization-valid-state.md) |
| 030 | — | Chapter 5 | Composition：用对象组合分配职责；composition-object-responsibilities | explicit-contract | [Day 030](daily/day-030-composition-object-responsibilities.md) |
| 031 | — | Chapter 5 | 对象所有权、生命周期与资源边界；ownership, lifetime, raii | explicit-lifetime, raii-ownership | [Day 031](daily/day-031-ownership-lifetime-resource-boundaries.md) |
| 032 | — | Chapter 5 | is-a、继承层级与 Mixin：何时该继承；inheritance, is-a, mixins | prefer-composition, stable-interface | [Day 032](daily/day-032-inheritance-is-a-hierarchies-mixins.md) |
| 033 | — | Chapter 5 | 多态与虚接口；polymorphism, virtual-functions, interface-design | small-interface, virtual-destructor | [Day 033](daily/day-033-polymorphism-virtual-interfaces.md) |
| 034 | 2026-09-27 | Chapter 5 | override、final 与安全的多态析构；override, final, virtual-destructor | override-explicitly, virtual-destructor | [Day 034](daily/day-034-override-final-safe-polymorphic-destruction.md) |
| 035 | 2026-09-28 | Chapter 5 | 对象切片、动态类型与生命周期边界；object-slicing, dynamic-type, base-reference | avoid-slicing, explicit-lifetime | [Day 035](daily/day-035-object-slicing-dynamic-type-lifetime.md) |
| 036 | 2026-09-29 | Chapter 5 | has-a 与 is-a 的边界；has-a, is-a, composition | prefer-composition-when-ambiguous, small-interface | [Day 036](daily/day-036-has-a-vs-is-a-boundary.md) |
| 037 | 2026-09-30 | Chapter 5 | not-a 关系：既非 is-a 也非 has-a；not-a, over-classification, functional-relationships | avoid-artificial-hierarchies, single-responsibility | [Day 037](daily/day-037-not-a-relationship.md) |
| 038 | 2026-10-01 | Chapter 5 | 继承层级；hierarchies, abstract-base-class, shallow-hierarchy | keep-hierarchies-shallow, stable-base-contract | [Day 038](daily/day-038-hierarchies.md) |
| 039 | 2026-10-05 | Chapter 5 | 多重继承与多重契约；multiple-inheritance, interface-contracts, ambiguity | multiple-inheritance-only-for-clear-contracts, avoid-stateful-multiple-inheritance | [Day 039](daily/day-039-multiple-inheritance-contracts.md) |
| 040 | 2026-10-06 | Chapter 5 | Mixin 类；mixin-classes, behavior-composition, templates | keep-mixins-stateless-or-small, make-mixin-requirements-explicit | [Day 040](daily/day-040-mixin-classes.md) |
| 041 | 2026-10-07 | Chapter 6 | 复用始于稳定契约；reuse-contracts-components | explicit-contract | [Day 041](daily/day-041-reuse-contracts-components.md) |
| 042 | 2026-10-08 | Chapter 6 | 用抽象支撑复用；use-abstraction-for-reuse | explicit-contract | [Day 042](daily/day-042-use-abstraction-for-reuse.md) |
| 043 | 2026-10-09 | Chapter 6 | 为高效复用组织代码结构；structure-code-for-optimal-reuse | explicit-contract | [Day 043](daily/day-043-structure-code-for-optimal-reuse.md) |
| 044 | 2026-10-10 | Chapter 6 | 避免合并不相关或逻辑独立的概念；separate-unrelated-concepts | explicit-contract | [Day 044](daily/day-044-separate-unrelated-concepts.md) |
| 045 | 2026-10-11 | Chapter 6 | Use Templates for Generic Data Structures and Algorithms；templates, generic-programming, reusable-algorithms | explicit-template-contracts, bounded-storage | [Day 045](daily/day-045-templates-generic-data-structures-algorithms.md) |
| 046 | 2026-10-12 | Chapter 6 | Provide Appropriate Checks and Safeguards；preconditions, validation, invariants | validate-external-input, recoverable-errors-not-assert | [Day 046](daily/day-046-checks-safeguards.md) |
| 047 | 2026-10-13 | Chapter 6 | Design for Extensibility；extensibility, open-closed-principle, customization-points | prefer-explicit-customization-points, inject-dependencies | [Day 047](daily/day-047-design-for-extensibility.md) |
| 048 | 2026-10-14 | Chapter 6 | Design Usable Interfaces；usable-interfaces, contracts, type-safety | make-invalid-states-hard, express-units-in-types | [Day 048](daily/day-048-design-usable-interfaces.md) |
| 049 | 2026-10-15 | Chapter 6 | Consider the Audience and Purpose；usable-interfaces, audience, purpose | adapter, dependency-injection, interface-segregation | [Day 049](daily/day-049-consider-audience-purpose.md) |
| 050 | 2026-10-15 | Chapter 6 | Design Interfaces That Are Easy to Use；easy-to-use-interfaces, familiar-conventions, raii | facade, adapter, dependency-injection | [Day 050](daily/day-050-easy-to-use-interfaces.md) |
| 051 | 2026-10-16 | Chapter 6 | Design General-Purpose Interfaces；general-purpose-interfaces, policy-mechanism, customization-points | strategy, dependency-injection | [Day 051](daily/day-051-general-purpose-interfaces.md) |
| 052 | 2026-10-17 | Chapter 6 | Reconciling Generality and Ease of Use；generality, ease-of-use, layered-api | facade, adapter, dependency-injection | [Day 052](daily/day-052-reconciling-generality-ease-of-use.md) |
| 053 | 2026-10-18 | Chapter 6 | Designing a Successful Abstraction；abstraction, contract, invariants | adapter, dependency-injection | [Day 053](daily/day-053-designing-successful-abstraction.md) |
| 054 | 2026-10-19 | Chapter 6 | The SOLID Principles；solid, srp, ocp | adapter, dependency-injection | [Day 054](daily/day-054-solid-principles.md) |
| 055 | 2026-10-20 | Chapter 6 | Chapter 6 Summary and Engineering Exercises；reuse, abstraction, extensibility | adapter, dependency-injection, composition | [Day 055](daily/day-055-chapter6-review-exercises.md) |
| 056 | 2026-10-21 | Chapter 7 | Memory Management Foundations · Ownership and RAII；memory-management, ownership, raii | raii, dependency-injection | [Day 056](daily/day-056-memory-management-ownership-raii.md) |
| 057 | 2026-10-22 | Chapter 7 | Smart Pointers · Ownership Transfer and Borrowing；smart-pointers, unique-ptr, ownership-transfer | raii, dependency-injection | [Day 057](daily/day-057-smart-pointers-ownership-transfer.md) |
| 058 | 2026-10-23 | Chapter 7 | Allocation Failure · Arrays and Resource Boundaries；allocation-failure, nothrow-new, arrays | raii, dependency-injection | [Day 058](daily/day-058-allocation-failure-resource-boundaries.md) |
| 059 | 2026-10-24 | Chapter 7 | Custom Deleters · Non-Memory Resources and RAII Boundaries；custom-deleter, unique-ptr, raii | raii, adapter, dependency-injection | [Day 059](daily/day-059-custom-deleters-non-memory-resources.md) |
| 060 | 2026-10-25 | Chapter 7 | Shared Ownership · shared_ptr, weak_ptr and Lifetime Cycles；shared-ptr, weak-ptr, control-block | observer, dependency-injection | [Day 060](daily/day-060-shared-ptr-weak-ptr-lifetime.md) |
| 061 | 2026-10-26 | Chapter 7 | enable_shared_from_this · Async Callback Lifetime and Teardown；enable-shared-from-this, weak-from-this, callback-lifetime | observer, dependency-injection | [Day 061](daily/day-061-enable-shared-from-this-callback-lifetime.md) |
| 062 | 2026-10-27 | Chapter 7 | Smart Pointer Aliasing, Casts and Ownership API Boundaries；shared-ptr-aliasing, pointer-casts, ownership-api | adapter, dependency-injection | [Day 062](daily/day-062-smart-pointer-aliasing-casts-ownership-api.md) |
| 063 | 2026-10-28 | Chapter 7 | PMR, Bounded Allocation and Memory-Resource Policy；pmr, memory-resource, bounded-allocation | dependency-injection, strategy | [Day 063](daily/day-063-pmr-bounded-allocation-resource-policy.md) |
| 064 | 2026-10-29 | Chapter 7 | Object Lifetime, Placement Construction and Fixed Storage Reuse；object-lifetime, placement-construction, construct-at | object-pool, dependency-injection | [Day 064](daily/day-064-object-lifetime-placement-construction-fixed-pool.md) |
| 065 | 2026-10-30 | Chapter 7 | Optional Lifetime and Fixed-Pool Safety Boundaries；optional, object-lifetime, fixed-pool | object-pool, dependency-injection | [Day 065](daily/day-065-optional-fixed-pool-lifetime-boundaries.md) |
| 066 | 2026-10-31 | Chapter 7 | Memory Management Resource Boundary Decision Tree；ownership, raii, smart-pointers | dependency-injection, object-pool, strategy | [Day 066](daily/day-066-memory-management-resource-boundary-decision-tree.md) |
| 067 | 2026-11-01 | Chapter 8 | Class Encapsulation and Member Functions；classes, access-control, member-functions | encapsulation, information-hiding, composition | [Day 067](daily/day-067-class-encapsulation-member-functions.md) |
| 068 | 2026-11-02 | Chapter 8 | Object Storage Duration, this and C++23 Explicit Object Parameters；object-storage-duration, automatic-storage, dynamic-storage | encapsulation, value-semantics, raii | [Day 068](daily/day-068-object-storage-this-explicit-object-parameter.md) |
| 069 | 2026-11-03 | Chapter 8 | Object Creation and Constructors · Establishing Valid Objects；object-lifetime, object-creation, constructors | composition, dependency-injection | [Day 069](daily/day-069-object-creation-constructors.md) |
| 070 | 2026-11-04 | Chapter 8 | Constructor Initializer Lists and Member Initialization Order；constructor-initializer-list, direct-member-initialization, member-initialization-order | composition, dependency-injection, adapter | [Day 070](daily/day-070-constructor-initializer-list-member-order.md) |
| 071 | 2026-11-05 | Chapter 8 | Copy Constructors and Value Semantics；copy-constructor, memberwise-copy, value-semantics | composition, value-semantics, prototype | [Day 071](daily/day-071-copy-constructors-value-semantics.md) |
| 072 | 2026-11-06 | Chapter 8 | Initializer-List Constructors and Braced-Initialization Semantics；initializer-list-constructor, std-initializer-list, list-initialization | composition, value-semantics | [Day 072](daily/day-072-initializer-list-constructors.md) |
| 073 | 2026-11-06 | Chapter 8 | Delegating Constructors and Canonical Initialization Path；delegating-constructors, canonical-constructor, constructor-invariants | composition, value-semantics | [Day 073](daily/day-073-delegating-constructors.md) |
| 074 | 2026-11-07 | Chapter 8 | Converting Constructors and Explicit Constructors；隐式转换、四种初始化、explicit(bool)、强类型单位 | value-object, adapter, explicit-conversion-boundary | [Day 074](daily/day-074-converting-constructors-explicit.md) |
| 075 | 2026-11-08 | Chapter 8 | Summary of Compiler-Generated Constructors；隐式 default/copy constructor、memberwise copy、=default/=delete、type traits | rule-of-zero, composition, unique-resource-owner | [Day 075](daily/day-075-summary-compiler-generated-constructors.md) |
| 076 | 2026-11-09 | Chapter 8 | Object Destruction：析构时机、成员逆序销毁、virtual destructor、Stop(timeout) 与 no-throw fallback；object-destruction, destructor-order, raii-teardown | raii, composition, adapter, callback-teardown | [Day 076](daily/day-076-object-destruction-raii-teardown.md) |

## 专题

不占用 Day 编号的源码精读与扩展：

- [shared_ptr 实现原理：控制块、引用计数与内存序](topics/stdlib/shared-ptr-internals/)

## 发布规则

- 每次先读取本文件和 `daily/`，按实际最大 Day + 1 生成；不得根据历史对话猜编号。
- 每节约 60 分钟，按十环节组织：章节、复习、概念、C/C++ 对照、模式映射、Embedded 场景、规范、可编译 Lab/练习、常见坑、检查题。
- 每个可修改练习必须有独立 `.cpp`、自己的 `int main()`、编译命令和可观察输出。
- 每次提交前独立编译所有当日 `examples/day-XXX/*.cpp`，并运行主 Lab。
- 每 7 天进行一次周复盘，包含 Code Review 与 Design Review。
- 失败时不推进 Day 编号；只写入本仓库，不发送 Gmail 或其他邮件。
