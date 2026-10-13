---
id: cpp-concurrency-03-sharing-data
title: "第 3 章：线程间共享数据"
titleEn: "Chapter 3: Sharing data between threads"
order: 43
category: specialized
description: "深入互斥量 (std::mutex)、防死锁策略 (std::lock)、死锁规避准则以及读写锁与只初始化一次模式。"
tags: ["C++", "互斥锁", "死锁防护", "std::unique_lock", "共享互斥量"]
---

# 第 3 章：线程间共享数据

此类修改要么尚未开始，要么已经完全结束。C++ 标准库提供了若干此类保护机制，本章将对此进行系统介绍。

另一种替代方案是改造数据结构的设计及其不变式，使得所有的修改操作均被拆分为一系列不可分割的原子变更序列，其中每一步变更都能完整维护数据结构的不变式。这通常被称为**无锁编程（lock-free programming）**，且极难编写正确。如果你在这一抽象层次工作，内存模型的各种微妙语义以及理清哪些线程在何时能看到哪些具体数值会变得异常复杂。内存模型将在第 5 章中详细阐述，而无锁编程将在后续章节展开探讨。

应对竞争条件的另一种途径是将对数据结构的更新操作视为一次**事务（transaction）**，正如在数据库中执行事务更新一样。所需的一系列数据修改和读取操作首先记录在事务日志中，随后在单个原子步骤中进行统一提交。如果由于另一个并发线程修改了该数据结构而导致提交无法继续进行，则回滚并重新启动该事务。这被称为**软件事务内存（Software Transactional Memory, STM）**，在本书编写时仍属于活跃的前沿研究领域。由于 C++ 标准中尚无直接针对 STM 的内置支持（尽管存在一份针对 C++ 事务内存扩展的技术规范 TS），本书不会对此展开深入讨论。然而，先在本地执行操作然后通过单个原子步骤完成提交的核心设计思想，在后续内容中我们还会多次提及。

C++ 标准库提供的用于保护共享数据的最基本同步原语是**互斥量（mutex，即互斥锁）**，因此我们将首先对其展开详细剖析。

## 3.2 使用互斥量保护共享数据

设想你拥有一个如前文所述的双向链表共享数据结构，你希望保护它免受竞争条件的破坏，防止随之而来的不变式破损。如果能够将所有访问该数据结构的代码片段都标记为**互斥访问（mutually exclusive）**——即当任何一个线程正在执行其中某一段代码时，其他任何试图访问该数据结构的线程都必须阻塞等待，直到第一个线程彻底执行完毕——那该有多么理想！这将彻底杜绝任何外部线程观察到破损不变式的可能性（正在执行修改的线程自身除外）。

这绝非不切实际的幻想——使用被称为**互斥量（mutex，源自 mutual exclusion 的缩写）**的同步原语，所实现的正是这一保证。在访问共享数据结构之前，先将与该数据关联的互斥量进行**加锁（lock）**；当完成对数据结构的访问后，再对互斥量进行**解锁（unlock）**。C++ 线程库随后会确保：一旦某个线程成功锁定了特定的互斥量，其他所有试图锁定该互斥量的线程都必须排队等待，直到成功持有锁的线程显式将其解锁。这确保了所有线程观察到的共享数据始终是一致且自洽的视图，永远不会看到被破坏的不变式。

互斥量是 C++ 中可用的最通用的数据保护机制，但它们绝非能够包治百病的万灵丹；至关重要的是合理组织你的代码以保护正确的数据（参见 3.2.2 节），并杜绝接口固有设计缺陷所诱发的竞争条件（参见 3.2.3 节）。互斥量本身还会引入新的并发难题，典型代表便是**死锁（deadlock，参见 3.2.4 节）**以及保护范围过大或过小的问题（即**加锁粒度问题，参见 3.2.8 节）**。让我们从基础用法起步。

### 3.2.1 在 C++ 中使用互斥量

在 C++ 中，可以通过构造 `std::mutex` 的实例来创建一个互斥量，通过调用其成员函数 `lock()` 进行加锁，调用 `unlock()` 进行解锁。然而，**直接调用这两个成员函数是非常不推荐的编程实践**，因为这意味着你必须在离开函数的每一条代码路径上手工调用 `unlock()`，包括由异常引发的栈展开退出路径。相反，C++ 标准库提供了 `std::lock_guard` 类模板，它为互斥量实现了严格的 RAII（资源获取即初始化）惯用法；它在构造时自动锁定传入的互斥量，并在析构时自动将其解锁，从而严格保证被锁定的互斥量在任何情况下都能被正确释放。下面的代码清单展示了如何使用 `std::mutex` 结合 `std::lock_guard` 来保护一个可供多线程并发访问的列表。这两者均声明在 `<mutex>` 头文件中。

代码清单 3.1 使用互斥量保护链表

```cpp
#include <list>
#include <mutex>
#include <algorithm>

std::list<int> some_list;
std::mutex some_mutex;

void add_to_list(int new_value)
{
    std::lock_guard<std::mutex> guard(some_mutex);
    some_list.push_back(new_value);
}

bool list_contains(int value_to_find)
{
    std::lock_guard<std::mutex> guard(some_mutex);
    return std::find(some_list.begin(),some_list.end(),value_to_find)
        != some_list.end();
}
```

在代码清单 3.1 中，存在一个全局列表 `some_list`，它由对应的全局 `std::mutex` 实例 `some_mutex` 提供保护。在 `add_to_list()` 和 `list_contains()` 中使用 `std::lock_guard<std::mutex>`，意味着这两个函数中的访问操作是严格互斥的：`list_contains()` 永远不会在 `add_to_list()` 修改链表的半途观察到处于中间破损状态的链表结构。

C++17 引入了一项名为**类模板实参推导（Class Template Argument Deduction, CTAD）**的新特性，这意味着对于像 `std::lock_guard` 这样的简单类模板，通常可以省略模板参数列表。在支持 C++17 的编译器上，上述代码中的保护语句可以简化为：

```cpp
std::lock_guard guard(some_mutex);
```

正如我们将在 3.2.4 节中所见，C++17 还引入了增强版的锁守卫类模板 `std::scoped_lock`，因此在现代 C++17 环境下，该语句更推荐写为：

```cpp
std::scoped_lock guard(some_mutex);
```

为了保持代码讲解的清晰性并兼容早期编译器，在后续其他代码片段中我将继续使用传统的 `std::lock_guard` 并显式指定模板参数。

虽然在某些简单场合下使用全局变量是可行的，但在绝大多数面向对象的设计实践中，通常会将互斥量与受保护的数据封装在同一个类中，而不是使用散乱的全局变量。这是面向对象设计准则的标准应用：通过将它们打包到一个类中，能够清晰地表明它们的强相关性，并能完美封装功能、强制执行数据保护规则。在这种设计下，`add_to_list` 和 `list_contains` 成为该类的成员函数，而互斥量和受保护的数据均声明为类的私有（`private`）成员，从而使得识别哪些代码有权访问数据以及哪些代码需要加锁变得一目了然。如果类的所有成员函数在访问任何数据成员之前都先获取互斥锁并在完成后自动释放，那么数据就能免受一切外部并发侵扰。

然而事情并未就此彻底解决，敏锐的读者可能已经注意到了潜在的漏洞：**如果某个成员函数向外返回了指向受保护数据的裸指针或引用，那么即使所有成员函数都规规矩矩地加锁也无济于事，因为整个保护屏障被撕开了一个巨大的口子！** 任何获取到该指针或引用的外部代码，都可以在不持有互斥锁的情况下直接访问（甚至任意修改）受保护的数据。因此，使用互斥量保护数据要求进行深思熟虑的接口设计，严格确保在对受保护数据进行任何读写之前互斥量已被锁定，并且绝不留有任何暗门后路。

### 3.2.2 组织保护共享数据的代码架构

正如你所见，使用互斥量保护数据并非在每个成员函数开头随手塞一个 `std::lock_guard` 那么简单；只要一个失控逃逸的指针或引用，所有的保护措施就会瞬间化为乌有。从表面上看，检查逃逸的指针或引用似乎并不困难：只要确保没有成员函数通过返回值或输出形参将指向受保护数据的指针或引用传递给调用方，数据就是安全的。但深入探究下去，事情并没有那么简单——工程实践中往往暗礁丛生。除了检查成员函数不向调用方泄露指针或引用之外，**同样关键的是要检查它们没有将这些受保护的指针或引用传入它们所调用的、不受你控制的外部函数中！** 这同样致命：那些外部函数可能会将指针或引用转存到全局变量或堆内存中，并在稍后脱离互斥锁保护的情况下随意使用。在这方面尤为凶险的是那些在运行时通过函数参数或回调机制传入的外部函数，如下面的代码清单所示。

代码清单 3.2 无意中向外暴露被保护数据的引用

```cpp
class some_data
{
    int a;
    std::string b;
public:
    void do_something();
};

class data_wrapper
{
private:
    some_data data;
    std::mutex m;
public:
    template<typename Function>
    void process_data(Function func)
    {
        std::lock_guard<std::mutex> l(m);
        func(data); // 危险！将“受保护”的数据按引用传递给用户传入的未知函数
    }
};

some_data* unprotected;

void malicious_function(some_data& protected_data)
{
    unprotected=&protected_data; // 恶意保留了受保护数据的全局裸指针
}

data_wrapper x;

void foo()
{
    x.process_data(malicious_function); // 传入恶意回调
    unprotected->do_something(); // 灾难！在完全没有加锁的情况下访问受保护的数据
}
```

