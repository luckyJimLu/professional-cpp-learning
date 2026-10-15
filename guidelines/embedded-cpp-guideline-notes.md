# Embedded C++ Coding Guideline 学习索引

本文件是课程使用的规则索引，不复制原始规范全文。

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
- reusable abstraction 的公共接口不得泄漏 HAL handle、DMA channel、RTOS object、Linux fd 等平台实现细节，除非它们就是该 abstraction 的业务语义。
- abstraction 不等于必须使用 virtual；根据变化时机选择 runtime interface、template/concept 或 composition。
- required dependency 若不拥有且不允许为空，优先引用；不要用 nullable pointer 制造虚假状态。
- buffer、timeout、长度、频率等边界优先使用 `std::span`、`std::chrono` 或明确单位类型表达。
- reusable component 不强制携带与其核心概念无关的 logger、storage、retry 或 platform dependency。
- policy、mechanism、observation 若具有独立变化原因，应拆成可组合组件；上层负责 orchestration。
- 解耦不能以隐藏 ownership、service locator 或无界运行时注册为代价，尤其是实时路径。

### Usable Interfaces

- 公共 API 应让正确用法自然、错误用法困难；不要把关键 contract 留在注释、magic value 或调用顺序约定中。
- 时间、长度、频率等物理单位优先编码进类型；例如 `std::chrono::milliseconds` 优于无单位整数。
- buffer 参数优先同时携带地址与边界，例如 `std::span`；避免可分离的裸 pointer + length。
- 多个同基础类型的位置参数容易产生 parameter blindness；优先 `enum class`、config/options 类型或强类型包装。
- reusable interface 不泄漏与业务语义无关的 HAL handle、RTOS object、Linux fd 或 DMA channel；平台细节留在 adapter 内。
- 错误模型应保留调用者做恢复决策所需的原因；不要把 timeout、busy、invalid input、transport failure 全部压缩成 `bool` 或 `-1`。
- required borrow 优先引用；optional borrow 才使用具有明确 `nullptr` 语义的裸指针。

### Easy-to-Use Interfaces

- MUST 遵循熟悉的 C++ 生命周期习惯：资源优先 RAII；不要要求调用者手工配对 `Initialize()` / `Cleanup()`。若初始化可能失败且项目禁异常，使用显式 factory/result，而不是半初始化对象。
- SHOULD 让 common case 具有短而安全的调用路径；高级、低频选项使用强类型 `Options` / `Config`，不要把大量 primitive/bool 参数堆进主入口。
- SHOULD 对真实复杂子系统使用小 Facade 降低调用者认知负担，但 Facade 不得复制全部底层能力，也不得隐藏无界 blocking、retry、allocation 或 WCET。
- MUST 把单位、buffer 边界、状态和 ownership 尽量放进类型；线程安全、callback 上下文、timeout 计算范围、复杂度和 lifetime 等类型无法完整表达的 contract 必须文档化。
- 不为简单对象机械增加 Facade/Factory/Manager 层；Pattern 必须对应真实变化轴或复杂度边界。

### Audience 与 Purpose

- 设计公共 API 前先明确 caller / audience 与其真实任务；不要因为底层“能做”就把能力全部暴露给上层。
- 不同 audience 具有不同 purpose 时，优先小接口、小 view 或 composition；避免一个万能接口同时服务 application、diagnostics、manufacturing 与 driver。
- application-facing contract 应表达业务意图，而不是暴露 HAL handle、RTOS object、POSIX fd 或 service locator。
- required non-owning dependency 继续优先引用；接口拆分不能掩盖 borrower lifetime、teardown 顺序和线程安全责任。
- Adapter 用于隔离真实的平台/第三方接口差异；如果没有实际变化轴，不为“未来可能”提前制造多层 interface/factory。
- reusable 不等于 maximum capability；可复用性来自稳定、最小、语义清楚、可测试的边界。

### Extensibility

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
