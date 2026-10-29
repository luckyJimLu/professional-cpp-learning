# C++ 语言速查

独立于 C 语言小册子。每个新特性标明首次进入 ISO C++ 标准的版本；首次版本不代表后续所有重载与成员都可用。主 Lab 使用 C++23，具体库支持仍需核对工具链。按主题章节查写法，按版本章节查首次标准化与后续增强。

标注“完整程序”的代码可独立编译；其余代码为需包含相应头文件并放入合适上下文的局部片段，不声称均可独立编译。基础机制标为 C++98 已有，不表示发明于 1998 年。

## 基础与资源管理 <!-- category: foundations -->

### 值、引用与指针 [C++98 已有] <!-- entry: value-reference -->

关键词：引用 指针 const 借用 reference pointer

值是独立对象；引用是既有对象的别名；指针可为空。引用和裸指针通常表达借用，不自动延长被引用对象的生命周期。

```cpp
int count = 3;
int& alias = count;
const int& read_only = count;
int* observer = &count;
```

`const T*` 不允许通过指针修改 T；`T* const` 不允许改变指针指向。

### 字符串、容器与失效 [C++98 已有] <!-- entry: containers -->

关键词：vector string 容器 迭代器 iterator

优先用 `std::string` 管理文本、`std::vector<T>` 管理动态数组；查询尺寸用 `.size()`。`.at(i)` 越界抛异常，`operator[]` 不执行这类异常检查。

`vector` 重新分配会使原元素的指针、引用和迭代器失效。`reserve()` 改变容量，不创建元素；`resize()` 改变元素数量。

### RAII：用对象管理资源 [C++98 已有] <!-- entry: raii -->

关键词：RAII 析构 资源 生命周期 lifetime

构造建立有效状态，析构释放持有资源；异常退出作用域时也会销毁已构造的自动对象。析构函数通常不得抛出异常。

资源类型应明确复制或移动语义；文件、锁和连接也适合 RAII。`unique_ptr` 等标准智能指针从 C++11 起提供，不代表 RAII 从 C++11 才出现。

### 类、组合与虚接口 [C++98 已有] <!-- entry: class-interface -->

关键词：class struct virtual 多态 继承 组合

`struct` 默认成员和继承为 public，`class` 默认为 private；两者都能有构造、成员函数和继承。

优先通过组合表达“拥有”。公有继承表达可替换的 is-a 关系。若允许通过基类指针删除派生对象，基类需要可访问的虚析构函数。

### 显式类型转换 [C++98 已有] <!-- entry: cast -->

关键词：static_cast dynamic_cast const_cast reinterpret_cast RTTI

`static_cast` 用于明确的语言转换；不自动检查窄化数值范围，也不对基类到派生类的向下转换执行运行时类型检查。`dynamic_cast` 用于多态层次的运行时检查，指针失败返回空指针，引用失败抛出 `std::bad_cast`。

`const_cast` 不使原本 const 的对象可修改；`reinterpret_cast` 不保证类型别名、对齐或对象生命周期合法。

### 函数模板与泛型 [C++98 已有] <!-- entry: templates -->

关键词：template 泛型 typename 模板

模板根据使用的类型实例化；类型必须支持模板实际使用的操作。定义通常放在头文件中，以便使用点可见。

```cpp
template<class T>
T larger(T a, T b) { return a < b ? b : a; }
```

C++20 可用 Concepts 明确约束；模板并不意味着必须继承同一基类。

### 错误处理与异常 [C++98 已有] <!-- entry: errors -->

关键词：throw try catch exception assert 错误

异常适合无法在当前层处理的失败；用 `catch (const std::exception& e)` 等按引用捕获，`throw;` 重新抛出当前异常。避免裸资源跨越可能抛异常的操作。

断言用于程序内部不变量，可能被 NDEBUG 关闭，不能代替输入校验。无异常环境应明确使用返回值、C++17 optional 或 C++23 expected 等协议。

### 头文件与编译标准 [C++98 已有] <!-- entry: headers -->

关键词：include namespace 编译 标准 feature_test

直接包含自己使用的设施对应的头文件，不依赖其他头文件碰巧传递包含。头文件避免 `using namespace std;`。

`-std=c++23` 选择语言模式，不安装新标准库。用具体 `__cpp_*` 或 `__cpp_lib_*` 宏核对功能；宏的提供方式见对应设施说明。

## 关键字与声明速查 <!-- category: keywords -->

### 核心关键字按用途查找 <!-- entry: keyword-index -->

关键词：关键字 explicit mutable friend virtual static extern inline using typename thread_local volatile

| 用途 | 写法与含义 | 标准 |
| --- | --- | --- |
| 只读接口 | `const`；成员函数末尾的 const 限制通过 this 修改非 mutable 成员 | C++98 已有 |
| 类内例外 | `mutable` 数据成员可在 const 对象中修改；不保证线程安全 | C++98 已有 |
| 权限 | `public` / `protected` / `private`，`friend` 授权特定函数或类 | C++98 已有 |
| 动态分派 | `virtual` 虚函数；`= 0` 声明纯虚函数 | C++98 已有 |
| 转换限制 | `explicit` 构造函数；显式转换函数从 C++11 起 | C++98 / C++11 |
| 存储与链接 | `static` / `extern`；`thread_local` 为每线程存储 | C++98 / C++11 |
| 类型 | `typedef`、`typename`；别名声明 `using T = ...` 从 C++11 起 | C++98 / C++11 |
| 继承检查 | `override` / `final` 是有特殊含义的标识符，不是保留关键字 | C++11 |
| 编译期 | `constexpr`（C++11），`consteval` / `constinit`（C++20） | 分别标注 |
| 泛型约束 | `template`（C++98），`concept` / `requires`（C++20） | 分别标注 |

`default` 还用于 switch；`delete` 还用于释放 new 创建的对象。关键字语义取决于出现位置。

### explicit：限制隐式转换 [C++98 / C++11 / C++20] <!-- entry: explicit -->

关键词：explicit 构造 转换 operator bool explicit(false)

```cpp
struct Count {
    explicit Count(int n) : value(n) {}
    explicit operator bool() const noexcept { return value != 0; } // C++11
    int value;
};
Count n{3};
if (n) { /* 上下文 bool 转换允许 explicit operator bool */ }
```

C++98 已支持 explicit 构造函数；C++11 支持 explicit 转换函数；C++20 支持条件 `explicit(condition)`。它不只适用于恰好一个参数的构造函数：带默认参数的构造函数也可能成为转换来源。

### mutable 与 friend [C++98 已有] <!-- entry: mutable-friend -->

关键词：mutable friend const 缓存 锁 友元

`mutable int cache{};` 允许 const 成员函数修改缓存；修改共享缓存仍须同步。lambda 的 `mutable`（C++11）允许修改按值捕获的闭包成员，不会因此修改原变量。

`friend void inspect(const T&);` 授予该函数访问 T 私有成员的权限。友元不具有传递性、继承性或自动对称性；不是成员函数的另一种声明方式。

### static、extern、inline 与 ODR [C++98 / C++11 / C++17] <!-- entry: static-extern-inline -->

