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

- **日期**：2026-11-05
- **章节**：Chapter 8 · Gaining Proficiency with Classes and Objects，pp.279–280
- **主题**：Copy Constructors、memberwise copy、value semantics 与自引用指针复制边界
- **关键知识点**：copy constructor 与 copy assignment 的区别；隐式 copy constructor 逐成员复制；raw pointer / span / unique_ptr / shared_ptr 的不同复制语义；自引用成员指针默认复制后仍指向 source；固定容量值类型的独立复制与有界成本
- **设计模式 / 稳定边界**：默认使用 value semantics + composition；Prototype 仅在运行时多态克隆且必须保留动态类型时考虑；固定协议集合优先 std::variant / template / concept。先定义复制后独立值、共享 owner 或 borrow view，再决定成员类型；不因普通复制引入 Factory/shared_ptr
- **Lab**：[examples/day-071/main.cpp](examples/day-071/main.cpp)
- **Runnable Exercise**：[examples/day-071/exercise-01.cpp](examples/day-071/exercise-01.cpp)
- **上一课**：[Day 70 · 构造函数成员初始化列表与成员顺序](daily/day-070-constructor-initializer-list-member-order.md)
- **下一课**：Chapter 8 · Initializer-List Constructors（p.281 起）

## 规则

- 每次新增课程前先读取本文件与 `daily/`，取现有最大 Day + 1。
- 禁止重复覆盖已有 Day，除非明确进行修订。
- 每 7 天增加周复盘。
- 课程正文与实验源码统一维护在本仓库。
