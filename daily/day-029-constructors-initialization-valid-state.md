# Day 29 · 构造函数、初始化与让非法状态难以表示

> 历史课程迁移自原 Gmail 正文；已转换为 Markdown。

Professional C++ 每日学习 — Day 29
Chapter 5 · Designing with Classes
主题：构造函数、初始化与让非法状态难以表示

今天的目标：从“先创建对象、再调用 Init()”迁移到“构造完成即满足不变量”的现代 C++ 设计。结合嵌入式场景，重点练习 explicit、成员初始化列表、强类型配置、固定容量、统一错误模型和无 heap 的运行路径。

建议：先完成复习题，再阅读 Chapter 5 中 constructors / initialization / class interface 相关内容，最后独立完成实验。
