---
id: cpp-concurrency-06-lock-based-data-structures
title: "第 6 章：基于锁的并发数据结构设计"
titleEn: "Chapter 6: Designing lock-based concurrent data structures"
order: 46
category: specialized
description: "并发数据结构设计指导准则、线程安全栈、线程安全队列与细粒度锁查找表及链表实现。"
tags: ["C++", "数据结构", "线程安全栈", "线程安全队列", "细粒度锁"]
---

# 第 6 章：基于锁的并发数据结构设计

本章主要涵盖：

- 并发数据结构设计的核心意义
- 并发数据结构的设计指导原则
- 针对并发访问设计的具体数据结构实现范例

在上一章中，我们探讨了原子操作的底层细节以及 C++ 内存模型。在本章中，我们将暂时从底层细节中抽出身来（尽管在第 7 章中我们还会再次用到它们），重点关注**数据结构**的设计。

在编程问题中，数据结构的选择往往是整体解决方案的关键支柱，并行编程领域亦不例外。如果一个数据结构需要被多个线程并发访问，那么它要么必须是**完全不可变（immutable）**的——即数据在初始化后永不改变，因而无需任何同步；要么程序必须经过精心设计，以确保线程之间的修改能够被正确同步。一种做法是使用外部互斥量（mutex）和外部加锁来保护数据（正如我们在第 3 章和第 4 章中见到的技术）；另一种做法则是将数据结构本身设计为支持并发访问。

在设计并发数据结构时，你可以使用前面章节介绍的多线程基本构建块，例如互斥量和条件变量（condition variable）。事实上，你已经见过了几个将这些基础构件组合在一起、编写出多线程并发安全数据结构的示例。

在本章中，我们将首先探讨设计并发数据结构的一些通用指导准则。然后，我们将利用锁和条件变量这些基本工具，重新审视并精化基础数据结构的设计，随后逐步进阶到更复杂的数据结构。在第 7 章中，我们则会追本溯源，利用第 5 章介绍的原子操作来构建不使用锁的无锁数据结构。

现在，让我们正式探讨并发数据结构的设计要素。

---

## 6.1 并发设计的内涵是什么？

在基础层面上，为并发设计数据结构意味着：**多个线程可以并发访问该数据结构，无论是执行相同还是不同的操作，且每个线程都能观察到数据结构的自洽（self-consistent）视图**。数据不会丢失或损坏，所有不变量（invariants）均能得到维持，并且不存在有害的数据竞争（race condition）。这样的数据结构被称为**线程安全（thread-safe）**的数据结构。

通常情况下，一个数据结构可能仅针对特定类型的并发访问是安全的。例如，可能允许多个线程并发执行同一种操作，而另一种操作则需要单个线程独占访问；或者，如果多个线程执行的是不同的操作，则并发访问是安全的，但如果多个线程执行相同的操作就会引发问题。

然而，真正的“为并发设计”远不止于保证基本的线程安全，它更意味着**为访问该数据结构的线程提供最大化并发执行的机会**。互斥量（mutex）从本质上讲提供的是互斥性（mutual exclusion）：同一时刻只有一个线程能够获取互斥锁。互斥量通过显式阻止对受保护数据的真正并发访问来保护数据结构。

这种现象被称为**串行化（serialization）**：线程必须轮流访问受互斥量保护的数据；它们必须串行访问，而非并发访问。因此，你必须在数据结构的设计上深思熟虑，以实现真正的并发访问。有些数据结构相比其他结构拥有更大的真正并发空间，但所有设计的核心思想是相同的：**受保护的区域越小，需要串行化的操作就越少，潜在的并发度也就越高**。

在深入具体数据结构设计之前，我们先快速浏览一下并发设计时需要考量的基本准则。

### 6.1.1 并发数据结构的设计指导原则

如前所述，在设计并发访问的数据结构时，需要权衡两个核心方面：**确保访问安全**与**实现真正的并发访问**。关于如何使数据结构线程安全的基础知识已在前面章节介绍过，这里可以归纳为以下几条准则：

1. **保证不变量不被破坏**：确保任何线程都绝不会观察到因其他线程的操作而导致数据结构不变量遭到破坏的中间状态。
2. **避免接口固有的竞争条件**：提供完整操作的接口函数，而不是将一个操作拆分为多个离散的步骤函数（例如将 `top()` 与 `pop()` 合并）。
3. **关注异常安全性**：密切注意数据结构在抛出异常时的行为，确保发生异常时不会破坏数据结构的不变量，也不会导致资源泄漏。
4. **最大程度降低死锁风险**：在使用数据结构时，通过限制锁的持有范围并尽可能避免嵌套加锁，来将死锁机会降至最低。

在深入这些细节之前，同样重要的是思考：你希望对数据结构的使用者施加怎样的约束？如果一个线程正在通过某个特定成员函数访问数据结构，那么其他线程调用哪些函数是安全的？

这是一个至关重要的考量：
- 通常，构造函数和析构函数需要独占访问该数据结构，但必须由使用者来保证对象在构造完成之前不会被访问，以及在析构开始之后不再被任何线程访问。
- 如果数据结构支持赋值运算符、`swap()` 或拷贝构造，作为设计者，你需要决定这些操作是否允许与其他操作并发调用，还是要求用户必须确保独占访问——即便该数据结构的大多数操作都可以安全地被多线程无顾虑并发调用。

第二个考量方面是**促成真正的并发访问**。对此很难给出死板的教条，但设计者可以经常向自己提出以下一系列问题：

- 锁的作用域是否可以进一步缩小，从而允许操作的某些部分在锁之外执行？
- 数据结构的不同部分能否由不同的互斥量分别保护？
- 是否所有操作都需要同等级别的保护？（例如读操作只需共享锁，写操作才需要独占锁）
- 能否对数据结构进行简单的调整，在不改变操作语义的前提下大幅增加并发机会？

所有这些问题都围绕着一个核心思想：**如何最大程度减少必须发生的串行化，从而释放最大程度的真正并发？**

在实际工程中，数据结构允许多个仅执行读取操作的线程并发访问，而只有修改数据结构的线程才需要独占访问，这种模式非常普遍。这可以通过使用诸如 `std::shared_mutex` 等读写锁机制来实现。同样，正如我们很快将看到的，让数据结构支持执行不同操作的线程并发运行，同时仅对执行相同操作的线程进行串行化，也是一种极其常见的设计。

