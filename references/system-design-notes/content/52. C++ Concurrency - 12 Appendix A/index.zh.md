---
id: cpp-concurrency-12-appendix-a
title: "附录 A：部分 C++11 语言特性简要参考"
titleEn: "Appendix A: Brief reference for some C++11 language features"
order: 52
category: specialized
description: "右值引用、移动语义、显式删除/默认函数、constexpr、Lambda 表达式、可变参数模板、auto、thread_local 与 CTAD 类模板实参推导。"
tags: ["C++", "C++11", "移动语义", "Lambda", "语言参考"]
---

# 附录 A：部分 C++11 语言特性简要参考

现代 C++ 标准带来的不仅是对并发的支持，还引入了大量的全新语言特性和新标准库组件。在本附录中，我将简要概述线程库以及本书各章节中涉及的新语言特性。除 `thread_local`（将在 A.8 节中介绍）之外，这些特性大多不直接隶属于并发范畴，但它们对于编写现代高效的多线程代码而言极其重要且大有裨益。本附录仅收录了那些不可或缺的特性（如右值引用）或能够显著简化代码、提升可读性的特性。初次接触这些语法的开发者可能会觉得不太习惯，但随着深入了解，它们将极大提高代码的表达能力。随着 C++11 及更高标准的广泛普及，运用这些特性的代码也早已成为行业主流。

闲言少叙，让我们从**右值引用**开始。右值引用在线程库中被广泛应用，用于在对象之间安全高效地转移资源的所有权（无论是线程、锁还是其他独占资源）。

## A.1 右值引用

只要你接触过 C++ 编程，就一定会对“引用”非常熟悉；C++ 引用允许你为现有对象创建一个别名。通过新引用进行的所有访问和修改都会直接作用于原始对象；例如：

```cpp
int var = 42;
int& ref = var;   // 创建对 var 的引用
ref = 99;         // 通过引用赋值，原始变量被同步更新
assert(var == 99);
```

在 C++11 之前，语言中存在的唯一引用是**左值引用（lvalue references）**——即对左值的引用。“左值”（lvalue）这一术语源自 C 语言，指代那些可以出现在赋值表达式左侧的事物：具名对象、在栈上或堆上分配的对象、或者其他对象的成员，它们都拥有明确且持久的存储地址。“右值”（rvalue）同样源自 C 语言，指代那些只能出现在赋值表达式右侧的事物——例如字面量（literals）和临时对象（temporaries）。左值引用只能绑定到左值，不能绑定到右值。例如你不能这样写：

```cpp
int& i = 42; // 编译错误：42 是右值，普通左值引用无法绑定
```

严格来说这并非绝对：在传统 C++ 中，你一直可以把右值绑定到 `const` 左值引用上：

```cpp
int const& i = 42; // 合法：const 左值引用可以延长临时右值的生命周期
```

但这是标准特意引入的一个特例，在拥有右值引用之前，这是为了允许将临时对象传递给接受引用参数的函数所必需的机制。这支持了隐式类型转换，使得你可以写出如下代码：

```cpp
void print(std::string const& s);
print("hello"); // 创建临时的 std::string 对象并安全绑定
```

C++11 标准正式引入了**右值引用（Rvalue references）**，它们**只能绑定到右值**，而不能直接绑定到左值，并在类型声明中使用两个连字符 `&&` 表示：

```cpp
int&& i = 42; // 正确：右值引用绑定到字面量右值 42
int j = 42;
int&& k = j;  // 编译错误：右值引用不能直接绑定到左值变量 j
```

利用函数重载机制，你可以通过提供一个接受左值引用的版本和另一个接受右值引用的版本，来精确区分传入的实参是左值还是右值。这正是**移动语义（Move semantics）**的基石。

### A.1.1 移动语义

右值通常是临时产生的无名对象，因此可以被安全地随意修改；如果你确切知道函数形参是一个右值，你就可以将其作为临时存储直接使用，或者直接“窃取”其内部持有的资源，而完全不破坏程序的正确性。这意味着：面对右值实参，我们不再需要耗费资源去深拷贝其内容，而是可以直接**移动（Move）**其内容。对于庞大的动态数据结构，这省去了大量昂贵的堆内存分配与数据复制，提供了广阔的性能优化空间。

考虑一个接受 `std::vector<int>` 作为参数的函数，它需要在内部保留一份副本用于独立修改，同时不污染调用方的原数据。传统 C++ 的做法是接受 `const` 左值引用，并在函数内部执行显式深拷贝：

```cpp
void process_copy(std::vector<int> const& vec_)
{
     std::vector<int> vec(vec_); // 发生全量深拷贝
     vec.push_back(42);
}
```

这种写法虽然既能接受左值也能接受右值，但在任何情况下都会强制触发一次昂贵的内存复制。如果你针对右值引用重载该函数，就可以在传入临时右值时彻底省去拷贝，因为你知道该临时对象马上就会消亡，修改它是完全安全的：

```cpp
void process_copy(std::vector<int> && vec)
{
     vec.push_back(42); // 直接在传入的右值上操作，零拷贝
}
```

如果将这一思想应用在类的构造函数上，你就可以在构造新实例时，直接“掏空”右值对象的内部资源并移为己用。请看清单 A.1 中的类示例：在默认构造函数中分配了大块堆内存，并在析构函数中将其释放。

