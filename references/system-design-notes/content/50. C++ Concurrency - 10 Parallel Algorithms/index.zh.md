---
id: cpp-concurrency-10-parallel-algorithms
title: "第 10 章：并行算法"
titleEn: "Chapter 10: Parallel algorithms"
order: 50
category: specialized
description: "C++17 执行策略、标准算法的并行化以及性能考量与实战应用。"
tags: ["C++", "C++17", "并行STL", "执行策略", "std::execution"]
---

# 第 10 章：并行算法

本章涵盖以下内容：

- 使用 C++17 并行算法

在上一章中，我们探讨了高级线程管理与线程池；在第 8 章中，我们研究了并发代码的设计，并以某些算法的并行版本作为示例。在这一章中，我们将深入了解 C++17 标准提供的并行算法。闲言少叙，让我们直接开始。

## 10.1 标准库算法的并行化

C++17 标准在 C++ 标准库中引入了并行算法的概念。它们是许多作用于区间（ranges）的函数（例如 `std::find`、`std::transform` 和 `std::reduce`）的重载版本。并行版本的函数签名与“普通”单线程版本相同，唯一的区别在于新增了第一个参数，用于指定要使用的执行策略（execution policy）。例如：

```cpp
std::vector<int> my_data;
std::sort(std::execution::par, my_data.begin(), my_data.end());
```

执行策略 `std::execution::par` 向标准库表明：允许将此调用作为并行算法执行，并使用多线程处理。请注意，这是一种**许可**而非**强制要求**——如果实现愿意，它仍然可以在单线程上执行该代码。另外必须注意，通过指定执行策略，对算法复杂度的要求也发生了变化，通常比普通串行算法的要求更宽松。这是因为并行算法为了充分利用系统的并行能力，往往需要做更多的总体工作——如果你能将工作分摊到 100 个处理器上，即使实现所做的总计算量是原来的两倍，你仍然可以获得高达 50 倍的整体加速。

在深入讨论具体的算法之前，我们先来看看执行策略。

## 10.2 执行策略

标准定义了三种执行策略：

- `std::execution::sequenced_policy`
- `std::execution::parallel_policy`
- `std::execution::parallel_unsequenced_policy`

这些类均定义在 `<execution>` 头文件中。该头文件还定义了三个对应的策略对象，供传递给各个算法：

- `std::execution::seq`
- `std::execution::par`
- `std::execution::par_unseq`

你不能指望自己能够直接构造这些策略类的对象（除非拷贝这三个现有对象），因为它们可能具有特殊的初始化需求。具体实现还可以定义具有实现特定行为的其他附加执行策略。但用户不能自定义执行策略。

这些策略对算法行为造成的影响将在 10.2.1 节中进行阐述。任何给定的实现也允许提供带有任意语义的附加执行策略。现在让我们来看看使用标准执行策略的影响，首先从接受执行策略的所有算法重载的通用变化开始。

### 10.2.1 指定执行策略的总体影响

如果你向标准库算法传递了一个执行策略，该算法的行为将受此执行策略管辖。这会在以下几个方面影响其行为：

- 算法的复杂度
- 抛出异常时的行为
- 算法各个步骤在何处、以何种方式以及何时执行

#### 对算法复杂度的影响
如果向算法提供了执行策略，该算法的复杂度可能会发生变化：除了管理并行执行所带来的调度开销之外，许多并行算法还会执行更多的算法核心操作（无论是交换元素、比较元素，还是应用传入的函数对象），其目的是在总耗时方面带来整体性能提升。

复杂度变化的具体细节因算法而异，但总体原则是：如果一个算法原本规定某项操作恰好发生“某个表达式”次，或者最多发生“某个表达式”次，那么带有执行策略的重载版本会将该要求放宽到 $O(\text{某个表达式})$。这意味着带有执行策略的重载版本所执行的操作次数可能是无执行策略对应版本的若干倍，而该倍数取决于标准库的内部实现和平台特性，而非传递给算法的数据。

