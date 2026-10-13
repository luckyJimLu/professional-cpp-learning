---
id: cpp-concurrency-15-appendix-d
title: "附录 D：C++ 线程库参考手册"
titleEn: "Appendix D: C++ Thread Library reference"
order: 55
category: specialized
description: "C++ 标准多线程库完整 API 参考手册：覆盖 <chrono>、<condition_variable>、<atomic>、<future>、<mutex>、<ratio> 与 <thread> 全套核心头文件。"
tags: ["C++", "API参考", "std::thread", "std::mutex", "std::atomic", "std::future", "std::chrono"]
---

# 附录 D：C++ 线程库参考手册 (C++ Thread Library reference)

> 本附录提供 C++ 标准线程库核心头文件（`<chrono>`、`<condition_variable>`、`<atomic>`、`<future>`、`<mutex>`、`<ratio>`、`<thread>`）的完整技术参考手册。包含所有类定义、成员函数原型声明、前置/后置条件、异常安全性保证及同步语义规范。


## D.1 <chrono> 头文件

`<chrono>` 头文件提供了用于表示时间点（time points）、时长（durations）以及时钟（clocks）的类。时钟类充当 `time_point` 的源。每个时钟都有一个 `is_steady` 静态数据成员，用于指示其是否是一个以恒定速率滴答且无法被调整的稳定时钟。在标准库提供的时钟中，`std::chrono::steady_clock` 是唯一保证具备稳定性的时钟。

### 头文件内容摘要

```cpp
namespace std
{
   namespace chrono
   {
       template<typename Rep, typename Period = ratio<1>>
       class duration;

       template<
           typename Clock,
           typename Duration = typename Clock::duration>
       class time_point;

       class system_clock;
       class steady_clock;
       typedef unspecified-clock-type high_resolution_clock;
   }
}
```

### D.1.1 std::chrono::duration 类模板

`std::chrono::duration` 类模板提供了表示时间间隔（时长）的机制。模板参数 `Rep` 和 `Period` 分别表示用于存储时长数值的数据类型，以及一个指示连续两次“滴答（tick）”之间时间间隔（以秒的分数表示）的 `std::ratio` 类模板实例化。例如，`std::chrono::duration<int, std::milli>` 表示以 `int` 存储的毫秒计数值；`std::chrono::duration<short, std::ratio<1, 50>>` 表示以 `short` 存储的五十分之一秒的计数值；而 `std::chrono::duration<long long, std::ratio<60, 1>>` 表示以 `long long` 存储的分钟计数值。

##### 类定义

```cpp
template <class Rep, class Period = ratio<1>>
class duration
{
public:
    typedef Rep rep;
    typedef Period period;

    constexpr duration() = default;
    ~duration() = default;

    duration(const duration&) = default;
    duration& operator=(const duration&) = default;

    template <class Rep2>
    constexpr explicit duration(const Rep2& r);

    template <class Rep2, class Period2>
    constexpr duration(const duration<Rep2, Period2>& d);

    constexpr rep count() const;
    constexpr duration operator+() const;
    constexpr duration operator-() const;
    duration& operator++();
    duration operator++(int);
    duration& operator--();
    duration operator--(int);
    duration& operator+=(const duration& d);
    duration& operator-=(const duration& d);
    duration& operator*=(const rep& rhs);
    duration& operator/=(const rep& rhs);
    duration& operator%=(const rep& rhs);
    duration& operator%=(const duration& rhs);
    static constexpr duration zero();
    static constexpr duration min();
    static constexpr duration max();
};

// 非成员运算函数
template <class Rep1, class Period1, class Rep2, class Period2>
constexpr bool operator==(
    const duration<Rep1, Period1>& lhs,
    const duration<Rep2, Period2>& rhs);

template <class Rep1, class Period1, class Rep2, class Period2>
constexpr bool operator!=(
    const duration<Rep1, Period1>& lhs,
    const duration<Rep2, Period2>& rhs);

template <class Rep1, class Period1, class Rep2, class Period2>
constexpr bool operator<(
    const duration<Rep1, Period1>& lhs,
    const duration<Rep2, Period2>& rhs);

template <class Rep1, class Period1, class Rep2, class Period2>
constexpr bool operator<=(
    const duration<Rep1, Period1>& lhs,
    const duration<Rep2, Period2>& rhs);

template <class Rep1, class Period1, class Rep2, class Period2>
constexpr bool operator>(
    const duration<Rep1, Period1>& lhs,
    const duration<Rep2, Period2>& rhs);

template <class Rep1, class Period1, class Rep2, class Period2>
constexpr bool operator>=(
    const duration<Rep1, Period1>& lhs,
    const duration<Rep2, Period2>& rhs);

template <class ToDuration, class Rep, class Period>
constexpr ToDuration duration_cast(const duration<Rep, Period>& d);
```

##### 类型要求
`Rep` 必须是内置算术类型，或是表现得像数字的用户自定义类型。`Period` 必须是 `std::ratio<>` 的特化实例化。

#### std::chrono::duration::rep 类型定义

用于保存时长值中滴答次数（tick count）的底层表示类型。

##### 声明
```cpp
typedef Rep rep;
```

`rep` 是用于保存 `duration` 对象内部计数值的数据类型。

#### std::chrono::duration::period 类型定义

用于指定每个滴答计数所代表的秒数分数的 `std::ratio` 实例化类型。例如，若 `period` 为 `std::ratio<1, 50>`，则 `count()` 为 N 的时长对象代表 N 个 1/50 秒。

##### 声明
```cpp
typedef Period period;
```

#### std::chrono::duration 默认构造函数

构造具有默认值的 `std::chrono::duration` 实例。

##### 声明
```cpp
constexpr duration() = default;
```

##### 效果
时长对象的内部值（类型为 `rep`）被默认初始化。

##### 抛出异常
无。

#### std::chrono::duration 基于计数值的转换构造函数

使用指定的计数值构造 `std::chrono::duration` 实例。

##### 声明
```cpp
template <class Rep2>
constexpr explicit duration(const Rep2& r);
```

##### 效果
时长对象的内部计数值使用 `static_cast<rep>(r)` 进行初始化。

##### 类型要求
仅当 `Rep2` 可隐式转换为 `Rep`，且满足“`Rep` 为浮点类型”或“`Rep2` 不是浮点类型”时，该构造函数才参与重载决议。

##### 后置条件
`this->count() == static_cast<rep>(r)`

##### 抛出异常
无。

#### std::chrono::duration 基于其他 duration 的转换构造函数

通过缩放另一个 `std::chrono::duration` 对象的计数值来构造当前时长实例。

##### 声明
```cpp
template <class Rep2, class Period2>
constexpr duration(const duration<Rep2, Period2>& d);
```

##### 效果
内部值初始化为 `duration_cast<duration<Rep, Period>>(d).count()`。

##### 类型要求
仅当 `Rep` 为浮点类型，或者满足“`Rep2` 不是浮点类型且 `Period2` 是 `Period` 的整数倍（即 `ratio_divide<Period2, Period>::den == 1`）”时，该构造函数才参与重载决议。这可以避免因将较小周期存入较大周期的变量中而导致的意外截断与精度损失。

##### 后置条件
`this->count() == duration_cast<duration<Rep, Period>>(d).count()`

##### 使用示例

```cpp
duration<int, ratio<1, 1000>> ms(5);
duration<int, ratio<1, 1>> s(ms); // 编译错误：可能发生截断
duration<double, ratio<1, 1>> s2(ms); // 正确：double 允许精度缩放
```

#### std::chrono::duration::count 成员函数

获取当前时长对象的滴答计数值。

##### 声明
```cpp
constexpr rep count() const;
```

##### 返回值
返回时长对象内部保存的计数值（类型为 `rep`）。

##### 抛出异常
无。

#### std::chrono::duration::operator+ 一元正号运算符

返回当前时长对象的一份副本。

##### 声明
```cpp
constexpr duration operator+() const;
```

##### 返回值
`*this`

##### 抛出异常
无。

#### std::chrono::duration::operator- 一元负号运算符

返回当前时长对象取反后的副本。

##### 声明
```cpp
constexpr duration operator-() const;
```

##### 返回值
`duration(-count())`

##### 抛出异常
无。

#### std::chrono::duration::operator++ 前置递增运算符

将内部计数值加 1。

##### 声明
```cpp
duration& operator++();
```

##### 效果
内部计数值递增 1。

##### 返回值
`*this`

##### 抛出异常
无。

#### std::chrono::duration::operator++ 后置递增运算符

将内部计数值加 1，并返回递增前的副本。

##### 声明
```cpp
duration operator++(int);
```

##### 返回值
`duration(count()++)`

##### 抛出异常
无。

#### std::chrono::duration::operator-- 前置递减运算符

将内部计数值减 1。

##### 声明
```cpp
duration& operator--();
```

##### 效果
内部计数值递减 1。

##### 返回值
`*this`

##### 抛出异常
无。

#### std::chrono::duration::operator-- 后置递减运算符

将内部计数值减 1，并返回递减前的副本。

##### 声明
```cpp
duration operator--(int);
```

##### 返回值
`duration(count()--)`

##### 抛出异常
无。

#### std::chrono::duration::operator+= 复合加法赋值运算符

将另一个时长对象的计数值加到当前对象中。

##### 声明
```cpp
duration& operator+=(const duration& d);
```

##### 效果
内部计数值增加 `d.count()`。

##### 返回值
`*this`

##### 抛出异常
无。

#### std::chrono::duration::operator-= 复合减法赋值运算符

从当前对象中减去另一个时长对象的计数值。

##### 声明
```cpp
duration& operator-=(const duration& d);
```

##### 效果
内部计数值减去 `d.count()`。

##### 返回值
`*this`

##### 抛出异常
无。

#### std::chrono::duration::operator*= 复合乘法赋值运算符

将当前时长对象的内部计数值乘以一个纯标量数值。

##### 声明
```cpp
duration& operator*=(const rep& rhs);
```

##### 效果
内部计数值乘以 `rhs`。

##### 返回值
`*this`

##### 抛出异常
无。

#### std::chrono::duration::operator/= 复合除法赋值运算符

将当前时长对象的内部计数值除以一个纯标量数值。

##### 声明
```cpp
duration& operator/=(const rep& rhs);
```

##### 效果
内部计数值除以 `rhs`。

##### 返回值
`*this`

##### 抛出异常
无。

#### std::chrono::duration::operator%= 复合取模赋值运算符（标量）

将当前时长对象的内部计数值对标量数值取模。

##### 声明
```cpp
duration& operator%=(const rep& rhs);
```

##### 效果
内部计数值更新为 `count() % rhs`。

##### 返回值
`*this`

##### 抛出异常
无。

#### std::chrono::duration::operator%= 复合取模赋值运算符（时长对象）

将当前时长对象对另一个时长对象取模。

##### 声明
```cpp
duration& operator%=(const duration& rhs);
```

##### 效果
内部计数值更新为 `count() % rhs.count()`。

##### 返回值
`*this`

##### 抛出异常
无。

#### std::chrono::duration::zero 静态成员函数

获取长度为零的 `duration` 对象。

##### 声明
```cpp
static constexpr duration zero();
```

##### 返回值
`duration(duration_values<rep>::zero())`

##### 抛出异常
无。

#### std::chrono::duration::min 静态成员函数

获取该类型所能表示的最小（最负）可能时长的 `duration` 对象。

##### 声明
```cpp
static constexpr duration min();
```

##### 返回值
`duration(duration_values<rep>::min())`

##### 抛出异常
无。

#### std::chrono::duration::max 静态成员函数

获取该类型所能表示的最大可能时长的 `duration` 对象。

##### 声明
```cpp
static constexpr duration max();
```

##### 返回值
`duration(duration_values<rep>::max())`

##### 抛出异常
无。

#### std::chrono::duration 等于比较运算符 (operator==)

比较两个时长对象是否表示完全相同的时间长度。

