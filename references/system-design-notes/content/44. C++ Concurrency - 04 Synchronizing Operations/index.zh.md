---
id: cpp-concurrency-04-synchronizing-operations
title: "第 4 章：同步并发操作与条件变量"
titleEn: "Chapter 4: Synchronizing concurrent operations"
order: 44
category: specialized
description: "使用条件变量 (condition_variable) 等待事件、future 与 promise 异步传值及包装任务调度。"
tags: ["C++", "条件变量", "异步Future", "std::async", "Promise传值"]
---

# 第 4 章：同步并发操作

### 前章回顾

在第 3 章中，我们探讨了在线程之间共享数据时，恶性的竞争条件（race condition）可能带来多么灾难性的后果，以及如何使用 `std::mutex` 和细致的接口设计来避免它们。你也看到了，互斥量并非万灵药，它们本身会带来死锁（deadlock）的问题，尽管 C++ 标准库提供了 `std::lock()` 等工具来帮助避免死锁。随后我们介绍了一些规避死锁的高级技术，简要讨论了锁的所有权转移，以及选择合适加锁粒度的相关问题。最后，我们介绍了针对特定场景提供的替代性数据保护机制，例如 `std::call_once()` 和 `std::shared_mutex`。

然而，我们尚未涉及的一个重要话题是：**等待来自其他线程的输入或事件**。我们在前一章实现的线程安全栈在栈为空时会抛出异常；因此，如果一个线程想要等待另一个线程向栈中压入数据（这毕竟是线程安全栈最核心的用途之一），它就必须反复尝试弹出元素并在捕获异常后不断重试。这种忙轮询（busy-waiting）白白消耗了宝贵的 CPU 处理时间，却没有推进任何实质工作；事实上，持续不断的检查甚至可能抢占 CPU 资源，阻碍系统中其他实际干活的线程运行。

我们需要的是一种机制：**让一个线程能够等待另一个线程完成某项任务，而在等待期间自身不消耗任何 CPU 时间**。本章将以先前讨论的共享数据保护机制为基础，全面介绍 C++ 中用于在线程间同步操作的各种工具与机制；第 6 章则会进一步展示如何利用这些工具构建更大规模的可复用并发数据结构。

---

### 本章核心内容

- 等待特定事件或条件满足（条件变量）
- 使用 future 等待一次性异步事件
- 带有超时限制的等待（时钟、时长与时间点）
- 利用操作同步简化代码结构（函数式并发、消息传递、延续式调用与屏障）

在上一章中，我们探讨了保护线程间共享数据的多种方法。但在并发编程中，有时仅仅保护数据是不够的，你还需要同步不同线程上的动作。例如，一个线程可能必须等待另一个线程完成某项前置任务后，才能开始或完成自己的工作。

通常，我们经常需要让某个线程等待特定事件发生，或者等待某个条件变为真。尽管可以通过共享数据中的“任务完成”标志位并周期性检查该标志来实现，但这种方案非常低效。在线程间同步操作是如此常见且基本的需求，因此 C++ 标准库提供了专门的工具来处理该场景——**条件变量（condition variable）**和 **future（期物/期望值）**。此外，C++ 并发技术规范（Concurrency Technical Specification, Concurrency TS）对 future 进行了扩展（如延续函数 `then`、`when_all`、`when_any`），并引入了闭锁（latch）与屏障（barrier）等全新的同步设施。

---

## 4.1 等待事件或条件

假设你正乘坐一列夜间卧铺火车旅行。为了确保在正确的车站下车，一种办法是整夜保持清醒，全神贯注地盯紧列车的每一次停靠。你确实不会错过下车站点，但当你到达目的地时早已精疲力竭。

另一种办法是查看时刻表，了解列车预计到达的时间，把闹钟定在预计到达前稍早的一点时间，然后安心睡觉。这种方法尚可，通常也不会错过车站，但一旦列车中途发生延误，你就会过早醒来，之后只能继续熬着；而且万一闹钟电池耗尽没响，你又可能睡过头导致坐过站。

最理想的方案显然是：你可以安心入睡，并在列车真正到达你的目的车站时，由列车乘务员或者系统自动将你唤醒——无论那一刻具体在何时发生。

这与多线程编程有何联系？如果一个线程正在等待第二个线程完成某项任务，它通常有几种选择：

1. **第一种方案：忙轮询（Busy-Wait）**。线程在一个紧凑循环中持续检查共享数据中的标志（由互斥量保护），并在第二个线程完成任务时设置该标志。这种做法在两方面极具浪费性：首先，等待线程消耗宝贵的 CPU 处理时间反复检查标志；其次，当等待线程加锁互斥量时，任何其他线程都无法获取该锁。这两点都对等待逻辑产生反作用——等待线程持续占用 CPU 会挤占被等待线程的运行资源，并且在等待线程锁定互斥量进行检查的期间，被等待线程哪怕完成了任务也无法加锁互斥量去设置标志。这就像整夜不睡觉去找火车司机聊天：司机因为一直被你打扰而不得不减速慢行，结果导致列车耗费更久才能到达。
2. **第二种方案：在检查间隙让线程休眠一小段时间**。使用 `std::this_thread::sleep_for()` 函数（详见 4.3 节）：

```cpp
bool flag;
std::mutex m;

void wait_for_flag()
{
    std::unique_lock<std::mutex> lk(m);
    while(!flag)
    {
        lk.unlock(); // 解锁互斥量
        std::this_thread::sleep_for(std::chrono::milliseconds(100)); // 休眠 100 毫秒
        lk.lock();   // 重新加锁互斥量
    }
}
```

在循环内部，函数在休眠之前先解锁互斥量，并在休眠结束后重新加锁，这样其他线程就有机会获取互斥量并设置标志位。

这相比忙轮询有所改进，因为线程在休眠期间不会白白浪费 CPU 处理时间。但这种方案很难精确把握休眠的时长：如果休眠时间太短，线程依然会因频繁唤醒检查而浪费过多的 CPU 处理时间；如果休眠时间太长，线程在被等待的任务已经完成之后仍会继续沉睡，从而引入不必要的响应延迟。在很多后台批处理程序中，过度休眠可能影响不明显，但在对响应性要求极高的高帧率游戏或实时系统中，这可能直接导致掉帧或错过时间片。

3. **第三种也是首选的方案：利用 C++ 标准库提供的机制直接等待事件本身**。等待由另一线程触发事件的最基础机制就是**条件变量（Condition Variable）**。从概念上讲，条件变量与某个事件或其他条件相关联，一个或多个线程可以挂起并等待该条件满足。当某个线程判定该条件已经满足后，它便可以通知一个或多个正在该条件变量上等待的线程，将其唤醒以继续执行后续处理。

---

### 4.1.1 使用条件变量等待条件

C++ 标准库并非只提供了一种条件变量，而是提供了两种实现：
- `std::condition_variable`
- `std::condition_variable_any`

它们都在 `<condition_variable>` 头文件中声明。两者都需要与一个互斥量配合工作，以提供正确的线程同步：
- `std::condition_variable` 仅能与 `std::mutex` 一起工作；
- `std::condition_variable_any` 则更加通用，可以与任何满足基本“类互斥量（mutex-like）”最低标准的对象协同工作（这也是其名称后缀 `_any` 的由来）。

由于 `std::condition_variable_any` 更加通用，它在内存占用、性能表现或操作系统底层资源方面可能会产生潜在的额外开销。因此，**除非确实需要这种通用的灵活性，否则应优先选用 `std::condition_variable`**。

那么，该如何使用 `std::condition_variable` 来处理引言中的生产者-消费者场景呢？如何让等待数据的线程在没有数据可处理时挂起沉睡，直到有新数据到达？下面的代码清单展示了使用条件变量实现该逻辑的一种标准范式。

#### 代码清单 4.1 使用 `std::condition_variable` 等待数据处理

```cpp
std::mutex mut;
std::queue<data_chunk> data_queue;
std::condition_variable data_cond;

void data_preparation_thread()
{
    while(more_data_to_prepare())
    {
        data_chunk const data=prepare_data();
        {
            std::lock_guard<std::mutex> lk(mut);
            data_queue.push(data);
        }
        data_cond.notify_one();
    }
}

void data_processing_thread()
{
    while(true)
    {
        std::unique_lock<std::mutex> lk(mut);
        data_cond.wait(
            lk,[]{return !data_queue.empty();});
        data_chunk data=data_queue.front();
        data_queue.pop();
        lk.unlock();
        process(data);
        if(is_last_chunk(data))
            break;
    }
}
```