#### 异常行为
如果在使用执行策略执行算法期间抛出了异常，其后果由执行策略决定。对于所有标准提供的执行策略，若存在任何未捕获的异常，都将调用 `std::terminate`。通过带有标准执行策略的标准库算法调用可能抛出的唯一异常是 `std::bad_alloc`，当标准库无法为其内部操作获取足够的内存资源时便会抛出该异常。例如，下面没有执行策略的 `std::for_each` 调用将正常传播异常：

```cpp
std::for_each(v.begin(), v.end(), [](auto x){ throw my_exception(); });
```

而带有执行策略的对应调用则会直接终止程序：

```cpp
std::for_each(
    std::execution::seq, v.begin(), v.end(),
    [](auto x){ throw my_exception(); });
```

这是使用 `std::execution::seq` 与完全不提供执行策略之间的关键区别之一。

#### 算法步骤在何时何地执行
这是执行策略最根本的方面，也是各个标准执行策略之间唯一的区别所在。执行策略指定了使用哪些执行代理（execution agents）来执行算法的各个步骤，无论是“普通”线程、向量流（vector streams）、GPU 线程还是其他任何执行单元。执行策略还会规定在算法步骤的运行方式上是否存在任何顺序约束：它们是否按特定顺序运行、不同算法步骤的各个部分是否可以彼此交织（interleave），或者是否可以彼此并行运行，等等。

每个标准执行策略的具体细节将在 10.2.2、10.2.3 和 10.2.4 节中给出，首先从最基本的策略 `std::execution::sequenced_policy` 开始。

### 10.2.2 std::execution::sequenced_policy

顺序策略并不是用于实现并行的策略：使用它会强制实现将所有操作都在调用该函数的线程上执行，因此没有任何并行性。但它仍然属于执行策略，因此在算法复杂度和异常处理效果上，与其他标准策略具有相同的规则。

不仅所有操作必须在同一个线程上执行，而且它们必须按照某种确定的顺序执行，因此不会发生交错。但具体的操作顺序是未指定的（unspecified），并且在函数的不同次调用之间可能有所不同。特别是，操作的执行顺序并不保证与没有执行策略的对应重载版本的执行顺序相同。例如，以下对 `std::for_each` 的调用将用数字 1 到 1,000 填充 vector，但顺序未指定；这与没有执行策略的重载版本形成对比，后者会按严格顺序存储这些数字：

```cpp
std::vector<int> v(1000);
int count = 0;
std::for_each(std::execution::seq, v.begin(), v.end(),
    [&](int& x){ x = ++count; });
```

数字可能会按顺序存储，但你绝对不能依赖这一点。

这意味着顺序执行策略对算法中使用的迭代器、值和可调用对象施加的要求非常少：它们可以自由使用同步机制，并且可以依赖于所有操作都在同一个线程上调用的事实，尽管它们不能依赖于这些操作的执行顺序。

### 10.2.3 std::execution::parallel_policy

并行策略提供了跨多线程的基本并行执行能力。操作既可以在调用算法的线程上执行，也可以在库创建的线程上执行。在给定线程上执行的操作必须以确定的顺序执行，且不能交错，但具体顺序是未指定的，并且在不同次调用之间可能会有所不同。给定的某项操作在其整个执行期间都将在一个固定的线程上运行。

相比顺序策略，这给算法所使用的迭代器、值和可调用对象增加了额外的要求：如果并行调用它们，绝不能引发数据竞争（data race），并且绝不能依赖于与其他操作运行在同一线程上，同样也不能依赖于不与其他操作运行在同一线程上。

对于绝大多数在没有执行策略时使用的标准库算法场景，你都可以直接使用并行执行策略。只有当元素之间需要特定的执行顺序，或者存在对共享数据的未同步访问时，才会产生问题。对 vector 中的所有值进行递增可以完全并行进行：