清单 A.1 带有移动构造函数的类

```cpp
class X
{
private:
    int* data;

public:
    X():
        data(new int[1000000])
    {}
    ~X()
    {
        delete [] data;
    }

    // 拷贝构造函数：分配新内存并进行深拷贝
    X(const X& other):
        data(new int[1000000])
    {
        std::copy(other.data, other.data + 1000000, data);
    }

    // 移动构造函数：直接转移底层指针的所有权，源对象置空
    X(X&& other):
        data(other.data)
    {
        other.data = nullptr;
    }
};
```

拷贝构造函数的实现一如既往：分配新的内存块并将数据完整复制过去。但新增的构造函数通过右值引用接收旧对象——这就是**移动构造函数（Move constructor）**。在此函数中，仅需浅拷贝底层的数据指针，并将源对象的指针置为 `nullptr`。在基于右值创建新变量时，这节省了数以百万计的元素拷贝和大量的动态内存分配开销。

对于类 `X` 而言，移动构造函数是一种性能优化手段；但在某些场景下，提供移动构造函数是逻辑上的必然选择，即便该类**从语义上根本不能被拷贝**。例如，`std::unique_ptr<>` 存在的全部意义在于保证每个非空实例都是其所指向对象的唯一拥有者，因此拷贝构造函数在逻辑上是说不通的。但是移动构造函数允许指针的所有权在不同实例之间安全转移，并支持将 `std::unique_ptr<>` 作为函数的返回值直接移出——指针被移动而非复制。

如果你想显式地从一个已知未来不再使用的具名左值对象中移动资源，可以通过 `static_cast<X&&>` 将其转换为右值，或者直接调用标准库提供的辅助函数 `std::move()`：

```cpp
X x1;
X x2 = std::move(x1);           // 通过 std::move 将 x1 转换为右值
X x3 = static_cast<X&&>(x2);    // 等价的显式右值类型转换
```

当你想把传入的形参移动到局部变量或类成员变量中以避免拷贝时，这一操作非常关键。因为**虽然右值引用形参能够绑定到右值，但在函数体内部，该具名形参本身被视为左值**：

```cpp
void do_stuff(X&& x_)
{
    X a(x_);            // 触发拷贝！因为具名形参 x_ 本身是一个左值
    X b(std::move(x_)); // 触发移动：显式将 x_ 转换为右值
}

do_stuff(X()); // 正确：临时右值绑定到右值引用

X x;
do_stuff(x);   // 编译错误：左值无法直接传递给右值引用形参
```

移动语义在 C++ 线程库中得到了极其广泛的应用：既用于那些在逻辑上无法拷贝、但资源可以在所有者间流转的类型，也作为避免深拷贝的通用性能优化手段。我们在 2.2 节中见过一个典型范例：使用 `std::move()` 将 `std::unique_ptr<>` 转移给新创建的线程；在 2.3 节中，我们探讨了在不同的 `std::thread` 实例之间转移底层系统线程的所有权。

`std::thread`、`std::unique_lock<>`、`std::future<>`、`std::promise<>` 以及 `std::packaged_task<>` 均是**不可拷贝**的，但它们都提供了移动构造函数与移动赋值运算符，允许底层关联的系统资源在实例之间流转，并允许它们作为函数返回值返回。`std::string` 和 `std::vector<>` 依然支持完整的拷贝语义，但同时具备移动构造函数与移动赋值运算符，使得在接收右值时能够完全规避海量数据的深拷贝。

对于已经被显式移走资源的对象（moved-from state），C++ 标准库规定除了对其进行析构或重新赋值（拷贝赋值或移动赋值）之外，不应再对其依赖任何特定值。但良好的工程实践要求类的实现应确保处于移走状态的对象依然满足基本的类不变量。例如，被移走资源的 `std::thread` 实例等价于默认构造的空线程实例；被移走的 `std::string` 实例依然处于有效可析构状态，尽管其长度和字符内容未作具体保证。

### A.1.2 右值引用与函数模板

当把右值引用用于函数模板的模板参数时，存在一个微妙且极其重要的推导规则：**如果函数参数被声明为模板参数类型的右值引用（即 `T&&`），若传入的是左值，自动模板实参类型推导会将 `T` 推导为左值引用类型；若传入的是右值，`T` 则被推导为无修饰的原生类型**。这常被称为万能引用（Universal Reference）或转发引用（Forwarding Reference）。

让我们来看一个具体例子：

```cpp
template<typename T>
void foo(T&& t)
{}
```

如果使用右值调用该函数，`T` 将被推导为该值的基本类型：

```cpp
foo(42);            // 调用 foo<int>(42)
foo(3.14159);       // 调用 foo<double>(3.14159)
foo(std::string()); // 调用 foo<std::string>(std::string())
```

但如果使用左值调用 `foo`，`T` 会被推导为左值引用：

```cpp
int i = 42;
foo(i); // 调用 foo<int&>(i)
```

因为函数形参声明为 `T&&`，当 `T` 为 `int&` 时便形成了“引用的引用”：`int& &&`。根据 C++11 的**引用折叠规则（Reference collapsing rules）**，引用的引用会被折叠为普通的单引用 `int&`。因此 `foo<int&>()` 实例化的函数签名实际为：

