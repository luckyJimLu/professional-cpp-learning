# 第 05 周复盘 · Day 29–35

本周主线：**Chapter 5 · Designing with Classes**。

目标不是记住更多 class 语法，而是建立一套可以直接用于 Driver / Middleware / Modem 代码评审的对象设计判断框架。

## 本周知识链

```text
Day 29  构造函数 / 有效状态
   ↓
Day 30  组合 / 职责
   ↓
Day 31  所有权 / 生命周期
   ↓
Day 32  is-a / 继承边界
   ↓
Day 33  多态 / 虚接口
   ↓
Day 34  override / final / 虚析构函数
   ↓
Day 35  对象切片 / 动态类型
```

---

## 1. 构造函数与有效状态

对象构造完成后，应立即满足自身的类不变性。

切勿将半初始化对象留给调用者补救。

重点检查：

- 单参数构造函数是否标记为 `explicit`；
- 是否把可失败、阻塞的硬件启动过程误放入构造函数；
- 是否通过统一的 `Status` 返回运行期错误。

---

## 2. 组合优先于错误继承

判断两个类关系时，先问：

```text
is-a?
has-a?
uses-a?
owns-a?
```

如果只是“使用 UART”，不要为了复用代码而误用继承：

```cpp
class Modem : public UartDriver {};
```

更自然的是：

```cpp
class ModemSession {
public:
  explicit ModemSession(ITransport& transport) : transport_(transport) {}

private:
  ITransport& transport_;
};
```

---

## 3. 所有权 / 借用 / 生命周期

本周最重要的工程判断之一：

- `T&`：必要的非所有权借用（required non-owning borrow）；
- `T*`：通常为可选借用（nullable / optional borrow）；
- `std::unique_ptr<T>`：独占所有权（exclusive ownership）；
- `std::shared_ptr<T>`：共享所有权（shared ownership），必须有明确的业务理由。

**不要仅因多态需求就自动选择 `shared_ptr`。**

---

## 4. 继承必须表达 is-a

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

## 5. 多态的收益与成本

运行时多态适用于：

- 平台实现需要在运行时替换；
- 主机测试（host test）与伪实现（fake implementation）；
- 用稳定接口隔离平台细节；
- 上层无需感知具体驱动（Driver）类型。

评估项：

- 虚表与虚表指针（vptr / vtable）；
- 间接调用开销；
- 内联优化机会；
- 截止时间与抖动（deadline / jitter）；
- 继承层级的维护成本。

性能判断应基于真实测量，而非“嵌入式环境禁用虚函数”等绝对化结论。

---

## 6. override / final / 虚析构函数

团队规范建议：

- 虚函数重写显式标注 `override`；
- 多态基类明确定义析构策略；
- 无进一步扩展需求的叶子类标注 `final`；
- 避免函数签名漂移静默发生。

---

## 7. 对象切片

高风险接口：

```cpp
void Process(ITransport transport);
```

传入派生类对象时，会复制基类子对象（base subobject），导致动态类型丢失。

多态对象通常应通过以下方式维持动态类型语义：

```cpp
ITransport& ITransport*
```

来保持动态类型语义。

---

# 小型项目 · Modem 传输边界

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

# 代码评审检查

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

## ISR 与 volatile

- [ ] volatile 未被当作线程同步
- [ ] ISR 工作量最小
- [ ] 共享状态同步策略明确

## 魔法数字

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