```cpp
std::for_each(std::execution::par, v.begin(), v.end(), [](auto& x){ ++x; });
```

而前面填充 vector 的示例若采用并行执行策略则是错误的；具体来说，这属于未定义行为（undefined behavior）：

```cpp
std::for_each(std::execution::par, v.begin(), v.end(),
    [&](int& x){ x = ++count; });
```

在这里，lambda 的每一次调用都会修改变量 `count`。如果库在多个线程之间并发执行该 lambda，就会产生数据竞争，从而导致未定义行为。`std::execution::parallel_policy` 的要求明确禁止了这种情况：即使该库在本次调用中实际上没有使用多个线程，进行上述调用依然是未定义行为。某种行为是否表现为未定义行为，是该调用的静态属性，而不取决于库运行时的具体实现细节。

然而，函数调用之间的同步是允许的。因此，你可以通过将 `count` 改为 `std::atomic<int>` 而非普通 `int`，或者通过使用互斥锁来恢复定义良好的行为。在此例中，这样做可能会失去使用并行执行策略的意义，因为这会导致所有调用串行化；但在一般情况下，这允许对共享状态进行同步访问。

### 10.2.4 std::execution::parallel_unsequenced_policy

并行无序策略为标准库提供了最大程度的算法并行化空间，代价是对算法中使用的迭代器、值和可调用对象施加了最为严格的要求。

使用并行无序策略调用的算法可以在未指定的执行线程上执行算法步骤，彼此之间既无序也不按顺序执行。这意味着：单个线程上的操作现在可以相互交错（例如在同一个线程上前一个操作尚未完成时，第二个操作就已经开始），并且操作可以在线程之间迁移（即某个操作可以在一个线程上启动，在第二个线程上继续运行，并在第三个线程上完成）。

如果你使用并行无序策略，提供给算法的迭代器、值和可调用对象所执行的操作**绝不能使用任何形式的同步**，也不能调用任何与其他代码发生同步的函数，或者调用任何让其他代码与其发生同步的函数。

这意味着这些操作只能对相关的当前元素或基于该元素可访问的数据进行操作，并且绝不能修改线程之间或元素之间共享的任何状态。

稍后我们将通过具体示例来详细说明。现在，让我们来看看具体的并行算法本身。

## 10.3 C++ 标准库中的并行算法

`<algorithm>` 和 `<numeric>` 头文件中的绝大多数算法都提供了接受执行策略的重载版本。这包括：`all_of`、`any_of`、`none_of`、`for_each`、`for_each_n`、`find`、`find_if`、`find_end`、`find_first_of`、`adjacent_find`、`count`、`count_if`、`mismatch`、`equal`、`search`、`search_n`、`copy`、`copy_n`、`copy_if`、`move`、`swap_ranges`、`transform`、`replace`、`replace_if`、`replace_copy`、`replace_copy_if`、`fill`、`fill_n`、`generate`、`generate_n`、`remove`、`remove_if`、`remove_copy`、`remove_copy_if`、`unique`、`unique_copy`、`reverse`、`reverse_copy`、`rotate`、`rotate_copy`、`is_partitioned`、`partition`、`stable_partition`、`partition_copy`、`sort`、`stable_sort`、`partial_sort`、`partial_sort_copy`、`is_sorted`、`is_sorted_until`、`nth_element`、`merge`、`inplace_merge`、`includes`、`set_union`、`set_intersection`、`set_difference`、`set_symmetric_difference`、`is_heap`、`is_heap_until`、`min_element`、`max_element`、`minmax_element`、`lexicographical_compare`、`reduce`、`transform_reduce`、`exclusive_scan`、`inclusive_scan`、`transform_exclusive_scan`、`transform_inclusive_scan` 以及 `adjacent_difference`。

