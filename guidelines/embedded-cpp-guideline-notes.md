# Embedded C++ Coding Guideline 学习索引

面向嵌入式与系统级 C++ 开发的工程规范索引，涵盖类型与接口边界、RAII 资源所有权、错误处理与硬实时红线，配合每日课程与代码评审清单使用。

## Google C++ 规范导读

新增 [C++ 编程规范：Google 风格与嵌入式工程实践](?view=topics&topic=guidelines/google-cpp-style-guide.md)。包含官方来源、命名与接口约定、所有权、错误处理、嵌入式例外、完整解析示例及提交前检查清单；区分 Google 原规则与本项目建议。

## 核心原则

- 读者优先
- 一致性优先
- 避免惊讶与危险构造
- 显式表达意图
- 优先静态检查
- 性能优化必须有证据

## 文件与头文件

- 头文件自包含
- include guard
- Include What You Use
- include 顺序统一
- 接口 / 实现分离

## 命名

- 类型：`PascalCase`
- 函数：`PascalCase`
- 局部变量 / 参数：`snake_case`
- 成员：`snake_case_`
- 常量：`kPascalCase`
- `enum class` 枚举值：`kPascalCase`
- 宏：尽量少，必要时全大写
- 时间、长度、频率等单位应进入类型或名称

## 类型与接口

- 优先值语义
- 优先 `enum class`
- 单参数构造函数默认 `explicit`
- 小接口
- 避免可写全局状态
- 明确 `nullptr` 语义
- 避免多个 `bool` 参数
- 可复用抽象的公共接口不得泄漏 HAL 句柄、DMA 通道、RTOS 对象、Linux 文件描述符等平台实现细节，除非它们就是该抽象的业务语义。
- 使用抽象不等于必须使用虚接口。根据变化发生的时机，选择运行时接口、模板/概念或组合。
- 对于非所有且不允许为空的必需依赖，优先使用引用；不要用可空指针制造虚假状态。
- 缓冲区、超时、长度、频率等边界优先使用 `std::span`、`std::chrono` 或明确单位类型表达。
- 可复用组件不强制携带与其核心概念无关的日志、存储、重试或平台依赖。
- 策略、机制与观察点若具有独立的变化原因，应拆成可组合组件，由上层负责编排。
- 解耦不能以隐藏所有权、服务定位器或无界运行时注册为代价，尤其是实时路径。

### SOLID 与 Embedded 边界

- 单一职责原则用于隔离真实变化原因，不等于每个函数建立一个类。传输、协议、诊断、存储仅在变化原因独立时才拆分。
- 开闭原则只为已识别扩展点建立稳定契约，不为假想未来提前设计万能插件系统。
- 里氏替换原则要求 Fake/Mock 与生产实现保持相同契约，包括超时、错误语义、容量和线程上下文约束。
- 接口隔离原则按调用方意图设计小接口；避免应用层被迫依赖复位、诊断、出厂测试等无关能力，也避免过度拆成单函数接口。
- 依赖倒置原则要求显式注入必需依赖；禁止用服务定位器、可写全局对象或 `shared_ptr` 掩盖所有权与初始化顺序。
- SOLID 不等于运行时多态；固定固件配置应同时评估组合、模板/概念与虚接口在 Flash、WCET、可测试性和生命周期上的成本。

### 可用接口（Usable Interfaces）

- 公共 API 应让正确用法自然、错误用法困难；不要把关键契约留在注释、魔数或调用顺序约定中。
- 时间、长度、频率等物理单位优先编码进类型；例如 `std::chrono::milliseconds` 优于无单位整数。
- 缓冲区参数优先同时携带地址与边界，例如 `std::span`；避免可分离的裸指针与长度组合。
- 多个相同基础类型的位置参数容易导致参数语义混淆；优先使用 `enum class`、配置类型或强类型包装。
- 可复用接口不泄漏与业务语义无关的 HAL 句柄、RTOS 对象、Linux 文件描述符或 DMA 通道；平台细节留在适配器内部。
- 错误模型应保留调用者做恢复决策所需的原因；不要把超时、忙碌、无效输入、传输失败全部压缩成 `bool` 或 `-1`。
- 必需借用优先使用引用；可选借用才使用具有明确 `nullptr` 语义的裸指针。

