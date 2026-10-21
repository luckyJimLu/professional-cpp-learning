# 学习进度

当前仓库课程已发布到 **Day 56**。下一课从 **Day 57** 继续。

## 最新发布详情

- **日期**：2026-10-21
- **章节**：Chapter 7 · Memory Management
- **主题**：Memory Management Foundations · Ownership and RAII
- **关键知识点**：automatic/dynamic lifetime、RAII、single ownership、`unique_ptr`、borrow/view、allocation timing
- **设计模式 / 稳定边界**：RAII + explicit ownership boundary；Dependency Injection 不等于 ownership transfer；单 owner 场景拒绝滥用 `shared_ptr`
- **Lab**：[examples/day-056/main.cpp](examples/day-056/main.cpp)
- **Runnable Exercise**：[examples/day-056/exercise-01.cpp](examples/day-056/exercise-01.cpp)
- **上一课**：[Day 55 · Chapter 6 Summary and Engineering Exercises](daily/day-055-chapter6-review-exercises.md)
- **本课**：[Day 56 · Memory Management Foundations · Ownership and RAII](daily/day-056-memory-management-ownership-raii.md)
- **下一课**：继续 Chapter 7 · Memory Management 的动态内存与安全资源管理主线

## 已发布课程

Day 1–55 保持现有已发布状态；新增：

| Day | 主题 | 状态 | 文件 |
|---:|---|---|---|
| 56 | Memory Management Foundations · Ownership and RAII | 已发布 | [day-056](daily/day-056-memory-management-ownership-raii.md) |

## 规则

- 每次新增课程前先读取本文件与 `daily/`，取现有最大 Day + 1。
- 禁止重复覆盖已有 Day，除非明确进行修订。
- 每 7 天增加周复盘。
- 课程正文与实验源码统一维护在本仓库。
