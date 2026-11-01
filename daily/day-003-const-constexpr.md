# Day 03 · const、constexpr 与编译期思维

<!-- cpp-standards:start -->

## 本课涉及的 C++ 标准

以下按正文与配套 `.cpp` 示例中出现的特性标注首次标准化版本，不代表整份程序的最低编译版本。仓库主 Lab 统一使用 C++23。

| 特性                     | 首次标准化 | 版本边界                                                                                     |
| ------------------------ | ---------- | -------------------------------------------------------------------------------------------- |
| 列表初始化               | **C++11**  | 包括直接列表初始化；窄化检查及 initializer_list 优先规则须单独注意。                         |
| `constexpr`              | **C++11**  | C++14 放宽函数体限制；C++20 继续扩展可用于常量求值的操作。声明不保证每次调用都在编译期执行。 |
| `static_assert`          | **C++11**  | 省略诊断字符串的单参数形式从 C++17 起可用。                                                  |
| `nullptr`                | **C++11**  | 空指针字面量；不要与整数 0 的类型混为一谈。                                                  |
| `auto` 类型推导          | **C++11**  | C++14 才支持普通函数返回类型推导；C++20 才支持 `auto` 形参的简写函数模板。                   |
| `<cstdint>` 固定宽度整数 | **C++11**  | 精确宽度类型仅在实现提供对应整数类型时存在。                                                 |
| `std::array`             | **C++11**  | 固定大小容器。                                                                               |

版本差异、旧机制与工具链检查见 [C++ 标准来源速查](../docs/cpp-feature-standards.md)。

<!-- cpp-standards:end -->

**Chapter 1 · const、constexpr 与编译期思维
今日目标：把“这个值不会变”升级为由类型系统和编译器验证的约束，并逐步消除嵌入式代码中的 magic number。

## ① 今日阅读范围 · 5 分钟

### 新手起步：先知道今天在解决什么

先用 `const` 表达不允许通过当前对象修改，再用 `constexpr` 表达可参与常量表达式的声明。不要把“我知道值是多少”当成编译器一定能在常量表达式中使用它。

这段话精准地切中了 C++ 中“只读访问语义”（`const`）**与**“编译期求值语义”（`constexpr`）的本质区别。我们可以结合具体的代码场景，把这三个层次拆解清楚：

**1. `const` 的本质：只保证“不能通过当前对象/绑定去修改”**
`const` 的核心是向编译器立下“不通过当前标识符修改目标”的契约，但它并不总能保证底层数据绝对不变，也不代表它在编译期已知：

- **对引用和指针的只读限制**：例如声明 `int z; const int& zRef { z };`，`const` 仅阻止你通过 `zRef` 去给变量赋值（如 `zRef = 4;` 会编译报错），但对 `z` 本身没有任何限制，你依然可以直接修改 `z` 的值。

- **对成员函数的只读契约**：在成员函数后加上 `const`（如 `double getValue() const;`），相当于在函数内部把所有数据成员都视为 `const` 引用，保证调用该函数不会修改对象的状态。

- **值语义 vs 引用语义的差异**：对于 `std::vector` 这类具有值语义的容器，声明为 `const` 会使容器本身及内部所有元素都不可修改；但对于 `std::span` 或指针（如 `int* const ptr`）这类具有引用语义的类型，顶层 `const` 仅锁死指针/视图本身的指向，你依然可以通过它修改所指向的元素（除非声明为 `std::span<int const> const` 或 `int const* const`）。

**2. `constexpr` 的本质：声明“可参与编译期常量表达式”**
在定义原生数组大小（如 `int myArray[Size];`）、模板概念约束（Concept）或 `static_assert` 等场景下，C++ 强制要求使用在编译期就能算出结果的**常量表达式（Constant Expression）**。`constexpr` 就是专门用来赋予变量、函数或类“参与常量表达式资格”的关键字：

- **修饰函数**：允许函数在常量表达式中被调用（如 `constexpr int getArraySize() { return 32; }`）。为了能让编译器在编译期求值，该函数不能有副作用，也不能让异常逃逸出函数体外。