##### 声明
```cpp
template <class Rep1, class Period1, class Rep2, class Period2>
constexpr bool operator==(
    const duration<Rep1, Period1>& lhs,
    const duration<Rep2, Period2>& rhs);
```

##### 返回值
设 `CT` 为两个实参类型的公共时长类型（common duration type），返回 `CT(lhs).count() == CT(rhs).count()`。

##### 抛出异常
无。

#### std::chrono::duration 不等于比较运算符 (operator!=)

比较两个时长对象是否表示不同的时间长度。

##### 声明
```cpp
template <class Rep1, class Period1, class Rep2, class Period2>
constexpr bool operator!=(
    const duration<Rep1, Period1>& lhs,
    const duration<Rep2, Period2>& rhs);
```

##### 返回值
`!(lhs == rhs)`

#### std::chrono::duration 小于比较运算符 (operator<)

比较 `lhs` 表示的时长是否短于 `rhs`。

##### 声明
```cpp
template <class Rep1, class Period1, class Rep2, class Period2>
constexpr bool operator<(
    const duration<Rep1, Period1>& lhs,
    const duration<Rep2, Period2>& rhs);
```

##### 返回值
设 `CT` 为公共类型，返回 `CT(lhs).count() < CT(rhs).count()`。

#### std::chrono::duration 大于比较运算符 (operator>)

比较 `lhs` 表示的时长是否长于 `rhs`。

##### 声明
```cpp
template <class Rep1, class Period1, class Rep2, class Period2>
constexpr bool operator>(
    const duration<Rep1, Period1>& lhs,
    const duration<Rep2, Period2>& rhs);
```

##### 返回值
`rhs < lhs`

#### std::chrono::duration 小于等于比较运算符 (operator<=)

比较 `lhs` 是否短于或等于 `rhs`。

##### 声明
```cpp
template <class Rep1, class Period1, class Rep2, class Period2>
constexpr bool operator<=(
    const duration<Rep1, Period1>& lhs,
    const duration<Rep2, Period2>& rhs);
```

##### 返回值
`!(rhs < lhs)`

#### std::chrono::duration 大于等于比较运算符 (operator>=)

比较 `lhs` 是否长于或等于 `rhs`。

##### 声明
```cpp
template <class Rep1, class Period1, class Rep2, class Period2>
constexpr bool operator>=(
    const duration<Rep1, Period1>& lhs,
    const duration<Rep2, Period2>& rhs);
```

##### 返回值
`!(lhs < rhs)`

#### std::chrono::duration_cast 非成员转换函数

将一个 `duration` 对象显式转换为另一种 `ToDuration` 目标类型。若目标周期的精度低于源周期（可能引起截断或精度舍入），必须使用 `duration_cast` 明确表达意图。

##### 声明
```cpp
template <class ToDuration, class Rep, class Period>
constexpr ToDuration duration_cast(const duration<Rep, Period>& d);
```

##### 返回值
返回转换后的 `ToDuration` 实例，等价于以合适因子缩放计数值。

##### 抛出异常
无。

### D.1.2 std::chrono::time_point 类模板

`std::chrono::time_point` 类模板用于表示特定时钟所测量的一个明确时间点。该时间点表示为相对于时钟纪元（epoch，时钟原点）的时间偏移量。时钟类型由 `Clock` 模板参数指定，所用的时间段类型由 `Duration` 指定。

##### 类定义

```cpp
template <class Clock, class Duration = typename Clock::duration>
class time_point
{
public:
    typedef Clock clock;
    typedef Duration duration;
    typedef typename duration::rep rep;
    typedef typename duration::period period;

    constexpr time_point();
    constexpr explicit time_point(const duration& d);

    template <class Duration2>
    constexpr time_point(const time_point<clock, Duration2>& t);

    constexpr duration time_since_epoch() const;

    time_point& operator+=(const duration& d);
    time_point& operator-=(const duration& d);

    static constexpr time_point min();
    static constexpr time_point max();
};

// 非成员运算
template <class Clock, class Duration1, class Rep2, class Period2>
constexpr time_point<Clock, typename common_type<Duration1, duration<Rep2, Period2>>::type>
operator+(
    const time_point<Clock, Duration1>& lhs,
    const duration<Rep2, Period2>& rhs);

template <class Clock, class Duration1, class Rep2, class Period2>
constexpr time_point<Clock, typename common_type<Duration1, duration<Rep2, Period2>>::type>
operator-(
    const time_point<Clock, Duration1>& lhs,
    const duration<Rep2, Period2>& rhs);

template <class Clock, class Duration1, class Duration2>
constexpr typename common_type<Duration1, Duration2>::type
operator-(
    const time_point<Clock, Duration1>& lhs,
    const time_point<Clock, Duration2>& rhs);

template <class ToDuration, class Clock, class Duration>
constexpr time_point<Clock, ToDuration>
time_point_cast(const time_point<Clock, Duration>& t);
```

#### std::chrono::time_point 默认构造函数

构造一个表示该时钟纪元（epoch）时间点的 `std::chrono::time_point` 实例。

##### 声明
```cpp
constexpr time_point();
```

##### 效果
使用 `duration::zero()` 初始化存储的时长。

##### 后置条件
`this->time_since_epoch() == duration::zero()`

#### std::chrono::time_point 基于 duration 的显式构造函数

构造一个距离纪元时间偏移为 `d` 的 `time_point` 实例。

##### 声明
```cpp
constexpr explicit time_point(const duration& d);
```

##### 后置条件
`this->time_since_epoch() == d`

#### std::chrono::time_point 转换构造函数

从另一个具有相同时钟但不同时长类型的 `time_point` 实例构造。

##### 声明
```cpp
template <class Duration2>
constexpr time_point(const time_point<clock, Duration2>& t);
```

##### 类型要求
`Duration2` 必须能够隐式转换为 `duration`。

##### 后置条件
`this->time_since_epoch() == t.time_since_epoch()`

#### std::chrono::time_point::time_since_epoch 成员函数

获取当前时间点自该时钟纪元以来的时间偏移量。

##### 声明
```cpp
constexpr duration time_since_epoch() const;
```

##### 返回值
内部存储的时长对象。

#### std::chrono::time_point::operator+= 复合加法赋值运算符

将指定时长加到当前时间点上，向未来推进。

##### 声明
```cpp
time_point& operator+=(const duration& d);
```

##### 效果
内部时长增加 `d`。

##### 返回值
`*this`

#### std::chrono::time_point::operator-= 复合减法赋值运算符

从当前时间点减去指定时长，向过去倒退。

##### 声明
```cpp
time_point& operator-=(const duration& d);
```

##### 效果
内部时长减去 `d`。

##### 返回值
`*this`

#### std::chrono::time_point::min 静态成员函数

获取该时钟与时长类型所能表示的最早极限时间点。

##### 声明
```cpp
static constexpr time_point min();
```

##### 返回值
`time_point(duration::min())`

#### std::chrono::time_point::max 静态成员函数

获取该时钟与时长类型所能表示的最迟极限时间点。

##### 声明
```cpp
static constexpr time_point max();
```

##### 返回值
`time_point(duration::max())`

### D.1.3 std::chrono::system_clock 类

`std::chrono::system_clock` 类代表系统的实际挂钟真实时间（real-time clock）。由于挂钟时间可能随时被系统管理员或网络时间同步协议（NTP）进行向前或向后调整，因此该时钟并不保证稳定（`is_steady` 通常为 `false`）。它是唯一能够与 C 语言风格时间表示（`std::time_t`）相互转换的标准时钟。

##### 类定义

```cpp
class system_clock
{
public:
    typedef unspecified-rep-type rep;
    typedef unspecified-ratio-type period;
    typedef chrono::duration<rep, period> duration;
    typedef chrono::time_point<system_clock> time_point;
    static const bool is_steady = unspecified-boolean-value;

    static time_point now() noexcept;
    static time_t to_time_t(const time_point& t) noexcept;
    static time_point from_time_t(time_t t) noexcept;
};
```

#### std::chrono::system_clock::rep 类型定义

底层表示类型，通常为有符号整型。

#### std::chrono::system_clock::period 类型定义

代表系统时钟滴答周期的 `std::ratio` 实例化类型（通常为微秒或纳秒级别）。

#### std::chrono::system_clock::duration 类型定义

系统时钟的时长类型定义：`std::chrono::duration<rep, period>`。

#### std::chrono::system_clock::time_point 类型定义

系统时钟的时间点类型定义：`std::chrono::time_point<std::chrono::system_clock>`。

#### std::chrono::system_clock::now 静态成员函数

获取系统当前挂钟时间。

##### 声明
```cpp
static time_point now() noexcept;
```

##### 返回值
表示当前系统时间的 `time_point`。

#### std::chrono::system_clock::to_time_t 静态成员函数

将一个 `time_point` 转换为 C 运行时的 `time_t` 标量时间。

##### 声明
```cpp
static time_t to_time_t(const time_point& t) noexcept;
```

##### 返回值
截断或舍入到秒精度的对应 `time_t` 值。

#### std::chrono::system_clock::from_time_t 静态成员函数

将 C 运行时的 `time_t` 转换为 `time_point` 实例。

##### 声明
```cpp
static time_point from_time_t(time_t t) noexcept;
```

##### 返回值
表示与 `t` 相同物理时刻的 `time_point` 实例。

### D.1.4 std::chrono::steady_clock 类

`std::chrono::steady_clock` 类代表单调递增的物理稳定时钟。它的滴答速率均匀恒定，绝不会因为系统时间被手工或网络校准而发生向前跃迁或向后回拨。非常适合用于测量物理耗时与计算超时期限。

##### 类定义

```cpp
class steady_clock
{
public:
    typedef unspecified-rep-type rep;
    typedef unspecified-ratio-type period;
    typedef chrono::duration<rep, period> duration;
    typedef chrono::time_point<steady_clock> time_point;
    static const bool is_steady = true;

    static time_point now() noexcept;
};
```

#### std::chrono::steady_clock::rep 类型定义

用于表示底层计数的有符号整型。

#### std::chrono::steady_clock::period 类型定义

代表时钟滴答周期的 `std::ratio` 实例化类型（例如纳秒 `std::nano`）。

#### std::chrono::steady_clock::duration 类型定义

稳定时钟的时长类型定义：`std::chrono::duration<rep, period>`。

#### std::chrono::steady_clock::time_point 类型定义

稳定时钟的时间点类型定义：`std::chrono::time_point<std::chrono::steady_clock>`。

#### std::chrono::steady_clock::now 静态成员函数

获取当前稳定时间点。

##### 声明
```cpp
static time_point now() noexcept;
```

##### 返回值
表示当前时刻的 `time_point`。

##### 同步语义
若对 `std::chrono::steady_clock::now()` 的一次调用先发生于（happens-before）另一次调用，则第一次调用返回的 `time_point` 必然小于或等于第二次调用返回的 `time_point`。

### D.1.5 std::chrono::high_resolution_clock 类型定义

`std::chrono::high_resolution_clock` 是标准库在当前目标平台上能够提供的具备最小滴答周期的时钟别名。它通常被实现为 `system_clock` 或 `steady_clock` 的 `typedef`。

##### 声明
```cpp
typedef unspecified-clock-type high_resolution_clock;
```

需要注意：标准并不强制保证 `high_resolution_clock` 是稳定的；如果需要保证时钟单调递增绝不倒退，应优先选用 `std::chrono::steady_clock`。



## D.2 <condition_variable> 头文件

`<condition_variable>` 头文件提供了条件变量设施。条件变量是一种同步原语，用于允许多个线程在等待特定条件变为真（true）时发生阻塞。

### 头文件内容摘要

```cpp
namespace std
{
    class condition_variable;
    class condition_variable_any;

    void notify_all_at_thread_exit(
        condition_variable& cv,
        unique_lock<mutex> lk);

    enum class cv_status
    {
        no_timeout,
        timeout
    };
}
```

