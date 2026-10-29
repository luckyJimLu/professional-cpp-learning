# 逐课入门导航与资料对照

返回[新手入门手册](beginner-start.md)。按 Day 顺序是默认主线；前置列用于查缺补漏，不是要求阅读每篇进阶资料。所有链接只指向已存在的课程。

本轮覆盖已发布的 Day 1–64，后续新增课程按[课程模板](day-template.md)补齐导读。练习栏以各课第⑥节为准；每课第③节提供术语和执行步骤，第⑧节提供辨析答案与资料库入口。

| 课程 | 建议先掌握 | 首先理解什么 |
| --- | --- | --- |
| [Day 1 · 从 C 进入现代 C++](../daily/day-001-from-c-to-modern-cpp.md) | 入门手册 | 翻译单元；命名空间 |
| [Day 2 · 变量、统一初始化与安全类型转换](../daily/day-002-variables-initialization-casts.md) | Day 1 | 初始化；窄化 |
| [Day 3 · const、constexpr 与编译期思维](../daily/day-003-const-constexpr.md) | Day 1、Day 2 | 常量表达式；static_assert |
| [Day 4 · 引用、const 引用与参数传递](../daily/day-004-references-parameter-passing.md) | Day 2、Day 3 | 按值；引用 |
| [Day 5 · 指针、nullptr 与数组边界](../daily/day-005-pointers-nullptr-bounds.md) | Day 2、Day 4 | nullptr；span |
| [Day 6 · enum class、结构化绑定与类型安全状态机](../daily/day-006-enum-class-state-machine.md) | Day 2、Day 4、Day 5 | 枚举；状态转移 |
| [Day 7 · Week 1 Review - Modem Control Module](../daily/day-007-week1-review-modem-control.md) | Day 1、Day 4、Day 5、Day 6 | 契约；fake |
| [Day 8 · std::string 与 std::string_view：所有权、借用与零拷贝文本接口](../daily/day-008-string-string-view.md) | Day 4、Day 5 | string；string_view |
| [Day 9 · std::string 的构造、修改、搜索与数值转换](../daily/day-009-string-operations.md) | Day 2、Day 8 | npos；from_chars |
| [Day 10 · string_view 深入：生命周期、子视图与安全解析](../daily/day-010-string-view-lifetime.md) | Day 5、Day 8、Day 9 | 子视图；悬空 |
| [Day 11 · 字符串格式化、字符编码与嵌入式文本边界](../daily/day-011-formatting-encoding.md) | Day 8、Day 9 | 编码；格式化 |
| [Day 12 · 原始字符串字面量、文本常量与安全命令模板](../daily/day-012-raw-strings-command-templates.md) | Day 8、Day 9、Day 11 | 转义；原始字符串 |
| [Day 13 · Readability, Naming and Interface Contracts](../daily/day-013-coding-with-style-foundations.md) | Day 2、Day 4、Day 6 | 接口；契约 |
| [Day 14 · 头文件、自包含与依赖边界](../daily/day-014-headers-iwyu-dependencies.md) | Day 1、Day 4、Day 13 | 声明；定义 |
| [Day 15 · 命名与接口意图](../daily/day-015-naming-interface-intent.md) | Day 6、Day 13、Day 14 | 单位类型；结果枚举 |
| [Day 16 · clang-format、clang-tidy 与编译告警](../daily/day-016-format-tidy-warnings.md) | Day 2、Day 13、Day 14 | 告警；静态分析 |
| [Day 17 · Errors, Assert and Clear Control Flow](../daily/day-017-errors-assert-control-flow.md) | Day 5、Day 6、Day 16 | 运行时错误；断言 |
| [Day 18 · 函数边界与可维护控制流](../daily/day-018-function-boundaries-control-flow.md) | Day 2、Day 9、Day 17 | 单一职责函数；提前返回 |
| [Day 19 · Designing Professional C++ Programs：从需求到架构边界](../daily/day-019-requirements-architecture-boundaries.md) | Day 7、Day 13、Day 17 | 策略；机制 |
| [Day 20 · Chapter 4：需求、用例与设计决策](../daily/day-020-requirements-use-cases-decisions.md) | Day 17、Day 19 | 用例；验收条件 |
| [Day 21 · 周复盘：可测试 Modem 架构](../daily/day-021-weekly-review-testable-modem-architecture.md) | Day 7、Day 19、Day 20 | 依赖注入；可测试性 |
| [Day 22 · 抽象：稳定接口与隐藏实现](../daily/day-022-abstraction-stable-interface.md) | Day 19、Day 20、Day 21 | 抽象；实现细节 |
| [Day 23 · 复用：标准库、第三方库或自研](../daily/day-023-reuse-stdlib-third-party-own.md) | Day 9、Day 14、Day 22 | 复用；评估标准 |
| [Day 24 · 耦合、内聚与依赖管理](../daily/day-024-coupling-cohesion-dependencies.md) | Day 19、Day 22、Day 23 | 内聚；耦合 |
| [Day 25 · 设计文档、接口契约与原型验证](../daily/day-025-design-doc-contract-prototype.md) | Day 20、Day 22、Day 24 | 不变量；原型 |
| [Day 26 · 设计取舍、变化管理与稳定边界](../daily/day-026-tradeoffs-change-stable-boundaries.md) | Day 19、Day 22、Day 25 | 变化轴；取舍 |
| [Day 27 · Chapter 4 收束：稳定设计与变更验证](../daily/day-027-chapter4-wrap-stable-design.md) | Day 6、Day 20、Day 26 | 转移表；回归测试 |
| [Day 28 · 类的不变量与最小公共接口](../daily/day-028-class-invariants-minimal-interface.md) | Day 4、Day 17、Day 25 | 封装；不变量 |
| [Day 29 · 构造、初始化与有效状态](../daily/day-029-constructors-initialization-valid-state.md) | Day 2、Day 17、Day 28 | 构造；工厂 |
| [Day 30 · Composition：用对象组合分配职责](../daily/day-030-composition-object-responsibilities.md) | Day 4、Day 19、Day 28、Day 29 | 组合；借用依赖 |
| [Day 31 · Object Ownership, Lifetime and Resource Boundaries](../daily/day-031-ownership-lifetime-resource-boundaries.md) | Day 4、Day 28、Day 30 | 所有者；RAII |
| [Day 32 · is-a, Hierarchies and Mixins - When to Inherit](../daily/day-032-inheritance-is-a-hierarchies-mixins.md) | Day 22、Day 28、Day 30 | is-a；has-a |
| [Day 33 · Polymorphism and Virtual Interfaces](../daily/day-033-polymorphism-virtual-interfaces.md) | Day 22、Day 30、Day 32 | 虚函数；动态多态 |
| [Day 34 · override, final and Safe Polymorphic Destruction](../daily/day-034-override-final-safe-polymorphic-destruction.md) | Day 31、Day 32、Day 33 | override；虚析构 |
| [Day 35 · Object Slicing, Dynamic Type and Lifetime Boundaries](../daily/day-035-object-slicing-dynamic-type-lifetime.md) | Day 4、Day 31、Day 33、Day 34 | 切片；动态类型 |
| [Day 36 · The Fine Line Between Has-a and Is-a](../daily/day-036-has-a-vs-is-a-boundary.md) | Day 30、Day 32、Day 35 | 转发；装饰 |
| [Day 37 · The Not-a Relationship](../daily/day-037-not-a-relationship.md) | Day 24、Day 30、Day 32 | 正交职责；协作 |
| [Day 38 · Hierarchies](../daily/day-038-hierarchies.md) | Day 32、Day 33、Day 36、Day 37 | 层次结构；替换性 |
| [Day 39 · Multiple Inheritance and Multiple Contracts](../daily/day-039-multiple-inheritance-contracts.md) | Day 32、Day 33、Day 38 | 多接口；菱形继承 |
| [Day 40 · Mixin Classes](../daily/day-040-mixin-classes.md) | Day 30、Day 33、Day 36、Day 39 | mixin；模板实例化 |
| [Day 41 · Reuse Starts with Stable Contracts](../daily/day-041-reuse-contracts-components.md) | Day 17、Day 22、Day 25 | 稳定契约；复用 |
| [Day 42 · Use Abstraction for Reuse](../daily/day-042-use-abstraction-for-reuse.md) | Day 22、Day 30、Day 33、Day 41 | 依赖倒置；替身 |
| [Day 43 · Structure Your Code for Optimal Reuse](../daily/day-043-structure-code-for-optimal-reuse.md) | Day 14、Day 24、Day 41、Day 42 | 模块边界；组合根 |
| [Day 44 · Avoid Combining Unrelated or Logically Separate Concepts](../daily/day-044-separate-unrelated-concepts.md) | Day 24、Day 30、Day 41、Day 43 | 关注点分离；重试预算 |
| [Day 45 · Use Templates for Generic Data Structures and Algorithms](../daily/day-045-templates-generic-data-structures-algorithms.md) | Day 2、Day 5、Day 28、Day 41 | 模板参数；concept |
| [Day 46 · Provide Appropriate Checks and Safeguards](../daily/day-046-checks-safeguards.md) | Day 5、Day 17、Day 28、Day 41 | 信任边界；防护 |
| [Day 47 · Design for Extensibility](../daily/day-047-design-for-extensibility.md) | Day 26、Day 33、Day 41、Day 44 | 扩展点；开闭原则 |
| [Day 48 · Design Usable Interfaces](../daily/day-048-design-usable-interfaces.md) | Day 13、Day 15、Day 17、Day 46 | 易用性；强类型 |
| [Day 49 · Consider the Audience and Purpose](../daily/day-049-consider-audience-purpose.md) | Day 22、Day 24、Day 42、Day 48 | 受众；最小能力 |
| [Day 50 · Design Interfaces That Are Easy to Use](../daily/day-050-easy-to-use-interfaces.md) | Day 28、Day 29、Day 48、Day 49 | 安全默认值；RAII |
| [Day 51 · Design General-Purpose Interfaces](../daily/day-051-general-purpose-interfaces.md) | Day 26、Day 42、Day 44、Day 48 | 机制；策略 |
| [Day 52 · Reconciling Generality and Ease of Use](../daily/day-052-reconciling-generality-ease-of-use.md) | Day 48、Day 50、Day 51 | 分层 API；默认委托 |
| [Day 53 · Designing a Successful Abstraction](../daily/day-053-designing-successful-abstraction.md) | Day 22、Day 25、Day 41、Day 52 | 成功抽象；可观察性 |
| [Day 54 · The SOLID Principles](../daily/day-054-solid-principles.md) | Day 24、Day 32、Day 42、Day 47、Day 53 | SOLID；替换契约 |
| [Day 55 · Chapter 6 Summary and Engineering Exercises](../daily/day-055-chapter6-review-exercises.md) | Day 41、Day 44、Day 48、Day 53、Day 54 | 章末验收；资源预算 |
| [Day 56 · Memory Management Foundations · Ownership and RAII](../daily/day-056-memory-management-ownership-raii.md) | Day 4、Day 28、Day 30、Day 31 | 存储期；生命周期 |
| [Day 57 · Smart Pointers · Ownership Transfer and Borrowing](../daily/day-057-smart-pointers-ownership-transfer.md) | Day 4、Day 31、Day 56 | 移动；唯一所有权 |
| [Day 58 · Allocation Failure · Arrays and Resource Boundaries](../daily/day-058-allocation-failure-resource-boundaries.md) | Day 5、Day 17、Day 56、Day 57 | 分配失败；nothrow new |
| [Day 59 · Custom Deleters · Non-Memory Resources and RAII Boundaries](../daily/day-059-custom-deleters-non-memory-resources.md) | Day 31、Day 56、Day 57、Day 58 | 自定义删除器；资源配对 |
| [Day 60 · Shared Ownership · shared_ptr, weak_ptr and Lifetime Cycles](../daily/day-060-shared-ptr-weak-ptr-lifetime.md) | Day 31、Day 56、Day 57、Day 59 | 控制块；弱引用 |
| [Day 61 · enable_shared_from_this · Async Callback Lifetime and Teardown](../daily/day-061-enable-shared-from-this-callback-lifetime.md) | Day 33、Day 57、Day 60 | shared_from_this；teardown |
| [Day 62 · Smart Pointer Aliasing, Casts and Ownership API Boundaries](../daily/day-062-smart-pointer-aliasing-casts-ownership-api.md) | Day 4、Day 33、Day 60、Day 61 | 别名共享指针；类型转换 |
| [Day 63 · PMR, Bounded Allocation and Memory-Resource Policy](../daily/day-063-pmr-bounded-allocation-resource-policy.md) | Day 5、Day 28、Day 56、Day 58 | PMR；arena |
| [Day 64 · Object Lifetime, Placement Construction and Fixed Storage Reuse](../daily/day-064-object-lifetime-placement-construction-fixed-pool.md) | Day 5、Day 28、Day 56、Day 57、Day 63 | 原始存储；构造就地对象 |

## 资料与验证约定

主教材按仓库既有《Professional C++, Sixth Edition》路线定位，不新增未经核对的页码或大段原书转载。课程导读以对应 `examples/day-XXX/main.cpp`、已有工程规范和专题为依据。迁移资料保持原始内容与 SHA-256 清单，工程解读写在每日课和导读中。

所有权主题对照 `patterns/ownership-and-smart-pointers.md`；设计与复用对照 `patterns/engineering-workshop.md` 和 `docs/chapter-06-review.md`；异步专题按 `frameworks/asio/SESSION_LIFECYCLE.md` 的版本边界继续学习。主机验证与真实硬件验证分开记录。
