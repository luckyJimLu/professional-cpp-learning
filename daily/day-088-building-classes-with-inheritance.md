# Day 88 · Building Classes with Inheritance：从 Base Subobject 到真实的 Is-a 契约

> **主教材**：Marc Gregoire, *Professional C++, Sixth Edition*（C++23），Chapter 10 · Discovering Inheritance Techniques。  
> **辅教材**：Dmitri Nesteruk, *Design Patterns in Modern C++*；仓库 patterns/README.md、patterns/ownership-and-smart-pointers.md。  
> **本课边界**：先掌握继承扩展与 base / derived 的访问视角；今天不提前展开 virtual override、多态析构和多继承。  
> **预计用时**：60 分钟。

## ① 今日章节与建议阅读范围（约 8 分钟）

Chapter 9 已按仓库实际进度完成。今天进入 Chapter 10，严格从本章第一个主题开始：

- **Chapter 10 · Discovering Inheritance Techniques**，全章 pp.357–419。
- 今日小节：**Building Classes with Inheritance** → **Extending Classes**。
- 建议阅读：从本章开头读到 **A Client’s View of Inheritance** 与 **A Derived Class’s View of Inheritance**；建议范围约 pp.357–362。
- 阅读时重点标记：public inheritance 的含义、base subobject、派生类能访问什么、调用者通过 base view 能看到什么。
- **Preventing Inheritance**（用 final 明确关闭继承扩展）纳入今天阅读；**Overriding Member Functions** 留待后续课程，不在今天抢跑。

