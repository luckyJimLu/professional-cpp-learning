# C++ 语言速查

独立于 C 语言小册子。每个新特性标明首次进入 ISO C++ 标准的版本；首次版本不代表后续所有重载与成员都可用。主 Lab 使用 C++23，具体库支持仍需核对工具链。按主题章节查写法，按版本章节查首次标准化、引入原因、应用场景与使用边界。“引入原因”按该特性所解决的实际问题说明。

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

关键词：static extern inline ODR thread_local extern C 链接 编译器实现 底层机制 深入讨论

| 声明位置 | 含义 |
| --- | --- |
| 函数内 `static T x;` | 静态存储期；需要动态初始化时首次控制流经过声明才初始化 |
| 命名空间 `static` 函数/变量 | 内部链接，仅当前翻译单元可见 |
| 类内 `static` 成员 | 属于类；静态成员函数没有 this |
| `extern int total;` | 通常仅声明；`extern int total = 1;` 是定义 |
| `inline` 函数 | 满足 ODR 条件时可在多个翻译单元定义，不承诺机器码内联 |
| `inline static int total{};` | 类内定义的内联变量，C++17 |

局部 static 的初始化自 C++11 起有线程安全保证，之后对对象的读写并不自动安全。`thread_local`（C++11）表示每线程一份对象，不承诺所有对象都在线程启动时立刻构造。`extern "C"` 指定语言链接，不把 C++ 类变成 C 兼容接口。

**引入原因：** C++11 thread_local 直接表达每线程状态，并保证局部 static 的相应初始化安全；C++17 inline 变量简化头文件中的共享定义。

**应用场景：** 线程局部暂存区、函数内按需初始化的对象、头文件库中的共享状态或常量；并发读写与资源占用仍要单独审计。

**实现机制：** C++11 局部静态对象的动态初始化常以守卫变量和运行库协议完成；C++17 inline 变量常利用弱符号或 COMDAT 等目标格式机制合并。

**深入讨论：** 初始化安全不等于后续访问线程安全；inline 允许符合 ODR 的多处定义，不允许各翻译单元随意给出不同定义。

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

关键词：module export import std 模块 BMI 编译器实现 底层机制 深入讨论

```cpp
// C++20 命名模块的接口单元；构建方式取决于工具链
export module arithmetic;
export int add(int a, int b) { return a + b; }
```

模块语言机制在 C++20 引入，标准库命名模块 `std` / `std.compat` 在 C++23 引入。`import std;` 需要编译器、标准库和构建系统共同支持；通常还需预构建模块产物，不能只改一行源码。

命名模块不导出宏；头单元的宏规则不同。模块能改善依赖隔离，但不保证任意工程编译更快。初学者可先使用 include。

**引入原因：** 改善文本包含带来的依赖传播、重复解析和宏耦合，让接口导出成为语言机制；C++23 再提供标准库命名模块。

**应用场景：** 有完整工具链支持的多模块库与大型工程；逐步隔离实现细节，而非仅为了少写 include。

**实现机制：** 前端把模块接口语义序列化为 BMI/CMI 等专用产物，导入者加载声明信息；目标文件仍需链接。构建工具须按模块依赖安排顺序。

**深入讨论：** 模块产物常绑定编译器、版本和选项，不是通用二进制格式；模块不自动解决 ABI 或静态初始化顺序。

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

**引入原因：** C++14 的分隔符与二进制字面量提升数值可读性；C++20 的 char8_t 给 UTF-8 代码单元独立类型，减少与普通 char 接口的无意混用。

**应用场景：** 标志位掩码、大整数配置和明确使用 UTF-8 的文本边界；编码与普通字节接口的转换要显式设计。

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

**引入原因：** C++11 列表初始化提供统一入口和窄化检查；C++20 指定初始化进一步让聚合配置直接写出字段意图。

**应用场景：** 参数较多但仍适合聚合的配置对象；如只覆盖 timeout 与 tls，其他字段保留默认成员初始值。

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

**引入原因：** auto 减少重复类型；decltype 表达依赖表达式的类型；C++14 的 decltype(auto) 让推导遵循 decltype 规则。

**应用场景：** 泛型包装器确需保留返回引用时使用 decltype(auto)；普通结果副本优先 auto，避免无意借用。

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

**引入原因：** enum class 提供类型隔离；using enum 为局部枚举分支减少冗长限定；to_underlying 避免重复写底层类型转换。

**应用场景：** 协议状态的类型安全建模，在序列化边界显式取底层值；using enum 适合名字不会冲突的小作用域。

### 按位转换 std::bit_cast [C++20] <!-- entry: bit-cast -->

关键词：bit_cast bit memcpy reinterpret_cast 对象表示 编译器实现 底层机制 深入讨论

`std::bit_cast<To>(from)` 定义于 `<bit>`，按对象表示创建 To 值；要求两种类型大小相同且均为 trivially copyable。

它不转换数值单位，不校正字节序，也不保证任意位模式都能表示合法的 To 值。对 padding、未初始化位和无对应目标值的情况需核对标准规则；不要把任意指针或网络字节机械 bit_cast 成业务对象。

**引入原因：** 为满足要求的类型提供按值复制对象表示的标准接口，避免用 union 活跃成员切换或错误的指针重解释读取。

**应用场景：** 按明确表示规则检查浮点位模式，或在底层组件中转换同大小的 trivially copyable 表示；仍需判断目标值是否合法。

**实现机制：** 库接口配合内建或等效字节复制，检查大小与可平凡复制等要求，后端可用寄存器传送。

**深入讨论：** 它不是数值转换，任意位模式不一定在目标类型有效；常量求值还有附加限制。

### 三路比较与默认比较 [C++20] <!-- entry: three-way-comparison -->

关键词：spaceship operator <=> compare strong_ordering partial_ordering NaN 编译器实现 底层机制 深入讨论

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

**引入原因：** 集中表达排序关系，并让合适的值类型按成员默认比较，减少分别实现多个关系运算符时的不一致。

**应用场景：** 坐标、版本号等明确具备字典序语义的值对象；不是所有业务对象都应自动按全部成员比较。

**实现机制：** 前端处理重写候选；默认比较按顺序比较基类与成员，库提供比较类别类型。

**深入讨论：** 浮点 NaN 可为 unordered，不能统一压成 -1/0/1；默认比较不是整对象 memcmp。

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

关键词：lambda 捕获 this mutable 泛型 初始化捕获 悬空 回调 编译器实现 底层机制 深入讨论

```cpp
int total = 0;
auto add = [&total](int n) { total += n; }; // C++11，借用 total
auto task = [p = std::make_unique<int>(7)] { return *p; }; // C++14
```

`[x]` 保存副本，`[&x]` 借用；引用捕获不得超出源对象生命周期。`[this]` 保存 this 指针，不延长对象生命期；`[*this]`（C++17）复制当前对象，是否合适取决于类型语义。

初始化捕获和 auto 形参的泛型 lambda 从 C++14 起支持；显式模板形参列表从 C++20 起。mutable 允许修改按值捕获的成员，不会给闭包添加线程同步。

**引入原因：** C++14 初始化捕获支持为闭包构造新状态、移动独占资源；泛型形参让一个闭包适配多类型；C++17 的 *this 捕获可表达对象副本。

**应用场景：** 把 unique_ptr 移入延迟任务，或写可复用的算法谓词；需要独立快照时先确认复制当前对象符合业务语义。

**实现机制：** C++14 初始化捕获将初始化式结果存为闭包状态，可移入 unique_ptr；C++17 [*this] 复制对象，而非只复制 this 指针。

**深入讨论：** 对象副本若仍包含借用指针，复制 *this 也不会消除所有悬空风险。

**源码与二进制实战：** [五维深度拆解与实测实验](?view=topics&topic=docs/cpp-implementation-deep-dive.md)，对照布局、教学 C 模型、指令和适用边界。

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

