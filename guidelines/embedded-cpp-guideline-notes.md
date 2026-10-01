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