最简单的线程安全数据结构通常使用互斥量和锁来保护数据。尽管这种方式存在串行化瓶颈，但它能相对容易地保证同一时间只有一个线程在操作数据。为了循序渐进，本章我们将专注于基于锁的并发数据结构设计，而将完全不使用锁的无锁并发数据结构留到第 7 章。

---

## 6.2 基于锁的并发数据结构

设计基于锁的并发数据结构的核心在于：**确保在访问数据时锁定正确的互斥量，并且锁的持有时间尽可能短**。

即使只有单个互斥量保护数据结构，这本身也是一件具有挑战性的工作。你需要确保数据绝不会在互斥锁的保护范围之外被泄露或访问，且接口中不存在固有的竞争条件。如果你使用独立的互斥量来保护数据结构的不同部分，问题就会变得更加复杂；如果某项操作需要同时获取多个互斥量，就必须面对**死锁**的潜在威胁。因此，设计包含多个互斥量的数据结构需要比单互斥量结构更加严谨细腻。

在本节中，我们将把 6.1.1 节的指导原则应用到几个经典数据结构的设计中，利用互斥量和锁来保护数据。在每个案例中，我们都会在确保线程安全的前提下，积极寻找提高并发度的机会。

我们先从第 3 章中的栈实现开始；它是最简单的数据结构之一，并且仅使用了一个互斥量。它是线程安全的吗？它在实现真正并发方面的表现又如何？

### 6.2.1 使用锁的线程安全栈

清单 6.1 重现了第 3 章中编写的线程安全栈。其目标是构建一个类似于 `std::stack<>` 的线程安全数据结构，支持将数据项压入（push）栈以及从栈中弹出（pop）。

**清单 6.1 线程安全栈的类定义**

```cpp
#include <exception>
#include <memory>
#include <mutex>
#include <stack>

struct empty_stack: std::exception
{
    const char* what() const noexcept override
    {
        return "empty stack";
    }
};

template<typename T>
class threadsafe_stack
{
private:
    std::stack<T> data;
    mutable std::mutex m;

public:
    threadsafe_stack() {}

    threadsafe_stack(const threadsafe_stack& other)
    {
        std::lock_guard<std::mutex> lock(other.m);
        data = other.data;
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
        if(data.empty()) throw empty_stack(); // 弹出前检查栈空
        std::shared_ptr<T> const res(
            std::make_shared<T>(std::move(data.top()))); // 分配结果
        data.pop();
        return res;
    }

    void pop(T& value)
    {
        std::lock_guard<std::mutex> lock(m);
        if(data.empty()) throw empty_stack();
        value = std::move(data.top());
        data.pop();
    }

    bool empty() const
    {
        std::lock_guard<std::mutex> lock(m);
        return data.empty();
    }
};
```

让我们依次结合前述准则对该实现进行审视：

1. **不变量与基本安全性**：基础线程安全通过互斥量 `m` 保护每个成员函数来实现。这确保了同一时刻只有一个线程在访问底层数据；只要每个成员函数在退出时都维护了数据结构的不变量，就不会有线程看到损坏的状态。
2. **接口竞争条件**：`empty()` 与任意重载的 `pop()` 之间潜在存在竞争条件，但由于 `pop()` 在持有互斥锁的内部显式检查了底层栈是否为空，因此这一竞争并不构成威胁。通过在 `pop()` 调用中直接返回被弹出的数据项，消除了 `std::stack<>` 中因 `top()` 与 `pop()` 相互分离而固有的竞态问题。
3. **异常安全性**：
   - 互斥量加锁操作可能抛出异常（尽管极罕见，通常代表系统资源枯竭或系统级错误），但由于加锁是每个函数的第一项操作，此时尚未修改任何数据，因而是异常安全的。解锁操作绝不失败，且使用 `std::lock_guard<>` 保证了即使中途抛出异常互斥锁也能被正确释放。
   - `data.push()` 可能会在拷贝/移动元素或底层容器扩展内存时抛出异常。在这两种情况下，`std::stack<>` 都保证了自身状态不变，因此同样安全。
   - 在第一种 `pop()` 重载中，抛出 `empty_stack` 异常时并未修改任何数据；`std::make_shared` 分配内存或对象移动构造可能抛出异常，但此时底层栈尚未调用 `data.pop()`，C++ 运行时与标准库会保证没有内存泄漏且已创建的对象被正确销毁。最后的 `data.pop()` 保证不抛出异常，因此该重载具备强异常安全保证。
   - 第二种 `pop(T& value)` 重载也是如此：若给 `value` 赋值时抛出异常，底层栈中的元素并未被移除，因而同样保证了异常安全性。
4. **死锁风险**：在持有锁的情况下调用了外部用户代码——包含类型 `T` 的拷贝/移动构造函数、赋值运算符以及潜在的用户自定义 `operator new`。如果这些用户自定义函数反过来调用了当前栈对象的成员函数，或者它们需要获取某把锁且调用栈函数时已持有了另一把锁，就会产生死锁隐患。然而，要求栈的使用者对这些行为负责是合理的；将元素压入或弹出栈不可能完全脱离复制、移动或内存分配。

**并发度评估**：
虽然多个线程并发调用成员函数是绝对安全的，但由于使用了单一互斥量，同一时间只能有一个线程真正在栈内执行操作。这种完全的串行化在高争用场景下会严重限制应用程序的性能：线程在等待锁时无法进行任何有价值的工作。

此外，该栈并未提供任何“等待元素入栈”的机制。如果某个线程需要等待数据，它必须不断轮询调用 `empty()`，或者不断尝试 `pop()` 并捕获 `empty_stack` 异常。这种忙等待（busy-waiting）要么白白消耗宝贵的 CPU 资源，要么迫使调用方在外部使用条件变量编写复杂的等待/唤醒逻辑，这使得内部加锁变得冗余且浪费。

在第 4 章中，我们见到了将等待逻辑整合进数据结构本身的队列实现，利用内部条件变量来挂起等待线程。接下来我们就审视这一设计。

---

### 6.2.2 使用锁和条件变量的线程安全队列

清单 6.2 重现了第 4 章中实现的线程安全队列。正如栈是以 `std::stack<>` 为蓝本一样，该队列以 `std::queue<>` 为蓝本，但为了保证多线程安全，其接口经过了重新设计。

**清单 6.2 使用条件变量的线程安全队列完整类定义**

