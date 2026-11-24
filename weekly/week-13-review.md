# Week 13 Review · Day 85–90：Class Contracts、Inheritance 与 Runtime Polymorphism

> **复盘日期**：2026-11-24  
> **对应课程**：Day 85–90；Day 91 为本周复盘课。  
> **主教材**：Marc Gregoire, *Professional C++, Sixth Edition*（C++23），Chapter 9–10。  
> **目标**：把类型语义、值语义、稳定接口、继承、重写与运行时多态放进同一套设计审查流程。

## 1. 本周知识地图

| Day | 主题 | 工程结论 |
|---:|---|---|
| 85 | Enumerations Inside Classes | enum class 限定状态域；外部整数先验证再转换 |
| 86 | Operator Overloading | 运算符保持自然值语义；I/O、阻塞、硬件副作用使用具名 API |
| 87 | Building Stable Interfaces | PImpl 隐藏实现；unique_ptr 是 owner，Impl 内引用仍是 borrow |
| 88 | Building Classes with Inheritance | public inheritance 是 is-a / substitutability 契约；复用优先 composition |
| 89 | Overriding Member Functions | virtual 建立动态分派点；override 检查重写签名 |
| 90 | The Truth about virtual | vtable 是常见实现模型；析构策略、ABI 和目标成本需独立审查 |

本周统一设计链：

~~~text
Domain Type
   |
   v
Value Semantics / Class Invariants
   |
   v
Stable Public Interface
   |
   +---- composition when relationship is has-a / uses-a
   |
   +---- inheritance only for substitutability
              |
              v
       virtual + override
              |
              v
    runtime selection when required
              |
              v
    owner / borrow / lifetime / teardown
~~~

## 2. Code Review

本次对 Day 85–90 的 12 个独立 C++ 源文件做静态检查，并结合课程正文审查接口与生命周期。Day 91 的两个新程序另外进行了实际独立编译和运行验证；历史 12 个文件本次未重新编译。

### 2.1 头文件依赖与可独立运行性

