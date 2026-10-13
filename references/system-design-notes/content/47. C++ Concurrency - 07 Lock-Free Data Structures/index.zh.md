---
id: cpp-concurrency-07-lock-free-data-structures
title: "第 7 章：无锁并发数据结构设计"
titleEn: "Chapter 7: Designing lock-free concurrent data structures"
order: 47
category: specialized
description: "无锁定义与分类、ABA 问题、内存回收技术（风险指针、引用计数）及无锁栈与队列的设计实现。"
tags: ["C++", "无锁编程", "ABA 问题", "风险指针", "CAS", "引用计数"]
---

# 第 7 章：无锁并发数据结构设计

本章主要涵盖：

- 不使用互斥锁而针对并发访问设计的数据结构实现
- 无锁数据结构中的内存安全回收与管理技术
- 编写无锁数据结构的实用指导准则

在上一章中，我们探讨了设计并发数据结构的一般性原则，以及保证线程安全的各项设计指导准则。随后，我们考察了几种经典数据结构，并深入分析了使用互斥量和锁保护共享数据的具体实现方案。在前几个示例中，我们使用单一互斥量保护整个数据结构；而在后续示例中，我们引入了多个互斥量来保护数据结构的不同子构件，从而大幅提高了并发访问的吞吐度。

互斥量（mutex）是一种极其强大的同步原语，能够确保多个线程在安全访问数据结构的同时避免数据竞争或破坏不变量。此外，基于互斥锁的代码行为相对容易推理：线程要么成功获得了保护数据的互斥锁，要么没有。

然而，基于锁的设计并非万事大吉：在第 3 章中你已经看到，对锁的使用不当可能导致**死锁（deadlock）**；而在基于细粒度锁的队列和查找表设计中，加锁的粒度也会直接制约真正的并发潜力。如果能够编写出**完全不使用锁**而依然保证并发安全的数据结构，就有机会彻底消除死锁问题并最大化并发吞吐。这种数据结构被称为**无锁数据结构（lock-free data structure）**。

在本章中，我们将深入探讨如何利用第 5 章中介绍的原子操作及其内存顺序（memory ordering）保证，来构建健壮的无锁数据结构。理解本章内容的前提是彻底掌握第 5 章的内容。设计无锁数据结构极为困难，不仅要保证逻辑严密，而且导致设计失败的边缘条件往往极其罕见。我们将首先明确无锁数据结构的确切定义与分类；随后探讨使用无锁结构的动机与权衡；接着逐步推导并实现经典数据结构；最后总结出编写无锁数据结构的一般准则。

---

## 7.1 定义与影响

使用互斥量、条件变量和期值（future）来同步数据的数据结构和算法被称为**阻塞（blocking）数据结构与算法**。应用程序调用库函数挂起当前线程的执行，直到另一个线程执行了特定动作。这些库调用被称为**阻塞调用（blocking calls）**，因为在阻塞条件解除之前，线程无法继续执行。通常，操作系统会将阻塞的线程完全挂起（将其 CPU 时间片调度给其他就绪线程），直到另一个线程通过解锁互斥量、通知条件变量或使期值就绪等操作将其唤醒。

不使用阻塞库函数的数据结构和算法被称为**非阻塞（nonblocking）**结构。然而，并非所有非阻塞数据结构都是“无锁”的。接下来让我们详细了解非阻塞数据结构的各类层次划分。

### 7.1.1 非阻塞数据结构的类型

在第 5 章中，我们使用 `std::atomic_flag` 实现了一个基础的自旋锁互斥量。其代码如下所示：

**清单 7.1 使用 `std::atomic_flag` 实现自旋锁互斥量**

```cpp
#include <atomic>

class spinlock_mutex
{
    std::atomic_flag flag;

public:
    spinlock_mutex():
        flag(ATOMIC_FLAG_INIT)
    {}

    void lock()
    {
        while(flag.test_and_set(std::memory_order_acquire));
    }

    void unlock()
    {
        flag.clear(std::memory_order_release);
    }
};
```

这段代码并未调用任何操作系统级的阻塞函数：`lock()` 在 `test_and_set()` 返回 `false` 之前不断在 `while` 循环中轮询。这就是它得名**自旋锁（spin lock）**的原因——代码在循环中持续自旋。由于不存在阻塞调用，任何使用该互斥量保护共享数据的代码在广义上都是非阻塞的。

然而，它**绝非无锁（lock-free）结构**！它在本质上仍然是一个互斥量，同一时间仍只允许一个线程持有锁。因此，仅仅知道某段代码是“非阻塞”的在绝大多数场景下是远远不够的。相反，你需要了解以下更为精确的技术分类术语：

- **无障碍（Obstruction-Free）**：如果挂起所有其他线程，那么任意给定的单个线程都能在有限步数内完成其操作。
- **无锁（Lock-Free）**：如果有多个线程在该数据结构上并发操作，那么在经过有限步数后，**必然至少有一个线程**能够完成其操作。
- **无等待（Wait-Free）**：在数据结构上操作的**每一个线程**都能在有限步数内完成其操作，无论其他线程的行为如何、处于何种调度状态。

在大多数工程实践中，“无障碍”算法并没有太大的实际用途——因为在现实多核系统中所有其他线程极少会同时暂停，这一术语更常用于描述一个“失败的无锁实现”。让我们重点剖析“无锁”与“无等待”的内涵。

### 7.1.2 无锁数据结构

要使一个数据结构具备**无锁（Lock-Free）**属性，必须允许多个线程并发访问该数据结构。这些线程不必同时执行相同的操作；例如，一个无锁队列可以允许一个线程执行 `push`、另一个线程执行 `pop`，但如果两个线程同时尝试 `push` 新元素则可能需要协调。

更为关键的是：**如果访问数据结构的某个线程在操作中途被操作系统调度挂起，其他线程必须仍然能够继续完成它们的操作，而绝不能无限期等待被挂起的线程**。

在数据结构上使用“比较并交换”（Compare-and-Swap, CAS / Compare/Exchange）操作的算法通常包含循环。之所以使用 CAS 循环，是因为在当前线程准备好修改值并尝试提交时，另一个并发线程可能已经抢先一步修改了数据；在这种情况下，当前线程必须重新读取最新状态、重新计算并再次重试 CAS。

只要在其他线程暂停的情况下，CAS 最终必然会成功，那么这段代码就仍然是无锁的。如果不满足这一点，你面对的就只是一个自旋锁——非阻塞，但非无锁。