这是一个非常庞大的列表；C++ 标准库中几乎所有可以并行化的算法都名列其中。值得注意的例外包括 `std::accumulate` 等，它严格要求串行累加；但其通用的对应算法 `std::reduce` 确实出现在列表中——标准对此附带了相应的警告：如果归约操作不满足结合律和交换律，那么由于未指定的操作顺序，结果可能具有不确定性。

对于列表中的每个算法，每个“普通”重载版本都有一个新变体，它接受执行策略作为第一个参数——“普通”重载版本的对应参数紧随该执行策略之后。例如，`std::sort` 有两个没有执行策略的“普通”重载版本：

```cpp
template<class RandomAccessIterator>
void sort(RandomAccessIterator first, RandomAccessIterator last);

template<class RandomAccessIterator, class Compare>
void sort(
    RandomAccessIterator first, RandomAccessIterator last, Compare comp);
```

因此，它也有两个带有执行策略的重载版本：

```cpp
template<class ExecutionPolicy, class RandomAccessIterator>
void sort(
    ExecutionPolicy&& exec,
    RandomAccessIterator first, RandomAccessIterator last);

template<class ExecutionPolicy, class RandomAccessIterator, class Compare>
void sort(
    ExecutionPolicy&& exec,
    RandomAccessIterator first, RandomAccessIterator last, Compare comp);
```

在带与不带执行策略参数的签名之间存在一个重要区别，该区别仅对部分算法产生影响：如果“普通”算法允许使用输入迭代器（Input Iterator）或输出迭代器（Output Iterator），那么带有执行策略的重载版本则要求使用前向迭代器（Forward Iterator）。这是因为输入迭代器在本质上是单趟（single-pass）的：你只能访问当前元素，无法保存指向先前元素的迭代器。类似地，输出迭代器只允许写入当前元素：你不能前进后再回退写入前面的元素。

> ### C++ 标准库中的迭代器类别
> C++ 标准库定义了五种迭代器类别：输入迭代器（Input Iterators）、输出迭代器（Output Iterators）、前向迭代器（Forward Iterators）、双向迭代器（Bidirectional Iterators）以及随机访问迭代器（Random Access Iterators）。
>
> - **输入迭代器**：用于单趟读取数值的迭代器。常用于控制台或网络输入、生成序列等场景。对输入迭代器进行递增会使该迭代器的任何副本失效。
> - **输出迭代器**：用于单趟写入数值的迭代器。常用于向文件输出或向容器添加元素。对输出迭代器进行递增会使该迭代器的任何副本失效。
> - **前向迭代器**：用于单向遍历持久数据的多趟（multipass）迭代器。虽然不能让迭代器后退到前一个元素，但可以保存副本并使用它们引用先前的元素。前向迭代器返回对元素的真实引用，因此既可用于读取，也可用于写入（如果目标非常量）。
> - **双向迭代器**：与前向迭代器类似的多趟迭代器，但还可以向后移动以访问先前的元素。
> - **随机访问迭代器**：可以像双向迭代器一样向前和向后移动，但步长可以大于单个元素，并且可以使用数组下标运算符直接通过偏移量访问任意位置的元素。

因此，对比 `std::copy` 的普通签名：

```cpp
template<class InputIterator, class OutputIterator>
OutputIterator copy(
    InputIterator first, InputIterator last, OutputIterator result);
```

带有执行策略的重载签名变为：

```cpp
template<class ExecutionPolicy,
    class ForwardIterator1, class ForwardIterator2>
ForwardIterator2 copy(
    ExecutionPolicy&& policy,
    ForwardIterator1 first, ForwardIterator1 last,
    ForwardIterator2 result);
```

虽然从编译器的角度来看模板参数的名称没有直接语法影响，但从 C++ 标准的角度来看具有决定性意义：标准库算法的模板参数名称代表了对类型的**语义约束**，并且算法将依赖于这些约束所蕴含的操作及其规范语义。就输入迭代器与前向迭代器而言，前者允许解引用迭代器返回一个代理类型（该类型可转换为迭代器的值类型）；而后者则要求解引用迭代器返回对值的真实引用，并且所有相等的迭代器都必须返回对同一值的引用。

