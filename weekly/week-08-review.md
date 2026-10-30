# 第 08 周复盘 · 复用边界 → 内存所有权

覆盖 Day 50–56。目标不是复述语法，而是检查“稳定边界”和“生命周期边界”是否同时成立。

## 代码评审

逐项检查：

- 头文件是否 self-contained，是否存在不必要依赖。
- 命名是否表达 owner / borrow / timeout / unit。
- owning raw pointer 是否被消除；copy/move 语义是否与 ownership 一致。
- 实时路径是否存在无界 allocation、锁、阻塞、retry。
- 错误模型是否明确，是否用 `bool` 隐藏原因。
- ISR 与 task context 是否区分；`volatile` 是否被错误当成同步原语。
- magic number 是否进入类型/常量；容量、timeout、单位是否可见。
- empty / max / max+1 / timeout / teardown 等边界是否覆盖。

## 设计评审

按以下链路审查一个 Modem RX 组件：

```text
需求变化
→ 变化轴
→ 稳定边界
→ composition / template / runtime interface
→ owner / borrow / lifetime
→ callback unsubscribe / teardown
→ allocation / blocking / WCET 上界
```

重点判断：

1. UART/USB transport 是真实变化轴时，可用 Adapter/DI 隔离；只有一种实现时不要提前造 Factory。
2. 固定 retry 不需要 Strategy；日志等横切能力优先 composition。
3. 单 owner 不使用 `shared_ptr`；borrow 不伪装成 ownership。
4. service locator 会隐藏 required dependency 与 teardown 顺序，应避免。
5. runtime registration 必须有容量上界，优先限制在初始化阶段。
6. callback 必须规定执行线程、unsubscribe/cancel 和 owner 销毁顺序。

## 可运行的设计重构练习

文件：`examples/day-056/exercise-02.cpp`

```bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic examples/day-056/exercise-02.cpp -o week08-review
./week08-review
```

程序用固定容量 `std::array` 建立 RX owner，`ModemSession` 只借用 `FixedRxBuffer&`，通过 `span` 暴露 view。

重构任务：

- 增加一个可替换 transport，但先判断 runtime virtual interface 是否真的必要；
- 若产品编译期固定 transport，尝试 template/concept 或普通 composition；
- 增加 callback 前先写出 unsubscribe/teardown 顺序；
- 不使用 `shared_ptr`，除非你能证明存在真实 shared ownership；
- 保持所有 allocation、注册数量、timeout 与 callback 执行上下文可审计。

## 本周判断题

1. “接口可复用”是否意味着必须 runtime polymorphism？为什么？
2. `unique_ptr` 能否保证实时安全？为什么不能？
3. required dependency 使用引用注入后，谁负责保证 lifetime？
4. callback 捕获一个 borrow 时，最少需要哪些 teardown contract？
5. 固定 128-byte RX buffer 为什么通常优先 `std::array` 而不是 heap？

## 本周结论

> 稳定 API 仅是第一层边界。工程可用的组件还需确保所有权、借用、拆除、内存分配、超时与 WCET 同样稳定透明。