- **修饰类与对象**：通过定义 `constexpr` 构造函数和 `constexpr` 成员函数（如 `Matrix` 类的 `constexpr unsigned getSize() const`），可以创建 `constexpr Matrix matrix { 8, 2 };` 对象，并直接用 `int linearizedMatrix[matrix.getSize()];` 来定义数组大小。

- **修饰类内静态常量**：类的专属常量推荐使用 `static constexpr`（如 `static constexpr std::size_t MaxWidth { 100 };`），不仅不可修改，还能直接作为编译期常量使用。

**3. 为什么“我知道值是多少”不等于“编译器能在常量表达式中使用它”？**
程序员肉眼看到一个确定的值，或者给它加上了 `const`，并不意味着编译器在语法规则上允许它进入常量表达式：

- **典型误区一：返回固定值的 `const` 函数**
  看下面这段代码：

  ```c++
  const int getArraySize() { return 32; }
  
  int main() {
      int myArray[getArraySize()]; // 编译错误！
  }
  ```

  虽然我们肉眼清楚地知道 `getArraySize()` 永远返回 `32`，而且返回类型还标了 `const`，但在编译器眼里，它依然是一个只能在运行期调用的普通函数，不能作为常量表达式来指定数组长度。必须将其声明为 `constexpr int getArraySize()`，编译器才被允许在编译期对它求值。

- **典型误区二：由运行期分支决定的 `const` 变量**
  即便一个函数被标记为 `constexpr`，它也只是“有能力”在编译期求值，而不保证每次调用都在编译期完成。例如：

  ```c++
  void log(string_view message) { print("{}", message); } // 非 constexpr 函数
  
  constexpr int computeSomething(bool someFlag) {
      if (someFlag) {
          log("someFlag is true"); // 触发了非 constexpr 调用
          return 42;
      } else {
          return 84;
      }
  }
  ```

  当传入 `false` 时，没有触发 `log()`，可以写成 `constexpr auto value1 { computeSomething(false) };` 参与常量表达式。但当传入 `true` 时，虽然你也明确知道它的返回值必然是 `42`，但由于执行路径经过了非 `constexpr` 的 `log()` 函数，此时写 `constexpr auto value2 { computeSomething(true) };` 会直接编译失败！你只能退而求其次写成 `const auto value3 { computeSomething(true) };`——此时 `value3` 虽是只读的 `const` 变量且值固定为 `42`，但它的求值发生在运行期，绝不能放进常量表达式中使用。

- **进阶补充（强制编译期求值 `consteval`）**：如果你希望彻底杜绝上述“退化到运行期求值”的情况，强制要求每次调用都必须在编译期完成，则可以使用 `consteval` 将函数声明为立即函数（Immediate Function）。一旦传入运行期变量（如 `double dynamic_inch { 8.0 };`），编译器会立即报错。
4. `constexpr` 和 `consteval` 的核心差异在于：`constexpr` 表示函数或类**可以**在编译期求值（但也允许在运行期执行），而 `consteval` 则将该实体变为“立即函数”（immediate function），**强制保证**必须在编译期求值。以下是它们在类、构造函数以及 `if consteval` 中的具体用法与区别：

**1. 修饰类与构造函数（`constexpr` vs `consteval` Classes）**
通过定义 `constexpr` 或 `consteval` 构造函数，你可以创建用户自定义类型的常量表达式（constant-expression）变量。

- **`constexpr` 类与构造函数（兼顾编译期与运行期）**：
  只要类的构造函数和成员函数被标记为 `constexpr`，该类就可以在编译期构造对象并调用成员函数参与常量表达式（例如用来指定数组长度），同时它依然保留在运行期创建普通对象的能力。

  C++

  ```
  class Matrix {
      public:
          Matrix() = default; // 编译器生成的默认成员函数隐式为 constexpr
  
          // 定义 constexpr 构造函数
          constexpr explicit Matrix(unsigned rows, unsigned columns)            : m_rows { rows }, m_columns { columns } { }
  
          // 定义 constexpr 成员函数以在编译期计算大小
          constexpr unsigned getSize() const { return m_rows * m_columns; }
      private:
          unsigned m_rows { 0 }, m_columns { 0 };
  };
  
  int main() {
      // 编译期构造 constexpr 对象
      constexpr Matrix matrix { 8, 2 };
      constexpr Matrix matrixDefault;
  
      // 直接在常量表达式中使用，创建足以容纳线性化矩阵的数组
      int linearizedMatrix[matrix.getSize()]; // OK!
  }
  ```