**引入原因：** 把不可忽略、弃用、有意贯穿及分支倾向等意图交给编译器，而不是只留在无法检查的注释中。

**应用场景：** 接口演进时用 deprecated 指明替代 API；有意贯穿的 switch 写 fallthrough；用 nodiscard 标出重要返回结果。

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

**源码与二进制实战：** [五维深度拆解与实测实验](?view=topics&topic=docs/cpp-implementation-deep-dive.md)，对照布局、教学 C 模型、指令和适用边界。

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

**引入原因：** C++11 显式转换函数限制意外转换；C++20 默认比较减少重复关系逻辑；C++23 多参数下标自然表达多维访问。

**应用场景：** 句柄用显式 bool 表示有效性，值对象提供合适的比较，矩阵用 operator[](row, column) 表达位置。

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

**引入原因：** C++17 try_emplace 区分“不覆盖的原位插入”，insert_or_assign 明确“插入或覆盖”；C++20 contains 直接表达存在性查询。

**应用场景：** 缓存只在缺键时建立条目，配置表更新已有值，或只判断某个键是否存在；需要值时通常直接 find。

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

**引入原因：** C++20 的容器 erase/erase_if 把常见的算法移动尾部与容器擦除组合为直接表达意图的操作，减少遗漏真正擦除的错误。

**应用场景：** 清理失效记录、删除满足条件的序列元素；去重仍需选择相邻去重、排序去重或保序去重的具体策略。

### Ranges 视图与惰性求值 [C++20 / C++23] <!-- entry: range-views -->

关键词：views filter transform ranges to 惰性 视图 生命周期

```cpp
auto positive = values | std::views::filter([](int x) { return x > 0; });
for (int x : positive) { /* 遍历时才应用过滤 */ }
```

包含 `<ranges>`。view 描述范围，不一定拥有元素；是否拥有取决于具体视图和构造来源，不能简单说“所有 view 都不拥有”。避免借用已销毁容器，修改底层容器也可能破坏遍历条件。

`std::ranges::to<std::vector>()` 是 C++23，不属于 C++20 的基础 Ranges。C++23 的 join_with、zip 等后增适配器需分别确认支持。

**引入原因：** C++20 视图把筛选、转换等范围操作组合为可遍历管线，按需计算；C++23 ranges::to 简化把结果物化为容器。

**应用场景：** 只遍历筛选结果时用惰性管线；需要长期保存且独立于源对象时，显式收集为拥有型容器。

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

**引入原因：** 统一常见路径与文件系统操作的标准接口，减少为每个平台重复拼装路径和目录遍历。

**应用场景：** 配置路径组合、枚举目录、创建工作目录；需要控制失败传播时选择适用的 error_code 重载。

## 异常安全与并发 <!-- category: concurrency -->

### 异常捕获与安全保证 [C++98 / C++11] <!-- entry: exception-safety -->

关键词：exception try catch throw RAII basic strong guarantee terminate

按具体类型到一般类型的顺序 catch，常用 `catch (const std::exception& e)` 避免切片；`throw;` 保留当前异常，`throw e;` 可能按静态类型复制。自定义非标准异常不会被 std::exception 捕获，必要时在边界用 catch(...) 并执行明确策略。

- **基本保证**：失败后不泄漏资源、不破坏不变量。
- **强保证**：失败无可观察状态改变。
- **不抛保证**：操作不传播异常。

RAII 保证已构造局部对象的退出清理，但不会自动回滚所有业务修改。析构期间再抛异常可能触发 terminate；禁异常工具链需采用不同错误协议。

### thread、jthread 与停止请求 [C++11 / C++20] <!-- entry: threads-jthread -->

关键词：thread jthread join detach stop_token request_stop 线程 生命周期 编译器实现 底层机制 深入讨论

std::thread（C++11）销毁时若仍 joinable 会 terminate；所有成功创建的线程都需有明确 join/detach 策略。detach 不管理被借用对象的生命周期。

std::jthread（C++20）在析构时对 joinable 线程请求停止并 join。停止是协作式的，不会强杀线程；若任务不响应停止或卡在阻塞操作，析构仍可能一直等待。任务函数抛出未捕获异常仍会 terminate。

捕获变量须比线程使用活得更久；并发访问普通对象要遵守同步规则。不是任意代码换成 jthread 就永远不会崩溃。

**引入原因：** C++11 thread 提供标准线程入口；C++20 jthread 将请求停止和汇合纳入对象退出流程，减少漏 join 与分散的线程所有权管理。

**应用场景：** 具有清晰作用域的后台工作，配合 stop_token 轮询或响应停止；不适合假定析构时间必须有硬上限的路径。

**实现机制：** thread 封装系统线程，jthread 组合协作停止状态与析构管理，stop_token 常引用共享停止状态。

**深入讨论：** 析构请求停止并 join，不抢占杀死业务代码；任务不响应请求时析构仍可能阻塞。

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

**引入原因：** 标准 mutex 为共享状态提供互斥协议；RAII 锁把释放绑定到作用域，C++17 scoped_lock 进一步统一多锁获取。

**应用场景：** 保护必须共同更新的一组字段，异常退出时释放锁；条件变量等待使用可解锁并重加锁的 unique_lock。

### atomic、内存序与 volatile [C++11] <!-- entry: atomics -->

关键词：atomic memory_order relaxed lock-free volatile 数据竞争 同步 编译器实现 底层机制 深入讨论

```cpp
std::atomic<int> completed{0};
completed.fetch_add(1, std::memory_order_relaxed);
```

包含 `<atomic>`。默认原子操作使用顺序一致性；relaxed 只适合不承担跨对象发布/可见性协议的情况，不能用来自动发布普通数据。

原子操作不保证无锁，可查询 is_lock_free() 或 C++17 的 is_always_lock_free。多个原子操作也不自动组成一个不可分割事务。volatile 不提供线程同步或原子性；访问共享普通变量发生未同步冲突可能是数据竞争和未定义行为。

**引入原因：** 在 C++ 内存模型中定义跨线程原子访问和内存序，使简单共享状态无需依赖 volatile 或平台私有指令。

**应用场景：** 独立计数器、状态标志，以及经证明正确的发布/获取协议；复杂多字段不变量通常更适合互斥量。

**实现机制：** 库原子接口经内建降低为带内存序的操作，后端选目标指令或库回退。

**深入讨论：** atomic<T> 不普遍 lock-free；release/acquire 需建立相应同步关系才发布关联数据。缓存一致性不等同于语言层 happens-before。

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

关键词：列表初始化 C++11 标准版本 编译器实现 底层机制 深入讨论

**首次标准化：C++11。** 包括直接列表初始化；窄化检查及 initializer_list 优先规则须单独注意。

**引入原因：** 统一多种初始化写法，并在列表初始化时暴露窄化转换。

**应用场景：** 声明计数、配置聚合和固定数组，如 `int retries{3};`。

**使用边界：** 容器的 `{3, 7}` 可能选择 initializer_list 构造，与 `(3, 7)` 意义不同。

**实现机制（标准要求与常见实现）：** 前端先按列表初始化规则进行重载决议，并检查窄化；选中 initializer_list 时，通常先生成一个 const 元素后备数组，再把指针与长度交给库包装。

**深入讨论：** 为何移动专用对象放入 initializer_list 容易失败？后备数组的元素为 const，从中构造目标通常需要复制；花括号不等于逐项完美转发。

### lambda 表达式 [C++11] <!-- entry: feature-1 -->

关键词：lambda 表达式 C++11 标准版本 编译器实现 底层机制 深入讨论

**首次标准化：C++11。** 泛型 lambda（auto 形参）、初始化捕获从 C++14 起可用；显式模板形参列表从 C++20 起可用。

**引入原因：** 让短小可调用逻辑就地表达，避免为每个排序规则或回调额外定义函数对象。

**应用场景：** 排序比较器、事件回调和算法谓词；C++14 的初始化捕获还可把 unique_ptr 移入任务。