包含重试循环的无锁算法可能会导致个别线程遭遇**饥饿（starvation）**：如果其他并发线程的操作时序恰好不断干扰该线程，其他线程可能持续向前推进，而该线程则不得不反复重试其 CAS 操作。能够彻底杜绝饥饿问题的数据结构不仅是无锁的，更是**无等待（wait-free）**的。

### 7.1.3 无等待数据结构

**无等待（Wait-Free）**数据结构是一种具有更强保证的无锁数据结构：**访问该数据结构的每一个线程都必定能在有限步数（bounded number of steps）内完成其操作，不论其他线程做出何种行为或调度次序**。

由于与其他线程的冲突而导致存在无界（unbounded）重试循环的算法绝非无等待算法。本章中的绝大多数示例都不具备无等待性质——它们都包含基于 `compare_exchange_weak` 或 `compare_exchange_strong` 的 `while` 循环，循环重试的次数在理论上是没有上限的。操作系统的线程调度可能导致某一个特定线程循环极多次，而其他线程很快成功。因此，这些操作不是无等待的。

编写正确的无等待数据结构极其艰巨。为了确保每个线程都能在有限步数内完成操作，你必须保证每个操作都能以单次遍历完成，并且一个线程所执行的操作步骤绝不能导致另一个线程的操作失败。这通常要求操作之间具备极高维度的协同算法，其算法复杂度会急剧上升。

鉴于无锁或无等待数据结构的编写难度极高，你必须有非常充分的理由才去编写它们；必须确保其收益远超付出的工程代价。

### 7.1.4 无锁数据结构的优缺点

归根结底，采用无锁数据结构的首要动机是**实现最大程度的并发**。
- 在基于锁的容器中，始终存在某个线程必须阻塞并等待另一个线程完成操作的可能性；通过互斥排他来防止并发，正是互斥锁存在的唯一目的。
- 在无锁数据结构中，系统的每一个推进步骤都必然伴随着**某个线程取得了实质进展**。
- 在无等待数据结构中，**每一个线程**都能独立向前推进，完全无需任何等待。这是梦寐以求的并发特质，但极难实现。

使用无锁数据结构的第二个重要原因是**鲁棒性 / 健壮性（robustness）**：
- 如果一个线程在持有互斥锁期间异常崩溃（die）或被操作系统强制杀死，该互斥锁将永远无法解开，整个数据结构将被永久破坏且导致后续所有访问线程死锁。
- 但如果一个线程在无锁数据结构的操作中途崩溃，除该线程自身正在处理的数据外，不会破坏整体结构的完整性；其他线程依然能够正常执行。

**无锁编程的代价与挑战**：
1. **不变量维护更艰难**：由于无法通过互斥排他阻止其他线程访问，你必须保证数据结构的不变量在任何原子步骤之间都不会被破坏，或者选择能够被原子切换维持的替代不变量。
2. **严苛的内存可见性控制**：为了避免数据竞争引发未定义行为，所有共享修改必须依赖原子操作。不仅如此，你还必须确保对数据的修改按照严格精确的内存顺序（Memory Order）对其他线程可见。编写无锁代码的脑力负担和出错几率远高于基于锁的代码。
3. **活锁（Live Lock）与性能损耗**：
   - 虽然无锁结构彻底消除了死锁，但存在**活锁**的风险。活锁是指两个或多个线程各自尝试修改数据结构，但彼此的修改互相导致对方的操作必须回退重试，所有线程都在全速自旋却没有任何实质进展。
   - 活锁通常是瞬态的，取决于线程在 CPU 上的精确调度。它虽然不会导致系统彻底冻结，但会剧烈空耗 CPU。无等待算法在定义上免疫活锁。
4. **整体吞吐量可能不升反降**：
   - 尽管无锁能提高特定操作的并发度和降低单线程的最差等待时间，但它**很可能会降低整体系统的执行性能**！
   - 首先，原子操作（尤其是总线锁定的 CAS 指令）本身在现代 CPU 架构上显著慢于普通的非原子内存读写。
   - 其次，多核 CPU 访问同一个原子变量时会导致严重的**缓存乒乓（Cache Ping-Pong）**效应：CPU 核心之间的缓存一致性协议（MESI）为了在不同核心间同步该原子变量所在的缓存行，会频繁在核间互联总线上广播失效信号，从而造成严重的内存子系统带宽堵塞。

因此，在工程实践中，必须在确立了明确的性能指标（最坏等待延迟、平均延迟、整体吞吐率等）后，**通过真实基准压测对比基于锁与无锁两种实现**，切忌盲目上马无锁结构。

---

## 7.2 无锁数据结构设计范例

为了展示设计无锁数据结构的通用技术，我们将依次实现一系列经典无锁数据结构，并深入剖析其中涉及的各个设计维度。

在无锁数据结构中，核心依赖于原子操作以及相关的内存顺序保证，以确保数据能够按照正确的时序被其他线程观察到。起初，我们将使用默认的顺序一致性模型 `std::memory_order_seq_cst`，因为这是最易于推理的模型（所有 `seq_cst` 操作构成全局全序）。随后，我们会逐步降低某些操作的约束，将其优化为获取-释放（`acquire-release`）语义甚至是宽松语义（`relaxed`）。

另外请铭记：在 C++ 中只有 `std::atomic_flag` 被标准保证绝不使用内部锁；某些平台上看似无锁的 `std::atomic<T>` 可能在标准库内部依然回退到了基于锁的实现。

我们从最简单的基础数据结构开始：**栈（Stack）**。

---

### 7.2.1 编写不使用锁的线程安全栈

栈的核心特性是后进先出（LIFO）：新加入的节点被最先取出。最简单的栈实现是单向链表，`head` 指针指向栈顶节点，每个节点通过 `next` 指向下一个节点。

在单线程环境下，压栈（`push`）非常简单：
1. 创建一个新节点；
2. 将新节点的 `next` 指针设置为当前的 `head`；
3. 将 `head` 设置为新节点。

但是在多线程并发环境下，若两个线程同时执行 `push`，步骤 2 与步骤 3 之间存在严重的**竞争条件**：线程 A 在步骤 2 读取了 `head`，在步骤 3 写入前，线程 B 已经更新了 `head`；此时线程 A 的写入将直接覆盖并丢失线程 B 刚压入的节点！

此外还有极其重要的原则：**新节点必须在挂载到 `head` 之前彻底初始化完毕**。因为一旦 `head` 指向该节点，其他并发线程便能立刻读取它，挂载后再修改该节点将引发未定义行为的数据竞争。