```cpp
#include <memory>
#include <mutex>
#include <condition_variable>
#include <queue>

template<typename T>
class threadsafe_queue
{
private:
    mutable std::mutex mut;
    std::queue<T> data_queue;
    std::condition_variable data_cond;

public:
    threadsafe_queue() {}

    void push(T new_value)
    {
        std::lock_guard<std::mutex> lk(mut);
        data_queue.push(std::move(new_value));
        data_cond.notify_one(); // 通知一个等待线程
    }

    void wait_and_pop(T& value)
    {
        std::unique_lock<std::mutex> lk(mut);
        data_cond.wait(lk, [this]{ return !data_queue.empty(); });
        value = std::move(data_queue.front());
        data_queue.pop();
    }

    std::shared_ptr<T> wait_and_pop()
    {
        std::unique_lock<std::mutex> lk(mut);
        data_cond.wait(lk, [this]{ return !data_queue.empty(); });
        std::shared_ptr<T> res(
            std::make_shared<T>(std::move(data_queue.front())));
        data_queue.pop();
        return res;
    }

    bool try_pop(T& value)
    {
        std::lock_guard<std::mutex> lk(mut);
        if(data_queue.empty())
            return false;
        value = std::move(data_queue.front());
        data_queue.pop();
        return true;
    }

    std::shared_ptr<T> try_pop()
    {
        std::lock_guard<std::mutex> lk(mut);
        if(data_queue.empty())
            return std::shared_ptr<T>();
        std::shared_ptr<T> res(
            std::make_shared<T>(std::move(data_queue.front())));
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

清单 6.2 中的队列结构与清单 6.1 中的栈非常相似，主要的差别在于 `push()` 中增加了对 `data_cond.notify_one()` 的调用，以及新增了阻塞等待的 `wait_and_pop()` 系列函数。

`try_pop()` 的两个重载与栈中的 `pop()` 函数几乎一致，只是在队列为空时不抛出异常，而是分别返回 `bool` 标志表示是否成功提取，或者在返回指针的版本中返回空指针（`nullptr`）。

`wait_and_pop()` 解决了消费者线程高效等待数据到来的问题：消费者不再需要轮询，而是调用 `wait_and_pop()`，底层条件变量会在队列为空时安全地释放互斥锁并将线程挂起，直到有新元素被 `push()` 压入并唤醒它。当 `data_cond.wait()` 返回时，互斥锁已被重新获取且断言谓词（`!data_queue.empty()`）必然为真，因此不存在空队列读取的问题。

**异常安全性上的微小隐患**：
这里存在一个需要细致考虑的异常安全性细节：当新元素入队时，`data_cond.notify_one()` 只会唤醒一个处于等待中的线程。然而，如果该被唤醒的线程在 `wait_and_pop()` 内部构造 `std::shared_ptr<T>` 时抛出了异常（如内存不足），由于该线程未能成功提取元素就异常退出了，且没有其他等待线程被唤醒，可能导致队列中虽有数据但其余等待线程仍在沉睡。

解决这一问题有几种方案：
1. 将 `notify_one()` 替换为 `notify_all()`，唤醒所有等待线程；但代价是多余线程惊醒后发现队列又空了（惊群效应），不得不再次进入睡眠。
2. 在 `wait_and_pop()` 中捕获异常，并在抛出前再次调用 `notify_one()`，以便让其他等待线程有机会提取数据。
3. **将 `std::shared_ptr<T>` 的分配转移到 `push()` 阶段**，让底层队列内部直接保存 `std::shared_ptr<T>` 实例。

方案 3 尤为出色：从底层的 `std::queue<std::shared_ptr<T>>` 中拷贝/移动智能指针本身绝不会抛出异常，因此 `wait_and_pop()` 就彻底恢复了不抛异常的安全性。此外，由于内存分配移到了 `push()` 中，分配操作甚至可以在**获取互斥锁之前**完成，从而缩短了锁的持有时间！

清单 6.3 展示了针对这一点进行了重构优化的队列实现。

**清单 6.3 内部存储 `std::shared_ptr<>` 实例的线程安全队列**

```cpp
#include <memory>
#include <mutex>
#include <condition_variable>
#include <queue>

template<typename T>
class threadsafe_queue
{
private:
    mutable std::mutex mut;
    std::queue<std::shared_ptr<T>> data_queue;
    std::condition_variable data_cond;

public:
    threadsafe_queue() {}

    void wait_and_pop(T& value)
    {
        std::unique_lock<std::mutex> lk(mut);
        data_cond.wait(lk, [this]{ return !data_queue.empty(); });
        value = std::move(*data_queue.front());
        data_queue.pop();
    }

    bool try_pop(T& value)
    {
        std::lock_guard<std::mutex> lk(mut);
        if(data_queue.empty())
            return false;
        value = std::move(*data_queue.front());
        data_queue.pop();
        return true;
    }

    std::shared_ptr<T> wait_and_pop()
    {
        std::unique_lock<std::mutex> lk(mut);
        data_cond.wait(lk, [this]{ return !data_queue.empty(); });
        std::shared_ptr<T> res = data_queue.front();
        data_queue.pop();
        return res;
    }

    std::shared_ptr<T> try_pop()
    {
        std::lock_guard<std::mutex> lk(mut);
        if(data_queue.empty())
            return std::shared_ptr<T>();
        std::shared_ptr<T> res = data_queue.front();
        data_queue.pop();
        return res;
    }

    void push(T new_value)
    {
        // 关键性能优化：在获取互斥锁之外分配内存！
        std::shared_ptr<T> data(
            std::make_shared<T>(std::move(new_value)));
        std::lock_guard<std::mutex> lk(mut);
        data_queue.push(data);
        data_cond.notify_one();
    }

