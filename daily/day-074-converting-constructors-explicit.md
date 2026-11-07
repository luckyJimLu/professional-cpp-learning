# Day 74 · Converting Constructors and Explicit Constructors：让隐式转换成为有意设计

> **日期**：2026-11-07  
> **主教材**：Marc Gregoire, *Professional C++, Sixth Edition*（C++23），Chapter 8 · *Gaining Proficiency with Classes and Objects*。  
> **今日阅读**：p.284，*Converting Constructors and Explicit Constructors*。只学习本小节，不提前跳章。  
> **辅教材**：Dmitri Nesteruk, *Design Patterns in Modern C++*。扩展聚焦 value object、显式边界与必要时的 Adapter，不引入无关 GoF 层次。  
> **前置课程**：[Day 72 · Initializer-List Constructors](day-072-initializer-list-constructors.md)、[Day 73 · Delegating Constructors](day-073-delegating-constructors.md)。

**今天只解决一个问题：当构造函数允许把整数隐式转换成业务类型时，这种便利是否真的符合 API 语义？**

**学习目标**：识别 converting constructor；区分四种初始化语法；正确使用 `explicit` 与 C++20 `explicit(bool)`；用 type traits 检查转换契约；在 Modem/RTOS API 中用强类型区分单位；理解 `explicit` 不等于运行期输入校验。

**60 分钟安排**：阅读 7 分钟 → 复习 4 分钟 → 概念 15 分钟 → C/C++ 对照 5 分钟 → 设计映射 6 分钟 → Embedded 7 分钟 → 规范 5 分钟 → Lab/练习 8 分钟 → 常见坑 2 分钟 → 检查题 1 分钟。

---

## ① 今日章节与建议阅读范围（7 分钟）

**Chapter 8，p.284：Converting Constructors and Explicit Constructors。** 阅读重点：

1. 非 `explicit` 构造函数如何提供从参数类型到类类型的隐式转换；
2. 单参数构造函数，以及其他参数均有默认值、可由一个实参调用的构造函数；
3. direct-init、copy-init、direct-list-init、copy-list-init 的区别；
4. `explicit` 如何阻止构造函数参与隐式转换；
5. 函数参数、返回值和赋值表达式中的用户定义转换。

C++20 `explicit(bool)` 作为 C++23 语言补充简要介绍；conversion operator 等其他转换机制不作为今天的主线。

阅读时持续追问：`ConfigureTimeout(500U)` 为什么能通过编译？调用者表达的是 500 毫秒、500 个 tick，还是 500 次重试？

## ② 昨日复习 3 问（4 分钟）

承接 Day 73：

1. **核心机制**：`UartConfig() : UartConfig(115200U) {}` 中，哪个构造函数真正初始化成员？目标构造函数体与委托构造函数体谁先执行？
2. **工程判断**：为什么 UART open、DMA start、RTOS task 创建和 callback 注册不应隐藏在 canonical constructor 中？哪些动作应放入显式 `Start(timeout)`？
3. **代码细节**：为什么 `UartConfig() { UartConfig(115200U); }` 不是委托构造？它实际创建了什么对象？

复习要点：委托写在 mem-initializer 中；目标构造函数负责 base/member 初始化；构造只建立有效对象，不隐式执行可能失败的硬件启动。

## ③ 核心概念：Converting Constructor 与 `explicit`（15 分钟）

### 1. 隐式转换从哪里发生

没有声明为 `explicit`、并且可以用一个实参调用的构造函数，可以提供从实参类型到类类型的隐式转换。常见情况是单参数构造函数；如果其余参数都有默认值，也可能形成相同入口。

```cpp
class LegacyTimeout {
public:
    LegacyTimeout(std::uint32_t milliseconds) noexcept;
};

void ConfigureTimeout(LegacyTimeout timeout);
ConfigureTimeout(500U); // 先隐式构造 LegacyTimeout，再调用函数
```

调用点只看到整数，用户定义转换却隐藏在重载决议中。若 `500` 的单位不明确，这种便利会变成 API 风险。

### 2. `explicit` 不禁止构造，只禁止意外隐式转换

```cpp
class Milliseconds {
public:
    explicit constexpr Milliseconds(std::uint32_t value) noexcept
        : value_{value} {}
    [[nodiscard]] constexpr std::uint32_t Count() const noexcept { return value_; }
private:
    std::uint32_t value_;
};

void ConfigureTimeout(Milliseconds timeout);
ConfigureTimeout(Milliseconds{500U}); // OK，调用者显式表达类型
// ConfigureTimeout(500U);             // 错误：不允许隐式转换
```

`explicit` constructor 仍可用于 direct-initialization 和 direct-list-initialization。它控制的是转换是否能在调用点被省略。