#### 工作原理解析

首先，程序声明了一个队列 `data_queue`，用于在两个线程之间传递数据。

1. **数据准备线程（生产者）**：
   当准备好一份数据后，准备数据的线程使用 `std::lock_guard` 锁定保护队列的互斥量 `mut`，将数据推入队列中。接着，它调用 `std::condition_variable` 实例上的 `notify_one()` 成员函数，通知正在等待的线程（如果存在的话）。
   
   请注意，我们将推入队列的代码包裹在一个内层局部作用域块 `{ ... }` 中。这样可以在通知条件变量**之前**提前解锁互斥量——这样设计的好处在于，如果等待线程被唤醒后立即去争用互斥量，就不会因为生产者仍持有互斥锁而再次陷入阻塞。

2. **数据处理线程（消费者）**：
   在消费端，处理线程首先锁定互斥量，但这次使用的是 `std::unique_lock` 而非 `std::lock_guard`——稍后我们将详细解释原因。
   
   随后，该线程调用 `data_cond.wait()`，并将锁对象 `lk` 以及一个表达等待条件的 Lambda 表达式作为参数传入：
   ```cpp
   data_cond.wait(lk, []{ return !data_queue.empty(); });
   ```
   
   Lambda 表达式是 C++11 引入的核心语言特性，允许你将匿名函数作为表达式的一部分直接编写，非常适合用作标准库高阶函数（如 `wait()`）的断言/谓词（predicate）。这里的 `[]{ return !data_queue.empty(); }` 用于检查数据队列是否非空——即队列中是否有准备就绪的数据可供处理。

3. **`wait()` 的内部执行机制**：
   `wait()` 接收锁对象和谓词后，首先执行条件检查（调用传入的 Lambda 表达式）：
   - 如果条件满足（Lambda 返回 `true`），`wait()` 直接返回，线程继续向下执行，此时互斥量依然保持锁定状态；
   - 如果条件不满足（Lambda 返回 `false`），`wait()` 会自动**解锁互斥量**，并将当前线程置于阻塞或等待状态（挂起该线程）。
   
   当条件变量收到来自数据准备线程的 `notify_one()` 调用时，挂起的线程被唤醒（解除阻塞），**自动重新获取互斥锁**，并再次检查条件：
   - 若条件已经满足，则从 `wait()` 返回，此时互斥量处于锁定状态；
   - 若条件仍不满足，该线程将再次解锁互斥量并重新恢复等待。

这正是为什么必须使用 `std::unique_lock` 而不是 `std::lock_guard` 的根本原因：**等待线程在挂起期间必须释放互斥锁，并在被唤醒后重新加锁**，而 `std::lock_guard` 并不具备这种中途灵活解锁与加锁的能力。如果线程在休眠期间一直霸占着互斥锁，数据准备线程就永远无法获取锁来向队列添加新数据，等待线程的等待条件也就永远无法得到满足。

#### 虚假唤醒（Spurious Wakeups）

在代码清单 4.1 中，我们向 `wait()` 传递了一个 Lambda 表达式来检查队列是否非空。实际上，任何函数或可调用对象都可以作为谓词传入。如果你已经有一个命名函数用于检查条件（例如条件判断非常复杂），直接传入该函数名即可，不必将其刻意包装在 Lambda 中。

在 `wait()` 调用期间，条件变量可能会对提供的条件检查多次；但每一次检查必定是在**已锁定互斥量**的前提下进行的，并且当且仅当测试条件的函数返回 `true` 时，`wait()` 才会立即返回。

当等待线程重新获取互斥锁并检查条件时，如果这次唤醒并非直接响应来自其他线程的显式通知（notification），这种现象被称为**虚假唤醒（Spurious Wakeup）**。由于虚假唤醒发生的次数与频率在本质上是无法预测的（受操作系统底层线程调度及信号机制影响），**强烈建议不要在条件检查谓词中使用带有副作用（side effects）的函数**。如果你确实在谓词中执行了带有副作用的操作，必须做好该副作用可能被无规则重复执行多次的准备。

从本质上讲，带有谓词的 `std::condition_variable::wait` 是对忙等待的一种内核级优化。事实上，一个完全符合 C++ 标准（尽管在性能上不够理想）的条件变量 `wait` 实现，可以用如下简单循环来示意：

```cpp
template<typename Predicate>
void minimal_wait(std::unique_lock<std::mutex>& lk, Predicate pred)
{
    while(!pred())
    {
        lk.unlock();
        lk.lock();
    }
}
```

你的并发代码必须能够兼容这种极简的 `wait()` 语义，同时也必须能够兼容仅在收到 `notify_one()` 或 `notify_all()` 时才唤醒的高效操作系统内核级实现。

另外，`std::unique_lock` 能够主动调用 `unlock()` 的灵活性不仅用于 `wait()` 内部；在代码清单 4.1 中，当线程成功从队列获取数据后、开始实际调用 `process(data)` 之前，代码显式调用了 `lk.unlock()`。处理数据可能是一个非常耗时的操作，正如我们在第 3 章中所强调的，持有互斥锁的时间绝不能超出绝对必要的范围。

---

### 4.1.2 基于条件变量构建线程安全队列

如代码清单 4.1 所示，使用队列在多线程之间传递数据是一种极为经典的并发设计范式。如果设计得当，所有同步操作都可以完全内聚在队列类自身内部，从而极大地减少外部调用代码中可能出现的同步问题与竞争条件。

为了设计通用的并发队列，让我们花几分钟时间思考该接口应具备哪些操作，就像我们在 3.2.3 节设计线程安全栈时所做的那样。我们首先参考 C++ 标准库中的 `std::queue<>` 容器适配器接口。

#### 代码清单 4.2 `std::queue` 接口定义

```cpp
template <class T, class Container = std::deque<T> >
class queue {
public:
    explicit queue(const Container&);
    explicit queue(Container&& = Container());
    template <class Alloc> explicit queue(const Alloc&);
    template <class Alloc> queue(const Container&, const Alloc&);
    template <class Alloc> queue(Container&&, const Alloc&);
    template <class Alloc> queue(queue&&, const Alloc&);
    void swap(queue& q);
    bool empty() const;
    size_type size() const;
    T& front();
    const T& front() const;
    T& back();
    const T& back() const;
    void push(const T& x);
    void push(T&& x);
    void pop();
    template <class... Args> void emplace(Args&&... args);
};
```

忽略构造、赋值与交换操作后，剩余的接口可分为三大类：
1. 查询整体队列状态（`empty()` 与 `size()`）
2. 查询队列元素（`front()` 与 `back()`）
3. 修改队列（`push()`、`pop()` 与 `emplace()`）

这与我们在 3.2.3 节中分析栈接口时面临的困境完全一致：接口本身天然包含竞争条件。如果一个线程调用 `front()` 获取头部元素，另一个线程紧接着调用 `pop()`，就会引发严重的数据访问冲突。因此，我们需要将 `front()`（读取值）和 `pop()`（弹出值）合并为一个原子性的单次调用。

不仅如此，用于线程间传递数据的队列还引入了一个新的诉求：**接收线程往往需要等待数据的到来**。因此，我们为出队操作提供两种变体：
- `try_pop()`：尝试从队列中弹出元素，无论队列是否为空都立即返回；若队列为空则返回失败标识；
- `wait_and_pop()`：阻塞等待，直到队列中有元素可供弹出。

根据在线程安全栈中总结出的接口经验，我们的 `threadsafe_queue` 初步接口设计如下：

#### 代码清单 4.3 `threadsafe_queue` 接口原型

```cpp
#include <memory> // 为了使用 std::shared_ptr

template<typename T>
class threadsafe_queue
{
public:
    threadsafe_queue();
    threadsafe_queue(const threadsafe_queue&);
    // 为简化设计，禁用赋值运算符
    threadsafe_queue& operator=(const threadsafe_queue&) = delete;

    void push(T new_value);

    bool try_pop(T& value);
    std::shared_ptr<T> try_pop();

    void wait_and_pop(T& value);
    std::shared_ptr<T> wait_and_pop();

    bool empty() const;
};
```

与栈的设计一样，我们精简了构造函数并删除了拷贝赋值运算符以简化代码。针对 `try_pop()` 和 `wait_and_pop()`，我们分别提供了两个重载版本：
- 第一个重载版本将弹出的值存储在通过引用传入的变量中，因此可以使用函数的返回值来指示成功状态（例如 `try_pop(T&)` 在成功时返回 `true`，失败时返回 `false`）；
- 第二个重载版本直接返回弹出的值，为了应对异常安全性以及空队列情况，该版本返回一个 `std::shared_ptr<T>` 指针。在 `try_pop()` 中，若队列为空则直接返回空指针 `nullptr`。

