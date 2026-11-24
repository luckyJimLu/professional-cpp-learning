# Chapter 3 QA · Coding Style：从语言语义到团队治理

> 类型：跨课程 QA / 精读复盘，不占用 Daily Day 编号  
> 主教材：Marc Gregoire, *Professional C++, Sixth Edition*，Chapter 3 · Coding with Style  
> 关联课程：[Day 013](../daily/day-013-coding-with-style-foundations.md) · [Day 014](../daily/day-014-headers-iwyu-dependencies.md) · [Day 015](../daily/day-015-naming-interface-intent.md) · [Day 016](../daily/day-016-format-tidy-warnings.md) · [Day 017](../daily/day-017-errors-assert-control-flow.md) · [Day 018](../daily/day-018-function-boundaries-control-flow.md)

## 核心问题

代码风格不是主观审美问题，而是通过类型系统、语言语义与结构分解，在长期维护中控制认知负荷与缺陷率的工程约束。

**技术主线：**

注释边界与自文档化 → 求值语义与 UB 风险 → const 正确性 → 引用、指针与错误处理取舍 → 重构分解与团队治理。

**关键机制：**

- 前置条件（Precondition）与后置条件（Postcondition）
- 未定义行为（Undefined Behavior, UB）与求值顺序
- 保留标识符（Reserved Identifiers）
- const 正确性与 const_cast 的边界
- 引用、指针、所有权与借用语义
- 函数分解、自动格式化与持续集成

---

## Q1｜注释的边界：什么该写进注释，什么该写进类型系统？

**主线 · 阶梯 1/6：概念与问题域**

### Question

既然好代码应当追求“自文档化”，那么注释是不是越少越好？在 C++ 中，究竟哪些信息是语言语法本身无法表达、必须靠注释补全的，又有哪些信息其实不该靠注释“打补丁”，而应该直接下沉到类型系统里？

### Answer

**核心结论：** 注释只负责补充代码本身无法表达的契约、意图与算法不变量；凡是能通过强类型和清晰函数名表达的语义，应优先写进代码。

**底层机制：**

函数签名可以表达参数和返回值的静态类型、cv 限定、引用限定等信息，但通常不能完整表达：

- 调用前必须满足的业务前置条件；
- 成功返回后建立的后置条件；
- 资源、线程上下文与调用顺序约束；
- 循环不变量（Loop Invariant）；
- 时间复杂度、WCET 上界和实时性承诺；
- 某些实现相关或平台相关的限制。