**使用边界：** 引用捕获和 this 捕获不延长对象生命期；泛型 lambda 并不自动承担异步调度。

**实现机制（标准要求与常见实现）：** 前端为每个 lambda 生成独有的闭包类型，按值捕获对应成员，operator() 承载函数体；按引用捕获的物理表示由实现决定。C++14 泛型 lambda 的调用运算符是模板。

**深入讨论：** 无捕获 lambda 可转换成合适的函数指针；有捕获对象需要携带状态。内联后闭包可能完全消失，不能据源码推断必有一次间接调用。

**源码与二进制实战：** [五维深度拆解与实测实验](?view=topics&topic=docs/cpp-implementation-deep-dive.md)，对照布局、教学 C 模型、指令和适用边界。

### = default / = delete [C++11] <!-- entry: feature-2 -->

关键词：= default / = delete C++11 标准版本 编译器实现 底层机制 深入讨论

**首次标准化：C++11。** 显式默认化与删除函数。

**引入原因：** 明确区分“需要编译器生成的语义”和“禁止调用的接口”，替代难维护的手写空实现或只声明不定义技巧。

**应用场景：** 资源类禁止复制；值类型用 = default 表达适用的默认构造或拷贝/移动语义；用删除重载拒绝不合适的参数类型。

**使用边界：** default 函数仍可能因成员/基类限制被定义为删除；用户声明的析构会影响隐式移动生成。

**实现机制（标准要求与常见实现）：** 前端根据成员与基类合成默认特殊成员，或把函数标为 deleted；删除函数仍参与重载决议，选中后才报错。

**深入讨论：** default 不保证可用：成员不可复制时，默认复制函数也可能被定义为删除。平凡复制可能降低为批量复制，不应据此跳过非平凡对象的构造。

### 范围 for [C++11] <!-- entry: feature-3 -->

关键词：范围 for C++11 标准版本 编译器实现 底层机制 深入讨论

**首次标准化：C++11。** 带初始化语句的范围 for 从 C++20 起可用。

**引入原因：** 减少遍历时手写 begin/end、下标和终止条件造成的错误。

**应用场景：** 只读遍历用 `for (const auto& item : items)`；确需修改元素时用 `auto&`。

**使用边界：** 按值遍历可能复制；修改容器结构可能使遍历失效，不能假设临时范围的任意借用都安全。

**实现机制（标准要求与常见实现）：** 前端以隐藏的范围变量、begin/end 和循环降低范围 for；数组、成员 begin/end、ADL 查找采用标准规定的不同路径。

**深入讨论：** auto 元素会复制，auto& 才引用；优化后可与手写迭代器循环相同。C++23 扩展了范围初始化器中部分临时对象的生命周期，但不能救回被调用函数内部已销毁的对象。

### constexpr [C++11] <!-- entry: feature-5 -->

关键词：constexpr C++11 标准版本 编译器实现 底层机制 深入讨论

**首次标准化：C++11。** C++14 放宽函数体限制；C++20 继续扩展可用于常量求值的操作。声明不保证每次调用都在编译期执行。

**引入原因：** 用同一套 C++ 类型与函数规则表达可常量求值的计算，减少宏及运行期才暴露的常量错误。

**应用场景：** 数组大小、协议常量、编译期查表；同一个函数也可服务运行期输入。

**使用边界：** constexpr 函数并非每次调用都在编译期执行；需要常量表达式的上下文才施加相应要求。

**实现机制（标准要求与常见实现）：** 编译器具有常量表达式求值器，按语言规则解释表达式并跟踪对象生命周期；需要常量表达式的位置不合法则诊断。普通调用仍可生成机器码。

**深入讨论：** 编译期求值不同于优化器常量折叠：前者决定程序是否合法，后者遵守 as-if 规则改变代码。递归与循环可能触及实现的求值步数限制。

**源码与二进制实战：** [五维深度拆解与实测实验](?view=topics&topic=docs/cpp-implementation-deep-dive.md)，对照布局、教学 C 模型、指令和适用边界。

### static_assert [C++11] <!-- entry: feature-6 -->

关键词：static_assert C++11 标准版本 编译器实现 底层机制 深入讨论

**首次标准化：C++11。** 省略诊断字符串的单参数形式从 C++17 起可用。

**引入原因：** 把可在编译期确定的不合法条件尽早变成编译错误，而非运行期断言或隐晦的模板错误。

**应用场景：** 检查模板参数、缓冲区容量和布局前提，例如 `static_assert(sizeof(Header) <= 64);`。

**使用边界：** 不能检查运行时输入；结构体 sizeof 合适也不等于可直接按网络协议序列化。

**实现机制（标准要求与常见实现）：** 前端求值布尔常量表达式，失败时在编译阶段诊断，不生成运行时检查分支。

**深入讨论：** 它只能证明给定编译配置下的静态条件，不能检查文件内容或网络输入；不能替代运行时错误处理。

### nullptr [C++11] <!-- entry: feature-7 -->

关键词：nullptr C++11 标准版本 编译器实现 底层机制 深入讨论

**首次标准化：C++11。** 空指针字面量；不要与整数 0 的类型混为一谈。

**引入原因：** 让空指针拥有独立类型，避免 NULL/0 在指针与整数重载间产生歧义或选择错误重载。

**应用场景：** 指针默认状态、可选借用和与 C 接口交互时传空指针。

**使用边界：** 非空不等于指向活对象；nullptr 不替代生命周期和越界检查。

**实现机制（标准要求与常见实现）：** 前端赋予 nullptr 独立的 std::nullptr_t 类型，重载决议应用空指针转换；后端生成目标平台对应的空指针表示。

**深入讨论：** nullptr 不与整数 0 具有相同类型；空指针的字节表示不保证全零，不要把 memset 当作可移植的指针初始化。

### enum class [C++11] <!-- entry: feature-8 -->

关键词：enum class C++11 标准版本 编译器实现 底层机制 深入讨论

**首次标准化：C++11。** 有作用域枚举。

**引入原因：** 隔离枚举项名字，并阻止枚举自动当作整数参与无关运算。

**应用场景：** 状态机、错误码和配置选项；显式底层类型可表达存储约束。

**使用边界：** 不自动检查状态转移是否合法，也不自动提供按位组合运算。

**实现机制（标准要求与常见实现）：** 作用域枚举的名称查找与隐式转换限制由前端检查；后端按底层整数类型存储与运算，不需要运行时类型标签。

**深入讨论：** enum class 默认底层类型为 int，也可指定。类型隔离在编译期完成，不等于运行时自动验证从外部字节转换来的枚举值。

### auto 类型推导 [C++11] <!-- entry: feature-10 -->

关键词：auto 类型推导 C++11 标准版本 编译器实现 底层机制 深入讨论

**首次标准化：C++11。** C++14 才支持普通函数返回类型推导；C++20 才支持 `auto` 形参的简写函数模板。

**引入原因：** 减少重复写出已由初始化表达式确定的类型，尤其是复杂迭代器与模板类型。

**应用场景：** 接收工厂返回值、迭代器或 lambda；例如 `auto owner = std::make_unique<Widget>();`。

**使用边界：** auto 通常丢弃引用和顶层 const，需要借用时明确写 auto& / const auto&；也别让推导掩盖单位或有符号性。

**实现机制（标准要求与常见实现）：** 前端依据初始化表达式及推导规则确定静态类型，随后与显式声明一样进行代码生成，不携带动态类型盒子。

**深入讨论：** auto、auto&、auto&& 推导结果不同；auto x={1,2} 与 auto x{1} 也不同。观察声明的 AST 或 static_assert 比比较汇编更适合确认类型。

### decltype [C++11] <!-- entry: feature-11 -->

关键词：decltype C++11 标准版本 编译器实现 底层机制 深入讨论

**首次标准化：C++11。** `decltype(auto)` 从 C++14 起可用。

**引入原因：** 在泛型代码中表达依赖某个表达式的类型，而不实际执行该表达式。

**应用场景：** 模板返回类型、类型别名和精确保留引用的转发接口。

