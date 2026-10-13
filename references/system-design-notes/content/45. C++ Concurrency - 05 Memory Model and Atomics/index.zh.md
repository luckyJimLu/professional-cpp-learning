---
id: cpp-concurrency-05-memory-model-and-atomics
title: "第 5 章：C++ 内存模型与原子操作"
titleEn: "Chapter 5: The C++ memory model and operations on atomic types"
order: 45
category: specialized
description: "深度拆解 C++ 内存模型、std::atomic 原子类型、顺序一致性、Acquire-Release 语义与内存屏障。"
tags: ["C++", "内存模型", "原子操作", "内存顺序", "Acquire-Release"]
---

# 第 5 章：C++ 内存模型与原子类型操作

```cpp
    try{
        update_display(info_to_display.get());
    } catch(std::exception& e){
        display_error(e);
    }
});
}
```

请注意，每个延续函数均将一个 `std::experimental::future` 作为其唯一入参，然后通过 `.get()` 提取内部包含的值。这意味着异常会沿着整条调用链一直向下传播，因此在最终延续节点中调用 `info_to_display.get()` 时，如果链条中前面的任何一个函数抛出了异常，该调用都会重新抛出该异常，这里的 `catch` 块即可统一处理所有异常，正如代码清单 4.18 中的 `catch` 块所做的那样。

如果后端 API 调用内部发生阻塞（例如等待网络数据包或等待数据库操作完成），那么优化尚未彻底完成。你虽然将任务拆分成了各个独立步骤，但它们依然包含阻塞调用，因此仍然会阻塞底层工作线程。我们真正需要的是：**后端 API 调用直接返回 future，该 future 在数据就绪时自动就绪，全程不阻塞任何线程**。在这种设计下，`backend.async_authenticate_user(username, password)` 将直接返回一个 `std::experimental::future<user_id>` 而非普通的 `user_id`。

你可能会担心这会让代码复杂化，因为在延续中返回一个 future 会导致嵌套出 `future<future<some_value>>`，否则你就必须在延续内部嵌套 `.then` 调用。幸运的是，Concurrency TS 规范贴心地解决了这个问题：**如果传给 `.then()` 的延续函数本身返回一个 `future<T>`，则 `.then()` 会自动将其扁平化解包（unwrapping），直接返回 `future<T>` 而不是 `future<future<T>>`**！这使得全异步调用链的书写极为清爽自然，如下代码清单所示。

#### 代码清单 4.21 使用完全异步操作处理用户登录

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

这段代码与代码清单 4.20 几乎完全一致，唯一的区别在于各步骤调用的是 `async_` 异步版本的后端接口。延续的扁平化解包机制使得链式异步调用如同顺序执行的代码一样直观。

---

### 4.4.5 等待多个 future：`when_all`

假设你正在处理海量数据，为了加速处理，你将数据切分为多个数据块（chunk），并对每个数据块启动一个独立的异步任务进行计算。计算完成后，你需要将所有子任务的结果汇聚（gather）起来生成最终结果。在传统的 C++11 中，你可能会像下面这样编写代码：

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
                v.push_back(f.get());
            }
            return gather_results(v);
        });
}
```

在代码清单 4.22 中，为了避免阻塞调用 `process_data` 的主线程，我们启动了一个专门的后台汇总任务。然而，这个汇总任务在 `for` 循环中逐一调用 `f.get()`，这意味着汇总线程大部分时间都在阻塞等待各个子任务完成。如果有成百上千个这样的大型数据处理任务并发运行，系统将产生大量仅仅处于阻塞挂起状态的空转线程。

C++ 并发技术规范通过引入 `std::experimental::when_all` 优雅地解决了该问题。你可以将一组待等待的 future 传入 `when_all`，它会返回一个全新的合成 future：**仅当传入的所有子 future 全部变为就绪状态后，该合成 future 才会变为就绪状态**。更棒的是，这个合成 future 完全支持通过 `.then()` 注册延续函数，从而实现全流程事件驱动的无阻塞汇聚处理！

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
        results.begin(),results.end()).then(
        [](std::experimental::future<
               std::vector<std::experimental::future<ChunkResult> > > fut)
        {
            std::vector<std::experimental::future<ChunkResult> > results=
                fut.get();
            std::vector<ChunkResult> v;
            v.reserve(results.size());
            for(auto& f: results)
            {
                v.push_back(f.get()); // 此时所有子 future 均已就绪，get() 绝不会阻塞！
            }
            return gather_results(v);
        });
}
```

在代码清单 4.23 中，`when_all` 接收迭代器区间并返回一个持有所有子 future 容器的合成 future。传入延续函数的形参也是一个 ready 状态的 future；当它被调用时，所有的子 future 都已经被保证处于就绪状态，因此此时对各个子 future 调用 `f.get()` 能够立即返回结果，**绝对不会发生任何线程阻塞**！

---

### 4.4.6 使用 `when_any` 等待一组 future 中的首个完成

在另一类并发场景中，你可能同时启动了多个尝试性算法（或者向多个镜像服务器同时请求相同的数据），并且“**只要其中任何一个最先返回有效结果，就可以继续后续流程**”，其余未完成的任务则可以取消或忽略。

为了支持这种“竞赛（race）”模式，Concurrency TS 提供了 `std::experimental::when_any`。当传入的一组 future 中有**任意一个**变为就绪状态时，`when_any` 返回的合成 future 就会立刻变为就绪状态。

`when_any` 返回的结构体模板为 `std::experimental::when_any_result<Sequence>`，包含两个成员：
- `futures`：保存传入的所有原始 future 的容器；
- `index`：指示哪一个具体的 future 最先触发就绪的索引下标。

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

在这段代码中：
1. 任务被均匀分摊到多个并发任务上并行搜索；
2. 每个任务在检索时检查宽松原子标志位 `done_flag`，一旦某任务命中目标，立即置位标志位以便其他任务提前退出；
3. `when_any` 在第一个任务完成时立刻唤醒延续函数；
4. 延续函数通过 `result.index` 直接定位到最先完成的子任务 future 并获取匹配结果，随后调用 `process_value`。

---

### 4.4.7 Concurrency TS 中的闭锁与屏障

除了基于 future 的异步流水线模式，许多数值模拟、矩阵运算和多阶段批处理算法要求**一组线程在某个阶段彼此协同、分步对齐推进**。为此，Concurrency TS 引入了两类同步原语：
- **闭锁（Latch）**
- **屏障（Barrier）**

---

### 4.4.8 `std::experimental::latch`：基础闭锁

闭锁是一种**一次性（one-off）**的同步屏障。在构造闭锁对象时，你需要指定一个初始计数值（等待事件的数量）。当事件发生或某个线程完成其分配的工作后，调用 `count_down()` 将计数器减 1；等待线程调用 `wait()` 挂起等待，直到计数器递减至 0 为止。

一旦计数器降至 0，闭锁将永久处于“开启（ready）”状态，后续任何在它之上的 `wait()` 调用都将立即返回。闭锁不可重置，若需要重复同步，应使用屏障。

#### 代码清单 4.25 使用 `std::experimental::latch` 等待事件

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
                done.count_down(); // 工作完成，递减闭锁计数
                do_more_stuff();
            }));
    done.wait(); // 主线程等待全部 thread_count 个子任务完成数据生成
    process_data(data,thread_count);
}
```

请注意，`done.count_down()` 并不会阻塞工作子线程，子线程在递减计数器后可以立即继续执行其自身的 `do_more_stuff()`；而主线程的 `done.wait()` 则会精准阻塞，直到所有子任务都完成了 `make_data(i)` 的初始化阶段。此外，闭锁还提供了原子性的 `count_down_and_wait()` 成员函数，方便线程在递减计数的同时就地等待全部归零。

---

### 4.4.9 `std::experimental::barrier`：基础屏障

与一次性的闭锁不同，**屏障（Barrier）**是**可循环复用（reusable）**的同步原语，专用于协调固定数量的一组线程进行周期性分步迭代。

当一组线程协同执行算法的一个阶段时，每个线程完成该阶段后调用 `arrive_and_wait()`：
1. 线程在此处阻塞挂起；
2. 直到组内**最后一个参与线程**也调用了 `arrive_and_wait()`；
3. 此时屏障自动解除阻塞，所有线程同时被释放并齐步进入下一个计算阶段；
4. 屏障内部自动重置计数器，以便在下一个阶段继续拦截。

#### 代码清单 4.26 使用 `std::experimental::barrier` 协调线程组的分步迭代

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
                sync.arrive_and_wait(); // 屏障 1：等待本轮所有线程处理完各自的数据块
                if(i==0)
                {
                    source=combine_and_update(chunks);
                    chunks=split_into_chunks(source);
                }
                sync.arrive_and_wait(); // 屏障 2：等待线程 0 准备好下一轮的新数据块
            }
        });
    }
}
```