关键词：static extern inline ODR thread_local extern C 链接

| 声明位置 | 含义 |
| --- | --- |
| 函数内 `static T x;` | 静态存储期；需要动态初始化时首次控制流经过声明才初始化 |
| 命名空间 `static` 函数/变量 | 内部链接，仅当前翻译单元可见 |
| 类内 `static` 成员 | 属于类；静态成员函数没有 this |
| `extern int total;` | 通常仅声明；`extern int total = 1;` 是定义 |
| `inline` 函数 | 满足 ODR 条件时可在多个翻译单元定义，不承诺机器码内联 |
| `inline static int total{};` | 类内定义的内联变量，C++17 |

局部 static 的初始化自 C++11 起有线程安全保证，之后对对象的读写并不自动安全。`thread_local`（C++11）表示每线程一份对象，不承诺所有对象都在线程启动时立刻构造。`extern "C"` 指定语言链接，不把 C++ 类变成 C 兼容接口。

### using、typedef 与 typename [C++98 / C++11] <!-- entry: using-alias -->

关键词：using typedef typename 别名 命名空间 从属类型

```cpp
using Index = std::size_t;                  // C++11 别名声明
template<class T> using Items = std::vector<T>; // C++11 别名模板
template<class T>
void inspect(const T&) {
    using Element = typename T::value_type;
    // Element 是依赖模板参数 T 的嵌套类型
}
```

using 声明和命名空间指令在 C++98 已有，别名声明及继承构造函数在 C++11 引入。依赖名称的 typename 规则存在上下文例外；不要给所有嵌套名称机械加 typename。

## 程序结构、编译与模块 <!-- category: toolchain -->

### 完整程序与编译命令 [C++98 已有] <!-- entry: hello-build -->

关键词：main hello include 编译 g++ 链接

完整程序：

```cpp
#include <iostream>
int main() {
    std::cout << "Hello, C++!\n";
}
```

主机示例：`g++ -std=c++20 -Wall -Wextra -Wpedantic main.cpp -o app`，再运行 `./app`。运行环境若不支持 g++，使用对应编译器与选项。main 返回 int；正常执行到末尾等价于返回 0。

### 编译错误、链接错误与定义 [C++98 已有] <!-- entry: compile-link -->

关键词：预处理 翻译单元 编译 链接 undefined reference ODR

常用工具链可概括为预处理、编译/汇编、链接；这是实践概览，不是标准全部翻译阶段的逐项列表。

- **编译错误**：声明不可见、类型不匹配、语法错误等。
- **链接错误**：所需定义缺失、普通外部定义重复、库未链接等。
- `void send();` 是声明，`void send() {}` 是定义。普通非 inline 函数定义通常放 .cpp，声明放头文件。
- 头文件守卫只防止同一翻译单元重复包含；不能解决多个 .cpp 各自包含普通全局定义的 ODR 问题。

模板和 inline 实体有条件允许跨翻译单元多重定义，不是任意内容都能随意重复。

### 命名空间与头文件守卫 [C++98 / C++17] <!-- entry: namespace-guards -->

关键词：namespace pragma once include guard 头文件

```cpp
#ifndef PROJECT_CONFIG_HPP
#define PROJECT_CONFIG_HPP
namespace project {
struct Config { int retries; };
}
#endif
```

标准宏守卫可移植；`#pragma once` 是广泛支持的实现扩展，不属于 ISO C++ 标准指令。头文件不要在全局写 `using namespace std;`。

`namespace company::project { ... }` 是 C++17 嵌套命名空间写法。命名空间别名如 `namespace fs = std::filesystem;` 不会复制库。

### modules 与 import std [C++20 / C++23] <!-- entry: modules -->

关键词：module export import std 模块 BMI

```cpp
// C++20 命名模块的接口单元；构建方式取决于工具链
export module arithmetic;
export int add(int a, int b) { return a + b; }
```

模块语言机制在 C++20 引入，标准库命名模块 `std` / `std.compat` 在 C++23 引入。`import std;` 需要编译器、标准库和构建系统共同支持；通常还需预构建模块产物，不能只改一行源码。

命名模块不导出宏；头单元的宏规则不同。模块能改善依赖隔离，但不保证任意工程编译更快。初学者可先使用 include。

## 类型、初始化与表达式 <!-- category: types -->

### 类型大小与范围：不要写死 [C++98 / C++11 / C++20] <!-- entry: type-sizes -->

关键词：sizeof CHAR_BIT bool char int short long size_t numeric_limits char8_t

| 类型 | 标准保证或查询方式 |
| --- | --- |
| `char` / `signed char` / `unsigned char` | sizeof 为 1；一个字节至少 8 位，查 CHAR_BIT；普通 char 的符号性由实现决定 |
| `short` / `int` | 至少 16 位；不能把 int 固定当作 32 位 |
| `long` / `long long` | 分别至少 32 / 64 位；long long 从 C++11 起 |
| `bool` / `std::size_t` | 大小由实现决定；size_t 是 sizeof 的无符号结果类型，不保证 64 位 |
| `std::int32_t` 等 | C++11 `<cstdint>`；精确宽度类型仅在实现存在相应类型时提供 |
| `float` / `double` | 精度与格式查 `<limits>`，不无条件假设 IEEE 754 |
| `char16_t` / `char32_t` / `char8_t` | 前两者 C++11，char8_t 为 C++20；代码单元不是完整 Unicode 字符 |

`numeric_limits<T>::min()` 对浮点数表示最小正正规值；`lowest()`（C++11）才是最低有限值。`sizeof(T)` 单位是 C++ 字节，不必等于 8 位。

### 数字、字符与字符串字面量 [C++98 / C++11 / C++14 / C++20] <!-- entry: literals -->

关键词：字面量 后缀 LL U f 0b UTF Unicode 转义

```cpp
auto big = 10'000'000'000LL; // C++14 数字分隔符；long long 为 C++11
auto mask = 0b1010U;        // C++14 二进制字面量
auto ratio = 3.5f;          // float；无 f 的小数通常是 double
const char* text = "line\n";
```

`'A'` 在 C++ 中是 char；`"A"` 是含终止符的 const char 数组。u8 字符串字面量从 C++11 起有，元素类型从 C++20 起改为 char8_t，不能直接当 const char* 使用。UTF-8/UTF-16 中一个字符可能占多个代码单元。

### 花括号、initializer_list 与指定初始化 [C++11 / C++20] <!-- entry: initialization-traps -->

关键词：初始化 initializer_list narrowing designated aggregate vector

```cpp
int count{};                   // 0
std::vector<int> a(3, 7);       // 3 个 7
std::vector<int> b{3, 7};       // 两个元素：3、7
struct Config { int timeout{10}; bool tls{true}; };
Config c{.timeout = 50, .tls = false}; // C++20
```

列表初始化自 C++11 起检查窄化，但某些可精确表示的常量转换有例外。initializer_list 构造函数的优先规则会改变花括号语义，不能机械替换所有圆括号。

C++20 指定初始化只适用于聚合类，按成员声明顺序指定，不支持 C 风格的数组下标或嵌套指定器。`T{}` 对任意类不保证所有字节都为零：用户定义构造函数仍可能留下未初始化成员。

