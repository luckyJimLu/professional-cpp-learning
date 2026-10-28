# 学习进度

当前仓库课程已发布到 **Day 63**。下一课从 **Day 64** 继续。

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
| 63 | PMR, Bounded Allocation and Memory-Resource Policy | 已发布 | [day-063](daily/day-063-pmr-bounded-allocation-resource-policy.md) |

> Day 1–55 的完整逐日记录仍保存在 `daily/` 与 Git 历史中；本表从 Day 56 起保持最近课程摘要，避免进度文件重复承担完整目录职责。

## 最新发布详情

- **日期**：2026-10-28
- **章节**：Chapter 7 · Memory Management
- **主题**：PMR, Bounded Allocation and Memory-Resource Policy
- **关键知识点**：`std::pmr::memory_resource`、`monotonic_buffer_resource`、caller-owned arena、禁止 heap fallback、reserve/capacity invariant、resource lifetime
- **设计模式 / 稳定边界**：Dependency Injection + lightweight Strategy；allocator/resource 与 container 语义分离；固定 firmware 同时评估 static policy
- **Lab**：[examples/day-063/main.cpp](examples/day-063/main.cpp)
- **Runnable Exercise**：[examples/day-063/exercise-01.cpp](examples/day-063/exercise-01.cpp)
- **周复盘**：[Week 09 Review](weekly/week-09-review.md)
- **上一课**：[Day 62 · Smart Pointer Aliasing, Casts and Ownership API Boundaries](daily/day-062-smart-pointer-aliasing-casts-ownership-api.md)
- **下一课**：继续 Chapter 7，进入内存池/对象生命周期复用、placement construction 与固定容量资源边界

## 规则

- 每次新增课程前先读取本文件与 `daily/`，取现有最大 Day + 1。
- 禁止重复覆盖已有 Day，除非明确进行修订。
- 每 7 天增加周复盘。
- 课程正文与实验源码统一维护在本仓库。