```cpp
void foo<int&>(int& t);
```

这一精妙机制使得单个函数模板能够无缝接收左值和右值实参，并且精确保留实参的左右值属性。这正是 `std::thread` 构造函数所依赖的核心机制（参见 2.1 与 2.2 节）：当传入可调用对象时，如果参数是右值，则可以直接将其移动到内部存储区，而无需进行拷贝。

## A.2 已删除的函数（Deleted functions, = delete）

在面向对象设计中，有时允许类被拷贝在逻辑上是完全错误的。`std::mutex` 就是典型代表——拷贝一个互斥锁意味着什么？`std::unique_lock<>` 也是如此——一个实例对其所持有的锁拥有独占所有权，若允许拷贝，则意味着副本也声称持有该锁，这显然破坏了锁的独占语义。在实例间转移所有权（移动）是合理的，但这绝对不是拷贝。

在 C++11 之前，防止类被拷贝的标准惯用法是将拷贝构造函数和拷贝赋值运算符显式声明为 `private`，并且**不提供函数实现**。如果类外部的代码尝试拷贝该对象，会在编译期报错；如果该类的成员函数或友元试图拷贝，则会在链接期报错（因为缺少符号实现）：

```cpp
class no_copies
{
public:
    no_copies(){}

private:
    no_copies(no_copies const&);
    no_copies& operator=(no_copies const&);
};

no_copies a;
no_copies b(a); // 编译错误：试图访问 private 的拷贝构造函数
```

在制定 C++11 标准时，委员会意识到这是一个普遍存在的模式，但依赖私有未实现声明略显晦涩。因此标准引入了一种更为通用、表达力更强的新语法：在函数声明末尾添加 `= delete`，将其显式标记为**已删除函数**。上述类可以清晰地改写为：

```cpp
class no_copies
{
public:
    no_copies(){}
    no_copies(no_copies const&) = delete;
    no_copies& operator=(no_copies const&) = delete;
};
```

这种语法比传统技巧清晰得多，直接且明确地表达了设计意图。它使编译器能够给出更直观友好的错误提示，并且即使在类的成员函数内部发生非法拷贝，错误也会在编译阶段立即暴露，而无需推迟到链接阶段。

如果在删除拷贝构造函数和拷贝赋值运算符的同时，显式编写了移动构造函数和移动赋值运算符，你的类就会成为**只移动类型（move-only type）**，正如 `std::thread` 和 `std::unique_lock<>` 一样。清单 A.2 展示了一个标准的只移动类型范例。

清单 A.2 一个简单的只移动类型

```cpp
class move_only
{
    std::unique_ptr<my_class> data;

public:
    move_only(const move_only&) = delete; // 显式禁用拷贝构造
    move_only& operator=(const move_only&) = delete; // 显式禁用拷贝赋值

    move_only(move_only&& other):
        data(std::move(other.data))
    {}

    move_only& operator=(move_only&& other)
    {
        data = std::move(other.data);
        return *this;
    }
};

move_only m1;
move_only m2(m1);            // 编译错误：拷贝构造函数被显式删除
move_only m3(std::move(m1)); // 正确：匹配移动构造函数
```

只移动对象可以自由作为函数参数传递，也可以作为函数返回值移出。但如果想从一个具名左值进行移动，必须始终显式调用 `std::move()` 或使用 `static_cast<T&&>`。

值得注意的是，`= delete` 说明符可以应用于**任何普通函数**，而不仅限于特殊的成员函数。被删除的函数依然会正常参与编译器的函数重载决议（Overload resolution），只有当它在决议中被最终选中为最佳匹配时，才会触发编译失败。利用这一特性可以精确禁止某些隐式类型转换。例如，如果一个函数接受 `short` 类型的参数，为了防止传入 `int` 时发生静默的窄化转换，可以提供一个接受 `int` 的重载并将其标记为删除：

```cpp
void foo(short);
void foo(int) = delete;

foo(42);        // 编译错误：最佳重载匹配了 foo(int)，而该函数被显式删除
foo((short)42); // 正确：显式转换为 short，匹配合法的 foo(short)
```

## A.3 显式默认函数（Defaulted functions, = default）

已删除函数允许你显式声明某个函数不可用，而**显式默认函数**则是另一个维度的补充：它允许你明确指示编译器为你合成该函数的默认实现。该语法仅适用于编译器原本就具备自动合成能力的特殊成员函数：默认构造函数、析构函数、拷贝构造函数、移动构造函数、拷贝赋值运算符和移动赋值运算符。

为什么要显式使用 `= default` 呢？主要原因包括：

- **调整访问权限**：编译器默认合成的函数总是 `public` 的。如果你希望将其设为 `protected` 甚至 `private`，传统上必须手写函数体；而使用 `= default` 可以直接改变其访问控制层级，同时保留编译器的自动生成逻辑。
- **自解释与代码文档化**：显式声明 `= default` 可以清晰地向其他开发者表明：保留编译器的默认行为是经过深思熟虑的设计意图，而非无意疏忽。
- **在被抑制时强制要求编译器合成**：最常见于默认构造函数。在定义了任何用户自定义构造函数后，编译器将不再自动生成默认构造函数；通过声明 `MyClass() = default;`，可以重新让编译器生成该默认构造函数。
- **将析构函数声明为虚函数的同时保留默认实现**：例如在抽象基类中编写 `virtual ~MyBase() = default;`。
- **保留编译器合成函数独有的特殊属性**：手写空函数体 `{}` 会导致类型丧失许多底层特权（如平凡性），而 `= default` 则能完整保留这些属性。

