# 学习进度

当前仓库课程已发布到 **Day 57**。下一课从 **Day 58** 继续。

| Day | 主题 | 状态 | 文件 |
|---:|---|---|---|
| 1–55 | 历史课程 | 已发布 | [daily/](daily/) |
| 56 | Memory Management Foundations · Ownership and RAII | 已发布 | [day-056](daily/day-056-memory-management-ownership-raii.md) |
| 57 | Smart Pointers · Ownership Transfer and Borrowing | 已发布 | [day-057](daily/day-057-smart-pointers-ownership-transfer.md) |

> Day 1–55 的完整逐日记录仍保存在 `daily/` 与 Git 历史中；本表从 Day 56 起保持最近课程摘要，避免进度文件重复承担完整目录职责。

## 最新发布详情

- **日期**：2026-10-22
- **章节**：Chapter 7 · Memory Management
- **主题**：Smart Pointers · Ownership Transfer and Borrowing
- **关键知识点**：`unique_ptr`、ownership transfer、move semantics、required borrow、reference/span、async lifetime
- **设计模式 / 稳定边界**：RAII + explicit ownership boundary；Dependency Injection 区分 borrow 与 ownership transfer；只有真实 shared ownership 才使用 `shared_ptr`
- **Lab**：[examples/day-057/main.cpp](examples/day-057/main.cpp)
- **Runnable Exercise**：[examples/day-057/exercise-01.cpp](examples/day-057/exercise-01.cpp)
- **上一课**：[Day 56 · Memory Management Foundations · Ownership and RAII](daily/day-056-memory-management-ownership-raii.md)
- **下一课**：继续 Chapter 7，深入动态分配失败、数组/自定义资源以及安全资源管理边界

## 规则

- 每次新增课程前先读取本文件与 `daily/`，取现有最大 Day + 1。
- 禁止重复覆盖已有 Day，除非明确进行修订。
- 每 7 天增加周复盘。
- 课程正文与实验源码统一维护在本仓库。