### 易用接口（Easy-to-Use Interfaces）

- 必须遵循熟悉的 C++ 生命周期惯例：资源优先使用 RAII，不要要求调用者手工配对 `Initialize()` / `Cleanup()`。若初始化可能失败且项目禁用异常，使用显式工厂/结果类型，而不是半初始化对象。
- 宜让常用场景具有短而安全的调用路径；高级与低频选项使用强类型 `Options` / `Config`，避免将大量基础类型和布尔参数堆进主入口。
- 宜对真实复杂子系统使用精简门面（Facade）降低调用者认知负担，但门面不得复制全部底层能力，也不得隐藏无界阻塞、重试、动态分配或 WCET。
- 必须将单位、缓冲区边界、状态和所有权尽量放入类型中；对线程安全、回调上下文、超时计算范围、复杂度与生命周期等类型无法完整表达的契约，必须在文档中明确说明。
- 不为简单对象机械增加 Facade/Factory/Manager 层；模式必须对应真实变化轴或复杂度边界。

### Audience 与 Purpose

- 设计公共 API 前先明确 caller / audience 与其真实任务；不要因为底层“能做”就把能力全部暴露给上层。
- 不同 audience 具有不同 purpose 时，优先小接口、小 view 或 composition；避免一个万能接口同时服务 application、diagnostics、manufacturing 与 driver。
- application-facing contract 应表达业务意图，而不是暴露 HAL handle、RTOS object、POSIX fd 或 service locator。
- required non-owning dependency 继续优先引用；接口拆分不能掩盖 borrower lifetime、teardown 顺序和线程安全责任。
- Adapter 用于隔离真实的平台/第三方接口差异；如果没有实际变化轴，不为“未来可能”提前制造多层 interface/factory。
- reusable 不等于 maximum capability；可复用性来自稳定、最小、语义清楚、可测试的边界。

### 可扩展性（Extensibility）

- 只为已识别的真实变化轴建立 customization point，不为假想未来设计万能插件接口。
- 扩展点应保持最小、稳定、语义明确；OCP 是设计目标，不要求一律使用 virtual inheritance。
- 根据变化时机和生命周期选择机制：编译期变化优先 template/concept；轻量行为可用 callable；需要运行时替换和独立实现时再考虑 runtime interface。
- required dependency 应显式注入；避免通过 writable global 或 service locator 隐藏依赖、ownership 和初始化顺序。
- embedded runtime extensibility 必须有容量、注册时机、生命周期和 WCET 上界；实时路径避免无界动态分配。
- 推荐“启动期组装、运行期有界调用”，使 flash/RAM、对象数量、初始化顺序和 borrower lifetime 可审计。

### 泛型编程与模板

- template 参数只表达真实的 compile-time variation，不为减少几行重复代码而无边界模板化。
- 泛型算法依赖最小能力；优先用 concept / requires 显式表达模板 contract，使错误尽量在调用边界暴露。
- 实时路径中的泛型容器必须有可审计的容量和分配策略；固定容量应成为显式 contract，满容量必须进入错误模型。
- 检查模板实例化数量、flash/RAM/map file；不要假设 static polymorphism 天然零成本。
- 需要运行时替换、稳定 ABI 或独立生命周期的依赖，优先 runtime interface/composition，而不是强行模板化。

### Checks 与 Safeguards