在这个例子中，`process_data` 内部的代码表面上看人畜无害，规规矩矩地使用了 `std::lock_guard` 进行加锁保护，但对用户传入函数 `func(data)` 的调用意味着 `foo` 可以传入 `malicious_function`，从而轻易绕过保护并将受保护数据的内部地址转存出来，随后在完全脱离互斥锁保护的情况下肆意调用 `do_something()`。

从根本上说，这段代码的致命缺陷在于它未能达成最初的承诺：**将所有访问该数据结构的代码片段都标记为互斥访问**。在此处，它遗漏了 `foo()` 中调用 `unprotected->do_something()` 的外部代码。遗憾的是，C++ 线程库本身在语法层面上无法自动帮你杜绝这种逻辑缺陷；作为程序员，必须由你来严格保证锁定了正确的互斥量来保护数据。幸运的是，我们可以总结出一条必须严格遵守的黄金开发准则：

> **核心准则**：切勿将指向受保护数据的指针或引用逃逸传递到锁的作用域之外！无论是通过函数返回值返回、保存在外部可见内存中，还是作为参数传递给用户提供的未知回调函数。

虽然这是使用互斥量保护数据时的常见错误，但绝非唯一的潜在陷阱。正如我们在下一小节中所见，即便所有底层数据都被互斥量严密保护，在接口层面仍然完全可能滋生隐蔽的竞争条件。

### 3.2.3 发现接口固有的竞争条件

仅仅因为你使用了互斥量或其他同步原语来保护共享数据，并不自动意味着你对竞争条件免疫了；你仍然必须确保在**恰当的逻辑粒度**上对数据进行保护。再次回顾双向链表的例子：为了让一个线程安全地删除一个节点，你必须确保同时防止对三个节点的并发访问：待删除的节点本身，以及其两侧的两个邻居节点。如果你分别独立保护每个节点的指针访问，其安全性并不会比完全不加锁的代码好到哪里去，因为破坏性的竞争条件依然会在节点之间爆发——在单个操作步骤中需要保护的不是离散的单个节点，而是贯穿整个删除操作全程的完整数据结构。在此场景下，最简单的正解是使用单个互斥量来保护整张链表，正如代码清单 3.1 所示。

即使链表上的每个独立操作在底层都是线程安全的，你依然没有彻底走出困境；即使面对最简单的 API 接口设计，依然可能潜藏着固有的竞争条件。考虑类似于代码清单 3.3 所示的 `std::stack` 容器适配器接口。除了构造函数和 `swap()` 之外，在 `std::stack` 上基本上只能执行五项操作：使用 `push()` 压入新元素，使用 `pop()` 弹出元素，通过 `top()` 查看栈顶元素，调用 `empty()` 检查栈是否为空，以及调用 `size()` 查询元素总数。即便你将 `top()` 修改为按值返回副本而非返回引用（严格遵守了 3.2.2 节的逃逸准则），并使用互斥量严格保护其内部数据，**该接口本身在多线程环境下依然存在固有的竞争条件**。这一缺陷并非基于互斥量的实现所独有，而是接口设计层面的先天缺陷，因此即使换用无锁实现，此类竞争条件依然无法幸免。

代码清单 3.3 `std::stack` 容器适配器的标准接口大纲

```cpp
template<typename T,typename Container=std::deque<T> >
class stack
{
public:
    explicit stack(const Container&);
    explicit stack(Container&& = Container());
    template <class Alloc> explicit stack(const Alloc&);
    template <class Alloc> stack(const Container&, const Alloc&);
    template <class Alloc> stack(Container&&, const Alloc&);
    template <class Alloc> stack(stack&&, const Alloc&);
    bool empty() const;
    size_t size() const;
    T& top();
    T const& top() const;
    void push(T const&);
    void push(T&&);
    void pop();
    void swap(stack&&);
    template <class... Args> void emplace(Args&&... args); // C++14 新增
};
```

这里的问题在于：`empty()` 和 `size()` 的返回值是完全不可靠的。虽然它们在函数返回的那一微秒可能是准确的，但一旦函数返回，其他并发线程就可以随意调用 `push()` 塞入新元素或调用 `pop()` 弹走已有元素，而此时发起 `empty()` 或 `size()` 调用的线程甚至还没来得及使用该返回值。

特别地，如果该栈对象不是被多线程共享的，那么先检查 `empty()`，若非空则调用 `top()` 读取栈顶元素是完全安全且标准的写法：

```cpp
stack<int> s;
if(!s.empty())
{
    int const value=s.top();
    s.pop();
    do_something(value);
}
```

这不仅在单线程中完全安全，而且是标准规范：在空栈上调用 `top()` 会引发未定义行为。然而在多线程共享同一个栈对象时，这一调用序列就变得**极度不安全**了，因为在当前线程执行完 `empty()` 检查之后、且在调用 `top()` 之前的间隙，完全可能有另一个线程执行了 `pop()` 并恰好取走了最后一个元素！这是一个教科书级的竞争条件，而单纯在内部使用互斥量保护各个成员函数根本无济于事；这是接口拆分带来的系统性后果。

那么解决方案是什么？这种问题源自接口设计的割裂，因此根本解法在于重构接口。但这引出了一个核心问题：应该做出怎样的改变？在最简单的方案中，你可以规定：如果在调用 `top()` 时栈为空，则直接抛出异常。尽管这从根本上阻断了未定义行为，但它会导致编程模式变得极其臃肿，因为即使 `empty()` 返回了 `false`，调用方仍然必须时刻准备着捕获异常。这使得对 `empty()` 的调用充其量变成了一种跳过抛异常开销的微优化手段，而不再是保证逻辑正确性的必要屏障。

如果你仔细审视上述代码片段，还会发现潜藏着**第二重更为隐蔽的竞争条件**——这一次发生在 `top()` 与 `pop()` 之间。设想有两个线程同时运行上述代码，且同时引用同一个栈对象 `s`。当使用多线程处理计算任务时，多个工作线程在不同数据上执行相同的算法逻辑是极其常见的模式，共享栈非常适合在它们之间分担任务（虽然工程中更常用共享队列）。假定栈中初始有两个元素，因此我们暂时无需担心 `empty()` 与 `top()` 之间的竞态。现在让我们审视表 3.1 所示的潜在交错执行时序。

表 3.1 两个线程在同一个共享栈上操作的一种潜在交错时序

| 线程 A (Thread A) | 线程 B (Thread B) |
| :--- | :--- |
| `if(!s.empty())` | |
| `int const value = s.top();` | |
| | `if(!s.empty())` |
| | `int const value = s.top();` |
| `s.pop();` | |
| `do_something(value);` | |
| | `s.pop();` |
| | `do_something(value);` |

正如你所见，如果只有这两个线程运行，在两次 `top()` 调用之间没有发生任何修改栈的操作，因此**两个线程将读到完全相同的元素值**！不仅如此，在两次 `pop()` 之间也没有任何 `top()` 调用。其灾难性后果是：**栈中两个元素里的一个在未被任何线程处理的情况下被直接丢弃了，而另一个元素却被重复处理了两次！** 这种竞争条件远比 `empty()`/`top()` 引发未定义行为更加阴险诡异；系统表面上没有任何报错，但计算逻辑已被彻底破坏，且产生缺陷的表象往往与根因相隔甚远，调试起来极难定位。

这迫切需要对接口进行更加根本性的彻底改造：**将 `top()` 和 `pop()` 合并为一个受同一个互斥锁保护的原子操作**。然而，Tom Cargill 早在 1994 年就曾明确指出：如果栈中元素对象的拷贝构造函数可能抛出异常，那么将二者合并为一个返回弹出值的 `pop()` 会引发严重的异常安全问题。Herb Sutter 在《Exceptional C++》中从异常安全的角度对该问题进行了全面透彻的分析，但当引入并发环境下的竞争条件时，该问题又被赋予了全新的挑战维度。

为了让尚未了解该背景的读者明白原委，不妨考虑 `stack<std::vector<int>>`。由于 `vector` 是一个动态大小的容器，在拷贝一个 `vector` 时，底层库必须从堆中重新分配内存来复制内部元素。如果系统处于高负载或内存紧张状态，该内存分配可能会失败，从而导致 `vector` 的拷贝构造函数抛出 `std::bad_alloc` 异常。如果 `pop()` 函数被设计为在从栈中移除元素的同时按值返回弹出的对象，就会遭遇棘手的两难境地：被弹出的值只有在栈被物理修改（即内部节点被销毁）之后才能返回给调用方，然而在将该值拷贝给调用方接收变量的过程中，一旦抛出了异常，被弹出的数据就永远彻底丢失了——它已经从栈中被删除了，但拷贝返回却没有成功！因此，`std::stack` 的原始设计者极为贴心地将该操作一分为二：先安全获取栈顶元素（`top()`），在外部确认复制安全后再将其真正从栈中移除（`pop()`）。如果此时发生内存不足异常，元素依然稳妥地保留在栈上，应用程序可以释放部分内存后安全重试。