**使用边界：** decltype(x) 与 decltype((x)) 可能不同；decltype(auto) 返回局部引用会悬空。

**实现机制（标准要求与常见实现）：** 前端检查未求值操作数；未加括号的名称/成员访问采用声明类型规则，其余表达式依据值类别得到 T、T& 或 T&&。

**深入讨论：** decltype((x)) 往往是引用；未求值不代表不做语义检查。decltype(auto) 原样使用这套规则，返回局部变量引用可能悬空。

### noexcept [C++11] <!-- entry: feature-12 -->

关键词：noexcept C++11 标准版本 编译器实现 底层机制 深入讨论

**首次标准化：C++11。** 从 C++17 起异常说明成为函数类型的一部分。

**引入原因：** 为异常传播边界提供可检查的声明，使泛型代码能据此选择符合异常安全要求的操作。

**应用场景：** 不抛出的 swap、析构及真正满足条件的移动操作；模板用条件 noexcept 表达成员操作的能力。

**使用边界：** 不能为了优化无条件添加；异常逃出 noexcept 函数会调用 terminate。

**实现机制（标准要求与常见实现）：** 前端求值异常说明，并在 C++17 起把 noexcept 纳入函数类型体系；后端和异常运行库落实异常逃逸时终止程序的语义。

**深入讨论：** 可能使用异常表与清理入口，也可能采用其他 ABI。noexcept 不是关闭所有异常处理；容器可通过类型特征决定移动还是复制。

### override / final [C++11] <!-- entry: feature-13 -->

关键词：override / final C++11 标准版本 编译器实现 底层机制 深入讨论

**首次标准化：C++11。** 用于虚函数覆盖检查、限制覆盖或继承。

**引入原因：** 用编译器检查覆盖意图，并在设计需要时禁止继续覆盖或继承。

**应用场景：** 插件接口和设备驱动实现写 override；最终实现类或必须锁定的虚函数写 final。

**使用边界：** final 不保证所有调用都被去虚化，也不能替代完整的安全契约。

**实现机制（标准要求与常见实现）：** override 让前端核验基类虚函数签名；final 禁止继续覆盖或派生。虚派发常见实现为虚表与对象中的虚表指针，但标准未规定布局。

**深入讨论：** 优化器知道确切动态类型时可去虚化；final 提供信息而非性能承诺。不要用固定偏移解析不同 ABI 的对象。

**源码与二进制实战：** [五维深度拆解与实测实验](?view=topics&topic=docs/cpp-implementation-deep-dive.md)，对照布局、教学 C 模型、指令和适用边界。

### alignas / alignof [C++11] <!-- entry: feature-14 -->

关键词：alignas / alignof C++11 标准版本 编译器实现 底层机制 深入讨论

**首次标准化：C++11。** 对齐要求与查询。

**引入原因：** 用可移植语法声明和查询对齐要求，减少依赖编译器私有属性。

**应用场景：** 手工存储、对象池和 SIMD 数据布局；为 T 的存储使用 alignas(T)。

**使用边界：** 实现支持的扩展对齐有上限；正确对齐不表示 T 的生命周期已经开始。

**实现机制（标准要求与常见实现）：** 前端检查对齐值并记录布局约束，后端与链接器据此安排栈、静态对象和节；alignof 是类型查询得到的常量。

**深入讨论：** 增加对齐可能增加填充和对象大小；动态存储也需满足对齐。C++17 才引入面向过度对齐类型的标准对齐分配重载体系。

### 原始字符串字面量 [C++11] <!-- entry: feature-15 -->

关键词：原始字符串字面量 C++11 标准版本 编译器实现 底层机制 深入讨论

**首次标准化：C++11。** 如 `R"(text)"`；不负责字符编码转换。

**引入原因：** 减少包含反斜杠、引号和换行的文本在字符串中反复转义的负担。

**应用场景：** 嵌入正则表达式、JSON 样例、路径模板或多行命令文本。

**使用边界：** 原始字符串仍有终止分隔符规则；不会自动校验 JSON、正则语法或编码。

**实现机制（标准要求与常见实现）：** 词法分析器按原始字符串分隔符读取内容，不执行普通反斜杠转义；后续仍形成字符数组字面量。

**深入讨论：** 运行时没有原始字符串解析器；编码、字面量合并和存储仍受相应语言规则约束。

### <cstdint> 固定宽度整数 [C++11] <!-- entry: feature-22 -->

关键词：<cstdint> 固定宽度整数 C++11 标准版本 编译器实现 底层机制 深入讨论

**首次标准化：C++11。** 精确宽度类型仅在实现提供对应整数类型时存在。

**引入原因：** 在接口确实依赖整数宽度时，提供清楚的标准类型名称，而非猜测 int/long 的大小。

**应用场景：** 寄存器字段、文件格式和二进制协议中的 16/32/64 位数值。

**使用边界：** 精确宽度类型可选；类型宽度正确不等于字节序、对齐和对象表示符合协议。

**实现机制（标准要求与常见实现）：** 标准头文件按目标 ABI 将整数名字映射到合适的基础类型，编译器已有整数宽度与表示知识。

**深入讨论：** int32_t 是别名而非序列化协议；没有合适类型时可不提供。fast/least 类型与精确宽度类型的承诺不同。

### std::array [C++11] <!-- entry: feature-23 -->

关键词：std::array C++11 标准版本 编译器实现 底层机制 深入讨论

**首次标准化：C++11。** 固定大小容器。

**引入原因：** 为固定长度连续数组提供容器接口与值语义，减少原生数组退化及整体复制不便。

**应用场景：** 固定采样窗口、查表、固定容量的已构造元素集合；通过 size()/迭代器接入算法。

**使用边界：** 长度是类型的一部分，元素始终存在；它不是可变长度 vector，也不自动让 operator[] 检查越界。

**实现机制（标准要求与常见实现）：** 库模板通常包含原生数组并提供迭代器与成员接口；大小是模板实参，编译器可常量传播长度与展开循环。

**深入讨论：** N=0 需要特殊处理，不能假设布局等同于零长度 C 数组。std::array<int,4> a; 的元素也不会自动清零。

### 标准智能指针与 std::make_shared [C++11] <!-- entry: feature-24 -->

关键词：标准智能指针与 std::make_shared C++11 标准版本 编译器实现 底层机制 深入讨论

**首次标准化：C++11。** `unique_ptr`、`shared_ptr`、`weak_ptr`、`enable_shared_from_this`；不要据此把所有相关辅助函数都标为 C++11。

**引入原因：** 把动态资源的释放责任和共享/独占关系编码到对象中，减少手工 delete、异常泄漏与不明确的所有权。

**应用场景：** unique_ptr 表达独占，shared_ptr 表达确需共同延长生命周期，weak_ptr 表达对共享对象的非拥有观察。

**使用边界：** 优先清晰的独占关系；共享控制块的同步不保护业务对象，也不会自动打破强引用环。

**实现机制（标准要求与常见实现）：** unique_ptr 通常保存指针与删除器；shared_ptr 使用共享控制块记录强/弱计数、删除动作等，make_shared 常将对象与控制块合并分配。

**深入讨论：** 合并分配不是固定布局契约。最后一个强引用销毁对象，弱引用仍可令控制块保留；引用计数同步不使被管理对象线程安全。

### 移动语义 / std::move / std::forward [C++11] <!-- entry: feature-27 -->

关键词：移动语义 / std::move / std::forward C++11 标准版本 编译器实现 底层机制 深入讨论

**首次标准化：C++11。** `std::move` 本身执行类型转换，不直接搬运资源。

**引入原因：** 让类型区分可复用对象与可转移资源的对象，避免不必要深拷贝，并使独占资源可安全转交。

**应用场景：** 容器接收临时对象、工厂返回资源、把 unique_ptr 移入任务；转发引用场景使用 std::forward 保留值类别。

**使用边界：** move 是转换，不保证发生移动；移动后状态依类型契约，不能统一假设为空。