接下来，我们将代码清单 4.1 中的 `push()` 和 `wait_and_pop()` 提炼封装到队列类中：

#### 代码清单 4.4 从代码清单 4.1 提取 `push()` 与 `wait_and_pop()`

```cpp
#include <queue>
#include <mutex>
#include <condition_variable>

template<typename T>
class threadsafe_queue
{
private:
    std::mutex mut;
    std::queue<T> data_queue;
    std::condition_variable data_cond;
public:
    void push(T new_value)
    {
        std::lock_guard<std::mutex> lk(mut);
        data_queue.push(new_value);
        data_cond.notify_one();
    }

    void wait_and_pop(T& value)
    {
        std::unique_lock<std::mutex> lk(mut);
        data_cond.wait(lk,[this]{return !data_queue.empty();});
        value=data_queue.front();
        data_queue.pop();
    }
};

threadsafe_queue<data_chunk> data_queue;

void data_preparation_thread()
{
    while(more_data_to_prepare())
    {
        data_chunk const data=prepare_data();
        data_queue.push(data);
    }
}

void data_processing_thread()
{
    while(true)
    {
        data_chunk data;
        data_queue.wait_and_pop(data);
        process(data);
        if(is_last_chunk(data))
            break;
    }
}
```

互斥量和条件变量现在被完全封装在 `threadsafe_queue` 实例内部，外部调用者再也不需要维护独立的互斥量与条件变量，调用 `push()` 或 `wait_and_pop()` 时也无需进行任何外部显式同步。

下面给出使用条件变量构建的线程安全队列的完整实现：

#### 代码清单 4.5 使用条件变量实现的线程安全队列完整定义

```cpp
#include <queue>
#include <memory>
#include <mutex>
#include <condition_variable>

template<typename T>
class threadsafe_queue
{
private:
    mutable std::mutex mut; // 互斥量必须声明为 mutable
    std::queue<T> data_queue;
    std::condition_variable data_cond;

public:
    threadsafe_queue()
    {}

    threadsafe_queue(threadsafe_queue const& other)
    {
        std::lock_guard<std::mutex> lk(other.mut);
        data_queue=other.data_queue;
    }

    void push(T new_value)
    {
        std::lock_guard<std::mutex> lk(mut);
        data_queue.push(new_value);
        data_cond.notify_one();
    }

    void wait_and_pop(T& value)
    {
        std::unique_lock<std::mutex> lk(mut);
        data_cond.wait(lk,[this]{return !data_queue.empty();});
        value=data_queue.front();
        data_queue.pop();
    }

    std::shared_ptr<T> wait_and_pop()
    {
        std::unique_lock<std::mutex> lk(mut);
        data_cond.wait(lk,[this]{return !data_queue.empty();});
        std::shared_ptr<T> res(std::make_shared<T>(data_queue.front()));
        data_queue.pop();
        return res;
    }

    bool try_pop(T& value)
    {
        std::lock_guard<std::mutex> lk(mut);
        if(data_queue.empty())
            return false;
        value=data_queue.front();
        data_queue.pop();
        return true;
    }

    std::shared_ptr<T> try_pop()
    {
        std::lock_guard<std::mutex> lk(mut);
        if(data_queue.empty())
            return std::shared_ptr<T>();
        std::shared_ptr<T> res(std::make_shared<T>(data_queue.front()));
        data_queue.pop();
        return res;
    }

    bool empty() const
    {
        std::lock_guard<std::mutex> lk(mut);
        return data_queue.empty();
    }
};
```

> [!NOTE] 为什么互斥量必须声明为 mutable？
> 尽管 `empty()` 是一个 `const` 成员函数，且拷贝构造函数的入参是对另一个对象的 `const` 引用，但在多线程并发环境下，其他线程可能同时持有该对象的非常量引用，并正在调用会修改队列的非 const 成员函数。因此，即便是只读操作，也必须加锁互斥量以保证数据读取的线程安全性。而加锁互斥量本身是一个修改互斥量内部状态的操作，因此互斥量成员 `mut` 必须标记为 `mutable`，这样才能在 `const` 成员函数中调用其 `lock()` 和 `unlock()`。

#### 多个等待线程与 `notify_all()`

当有多个线程等待同一个事件时，条件变量同样非常实用。
- **工作分发（Work-Stealing / Task Pool）场景**：如果多个线程用于分摊计算负载，且每个就绪事件仅需要其中**一个**线程响应处理，那么代码清单 4.1 的结构完全通用——只需同时运行多个 `data_processing_thread` 实例即可。当新数据就绪时，调用 `notify_one()` 会唤醒当前处于 `wait()` 挂起状态的任意一个线程，该线程重新检查条件并消费数据。在此模式下，标准库不保证具体唤醒哪一个线程。
- **广播通知场景**：如果多个线程正在等待同一个事件，且**所有**线程都需要在该事件发生时作出响应（例如系统全局配置初始化完成，或定时周期性数据刷新），那么数据准备线程应当在条件变量上调用 `notify_all()` 而非 `notify_one()`。顾名思义，`notify_all()` 会广播唤醒当前所有正在执行 `wait()` 挂起等待的线程，使它们并发检查各自等待的条件。

如果一个等待线程**只需要等待特定事件发生一次**，一旦条件达成后续就再也不会等待该条件变量，那么条件变量可能并不是该场景下最优雅、最高效的同步工具——尤其是当所等待的条件是“某个特定数据计算完成并可用”时。在这一场景下，**future** 才是更加合适且地道的选择。

---

## 4.2 使用 future 等待一次性事件

假设你要乘飞机出国度假。到达机场办完登机手续并通过安检后，你通常还需要等待航班登机的广播通知，这可能需要等待数小时。期间你可以看书、上网或者在机场咖啡厅用餐来打发时间，但从根本上说，你始终在等待那一件事：登机广播响起。而且，特定的航班只会起飞一次；下次再去度假时，你等待的将是另一趟完全不同的航班。

C++ 标准库将这种“一次性事件”（one-off event）抽象建模为 **future（期物/期望值）**。当某个线程需要等待特定的一次性事件时，它会通过某种途径获取一个代表该事件的 `future` 对象。
- 该线程可以周期性地对 `future` 执行短时间检查（类似于看一眼航班动态大屏幕），并在检查间隙继续处理其他任务（如在咖啡厅用餐）；
- 线程也可以先执行其他任务，直到后续逻辑必须依赖该事件的结果时，再直接阻塞等待 `future` 变为就绪状态（ready）；
- `future` 内部可以关联特定数据（例如你的登机口编号），也可以不关联数据（仅作为完成信号）；
- **一旦事件发生（即 future 变为 ready 状态），该 future 就无法被重置**。

C++ 标准库在 `<future>` 头文件中提供了两类 future 类模板：
1. **独占式 future（Unique Future）：`std::future<>`**
2. **共享式 future（Shared Future）：`std::shared_future<>`**

它们分别借鉴了 `std::unique_ptr` 和 `std::shared_ptr` 的所有权模型：
- 一个 `std::future` 实例是与其关联事件唯一绑定的唯一实例；
- 多个 `std::shared_future` 实例则可以同时指向同一个关联事件。在后一种情况下，所有实例将同时变为就绪状态，并且它们都可以安全地访问与该事件关联的数据。

正因需要关联数据，它们被设计为模板类：模板参数就是关联数据的类型。当事件不需要携带额外数据时，应使用特化版本 `std::future<void>` 和 `std::shared_future<void>`。

> [!WARNING] 跨线程访问同一个 future 对象的安全性
> 尽管 future 是用于线程间通信的工具，但 **future 对象本身的操作并不自带跨线程并发安全**。如果多个线程在没有额外同步手段的情况下并发访问同一个 `std::future` 实例，将引发数据竞争与未定义行为。这是有意设计的：`std::future` 刻画的是对异步结果的独占所有权，且其核心的 `get()` 方法是一次性消耗的（一旦调用，其内部值就会被移动移出）。如果需要多个线程并发等待并读取同一结果，应使用 `std::shared_future`，且每个线程持有该共享 future 的独立本地副本。

在并发技术规范（Concurrency TS）中，标准委员会在 `std::experimental` 命名空间下提供了增强版本的 `std::experimental::future<>` 和 `std::experimental::shared_future<>`，增加了延续函数（continuations）等强大的高级操作。使用这些扩展设施需要包含 `<experimental/future>` 头文件。