在代码清单 4.26 中，每个循环迭代包含两个同步点：
- 第一个屏障点确保所有线程均已完成对当前数据块的处理；
- 随后线程 0 汇总更新数据并重新切块；
- 第二个屏障点确保其他工作线程等待线程 0 准备就绪后，再同时开始新一轮的并行计算。

---

### 4.4.10 `std::experimental::flex_barrier`：灵活屏障

在代码清单 4.26 中，为了让单个线程在迭代之间执行串行阶段，我们不得不设置了两个屏障。`std::experimental::flex_barrier` 进一步增强了屏障的功能，它允许在构造时注册一个**完成阶段回调函数（Completion Function）**。

当本周期的所有参与线程均到达屏障时，系统会在**其中某一个线程**上自动执行该回调函数，执行完毕后再放行所有线程！该回调函数的返回值决定下一轮的参与线程数：
- 返回 `-1`：表示下一周期的参与线程数保持不变；
- 返回 `>= 0` 的整数：可**动态修改**下一轮同步所需的线程数！

#### 代码清单 4.27 使用 `std::experimental::flex_barrier` 提供串行处理区域并精简代码

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
            return -1; // 返回 -1 表示参与线程总数保持不变
        });

    std::vector<joining_thread> threads(num_threads);

    for(unsigned i=0;i<num_threads;++i)
    {
        threads[i]=joining_thread([&,i]{
            while(!source.empty())
            {
                chunks[i]=process(chunks[i]);
                sync.arrive_and_wait(); // 仅需单一屏障！汇合后自动执行串行汇总与分块
            }
        });
    }
}
```

使用 `flex_barrier` 的完成回调函数，原本主循环中繁琐的“两步屏障 + 线程 0 判断”被彻底消解，主循环内仅保留纯粹的并行代码和一个单一汇合点，极大提升了代码的可读性与工程鲁棒性。

---

### 第 4 章小结

在多线程并发应用程序中，同步操作是至关重要的架构基石。如果缺乏同步，线程之间完全孤立无关，程序便无法协调完成复杂的业务目标。

在第 4 章中，我们系统性地探讨了 C++ 同步并发操作的演进之路：
- 从底层的 **条件变量（`std::condition_variable`）** 配合互斥量等待特定状态改变，规避忙轮询；
- 到标准库的 **future / promise / packaged_task** 机制，优雅地处理一次性异步事件、返回值提取与跨线程异常传递；
- 借助 `<chrono>` 库的时钟（`steady_clock`）、时长（`duration`）与时间点（`time_point`）为所有阻塞操作配置高精度超时；
- 再到高级并发范式：纯函数式无锁并发、基于消息传递的 Actor 状态机架构，以及 Concurrency TS 带来的 `.then()` 延续链式调用、`when_all` / `when_any` 汇聚，以及闭锁（`latch`）与灵活屏障（`flex_barrier`）。

掌握了这些高层抽象与同步设施之后，我们自然会产生一个根本性的疑问：**这些互斥量、条件变量与 future 底层到底是如何在硬件 CPU 和内存上工作的？如果我们要编写极致高性能的无锁数据结构，底层又依赖什么保障？**

这便引出了多线程编程皇冠上的明珠——**C++ 内存模型与原子操作**。

---

# 第 5 章：C++ 内存模型与原子类型操作

### 本章核心内容

- C++ 内存模型的底层核心细节
- C++ 标准库提供的原子类型全景
- 作用于原子类型上的各类操作及其语义
- 如何利用这些原子操作在线程间建立可靠的同步与顺序约束

C++ 标准中最具里程碑意义、但绝大多数普通程序员甚至未曾留意的特性，莫过于**支持多线程的全新内存模型（Multithreading-aware Memory Model）**。

它既不是炫目的新语法糖，也不是简单的几个新标准库类，而是从语言规范层面彻底定义了计算机硬件与编译器在并发环境下的基础行为边界。如果没有这一内存模型从根本上规范底层构建块的工作方式，前几章介绍的任何并发机制（互斥锁、条件变量、future）都无法在跨平台环境下获得正确可靠的行为保证。

大多数上层应用开发者之所以很少感知到内存模型的存在，是因为：如果你始终遵循第 3 章和第 4 章的最佳实践，使用互斥量保护临界区数据，使用条件变量、future、闭锁或屏障来通知事件，那么标准库已经为你封装好了一切底层细节。只有当你开始尝试**“贴近机器底层”**、追求极致性能或构建无锁数据结构时，内存模型的精确细节才变得生死攸关。

作为一门无可替代的系统级编程语言，C++ 标准委员会的核心目标之一就是：**让开发者无需离开 C++ 去编写任何更低层次的语言（如汇编语言）**。语言必须赋予程序员足够的自由度与表达力，以便在必要时直接与底层硬件架构对话。原子类型及其操作正是这一哲学的终极体现——它们所提供的底层同步原语，在绝大多数主流 CPU 架构上都可以直接对应为一到两条精简的机器指令。

本章我们将首先建立对内存模型基础架构的认知（对象与内存位置），接着系统解析所有标准原子类型及其操作，最后深入剖析不同内存顺序（Memory Ordering）在原子操作间构建跨线程同步关系的完整语义。

---

## 5.1 内存模型基础

C++ 内存模型包含两大核心维度：
1. **基础结构维度**：涉及数据在物理内存中的布局与划分方式；
2. **并发语义维度**：涉及多线程并发访问与修改内存时的交互规则。

结构维度是并发维度的基础，尤其是在分析底层原子操作时，因此我们首先从结构维度切入：在 C++ 中，一切皆由**对象（Objects）**与**内存位置（Memory Locations）**构成。

---

### 5.1.1 对象与内存位置

C++ 程序中的所有数据均由对象组成。这里的“对象”并非单纯指面向对象语言（如 Smalltalk 或 Ruby）中那种“万物皆对象”的概念（C++ 中你无法从 `int` 派生新类，内置基本类型也没有成员函数），而是指构成 C++ 数据的最基本物理构件。C++ 标准将对象定义为：**“一块具有特定存储周期的连续存储区域（a region of storage）”**，并赋予其类型、生命周期等属性。

有些对象是基本类型（如 `int`、`float`）的简单标量值，有些则是用户自定义类的实例。某些对象（如数组、派生类实例、包含非静态数据成员的类对象）拥有子对象（sub-objects），而其他对象则没有。

无论类型为何，**一个对象必定存储在一个或多个内存位置（Memory Locations）中**。每个内存位置满足以下两者之一：
- 是一个标量类型（Scalar Type，如 `int`、`unsigned short`、指针类型 `my_class*` 等）的对象或子对象；
- 或者是一段**连续相邻的位域（Adjacent Bit Fields）**。

> [!IMPORTANT] 位域与内存位置的关键规则
> 如果在结构体中使用了位域，必须特别注意：尽管相邻的位域在语法上是不同的数据成员对象，但它们在物理上**被视为同一个内存位置**。

下图展示了一个结构体在 C++ 中如何划分为对象与内存位置：

```
+-------------------------------------------------------------------------------+
| struct my_data                                                                |
|                                                                               |
|  [ int i ]             ---> 内存位置 1 (标量 int)                             |
|  [ double d ]          ---> 内存位置 2 (标量 double)                          |
|                                                                               |
|  [ unsigned bf1 : 10 ] \                                                      |
|  [ int bf2 : 25 ]      / ---> 内存位置 3 (相邻位域 bf1 与 bf2 共享同一内存位置) |
|                                                                               |
|  [ int : 0 ] (bf3)     ---> 零长度未命名位域：强制切断前后的位域打包，自身无位置 |
|  [ int bf4 : 9 ]       ---> 内存位置 4 (被 0 长位域隔开，独占独立内存位置)    |
|                                                                               |
|  [ int i2 ]            ---> 内存位置 5 (标量 int)                             |
|  [ char c1 ]           ---> 内存位置 6 (标量 char)                            |
|  [ char c2 ]           ---> 内存位置 7 (标量 char)                            |
|  [ std::string s ]     ---> 内部包含指针、长度等多个标量子对象，占用多个内存位置 |
+-------------------------------------------------------------------------------+
```

对于内存位置，请务必牢记以下四项基本法则：
1. **每个变量都是一个对象**（包括作为其他对象数据成员的变量）；
2. **每个对象至少占用一个内存位置**；
3. **基本标量类型的变量（如 `int` 或 `char`）无论大小，精确占用一个内存位置**（即使它们在内存中紧挨着，或者是数组中的相邻元素）；
4. **相邻的位域属于同一个内存位置**（除非被零长度未命名位域显式分隔）。

---

### 5.1.2 对象、内存位置与并发

现在到了对多线程应用最为关键的核心原则：**并发安全性完全维系在内存位置之上**！

- **安全场景**：如果两个线程分别并发访问**不同的内存位置**，彼此之间绝对不会产生任何冲突，程序可以完全安全高效地并行运行；
- **只读场景**：如果两个线程并发访问**同一个内存位置**，且双方都**仅仅执行读取操作**，这也是绝对安全的，只读数据不需要任何互斥保护或同步；
- **危险场景**：如果两个线程并发访问**同一个内存位置**，且**至少有一个线程正在执行修改（写）操作**，那么必须格外小心：这里潜藏着致命的竞争条件！

为了防止在此类并发读写中产生灾难性的破坏，两个线程对该内存位置的访问之间**必须具备某种强加的执行顺序约束（Enforced Ordering）**。

确保执行顺序的方式有两种：
1. **使用互斥锁（Mutex）**：如果两个线程在访问共享内存位置之前均加锁同一个互斥量，则同一时刻只有一个线程能够进入临界区访问该内存位置，因而两次访问必定一前一后依次发生；
2. **使用原子操作的同步属性（Atomic Operations）**：通过在该内存位置（或另一个起同步标志作用的内存位置）上使用原子操作，在底层强加跨线程的先后顺序（详见 5.3 节）。

> [!CAUTION] 数据竞争（Data Race）与未定义行为（Undefined Behavior）
> 如果两个线程并发访问同一个内存位置，没有强加的顺序约束，且至少一个访问是非原子的写操作，则构成**数据竞争（Data Race）**。
> **根据 C++ 语言规范，一旦程序发生数据竞争，就会触发未定义行为（Undefined Behavior, UB）！**
> 一旦发生 UB，编译器与运行时的所有契约全部作废，整个应用程序的行为将完全失控：从静默内存损坏、计算出荒谬的数据，到程序崩溃，甚至在极端硬件驱动故障下引发物理损坏。数据竞争是多线程程序中最隐蔽、危害最大的严重缺陷，必须不惜一切代价予以根除！

避免未定义行为的另一种途径，就是将处于竞争中的内存位置直接声明为**原子类型（Atomic Type）**。虽然原子类型本身无法消除“谁先到达并修改数据”的逻辑竞争，但它能保证每次读写操作在硬件层面都是不可分割的完整操作，**彻底将程序拉回到具有良好定义行为的严谨世界中**。

---

### 5.1.3 修改顺序（Modification Orders）

在 C++ 程序中，**每个对象在其整个生命周期中，都有一个由程序中所有线程对该对象执行的所有写入操作构成的修改顺序（Modification Order）**，该顺序从对象的初始化开始。

在不同的程序运行中，由于线程调度的微观差异，这个顺序可能会有所不同；但是，**在给定的单次程序运行中，系统中的所有线程都必须对该对象的修改顺序达成绝对的一致认同！**

- 如果该对象不是原子类型，你（程序员）必须通过互斥量等手段提供足够的同步，以确保所有线程观察到的修改顺序完全一致；若不同线程看到了同一变量互相冲突的修改顺序，即构成了数据竞争；
- 如果你使用了原子类型，**C++ 编译器与硬件体系结构负责自动保证所有线程对其单变量修改顺序达成全局共识**。

这一规范直接禁止了某些激进的投机执行重排：
- 一旦某个线程读取了修改顺序中的某一个条目，该线程后续对该对象的读取操作必须返回该条目本身或修改顺序中**更晚**的值，绝不允许读回更早的旧值；
- 同一线程在该读取之后发起的写入操作，必须在修改顺序中排在所见条目**之后**；
- 在同一个线程内，跟在写入操作后面的读取操作，必须返回刚才写入的值，或者修改顺序中更晚写入的值。

> [!NOTE] 单变量修改顺序 vs 跨变量相对顺序
> 请特别注意：虽然系统中所有线程都必须对**单个对象内部**的修改顺序达成一致，但在缺乏显式同步约束的情况下，不同线程**并不一定**会对**不同对象之间**的操作相对顺序达成共识！这正是 5.3.3 节中非顺序一致性内存模型的核心研究课题。

---

## 5.2 C++ 中的原子操作与原子类型

**原子操作（Atomic Operation）是不可分割的（Indivisible）底层操作**。在整个系统中，任何线程都绝不可能观察到该操作处于“半完成（half-done）”的中间状态：它要么已经彻底完成，要么尚未开始。

如果对某个对象的读取（load）是原子的，且对该对象的所有修改（store）也是原子的，那么读取操作要么拿到该对象的初始值，要么拿到某次原子写入后的确切值，绝不会读到拼凑撕裂的无效垃圾数据。

相反，如果一个非原子操作由多个子步骤构成（例如包含多个字段的结构体赋值），其他线程就可能观察到部分成员已写入而另一部分仍为旧值的撕裂状态，从而引发数据竞争。

在 C++ 中，要获得语言级别的原子操作，绝大多数情况下必须使用 `<atomic>` 头文件中定义的**原子类型**。

---

### 5.2.1 标准原子类型

标准库中的所有原子类型均位于 `<atomic>` 头文件中。在 C++ 语言规范的定义中，**唯有作用于这些原子类型上的操作，才是真正意义上的原子操作**。

标准原子类型在底层通常直接映射到硬件平台的原子指令；但如果硬件缺少原生指令支持，标准库实现也可以在内部使用互斥锁来模拟原子性。几乎所有原子类型都提供一个核心成员函数：
```cpp
bool is_lock_free() const noexcept;
```
- `x.is_lock_free()` 返回 `true`：表示该对象的操作是直接基于底层硬件原子指令实现的，是真正的**无锁（Lock-Free）**操作；
- 返回 `false`：表示该对象在内部依赖编译器或运行时的互斥锁来模拟原子性。

这在构建高性能无锁并发系统时至关重要：如果一个原子类型内部暗中使用互斥锁模拟，那么预期的性能优势将化为泡影，甚至不如直接显式使用 `std::mutex` 来得清晰可靠。

为了在编译期就能判定原子类型是否为无锁实现，C++17 为所有原子类型引入了静态常量表达式成员：
```cpp
static constexpr bool is_always_lock_free;
```
如果原子类型 `X` 在当前编译目标支持的所有硬件配置下均保证无锁，则 `X::is_always_lock_free` 为 `true`。

此外，标准库还提供了一组编译期宏：
`ATOMIC_BOOL_LOCK_FREE`、`ATOMIC_CHAR_LOCK_FREE`、`ATOMIC_INT_LOCK_FREE`、`ATOMIC_POINTER_LOCK_FREE` 等。
它们的取值含义如下：
- `0`：该原子类型在当前平台上**从不是无锁的**；
- `1`：该原子类型是否无锁属于**运行时属性**（由 `is_lock_free()` 动态决定）；
- `2`：该原子类型在当前平台上**始终是无锁的**。

在所有标准原子类型中，**唯独 `std::atomic_flag` 在所有符合标准的平台上均被强制要求必须始终是无锁的**！基于这一保证，你可以使用 `std::atomic_flag` 构建最基础的自旋锁，并以此作为模拟其他更高级原子操作的基石。

#### 标准原子类型别名表

标准库为常见的内置标量类型和 `<cstdint>` 中的定宽整型提供了对应的原子别名：

| 原子类型别名 | 对应的类模板特化 | 说明 |
| :--- | :--- | :--- |
| `std::atomic_bool` | `std::atomic<bool>` | 原子布尔型 |
| `std::atomic_char` | `std::atomic<char>` | 原子字符型 |
| `std::atomic_int` | `std::atomic<int>` | 原子整型 |
| `std::atomic_uint` | `std::atomic<unsigned>` | 原子无符号整型 |
| `std::atomic_long` | `std::atomic<long>` | 原子长整型 |
| `std::atomic_llong` | `std::atomic<long long>` | 原子长长整型 |
| `std::atomic_size_t` | `std::atomic<std::size_t>` | 原子 `size_t` |
| `std::atomic_intptr_t`| `std::atomic<std::intptr_t>`| 原子指针宽度整数 |

> [!TIP] 现代 C++ 命名风格建议
> 在现代 C++ 代码中，直接使用类模板写法 `std::atomic<T>`（如 `std::atomic<int>`、`std::atomic<uint64_t>`）通常比旧式的 C 兼容别名（如 `atomic_int`）更加一致、清晰且符合模板编程习惯。

#### 原子类型的核心操作规律

标准原子类型在设计上有几个关键特性：
1. **不可拷贝、不可赋值**：原子类型删除了拷贝构造函数和拷贝赋值运算符（`= delete`）。因为拷贝操作涉及从一个对象读取并向另一个对象写入，这跨越了两个不同的独立对象，硬件无法以单次原子操作完成两个内存位置的协调；
2. **支持与对应内置类型的赋值与转换**：支持从非原子类型赋值（内部调用 `store()`），并支持隐式类型转换操作符转换为对应的非原子类型（内部调用 `load()`）；
3. **赋值运算符返回的是“值”而非“引用”**：常规内置类型的 `a = b` 通常返回 `a` 的引用，但原子类型的赋值运算符返回的是**被赋的新值（非原子类型的纯右值）**。如果返回原子对象的引用，外部代码为了读取该值就必须发起另一次独立的读取操作，这就会在赋值与读取之间给其他线程插足修改敞开大门，产生竞争条件；
4. **复合赋值运算返回计算后的新值，而命名成员函数返回修改前的旧值**：
   - 复合运算符（如 `+=`, `-=`, `&=`）返回**更新后的新值**；
   - 对应的命名成员函数（如 `fetch_add()`, `fetch_sub()`, `fetch_and()`）返回的是**执行操作前的原值（旧值）**。

#### 内存顺序参数（Memory Ordering Tags）

原子类型上的几乎每一个读写操作，都接受一个可选的 `std::memory_order` 枚举参数，用于精确指定所需的内存顺序语义。该枚举包含六个取值：
1. `std::memory_order_relaxed`（宽松顺序）
2. `std::memory_order_consume`（消费语义/依赖顺序）
3. `std::memory_order_acquire`（获取语义）
4. `std::memory_order_release`（释放语义）
5. `std::memory_order_acq_rel`（获取-释放双重语义）
6. `std::memory_order_seq_cst`（顺序一致性——**所有操作的默认选项**）

各类操作所允许配置的内存顺序受其物理性质约束：
- **存储（Store）操作**：可使用 `relaxed`、`release` 或 `seq_cst`；
- **加载（Load）操作**：可使用 `relaxed`、`consume`、`acquire` 或 `seq_cst`；
- **读-改-写（Read-Modify-Write, RMW）操作**：可以使用上述全部六种内存顺序。

---

### 5.2.2 `std::atomic_flag` 的操作

`std::atomic_flag` 是最简单、最基础的标准原子类型，代表一个纯粹的布尔标志位。对象仅具有两种状态：**设置（Set）** 或 **清除（Clear）**。

`std::atomic_flag` 的物理对象必须通过宏 `ATOMIC_FLAG_INIT` 进行显式初始化，初始化后其状态恒为 clear：
```cpp
std::atomic_flag f = ATOMIC_FLAG_INIT;
```
如果它具备静态存储周期（全局或静态变量），C++ 标准保证其为静态零开销初始化，不存在跨编译单元的动态初始化顺序陷阱。

初始化之后，该类型仅对外提供三个合法动作：
1. **析构**；
2. **`clear()` 成员函数**：原子地将标志位清空为 clear 状态（属于存储操作，不可配置 acquire 语义）；
3. **`test_and_set()` 成员函数**：原子地将标志位置为 set 状态，并**返回修改前的旧布尔值**（属于读-改-写 RMW 操作，可配置任意内存顺序）。

借助其极简且唯一保证无锁的特性，`std::atomic_flag` 是实现自旋锁（Spinlock Mutex）的绝佳利器：

#### 代码清单 5.1 使用 `std::atomic_flag` 实现基础自旋互斥锁

```cpp
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