然而令人头疼的是，**为了消除多线程竞争条件所必须合并的操作，恰恰就是当年为了保证异常安全而刻意拆分的操作！** 幸运的是，我们有可行的工程替代方案，但每种方案都需要权衡取舍。

#### 选项 1：传入目标引用 (Pass in a reference)
第一种替代方案是将用于接收弹出值的变量引用作为参数传入 `pop()` 调用中：

```cpp
std::vector<int> result;
some_stack.pop(result);
```

这种方案在很多场景下运作良好，但它存在一个显著缺点：它强制调用方代码在发起调用之前必须先行构造出一个该元素类型的局部实例，以便作为目标实参传入。对于某些类型而言这可能极其昂贵（消耗大量时间或系统资源）；对于另一些类型这甚至是不可能的，因为它们的构造函数可能需要在此处无法获取的外部参数。最后，它要求存储的类型必须支持赋值操作符（assignable）。这是一项重大限制：许多用户自定义类型并不支持赋值操作，尽管它们可能支持移动构造甚至是拷贝构造（并允许按值返回）。

#### 选项 2：要求不抛异常的拷贝构造函数或移动构造函数 (Require a no-throw copy/move constructor)
只有当按值返回的过程可能抛出异常时，返回值形式的 `pop()` 才会产生异常安全问题。许多基础类型和良好设计的类都拥有保证不抛异常的拷贝构造函数，而且伴随 C++11 对右值引用的支持，绝大多数现代类型的移动构造函数都是 `noexcept` 的，即便它们的拷贝构造函数可能会抛异常。因此，一种合法的工程设计选项是：将线程安全栈的使用范围约束在那些能够安全按值返回且保证不抛异常的类型上。

虽然这绝对安全，但限制过于严苛。尽管我们可以借助标准类型特征库中的 `std::is_nothrow_copy_constructible` 和 `std::is_nothrow_move_constructible` 在编译期对类型进行静态约束断言，但支持异常抛出且未编写移动构造函数的历史类型依然大量存在。如果这些类型完全无法存入线程安全栈，通用性将大打折扣。

#### 选项 3：返回指向弹出项的智能指针 (Return a pointer to the popped item)
第三种替代方案是返回指向被弹出项的指针，而非直接按值返回对象本身。其核心优势在于：指针的复制是平凡的基元操作，绝对不会抛出任何异常，从而彻底绕过了 Cargill 提出的异常安全陷阱。其代价在于：返回指针需要对动态分配给对象的内存进行生命周期管理；对于像 `int` 这样的基本类型，这种堆分配的开销可能远超过直接按值返回的开销。对于采用该方案的接口，`std::shared_ptr` 是最理想的指针类型选择；不仅因为最后一个智能指针销毁时对象会自动析构防止内存泄漏，而且标准库对内存分配机制拥有充分的控制权，无需暴露裸 `new` 和 `delete`。这在性能优化层面至关重要：要求栈中的每个元素都使用 `new` 独立分配，相比于非线程安全的平坦连续容器实现会引入不可忽视的开销。

#### 选项 4：同时提供选项 1 以及选项 2 或 3
在编写通用泛型代码时，灵活性永远不应被轻易舍弃。如果你实现了选项 2 或选项 3，那么顺带重载提供选项 1 是极其简单且顺理成章的，这赋予了使用该库的代码以极低的额外开发成本，根据具体的对象类型自由选择最合适重载版本的权力。

#### 线程安全栈的参考定义与实现

代码清单 3.4 展示了一个彻底消除了接口固有竞争条件、并同时实现了选项 1 与选项 3 的线程安全栈的类定义大纲：它提供了两个 `pop()` 重载版本，一个接收存储目标引用，另一个直接返回 `std::shared_ptr<T>`。其对外接口极尽精简，核心只有 `push()` 和 `pop()`。

代码清单 3.4 线程安全栈的类定义大纲

```cpp
#include <exception>
#include <memory>

struct empty_stack: std::exception
{
    const char* what() const noexcept;
};

template<typename T>
class threadsafe_stack
{
public:
    threadsafe_stack();
    threadsafe_stack(const threadsafe_stack&);
    threadsafe_stack& operator=(const threadsafe_stack&) = delete; // 显式删除赋值操作符
    void push(T new_value);
    std::shared_ptr<T> pop();
    void pop(T& value);
    bool empty() const;
};
```

通过大幅裁剪接口，我们实现了安全性的最大化；即便是作用于整个栈的宏观操作也受到了严格限制。栈对象本身不可被赋值，因为拷贝赋值运算符被显式删除了（`=delete`），同时也不提供 `swap()` 函数。但只要栈内元素支持拷贝，栈对象本身是支持拷贝构造的。如果栈为空，`pop()` 函数会直接抛出 `empty_stack` 自定义异常，因此即便其他线程在调用 `empty()` 之后迅速抽空了栈，后续操作依然安全健壮。将最初的 5 个方法精简收敛后，接口的极度简化使得互斥量能够严密且完整地覆盖整个操作的生命周期。代码清单 3.5 给出了基于 `std::stack<>` 包装的具体实现。

代码清单 3.5 线程安全栈的完整类定义实现

```cpp
#include <exception>
#include <memory>
#include <mutex>
#include <stack>

struct empty_stack: std::exception
{
    const char* what() const throw();
};

template<typename T>
class threadsafe_stack
{
private:
    std::stack<T> data;
    mutable std::mutex m;
public:
    threadsafe_stack(){}
    threadsafe_stack(const threadsafe_stack& other)
    {
        std::lock_guard<std::mutex> lock(other.m);
        data=other.data; // 在持有源对象互斥锁的情况下执行拷贝
    }
    threadsafe_stack& operator=(const threadsafe_stack&) = delete;

    void push(T new_value)
    {
        std::lock_guard<std::mutex> lock(m);
        data.push(std::move(new_value));
    }

    std::shared_ptr<T> pop()
    {
        std::lock_guard<std::mutex> lock(m);
        if(data.empty()) throw empty_stack(); // 弹栈前严格检查空栈
        std::shared_ptr<T> const res(std::make_shared<T>(data.top())); // 在修改内部栈结构前分配返回值
        data.pop();
        return res;
    }

    void pop(T& value)
    {
        std::lock_guard<std::mutex> lock(m);
        if(data.empty()) throw empty_stack();
        value=data.top();
        data.pop();
    }

    bool empty() const
    {
        std::lock_guard<std::mutex> lock(m);
        return data.empty();
    }
};
```

该栈实现是支持拷贝构造的——拷贝构造函数锁定了源对象的互斥量，然后拷贝其内部底层容器。请注意，我们在构造函数体内部执行拷贝，而不是在成员初始化列表中拷贝，以确保在执行拷贝操作的全过程中互斥锁始终处于被持有状态。

正如对 `top()` 和 `pop()` 的深入分析所表明的，接口设计中破坏性竞争条件的滋生，根源在于**加锁粒度太小**；互斥锁的保护范围未能完整覆盖目标业务操作的整个生命周期。然而，互斥锁的运用同样可能走向另一个极端——**加锁粒度过粗**；最极端的情况莫过于使用单个全局大锁来保护系统内的所有共享数据。在一个存在大量共享数据的复杂系统中，这会彻底扼杀多线程并发带来的任何性能红利，因为所有线程都被迫排队依次执行，哪怕它们访问的是完全互不相干的独立数据。早期专为多处理器系统设计的 Linux 内核版本正是采用了单一的**大内核锁（Big Kernel Lock, BKL）**。尽管系统能够正确运行，但这导致双处理器系统的实际性能往往明显劣于两台独立的单处理器机器，而四处理器系统的吞吐量更是远远达不到四台单机的水准。由于所有核心都在激烈争抢同一个内核锁，运行在额外核心上的线程绝大部分时间都在空转等待锁，无法处理任何有意义的工作。后来 Linux 内核演进为极其精细的细粒度加锁方案，由于锁争用大幅骤减，四处理器系统的性能才得以无限逼近理想中单机四倍的极限线性吞吐。

然而，细粒度加锁体系自身也面临着严峻的挑战：为了保证一个复杂操作的数据一致性，有时候必须同时锁定多个互斥量。如前所述，有时候合理的应对策略是适度放大互斥量覆盖的数据范围，从而只需锁定一个互斥量即可。但在很多时候这是不可取的，例如当各个互斥量分别用于保护同一个类的不同实例时。在这种情况下，将加锁提升到更高层级意味着要么把加锁责任甩给外部调用方，要么使用单个全局大锁来保护该类的所有对象实例，这两种选择都极为糟糕。

一旦在单个操作中必须同时获取两个或多个互斥锁，一个潜伏在暗处的致命梦魇便悄然登场：**死锁（deadlock）**。这在形态上几乎是竞争条件的对立面：竞争条件是两个线程竞相争先，而死锁则是两个线程互不相让、相互等待对方，导致谁都无法向前推进分毫。

### 3.2.4 死锁：问题剖析与解决之道