### D.2.1 std::condition_variable 类

`std::condition_variable` 类提供了等待其他线程发出通知的同步原语。为了使用 `std::condition_variable`，等待线程必须先获取一个 `std::unique_lock<std::mutex>` 锁，并将其传递给 `wait`、`wait_for` 或 `wait_until`。条件变量会在阻塞当前线程的同时原子地释放互斥锁；当等待线程被唤醒时，它会在从 `wait` 函数返回之前重新获取互斥锁。

`std::condition_variable` 的实例既不可复制（Not CopyConstructible, Not CopyAssignable），也不可移动（Not MoveConstructible, Not MoveAssignable）。

##### 类定义

```cpp
class condition_variable
{
public:
    condition_variable();
    ~condition_variable();

    condition_variable(const condition_variable&) = delete;
    condition_variable& operator=(const condition_variable&) = delete;

    void notify_one() noexcept;
    void notify_all() noexcept;

    void wait(unique_lock<mutex>& lock);

    template <class Predicate>
    void wait(unique_lock<mutex>& lock, Predicate pred);

    template <class Clock, class Duration>
    cv_status wait_until(
        unique_lock<mutex>& lock,
        const chrono::time_point<Clock, Duration>& abs_time);

    template <class Clock, class Duration, class Predicate>
    bool wait_until(
        unique_lock<mutex>& lock,
        const chrono::time_point<Clock, Duration>& abs_time,
        Predicate pred);

    template <class Rep, class Period>
    cv_status wait_for(
        unique_lock<mutex>& lock,
        const chrono::duration<Rep, Period>& rel_time);

    template <class Rep, class Period, class Predicate>
    bool wait_for(
        unique_lock<mutex>& lock,
        const chrono::duration<Rep, Period>& rel_time,
        Predicate pred);

    typedef implementation-defined native_handle_type;
    native_handle_type native_handle();
};
```

#### std::condition_variable 默认构造函数

构造一个新的 `std::condition_variable` 实例。

##### 声明
```cpp
condition_variable();
```

##### 效果
构造一个新的条件变量。

##### 抛出异常
若无法构造条件变量（如系统资源耗尽），抛出 `std::system_error` 类型的异常。

#### std::condition_variable 析构函数

销毁 `std::condition_variable` 对象。

##### 声明
```cpp
~condition_variable();
```

##### 前置条件
在析构函数执行时，绝不能有任何线程正阻塞在当前 `*this` 条件变量上。若有线程正阻塞等待，将导致未定义行为（Undefined Behavior）。

##### 效果
销毁该条件变量。

##### 抛出异常
无。

#### std::condition_variable::notify_one 成员函数

唤醒正在当前条件变量上等待的某一个线程（如果存在等待线程）。

##### 声明
```cpp
void notify_one() noexcept;
```

##### 效果
解除正在 `*this` 上等待的某一个线程的阻塞状态。如果没有线程正在等待，该调用没有任何效果。

##### 同步语义
对单个 `std::condition_variable` 实例上的 `notify_one()`、`notify_all()`、`wait()`、`wait_for()` 和 `wait_until()` 调用均被串行化处理（serialized）。调用 `notify_one()` 只能唤醒在该调用之前已开始等待的线程。

##### 抛出异常
无。

#### std::condition_variable::notify_all 成员函数

唤醒正在当前条件变量上等待的所有线程。

##### 声明
```cpp
void notify_all() noexcept;
```

##### 效果
解除正在 `*this` 上等待的所有线程的阻塞状态。如果没有线程正在等待，该调用无效果。

##### 同步语义
串行化处理；只能唤醒在此调用之前已开始等待的线程。

##### 抛出异常
无。

#### std::condition_variable::wait 成员函数

无条件等待来自另一个线程的通知。

##### 声明
```cpp
void wait(unique_lock<mutex>& lock);
```

##### 前置条件
`lock.owns_lock() == true`，且 `lock.mutex()` 所引用的互斥量必须被当前线程锁定。此外，所有当前正在 `*this` 上并发等待的线程，其传入的 `lock` 所关联的互斥量必须是同一个互斥量。

##### 效果
原子地调用 `lock.unlock()` 并使当前调用线程在 `*this` 上进入阻塞等待状态。当线程由于 `notify_one()`、`notify_all()` 或发生**虚假唤醒（spurious wakeup）**而解除阻塞时，函数会在返回前执行 `lock.lock()` 重新持有锁。若重新加锁时抛出异常，异常会被向外传播。

##### 后置条件
`lock.owns_lock() == true`。

##### 抛出异常
当重新加锁失败时抛出异常；若因虚假唤醒解除等待，仍会重新持锁后返回。

#### std::condition_variable::wait 接受谓词的重载成员函数

阻塞等待，直到被通知且传入的谓词 `pred()` 计算结果为 `true`。

##### 声明
```cpp
template <class Predicate>
void wait(unique_lock<mutex>& lock, Predicate pred);
```

##### 效果
等价于在循环中执行等待，以防御虚假唤醒：
```cpp
while (!pred())
{
    wait(lock);
}
```

##### 前置条件与后置条件
与基础 `wait` 相同，且返回时 `pred()` 必为 `true`。

##### 抛出异常
除了重新加锁抛出的异常外，还可能抛出 `pred()` 内部引发的任何异常。

#### std::condition_variable::wait_for 成员函数

阻塞等待通知，直到被唤醒或经过指定的相对超时时间 `rel_time`。

##### 声明
```cpp
template <class Rep, class Period>
cv_status wait_for(
    unique_lock<mutex>& lock,
    const chrono::duration<Rep, Period>& rel_time);
```

##### 效果
等价于：`return wait_until(lock, chrono::steady_clock::now() + rel_time);`

##### 返回值
若因超时唤醒返回 `std::cv_status::timeout`；若被通知唤醒（或发生虚假唤醒）返回 `std::cv_status::no_timeout`。

#### std::condition_variable::wait_for 接受谓词的重载成员函数

阻塞等待通知，直到谓词满足或超时。

##### 声明
```cpp
template <class Rep, class Period, class Predicate>
bool wait_for(
    unique_lock<mutex>& lock,
    const chrono::duration<Rep, Period>& rel_time,
    Predicate pred);
```

##### 效果
等价于：`return wait_until(lock, chrono::steady_clock::now() + rel_time, std::move(pred));`

##### 返回值
返回 `pred()` 的布尔评估结果。若满足条件返回 `true`，因超时退出且条件不满足返回 `false`。

#### std::condition_variable::wait_until 成员函数

阻塞等待通知，直到被唤醒或到达绝对时间点 `abs_time`。

##### 声明
```cpp
template <class Clock, class Duration>
cv_status wait_until(
    unique_lock<mutex>& lock,
    const chrono::time_point<Clock, Duration>& abs_time);
```

##### 效果
原子地释放锁并阻塞等待。当时钟到达 `abs_time`、收到通知或发生虚假唤醒时接触阻塞，并在返回前重新持有锁。

##### 返回值
若因时间到达或超过 `abs_time` 返回 `std::cv_status::timeout`；否则返回 `std::cv_status::no_timeout`。

#### std::condition_variable::wait_until 接受谓词的重载成员函数

阻塞等待通知，直到谓词为真或到达绝对时间点 `abs_time`。

##### 声明
```cpp
template <class Clock, class Duration, class Predicate>
bool wait_until(
    unique_lock<mutex>& lock,
    const chrono::time_point<Clock, Duration>& abs_time,
    Predicate pred);
```

##### 效果
循环检查谓词：
```cpp
while (!pred())
{
    if (wait_until(lock, abs_time) == cv_status::timeout)
        return pred();
}
return true;
```

##### 返回值
返回退出时的 `pred()` 评估结果。

#### std::notify_all_at_thread_exit 非成员函数

安排在当前调用线程完全退出时（所有具有线程局部存储期的对象均已析构完成），自动执行互斥量解锁并调用 `cv.notify_all()`。

##### 声明
```cpp
void notify_all_at_thread_exit(condition_variable& cv, unique_lock<mutex> lk);
```

##### 效果
转移 `lk` 的所有权到内部机制中。当调用线程正常退出时，解锁互斥量并对 `cv` 调用 `notify_all()`。这对于需要等待线程完成退出的场景避免了在 `thread_local` 析构函数中访问已被提前销毁状态的悬挂死锁风险。

### D.2.2 std::condition_variable_any 类

`std::condition_variable_any` 类是 `std::condition_variable` 的泛化版本。它不局限于 `std::unique_lock<std::mutex>`，而是可以与任何满足 `BasicLockable`（具备 `lock()` 和 `unlock()` 成员）的用户自定义锁类型协同工作。

##### 类定义

```cpp
class condition_variable_any
{
public:
    condition_variable_any();
    ~condition_variable_any();

    condition_variable_any(const condition_variable_any&) = delete;
    condition_variable_any& operator=(const condition_variable_any&) = delete;

    void notify_one() noexcept;
    void notify_all() noexcept;

    template <class Lockable>
    void wait(Lockable& lock);

    template <class Lockable, class Predicate>
    void wait(Lockable& lock, Predicate pred);

    template <class Lockable, class Clock, class Duration>
    cv_status wait_until(
        Lockable& lock,
        const chrono::time_point<Clock, Duration>& abs_time);

    template <class Lockable, class Clock, class Duration, class Predicate>
    bool wait_until(
        Lockable& lock,
        const chrono::time_point<Clock, Duration>& abs_time,
        Predicate pred);

    template <class Rep, class Period, class Lockable>
    cv_status wait_for(
        Lockable& lock,
        const chrono::duration<Rep, Period>& rel_time);

    template <class Rep, class Period, class Lockable, class Predicate>
    bool wait_for(
        Lockable& lock,
        const chrono::duration<Rep, Period>& rel_time,
        Predicate pred);
};
```

#### std::condition_variable_any 默认构造函数

构造新的 `std::condition_variable_any` 实例。

##### 声明
```cpp
condition_variable_any();
```

##### 抛出异常
`std::bad_alloc`（若内存分配失败）或 `std::system_error`。

#### std::condition_variable_any 析构函数

销毁 `std::condition_variable_any` 对象。

##### 声明
```cpp
~condition_variable_any();
```

##### 前置条件
在析构期间，绝不能有任何线程正阻塞在 `*this` 上。

#### std::condition_variable_any::notify_one 成员函数

唤醒正在等待的某一个线程。

##### 声明
```cpp
void notify_one() noexcept;
```

#### std::condition_variable_any::notify_all 成员函数

唤醒正在等待的所有线程。

##### 声明
```cpp
void notify_all() noexcept;
```

#### std::condition_variable_any::wait 模板成员函数

使用任意锁对象阻塞等待通知。

##### 声明
```cpp
template <class Lockable>
void wait(Lockable& lock);
```

##### 类型要求
`Lockable` 必须满足基本可锁定要求（BasicLockable）。

##### 效果
原子地调用 `lock.unlock()` 并将线程挂起阻塞。唤醒时（被通知或虚假唤醒）在返回前调用 `lock.lock()` 重新持有锁。

#### std::condition_variable_any::wait 接受谓词的模板成员函数

阻塞等待直到谓词满足。

##### 声明
```cpp
template <class Lockable, class Predicate>
void wait(Lockable& lock, Predicate pred);
```

#### std::condition_variable_any::wait_for 模板成员函数

使用任意锁阻塞等待相对超时。

##### 声明
```cpp
template <class Rep, class Period, class Lockable>
cv_status wait_for(
    Lockable& lock,
    const chrono::duration<Rep, Period>& rel_time);
```

#### std::condition_variable_any::wait_for 接受谓词的模板成员函数

使用任意锁阻塞等待相对超时，直到谓词满足或超时。

##### 声明
```cpp
template <class Rep, class Period, class Lockable, class Predicate>
bool wait_for(
    Lockable& lock,
    const chrono::duration<Rep, Period>& rel_time,
    Predicate pred);
```