最基本的一次性事件莫过于**在后台运行的异步计算的结果**。在第 2 章中我们提到 `std::thread` 无法直接返回计算结果，当时承诺在第 4 章中通过 future 解决，现在我们就来看看这是如何实现的。

---

### 4.2.1 从后台任务返回值

假设你有一个需要长时间运行的复杂计算，预期最终会产出一个很有价值的结果，但你当前并不急需这个值（借用道格拉斯·亚当斯《银河系漫游指南》中的经典桥段，也许你正在计算关于“生命、宇宙以及一切的终极答案”——即数字 42）。你可以启动一个新线程来执行该计算，但这要求你必须自行编写一套机制将计算结果安全传回，因为 `std::thread` 并不支持直接返回值。

这正是 `std::async` 函数模板大显身手的场景（同样声明在 `<future>` 头文件中）。

当你不需要立即获取结果时，可以使用 `std::async` 启动一个**异步任务（asynchronous task）**。`std::async` 不会返回一个供你 `join()` 的 `std::thread` 对象，而是返回一个 `std::future` 对象，该对象最终将持有函数的返回值。当你需要该值时，只需在 future 对象上调用 `get()`，当前线程就会阻塞，直到 future 变为就绪状态并返回计算出的值。

#### 代码清单 4.6 使用 `std::future` 获取异步任务的返回值

```cpp
#include <future>
#include <iostream>

int find_the_answer_to_ltuae();
void do_other_stuff();

int main()
{
    std::future<int> the_answer=std::async(find_the_answer_to_ltuae);
    do_other_stuff();
    std::cout<<"The answer is "<<the_answer.get()<<std::endl;
}
```

与 `std::thread` 类似，`std::async` 允许你在调用中追加额外参数，从而向目标函数传递实参：
- 如果第一个参数是指向成员函数的指针，第二个参数必须提供调用该成员函数的对象（可以直接传对象实例、对象指针，或包装在 `std::ref` 中），后续参数则依次作为该成员函数的入参；
- 否则，后续参数将直接作为普通函数或可调用对象的实参传入；
- 如果传入的实参是右值，则会通过移动构造创建副本。这使得仅支持移动（move-only）的类型既可以作为函数对象，也可以作为入参。

#### 代码清单 4.7 使用 `std::async` 向目标函数传递参数

```cpp
#include <string>
#include <future>

struct X
{
    void foo(int,std::string const&);
    std::string bar(std::string const&);
};
X x;
// 调用 p->foo(42,"hello")，其中 p 为 &x
auto f1=std::async(&X::foo,&x,42,"hello");
// 调用 tmpx.bar("goodbye")，其中 tmpx 是 x 的拷贝副本
auto f2=std::async(&X::bar,x,"goodbye");

struct Y
{
    double operator()(double);
};
Y y;
// 调用 tmpy(3.141)，其中 tmpy 由 Y() 移动构造而来
auto f3=std::async(Y(),3.141);
// 调用 y(2.718)
auto f4=std::async(std::ref(y),2.718);

X baz(X&);
// 传入引用调用 baz(x)
std::async(baz,std::ref(x));

class move_only
{
public:
    move_only();
    move_only(move_only&&);
    move_only(move_only const&) = delete;
    move_only& operator=(move_only&&);
    move_only& operator=(move_only const&) = delete;
    void operator()();
};
// 调用 tmp()，其中 tmp 从 std::move(move_only()) 构造
auto f5=std::async(move_only());
```

#### 启动策略：`std::launch`

默认情况下，`std::async` 具体是创建一个新线程异步执行任务，还是在调用方等待 future 时同步执行任务，取决于标准库的具体实现。在大多数情况下，这种自动策略正是你所期望的，但你也可以通过在函数参数前显式指定一个 `std::launch` 类型的枚举参数来精确控制执行策略：

- `std::launch::async`：强制任务必须在独立的专属新线程上异步运行；
- `std::launch::deferred`：推迟函数调用，直到在返回的 future 上显式调用 `wait()` 或 `get()` 时，才在**当前调用线程**中同步执行；如果从未调用 `wait()` 或 `get()`，该函数将永远不会被执行；
- `std::launch::deferred | std::launch::async`：由标准库实现自行权衡选择（这是默认策略）。

```cpp
// 在新线程中运行
auto f6=std::async(std::launch::async,Y(),1.2);

// 在调用 f7.wait() 或 f7.get() 时才同步运行
auto f7=std::async(std::launch::deferred,baz,std::ref(x));

// 由实现自行决定策略（默认行为）
auto f8=std::async(
    std::launch::deferred | std::launch::async,
    baz,std::ref(x));

auto f9=std::async(baz,std::ref(x));

// 触发 deferred 函数的同步执行
f7.wait();
```

除了 `std::async`，将 `std::future` 与任务关联的途径还包括：
1. 将任务包装在 `std::packaged_task<>` 类模板实例中；
2. 使用 `std::promise<>` 类模板显式写入值。

`std::packaged_task` 是比 `std::promise` 更高层次的抽象，我们首先来看它的用法。

---

### 4.2.2 将任务与 future 关联：`std::packaged_task<>`

`std::packaged_task<>` 将一个 `future` 与一个函数或可调用对象紧密绑定。当 `std::packaged_task<>` 对象被调用时，它会执行所包含的函数或可调用对象，并将返回值作为关联数据存储在内部，从而使关联的 future 变为就绪（ready）状态。

这一机制是构建**线程池（Thread Pool）**（详见第 9 章）以及各类任务调度系统的基础构件。如果一个大型计算可以被拆分为多个独立的小子任务，每个子任务都可以被封装在一个 `std::packaged_task<>` 实例中，然后将该实例投递给任务调度器或工作队列。这彻底解耦了任务执行细节：调度器只需统一处理 `std::packaged_task<>` 抽象实例，而无需关心具体的底层函数签名。

`std::packaged_task<>` 的模板参数是一个**函数签名**，例如：
- `void()`：表示无入参、无返回值的函数；
- `int(std::string&, double*)`：表示接受一个 `std::string&` 和一个 `double*`，返回 `int` 的函数。

构造 `std::packaged_task` 时，传入的可调用对象不必与模板签名完全分毫不差，只要其参数与返回值能够隐式转换即可（例如可以用接受 `int` 并返回 `float` 的函数来构造 `std::packaged_task<double(double)>`）。

函数签名的返回值类型决定了通过 `get_future()` 获得的 `std::future<T>` 的类型，而函数签名的参数列表则定义了打包任务自身调用运算符 `operator()` 的参数签名：

#### 代码清单 4.8 `std::packaged_task<>` 特化版本部分类定义

```cpp
template<>
class packaged_task<std::string(std::vector<char>*,int)>
{
public:
    template<typename Callable>
    explicit packaged_task(Callable&& f);

    std::future<std::string> get_future();

    void operator()(std::vector<char>*,int);
};
```

`std::packaged_task` 本身是一个可调用对象，因此它可以被包装在 `std::function` 中、作为线程函数传递给 `std::thread`、传递给其他需要可调用对象的函数，或者直接像普通函数一样调用。

#### 在线程间传递任务实战：GUI 线程任务调度

许多图形界面（GUI）框架要求所有 UI 更新操作必须在专属的特定线程（UI 线程）上执行。如果后台工作线程需要更新界面，就必须向 UI 线程发送消息。`std::packaged_task` 为此提供了一种通用的解耦方案，无需为每一种界面交互定义繁琐的私有自定义消息类型：

#### 代码清单 4.9 使用 `std::packaged_task` 在 GUI 线程上运行代码

```cpp
#include <deque>
#include <mutex>
#include <future>
#include <thread>
#include <utility>

std::mutex m;
std::deque<std::packaged_task<void()> > tasks;

bool gui_shutdown_message_received();
void get_and_process_gui_message();

void gui_thread()
{
    while(!gui_shutdown_message_received())
    {
        get_and_process_gui_message();
        std::packaged_task<void()> task;
        {
            std::lock_guard<std::mutex> lk(m);
            if(tasks.empty())
                continue;
            task=std::move(tasks.front());
            tasks.pop_front();
        }
        task();
    }
}

std::thread gui_bg_thread(gui_thread);

template<typename Func>
std::future<void> post_task_for_gui_thread(Func f)
{
    std::packaged_task<void()> task(f);
    std::future<void> res=task.get_future();
    std::lock_guard<std::mutex> lk(m);
    tasks.push_back(std::move(task));
    return res;
}
```