    bool empty() const
    {
        std::lock_guard<std::mutex> lk(mut);
        return data_queue.empty();
    }
};
```

通过存储 `std::shared_ptr<T>`，我们获得了一个极具价值的收益：**新对象的内存分配可以在 `push()` 中的加锁范围外完成**。内存分配（`make_shared`）通常是相对昂贵的操作，将其移出临界区大幅减少了互斥锁的持有时间，让其他线程能够更快获取互斥锁并访问队列。

然而，正如在栈的示例中一样，使用单一互斥量保护整个数据结构依然从根本上制约了并发度：虽然可能有多个线程在队列的不同方法上等待或操作，但某一瞬间只有一个线程可以真正进入临界区执行。这一限制的部分原因在于我们使用了标准容器 `std::queue<>`——标准容器作为一个黑盒整体，要么被完全保护，要么不被保护。如果我们接管数据结构的底层具体实现，就能够引入**细粒度锁（fine-grained locking）**，从而实现更高级别的并发度。

---

### 6.2.3 使用细粒度锁和条件变量的线程安全队列

在清单 6.2 和 6.3 中，我们只有一个受保护的数据项（`data_queue`），因此只需要一个互斥量。为了实现更细粒度的加锁，我们需要审视队列内部的构成部件，并为每个独立的数据部件分配单独的互斥量。

队列最简单的数据结构是**单向链表**。队列维护一个 `head` 指针指向链表首节点（从中提取数据），以及一个 `tail` 指针指向链表尾节点（向其后追加数据）。从队列中弹出元素时，将 `head` 指针推进到下一个节点，并返回旧 `head` 中的数据；向队列压入元素时，将最后一个节点的 `next` 指向新节点，并更新 `tail` 指针。当队列为空时，`head` 与 `tail` 均为 `nullptr`。

清单 6.4 展示了一个精简的单线程单链表队列实现。

**清单 6.4 简单的单线程单链表队列实现**

```cpp
#include <memory>

template<typename T>
class queue
{
private:
    struct node
    {
        T data;
        std::unique_ptr<node> next;

        node(T data_):
            data(std::move(data_))
        {}
    };

    std::unique_ptr<node> head;
    node* tail;

public:
    queue(): tail(nullptr) {}

    queue(const queue& other) = delete;
    queue& operator=(const queue& other) = delete;

    std::shared_ptr<T> try_pop()
    {
        if(!head)
        {
            return std::shared_ptr<T>();
        }
        std::shared_ptr<T> const res(
            std::make_shared<T>(std::move(head->data)));
        std::unique_ptr<node> const old_head = std::move(head);
        head = std::move(old_head->next);
        if(!head)
            tail = nullptr;
        return res;
    }

    void push(T new_value)
    {
        std::unique_ptr<node> p(new node(std::move(new_value)));
        node* const new_tail = p.get();
        if(tail)
        {
            tail->next = std::move(p);
        }
        else
        {
            head = std::move(p);
        }
        tail = new_tail;
    }
};
```

清单 6.4 使用 `std::unique_ptr<node>` 来管理节点的所有权链，这确保了不再需要的节点及其数据会被自动释放，无需手动 `delete`。

在单线程环境下该代码表现良好，但若想在多线程环境下为其应用细粒度锁，就会遇到严重障碍。直观上看，这里有两个数据项：`head` 和 `tail`。我们理论上可以用一个互斥量保护 `head`，另一个互斥量保护 `tail`。然而：

1. **`push()` 会同时修改 `head` 和 `tail`**：当队列原本为空时，`push()` 既要更新 `tail` 又要设置 `head`，必须同时获取两个锁。
2. **核心冲突在于节点的 `next` 指针**：`push()` 需要更新 `tail->next`，而 `try_pop()` 需要读取 `head->next`。如果队列中**仅有一个元素**，则 `head == tail`，此时 `head->next` 和 `tail->next` 指向的是**同一个对象的同一个成员**！
3. 在没有读取 `head` 和 `tail` 之前，你根本无法预知它们是否指向同一个节点；为了安全，`push()` 和 `try_pop()` 必须同时对同一把锁加锁，这就让细粒度拆分互斥锁的设想彻底落空。

#### 通过分离数据引入虚节点（Dummy Node）打破瓶颈

解决这一难题的标准方案是：**预先分配一个不存储实际数据的虚拟哨兵节点（dummy node）**。这样无论任何时刻，队列中都至少存在一个节点，从而将头部正在访问的节点与尾部正在访问的节点在物理上隔离开来！

- 对于空队列，`head` 和 `tail` 同时指向这个虚节点，而非 `nullptr`。
- `try_pop()` 在队列为空时（`head.get() == tail`）根本不会访问 `head->next`。
- 当向队列压入真实元素时，`head` 与 `tail` 会指向不同的节点。因此，对 `head->next` 的读取与对 `tail->next` 的写入绝不会产生数据竞争！

其代价在于：为了支持不含数据的虚节点，节点内部需要以指针（智能指针）的形式存储数据。清单 6.5 展示了引入虚节点后的单线程队列改造。

**清单 6.5 包含虚节点的简单队列**

```cpp
#include <memory>

template<typename T>
class queue
{
private:
    struct node
    {
        std::shared_ptr<T> data;
        std::unique_ptr<node> next;
    };

    std::unique_ptr<node> head;
    node* tail;

public:
    queue():
        head(new node), tail(head.get()) // 初始包含一个虚节点
    {}

    queue(const queue& other) = delete;
    queue& operator=(const queue& other) = delete;

    std::shared_ptr<T> try_pop()
    {
        if(head.get() == tail) // 空队列判定：head 与 tail 指向同一虚节点
        {
            return std::shared_ptr<T>();
        }
        std::shared_ptr<T> const res(head->data);
        std::unique_ptr<node> old_head = std::move(head);
        head = std::move(old_head->next);
        return res;
    }

    void push(T new_value)
    {
        std::shared_ptr<T> new_data(
            std::make_shared<T>(std::move(new_value)));
        std::unique_ptr<node> p(new node); // 新的虚节点
        tail->data = new_data;             // 将数据存入旧的虚节点
        node* const new_tail = p.get();
        tail->next = std::move(p);
        tail = new_tail;                   // tail 转移到新的虚节点
    }
};
```

这一改造带来的收益是巨大的：
- `push()` 现在**仅仅访问 `tail`**，完全不再触碰 `head`！
- `try_pop()` 同时访问 `head` 和 `tail`，但对 `tail` 的访问仅仅是为了在最开始进行一次比较（`head.get() == tail`），锁的持有极其短暂。
- 虚节点的存在保证了 `try_pop()` 与 `push()` **永远不会在同一个节点上发生操作冲突**！因此，我们完全可以为 `head` 和 `tail` 分别配备一把独立的互斥量。

#### 放置细粒度锁

我们希望尽可能缩短加锁时间以释放最大的并发潜力：
- 对于 `push()`：互斥量只需在访问 `tail` 时加锁。新节点的分配和数据的创建都在加锁之前完成，加锁后仅执行几条指针赋值即可释放锁。
- 对于 `try_pop()`：首先需要获取 `head_mutex` 来决定哪个线程执行弹出；一旦 `head` 指针更新完成，就可以提前释放 `head_mutex`，随后在没有锁保护的情况下返回数据或销毁节点。而在比较 `head.get() == tail` 时，只需极其短暂地获取 `tail_mutex` 读取 `tail` 的值。

清单 6.6 展示了实现了细粒度锁的线程安全队列。

**清单 6.6 采用细粒度锁的线程安全队列**

```cpp
#include <memory>
#include <mutex>