#### std::condition_variable_any::wait_until 模板成员函数

使用任意锁阻塞等待绝对时间点到达。

##### 声明
```cpp
template <class Lockable, class Clock, class Duration>
cv_status wait_until(
    Lockable& lock,
    const chrono::time_point<Clock, Duration>& abs_time);
```

#### std::condition_variable_any::wait_until 接受谓词的模板成员函数

使用任意锁阻塞等待绝对时间点，直到谓词为真或超时。

##### 声明
```cpp
template <class Lockable, class Clock, class Duration, class Predicate>
bool wait_until(
    Lockable& lock,
    const chrono::time_point<Clock, Duration>& abs_time,
    Predicate pred);
```



## D.3 <atomic> 头文件

`<atomic>` 头文件提供了基本的原子类型以及作用于这些类型的原子操作。这些原子类型提供了底层同步原语，用于在无需使用互斥锁的前提下实现线程间通信与无锁（lock-free）并发数据结构。

### 头文件内容摘要

```cpp
namespace std
{
    // 内存顺序枚举
    enum memory_order
    {
        memory_order_relaxed,
        memory_order_consume,
        memory_order_acquire,
        memory_order_release,
        memory_order_acq_rel,
        memory_order_seq_cst
    };

    // 内存栅栏
    extern "C" void atomic_thread_fence(memory_order) noexcept;
    extern "C" void atomic_signal_fence(memory_order) noexcept;

    // 原子标志类
    struct atomic_flag;

    // 通用原子模板
    template <class T> struct atomic;

    // 宏定义
    #define ATOMIC_BOOL_LOCK_FREE /* 见描述 */
    #define ATOMIC_CHAR_LOCK_FREE /* 见描述 */
    #define ATOMIC_CHAR16_T_LOCK_FREE /* 见描述 */
    #define ATOMIC_CHAR32_T_LOCK_FREE /* 见描述 */
    #define ATOMIC_WCHAR_T_LOCK_FREE /* 见描述 */
    #define ATOMIC_SHORT_LOCK_FREE /* 见描述 */
    #define ATOMIC_INT_LOCK_FREE /* 见描述 */
    #define ATOMIC_LONG_LOCK_FREE /* 见描述 */
    #define ATOMIC_LLONG_LOCK_FREE /* 见描述 */
    #define ATOMIC_POINTER_LOCK_FREE /* 见描述 */

    #define ATOMIC_FLAG_INIT /* 见描述 */
    #define ATOMIC_VAR_INIT(value) /* 见描述 */
}
```

### D.3.1 std::atomic_xxx 类型定义

为了与 C 语言标准兼容，C++ 标准库为各个基础整型提供了对应的原子类型别名。在 C++17 中，这些别名必须是对相应 `std::atomic<T>` 特化的 `typedef`；在更早的标准中，它们也可以是拥有相同接口的基类。

#### 表 D.1 原子类型别名与其对应的 std::atomic<> 特化

| 原子类型别名 (std::atomic_itype) | 对应的 std::atomic<> 特化 |
| :--- | :--- |
| `std::atomic_char` | `std::atomic<char>` |
| `std::atomic_schar` | `std::atomic<signed char>` |
| `std::atomic_uchar` | `std::atomic<unsigned char>` |
| `std::atomic_short` | `std::atomic<short>` |
| `std::atomic_ushort` | `std::atomic<unsigned short>` |
| `std::atomic_int` | `std::atomic<int>` |
| `std::atomic_uint` | `std::atomic<unsigned int>` |
| `std::atomic_long` | `std::atomic<long>` |
| `std::atomic_ulong` | `std::atomic<unsigned long>` |
| `std::atomic_llong` | `std::atomic<long long>` |
| `std::atomic_ullong` | `std::atomic<unsigned long long>` |
| `std::atomic_wchar_t` | `std::atomic<wchar_t>` |
| `std::atomic_char16_t` | `std::atomic<char16_t>` |
| `std::atomic_char32_t` | `std::atomic<char32_t>` |
| `std::atomic_intmax_t` | `std::atomic<intmax_t>` |
| `std::atomic_uintmax_t` | `std::atomic<uintmax_t>` |
| `std::atomic_size_t` | `std::atomic<size_t>` |
| `std::atomic_ptrdiff_t` | `std::atomic<ptrdiff_t>` |
| `std::atomic_intptr_t` | `std::atomic<intptr_t>` |
| `std::atomic_uintptr_t` | `std::atomic<uintptr_t>` |


### D.3.2 ATOMIC_xxx_LOCK_FREE 宏

这些宏指示对应内置整型的原子类型是否是无锁的（lock-free）。

```cpp
#define ATOMIC_BOOL_LOCK_FREE /* 见下文 */
#define ATOMIC_CHAR_LOCK_FREE /* 见下文 */
#define ATOMIC_SHORT_LOCK_FREE /* 见下文 */
#define ATOMIC_INT_LOCK_FREE /* 见下文 */
#define ATOMIC_LONG_LOCK_FREE /* 见下文 */
#define ATOMIC_LLONG_LOCK_FREE /* 见下文 */
#define ATOMIC_CHAR16_T_LOCK_FREE /* 见下文 */
#define ATOMIC_CHAR32_T_LOCK_FREE /* 见下文 */
#define ATOMIC_WCHAR_T_LOCK_FREE /* 见下文 */
#define ATOMIC_POINTER_LOCK_FREE /* 见下文 */
```

##### 取值含义
每个宏的展开值为 `0`、`1` 或 `2`：
- **`0`**：表示直接类型及对应的 `std::atomic<>` 特化**绝不是无锁的**（始终使用互斥锁实现）。
- **`1`**：表示**有时是无锁的**（取决于具体硬件运行环境或对齐方式，运行时调用 `is_lock_free()` 判定）。
- **`2`**：表示**始终是无锁的**（利用硬件原子指令直接支持，可完全无锁并发）。

### D.3.3 ATOMIC_VAR_INIT 宏

`ATOMIC_VAR_INIT` 宏提供了将原子变量初始化为指定初值的机制（主要用于兼容 C 语言）。在 C++20 中已被弃用。

```cpp
#define ATOMIC_VAR_INIT(value) /* 展开为初始化标记 */
```

### D.3.4 std::memory_order 枚举

`std::memory_order` 枚举定义了用于控制原子操作的内存顺序选项。内存顺序决定了非原子内存访问如何围绕原子操作进行重排，以及不同线程之间建立的同步关系。

```cpp
enum memory_order
{
    memory_order_relaxed,
    memory_order_consume,
    memory_order_acquire,
    memory_order_release,
    memory_order_acq_rel,
    memory_order_seq_cst
};
```

#### std::memory_order_relaxed 枚举值

宽松内存顺序（Relaxed）。保证当前操作自身的原子性与修改顺序（modification order）一致，但不施加任何跨线程的同步或同步次序约束，编译器与 CPU 可自由重排周围的指令。

#### std::memory_order_consume 枚举值

消费内存顺序（Consume）。仅针对带有数据依赖关系（data-dependent）的读取操作建立同步。若线程 A 对某变量进行 release 写入，线程 B 以 consume 读取该变量，则线程 A 中先发生于该写入且与所写入值有数据依赖的所有计算，对于线程 B 中依赖于读取结果的操作可见。由于编译器难以追踪细粒度依赖，现代编译器常将其提升为 acquire。

#### std::memory_order_acquire 枚举值

获取内存顺序（Acquire）。用于加载（load）操作。本线程中后续的所有读写操作均不能重排到该 acquire 操作之前。若另一个线程使用 release 写入了相同原子变量，则写入线程在 release 之前的所有内存写入对于当前线程全部可见（建立 Synchronizes-with 关系）。

#### std::memory_order_release 枚举值

释放内存顺序（Release）。用于存储（store）操作。本线程中之前的所有读写操作均不能重排到该 release 操作之后。此操作与后续对相同变量执行 acquire 加载的线程构成同步。

#### std::memory_order_acq_rel 枚举值

获取-释放组合顺序（Acquire-Release）。用于读-改-写（read-modify-write）原子操作（如 `fetch_add`、`exchange`、`compare_exchange`）。它同时兼具 acquire（后续操作不可前移）与 release（先前操作不可后移）的双向内存屏障语义。

#### std::memory_order_seq_cst 枚举值

顺序一致性内存顺序（Sequentially Consistent）。所有原子操作的默认内存顺序。除了包含 acquire/release 的全部同步语义外，它还在所有线程间建立起单调全局一致的执行顺序（全序关系，Single Total Order），所有标记为 `seq_cst` 的操作在所有线程中看到的发生次序完全相同。

### D.3.5 std::atomic_thread_fence 函数

`std::atomic_thread_fence` 在当前线程的代码流中插入一条独立的内存栅栏（memory fence / barrier）。

##### 声明
```cpp
extern "C" void atomic_thread_fence(memory_order order) noexcept;
```

##### 效果
根据 `order` 插入相应内存屏障，控制屏障前后的原子与非原子操作排序：
- 若 `order == memory_order_relaxed`：无效果。
- 若 `order == memory_order_acquire` 或 `memory_order_consume`：作为获取栅栏（Acquire fence）。
- 若 `order == memory_order_release`：作为释放栅栏（Release fence）。
- 若 `order == memory_order_acq_rel`：兼具 Acquire 与 Release 栅栏效果。
- 若 `order == memory_order_seq_cst`：作为顺序一致性全局内存栅栏。

### D.3.6 std::atomic_signal_fence 函数

在同一线程与信号处理函数（signal handler）之间插入指令重排屏障。

##### 声明
```cpp
extern "C" void atomic_signal_fence(memory_order order) noexcept;
```

##### 效果
仅阻止编译器的指令重排，不发射底层 CPU 硬件总线锁定或缓存刷新指令。

### D.3.7 std::atomic_flag 类

`std::atomic_flag` 是最简单的无锁原子布尔标志。与 `std::atomic<bool>` 不同，标准保证 `std::atomic_flag` 在所有平台上**绝对是无锁的**。

##### 类定义

```cpp
struct atomic_flag
{
    constexpr atomic_flag() noexcept;
    ~atomic_flag() noexcept = default;

    atomic_flag(const atomic_flag&) = delete;
    atomic_flag& operator=(const atomic_flag&) = delete;
    atomic_flag& operator=(const atomic_flag&) volatile = delete;

    bool test_and_set(memory_order = memory_order_seq_cst) noexcept;
    bool test_and_set(memory_order = memory_order_seq_cst) volatile noexcept;

    void clear(memory_order = memory_order_seq_cst) noexcept;
    void clear(memory_order = memory_order_seq_cst) volatile noexcept;
};

// 宏初始化
#define ATOMIC_FLAG_INIT /* 展开为清零初始状态 */

// 非成员函数
bool atomic_flag_test_and_set(atomic_flag*) noexcept;
bool atomic_flag_test_and_set_explicit(atomic_flag*, memory_order) noexcept;
void atomic_flag_clear(atomic_flag*) noexcept;
void atomic_flag_clear_explicit(atomic_flag*, memory_order) noexcept;
```

#### std::atomic_flag 初始化与操作

- **`ATOMIC_FLAG_INIT`**：将标志初始化为清除（clear / false）状态。在 C++20 前，未经初始化的 flag 处于未定义状态。

- **`test_and_set`**：原子地将标志设置为 `true`，并返回其设置前的旧值。这是读-改-写原子操作，是实现自旋锁（spinlock）的基础。

- **`clear`**：原子地将标志重置为 `false`。该操作只能指定 `relaxed`、`release` 或 `seq_cst` 内存顺序，不能指定 `acquire` 或 `acq_rel`。

### D.3.8 std::atomic 类模板

`std::atomic` 类模板是通用的原子操作封装器。可以用于任何满足平凡可复制（TriviallyCopyable）要求的类型 `T`。

##### 类定义