在这段代码中：
1. `gui_thread` 循环轮询 GUI 窗口消息和任务队列 `tasks`；
2. 若队列中有任务，它加锁取出任务并迅速解锁，然后在 GUI 线程上下文中执行 `task()`；当任务执行完毕，与之关联的 future 自动就绪；
3. 后台线程通过 `post_task_for_gui_thread(f)` 投递任务，函数返回一个 `std::future<void>`；如果后台线程关心任务是否完成，可在该 future 上调用 `wait()` 或 `get()`，如果不关心则直接忽略即可。

---

### 4.2.3 制造 promise：`std::promise`

当应用程序需要处理海量网络连接时，若为每个连接都分配一个专属线程，往往会消耗庞大的操作系统线程资源，并引发极高的上下文切换开销。因此，高并发网络应用通常采用少量线程（甚至单线程配合事件循环）并发复用处理成千上万个连接。

在多路复用网络线程中，数据包的到达与发送是完全异步且交织无序的。应用程序的其他组件往往需要等待“某特定数据包已成功发送”或“从特定连接收到了新数据包”。

`std::promise<T>` 提供了一种在某一时刻显式写入类型为 `T` 的值，并稍后通过关联的 `std::future<T>` 读取该值的机制：
- 等待线程在 `future` 上阻塞等待；
- 提供数据的线程通过 `promise.set_value()` 写入值并使 `future` 立即就绪；
- 通过 `p.get_future()` 提取关联的 future 对象；
- 若 `std::promise` 析构前未曾调用 `set_value()`，其析构函数会自动将一个异常存入共享状态中。

#### 代码清单 4.10 在单线程中使用 promise 处理多网络连接

```cpp
#include <future>

void process_connections(connection_set& connections)
{
    while(!done(connections))
    {
        for(connection_iterator
            connection=connections.begin(),end=connections.end();
            connection!=end;
            ++connection)
        {
            if(connection->has_incoming_data())
            {
                data_packet data=connection->incoming();
                std::promise<payload_type>& p=
                    connection->get_promise(data.id);
                p.set_value(data.payload);
            }
            if(connection->has_outgoing_data())
            {
                outgoing_packet data=
                    connection->top_of_outgoing_queue();
                connection->send(data.payload);
                data.promise.set_value(true);
            }
        }
    }
}
```

---

### 4.2.4 为 future 保存异常

如果在异步计算过程中抛出了异常，该如何处理？考虑如下计算平方根的代码：

```cpp
double square_root(double x)
{
    if(x<0)
    {
        throw std::out_of_range("x<0");
    }
    return sqrt(x);
}
```

若将该函数异步执行：

```cpp
std::future<double> f=std::async(square_root,-1);
double y=f.get();
```

如果 `std::async` 中调用的函数抛出了异常，**该异常会被自动捕获并存储在 future 的共享状态中**，取代原本的返回值。此时 future 变为就绪状态，随后调用 `f.get()` 时，存储的异常会被**重新抛出（rethrow）**。通过 `std::packaged_task` 执行的任务也是如此。

对于 `std::promise`，你可以显式调用 `set_exception()` 成员函数来存储异常：

```cpp
extern std::promise<double> some_promise;

try
{
    some_promise.set_value(calculate_value());
}
catch(...)
{
    some_promise.set_exception(std::current_exception());
}
```

如果异常类型已知且无需经过实际抛出，更优雅高效的方法是直接使用 `std::make_exception_ptr()`：

```cpp
some_promise.set_exception(
    std::make_exception_ptr(std::logic_error("foo")));
```

这避免了 `try/catch` 的额外开销，并为编译器提供了更好的优化契机。

> [!IMPORTANT] 破坏契约：`std::future_errc::broken_promise`
> 如果关联的 `std::promise` 或 `std::packaged_task` 在尚未设置值或异常的情况下被提前析构，其析构函数会自动将一个带有 `std::future_errc::broken_promise` 错误码的 `std::future_error` 异常存入共享状态中。这确保了等待线程绝不会因为数据提供者异常销毁而永远死锁挂起。

---

### 4.2.5 从多个线程进行等待：`std::shared_future`

虽然 `std::future` 处理了将数据从一个线程同步传递到另一个线程所需的所有同步工作，但**同一个 `std::future` 实例的成员函数调用本身是不带同步保护的**。如果多个线程在没有额外同步措施的情况下并发访问同一个 `std::future` 对象，就会引发数据竞争和未定义行为。

`std::future` 刻画的是**独占所有权**：它是 Move-only 的，且其 `get()` 是一次性提取。

如果你的并发架构需要**多个线程同时等待同一个异步事件**，应当使用 `std::shared_future`。`std::shared_future` 是**可拷贝（copyable）**的，多个 `std::shared_future` 对象可以安全地指向底层的同一个异步共享状态。

```
【单对象并发访问：存在数据竞争】
线程 1: sf.wait()  ----                         ====>  同一 std::shared_future 对象 (数据竞争！)
线程 2: sf.wait()  ----/

【推荐用法：每个线程持有本地副本，内部由标准库保证同步】
线程 1: local1.wait()  --->  [std::shared_future 副本 1]  ---                                                               ===> 底层异步共享状态 (安全无竞争)
线程 2: local2.wait()  --->  [std::shared_future 副本 2]  ---/
```

#### 构造 `std::shared_future`

由于 `std::future` 拥有异步状态的独占所有权，将其转换为 `std::shared_future` 时必须使用 `std::move` 转移所有权：

```cpp
std::promise<int> p;
std::future<int> f(p.get_future());
assert(f.valid());

std::shared_future<int> sf(std::move(f));
assert(!f.valid());  // 原 future 不再有效
assert(sf.valid()); // shared_future 现已有效
```

此外，`std::future` 还提供了一个便捷的成员函数 `share()`，它直接创建并返回一个新的 `std::shared_future`：

```cpp
std::promise<std::map<SomeIndexType, SomeDataType>::iterator> p;
auto sf=p.get_future().share(); // 配合 auto 避免冗长的类型声明
```

---

## 4.3 带有超时限制的等待

前面的所有阻塞调用都会无限期挂起当前线程，直到等待的事件发生。在许多情况下，我们需要为等待设定一个时间上限（超时）。

C++ 支持两种形式的超时设定：
1. **基于持续时间的超时（Duration-based timeout）**：等待一段指定的时间长度（例如 30 毫秒），对应带有 `_for` 后缀的函数（如 `wait_for`）；
2. **基于绝对时间点的超时（Absolute timeout）**：等待直到系统到达某个确切的时间点（例如 2026 年 10 月 1 日 15:30:00），对应带有 `_until` 后缀的函数（如 `wait_until`）。

---

### 4.3.1 时钟（Clocks）

在 C++ 标准库（`<chrono>` 头文件）中，时钟是时间信息的来源。一个标准时钟类提供以下四项核心要素：
- 当前时间点：通过静态成员函数 `now()` 获取；
- 时间点的值类型：由内部嵌套类型 `time_point` 定义；
- 时钟的滴答周期：由 `period` 定义，表示为分数的秒数（例如每秒 25 次为 `std::ratio<1, 25>`）；
- 时钟是否恒定匀速滴答：由静态常量布尔值 `is_steady` 标识。

标准库提供了三种核心时钟：
1. `std::chrono::system_clock`：系统实时壁钟（real-time clock）。它可以被用户或系统网络授时服务（NTP）向前或向后调整，因此**不是稳定时钟（non-steady）**；
2. `std::chrono::steady_clock`：**稳定时钟**。它以恒定速率单调递增，绝不会被调整或回退，**最适合用于计算超时和度量时间间隔**；
3. `std::chrono::high_resolution_clock`：提供标准库所能支持的最高精度时钟。

---

### 4.3.2 持续时间（Durations）

持续时间由 `std::chrono::duration<Rep, Period>` 类模板表示：
- `Rep` 是内部数值的表示类型（如 `int`, `long`, `double`）；
- `Period` 是一个 `std::ratio` 分数，表示每个时间单位等于多少秒。

标准库预定义了常用时长别名：`nanoseconds`, `microseconds`, `milliseconds`, `seconds`, `minutes`, `hours`。

C++14 引入了便捷的字面量后缀（位于 `std::chrono_literals` 命名空间）：

```cpp
using namespace std::chrono_literals;
auto one_day = 24h;
auto half_an_hour = 30min;
auto max_time_between_messages = 30ms;
```

#### 持续时间转换与等待