template<typename T>
class threadsafe_queue
{
private:
    struct node
    {
        std::shared_ptr<T> data;
        std::unique_ptr<node> next;
    };

    std::mutex head_mutex;
    std::unique_ptr<node> head;
    std::mutex tail_mutex;
    node* tail;

    node* get_tail()
    {
        std::lock_guard<std::mutex> tail_lock(tail_mutex);
        return tail;
    }

    std::unique_ptr<node> pop_head()
    {
        std::lock_guard<std::mutex> head_lock(head_mutex);
        if(head.get() == get_tail())
        {
            return nullptr;
        }
        std::unique_ptr<node> old_head = std::move(head);
        head = std::move(old_head->next);
        return old_head;
    }

public:
    threadsafe_queue():
        head(new node), tail(head.get())
    {}

    threadsafe_queue(const threadsafe_queue& other) = delete;
    threadsafe_queue& operator=(const threadsafe_queue& other) = delete;

    std::shared_ptr<T> try_pop()
    {
        std::unique_ptr<node> old_head = pop_head();
        return old_head ? old_head->data : std::shared_ptr<T>();
    }

    void push(T new_value)
    {
        std::shared_ptr<T> new_data(
            std::make_shared<T>(std::move(new_value)));
        std::unique_ptr<node> p(new node);
        node* const new_tail = p.get();
        {
            std::lock_guard<std::mutex> tail_lock(tail_mutex);
            tail->data = new_data;
            tail->next = std::move(p);
            tail = new_tail;
        }
    }
};
```

让我们以审视的目光，对照 6.1.1 节的指导原则评估清单 6.6：

首先确认数据结构的不变量：
- `tail->next == nullptr`。
- `tail->data == nullptr`。
- `head.get() == tail` 当且仅当队列为空。
- 单元素队列满足 `head->next.get() == tail`。
- 链表中除 `tail` 外的每个节点 `x`，`x->data` 指向一个 `T` 实例，`x->next` 指向下一个节点；若 `x->next.get() == tail` 则 `x` 为最后一个有效节点。
- 从 `head` 出发沿着 `next` 指针遍历最终必能抵达 `tail`。

在加锁次序上有一个**极其重要的设计细节**：
在 `pop_head()` 中，调用 `get_tail()` **必须处于 `head_mutex` 的锁保护范围之内**！
考虑以下反例（如果在锁外获取 tail）：
```cpp
// 错误的实现方式！
std::unique_ptr<node> pop_head()
{
    node* const old_tail = get_tail(); // 在 head_mutex 范围外获取 tail
    std::lock_guard<std::mutex> head_lock(head_mutex);
    if(head.get() == old_tail)
    {
        return nullptr;
    }
    std::unique_ptr<node> old_head = std::move(head);
    head = std::move(old_head->next);
    return old_head;
}
```
如果在锁外获取 `old_tail`，在当前线程获取 `head_mutex` 之前，其他并发的 `try_pop()` 线程可能已经执行了弹出，导致 `head` 推进到了甚至超越了该 `old_tail` 的位置！此时 `head.get() == old_tail` 的比较可能错误地判断为不等，导致 `head` 被推进到链表之外，彻底破坏整个数据结构。
而在清单 6.6 的正确实现中，`get_tail()` 在持有 `head_mutex` 时调用，确保了其他线程无法改变 `head`，而并发的 `push()` 只会让 `tail` 向更远处移动，因此 `head` 绝不可能逾越 `get_tail()` 返回的地址，不变量得以完美保持。

**死锁与并发度分析**：
- 在加锁顺序上，只有 `pop_head()` 会同时持有两个互斥量：总是先获取 `head_mutex`，随后在 `get_tail()` 中短暂获取 `tail_mutex` 并立即释放，绝不会发生逆序死锁。
- 并发度得到质的飞跃：`push()` 中节点的创建与数据的堆内存分配均在锁外完成；`try_pop()` 销毁旧节点和析构数据同样在锁外执行；`push()` 与 `try_pop()` 可以完全并发运行，互不阻碍！

---

#### 扩展：支持阻塞等待的细粒度队列

清单 6.6 提供了支持细粒度锁的高性能队列，但它目前仅支持非阻塞的 `try_pop()`。我们能否将第 4 章中实用的 `wait_and_pop()` 也融入这个细粒度锁队列中？

答案是肯定的。改造思路如下：
1. 在 `push()` 中，在更新完 `tail` 并释放 `tail_mutex` 后调用 `data_cond.notify_one()`。注意：在释放锁之后再通知条件变量，可以避免被唤醒的线程立刻因为争抢 `tail_mutex` 而再次阻塞。
2. 在 `wait_and_pop()` 中，等待谓词为 `head.get() != get_tail()`。由于此处的谓词检查需要持有 `head_mutex`，我们使用传入 `head_mutex` 的 `std::unique_lock<std::mutex>` 进行等待。
3. 对于带有引用传参 `wait_and_pop(T& value)` 的重载版本，为了保证异常安全（防止在传参赋值给 `value` 发生异常时丢失已弹出的节点），必须在节点被正式从链表剥离之前完成赋值。

清单 6.7、6.8、6.9、6.10 给出了完整的生产级细粒度加锁并发队列实现。

**清单 6.7 具有加锁与等待机制的线程安全队列：内部构件与接口定义**

```cpp
#include <memory>
#include <mutex>
#include <condition_variable>

template<typename T>
class threadsafe_queue
{
private:
    struct node
    {
        std::shared_ptr<T> data;
        std::unique_ptr<node> next;
    };

    std::mutex head_mutex;
    std::unique_ptr<node> head;
    std::mutex tail_mutex;
    node* tail;
    std::condition_variable data_cond;

    node* get_tail();
    std::unique_ptr<node> pop_head();
    std::unique_lock<std::mutex> wait_for_data();
    std::unique_ptr<node> wait_pop_head();
    std::unique_ptr<node> wait_pop_head(T& value);
    std::unique_ptr<node> try_pop_head();
    std::unique_ptr<node> try_pop_head(T& value);

public:
    threadsafe_queue():
        head(new node), tail(head.get())
    {}