```cpp
template <class T>
struct atomic
{
    static constexpr bool is_always_lock_free = /* 由实现定义 */;

    constexpr atomic() noexcept = default;
    constexpr atomic(T desired) noexcept;

    atomic(const atomic&) = delete;
    atomic& operator=(const atomic&) = delete;
    atomic& operator=(const atomic&) volatile = delete;

    bool is_lock_free() const noexcept;
    bool is_lock_free() const volatile noexcept;

    void store(T desired, memory_order order = memory_order_seq_cst) noexcept;
    void store(T desired, memory_order order = memory_order_seq_cst) volatile noexcept;

    T load(memory_order order = memory_order_seq_cst) const noexcept;
    T load(memory_order order = memory_order_seq_cst) const volatile noexcept;

    operator T() const noexcept;
    operator T() const volatile noexcept;

    T exchange(T desired, memory_order order = memory_order_seq_cst) noexcept;
    T exchange(T desired, memory_order order = memory_order_seq_cst) volatile noexcept;

    bool compare_exchange_weak(
        T& expected, T desired,
        memory_order success, memory_order failure) noexcept;

    bool compare_exchange_strong(
        T& expected, T desired,
        memory_order success, memory_order failure) noexcept;

    bool compare_exchange_weak(
        T& expected, T desired,
        memory_order order = memory_order_seq_cst) noexcept;

    bool compare_exchange_strong(
        T& expected, T desired,
        memory_order order = memory_order_seq_cst) noexcept;

    T operator=(T desired) noexcept;
};
```

#### std::atomic 核心成员函数与语义

- **`is_always_lock_free` (C++17)**：编译期静态常量，指示该类型的原子操作在当前硬件架构上是否必定是无锁实现的。

- **`is_lock_free()`**：运行时查询当前原子实例是否无锁。

- **`store(desired, order)`**：原子地用 `desired` 替换内部值。`order` 必须是 `relaxed`、`release` 或 `seq_cst`。

- **`load(order)`**：原子地获取并返回内部值。`order` 必须是 `relaxed`、`consume`、`acquire` 或 `seq_cst`。

- **`exchange(desired, order)`**：原子地将值替换为 `desired` 并返回旧值（读-改-写原子操作）。

- **`compare_exchange_weak(expected, desired, ...)`**：弱比较并交换（CAS）。原子地比较内部值与 `expected` 的按位表示：若相等，则存入 `desired` 并返回 `true`；若不相等，则将内部当前值写回 `expected` 并返回 `false`。在某些平台上（如 ARM/LL-SC 指令），即便当前值等于 `expected`，操作也可能**由于硬件伪失败（spurious failure）而返回 `false`**。通常在循环结构中首选 `weak` 版本以获得极致性能。

- **`compare_exchange_strong(expected, desired, ...)`**：强比较并交换。保证绝不出现伪失败；只有在当前值真正不等于 `expected` 时才返回 `false`。常用于单次 CAS 判断的逻辑分支中。

### D.3.9 std::atomic 特化概览

标准库为指针类型（`std::atomic<T*>`）和整型（`std::atomic<integral>`）提供了特化版本，额外扩展了针对算术与位运算的原子操作成员。

### D.3.10 std::atomic<integral-type> 整型特化与指针特化

整型特化支持原子的算术运算（加减）与按位逻辑运算（与、或、异或）。指针特化支持以指针步长为单位的指针加减算术。

```cpp
// 整型特化扩展成员
integral-type fetch_add(integral-type arg, memory_order = memory_order_seq_cst) noexcept;
integral-type fetch_sub(integral-type arg, memory_order = memory_order_seq_cst) noexcept;
integral-type fetch_and(integral-type arg, memory_order = memory_order_seq_cst) noexcept;
integral-type fetch_or(integral-type arg, memory_order = memory_order_seq_cst) noexcept;
integral-type fetch_xor(integral-type arg, memory_order = memory_order_seq_cst) noexcept;

integral-type operator++() noexcept;
integral-type operator++(int) noexcept;
integral-type operator--() noexcept;
integral-type operator--(int) noexcept;

integral-type operator+=(integral-type arg) noexcept;
integral-type operator-=(integral-type arg) noexcept;
integral-type operator&=(integral-type arg) noexcept;
integral-type operator|=(integral-type arg) noexcept;
integral-type operator^=(integral-type arg) noexcept;
```

##### 算术与位操作语义

- **`fetch_add(arg, order)`**：原子地将当前值加上 `arg`，并返回**修改前的旧值**。

- **`fetch_sub(arg, order)`**：原子地从当前值减去 `arg`，并返回**修改前的旧值**。

- **`fetch_and(arg, order)`**：原子地将当前值与 `arg` 进行按位与运算，并返回**修改前的旧值**。

- **`fetch_or(arg, order)`**：原子地将当前值与 `arg` 进行按位或运算，并返回**修改前的旧值**。

- **`fetch_xor(arg, order)`**：原子地将当前值与 `arg` 进行按位异或运算，并返回**修改前的旧值**。

- 运算符 `++` 与 `--`：前置版本返回更新后的新值；后置版本返回自增或自减前的旧值。

- 复合运算符 `+=`, `-=` 等：返回更新后的新值。



## D.4 <future> 头文件

`<future>` 头文件提供了处理并发操作异步结果（asynchronous results）的设施。这些设施包括：用于提供值的 `std::promise`、包装可调用对象的 `std::packaged_task`、高层异步任务执行函数 `std::async`，以及用于等待并检索计算结果的 `std::future` 和 `std::shared_future`。

### 头文件内容摘要

```cpp
namespace std
{
    // 错误码与异常
    enum class future_errc
    {
        broken_promise,
        future_already_retrieved,
        promise_already_satisfied,
        no_state
    };

    template <> struct is_error_code_enum<future_errc> : public true_type {};
    error_code make_error_code(future_errc e) noexcept;
    error_condition make_error_condition(future_errc e) noexcept;
    const error_category& future_category() noexcept;

    class future_error;

    // 启动策略
    enum class launch
    {
        async = 1,
        deferred = 2
    };

    // 状态枚举
    enum class future_status
    {
        ready,
        timeout,
        deferred
    };

    // 类模板前向声明
    template <class R> class promise;
    template <class R> class promise<R&>;
    template <> class promise<void>;

    template <class R> class future;
    template <class R> class future<R&>;
    template <> class future<void>;

    template <class R> class shared_future;
    template <class R> class shared_future<R&>;
    template <> class shared_future<void>;

    template <class> class packaged_task; // 未定义
    template <class R, class... ArgTypes>
    class packaged_task<R(ArgTypes...)>;

    // 异步执行入口
    template <class Function, class... Args>
    future<typename result_of<typename decay<Function>::type(
        typename decay<Args>::type...)>::type>
    async(Function&& f, Args&&... args);

    template <class Function, class... Args>
    future<typename result_of<typename decay<Function>::type(
        typename decay<Args>::type...)>::type>
    async(launch policy, Function&& f, Args&&... args);
}
```

### D.4.1 std::future 类模板

`std::future` 类模板提供了访问异步操作结果的机制。一个 `std::future` 实例代表一个独占所有的异步结果句柄；它只允许移动构造和移动赋值（Move-only），不可复制。当底层异步操作执行完毕后，其结果存储在关联的共享状态（shared state）中，通过 `future::get()` 即可读取结果。

##### 类定义

```cpp
template <class ResultType>
class future
{
public:
    future() noexcept;
    future(future&&) noexcept;
    future(const future&) = delete;
    ~future();

    future& operator=(future&&) noexcept;
    future& operator=(const future&) = delete;

    shared_future<ResultType> share() noexcept;

    ResultType get();
    bool valid() const noexcept;

    void wait() const;

    template <class Rep, class Period>
    future_status wait_for(const chrono::duration<Rep, Period>& rel_time) const;

    template <class Clock, class Duration>
    future_status wait_until(const chrono::time_point<Clock, Duration>& abs_time) const;
};
```

#### std::future 核心成员函数与语义

- **默认构造函数**：构造一个未关联任何异步状态的空 `future` 对象，`valid() == false`。

- **移动构造与移动赋值**：转移异步共享状态的所有权；转移后源对象的 `valid() == false`。

- **析构函数**：释放对关联异步共享状态的引用。**特别注意**：若该 `future` 是通过 `std::async` 且策略为 `launch::async` 创建的，其析构函数会发生阻塞，直至后台线程执行完毕。

- **`share()` 成员函数**：转移当前 `future` 的共享状态并返回一个 `std::shared_future` 对象，调用后当前 `future` 变为空（`valid() == false`）。

- **`valid()` 成员函数**：若当前 `future` 关联了有效的异步共享状态返回 `true`，否则返回 `false`。

- **`get()` 成员函数**：等待异步操作就绪并检索其结果。只能调用一次；调用后内部共享状态被释放（`valid() == false`）。若异步任务中抛出了异常，`get()` 会将该异常重新抛出。

- **`wait()` 成员函数**：阻塞当前线程，直至异步结果就绪。若关联任务是延期执行（deferred）的，`wait()` 并不会触发任务执行。

- **`wait_for(rel_time)` 与 `wait_until(abs_time)`**：带超时的等待，返回 `future_status::ready`（已就绪）、`future_status::timeout`（超时未就绪）或 `future_status::deferred`（延迟任务尚未启动）。

### D.4.2 std::shared_future 类模板

`std::shared_future` 类模板提供了支持多个线程同时等待并共享访问同一异步结果的机制。与 `std::future` 的独占语义不同，`std::shared_future` 是可复制的（CopyConstructible 和 CopyAssignable）。多个线程可以安全地持有同一个共享状态的不同 `shared_future` 副本，并并发调用 `get()`。

##### 类定义

```cpp
template <class ResultType>
class shared_future
{
public:
    shared_future() noexcept;
    shared_future(const shared_future&) noexcept;
    shared_future(future<ResultType>&&) noexcept;
    shared_future(shared_future&&) noexcept;
    ~shared_future();

    shared_future& operator=(const shared_future&) noexcept;
    shared_future& operator=(shared_future&&) noexcept;

    const ResultType& get() const; // 若 ResultType 为引用类型则返回 ResultType&，void 则返回 void
    bool valid() const noexcept;

    void wait() const;

    template <class Rep, class Period>
    future_status wait_for(const chrono::duration<Rep, Period>& rel_time) const;

    template <class Clock, class Duration>
    future_status wait_until(const chrono::time_point<Clock, Duration>& abs_time) const;
};
```

#### std::shared_future 核心语义

- **从 `std::future` 移动构造**：将独占所有权转换为共享所有权。

- **复制构造与复制赋值**：增加对底层异步状态的引用计数。

- **`get()` 成员函数**：等待结果就绪并返回对结果的常量引用（`const ResultType&`）。可多次调用，支持多线程并发无锁读取。

### D.4.3 std::packaged_task 类模板

`std::packaged_task` 类模板将任何可调用对象（函数指针、函数对象或 Lambda）包装起来，以便使其能够被异步执行，并将其返回值或抛出的异常自动传递给一个关联的 `std::future` 对象。

##### 类定义

```cpp
template <class> class packaged_task; // 未定义

template <class ResultType, class... ArgTypes>
class packaged_task<ResultType(ArgTypes...)>
{
public:
    packaged_task() noexcept;

    template <class Callable>
    explicit packaged_task(Callable&& func);

    ~packaged_task();

    packaged_task(const packaged_task&) = delete;
    packaged_task& operator=(const packaged_task&) = delete;

    packaged_task(packaged_task&& other) noexcept;
    packaged_task& operator=(packaged_task&& other) noexcept;

    void swap(packaged_task& other) noexcept;
    bool valid() const noexcept;

    future<ResultType> get_future();

    void operator()(ArgTypes... args);
    void make_ready_at_thread_exit(ArgTypes... args);
    void reset();
};
```

#### std::packaged_task 核心成员函数