在函数声明末尾添加 `= default` 即可声明默认函数，示例如下：

```cpp
class Y
{
private:
    Y() = default; // 私有化默认构造函数

public:
    Y(Y&) = default;                  // 强制使用非常量引用的拷贝构造
    Y& operator=(const Y&) = default; // 保留默认拷贝赋值

protected:
    virtual ~Y() = default;           // 虚析构函数，使用编译器默认析构逻辑
};
```

前面提到，编译器自动合成的特殊函数拥有用户手写版本所无法比拟的特殊属性。最大的区别在于：**编译器合成的函数可以是平凡的（Trivial）**。类的平凡性在底层机制中具有诸多关键优势：

- 拥有平凡拷贝构造函数、平凡拷贝赋值运算符和平凡析构函数的对象，可以直接使用 `memcpy` 或 `memmove` 进行内存块高速拷贝。
- 用于 `constexpr` 函数（参见 A.4 节）的字面量类型（Literal types）必须具备平凡的构造、拷贝与析构函数。
- 具有平凡特殊成员函数的类，可以安全地放入包含非平凡构造/析构函数的 `union` 联合体中。
- **具有平凡拷贝赋值运算符的类，可以作为 `std::atomic<T>` 的模板参数**（参见 5.2.6 节），从而直接享受硬件级原子操作的支持。

仅仅声明 `= default` 并不必然使函数变为平凡函数——前提是该类本身的所有基类和非静态数据成员也都满足相应的平凡性条件；但如果在用户代码中显式写出 `{}` 函数体，则一定会破坏其平凡性。

第二个区别在于**聚合类（Aggregate）**的判定：没有任何用户提供构造函数的类可以被视为聚合类，从而可以使用聚合初始化列表进行初始化：

```cpp
struct aggregate
{
    aggregate() = default;
    aggregate(aggregate const&) = default;
    int a;
    double b;
};

aggregate x = {42, 3.141}; // 正确：x.a 初始化为 42，x.b 初始化为 3.141
```

第三个区别涉及默认初始化的深层规则。考虑下面的简单结构体：

```cpp
struct X
{
    int a;
};
```

如果创建 `X` 的实例而不提供任何初始化器，其包含的内置类型成员 `a` 将执行默认初始化。如果该对象具有静态存储期，会被清零；否则其内容是未定义的随机值，在读取前未赋值将引发未定义行为：

```cpp
X x1; // x1.a 具有不确定的垃圾值
```

然而，如果你通过显式调用默认构造函数来值初始化（value-initialize）`X` 的实例，`a` 则会被严格执行零初始化（zero-initialization）：

```cpp
X x2 = X(); // x2.a == 0，执行了零初始化
```

一旦你手动编写了自定义构造函数，编译器就不会再生成默认构造函数；若你自己手写一个空构造函数 `X(){}`，上述“显式调用默认构造触发内置成员零初始化”的语言特性就会彻底丢失。而通过编写 `X() = default;`，即可在保留用户自定义其他构造函数的同时，完整继承这一语言层面的值初始化规则。标准库中的原子类型 `std::atomic<>` 正是利用了显式默认构造函数（`= default`），确保其能严格遵循静态初始化或显式零初始化的标准语义。

## A.4 constexpr 函数

像 `42` 这样的整数字面量属于常量表达式（Constant expressions），简单的算术表达式如 `23 * 2 - 4` 也是常量表达式。你甚至可以使用由常量表达式初始化的整型 `const` 变量来构建新的常量表达式：

```cpp
const int i = 23;
const int two_i = i * 2;
const int four = 4;
const int forty_two = two_i - four;
```

常量表达式在 C++ 语法体系中拥有不可替代的特殊用途，以下场景必须强制要求常量表达式：

- **指定静态数组的边界大小**：
  ```cpp
  int bounds = 99;
  int array[bounds]; // 错误：bounds 不是常量表达式
  const int bounds2 = 99;
  int array2[bounds2]; // 正确：bounds2 是常量表达式
  ```
- **指定非类型模板参数的值**：
  ```cpp
  template<unsigned size>
  struct test {};

  test<bounds> ia;   // 错误：bounds 不是常量表达式
  test<bounds2> ia2; // 正确：bounds2 是常量表达式
  ```
- **在类定义体内为静态整型常量数据成员提供初始值**：
  ```cpp
  class X
  {
      static const int the_answer = forty_two;
  };
  ```
- **为全局/静态变量提供静态初始化（Static initialization）表达式**：
  ```cpp
  struct my_aggregate
  {
      int a;
      int b;
  };

  static my_aggregate ma1 = {forty_two, 123}; // 静态初始化（编译期/加载期确定）
  int dummy = 257;
  static my_aggregate ma2 = {dummy, dummy};   // 动态初始化（运行时执行）
  ```

利用常量表达式完成静态初始化，是**彻底消除多线程环境下的全局变量初始化顺序死锁与数据竞争**的终极武器之一。