### auto 与 decltype 的精确区别 [C++11 / C++14] <!-- entry: auto-decltype -->

关键词：auto decltype decltype(auto) 引用 推导 顶层 const

```cpp
const int x = 3;
auto copy = x;       // int
const auto& ref = x; // const int&
decltype(x) a = x;   // const int
decltype((x)) b = x; // const int&
```

decltype 对未加括号的名字/成员访问与其他表达式使用不同规则，不是“一律保留所有引用”。decltype(auto)（C++14）按 decltype 规则推导；返回 `(local)` 可能得到悬空引用。未求值语境仍要求表达式符合相应语法和类型规则。

### const、constexpr、consteval、constinit [C++98 / C++11 / C++20] <!-- entry: constant-evaluation -->

关键词：const constexpr consteval constinit 编译期 常量表达式

| 声明 | 表达的约束 |
| --- | --- |
| `const`（C++98 已有） | 不能通过该 const 访问路径修改；不必是编译期常量 |
| constexpr 变量（C++11） | 常量表达式初始化，并具有 const 限定 |
| constexpr 函数（C++11） | 在满足规则的上下文中可常量求值，也可运行时执行 |
| consteval 函数（C++20） | 立即函数；必须形成常量表达式的立即调用不能使用不合要求的运行时值 |
| constinit 变量（C++20） | 要求静态/线程存储期变量满足静态初始化，不要求对象只读 |

`constexpr int sq(int x) { return x*x; }` 的调用即使参数是字面量，也不因参数本身就保证编译期执行；`constexpr int n = sq(3);` 才要求常量表达式。constinit 不解决所有跨翻译单元的依赖与初始化顺序问题。

### 运算符、短路与控制流 [C++98 / C++11 / C++17 / C++20] <!-- entry: operators-control -->

关键词：if switch for while do break continue 运算符 优先级 溢出

```cpp
if ((flags & mask) != 0) { /* 位与优先级低于 != */ }
if (ptr != nullptr && ptr->ready()) { /* 内建 && 短路 */ }
for (const auto& item : items) { /* C++11 范围 for */ }
for (std::size_t i = 0; const auto& item : items) { ++i; } // C++20
```

`if (init; condition)` / switch 初始化语句为 C++17。普通 for、while、do-while、switch、break、continue 在 C++98 已有；continue 不退出整个循环，switch 的 case 未 break 会继续执行后续语句。

整数除法向零截断（对负数的明确保证自 C++11）；除数不得为零，最小有符号数除以 -1 也可能溢出。有符号溢出是未定义行为；无符号运算按模回绕。运算符优先级不代表求值顺序。

### 强枚举、using enum 与底层值 [C++11 / C++20 / C++23] <!-- entry: enum-conversion -->

关键词：enum class using enum to_underlying 枚举

```cpp
enum class State : unsigned char { idle, busy }; // C++11
auto code = static_cast<unsigned char>(State::busy);
// C++23，包含 <utility>：auto code2 = std::to_underlying(State::busy);
```

enum class 不隐式转换为整数；底层类型默认 int。传统 enum 也可在 C++11 指定底层类型并作适当的前置声明。`using enum State;`（C++20）将枚举项引入当前作用域，需注意名字冲突。

### 按位转换 std::bit_cast [C++20] <!-- entry: bit-cast -->

关键词：bit_cast bit memcpy reinterpret_cast 对象表示

`std::bit_cast<To>(from)` 定义于 `<bit>`，按对象表示创建 To 值；要求两种类型大小相同且均为 trivially copyable。

它不转换数值单位，不校正字节序，也不保证任意位模式都能表示合法的 To 值。对 padding、未初始化位和无对应目标值的情况需核对标准规则；不要把任意指针或网络字节机械 bit_cast 成业务对象。

### 三路比较与默认比较 [C++20] <!-- entry: three-way-comparison -->

关键词：spaceship operator <=> compare strong_ordering partial_ordering NaN

```cpp
#include <compare>
struct Point {
    int x{};
    int y{};
    auto operator<=>(const Point&) const = default;
};
```

此例逐成员比较；默认化的 <=> 在条件满足时还会隐式声明对应的 ==，其他关系表达式使用重写候选规则，不是直接生成六份普通函数定义。

成员不可比较可能使默认比较被删除。浮点数比较可得到 partial_ordering::unordered（如 NaN），不要假设所有 <=> 结果只有小于、等于、大于。

## 函数、参数与 lambda <!-- category: functions -->

### 按意图选择参数 [C++98 / C++17 / C++20] <!-- entry: parameter-passing -->

关键词：参数 传值 const 引用 string_view span sink 返回值 NRVO

| 意图 | 常见写法 | 注意 |
| --- | --- | --- |
| 小型只读值 | `f(int value)` | 不承诺某种寄存器布局或固定性能 |
| 大型只读对象 | `f(const T& value)` | 避免复制，但 const 不保证其指向的外部对象不可变 |
| 修改已有对象 | `f(T& value)` | 调用方承担对象生命周期 |
| 借用文本 | `f(std::string_view text)`，C++17 | 不保存到超出源文本生命期的位置 |
| 借用连续序列 | `f(std::span<const int> values)`，C++20 | const 修饰元素，不拥有序列 |
| 接收所有权 | 值参数、unique_ptr 或明确的移动接口 | 依具体类型和契约选择 |
| 返回结果 | `T make()` | 优先清晰返回值；NRVO 不保证发生 |

C++17 对某些 prvalue 初始化提供保证的复制消除，`return local;` 的 NRVO 仍可选。`return std::move(local);` 可能妨碍 NRVO，不要机械添加。

### lambda 捕获与回调生命周期 [C++11 / C++14 / C++17] <!-- entry: lambda-captures -->

关键词：lambda 捕获 this mutable 泛型 初始化捕获 悬空 回调

```cpp
int total = 0;
auto add = [&total](int n) { total += n; }; // C++11，借用 total
auto task = [p = std::make_unique<int>(7)] { return *p; }; // C++14
```

`[x]` 保存副本，`[&x]` 借用；引用捕获不得超出源对象生命周期。`[this]` 保存 this 指针，不延长对象生命期；`[*this]`（C++17）复制当前对象，是否合适取决于类型语义。

初始化捕获和 auto 形参的泛型 lambda 从 C++14 起支持；显式模板形参列表从 C++20 起。mutable 允许修改按值捕获的成员，不会给闭包添加线程同步。

### 标准属性速查 [C++11 / C++14 / C++17 / C++20] <!-- entry: attributes -->

关键词：nodiscard deprecated maybe_unused fallthrough likely unlikely noreturn 属性

| 属性 | 首次标准化 | 用途与限制 |
| --- | --- | --- |
| `[[noreturn]]` | C++11 | 函数不正常返回；可以抛异常，不能用来表示“无返回值” |
| `[[deprecated("use new_api")]]` | C++14 | 提示接口弃用 |
| `[[nodiscard]]` | C++17 | 不应忽略结果；不是强制调用方处理错误的类型系统 |
| `[[nodiscard("reason")]]` | C++20 | 带诊断说明 |
| `[[maybe_unused]]` | C++17 | 表达有意未使用 |
| `[[fallthrough]];` | C++17 | 标记 switch 中有意贯穿 |
| `[[likely]]` / `[[unlikely]]` | C++20 | 控制流优化提示，不保证性能提升 |