消除该竞态的利器是在步骤 3 使用**原子比较并交换（Compare-and-Swap, CAS）**操作：检查当前的 `head` 是否依然等于我们在步骤 2 读取的旧值；如果是，则将 `head` 原子更新为新节点；如果不是（说明有并发线程修改了 `head`），则刷新旧值并重新在循环中尝试。

清单 7.2 展示了无锁 `push()` 的实现。

**清单 7.2 不使用锁实现 `push()`**

```cpp
#include <atomic>

template<typename T>
class lock_free_stack
{
private:
    struct node
    {
        T data;
        node* next;

        node(T const& data_):
            data(data_)
        {}
    };

    std::atomic<node*> head;

public:
    void push(T const& data)
    {
        node* const new_node = new node(data);
        new_node->next = head.load();
        while(!head.compare_exchange_weak(new_node->next, new_node));
    }
};
```

这里精妙地运用了 `compare_exchange_weak` 的特性：当比较失败（返回 `false`）时，**第一个参数（`new_node->next`）会被自动更新为 `head` 的当前最新值**！因此我们无需在循环体内显式重新调用 `head.load()`。此外，由于本身处于循环体重试中，使用可能产生伪失败（spurious failure）但开销更低的 `compare_exchange_weak` 比 `compare_exchange_strong` 在多数架构上更具性能优势。

接下来审视出栈（`pop`）操作。直观步骤为：
1. 读取当前的 `head`；
2. 读取 `head->next`；
3. 将 `head` CAS 更新为 `head->next`；
4. 提取该节点中的数据并返回；
5. `delete` 释放被弹出的节点。

在多线程环境下，这存在极其致命的安全陷阱：如果线程 A 读取了 `head`（步骤 1），此时线程 B 介入并将该节点完全弹出并执行了 `delete`（步骤 5）；当线程 A 恢复执行并尝试访问 `head->next`（步骤 2）时，它正在**解引用一个已被释放的悬空指针（dangling pointer）**！这是内存非法访问引发未定义行为（段错误）。

为了展示最精简的无锁弹栈雏形，我们暂时先**省略步骤 5（允许节点泄漏）**。

清单 7.3 展示了支持 `push()` 和 `pop()` 但暂不释放节点的无锁栈。针对异常安全性，我们将节点内部数据改为由 `std::shared_ptr<T>` 管理，确保在弹出时即使发生异常也不会丢失数据。

**清单 7.3 存在节点内存泄漏的无锁栈雏形**

```cpp
#include <atomic>
#include <memory>

template<typename T>
class lock_free_stack
{
private:
    struct node
    {
        std::shared_ptr<T> data; // 数据由智能指针管理
        node* next;

        node(T const& data_):
            data(std::make_shared<T>(data_))
        {}
    };

    std::atomic<node*> head;

public:
    void push(T const& data)
    {
        node* const new_node = new node(data);
        new_node->next = head.load();
        while(!head.compare_exchange_weak(new_node->next, new_node));
    }

    std::shared_ptr<T> pop()
    {
        node* old_head = head.load();
        // 在解引用 old_head 之前必须确保其非空
        while(old_head &&
              !head.compare_exchange_weak(old_head, old_head->next));
        return old_head ? old_head->data : std::shared_ptr<T>();
    }
};
```

---

### 7.2.2 杜绝泄漏：无锁数据结构中的内存管理

内存泄漏在严肃的 C++ 生产系统中是不可接受的。无锁数据结构内存回收的核心难题在于：**你不能在任何其他线程可能依然持有该节点指针且即将解引用时，将该节点 `delete` 释放**。

#### 基于线程进出计数的延迟回收机制
如果只有一个线程在调用 `pop()`，问题迎刃而解；但面对多个并发调用 `pop()` 的线程，我们必须追踪何时能够安全释放节点。

最简单的思路是：**统计当前正处于 `pop()` 函数内部的线程总数**。
- 当一个线程进入 `pop()` 时，递增原子计数器 `threads_in_pop`；离开时递减。
- 如果某个线程在弹出节点后，发现 `threads_in_pop == 1`（意味着当前没有其他任何线程处于 `pop()` 内部），那么它不仅可以安全删除刚刚弹出的节点，还可以一并删除所有之前暂存的待删除节点！
- 如果 `threads_in_pop > 1`，说明有其他线程可能正在解引用某些节点，此时绝不能立即删除，只能将节点放入全局的待删除链表（`to_be_deleted`）中延迟回收。

清单 7.4 和清单 7.5 展示了这一基于进出引用计数的回收机制。

**清单 7.4 在没有并发线程处于 `pop()` 时回收节点**

```cpp
#include <atomic>
#include <memory>

template<typename T>
class lock_free_stack
{
private:
    struct node
    {
        std::shared_ptr<T> data;
        node* next;
        node(T const& data_):
            data(std::make_shared<T>(data_))
        {}
    };

    std::atomic<node*> head;
    std::atomic<unsigned> threads_in_pop; // 正在执行 pop 的线程计数
    std::atomic<node*> to_be_deleted;     // 待删除链表表头

    void try_reclaim(node* old_head);

public:
    lock_free_stack(): threads_in_pop(0), to_be_deleted(nullptr) {}

    void push(T const& data)
    {
        node* const new_node = new node(data);
        new_node->next = head.load();
        while(!head.compare_exchange_weak(new_node->next, new_node));
    }

    std::shared_ptr<T> pop()
    {
        ++threads_in_pop; // 进入时递增计数
        node* old_head = head.load();
        while(old_head &&
              !head.compare_exchange_weak(old_head, old_head->next));
        std::shared_ptr<T> res;
        if(old_head)
        {
            res.swap(old_head->data); // 尽早剥离数据
        }
        try_reclaim(old_head); // 尝试回收节点
        return res;
    }
};
```

**清单 7.5 引用计数回收机制的具体实现**