### 3. 四种初始化形式

| 形式 | 示例 | explicit constructor |
|---|---|---|
| Direct-init | `Milliseconds a(500U);` | 可以使用 |
| Direct-list-init | `Milliseconds a{500U};` | 可以使用 |
| Copy-init | `Milliseconds a = 500U;` | 不能靠 explicit 构造函数完成隐式转换 |
| Copy-list-init | `Milliseconds a = {500U};` | 若选中 explicit 构造函数，程序不合法 |

函数实参 `ConfigureTimeout(500U)` 需要隐式转换；`ConfigureTimeout(Milliseconds{500U})` 则显式构造目标类型。不要把 `()`、`{}`、`= value` 和 `= {value}` 当成等价语法。

### 4. 用 type traits 把契约变成编译期检查

```cpp
#include <cstdint>
#include <type_traits>

static_assert(std::is_constructible_v<Milliseconds, std::uint32_t>);
static_assert(!std::is_convertible_v<std::uint32_t, Milliseconds>);
```

`is_constructible` 检查直接构造是否可行；`is_convertible` 检查是否存在隐式转换。两者一起表达“允许显式构造，但不允许隐式转换”。

### 5. C++20 conditional explicit

`explicit(bool)` 的布尔条件必须是编译期常量：`true` 表示 explicit，`false` 表示允许隐式转换。泛型包装器可以跟随底层类型的转换策略：

```cpp
#include <type_traits>
#include <utility>

template <typename T>
class Value {
public:
    template <typename U>
        requires std::is_constructible_v<T, U>
    explicit(!std::is_convertible_v<U, T>)
    Value(U&& value) : value_{std::forward<U>(value)} {}
private:
    T value_;
};
```

这类写法适合需要传播底层类型语义的泛型库；普通业务类型通常直接写 `explicit` 更清楚，不要为了炫技引入复杂模板。

### 6. `explicit` 不等于运行期校验

`explicit Milliseconds(std::uint32_t)` 仍然允许 `Milliseconds{0U}` 和业务上可能不合法的最大值。它只控制隐式转换，不验证范围、单位来源或设备状态。

外部 UART/IPC/网络输入必须在 trust boundary 检查范围与上限；可恢复错误通过 `Status` / `std::expected` 返回。若值非法时对象不应存在，可用私有构造 + `TryCreate(...)`；不要用异常、静默截断或半有效对象表达可恢复失败。

### 7. 编译期与运行期影响

- `explicit` 与 overload resolution 在编译期完成，不增加运行期分支或动态分配。
- 小型强类型通常只是一个标量成员；实际布局/ABI 仍应在目标平台验证。
- `Milliseconds{500U}` 不会自动转换成 RTOS tick；平台 Adapter 负责舍入、溢出检查和单位转换。
- 类型安全与输入校验是两道不同的门。

## ④ C 写法 vs Modern C++（5 分钟）

### C：相同整数类型无法阻止参数写反

```c
#include <stdint.h>
#include <stdio.h>

void modem_configure(uint32_t timeout_ms, uint32_t retry_count)
{
    printf("timeout_ms=%u retry_count=%u\n",
           (unsigned int)timeout_ms, (unsigned int)retry_count);
}

int main(void)
{
    modem_configure(3U, 500U); /* 参数顺序写反仍能编译 */
    return 0;
}
```

C 可以用独立 `struct` 包装出名义类型；但 `typedef uint32_t milliseconds_t` 与 `retry_count_t` 通常仍是同一基础类型，不能阻止误换。

### Modern C++：用类型表达语义

```cpp
#include <cstdint>

class Milliseconds {
public:
    explicit constexpr Milliseconds(std::uint32_t value) noexcept : value_{value} {}
private:
    std::uint32_t value_;
};
class RetryCount {
public:
    explicit constexpr RetryCount(std::uint32_t value) noexcept : value_{value} {}
private:
    std::uint32_t value_;
};
void ModemConfigure(Milliseconds timeout, RetryCount retries);
ModemConfigure(Milliseconds{500U}, RetryCount{3U});
```

| 维度 | C / 同基础类型参数 | Modern C++ 强类型 |
|---|---|---|
| 类型安全 | 参数写反仍可能编译 | 不同语义由不同类型表达 |
| 资源管理 | 标量简单，约定较多 | 值成员自动管理，无额外 owner |
| 可测试性 | 重点测参数顺序/单位 | 编译期拒绝错误组合，运行期仍测范围 |
| 扩展性 | 易继续堆整数参数 | 可组合单位类型与 Config |
| 成本 | 调用短、语义依赖命名 | 调用更显式，通常无运行期成本 |

## ⑤ 设计模式映射：Value Object + 显式 Adapter 边界（6 分钟）