- **`consteval` 类与构造函数（强制仅限编译期）**：
  如果将构造函数或成员函数改为 `consteval`，则该类的构造或成员调用**保证**且**必须**发生在编译期。如果尝试用运行期变量（如用户输入或非编译期常量）去调用 `consteval` 构造函数或成员函数，会直接引发编译错误。

- **关于类的四条重要规则**：

  - **隐式 `constexpr`**：由编译器自动生成（无论是隐式生成，还是显式使用 `= default`）的成员函数（如默认构造函数、析构函数、赋值运算符等），会自动成为 `constexpr`，除非该类包含的某个数据成员对应的成员函数不是 `constexpr`。

  - **模块与定义可见性**：`constexpr` 和 `consteval` 成员函数的完整定义必须对编译器可见，以便在编译期求值。如果类定义在 C++20 模块中，这些成员函数必须定义在模块接口文件（`.cppm`）中，而不能放在模块实现文件（`.cpp`）中。

  - **类内专属常量（`static constexpr`）**：当常量仅属于某个类时，推荐使用 `static constexpr` 数据成员替代全局常量。整型和枚举类型的 `static constexpr` 数据成员可以直接在类定义内部定义并初始化（如 `static constexpr std::size_t MaxWidth { 100 };`），甚至无需显式声明为 `inline` 变量。

  - **标准库支持**：许多标准库容器和工具类本身就是 `constexpr` 类，可以直接在自定义 `constexpr` 函数和类中使用，例如 `std::vector`、`std::string`、`std::bitset`、`std::variant`，以及自 C++23 起支持的 `std::optional` 和 `std::unique_ptr`。此外，Lambda 表达式的调用运算符默认也会在满足条件时隐式成为 `constexpr`，也可显式标记为 `constexpr` 或 `consteval`（但两者不能同时组合使用）。

**2. `if consteval`（C++23）：架起 `constexpr` 与 `consteval` 的桥梁**
因为 `consteval` 立即函数**只能在常量求值（编译期）期间被调用**，这就带来了一个难题：一个既可能在编译期运行、又可能在运行期运行的 `constexpr` 函数，该如何安全地调用 `consteval` 函数？

C++23 引入了 `if consteval` 语句来专门解决这个问题。它用于检测当前 `constexpr` 函数是否正在进行编译期常量求值：

- 如果当前处于**编译期常量求值**上下文中，则执行 `if consteval` 分支，此时可以在该分支内安全地调用 `consteval` 立即函数。

- 如果当前处于**运行期求值**上下文中，则执行 `else` 分支（在 `else` 分支中绝不能调用 `consteval` 函数）。

```c++
// 定义一个立即函数，只能在编译期调用
consteval int f(int i) { return i; }

// 定义一个 constexpr 函数，既可在编译期调用，也可在运行期调用
constexpr int g(int i) {
    if consteval { 
        return f(i); // 编译期求值时，安全调用 consteval 函数 f(i)
    } else { 
        return 42;   // 运行期求值时走此分支，不可调用 f(i)
    }
}
```

**语法注意**：`if consteval` 与普通的 `if` 语句不同，它的条件不写圆括号 `()`，后面必须直接跟花括号 `{}` 代码块。通过这种机制，你可以为同一个函数在编译期和运行期分别定制不同的实现逻辑。

**前置检查：** 先能解释 [Day 1](day-001-from-c-to-modern-cpp.md)、[Day 2](day-002-variables-initialization-casts.md) 的核心例子；不必先掌握整本教材。

**本课最低完成目标：** 能按下面的步骤说明示例如何得到结果，并独立完成一项小修改；高级模式与平台性能分析可第二遍再读。新增导读和拓展练习不计入原有约 60 分钟安排，可分两次完成。