在 C++11 中，通过引入 `constexpr` 关键字，常量表达式的范畴得到了革命性的扩展。在 C++14 和 C++17 中，`constexpr` 的能力被进一步大幅增强。`constexpr` 最核心的用途是修饰函数。当函数的参数与返回类型符合特定约束且函数体足够简单时，可以将其修饰为 `constexpr`，从而使其能够在常量表达式中被调用计算：

```cpp
constexpr int square(int x)
{
    return x * x;
}

int array[square(5)]; // 数组大小为 25，在编译期完成计算
```

需要强调的是：**一个函数被声明为 `constexpr`，并不意味着它的所有调用都会在编译期求值**。如果传入的实参不是常量表达式，它就会作为普通函数在运行时正常执行：

```cpp
int dummy = 4;
int array[square(dummy)]; // 编译错误：dummy 不是常量表达式，square(dummy) 退化为运行时调用
```

### A.4.1 constexpr 与用户自定义类型

在 C++11 之前，常量表达式仅限于内置算术类型。C++11 允许任何满足**字面量类型（Literal type）**要求的用户自定义类参与常量表达式。一个类要成为字面量类型，必须满足以下所有条件：

- 拥有平凡的析构函数。
- 要么拥有平凡的默认构造函数，要么拥有非拷贝/移动的 `constexpr` 构造函数。
- 所有非静态数据成员以及基类都必须是字面量类型。

清单 A.3 展示了一个具有平凡默认构造函数的字面量类 `CX`。

清单 A.3 具有平凡默认构造函数的类

```cpp
class CX
{
private:
    int a;
    int b;

public:
    CX() = default; // 保留平凡默认构造函数
    CX(int a_, int b_):
        a(a_), b(b_)
    {}

    int get_a() const { return a; }
    int get_b() const { return b; }
    int foo() const { return a + b; }
};
```

在这里，默认构造函数被显式标记为 `= default` 以保持其平凡性。此时 `CX` 完全符合字面量类型的要求。你不仅可以编写返回此类对象的 `constexpr` 函数，甚至可以将成员函数和构造函数本身标记为 `constexpr`：

```cpp
class CX
{
private:
    int a;
    int b;

public:
    CX() = default;
    constexpr CX(int a_, int b_):
        a(a_), b(b_)
    {}
    constexpr int get_a() const { return a; }
    constexpr int get_b() const { return b; }
    constexpr int foo() const { return a + b; }
};
```

在 C++11 中，被 `constexpr` 修饰的成员函数会隐式带有 `const` 限定（在 C++14 中已解绑这一限制）。此时我们可以组合出极为强大的编译期计算：

```cpp
constexpr CX make_cx(int a)
{
    return CX(a, 1);
}
constexpr CX half_double(CX old)
{
    return CX(old.get_a() / 2, old.get_b() * 2);
}
constexpr int foo_squared(CX val)
{
    return square(val.foo());
}

int array[foo_squared(half_double(make_cx(10)))]; // 编译期计算数组大小为 49
```

这不仅是在编译期计算数组大小的技巧。对于并发编程而言，**常量表达式与自定义类型的结合具有里程碑式的意义**：使用常量表达式初始化的字面量类型全局/静态对象，保证在程序启动的**静态初始化阶段（Static initialization phase）**完成初始化，此时任何并发工作线程都尚未启动，因此**其初始化过程天然免疫任何数据竞争与初始化时序问题**：

```cpp
CX si = half_double(CX(42, 19)); // 静态初始化，零运行时开销，无数据竞争
```

这一特性对于 `std::mutex`（参见 3.2.1 节）或 `std::atomic<>`（参见 5.2.6 节）尤为关键。如果你打算使用全局互斥量来同步对其他变量的访问，如果互斥量本身的构造过程存在动态初始化的竞争风险，整个并发同步大厦便会轰然坍塌。为此，`std::mutex` 的默认构造函数被明确规范为 `constexpr`，从而确保互斥量的初始化必定在静态初始化阶段安全就绪。

### A.4.2 constexpr 对象

`constexpr` 也可以直接修饰对象。这主要用于静态断言检查：它要求编译器严格验证该对象必须由常量表达式、`constexpr` 构造函数或常量聚合初始化器进行初始化。同时，被 `constexpr` 修饰的对象会隐式带有 `const` 属性：

```cpp
constexpr int i = 45;                  // 正确
constexpr std::string s("hello");     // 错误：std::string 不是字面量类型
int foo();
constexpr int j = foo();              // 错误：foo() 未声明为 constexpr
```

### A.4.3 constexpr 函数的约束要求

在 C++11 中，一个函数若要声明为 `constexpr`，必须满足非常严苛的限制：
- 所有参数和返回值必须为字面量类型。
- 函数体必须且只能包含**一条 `return` 语句**。
- `return` 语句中的表达式必须是常量表达式。
- 构造返回值所需的任何构造函数或类型转换操作符必须是 `constexpr`。

换言之，C++11 中的 `constexpr` 函数本质上是无任何副作用的纯函数（Pure functions）。而在 C++14 中，这些规则得到了极大的放宽：
- 允许包含多条语句及多个 `return` 分支。
- 允许在函数内部创建并修改局部对象。
- 允许使用循环语句（`for`、`while`）、条件分支（`if`）以及 `switch` 语句。