```cpp
template<typename T>
class lock_free_stack
{
    // ...
private:
    static void delete_nodes(node* nodes)
    {
        while(nodes)
        {
            node* next = nodes->next;
            delete nodes;
            nodes = next;
        }
    }

    void try_reclaim(node* old_head)
    {
        if(threads_in_pop == 1) // 判定当前是否是唯一正在 pop 的线程
        {
            // 独占接管全部待删除链表
            node* nodes_to_delete = to_be_deleted.exchange(nullptr);
            if(!--threads_in_pop) // 再次确认没有其他线程在此期间进入 pop
            {
                delete_nodes(nodes_to_delete);
            }
            else if(nodes_to_delete)
            {
                // 若中途有新线程进入，必须将待删除链表原样链回
                chain_pending_nodes(nodes_to_delete);
            }
            delete old_head; // 当前被弹出的节点可以安全释放
        }
        else
        {
            chain_pending_node(old_head); // 有其他线程在 pop，放入待删除链表
            --threads_in_pop;
        }
    }

    void chain_pending_nodes(node* nodes)
    {
        node* last = nodes;
        while(node* const next = last->next)
        {
            last = next;
        }
        chain_pending_nodes(nodes, last);
    }

    void chain_pending_nodes(node* first, node* last)
    {
        last->next = to_be_deleted.load();
        // 通过 CAS 循环将链表挂入 to_be_deleted
        while(!to_be_deleted.compare_exchange_weak(
            last->next, first));
    }

    void chain_pending_node(node* n)
    {
        chain_pending_nodes(n, n);
    }
};
```

> **图 7.1 并发安全关键点说明**：
> 为什么在 `nodes_to_delete = to_be_deleted.exchange(nullptr)` 之后，还必须再次检查 `if(!--threads_in_pop)`？
> 考虑如下场景：线程 A 发现 `threads_in_pop == 1`，正准备删除；但在执行 `exchange` 期间，线程 B 恰好调用了 `pop()` 并读取了此时的旧 `head`（节点 Y），随后线程 C 将 Y 弹入待删除列表。如果线程 A 在取走待删除列表后不再次检查 `threads_in_pop`，就会将线程 B 正在读取的节点 Y 物理销毁！因此必须在原子递减 `threads_in_pop` 后确认其确为 0，才能物理执行 `delete_nodes`。

**该机制的局限性**：
在并发负载较低的场景下，系统总会出现“没有线程处于 `pop()`”的静态静止窗口，待删除节点能被正常回收。
然而在**高并发重负载**场景下，新线程可能在所有先驱线程退出前接踵而至，导致 `threads_in_pop` 永远大于 0！如此一来，`to_be_deleted` 链表将无限膨胀，退化为实质上的内存泄漏。

为了在高争用下依然能精准、安全地回收内存，我们引入无锁领域的经典神技——**风险指针（Hazard Pointers）**。

---

### 7.2.3 使用风险指针（Hazard Pointers）检测不可回收节点

**风险指针（Hazard Pointer）**由 Maged Michael 提出。其核心思想十分直观：如果一个线程即将解引用一个潜在可能被并发释放的指针，它首先将该指针登记到一个全局可见的数组中——向全世界宣布：“我正在使用这个指针，任何人不得释放它！” 这个指针就成了“风险指针”。

当另一个线程试图释放某个节点时，它必须扫描所有其他线程登记的风险指针：
- 如果没有任一线程的风险指针指向该节点，该节点可以安全物理销毁；
- 如果存在风险指针匹配，则该节点不能立即销毁，必须存入延迟回收链表；随后定期重新扫描并回收不再处于风险期的节点。

清单 7.6 展示了使用风险指针的 `pop()` 实现。

**清单 7.6 使用风险指针的 `pop()` 实现**

```cpp
#include <atomic>
#include <memory>
#include <thread>

std::shared_ptr<T> pop()
{
    // 获取当前线程绑定的风险指针引用
    std::atomic<void*>& hp = get_hazard_pointer_for_current_thread();
    node* old_head = head.load();
    do
    {
        node* temp;
        do
        {
            temp = old_head;
            hp.store(old_head);  // 1. 登记风险指针
            old_head = head.load();
        } while(old_head != temp); // 2. 循环直到确保登记的风险指针与当前的 head 严格一致
    }
    while(old_head &&
          !head.compare_exchange_strong(old_head, old_head->next));

    hp.store(nullptr); // 3. 节点弹出成功，清除风险指针
    std::shared_ptr<T> res;
    if(old_head)
    {
        res.swap(old_head->data);
        // 4. 检查是否有其他线程的风险指针正指向该节点
        if(outstanding_hazard_pointers_for(old_head))
        {
            reclaim_later(old_head); // 有其他线程在访问，延迟回收
        }
        else
        {
            delete old_head; // 没有其他线程访问，立即释放！
        }
        delete_nodes_with_no_hazards(); // 批量回收此前累积的无风险节点
    }
    return res;
}
```

接下来实现管理风险指针数组的基础设施。清单 7.7 展示了风险指针与线程绑定的实现。

**清单 7.7 `get_hazard_pointer_for_current_thread()` 的实现**

```cpp
#include <atomic>
#include <thread>
#include <stdexcept>

unsigned const max_hazard_pointers = 100;

struct hazard_pointer
{
    std::atomic<std::thread::id> id;
    std::atomic<void*> pointer;
};

hazard_pointer hazard_pointers[max_hazard_pointers];

class hp_owner
{
    hazard_pointer* hp;

public:
    hp_owner(hp_owner const&) = delete;
    hp_owner& operator=(hp_owner const&) = delete;

    hp_owner(): hp(nullptr)
    {
        for(unsigned i = 0; i < max_hazard_pointers; ++i)
        {
            std::thread::id old_id;
            // 通过 CAS 抢占未分配的风险指针槽位
            if(hazard_pointers[i].id.compare_exchange_strong(
                old_id, std::this_thread::get_id()))
            {
                hp = &hazard_pointers[i];
                break;
            }
        }
        if(!hp)
        {
            throw std::runtime_error("No hazard pointers available");
        }
    }

    std::atomic<void*>& get_pointer()
    {
        return hp->pointer;
    }

    ~hp_owner()
    {
        hp->pointer.store(nullptr);
        hp->id.store(std::thread::id()); // 释放槽位给后来的线程复用
    }
};

std::atomic<void*>& get_hazard_pointer_for_current_thread()
{
    // 利用线程局部存储（TLS）为每个线程分配一次所有权对象
    thread_local static hp_owner hazard;
    return hazard.get_pointer();
}

bool outstanding_hazard_pointers_for(void* p)
{
    for(unsigned i = 0; i < max_hazard_pointers; ++i)
    {
        if(hazard_pointers[i].pointer.load() == p)
        {
            return true;
        }
    }
    return false;
}
```

延迟回收链表与清理函数的实现如清单 7.8 所示。为了使回收系统通用化，我们使用类型擦除技术配合析构包装器。

**清单 7.8 延迟回收体系的实现**