    threadsafe_queue(const threadsafe_queue& other) = delete;
    threadsafe_queue& operator=(const threadsafe_queue& other) = delete;

    std::shared_ptr<T> try_pop();
    bool try_pop(T& value);
    std::shared_ptr<T> wait_and_pop();
    void wait_and_pop(T& value);
    void push(T new_value);
    bool empty();
};
```

**清单 6.8 具有加锁与等待机制的线程安全队列：入队操作 push()**

```cpp
template<typename T>
void threadsafe_queue<T>::push(T new_value)
{
    std::shared_ptr<T> new_data(
        std::make_shared<T>(std::move(new_value)));
    std::unique_ptr<node> p(new node);
    {
        std::lock_guard<std::mutex> tail_lock(tail_mutex);
        tail->data = new_data;
        node* const new_tail = p.get();
        tail->next = std::move(p);
        tail = new_tail;
    }
    // 解锁后通知等待线程，提升响应效率
    data_cond.notify_one();
}
```

**清单 6.9 具有加锁与等待机制的线程安全队列：wait_and_pop() 及其辅助函数**

```cpp
template<typename T>
node* threadsafe_queue<T>::get_tail()
{
    std::lock_guard<std::mutex> tail_lock(tail_mutex);
    return tail;
}

template<typename T>
std::unique_ptr<typename threadsafe_queue<T>::node>
threadsafe_queue<T>::pop_head()
{
    std::unique_ptr<node> old_head = std::move(head);
    head = std::move(old_head->next);
    return old_head;
}

template<typename T>
std::unique_lock<std::mutex> threadsafe_queue<T>::wait_for_data()
{
    std::unique_lock<std::mutex> head_lock(head_mutex);
    data_cond.wait(head_lock, [&]{ return head.get() != get_tail(); });
    return std::move(head_lock); // 将已锁定的锁转移给调用者
}

template<typename T>
std::unique_ptr<typename threadsafe_queue<T>::node>
threadsafe_queue<T>::wait_pop_head()
{
    std::unique_lock<std::mutex> head_lock(wait_for_data());
    return pop_head();
}

template<typename T>
std::unique_ptr<typename threadsafe_queue<T>::node>
threadsafe_queue<T>::wait_pop_head(T& value)
{
    std::unique_lock<std::mutex> head_lock(wait_for_data());
    value = std::move(*head->data); // 在弹出前赋值，保证异常安全
    return pop_head();
}

template<typename T>
std::shared_ptr<T> threadsafe_queue<T>::wait_and_pop()
{
    std::unique_ptr<node> const old_head = wait_pop_head();
    return old_head->data;
}

template<typename T>
void threadsafe_queue<T>::wait_and_pop(T& value)
{
    std::unique_ptr<node> const old_head = wait_pop_head(value);
}
```

**清单 6.10 具有加锁与等待机制的线程安全队列：try_pop() 与 empty()**

```cpp
template<typename T>
std::unique_ptr<typename threadsafe_queue<T>::node>
threadsafe_queue<T>::try_pop_head()
{
    std::lock_guard<std::mutex> head_lock(head_mutex);
    if(head.get() == get_tail())
    {
        return std::unique_ptr<node>();
    }
    return pop_head();
}

template<typename T>
std::unique_ptr<typename threadsafe_queue<T>::node>
threadsafe_queue<T>::try_pop_head(T& value)
{
    std::lock_guard<std::mutex> head_lock(head_mutex);
    if(head.get() == get_tail())
    {
        return std::unique_ptr<node>();
    }
    value = std::move(*head->data); // 在弹出前赋值，防止数据丢失
    return pop_head();
}

template<typename T>
std::shared_ptr<T> threadsafe_queue<T>::try_pop()
{
    std::unique_ptr<node> old_head = try_pop_head();
    return old_head ? old_head->data : std::shared_ptr<T>();
}

template<typename T>
bool threadsafe_queue<T>::try_pop(T& value)
{
    std::unique_ptr<node> const old_head = try_pop_head(value);
    return old_head != nullptr;
}

template<typename T>
bool threadsafe_queue<T>::empty()
{
    std::lock_guard<std::mutex> head_lock(head_mutex);
    return (head.get() == get_tail());
}
```

该队列实现将作为第 7 章中无锁队列的理论与结构基石。

> **有界队列（Bounded Queues）延伸探讨**
> 这里实现的是无界队列（unbounded queue），只要系统内存充足，即便没有消费者消费，生产者也可以持续入队。另一种常见模式是**有界队列**，其最大容量在创建时固定。当有界队列满载时，后续的 `push()` 会阻塞挂起或直接失败返回，直到消费者提取元素腾出空位。有界队列在任务分配（线程池、工作窃取）中非常有用，它能够有效防止生产端过载压垮消费端。基于上述架构，只需在 `push()` 中增加针对队列最大容量的条件变量等待即可轻松扩展。

---

## 6.3 设计更复杂的基于锁的数据结构

栈和队列的接口非常专一且受限。然而，多数实际工程数据结构支持更丰富的操作组合。虽然这从原理上为并发提供了更大的施展空间，但由于必须兼顾多种错综复杂的访问模式，保护共享数据的任务也变得更为严苛。

为了剖析其中的设计权衡，我们接下来探讨**查找表（Lookup Table）**的设计。

### 6.3.1 使用锁编写线程安全查找表

查找表（字典 / 映射表）将一种类型的值（键，Key）与相同或另一种类型的值（映射值，Value）关联起来。在 C++ 标准库中，这一功能由关联容器提供：`std::map<>`、`std::multimap<>`、`std::unordered_map<>` 和 `std::unordered_multimap<>`。

查找表的访问模式与栈或队列截然不同。栈和队列的几乎每一次调用都会修改容器本身（添加或移除元素），而查找表的使用模式往往是**大量高频读取，偶发修改**。

#### 接口并发设计的权衡
标准容器（如 `std::map<>`）的接口以**迭代器（iterator）**为核心。但在并发环境下，暴露迭代器极其危险：
- 如果一个线程持有迭代器，而另一个并发线程删除了迭代器所指向的元素，该迭代器就会悬空引发未定义行为。
- 为了让迭代器安全有效，迭代器自身必须持有容器某部分的锁，而 STL 风格迭代器的生命周期完全脱离了容器的控制，极易引发死锁或资源长期锁定。

因此，并发查找表必须**舍弃传统的迭代器接口**，从底层重新设计一组粗粒度的原子操作接口：
- 添加新的键/值对；
- 修改指定键关联的值；
- 移除指定键及其关联值；
- 查询指定键关联的值（若存在）；
- 全局快照操作（如导出全部键值对、判空等）。

对于“查询键对应的值”，若键不存在，可以允许用户传入一个默认值返回，或返回 `std::pair<Value, bool>`，亦或返回 `std::shared_ptr<Value>`（若不存在则返回 `nullptr`）。

#### 细粒度加锁的底层数据结构选型
实现关联容器通常有三种经典数据结构：
1. **二叉搜索树（如红黑树）**：并发拓展性较差。任何查找或修改都必须从根节点开始遍历，根节点必然成为并发热点锁瓶颈。虽然可以采用逐层释放锁的“锁耦合（hand-over-hand locking）”技术，但并发提升依然有限。
2. **有序数组**：更不适合并发，因为插入和删除会导致大量元素移动，几乎必须对整个数组加单一大锁。
3. **哈希表（Hash Table）**：**并发设计的绝佳选择！** 在桶数组大小固定的哈希表中，一个键归属于哪一个桶完全由其哈希值决定。这意味着**每个桶（bucket）可以拥有自己独立的互斥锁**！

如果每个桶都配备一把 `std::shared_mutex`（读写锁），那么：
- 针对不同桶的操作可以完全并行；
- 针对同一个桶的操作，多个只读查询可以并发执行；
- 系统的理论并发能力随桶数量 $N$ 呈线性放大！

清单 6.11 展示了这种基于分桶细粒度读写锁的线程安全查找表实现。

**清单 6.11 线程安全查找表实现**

```cpp
#include <vector>
#include <memory>
#include <mutex>
#include <shared_mutex>
#include <list>
#include <utility>
#include <algorithm>