对于 `constexpr` 构造函数：在 C++11 中其函数体必须为空；而在成员初始化列表中，每个基类和所有非静态数据成员都必须被初始化，且初始化表达式及所调用的构造函数必须全部为 `constexpr`。平凡拷贝构造函数隐式为 `constexpr`。

### A.4.4 constexpr 与模板

当 `constexpr` 应用于函数模板或类模板的成员函数时，若某次具体实例化的参数或返回类型不是字面量类型，编译器会自动忽略 `constexpr` 标记，将其作为普通模板函数实例化。这使得单一模板能够根据类型实参自动适配：在类型合适时生成编译期常量函数，在普通类型时作为常规内联函数执行：

```cpp
template<typename T>
constexpr T sum(T a, T b)
{
    return a + b;
}

constexpr int i = sum(3, 42); // 正确：sum<int> 是合法的 constexpr 函数
std::string s = sum(std::string("hello"), std::string(" world"));
// 正确：sum<std::string> 正常编译为普通运行时函数，constexpr 标记被静默忽略
```

## A.5 Lambda 表达式

Lambda 表达式是现代 C++ 最具生产力的特性之一，它彻底消除了编写轻量级仿函数（Functors）所需的繁重样板代码。Lambda 语法允许我们在需要使用函数逻辑的就近位置就地定义匿名函数。这在并发编程中极为常用，例如为 `std::condition_variable::wait()` 提供谓词条件（如 4.1.1 节），或者向线程池投递任务单元。

最基础的 Lambda 表达式定义了一个无参且不捕获外部状态的函数，甚至无需显式声明返回值。它由方括号引导符（lambda introducer）、函数体组成：

```cpp
[]{
    do_stuff();
    do_more_stuff();
}(); // 紧跟小括号即可完成就地调用
```

更常见的是将其作为参数传递给接受可调用对象的函数模板。若需要接受形参，只需在方括号后添加普通的参数列表；若函数体只包含一条简单的 `return` 语句，返回类型将由编译器自动推导：

```cpp
std::vector<int> data = make_data();
std::for_each(data.begin(), data.end(), [](int i){ std::cout << i << "\n"; });
```

清单 A.4 展示了在条件变量等待中传递返回类型自动推导的 Lambda 表达式。

清单 A.4 具有自动推导返回类型的简单 Lambda 表达式

```cpp
std::condition_variable cond;
bool data_ready;
std::mutex m;

void wait_for_data()
{
    std::unique_lock<std::mutex> lk(m);
    cond.wait(lk, []{ return data_ready; }); // 返回类型自动推导为 bool
}
```

如果函数体较为复杂或包含多条语句，可以通过尾置返回类型语法 `-> return_type` 显式指定返回值类型：

```cpp
cond.wait(lk, []() -> bool {
    if(data_ready)
    {
        std::cout << "Data ready" << std::endl;
        return true;
    }
    else
    {
        std::cout << "Data not ready, resuming wait" << std::endl;
        return false;
    }
});
```

### A.5.1 引用局部变量的 Lambda 表达式

引导符为 `[]` 的 Lambda 无法访问外部作用域的任何局部变量，只能操作全局变量及自身传入的形参。若要访问外部局部变量，必须使用**捕获列表（Capture list）**。

- `[=]`：**按值捕获所有外部局部变量**。Lambda 在创建时会完整拷贝当时所有用到的局部变量副本。这是最安全的方式，因为拷贝后的副本与原局部变量生命周期解耦，即使原函数退出，返回的 Lambda 仍可被安全调用。
- `[&]`：**按引用捕获所有外部局部变量**。Lambda 内部仅保存外部变量的引用。若该 Lambda 脱离了外层局部变量的作用域后被调用，将导致对悬挂引用的非法访问，触发未定义行为。

除了全量捕获，C++ 支持高度灵活的混合捕获语法：
- `[=, &j, &k]`：默认按值拷贝捕获，但指定的 `j` 和 `k` 按引用捕获。
- `[&, j, k]`：默认按引用捕获，但指定的 `j` 和 `k` 按值拷贝捕获。
- `[&i, j, &k]`：精确指定捕获列表，明确 `i` 和 `k` 按引用、`j` 按值捕获，其余局部变量不可见。
- `[this]`：当在类成员函数中定义 Lambda 且需要访问类成员变量时，必须在捕获列表中显式捕获 `this` 指针。

在并发编程中，Lambda 扮演着举足轻重的角色：
- 作为 `std::condition_variable::wait()` 的断言谓词（4.1.1 节）；
- 封装异步任务投递给 `std::packaged_task<>`（4.2.1 节）或线程池；
- 作为线程执行函数直接传递给 `std::thread` 的构造函数（2.1.1 节）；
- 作为并行算法（如 `parallel_for_each`）的核心操作算子。

自 C++14 起，Lambda 还引入了两项重磅特性：
1. **泛型 Lambda（Generic lambdas）**：形参类型可声明为 `auto`，底层自动生成模板调用运算符：
   ```cpp
   auto f = [](auto x){ std::cout << "x=" << x << std::endl; };
   f(42);      // x 推导为 int
   f("hello"); // x 推导为 const char*
   ```