- 外部输入、设备输入、IPC/网络输入必须在 trust boundary 验证；无效输入属于正常运行时错误，不用 `assert` 代替错误处理。
- `assert` 只验证 programmer invariant；可恢复错误必须进入显式错误模型。
- reusable blocking API 必须显式 timeout；retry、scan、wait 等 safeguard 本身也必须有可审计上界。
- buffer 边界优先用 `std::span` 等同时表达地址与长度的类型；最大长度、容量和 timeout 是 contract 的一部分。
- 错误返回优先保留原因，避免把 invalid length、busy、timeout 等全部压成 `bool` 或 `-1`。
- 边界测试至少覆盖 empty/min/max/max+1、timeout 及设备失败路径。

### 多态对象与 slicing

- 多态对象不得无意按值传递，否则可能发生 object slicing。
- required non-owning dependency 优先使用引用。
- optional non-owning dependency 使用裸指针时必须明确 `nullptr` 语义。
- runtime polymorphism 与 ownership 是两个独立设计问题，不应因为需要 virtual dispatch 就默认使用 `shared_ptr`。
- 多态基类应有明确析构策略，所有 override 显式使用 `override`。

## 类封装与对象不变量

- MUST：可变对象状态默认放在 private；公共成员函数负责校验输入和维护状态转换，不让调用者绕过 invariant 直接写字段。
- MUST：所有标量成员都要有明确初始化来源；简单默认状态优先使用 in-class member initializer，避免依赖未初始化值。
- SHOULD：公共 API 表达调用者意图（Configure / Start / Stop），不要把一组 public getter/setter 当作封装完成。
- MUST：private 不等于线程安全；共享对象仍需明确 owner task、同步策略、IRQ 上下文与 teardown。
- SHOULD：class 不意味着 heap allocation 或 runtime polymorphism；固定类型优先 value semantics，只有真实运行时变化轴才增加 virtual interface。

## 对象存储期与 this 指针

- MUST：先根据真实生命周期选择对象存放方式。固定、局部或可由上层直接组合的对象优先 value/automatic/static storage；只有确需独立动态生命周期时才引入动态分配。
- MUST：动态对象必须有明确 owner；优先 RAII 与 std::unique_ptr。裸指针/引用默认表示 borrow，不应通过返回裸指针隐式转移 ownership。
- SHOULD：在课程和设计文档中把教材常用的 stack/free store 分别映射到 automatic/dynamic storage duration；不要把常见实现布局误写成 C++ 标准保证。
- MUST：this 与 *this 都不拥有当前对象。同步调用可以短暂借用；异步 callback 若保存 this，必须定义 owner 生命周期、unregister/cancel、in-flight drain 与 teardown 顺序。
- SHOULD：普通成员函数优先使用隐式 this；C++23 explicit object parameter 仅在 ref-qualified overload、模板复用或递归 lambda 等真实场景能减少重复/改善表达时采用，不机械改写简单成员函数。
- MUST：private、this 和成员函数都不自动提供线程安全；明确 owner task、IRQ context、同步策略和对象销毁顺序。

## 对象创建与构造函数

- MUST：构造函数正常返回时，对象必须已经满足 class invariant；不得让半初始化或无效对象逃逸。
- MUST：所有成员必须有明确初始化来源。若类声明了其他构造函数，只有在合法默认状态存在时才显式声明默认构造函数；不要依赖隐式生成规则的猜测。
- MUST：构造函数不得隐藏可失败的硬件 I/O、无 timeout 等待、阻塞锁、实时路径动态分配或 callback 注册。将可失败资源获取放到显式 Start/Init，返回统一 Status 并定义 timeout 与失败回滚。
- MUST：不得在构造过程中把 this 发布给外部事件源；callback 注册应在对象完全构造后进行，并定义 unregister/cancel、in-flight drain 与析构顺序。
- SHOULD：构造重载只表达少数真实、合法的创建模式；多个入口必须建立相同 invariant。避免多个 bool 参数，优先 enum class 或具名 Config。
- SHOULD：required dependency 显式注入；引用成员表示 borrow，被借用依赖必须比当前对象活得更久。由 composition root 负责构造顺序和 teardown。
- SHOULD：测试默认构造和每个重载，并覆盖非法配置、启动失败与清理路径；不要只验证“能创建对象”。