C++ 的异常规范也不能表达任意“可能抛出的异常类型集合”：现代 C++ 的动态异常规范已被移除，\`noexcept\` 表达的是异常是否允许逃出函数，而不是完整异常类型列表。

若函数返回泛化的 \`int\` 表示数据库记录 ID，调用者必须依赖注释或外部约定理解它的语义。可以用独立类型消除这类歧义：

**反例：**

\`\`\`cpp
// Saves record and returns int ID.
int saveRecord(Record& record);
\`\`\`

**推荐：**

\`\`\`cpp
struct RecordId {
  std::uint64_t value{};
};

// If the record has no ID, this function assigns one.
// Requires: the database session is open.
// Returns: the persistent ID assigned to the record.
[[nodiscard]] RecordId saveRecord(Record& record);
\`\`\`

类型表达“这是 RecordId”，注释表达“何时分配、需要什么状态、成功后发生什么”。

### 设计取舍与边界

- 公共接口注释应描述调用者可观察的行为：输入约束、输出、错误、线程安全、阻塞和性能保证。
- 不要把实现细节写成公共契约；否则实现重构会被迫同步修改无关调用方。
- 作者、修改日期和变更历史交给 Git，不要在源码头部维护容易过期的人工日志。
- 注释不是类型系统的替代品；类型也不能自动表达全部业务不变量。

**回归主线：** 代码表达结构与类型，注释表达契约与意图。

---

## Q2｜“炫技”表达式的底层代价：从未定义行为到 C++17 求值顺序

**主线 · 阶梯 2/6：底层机制**

### Question

开发者喜欢把多步操作压进单行表达式，例如 \`i++ + ++i\` 或 \`a[i] = ++i\`。这类写法仅仅是可读性差，还是可能在语言语义层面引发不可预测行为？

### Answer

**核心结论：**

- \`i++ + ++i\` 对同一个标量对象产生未排序的冲突副作用，属于未定义行为（UB）。
- \`a[i] = ++i\` 在 C++17 起，右侧求值先于左侧求值，因此其求值顺序有定义；但它依然高度晦涩，应在工程代码中拆开。

**底层机制：**

C++ 的表达式求值不仅涉及“先算哪一边”，还涉及副作用之间是否存在 sequenced-before 关系。

在：

\`\`\`cpp
int x = i++ + ++i;
\`\`\`

对同一个 \`i\` 的修改没有得到必要的顺序约束，因此行为未定义。编译器不需要为这种程序提供可预测结果。

对于：

\`\`\`cpp
a[i] = ++i;
\`\`\`

C++17 起，赋值运算符右操作数先于左操作数求值，因此递增发生在下标表达式求值之前。注意：这不意味着所有复杂表达式都获得了从左到右的求值保证。

**推荐写法：**

\`\`\`cpp
++i;
a[i] = i;
\`\`\`

拆分语句，让状态变化、下标选择和写入顺序直接可见。

### 控制流也遵循同一原则

**反例：**

\`\`\`cpp
if (connected)
  sendCommand();
  updateStatistics();  // 实际上不受 if 控制
\`\`\`

**推荐：**

\`\`\`cpp
if (connected) {
  sendCommand();
  updateStatistics();
}
\`\`\`

始终为 \`if\`、\`for\`、\`while\` 分支使用花括号，降低后续修改时引入控制流错误的概率。宏展开尤其需要谨慎；多语句宏应采用 \`do { ... } while (false)\` 结构并避免隐藏控制流。

### 设计取舍与边界

代码风格的底线不是“所有合法表达式都可以接受”，而是让状态变化和控制依赖足够明确。不要用编译器恰好给出的结果为 UB 程序辩护。

**回归主线：** 好风格首先规避语言标准层面的不确定性，再谈视觉可读性。

---

## Q3｜标识符命名的隐形雷区：编译器与标准库保留标识符

**支线 L1 · 命名规范与保留标识符**

### Question

给私有变量或内部符号加下划线前缀（如 \`_Name\`、\`_count\`）或双下划线（如 \`my__var\`），只是团队审美差异吗？

### Answer

**核心结论：** 不是。部分标识符被标准保留给实现使用，用户代码不能占用。

**常见保留规则（简明记忆）：**

1. 含有双下划线的标识符（例如 \`my__name\`）保留给实现。
2. 以下划线后接大写字母开头的标识符（例如 \`_Name\`）保留给实现。
3. 以下划线开头的标识符，在全局命名空间中保留给实现。

这些名称可能与编译器、标准库或平台实现内部名称冲突。不要把“当前工具链能编译”当成合规证明。

**反例：**

\`\`\`cpp
int _GlobalCount;
int my__counter;
int _DeviceState;
\`\`\`

最后一项如果位于命名空间或类作用域，单下划线后接小写字母并不因这条规则自动成为保留标识符；但本项目仍建议统一避开容易混淆的前导下划线。

**推荐：**

\`\`\`cpp
int global_count{};
int device_state{};
bool isCompleted() const;
\`\`\`

### 命名风格的设计取舍

- \`m_\`、\`s_\` 等成员/静态成员前缀属于团队约定，不是 C++ 标准要求。
- 匈牙利命名法将类型编码进变量名，在现代 IDE、类型系统和代码审查中通常没有必要。
- 对容易冲突的常量，优先使用命名空间或 \`enum class\`，而不是依赖裸整数和注释。

**回归主线：** 命名不仅要传达业务语义，还必须遵守标准为实现保留的标识符边界。

---

## Q4｜const 正确性的破窗效应：面对遗留非 const 接口怎么办？

**主线 · 阶梯 3/6：边界与陷阱**

### Question

当一个接收 const 参数的函数必须调用第三方遗留库中未标 const 的接口时，是否应该把上层调用链的 const 一路删掉？如何隔离遗留边界？

### Answer

**核心结论：** 不要为了迁就单个遗留接口而反向拆除上层 const 契约。优先使用适配器、局部副本或修正遗留 API；只有在确认底层绝不写入参数时，才考虑在极窄边界使用 \`const_cast\`。

**底层机制：**

\`const_cast\` 只改变表达式的 cv 限定，不会把原对象“变成可修改对象”。

如果原始对象本身是 const，而代码通过去掉 const 后写入它，行为未定义。即使原对象不是 const，若底层函数实际写入了调用者承诺只读的对象，也会违反接口契约。

**反例：**

\`\`\`cpp
void process(char* text) {
  legacyReadOnlyApi(text);
}
\`\`\`

这让调用者误以为 process 需要可修改缓冲区，扩大了可变接口面。

**首选方案：局部副本适配**

\`\`\`cpp
void process(std::string_view text) {
  std::string mutable_copy{text};
  legacyApiRequiresMutablePointer(mutable_copy.data());
}
\`\`\`

若已通过文档、源码和测试确认遗留函数只读，且其 API 无法修改，可以将 cast 隔离在单一适配器中：

\`\`\`cpp
void process(const char* text) {
  // SAFETY: legacyReadOnlyApi is documented and verified not to write.
  legacyReadOnlyApi(const_cast<char*>(text));
}
\`\`\`

该方案必须附带明确的安全依据；不能仅凭函数名包含 \`ReadOnly\` 就假定安全。

### 设计取舍与边界

1. 能改第三方封装层时，提供真正的 const-correct overload。
2. 无法修改且可能写入时，传入可修改副本。
3. 只有确认只读且副作用受控时，才允许局部 const_cast。
4. 禁止把 const_cast 扩散到业务调用链。

**回归主线：** const 是接口契约。遗留妥协必须局部化，不应侵蚀整个模块的只读语义。

---

## Q5｜引用 vs 指针、异常 vs 错误码：语言特性的风格取舍

**主线 · 阶梯 4/6：方案对比与取舍**

### Question

“传指针在调用点能看到 \`&obj\`，因此更清楚地表示对象可能被修改”是否成立？错误处理应该优先异常还是错误码？

### Answer

**核心结论：** 不能仅凭调用点的 \`&obj\` 判断函数是否修改对象。参数的可空性、所有权、可重绑定性和错误策略应通过接口契约共同表达。异常还是错误码，应根据项目策略、调用边界和实时约束选择，不能一概而论。

### 1. 引用与指针

调用点：

\`\`\`cpp
updateConfig(&config);
updateConfig(config);
\`\`\`

并不能独立说明可变性。需要看声明：

\`\`\`cpp
void inspect(const Config* config);  // 可空，只读
void update(Config& config);         // 非空，可修改
void updateIfPresent(Config* config); // 可空，可修改
\`\`\`

推荐约定：

- 必须存在、非拥有借用：优先使用引用。
- 可选对象：使用指针或 \`std::optional\` 等能表达可空性的形式。
- 所有权转移：用 \`std::unique_ptr\` 等明确表达。
- 共享所有权：只有确实存在共享生命周期需求时才用 \`std::shared_ptr\`。
- 原始指针通常表示非拥有借用，但这是项目约定，不是原始指针本身强制保证的语义。

**重要修正：** 引用不能为 null，也不能重新绑定，但不自动保证被引用对象的生命周期。引用同样可能悬空；borrow 的有效期必须由接口和调用关系保证。

### 2. 异常与错误码

一般应用程序可以在明确的异常策略下使用异常表达不可恢复或非正常失败；但在禁用异常的嵌入式工程、ISR、硬实时路径或 ABI 边界，应使用显式错误模型。

**错误码接口：**

\`\`\`cpp
enum class ErrorCode {
  kOk,
  kInvalidArgument,
  kTimeout,
  kTransportFailure,
};

[[nodiscard]] ErrorCode tryUpdateConfig(Config& config);
\`\`\`

\`[[nodiscard]]\` 能让编译器对忽略返回值发出诊断，但是否升级为 CI 错误由项目编译选项决定。

**异常接口（仅适用于允许异常的项目边界）：**

\`\`\`cpp
void updateConfig(Config& config);  // 失败通过项目约定的异常类型报告
\`\`\`

### 设计取舍与边界

| 场景 | 建议 |
|---|---|
| 普通应用层，允许异常且失败确属异常路径 | 可采用异常并保证 RAII |
| 禁用异常的嵌入式项目 | \`[[nodiscard]]\` 错误码或显式 Result 类型 |
| ISR / 硬实时路径 | 不抛异常；错误传播必须有界 |
| C ABI / 第三方 C 接口 | 明确错误码和资源释放约定 |
| 可选输入 | 指针或显式 Optional |
| 必需非空借用 | 引用 |

**回归主线：** 语言特性是接口契约的一部分。选择应服从可空性、所有权、生命周期、错误传播和实时约束。

---

## Q6｜从单人风格到团队治理：重构分解与自动化格式化

**主线 · 阶梯 5/6：工程实践**

### Question

多人协作与长期迭代中，函数不断叠加补丁而膨胀，缩进、空格和换行符的分歧也制造大量无意义 diff。如何把风格落成刚性机制？

### Answer

**核心结论：** 结构腐化靠有测试保护的持续重构治理；格式分歧靠统一规范和自动化工具消除。

### 1. 重构分解

常见重构动作：

- Extract Function：把有名字的业务步骤提取为具名函数。
- Extract Class：把拥有独立状态与不变量的职责提取为类。
- Encapsulate Data：隐藏可变成员，通过小接口维护不变量。
- Replace Magic Number with Named Constant：用具名常量表达单位和业务含义。

重构前先用测试固定外部行为。测试不是重构的替代品，而是验证行为没有意外改变的安全网。

### 2. 自动化治理

建议在仓库中统一：

- \`clang-format\`：格式化规则；
- \`clang-tidy\`：静态分析和现代 C++ 规则；
- 编译告警：启用并逐步收紧 warning；
- \`git diff --check\`：检查空白错误；
- \`.editorconfig\`：统一编辑器缩进、换行与字符编码；
- \`.gitattributes\`：统一文本文件换行策略；
- CI：执行格式检查、静态分析、单元测试和独立示例编译。

### 3. 工程对照

**反例：**

\`\`\`text
团队依赖口头约定
  -> 每人保存格式不同
  -> PR 出现大量格式噪声
  -> Code Review 被排版问题占据
  -> 真实逻辑变更更难发现
\`\`\`

**推荐：**

\`\`\`text
统一 .clang-format / .editorconfig / .gitattributes
  -> 本地自动格式化
  -> CI 检查格式与静态分析
  -> 单元测试保护行为
  -> Review 聚焦契约、所有权和架构变化
\`\`\`

### 设计取舍与边界

先统一能自动验证的底线项，例如命名规则、缩进、换行、编译告警与测试门禁。对主观性较强的注释风格，优先约定原则和示例，不要让团队陷入无收益的格式争论。

**回归主线：** 让机器处理可机械检查的规则，让人把注意力留给设计与行为。

---

## Q6+｜所有权语义：风格规范必须延伸到生命周期

这一节是对前六问的工程补充：注释和命名只能降低理解成本，真正的资源安全还要靠所有权与生命周期设计。

### 需要区分的四种语义

| 语义 | 常见表达 | 关键约束 |
|---|---|---|
| 值拥有 | \`T\`、\`std::array\` | 对象生命周期由值的存储期决定 |
| 唯一所有权 | \`std::unique_ptr<T>\` | 单一 owner，转移时显式 move |
| 共享所有权 | \`std::shared_ptr<T>\` | 控制块与引用计数有成本，须避免环 |
| 非拥有借用 | \`T&\`、\`T*\`、\`std::span\`、\`std::string_view\` | 被借用对象必须比借用者活得更久 |

不要通过变量名或注释宣称一个裸指针“拥有”资源，却仍让多个模块都能释放它。ownership 应由类型和明确的 teardown 规则表达。

### Embedded 例子

Modem Middleware 接收 UART 缓冲区时：

- ISR 只把有界事件或缓冲区索引交给任务，不执行动态分配和复杂解析。
- 任务上下文拥有接收缓冲区或固定池 slot。
- parser 可借用 \`std::span<const std::byte>\`，但不得把视图保存到缓冲区回收之后。
- timeout 使用明确时钟与单位。
- 销毁顺序必须先停止生产者、取消/排空回调，再释放被借用对象。

---

## 本轮技术复盘

### 主线推演回顾

编码风格的本质是降低长期维护中的理解成本与缺陷率：

1. 用强类型和清晰命名实现自文档化；注释聚焦契约、意图与不变量。
2. 用明确语句规避 UB、求值顺序陷阱和控制流误读。
3. 遵守保留标识符规则，保持 const 契约稳定。
4. 根据可空性、所有权、生命周期、错误传播和实时约束选择引用、指针、异常或错误码。
5. 用测试保护重构，用格式化、静态分析和 CI 将团队规则自动化。

### 高频误区速查

| 误区 | 正确判断 |
|---|---|
| 注释越少越好 | 注释应补充类型无法表达的契约与意图，不应翻译显而易见的代码 |
| \`i++ + ++i\` 只是可读性差 | 对同一标量对象的冲突副作用未排序，属于 UB |
| \`a[i] = ++i\` 在所有标准中都一样 | C++17 起赋值右侧先于左侧求值；仍建议拆分 |
| 单下划线开头的任何名字都非法 | 规则取决于后续字符和作用域；双下划线、下划线加大写、全局下划线前缀需特别避免 |
| const_cast 可以修复遗留 API | 只能在已证明不写入的边界使用；写入原本 const 对象会触发 UB |
| 引用天然安全 | 引用不可空但可能悬空；借用生命周期仍需保证 |
| 错误处理总该使用异常 | 由项目策略、ABI、实时约束与失败语义决定 |
| 格式化只是个人习惯 | 团队应统一工具配置并由 CI 检查 |

## 工程落地清单

- [ ] 注释只记录契约、意图、前置/后置条件与必要不变量。
- [ ] 不在源码注释中维护作者、修改日期和变更历史。
- [ ] 使用强类型表达 ID、单位、状态和错误域。
- [ ] 禁止双下划线标识符、下划线加大写标识符，以及全局命名空间中的下划线前缀标识符。
- [ ] 禁止依赖未定义行为；复杂求值拆分为独立语句。
- [ ] 所有控制流分支使用花括号。
- [ ] 保持 const-correctness；const_cast 仅限有证据的窄适配边界。
- [ ] 必需非空借用优先引用；可空借用使用指针或 Optional；所有权转移使用明确 owner 类型。
- [ ] 按工程策略选择异常或错误码；错误码结果使用 \`[[nodiscard]]\`。
- [ ] 使用单元测试保护函数提取、类提取和数据封装重构。
- [ ] 统一 clang-format、clang-tidy、EditorConfig、换行策略和 CI 检查。
- [ ] 对实时路径审查动态分配、锁、阻塞、回调与执行时间上界。

## 自测问题

1. 哪些接口语义应由类型表达，哪些约束仍需注释说明？请用一个 Modem API 举例。
2. 为什么 \`i++ + ++i\` 是 UB，而 C++17 的 \`a[i] = ++i\` 有确定的求值顺序？为什么仍建议拆分？
3. 遗留 API 需要 \`char*\`，上层只有 \`const char*\`。请按“可修改副本 / 修正适配器 / 经证明只读后局部 const_cast”的顺序给出决策。
4. 一个 Driver API 的参数允许为空、需要修改对象但不拥有对象，应选什么类型？它的生命周期契约是什么？
5. 在禁用异常且要求硬实时的 RTOS 路径中，如何设计错误传播？
6. 团队如何用测试、clang-format、clang-tidy 和 CI 降低重构风险？

## 延伸阅读

- [Day 013 · Coding with Style Foundations](../daily/day-013-coding-with-style-foundations.md)
- [Day 014 · Headers and Dependencies](../daily/day-014-headers-iwyu-dependencies.md)
- [Day 015 · Naming and Interface Intent](../daily/day-015-naming-interface-intent.md)
- [Day 016 · clang-format / clang-tidy / Warnings](../daily/day-016-format-tidy-warnings.md)
- [Day 017 · Errors, Assertions and Control Flow](../daily/day-017-errors-assert-control-flow.md)
- [Day 018 · Function Boundaries and Maintainable Control Flow](../daily/day-018-function-boundaries-control-flow.md)
- [Embedded C++ Guideline Notes](../guidelines/embedded-cpp-guideline-notes.md)
- [Code Review Rubric](../guidelines/review-rubric.md)