**变化轴**：数值背后的语义不同（毫秒、tick、字节、重试次数、baud rate）。**稳定边界**：API 参数类型和单位契约。

- **优先 Value Object / Strong Type**：`Milliseconds`、`RetryCount` 是小型值类型，拥有自己的整数，复制成本低。
- **不需要 Strategy**：没有运行期可替换算法；转换策略是编译期 API 契约。
- **不需要 Builder / Factory Method**：单个标量包装不需要创建层次。可能失败的输入校验可以用 `TryCreate`，不等于必须引入 GoF Factory。
- **必要时使用 Adapter**：底层 C HAL 仍接收 `uint32_t timeout_ms`，由单一 `UartAdapter` 将强类型转换为平台参数；不要让业务层到处 `.Count()` 或换算 tick。
- **Composition**：`ModemConfig` 组合 `Milliseconds`、`RetryCount`、`BaudRate`，不需要继承。

**Ownership / Borrow / Lifetime**：这些类型按值拥有标量，不借用外部 buffer；同步参数按值传递，RTOS event payload 也可按值复制。异步 callback 若需要配置，优先按值捕获小型不可变值，不要为一个整数延长整个 Modem 对象生命周期。若 Adapter 保存 `IUart&`，它是 borrow，composition root 必须保证被借用对象活得更久。不要使用 `shared_ptr<Milliseconds>` 或全局可变配置。

```text
识别数值语义 → 定义强类型稳定边界 → 选择 explicit/value object
      → 只有 HAL 差异真实存在时才用 Adapter
      → 设计 owner/borrow/lifetime → 检查范围、单位换算与 WCET
```

## ⑥ Embedded / System Design：Modem Timeout 与 RTOS Tick（7 分钟）

Modem 命令至少包含 response timeout（毫秒）、retry count（次数）、DMA completion timeout（毫秒）和 RTOS wait timeout（tick）。它们可能都是 `uint32_t`，却不是同一种量。

```text
Modem Application
  ModemConfigure(Milliseconds{500}, RetryCount{3})
                 ↓
        Modem / UART Adapter
        - validate upper bound
        - ms -> RTOS ticks
        - rounding / overflow check
                 ↓
              RTOS / HAL
```

工程约束：

- **单位与舍入**：毫秒转 tick 要定义向上/向下取整；超时语义通常不能因截断而提前结束。检查乘加溢出和 RTOS 最大等待值。
- **内存**：强类型是内嵌标量，不分配堆内存；不要为一个整数引入 `shared_ptr` 或动态配置树。
- **CPU/WCET**：构造/复制为常数成本；tick 换算使用有界整数运算，并在目标 MCU 实测。
- **线程/IRQ**：阻塞 wait 只能在允许的任务上下文调用；ISR 不得调用阻塞 API。
- **错误**：invalid range、tick overflow、busy、transport timeout 应可区分。
- **测试**：覆盖 0、1 ms、低于一个 tick、最大值、最大值 + 1、溢出。
- **硬件替换**：业务层只依赖 `Milliseconds`；FreeRTOS/Zephyr/Linux Adapter 各自实现平台换算。
- **Callback**：异步命令按值保存 timeout；仍须定义 callback owner、cancel/unregister、in-flight drain 与 teardown。

## ⑦ 今日编码规范（5 分钟）

### MUST 1：单参数构造函数默认 `explicit`

错误：

```cpp
class Milliseconds {
public:
    Milliseconds(std::uint32_t value) noexcept : value_{value} {}
private:
    std::uint32_t value_;
};
void SetTimeout(Milliseconds timeout);
SetTimeout(500U); // 隐式转换，调用点没有表达单位
```

推荐：

```cpp
class Milliseconds {
public:
    explicit constexpr Milliseconds(std::uint32_t value) noexcept
        : value_{value} {}
private:
    std::uint32_t value_;
};
SetTimeout(Milliseconds{500U});
```

只有隐式转换本身就是 API 目标、语义无歧义且不会引入危险重载时才例外；“少写几个字符”不是理由。

### MUST 2：不同单位 / 领域语义必须使用不同类型

错误：`void ModemConfigure(std::uint32_t timeout, std::uint32_t retries);`，调用时可能把顺序写反。推荐 `ModemConfigure(Milliseconds{500U}, RetryCount{3U});`。不要只用 `using` alias 给同一整数换名字，就认为类型已区分。

### SHOULD 3：conditional explicit 仅用于泛型转换策略；范围校验另行设计

普通业务类型直接 `explicit`。只有模板包装器确需跟随底层转换语义时才用 `explicit(bool)`，并以 `requires` 限制构造条件。外部输入范围通过独立校验和 Status / expected 错误模型处理。