继续 Chapter 1 中与 const、constexpr、常量表达式、类型与初始化相关的部分。重点区分：const 表示对象不可通过当前接口修改；constexpr 进一步允许值进入常量表达式并鼓励编译期求值。

## ② 昨日复习 · 5 分钟

**1. 为什么 `int x{value};` 更容易暴露窄化转换？**
`int x{value};` 使用的是 C++11 引入的**统一初始化（Uniform Initialization，即花括号列表初始化）**语法，其核心优势之一就是在语言标准层面**严格禁止隐式窄化转换（Narrowing Conversion）**：

- **传统赋值初始化的隐患（`int x = value;`）**：当使用旧式 `=` 语法（如 `int x = 3.14;`）时，C++ 会静默地自动执行隐式窄化（直接截断小数部分将 `3.14` 变为 `3`）。对此，有些编译器可能会发出警告，而有些编译器则完全不提示，导致潜在的数据丢失与隐蔽 Bug 被忽略。

- **统一初始化的编译期拦截（`int x{value};`）**：根据 C++11 及后续标准，使用 `{}` 初始化时，任何会导致精度或范围丢失的窄化转换（例如 `int x { 3.14 };` 或在初始化列表中混入 `double`）**必须直接触发编译错误（Compilation Error）**（或强制告警）。如果确实需要窄化转换，则必须显式写出转换操作（如使用 GSL 库中的 `gsl::narrow_cast()` 或 `static_cast()`），从而让窄化行为无法在不知情的情况下溜过编译期。

**2. `static_cast` 为什么更适合 Code Review？**
在代码审查（Code Review）中，任何类型转换都应被视为需要重点审视的“可疑点”，而 `static_cast()` 相比旧式 C 风格转换（如 `(int)myFloat` 或 `int(myFloat)`）及隐式转换具有三大审查优势：

- **视觉与语法上高度醒目**：C++ 风格的转换在代码中具有更突出的语法和视觉辨识度（stand out better syntactically and visually），一眼就能在审查或文本搜索中被定位到，而不会像 `(T)val` 那样混杂在圆括号表达式中难以察觉。

- **转换意图与边界清晰**：旧式 C 风格转换几乎包揽了除 `bit_cast()` 之外的所有 C++ 转换（包括 `const_cast` 和危险的 `reinterpret_cast`），审查者很难一眼看出代码的真实意图，极易产生非预期结果。而看到 `static_cast()` 时，审查者能立即明确两点：第一，作者是**有意**在此处进行显式转换（例如为了避免整数除法而写 `static_cast<double>(i) / j`，或显式调用转换构造函数）；第二，它的能力受限于 C++ 类型安全规则——它**绝不可能**悄悄移除 `const` 属性，也**绝不可能**将不相关的指针类型强转（如 `static_cast<char*>(documentPtr)` 会直接编译失败），也不允许将指针强转为整型。

- **精准暴露潜在风险范围**：如果在继承体系中看到 `static_cast<Derived*>(base)`，审查者可以立刻聚焦于一点：此处执行的是无运行时类型检查（无 RTTI）的向下转换，需重点核查上下文能否确保 `base` 绝对指向 `Derived` 对象，或者是否应当要求作者改用更安全的 `dynamic_cast()`。

**3. 协议规定 32-bit 无符号字段时，为什么 `std::uint32_t` 更明确？**
在涉及网络协议、二进制序列化或跨平台开发时，使用 `<cstdint>` 中定义的固定宽度整数类型 `std::uint32_t` 比内置基础类型（如 `unsigned int` 或 `unsigned long`）明确得多：

- **内置整型大小依赖编译器与平台**：C++ 标准并未严格固定内置整型（如 `int`、`long`）的精确字节数，它们的取值范围和大小取决于具体的编译器和目标平台（例如 `int` 和 `long` 只是“通常”为 4 字节，而在不同平台下可能发生变化）。如果用 `unsigned int` 或 `unsigned long` 定义协议字段，跨平台编译时可能会因为类型宽度不一致而破坏二进制协议的内存布局。