## 构造函数成员初始化列表与成员顺序

- MUST：所有 const member、reference member、没有可用默认构造函数的成员，以及需要直接建立资源状态的成员，都应在 constructor initializer list 中初始化；不得先默认构造再在 constructor body 中赋值。
- MUST：non-static data members 按 class 中的声明顺序初始化，不按 initializer list 的书写顺序初始化；initializer list 必须与声明顺序一致并清除 -Wreorder warning。
- MUST：成员声明顺序必须表达内部依赖与 teardown：owner member 先声明、先构造、后销毁；borrower member 后声明、后构造、先销毁。
- SHOULD：对合法且稳定的默认状态使用 in-class default member initializer；constructor initializer list 显式指定同一成员时覆盖该默认值。
- SHOULD：构造函数只完成对象状态与依赖绑定；可失败硬件初始化仍放在显式 Start/Initialize，返回 Status 并定义 timeout、线程上下文与失败回滚。
- MAY：当固定固件构建期选择 HAL 且没有 runtime replacement 需求时，使用 template/concept 表达 compile-time dependency injection；不要为固定配置机械引入 virtual interface、Factory 或 shared_ptr。
- REVIEW：检查 base/member 初始化顺序、引用绑定对象的生命周期、成员析构顺序、构造期间是否发布 this，以及固定容量/分配/锁/阻塞的实时上界。

## Copy constructors and value semantics

> 本节是本项目的 Embedded 工程补充，不代表 Google C++ Style Guide 对所有项目的逐字强制条款。

- MUST：普通 value type 的 copy constructor 优先接受 const T&，保证可以从 const source 复制且不修改源对象。
- MUST：先定义复制后的语义：独立值、共享所有权或继续借用；不得把 raw pointer 的地址复制误称为 payload 深复制。
- MUST：类成员若指向自身其他成员（self pointer / cached internal address），必须审查默认 copy 后的指向；优先删除可推导的冗余指针，确需保留时提供并测试重新绑定语义。
- MUST：raw owning pointer 不得直接依赖隐式 memberwise copy；应重新设计为值成员/RAII owner，或显式定义 clone 与资源释放契约。
- SHOULD：当所有成员的 memberwise copy 正好满足 class invariant 时，使用显式 = default 的 copy constructor；不要为每个类机械手写复制逻辑。
- SHOULD：固定容量对象优先使用 std::array 等值成员，并明确复制上界；std::span 复制只复制 borrow view，不延长底层 buffer lifetime。
- MUST：仅当所有成员复制都满足项目错误模型时才声明 noexcept；std::string/std::vector 等动态复制的分配成本与失败语义必须单独审查。
- REVIEW：覆盖复制后独立修改、source 先销毁、borrow lifetime、unique_ptr 不可复制、shared_ptr 共享而非深复制、队列按值复制的 WCET，以及 ISR/线程上下文。

## Initializer-list constructors 与花括号初始化边界

- MUST：不要把 `std::initializer_list<T>` 或其迭代器作为长期成员保存；它是对临时 backing array 的只读访问视图，不承担 payload ownership。
- MUST：若 initializer-list constructor 需要长期保存元素，必须在构造期间复制到明确 owner（例如固定容量 `std::array`）；超容量必须进入显式错误模型，不得越界或部分更新。
- SHOULD：谨慎向普通业务类添加 initializer-list constructor。list-initialization 会优先考虑该类构造函数，可能改变已有 `T{count, fill}` 调用的语义；优先使用 `T::Filled(...)`、`T::FromBytes(...)` 等命名工厂或 tag type。
- SHOULD：对 source-defined 的小型同类型配置可以使用 initializer-list；不要把它当作网络、UART、IPC 等运行期输入接口。
- MUST：运行期外部数据使用 `std::span<const T>` / pointer+length 等显式 borrow API，并校验长度、容量和错误状态；跨任务或异步使用时必须转为明确 owner 或 pool handle。
- REVIEW：检查 initializer-list 元素的 `const` 属性、move-only 类型限制、backing array 生命周期、列表长度上界、构造函数内部动态分配，以及 ISR/WCET 约束。