2. **初始化捕获（广义捕获，Generalized lambda capture）**：允许在捕获列表中使用初始化表达式，这使得**移动捕获只移动类型**成为可能：
   ```cpp
   std::future<int> spawn_async_task(){
       std::promise<int> p;
       auto f = p.get_future();
       // 使用 p = std::move(p) 将 promise 移动进 Lambda 内部
       std::thread t([p = std::move(p)]() mutable { p.set_value(find_the_answer()); });
       t.detach();
       return f;
   }
   ```
   在此示例中，`p` 被安全移动到了 Lambda 闭包对象内部，因此可以放心地 `detach()` 线程，而无需担心任何局部变量提前销毁引发的悬挂引用灾难。

## A.6 可变参数模板（Variadic templates）

可变参数模板是指能够接受可变数量模板参数的模板机制。类似于 C 语言中接受可变数量实参的函数（如 `printf`），C++11 允许在模板形参列表中使用省略号 `...` 来声明**参数包（Parameter pack）**。

可变参数模板在 C++ 并发库中无处不在：例如启动线程的 `std::thread` 构造函数（2.1.1 节）就是一个可变参数函数模板，而 `std::packaged_task<>`（4.2.2 节）则是一个可变参数类模板。

在声明可变参数模板时，省略号紧随类型关键字：

```cpp
template<typename ... ParameterPack>
class my_template
{};
```

它也常用于模板偏特化。例如 `std::packaged_task<>` 的主模板仅是一个占位符：

```cpp
template<typename FunctionType>
class packaged_task;
```

其真正的业务定义在接受函数签名的偏特化版本中展开：

```cpp
template<typename ReturnType, typename ... Args>
class packaged_task<ReturnType(Args...)>;
```

在上述声明中，`ReturnType` 是常规模板参数，而 `Args` 则是类型参数包；`Args...` 表示对该参数包的**包展开（Pack expansion）**。当实例化 `std::packaged_task<void(int, double, std::string*)>` 时，`ReturnType` 匹配为 `void`，而参数包 `Args` 则精确捕获了 `int, double, std::string*` 这一类型序列。

### A.6.1 展开参数包

可变参数模板的强大威力来源于包展开机制：你不仅可以原样展开参数列表，还可以为展开的每一项定义模式表达式。

首先，可以在任何需要逗号分隔类型列表的地方直接展开参数包，例如嵌套在 `std::tuple` 中：

```cpp
template<typename ... Params>
struct dummy
{
    std::tuple<Params...> data;
};
```

若将省略号 `...` 放置在由参数包构成的复杂类型表达式末尾，编译器会将该表达式作为一个模式，并为参数包中的每个元素重复复制该模式：

```cpp
template<typename ... Params>
struct dummy3
{
    std::tuple<Params* ...> pointers;                   // 展开为元素原生指针的元组
    std::tuple<std::unique_ptr<Params> ...> unique_ptrs; // 展开为智能指针的元组
};
```

若 `Params` 包含 `int, double`，则 `std::tuple<std::unique_ptr<Params> ...>` 将展开为 `std::tuple<std::unique_ptr<int>, std::unique_ptr<double>>`。

其次，参数包可以用于声明函数形参列表，生成函数参数包：

```cpp
template<typename ... Args>
void foo(Args ... args);
```

结合右值引用，`Args&& ... args` 构成了接收任意数量万能引用的通用范式。`std::thread` 的构造函数正是利用这一点接收任意数量的任务入参：

```cpp
template<typename CallableType, typename ... Args>
thread::thread(CallableType&& func, Args&& ... args);
```

在函数体内部转发这些实参时，标准范式是结合 `std::forward<>` 实现完美转发（Perfect forwarding）：

```cpp
template<typename ... ArgTypes>
void bar(ArgTypes&& ... args)
{
    foo(std::forward<ArgTypes>(args)...);
}
```

此时表达式 `std::forward<ArgTypes>(args)` 作为整体被 `...` 展开，使得每一个参数在传递给下一层调用时，都精确无损地保留其原始的左值或右值语义。

最后，通过 `sizeof...` 运算符可以获取参数包中所包含的元素数量，其结果是一个编译期常量表达式：

```cpp
template<typename ... Args>
unsigned count_args(Args ... args)
{
    return sizeof...(Args);
}
```

## A.7 自动推导变量类型（auto）

C++ 是一门静态类型语言：每个变量的类型在编译期都是明确已知的。然而在传统 C++ 中，冗长繁琐的类型声明往往会严重阻碍代码的可读性：

```cpp
std::map<std::string, std::unique_ptr<some_data>> m;
std::map<std::string, std::unique_ptr<some_data>>::iterator iter = m.find("my key");
```

虽然过去常使用 `typedef` 或 `using` 别名来缩短声明，但 C++11 提供了终极方案：使用 `auto` 关键字。当变量在声明的同时提供了初始化表达式时，编译器会自动从初始化器的类型推导出该变量的真实类型：

```cpp
auto iter = m.find("my key");
```

你还可以在 `auto` 的基础上追加 `const`、指针或引用修饰符：

```cpp
auto i = 42;          // int
auto& j = i;          // int&
auto const k = i;     // int const
auto* const p = &i;   // int* const
```

`auto` 的类型推导规则严格遵循函数模板实参推导体系：数组名会退化（decay）为指针，除非显式使用 `auto&` 声明为引用，否则顶层 `const` 和引用属性都会被默认剥离：