**实现机制（标准要求与常见实现）：** 前端实现右值引用、引用折叠与重载决议；move/forward 是模板转换工具，真正资源转移由被选中的构造或赋值函数实现。

**深入讨论：** 移动 vector 常可转移缓冲区，但分配器条件可能迫使逐元素处理；移动 array 仍逐元素操作。不要笼统称所有 move 为 O(1)。

**源码与二进制实战：** [五维深度拆解与实测实验](?view=topics&topic=docs/cpp-implementation-deep-dive.md)，对照布局、教学 C 模型、指令和适用边界。

### std::function [C++11] <!-- entry: feature-28 -->

关键词：std::function C++11 标准版本 编译器实现 底层机制 深入讨论

**首次标准化：C++11。** 可调用对象包装；可能分配内存。

**引入原因：** 用同一种类型保存不同的可调用对象，让接口不必暴露每个闭包或函数对象的具体类型。

**应用场景：** 需要统一签名、允许运行时替换的回调注册表或策略对象。

**使用边界：** C++11 的 std::function 要求目标可复制，可能分配内存且有间接调用成本；不适合无条件用于硬实时热路径。

**实现机制（标准要求与常见实现）：** 库以类型擦除保存目标，通过管理函数处理调用、复制与销毁；常见实现结合小对象缓冲与堆分配。

**深入讨论：** 缓冲大小及适用条件不统一；大或不合适的目标可能分配。模板直接接收 callable 往往更易内联，但也可能增加实例化代码体积。

**源码与二进制实战：** [五维深度拆解与实测实验](?view=topics&topic=docs/cpp-implementation-deep-dive.md)，对照布局、教学 C 模型、指令和适用边界。

### std::chrono [C++11] <!-- entry: feature-29 -->

关键词：std::chrono C++11 标准版本 编译器实现 底层机制 深入讨论

**首次标准化：C++11。** 如 duration、time_point、steady_clock；不是所有 chrono 后增 API 都属于 C++11。

**引入原因：** 用类型区分时长、单位与时钟时间点，减少裸整数的秒/毫秒混淆和不正确的时钟比较。

**应用场景：** 用 steady_clock 测量间隔/超时，用 system_clock 表示系统日历时间；用 duration_cast 明确单位转换。

**使用边界：** system_clock 可能校时跳变；时长转换可能截断或溢出，不同 clock 的 time_point 不能随意混用。

**实现机制（标准要求与常见实现）：** duration 用计数类型与 ratio 模板表达单位，time_point 包装相对某个时钟的时长；单位换算主要由库模板算术生成。

**深入讨论：** 类型安全不保证不溢出。读取时钟需要平台支持，分辨率、调用成本及是否单调由时钟契约与实现决定。

## C++14 新特性 <!-- category: cpp-14 -->

### std::make_unique [C++14] <!-- entry: feature-25 -->

关键词：std::make_unique C++14 标准版本 编译器实现 底层机制 深入讨论

**首次标准化：C++14。** 晚于 C++11 的 `std::unique_ptr`。

**引入原因：** 把对象创建与 unique_ptr 所有权建立写成一个工厂操作，减少重复类型和显式 new。

**应用场景：** 创建普通独占对象或动态数组，如 `auto p = std::make_unique<Widget>();`。

**使用边界：** 自定义删除器或私有构造函数等场景可能需要其他构造路径；make_unique 不解决共享所有权或对象的线程安全。

**实现机制（标准要求与常见实现）：** 库模板转发参数给 new 表达式，把结果封装进 unique_ptr；数组重载与非数组重载采用不同约束及初始化规则。

**深入讨论：** 安全性来自表达式结构与 RAII，不是特殊 GC。优化器可能内联包装，但分配器成本不能据此忽略。

### chrono 时长字面量 [C++14] <!-- entry: feature-30 -->

关键词：chrono 时长字面量 C++14 标准版本 编译器实现 底层机制 深入讨论

**首次标准化：C++14。** 如 `100ms`；需要相应头文件与 `std::chrono_literals`。

**引入原因：** 把单位直接写进表达式，使超时与周期常量更易读，并保持 chrono 的类型约束。

**应用场景：** 重试间隔 `100ms`、超时 `5s`；配合 `using namespace std::chrono_literals;`。

**使用边界：** 字面量本身不等待；标准库没有为所有自然语言时间单位提供同名后缀。

**实现机制（标准要求与常见实现）：** 字面量后缀解析后调用标准库的字面量运算符，返回相应 duration；通常能在常量求值时形成结果。

**深入讨论：** 10ms 不需要运行时解析文本；单位换算的舍入规则仍适用，整数时长转换可能丢失精度。

## C++17 新特性 <!-- category: cpp-17 -->

### if / switch 初始化语句 [C++17] <!-- entry: feature-4 -->

关键词：if / switch 初始化语句 C++17 标准版本 编译器实现 底层机制 深入讨论

**首次标准化：C++17。** 如 if (auto x = read(); x.ok())；不同于条件中声明变量。

**引入原因：** 把查询结果等临时变量限制在分支作用域内，避免变量泄漏和重复命名。

**应用场景：** map::find 后检查迭代器、解析后判断状态；如 `if (auto it = m.find(key); it != m.end())`。

**使用边界：** 初始化语句总会执行一次；变量同时在相应 else 分支中可见。

**实现机制（标准要求与常见实现）：** 前端把初始化语句的局部变量放入覆盖条件及各分支的作用域；生成正常分支与作用域退出时的析构路径。

**深入讨论：** 这不是新的运行时对象模型；锁对象在整个 if/else 结束才释放，不能误认为条件求值后就解锁。

### 结构化绑定 [C++17] <!-- entry: feature-9 -->

关键词：结构化绑定 C++17 标准版本 编译器实现 底层机制 深入讨论

**首次标准化：C++17。** 如 `auto [a, b] = value;`。

**引入原因：** 为 tuple、pair 和可分解对象提供具名解包，减少 first/second 或手工提取成员的样板。

**应用场景：** 遍历 map 的键值、接收多结果、检查 `auto [it, inserted] = m.emplace(...)`。

**使用边界：** 选择 auto、auto&、const auto& 会影响复制与借用；引用分解不能超出源对象生命周期。

**实现机制（标准要求与常见实现）：** 编译器先建立隐藏的绑定对象，再依数组、tuple 协议或成员分解规则建立各名称；tuple 路径涉及 tuple_size、tuple_element 与 get。

**深入讨论：** auto [a,b] 与 auto& [a,b] 决定隐藏对象是否复制；绑定不是简单地声明若干独立变量，decltype 与取地址行为需要按绑定规则理解。

### [[nodiscard]] [C++17] <!-- entry: feature-16 -->

关键词：[[nodiscard]] C++17 标准版本 编译器实现 底层机制 深入讨论

**首次标准化：C++17。** 带说明字符串的形式从 C++20 起可用。

**引入原因：** 把“不应忽略这个结果”的接口意图交给编译器诊断，减少遗漏错误处理。

**应用场景：** 错误结果、资源句柄、工厂函数和需要使用返回值的纯计算接口。

**使用边界：** 诊断不是强制处理；不能用 nodiscard 代替 RAII 或真实的失败分支。

**实现机制（标准要求与常见实现）：** 前端在声明上记录属性，对丢弃结果的相关表达式建议发出诊断，不改变返回值存储机制。

**深入讨论：** 警告开关与实现影响诊断；显式转换为 void 可表达有意丢弃。nodiscard 不保证调用者处理业务错误。

### [[maybe_unused]] [C++17] <!-- entry: feature-17 -->

关键词：[[maybe_unused]] C++17 标准版本 编译器实现 底层机制 深入讨论

**首次标准化：C++17。** 抑制有意未使用实体的相关诊断。

**引入原因：** 明确表达某个实体在当前构建中可能有意未使用，减少条件编译和调试代码的噪声诊断。