#### 工作原理解析
1. 初始状态下，`flag` 为 clear。
2. 当线程调用 `lock()` 时，`test_and_set()` 原子地将 `flag` 置为 true，并返回旧值：
   - 首个到达的线程拿到的旧值为 `false`，循环条件不成立，成功获取锁；
   - 后续任何并发线程调用 `test_and_set()` 时，`flag` 已经是 true，返回的旧值也是 `true`，因而深陷 `while` 循环中高速自旋等待。
3. 当持有锁的线程调用 `unlock()` 时，`flag.clear(memory_order_release)` 将其重置为 clear，从而放行下一个自旋线程。

该自旋锁完全兼容 RAII 锁守卫模板 `std::lock_guard<spinlock_mutex>`。尽管自旋等待在激烈争用时会空转消耗 CPU，但在锁持有时间极短（几个 CPU 周期）的底层场景中，它避免了内核态线程挂起与唤醒的巨大上下文切换开销。

---

### 5.2.3 `std::atomic<bool>` 的操作

`std::atomic<bool>` 是功能更为完备的原子布尔类型。相比 `std::atomic_flag`，它支持完整的非原子 `bool` 赋值、显式读写以及强大的原子比较交换（CAS）指令。

```cpp
std::atomic<bool> b(true);
b = false; // 赋值非原子 bool，返回 false

bool x = b.load(std::memory_order_acquire); // 原子读取
b.store(true, std::memory_order_release);    // 原子写入
x = b.exchange(false, std::memory_order_acq_rel); // 原子交换新值，返回旧值
```