章节顺序可在 [O’Reilly 的 Chapter 10 目录](https://www.oreilly.com/library/view/professional-c-6th/9781394193172/c10.xhtml)核对；Wiley 将 Chapter 10 标为 pp.357–419。

**60 分钟安排**：阅读 8 分钟 → 昨日复习 5 分钟 → 机制与对照 18 分钟 → 设计映射和 Embedded 约束 14 分钟 → Lab / 修复练习 10 分钟 → 检查题 5 分钟。

## ② 昨日复习 3 问（约 5 分钟）

1. Day 87 的 PImpl 中，为什么 std::unique_ptr<Impl> 的析构通常要在 Impl 完整定义之后实现？
2. PImpl 隐藏的是对象表示与实现依赖；它是否自动让一个类成为 polymorphic interface？为什么？
3. 一个 AT Command Channel 需要使用 UART 的 Write()，是否意味着它应该 public inherit UartDriver？

**复习要点：**

- PImpl 是 implementation-hiding idiom，不等于 GoF Bridge，也不等于运行时多态。
- unique_ptr 说明谁拥有对象；引用成员说明谁借用依赖。
- “复用一段代码”不是 public inheritance 的充分理由；先判断 is-a 是否真实成立。

## ③ 核心概念：继承扩展、Base Subobject 与访问视角（约 10 分钟）

### 3.1 继承不是把两个对象拼在一起

~~~cpp
class Device {
 public:
  explicit Device(std::uint8_t id) noexcept : id_(id) {}
  std::uint8_t Id() const noexcept { return id_; }
 private:
  std::uint8_t id_;
};

class UartPort : public Device {
 public:
  explicit UartPort(std::uint8_t id) noexcept : Device(id) {}
 private:
  std::uint32_t baud_rate_{115'200U};
};
~~~

UartPort 对象中包含一个 Device base subobject，以及 UartPort 自己声明的成员。它们共同构成一个完整对象：

- base subobject 不是独立分配的另一个对象；
- 不需要因为继承就执行一次 new；
- 派生对象销毁时，先销毁派生部分，再销毁 base subobject；
- 构造顺序相反：先构造 base subobject，再构造派生成员。

因此，继承会影响对象布局与构造/析构顺序，但本身不等于 heap allocation，也不自动引入 virtual dispatch。

### 3.2 public / protected / private：两个不同的访问视角

先分清成员访问控制：

| 成员声明 | 普通调用者 | 派生类成员 |
|---|---|---|
| public | 可访问 | 可访问 |
| protected | 不可直接访问 | 可访问 |
| private | 不可访问 | 不可直接访问 |

**private base member 仍然存在于 base subobject 中，只是派生类不能直接访问它。** 需要读取或修改时，应通过 base 提供的 public / protected 操作，而不是把数据成员改成 protected。

再分清继承访问方式：

| 继承方式 | base 的 public 成员在 derived 中 | base 的 protected 成员在 derived 中 | 普通调用者能否隐式把 derived 转成 base |
|---|---|---|---|
| public | public | protected | 可以 |
| protected | protected | protected | 不可以 |
| private | private | private | 不可以 |

class Derived : Base 默认是 private inheritance；struct Derived : Base 默认是 public inheritance。工程代码不要依赖默认值，显式写出 public / private。

### 3.3 Client’s View 与 Derived Class’s View

调用者拿到 UartPort，可以使用它公开继承的 Device API，也可以使用 UartPort 自己的 API。

如果调用者把它绑定为 const Device&：

- 调用者只依赖 Device 的公开契约；
- UartPort::BaudRate() 不属于 Device 接口，因此不能通过这个 base view 调用；
- 没有 virtual function 时，base view 不会自动分派到派生类的同名函数。

这就是“可通过 base view 使用共同契约”与“运行时多态”之间的区别。今天只学习前者；virtual / override 会在后续小节单独展开。

### 3.4 Base constructor 与初始化顺序

~~~cpp
class Device {
 public:
  explicit Device(std::uint8_t id) noexcept : id_(id) {}
 private:
  std::uint8_t id_;
};

class UartPort : public Device {
 public:
  explicit UartPort(std::uint8_t id) noexcept
      : Device(id), baud_rate_(115'200U) {}
 private:
  std::uint32_t baud_rate_;
};
~~~

base 必须通过派生类的成员初始化列表初始化。不能等派生类构造函数体执行后再“补建” base subobject。真实顺序由声明关系决定，而不是初始化列表文本的任意排列。

### 3.5 final 与继承扩展边界

当一个 concrete leaf 没有受支持的二次扩展点，可以写成 class UartPort final : public Device。它表达“该具体类不再允许派生”，不是性能优化开关，也不代表整个系统禁止组合或替换实现。

今天先把 final 当作关闭继承扩展面的契约工具；不要为每个类机械添加它。是否开放继承，应由真实变化轴决定。

### 3.6 运行时与编译期成本

- 普通非 virtual 成员调用是静态绑定；调用目标由静态类型决定。
- 没有 virtual function 时，不需要因为继承自动增加 vptr，也没有 virtual dispatch。
- base subobject 会占据对象存储空间；实际布局、填充和基类偏移由 ABI / 编译器决定。
- public inheritance 还提供 derived-to-base 转换能力，这本身就是调用者可依赖的 API 承诺。
- 真正需要 runtime replacement 时，再评估 virtual interface；固定固件类型已知时，直接 composition 或 template / concept 可能更简单。

## ④ C 写法 vs Modern C++（约 8 分钟）

### 4.1 C：显式嵌入公共结构

~~~c
#include <stdbool.h>
#include <stdint.h>

struct device_common {
  uint8_t id;
  bool enabled;
};

struct uart_port {
  struct device_common common;
  uint32_t baud_rate;
};

void device_enable(struct device_common* device) {
  device->enabled = true;
}
~~~

C 通常通过结构体嵌入表达“公共字段 + 专用字段”。调用者显式访问 uart.common.id；若想把 uart_port* 当成 device_common*，必须明确传递成员地址，或遵循项目约定的布局规则。

### 4.2 Modern C++：public inheritance 表达 is-a

~~~cpp
class Device {
 public:
  explicit Device(std::uint8_t id) noexcept : id_(id) {}
  void Enable() noexcept { enabled_ = true; }
  std::uint8_t Id() const noexcept { return id_; }
  bool IsEnabled() const noexcept { return enabled_; }
 protected:
  ~Device() = default;
 private:
  std::uint8_t id_;
  bool enabled_{false};
};

class UartPort final : public Device {
 public:
  explicit UartPort(std::uint8_t id) noexcept : Device(id) {}
  std::uint32_t BaudRate() const noexcept { return baud_rate_; }
 private:
  std::uint32_t baud_rate_{115'200U};
};
~~~

| 维度 | C 结构体嵌入 | C++ public inheritance |
|---|---|---|
| 类型关系 | 通过成员表达组合；转换需要显式处理 | 语言提供 derived-to-base 转换 |
| 访问控制 | 依赖头文件暴露与约定 | public / protected / private 由编译器检查 |
| 资源管理 | 通常手动初始化与释放 | base subobject 随完整对象自动构造/销毁 |
| 可测试性 | 可通过函数表或结构体组合替换 | 可通过 base contract 复用共同 API；不自动等于 runtime mock |
| 扩展性 | 结构体字段与调用约定需协调 | 可以扩展成员和接口，但 public inheritance 会承诺 substitutability |
| 成本 | 布局直观，通常没有语言级动态分派 | 普通继承不自动分配堆或执行 virtual dispatch；对象布局仍需评估 |

**判断重点：** C++ 继承增加的是类型关系与访问规则，不是自动获得“可替换的运行时插件”。如果只是拥有一个 UART driver，C++ composition 通常比继承更准确。

## ⑤ 设计模式映射：Is-a、Composition 与模式克制（约 7 分钟）

今天不需要强行套入 GoF 模式。继承是语言机制；真正要决定的是关系是否稳定。

### 5.1 真实变化轴与稳定边界

- UartPort is-a Device：如果所有设备都具有稳定的设备 ID、启用状态和共同契约，public inheritance 可以表达真实 is-a。
- AtCommandChannel uses-a UartDriver：AT 协议通道不是 UART driver。它需要调用 driver 的能力，但不应该继承 driver 的全部 API。
- UartDriver 的 Reset / Configure / DMA 控制不应因为代码复用而暴露到 AT 协议调用者。

### 5.2 今天哪些 Pattern 不需要？

| 候选 | 今天是否需要 | 原因 |
|---|---|---|
| Strategy | 否 | 今天没有运行时可替换算法；先保持简单 |
| Template Method | 否 | 还没有需要基类固定流程 + virtual hook 的变化轴 |
| Factory | 否 | 对象创建没有多种产品族或运行时选择 |
| Adapter | 可能在后续 HAL 适配场景使用 | 只有旧 C API 与稳定 transport contract 不匹配时才建立 |
| Composition / Dependency Injection | **需要** | AT Channel 必需借用 UART 能力，但不应成为 UART 的子类型 |

### 5.3 Ownership / Borrow / Lifetime

- UartPort 完整对象拥有自己的 base subobject；不需要额外 unique_ptr<Device>。
- const Device& 是对完整 UartPort 的借用视图；引用不能超过 UartPort 的生命周期。
- AtCommandChannel 若持有 UartDriver&，它只是 borrower；composition root 必须先创建 driver，再创建 channel，销毁顺序相反。
- 不要为了 public inheritance 或 base reference 机械引入 shared_ptr。
- 今天没有异步 callback；如果后续把命令发送改为异步，必须另行定义消息 buffer owner、callback target lifetime、取消、unregister 与 in-flight drain。

**模式滥用信号：** 为了复用 Write() 而让协议层 public inherit driver；为了“可扩展”给每个 base 增加虚函数；为了让 base pointer 可存储而把唯一资源改成 shared_ptr。

## ⑥ Embedded / System Design：RTOS Driver 与 Modem Middleware（约 7 分钟）

### 6.1 适合继承的窄范围

一个设备抽象可以保存跨设备稳定且无硬件副作用的共同信息：

~~~text
Device
  ├── UartPort
  ├── SpiController
  └── I2cController
~~~

共同部分可以是 ID、静态能力描述或简单状态；具体 UART baud、SPI mode、I2C address 留在各自 concrete class。

但不要把厂商 HAL handle、DMA descriptor、RTOS semaphore 等平台资源塞进一个宽泛 base class，再让所有派生类都背负这些成员。

### 6.2 更常见的协议层关系是 composition

~~~text
ModemTask
   |
   v
AtCommandChannel
   |
   | borrows
   v
UartDriver
   |
   v
BSP / HAL / DMA
~~~

AT Channel 需要 UART 写入能力，但它不应继承 Reset、DMA 配置、时钟管理等所有底层操作。需要时通过一个小的 IByteWriter& / UartDriver& 显式注入。

### 6.3 RTOS 约束

- **构造阶段**：base constructor 只建立软件状态，不要在构造函数中启动 DMA、等待设备 ready 或获取无 timeout 的锁。
- **任务上下文**：真实 Configure / Reset / Send 应明确 task context 与 timeout；可失败操作返回项目统一 Status。
- **ISR**：不要从 ISR 调用可能阻塞、分配、获取普通 mutex 或执行复杂 virtual/plugin dispatch 的接口。
- **内存**：本课 Lab 不使用动态分配。真实设备对象优先静态存储或由 composition root 在初始化阶段创建。
- **WCET**：非 virtual 调用并不自动证明整个函数 WCET；仍需审查 HAL 调用、轮询、锁、DMA 提交与错误路径。
- **并发**：base 的 enabled_ 只是示例状态；真实跨任务共享状态必须明确单 owner task 或同步策略。volatile 不是线程同步。
- **析构**：Lab 的 Device 使用 protected non-virtual destructor，明确禁止通过 Device* 删除；若未来允许经 public base pointer / unique_ptr<Base> 销毁派生对象，必须改成 public virtual destructor，并设计有界 teardown。

### 6.4 硬件可替换与 host test

Device 的公共状态可以在 host test 中验证；真正的 UART / SPI 行为应留在独立 driver contract 后面。测试不需要构造真实寄存器，也不应该为了替换硬件而把整个应用层做成深层继承树。

## ⑦ 今日编码规范（MUST / SHOULD）

### MUST 1：public inheritance 必须表达真实 is-a

**错误写法：**

~~~cpp
class AtCommandChannel : public UartDriver {
 public:
  Status SendCommand(std::string_view command);
};
~~~

这会把 UartDriver 的 Reset / Configure / Write 等 public API 一起暴露给协议调用者，可能绕过 AT 状态机。

**推荐写法：**

~~~cpp
class AtCommandChannel {
 public:
  explicit AtCommandChannel(UartDriver& driver) noexcept
      : driver_(driver) {}
  Status SendCommand(std::string_view command) noexcept;
 private:
  UartDriver& driver_;  // borrow；driver 必须活得更久
};
~~~

### SHOULD 2：base state 保持 private，谨慎开放 protected

**错误写法：**

~~~cpp
class Device {
 protected:
  bool enabled_;
  std::uint32_t id_;
};
~~~

派生类可以任意破坏 base invariant；后续修改 base 表示也会影响派生类。

**推荐写法：**

~~~cpp
class Device {
 public:
  bool IsEnabled() const noexcept { return enabled_; }
 protected:
  void SetEnabledState(bool enabled) noexcept { enabled_ = enabled; }
 private:
  bool enabled_{false};
};
~~~

只有确实需要派生类参与的受控扩展点，才提供小型 protected operation；不要把可变数据布局当成继承 API。

### MUST 3：继承层级必须写清销毁策略

- 仅通过具体派生类型销毁、且不允许 base pointer delete：可以使用 protected non-virtual base destructor。
- 允许通过 public base pointer / std::unique_ptr<Base> 销毁：base destructor 必须 public virtual。
- final 用于明确关闭没有真实扩展需求的 concrete leaf；不要把它当成默认装饰。

## ⑧ 可编译 Lab / 练习（约 10 分钟）

所有可修改代码都在独立 .cpp 中，包含自己的 int main()；先运行观察，再重构。不要把两个文件一起编译成一个程序。

### 主 Lab：Base Subobject 与 Derived Extension

源码：[examples/day-088/main.cpp](../examples/day-088/main.cpp)

~~~bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic examples/day-088/main.cpp -o day88
./day88
~~~

预期观察：

~~~text
UART id=3 enabled=true
baud=921600
invalid baud rejected; current=921600
All inheritance extension checks passed
~~~

检查点：

1. UartPort 的 base subobject 由构造函数初始化列表建立。
2. PrintCommonInfo(const Device&) 只依赖 base contract。
3. BaudRate() 只能通过 UartPort view 使用。
4. 非法 baud rate 不会破坏既有有效状态。
5. Lab 不创建 heap object，也没有 virtual dispatch。

### Exercise 01：Code Review 修复“为了复用而继承”

源码：[examples/day-088/exercise-01.cpp](../examples/day-088/exercise-01.cpp)

~~~bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic examples/day-088/exercise-01.cpp -o day88-ex01
./day88-ex01
~~~

Starter 是**逻辑 / 设计违规但可编译运行**的版本。先观察：

- AT 命令已经处于 in-flight 状态；
- 调用者却能通过继承得到的 Reset() 绕过 AT Channel 的协议边界；
- reset 后下一条命令返回 not-ready。

请在本地副本重构：

1. 将 AtCommandChannel : public UartDriver 改成 composition。
2. 构造时注入 UartDriver&，明确它是 borrow；driver 必须比 channel 活得更久。
3. channel 只暴露协议层需要的操作，不要把 Reset / DMA / baud configuration 全部转发。
4. 如果协议确实允许 reset，增加 ResetWhenIdle() 这样的具名操作，在 busy 时返回 Status。
5. 不增加 shared_ptr 或动态分配；说明谁拥有 driver、谁拥有 channel，以及销毁顺序。
6. 增加 busy、not-ready、reset-after-complete 三条行为测试。

完成标准：重构后独立编译运行；低层 reset 不能绕过协议状态检查；解释 public inheritance 与 composition 的语义差异。

## ⑨ 三个常见坑

1. **把继承访问方式写成默认值**：class Derived : Base 默认是 private inheritance。需要 is-a 时明确写 public。
2. **把 protected 当作“给子类方便使用的 public”**：protected data 会让所有派生类依赖 base 的内部表示。优先 private data + 小型受控操作。
3. **把实现复用误判成 is-a**：AT Channel 使用 UART Driver，不是 UART Driver。public inheritance 会泄漏低层 API、放大变化面，并可能绕过状态机；composition 更准确。

## ⑩ 检查题

### 知识 / 代码检查

1. class UartPort : public Device 与 class UartPort : private Device 在普通调用者视角有什么差异？哪一种支持隐式 derived-to-base 转换？
2. Device 的 private 成员是否存在于 UartPort 对象中？为什么派生类不能直接访问它们？没有 virtual function 时，通过 Device& 调用 base 非 virtual 成员会发生什么？

### 设计题

某 Modem Middleware 中，AtCommandChannel 继承 UartDriver 以复用 Write / Reset；同时它维护 command-in-flight 状态。请决定应该保留 public inheritance、改成 composition，还是引入一个更小的 interface。

回答必须覆盖：

- 真实变化轴与稳定边界；
- public API 是否满足 is-a substitutability；
- driver 的 owner、channel 的 borrow 与 lifetime；
- reset / send 的 task context、timeout、错误传播；
- 是否有必要引入 virtual Strategy，或保持直接 composition；
- ISR、动态分配、锁与 WCET 的约束。

### 今日设计决策流程

需求变化 → 识别变化轴 → 检查 is-a 是否真实 → 确定 base contract → 选择 public inheritance 或 composition → 设计 owner / borrow / lifetime → 检查构造、析构、RTOS context 与 WCET → Code Review。

**核心结论：public inheritance 是对调用者作出的可替换性承诺，不是代码复用快捷键；先证明 is-a，再决定继承。**

## 参考

- Marc Gregoire, *Professional C++, Sixth Edition*, Chapter 10 · Discovering Inheritance Techniques，pp.357–419。
- [Wiley：Professional C++, 6th Edition](https://www.wiley.com/en-us/Professional%2BC%2B%2B%2C%2B6th%2BEdition-p-9781394193202)
- [O’Reilly：Chapter 10 · Discovering Inheritance Techniques](https://www.oreilly.com/library/view/professional-c-6th/9781394193172/c10.xhtml)
- 仓库扩展：[Design Patterns 工程化指南](../patterns/README.md) · [Ownership 与 Smart Pointers](../patterns/ownership-and-smart-pointers.md)