设想有一件玩具由两个互补的部件组成（例如玩具鼓和小鼓槌），只有同时拿到这两个部件才能玩耍。现在有两个幼童，他们都渴望玩这件玩具。如果其中一个孩子同时抢到了鼓和鼓槌，他就可以开开心心地敲鼓，直到他玩腻为止。如果另一个孩子想玩，就必须耐心等待，无论他多么沮丧。现在设想鼓和鼓槌被分别埋在了玩具箱的不同角落，两个孩子同时跑去玩具箱里翻找。一个孩子找到了玩具鼓，另一个孩子找到了小鼓槌。此时他们便陷入了僵局：除非其中一个孩子主动展现风度让给对方先玩，否则双方都会死死攥住自己手里的那一部分，并大声哭闹要求对方交出另一半，结果谁也玩不成。

现在把争抢玩具的幼童替换为**争夺互斥锁的并发线程**：一对线程中的每一个都需要同时锁定两个互斥量才能执行某项业务操作；每个线程各自成功锁定了其中一个互斥量，并苦苦等待对方释放另一个互斥量。两个线程都无法向前推进，因为它们都在等待对方先释放锁。这种僵持场景就叫做**死锁（deadlock）**，它是进行跨多个互斥量操作时最令人头痛的头号难题。

规避死锁最经典的传统建议是：**始终按照严格一致的固定顺序获取互斥锁**。如果你总是先锁定互斥量 A 再锁定互斥量 B，那么系统就永远不会发生死锁。在互斥量承担不同业务职责时，这种顺序往往很容易理清；但在其他时候事情远没有那么直观，例如当两个互斥量分别保护同一个类的不同对象实例时。考虑在同一个类的两个实例之间执行数据交换操作（swap）：为了确保数据能够被原子且正确地互换，且不被其他并发修改所破坏，两个对象实例内部的互斥量都必须同时被锁定。但如果此时约定了固定的加锁顺序（例如：始终先锁第一个参数传入的对象的互斥量，再锁第二个参数传入的对象的互斥量），这极易引发灾难：只需两个并发线程同时调用该交换函数，但传入的参数对象顺序正好颠倒（线程 1 交换 A 与 B，线程 2 交换 B 与 A），瞬间就会诱发致命死锁！

幸运的是，C++ 标准库为此量身定制了完美的解药：**`std::lock`**——这是一个能够**同时对两个或多个互斥量进行加锁且绝对不会发生死锁**的标准算法函数。下面的代码清单展示了如何将其应用于一个简单的对象交换操作。

代码清单 3.6 在 swap 操作中使用 `std::lock()` 与 `std::lock_guard`

```cpp
class some_big_object;
void swap(some_big_object& lhs,some_big_object& rhs);

class X
{
private:
    some_big_object some_detail;
    std::mutex m;
public:
    X(some_big_object const& sd):some_detail(sd){}

    friend void swap(X& lhs, X& rhs)
    {
        if(&lhs==&rhs)
            return;
        std::lock(lhs.m,rhs.m); // 一次性锁定两个互斥量，杜绝死锁风险
        std::lock_guard<std::mutex> lock_a(lhs.m,std::adopt_lock); // 接管已有锁所有权
        std::lock_guard<std::mutex> lock_b(rhs.m,std::adopt_lock);
        swap(lhs.some_detail,rhs.some_detail);
    }
};
```

首先，函数开头检查传入的实参是否指向同一个实例，因为试图对同一个非递归的 `std::mutex` 重复加锁属于严重的未定义行为。（允许同一线程对其多次加锁的互斥量类型为 `std::recursive_mutex`，参见 3.3.3 节）。随后，调用 `std::lock(lhs.m, rhs.m)` 同时锁定两个互斥量，并构造了两个 `std::lock_guard` 实例分别守护它们。请注意额外传入的 `std::adopt_lock` 标志参数：它明确告知 `std::lock_guard` 对象，底层的互斥量已经被当前线程成功加锁了，锁守卫应该直接接管对已有锁的管理权，而不要在构造函数中重复尝试调用 `lock()`。

这保证了在通用的业务场景下（即使后续被保护的数据交换操作抛出了异常），两个互斥量都能在函数退出时被安全且确定地自动解锁，同时也使正常的返回值流程保持极度的整洁。此外值得强调的是，在 `std::lock` 调用内部，对 `lhs.m` 或 `rhs.m` 的加锁过程完全有可能抛出系统级异常；一旦发生异常，该异常会直接向外抛出。如果 `std::lock` 已经成功获取了第一个互斥锁，而在尝试获取第二个互斥锁时被异常打断，那么它会自动将第一个已经持有的锁立即释放：**`std::lock` 在对所提供的互斥量进行加锁时提供了严格的“全有或全无”（all-or-nothing）原子语义**。

C++17 针对这种多锁守护场景提供了更上一层楼的优雅支持：引入了全新的 RAII 类模板 **`std::scoped_lock<>`**。它在功能上与 `std::lock_guard<>` 完全对等，但它是一个**变长参数模板（variadic template）**，支持接收任意数量的互斥量类型作为模板参数，并在构造函数中接收多个互斥量对象。传入其构造函数的多个互斥量会自动使用与 `std::lock` 相同的高效防死锁算法进行整体加锁，并在其析构函数中逆序统一解锁。代码清单 3.6 中的 `swap()` 函数在 C++17 中可以极其优雅地重写为：

```cpp
void swap(X& lhs, X& rhs)
{
    if(&lhs==&rhs)
        return;
    std::scoped_lock guard(lhs.m,rhs.m); // C++17 多互斥量一次性安全加锁
    swap(lhs.some_detail,rhs.some_detail);
}
```

该示例同时巧妙地利用了 C++17 的类模板实参自动推导特性。如果你使用的是 C++17 编译器，模板实参推导机制会自动根据传入构造函数的对象类型推导出正确的互斥量类型。上述简短的语句完全等价于显式指定类型的全写形式：

```cpp
std::scoped_lock<std::mutex,std::mutex> guard(lhs.m,rhs.m);
```

`std::scoped_lock` 的诞生意味着：在 C++17 之前需要繁琐组合使用 `std::lock` 和 `std::adopt_lock` 的绝大多数场景，现在都可以用一行简洁明了的 `std::scoped_lock` 轻松替代，将发生人为编码疏漏的几率降至最低。

虽然 `std::lock`（以及 `std::scoped_lock<>`）能够在需要**同时**获取两个或更多锁的场景下有效防止死锁，但如果多个锁是在不同时间、不同调用栈上**分步获取**的，它便无能为力了。在那种情况下，你必须依靠严格的工程架构纪律来确保系统绝对不会发生死锁。这绝非易事：死锁是多线程软件中最棘手、最阴蔽的缺陷之一，且往往具有极高的偶发性，在绝大部分常规运行场景下一切看起来都运转良好。然而，遵循以下若干条行之有效的通用准则，可以极大地帮助你构建出彻底免除死锁的健壮代码。

### 3.2.5 规避死锁的进阶准则

死锁并非仅仅发生在加锁场景中，尽管锁争用确实是引发死锁最频繁的罪魁祸首；**只需两个线程、完全不需要任何互斥锁，你同样可以制造出经典的死锁**：只需让两个线程互相在对方的 `std::thread` 对象上调用 `join()` 即可。在这种情况下，没有一个线程能够向前运行，因为每个线程都在死等对方执行完毕，如同争抢玩具的孩子一样陷入死局。这种简单的等待环路可以发生在任何一个线程等待另一个线程执行某项操作、而对方恰好也在等待当前线程的任何逻辑同步点上，并且这种环路绝不局限于两个线程：由三个或更多线程构成的闭合等待链同样会导致死锁。

规避死锁的所有准则，归根结底都可以提炼为一句话：**如果另一个线程有可能正在等待你，那么你就绝不要去等待它！** 下列具体的实践准则提供了识别并消除“对方正在等待你”这种潜在可能性的具体方法。

#### 准则 1：避免嵌套加锁 (Avoid nested locks)
第一条原则最为简单直接：**如果你当前已经持有着一个互斥锁，就切勿再去尝试获取另一个锁**。如果你能严格遵循这一准则，那么仅凭锁的使用本身是绝对不可能产生死锁的，因为每个线程在任何时刻至多只持有一个锁。虽然系统仍有可能因其他原因（如相互等待对方线程完成）陷入死锁，但互斥锁作为死锁最主要的源头已被彻底拔除。如果你确实在逻辑上需要同时获取多个锁，请务必使用 `std::lock` 或 `std::scoped_lock` 将其作为单一原子步骤进行整体获取，以规避死锁风险。

#### 准则 2：持有锁期间避免调用用户提供的外部代码 (Avoid calling user-supplied code while holding a lock)
这是上一条准则的自然延伸。因为被调用的代码是由外部或用户提供的，你对其内部的具体行为一无所知；它可能会做任何事情，包括在其内部尝试获取另一个互斥锁。如果你在持有锁的状态下调用了外部未知代码，而该代码恰好又去尝试获取锁，那么你就实质上违反了“避免嵌套加锁”的铁律，从而瞬间敞开了死锁的大门。有时候这在泛型设计中难以完全避免；例如在编写类似 3.2.3 节中的泛型栈时，针对元素类型执行的每一次拷贝或移动操作本质上都是在执行外部用户代码。在这种情况下，你必须借助于下一条准则。