这对于并行性至关重要：这意味着迭代器可以自由拷贝并在各处等价使用。此外，“递增前向迭代器不会使其他副本失效”这一要求也很关键，这意味着各个线程可以在自己的迭代器副本上独立操作并在需要时递增，而无需担心使其他线程持有的迭代器失效。如果带执行策略的重载允许使用输入迭代器，就会迫使所有线程对用于从源序列读取数据的唯一步进迭代器进行串行同步访问，这显然极大地限制了并行潜力。

下面让我们看几个具体的实例。

### 10.3.1 使用并行算法的示例

最简单的例子莫过于并行循环：为容器中的每个元素执行某项操作。这是“易并行”（embarrassingly parallel）场景的典型代表：每个项都是独立的，因此具有最大的并行潜力。在使用支持 OpenMP 的编译器时，你可能会这样写：

```cpp
#pragma omp parallel for
for(unsigned i = 0; i < v.size(); ++i){
    do_stuff(v[i]);
}
```

而使用 C++ 标准库算法，你可以改写为：

```cpp
std::for_each(std::execution::par, v.begin(), v.end(), do_stuff);
```

这会将区间的各个元素划分到库所创建的内部线程之间，并对区间中的每个元素 `x` 调用 `do_stuff(x)`。这些元素如何在各个线程之间划分属于具体实现的细节。

#### 执行策略的选择
除非你的实现提供了更适合需求的非标准策略，否则 `std::execution::par` 是你最常使用的策略。如果你的代码适合并行化，那么它就应该能够与 `std::execution::par` 一起正常工作。在某些情况下，你也可以改用 `std::execution::par_unseq`。这可能不会带来额外收益（没有哪个标准执行策略能保证一定会达到的并行级别），但通过对代码施加更严格的约束，它赋予了标准库通过重排和交织任务来进一步提升性能的空间。在这些更严格的约束中，最显著的一点是：在访问元素或对元素执行操作时**不得使用任何同步机制**。这意味着你不能使用互斥锁、原子变量或前几章中介绍的任何其他同步原语来确保多线程访问的安全；相反，你必须完全依赖算法本身不会从多个线程同时访问同一个元素，并在调用并行算法的外部使用同步机制以防止其他外部线程访问该数据。

清单 10.1 中的示例展示了一段可与 `std::execution::par` 搭配使用、但**不能**与 `std::execution::par_unseq` 搭配使用的代码。内部互斥锁用于同步意味着若试图使用 `std::execution::par_unseq` 将导致未定义行为。

清单 10.1 在具有内部同步的类上使用并行算法

```cpp
class X{
    mutable std::mutex m;
    int data;

public:
    X():data(0){}
    int get_value() const{
        std::lock_guard guard(m);
        return data;
    }
    void increment(){
        std::lock_guard guard(m);
        ++data;
    }
};

void increment_all(std::vector<X>& v){
    std::for_each(std::execution::par, v.begin(), v.end(),
        [](X& x){
            x.increment();
        });
}
```

接下来的清单展示了一个可以与 `std::execution::par_unseq` 搭配使用的替代方案。在这种情况下，内部每个元素独立的互斥锁被替换为了保护整个容器的单个互斥锁。

清单 10.2 在无内部同步的类上使用并行算法

```cpp
class Y{
    int data;

public:
    Y():data(0){}
    int get_value() const{
        return data;
    }
    void increment(){
        ++data;
    }
};

class ProtectedY{
    std::mutex m;
    std::vector<Y> v;

public:
    void lock(){
        m.lock();
    }
    void unlock(){
        m.unlock();
    }
    std::vector<Y>& get_vec(){
        return v;
    }
};

void increment_all(ProtectedY& data){
    std::lock_guard guard(data);
    auto& v = data.get_vec();
    std::for_each(std::execution::par_unseq, v.begin(), v.end(),
        [](Y& y){
            y.increment();
        });
}
```