**应用场景：** 仅 Debug 使用的断言变量、平台相关参数和条件启用的辅助声明。

**使用边界：** 先确认未使用是有意行为，不要掩盖遗忘使用的重要结果。

**实现机制（标准要求与常见实现）：** 前端在实体上记录允许未使用的意图，抑制对应未使用诊断；无需添加机器指令。

**深入讨论：** 它不强制保留符号。链接器垃圾回收和优化器仍可移除没有可观察用途的代码。

### if constexpr [C++17] <!-- entry: feature-18 -->

关键词：if constexpr C++17 标准版本 编译器实现 底层机制 深入讨论

**首次标准化：C++17。** 编译期分支；与普通 `if` 不同。

**引入原因：** 让模板按编译期条件选择实现路径，减少标签分派和复杂的重载/SFINAE 样板。

**应用场景：** 为整数与其他类型选择不同实现，或依据类型特征处理可选成员能力。

**使用边界：** 丢弃分支的特殊规则主要作用于模板实例化；不能随意放入语法错误，非模板上下文仍需类型检查。

**实现机制（标准要求与常见实现）：** 模板实例化时根据常量条件选择分支，丢弃分支通常不实例化；解析及某些非依赖语义检查仍先发生。

**深入讨论：** 与普通 if 的死代码优化不同：普通 if 两支仍须满足实例化要求。非模板环境中的 if constexpr 也不能藏任意非法语句。

**源码与二进制实战：** [五维深度拆解与实测实验](?view=topics&topic=docs/cpp-implementation-deep-dive.md)，对照布局、教学 C 模型、指令和适用边界。

### enable_shared_from_this::weak_from_this [C++17] <!-- entry: feature-26 -->

关键词：enable_shared_from_this::weak_from_this C++17 标准版本 编译器实现 底层机制 深入讨论

**首次标准化：C++17。** `shared_from_this()` 从 C++11 起已有。

**引入原因：** 允许 enable_shared_from_this 对象取得非拥有的自我观察句柄，而不必先取得会增加强引用的 shared_ptr。

**应用场景：** 异步 callback 捕获 weak_from_this()，执行时 lock()，对象已销毁则放弃处理。

**使用边界：** 未建立有效共享管理关系时通常得到空 weak_ptr；在构造时取得的空 weak_ptr 不会事后自动绑定到新控制块。

**实现机制（标准要求与常见实现）：** enable_shared_from_this 通常含内部 weak_ptr；合适的 shared_ptr 构造路径建立关联，weak_from_this 复制该弱观察句柄。

**深入讨论：** 构造函数内调用时关联往往尚未建立；它返回空弱引用，而不是稍后自动连接。控制块身份与裸指针地址不是同一个概念。

### std::string_view [C++17] <!-- entry: feature-31 -->

关键词：std::string_view C++17 标准版本 编译器实现 底层机制 深入讨论

**首次标准化：C++17。** 非拥有视图；其 `starts_with` / `ends_with` 是 C++20 新增。

**引入原因：** 给只读文本片段提供统一的非拥有接口，避免为了传参或切片额外构造 string。

**应用场景：** 即时解析命令、协议字段和日志文本；函数内部只在调用期间使用传入视图。

**使用边界：** 不保证空字符终止，也不延长源对象生命期；底层字符串改变可能使视图失效。

**实现机制（标准要求与常见实现）：** 库对象通常为指针和长度，成员操作生成边界内的字符访问；不复制文本，不管理所有权。

**深入讨论：** 优化后可只传寄存器，也可能按 ABI 传栈；不能把两机器字布局当成跨语言 ABI。substr 视图与源对象寿命相关。

### std::optional / std::nullopt [C++17] <!-- entry: feature-33 -->

关键词：std::optional / std::nullopt C++17 标准版本 编译器实现 底层机制 深入讨论

**首次标准化：C++17。** 可选值；不自带错误原因。

**引入原因：** 用类型区分“有值”和“无值”，避免 -1、空字符串等哨兵与有效数据混淆。

**应用场景：** 可选配置、查找结果和可能不存在的字段；通常按值保存对象。

**使用边界：** 无值不携带错误原因；访问前检查状态，要求区分失败原因时考虑 expected 或其他错误协议。

**实现机制（标准要求与常见实现）：** 库通常以带有效标志的原地存储实现，按需构造/析构 T；编译器负责对齐、生命周期及特殊成员优化。

**深入讨论：** optional<T> 不需要为 T 单独分配，但 T 自己可能分配。标志与填充使 sizeof 不等于 sizeof(T)+1 的通用公式。

**源码与二进制实战：** [五维深度拆解与实测实验](?view=topics&topic=docs/cpp-implementation-deep-dive.md)，对照布局、教学 C 模型、指令和适用边界。

### std::variant / std::visit [C++17] <!-- entry: feature-34 -->

关键词：std::variant / std::visit C++17 标准版本 编译器实现 底层机制 深入讨论

**首次标准化：C++17。** 类型安全的可辨识联合与访问。

**引入原因：** 为有限候选类型提供类型安全的可辨识联合，避免 union 与手工标签不一致。

**应用场景：** 解析结果为数值/文本之一，或事件载荷只有少数已知类型；用 visit 分派处理。

**使用边界：** 需处理所有合法候选；某些抛异常的更新可能导致 valueless_by_exception，不能当作总有正常值。

**实现机制（标准要求与常见实现）：** 库保存足够容纳各候选类型的对齐存储与活动索引；visit 可通过分支、跳转表或其他派发结构调用正确重载。

**深入讨论：** 多个 variant 的组合访问可能增加实例化数量和代码体积；布局与派发策略不固定，异常路径还须考虑 valueless_by_exception。

### std::any [C++17] <!-- entry: feature-35 -->

关键词：std::any C++17 标准版本 编译器实现 底层机制 深入讨论

**首次标准化：C++17。** 保存可复制类型的类型擦除值容器。

**引入原因：** 在不预先固定候选类型集合时，提供管理对象生命周期的值类型擦除容器。

**应用场景：** 扩展属性表、配置插件元数据等确需动态类型且保存可复制值的边界。

**使用边界：** 读取要知道实际类型，any_cast 指针形式不匹配返回空；已知类型集合优先考虑 variant。

**实现机制（标准要求与常见实现）：** 库通过类型擦除保存类型信息、复制/销毁操作及对象存储；小对象可能原地放置，大对象可能分配。

**深入讨论：** any_cast 进行类型匹配而非任意隐式转换。实现常使用 RTTI 或内部类型标识，不能假设所有 ABI 都使用同一结构。

### std::from_chars / std::to_chars [C++17] <!-- entry: feature-36 -->

关键词：std::from_chars / std::to_chars C++17 标准版本 编译器实现 底层机制 深入讨论

**首次标准化：C++17。** 整数及浮点重载均在 C++17 标准化；旧标准库的浮点支持可能滞后。

**引入原因：** 提供基于字符范围、独立于 locale 的数值转换接口，避免为简单解析使用流、额外字符串或异常协议。

**应用场景：** 高频解析协议数字、配置字段和生成数值文本；检查返回的 ptr 与 ec。

**使用边界：** from_chars 不自动跳过前导空白；to_chars 不补终止符，需处理容量不足；浮点实现支持可能滞后。

**实现机制（标准要求与常见实现）：** 整数转换通常使用逐位解析、乘加与溢出检查；浮点转换需要舍入正确的数值算法，可配合快速路径和回退路径。

**深入讨论：** 不依赖 locale 不等于没有运算成本。特定浮点算法或 SIMD 优化属于库版本选择；检查 ec 和 ptr 才能判断是否完整解析。

### std::byte [C++17] <!-- entry: feature-37 -->

关键词：std::byte C++17 标准版本 编译器实现 底层机制 深入讨论

**首次标准化：C++17。** 字节枚举类型，不是整数算术类型。

**引入原因：** 把原始字节与字符/算术整数分开，减少二进制缓冲区中的意外算术和文本语义。