诊断和优化行为取决于实现；属性不能代替资源所有权或失败处理协议。

### noexcept：承诺与条件检测 [C++11 / C++17] <!-- entry: noexcept-contract -->

关键词：noexcept terminate is_nothrow_move_constructible 条件异常

```cpp
void swap(T& other) noexcept; // 仅在实现确实不会传播异常时承诺
// 模板常用条件说明：noexcept(noexcept(member.swap(other.member)))
```

异常逃出 noexcept 函数会调用 std::terminate；编译器不保证拒绝所有潜在抛出操作。移动构造/赋值应在真实满足条件时标 noexcept，不能为了优化强行承诺。

析构函数通常隐式不抛出，具体说明取决于基类和成员。noexcept 运算符检查表达式是否被视为潜在抛出，不实际执行表达式。异常说明从 C++17 起成为函数类型的一部分。

## 类、构造与多态 <!-- category: classes -->

### 构造顺序与委托构造 [C++98 / C++11] <!-- entry: constructor-order -->

关键词：构造函数 初始化列表 委托 默认成员 顺序 explicit

```cpp
class Account {
public:
    Account() : Account(0) {} // C++11 委托构造
    explicit Account(int balance) : balance_(balance) {}
    int balance() const noexcept { return balance_; }
private:
    int balance_{}; // C++11 默认成员初始值
};
```

虚基类由最派生类先初始化，其后是直接基类、按声明顺序的成员，最后执行构造函数体。初始化列表的书写顺序不改变实际顺序。委托构造不能同时初始化其他基类/成员。

构造时调用虚函数不会分派到尚未构造的更派生部分；析构时也有相应限制。

### virtual、override、final 与析构 [C++98 / C++11] <!-- entry: override-final -->

关键词：virtual override final 析构 多态 协变 隐藏

```cpp
struct Base {
    virtual ~Base() = default; // = default 为 C++11
    virtual int value() const = 0;
};
struct Leaf final : Base {
    int value() const override { return 7; }
};
```

virtual 在 C++98 已有，override/final 从 C++11 起。override 检查是否真正覆盖，包括 const 和引用限定；允许合法的协变返回类型，不要求文本签名完全相同。

通过基类指针 delete 派生对象，通常需可访问的虚析构；另一种接口策略是 protected 非虚析构以禁止该删除方式。final 限制继承/覆盖，不保证任意调用都会去虚化，也不能自动防止切片或所有安全绕过。

### 六个特殊成员与零法则 [C++98 / C++11] <!-- entry: special-members -->

关键词：特殊成员 默认 拷贝 移动 析构 rule of zero five delete default

| 特殊成员 | 常见形式 |
| --- | --- |
| 默认构造 | `T()` |
| 析构 | `~T()` |
| 拷贝构造 | `T(const T&)` |
| 拷贝赋值 | `T& operator=(const T&)` |
| 移动构造，C++11 | `T(T&&)` |
| 移动赋值，C++11 | `T& operator=(T&&)` |

这是常见签名，不是所有合法签名的穷举。隐式声明不等于可调用：成员或基类的限制可能使函数被定义为删除。

未声明任何构造函数时才会隐式声明默认构造。隐式移动成员要求没有用户声明的拷贝、移动及析构等相应特殊成员；即使 `~T() = default` 也是用户声明，会抑制隐式移动。声明移动成员会导致隐式拷贝成员被删除。

优先零法则：让 string/vector/unique_ptr 等成员承担资源管理。确需自定义特殊成员时审查其余成员的复制、移动和异常语义；不是无条件写齐五个 default。

### 对象切片与安全多态复制 [C++98 已有] <!-- entry: slicing -->

关键词：对象切片 slicing 基类 值传递 clone

把派生对象按值复制到基类对象，会只保留基类子对象；虚函数不能恢复被丢弃的派生状态。多态参数通常用基类引用/指针。

`Base& dst = ...; dst = derived;` 可只赋值基类部分，但引用绑定本身不切片。根据设计可限制基类拷贝/赋值，或提供显式虚 clone 接口，不要把所有继承类都机械设为不可复制。

### 运算符重载的常见形式 [C++98 / C++11 / C++20 / C++23] <!-- entry: operator-overload -->

关键词：operator += + << [] bool 多维下标 重载

| 操作 | 常见接口 |
| --- | --- |
| 复合赋值 | 成员 `T& operator+=(const T&)`，返回 *this |
| 对称加法 | 非成员 `T operator+(T lhs, const T& rhs)`，内部复用 += |
| 流输出 | 非成员 `std::ostream& operator<<(std::ostream&, const T&)` |
| 下标 | const / 非 const 重载；明确越界契约 |
| bool 转换 | `explicit operator bool() const`，C++11 |
| 默认比较 | `operator<=> ... = default`，C++20 |
| 多参数下标 | `operator[](row, column)`，C++23 |

非成员加法能让两个操作数都参与允许的隐式转换，但并不保证任意 `a + 5` / `5 + a` 都合法。重载不能更改优先级、结合性或操作数个数的一般规则。

## 标准容器与字符串 <!-- category: containers -->

### 容器选择与复杂度 [C++98 / C++11] <!-- entry: container-choice -->

关键词：STL vector deque list map set unordered_map unordered_set queue stack

| 需求 | 常见选择 | 边界 |
| --- | --- | --- |
| 连续动态序列 | vector，C++98 | 随机访问 O(1)，尾部追加摊销 O(1)，中间插删 O(n) |
| 固定元素数 | array，C++11 | 连续存储，长度是类型的一部分 |
| 双端序列 | deque，C++98 | 随机访问 O(1)，不保证整体连续 |
| 节点式序列 | list，C++98 | 已知迭代器处插删 O(1)，查找 O(n)；无随机访问 |
| 有序键值/集合 | map / set，C++98 | 查找 O(log n)，按比较器顺序遍历 |
| 哈希键值/集合 | unordered_map / unordered_set，C++11 | 查找平均 O(1)，最坏 O(n)，不保证遍历顺序 |
| 栈、队列、优先队列 | stack / queue / priority_queue，C++98 | 适配器，接口按用途收窄 |

map 与 unordered_map 的常见接口相似，但不能认为 API、迭代器失效和复杂度完全一致。

### vector 增删与失效 [C++98 / C++11 / C++20] <!-- entry: vector-operations -->

关键词：vector reserve resize push_back emplace_back erase front back at

```cpp
std::vector<int> values{3, 1, 2}; // 花括号列表 C++11
values.reserve(10);              // 容量至少 10，size 仍为 3
values.push_back(4);
std::erase_if(values, [](int x) { return x < 2; }); // C++20
```

reserve 触发重新分配时，所有元素的指针/引用/迭代器失效；未重新分配的 push_back 仍使旧 end 失效。erase 使被删位置及之后的迭代器/引用失效。

