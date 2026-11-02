# Day 68 · 对象如何被使用：存储期、this 与 C++23 显式对象参数

> **主教材**：Marc Gregoire，《Professional C++》，Sixth Edition，Chapter 8 · *Gaining Proficiency with Classes and Objects*。
>
> **今日范围**：pp.265–268：*Using Objects*、*Objects on the Stack*、*Objects on the Free Store*、*The this Pointer*、*Explicit Object Parameter*。严格停在 pp.268；下一节 *Understanding Object Life Cycles* 从 p.269 开始，留给下一课。
>
> **辅教材**：Dmitri Nesteruk，《Design Patterns in Modern C++》。今天只借用“先明确对象关系与生命周期，再谈协作结构”的工程视角；不为使用 GoF Pattern 而改变主教材顺序。

**学习目标**：能区分 class 与 object、自动存储期与动态存储期；能正确使用点/箭头运算符、this、*this；理解 C++23 explicit object parameter 的语法与真实适用边界；在 Embedded 系统中明确对象 owner、borrower 和异步回调 teardown。

**60 分钟安排**：阅读 8 分钟 → 昨日复习 5 分钟 → 核心概念与进阶选读 27 分钟 → C/C++ 对照 6 分钟 → 规范 4 分钟 → Lab/练习 7 分钟 → 常见坑与检查 3 分钟。

## ① 今日章节与建议阅读范围（8 分钟）

**Chapter 8，pp.265–268：**

1. *Using Objects*（p.265）
2. *Objects on the Stack*（p.266）
3. *Objects on the Free Store*（p.266）
4. *The this Pointer*（p.267）
5. *Explicit Object Parameter*（p.268，C++23）

建议阅读顺序：先读 pp.265–266，自己写出一个自动存储期对象和一个动态存储期对象；再读 pp.267–268，分别解释 this、*this 与 self 的区别。

**今天不要提前阅读 p.269 的 *Understanding Object Life Cycles* 和 *Object Creation*，也不要提前进入 constructors。** 今天只建立“对象放在哪里、如何访问当前对象”的概念，构造/析构的完整时序按教材顺序继续。

阅读时回答：

- class definition 是对象本身，还是创建对象的蓝图？
- Cell cell; 与 new Cell 的存储期、访问语法和 owner 有何不同？
- this 是 owner、borrow，还是普通数据成员？
- C++23 显式对象参数是否会改变调用点的写法？

## ② 昨日复习 3 问（5 分钟）

承接 Day 67 的 class、成员函数和对象不变量：