```cpp
int some_array[45];
auto p = some_array; // int*
int& r = *p;
auto x = r;          // int（引用被剥离）
auto& y = r;         // int&（保留引用修饰）
```

这极大地精简了变量声明，尤其当类型名称极其冗长或处于泛型模板中返回类型难以显式手写时（例如配合 `decltype` 使用）。

## A.8 线程局部变量（thread_local）

线程局部变量允许程序中的每个线程都拥有一份独立的变量实例副本。在声明变量时加上 `thread_local` 关键字，即可将其标记为线程局部存储。命名空间作用域下的全局变量、类的静态数据成员以及函数内部的局部静态变量都可以声明为 `thread_local`，它们被称为具有**线程存储期（Thread storage duration）**：

```cpp
thread_local int x; // 命名空间作用域下的线程局部变量

class X
{
    static thread_local std::string s; // 类的线程局部静态成员
};
static thread_local std::string X::s;  // 类静态成员必须在外部定义

void foo()
{
    thread_local std::vector<int> v;   // 函数内部的线程局部变量
}
```

命名空间作用域下的线程局部变量以及类的静态线程局部成员，会在该编译单元内的任何线程局部变量首次被使用之前完成构造。某些编译器实现在线程启动时立即构造它们，另一些实现则在首次访问时惰性构造。如果某个翻译单元中的线程局部变量从未被特定线程使用，该线程甚至可能永远不会构造它们。这种惰性特性完美契合了动态加载模块（如动态链接库）的场景。

在函数内部声明的线程局部变量，会在控制流在该线程上首次经过其声明点时进行初始化；如果特定线程从未调用过该函数，则该线程永远不会构造该变量。这与局部静态变量的行为一致，只是作用域完全局限于各个线程自身。

线程局部变量在属性上与静态变量高度相似：它们在执行动态初始化之前会被预先执行零初始化；如果在构造线程局部变量时抛出了未捕获的异常，系统将直接调用 `std::terminate()` 终止程序。

当线程函数返回退出时，在该线程上构造的所有线程局部变量将按照与其**构造相反的顺序**依次执行析构。由于不同变量之间的初始化顺序在标准中未作严格指定，因此必须确保各个线程局部变量的析构函数之间不存在死锁或依赖环路。如果析构函数在抛出异常时未被处理，同样会触发 `std::terminate()`。

当线程调用 `std::exit()` 或从 `main()` 返回时（等价于使用 `main` 返回值调用 `exit`），该线程所拥有的线程局部变量同样会被析构。但如果进程退出时后台还有其他活动线程正在运行，这些未结束线程上的线程局部变量的析构函数将**不会**被调用。

尽管线程局部变量在各个物理线程中拥有截然不同的内存地址，但你依然可以通过取地址符 `&` 获取指向该变量的普通原生指针。该指针指向取得该地址的那个特定线程内部的实例，并且可以传递给其他线程以允许其跨线程访问。但正如常规对象一样，访问已被销毁的对象属于未定义行为；因此如果你将指向线程局部变量的指针暴露给外部线程，必须确保在属主线程结束并析构该变量后，外部线程绝不再对其进行解引用。

## A.9 类模板实参推导（Class Template Argument Deduction, CTAD）

C++17 将自动类型推导的思想从普通变量进一步扩展到了类模板参数：在声明模板类型的对象时，许多情况下编译器能够直接从构造函数的实参中推导出类模板的参数类型。

具体而言，如果声明对象时直接使用了类模板的名字而未显式提供尖括号 `<...>` 模板实参列表，编译器将基于传入构造函数的实参，遵循与函数模板相同的类型推导规则来自动推导类模板参数。

例如，`std::lock_guard` 接受单个模板参数作为互斥量的类型，其构造函数接受该互斥量类型的引用。在 C++17 中，你只需声明类型为 `std::lock_guard`，编译器就能根据传入的互斥量对象自动推导出完整的模板类型：

```cpp
std::mutex m;
std::lock_guard guard(m); // 自动推导出 std::lock_guard<std::mutex>
```

这一特性同样完美适用于支持同时锁定多个互斥量的 `std::scoped_lock`：

```cpp
std::mutex m1;
std::shared_mutex m2;
std::scoped_lock guard(m1, m2);
// 自动推导出 std::scoped_lock<std::mutex, std::shared_mutex>
```

对于那些构造函数可能导致推导出非预期类型的模板，模板作者还可以编写显式的**推导指引（Deduction guides）**来引导编译器选取正确的类型，但这已经超出了本书的讨论范畴。

### 本章小结

本附录仅仅触及了 C++11 及后续标准引入的庞大语言特性的冰山一角，我们重点聚焦于那些直接影响多线程与并发编程的核心特性。其他重要现代特性还包括静态断言（`static_assert`）、强类型枚举（`enum class`）、委托构造函数、Unicode 原生支持、模板别名（`using`）以及统一大括号初始化等。

希望本附录中的精要剖析足以帮助你理解现代 C++ 语言机制与并发线程库之间的紧密联系，并让你在编写与阅读现代多线程代码时更加游刃有余。若希望在日常工程中更深入地运用这些高级语言特性，建议参考 cppreference.com 等权威现代 C++ 参考资料。