#### 准则 3：按固定顺序获取锁 (Acquire locks in a fixed order)
如果你在架构上绝对必须分步获取两个或多个互斥锁，且无法使用 `std::lock` 将其合并为单一操作，那么次优的黄金法则就是：**在系统中的所有线程中，始终以完全一致的严格全局顺序获取这些锁**。我们在 3.2.4 节中曾简要提及将此作为规避双锁死锁的一种方式：关键在于确立一套在所有线程间高度一致的加锁顺序列。在很多时候这相对直观；但在涉及动态数据结构的遍历时，事情会变得极其微妙。

回顾 3.1 节中的链表示例，保护链表的一种高并发思路是为链表中的每个节点独立分配一个互斥量。为了访问链表，线程必须对它感兴趣的各个节点分别加锁。为了删除一个节点，线程必须同时获取三个节点的互斥锁：待删除的节点本身，以及其前后的两个相邻节点。同理，为了遍历整张链表，线程必须在持有当前节点锁的同时去获取下一个节点的互斥锁，以确保当前节点的 `next` 指向在推进过程中不被修改；一旦成功获取了后继节点的锁，才可以安全释放前一个节点的锁（这种模式通常称为**手递手加锁 / 链式加锁，hand-over-hand locking**）。

这种链式加锁模式允许多个线程在操作不同节点时高度并发地访问链表。然而，**为了防止死锁，所有节点必须始终以完全相同的全局方向顺序进行加锁**：如果有两个线程试图以相反的方向（一个从头向尾，一个从尾向头）在链表上执行链式加锁遍历，它们极易在链表的正中间迎面撞上并陷入死锁！如果节点 A 与节点 B 相邻，正向遍历的线程持有 A 的锁并试图获取 B 的锁；而逆向遍历的线程正持有 B 的锁并试图获取 A 的锁——这是最经典的死锁闭环（如图 3.2 所示）。

```
线程 1 (从头向尾遍历)                   线程 2 (从尾向向头遍历)
锁定主入口互斥量                       锁定主入口互斥量
读取头节点指针                         读取尾节点指针
锁定头节点互斥量                       锁定尾节点互斥量
释放主入口互斥量                       释放主入口互斥量
...                                   ...
持有节点 A 互斥量                      持有节点 C 互斥量
读取 A -> next (指向 B)               读取 C -> prev (指向 B)
成功锁定节点 B 互斥量                  阻塞：尝试锁定节点 B 互斥量...
释放节点 A 互斥量
...
(若两个线程各持有一侧邻居并同时争抢中间节点，或逆序交叉锁定)
=> 发生致命死锁！
```
*图 3.2 两个线程以相反方向遍历链表时发生的死锁示意*

消除此类死锁的一种强制手段是确立单向遍历规则：严格禁止反向遍历链表，所有线程必须始终先锁定前驱节点再锁定后继节点。在许多树状或图状数据结构中，也可以建立类似的严格遍历加锁规范。

#### 准则 4：使用锁层次结构 (Use a lock hierarchy)
尽管这本质上是“定义固定加锁顺序”的一种特殊实现形态，但**锁层次结构（lock hierarchy）**能够提供一种在运行时严格校验代码是否遵守加锁约定次序的坚固防线。其核心思想是：将你的整个应用程序分层，并为可能在每一层中加锁的互斥量赋予相应的层级数值（hierarchy number）。当代码试图锁定一个互斥量时，**如果该线程当前已经持有着一个属于更低层级的互斥锁，则严禁其锁定当前更高层级的互斥量**。你可以在运行时通过为每个互斥量分配层级数字，并让每个线程动态维护其当前所持有锁的层级记录，来实现自动校验。这是一种非常经典的工业级并发架构模式，但 C++ 标准库并未直接提供原生支持，因此你需要自行编写一个自定义的 `hierarchical_mutex` 互斥量类型，其代码如代码清单 3.8 所示。

下面的代码清单展示了两个线程使用层次互斥量的具体行为示例。

代码清单 3.7 使用锁层次结构防止死锁

```cpp
hierarchical_mutex high_level_mutex(10000); // 高层级互斥量
hierarchical_mutex low_level_mutex(5000);   // 低层级互斥量
hierarchical_mutex other_mutex(6000);       // 中间层级互斥量

int do_low_level_stuff();
int low_level_func()
{
    std::lock_guard<hierarchical_mutex> lk(low_level_mutex); // 锁定 5000 层级锁
    return do_low_level_stuff();
}

void high_level_stuff(int some_param);
void high_level_func()
{
    std::lock_guard<hierarchical_mutex> lk(high_level_mutex); // 锁定 10000 层级锁
    high_level_stuff(low_level_func()); // 在持有 10000 锁期间调用需要加锁 5000 的函数：完全合法！
}

void thread_a()
{
    high_level_func(); // 遵从由高到低的层级顺序，运行正常
}

void do_other_stuff();
void other_stuff()
{
    high_level_func(); // 尝试获取 10000 层级锁
    do_other_stuff();
}

void thread_b()
{
    std::lock_guard<hierarchical_mutex> lk(other_mutex); // 锁定 6000 层级锁
    other_stuff(); // 致命错误！在持有 6000 锁期间试图反向锁定 10000 锁，运行时将抛出异常！
}
```

这段代码定义了三个 `hierarchical_mutex` 实例，分别赋予了逐步递减的层级数值（10000、6000、5000）。由于该机制的契约被定义为：一旦你持有了某个 `hierarchical_mutex` 的锁，你接下来**只能去获取层级数值更低的互斥锁**，这为代码的调用行为施加了严谨的单向约束。

假定 `do_low_level_stuff()` 不再尝试获取任何互斥锁，那么 `low_level_func` 处于层级的最底层，持有 5000 级的锁。`high_level_func` 在持有 10000 级锁的状态下调用了 `low_level_func`，这是完全合法的，因为 10000 高于 5000。因此，遵循这一良性调用顺序的 `thread_a()` 能够顺利平稳运行。

相反，`thread_b()` 践踏了层级规则：它首先锁定了层级为 6000 的 `other_mutex`。当 `other_stuff()` 内部调用 `high_level_func()` 时，后者试图去获取层级为 10000 的高层锁——这严重违反了层级约束（当前已持有 6000 级锁，绝不允许再向上反向加锁 10000 级）。`hierarchical_mutex` 会立即在运行时报告这一违规（例如通过抛出 `std::logic_error` 异常或直接中止程序）。在层次互斥锁的保护下，死锁在数学上是绝对不可能发生的，因为互斥量在运行时强制阻断了任何反向获取锁的可能。这确实意味着你不能同时持有两个处于相同层级的锁；因此在链式加锁链条中，链条上的每个互斥量必须拥有比前一个更低的层级数值。

这个示例同时还展示了另一个极其重要的 C++ 标准库设计：**`std::lock_guard<>` 模板可以无缝与任何用户自定义的互斥量类型协同工作！** 尽管 `hierarchical_mutex` 不是标准库内置类型，但只要它实现了满足标准互斥量概念（Mutex concept）所必需的三个基本成员函数——`lock()`、`unlock()` 和 `try_lock()`——它就可以直接套用 `std::lock_guard` 以及标准算法。

代码清单 3.8 展示了 `hierarchical_mutex` 的一个优雅而完备的高性能参考实现。它利用了一个线程局部变量（`thread_local`）来记录当前线程所处的层级状态。

代码清单 3.8 一个简易而完备的层次互斥量实现

```cpp
#include <mutex>
#include <stdexcept>
#include <climits>

class hierarchical_mutex
{
    std::mutex internal_mutex;
    unsigned long const hierarchy_value;
    unsigned long previous_hierarchy_value;
    static thread_local unsigned long this_thread_hierarchy_value;

    void check_for_hierarchy_violation()
    {
        if(this_thread_hierarchy_value <= hierarchy_value)
        {
            throw std::logic_error("mutex hierarchy violated");
        }
    }

    void update_hierarchy_value()
    {
        previous_hierarchy_value=this_thread_hierarchy_value;
        this_thread_hierarchy_value=hierarchy_value;
    }

public:
    explicit hierarchical_mutex(unsigned long value):
        hierarchy_value(value),
        previous_hierarchy_value(0)
    {}

    void lock()
    {
        check_for_hierarchy_violation();
        internal_mutex.lock();
        update_hierarchy_value();
    }

    void unlock()
    {
        if(this_thread_hierarchy_value!=hierarchy_value)
            throw std::logic_error("mutex hierarchy violated");
        this_thread_hierarchy_value=previous_hierarchy_value;
        internal_mutex.unlock();
    }

    bool try_lock()
    {
        check_for_hierarchy_violation();
        if(!internal_mutex.try_lock())
            return false;
        update_hierarchy_value();
        return true;
    }
};

thread_local unsigned long
    hierarchical_mutex::this_thread_hierarchy_value(ULONG_MAX);
```

其核心精髓在于使用了一个代表当前线程专属层级状态的 `thread_local` 静态变量：`this_thread_hierarchy_value`。它被初始赋予了最大整数值 `ULONG_MAX`，因此在初始无锁状态下，当前线程可以合法锁定任意层级的互斥量。因为声明为 `thread_local`，每个系统线程都拥有该变量的独立副本，不同线程之间的层级状态完全隔离、互不干扰。

