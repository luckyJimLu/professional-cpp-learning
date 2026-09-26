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

## 资源与所有权

- 默认单一 owner
- `std::unique_ptr` 表达所有权转移
- 谨慎使用 `std::shared_ptr`
- 借用使用引用 / 裸指针
- RAII
- 实时路径避免动态分配
- 避免隐式大拷贝

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