template<typename Key, typename Value, typename Hash = std::hash<Key>>
class threadsafe_lookup_table
{
private:
    class bucket_type
    {
    private:
        typedef std::pair<Key, Value> bucket_value;
        typedef std::list<bucket_value> bucket_data;
        typedef typename bucket_data::iterator bucket_iterator;

        bucket_data data;
        mutable std::shared_mutex mutex; // 每个桶独立的读写互斥锁

        bucket_iterator find_entry_for(Key const& key)
        {
            return std::find_if(data.begin(), data.end(),
                [&](bucket_value const& item)
                { return item.first == key; });
        }

    public:
        Value value_for(Key const& key, Value const& default_value) const
        {
            std::shared_lock<std::shared_mutex> lock(mutex); // 共享只读锁
            auto it = std::find_if(data.begin(), data.end(),
                [&](bucket_value const& item)
                { return item.first == key; });
            return (it == data.end()) ? default_value : it->second;
        }

        void add_or_update_mapping(Key const& key, Value const& value)
        {
            std::unique_lock<std::shared_mutex> lock(mutex); // 独占写入锁
            bucket_iterator const found_entry = find_entry_for(key);
            if(found_entry == data.end())
            {
                data.push_back(bucket_value(key, value));
            }
            else
            {
                found_entry->second = value;
            }
        }

        void remove_mapping(Key const& key)
        {
            std::unique_lock<std::shared_mutex> lock(mutex); // 独占写入锁
            bucket_iterator const found_entry = find_entry_for(key);
            if(found_entry != data.end())
            {
                data.erase(found_entry);
            }
        }
    };

    std::vector<std::unique_ptr<bucket_type>> buckets;
    Hash hasher;

    bucket_type& get_bucket(Key const& key) const
    {
        std::size_t const bucket_index = hasher(key) % buckets.size();
        return *buckets[bucket_index];
    }

public:
    typedef Key key_type;
    typedef Value mapped_type;
    typedef Hash hash_type;

    threadsafe_lookup_table(
        unsigned num_buckets = 19, Hash const& hasher_ = Hash()):
        buckets(num_buckets), hasher(hasher_)
    {
        for(unsigned i = 0; i < num_buckets; ++i)
        {
            buckets[i].reset(new bucket_type);
        }
    }

    threadsafe_lookup_table(threadsafe_lookup_table const& other) = delete;
    threadsafe_lookup_table& operator=(threadsafe_lookup_table const& other) = delete;

    Value value_for(Key const& key, Value const& default_value = Value()) const
    {
        return get_bucket(key).value_for(key, default_value);
    }

    void add_or_update_mapping(Key const& key, Value const& value)
    {
        get_bucket(key).add_or_update_mapping(key, value);
    }

    void remove_mapping(Key const& key)
    {
        get_bucket(key).remove_mapping(key);
    }
};
```

**设计精妙之处**：
- 桶数组的大小在构造时确定（默认为质数 19，哈希分布均匀），之后大小保持固定。因此，`get_bucket()` 计算桶索引并获取桶引用的过程**完全不需要任何锁**！
- 获得桶引用后，所有的并发控制均下沉到各个独立的 `bucket_type` 内部：读取操作通过 `std::shared_lock` 并发进行，增删修改操作通过 `std::unique_lock` 独占进行。不同的桶之间互不影响，实现了真正的高并发。

#### 获取全表一致性快照
如果我们需要获取整个哈希表在某一瞬间的完整快照（例如导出为 `std::map<>`），就必须**一次性锁定所有的桶**。

为了绝对避免死锁，必须严格遵循防死锁准则：**所有线程在获取多个互斥锁时必须遵循完全相同的加锁次序**（例如按桶索引升序依次加锁）。清单 6.12 展示了这一快照功能的实现。

**清单 6.12 获取 `threadsafe_lookup_table` 的 `std::map<>` 快照**

```cpp
#include <map>