- **`get_future()`**：获取与此任务关联的 `std::future`。只能调用一次，重复调用将抛出 `std::future_error(std::future_errc::future_already_retrieved)`。

- **`operator()(args...)`**：在当前调用线程同步执行被包装的任务。任务执行完毕后，返回值或捕获的异常被写入共享状态，并将状态置为 ready（唤醒等待线程）。

- **`make_ready_at_thread_exit(args...)`**：同步调用任务，但**推迟到当前线程彻底退出且 thread_local 变量析构完毕后**，才将共享状态置为 ready。

- **`reset()`**：重置任务状态，分配新的共享状态，允许该任务被再次执行。

### D.4.4 std::promise 类模板

`std::promise` 类模板提供了一种在某个线程中手动设置值或异常的机制，该结果随后可在另一个线程中通过关联的 `std::future` 进行异步读取。

##### 类定义

```cpp
template <class ResultType>
class promise
{
public:
    promise();

    template <class Allocator>
    promise(allocator_arg_t, const Allocator& alloc);

    promise(promise&& other) noexcept;
    promise(const promise&) = delete;
    ~promise();

    promise& operator=(promise&& other) noexcept;
    promise& operator=(const promise&) = delete;

    void swap(promise& other) noexcept;

    future<ResultType> get_future();

    void set_value(const ResultType& r);
    void set_value(ResultType&& r);
    void set_exception(exception_ptr p);

    void set_value_at_thread_exit(const ResultType& r);
    void set_value_at_thread_exit(ResultType&& r);
    void set_exception_at_thread_exit(exception_ptr p);
};
```

#### std::promise 核心成员函数

- **`get_future()`**：获取用于读取结果的 `future` 实例。每个 promise 仅能获取一次。

- **`set_value(r)`**：原子地将结果值存入共享状态，并将状态设为 ready，解除所有等待线程的阻塞。

- **`set_exception(p)`**：原子地将异常指针存入共享状态，并将状态设为 ready。

- **`set_value_at_thread_exit(r)`**：设置值，但在当前调用线程退出时才唤醒等待者。

- **`set_exception_at_thread_exit(p)`**：设置异常，在当前调用线程退出时才唤醒等待者。

### D.4.5 std::async 函数模板

`std::async` 提供了高级别的异步任务启动机制。它可以根据启动策略（`std::launch`）决定是在新线程上并发运行该任务，还是延迟到某个线程在返回的 `future` 上调用 `get()` 或 `wait()` 时再同步惰性执行。

##### 声明

```cpp
template <class Function, class... Args>
future<typename result_of<typename decay<Function>::type(
    typename decay<Args>::type...)>::type>
async(Function&& f, Args&&... args);

template <class Function, class... Args>
future<typename result_of<typename decay<Function>::type(
    typename decay<Args>::type...)>::type>
async(launch policy, Function&& f, Args&&... args);
```

##### 启动策略（launch policy）

- **`std::launch::async`**：强制在新创建的独立线程中异步并发执行该函数。

- **`std::launch::deferred`**：惰性求值。不启动新线程；直到在返回的 `future` 上首次调用 `get()` 或 `wait()` 时，才在调用线程中同步执行。

- **默认策略 (`async | deferred`)**：由标准库实现自行决定是立即并发启动还是延迟执行（取决于当前系统的负载与资源情况）。

##### 同步与析构阻塞保证
函数调用的完成**同步于（synchronizes-with）**在返回的 `future` 上的成功 `get()` 或 `wait()`。如果返回的 `future` 是唯一指向该共享状态的对象，则该 `future` 的析构函数必须**阻塞等待异步任务完全执行结束**。



## D.5 <mutex> 头文件

`<mutex>` 头文件提供了保障线程间互斥访问（mutual exclusion）的基础设施：包括用于保护临界区共享数据的各种互斥量类（mutex classes）、遵循 RAII 惯用法的锁管理器（lock wrappers），以及防止死锁的多互斥量加锁算法与单次初始化原语 `std::call_once`。

### 头文件内容摘要

```cpp
namespace std
{
    // 互斥量类
    class mutex;
    class recursive_mutex;
    class timed_mutex;
    class recursive_timed_mutex;
    class shared_mutex;       // C++17
    class shared_timed_mutex; // C++14

    // 锁策略标签
    struct defer_lock_t {};
    struct try_to_lock_t {};
    struct adopt_lock_t {};

    constexpr defer_lock_t defer_lock{};
    constexpr try_to_lock_t try_to_lock{};
    constexpr adopt_lock_t adopt_lock{};

    // RAII 锁包装类模板
    template <class Mutex> class lock_guard;
    template <class... Mutexes> class scoped_lock; // C++17
    template <class Mutex> class unique_lock;
    template <class Mutex> class shared_lock;     // C++14

    // 泛型加锁函数
    template <class L1, class L2, class... L3>
    int try_lock(L1&, L2&, L3&...);

    template <class L1, class L2, class... L3>
    void lock(L1&, L2&, L3&...);

    // 单次初始化
    struct once_flag;

    template <class Callable, class... Args>
    void call_once(once_flag& flag, Callable&& func, Args&&... args);
}
```

### D.5.1 std::mutex 类

`std::mutex` 类提供了基本的非递归互斥同步设施。进入临界区前必须加锁，访问完毕后必须解锁。若当前互斥量已被其他线程持有，调用 `lock()` 将发生阻塞。`std::mutex` 既不可复制也不可移动，且同一线程**不得重复加锁**（否则将导致死锁或未定义行为）。

##### 类定义

```cpp
class mutex
{
public:
    constexpr mutex() noexcept;
    ~mutex();

    mutex(const mutex&) = delete;
    mutex& operator=(const mutex&) = delete;

    void lock();
    bool try_lock();
    void unlock();

    typedef implementation-defined native_handle_type;
    native_handle_type native_handle();
};
```

#### std::mutex 成员函数语义

- **`lock()`**：阻塞当前线程直到成功获取互斥锁。前置条件：调用线程不得持有当前互斥锁。

- **`try_lock()`**：非阻塞尝试加锁。若成功获取锁返回 `true`；若互斥量已被其他线程持有立即返回 `false`。允许出现伪失败（spurious failure）。

- **`unlock()`**：释放互斥锁。前置条件：当前调用线程必须持有该互斥锁。

- **`~mutex()`**：销毁互斥量。前置条件：互斥量不能处于被锁定状态。

### D.5.2 std::recursive_mutex 类

`std::recursive_mutex` 允许同一线程多次获取同一个互斥锁（可重入锁）。内部维护一个持有计数；线程必须调用相同次数的 `unlock()` 才能将锁彻底释放给其他线程使用。

##### 类定义

```cpp
class recursive_mutex
{
public:
    recursive_mutex();
    ~recursive_mutex();

    recursive_mutex(const recursive_mutex&) = delete;
    recursive_mutex& operator=(const recursive_mutex&) = delete;

    void lock();
    bool try_lock() noexcept;
    void unlock();

    typedef implementation-defined native_handle_type;
    native_handle_type native_handle();
};
```

### D.5.3 std::timed_mutex 类

`std::timed_mutex` 在不可重入互斥量的基础上，增加了支持超时等待的 `try_lock_for` 和 `try_lock_until` 成员函数。

##### 类定义

```cpp
class timed_mutex
{
public:
    timed_mutex();
    ~timed_mutex();

    timed_mutex(const timed_mutex&) = delete;
    timed_mutex& operator=(const timed_mutex&) = delete;

    void lock();
    bool try_lock();
    void unlock();

    template <class Rep, class Period>
    bool try_lock_for(const chrono::duration<Rep, Period>& rel_time);

    template <class Clock, class Duration>
    bool try_lock_until(const chrono::time_point<Clock, Duration>& abs_time);

    typedef implementation-defined native_handle_type;
    native_handle_type native_handle();
};
```

#### 超时加锁语义

- **`try_lock_for(rel_time)`**：阻塞等待获取锁，直到成功获取（返回 `true`）或经过指定的相对时长 `rel_time`（返回 `false`）。

- **`try_lock_until(abs_time)`**：阻塞等待获取锁，直到成功获取（返回 `true`）或系统到达绝对时间点 `abs_time`（返回 `false`）。

### D.5.4 std::recursive_timed_mutex 类

结合了可重入（递归）特性与超时等待特性的互斥量类。

##### 类定义

```cpp
class recursive_timed_mutex
{
public:
    recursive_timed_mutex();
    ~recursive_timed_mutex();

    recursive_timed_mutex(const recursive_timed_mutex&) = delete;
    recursive_timed_mutex& operator=(const recursive_timed_mutex&) = delete;

    void lock();
    bool try_lock() noexcept;
    void unlock();

    template <class Rep, class Period>
    bool try_lock_for(const chrono::duration<Rep, Period>& rel_time);

    template <class Clock, class Duration>
    bool try_lock_until(const chrono::time_point<Clock, Duration>& abs_time);

    typedef implementation-defined native_handle_type;
    native_handle_type native_handle();
};
```

### D.5.5 std::shared_mutex 类 (C++17)

`std::shared_mutex` 类提供了读写锁（读者-写者锁）同步设施。支持两种访问级别：**独占访问（Exclusive access / 写模式）**与**共享访问（Shared access / 读模式）**。多个线程可同时获得共享读锁，但排他写锁只能由单个线程持有。

##### 类定义

```cpp
class shared_mutex
{
public:
    shared_mutex();
    ~shared_mutex();

    shared_mutex(const shared_mutex&) = delete;
    shared_mutex& operator=(const shared_mutex&) = delete;

    // 独占加锁（写者）
    void lock();
    bool try_lock();
    void unlock();

    // 共享加锁（读者）
    void lock_shared();
    bool try_lock_shared();
    void unlock_shared();

    typedef implementation-defined native_handle_type;
    native_handle_type native_handle();
};
```

### D.5.6 std::shared_timed_mutex 类 (C++14)

在 `shared_mutex` 读写锁的基础上，同时为独占模式与共享模式提供了带超时等待的接口（`try_lock_for`、`try_lock_shared_for` 等）。

##### 类定义

```cpp
class shared_timed_mutex
{
public:
    shared_timed_mutex();
    ~shared_timed_mutex();

    shared_timed_mutex(const shared_timed_mutex&) = delete;
    shared_timed_mutex& operator=(const shared_timed_mutex&) = delete;

    // 独占
    void lock();
    bool try_lock();
    template <class Rep, class Period>
    bool try_lock_for(const chrono::duration<Rep, Period>& rel_time);
    template <class Clock, class Duration>
    bool try_lock_until(const chrono::time_point<Clock, Duration>& abs_time);
    void unlock();

    // 共享
    void lock_shared();
    bool try_lock_shared();
    template <class Rep, class Period>
    bool try_lock_shared_for(const chrono::duration<Rep, Period>& rel_time);
    template <class Clock, class Duration>
    bool try_lock_shared_until(const chrono::time_point<Clock, Duration>& abs_time);
    void unlock_shared();
};
```

### D.5.7 std::lock_guard 类模板

最简单的基于 RAII 的互斥量包装器。在构造函数中获取锁，在析构函数中自动释放锁。不可复制、不可移动。

##### 类定义

```cpp
template <class Mutex>
class lock_guard
{
public:
    typedef Mutex mutex_type;

    explicit lock_guard(mutex_type& m);
    lock_guard(mutex_type& m, adopt_lock_t);
    ~lock_guard();

    lock_guard(const lock_guard&) = delete;
    lock_guard& operator=(const lock_guard&) = delete;
};
```

##### 构造与析构语义
- `explicit lock_guard(m)`：调用 `m.lock()` 并持有锁。
- `lock_guard(m, adopt_lock)`：接管当前线程已经持有的锁，不再重复加锁。
- `~lock_guard()`：调用 `m.unlock()` 自动释放锁。

### D.5.8 std::scoped_lock 类模板 (C++17)