front/back/pop_back 要求容器非空。emplace_back（C++11）转发构造参数，不总比 push_back 更快；重新分配仍可能移动/复制现有元素。

### map / unordered_map：查找不是插入 [C++98 / C++11 / C++17 / C++20] <!-- entry: map-lookup -->

关键词：map unordered_map operator[] contains find try_emplace insert_or_assign

```cpp
std::unordered_map<std::string, int> counts{{"apple", 2}}; // C++11
counts.try_emplace("apple", 99); // C++17：已有键不覆盖 mapped value
if (auto it = counts.find("apple"); it != counts.end()) { // C++17 if 初始化
    ++it->second;
}
bool exists = counts.contains("apple"); // C++20
```

`operator[]` 在缺键时插入默认值，不适合作存在性测试。`at()` 不插入，缺键抛 out_of_range；insert_or_assign（C++17）可插入或覆盖。try_emplace 不代表传入的实参表达式会延迟求值。

unordered 容器 rehash 使迭代器失效，但不会使元素的引用/指针失效；删除元素仍使对应引用/指针失效。

### 栈、队列与优先队列 [C++98 已有] <!-- entry: heap-queue -->

关键词：stack queue priority_queue greater 堆 top front pop

```cpp
std::priority_queue<int> largest_first;
std::priority_queue<int, std::vector<int>, std::greater<int> > smallest_first;
smallest_first.push(3);
smallest_first.push(1);
int first = smallest_first.top(); // 1
smallest_first.pop();             // 删除但不返回元素
```

分别包含 `<stack>`、`<queue>`；greater 定义于 `<functional>`，底层 vector 需 `<vector>`。访问 top/front/back 或 pop 前确保非空。priority_queue 的 push/pop 为 O(log n)，top 为 O(1)；默认最大元素优先。

### string、string_view 与文本边界 [C++98 / C++17 / C++20 / C++23] <!-- entry: string-operations -->

关键词：string substr find npos getline starts_with contains c_str string_view

string（C++98）拥有文本，string_view（C++17）借用文本。`find()` 未找到返回 npos，不要拿返回值直接当 bool；`substr(pos, count)` 需确保 pos 不大于 size。

- `starts_with` / `ends_with`：C++20。
- `string::contains` / `string_view::contains`：C++23。
- string::substr 通常创建拥有型副本；string_view::substr 返回借用视图。
- `c_str()` 提供结尾空字符，但字符串内部仍可有空字符。修改 string 可能使既有指针/视图失效。
- `.size()` 统计代码单元，不是用户可见字符数量。

## 算法、Ranges 与泛型约束 <!-- category: algorithms -->

### 排序、查找与累加 [C++98 / C++20] <!-- entry: algorithm-recipes -->

关键词：algorithm numeric ranges sort lower_bound accumulate max minmax_element 投影

```cpp
std::ranges::sort(values);                             // C++20，<algorithm>
auto found = std::ranges::lower_bound(values, target);  // 已排序且比较规则一致
long long sum = std::accumulate(values.begin(), values.end(), 0LL); // <numeric>
```

普通 std::sort / lower_bound / accumulate 在 C++98 已有；Ranges 版本从 C++20 起。

- `std::ranges::sort(rows, {}, &Row::score)` 使用投影。
- 比较器要满足严格弱序；用 `a <= b` 作 sort 比较器通常错误。
- lower_bound 返回首个不小于目标的位置，可能为 end；一般要求与所用比较关系一致的有序范围。
- max/min 等返回值版本要求非空范围；minmax_element 可返回 end，需要检查。
- accumulate 的初值决定累加类型；0LL 不能防止 long long 本身溢出。

### 删除与去重：算法不等于容器擦除 [C++98 / C++20] <!-- entry: erase-unique -->

关键词：erase remove unique remove_if erase_if 去重

```cpp
std::ranges::sort(values);              // C++20
const auto tail = std::ranges::unique(values);
values.erase(tail.begin(), tail.end()); // 真正缩小容器
```

unique 只合并相邻相等元素；要全局去重可先按一致规则排序，但会改变原顺序。remove_if / unique 算法本身不改变 vector::size()。C++20 的 std::erase / erase_if 提供相应容器便利接口。

保留原始顺序的去重需另选方案，如记录已见键后按顺序收集。

### Ranges 视图与惰性求值 [C++20 / C++23] <!-- entry: range-views -->

关键词：views filter transform ranges to 惰性 视图 生命周期

```cpp
auto positive = values | std::views::filter([](int x) { return x > 0; });
for (int x : positive) { /* 遍历时才应用过滤 */ }
```

包含 `<ranges>`。view 描述范围，不一定拥有元素；是否拥有取决于具体视图和构造来源，不能简单说“所有 view 都不拥有”。避免借用已销毁容器，修改底层容器也可能破坏遍历条件。

`std::ranges::to<std::vector>()` 是 C++23，不属于 C++20 的基础 Ranges。C++23 的 join_with、zip 等后增适配器需分别确认支持。

### Concepts 与 if constexpr [C++20 / C++17] <!-- entry: concepts-example -->

关键词：concept requires convertible_to integral is_integral_v if constexpr template

```cpp
#include <concepts>
template<class T>
concept Addable = requires(T a, T b) {
    { a + b } -> std::convertible_to<T>;
};
template<Addable T>
T combine(const T& a, const T& b) { return a + b; }
```

Concepts/requires 为 C++20；if constexpr 为 C++17。requires 表达式检查表达式的合法性，不证明溢出安全、结合律等业务性质。模板中被丢弃的 if constexpr 分支有特殊实例化规则，但不能放任任意语法错误；非模板上下文仍须检查分支。

## 输入输出、格式与文件 <!-- category: streams -->

### 输入检查、getline 与空白 [C++98 已有] <!-- entry: input-stream -->

关键词：cin cout getline ws ignore fail clear 输入

```cpp
int age{};
if (!(std::cin >> age)) { /* 格式错误、范围错误或流结束：处理失败 */ }
std::string full_name;
if (!std::getline(std::cin >> std::ws, full_name)) { /* 处理失败 */ }
```

`std::ws` 跳过所有前导空白，不只清掉一个换行；若空行、前导空格有意义，应按协议用 ignore 或全程 getline 后解析。失败重试通常需要 clear() 恢复状态，再消费无效输入，避免无限循环。

`'\n'` 只换行；endl 还刷新流。`>>` 对数字与字符串等提取规则不同，不能说所有提取都在空格停止。

### format / print 常用格式 [C++20 / C++23] <!-- entry: format-table -->

关键词：format format_to print println precision width 填充 进制 格式

std::format（C++20）需要 `<format>` 并返回 string；std::print/println（C++23）需要 `<print>`，分别输出与输出后换行。

| 格式与参数 | 结果 |
| --- | --- |
| `"{} {}", "Bob", 20` | `Bob 20` |
| `"{1} -> {0}", "End", "Start"` | `Start -> End` |
| `"{:.2f}", 3.14159` | `3.14` |
| `"{:06d}", 42` | `000042` |
| `"{:*^10}", "Hi"` | `****Hi****` |
| `"{:#x}, {:#b}", 255, 10` | `0xff, 0b1010` |