```cpp
#include <functional>
#include <atomic>

template<typename T>
void do_delete(void* p)
{
    delete static_cast<T*>(p);
}

struct data_to_reclaim
{
    void* data;
    std::function<void(void*)> deleter;
    data_to_reclaim* next;

    template<typename T>
    data_to_reclaim(T* p):
        data(p),
        deleter(&do_delete<T>),
        next(nullptr)
    {}

    ~data_to_reclaim()
    {
        deleter(data);
    }
};

std::atomic<data_to_reclaim*> nodes_to_reclaim;

void add_to_reclaim_list(data_to_reclaim* node)
{
    node->next = nodes_to_reclaim.load();
    while(!nodes_to_reclaim.compare_exchange_weak(node->next, node));
}

template<typename T>
void reclaim_later(T* data)
{
    add_to_reclaim_list(new data_to_reclaim(data));
}

void delete_nodes_with_no_hazards()
{
    // 原子夺取整条回收链表
    data_to_reclaim* current = nodes_to_reclaim.exchange(nullptr);
    while(current)
    {
        data_to_reclaim* const next = current->next;
        if(!outstanding_hazard_pointers_for(current->data))
        {
            delete current; // 内部自动调用 deleter 销毁实际数据
        }
        else
        {
            add_to_reclaim_list(current); // 依然有风险指针引用，重新挂回链表
        }
        current = next;
    }
}
```

**性能与工程优化考量**：
- 每次 `pop()` 都扫描全局数组开销过大。在实际工程中，通常进行**批量回收**：只有当待回收链表节点数量累积到 `2 * max_hazard_pointers` 时，才触发一次扫描，此时保证一次性至少回收 `max_hazard_pointers` 个节点，将扫描开销均摊到极低水平。
- 此外，可以将延迟回收链表下沉到线程局部变量（TLS）中，每个线程独立维护自己的待回收池，从而完全消除全局 `nodes_to_reclaim` 上的原子争用。
- 风险指针已被作为工业级内存回收技术提交至 C++ 提案（P0566）及各大高性能并发库（如 Folly）。

---

### 7.2.4 使用引用计数检测使用中的节点

除了风险指针，另一种优雅的无锁内存回收范式是**引用计数（Reference Counting）**。

#### 原子 `std::shared_ptr` 的现状
`std::shared_ptr` 原生基于引用计数。如果你的编译器与标准库对 `std::shared_ptr` 的原子特化（如 C++20 的 `std::atomic<std::shared_ptr<T>>` 或实验性的 `std::experimental::atomic_shared_ptr<T>`）能够提供真正的无锁指令支持，那么无锁栈的代码将极其简洁（见清单 7.9 与清单 7.10）。

**清单 7.9 使用原子 `std::shared_ptr<>` 实现的无锁栈**

```cpp
#include <memory>
#include <atomic>

template<typename T>
class lock_free_stack
{
private:
    struct node
    {
        std::shared_ptr<T> data;
        std::shared_ptr<node> next;

        node(T const& data_):
            data(std::make_shared<T>(data_))
        {}
    };

    std::shared_ptr<node> head;

public:
    void push(T const& data)
    {
        std::shared_ptr<node> const new_node = std::make_shared<node>(data);
        new_node->next = std::atomic_load(&head);
        while(!std::atomic_compare_exchange_weak(
            &head, &new_node->next, new_node));
    }

    std::shared_ptr<T> pop()
    {
        std::shared_ptr<node> old_head = std::atomic_load(&head);
        while(old_head && !std::atomic_compare_exchange_weak(
            &head, &old_head, std::atomic_load(&old_head->next)));
        if(old_head)
        {
            std::atomic_store(&old_head->next, std::shared_ptr<node>());
            return old_head->data;
        }
        return std::shared_ptr<T>();
    }

    ~lock_free_stack()
    {
        while(pop());
    }
};
```

**清单 7.10 使用 `std::experimental::atomic_shared_ptr<>` 的无锁栈**

```cpp
#include <memory>
#include <experimental/atomic>

template<typename T>
class lock_free_stack
{
private:
    struct node
    {
        std::shared_ptr<T> data;
        std::experimental::atomic_shared_ptr<node> next;

        node(T const& data_):
            data(std::make_shared<T>(data_))
        {}
    };

    std::experimental::atomic_shared_ptr<node> head;

public:
    void push(T const& data)
    {
        std::shared_ptr<node> const new_node = std::make_shared<node>(data);
        new_node->next = head.load();
        while(!head.compare_exchange_weak(new_node->next, new_node));
    }

    std::shared_ptr<T> pop()
    {
        std::shared_ptr<node> old_head = head.load();
        while(old_head && !head.compare_exchange_weak(
            old_head, old_head->next.load()));
        if(old_head)
        {
            old_head->next = std::shared_ptr<node>();
            return old_head->data;
        }
        return std::shared_ptr<T>();
    }

    ~lock_free_stack()
    {
        while(pop());
    }
};
```

然而，在绝大多数硬件架构上，`std::shared_ptr` 的原子操作受限于 16 字节大小与复杂的控制块指针，往往回退到内部锁实现，并非真正无锁。

#### 手动拆分引用计数技术（Split Reference Counts）
为了实现真正的硬件级无锁引用计数，我们可以采用**拆分引用计数**技术。
我们将节点的引用计数拆分为两个维度：
1. **外部引用计数（external_count）**：与节点裸指针绑在一起，合并为一个结构体 `counted_node_ptr`，放入 `std::atomic<counted_node_ptr>` 中。每次线程通过读取 `head` 打算访问该节点时，立即在外部计数上加 1。
2. **内部引用计数（internal_count）**：保存在节点结构体内部。当线程结束对该节点的解引用访问时，递减内部引用计数。
3. **节点总引用数** = 外部引用计数 + 内部引用计数。

当一个节点被成功从栈顶弹出时，外部计数器便不再被后续新线程访问；此时，将当前的外部计数（减去已销毁引用的差值）一次性累加合并到内部计数上。一旦内部计数归零，便能确保世界上没有任何线程持有该指针，此时安全 `delete ptr`！

清单 7.11 和 7.12 展示了这一经典架构。

**清单 7.11 基于拆分引用计数的无锁栈：节点定义与 `push()`**

```cpp
#include <atomic>
#include <memory>

template<typename T>
class lock_free_stack
{
private:
    struct node;

    struct counted_node_ptr
    {
        int external_count;
        node* ptr;
    };

    struct node
    {
        std::shared_ptr<T> data;
        std::atomic<int> internal_count;
        counted_node_ptr next;

        node(T const& data_):
            data(std::make_shared<T>(data_)),
            internal_count(0)
        {}
    };

    std::atomic<counted_node_ptr> head;

public:
    ~lock_free_stack()
    {
        while(pop());
    }

    void push(T const& data)
    {
        counted_node_ptr new_node;
        new_node.ptr = new node(data);
        new_node.external_count = 1; // 自身作为 head 被引用
        new_node.ptr->next = head.load();
        while(!head.compare_exchange_weak(new_node.ptr->next, new_node));
    }
};
```