`std::scoped_lock` 是 C++17 引入的变长参数 RAII 锁管理器。它可以同时对零个、一个或多个互斥量加锁，内部采用防死锁算法（相当于 `std::lock`），并在析构时按逆序安全释放所有互斥锁。

##### 类定义

```cpp
template <class... MutexTypes>
class scoped_lock
{
public:
    explicit scoped_lock(MutexTypes&... m);
    explicit scoped_lock(adopt_lock_t, MutexTypes&... m);
    ~scoped_lock();

    scoped_lock(const scoped_lock&) = delete;
    scoped_lock& operator=(const scoped_lock&) = delete;
};
```

### D.5.9 std::unique_lock 类模板

全功能的通用独占锁包装器。提供独占锁所有权管理，支持移动语义（不可复制，可移动），可延迟加锁、支持显式解锁与重新加锁，并可与条件变量 `std::condition_variable` 协同工作。

##### 类定义

```cpp
template <class Mutex>
class unique_lock
{
public:
    typedef Mutex mutex_type;

    unique_lock() noexcept;
    explicit unique_lock(mutex_type& m);
    unique_lock(mutex_type& m, defer_lock_t) noexcept;
    unique_lock(mutex_type& m, try_to_lock_t);
    unique_lock(mutex_type& m, adopt_lock_t);

    template <class Clock, class Duration>
    unique_lock(mutex_type& m, const chrono::time_point<Clock, Duration>& abs_time);

    template <class Rep, class Period>
    unique_lock(mutex_type& m, const chrono::duration<Rep, Period>& rel_time);

    ~unique_lock();

    unique_lock(const unique_lock&) = delete;
    unique_lock& operator=(const unique_lock&) = delete;

    unique_lock(unique_lock&& u) noexcept;
    unique_lock& operator=(unique_lock&& u) noexcept;

    void lock();
    bool try_lock();

    template <class Rep, class Period>
    bool try_lock_for(const chrono::duration<Rep, Period>& rel_time);

    template <class Clock, class Duration>
    bool try_lock_until(const chrono::time_point<Clock, Duration>& abs_time);

    void unlock();

    void swap(unique_lock& u) noexcept;
    mutex_type* release() noexcept;

    bool owns_lock() const noexcept;
    explicit operator bool() const noexcept;
    mutex_type* mutex() const noexcept;
};
```

#### std::unique_lock 构造与管理语义

- **`defer_lock` 构造**：仅关联互斥量 `m`，不执行加锁操作，后续可手动调用 `lock()`。

- **`try_to_lock` 构造**：尝试调用 `m.try_lock()`，通过 `owns_lock()` 可查询是否成功持锁。

- **`adopt_lock` 构造**：假定当前线程已经持有 `m` 的锁，接管其所有权并在析构时负责解锁。

- **`release()` 成员函数**：断开与互斥量的关联并返回其指针，**不调用 unlock()**。此后用户必须自行负责该互斥量的解锁。

- **`owns_lock()` / `operator bool()`**：检查当前对象是否持有锁。

### D.5.10 std::shared_lock 类模板 (C++14)

`std::shared_lock` 类模板为共享互斥量（读写锁）提供了与 `std::unique_lock` 完全对应的 RAII 共享所有权（读锁）包装器。在构造时调用 `lock_shared()`，析构时调用 `unlock_shared()`。

##### 类定义

```cpp
template <class Mutex>
class shared_lock
{
public:
    typedef Mutex mutex_type;

    shared_lock() noexcept;
    explicit shared_lock(mutex_type& m);
    shared_lock(mutex_type& m, defer_lock_t) noexcept;
    shared_lock(mutex_type& m, try_to_lock_t);
    shared_lock(mutex_type& m, adopt_lock_t);

    template <class Clock, class Duration>
    shared_lock(mutex_type& m, const chrono::time_point<Clock, Duration>& abs_time);

    template <class Rep, class Period>
    shared_lock(mutex_type& m, const chrono::duration<Rep, Period>& rel_time);

    ~shared_lock();

    shared_lock(const shared_lock&) = delete;
    shared_lock& operator=(const shared_lock&) = delete;

    shared_lock(shared_lock&& u) noexcept;
    shared_lock& operator=(shared_lock&& u) noexcept;

    void lock();
    bool try_lock();

    template <class Rep, class Period>
    bool try_lock_for(const chrono::duration<Rep, Period>& rel_time);

    template <class Clock, class Duration>
    bool try_lock_until(const chrono::time_point<Clock, Duration>& abs_time);

    void unlock();

    void swap(shared_lock& u) noexcept;
    mutex_type* release() noexcept;

    bool owns_lock() const noexcept;
    explicit operator bool() const noexcept;
    mutex_type* mutex() const noexcept;
};
```

### D.5.11 std::lock 函数模板

原子且无死锁地锁定传入的所有可锁定对象。采用避免死锁的循环重试与回滚算法。

##### 声明
```cpp
template <class L1, class L2, class... L3>
void lock(L1& m1, L2& m2, L3&... m3);
```

##### 效果
同时锁定所有提供的互斥量，绝不会因加锁次序不一致而引发死锁。若其中某个对象的锁定调用抛出异常，所有在此之前已经成功获取的锁都会被自动安全释放。

### D.5.12 std::try_lock 函数模板

依次尝试锁定传入的所有可锁定对象。

##### 声明
```cpp
template <class L1, class L2, class... L3>
int try_lock(L1& m1, L2& m2, L3&... m3);
```

##### 返回值
若全部锁定成功返回 `-1`；若对某个互斥量的 `try_lock()` 返回 `false`，则立即释放此前已获取的所有锁，并返回该失败对象的以 0 为基底的索引位置。

### D.5.13 std::once_flag 类

与 `std::call_once` 配合使用的数据结构，用于确保目标函数在并发环境下只被成功调用一次。

##### 类定义

```cpp
struct once_flag
{
    constexpr once_flag() noexcept;
    once_flag(const once_flag&) = delete;
    once_flag& operator=(const once_flag&) = delete;
};
```

### D.5.14 std::call_once 函数模板

保证给定的函数对象（可调用实体）在关联同一个 `once_flag` 时，即使被多个并发线程同时调用，也仅执行且成功执行一次。

##### 声明
```cpp
template <class Callable, class... Args>
void call_once(once_flag& flag, Callable&& func, Args&&... args);
```

##### 同步与异常保证
- 若某一线程正在执行该函数，其他并发调用将被阻塞等待。
- 若函数正常返回，则该单次初始化宣告完成，其完成先发生于（happens-before）后续对该 `flag` 的所有 `call_once` 成功返回。
- 若函数抛出异常，则该次执行被视为失败，等待中的某一个线程将被唤醒并重新尝试执行。



## D.6 <ratio> 头文件

`<ratio>` 头文件提供了对编译期有理数算术运算的支持。

### 头文件内容摘要

```cpp
namespace std
{
    template <intmax_t N, intmax_t D = 1> class ratio;

    // 比较
    template <class R1, class R2> struct ratio_equal;
    template <class R1, class R2> struct ratio_not_equal;
    template <class R1, class R2> struct ratio_less;
    template <class R1, class R2> struct ratio_less_equal;
    template <class R1, class R2> struct ratio_greater;
    template <class R1, class R2> struct ratio_greater_equal;

    // 算术运算
    template <class R1, class R2> using ratio_add = ...;
    template <class R1, class R2> using ratio_subtract = ...;
    template <class R1, class R2> using ratio_multiply = ...;
    template <class R1, class R2> using ratio_divide = ...;

    // 比较便利变量模板 (C++17)
    template <class R1, class R2>
    constexpr bool ratio_equal_v = ratio_equal<R1, R2>::value;
    template <class R1, class R2>
    constexpr bool ratio_not_equal_v = ratio_not_equal<R1, R2>::value;
    template <class R1, class R2>
    constexpr bool ratio_less_v = ratio_less<R1, R2>::value;
    template <class R1, class R2>
    constexpr bool ratio_less_equal_v = ratio_less_equal<R1, R2>::value;
    template <class R1, class R2>
    constexpr bool ratio_greater_v = ratio_greater<R1, R2>::value;
    template <class R1, class R2>
    constexpr bool ratio_greater_equal_v = ratio_greater_equal<R1, R2>::value;
}
```

### D.6.1 std::ratio 类模板

`std::ratio` 类模板提供了在编译期存储和操作有理数分数的机制。编译期分数以分子（`num`）和分母（`den`）的形式表示，且自动约分为最简形式。

##### 类定义

```cpp
template <intmax_t N, intmax_t D = 1>
class ratio
{
public:
    typedef ratio<num, den> type;
    static constexpr intmax_t num;
    static constexpr intmax_t den;
};
```

##### 类型要求与静态常量

- 模板参数 `D` 不得为 0。

- 模板参数 `N` 和 `D` 必须能够在 `intmax_t` 类型的取值范围内表示。

- 静态成员 `num` 等于 `sign(N) * sign(D) * abs(N) / gcd(N, D)`。

- 静态成员 `den` 等于 `abs(D) / gcd(N, D)`。

- 嵌套类型定义 `type` 是对约分后的最简分数特化 `std::ratio<num, den>` 的类型别名。

### D.6.2 std::ratio_add 模板别名

`std::ratio_add` 模板别名提供了在编译期使用有理数算术对两个 `std::ratio` 值进行相加的机制。

##### 别名定义

```cpp
template <class R1, class R2>
using ratio_add = std::ratio< /* 见下文 */ >;
```

##### 前置条件
`R1` 和 `R2` 必须是 `std::ratio` 类模板的特化实例。

##### 效果
如果两个分数的和能够在不发生算术溢出的情况下计算，则 `ratio_add<R1, R2>` 被定义为表示 `R1` 与 `R2` 所表示分数之和的 `std::ratio` 实例化别名。如果计算结果发生溢出，则程序非良构（ill-formed）。在没有算术溢出的情况下，`std::ratio_add<R1, R2>` 拥有与 `std::ratio<R1::num * R2::den + R2::num * R1::den, R1::den * R2::den>` 相同的 `num` 和 `den` 值。

##### 使用示例

```cpp
static_assert(std::ratio_add<std::ratio<1,3>, std::ratio<2,5>>::num == 11, "");
static_assert(std::ratio_add<std::ratio<1,3>, std::ratio<2,5>>::den == 15, "");

static_assert(std::ratio_add<std::ratio<1,3>, std::ratio<7,6>>::num == 3, "");
static_assert(std::ratio_add<std::ratio<1,3>, std::ratio<7,6>>::den == 2, "");
```

### D.6.3 std::ratio_subtract 模板别名

`std::ratio_subtract` 模板别名提供了在编译期使用有理数算术对两个 `std::ratio` 值进行相减的机制。

##### 别名定义

```cpp
template <class R1, class R2>
using ratio_subtract = std::ratio< /* 见下文 */ >;
```

##### 前置条件
`R1` 和 `R2` 必须是 `std::ratio` 类模板的特化实例。

##### 效果
如果两个分数的差能够在不发生算术溢出的情况下计算，则 `ratio_subtract<R1, R2>` 被定义为表示 `R1` 与 `R2` 所表示分数之差的 `std::ratio` 实例化别名。若计算发生溢出，则程序非良构。在无溢出情况下，其值等价于 `std::ratio<R1::num * R2::den - R2::num * R1::den, R1::den * R2::den>`。

##### 使用示例

```cpp
static_assert(std::ratio_subtract<std::ratio<1,3>, std::ratio<1,5>>::num == 2, "");
static_assert(std::ratio_subtract<std::ratio<1,3>, std::ratio<1,5>>::den == 15, "");

static_assert(std::ratio_subtract<std::ratio<1,3>, std::ratio<7,6>>::num == -5, "");
static_assert(std::ratio_subtract<std::ratio<1,3>, std::ratio<7,6>>::den == 6, "");
```

### D.6.4 std::ratio_multiply 模板别名

`std::ratio_multiply` 模板别名提供了在编译期使用有理数算术对两个 `std::ratio` 值进行相乘的机制。