#### 原子比较交换：CAS（Compare-Exchange）

比较交换操作（CAS）是所有无锁并发编程的绝对基石。C++ 标准库为其提供了两个重载成员函数：
- `compare_exchange_weak()`
- `compare_exchange_strong()`

其核心操作语义为：**将原子变量的当前值与传入的“期望值（expected）”进行比较；如果两者相等，则将原子变量更新为“目标值（desired）”并返回 `true`；如果不相等，则将 expected 变量的值原子更新为当前原子变量的实际最新值，并返回 `false`**。

```cpp
bool compare_exchange_weak(T& expected, T desired,
                           std::memory_order success,
                           std::memory_order failure) noexcept;
```

#### weak 与 strong 的权衡与虚假失败

- **`compare_exchange_weak()` 可能发生虚假失败（Spurious Failure）**：即哪怕当前原子变量的值确实等于 `expected`，操作仍可能由于底层 CPU 指令集架构特性（如 ARM/PowerPC 等 LL/SC 加载链接/条件存储架构中的上下文切换、缓存失效或中断）而返回 `false`。
  因此，**`compare_exchange_weak()` 必须置于循环体中反复重试**：
  ```cpp
  bool expected = false;
  while(!b.compare_exchange_weak(expected, true) && !expected);
  ```
- **`compare_exchange_strong()` 保证无虚假失败**：当且仅当当前值与 `expected` 物理不相等时才返回 `false`。

> [!TIP] 最佳工程实践准则
> - 如果 CAS 操作本身就包含在一个由于外部业务逻辑需要不断重试的循环结构中（如无锁栈压栈操作），**应优先选用 `compare_exchange_weak()`**。在支持 LL/SC 的 RISC 架构上，`weak` 版本直接编译为简单的单次指令，而 `strong` 必须由编译器生成内层保护循环，使用 `weak` 可以消除双重循环嵌套；
> - 如果计算待存入的目标值开销极其昂贵，或者无需在循环中重试，则应选用 `compare_exchange_strong()`。

此外，CAS 允许分别针对**成功**与**失败**指定两套不同的内存顺序标签（例如成功时需要 `acquire-release` 建立同步，而失败时只需 `relaxed` 宽松读取）：
```cpp
b.compare_exchange_weak(expected, true,
    std::memory_order_acq_rel, std::memory_order_acquire);
```
请注意：失败时由于并未执行存储动作，因此失败内存顺序**绝不能**包含 `release` 或 `acq_rel`，且失败内存顺序的严格程度**绝不能高于**成功时的内存顺序。

---

### 5.2.4 `std::atomic<T*>` 的操作：指针运算

`std::atomic<T*>` 是指针类型的原子封装。除了提供通用的 `load()`, `store()`, `exchange()`, `compare_exchange_xxx()` 外，它最显著的特性是支持**原子指针算术运算**：
- `fetch_add()` 与 `+=`
- `fetch_sub()` 与 `-=`
- 前置/后置自增与自减（`++`, `--`）

```cpp
class Foo {};
Foo some_array[5];
std::atomic<Foo*> p(some_array);

Foo* x = p.fetch_add(2); // p 指向 some_array[2]，但返回的是原地址 &some_array[0]
assert(x == some_array);
assert(p.load() == &some_array[2]);

x = (p -= 1);            // p 指向 some_array[1]，复合运算符返回新地址 &some_array[1]
assert(x == &some_array[1]);
```

> [!NOTE] 步长与指向类型对齐
> `fetch_add(n)` 执行的是符合 C++ 标准语义的指针算术：实际内存地址的偏移量等于 `n * sizeof(T)` 个字节，而非 `n` 个字节。`fetch_add()` 同样属于原子读-改-写（RMW）操作，并支持指定特定的内存顺序参数。

---

### 5.2.5 标准原子整型类型的操作

对于标准整数类型的原子特化（如 `std::atomic<int>`, `std::atomic<long long>` 等），C++ 标准库提供了最为丰富齐备的原子算术与位运算操作集：
- 算术加减：`fetch_add()`, `fetch_sub()`, `+=`, `-=`
- 位逻辑运算：`fetch_and()`, `fetch_or()`, `fetch_xor()`, `&=`, `|=`, `^=`
- 自增自减：`++`, `--`

