# 第 11 周复盘 · Day 71–77

**复盘日期：2026-11-10**  
**主线范围：Chapter 8 · Copy、Construction、Compiler-Generated Operations 与 Destruction**  
**本周结论：对象语义从 copy contract 开始，以 owner / borrow / lifetime / teardown 闭环结束。**

- [Day 71 · Copy Constructors and Value Semantics](../daily/day-071-copy-constructors-value-semantics.md)
- [Day 72 · Initializer-List Constructors](../daily/day-072-initializer-list-constructors.md)
- [Day 73 · Delegating Constructors](../daily/day-073-delegating-constructors.md)
- [Day 74 · Converting Constructors and Explicit Constructors](../daily/day-074-converting-constructors-explicit.md)
- [Day 75 · Summary of Compiler-Generated Constructors](../daily/day-075-summary-compiler-generated-constructors.md)
- [Day 76 · Object Destruction](../daily/day-076-object-destruction-raii-teardown.md)
- [Day 77 · 本周复盘课程](../daily/day-077-week11-review-constructors-destruction.md)

---

## 一、知识链复盘

| 主题 | 必须掌握的工程判断 |
|---|---|
| Copy constructor | 创建新对象；memberwise copy 按成员类型执行。raw pointer 复制地址，span 复制 borrow view，shared_ptr 共享控制块，unique_ptr 不可复制。 |
| Initializer-list | backing array 是临时只读存储；不要长期保存 view；`{}` 优先考虑 initializer-list constructor；运行期数据用 span + 长度/容量检查。 |
| Delegating constructor | convenience constructors 委托给 canonical constructor；构造只建立 invariant，不启动硬件、task 或 callback。 |
| Converting / explicit | 单参数构造默认 explicit；不同单位使用 distinct strong types；explicit 不替代运行期校验。 |
| Compiler-generated operations | `=default` / `=delete` 表达类型契约；Rule of Zero 优先；type traits 不证明资源语义或 WCET。 |
| Object destruction | 成员逆序销毁；多态删除需要正确析构契约；可失败 Stop(timeout) 与 no-throw destructor fallback 分开。 |

## 二、Code Review

每个不通过项必须指向文件/行号、测试或构建证据。

- [ ] **头文件依赖**：头文件能否独立编译？include 是否最小？公共接口是否泄漏 vendor HAL / RTOS 私有类型？
- [ ] **命名与类型**：类型/函数 PascalCase，变量/参数 snake_case，成员 snake_case_；timeout、baud rate、retry count 是否有单位/强类型？
- [ ] **所有权 / 生命周期**：owner 是否唯一？borrow 是否明确？span、initializer_list、raw pointer 是否被误存为长期成员？是否存在 self-pointer？
- [ ] **Copy / Move / Delete**：每个类型是独立值、共享资源、borrow 还是禁止复制？唯一资源是否误生成 copy？
- [ ] **实时路径动态分配**：ISR、DMA completion、Modem TX hot path 是否出现 new、容器扩容、shared_ptr 控制块或不可控 allocator？
- [ ] **错误模型**：invalid config、busy、timeout、resource exhausted、HAL error 是否区分？Stop 的 Status 是否由 owner task 处理？
- [ ] **ISR / volatile**：是否把 volatile 当线程同步？ISR 是否分配、阻塞、拿普通 mutex、执行复杂析构或等待 drain？
- [ ] **Magic number**：timeout、capacity、retry、baud rate、tick frequency 是否具名并带单位？
- [ ] **边界测试**：空输入、0、最大长度、max+1、copy 后独立修改、borrower 先销毁、重复 Stop、Stop timeout、重复 unregister 是否覆盖？
- [ ] **初始化 / 销毁顺序**：成员声明顺序与 initializer list 是否一致？owner 是否先声明、borrower 是否后声明？
- [ ] **多态析构**：是否存在通过 Base* / `unique_ptr<Base>` 删除派生对象却没有 virtual destructor 的路径？
- [ ] **CI / 编译器**：是否启用 `-Wall -Wextra -Wconversion -Wpedantic`？每个练习是否独立编译、主 Lab 是否运行？

## 三、Design Review

### 1. 变化轴与稳定边界

