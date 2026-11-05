# 学习进度

当前仓库课程已发布到 **Day 71**。下一课从 **Day 72** 继续.

| Day | 主题 | 状态 | 文件 |
|---:|---|---|---|
| 1–55 | 历史课程 | 已发布 | [daily/](daily/) |
| 56 | 内存管理基础：所有权与 RAII | 已发布 | [day-056](daily/day-056-memory-management-ownership-raii.md) |
| 57 | 智能指针：所有权转移与借用 | 已发布 | [day-057](daily/day-057-smart-pointers-ownership-transfer.md) |
| 58 | 分配失败：数组与资源边界 | 已发布 | [day-058](daily/day-058-allocation-failure-resource-boundaries.md) |
| 59 | 自定义删除器：非内存资源与 RAII 边界 | 已发布 | [day-059](daily/day-059-custom-deleters-non-memory-resources.md) |
| 60 | 共享所有权：shared_ptr、weak_ptr 与生命周期环 | 已发布 | [day-060](daily/day-060-shared-ptr-weak-ptr-lifetime.md) |
| 61 | enable_shared_from_this：异步回调生命周期与拆除 | 已发布 | [day-061](daily/day-061-enable-shared-from-this-callback-lifetime.md) |
| 62 | 智能指针别名、类型转换与所有权 API 边界 | 已发布 | [day-062](daily/day-062-smart-pointer-aliasing-casts-ownership-api.md) |
| 63 | PMR、有界分配与内存资源策略 | 已发布 | [day-063](daily/day-063-pmr-bounded-allocation-resource-policy.md) |
| 64 | 对象生命周期、placement 构造与固定存储复用 | 已发布 | [day-064](daily/day-064-object-lifetime-placement-construction-fixed-pool.md) |
| 65 | optional 生命周期与固定池安全边界 | 已发布 | [day-065](daily/day-065-optional-fixed-pool-lifetime-boundaries.md) |
| 66 | Memory Management 资源边界决策树 | 已发布 | [day-066](daily/day-066-memory-management-resource-boundary-decision-tree.md) |
| 67 | class 封装、成员函数与对象不变量 | 已发布 | [day-067](daily/day-067-class-encapsulation-member-functions.md) |
| 68 | 对象存储期、this 与 C++23 显式对象参数 | 已发布 | [day-068](daily/day-068-object-storage-this-explicit-object-parameter.md) |
| 69 | 对象创建与构造函数：让对象从出生起就有效 | 已发布 | [day-069](daily/day-069-object-creation-constructors.md) |
| 70 | 构造函数成员初始化列表：直接初始化与成员顺序 | 已发布 | [day-070](daily/day-070-constructor-initializer-list-member-order.md) |
| 71 | Copy Constructors：复制语义与独立对象边界 | 已发布 | [day-071](daily/day-071-copy-constructors-value-semantics.md) |

> Day 1–55 的完整逐日记录仍保留在 `daily/` 与 Git 历史中；本表仅展示 Day 56 起的最近课程摘要，避免进度文件承担完整目录职责。

## 最新发布详情

- **日期**：2026-11-04
- **章节**：Chapter 8 · Gaining Proficiency with Classes and Objects，pp.276–278
- **主题**：Constructor Initializers aka Ctor-Initializers、直接成员初始化、成员声明顺序
- **关键知识点**：initializer list 与 constructor body assignment 的区别；base/member 初始化顺序；default member initializer 的覆盖规则；const/reference/non-default-constructible member 的初始化约束；成员声明顺序同时决定构造和析构顺序
- **设计模式 / 稳定边界**：Composition + 显式依赖注入；固件构建期固定 HAL 时使用 template/concept；厂商 C API 不匹配稳定 contract 时才使用 Adapter。HAL borrow 与内部 owner/borrower member 的声明顺序必须明确；不引入不必要的 Factory/shared_ptr
- **Lab**：[examples/day-070/main.cpp](examples/day-070/main.cpp)
- **Runnable Exercise**：[examples/day-070/exercise-01.cpp](examples/day-070/exercise-01.cpp)
- **上一课**：[Day 69 · 对象创建与构造函数](daily/day-069-object-creation-constructors.md)
- **下一课**：Chapter 8 · Copy Constructors（p.279 起）
## 规则

- 每次新增课程前先读取本文件与 `daily/`，取现有最大 Day + 1。
- 禁止重复覆盖已有 Day，除非明确进行修订。
- 每 7 天增加周复盘。
- 课程正文与实验源码统一维护在本仓库。