这些操作通常直接映射到底层 CPU 的硬件原子总线指令（如 x86 的 `LOCK XADD`, `LOCK BTS` 等）。标准库未提供乘法、除法及位移的原子运算，因为原子整数在多线程中几乎全部用于**计数器（Counters）**或**状态位掩码（Bitmasks）**；若确实需要复合计算，可借助 `compare_exchange_weak` 循环轻松模拟。

---

### 5.2.6 `std::atomic<>` 主类模板

除了标准提供的特化版本，开发者还可以使用 `std::atomic<UDT>` 为**用户自定义类型（User-Defined Types, UDT）**构建原子包装。

然而，能够被 `std::atomic<>` 包装的自定义类型必须严格满足以下限制条件：
1. **类型必须是平凡可复制的（Trivially Copyable）**：类型不能有虚函数，不能有虚基类，其拷贝构造函数、移动构造函数、拷贝赋值运算符、移动赋值运算符与析构函数必须全部是编译器默认生成的（或显式 `= default`）；其所有非静态数据成员和基类也必须都是平凡可复制的。这确保了编译器可以使用 `std::memcpy()` 级别的底层逐字节位拷贝进行数据传输；
2. **比较交换采用逐位比较（Bitwise Comparison，如 `memcmp`）**：CAS 操作不会调用用户可能重载的 `operator==`，而是直接按位逐字节比较。因此，如果结构体中包含未初始化的内存对齐填充字节（Padding Bits），可能导致哪怕逻辑字段值相等，CAS 操作也会因填充位的不一致而发生失败。

#### 为什么会有这些严苛限制？
如果允许用户自定义的赋值运算符或复杂的非平凡类型参与原子包装，编译器在执行 `store()` 时就必须在临界区内部调用用户提供的未知外部代码，这不仅会直接违背“绝不在持有锁期间调用外部用户代码”的防死锁准则，而且编译器将彻底丧失将其直接优化为单次 CPU 原子总线指令的机会。

#### 原子操作全景支持汇总

下表完整展示了各类标准原子类型所支持的成员操作：

| 成员操作 | `atomic_flag` | `atomic<bool>` | `atomic<T*>` | `atomic<整型>` | `atomic<自定义类型>` |
| :--- | :---: | :---: | :---: | :---: | :---: |
| `test_and_set()` / `clear()` | **支持** | — | — | — | — |
| `is_lock_free()` | — | **支持** | **支持** | **支持** | **支持** |
| `load()` / `store()` | — | **支持** | **支持** | **支持** | **支持** |
| `exchange()` | — | **支持** | **支持** | **支持** | **支持** |
| `compare_exchange_weak/strong()` | — | **支持** | **支持** | **支持** | **支持** |
| `fetch_add()` / `fetch_sub()` / `+=` / `-=` | — | — | **支持** | **支持** | — |
| `fetch_and()` / `fetch_or()` / `fetch_xor()` | — | — | — | **支持** | — |
| `++` / `--` 自增自减 | — | — | **支持** | **支持** | — |

---

### 5.2.7 原子操作的自由函数

除了上述面向对象的成员函数外，C++ 标准库还为所有原子操作提供了对应的**非成员自由函数（Free Functions）**（例如 `std::atomic_load()`, `std::atomic_store()`, `std::atomic_fetch_add()` 等）。

这些自由函数主要为了实现与 C 语言的 ABI 及 API 兼容（对应 C11 的 `<stdatomic.h>`），并且第一个参数统一接收指向目标原子对象的指针：
```cpp
std::atomic<int> a(0);
std::atomic_store(&a, 10);
int val = std::atomic_load_explicit(&a, std::memory_order_acquire);
```

#### 特别支持：`std::shared_ptr` 的原子自由函数

按照原则，只有原子类型才支持原子操作。然而，由于智能指针在多线程架构中的核心地位，C++ 标准委员会打破常规，在 `<memory>` 头文件中为非原子的 `std::shared_ptr<T>` 专门提供了一组原子自由函数：
- `std::atomic_load(&p)`
- `std::atomic_store(&p, local)`
- `std::atomic_exchange(&p, new_ptr)`
- `std::atomic_compare_exchange_weak(&p, ...)`

> [!WARNING] 跨线程共享 `std::shared_ptr` 的安全隐患
> 虽然 `std::shared_ptr` 的引用计数增减是线程安全的，但**指针对象本身的读写并不是原子的**！如果一个线程正在读取全局共享指针 `p`，而另一个线程正在重置 `p`，且未使用上述原子自由函数，将直接构成严重的数据竞争与未定义行为！
> 为彻底根除遗漏调用自由函数的风险，C++20 正式标准化了 `std::atomic<std::shared_ptr<T>>`（此前在 Concurrency TS 中以 `std::experimental::atomic_shared_ptr<T>` 提供），强烈建议在新项目中直接使用该专属原子智能指针类型。

---

## 5.3 同步操作与强制顺序

为了真正理解原子操作如何为非原子业务数据构建安全屏障，我们考虑一个最基础的并发协作模型：线程 1 生产数据，线程 2 消费数据。

#### 代码清单 5.2 从不同线程读写变量（使用原子标志位建立同步）

```cpp
#include <vector>
#include <atomic>
#include <iostream>

std::vector<int> data;
std::atomic<bool> data_ready(false);

void reader_thread()
{
    while(!data_ready.load())
    {
        std::this_thread::sleep_for(std::chrono::milliseconds(1));
    }
    std::cout<<"The answer="<<data[0]<<"
";
}

void writer_thread()
{
    data.push_back(42);
    data_ready=true;
}
```

在代码清单 5.2 中，`data` 是一个完全非原子的普通 `std::vector<int>`。按常理，多线程无锁并发访问非原子容器会导致数据竞争；但在此处，代码运行绝对安全！

其背后的根本原因在于：**通过对原子变量 `data_ready` 的读写，我们在底层内存模型中成功构建了跨线程的“先行发生（happens-before）”与“同步（synchronizes-with）”偏序关系链**：
1. 写入 `data` **先行发生于** 写入标志位 `data_ready = true`（同一线程内的指令顺序）；
2. 标志位写入 `true` **同步于** 读取线程中读取到 `true` 的那一刻；
3. 读取到 `true` **先行发生于** 后续读取 `data[0]`。
4. 由于先行发生关系具备严格的传递性，**写入 `data` 绝对先行发生于读取 `data[0]`**！

下面我们正式拆解这一机制的数学逻辑基石。

---

### 5.3.1 同步关系：`synchronizes-with`

`synchronizes-with`（同步于）关系是**仅能在原子操作之间建立的跨线程直接联系**。

其经典定义为：
**在一个变量 $x$ 上标有合适内存顺序标签的原子写操作 $W$，与另一个线程中读取到该写入值（或同一释放序列中的值）的原子读操作 $R$ 之间，建立 `synchronizes-with` 关系（即 $W$ 同步于 $R$）。**

只要双方配置了合适的标签（默认的 `memory_order_seq_cst` 或配对的 `release-acquire`），并且读操作确实观测到了写操作存入的值，这条横跨线程的因果通道便正式打通。

---

### 5.3.2 先行发生关系：`happens-before`

`happens-before`（先行发生）是衡量 C++ 程序操作可见性与因果依赖的最核心概念：它定义了“哪一个操作产生的影响能够被另一个操作所观测到”。

1. **单线程内部的程序序：`sequenced-before`**
   如果操作 A 在源代码逻辑上排在操作 B 之前，则在单线程内部，A **先序发生于（sequenced-before）** B，进而 A **先行发生于（happens-before）** B。
   *例外：同一表达式内部的各子表达式或函数调用的不同实参之间的求值顺序是未指定的（Unspecified），例如 `foo(get_num(), get_num())`，它们之间不存在先序发生关系。*

#### 代码清单 5.3 函数调用实参求值顺序未指定示例

```cpp
#include <iostream>

void foo(int a,int b)
{
    std::cout<<a<<","<<b<<std::endl;
}

int get_num()
{
    static int i=0;
    return ++i;
}

int main()
{
    foo(get_num(),get_num()); // 调用顺序未指定：可能输出 1,2 也可能输出 2,1
}
```

2. **跨线程的先行发生：`inter-thread happens-before`**
   - 如果线程 1 中的操作 A **同步于（synchronizes-with）** 线程 2 中的操作 B，则 A **跨线程先行发生于** B；
   - 跨线程先行发生具有**传递性**：若 A 跨线程先行发生于 B，且 B 跨线程先行发生于 C，则 A 跨线程先行发生于 C；
   - 它能够与单线程程序序无缝拼接：**若 A sequenced-before B，且 B inter-thread happens-before C，则 A happens-before C**！

正是这条拼接规则，构成了多线程并发安全通信的核心公理：我们在线程 1 中对普通非原子业务变量的一系列任意修改（A），只要先序发生于一个原子同步写（B），并且该原子写与线程 2 中的原子读（C）建立了同步，那么线程 1 中的所有前置业务修改（A）就全都在内存模型层面严格先行发生于线程 2 在读取原子标志位之后的后续业务操作！

