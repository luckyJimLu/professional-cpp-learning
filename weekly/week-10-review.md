# 第 10 周复盘 · Day 64–70

本周跨越 Chapter 7 Memory Management 的收束与 Chapter 8 Classes and Objects 的开端：

- Day 64：对象生命周期、placement construction 与 fixed storage reuse；
- Day 65：optional 生命周期与固定池安全边界；
- Day 66：Memory Management 资源边界决策树；
- Day 67：class 封装、成员函数与对象不变量；
- Day 68：storage duration、this 与 C++23 explicit object parameter；
- Day 69：对象创建、构造函数与合法初始状态；
- Day 70：constructor initializer list、直接初始化与成员顺序。

本周主线：**先明确对象何时存在、由谁拥有、如何结束生命周期，再让构造函数与成员声明顺序把这些约束固化到类型中。**

## 一、知识链复盘

### 1. 生命周期与存储

- storage duration 不等于 object lifetime；
- placement construction / fixed pool 必须区分 storage 与已开始生命周期的 object；
- optional 和固定容量容器能表达“对象可能存在”，但不替代 owner/lifetime 设计；
- borrower 不得超过 owner 生命周期。

### 2. class 与构造边界

- private state 与成员函数负责维护 class invariant；
- this 是 borrow，不是 owner；
- 构造函数正常返回时对象必须合法；
- 可失败硬件启动留给显式 Start/Initialize，使用 Status 与 timeout；
- initializer list 直接初始化成员，声明顺序决定初始化顺序，析构顺序相反。

### 3. 设计原则

- 先值语义和 composition；
- 先设计 lifetime，再选择 pointer；
- required dependency 显式注入；
- 不因需要测试替换就默认使用 shared_ptr；
- 不为固定固件配置建立无界 runtime registry 或假想插件系统。

## 二、Code Review

逐项审查本周课程与实际项目中的对象设计：

- [ ] **头文件依赖**：是否自包含、最小化 include，是否把 HAL/RTOS 实现细节泄漏到公共接口？
- [ ] **命名**：类型/函数是否 PascalCase，变量/参数/成员是否遵循仓库约定，单位是否进入名称或类型？
- [ ] **所有权/生命周期**：owner 是否唯一明确，borrow 是否使用引用或明确 nullable pointer，this/callback 是否有 teardown？
- [ ] **实时路径动态分配**：热路径是否出现 new、容器扩容、shared_ptr refcount 或不可控 allocator？
- [ ] **错误模型**：allocation failure、invalid argument、busy、timeout、device error 是否保留原因？
- [ ] **ISR / volatile**：是否把 volatile 错当线程同步，ISR 是否执行了阻塞、分配或复杂析构？
- [ ] **Magic number**：timeout、capacity、baud rate、buffer length 是否具名并标明单位？
- [ ] **边界测试**：是否覆盖空输入、最小值、最大值、max+1、对象未启动、重复 Start/Stop、资源耗尽？
- [ ] **初始化顺序**：initializer list 是否与成员声明顺序一致，是否存在成员依赖未构造对象？
- [ ] **析构顺序**：borrower member 是否在 owner member 之前声明，从而先析构 borrower？

## 三、Design Review

### 变化轴与稳定边界

以 Modem UART/DMA 子系统为例：

- 变化轴：HAL 供应商、RTOS/host 环境、固定容量、设备配置；
- 稳定边界：Driver 所需的最小 Configure/Write contract、Status、timeout、buffer capacity；
- Composition Root：创建并拥有 HAL、Buffer 与 Driver；
- Driver：通过引用或模板参数借用 HAL；
- TransferEngine：若借用 Buffer，必须晚于 Buffer 构造、早于 Buffer 析构。

### Pattern 是否必要

| 候选 | 判断 |
|---|---|
| Composition | 需要，用于组织固定对象与生命周期 |
| Dependency Injection | 需要，required dependency 显式传入 |
| Adapter | 只有厂商 C API 与稳定 contract 不一致时需要 |
| Template / concept | 固件构建期固定 HAL 时优先考虑 |
| Runtime virtual interface | 只有运行时替换或独立 ABI 需求时再引入 |
| Factory | 没有多个产品族或运行时创建变化时不需要 |
| Strategy | 没有运行时算法变化轴时不需要 |
| shared_ptr | 不作为默认依赖传递方式 |

### Overengineering 审计

- [ ] 是否把每个 Driver 都做成 virtual interface？
- [ ] 是否用 shared_ptr 掩盖谁拥有对象？
- [ ] 是否存在隐藏 ownership 的裸指针返回值？
- [ ] 是否使用 service locator 隐藏 required dependency？
- [ ] callback 是否可能 dangling，是否定义 unsubscribe/cancel 与 in-flight drain？
- [ ] runtime registration 是否有固定容量、注册时机、线程上下文与 WCET 上界？
- [ ] 是否为了一个固定配置建立 Factory/Abstract Factory 层？

## 四、完整可运行设计重构练习

使用本周 Day 70 的独立 starter：

[examples/day-070/exercise-01.cpp](../examples/day-070/exercise-01.cpp)

~~~bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic examples/day-070/exercise-01.cpp -o week10-review
./week10-review
~~~

它是包含 main() 的完整程序。先观察默认构造 + 赋值产生的计数，再重构为 initializer list：

1. channel 与 buffer 在 constructor 初始化阶段直接获得最终值；
2. 配置不可变时使用 const member；
3. 让声明顺序表达 owner/borrower 关系；
4. 删除不必要的默认构造和复制赋值路径；
5. 保留可观察输出，并确认 default construction=0、copy assignment=0；
6. 不引入 heap、shared_ptr、service locator 或无界注册机制。

## 五、本周结论

对象设计不是“选一个智能指针”就结束。先确定 storage、object lifetime、owner、borrower 与 teardown，再选择 value、RAII、optional、fixed pool 或 pointer。构造函数与成员声明顺序应当把合法状态和依赖生命周期固化到代码中，而不是留给调用者记忆。