当转换不会导致精度损失时，时长转换是隐式的；当转换可能引发截断截断（如浮点转整数或大单位转小单位）时，必须使用 `std::chrono::duration_cast<>`：

```cpp
std::chrono::milliseconds ms(54802);
std::chrono::seconds s=
    std::chrono::duration_cast<std::chrono::seconds>(ms); // 截断结果为 54 秒
```

在 future 上使用时长进行超时等待：

```cpp
std::future<int> f=std::async(some_task);
if(f.wait_for(std::chrono::milliseconds(35))==std::future_status::ready)
    do_something_with(f.get());
```

`wait_for()` 返回一个枚举状态 `std::future_status`：
- `std::future_status::ready`：任务已完成，结果就绪；
- `std::future_status::timeout`：等待超时，任务尚未完成；
- `std::future_status::deferred`：任务被推迟执行（尚未启动）。

---

### 4.3.3 时间点（Time points）

时间点由 `std::chrono::time_point<Clock, Duration>` 表示。其值代表自时钟纪元（epoch，如 1970-01-01 00:00:00 UTC）起所流逝的时间。

通过将当前时间加上一个时长，可以计算出未来的绝对超时时间点：

#### 代码清单 4.11 带有超时限制的条件变量等待

```cpp
#include <condition_variable>
#include <mutex>
#include <chrono>

std::condition_variable cv;
bool done;
std::mutex m;

bool wait_loop()
{
    auto const timeout= std::chrono::steady_clock::now()+
        std::chrono::milliseconds(500);
    std::unique_lock<std::mutex> lk(m);
    while(!done)
    {
        if(cv.wait_until(lk,timeout)==std::cv_status::timeout)
            break;
    }
    return done;
}
```

> [!TIP] 为什么在循环中推荐使用 `wait_until` 而非 `wait_for`？
> 当为了防范虚假唤醒而在循环中调用等待函数时，若每次循环都使用 `wait_for(100ms)`，每次虚假唤醒都会重新启动一个完整的 100ms 计时周期，导致整体等待时间可能无限延长。而使用预先计算好的绝对时间点调用 `wait_until(timeout)`，无论发生多少次虚假唤醒，整体超时时间上限都是绝对固定的。

---

### 4.3.4 支持超时的标准库函数汇总

下表总结了 C++ 标准库中所有接受超时的函数及其返回类型：

| 类 / 命名空间 | 函数 | 返回值 | 说明 |
| :--- | :--- | :--- | :--- |
| `std::this_thread` | `sleep_for(duration)`<br>`sleep_until(time_point)` | `void` | 挂起当前线程指定时长或直到指定时间点 |
| `std::condition_variable` 或<br>`std::condition_variable_any` | `wait_for(lock, duration)`<br>`wait_until(lock, time_point)` | `std::cv_status` | 返回 `timeout` 或 `no_timeout` |
| 同上（带谓词重载） | `wait_for(lock, duration, pred)`<br>`wait_until(lock, time_point, pred)` | `bool` | 返回唤醒时谓词的求值结果（`true` 或 `false`） |
| `std::timed_mutex`<br>`std::recursive_timed_mutex`<br>`std::shared_timed_mutex` | `try_lock_for(duration)`<br>`try_lock_until(time_point)` | `bool` | 成功获取独占锁返回 `true`，超时返回 `false` |
| `std::shared_timed_mutex` | `try_lock_shared_for(duration)`<br>`try_lock_shared_until(time_point)` | `bool` | 成功获取共享读锁返回 `true`，超时返回 `false` |
| `std::unique_lock<TimedLockable>` | 构造函数 `(lockable, duration)` 或 `(time_point)`<br>`try_lock_for()` / `try_lock_until()` | `owns_lock()` 为 `bool` | 构造或尝试在超时内获取锁所有权 |
| `std::shared_lock<SharedTimedLockable>` | 构造函数 `(lockable, duration)` 或 `(time_point)`<br>`try_lock_for()` / `try_lock_until()` | `owns_lock()` 为 `bool` | 构造或尝试在超时内获取共享锁所有权 |
| `std::future<T>` 或<br>`std::shared_future<T>` | `wait_for(duration)`<br>`wait_until(time_point)` | `std::future_status` | 返回 `ready`、`timeout` 或 `deferred` |

---

## 4.4 利用操作同步简化代码

将本章迄今介绍的同步机制作为底层构建块，可以让我们将关注点从繁琐底层的锁细节提升到更高维度的并发业务操作上。这使得我们可以采用更为现代化、声明式的并发编程模式：
1. **函数式并发（Functional-Style Concurrency）**
2. **基于消息传递的并发（Message Passing / CSP / Actor 模型）**
3. **延续式并发（Continuation-Style Concurrency）**

---

### 4.4.1 使用 future 进行函数式编程

**函数式编程（FP）** 指的是一种编程风格：函数的求值结果完全仅取决于传入的参数，而不依赖于任何隐式外部状态。这与数学中的函数概念完全契合——用相同的参数调用纯函数两次，得到的结果必然完全一致（如 `sin`, `cos`, `sqrt`）。纯函数绝不修改任何外部状态；其全部作用完全体现在返回值中。

函数式并发极大地简化了多线程系统的设计心智模型：
**如果没有共享的可变数据，就不可能存在数据竞争，因而完全不需要使用互斥锁来保护数据！**

#### 函数式快速排序（FP-Style Quicksort）

快速排序的基本思路是：从列表中选取一个基准元素（pivot），将剩余元素划分为小于基准和大于等于基准的两个子序列；递归排序两部分后，拼接组合为有序序列。

下面首先展示纯函数式风格的顺序版本快速排序：

#### 代码清单 4.12 快速排序的顺序版本实现

```cpp
template<typename T>
std::list<T> sequential_quick_sort(std::list<T> input)
{
    if(input.empty())
    {
        return input;
    }
    std::list<T> result;
    result.splice(result.begin(),input,input.begin());
    T const& pivot=*result.begin();
    auto divide_point=std::partition(input.begin(),input.end(),
        [&](T const& t){return t<pivot;});
    std::list<T> lower_part;
    lower_part.splice(lower_part.end(),input,input.begin(),
        divide_point);
    auto new_lower(
        sequential_quick_sort(std::move(lower_part)));
    auto new_higher(
        sequential_quick_sort(std::move(input)));
    result.splice(result.end(),new_higher);
    result.splice(result.begin(),new_lower);
    return result;
}
```

#### 函数式并行快速排序

将上述函数式结构转换为基于 `std::async` 和 `std::future` 的并行版本非常直观自然：

#### 代码清单 4.13 使用 future 的并行快速排序

```cpp
template<typename T>
std::list<T> parallel_quick_sort(std::list<T> input)
{
    if(input.empty())
    {
        return input;
    }
    std::list<T> result;
    result.splice(result.begin(),input,input.begin());
    T const& pivot=*result.begin();
    auto divide_point=std::partition(input.begin(),input.end(),
        [&](T const& t){return t<pivot;});
    std::list<T> lower_part;
    lower_part.splice(lower_part.end(),input,input.begin(),
        divide_point);

    // 将较小部分抛至另一线程异步排序
    std::future<std::list<T> > new_lower(
        std::async(&parallel_quick_sort<T>,std::move(lower_part)));

    // 当前线程直接递归处理较大部分
    auto new_higher(
        parallel_quick_sort(std::move(input)));

    result.splice(result.end(),new_higher);
    result.splice(result.begin(),new_lower.get());
    return result;
}
```

较小部分的排序交由 `std::async` 异步处理，较大部分由当前线程直接递归处理。当需要合并结果时，通过 `new_lower.get()` 提取异步结果并移动进结果列表中。

你也可以自行编写一个简单的 `spawn_task` 包装函数，通过 `std::packaged_task` 和 `std::thread` 调度任务：

#### 代码清单 4.14 `spawn_task` 的示例实现

```cpp
template<typename F,typename A>
std::future<typename std::result_of<F(A&&)>::type>
spawn_task(F&& f,A&& a)
{
    typedef typename std::result_of<F(A&&)>::type result_type;
    std::packaged_task<result_type(A&&)>
        task(std::move(f));
    std::future<result_type> res(task.get_future());
    std::thread t(std::move(task),std::move(a));
    t.detach();
    return res;
}
```

---

### 4.4.2 通过消息传递进行操作同步：CSP 与 Actor 模型

另一种完全抛弃共享可变数据的并发模型是 **CSP（通信顺序进程，Communicating Sequential Processes）** 与 **Actor 模型**。在这一模型中，各个线程之间在概念上完全隔离，彼此之间不存在任何直接共享的状态，全部交互均通过在通信通道（或邮箱队列）中收发异步消息来完成。