**清单 7.12 基于拆分引用计数的无锁栈：`pop()` 与引用计数维护**

```cpp
template<typename T>
class lock_free_stack
{
    // ...
private:
    void increase_head_count(counted_node_ptr& old_counter)
    {
        counted_node_ptr new_counter;
        do
        {
            new_counter = old_counter;
            ++new_counter.external_count;
        }
        // CAS 循环递增 external_count，确保在解引用前指针有效
        while(!head.compare_exchange_strong(old_counter, new_counter));
        old_counter.external_count = new_counter.external_count;
    }

public:
    std::shared_ptr<T> pop()
    {
        counted_node_ptr old_head = head.load();
        for(;;)
        {
            increase_head_count(old_head);
            node* const ptr = old_head.ptr;
            if(!ptr)
            {
                return std::shared_ptr<T>(); // 栈为空
            }
            if(head.compare_exchange_strong(old_head, ptr->next))
            {
                std::shared_ptr<T> res;
                res.swap(ptr->data); // 独占提取数据

                // 外部计数减去 2（1 个代表出栈脱钩，1 个代表当前线程访问结束）
                int const count_increase = old_head.external_count - 2;
                if(ptr->internal_count.fetch_add(count_increase) == -count_increase)
                {
                    delete ptr; // 内部计数与外部增量相加恰好归零，彻底释放
                }
                return res;
            }
            else if(ptr->internal_count.fetch_sub(1) == 1)
            {
                // CAS 争抢失败，当前线程放弃对该节点的访问，递减 internal_count
                delete ptr; // 若正好递减到 0，则执行销毁
            }
        }
    }
};
```

---

### 7.2.5 将内存模型应用到无锁栈

在清单 7.11 和 7.12 中，所有的原子操作都使用了默认的 `std::memory_order_seq_cst`（全局顺序一致性）。顺序一致性在多核处理器上开销很大。既然逻辑结构已经验证正确，我们现在可以根据 Happens-Before 关系，将其精细优化为获取-释放（`acquire-release`）与宽松（`relaxed`）内存序。

**推导分析**：
1. **`push()` 阶段**：`push` 线程构建了新节点及其数据，然后写入 `head`。为了确保读取 `head` 的 `pop` 线程能够看到这些数据，`push` 中更新 `head` 的 CAS 操作必须具有 **`std::memory_order_release`** 语义；而在失败重试时，并未对外暴露任何新状态，使用 **`std::memory_order_relaxed`** 即可。
2. **`increase_head_count()` 阶段**：`pop` 线程读取 `head` 并递增外部引用计数。为了与 `push` 线程建立同步关系，成功时的 CAS 必须使用 **`std::memory_order_acquire`** 语义，从而确保在访问 `ptr->next` 时能够看到 `push` 线程初始化的内容。
3. **`pop()` 中的 `head` 推进**：在成功匹配 `head` 并将其推进到 `ptr->next` 时，该 CAS 仅仅是将头指针移动，数据的可见性已经在前一步通过 `acquire` 锁定了，因此此处可以直接使用 **`std::memory_order_relaxed`**！
4. **引用计数释放与销毁**：成功弹出节点的线程通过 `swap` 拿走了数据；而竞争失败的线程在 `fetch_sub` 时如果触发了销毁，必须确保成功线程的 `swap` 先于它的 `delete` 发生。因此，成功分支的 `fetch_add` 使用 **`std::memory_order_release`**，而失败分支在检测到计数归零准备 `delete` 时，通过一个带有 **`std::memory_order_acquire`** 的 `load()` 建立同步屏障！

清单 7.13 给出了融合了精细内存模型的最终工业级无锁栈。

**清单 7.13 采用拆分引用计数与精细原子内存序的无锁栈**

```cpp
#include <atomic>
#include <memory>

template<typename T>
class lock_free_stack
{
private:
    struct node;

    struct counted_node_ptr
    {
        int external_count;
        node* ptr;
    };

    struct node
    {
        std::shared_ptr<T> data;
        std::atomic<int> internal_count;
        counted_node_ptr next;

        node(T const& data_):
            data(std::make_shared<T>(data_)),
            internal_count(0)
        {}
    };

    std::atomic<counted_node_ptr> head;

    void increase_head_count(counted_node_ptr& old_counter)
    {
        counted_node_ptr new_counter;
        do
        {
            new_counter = old_counter;
            ++new_counter.external_count;
        }
        while(!head.compare_exchange_strong(old_counter, new_counter,
                                            std::memory_order_acquire,
                                            std::memory_order_relaxed));
        old_counter.external_count = new_counter.external_count;
    }

public:
    ~lock_free_stack()
    {
        while(pop());
    }

    void push(T const& data)
    {
        counted_node_ptr new_node;
        new_node.ptr = new node(data);
        new_node.external_count = 1;
        new_node.ptr->next = head.load(std::memory_order_relaxed);
        while(!head.compare_exchange_weak(new_node.ptr->next, new_node,
                                          std::memory_order_release,
                                          std::memory_order_relaxed));
    }

    std::shared_ptr<T> pop()
    {
        counted_node_ptr old_head = head.load(std::memory_order_relaxed);
        for(;;)
        {
            increase_head_count(old_head);
            node* const ptr = old_head.ptr;
            if(!ptr)
            {
                return std::shared_ptr<T>();
            }
            if(head.compare_exchange_strong(old_head, ptr->next,
                                            std::memory_order_relaxed))
            {
                std::shared_ptr<T> res;
                res.swap(ptr->data);
                int const count_increase = old_head.external_count - 2;
                if(ptr->internal_count.fetch_add(count_increase,
                    std::memory_order_release) == -count_increase)
                {
                    delete ptr;
                }
                return res;
            }
            else if(ptr->internal_count.fetch_add(-1,
                std::memory_order_relaxed) == 1)
            {
                ptr->internal_count.load(std::memory_order_acquire);
                delete ptr;
            }
        }
    }
};
```

---

### 7.2.6 编写不使用锁的线程安全队列

队列的并发同步比栈更具挑战性：在栈中，`push` 和 `pop` 操作都在栈顶（`head`）进行；而在队列中，`push` 操作访问尾部（`tail`），`pop` 操作访问头部（`head`），两端操作必须实现严格跨端点的数据可见性同步。