| 变化轴 | 稳定边界 | 推荐机制 |
|---|---|---|
| HAL 厂商 / 寄存器 API | Transport / DMA 最小 contract | Adapter；固定固件可用 template + concept |
| payload 长度 / 来源 | 最大帧长、错误模型、所有权 | 固定容量 value type / bounded pool |
| 参数单位 | timeout、tick、retry、baud rate 语义 | strong types + explicit conversion |
| 构造入口数量 | class invariant / 默认配置 | delegating constructor / Config value object |
| callback 注册 / 销毁 | unregister、in-flight drain、teardown | RAII registration token + Composition |
| 运行时算法变化 | 明确算法 contract | 只有真实变化时才考虑 Strategy |

### 2. Pattern 是否必要

- **Composition / Rule of Zero / RAII**：默认选择，明确 owner、borrower 与资源成员。
- **Adapter**：存在 HAL 差异时采用；固定固件编译期选择可优先 template/concept。
- **virtual interface**：只有 runtime replacement、插件或 ABI 需求时采用。
- **Observer**：只有多订阅者需求成立，且 registration capacity、线程上下文、unsubscribe/drain 都有界时采用。
- **Factory / Builder / Prototype**：创建复杂度或动态类型克隆需求真实存在时才采用。
- **shared_ptr**：不作为默认 DI；必须回答最后一个 owner 在哪个线程释放。
- **service locator**：不用于隐藏 required dependency。

### 3. Overengineering 审计

- [ ] 是否每个 Driver 都机械包装成 virtual interface？
- [ ] 是否为了测试替换而把所有依赖改成 shared_ptr？
- [ ] getter 是否返回内部裸指针却隐藏 owner / borrow？
- [ ] 是否用 service locator 隐藏 required dependency？
- [ ] 固定固件是否建立了无界 runtime registry？
- [ ] callback 是否捕获裸 this，却没有 cancel/unregister + in-flight drain？
- [ ] destructor 是否等待 DMA、task、mutex 或网络 flush？
- [ ] 是否把 compile-time variation 错做 runtime polymorphism，或把真正 runtime variation 错写死在模板里？
- [ ] 是否忽略 copy bytes、heap allocation、refcount、锁与 callback 的 WCET？

## 四、完整可运行设计重构练习

### Exercise 01：修复 callback registration 的成员销毁顺序

[examples/day-077/exercise-01.cpp](../examples/day-077/exercise-01.cpp)

```bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic examples/day-077/exercise-01.cpp -o week11-review
./week11-review
```

Starter 是完整 runnable program，预期输出：

```text
callback registered
transport destroyed
ERROR: callback token outlived transport
lifetime violation observed: true
```

重构要求：

1. 将 `FakeTransport transport_` 声明在 `CallbackRegistration callback_` 之前；
2. 同步调整 initializer list，使其与声明顺序一致；
3. 将测试断言改为 `assert(!ledger.violation)`；
4. 再运行，确认 callback 在 transport 仍存活时注销；
5. 解释真实 RTOS 中为什么仍需 in-flight drain：成员顺序只解决对象内依赖，不会等待已经进入的并发 callback；
6. 不得用 shared_ptr、service locator 或无界 Observer registry 掩盖生命周期问题。

修复后可启用 `-Werror`：

```bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic -Werror /tmp/day077-ex01-fixed.cpp -o /tmp/week11-review-fixed
/tmp/week11-review-fixed
```

### 主 Lab：验证显式 Stop 与 RAII fallback

[examples/day-077/main.cpp](../examples/day-077/main.cpp)

```bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic -Werror examples/day-077/main.cpp -o week11-main
./week11-main
```

观察 Stop timeout、重试成功、registration 先析构与 transport fallback 的顺序。此程序是 host-side 生命周期模型，不替代真实 RTOS callback 同步原语。

## 五、本周结论与下一步

- 普通值对象：value semantics；
- 唯一资源：move-only RAII owner；
- 异步输入：owner transfer 或有界 pool handle；
- required dependency：显式 borrow / injection；
- 多构造入口：canonical constructor；
- 单位和转换：strong type + explicit；
- 资源关闭：显式、可失败、带 timeout 的 Stop；
- 最终兜底：no-throw、有界 destructor；
- callback：unregister + in-flight drain + 正确 teardown 顺序。

**下一主教材主题：Day 78 · Chapter 8 · Assignment Operators（原书 p.288 起）。** 先学习 copy assignment operator；move assignment 按原书后续顺序安排。