当某个线程初次锁定一个 `hierarchical_mutex` 实例时，由于当前的 `this_thread_hierarchy_value` 为 `ULONG_MAX`，检查必然顺利通过。随后，`lock()` 委派内部真实的 `std::mutex` 执行实际加锁。加锁成功后，立即将当前线程的层级值更新为该互斥量的层级数值。

如果你在持有此锁的状态下尝试嵌套锁定另一个 `hierarchical_mutex`，此时当前线程记录的层级值已经下降为第一个互斥量的数值。因此，第二个互斥量的层级数值必须严格小于第一个互斥量，校验才被允许通过。

尤为重要的是：必须在类实例内部保存加锁前属于当前线程的**前一个层级值**，以便在 `unlock()` 时予以精确还原；否则一旦发生过降级，即便该线程后续释放了所有锁，它也将永远无法再次锁定更高层级的互斥量。由于这一旧值只有在成功持有 `internal_mutex` 时才会被写入并在释放内部锁之前予以恢复，因此将其安全地存放在 `hierarchical_mutex` 对象的成员变量中是完全受互斥保护、绝对线程安全的。为了防止因乱序解锁造成层级混乱，如果在解锁时发现当前线程的层级值不等于该互斥量本身的层级（说明没有按照严格的后进先出 LIFO 顺序解锁），则立即抛出逻辑异常。

虽然层次互斥量是在运行时进行校验，但这种检测**完全不受偶发时序的影响**——你无需苦苦等待某种微秒级并发竞态发生才暴露缺陷，只要加锁逻辑违背了架构分层，代码在第一次执行该路径时就会立即报错暴露问题。这种分层设计的推演过程本身，就能在编码阶段帮助开发者梳理清架构边界、提前扼杀绝大部分潜在死锁。

#### 将死锁准则推广到锁之外的同步场景
正如本节伊始所强调的，死锁并非互斥锁所特有；任何能够诱发环形等待的同步构造都有可能酿成死锁。因此，将这些准则延伸至更广阔的并发场景是极其明智的。例如，正如应尽可能避免嵌套加锁一样，**在持有着互斥锁的状态下，尽量不要去阻塞等待另一个线程完成**，因为对方线程在执行过程中极有可能需要获取当前线程所持有的这把锁才能向前推进！同理，如果你需要等待子线程执行完毕，也可以在概念上建立一套线程管理层级树，强制规定上层控制线程只允许等待直接属于其下层的子线程完成（最经典的做法便是确保线程的创建与 `join()` 严格封装在同一个生命周期作用域或函数内，正如 2.1.2 节和 2.3 节所述）。

在完成了杜绝死锁的架构设计后，`std::lock()` 结合 `std::lock_guard` 已经能够覆盖大多数常规加锁场景。然而在某些复杂场景下，我们需要更高维度的灵活性。为此，标准库提供了功能更为强大的 **`std::unique_lock`** 模板。

### 3.2.6 使用 `std::unique_lock` 实现灵活加锁

`std::unique_lock` 通过放宽不变式，提供了比 `std::lock_guard` 更加丰富的灵活性：**一个 `std::unique_lock` 实例在任何时刻并不必然总是拥有与其关联的互斥锁**。首先，正如你可以向构造函数传递 `std::adopt_lock` 让锁守卫接管已有的锁一样，你还可以传递 **`std::defer_lock`** 作为构造函数的第二个参数，明确指示互斥量在对象构造时**保持未加锁状态（unlocked）**！随后，你可以在需要的时候显式在 `std::unique_lock` 对象（而非互斥量本身）上调用 `lock()`，或者直接将 `std::unique_lock` 对象作为参数传递给 `std::lock()` 算法！代码清单 3.6 中的交换函数完全可以使用 `std::unique_lock` 结合 `std::defer_lock` 进行重写，如代码清单 3.9 所示。

代码清单 3.9 在 swap 操作中使用 `std::lock()` 与 `std::unique_lock`

```cpp
class some_big_object;
void swap(some_big_object& lhs,some_big_object& rhs);

class X
{
private:
    some_big_object some_detail;
    std::mutex m;
public:
    X(some_big_object const& sd):some_detail(sd){}
    friend void swap(X& lhs, X& rhs)
    {
        if(&lhs==&rhs)
            return;
        std::unique_lock<std::mutex> lock_a(lhs.m,std::defer_lock); // 构造但不加锁
        std::unique_lock<std::mutex> lock_b(rhs.m,std::defer_lock);
        std::lock(lock_a,lock_b); // 在此处一次性安全锁定两个 unique_lock 包装的互斥量
        swap(lhs.some_detail,rhs.some_detail);
    }
};
```

在这段代码中，`std::unique_lock` 实例能够直接传递给 `std::lock()`，因为 `std::unique_lock` 自身提供了标准所需的 `lock()`、`try_lock()` 和 `unlock()` 成员函数。这些函数会将操作透明转发给底层互斥量的同名成员函数，并同步更新 `std::unique_lock` 内部维护的一个布尔状态标志，记录当前实例是否真正持有着锁。该标志的存在至关重要，以确保在析构函数执行时能够正确判断是否需要调用 `unlock()`。你可以随时通过调用 `owns_lock()` 成员函数来查询当前实例是否持有锁。除非你需要转移锁的所有权、或者必须利用延迟加锁特性，否则在 C++17 环境下，你依然应该优先选择无开销的变参 `std::scoped_lock`。

正如你所预料的那样，由于必须在内部维护并更新该状态标志，`std::unique_lock` 对象占用的内存体积通常大于 `std::lock_guard`，且由于伴随额外的标志分支判断，其运行时性能也会微幅弱于极致轻量的 `std::lock_guard`。因此，在轻量简单的场景下，`std::lock_guard` 依然是第一推荐选择。然而，在需要利用延迟加锁、或者需要将锁的所有权在不同作用域之间灵活传递的复杂场合，`std::unique_lock` 则是无可替代的利器。

### 3.2.7 在不同作用域之间转移互斥量所有权

由于 `std::unique_lock` 实例不必在生命周期内死板绑定互斥锁，互斥锁的所有权可以通过**移动语义（move semantics）**在不同的 `std::unique_lock` 实例之间自由转移。在某些情况下这种转移是隐式且自动完成的（例如从函数按值返回一个局部 `unique_lock` 实例），而在其他情况下则必须通过显式调用 `std::move()` 来发起。这完全取决于源对象是一个左值还是右值临时对象：右值源的转移是自动的，而从具名左值变量转移时必须显式调用 `std::move()` 以防止意外剥夺所有权。与 `std::thread` 一样，`std::unique_lock` 是典型的**可移动但不可复制（moveable but not copyable）**的资源管理类型。

这种能力的一个典型应用是：允许某个工厂或底层函数先对互斥量加锁，随后将该锁的所有权原封不动地交接给外部调用方，以便调用方可以在同一个互斥锁的持续保护下执行后续连贯操作。下面的代码片段生动展示了该用法：

```cpp
std::unique_lock<std::mutex> get_lock()
{
    extern std::mutex some_mutex;
    std::unique_lock<std::mutex> lk(some_mutex);
    prepare_data();
    return lk; // 局部变量作为右值直接移出，无需显式 std::move
}

void process_data()
{
    std::unique_lock<std::mutex> lk(get_lock()); // 直接接管从函数返回的锁所有权
    do_something();
} // 离开作用域时由接管者 lk 安全解锁
```

由于 `lk` 是函数内部声明的局部自动变量，它可以被直接按值返回，编译器会自动应用移动构造语义。调用方函数 `process_data()` 随后将其所有权直接转移到自己局部的 `unique_lock` 实例中，整个过程无需任何解锁和重新加锁的缝隙，确保在数据准备与后续处理之间绝无任何第三方线程能够横插进来破坏状态。

这种模式在网关类（gateway class）或门面模式中极其强大：所有对敏感数据的访问都必须通过网关对象进行，当用户需要访问数据时，首先通过工厂函数获取网关实例（该过程自动加锁），随后通过网关的成员方法安全访问数据；当网关实例超出作用域析构时，自动释放互斥锁。

`std::unique_lock` 的另一项巨大灵活性在于：**允许在对象生命周期结束之前，显式提前放弃锁**。你可以通过调用其成员函数 `unlock()` 做到这一点，就像对裸互斥量操作一样。随后如果逻辑需要，还可以再次调用 `lock()` 重新获取锁。能够在析构前有选择地提前释放锁，对于系统的并发性能提升具有不可估量的价值：**过度持有不必要的互斥锁是拖垮并发性能的头号杀手**，因为所有等待该锁的其他线程都会被无谓地长时间阻塞。

### 3.2.8 以适宜的粒度加锁

我们在 3.2.3 节中曾简要探讨过**加锁粒度（lock granularity）**的概念：加锁粒度是一个形象的技术术语，用于描述单个互斥锁所覆盖保护的数据规模大小。细粒度锁（fine-grained lock）保护较小范围的数据，而粗粒度锁（coarse-grained lock）则保护大范围的数据。在多线程设计中，不仅要选择足够粗的粒度来确保必需的不变式被完整保护，**更要确保只在绝对必要的操作期间才持有互斥锁！**

在超市结账排队的日常场景中我们都遇到过这种抓狂的时刻：排在你前面推着满满一推车货物的顾客，轮到他结账时却突然发现自己忘了拿蔓越莓酱，于是丢下一整队等待的人不管、飞奔回货架去找酱；或者收银员扫完所有条码报出金额后，顾客才慢吞吞地开始翻找钱包。如果每个人在走到收银台前就拿齐了所有货物并早早备好银行卡，整条队伍的推进将顺畅得多。