#### 单生产者单消费者（SPSC）队列
如果是单生产者单消费者（SPSC）场景，无锁队列非常简单直接。清单 7.14 展示了一个基础实现。

**清单 7.14 单生产者单消费者（SPSC）无锁队列**

```cpp
#include <atomic>
#include <memory>

template<typename T>
class lock_free_queue
{
private:
    struct node
    {
        std::shared_ptr<T> data;
        node* next;
        node(): next(nullptr) {}
    };

    std::atomic<node*> head;
    std::atomic<node*> tail;

    node* pop_head()
    {
        node* const old_head = head.load();
        if(old_head == tail.load())
        {
            return nullptr; // 队列为空
        }
        head.store(old_head->next);
        return old_head;
    }

public:
    lock_free_queue():
        head(new node), tail(head.load())
    {}

    lock_free_queue(const lock_free_queue& other) = delete;
    lock_free_queue& operator=(const lock_free_queue& other) = delete;

    ~lock_free_queue()
    {
        while(node* const old_head = head.load())
        {
            head.store(old_head->next);
            delete old_head;
        }
    }

    std::shared_ptr<T> pop()
    {
        node* old_head = pop_head();
        if(!old_head)
        {
            return std::shared_ptr<T>();
        }
        std::shared_ptr<T> const res(old_head->data);
        delete old_head;
        return res;
    }

    void push(T new_value)
    {
        std::shared_ptr<T> new_data(std::make_shared<T>(new_value));
        node* p = new node;
        node* const old_tail = tail.load();
        old_tail->data.swap(new_data);
        old_tail->next = p;
        tail.store(p);
    }
};
```

当仅有单个生产者和单个消费者时，该队列非常高效。然而，一旦有多个生产者并发调用 `push()`，它们会同时读取相同的 `tail` 并并发修改同一个节点的 `data` 与 `next`，产生极其严重的数据竞争！同理，多个并发 `pop()` 也会并发覆写 `head`。

#### 多生产者并发与协同推进（Helping）机制
要支持多生产者并发压入，不能让其他线程在某个线程推进 `tail` 时陷入盲目自旋。如果一个线程在 CAS 成功填充了节点的 `data` 之后被系统挂起，其他并发调用 `push` 的线程就会陷入死循环忙等待，这就实质上退化成了一把自旋锁！

**打破瓶颈的精髓在于：协同推进（Helping Out / Helping Mechanism）**！
当一个线程发现某个节点的 `data` 已经被前一个线程填入了新数据、但前一个线程尚未完成后续的 `tail->next` 链接或 `tail` 指针推进时，**当前线程并不干等，而是主动替它把 `tail` 指针向前推进**！
因为虚节点是无差别的，任何线程都可以将自己的新节点连接上去并协助更新 `tail`。

为了保证内存回收安全，每个节点采用带有位域拆分的计数器（`node_counter`），包含一个 30 位的 `internal_count` 和一个 2 位的 `external_counters`，将计数与指针封装在 `counted_node_ptr` 中，在双字原子 CAS 下整体安全流动。

清单 7.21 展示了针对协同推进机制进行了适配的 `pop()` 实现。

**清单 7.21 为支持 push 端协同推进而修改的 `pop()`**

```cpp
#include <atomic>
#include <memory>

template<typename T>
class lock_free_queue
{
private:
    struct node;

    struct counted_node_ptr
    {
        int external_count;
        node* ptr;
    };

    struct node_counter
    {
        unsigned internal_count: 30;
        unsigned external_counters: 2;
    };

    struct node
    {
        std::atomic<T*> data;
        std::atomic<node_counter> count;
        std::atomic<counted_node_ptr> next; // next 指针也是原子的

        node()
        {
            node_counter new_count;
            new_count.internal_count = 0;
            new_count.external_counters = 2; // 分别来自 tail 和前驱节点的 next
            count.store(new_count);
            counted_node_ptr new_next = {0};
            next.store(new_next);
        }

        void release_ref();
    };

    std::atomic<counted_node_ptr> head;
    std::atomic<counted_node_ptr> tail;

    static void increase_external_count(
        std::atomic<counted_node_ptr>& counter,
        counted_node_ptr& old_counter);
    static void free_external_counter(counted_node_ptr& old_node_ptr);

public:
    std::unique_ptr<T> pop()
    {
        counted_node_ptr old_head = head.load(std::memory_order_relaxed);
        for(;;)
        {
            increase_external_count(head, old_head);
            node* const ptr = old_head.ptr;
            if(ptr == tail.load().ptr)
            {
                return std::unique_ptr<T>();
            }
            counted_node_ptr next = ptr->next.load();
            if(head.compare_exchange_strong(old_head, next))
            {
                T* const res = ptr->data.exchange(nullptr);
                free_external_counter(old_head);
                return std::unique_ptr<T>(res);
            }
            ptr->release_ref();
        }
    }
};
```

清单 7.22 展示了具备协同推进（Helping）机制的生产级多生产者多消费者（MPMC）无锁队列 `push()` 实现。

**清单 7.22 带有协同推进（Helping）机制的无锁队列 `push()` 实现**

```cpp
template<typename T>
class lock_free_queue
{
    // ...
private:
    void set_new_tail(counted_node_ptr& old_tail,
                      counted_node_ptr const& new_tail)
    {
        node* const current_tail_ptr = old_tail.ptr;
        while(!tail.compare_exchange_weak(old_tail, new_tail) &&
              old_tail.ptr == current_tail_ptr);
        if(old_tail.ptr == current_tail_ptr)
        {
            free_external_counter(old_tail);
        }
        else
        {
            current_tail_ptr->release_ref();
        }
    }

public:
    void push(T new_value)
    {
        std::unique_ptr<T> new_data(new T(new_value));
        counted_node_ptr new_next;
        new_next.ptr = new node;
        new_next.external_count = 1;
        counted_node_ptr old_tail = tail.load();

        for(;;)
        {
            increase_external_count(tail, old_tail);
            T* old_data = nullptr;
            // 尝试通过 CAS 将数据挂到旧尾节点上
            if(old_tail.ptr->data.compare_exchange_strong(
                old_data, new_data.get()))
            {
                counted_node_ptr old_next = {0};
                if(!old_tail.ptr->next.compare_exchange_strong(
                    old_next, new_next))
                {
                    // 若有其他线程抢先协助连接了 next，删除当前分配的节点并复用抢先节点的 next
                    delete new_next.ptr;
                    new_next = old_next;
                }
                set_new_tail(old_tail, new_next);
                new_data.release();
                break;
            }
            else // 协同推进分支（Helping）：帮助尚未完成更新的线程推进尾部
            {
                counted_node_ptr old_next = {0};
                if(old_tail.ptr->next.compare_exchange_strong(
                    old_next, new_next))
                {
                    old_next = new_next;
                    new_next.ptr = new node; // 既然旧的给别人用了，为自己重新分配一个
                }
                set_new_tail(old_tail, old_next);
            }
        }
    }
};
```