template<typename Key, typename Value, typename Hash>
std::map<Key, Value> threadsafe_lookup_table<Key, Value, Hash>::get_map() const
{
    // 按固定升序索引依次锁定所有桶的互斥锁
    std::vector<std::unique_lock<std::shared_mutex>> locks;
    locks.reserve(buckets.size());
    for(unsigned i = 0; i < buckets.size(); ++i)
    {
        locks.push_back(
            std::unique_lock<std::shared_mutex>(buckets[i]->mutex));
    }

    std::map<Key, Value> res;
    for(unsigned i = 0; i < buckets.size(); ++i)
    {
        for(auto it = buckets[i]->data.begin(); it != buckets[i]->data.end(); ++it)
        {
            res.insert(*it);
        }
    }
    return res;
}
```

---

### 6.3.2 使用锁编写线程安全链表

在清单 6.11 中，每个桶内部使用的是标准的 `std::list<>`，并用一把互斥锁保护整个桶。那么，我们能否进一步压榨并发度——在链表内部实现**基于节点的细粒度锁（锁耦合 / Hand-over-hand Locking）**？

#### 迭代器与闭包函数支持
正如前文所分析的，暴露原生 STL 迭代器会带来极其复杂的并发安全与生命周期管理问题。替代方案是由容器自身提供迭代操作高阶函数（如 `for_each`、`find_first_if`、`remove_if`），将用户定义的操作逻辑（lambda 闭包）作为参数传入。

由容器完全掌控遍历与加锁过程，虽然要求用户提供的函数对象不得在内部引发死锁或非法逃逸数据引用，但它将并发安全性牢牢置于容器的严密保护之下。

#### 锁耦合（Hand-over-hand Locking）原理
在链表遍历过程中，如果自始至终锁住整个链表，并发度依然受限。**锁耦合技术**的核心在于：
1. 先锁定当前节点；
2. 在释放当前节点的锁**之前**，先获取下一个节点的锁；
3. 获取到下一个节点的锁后，立即释放当前节点的锁；
4. 犹如攀岩运动员在双手交替抓握岩石，前手抓稳之前绝不松开后手。

这种设计使得多个线程可以像流水线一样沿着链表依次向后遍历，操作链表不同部分的线程可以真正并行执行！

清单 6.13 展示了支持迭代功能的线程安全链表完整实现。

**清单 6.13 支持迭代操作的线程安全链表**

```cpp
#include <memory>
#include <mutex>
#include <utility>

template<typename T>
class threadsafe_list
{
    struct node
    {
        std::mutex m;
        std::shared_ptr<T> data;
        std::unique_ptr<node> next;

        node():
            next()
        {}

        node(T const& value):
            data(std::make_shared<T>(value))
        {}
    };

    node head; // 链表头哨兵节点

public:
    threadsafe_list() {}

    ~threadsafe_list()
    {
        remove_if([](node const&){ return true; });
    }

    threadsafe_list(threadsafe_list const& other) = delete;
    threadsafe_list& operator=(threadsafe_list const& other) = delete;

    void push_front(T const& value)
    {
        std::unique_ptr<node> new_node(new node(value));
        std::lock_guard<std::mutex> lk(head.m);
        new_node->next = std::move(head.next);
        head.next = std::move(new_node);
    }

    template<typename Function>
    void for_each(Function f)
    {
        node* current = &head;
        std::unique_lock<std::mutex> lk(head.m);
        while(node* const next = current->next.get())
        {
            std::unique_lock<std::mutex> next_lk(next->m); // 锁定下一个节点
            lk.unlock();                                   // 释放当前节点的锁（锁耦合）
            f(*next->data);
            current = next;
            lk = std::move(next_lk);                       // 转移锁的所有权继续循环
        }
    }

    template<typename Predicate>
    std::shared_ptr<T> find_first_if(Predicate p)
    {
        node* current = &head;
        std::unique_lock<std::mutex> lk(head.m);
        while(node* const next = current->next.get())
        {
            std::unique_lock<std::mutex> next_lk(next->m);
            lk.unlock();
            if(p(*next->data))
            {
                return next->data; // 匹配成功立即返回
            }
            current = next;
            lk = std::move(next_lk);
        }
        return std::shared_ptr<T>();
    }

    template<typename Predicate>
    void remove_if(Predicate p)
    {
        node* current = &head;
        std::unique_lock<std::mutex> lk(head.m);
        while(node* const next = current->next.get())
        {
            std::unique_lock<std::mutex> next_lk(next->m);
            if(p(*next->data))
            {
                std::unique_ptr<node> old_next = std::move(current->next);
                current->next = std::move(next->next); // 将待删除节点从链表剥离
                next_lk.unlock();                      // 析构前解锁
                // old_next 在离开 if 作用域时自动安全销毁
            }
            else
            {
                lk.unlock();
                current = next;
                lk = std::move(next_lk);
            }
        }
    }
};
```

**安全性与并发度综合分析**：
- **无死锁保证**：遍历方向永远是严格单向的（从头节点向后遍历），并且总是严格按照先获取下一个节点锁、再释放当前节点锁的顺序行进。系统中所有线程遵循完全一致的加锁顺序，彻底杜绝了环形等待死锁。
- **删除节点的安全性**：在 `remove_if()` 中，节点在析构销毁前必须先解锁 `next_lk.unlock()`（销毁一个处于锁定状态的 `std::mutex` 是未定义行为）。而此时，前驱节点 `current` 的互斥锁仍被当前线程持有，其他遍历线程无法逾越 `current`，因此绝不会有其他线程尝试加锁正在被删除的节点，保证了完全的内存与线程安全。
- **并发表现**：多个线程可以同时在链表的不同区域并行执行 `for_each`、`find_first_if` 或 `remove_if`。但需要注意，由于锁耦合机制要求按序交替获取节点锁，线程之间无法相互“超车”；如果某一线程在处理某个节点耗费了大量时间，后续线程到达该节点时仍需排队等待。

---

## 本章小结

- 并发数据结构设计的核心在于**保证线程安全（维护不变量、消除接口级竞态、防范异常泄露）**与**最大化真正的并发访问机会**。
- 受互斥锁保护的代码区域越小，串行化的开销就越低，系统的可扩展性与吞吐量就越高。
- 将耗时操作（如对象的堆内存分配 `make_shared`、节点销毁）移到互斥锁外部执行，是优化并发数据结构性能的通用黄金法则。
- 通过引入**虚节点（Dummy Node）**，可以成功解耦单链表队列头部与尾部的操作冲突，从而实现头尾分离的双互斥量细粒度加锁。
- 对于复杂的关联容器，采用**哈希表分桶独立加锁**结合 `std::shared_mutex` 读写锁，能够成倍提升并发读取与修改的吞吐能力。
- 对于链表遍历，**锁耦合（Hand-over-hand Locking）**技术允许多个线程如流水线般并发处理链表的不同节点，且严格遵循单向加锁顺序杜绝死锁。

在第 7 章中，我们将迈入并发编程的最高殿堂——**无锁（Lock-Free）并发数据结构设计**，深入探索如何彻底抛弃互斥量，完全依靠底层原子操作与精细内存模型构建高吞吐数据结构。