- **`std::uint32_t` 提供跨平台精确位宽契约**：`<cstdint>` 头文件专门用于编写跨平台（Cross-Platform）与跨语言代码，其中的 `intx_t` 和 `uintx_t`（`x` 为 8、16、32、64）精确指定了类型的二进制位数。使用 `std::uint32_t` 能够在代码层面直接自我说明（Self-Documenting）：“这是一个严格占 32 位（4 字节）、取值范围为 `0` 到 `4,294,967,295` 的无符号整数字段”，在任何支持它的编译器和平台上都不会产生歧义。

## ③ 核心概念 · 15 分钟

### 先用白话建立概念

- **常量表达式**：满足编译期求值规则的表达式。
- **static_assert**：编译期间的条件检查。

### 跟着本课实验走一遍

1. 定位默认超时和最大重试次数。
2. 手算超时乘积。
3. 对照 `static_assert`，区分编译失败与运行时断言失败。

先尝试口头预测，再到第⑥节运行。下面原有概念、图示与接口对照用于解释这些步骤，短代码片段不一定能单独编译；完整程序以本课 `main.cpp` 为准。

1. const：把“不修改”写进接口

```cpp
const std::uint32_t timeout_ms{5000};
void PrintConfig(const ModemConfig& config);
```

这表达“借用 config，并且不修改它”，比注释约定更可靠。

2. constexpr：编译期常量语义

```cpp
constexpr std::uint32_t kDefaultTimeoutMs{5000U};
constexpr std::size_t kRxBufferSize{512U};
std::array<std::uint8_t, kRxBufferSize> rx_buffer{};
```

3. constexpr 函数 + static_assert

```cpp
constexpr std::uint32_t SecondsToMs(std::uint32_t seconds) {
  return seconds * 1000U;
}
constexpr auto kBootTimeoutMs = SecondsToMs(5U);
static_assert(kBootTimeoutMs == 5000U);
```

当输入是常量表达式时，纯计算可以前移到编译期；static_assert 则把错误挡在构建阶段。

4. const 不等于 constexpr

```cpp
std::uint32_t ReadTimeoutFromNvram();
const std::uint32_t timeout_ms{ReadTimeoutFromNvram()};
```

它初始化后不变，但值来自运行期，因此不是编译期常量。

## ④ C 写法 vs 现代 C++ · 10 分钟

C 风格

```c
#define MODEM_TIMEOUT 5000
#define RX_BUF_SIZE 512
int calc_timeout(int retry) { return MODEM_TIMEOUT * retry; }
```

现代 C++

```cpp
namespace modem {
constexpr std::uint32_t kDefaultTimeoutMs{5000U};
constexpr std::size_t kRxBufferSize{512U};
constexpr std::uint32_t CalculateTimeoutMs(std::uint32_t retry_count) {
  return kDefaultTimeoutMs * retry_count;
}
static_assert(CalculateTimeoutMs(3U) == 15000U);
}  // namespace modem
```

## ⑤ 今日编码规范 · 10 分钟

MUST：语义常量使用 kPascalCase；SHOULD：单位进入名称；SHOULD：可静态检查的约束优先交给类型系统、constexpr、编译告警和静态分析。

| MUST                     | SHOULD                                                                          |
| ------------------------ | ------------------------------------------------------------------------------- |
| 语义常量使用 kPascalCase | 单位进入名称；可静态检查的约束优先交给类型系统、constexpr、编译告警和静态分析。 |

错误：

```cpp
const int timeout = 5000;
if (elapsed_ms > 5000U) {
   ResetModem(); 
}
```

推荐：

```cpp
constexpr std::uint32_t kResponseTimeoutMs{5000U};
if (elapsed_ms > kResponseTimeoutMs) { 
    ResetModem(); 
}
```

## ⑥ Coding 实验 · 20 分钟

### 第一次做：先运行，再只改一件事