## ⑧ 可编译 Lab / 练习（8 分钟）

所有文件均为独立编译单元，各自包含 `int main()`；必须分别编译。

### 主 Lab：观察 implicit conversion 与 explicit 的差别

源码：[examples/day-074/main.cpp](../examples/day-074/main.cpp)

```bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic examples/day-074/main.cpp -o day074
./day074
```

程序对比 `LegacyTimeout` 的隐式转换与 `Milliseconds` 的显式构造，并用 `is_constructible` / `is_convertible` 验证契约。预期输出：

```text
legacy implicit conversion: 500 ms
typed timeout: 750 ms
typed timeout: 250 ms
implicit conversion allowed for Milliseconds: false
```

源码中注释了三个故意不合法的表达式。可以逐个取消注释，观察 copy-init、copy-list-init 和函数实参中的隐式转换被拒绝；验证后重新注释，保持 Lab 可编译。

### Exercise 01：修复 Modem 参数的隐式转换边界

源码：[examples/day-074/exercise-01.cpp](../examples/day-074/exercise-01.cpp)

```bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic examples/day-074/exercise-01.cpp -o day074-ex01
./day074-ex01
```

Starter 完整可运行，包含 `int main()`。`Milliseconds` 和 `RetryCount` 故意使用非 explicit 构造函数，两个裸整数调用都能编译。预期输出：

```text
command timeout=500 ms
retry count=3
Both raw integer calls compiled; review whether that is desirable.
```

**修复任务**：

1. 先运行 starter，解释两个裸整数为何通过编译。
2. 将两个单参数构造函数改为 `explicit constexpr`。
3. 把调用点改成 `Milliseconds{500U}` 与 `RetryCount{3U}`。
4. 加入 `<type_traits>` 和 `static_assert`：两种类型都能从 `uint32_t` 直接构造，但不能从 `uint32_t` 隐式转换。
5. 保留 `int main()`、输出和独立编译；不引入 `shared_ptr`、Factory 层次或全局可变状态。

## ⑨ 3 个常见坑（2 分钟）

1. **默认单参数构造函数可隐式转换**：函数参数、返回值、赋值表达式可能悄悄发生用户定义转换，整数单位尤其危险。
2. **误解 explicit 的覆盖范围**：direct-init/direct-list-init 可用；copy-list-init 若选中 explicit 构造函数则不合法。四种初始化语法不能混为一谈。
3. **把 explicit 当作范围校验或 Pattern**：它不验证 0、最大值、tick overflow，也不解决 callback lifetime；输入验证、owner/lifetime 和实时约束仍需分别设计。

## ⑩ 检查题（1 分钟）

### Q1 · 知识检查

`Milliseconds(std::uint32_t)` 非 explicit 时，为什么 `SetTimeout(500U)` 可能编译？改成 explicit 后，`Milliseconds timeout{500U};` 还能否编译？

### Q2 · 代码检查

对 explicit 构造函数，分别判断并解释：

```cpp
Milliseconds a{500U};
Milliseconds b = 500U;
Milliseconds c = {500U};
SetTimeout(500U);
SetTimeout(Milliseconds{500U});
```

### Q3 · Design Review：Modem API 的单位边界

现有 API：

```cpp
void ModemConfigure(std::uint32_t timeout,
                    std::uint32_t retries,
                    std::uint32_t baud_rate);
```

请判断只改参数名、使用 alias、创建强类型 value object，还是在 HAL 边界增加 Adapter。说明变化轴、稳定接口、explicit 选择、owner/borrow/lifetime、tick 舍入与溢出、timeout、ISR/任务上下文、动态分配/锁/WCET，以及为什么不需要 Strategy / Builder / shared_ptr。

**自检原则**：先识别数值语义，再建立稳定类型边界；先设计 lifetime，再选择 pointer；`explicit` 阻止意外隐式转换，运行期校验拒绝非法值；Pattern 是工具不是目标。

---

## 下一课

**Day 75 · Chapter 8 · 继续原书 p.284 之后的下一小节。** 下一次生成前仍须根据教材目录核验具体标题，不预先跳到 Chapter 9。

## 参考资料

- [Day 73 · Delegating Constructors](day-073-delegating-constructors.md)
- [C++ draft · Converting constructors](https://eel.is/c++draft/class.conv.ctor)
- [C++ draft · explicit specifier](https://eel.is/c++draft/dcl.fct.spec)
- [cppreference · Converting constructor](https://en.cppreference.com/w/cpp/language/converting_constructor)
- [Wiley · Professional C++, Sixth Edition](https://www.wiley.com/en-us/shop/general-introductory-computer-science/professional-c-6th-edition-p-9781394193172)
