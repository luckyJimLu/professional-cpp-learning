# Week 05 Review · Day 29–35

本周主线：**Chapter 5 · Designing with Classes**。

目标不是记住更多 class 语法，而是建立一套可以直接用于 Driver / Middleware / Modem 代码评审的对象设计判断框架。

## 本周知识链

```text
Day 29  constructor / valid state
   ↓
Day 30  composition / responsibility
   ↓
Day 31  ownership / lifetime
   ↓
Day 32  is-a / inheritance boundary
   ↓
Day 33  polymorphism / virtual interface
   ↓
Day 34  override / final / virtual destructor
   ↓
Day 35  object slicing / dynamic type
```

---

## 1. Constructor 与有效状态

对象构造完成后，应立即满足自己的 invariant。

不要把“半初始化对象”留给调用者继续修补。

重点检查：

- 单参数 constructor 是否 `explicit`；
- 是否把可失败、阻塞的硬件启动过程错误塞进 constructor；
- 是否把运行期错误通过统一 `Status` 返回。

---

## 2. Composition 优先于错误继承

判断两个类关系时，先问：

```text
is-a?
has-a?
uses-a?
owns-a?
```

如果只是“使用 UART”，不要因为复用代码就写：

```cpp
class Modem : public UartDriver {};
```

更自然的是：

```cpp
class ModemSession {
 public:
  explicit ModemSession(ITransport& transport)
      : transport_(transport) {}

 private:
  ITransport& transport_;
};
```

---

## 3. Ownership / Borrowing / Lifetime

本周最重要的工程判断之一：

- `T&`：required non-owning borrow；
- `T*`：通常是 nullable / optional borrow；
- `std::unique_ptr<T>`：exclusive ownership；
- `std::shared_ptr<T>`：shared ownership，必须有真实业务理由。

**不要因为“多态”就自动选择 shared_ptr。**

---

## 4. Inheritance 必须表达 is-a

合理：

```text
ITransport
├── UartTransport
├── UsbTransport
└── FakeTransport
```

不合理：

```text
UartDriver
└── Modem
```

前者围绕稳定 contract，后者只是为了复用实现。

---

## 5. Polymorphism 的收益与成本

运行时多态适合：

- 平台实现需要运行时替换；
- host test / fake implementation；
- 稳定接口隔离平台细节；
- 上层不应知道具体 Driver 类型。

需要评估：

- vptr / vtable；
- indirect call；
- inline 机会；
- deadline / jitter；
- hierarchy 维护成本。

性能判断必须基于测量，而不是“嵌入式不能用 virtual”这种绝对结论。

---

## 6. override / final / virtual destructor

团队规则建议：

- virtual override 显式写 `override`；
- 多态基类定义明确析构策略；
- 没有继续扩展需求的具体叶子类可使用 `final`；
- 不要让签名漂移静默发生。

---

## 7. Object Slicing

高风险接口：

```cpp
void Process(ITransport transport);
```

如果传入 derived object，会复制 base subobject，dynamic type 丢失。

多态对象通常应通过：

```cpp
ITransport&
ITransport*
```

来保持动态类型语义。

---

# Mini Project · Modem Transport Boundary

设计目标：

```text
Application
    ↓
ModemSession
    ↓ borrow
ITransport
 ├─ UartTransport
 └─ FakeTransport
```

要求：

- `ITransport` 是小接口；
- virtual destructor；
- concrete implementation 使用 `override`；
- leaf implementation 可 `final`；
- `ModemSession` 只借用 `ITransport&`；
- buffer 使用 `std::span`；
- timeout 使用 `std::chrono`；
- 错误统一使用 `Status`；
- 实时发送路径不动态分配；
- Fake 可验证调用次数与边界。

---

# Code Review 检查

## 头文件依赖

- [ ] 使用符号的文件直接 include 所需头文件
- [ ] 未依赖传递 include
- [ ] public header 未泄漏平台实现细节

## 命名

- [ ] 类型使用 PascalCase
- [ ] 函数使用 PascalCase
- [ ] 变量 / 参数使用 snake_case
- [ ] 成员使用 snake_case_
- [ ] 常量使用 kPascalCase
- [ ] 单位进入类型或名称

## 所有权 / 生命周期

- [ ] owner 唯一且清晰
- [ ] borrow 没有错误 delete
- [ ] reference / pointer 生命周期被满足
- [ ] 未滥用 shared_ptr
- [ ] 多态参数没有 by-value slicing

## 实时路径

- [ ] 无无界动态分配
- [ ] 无隐藏的大拷贝
- [ ] 阻塞调用具有 timeout
- [ ] 日志不会改变时序行为

## 错误模型

- [ ] 可恢复错误不用 assert
- [ ] 同一层未混用 bool / -1 / exception / Status
- [ ] 错误保留必要上下文

## ISR / volatile

- [ ] volatile 未被当作线程同步
- [ ] ISR 工作量最小
- [ ] 共享状态同步策略明确

## Magic Number

- [ ] baudrate / timeout / buffer capacity 有明确名称或类型
- [ ] 协议常量使用 constexpr

## 边界测试

至少覆盖：

- [ ] empty buffer
- [ ] timeout = 0
- [ ] maximum buffer size
- [ ] invalid state
- [ ] fake transport failure
- [ ] object lifetime boundary

---

# 本周自测

1. 为什么 `ModemSession : public UartTransport` 通常是错误建模？
2. 多态为什么不会自动解决 ownership？
3. `override` 能帮你发现什么重构错误？
4. 为什么多态基类通常需要 virtual destructor？
5. object slicing 是怎么发生的？
6. `ITransport&` 和 `std::unique_ptr<ITransport>` 分别表达什么？
7. 什么时候 static polymorphism 可能比 runtime polymorphism 更合适？

---

# 下周预览

继续 Chapter 5，并逐步过渡到 Chapter 6 · **Designing for Reuse**。

下一阶段会重点关注：

- virtual call 的边界与真实成本；
- 稳定接口 vs 可复用实现；
- reuse 应围绕 contract，而不是继承层级堆叠；
- 嵌入式中如何选择 runtime / static abstraction。