- Day 85–90 的主 Lab 与 Exercise 均为独立 .cpp，并包含自己的 main()；没有把多个 main() 放进同一个编译单元。
- 主要标准库依赖均有对应 include，例如 optional、compare、memory、span、chrono、type_traits。
- Day 85 / Day 86 的部分示例排版较紧凑，后续整理时应保持一行一个声明、清晰缩进和统一 clang-format 风格。
- CI 应对每个 examples/day-XXX/*.cpp 独立编译，而不是只编译主 Lab。

### 2.2 命名与接口契约

- 类型使用 PascalCase，变量多使用 snake_case，成员使用尾随下划线；保持项目内一致。
- enum class 和 Status 让状态 / 错误语义可读；不要让原始整数直接进入状态机。
- Day 86 的 ByteCount 值类型表达了单位边界，但加法仍需明确溢出策略；若上游可提供任意大小输入，应增加 checked addition 或明确 precondition。
- Day 88 的 baud rate 范围与默认值应进一步抽成 kMinBaudRate、kMaxBaudRate、kDefaultBaudRate，避免业务常量散落。

### 2.3 Ownership / Borrow / Lifetime

- Day 87 的 ModemController 通过 unique_ptr<Impl> 拥有实现对象；Impl 内的 IAtTransport& 是借用。主函数先声明 transport，再创建 controller，销毁顺序正确。
- Day 88 的 Device 使用 protected non-virtual destructor，表达禁止通过 Device* 删除派生对象；UartPort 是具体 owner，base view 只借用。
- Day 89 / 90 的 Sender 通过 ByteTransport& 借用 transport；virtual 不改变 owner / borrower 关系。
- 不应因为接口是 virtual 就自动升级为 shared_ptr；除非存在真实共享所有权，并能说明最后一次释放发生在哪个线程。

### 2.4 Allocation、实时路径与错误模型

- Day 87 的 nothrow PImpl allocation 位于创建工厂路径；SendAt() 路径没有 new / delete。目标平台仍需核算启动期 heap、碎片和失败回滚。
- Day 85–90 的主实验没有 shared_ptr，也没有把 heap allocation 放入示例发送热路径。
- 错误使用 enum class / optional / Status 显式传播；可恢复输入错误不应改用 assert。
- 本周示例未使用 volatile，也没有 ISR / MMIO 实现。不要把 volatile 当作 task 间同步工具；真实 MMIO 访问应集中在 HAL，线程同步应使用明确的 RTOS / atomic / critical-section 契约。
- Day 90 的 timeout / empty payload 测试有观察结果；Day 87 覆盖 start / stop / timeout / disconnected / invalid command；Day 88 应补齐 baud rate 的精确边界测试：最小值、最大值、最小值减一、最大值加一。
- Day 86 应增加 ByteCount 溢出边界；Day 85 应持续测试所有合法 enum 值和非法 raw byte。

### 2.5 Code Review Checklist

- [ ] 头文件是否自包含，是否只 include 直接依赖？
- [ ] 类型、函数、变量、成员命名是否一致且表达意图？
- [ ] owner / borrow / lifetime 是否可从类型和构造顺序看出？
- [ ] PImpl / pool / buffer allocation 是否只发生在有预算的上下文？
- [ ] 错误模型是否保留 invalid / timeout / transport failure 的区别？
- [ ] ISR 是否只做有界工作？volatile 是否被错误用作同步？
- [ ] baud rate、payload limit、timeout 等是否使用命名常量和明确单位？
- [ ] 边界测试是否覆盖 min / max / just-outside / empty / timeout / overflow？
- [ ] 每个 .cpp 是否独立编译、独立运行并有可观察结果？

## 3. Design Review：Modem AT Middleware

### 3.1 真实变化轴

| 变化 | 稳定部分 | 推荐机制 |
|---|---|---|
| UART / USB / Fake transport 运行期替换 | Write、timeout、错误和 buffer contract | Strategy / virtual interface |
| 固件 transport 编译期固定 | 同一发送行为 | 具体类型或 template / concept |
| AT 命令格式与底层 transport 分离 | SendAt 高层语义 | Facade + composition |
| vendor HAL 错误码 / 参数与上层不同 | 上层 transport contract | Adapter |
| 内部实现影响公共头文件或 ABI | public API | 仅在有收益时使用 PImpl |
| trace / metrics 作为独立横向能力 | 原有 Write 语义 | 有真实需求时 Decorator |

### 3.2 需要关闭的设计风险

- **过度 virtual**：只在调用者需要 runtime replacement 的窄接口上使用 virtual；固定值类型、编码器和配置不需要虚函数。
- **过度 shared_ptr**：composition root 是唯一 owner 时使用具体成员 / unique_ptr；控制器借用 transport 用引用。
- **隐藏 ownership**：required dependency 不放进 Service Locator；构造参数直接表达。
- **Callback lifetime**：异步化后先停止新请求，再 unregister / cancel，再 drain in-flight callback，最后销毁 target 和 transport。
- **Runtime registration 上界**：插件系统必须限定数量、ABI 版本、注册时机、并发访问和卸载顺序；RTOS 固件优先静态注册或编译期配置。
- **Facade / inheritance 混淆**：高层控制器不是底层 transport。不能为了转发 Write() 就 public inherit，否则调用者可绕过 AT command validation。

### 3.3 目标架构

~~~text
Composition Root
  ├── owns UartTransport / UsbTransport / FakeTransport
  └── constructs ModemController
                  |
                  | borrow
                  v
            ByteTransport
                  ^
                  |
          ModemController
             (Facade)
              /     \
             v       v
       AtCommandEncoder
         (value member)
~~~

ModemController 拥有 encoder 的值成员，借用 transport；transport owner 必须比 controller 活得更久。同步 Write 的 span 只在调用期间有效。DMA 异步路径必须改成 owner-managed buffer，不可直接保留栈上 span。

## 4. Design Review 重构练习（完整可编译运行）

源码：[examples/day-091/exercise-01.cpp](../examples/day-091/exercise-01.cpp)

该 starter 是可编译运行的逻辑 / 设计违规版本：ModemController public inherit ByteTransport，并把 Write() 转发到底层 UART。调用者可以通过 base reference 直接写 raw bytes，绕过 SendAt() 的命令边界。

编译与运行：

~~~bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic examples/day-091/exercise-01.cpp -o day91-ex01
./day91-ex01
~~~

重构要求：

1. 删除 ModemController 的 public inheritance。
2. 将 ByteTransport& 保留为 required borrow。
3. 删除 Write() override，只保留领域 API SendAt()。
4. SendAt() 完成输入校验和固定容量编码，再调用 transport_.Write()。
5. 删除通过 Base& 调用 ModemController::Write() 的路径。
6. 重新独立编译并运行；确认控制器不再能被当作 ByteTransport 使用。

主 Lab：[examples/day-091/main.cpp](../examples/day-091/main.cpp) 提供完整的 Facade + composition 参考实现。

~~~bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic examples/day-091/main.cpp -o day91
./day91
~~~

## 5. Embedded / RTOS 约束复核

- 固定容量 frame：明确最大字节数与栈预算。
- CPU / WCET：编码循环长度有上界；目标平台测量 virtual dispatch、HAL、锁与失败路径。
- IRQ：ISR 不执行阻塞发送；通过固定容量 queue 交给 ModemTask。
- Timeout：使用 chrono duration，HAL 转 tick 时处理溢出和舍入。
- Error：保留 invalid input、timeout、transport failure 的独立状态。
- Threading：明确单 owner task 或有界同步；不要把 virtual 误认为线程安全。
- Callback：注册、取消、drain、销毁顺序必须有契约。
- Hardware substitution：Host Fake 测逻辑，HIL 测 DMA / IRQ / 电气时序 / WCET。

## 6. 本周完成标准

- [ ] 能区分 enum class、运算符值语义、PImpl、inheritance、override 和 virtual 的职责。
- [ ] 能从调用者视角证明 public inheritance 是否满足 substitutability。
- [ ] 能解释 virtual 与 ownership 无关，能判断 base destructor policy。
- [ ] 能为 runtime / compile-time variation 选择 Strategy 或 template / concept。
- [ ] 能把 Facade 设计成 composition，而不是伪装成底层接口。
- [ ] 能给每个 buffer、reference、span 和 callback 标注 owner / borrow / lifetime / teardown。
- [ ] 能给出 RAM、Flash、timeout、thread / ISR 与 WCET 的验证计划。

## 7. 下一周主教材顺序

Day 92 回到 Chapter 10 · Discovering Inheritance Techniques，按原书下一小节 **Preventing Overriding**（p.370）推进。随后才进入 Inheritance For Reuse；不为覆盖某个设计模式而跳过教材顺序。
