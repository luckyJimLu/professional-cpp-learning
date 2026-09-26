# Day 28 · Designing with Classes：类的不变量与最小公共接口

> 历史课程迁移自原 Gmail 正文；已转换为 Markdown。

Professional C++ 每日学习 — Day 28
Chapter 5 · Designing with Classes
主题：类的不变量（class invariant）、职责边界与最小 public interface

今天正式进入 Chapter 5。目标不是“把 C struct 改成 class”，而是让对象从构造完成开始就保持有效状态，并让调用者只能通过受控接口改变状态。

今日 60 分钟结构：阅读与目标 5 分钟；昨日复习 5 分钟；核心概念 15 分钟；C vs C++ 10 分钟；编码规范 10 分钟；实验 20 分钟；常见坑与检查题穿插压缩完成。

建议阅读：Chapter 5 开篇与 class design 基础部分，重点关注 abstraction、public/private、constructor、data member 与对象有效状态。

昨日复习：1) 稳定边界为什么应围绕变化轴建立？ 2) Dependency Injection 与 Ownership 为什么不是一回事？ 3) timeout/capacity 为什么应该成为接口契约？

核心概念：Class invariant 是对象在每个公开操作前后都必须成立的条件。好的 class 不是数据袋，而是“状态 + 保持状态合法的操作”。public interface 是契约；private data 是实现。构造函数的第一职责是建立 invariant。调用者不应能绕过接口制造非法状态。

C 写法常把 struct 字段公开，任何代码都能写入 baud_rate=0、buffer=null、capacity=0 等组合；现代 C++ 用构造函数验证/建立状态，用 private 成员封装，并提供窄接口。

今日编码规范：SHOULD 单参数构造函数默认 explicit；SHOULD 接口尽量小、实现细节 private；MUST 显式表达意图，状态/模式使用 enum class，避免 magic integer。

实验：实现 FixedRingBuffer<64>。对象始终满足 size <= capacity、head/tail 均在数组范围内；Push 在满时返回 Status::kFull，Pop 在空时返回 Status::kEmpty；不得暴露 head/tail/size 的可写引用，不使用 heap，不使用异常。编译建议：g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic day28.cpp -o day28

练习：修复一个公开 data/head/tail/count 的 C 风格 RingBuffer，使非法状态无法由调用者构造；再为 empty、full、wrap-around、连续 push/pop 增加边界测试。

3 个常见坑：只把 struct 改成 class 却仍把字段 public；构造完成后对象仍需要 Init() 才可用；为了“方便”提供 SetX() 让调用者绕过 invariant。

检查题：1) 为什么“对象一旦构造成功就有效”比 Create()+Init() 更容易维护？ 2) 如果某成员只能取 0..3，应该公开 int setter，还是设计强类型状态与受控转换？为什么？

下一节：继续 Chapter 5，研究 constructors、对象初始化与如何让非法状态难以表示。