**辅助引用计数函数的完整实现**：
- `release_ref()`（清单 7.18 结构）：原子 CAS 递减 `internal_count`，若内部和外部计数同时归零，执行 `delete this`。
- `increase_external_count()`（清单 7.19 结构）：原子 CAS 递增 `external_count`，防止解引用悬空。
- `free_external_counter()`（清单 7.20 结构）：原子减少 `external_counters` 并将外部增量并入内部计数，判定最终销毁。

**内存分配器（Allocator）的关键影响**：
注意在无锁队列中，每次 `push` 都会创建新节点，每次 `pop` 都会销毁节点。因此，**底层内存分配器的性能对无锁并发容器具有决定性影响**！如果多个线程频繁在全局堆分配器（`malloc` / `operator new`）上加锁争抢，整个无锁容器的可扩展性将被彻底抹杀。为此，在工业实践中，无锁容器往往搭配针对线程局部的无锁内存池（Thread-local Free List / Slab Allocator）使用。

---

## 7.3 编写无锁数据结构的指导原则

通过上述各阶段的具体实现，我们可以提炼出编写高质量无锁数据结构的四项核心工程法则：

### 7.3.1 原则：在原型设计阶段使用 `std::memory_order_seq_cst`

在编写无锁数据结构的原型时，**务必首先全部采用 `std::memory_order_seq_cst` 顺序一致性模型**。

顺序一致性极其直观，所有原子操作在所有线程中呈现完全统一的全局全序，极大地降低了认知与调试负担。过早放松内存序是灾难性的反模式。只有在数据结构的功能逻辑、并发边界与不变量已被充分验证正确之后，再系统性地分析线程间的 Happens-Before 关系，逐步将非必要的操作放宽到 `acquire-release` 乃至 `relaxed`。若缺少形式化验证工具或系统性算法检测器，任何过早的内存序优化都极易在特定弱内存架构（如 ARM、POWER）上引发难以复现的诡异并发 Bug。

### 7.3.2 原则：采用成熟的无锁内存回收方案

无锁编程中最大的陷阱就是**内存悬空回收问题**。必须确保当且仅当没有任何线程持有某对象的指针时才能释放内存。本章介绍了三种经典机制：
1. **静态静止期检测（Quiescent-State Reclamation）**：通过统计活跃线程数（如 `threads_in_pop`），在无并发访问时批量回收。适合并发度低或存在明确空闲周期的系统。
2. **风险指针（Hazard Pointers）**：线程在解引用前主动显式发布正在访问的节点指针，由回收端安全比对。适合读多写少、对延迟高度敏感的系统。
3. **拆分引用计数（Split Reference Counts）**：结合外部原子计数与内部累积计数，利用双字原子 CAS 实现无锁引用计数跟踪。

此外，**基于轮次的内存回收（Epoch-Based Reclamation, EBR）**与**读-复制更新（RCU）**也是高性能无锁系统中极其强大的工业级回收方案。

### 7.3.3 原则：警惕 ABA 问题

**ABA 问题**是所有基于比较并交换（CAS）算法中最为臭名昭著的隐患。其经典时序如下：
1. 线程 1 读取原子变量 $x$，读到值 $A$；
2. 线程 1 准备基于 $A$ 执行修改，但随后被操作系统暂停调度；
3. 线程 2 将 $x$ 的值修改为 $B$；
4. 线程 2 或线程 3 释放了原 $A$ 处的内存，随后申请新对象，恰好由于内存分配器地址复用，新对象被分配在**同一物理地址 $A$** 上；
5. 线程 2 将 $x$ 的值改回 $A$；
6. 线程 1 被重新唤醒，执行 CAS 检查：发现 $x$ 的当前值依然是 $A$！CAS 判定匹配成功并执行写入——然而此 $A$ 已非彼 $A$，底层的关联数据结构已经被彻底篡改，导致数据结构遭受毁灭性破坏。

**防范 ABA 问题的黄金准则**：
- **引入版本标签 / ABA 计数器**：在原子变量旁边并置一个递增版本号（如本章中的 `counted_node_ptr`，将计数与指针绑定在同一个 128 位双字机器字中进行原子 CAS）。每次指针更新时版本号单调递增，哪怕地址被复用为 $A$，版本号的变化也必然使 CAS 判定失败，从而彻底粉碎 ABA 陷阱。

### 7.3.4 原则：识别忙等待循环并主动协助其他线程

在无锁算法中，若一个线程必须等待另一个线程完成某项中间状态（如设置 `next` 指针）后才能继续，切勿让当前线程陷入单纯的自旋重试循环——单纯自旋就是变相的阻塞加锁。

**最佳实践是“协助推进（Helping）”**：通过让当前线程主动读取前驱线程遗留的未竟任务，协助其完成状态推进（例如帮助推进尾节点），使整个系统无论线程调度如何波动，总有线程在做有效功，从而维护真正的无锁（Lock-Free）与高吞吐保证。

---

## 本章小结

- **无锁数据结构**能够彻底消除死锁风险，并在遭遇线程崩溃或调度中断时保持系统的整体可用性。
- 区分**无障碍（Obstruction-Free）**、**无锁（Lock-Free）**与**无等待（Wait-Free）**三种不同强度的非阻塞保证层次。
- 无锁编程的核心复杂性在很大程度上源自**动态内存管理**。本章详细解析了通过进出计数器、**风险指针（Hazard Pointers）**以及**拆分原子引用计数（Split Reference Counts）**来保证内存安全回收的技术。
- 深入推导了从顺序一致性到获取-释放语义的内存模型映射过程，通过 Happens-Before 关系的系统性梳理在确保正确性的前提下压榨硬件性能。
- 在多生产者队列中，运用**协助推进（Helping）机制**成功消除了自旋忙等待，实现了真正的 MPMC 无锁并发队列。
- 牢记防范 **ABA 问题**的标准手段：将版本标签计数器与指针捆绑进行原子 CAS 操作。
