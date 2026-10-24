# 学习进度

当前仓库课程已发布到 **Day 59**。下一课从 **Day 60** 继续。

| Day | 主题 | 状态 | 文件 |
|---:|---|---|---|
| 1–55 | 历史课程 | 已发布 | [daily/](daily/) |
| 56 | Memory Management Foundations · Ownership and RAII | 已发布 | [day-056](daily/day-056-memory-management-ownership-raii.md) |
| 57 | Smart Pointers · Ownership Transfer and Borrowing | 已发布 | [day-057](daily/day-057-smart-pointers-ownership-transfer.md) |
| 58 | Allocation Failure · Arrays and Resource Boundaries | 已发布 | [day-058](daily/day-058-allocation-failure-resource-boundaries.md) |
| 59 | Custom Deleters · Non-Memory Resources and RAII Boundaries | 已发布 | [day-059](daily/day-059-custom-deleters-non-memory-resources.md) |

> Day 1–55 的完整逐日记录仍保存在 `daily/` 与 Git 历史中；本表从 Day 56 起保持最近课程摘要，避免进度文件重复承担完整目录职责。

## 最新发布详情

- **日期**：2026-10-24
- **章节**：Chapter 7 · Memory Management
- **主题**：Custom Deleters · Non-Memory Resources and RAII Boundaries
- **关键知识点**：custom deleter、`unique_ptr<T, Deleter>`、非内存资源、acquire/release 配对、move-only owner、teardown context
- **设计模式 / 稳定边界**：RAII + 小型 Adapter；required dependency 使用 borrow/DI；固定 BSP 不强行引入 Factory/shared ownership
- **Lab**：[examples/day-059/main.cpp](examples/day-059/main.cpp)
- **Runnable Exercise**：[examples/day-059/exercise-01.cpp](examples/day-059/exercise-01.cpp)
- **上一课**：[Day 58 · Allocation Failure · Arrays and Resource Boundaries](daily/day-058-allocation-failure-resource-boundaries.md)
- **下一课**：继续 Chapter 7，深入 shared ownership、`shared_ptr` / `weak_ptr` 控制块、适用边界与 Embedded 成本

## 规则

- 每次新增课程前先读取本文件与 `daily/`，取现有最大 Day + 1。
- 禁止重复覆盖已有 Day，除非明确进行修订。
- 每 7 天增加周复盘。
- 课程正文与实验源码统一维护在本仓库。