1. 在仓库根目录打开 [`examples/day-003/main.cpp`](../examples/day-003/main.cpp)，先读 `main()`，圈出输入、调用与结果检查。
2. 运行原版，把实际输出和退出状态记下来，再与本节预期对照。无输出也可能成功，必须结合退出码与断言判断。
3. 修改前先写预期；若失败，先读第一条编译错误或失败断言，再回到对应概念，不同时重写多个函数。

**本课小改动：** 将重试次数改为 4，先计算新的期望超时，再同步更新检查；不要保留原来的 15000 期望。

<details>
<summary>练习提示：卡住时再展开</summary>

把上面的执行步骤当作检查点；保留原版作为对照。若练习故意让编译或断言失败，请只在实验副本操作，解释失败后还原，不把负例混入日常通过用例。不要执行越界、悬空解引用或重复释放来“观察效果”。

</details>

完整源码：[main.cpp](../examples/day-003/main.cpp)。

```cpp
#include <array>
#include <cstddef>
#include <cstdint>
#include <iostream>

namespace modem {
constexpr std::uint32_t kDefaultTimeoutMs{5000U};
constexpr std::uint32_t kMaxRetryCount{3U};
constexpr std::size_t kRxBufferSize{512U};

constexpr std::uint32_t CalculateTotalTimeoutMs(std::uint32_t retry_count) {
  return kDefaultTimeoutMs * retry_count;
}

static_assert(kRxBufferSize >= 256U);
static_assert(CalculateTotalTimeoutMs(kMaxRetryCount) == 15000U);

struct Config {
  std::uint32_t timeout_ms{kDefaultTimeoutMs};
  std::uint32_t retry_count{kMaxRetryCount};
};

void PrintConfig(const Config& config) {
  std::cout << "timeout_ms = " << config.timeout_ms << '\n';
}
}  // namespace modem

int main() {
  std::array<std::uint8_t, modem::kRxBufferSize> rx_buffer{};
  const modem::Config config{};
  modem::PrintConfig(config);
  std::cout << rx_buffer.size() << '\n';
}
```

在仓库根目录运行：

```bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic examples/day-003/main.cpp -o /tmp/day-003
/tmp/day-003
```

## ⑦ 3 个常见坑 · 5 分钟

- 把所有 const 都理解成编译期常量。

- 为了“性能”到处加 constexpr；首要价值是表达约束，性能仍需测量。

- 用宏定义硬件/协议常量却忽略类型和作用域。

## ⑧ 检查题 · 5 分钟

### 分层自测：从解释到判断

1. **理解：** 不看代码，用三句话复述本课示例的输入、关键步骤和结果。
2. **应用：** 说明第⑥节小改动的预期，以及实际结果是否符合预期。
3. **辨析：** `constexpr` 函数每次调用都在编译期执行吗？

<details>
<summary>辨析题参考答案与通过依据</summary>

不一定；运行期输入通常在运行期求值，只有满足常量表达式上下文等条件时才要求编译期求值。

能运行只是第一步。只有能解释本课具体步骤、完成小改动，并说清一个不适用条件，才算完成本次自测；不清楚时回看第③节，不以阅读次数当作掌握证据。

</details>

### 原课检查题

Q1：固定 RX buffer 大小最适合（）。

A  `int size=512`；

B  运行期 `const`；

C  `constexpr std::size_t kRxBufferSize{512U}`；

D  宏。

Q2：`static_assert `对嵌入式配置的主要价值：A 自动减 RAM；B 把部分配置错误提前到编译期；C 替代所有运行期错误；D 自动修复越界。

今日完成标准

能解释 `const, constexpr, static_assert` 的区别；

能把 C 宏常量改成有类型、有作用域、有单位语义的 C++ 常量。

明日预告：Day 4 — 引用、指针、nullptr 与接口语义：如何在函数签名里表达“不能为空”“可能为空”“只是借用”。

### 对照现有资料库

- [实验环境与工具链边界](<../docs/lab-environments.md>)。
- [类型、借用与错误处理规范](<../guidelines/embedded-cpp-guideline-notes.md>)。

先完成本课小实验，再查对照资料；专题中的线程、网络、板端或模式不是本课默认前置。以上为本项目已有讲解和工程对照，不冒充标准条文，也不表示所有示例已在目标板验证。