每个处理线程本质上是一个**有限状态机（Finite State Machine）**：当它收到一条消息后，会根据当前所处的状态更新自身状态，并可能向其他线程发送一条或多条响应消息。

以银行自动柜员机（ATM）系统为例，我们可以将系统拆分为三个独立互不共享数据的线程：
1. **硬件接口线程**：负责物理硬件控制（读卡器、键盘按键、吐钞机）；
2. **ATM 业务逻辑线程**：核心状态机；
3. **银行通信线程**：与中心银行主机通信。

#### 代码清单 4.15 ATM 状态机核心逻辑类实现

```cpp
struct card_inserted
{
    std::string account;
};

class atm
{
    messaging::receiver incoming;
    messaging::sender bank;
    messaging::sender interface_hardware;
    void (atm::*state)();
    std::string account;
    std::string pin;

    void waiting_for_card()
    {
        interface_hardware.send(display_enter_card());
        incoming.wait()
            .handle<card_inserted>(
                [&](card_inserted const& msg)
                {
                    account=msg.account;
                    pin="";
                    interface_hardware.send(display_enter_pin());
                    state=&atm::getting_pin;
                }
            );
    }

    void getting_pin();

public:
    void run()
    {
        state=&atm::waiting_for_card;
        try
        {
            for(;;)
            {
                (this->*state)();
            }
        }
        catch(messaging::close_queue const&)
        {
        }
    }
};
```

#### 代码清单 4.16 `getting_pin` 状态函数实现

```cpp
void atm::getting_pin()
{
    incoming.wait()
        .handle<digit_pressed>(
            [&](digit_pressed const& msg)
            {
                unsigned const pin_length=4;
                pin+=msg.digit;
                if(pin.length()==pin_length)
                {
                    bank.send(verify_pin(account,pin,incoming));
                    state=&atm::verifying_pin;
                }
            }
        )
        .handle<clear_last_pressed>(
            [&](clear_last_pressed const& msg)
            {
                if(!pin.empty())
                {
                    pin.resize(pin.length()-1);
                }
            }
        )
        .handle<cancel_pressed>(
            [&](cancel_pressed const& msg)
            {
                state=&atm::done_processing;
            }
        );
}
```

通过链式注册的 `.handle<MessageType>(...)` 处理器，状态机以类型安全的方式匹配并处理特定消息类型。所有互斥与同步细节全部被封装在底层消息传递库中，业务逻辑代码完全免受死锁与数据竞争的困扰。

---

### 4.4.3 Concurrency TS 中的延续式并发：`then()`

在原生 C++11 的 `std::future` 中，要处理异步任务的结果，你必须显式调用 `wait()` 或 `get()` 进行阻塞等待。如果后续还有连锁任务，这将导致线程频繁阻塞挂起，造成系统资源的极大浪费。

C++ 并发技术规范（Concurrency TS）在 `std::experimental::future` 中引入了核心特性——**延续（Continuations）**。通过成员函数 `.then()`，你可以声明式地指定：“**当底层 future 就绪后，自动触发此延续函数**”：

```cpp
std::experimental::future<int> find_the_answer();
auto fut = find_the_answer();
auto fut2 = fut.then(find_the_question);
assert(!fut.valid());  // 原 future 被消耗，变为 invalid
assert(fut2.valid()); // fut2 持有延续函数的异步执行结果
```

延续函数必须接受一个就绪的 `std::experimental::future<T>` 作为唯一参数：
```cpp
std::string find_the_question(std::experimental::future<int> the_answer);
```
之所以向延续函数传递 `future` 本身而非直接解包出的值，是为了让延续函数能够在调用 `the_answer.get()` 时捕获并处理上游计算链抛出的异常。

#### 代码清单 4.17 为 Concurrency TS 编写的简易 `spawn_async`

```cpp
template<typename Func>
std::experimental::future<decltype(std::declval<Func>()())>
spawn_async(Func&& func){
    std::experimental::promise<
        decltype(std::declval<Func>()())> p;
    auto res=p.get_future();
    std::thread t(
        [p=std::move(p),f=std::decay_t<Func>(func)]()
        mutable{
            try{
                p.set_value_at_thread_exit(f());
            } catch(...){
                p.set_exception_at_thread_exit(std::current_exception());
            }
        });
    t.detach();
    return res;
}
```

---

### 4.4.4 链式调用延续（Chaining Continuations）

以用户登录流程为例（验证身份 -> 请求账户信息 -> 更新展示）：

#### 代码清单 4.18 简单的顺序式登录处理

```cpp
void process_login(std::string const& username,std::string const& password)
{
    try {
        user_id const id=backend.authenticate_user(username,password);
        user_data const info_to_display=backend.request_current_info(id);
        update_display(info_to_display);
    } catch(std::exception& e){
        display_error(e);
    }
}
```

#### 代码清单 4.19 使用单个异步任务处理登录（仍然会阻塞工作线程）

```cpp
std::future<void> process_login(
    std::string const& username,std::string const& password)
{
    return std::async(std::launch::async,[=](){
        try {
            user_id const id=backend.authenticate_user(username,password);
            user_data const info_to_display=
                backend.request_current_info(id);
            update_display(info_to_display);
        } catch(std::exception& e){
            display_error(e);
        }
    });
}
```

#### 代码清单 4.20 使用延续链式处理用户登录（非阻塞式）

```cpp
std::experimental::future<void> process_login(
    std::string const& username,std::string const& password)
{
    return spawn_async([=](){
        return backend.authenticate_user(username,password);
    }).then([](std::experimental::future<user_id> id){
        return backend.request_current_info(id.get());
    }).then([](std::experimental::future<user_data> info_to_display){
        try{
            update_display(info_to_display.get());
        } catch(std::exception& e){
            display_error(e);
        }
    });
}
```

每一个 `.then()` 延续节点均在上游就绪后由系统线程调度触发，异常会沿着调用链自然传播至最终节点的 `info_to_display.get()` 处集中捕获处理，全程无需阻塞任何工作线程。

如果后端 API 本身就是完全异步非阻塞的（返回 `std::experimental::future`），Concurrency TS 的延续函数会自动进行“隐式解包（unwrapping）”，防止嵌套出 `future<future<T>>`：

#### 代码清单 4.21 使用全异步操作链处理用户登录

```cpp
std::experimental::future<void> process_login(
    std::string const& username,std::string const& password)
{
    return backend.async_authenticate_user(username,password).then(
        [](std::experimental::future<user_id> id){
            return backend.async_request_current_info(id.get());
        }).then(
        [](std::experimental::future<user_data> info_to_display){
            try{
                update_display(info_to_display.get());
            } catch(std::exception& e){
                display_error(e);
            }
        });
}
```

---

### 4.4.5 等待多个 future：`when_all`

当你向多个独立节点发起并行计算并需要聚合结果时，在传统 C++11 中必须逐一调用 `get()`：

#### 代码清单 4.22 传统模式下通过 `std::async` 收集多个 future 的结果

```cpp
std::future<FinalResult> process_data(std::vector<MyData>& vec)
{
    size_t const chunk_size=choose_chunk_size(vec.size());
    std::vector<std::future<ChunkResult> > results;
    for(auto bi=vec.begin(),ei=bi;bi!=vec.end();bi=ei)
    {
        ei=bi+std::min(chunk_size,static_cast<size_t>(vec.end()-bi));
        results.push_back(std::async(process_chunk,bi,ei));
    }
    return std::async(std::launch::async,
        [all_results=std::move(results)]() mutable {
            std::vector<ChunkResult> v;
            for(auto& f: all_results)
            {
                v.push_back(f.get()); // 逐个阻塞等待，容易导致线程资源浪费
            }
            return gather_results(v);
        });
}
```

而在 Concurrency TS 中，`std::experimental::when_all` 能够将一组 future 汇聚为一个全新的合成 future，**仅当所有子 future 全部变为就绪状态时，合成 future 才变为就绪**，并支持挂接 `.then()` 延续：

#### 代码清单 4.23 使用 `std::experimental::when_all` 收集多个 future