1. **概念**：class UartPort { ... }; 是否已经创建了一个 UartPort 对象？声明 UartPort uart; 又发生了什么？
2. **工程判断**：把 baud_rate_ 设为 private，为什么仍然需要 Configure() 校验输入？private 能否自动保证线程安全？
3. **代码细节**：std::uint32_t baud_rate_{115'200U}; 的作用是什么？如果没有成员初始化器，是否可以假设标量成员自动为 0？

复习检查点：class 是类型定义；对象是该类型的实例；访问控制用于保护普通 API 边界；默认成员初始化器让初始状态可见。private 不等于并发同步，也不等于资源所有权。

## ③ 核心概念：对象实例、存储期、成员访问与对象参数（27 分钟，含进阶选读）

### 1. class 是蓝图，object 才是实例

类定义描述对象具有什么状态和行为，本身不会因为定义完成就自动创建一个业务对象。每次声明变量或执行动态分配，才会产生对应对象实例。

~~~cpp
class Cell {
public:
    void SetValue(double value) noexcept { value_ = value; }
    [[nodiscard]] double GetValue() const noexcept { return value_; }

private:
    double value_{0.0};
};

Cell first_cell;   // 一个对象实例
Cell second_cell;  // 另一个独立对象实例
~~~

两个对象具有相同类型和相同成员布局，但各自拥有自己的 value_。修改 first_cell 不会修改 second_cell。

### 2. “Stack” 与 “Free Store”：先记标准语义

教材沿用常见术语 *stack* 与 *free store*。工程讨论中应进一步使用标准术语：

| 教材常用说法 | 更精确的 C++ 术语 | 常见创建方式 | 常见访问方式 |
|---|---|---|---|
| Stack object | automatic storage duration | Cell cell; | cell.SetValue(...) |
| Free-store object | dynamic storage duration | new Cell、std::make_unique<Cell>() | pointer->SetValue(...) |

“自动存储期对象通常放在调用栈上”是常见实现方式，不是 C++ 标准对物理内存布局的承诺。不要把 stack 这个教学简称误解成所有目标平台都必须使用某种硬件栈实现。

自动存储期对象的作用域结束时，其生命周期随之结束。动态存储期对象需要明确释放；如果直接使用 new，必须配对 delete。现代 C++ 通常把动态对象交给智能指针管理：

~~~cpp
Cell local_cell;                              // 对象本身是自动存储期
local_cell.SetValue(1.0);

std::unique_ptr<Cell> owned_cell = std::make_unique<Cell>();
owned_cell->SetValue(2.0);                    // unique_ptr 拥有动态对象
// owned_cell 离开作用域时，动态对象自动释放
~~~

这里有两个不同对象：owned_cell 这个 owner handle 本身是局部对象；它管理的 Cell 则具有动态存储期。unique_ptr 表达独占所有权，不意味着“任何对象都应该放到 heap”。

### 3. 点与箭头：访问对象与访问指针所指对象

- 对象表达式使用点运算符：cell.GetValue()。
- 指针表达式使用箭头运算符：cell_ptr->GetValue()。
- p->member 在语义上等价于 (*p).member；通常优先使用 ->，不要把手动解引用写成难读的形式。
- 解引用空指针或悬空指针仍然是错误；-> 不会替你检查生命周期。

### 4. 普通成员函数中的隐式 this

普通非静态成员函数调用时，会隐式获得一个指向当前对象的 this 指针。它让成员函数知道“本次操作针对哪个对象”。

~~~cpp
void Cell::SetValue(double value) noexcept {
    this->value_ = value;
}
~~~

由于仓库采用成员变量后缀 _，一般不会出现参数 value 与成员 value_ 的名字冲突，所以日常代码常写成 value_ = value;。this-> 在模板依赖名、显式强调当前对象或需要传递当前对象时仍有用途。

this 的关键语义：

- 它是**非拥有指针（borrow）**，不是 owner；
- *this 表示当前对象本身，可绑定到 Cell& 或 const Cell&；
- 它只在当前对象仍然存活时有效；
- 非静态成员函数有当前对象，静态成员函数没有隐式 this；
- 不要对 this 执行 delete，也不需要在正常成员函数中检查 this == nullptr。

把当前对象交给同步 helper 时，可以写 PrintCell(*this)。helper 若只在调用期间读取对象，应使用 const Cell&，且不得把引用保存到更长生命周期的异步工作中。

### 5. C++23 Explicit Object Parameter

C++23 允许把原本隐式的对象参数显式写在成员函数的第一个参数位置：

~~~cpp
void SetValue(this Cell& self, double value) noexcept {
    self.value_ = value;
}
~~~

调用点仍然是：

~~~cpp
Cell cell;
cell.SetValue(6.0);  // 不需要显式传 self
~~~

注意：

- this Cell& self 中的 this 是声明语法的一部分；self 是对象参数名，可以换成其他名称。
- 显式对象参数必须是第一个参数。
- 使用显式对象参数后，函数体中不再有隐式 this；访问当前对象要使用 self。
- 调用点与普通成员函数基本相同，调用者仍只传业务参数。
- 对简单 setter 来说，这种写法通常更冗长，没有直接收益。

它的价值主要出现在后续更高级的用法：统一 const/non-const 重载、ref-qualified member function、模板中推导对象 cv/ref 类型，以及递归 lambda。今天只掌握语法和边界，不提前展开模板章节。

**编译器支持**：GCC 14+ 或 Clang 18+ 已实现该特性，GCC 13 及更早版本没有。代码可用 `__cpp_explicit_this_parameter` 特性测试宏判断；本课 Lab 在旧编译器上会打印跳过原因，其余示例照常运行。

### 6. 编译期与运行期影响

| 机制 | 编译期 | 运行期 |
|---|---|---|
| class 与成员访问 | 检查类型、访问权限、调用签名 | 成员函数操作当前对象状态 |
| 点/箭头运算符 | 检查表达式类型是否匹配访问方式 | 对指针解引用并访问成员；悬空仍是错误 |
| automatic / dynamic storage | 编译器生成相应生命周期与分配/释放代码 | 对象占用存储，按其存储期规则开始/结束生命周期 |
| 隐式 this | 成员函数签名包含对象语义 | 调用时指向当前对象 |
| explicit object parameter | C++23 语法、重载与类型检查 | 本身不要求额外 heap 或虚分派；通常与普通对象参数调用机制相近 |

### 7. 设计模式映射：今天不使用 GoF Pattern（进阶选读）

#### 需求变化 → 变化轴 → 稳定边界

今天真正讨论的变化轴是**对象实例的存储期和 owner 生命周期**，不是算法变化、产品族变化或事件订阅变化。

稳定边界是：

- Cell 的公开操作负责维护自己的状态；
- 创建对象的上层负责决定其存储期；
- 借用者只能在 owner 保证的生命周期内访问对象；
- this 只是成员函数执行期间访问当前对象的借用别名。

#### Pattern 判断

- **不使用 Strategy**：今天没有需要运行时切换的算法。
- **不使用 Factory**：当前只有一种 Cell 类型；把 new 包装进 Factory 并不会自动解决 owner 问题。
- **不使用 Observer**：没有事件广播需求；如果未来把 this 注册为回调上下文，首先要解决 unregister/drain/lifetime，而不是先画 Observer 类图。
- **不使用 Adapter**：今天没有不兼容的第三方 API；真正包装 vendor C API 时再评估。
- **不增加 virtual hierarchy**：对象访问方式和存储期选择都不要求运行时多态。若未来有 UART/USB 运行时替换，再比较 runtime interface 与 template/concept 的成本。

今天采用的是 **Encapsulation + Value Semantics + RAII**。它们是设计原则和 C++ 技术，不是必须套用的 GoF 模式。

#### Ownership / borrow / lifetime

- Cell local_cell;：local_cell 是 owner，作用域决定其生命周期。
- std::unique_ptr<Cell>：unique_ptr 是唯一 owner；裸 Cell* 或 Cell& 若从它取得，只是 borrow。
- this：当前对象的非拥有别名；*this 是对当前对象的引用。
- 同步 helper 可以短暂借用 const Cell&；异步 callback 不得默认保存 this。

Pattern 的滥用表现：为了“面向对象”给单个固定对象增加 Factory、Service Locator、共享所有权和虚接口，却没有真实变化轴；结果是 owner 隐藏、初始化顺序复杂、运行时成本上升。

### 8. Embedded / System Design 场景：Modem Driver 的对象放置与回调边界（进阶选读）

以 RTOS Modem 系统为例：

~~~text
Application Composition Root
        │ owns (static / long-lived)
        ▼
    UartPort Driver
        ▲
        │ borrows by reference
        │
  ModemController / AT Parser
~~~

建议判断：

1. **长期硬件对象**：UART Driver 通常由 board/application composition root 持有，生命周期覆盖使用它的 Middleware；固定硬件不需要为了“统一管理”而动态 new。
2. **短期临时对象**：解析一条 AT 行的局部结果、短期状态快照，优先 automatic storage/value semantics；不要为几毫秒的局部工作制造 heap ownership。
3. **确需动态模块**：在启动/配置阶段创建，由单一 unique_ptr 或明确的静态 owner 管理；分配失败必须进入项目错误模型。若项目禁异常，不能把可能失败的 make_unique 当成实时路径无失败的保证。
4. **实时路径**：ISR、DMA completion 和高优先级任务不应执行无界分配、阻塞等待或复杂析构；固定容量和初始化期分配更容易审计 RAM 与 WCET。
5. **this 与 callback**：把 this 作为 void* context 注册给 HAL/RTOS callback 时，它仍然只是借用。必须保证 owner 活得足够久，并明确 callback 所在线程/中断上下文。
6. **teardown**：先停止 IRQ/event producer → unregister callback → drain/in-flight callback → 停止 worker/task → 最后销毁对象。不能先析构对象，再期待 callback 自己不再到来。
7. **线程安全**：this 和 private 都不提供同步。若 Driver 由多个 task 访问，应明确 single-owner task、消息队列或锁边界；不要在 ISR 中随意拿阻塞锁。

## ④ C 写法 vs Modern C++（6 分钟）

### C：对象指针和函数调用分离

~~~c
typedef struct {
    double value;
} cell_t;

void cell_set_value(cell_t* cell, double value)
{
    if (cell != NULL) {
        cell->value = value;
    }
}

int main(void)
{
    cell_t local_cell = {0.0};
    cell_set_value(&local_cell, 6.0);
    return 0;
}
~~~

C 的写法直接、适合 C ABI；但函数调用必须显式传入对象指针，非空约束、ownership 和生命周期依赖 API 约定。若用 malloc/free 创建动态对象，释放责任仍要由调用约定说明。

### Modern C++：对象行为属于类型，所有权可进入类型

~~~cpp
Cell local_cell;
local_cell.SetValue(6.0);

std::unique_ptr<Cell> owned_cell = std::make_unique<Cell>();
owned_cell->SetValue(3.7);
~~~

| 维度 | C struct + free function | Modern C++ class + RAII |
|---|---|---|
| 类型安全 | 可以做到，但指针空值和所有权常靠约定 | 引用、值、unique_ptr 分别表达不同语义 |
| 资源管理 | malloc/free 或 init/deinit 配对 | RAII 把释放责任绑定到 owner 生命周期 |
| 可测试性 | 测试函数与句柄约定 | 可直接测试对象 API；硬件实现仍应隔离 |
| 扩展性 | 可用函数表/opaque handle | 可按需组合值对象、借用接口和运行时对象 |
| 成本 | ABI 简单、显式 | 值对象无必然 heap/virtual 成本；动态对象才有分配成本 |

**结论**：Modern C++ 不是把所有 C 指针都换成 shared_ptr。先判断对象是否需要动态存储期，再表达 owner 与 borrow；固定生命周期对象优先直接作为值成员或局部对象。

## ⑤ 今日编码规范（4 分钟）

### MUST 1：固定生命周期对象优先 value/automatic storage；确需动态 owner 时用 RAII

错误写法：

~~~cpp
Cell* cell = new Cell{};
cell->SetValue(1.0);
// 很容易在多个 return/error path 漏掉 delete
~~~

推荐写法：

~~~cpp
Cell cell;
cell.SetValue(1.0);
~~~

若对象确实必须动态存在并转移独占所有权，使用 std::unique_ptr<Cell>；嵌入式无异常项目还必须定义分配失败策略，并把分配移出实时路径。

### MUST 2：把 this 当作 borrow，不得隐式延长对象生命周期

错误写法：把 this 存进一个可能晚于当前对象执行的 callback，却没有取消注册和 drain 保证。

推荐写法：只在同步调用期间使用 *this；异步使用时，明确 owner、callback registration token、取消/排空顺序和执行上下文。不要为了绕开生命周期设计而默认引入 shared_ptr。

### SHOULD 3：C++23 explicit object parameter 只在有实际表达收益时使用

错误写法：把所有普通成员函数机械改写为 this T& self，让简单 API 更冗长。

推荐写法：普通成员函数继续使用隐式 this；当后续模板/const-ref overload 需要统一实现时，再评估 this auto&& self 等 C++23 能力。成员变量沿用 snake_case_，减少名字遮蔽，不依赖 this-> 掩盖命名问题。

## ⑥ 可编译 Lab / 练习（7 分钟）

### 主 Lab：同一个类型的自动对象、动态对象、this 与显式对象参数

文件：[examples/day-068/main.cpp](../examples/day-068/main.cpp)

~~~bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic examples/day-068/main.cpp -o day068
./day068
~~~

程序包含完整 main()，并演示：

- 自动存储期对象通过点运算符调用成员函数；
- 普通成员函数通过 this 更新当前对象，并用 *this 同步借用给 helper；
- C++23 explicit object parameter 用 self 访问当前对象，调用点不变（需要 GCC 14+ 或 Clang 18+；旧编译器打印跳过原因）；
- std::unique_ptr 作为动态对象的唯一 owner，通过 -> 访问，reset() 后 owner 为空。

预期输出：

~~~text
automatic object:
cell value=6
explicit object parameter:
cell value=7.5
dynamic object owned by unique_ptr:
cell value=3.7
unique_ptr reset: empty
~~~

若编译器不支持该特性，`explicit object parameter:` 下一行会输出 `skipped: compiler lacks C++23 explicit object parameter (requires GCC 14+ or Clang 18+)`，其余输出相同。

注意：主 Lab 使用 make_unique 展示 RAII 语义，不代表真实硬实时收发路径应该动态分配。

### Exercise 01：Code Review——隐藏的 raw-pointer ownership

文件：[examples/day-068/exercise-01.cpp](../examples/day-068/exercise-01.cpp)

~~~bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic examples/day-068/exercise-01.cpp -o day068-ex01
./day068-ex01
~~~

Starter 是**设计违规但可独立编译运行**的完整程序：CreateReading() 用 new (std::nothrow) 创建对象，却通过裸指针返回一个隐式 ownership transfer；调用者必须记住 delete。

先运行，再完成重构：

1. 判断 CreateReading() 返回的是 borrow 还是 owner；当前签名能否让调用者从类型上看出来？
2. 首选把 CreateReading() 改成按值返回 Reading，让 main() 直接持有局部对象；说明为什么返回值不等于“必然发生昂贵复制”。
3. 如果需求真的要求动态生命周期，再改成返回 std::unique_ptr<Reading>；在无异常工程中显式处理分配失败。
4. 不要用 shared_ptr，除非业务确实存在多个共同 owner；也不要为了一个局部值对象引入 Factory/Service Locator。
5. 保持每个 .cpp 独立，不能把 exercise 的 main() 合并进主 Lab。

**Code Review 验收**：owner 必须从 API 类型或明确契约中看得出来；所有路径都能安全释放；动态分配不得进入硬实时路径。

## ⑦ 3 个常见坑（2 分钟）

1. **把 stack/free store 当作硬件内存布局承诺**：标准层面应区分 automatic 与 dynamic storage duration；具体物理布局由实现与目标 ABI 决定。
2. **把 this 当成 owner**：this 不拥有对象，*this 也不会延长生命周期。把它传给同步 helper 通常没问题；保存到异步 callback 则必须证明 owner 生命周期和 teardown。
3. **为了使用 C++23 新语法而改写一切**：简单 setter 使用 explicit object parameter 只会增加冗余。它的价值在后续模板/ref-qualified member function 等场景；今天应理解，不应滥用。

## ⑧ 检查题（1 分钟）

### 知识 / 代码检查

1. Cell cell; 与 auto cell = std::make_unique<Cell>(); 分别创建了什么对象？哪个对象是 owner handle，哪个对象具有动态存储期？两者的成员访问语法分别是什么？
2. void SetValue(this Cell& self, double value) 的 self 与普通成员函数中的 this 有什么关系？为什么函数体内不能再依赖隐式 this？

### 设计题

一个 Modem Middleware 在系统启动时创建 UART Driver；AT Parser 和 Diagnostic Service 都需要调用它；UART DMA completion 通过 callback 回到 Driver。请判断保持简单、使用 composition，还是引入 Strategy/Adapter/Observer，并回答：

- UART Driver 的唯一 owner 是谁？两个服务是 owner 还是 borrow？
- Driver 应采用 static/value lifetime 还是动态分配？为什么？
- callback 中若传递 this，怎样防止 dangling callback？teardown 顺序是什么？
- callback 运行在 ISR、Driver task 还是普通 worker 时，设计约束有何不同？
- 哪些操作必须有界，哪些分配可以只发生在初始化阶段？

**自检标准**：答案必须画清 owner/borrow/lifetime，指出 this 不拥有对象，说明 callback unregister + drain，并比较固定组合与运行时多态的成本；不能只罗列 Pattern 名称。

---

## 今日结论

**对象的存储期由创建方式与 owner 决定，成员函数通过隐式 this 或 C++23 explicit object parameter 访问当前对象；两者都不替你管理生命周期。固定对象优先值语义，动态对象优先 RAII，this 始终按 borrow 审查。**

下一课严格沿 Chapter 8 顺序进入 p.269：*Understanding Object Life Cycles* 与 *Object Creation*，再继续 constructors。