## 类关系与层级

- has-a / uses-a 与 is-a 必须表达真实语义，不为了复用实现而继承。
- 当 has-a 与 is-a 都可实现需求且关系不明确时，优先考虑 composition。
- 不把现实世界分类、组织架构或产品目录机械映射成代码 hierarchy。
- 候选基类应有明确 properties、behaviors、invariants 或可被客户端真正使用的 contract。
- root abstraction 应提供稳定、最小、可被调用者直接依赖的 contract。
- hierarchy 应尽量保持浅；中间基类只有在它本身提供独立 contract / invariant 时才存在。
- concrete leaf 承担平台或设备实现差异，避免把具体硬件细节泄漏到 root interface。
- trace / metrics / retry 等横向能力优先考虑 composition、wrapper 或 policy，不为它们复制整棵 inheritance tree。
- 多继承仅用于多个真实、独立、稳定的小 contract；每个 public base 都应能读成明确的 is-a。
- 不使用多继承仅为了共享实现；带状态、资源 ownership 或复杂初始化约束的多个 base 默认优先重构为 composition。
- 多个 base 出现同名 API 或语义冲突时，应先重新评估 contract 边界，而不是只用限定名消除编译二义性。
- mixin 只承载单一、正交的小行为，优先无状态或小型有界状态；不在 mixin 中隐藏复杂资源 ownership。
- template/CRTP mixin 对派生类型的要求必须可读，优先用清晰命名、concept 或静态约束表达 contract。
- 需要运行时替换、独立生命周期、锁、设备资源或复杂状态时，优先 composition，而不是继续叠加 mixin。
- 嵌入式使用模板 mixin 时检查实例化数量、flash/RAM 与实时路径影响，不假设模板天然零成本。
- 没有真实 contract 的空基类、过度泛化基类和深层 hierarchy 都应重新审视。
- composition 后仍需明确 owner / borrow / lifetime，不能用 GetXxx() 暴露底层全部实现细节。

## 资源与所有权

- 默认单一 owner
- `std::unique_ptr` 表达所有权转移
- 谨慎使用 `std::shared_ptr`
- 借用使用引用 / 裸指针
- RAII
- 实时路径避免动态分配
- 避免隐式大拷贝
- borrower 生命周期不得超过被借用对象

## 错误处理

- 项目级错误模型统一
- 本课程按规范默认禁用异常
- 可恢复错误不用 `assert`
- `assert` 只验证不变量
- 错误保留上下文

## 函数与控制流

- 单一职责
- 早返回
- 参数过多使用 Options / Config
- 禁止宏隐藏控制流
- `switch` 覆盖 `enum class`
- 循环边界明确

## 并发 / ISR / 硬件

- 共享可变状态必须有同步策略
- `volatile` 不是线程同步
- ISR 最小化
- 锁作用域最小
- 定义锁顺序
- MMIO 集中封装

## 嵌入式红线

- 硬实时路径禁止无界操作
- 阻塞 API 必须有 timeout
- 禁止 magic number
- 硬件单位明确
- 内存预算可审计
- 边界输入必须测试
- 日志不能改变实时行为
- 平台差异集中隔离

## 工具链 / CI

推荐持续启用：

```bash
-Wall -Wextra -Wconversion -Wpedantic
```

并逐步纳入：

- clang-format
- clang-tidy
- 静态分析
- 单元测试
- CI 门禁

## 评审与验证

[五项评审与规则案例](review-rubric.md) 将上述重点规则连接到错误／推荐写法、检测方式和例外条件。[内容总索引](../docs/content-map.md) 提供对应课程、专题和实验入口。