表格为对应 format 调用的格式串与参数。不要混用自动与手动参数索引。不是所有类型都有内置 formatter；编译期格式检查不保证所有运行期输入都有效。运行时格式串可用 vformat 等相应接口，仍需处理 format_error。

### 文件读写：检查打开、写入与结束 [C++98 已有] <!-- entry: file-stream -->

关键词：fstream ifstream ofstream flush close bad eof 文件

```cpp
std::ifstream in(path);
if (!in) throw std::runtime_error("open failed");
std::string line;
while (std::getline(in, line)) { /* 使用 line */ }
if (in.bad() || !in.eof()) throw std::runtime_error("read failed");
```

包含 `<fstream>`、`<string>`、`<stdexcept>`。普通流默认通过状态位报告多数 I/O 失败，不会自动抛出每次读写错误。

输出需检查打开与写入状态；要求确认持久化链路中的流错误时，应显式 flush/close 后检查状态，析构不能可靠向调用方报告关闭失败。flush 不等价于操作系统/硬件持久化保证。`std::ios::trunc` 会覆盖旧内容，使用前明确目标路径。不要用 `while (!in.eof())` 作为读取循环。

### 路径与文件系统 [C++17] <!-- entry: filesystem -->

关键词：filesystem path exists error_code directory_iterator

`std::filesystem::path` 表达路径；exists、create_directories、directory_iterator 等定义于 `<filesystem>`。

许多操作同时提供抛异常及带 std::error_code 的重载，具体以接口为准。先 exists 再 open 之间文件仍可能改变，应以实际打开结果为准。path 不自动防止路径穿越，不应把用户输入路径直接用于覆盖文件。

## 异常安全与并发 <!-- category: concurrency -->

### 异常捕获与安全保证 [C++98 / C++11] <!-- entry: exception-safety -->

关键词：exception try catch throw RAII basic strong guarantee terminate

按具体类型到一般类型的顺序 catch，常用 `catch (const std::exception& e)` 避免切片；`throw;` 保留当前异常，`throw e;` 可能按静态类型复制。自定义非标准异常不会被 std::exception 捕获，必要时在边界用 catch(...) 并执行明确策略。

- **基本保证**：失败后不泄漏资源、不破坏不变量。
- **强保证**：失败无可观察状态改变。
- **不抛保证**：操作不传播异常。

RAII 保证已构造局部对象的退出清理，但不会自动回滚所有业务修改。析构期间再抛异常可能触发 terminate；禁异常工具链需采用不同错误协议。

### thread、jthread 与停止请求 [C++11 / C++20] <!-- entry: threads-jthread -->

关键词：thread jthread join detach stop_token request_stop 线程 生命周期

std::thread（C++11）销毁时若仍 joinable 会 terminate；所有成功创建的线程都需有明确 join/detach 策略。detach 不管理被借用对象的生命周期。

std::jthread（C++20）在析构时对 joinable 线程请求停止并 join。停止是协作式的，不会强杀线程；若任务不响应停止或卡在阻塞操作，析构仍可能一直等待。任务函数抛出未捕获异常仍会 terminate。

捕获变量须比线程使用活得更久；并发访问普通对象要遵守同步规则。不是任意代码换成 jthread 就永远不会崩溃。

### mutex 与 RAII 锁 [C++11 / C++17] <!-- entry: mutex-locks -->

关键词：mutex lock_guard unique_lock scoped_lock deadlock 条件变量

```cpp
std::mutex mutex;
int total = 0;
{
    std::lock_guard<std::mutex> lock(mutex); // C++11
    ++total;
}
// C++17 可写 std::scoped_lock lock(mutex1, mutex2);
```

lock_guard 简单持锁，unique_lock（C++11）支持延迟/手动解锁及条件变量，scoped_lock（C++17）支持多个互斥量并采用避免死锁的锁定算法。

RAII 避免忘记释放锁，不保证任意锁调用图绝无死锁。避免持锁调用未知回调；递归持有非递归 mutex 是错误。条件变量应配谓词循环等待，防止虚假唤醒。

### atomic、内存序与 volatile [C++11] <!-- entry: atomics -->

关键词：atomic memory_order relaxed lock-free volatile 数据竞争 同步

```cpp
std::atomic<int> completed{0};
completed.fetch_add(1, std::memory_order_relaxed);
```

包含 `<atomic>`。默认原子操作使用顺序一致性；relaxed 只适合不承担跨对象发布/可见性协议的情况，不能用来自动发布普通数据。

原子操作不保证无锁，可查询 is_lock_free() 或 C++17 的 is_always_lock_free。多个原子操作也不自动组成一个不可分割事务。volatile 不提供线程同步或原子性；访问共享普通变量发生未同步冲突可能是数据竞争和未定义行为。

### 写完代码后的边界自查 <!-- entry: beginner-checklist -->

关键词：检查清单 初始化 悬空 越界 泄漏 并发 标准

1. 变量是否初始化？下标、迭代器及除数是否有效？
2. 借用的指针、引用、string_view、span、lambda 捕获是否仍指向活对象？
3. 资源是否有唯一清理责任？是否真的需要 shared_ptr，是否存在强引用环？
4. map 查询是否意外用 [] 插入？访问 end/top/front 前是否检查？
5. 函数返回值、输入输出状态与关闭失败是否处理？
6. 虚函数是否写 override？通过基类删除是否符合析构契约？
7. noexcept 是否真实？是否把 NRVO、去虚化或原子无锁当作保证？
8. 线程是否结束、共享数据是否同步、停止请求是否响应？
9. 新特性是否标明版本，并核对编译器与标准库两者的支持？

## 内存、所有权与对象生命周期 <!-- category: memory -->

### new/delete、数组与 placement new [C++98 已有] <!-- entry: raw-allocation -->

关键词：new delete new[] delete[] placement malloc free 构造 内存

`new T(args)` 分配存储并构造对象；`delete p` 析构并释放。`new T[n]` 配 `delete[]`，不能混用或与 malloc/free 混用。普通分配失败通常抛 bad_alloc；`new (std::nothrow)` 的分配失败返回空指针，但构造函数仍可能抛出其他异常。

placement new 在调用方提供且满足大小/对齐的存储中构造对象，不负责分配那块存储；销毁及存储释放责任要分别处理。C++20 construct_at、C++17 destroy_at 提供相应显式生命周期操作，但都不是任意裸字节自动变成对象的许可。

### 移动后状态与所有权转移 [C++11] <!-- entry: moved-from -->

关键词：move forward 右值引用 move-only moved-from 移动 转发

`std::move(x)` 将表达式转换为可用于移动的值类别，是否调用移动构造取决于重载与类型；它自身不转移任何资源。移动 const 对象常因无法绑定常用的 T&& 移动接口而退回复制。

标准库类型移动后通常保持有效但状态未指定，除非该接口给出更强保证；unique_ptr 移动后为空，而 string/vector 不应统一假设为空。重新使用前遵守具体成员的前置条件。std::forward 用于正确的转发引用场景，不能替代所有 move。