---

### 5.3.3 原子操作的内存顺序

C++ 标准库提供的六种内存顺序枚举，在本质上映射为三种核心内存模型：
1. **顺序一致性模型（Sequentially Consistent Ordering）**：`memory_order_seq_cst`
2. **获取-释放模型（Acquire-Release Ordering）**：`memory_order_acquire`, `memory_order_release`, `memory_order_acq_rel`, `memory_order_consume`
3. **宽松模型（Relaxed Ordering）**：`memory_order_relaxed`

---

#### 1. 顺序一致性：`memory_order_seq_cst`

顺序一致性是所有原子操作的默认策略。它向程序员提供了一个最为符合人类直觉的抽象视角：**多线程并发执行的效果，等同于所有线程中的所有操作按照某种单一的全局全序（Total Global Order）在一个单 CPU 核心上交错串行执行**！

在顺序一致性下：
- 系统中所有线程看到的全局操作先后顺序是**绝对一致**的；
- 编译器与 CPU 硬件严禁跨越原子操作重排指令。

#### 代码清单 5.4 顺序一致性强加全局全序保证断言绝不触发

```cpp
#include <atomic>
#include <thread>
#include <assert.h>

std::atomic<bool> x,y;
std::atomic<int> z;

void write_x()
{
    x.store(true,std::memory_order_seq_cst);
}

void write_y()
{
    y.store(true,std::memory_order_seq_cst);
}

void read_x_then_y()
{
    while(!x.load(std::memory_order_seq_cst));
    if(y.load(std::memory_order_seq_cst))
        ++z;
}

void read_y_then_x()
{
    while(!y.load(std::memory_order_seq_cst));
    if(x.load(std::memory_order_seq_cst))
        ++z;
}

int main()
{
    x=false;
    y=false;
    z=0;
    std::thread a(write_x);
    std::thread b(write_y);
    std::thread c(read_x_then_y);
    std::thread d(read_y_then_x);
    a.join();
    b.join();
    c.join();
    d.join();
    assert(z.load()!=0); // 此断言绝不可能触发！
}
```

在代码清单 5.4 中，`assert(z.load() != 0)` 绝不可能失败：
因为存在一个唯一的全局全序。要么 `write_x` 在全序中排在 `write_y` 前面，要么反之：
- 如果 `write_x` 先发生，那么在 `read_y_then_x` 观测到 `y == true` 的那一刻，`x` 必定早已被写入 `true`，因而该线程中的 `++z` 必定执行；
- 对称地，如果 `write_y` 先发生，则 `read_x_then_y` 中的 `++z` 必定执行。
因此 `z` 最终的值只能是 1 或 2，绝不可能是 0。

> [!NOTE] 顺序一致性的代价
> 顺序一致性极易推演且最不易出错，但它也是最昂贵的。在弱内存序的多核系统（如 ARM、POWER）上，维护全局全序需要硬件在核间广播昂贵的内存屏障总线锁，产生可观的延迟惩罚。在 x86 架构上，顺序一致性读操作开销几乎为零，但写操作需要额外的锁总线指令（如 `MFENCE` 或带锁指令）。

---

#### 2. 宽松模型：`memory_order_relaxed`

一旦离开顺序一致性的安全区，首要打破的认知就是：**不存在所谓的“全局单一时间线”！不同线程观察相同事件的相对先后顺序完全可能是相互冲突的！**

在 `memory_order_relaxed` 下：
- 操作不产生任何跨线程的 `synchronizes-with` 关系；
- 单个原子变量内部仍然保证单一修改顺序（同一线程对同一变量不会读到历史旧值）；
- **不同变量之间的读写操作在各个线程看来可以任意乱序重排！**

#### 代码清单 5.5 宽松操作缺乏变量间顺序约束（断言可能触发）

```cpp
#include <atomic>
#include <thread>
#include <assert.h>

std::atomic<bool> x,y;
std::atomic<int> z;

void write_x_then_y()
{
    x.store(true,std::memory_order_relaxed);
    y.store(true,std::memory_order_relaxed);
}

void read_y_then_x()
{
    while(!y.load(std::memory_order_relaxed));
    if(x.load(std::memory_order_relaxed))
        ++z;
}

int main()
{
    x=false;
    y=false;
    z=0;
    std::thread a(write_x_then_y);
    std::thread b(read_y_then_x);
    a.join();
    b.join();
    assert(z.load()!=0); // 警告：此断言完全可能触发！
}
```

在代码清单 5.5 中，由于 `x` 和 `y` 的操作均标记为 `relaxed`，虽然在线程 a 内部 `x` 先写而 `y` 后写，但在硬件缓存一致性传播过程中，`y` 的新值可能比 `x` 的新值更早抵达线程 b 所在的 CPU 核心缓存！因此，线程 b 可能在观察到 `y == true` 之后，读取 `x` 时却依然拿到旧值 `false`，从而导致 `z == 0`，断言失败！

#### 深入理解宽松顺序：“小隔间记事本先生”趣味模型

为了形象化理解宽松顺序，我们可以把每个原子变量想象为**坐在独立隔间里的一位记录员先生**，手里拿一本记事本：
- 当某个线程要求写入新值时，记录员将该数值追加到记事本页面的**最底部**；
- 当某个线程打电话向他询问数值时，他会从笔记本上念出一个数字。一旦他向某特定线程念过某个位置的数字，后续该线程再次致电时，他只会念出**同一位置或更靠后**的数字，绝不会念出更靠前的旧数字；
- 然而，每个隔间之间没有任何电话线联系！记录员 X 和记录员 Y 彼此完全不清楚对方笔记本的更新进度！
- 因此，线程 a 虽然依次给 X 和 Y 打电话写入了 `true`，但当线程 b 致电询问时，记录员 Y 翻到了最新页告诉你 `true`，而记录员 X 可能还停留在旧页面悠闲地回答你 `false`！

#### 代码清单 5.6 多个线程上的宽松原子操作交互分析

```cpp
#include <thread>
#include <atomic>
#include <iostream>

std::atomic<int> x(0),y(0),z(0);
std::atomic<bool> go(false);
unsigned const loop_count=10;

struct read_values
{
    int x,y,z;
};

read_values values1[loop_count];
read_values values2[loop_count];
read_values values3[loop_count];
read_values values4[loop_count];
read_values values5[loop_count];

void increment(std::atomic<int>* var_to_inc,read_values* values)
{
    while(!go)
        std::this_thread::yield();
    for(unsigned i=0;i<loop_count;++i)
    {
        values[i].x=x.load(std::memory_order_relaxed);
        values[i].y=y.load(std::memory_order_relaxed);
        values[i].z=z.load(std::memory_order_relaxed);
        var_to_inc->store(i+1,std::memory_order_relaxed);
        std::this_thread::yield();
    }
}

void read_vals(read_values* values)
{
    while(!go)
        std::this_thread::yield();
    for(unsigned i=0;i<loop_count;++i)
    {
        values[i].x=x.load(std::memory_order_relaxed);
        values[i].y=y.load(std::memory_order_relaxed);
        values[i].z=z.load(std::memory_order_relaxed);
        std::this_thread::yield();
    }
}
```

在此代码中，多个线程并发自增并读取三个宽松原子变量。由于各个 CPU 核心缓存刷新节奏的差异，不同观察者线程打印出的 `(x, y, z)` 三元组序列中，各个变量的相对增长快慢可能呈现出完全不相干的交叉排列，这充分展现了宽松原子操作的极高自由度与复杂性。

---

#### 3. 获取-释放模型：`Acquire-Release`

获取-释放顺序是并发工程中**性价比最高的内存模型**：它不强求开销巨大的全局全序，而是在**执行 release 写入的线程与执行 acquire 读取的线程之间建立精准的成对同步联系（Pairwise Synchronization）**。

- **Release 操作（`memory_order_release`）**：针对存储操作。它保证在当前线程中，**所有排在 release 写之前的内存读写指令，都绝不可能被重排到该 release 写之后**！
- **Acquire 操作（`memory_order_acquire`）**：针对加载操作。它保证在当前线程中，**所有排在 acquire 读之后的内存读写指令，都绝不可能被重排到该 acquire 读之前**！
- **Acq-Rel 操作（`memory_order_acq_rel`）**：针对读-改-写（RMW）操作，同时兼备获取与释放的双向屏障语义。

> [!IMPORTANT] 成对同步的生效条件
> 当线程 A 使用 `memory_order_release` 写入变量 $y$，且线程 B 使用 `memory_order_acquire` 读取同一个变量 $y$ 并**成功观测到了线程 A 写入的值（或后续释放序列的值）**时，线程 A 中该 release 之前发生的所有内存操作（包括普通非原子业务数据的修改），对线程 B 在该 acquire 之后执行的操作**全局完全可见**！

