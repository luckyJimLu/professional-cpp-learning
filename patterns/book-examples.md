# 设计模式分类（Design Pattern Catalog）

从对象创建、对象组合与行为协作三个角度，阅读书中案例，定位变化轴、稳定边界与 ownership，再运行独立示例验证行为。

本资料与[工程化学习指南](README.md)及[所有权专题](ownership-and-smart-pointers.md)互补，不占用每日课程 Day 编号。

## 覆盖范围

- GoF 23 种经典模式：创建型5种、结构型7种、行为型11种。
- 9项补充：静态工厂、空对象、RAII、ScopeGuard、CRTP、Policy、类型擦除、Pimpl、后台 Monitor。
- 1个装饰器定价变体，用于比较税费和折扣的组合顺序。
- 共33个独立程序，每个都包含 `main()` 和关键行为断言。

GoF 分类用于索引；补充项不全部属于 GoF 模式。静态工厂与继承式 Factory Method 分列；State 示例采用表驱动状态机；Monitor 沿用 H 书的后台进度监控含义。这里不复刻三本书的所有技术：Concepts、SFINAE、小缓冲优化、Friend Factory、Active Object、Reactor、Proactor 和协程等可另设后续专题。

## 书籍来源

| 缩写 | 书籍 | 定位方式 |
| --- | --- | --- |
| M | Dmitri Nesteruk, *Design Patterns in Modern C++: Reusable Approaches for Object-Oriented Software Design*, Apress, 2018, ISBN 978-1-4842-3603-1 | 章、小节及印刷页码 |
| S | Klaus Iglberger, *C++ Software Design: Design Principles and Patterns for High-Quality Software*, O’Reilly | Guideline 编号与标题 |
| H | Fedor G. Pikus, *Hands-On Design Patterns with C++*, Second Edition, Packt, 2023, ISBN 978-1-80461-155-5 | 章、小节；部分附印刷页码 |

所有代码都是依据书中案例和设计意图编写的**独立教学改写**，不是原书源码的逐字转录。补齐了头文件、`main()` 与行为检查，删除 PDF 排版行号并统一为 C++17 标准库实现。每项明确说明案例与改写边界；跨书引用用于比较设计意图，不表示每一行代码均来自所有列出的书籍。页码按印刷页计，PDF 页序可能不同，请优先使用章节与小节标题定位。原书 PDF 不随仓库发布。

## 编译与验证

在仓库根目录运行：

```sh
# 仅检查本专题：C++17、严格警告、每个程序最多运行10秒。
python3 tools/check-examples.py --patterns-only

# 检查全部 standalone 示例，现有 CI 会执行此命令。
python3 tools/check-examples.py

# 单个示例；每份源码独立编译，不要把多个 main 链接到一起。
g++ -std=c++17 -Wall -Wextra -Wconversion -Wpedantic -Werror -pthread \
  patterns/examples/creational/builder.cpp -o /tmp/pattern-builder
/tmp/pattern-builder
```

成功时退出码为0；示例默认不输出文本，关键行为由 `assert` 验证。不要设置 `-DNDEBUG`，否则检查会被关闭。可用 `CXX=clang++` 选择其他编译器，也可加 `--sanitize` 执行地址与未定义行为检查（需环境支持）。RAII 与 Monitor 使用宿主机线程，需本地编译运行，不保证浏览器 WebAssembly Lab 支持。

源码位于 `patterns/examples/<类别>/*.cpp`，可以通过学习平台代码搜索检索。为便于阅读，示例 `.cpp` 使用 `using namespace std`；项目公共头文件不应这样做。动态分配、异常和线程用于教学，不代表可直接部署到禁堆、禁异常或有硬实时约束的 Embedded 系统。

## 相近模式的选择