### shared_ptr、weak_ptr 与共同所有权 [C++11 / C++17] <!-- entry: shared-ownership -->

关键词：shared_ptr weak_ptr lock make_shared shared_from_this weak_from_this 引用环

共享持有者共同维护对象生命周期；weak_ptr 不增加强引用计数，访问前使用 lock() 取得 shared_ptr。先 expired() 再解引用旧地址存在竞态，不能代替 lock()。

make_shared 通常可减少分配次数，但不承诺所有实现只分配一次；shared_ptr 的控制块同步不保护其管理对象的并发读写。对同一个 shared_ptr 变量的并发修改也需要相应同步。

shared_from_this（C++11）要求对象已经处于适当的 shared_ptr 管理关系中，不能在构造时假设已可用；weak_from_this 从 C++17 起提供。不要从同一裸指针创建多个互不相关的控制块。

### 悬空、越界与对象重用 <!-- entry: lifetime-checks -->

关键词：lifetime nullptr dangling 悬空 空指针 越界 construct_at destroy_at

非空不代表指针仍有效；释放、容器重新分配、局部对象销毁都会产生悬空借用。delete 后给一个指针置空不会清除其他别名。

数组的一尾后指针只能用于相应比较/差值等合法操作，不能解引用；指针算术通常限于同一数组。不能仅凭地址相同就认定旧对象仍活着；存储复用还需核对类型、对齐、生命周期和透明替换规则。

## C++11 新特性 <!-- category: cpp-11 -->

### 列表初始化 [C++11] <!-- entry: feature-0 -->

关键词：列表初始化 C++11 标准版本

**首次标准化：C++11。** 包括直接列表初始化；窄化检查及 initializer_list 优先规则须单独注意。

### lambda 表达式 [C++11] <!-- entry: feature-1 -->

关键词：lambda 表达式 C++11 标准版本

**首次标准化：C++11。** 泛型 lambda（auto 形参）、初始化捕获从 C++14 起可用；显式模板形参列表从 C++20 起可用。

### = default / = delete [C++11] <!-- entry: feature-2 -->

关键词：= default / = delete C++11 标准版本

**首次标准化：C++11。** 显式默认化与删除函数。

### 范围 for [C++11] <!-- entry: feature-3 -->

关键词：范围 for C++11 标准版本

**首次标准化：C++11。** 带初始化语句的范围 for 从 C++20 起可用。

### constexpr [C++11] <!-- entry: feature-5 -->

关键词：constexpr C++11 标准版本

**首次标准化：C++11。** C++14 放宽函数体限制；C++20 继续扩展可用于常量求值的操作。声明不保证每次调用都在编译期执行。

### static_assert [C++11] <!-- entry: feature-6 -->

关键词：static_assert C++11 标准版本

**首次标准化：C++11。** 省略诊断字符串的单参数形式从 C++17 起可用。

### nullptr [C++11] <!-- entry: feature-7 -->

关键词：nullptr C++11 标准版本

**首次标准化：C++11。** 空指针字面量；不要与整数 0 的类型混为一谈。

### enum class [C++11] <!-- entry: feature-8 -->

关键词：enum class C++11 标准版本

**首次标准化：C++11。** 有作用域枚举。

### auto 类型推导 [C++11] <!-- entry: feature-10 -->

关键词：auto 类型推导 C++11 标准版本

**首次标准化：C++11。** C++14 才支持普通函数返回类型推导；C++20 才支持 `auto` 形参的简写函数模板。

### decltype [C++11] <!-- entry: feature-11 -->

关键词：decltype C++11 标准版本

**首次标准化：C++11。** `decltype(auto)` 从 C++14 起可用。

### noexcept [C++11] <!-- entry: feature-12 -->

关键词：noexcept C++11 标准版本

**首次标准化：C++11。** 从 C++17 起异常说明成为函数类型的一部分。

### override / final [C++11] <!-- entry: feature-13 -->

关键词：override / final C++11 标准版本

**首次标准化：C++11。** 用于虚函数覆盖检查、限制覆盖或继承。

### alignas / alignof [C++11] <!-- entry: feature-14 -->

关键词：alignas / alignof C++11 标准版本

**首次标准化：C++11。** 对齐要求与查询。

### 原始字符串字面量 [C++11] <!-- entry: feature-15 -->

关键词：原始字符串字面量 C++11 标准版本

**首次标准化：C++11。** 如 `R"(text)"`；不负责字符编码转换。

### <cstdint> 固定宽度整数 [C++11] <!-- entry: feature-22 -->

关键词：<cstdint> 固定宽度整数 C++11 标准版本

**首次标准化：C++11。** 精确宽度类型仅在实现提供对应整数类型时存在。

### std::array [C++11] <!-- entry: feature-23 -->

关键词：std::array C++11 标准版本

**首次标准化：C++11。** 固定大小容器。

### 标准智能指针与 std::make_shared [C++11] <!-- entry: feature-24 -->

关键词：标准智能指针与 std::make_shared C++11 标准版本

**首次标准化：C++11。** `unique_ptr`、`shared_ptr`、`weak_ptr`、`enable_shared_from_this`；不要据此把所有相关辅助函数都标为 C++11。

### 移动语义 / std::move / std::forward [C++11] <!-- entry: feature-27 -->

关键词：移动语义 / std::move / std::forward C++11 标准版本

**首次标准化：C++11。** `std::move` 本身执行类型转换，不直接搬运资源。

### std::function [C++11] <!-- entry: feature-28 -->

关键词：std::function C++11 标准版本

**首次标准化：C++11。** 可调用对象包装；可能分配内存。

### std::chrono [C++11] <!-- entry: feature-29 -->

关键词：std::chrono C++11 标准版本

**首次标准化：C++11。** 如 duration、time_point、steady_clock；不是所有 chrono 后增 API 都属于 C++11。

## C++14 新特性 <!-- category: cpp-14 -->

### std::make_unique [C++14] <!-- entry: feature-25 -->

关键词：std::make_unique C++14 标准版本

**首次标准化：C++14。** 晚于 C++11 的 `std::unique_ptr`。

### chrono 时长字面量 [C++14] <!-- entry: feature-30 -->

关键词：chrono 时长字面量 C++14 标准版本

**首次标准化：C++14。** 如 `100ms`；需要相应头文件与 `std::chrono_literals`。

## C++17 新特性 <!-- category: cpp-17 -->

### if / switch 初始化语句 [C++17] <!-- entry: feature-4 -->

关键词：if / switch 初始化语句 C++17 标准版本

**首次标准化：C++17。** 如 if (auto x = read(); x.ok())；不同于条件中声明变量。

### 结构化绑定 [C++17] <!-- entry: feature-9 -->

关键词：结构化绑定 C++17 标准版本

**首次标准化：C++17。** 如 `auto [a, b] = value;`。

### [[nodiscard]] [C++17] <!-- entry: feature-16 -->

关键词：[[nodiscard]] C++17 标准版本

**首次标准化：C++17。** 带说明字符串的形式从 C++20 起可用。

### [[maybe_unused]] [C++17] <!-- entry: feature-17 -->

关键词：[[maybe_unused]] C++17 标准版本