#### 代码清单 5.7 获取-释放操作并不等同于全局全序

```cpp
#include <atomic>
#include <thread>
#include <assert.h>

std::atomic<bool> x,y;
std::atomic<int> z;

void write_x()
{
    x.store(true,std::memory_order_release);
}

void write_y()
{
    y.store(true,std::memory_order_release);
}

void read_x_then_y()
{
    while(!x.load(std::memory_order_acquire));
    if(y.load(std::memory_order_acquire))
        ++z;
}

void read_y_then_x()
{
    while(!y.load(std::memory_order_acquire));
    if(x.load(std::memory_order_acquire))
        ++z;
}

int main()
{
    x=false;
    y=false;
    z=0;
    std::thread a(write_x);
    std::thread b(write_y);
    std::thread c(read_x_then_y);
    std::thread d(read_y_then_x);
    a.join();
    b.join();
    c.join();
    d.join();
    assert(z.load()!=0); // 警告：该断言依然可能触发！
}
```

在代码清单 5.7 中，由于 `write_x` 和 `write_y` 来自两个互不相干的独立线程，获取-释放语义仅能约束单个变量与读取者的因果链，无法像顺序一致性那样强行规定 `x` 和 `y` 之间谁先谁后。因此，两个读取线程依然可能分别先看到各自的变量为 true，但看到对方的变量为 false，导致 `z` 最终仍可能为 0。

#### 获取-释放的真正威力：约束宽松与非原子变量的可见性

为了释放 acquire-release 的威力，必须将两组操作在同一线程内部串联起来：

#### 代码清单 5.8 获取-释放操作可以对宽松操作施加顺序约束

```cpp
#include <atomic>
#include <thread>
#include <assert.h>

std::atomic<bool> x,y;
std::atomic<int> z;

void write_x_then_y()
{
    x.store(true,std::memory_order_relaxed);
    y.store(true,std::memory_order_release); // 建立 Release 屏障
}

void read_y_then_x()
{
    while(!y.load(std::memory_order_acquire)); // 建立 Acquire 屏障
    if(x.load(std::memory_order_relaxed))
        ++z;
}

int main()
{
    x=false;
    y=false;
    z=0;
    std::thread a(write_x_then_y);
    std::thread b(read_y_then_x);
    a.join();
    b.join();
    assert(z.load()!=0); // 断言绝对不会触发！
}
```

在代码清单 5.8 中：
1. `x.store(relaxed)` 先序发生于 `y.store(release)`；
2. 当 `y.load(acquire)` 成功读取到 `true` 时，双方建立 `synchronizes-with` 同步关系；
3. 同步关系打通了因果桥梁，使得 `x.store` 先行发生于 `x.load`；
4. 因此，即便 `x` 本身的操作标记为 `relaxed`，它的最新值 `true` 也**被绝对强制对线程 b 可见**，断言永远成立！

#### 获取-释放的传递性同步

获取-释放关系具备优良的传递性，即使中间线程自身完全不接触实际业务数据，也能通过中继变量将可见性沿着链条安全传递：

#### 代码清单 5.9 使用获取-释放顺序实现跨线程传递同步

```cpp
std::atomic<int> data[5];
std::atomic<bool> sync1(false),sync2(false);

void thread_1()
{
    data[0].store(42,std::memory_order_relaxed);
    data[1].store(97,std::memory_order_relaxed);
    data[2].store(17,std::memory_order_relaxed);
    data[3].store(-141,std::memory_order_relaxed);
    data[4].store(2003,std::memory_order_relaxed);
    sync1.store(true,std::memory_order_release); // 同步点 1
}

void thread_2()
{
    while(!sync1.load(std::memory_order_acquire)); // 接收同步 1
    sync2.store(true,std::memory_order_release);   // 发出同步 2
}

void thread_3()
{
    while(!sync2.load(std::memory_order_acquire)); // 接收同步 2
    assert(data[0].load(std::memory_order_relaxed)==42);
    assert(data[1].load(std::memory_order_relaxed)==97);
    assert(data[2].load(std::memory_order_relaxed)==17);
    assert(data[3].load(std::memory_order_relaxed)==-141);
    assert(data[4].load(std::memory_order_relaxed)==2003);
}
```

借由 `thread_1 -> sync1 -> thread_2 -> sync2 -> thread_3` 的两级同步中继，`thread_3` 能够以 100% 的确定性读取到 `thread_1` 写入的全部五个非原子数组元素。

此外，如果使用带有 `memory_order_acq_rel` 的读-改-写操作（如 CAS），可以将两个同步变量合并为一个：
```cpp
std::atomic<int> sync(0);

void thread_1() {
    sync.store(1, std::memory_order_release);
}

void thread_2() {
    int expected = 1;
    while(!sync.compare_exchange_strong(expected, 2, std::memory_order_acq_rel))
        expected = 1;
}

void thread_3() {
    while(sync.load(std::memory_order_acquire) < 2);
}
```

---

#### 4. 数据依赖与 `memory_order_consume`

`memory_order_consume` 是获取-释放模型的一个极度精细化的特殊分支。常规的 `memory_order_acquire` 会强制让后续的**所有**内存读取都同步可见，而 `memory_order_consume` 仅强制同步那些**在代码数据流上直接依赖于该加载结果的表达式（carries-a-dependency-to）**。

其典型用途在于通过原子指针发布只读数据结构：
```cpp
struct X { int i; std::string s; };
std::atomic<X*> p;
std::atomic<int> a;

void create_x() {
    X* x = new X;
    x->i = 42;
    x->s = "hello";
    a.store(99, std::memory_order_relaxed);
    p.store(x, std::memory_order_release);
}

void use_x() {
    X* x;
    while(!(x = p.load(std::memory_order_consume)));
    assert(x->i == 42); // 安全：x->i 依赖于 x 的值
    assert(x->s == "hello"); // 安全
    // 警告：a 并不依赖于 x，因此 a.load() 可能依然读不到 99！
}
```

> [!WARNING] C++17 官方废弃建议
> 虽然 `consume` 在理论上可以在某些 RISC 硬件架构（如 ARM/POWER）上消除硬件内存屏障指令的开销，但在实际编译器实现中，跟踪精准的数据依赖流极其困难且极易引发编译器优化缺陷。因此，**C++17 标准明确建议不要在实际生产代码中使用 `memory_order_consume`**，统一使用 `memory_order_acquire` 代替。为了在代码中显式打破数据依赖以允许编译器优化寄存器缓存，C++ 还提供了 `std::kill_dependency()` 辅助函数模板。

---

### 5.3.4 释放序列（Release Sequences）与 synchronizes-with

在现实的多线程系统（如多消费者任务队列）中，数据往往由一个生产者线程写入，随后由多个消费者线程通过连续的原子计数器操作（如 `fetch_sub`）进行消费分配。

为了在这一复杂链条中依然维持严谨的跨线程同步，C++ 内存模型定义了**释放序列（Release Sequence）**规则：
**在一个变量 $x$ 上执行的 release 写入操作 $W$ 之后，如果在 $x$ 上紧接着发生了一连串由任意线程执行的原子读-改-写（RMW）操作（无论这些 RMW 操作的内存顺序多么宽松，哪怕是 `relaxed`！），那么这整条操作链便构成了一个属于 $W$ 的释放序列！任何后续使用 acquire 语义读取该释放序列中任何一个节点的线程，都将直接与初始写入操作 $W$ 建立完整的 `synchronizes-with` 同步！**

#### 代码清单 5.11 多消费者队列中基于释放序列的安全读取

```cpp
#include <atomic>
#include <thread>
#include <vector>

std::vector<int> queue_data;
std::atomic<int> count;

void populate_queue()
{
    unsigned const number_of_items=20;
    queue_data.clear();
    for(unsigned i=0;i<number_of_items;++i)
    {
        queue_data.push_back(i);
    }
    count.store(number_of_items,std::memory_order_release); // 初始 release 写入
}

void consume_queue_items()
{
    while(true)
    {
        int item_index;
        if((item_index=count.fetch_sub(1,std::memory_order_acquire))<=0)
        {
            wait_for_more_items();
            continue;
        }
        process(queue_data[item_index-1]); // 安全读取非原子业务数据！
    }
}

int main()
{
    std::thread a(populate_queue);
    std::thread b(consume_queue_items);
    std::thread c(consume_queue_items);
    a.join();
    b.join();
    c.join();
}
```

```
[ populate_queue ]
   写入 queue_data
   count.store(release) 
         |
         | (释放序列建立)
         v
[ consume_queue 1 ]
   count.fetch_sub(acquire) ---> 成功获取数据块索引，同步建立，安全消费 queue_data
         |
         | (释放序列自动沿 RMW 链条延续下传)
         v
[ consume_queue 2 ]
   count.fetch_sub(acquire) ---> 观测到的是上一个消费者写入的值，但仍因释放序列
                                 与初始 store(release) 建立同步，安全消费 queue_data！
```