| 对比 | 选择依据 |
| --- | --- |
| 工厂方法 / 抽象工厂 / 静态工厂 | 子类覆写创建步骤 / 创建配套产品族 / 用命名函数表达创建语义 |
| 适配器 / 装饰器 / 代理 | 转换接口 / 同接口叠加职责 / 同接口控制访问 |
| 策略 / 模板方法 | 组合并替换算法 / 继承并覆写固定流程步骤 |
| 桥接 / 策略 | 两个变化维度独立扩展 / 上下文委派算法；结构相似但意图不同 |
| 命令 / 备忘录 | 保存操作、参数及执行信息 / 保存对象状态快照 |
| 观察者 / 中介者 | 发布变化、通知订阅者 / 集中维护多方协作规则 |
| 状态 / 策略 | 状态与事件决定合法行为及转移 / 调用方选择算法 |
| 访问者 / 普通虚接口 | 操作频繁增加、类型稳定时考虑访问者；类型频繁增加时比较普通虚接口的维护成本 |

先确认变化是否真实存在。简单函数、值类型或直接组合已经足够时，无需为了名字新增层次。

## 分类目录

### [创建型模式（Creational Patterns）](01-creational-patterns.md)

| 模式 | 书中案例 / 改写要点 | 独立源码 |
| --- | --- | --- |
| [工厂方法（Factory Method）](01-creational-patterns.md#工厂方法factory-method) | 工厂接口创建饮品；这里改写为 Creator 的虚工厂方法，避免把静态工厂误称为 GoF 工厂方法。 | [factory_method.cpp](https://github.com/luckyJimLu/professional-cpp-learning/blob/main/patterns/examples/creational/factory_method.cpp) |
| [抽象工厂（Abstract Factory）](01-creational-patterns.md#抽象工厂abstract-factory) | 书中的 CoffeeFactory/TeaFactory 创建热饮；本例扩展为饮品与杯具的配套产品族，以展示 GoF 产品族约束。 | [abstract_factory.cpp](https://github.com/luckyJimLu/professional-cpp-learning/blob/main/patterns/examples/creational/abstract_factory.cpp) |
| [建造者（Builder）](01-creational-patterns.md#建造者builder) | HtmlBuilder 逐步创建列表；改写保留链式添加和最终构建。 | [builder.cpp](https://github.com/luckyJimLu/professional-cpp-learning/blob/main/patterns/examples/creational/builder.cpp) |
| [原型（Prototype）](01-creational-patterns.md#原型prototype) | 联系人与地址的深拷贝；补充多态 clone 接口。 | [prototype.cpp](https://github.com/luckyJimLu/professional-cpp-learning/blob/main/patterns/examples/creational/prototype.cpp) |
| [单例（Singleton）](01-creational-patterns.md#单例singleton) | 函数内 static 数据库实例，禁用复制。 | [singleton.cpp](https://github.com/luckyJimLu/professional-cpp-learning/blob/main/patterns/examples/creational/singleton.cpp) |

### [结构型模式（Structural Patterns）](02-structural-patterns.md)

| 模式 | 书中案例 / 改写要点 | 独立源码 |
| --- | --- | --- |
| [适配器（Adapter）](02-structural-patterns.md#适配器adapter) | 将直线转换为点序列，供只会处理点的旧接口使用。 | [adapter.cpp](https://github.com/luckyJimLu/professional-cpp-learning/blob/main/patterns/examples/structural/adapter.cpp) |
| [桥接（Bridge）](02-structural-patterns.md#桥接bridge) | Circle 通过 Renderer 调用矢量或栅格实现；不再为每种组合派生类。 | [bridge.cpp](https://github.com/luckyJimLu/professional-cpp-learning/blob/main/patterns/examples/structural/bridge.cpp) |
| [组合（Composite）](02-structural-patterns.md#组合composite) | GraphicObject 的叶节点和 Group 共享 draw 接口；组可递归包含组。 | [composite.cpp](https://github.com/luckyJimLu/professional-cpp-learning/blob/main/patterns/examples/structural/composite.cpp) |
| [装饰器（Decorator）](02-structural-patterns.md#装饰器decorator) | ColoredShape 包装 Shape 并增加颜色描述。 | [decorator.cpp](https://github.com/luckyJimLu/professional-cpp-learning/blob/main/patterns/examples/structural/decorator.cpp) |
| [外观（Facade）](02-structural-patterns.md#外观facade) | 终端的缓冲区和视口封装到一个便捷接口；以下是简化改写。 | [facade.cpp](https://github.com/luckyJimLu/professional-cpp-learning/blob/main/patterns/examples/structural/facade.cpp) |
| [享元（Flyweight）](02-structural-patterns.md#享元flyweight) | 将重复用户名字符串驻留；改写使用共享的不可变字符串。 | [flyweight.cpp](https://github.com/luckyJimLu/professional-cpp-learning/blob/main/patterns/examples/structural/flyweight.cpp) |
| [代理（Proxy）](02-structural-patterns.md#代理proxy) | LazyBitmap 在第一次 draw 时才构造真实 Bitmap。 | [proxy.cpp](https://github.com/luckyJimLu/professional-cpp-learning/blob/main/patterns/examples/structural/proxy.cpp) |

### [行为型模式（Behavioral Patterns）](03-behavioral-patterns.md)

| 模式 | 书中案例 / 改写要点 | 独立源码 |
| --- | --- | --- |
| [责任链（Chain of Responsibility）](03-behavioral-patterns.md#责任链chain-of-responsibility) | CreatureModifier 链逐步修改角色属性，某个处理器可以停止转发。 | [chain_of_responsibility.cpp](https://github.com/luckyJimLu/professional-cpp-learning/blob/main/patterns/examples/behavioral/chain_of_responsibility.cpp) |
| [命令（Command）](03-behavioral-patterns.md#命令command) | 将账户存取操作封装为对象，记录执行结果以决定是否撤销。 | [command.cpp](https://github.com/luckyJimLu/professional-cpp-learning/blob/main/patterns/examples/behavioral/command.cpp) |
| [解释器（Interpreter）](03-behavioral-patterns.md#解释器interpreter) | 将整数与加减组合为表达式树并递归求值；本例只实现 AST 求值层。 | [interpreter.cpp](https://github.com/luckyJimLu/professional-cpp-learning/blob/main/patterns/examples/behavioral/interpreter.cpp) |
| [迭代器（Iterator）](03-behavioral-patterns.md#迭代器iterator) | 二叉树中序遍历，迭代器隐藏栈和节点细节。 | [iterator.cpp](https://github.com/luckyJimLu/professional-cpp-learning/blob/main/patterns/examples/behavioral/iterator.cpp) |
| [中介者（Mediator）](03-behavioral-patterns.md#中介者mediator) | 聊天室负责加入与广播，参与者不持有彼此的引用。 | [mediator.cpp](https://github.com/luckyJimLu/professional-cpp-learning/blob/main/patterns/examples/behavioral/mediator.cpp) |
| [备忘录（Memento）](03-behavioral-patterns.md#备忘录memento) | 账户返回私有状态快照，再恢复到指定快照。 | [memento.cpp](https://github.com/luckyJimLu/professional-cpp-learning/blob/main/patterns/examples/behavioral/memento.cpp) |
| [观察者（Observer）](03-behavioral-patterns.md#观察者observer) | 属性变化通知订阅者；改写增加订阅 ID 与回调期间退订处理。 | [observer.cpp](https://github.com/luckyJimLu/professional-cpp-learning/blob/main/patterns/examples/behavioral/observer.cpp) |
| [状态（State）](03-behavioral-patterns.md#状态state) | 电话状态和触发事件组成转移表；避免散落的条件判断。 | [state.cpp](https://github.com/luckyJimLu/professional-cpp-learning/blob/main/patterns/examples/behavioral/state.cpp) |
| [策略（Strategy）](03-behavioral-patterns.md#策略strategy) | TextProcessor 将列表格式委派给 HTML 或 Markdown 策略。 | [strategy.cpp](https://github.com/luckyJimLu/professional-cpp-learning/blob/main/patterns/examples/behavioral/strategy.cpp) |
| [模板方法（Template Method）](03-behavioral-patterns.md#模板方法template-method) | Game::run 固定游戏流程，子类实现开始、回合和结束条件。 | [template_method.cpp](https://github.com/luckyJimLu/professional-cpp-learning/blob/main/patterns/examples/behavioral/template_method.cpp) |
| [访问者（Visitor）](03-behavioral-patterns.md#访问者visitor) | 数值与加法表达式通过 accept 分派给求值访问者。 | [visitor.cpp](https://github.com/luckyJimLu/professional-cpp-learning/blob/main/patterns/examples/behavioral/visitor.cpp) |

### [补充模式与惯用法（Additional Patterns and Idioms）](04-cpp-techniques.md)

| 模式 | 书中案例 / 改写要点 | 独立源码 |
| --- | --- | --- |
| [静态工厂（Static Factory）](04-cpp-techniques.md#静态工厂static-factory) | Point::NewCartesian / NewPolar 用有意义的名称替代参数意义不同但签名相同的构造函数。 | [static_factory.cpp](https://github.com/luckyJimLu/professional-cpp-learning/blob/main/patterns/examples/cpp_extensions/static_factory.cpp) |
| [空对象（Null Object）](04-cpp-techniques.md#空对象null-object) | NullLogger 实现日志接口但不执行任何操作。 | [null_object.cpp](https://github.com/luckyJimLu/professional-cpp-learning/blob/main/patterns/examples/cpp_extensions/null_object.cpp) |
| [资源获取即初始化（Resource Acquisition Is Initialization）](04-cpp-techniques.md#资源获取即初始化resource-acquisition-is-initialization) | 书中 mutex_guard 的锁资源绑定对象生命周期；本例用标准 lock_guard 表达同一规则。 | [raii.cpp](https://github.com/luckyJimLu/professional-cpp-learning/blob/main/patterns/examples/cpp_extensions/raii.cpp) |
| [作用域守卫（Scope Guard）](04-cpp-techniques.md#作用域守卫scope-guard) | 插入后注册 undo，成功后 commit 取消回滚；以下改写为无复制的 C++17 守卫。 | [scope_guard.cpp](https://github.com/luckyJimLu/professional-cpp-learning/blob/main/patterns/examples/cpp_extensions/scope_guard.cpp) |
| [奇异递归模板模式（Curiously Recurring Template Pattern）](04-cpp-techniques.md#奇异递归模板模式curiously-recurring-template-pattern) | 基类以派生类为模板参数，把接口调用静态转发给派生实现；示例为教学改写。 | [crtp.cpp](https://github.com/luckyJimLu/professional-cpp-learning/blob/main/patterns/examples/cpp_extensions/crtp.cpp) |
| [策略类设计（Policy-Based Design）](04-cpp-techniques.md#策略类设计policy-based-design) | 以模板参数选择格式策略，保留书中的编译期策略思想。 | [policy.cpp](https://github.com/luckyJimLu/professional-cpp-learning/blob/main/patterns/examples/cpp_extensions/policy.cpp) |
| [类型擦除（Type Erasure）](04-cpp-techniques.md#类型擦除type-erasure) | 通过 Concept/Model 封装不需要继承统一基类的具体对象；形状示例为教学改写。 | [type_erasure.cpp](https://github.com/luckyJimLu/professional-cpp-learning/blob/main/patterns/examples/cpp_extensions/type_erasure.cpp) |
| [实现隐藏（Pointer to Implementation）](04-cpp-techniques.md#实现隐藏pointer-to-implementation) | Person 的实现成员放入 Person::Impl；以下以 unique_ptr 管理生命周期。 | [pimpl.cpp](https://github.com/luckyJimLu/professional-cpp-learning/blob/main/patterns/examples/cpp_extensions/pimpl.cpp) |
| [后台进度监控（Monitor）](04-cpp-techniques.md#后台进度监控monitor) | 书中后台线程定时读取原子进度并退出；本例缩短周期且不输出不确定时间序列。 | [monitor.cpp](https://github.com/luckyJimLu/professional-cpp-learning/blob/main/patterns/examples/cpp_extensions/monitor.cpp) |

### [装饰器模式：税费与折扣（Decorator Pattern: Tax and Discount）](05-decorator-pricing.md)

| 模式 | 书中案例 / 改写要点 | 独立源码 |
| --- | --- | --- |
| [装饰器变体：税费与折扣（Decorator: Tax and Discount）](05-decorator-pricing.md#装饰器变体税费与折扣decorator-tax-and-discount) | CppBook / ConferenceTicket 的价格修饰器；以下用整数分和固定折扣金额简化 Money，保留层层包装结构。 | [decorator_pricing.cpp](https://github.com/luckyJimLu/professional-cpp-learning/blob/main/patterns/examples/variants/decorator_pricing.cpp) |