##### 别名定义

```cpp
template <class R1, class R2>
using ratio_multiply = std::ratio< /* 见下文 */ >;
```

##### 前置条件
`R1` 和 `R2` 必须是 `std::ratio` 类模板的特化实例。

##### 效果
如果乘积可无溢出地计算，则定义为表示 `R1` 与 `R2` 乘积的 `std::ratio` 别名。若溢出则程序非良构。在无溢出情况下，等价于 `std::ratio<R1::num * R2::num, R1::den * R2::den>`。

##### 使用示例

```cpp
static_assert(std::ratio_multiply<std::ratio<1,3>, std::ratio<2,5>>::num == 2, "");
static_assert(std::ratio_multiply<std::ratio<1,3>, std::ratio<2,5>>::den == 15, "");

static_assert(std::ratio_multiply<std::ratio<1,3>, std::ratio<15,7>>::num == 5, "");
static_assert(std::ratio_multiply<std::ratio<1,3>, std::ratio<15,7>>::den == 7, "");
```

### D.6.5 std::ratio_divide 模板别名

`std::ratio_divide` 模板别名提供了在编译期使用有理数算术对两个 `std::ratio` 值进行相除的机制。

##### 别名定义

```cpp
template <class R1, class R2>
using ratio_divide = std::ratio< /* 见下文 */ >;
```

##### 前置条件
`R1` 和 `R2` 必须是 `std::ratio` 类模板的特化实例，且 `R2::num != 0`。

##### 效果
如果商可无溢出地计算，则定义为表示 `R1 / R2` 结果的 `std::ratio` 别名。若溢出则程序非良构。在无溢出情况下，等价于 `std::ratio<R1::num * R2::den, R1::den * R2::num>`。

##### 使用示例

```cpp
static_assert(std::ratio_divide<std::ratio<1,3>, std::ratio<2,5>>::num == 5, "");
static_assert(std::ratio_divide<std::ratio<1,3>, std::ratio<2,5>>::den == 6, "");

static_assert(std::ratio_divide<std::ratio<1,3>, std::ratio<15,7>>::num == 7, "");
static_assert(std::ratio_divide<std::ratio<1,3>, std::ratio<15,7>>::den == 45, "");
```

### D.6.6 std::ratio_equal 类模板

`std::ratio_equal` 类模板提供了在编译期比较两个 `std::ratio` 值是否相等的机制。

##### 类定义

```cpp
template <class R1, class R2>
class ratio_equal:
    public std::integral_constant<bool, (R1::num == R2::num) && (R1::den == R2::den)>
{};
```

##### 前置条件
`R1` 和 `R2` 必须是 `std::ratio` 类模板的特化实例。

##### 使用示例

```cpp
static_assert(std::ratio_equal<std::ratio<1,3>, std::ratio<2,6>>::value == true, "");
static_assert(std::ratio_equal<std::ratio<1,3>, std::ratio<1,6>>::value == false, "");
static_assert(std::ratio_equal<std::ratio<1,3>, std::ratio<2,3>>::value == false, "");
static_assert(std::ratio_equal<std::ratio<1,3>, std::ratio<1,3>>::value == true, "");
```

### D.6.7 std::ratio_not_equal 类模板

`std::ratio_not_equal` 类模板提供了在编译期比较两个 `std::ratio` 值是否不等的机制。

##### 类定义

```cpp
template <class R1, class R2>
class ratio_not_equal:
    public std::integral_constant<bool, !ratio_equal<R1, R2>::value>
{};
```

##### 前置条件
`R1` 和 `R2` 必须是 `std::ratio` 类模板的特化实例。

##### 使用示例

```cpp
static_assert(std::ratio_not_equal<std::ratio<1,3>, std::ratio<2,6>>::value == false, "");
static_assert(std::ratio_not_equal<std::ratio<1,3>, std::ratio<1,6>>::value == true, "");
static_assert(std::ratio_not_equal<std::ratio<1,3>, std::ratio<2,3>>::value == true, "");
static_assert(std::ratio_not_equal<std::ratio<1,3>, std::ratio<1,3>>::value == false, "");
```

### D.6.8 std::ratio_less 类模板

`std::ratio_less` 类模板提供了在编译期比较两个 `std::ratio` 值的大小的机制（严格小于判断）。

##### 类定义

```cpp
template <class R1, class R2>
class ratio_less:
    public std::integral_constant<bool, /* 见下文 */>
{};
```

##### 前置条件
`R1` 和 `R2` 必须是 `std::ratio` 类模板的特化实例。

##### 效果
`std::ratio_less<R1, R2>` 继承自 `std::integral_constant<bool, value>`，其中 `value` 为 `(R1::num * R2::den) < (R2::num * R1::den)`。在可能的情况下，标准库实现应采用避免中间乘法溢出的计算算法。如果溢出且无法避免，程序非良构。

##### 使用示例

```cpp
static_assert(std::ratio_less<std::ratio<1,3>, std::ratio<2,6>>::value == false, "");
static_assert(std::ratio_less<std::ratio<1,6>, std::ratio<1,3>>::value == true, "");
static_assert(std::ratio_less<
    std::ratio<999999999, 1000000000>,
    std::ratio<1000000001, 1000000000>>::value == true, "");
static_assert(std::ratio_less<
    std::ratio<1000000001, 1000000000>,
    std::ratio<999999999, 1000000000>>::value == false, "");
```

### D.6.9 std::ratio_greater 类模板

`std::ratio_greater` 类模板提供了在编译期比较两个 `std::ratio` 值的严格大于关系的机制。

##### 类定义

```cpp
template <class R1, class R2>
class ratio_greater:
    public std::integral_constant<bool, ratio_less<R2, R1>::value>
{};
```

##### 前置条件
`R1` 和 `R2` 必须是 `std::ratio` 类模板的特化实例。

### D.6.10 std::ratio_less_equal 类模板

`std::ratio_less_equal` 类模板提供了在编译期比较两个 `std::ratio` 值的小于或等于关系的机制。

##### 类定义

```cpp
template <class R1, class R2>
class ratio_less_equal:
    public std::integral_constant<bool, !ratio_less<R2, R1>::value>
{};
```

##### 前置条件
`R1` 和 `R2` 必须是 `std::ratio` 类模板的特化实例。

### D.6.11 std::ratio_greater_equal 类模板

`std::ratio_greater_equal` 类模板提供了在编译期比较两个 `std::ratio` 值的大于或等于关系的机制。

##### 类定义

```cpp
template <class R1, class R2>
class ratio_greater_equal:
    public std::integral_constant<bool, !ratio_less<R1, R2>::value>
{};
```

##### 前置条件
`R1` 和 `R2` 必须是 `std::ratio` 类模板的特化实例。



## D.7 <thread> 头文件

`<thread>` 头文件提供了管理独立执行线程的设施，包括 `std::thread` 类以及在 `std::this_thread` 命名空间中操作当前正在运行的线程的自由函数。

### 头文件内容摘要

```cpp
namespace std
{
    class thread;

    void swap(thread& x, thread& y) noexcept;

    namespace this_thread
    {
        thread::id get_id() noexcept;
        void yield() noexcept;

        template <class Clock, class Duration>
        void sleep_until(const chrono::time_point<Clock, Duration>& abs_time);

        template <class Rep, class Period>
        void sleep_for(const chrono::duration<Rep, Period>& rel_time);
    }
}
```

### D.7.1 std::thread 类

`std::thread` 类代表单个操作系统执行线程。创建 `std::thread` 对象时传入可调用对象（及其参数）将立即启动一个新线程并发执行。`std::thread` 对象是独占所有权、只可移动（Move-only）但不可复制的。

##### 类定义

```cpp
class thread
{
public:
    // 嵌套类型
    class id;
    typedef implementation-defined native_handle_type;

    // 构造与析构
    constexpr thread() noexcept;

    template <class F, class... Args>
    explicit thread(F&& f, Args&&... args);

    ~thread();

    thread(const thread&) = delete;
    thread(thread&&) noexcept;

    thread& operator=(const thread&) = delete;
    thread& operator=(thread&&) noexcept;

    // 成员函数
    void swap(thread&) noexcept;
    bool joinable() const noexcept;
    void join();
    void detach();
    id get_id() const noexcept;
    native_handle_type native_handle();

    // 硬件静态查询
    static unsigned hardware_concurrency() noexcept;
};
```

#### std::thread::id 嵌套类

`std::thread::id` 是轻量级、可平凡复制（TriviallyCopyable）的线程标识符。每个活跃的执行线程都有一个唯一的 ID，且未关联执行线程的 `std::thread` 对象的 `get_id()` 返回默认构造的特殊 ID（表示无线程）。`std::thread::id` 支持全套关系比较运算符（`==`, `!=`, `<`, `<=`, `>`, `>=`）、标准输出流插入运算符（`operator<<`），并提供了 `std::hash<std::thread::id>` 特化，因此可作为 `std::map` 或 `std::unordered_map` 的键。

#### std::thread 核心成员函数与行为准则

- **默认构造函数**：构造一个不代表任何执行线程的 `thread` 对象，`joinable() == false`，`get_id() == id()`。

- **接受可调用对象的模板构造函数**：`template <class F, class... Args> explicit thread(F&& f, Args&&... args)`。在新创建的操作系统线程中异步执行 `INVOKE(decay_copy(std::forward<F>(f)), decay_copy(std::forward<Args>(args))...)`。调用成功后新线程立即启动，当前对象关联该线程，`joinable() == true`。

- **移动构造与移动赋值**：转移线程的所有权。移动赋值的前置条件为：目标对象若在赋值前处于可结合状态（`this->joinable() == true`），将直接调用 `std::terminate()` 终止整个程序！

- **析构函数**：**极度重要**。如果被销毁的 `thread` 对象仍然处于可结合状态（`joinable() == true`），**析构函数将直接调用 `std::terminate()` 终止程序执行**！因此，在 `thread` 对象生命周期结束前，必须显式调用 `join()`（等待其结束）或 `detach()`（分离其后台运行）。

- **`joinable()`**：若当前对象关联了活跃的执行线程返回 `true`；若为默认构造、已被移动、已被 `join()` 或已被 `detach()` 则返回 `false`。

- **`join()`**：阻塞当前调用线程，直至该 `thread` 对象所代表的执行线程完成运行。前置条件：`joinable() == true`。调用后 `joinable()` 变为 `false`。

- **`detach()`**：将该 `thread` 对象与其底层操作系统执行线程分离，分离后的线程作为独立的后台守护线程继续执行并在退出时自行回收资源。前置条件：`joinable() == true`。调用后 `joinable()` 变为 `false`。

- **`hardware_concurrency()`**：静态成员函数，返回当前系统硬件能够并发执行的线程数（如 CPU 物理核心数或逻辑处理器数）。若信息不可用则返回 0。

### D.7.2 this_thread 命名空间

`std::this_thread` 命名空间包含一组自由函数，专门用于在当前正在执行代码的线程自身上下文中执行控制。

##### 函数声明与语义

```cpp
namespace std
{
    namespace this_thread
    {
        thread::id get_id() noexcept;
        void yield() noexcept;

        template <class Rep, class Period>
        void sleep_for(const chrono::duration<Rep, Period>& rel_time);

        template <class Clock, class Duration>
        void sleep_until(const chrono::time_point<Clock, Duration>& abs_time);
    }
}
```

- **`get_id()`**：获取当前调用线程的唯一标识符 `std::thread::id`。

- **`yield()`**：向操作系统调度器发出协作式提示（hint），表明当前线程愿意放弃当前 CPU 时间片，允许系统调度运行其他就绪线程。

- **`sleep_for(rel_time)`**：挂起当前线程的执行，至少休眠指定的相对时长 `rel_time`。

- **`sleep_until(abs_time)`**：挂起当前线程的执行，直到指定的绝对时间点 `abs_time` 到达。