在多线程程序中亦是完全相同的物理法则：如果多个线程正在等待同一个共享资源（收银员），任何一个线程无谓延长持有锁的时间，都会成倍拉长整个系统中所有线程的累计等待时间。**只要可能，请只在真正读写共享数据的关键行持有互斥锁；尽一切可能将耗时的独立数据准备或后续计算移到锁的外部执行！** 尤其切记：**绝对不要在持有互斥锁的同时执行耗时的 I/O 操作（如文件读写、网络调用）！** 文件与磁盘 I/O 的延迟通常比内存访问慢上数百甚至数万倍。除非该互斥锁设立的初衷本身就是为了串行化对该文件的物理访问，否则在持有业务锁期间做 I/O 会将其他需要该锁的线程无情地死死卡住，将多线程并发带来的所有性能提升彻底抹杀殆尽。

`std::unique_lock` 在应对此场景时表现得游刃有余，因为你可以在代码不再需要触碰共享数据时就地调用 `unlock()`，而在后续需要写回结果时再次调用 `lock()`：

```cpp
void get_and_process_data()
{
    std::unique_lock<std::mutex> my_lock(the_mutex);
    some_class data_to_process=get_next_data_chunk();
    my_lock.unlock(); // 关键优化：在执行耗时的纯计算前主动释放互斥锁！

    result_type result=process(data_to_process); // 耗时的密集计算在无锁状态下并发运行

    my_lock.lock();   // 计算完成后重新加锁以写入结果
    write_result(data_to_process,result);
}
```

显而易见，如果你用单个互斥量粗暴覆盖整个复杂数据结构，不仅面临着激烈的争用，而且大幅缩减了提前释放锁的优化空间。这种双重代价极大地激励我们在设计系统时尽可能走向更合理的细粒度加锁。

正如该示例所揭示的，选择适宜的加锁粒度不仅关乎锁定了多少数据，**更关乎持有锁的时间长短，以及在持有锁期间究竟执行了哪些操作**。总的指导原则是：**加锁的时间应当压缩到完成关键操作所需的绝对物理最短极限**。

在代码清单 3.6 和 3.9 中，需要同时锁定两个互斥量的是 `swap` 操作，这在物理上显然需要同时修改两个对象。但设想如果是进行相等性比较操作，且比较的目标只是一个普通的整数成员 `int` 呢？这会有所不同吗？由于整型数据的拷贝成本极低，我们完全可以在分别锁定每个对象的最短微秒内将数据独立拷贝出来，然后在完全不持锁的情况下比较这两个本地副本！这不仅将每个锁的持有时间压至最短，而且彻底消除了同时持有两个锁引发死锁的一切可能性。代码清单 3.10 展示了这样一个类 `Y` 及其相等比较操作符的实现。

代码清单 3.10 在比较操作符中每次只锁定一个互斥量

```cpp
class Y
{
private:
    int some_detail;
    mutable std::mutex m;
    int get_detail() const
    {
        std::lock_guard<std::mutex> lock_a(m);
        return some_detail;
    }
public:
    Y(int sd):some_detail(sd){}
    friend bool operator==(Y const& lhs, Y const& rhs)
    {
        if(&lhs==&rhs)
            return true;
        int const lhs_value=lhs.get_detail(); // 获取 lhs 的值时持有 lhs.m
        int const rhs_value=rhs.get_detail(); // 获取 rhs 的值时持有 rhs.m
        return lhs_value==rhs_value;          // 在完全无锁状态下比较局部副本
    }
};
```

然而必须极度警惕的是：尽管这种优化缩短了加锁时间并根除了死锁隐患，但与同时持有两把锁相比，它**在语义层面上发生了微妙且危险的改变！** 在代码清单 3.10 中，如果比较操作符返回 `true`，其真实含义仅仅代表：`lhs.some_detail` 在某个时间点 $t_1$ 的取值，碰巧等于 `rhs.some_detail` 在稍后的另一个时间点 $t_2$ 的取值！在这两次独立的读取夹缝之间，两个对象的值完全可能被其他并发线程肆意修改过（例如它们的值在两次读取之间被交换了），从而使得该相等比较结果毫无物理实际意义。因此，在做此类粒度优化时必须保持高度审慎，严防破坏业务本身的全局语义一致性：**如果你不能在整个宏观操作的完整周期内始终持有必要的互斥锁，你就会重新将自己暴露在破坏性竞争条件的危险之中。**

有时候，并不存在所谓“适宜”的通用互斥锁粒度，因为不同线程对共享数据结构的访问诉求存在本质差异。在这些场景下，使用普通的 `std::mutex` 显得过于呆板，我们需要更高级的专用替代设施。

## 3.3 保护共享数据的替代设施

尽管互斥量是解决并发保护最通用的基础手段，但在多线程编程的武器库中它绝非唯一的工具；针对特定的经典场景，存在能够提供更高并发性能与更精确语义的专用替代机制。

一个极其典型、且在工程中极为常见的场景是：**共享数据仅仅在系统初始化阶段需要被保护以防并发冲突，而一旦完成初始化构建，该数据在后续生命周期中将变为纯只读数据，完全不再需要任何显式互斥同步！** 在这种场景下，若仅仅为了保护极罕见的首次初始化，而让后续所有高频读取操作在每次访问时都必须机械地锁定互斥量，不仅毫无必要，而且会造成灾难性的性能暴跌。正因如此，C++ 标准库专门提供了一套针对初始化阶段数据保护的高效轻量原语。

### 3.3.1 在初始化期间保护共享数据

设想你拥有一个构建成本极其高昂的重量级共享资源（例如需要建立远程数据库网络连接、或者分配数百兆共享内存），你希望仅在确实有人需要使用它时才进行按需构建。这种**延迟初始化（lazy initialization / 懒加载）**在单线程程序中是极其标准的设计模式：

```cpp
std::shared_ptr<some_resource> resource_ptr;
void foo()
{
    if(!resource_ptr)
    {
        resource_ptr.reset(new some_resource); // 延迟初始化
    }
    resource_ptr->do_something();
}
```

如果该资源在构建完成后本身支持并发读取访问，那么当将其改写为多线程版本时，唯一需要严格保护的临界区只有首次初始化语句。然而，初学者最直观粗暴的改写（如下面的代码清单 3.11 所示）会引发所有工作线程无谓的串行化卡顿：因为每个线程每次调用 `foo()` 时，都必须排队等待互斥锁仅仅为了确认一眼资源是否已被初始化。

代码清单 3.11 使用互斥量的线程安全延迟初始化（低效的串行化瓶颈）

```cpp
std::shared_ptr<some_resource> resource_ptr;
std::mutex resource_mutex;

void foo()
{
    std::unique_lock<std::mutex> lk(resource_mutex); // 所有高频访问线程都在此排队卡顿
    if(!resource_ptr)
    {
        resource_ptr.reset(new some_resource); // 实际上只有初始化需要保护
    }
    lk.unlock();
    resource_ptr->do_something();
}
```

这种不必要的串行化是如此恶劣，以至于历史上无数程序员前仆后继地试图绕过锁设计更快的方案，其中最臭名昭著的莫过于**双重检查锁定模式（Double-Checked Locking Pattern, DCLP）**：代码首先在完全不持锁的状态下读取指针（检查 1）；仅当指针为空时才去获取互斥锁；加锁成功后再重新校验一次指针是否为空（检查 2，防止在争夺锁的间隙其他线程已完成初始化）：

```cpp
void undefined_behaviour_with_double_checked_locking()
{
    if(!resource_ptr) // 检查 1：无锁读取（潜藏致命灾难！）
    {
        std::lock_guard<std::mutex> lk(resource_mutex);
        if(!resource_ptr) // 检查 2：二次确认
        {
            resource_ptr.reset(new some_resource);
        }
    }
    resource_ptr->do_something();
}
```

遗憾的是，这个模式之所以“臭名昭著”，是因为它在传统 C++ 内存模型下**存在极其隐蔽而致命的数据竞争（data race），属于标准的未定义行为！** 核心症结在于：外部无锁的读取操作与另一个线程在互斥锁内部的写入操作之间**缺乏必要的内存可见性同步与指令重排屏障**。即使读取线程发现 `resource_ptr` 指针已经非空，由于 CPU 指令乱序执行或编译器重排优化，指向的 `some_resource` 对象内部的字段可能根本尚未初始化完毕！读取线程随即调用的 `resource_ptr->do_something()` 将在一个半初始化半损坏的幽灵对象上运行，引发灾难性崩溃。关于内存屏障与数据竞争的形式化定义，第 5 章将进行彻底剖析。

C++ 标准委员会深刻意识到了这一刚需，因此在 C++11 标准库中直接引入了专门用于解决此问题的配对同步原语：**`std::once_flag`** 与 **`std::call_once`**。各个线程不再需要手工加锁排队，而是统一直接调用 `std::call_once`；标准库底层利用极其精细的原子指令与内存屏障，保证目标初始化函数**在全局有且仅被一个线程执行恰好一次**，并且在 `std::call_once` 返回时，所有其他等待线程均能立刻获得严格内存同步保证的完整初始化数据。使用 `std::call_once` 的开销远低于显式互斥锁（尤其是当初始化完成后，其开销仅等价于一次低成本的原子读判断）。重写后的代码如下所示：