在清单 10.2 中，各个元素的访问过程完全没有同步开销，因此可以安全地使用 `std::execution::par_unseq`。其缺点在于，并行算法调用之外其他线程的并发访问现在必须等待整个操作完成，而无法享受到清单 10.1 中细粒度的元素级并发。

现在，让我们看一个更贴近实际应用的例子：统计网站的访问日志。

### 10.3.2 计算访问次数

假设你运营着一个高流量网站，日志包含数以百万计的条目，你想处理这些日志以查看聚合数据：每个页面有多少次访问、这些访问来自何处、使用了哪些浏览器等等。分析这些日志由两个部分组成：处理每一行日志以提取相关信息，以及将结果聚合成总体统计。这是使用并行算法的绝佳场景，因为处理每一行日志彼此完全独立，只要最终汇总正确，聚合结果就可以逐步分块完成。

特别是，这类任务正是为 `transform_reduce` 量身定制的。下面的清单展示了如何将其应用于该任务。

清单 10.3 使用 transform_reduce 统计网站各页面的访问次数

```cpp
#include <vector>
#include <string>
#include <unordered_map>
#include <numeric>
#include <execution>

struct log_info {
    std::string page;
    time_t visit_time;
    std::string browser;
    // 其他字段
};

extern log_info parse_log_line(std::string const &line);

using visit_map_type = std::unordered_map<std::string, unsigned long long>;

visit_map_type
count_visits_per_page(std::vector<std::string> const &log_lines) {

    struct combine_visits {
        visit_map_type
        operator()(visit_map_type lhs, visit_map_type rhs) const {
            if(lhs.size() < rhs.size())
                std::swap(lhs, rhs);
            for(auto const &entry : rhs) {
                lhs[entry.first] += entry.second;
            }
            return lhs;
        }

        visit_map_type operator()(log_info log, visit_map_type map) const {
            ++map[log.page];
            return map;
        }

        visit_map_type operator()(visit_map_type map, log_info log) const {
            ++map[log.page];
            return map;
        }

        visit_map_type operator()(log_info log1, log_info log2) const {
            visit_map_type map;
            ++map[log1.page];
            ++map[log2.page];
            return map;
        }
    };

    return std::transform_reduce(
        std::execution::par, log_lines.begin(), log_lines.end(),
        visit_map_type(), combine_visits(), parse_log_line);
}
```

假设你有一个函数 `parse_log_line` 用于从日志条目中提取相关信息，那么你的 `count_visits_per_page` 函数实质上就是对 `std::transform_reduce` 调用的简易封装。复杂性主要来源于归约操作：你需要能够组合两个 `log_info` 结构生成 map、组合一个 `log_info` 结构与一个 map（两种排列顺序均需支持），以及组合两个 map。因此，你的 `combine_visits` 函数对象需要提供该函数调用运算符的四种重载版本，这使得无法使用简短的单个 lambda 表达式直接完成，尽管这四种重载本身的实现非常直接。

由于你传入了 `std::execution::par`，`std::transform_reduce` 的实现将利用可用的硬件并行执行此项计算。正如我们在上一章所看到的，手动编写这种并行算法并不轻松，因此借助标准库能够将实现并行的繁重工作委托给标准库实现者，从而让你能够专注于所需的业务计算结果。

### 本章小结

在本章中，我们探讨了 C++ 标准库中提供的并行算法及其使用方法。我们研究了各种执行策略、选择执行策略对算法行为造成的影响，以及策略对你的代码所施加的约束。最后，我们通过一个在真实生产场景中使用并行算法进行大规模日志聚合分析的实例展示了其实际用法。
