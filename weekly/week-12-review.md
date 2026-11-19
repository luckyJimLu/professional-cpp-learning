# Week 12 Review · Day 78–84

本周覆盖 Chapter 8 收束与 Chapter 9 前半段：赋值、friend、动态存储、成员函数、constexpr/consteval、数据成员与嵌套类。

## 本周回顾

- Day 78：copy/move assignment；赋值目标已存在，资源 owner 必须处理旧资源。
- Day 79：friend 是窄范围访问授权，不改变 ownership、lifetime 或 thread safety。
- Day 80：动态存储由 RAII 成员管理，优先 Rule of Zero；实时路径限制分配。
- Day 81：const/static/ref-qualified member functions 表达对象能力与值类别。
- Day 82：constexpr 可选编译期求值，consteval 强制立即求值。
- Day 83：区分实例状态、类级状态与 mutable 的逻辑常量性。
- Day 84：nested type 收束作用域，但不自动持有外围对象。

## Code Review

1. owning resource 是否使用 RAII？是否存在裸 owning pointer？
2. Rule of Zero/Five 是否符合真实资源语义？friend 授权是否最小？
3. const 是否被误当成同步保证？static 数据是否有初始化与并发策略？
4. 外部值转 enum 前是否验证？运算符是否隐藏 I/O 或阻塞？

## Design Review：Modem RX Pipeline

设计 RxBuffer、FrameValidator、ModemState、DmaQueue：容量如何限制？Validator 是否需要 friend？外部状态 byte 如何验证？Descriptor 是否应为 private nested type？哪些配置适合 consteval？task/ISR 如何交接 buffer 所有权并避免 callback dangling reference？

## 编译验证

~~~bash
for f in examples/day-{078..084}/*.cpp; do out="/tmp/$(basename "$(dirname "$f")")-$(basename "$f" .cpp)"; g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic "$f" -o "$out" && "$out"; done
~~~

## 下周目标

Day 85–86 完成类内枚举与运算符重载，随后进入 Chapter 9 的 Building Stable Interfaces。

- [ ] 能解释 Rule of Zero / Five 的取舍。
- [ ] 能识别 friend 过度授权。
- [ ] 能区分 constexpr / consteval。
- [ ] 能判断 static / mutable / nested type 的合理边界。
- [ ] 能为 Modem RX 设计资源上界、错误模型和并发交接契约。