```cpp
std::shared_ptr<some_resource> resource_ptr;
std::once_flag resource_flag;

void init_resource()
{
    resource_ptr.reset(new some_resource);
}

void foo()
{
    std::call_once(resource_flag,init_resource); // 绝对保证全局仅执行一次
    resource_ptr->do_something();
}
```

在此示例中，`std::once_flag` 实例位于命名空间命名作用域中，但 `std::call_once()` 同样可以极其优雅地用于类成员的延迟初始化，如下面的代码清单所示。

代码清单 3.12 使用 `std::call_once` 对类成员进行线程安全的延迟初始化

```cpp
class X
{
private:
    connection_info connection_details;
    connection_handle connection;
    std::once_flag connection_init_flag;

    void open_connection()
    {
        connection=connection_manager.open(connection_details);
    }
public:
    X(connection_info const& connection_details_):
        connection_details(connection_details_)
    {}

    void send_data(data_packet const& data)
    {
        std::call_once(connection_init_flag,&X::open_connection,this);
        connection.send_data(data);
    }

    data_packet receive_data()
    {
        std::call_once(connection_init_flag,&X::open_connection,this);
        return connection.receive_data();
    }
};
```

在本例中，无论是首次调用 `send_data()` 还是首次调用 `receive_data()`，底层的 `open_connection()` 都只会执行一次。如同标准库中所有接收可调用实参的高阶函数一样，调用成员函数时只需向 `std::call_once` 的末尾追加传入目标对象的 `this` 指针即可。值得注意的是，`std::once_flag` 与 `std::mutex` 一样，是**不可拷贝且不可移动的**；如果将其作为类成员，该类通常必须显式定义或定制其移动与拷贝构造函数。

在初始化安全方面，C++11 还彻底解决了一个历史老大难问题：**局部静态变量（static local variables）的初始化安全（著名的 Meyers 单例模式）**。在 C++11 标准之前，如果多个线程并发首次穿过局部静态变量的声明行，多个线程可能会同时尝试初始化该变量，引发未定义行为。而在现代 C++11 规范中，标准严格规定：**局部静态变量的初始化必须且只能在一个线程上发生，其他并发线程必须原地阻塞等待直至初始化完成！** 这使得在需要线程安全的全局单例时，可以直接写出极为优美且高效的现代单例实现：

```cpp
class my_class;
my_class& get_my_class_instance()
{
    static my_class instance; // C++11 保证其初始化是绝对线程安全的
    return instance;
}
```

仅在初始化阶段需要保护是并发中的一种特殊模式，其更广泛的泛化形式是：**对极少被修改、绝大多数时间处于纯只读状态的数据结构的并发保护**。

### 3.3.2 保护极少更新的数据结构

考虑一个用于将域名解析为 IP 地址的 DNS 本地缓存表。在典型场景下，一个特定的 DNS 记录在很长一段时间内都是恒定不变的（甚至数年保持不变）。尽管随着用户访问新网站偶尔会有新条目加入缓存表中，但该缓存中的绝大部分数据在其生命周期内绝大多数时候都只是被反复并发读取。

虽然更新操作极少发生，但它终究可能发生；一旦该缓存表被多个工作线程共享，在执行更新时就必须进行妥善保护，以防止任何正在并发读取缓存的线程观察到被破坏的内部数据结构。

在缺乏针对读写完全无锁化的专用复杂并发结构前，更新操作要求修改线程必须对数据结构享有**排他性独占访问权（exclusive access）**；一旦修改完毕，数据结构便重新回归到支持多线程并发读取的稳态。如果使用普通的 `std::mutex` 来保护该结构，未免过于悲观消极：因为在没有线程执行写入修改的大部分时间里，它会粗暴将所有并发读取的线程全部串行化，彻底摧毁并发吞吐。我们迫切需要一种新型的互斥锁——通常被称为**读写锁（reader-writer mutex）**，它允许两种截然不同的访问模式：**支持单个“写入（writer）”线程的排他性独占访问，或者支持任意多个“读取（reader）”线程的并发共享访问**。

C++17 标准库直接提供了开箱即用的两种读写互斥锁：**`std::shared_mutex`** 与 **`std::shared_timed_mutex`**（C++14 仅引入了后者，而 C++11 两者均未提供）。二者的核心区别在于：`std::shared_timed_mutex` 额外支持超时等待操作（详见 4.3 节），而如果不需要超时特性，纯粹的 `std::shared_mutex` 在多数平台上能够提供更高的底层执行效率。

在具体使用上，写操作线程可以使用 `std::lock_guard<std::shared_mutex>` 或 `std::unique_lock<std::shared_mutex>` 来获取排他性独占锁；只要有独占锁存在，任何其他试图获取读锁或写锁的线程都会被阻塞。而对于纯只读的读取线程，则可以使用 C++14 引入的专用 RAII 锁守卫模板 **`std::shared_lock<std::shared_mutex>`** 来获取**共享锁（shared lock）**。多个线程可以同时成功持有对同一个 `std::shared_mutex` 的共享锁，彼此并发并行读取数据、毫无阻碍！

代码清单 3.13 展示了一个使用 `std::map` 缓存 DNS 记录、并由 `std::shared_mutex` 提供读写保护的完整实现。

代码清单 3.13 使用 `std::shared_mutex` 保护极少更新的数据结构

```cpp
#include <map>
#include <string>
#include <mutex>
#include <shared_mutex>

class dns_entry;
class dns_cache
{
    std::map<std::string,dns_entry> entries;
    mutable std::shared_mutex entry_mutex;
public:
    dns_entry find_entry(std::string const& domain) const
    {
        std::shared_lock<std::shared_mutex> lk(entry_mutex); // 获取只读共享锁，支持海量并发读取
        std::map<std::string,dns_entry>::const_iterator const it=
            entries.find(domain);
        return (it==entries.end())?dns_entry():it->second;
    }

    void update_or_add_entry(std::string const& domain,
                             dns_entry const& dns_details)
    {
        std::lock_guard<std::shared_mutex> lk(entry_mutex); // 获取独占排他锁，阻断其他读写
        entries[domain]=dns_details;
    }
};
```

在代码清单 3.13 中，`find_entry()` 使用 `std::shared_lock<>` 提供并发只读共享保护；成百上千个工作线程可以同时并发调用 `find_entry()` 而不会引发任何锁阻塞。而 `update_or_add_entry()` 则使用 `std::lock_guard<>` 确保独占访问；在表项更新期间，不仅能够防止其他写线程同时修改，而且能安全阻断所有试图调用 `find_entry()` 的读取线程，直到更新彻底完成。

### 3.3.3 递归加锁

对于标准的 `std::mutex`，如果一个线程尝试去锁定一个它自身已经持有着的互斥量，属于严重的逻辑错误，将直接引发**未定义行为**。然而在某些特殊的架构设计中，允许同一个线程多次重复获取同一个互斥锁（而在未全部释放前不阻塞自身）被认为是合理的。为此，C++ 标准库提供了 **`std::recursive_mutex`**（递归互斥锁 / 可重入锁）。其行为与 `std::mutex` 大致相同，区别在于同一个线程可以对同一个实例多次重复加锁；但加锁与解锁必须严格成对配对——如果你对它调用了三次 `lock()`，那么必须对应调用三次 `unlock()` 之后，该互斥锁才真正被释放供其他线程竞争。正确结合使用 `std::lock_guard<std::recursive_mutex>` 或 `std::unique_lock<std::recursive_mutex>` 会自动为你打理好配对的析构释放。

然而必须郑重指出：**在绝大多数工程场景下，如果你觉得自己需要使用递归互斥锁，往往说明你的面向对象设计本身已经出现了异味与严重坏味道！**

递归互斥锁最常见的应用场景是：某个类被设计为支持多线程并发安全访问，其内部拥有一个互斥量保护成员变量。每个公有（public）成员函数在入口处锁定该互斥量，完成业务后释放。然而有时候，某一个公有成员函数在执行过程中需要调用另一个公有成员函数。如果使用普通互斥量，第二个函数在尝试加锁时会因为自身已持锁而发生致命错误；为了快速交差，程序员往往会走捷径将互斥量粗暴替换为 `std::recursive_mutex`，使得内部调用能够顺利进行。

**这种用法是极度不推荐的**，因为它会导致思维的松懈与脆弱的设计。其核心隐患在于：当公有函数持有锁的过程中，**类内部的不变式通常正处于被临时打破的破损状态中！** 这意味着被间接调用的第二个公有函数必须在不变式处于破损的前提下也能正确工作，这极易引发逻辑错乱。

更加优雅规范的标准重构手法是：**提取出一个全新的私有（private）辅助成员函数**。该私有函数被原先的两个公有成员函数共同调用，且该私有函数**明确假定互斥锁在外部已经处于被锁定的有效状态**，因而其内部不再执行任何加锁动作。随后你可以非常清晰严谨地界定在何种特定前置条件下允许调用该私有辅助函数，以及在那些调用时刻底层数据所必须满足的具体状态不变式。