如果没有释放序列法则，第二个消费者线程在读取计数器时，观测到的是第一个消费者修改后的值而非初始生产者的写入值，因而将无法与生产者建立同步，访问 `queue_data` 就会沦为非法的数据竞争。正是释放序列的制度保障，使得多生产者-多消费者无锁队列在 C++ 体系中成为可能。

---

### 5.3.5 内存栅栏（Memory Fences）

原子操作库如果缺少**内存栅栏（Memory Fences，又称内存屏障 Memory Barriers）**，就称不上完备。

栅栏是不直接修改或读取任何业务数据的独立原子指令：
```cpp
std::atomic_thread_fence(std::memory_order_acquire);
std::atomic_thread_fence(std::memory_order_release);
```
它的本质是在当前线程的代码执行流中插入一条**绝对不可逾越的隔离线**，用于限制其前后的其他常规原子操作或非原子操作的重排。

#### 代码清单 5.12 使用内存栅栏对宽松操作强加顺序约束

```cpp
#include <atomic>
#include <thread>
#include <assert.h>

std::atomic<bool> x,y;
std::atomic<int> z;

void write_x_then_y()
{
    x.store(true,std::memory_order_relaxed);
    std::atomic_thread_fence(std::memory_order_release); // 释放栅栏
    y.store(true,std::memory_order_relaxed);
}

void read_y_then_x()
{
    while(!y.load(std::memory_order_relaxed));
    std::atomic_thread_fence(std::memory_order_acquire); // 获取栅栏
    if(x.load(std::memory_order_relaxed))
        ++z;
}

int main()
{
    x=false;
    y=false;
    z=0;
    std::thread a(write_x_then_y);
    std::thread b(read_y_then_x);
    a.join();
    b.join();
    assert(z.load()!=0); // 断言必定成立！
}
```

通过在两个宽松写之间插入 `release` 栅栏，并在两个宽松读之间插入 `acquire` 栅栏，两个栅栏在底层成功建立了同步，其效果等同于将 `y` 的写操作升级为 `release` 并将 `y` 的读操作升级为 `acquire`。

---

### 5.3.6 用原子操作对非原子操作排序

原子操作对并发系统的最大贡献，在于**能够作为安全锚点，为非原子的常规业务数据建立坚固的顺序与可见性保障**。

#### 代码清单 5.13 强制非原子操作的跨线程可见性

```cpp
#include <atomic>
#include <thread>
#include <assert.h>

bool x=false; // 普通非原子变量
std::atomic<bool> y;
std::atomic<int> z;

void write_x_then_y()
{
    x=true; // 普通写
    std::atomic_thread_fence(std::memory_order_release);
    y.store(true,std::memory_order_relaxed);
}

void read_y_then_x()
{
    while(!y.load(std::memory_order_relaxed));
    std::atomic_thread_fence(std::memory_order_acquire);
    if(x) // 普通读：安全可见！
        ++z;
}

int main()
{
    x=false;
    y=false;
    z=0;
    std::thread a(write_x_then_y);
    std::thread b(read_y_then_x);
    a.join();
    b.join();
    assert(z.load()!=0); // 断言绝不会触发！
}
```

---

### 5.3.7 对非原子操作排序与高阶同步设施规范

回顾第 5.1 节中的自旋锁（代码清单 5.1）：
- `lock()` 内部是一个带有 `memory_order_acquire` 的 `test_and_set()` 循环；
- `unlock()` 是一个带有 `memory_order_release` 的 `clear()` 调用。

当线程 1 解锁时，临界区内对非原子数据的所有修改均先序发生于 `clear()`（release 操作）；当线程 2 成功加锁时，其 `test_and_set()`（acquire 操作）与线程 1 的 `clear()` 建立同步！因此，临界区内的所有业务修改对线程 2 完全可见。

这揭示了一个至高哲理：**C++ 标准库中所有的高层并发设施，其内部本质上都是基于原子内存模型的 acquire-release 或 sequential consistency 同步语义构建的！**

下表系统总结了 C++ 标准多线程组件在底层所确立的 `synchronizes-with` 契约：

| 标准组件 | 触发同步的操作 (Release 端) | 建立同步的操作 (Acquire 端) | 同步保证的可见性效果 |
| :--- | :--- | :--- | :--- |
| **`std::thread`** | 构造函数的完成 | 新线程入口函数的启动 | 启动新线程前主线程准备的数据在新线程中完全可见 |
| **`std::thread`** | 线程执行体函数的返回退出 | 主线程调用 `t.join()` 的成功返回 | 子线程计算产出的所有数据在 `join()` 之后完全可见 |
| **`std::mutex` 系列** | `m.unlock()` 的调用 | 紧随其后的 `m.lock()` 或成功的 `try_lock()` | 前一持有者在临界区内的所有修改对后一获取者完全可见 |
| **`std::promise` & `future`** | `p.set_value()` 或 `p.set_exception()` 的完成 | `f.get()` 或 `f.wait()` 成功返回就绪 | 写入 promise 的值及此前所有计算结果对 future 读取者完全可见 |
| **`std::promise` 析构** | 未设置值即提前析构（存入 broken_promise 异常） | `f.get()` 抛出 `std::future_error` 异常 | 异常状态安全传递 |
| **`std::packaged_task`** | 任务调用运算符 `task()` 执行完成 | `f.get()` 或 `f.wait()` 成功返回 | 包装任务内部的执行结果与副作用对 future 完全可见 |
| **`std::async`** | 异步工作线程任务执行完毕退出 | `f.get()` 或 `f.wait()` 成功返回 | 异步计算结果及相关内存写入完全同步可见 |
| **Concurrency TS 延续** | 异步状态变为就绪的事件 | 调度触发绑定的延续函数 `then()` 的入口 | 上游异步计算产生的所有数据在延续函数内部完全可见 |
| **`std::experimental::latch`** | 导致计数器降至 0 的 `count_down()` 调用 | `wait()` 或 `count_down_and_wait()` 阻塞解除返回 | 所有到达闭锁的工作线程所做的数据修改对等待者完全可见 |
| **`std::experimental::barrier`** | 各参与线程调用 `arrive_and_wait()` | 所有线程齐步跨越屏障解除阻塞返回 | 本轮迭代产生的所有计算数据在下一轮迭代开始前完全可见 |
| **`std::experimental::flex_barrier`** | 所有线程到达屏障 | 完成阶段回调函数（Completion Function）的触发执行 | 所有线程数据对完成回调函数可见；回调修改对下一轮线程可见 |
| **`std::condition_variable`** | *自身不直接提供跨线程同步* | *自身不直接提供跨线程同步* | **条件变量本身仅是避免忙轮询的内核唤醒优化，所有内存同步均由关联的互斥锁提供！** |

---

### 本章小结

在现代多核计算机体系结构中，理解 C++ 内存模型是迈向高级并发系统设计的必由之路：
1. **结构基础**：程序由**对象**与**内存位置**构成，数据竞争的本质是多个线程未受同步约束并发修改同一内存位置；消除未定义行为的唯一法则是使用互斥锁或原子类型强加执行顺序；
2. **原子类型全家桶**：从唯一保证无锁的 `std::atomic_flag`，到全功能的 `std::atomic<bool>`、指针特化 `std::atomic<T*>`、整型特化 `std::atomic<int>`，再到适用于平凡可复制自定义类型的通用模板 `std::atomic<UDT>`，构成了丰富而强大的原子基石；
3. **核心操作精髓**：深入掌握 `load`、`store`、`exchange` 以及无锁编程的核心引擎——**原子比较交换（CAS, `compare_exchange_weak / strong`）**与虚假失败处理；
4. **内存顺序三大流派**：
   - **顺序一致性（`memory_order_seq_cst`）**：默认且最直观的全局全序，适合通用场景；
   - **宽松模型（`memory_order_relaxed`）**：仅保障单变量修改顺序，无跨变量顺序约束，性能最高但需极度谨慎；
   - **获取-释放模型（`Acquire-Release`）**：在配对读写间建立定向因果同步桥梁，具备传递性，性价比极高；
5. **高阶理论与屏障**：释放序列（Release Sequences）支撑了多消费者队列的无锁读写；内存栅栏（Fences）为非原子操作提供自由排序约束；标准库中从 `std::thread` 到 `future` 的所有上层同步机制均基于本章内存模型提供严格的可见性保证。

在接下来的第 6 章和第 7 章中，我们将把这些原子操作与内存模型理论全面付诸实践，深入探讨如何从零设计工业级的高性能**基于锁的并发数据结构**与前沿的**无锁（Lock-Free）并发数据结构**！