**首次标准化：C++17。** 抑制有意未使用实体的相关诊断。

### if constexpr [C++17] <!-- entry: feature-18 -->

关键词：if constexpr C++17 标准版本

**首次标准化：C++17。** 编译期分支；与普通 `if` 不同。

### enable_shared_from_this::weak_from_this [C++17] <!-- entry: feature-26 -->

关键词：enable_shared_from_this::weak_from_this C++17 标准版本

**首次标准化：C++17。** `shared_from_this()` 从 C++11 起已有。

### std::string_view [C++17] <!-- entry: feature-31 -->

关键词：std::string_view C++17 标准版本

**首次标准化：C++17。** 非拥有视图；其 `starts_with` / `ends_with` 是 C++20 新增。

### std::optional / std::nullopt [C++17] <!-- entry: feature-33 -->

关键词：std::optional / std::nullopt C++17 标准版本

**首次标准化：C++17。** 可选值；不自带错误原因。

### std::variant / std::visit [C++17] <!-- entry: feature-34 -->

关键词：std::variant / std::visit C++17 标准版本

**首次标准化：C++17。** 类型安全的可辨识联合与访问。

### std::any [C++17] <!-- entry: feature-35 -->

关键词：std::any C++17 标准版本

**首次标准化：C++17。** 保存可复制类型的类型擦除值容器。

### std::from_chars / std::to_chars [C++17] <!-- entry: feature-36 -->

关键词：std::from_chars / std::to_chars C++17 标准版本

**首次标准化：C++17。** 整数及浮点重载均在 C++17 标准化；旧标准库的浮点支持可能滞后。

### std::byte [C++17] <!-- entry: feature-37 -->

关键词：std::byte C++17 标准版本

**首次标准化：C++17。** 字节枚举类型，不是整数算术类型。

### std::pmr / 多态内存资源 [C++17] <!-- entry: feature-38 -->

关键词：std::pmr / 多态内存资源 C++17 标准版本

**首次标准化：C++17。** 包括 memory_resource、polymorphic_allocator 与标准内存资源。

### std::destroy_at [C++17] <!-- entry: feature-39 -->

关键词：std::destroy_at C++17 标准版本

**首次标准化：C++17。** 从 C++20 起可用于常量求值，并支持数组。

### std::launder [C++17] <!-- entry: feature-41 -->

关键词：std::launder C++17 标准版本

**首次标准化：C++17。** 满足前提时获取指向新对象的指针，不是任意对象重用的修复工具。

## C++20 新特性 <!-- category: cpp-20 -->

### consteval / constinit [C++20] <!-- entry: feature-19 -->

关键词：consteval / constinit C++20 标准版本

**首次标准化：C++20。** 前者约束立即函数调用；后者要求静态或线程存储期变量满足静态初始化，不表示不可修改。

### Concepts / requires / <concepts> [C++20] <!-- entry: feature-20 -->

关键词：Concepts / requires / <concepts> C++20 标准版本

**首次标准化：C++20。** 语言约束与标准库概念；`std::concepts` 不是标准命名空间。

### 协程语言支持 [C++20] <!-- entry: feature-21 -->

关键词：协程语言支持 C++20 标准版本

**首次标准化：C++20。** 语言支持不等于标准库提供通用异步任务运行时。

### string / string_view 的前后缀检查 [C++20] <!-- entry: feature-32 -->

关键词：string / string_view 的前后缀检查 C++20 标准版本

**首次标准化：C++20。** `starts_with` / `ends_with`。

### std::construct_at [C++20] <!-- entry: feature-40 -->

关键词：std::construct_at C++20 标准版本

**首次标准化：C++20。** 不能与 C++98 已有的 placement new 混为同一引入版本。

### std::span [C++20] <!-- entry: feature-42 -->

关键词：std::span C++20 标准版本

**首次标准化：C++20。** 连续序列的非拥有视图；不自动延长底层对象生命周期。

### std::format / std::format_to [C++20] <!-- entry: feature-43 -->

关键词：std::format / std::format_to C++20 标准版本

**首次标准化：C++20。** 需标准库实现支持；仅启用编译器语言选项并不足够。

### std::ranges 基础设施与算法 [C++20] <!-- entry: feature-44 -->

关键词：std::ranges 基础设施与算法 C++20 标准版本

**首次标准化：C++20。** 后续视图与算法仍需逐项核对版本，例如 `ranges::to` 为 C++23。

## C++23 新特性 <!-- category: cpp-23 -->

### std::expected / std::unexpected [C++23] <!-- entry: feature-45 -->

关键词：std::expected / std::unexpected C++23 标准版本

**首次标准化：C++23。** 此处 unexpected 指 `<expected>` 中的类模板，而非旧异常处理函数。

### std::print / std::println [C++23] <!-- entry: feature-46 -->

关键词：std::print / std::println C++23 标准版本

**首次标准化：C++23。** 定义于 `<print>`；不同于 C++20 的 `std::format`。

## 使用与选型 <!-- category: usage -->

### 智能指针如何选 [C++11 / C++14] <!-- entry: ownership-choice -->

关键词：unique_ptr shared_ptr weak_ptr make_unique make_shared 所有权 循环引用

独占资源优先 `std::unique_ptr`（C++11），创建对象优先 `std::make_unique`（C++14）。确有共同延长生命周期需求时使用 `std::shared_ptr`（C++11），观察共享对象用 `std::weak_ptr`（C++11），访问前调用 `lock()`。

共享所有权不保证所指对象的线程安全。引用环需要在合适的非拥有边使用 weak_ptr；裸指针不要自行交给多个独立 shared_ptr。

### 借用视图如何选 [C++17 / C++20] <!-- entry: view-choice -->

关键词：string_view span 生命周期 悬空 借用

文本片段用 `std::string_view`（C++17），连续元素序列用 `std::span<T>`（C++20）。两者均不拥有内存。不得返回指向局部对象的视图；底层容器重新分配后需重新取得视图。

string_view 不保证以空字符结尾；传给需要 C 字符串的接口之前先确认终止符与有效范围。

### 可选结果与错误结果 [C++17 / C++23] <!-- entry: result-choice -->

关键词：optional expected nullopt unexpected 错误 返回值

只有“有值或无值”时用 `std::optional<T>`（C++17）；失败需要原因时可用 `std::expected<T, E>`（C++23）。访问前检查状态；`*result` 不替代失败分支处理。

```cpp
std::optional<int> find_port(bool found) {
    if (!found) return std::nullopt;
    return 8080;
}
```

### 标准版本与扩展边界 <!-- entry: standard-boundary -->

关键词：C++11 C++14 C++17 C++20 C++23 标准 POSIX Boost fmt

POSIX、Boost、fmt 等不是 ISO C++ 标准库。第三方库提供同名或相似功能不表示标准功能已被当前工具链实现。迁移时分别核对头文件、命名空间、行为与最低版本。

核对来源：[cppreference 编译器支持](https://en.cppreference.com/w/cpp/compiler_support.html)、[特性测试宏](https://en.cppreference.com/w/cpp/feature_test.html)、[WG21 标准入口](https://isocpp.org/std/the-standard)。