**应用场景：** 对象表示、网络报文与二进制 I/O 缓冲区；需要数值时显式 to_integer。

**使用边界：** 不自动处理字节序、容量或生命周期；也不使原本非法的类型重解释合法。

**实现机制（标准要求与常见实现）：** 库定义以 unsigned char 为底层类型的作用域枚举，并提供位运算；前端阻止许多意外算术转换。

**深入讨论：** 最终常生成普通字节指令。类型约束不能自动解决越界、对象生命周期、字节序或任意字节序列的有效性。

### std::pmr / 多态内存资源 [C++17] <!-- entry: feature-38 -->

关键词：std::pmr / 多态内存资源 C++17 标准版本 编译器实现 底层机制 深入讨论

**首次标准化：C++17。** 包括 memory_resource、polymorphic_allocator 与标准内存资源。

**引入原因：** 让相同容器类型在运行时选择内存资源，减少分配器类型向业务接口扩散。

**应用场景：** 短期解析用单调资源、同尺寸对象复用用池资源，或把一组容器的分配归属集中审计。

**使用边界：** 默认资源可能回退到堆；有界内存需明确上游策略，资源必须比使用它的容器活得久。

**实现机制（标准要求与常见实现）：** polymorphic_allocator 持有 memory_resource 指针，将分配/释放委托到运行时资源接口；资源实现可管理池或单调缓冲。

**深入讨论：** 运行时多态通常有间接调用成本；单调资源通常不逐次归还空间。容器仍有元素构造与增长成本，资源寿命必须覆盖使用者。

### std::destroy_at [C++17] <!-- entry: feature-39 -->

关键词：std::destroy_at C++17 标准版本 编译器实现 底层机制 深入讨论

**首次标准化：C++17。** 从 C++20 起可用于常量求值，并支持数组。

**引入原因：** 以标准函数统一表达通过指针结束对象生命周期，简化分配器和泛型存储管理。

**应用场景：** 对象池归还、手工存储槽位销毁；与构造操作按对象生命周期配对。

**使用边界：** 只析构，不释放存储；不得对已销毁对象重复调用，原借用通常不再有效。

**实现机制（标准要求与常见实现）：** 库模板对指针所指对象执行析构；平凡析构可被消除，非平凡析构执行用户清理逻辑。

**深入讨论：** 销毁与释放存储分离。对象池调用 destroy_at 后，不能继续把旧对象当成活对象读写。

### std::launder [C++17] <!-- entry: feature-41 -->

关键词：std::launder C++17 标准版本 编译器实现 底层机制 深入讨论

**首次标准化：C++17。** 满足前提时获取指向新对象的指针，不是任意对象重用的修复工具。

**引入原因：** 为特定存储复用情形提供符合对象模型的指针获取方式，处理旧指针不能按透明替换规则直接代表新对象的情况。

**应用场景：** 经逐项核对可达性等前提的底层对象重建代码；普通业务通常应直接使用构造操作返回的新指针。

**使用边界：** 不分配、不构造，不修复越界、错误类型、未满足生命周期或可达性要求的指针。

**实现机制（标准要求与常见实现）：** 常见库实现调用编译器内建函数，将有关对象身份和可达存储的信息传递给优化器；通常不改变地址数值。

**深入讨论：** 它不是缓存刷新或类型双关工具。地址相同不等于旧指针一定可用；先满足标准的对象与可达性前提再谈 launder。

## C++20 新特性 <!-- category: cpp-20 -->

### consteval / constinit [C++20] <!-- entry: feature-19 -->

关键词：consteval / constinit C++20 标准版本 编译器实现 底层机制 深入讨论

**首次标准化：C++20。** 前者约束立即函数调用；后者要求静态或线程存储期变量满足静态初始化，不表示不可修改。

**引入原因：** consteval 表达“此调用必须满足立即求值要求”；constinit 则表达“此静态/线程存储期变量必须静态初始化”，分开约束函数与初始化。

**应用场景：** consteval 用于编译期验证的配置或生成逻辑；constinit 用于初始化方式必须可审计的全局/线程局部状态。

**使用边界：** constinit 不表示不可修改，也不消除全部初始化依赖；consteval 不等于运行时也能调用的 constexpr。

**实现机制（标准要求与常见实现）：** consteval 由前端对立即调用强制常量求值；constinit 校验静态或线程存储对象满足静态初始化要求，并影响初始化安排。

**深入讨论：** constinit 的值仍可修改；它不是 const。不要把初始化检查通过理解成程序中完全不存在相关存储或装载成本。

### Concepts / requires / <concepts> [C++20] <!-- entry: feature-20 -->

关键词：Concepts / requires / <concepts> C++20 标准版本 编译器实现 底层机制 深入讨论

**首次标准化：C++20。** 语言约束与标准库概念；`std::concepts` 不是标准命名空间。

**引入原因：** 把模板对参数的语法能力和接口约束显式命名，改善重载选择、接口可读性与诊断位置。

**应用场景：** 约束算术类型、迭代器或可调用对象；对库公开模板声明最小需求。

**使用边界：** requires 能检查表达式要求，不能自动证明结合律、无溢出等语义性质。

**实现机制（标准要求与常见实现）：** 前端规范化约束、替换模板参数、检查 requires 表达式并在候选排序中进行约束偏序；通常不生成运行时约束判断。

**深入讨论：** 概念满足不证明语义公理，例如排序比较器的严格弱序；不同写法的约束也未必被编译器认作等价原子约束。

**源码与二进制实战：** [五维深度拆解与实测实验](?view=topics&topic=docs/cpp-implementation-deep-dive.md)，对照布局、教学 C 模型、指令和适用边界。

### 协程语言支持 [C++20] <!-- entry: feature-21 -->

关键词：协程语言支持 C++20 标准版本 编译器实现 底层机制 深入讨论

**首次标准化：C++20。** 语言支持不等于标准库提供通用异步任务运行时。

**引入原因：** 让可挂起/恢复的控制流接近顺序代码，减轻手写状态机和层层回调的负担。

**应用场景：** 有配套任务类型与执行器的异步 I/O、流式生成和分步解析。

**使用边界：** 不自动创建线程或执行器，不保证无分配；取消、异常与协程帧生命周期仍需设计。

**实现机制（标准要求与常见实现）：** 前端/中间层把协程降低为可恢复的状态机；协程帧保存 promise、跨挂起点存活的局部对象和恢复状态，通过 await_ready/suspend/resume 协议控制挂起。

**深入讨论：** 帧常动态分配，但可在满足条件时消除分配。执行器、线程切换与取消由库设计；销毁帧和外部引用生命周期仍须设计。

**源码与二进制实战：** [五维深度拆解与实测实验](?view=topics&topic=docs/cpp-implementation-deep-dive.md)，对照布局、教学 C 模型、指令和适用边界。

### string / string_view 的前后缀检查 [C++20] <!-- entry: feature-32 -->

关键词：string / string_view 的前后缀检查 C++20 标准版本 编译器实现 底层机制 深入讨论

**首次标准化：C++20。** `starts_with` / `ends_with`。

**引入原因：** 直接表达常见前缀/后缀判断，减少手工长度检查和 substr/compare 组合。

**应用场景：** 识别命令前缀、文件扩展名或协议尾标记，如 `text.starts_with("AT+")`。

**使用边界：** 这是代码单元的精确比较，不自动忽略大小写，也不进行 Unicode 规范化。

**实现机制（标准要求与常见实现）：** 标准库通过长度比较及字符特征操作比较前缀/后缀，后端可能内联或调用优化过的内存比较。

**深入讨论：** 这是按字符单元比较，不是 Unicode 规范化、大小写折叠或完整的用户感知字符比较。

### std::construct_at [C++20] <!-- entry: feature-40 -->

关键词：std::construct_at C++20 标准版本 编译器实现 底层机制 深入讨论

**首次标准化：C++20。** 不能与 C++98 已有的 placement new 混为同一引入版本。

