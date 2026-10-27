# 学习进度

当前仓库课程已发布到 **Day 62**。下一课从 **Day 63** 继续。

| Day | 主题 | 状态 | 文件 |
|---:|---|---|---|
| 1–55 | 历史课程 | 已发布 | [daily/](daily/) |
| 56 | Memory Management Foundations · Ownership and RAII | 已发布 | [day-056](daily/day-056-memory-management-ownership-raii.md) |
| 57 | Smart Pointers · Ownership Transfer and Borrowing | 已发布 | [day-057](daily/day-057-smart-pointers-ownership-transfer.md) |
| 58 | Allocation Failure · Arrays and Resource Boundaries | 已发布 | [day-058](daily/day-058-allocation-failure-resource-boundaries.md) |
| 59 | Custom Deleters · Non-Memory Resources and RAII Boundaries | 已发布 | [day-059](daily/day-059-custom-deleters-non-memory-resources.md) |
| 60 | Shared Ownership · shared_ptr, weak_ptr and Lifetime Cycles | 已发布 | [day-060](daily/day-060-shared-ptr-weak-ptr-lifetime.md) |
| 61 | enable_shared_from_this · Async Callback Lifetime and Teardown | 已发布 | [day-061](daily/day-061-enable-shared-from-this-callback-lifetime.md) |
| 62 | Smart Pointer Aliasing, Casts and Ownership API Boundaries | 已发布 | [day-062](daily/day-062-smart-pointer-aliasing-casts-ownership-api.md) |

> Day 1–55 的完整逐日记录仍保存在 `daily/` 与 Git 历史中；本表从 Day 56 起保持最近课程摘要，避免进度文件重复承担完整目录职责。

## 最新发布详情

- **日期**：2026-10-27
- **章节**：Chapter 7 · Memory Management
- **主题**：Smart Pointer Aliasing, Casts and Ownership API Boundaries
- **关键知识点**：aliasing `shared_ptr`、stored pointer vs control-block owner、`dynamic_pointer_cast`、ownership API、runtime/static polymorphism 边界
- **设计模式 / 稳定边界**：Adapter + explicit DI；重复 downcast 触发 stable capability 审计；polymorphism 与 shared ownership 分离设计
- **Lab**：[examples/day-062/main.cpp](examples/day-062/main.cpp)
- **Runnable Exercise**：[examples/day-062/exercise-01.cpp](examples/day-062/exercise-01.cpp)
- **上一课**：[Day 61 · enable_shared_from_this · Async Callback Lifetime and Teardown](daily/day-061-enable-shared-from-this-callback-lifetime.md)
- **下一课**：继续 Chapter 7，进入内存资源策略、分配控制与 Embedded bounded allocation / allocator boundary 工程审计

## 规则

- 每次新增课程前先读取本文件与 `daily/`，取现有最大 Day + 1。
- 禁止重复覆盖已有 Day，除非明确进行修订。
- 每 7 天增加周复盘。
- 课程正文与实验源码统一维护在本仓库。