```cpp
std::experimental::future<FinalResult> process_data(
    std::vector<MyData>& vec)
{
    size_t const chunk_size=choose_chunk_size(vec.size());
    std::vector<std::experimental::future<ChunkResult> > results;
    for(auto bi=vec.begin(),ei=bi;bi!=vec.end();bi=ei)
    {
        ei=bi+std::min(chunk_size,static_cast<size_t>(vec.end()-bi));
        results.push_back(spawn_async(
            [=](){ return process_chunk(bi,ei); }));
    }
    return std::experimental::when_all(
        results.begin(),results.end()).then( // 当全部子任务完成时自动触发
        [](std::experimental::future<
               std::vector<std::experimental::future<ChunkResult> > > fut)
        {
            std::vector<std::experimental::future<ChunkResult> > results=
                fut.get();
            std::vector<ChunkResult> v;
            v.reserve(results.size());
            for(auto& f: results)
            {
                v.push_back(f.get());
            }
            return gather_results(v);
        });
}
```

---

### 4.4.6 使用 `when_any` 等待一组 future 中的首个完成

当我们需要并发发起多种搜索尝试，且“只要任意一个计算出有效结果即可”时，`std::experimental::when_any` 是理想的工具。当这组 future 中的**第一个**变为 ready 状态时，`when_any` 返回的合成 future 立即就绪。

#### 代码清单 4.24 使用 `std::experimental::when_any` 处理最先计算出的结果

```cpp
std::experimental::future<FinalResult>
find_and_process_value(std::vector<MyData>& data)
{
    unsigned const concurrency=std::thread::hardware_concurrency();
    unsigned const num_tasks=(concurrency>0)?concurrency:2;
    std::vector<std::experimental::future<MyData*> > results;
    auto const chunk_size=(data.size()+num_tasks-1)/num_tasks;
    auto chunk_begin=data.begin();
    std::shared_ptr<std::atomic<bool> > done_flag=
        std::make_shared<std::atomic<bool> >(false);
    for(unsigned i=0;i<num_tasks;++i)
    {
        auto chunk_end=
            (i==(num_tasks-1))?data.end():chunk_begin+chunk_size;
        results.push_back(spawn_async([=]{
            for(auto entry=chunk_begin;
                !done_flag->load(std::memory_order_relaxed) &&
                    (entry!=chunk_end);
                ++entry)
            {
                if(matches_criteria(*entry))
                {
                    done_flag->store(true,std::memory_order_relaxed);
                    return &*entry;
                }
            }
            return static_cast<MyData*>(nullptr);
        }));
        chunk_begin=chunk_end;
    }
    return std::experimental::when_any(
        results.begin(),results.end()).then(
        [](std::experimental::future<
               std::experimental::when_any_result<
                   std::vector<std::experimental::future<MyData*> > > > fut)
        {
            auto result=fut.get();
            MyData* const found_value=result.futures[result.index].get();
            return process_value(found_value);
        });
}
```

---

### 4.4.7 Concurrency TS 中的闭锁与屏障

在许多并行算法中，多个线程需要协同分阶段推进：
- **闭锁（Latch）**：一种**一次性（one-off）**同步屏障。其内部维护一个递减计数器；任何线程到达后将计数器减 1，等待线程阻塞挂起，直到计数器降至 0。一旦计数器归零，闭锁将永久保持开启状态，不可重置。
- **屏障（Barrier）**：一种**可循环复用（reusable）**的同步工具。一组参与线程在每一个迭代周期都必须在屏障处汇合等待；当所有参与线程均到达后，屏障放行所有线程进入下一阶段，并自动重置自身状态。

---

### 4.4.8 `std::experimental::latch`：基础闭锁

使用 `std::experimental::latch` 协调多个线程的初始化阶段：

#### 代码清单 4.25 使用 `std::experimental::latch` 等待事件完成

```cpp
void foo()
{
    unsigned const thread_count=...;
    latch done(thread_count);
    my_data data[thread_count];
    std::vector<std::future<void> > threads;
    for(unsigned i=0;i<thread_count;++i)
        threads.push_back(std::async(std::launch::async,
            [&,i]{
                data[i]=make_data(i);
                done.count_down(); // 递减计数
                do_more_stuff();
            }));
    done.wait(); // 主线程阻塞等待所有数据生成完成
    process_data(data,thread_count);
}
```

---

### 4.4.9 `std::experimental::barrier`：基础屏障

在多轮迭代计算（如网格数值模拟）中，每一轮所有线程均需处理自己的数据分块，并在同步点汇合等待所有邻居节点计算完毕，然后才能推进到下一轮：

#### 代码清单 4.26 使用 `std::experimental::barrier` 协调线程迭代

```cpp
result_chunk process(data_chunk&);
std::vector<data_chunk> split_into_chunks(std::vector<data_source>& src);

void process_data(std::vector<data_source>& source)
{
    unsigned const concurrency=std::thread::hardware_concurrency();
    unsigned const num_threads=(concurrency>0)?concurrency:2;

    std::experimental::barrier sync(num_threads);
    std::vector<joining_thread> threads(num_threads);

    auto chunks=split_into_chunks(source);

    for(unsigned i=0;i<num_threads;++i)
    {
        threads[i]=joining_thread([&,i]{
            while(!source.empty())
            {
                chunks[i]=process(chunks[i]);
                sync.arrive_and_wait(); // 阶段 1：等待当前轮次所有线程处理完毕
                if(i==0)
                {
                    source=combine_and_update(chunks);
                    chunks=split_into_chunks(source);
                }
                sync.arrive_and_wait(); // 阶段 2：等待线程 0 准备好下一轮数据
            }
        });
    }
}
```

---

### 4.4.10 `std::experimental::flex_barrier`：灵活屏障

`std::experimental::flex_barrier` 允许在构造时提供一个**完成阶段回调函数（Completion Function）**：当本轮所有线程全部到达屏障时，系统会自动在**某一个线程**上串行执行该回调函数，然后再放行所有线程。回调函数返回一个整数：返回 `-1` 表示下一轮参与线程数保持不变；返回大于等于 `0` 的数字可动态调整下一轮的参与线程数！

#### 代码清单 4.27 使用 `std::experimental::flex_barrier` 提供串行处理区域

```cpp
void process_data(std::vector<data_source>& source)
{
    unsigned const concurrency=std::thread::hardware_concurrency();
    unsigned const num_threads=(concurrency>0)?concurrency:2;

    std::vector<data_chunk> chunks;

    auto split_source=[&]{
        split_into_chunks(source,chunks);
    };

    split_source();

    std::experimental::flex_barrier sync(
        num_threads,[&](){
            source=combine_and_update(chunks);
            split_source();
            return -1; // 参与线程数保持不变
        });

    std::vector<joining_thread> threads(num_threads);

    for(unsigned i=0;i<num_threads;++i)
    {
        threads[i]=joining_thread([&,i]{
            while(!source.empty())
            {
                chunks[i]=process(chunks[i]);
                sync.arrive_and_wait(); // 仅需单次汇合！汇合后自动触发 flex 回调
            }
        });
    }
}
```

借助 `flex_barrier` 的回调机制，主循环中的代码被大幅简化，原本需要两次显式屏障汇合的逻辑被精炼为单次汇合，且具备了在计算流水线初期和末期动态增减工作线程数的能力。

---

### 本章小结

在构建并发应用程序时，线程间的操作同步是不可或缺的基石：如果没有同步，线程彼此独立，就无法协作完成复杂的业务系统。

本章全面探讨了 C++ 中同步操作的各类手段：
1. **基础同步**：使用 `std::condition_variable` 和 `std::condition_variable_any` 让线程挂起并等待事件，规避低效的忙轮询与休眠；
2. **一次性事件传递**：使用 `std::future` 和 `std::shared_future` 从异步任务中获取返回值与异常；使用 `std::async` 启动异步计算；使用 `std::packaged_task` 包装函数任务进行跨线程调度；使用 `std::promise` 显式写入数据并向等待线程发布结果；
3. **时间控制**：基于 `<chrono>` 库的时钟（`steady_clock`）、持续时间（`duration`）与时间点（`time_point`）为各类等待设定绝对或相对超时时间限制；
4. **架构模式简化**：
   - **函数式并发**：消除共享可变状态，借助不可变数据与 `std::async` 规避数据竞争；
   - **消息传递（CSP / Actor）**：将线程建模为无共享状态的纯状态机，通过异步消息通道解耦系统；
   - **延续与汇合**：借助 Concurrency TS 的 `.then()`、`when_all`、`when_any` 构建完全非阻塞的异步调用链；
   - **协同推进**：使用闭锁（`latch`）与屏障（`barrier` / `flex_barrier`）协调多线程分阶段迭代计算。

掌握了这些高级同步工具之后，在下一章中，我们将深入更底层的体系结构核心，探索支撑这一切并发设施运行的物理基石——**C++ 内存模型与原子操作**。