**引入原因：** 提供可用于相应常量求值场景的标准构造入口，集中表达在现有存储中开始对象生命周期。

**应用场景：** 容器/分配器实现、固定存储对象池和需要显式构造时间点的底层组件。

**使用边界：** 调用前必须已有大小与对齐都合适的存储；失败路径、销毁与释放仍由调用方管理。

**实现机制（标准要求与常见实现）：** 运行时语义近似在指定地址 placement new 并转发参数；常量求值器对满足条件的 construct_at 给予语言规则要求的支持。

**深入讨论：** 纯普通库代码不能自行突破常量求值限制。存储需有正确容量、对齐与生命周期条件，返回指针标识构造出的对象。

### std::span [C++20] <!-- entry: feature-42 -->

关键词：std::span C++20 标准版本 编译器实现 底层机制 深入讨论

**首次标准化：C++20。** 连续序列的非拥有视图；不自动延长底层对象生命周期。

**引入原因：** 把连续序列的地址和长度绑定为同一个非拥有参数，减少裸指针+长度失配并统一容器入口。

**应用场景：** 算法借用数组、array 或 vector；只读元素参数用 `std::span<const T>`。

**使用边界：** 不拥有元素；C++20 的 operator[] 不提供 at 那样的异常越界检查。

**实现机制（标准要求与常见实现）：** span 的动态范围实现通常保存指针与长度；静态 extent 把长度放进类型，可能不存运行时长度。

**深入讨论：** 静态长度有助消除某些边界计算，但不延长对象寿命。C++20 的 operator[] 不承诺抛出越界异常。

### std::format / std::format_to [C++20] <!-- entry: feature-43 -->

关键词：std::format / std::format_to C++20 标准版本 编译器实现 底层机制 深入讨论

**首次标准化：C++20。** 需标准库实现支持；仅启用编译器语言选项并不足够。

**引入原因：** 提供具有格式说明与类型检查能力的标准格式化接口，减少 printf 可变参数类型不匹配和流式拼接样板。

**应用场景：** 生成诊断文本、对齐表格和带精度的数字；format_to 写入输出迭代器。

**使用边界：** 不保证无分配；format_to 也不自动检查裸缓冲区容量，需要按目标选择有界写法并处理错误。

**实现机制（标准要求与常见实现）：** 库解析格式描述并通过 formatter 分派格式化；现代接口的常量格式串检查与编译器常量求值配合，实际值仍在运行时格式化。

**深入讨论：** 编译期校验不代表完整结果编译期生成。运行时格式串走对应的 vformat 等接口，错误处理与输出分配仍需考虑。

### std::ranges 基础设施与算法 [C++20] <!-- entry: feature-44 -->

关键词：std::ranges 基础设施与算法 C++20 标准版本 编译器实现 底层机制 深入讨论

**首次标准化：C++20。** 后续视图与算法仍需逐项核对版本，例如 `ranges::to` 为 C++23。

**引入原因：** 让算法直接接收范围，并通过投影和视图组合表达数据处理，减少反复传迭代器对与中间容器。

**应用场景：** 按字段排序、过滤后遍历、组合惰性转换；如 `std::ranges::sort(rows, {}, &Row::score)`。

**使用边界：** 惰性不等于拥有数据；底层修改、借用生命周期及每项后增适配器的版本仍要核对。

**实现机制（标准要求与常见实现）：** 约束模板检查 iterator/sentinel 与投影等要求；视图适配器通常保存底层范围与函数对象，解引用/递增时执行惰性计算。

**深入讨论：** 管道是对象组合而非必然生成中间容器；优化可融合但不保证。重复遍历可能重复执行变换，副作用与引用失效都须分析。

## C++23 新特性 <!-- category: cpp-23 -->

### std::expected / std::unexpected [C++23] <!-- entry: feature-45 -->

关键词：std::expected / std::unexpected C++23 标准版本 编译器实现 底层机制 深入讨论

**首次标准化：C++23。** 此处 unexpected 指 `<expected>` 中的类模板，而非旧异常处理函数。

**引入原因：** 在正常返回路径中明确编码“值或错误”，避免只用 bool/optional 丢失原因，又不强制通过异常传播。

**应用场景：** 解析、配置加载及设备调用返回明确错误枚举；调用方按状态分支或使用相应组合接口。

**使用边界：** 不是所有错误都必须替代为 expected；仍需设计 E 的语义，访问 value 可能抛异常，直接解引用要求有值。

**实现机制（标准要求与常见实现）：** 库用带状态的原地存储区分值 T 与错误 E，构造/析构对应活动成员；访问时按接口执行状态检查。

**深入讨论：** 错误路径显式存储不等于绝不抛异常：value() 失败会抛出，T/E 的操作也可能抛出。它不自动传播错误，需调用者分支处理。

### std::print / std::println [C++23] <!-- entry: feature-46 -->

关键词：std::print / std::println C++23 标准版本 编译器实现 底层机制 深入讨论

**首次标准化：C++23。** 定义于 `<print>`；不同于 C++20 的 `std::format`。

**引入原因：** 把格式化文本直接写到输出流/文件的常见需求纳入标准接口，减少先 format 成字符串再输出的样板。

**应用场景：** 命令行工具、测试摘要和普通诊断输出；println 自动追加换行。

**使用边界：** 标准库支持、字符编码及错误处理需核对；不保证无分配，也不能不经设计直接替代实时日志系统。

**实现机制（标准要求与常见实现）：** 标准库结合格式化机制与输出设施，将结果写向标准输出或给定 FILE*；可能对终端编码等作平台适配。

**深入讨论：** 编译器只支持所需语言机制，print 可用性取决于标准库。缓冲、系统调用次数和性能不能由一个函数名推断。

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

关键词：C++11 C++14 C++17 C++20 C++23 标准 POSIX Boost fmt 编译器实现 底层机制 深入讨论

POSIX、Boost、fmt 等不是 ISO C++ 标准库。第三方库提供同名或相似功能不表示标准功能已被当前工具链实现。迁移时分别核对头文件、命名空间、行为与最低版本。

核对来源：[cppreference 编译器支持](https://en.cppreference.com/w/cpp/compiler_support.html)、[特性测试宏](https://en.cppreference.com/w/cpp/feature_test.html)、[WG21 标准入口](https://isocpp.org/std/the-standard)。

#### 如何阅读实现解析

**前端**负责解析、类型检查、模板和常量求值；**中间层/后端**负责降低、优化和指令生成；**ABI/链接器**负责布局、调用约定及符号；**标准库/运行库**负责容器、分配、线程、异常等。一个特性可跨多层。

“通常”“可能”是常见实现，不是标准的布局或性能保证。先确认语义，再观察编译器、标准库、架构与优化选项。LLVM IR 是中间表示，不是 CPU 汇编；GCC 树转储不等同原始源码。

学习顺序：类型推导 → lambda/移动 → optional/生命周期 → 原子/协程。每步追问：什么在编译期完成？运行时存什么？谁释放资源？哪些只是诊断？优化是否改变可观察行为？

[实现观察实验](https://github.com/luckyJimLu/professional-cpp-learning/blob/main/booklets/implementation-lab.md) 提供可复现实验；搜索“编译器实现”“控制块”“协程”可找到相关条目。

资料入口：[C++ 工作草案](https://eel.is/c++draft/)、[GCC 转储选项](https://gcc.gnu.org/onlinedocs/gcc/Developer-Options.html)、[Clang AST](https://clang.llvm.org/docs/IntroductionToTheClangAST.html)、[LLVM 协程降低](https://llvm.org/docs/Coroutines.html)、[Itanium C++ ABI](https://itanium-cxx-abi.github.io/cxx-abi/abi.html)。公开草案可能与发布标准不同；Itanium ABI 不代表所有平台。

**源码与二进制实战：** [五维深度拆解与实测实验](?view=topics&topic=docs/cpp-implementation-deep-dive.md)，对照布局、教学 C 模型、指令和适用边界。
