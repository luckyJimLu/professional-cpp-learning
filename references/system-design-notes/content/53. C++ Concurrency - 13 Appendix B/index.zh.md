---
id: cpp-concurrency-13-appendix-b
title: "附录 B：并发库简要对比"
titleEn: "Appendix B: Brief comparison of concurrency libraries"
order: 53
category: specialized
description: "C++11 标准线程库、Boost.Thread、POSIX C (pthreads) 与 Java 在线程启动、互斥、条件变量、原子操作与并发容器等方面的全面对比。"
tags: ["C++", "Boost.Thread", "POSIX", "Java", "并发库对比"]
---

# 附录 B：并发库简要对比

在现代编程语言与系统库中，对并发和多线程的支持并不是什么新鲜事物，尽管 C++ 直到 C++11 标准才正式确立了核心语言内存模型与标准线程库。

例如：
- **Java** 自 1995 年最初发布起就内置了多线程支持，并在后续的 Java 5 中通过 `java.util.concurrent` 包大幅扩展了高级并发设施；
- 遵循 **POSIX** 标准的类 Unix 平台长期提供 C 语言多线程接口（即 pthreads / `pthread`）；
- **Erlang** 则天然围绕基于消息传递的 Actor 并发模型进行构建；
- 在 C++ 标准化之前，诸如 **Boost**（尤其是 Boost.Thread）等成熟的 C++ 库对底层操作系统提供的多线程编程接口进行了面向对象的高层封装，为多平台开发提供了统一且可移植的接口。

对于那些在 Java、POSIX C 或 Boost.Thread 环境下已经具备丰富并发编程经验、并希望利用现有知识平滑迁移到现代 C++ 标准并发设施的开发者，本附录系统梳理并横向对比了 Java、POSIX C、Boost.Thread 以及 C++11 标准线程库所提供的核心并发特性，并给出了对应于本书具体章节的参考索引。

---

## B.1 并发设施核心特性对比表

下表总结了各主要平台与库在并发编程关键构件上的支持情况及 API 映射关系：

| 特性 (Feature) | Java | POSIX C (pthreads) | Boost (Boost.Thread) | C++11 标准线程库 | 本书对应章节 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **启动与管理线程**<br>*(Starting threads)* | `java.lang.Thread` 类、`Runnable` / `Callable` 接口 | `pthread_t` 类型及相关函数：`pthread_create()`、`pthread_join()`、`pthread_detach()` 等 | `boost::thread` 类及其成员函数 | `std::thread` 类及其成员函数 | 第 2 章 |
| **互斥与同步锁**<br>*(Mutual exclusion)* | `synchronized` 关键字代码块、`java.util.concurrent.locks.ReentrantLock` | `pthread_mutex_t` 类型及相关函数：`pthread_mutex_lock()`、`pthread_mutex_unlock()` 等 | `boost::mutex`、`boost::lock_guard<>`、`boost::unique_lock<>` 类模板 | `std::mutex`、`std::lock_guard<>`、`std::unique_lock<>` 类模板 | 第 3 章 |
| **条件变量**<br>*(Condition variables)* | `java.lang.Object` 的 `wait()`、`notify()`、`notifyAll()` 方法；`Condition` 接口 | `pthread_cond_t` 类型及相关函数：`pthread_cond_wait()`、`pthread_cond_signal()`、`pthread_cond_broadcast()` 等 | `boost::condition_variable` 与 `boost::condition_variable_any` | `std::condition_variable` 与 `std::condition_variable_any` | 第 4 章 |
| **原子操作与内存模型**<br>*(Atomic operations)* | `java.util.concurrent.atomic` 包（如 `AtomicInteger`、`AtomicReference` 等） | 无原生标准支持（依赖编译器内置函数如 GCC `__sync_*` / `__atomic_*`） | `boost::atomic<>` 类模板（较新版本引入） | `std::atomic<>` 类模板、特化别名、细粒度内存顺序（`memory_order`）、`std::atomic_thread_fence()` | 第 5 章 |
| **期望值 / 任务凭据**<br>*(Futures)* | `java.util.concurrent.Future` 接口与相关类（如 `FutureTask`） | 无原生支持 (N/A) | `boost::unique_future<>` 与 `boost::shared_future<>`（新版已与标准对齐） | `std::future<>`、`std::shared_future<>`、`std::promise<>`、`std::async()` | 第 4 章 |
| **线程安全并发容器**<br>*(Thread-safe containers)* | `java.util.concurrent` 包（如 `ConcurrentHashMap`、`BlockingQueue` 等） | 无原生支持 (N/A) | 无标准并发容器（可通过锁封装） | 无内置并发容器（标准库容器均非线程安全，需开发者自行设计实现） | 第 6、7 章 |
| **线程池与执行器**<br>*(Thread pools)* | `ThreadPoolExecutor` 及 `java.util.concurrent.Executors` 工具类 | 无原生支持 (N/A) | 曾有部分扩展提议，但未作为核心内置 | 无内置线程池（需自行基于任务队列与工作线程构建） | 第 9 章 |
| **线程中断与取消**<br>*(Thread interruption)* | `Thread.interrupt()` 方法、`isInterrupted()` 检查 | `pthread_cancel()`、`pthread_setcancelstate()`、`pthread_testcancel()` | `boost::thread::interrupt()` 协作式中断机制 | 无原生协作式中断（C++11-C++17 需自行通过原子标志或条件变量实现；C++20 引入 `std::jthread` 与 `std::stop_token`） | 第 9 章 |

---

## B.2 深度特性对比与设计哲学分析

### B.2.1 线程启动与生命周期管理

- **POSIX C (pthreads)**：
  - 基于过程式 C API。使用 `pthread_create()` 显式传入函数指针 `void* (*start_routine)(void*)` 以及单个 `void*` 参数。
  - 线程资源必须显式通过 `pthread_join()` 回收，或者通过 `pthread_detach()` 分离为非结合状态，否则会造成系统资源泄露。
- **Java**：
  - 基于完全面向对象范式。可以通过继承 `java.lang.Thread` 并重写 `run()` 方法，或者向 `Thread` 传递 `Runnable` / `Callable` 实现。
  - 线程的生命周期由 JVM 垃圾回收器和系统线程调度共同托管，无需显式析构。
- **Boost.Thread 与 C++11**：
  - 基于 **RAII（Resource Acquisition Is Initialization）** 原则。
  - `std::thread` 与 `boost::thread` 接受任意**可调用对象（Callable）**（函数指针、仿函数、Lambda 表达式、`std::bind` 绑定对象等），并支持完美转发任意数量的实参。
  - C++11 `std::thread` 是**不可复制、但可移动（Move-Only）**的，所有权明确。一个可结合（joinable）的 `std::thread` 对象在析构前必须显式调用 `join()` 或 `detach()`，否则其析构函数会直接调用 `std::terminate()` 终止整个程序，以此杜绝悬空执行流导致的隐蔽 Bug。

### B.2.2 互斥锁与临界区保护

- **POSIX C**：
  - 提供 `pthread_mutex_t`，需要手动配对调用 `pthread_mutex_lock()` 与 `pthread_mutex_unlock()`。
  - 一旦临界区中抛出异常或通过提前 `return` 退出，极易遗漏解锁而导致死锁。
- **Java**：
  - 语言层面原生提供 `synchronized` 关键字，既可修饰方法也可修饰代码块，内部利用对象的内置监视器锁（Intrinsic Lock / Monitor）实现自动加解锁。
  - 同时在 Java 5 后通过 `ReentrantLock` 提供更灵活的显式锁支持。
- **Boost.Thread 与 C++11**：
  - 采用严格的 RAII 锁守卫模式：
    - `std::lock_guard` / `boost::lock_guard`：轻量级、作用域绑定的不可移动守卫，在构造时加锁，离开作用域析构时自动解锁，天生具备异常安全性。
    - `std::unique_lock` / `boost::unique_lock`：功能完备的高级锁包装器，支持延迟加锁（deferred locking）、尝试加锁（try-lock）、限时加锁（timed lock）、手动解锁、所有权移动转移，并与条件变量完美契合。
    - 提供了死锁避免算法（如 `std::lock(...)`），能一次性原子锁定多个互斥量而无需担心锁顺序颠倒导致的死锁。

### B.2.3 条件变量与事件通知

- **POSIX C**：
  - `pthread_cond_t` 配合 `pthread_mutex_t` 使用，调用 `pthread_cond_wait()`、`pthread_cond_signal()` 和 `pthread_cond_broadcast()`。
  - 开发者必须使用 `while` 循环手工包裹 `wait()` 以防范**虚假唤醒（Spurious Wakeups）**。
- **Java**：
  - `java.lang.Object` 中的 `wait()` 与 `notify()` / `notifyAll()` 直接与 `synchronized` 块集成；`Condition` 接口则与 `Lock` 配合使用。同样需要 `while` 循环防范虚假唤醒。
- **Boost.Thread 与 C++11**：
  - 提供 `std::condition_variable`（专为配合 `std::unique_lock<std::mutex>` 优化）与通用的 `std::condition_variable_any`（可配合任意满足 BasicLockable 要求的自定义互斥量）。
  - 支持传入谓词（Predicate）的重载版本：
    ```cpp
    cv.wait(lk, [&]{ return !queue.empty(); });
    ```
    在标准库内部自动处理虚假唤醒循环，使代码极为紧凑安全。

### B.2.4 原子操作与内存模型

- **C 语言与早期 C++**：
  - 在 C++11 之前，由于语言规范中缺失对多线程的正式定义，多线程环境下的变量读写被视为标准之外的行为。编译器优化（如指令重排、寄存器缓存）可能在不知不觉中破坏并发逻辑。
- **Java**：
  - 自 Java 5 起（JSR-133）引入了清晰的 Java 内存模型（Java Memory Model, JMM），明确了 `volatile` 变量的 happens-before 语义，并通过 `java.util.concurrent.atomic` 提供了基础类型的原子操作类。
- **C++11 标准**：
  - 正式建立了完整的多线程内存模型（C++ Memory Model），精确定义了**数据竞争（Data Race）**为未定义行为（Undefined Behavior）。
  - 提供了 `std::atomic<T>` 模板，既支持高级且直观的操作符重载（默认采用最严格的顺序一致性 `memory_order_seq_cst`），也允许专家级开发者指定细粒度的内存顺序（如获取-释放语义 `memory_order_acquire` / `memory_order_release`、松散语义 `memory_order_relaxed`），从而在现代乱序执行 CPU 架构上压榨极致性能。

### B.2.5 异步任务与 Future 模式

- **Java**：
  - 广泛采用 `Callable<V>` 配合 `Future<V>`，通常由 `ExecutorService` 线程池负责提交并异步执行。
- **Boost.Thread 与 C++11**：
  - `boost::unique_future`（后演化为 `std::future`）代表独占型单次异步结果，只可移动不可复制。
  - `std::shared_future` 允许多个独立线程并发等待并读取同一异步任务的产出。
  - `std::promise` 提供了生产者端显式写入结果或异常的信道。
  - `std::packaged_task` 将任意可调用对象打包为异步执行实体。
  - `std::async` 提供了高级抽象，由运行时系统权衡是在新线程中异步执行，还是在调用 `get()` 时惰性同步执行。

### B.2.6 并发容器与高级构件缺失的考量

一个初涉 C++11 的开发者最常提出的疑问往往是：*“为什么 C++11 没有像 Java 那样内置 `ConcurrentHashMap` 或内置线程池？”*

原因根植于 C++ 的设计哲学：
1. **零开销原则（Zero-Overhead Principle）**：不为你不需要的功能付出代价。不同的并发场景对并发容器的需求千差万别（读多写少、写多读少、固定容量、无界阻塞、无锁还是粗粒度锁）。
2. **标准演进的严谨性**：C++11 的首要任务是确立稳固的语言核心内存模型与基础低级同步原语。只有基石打牢，社区才能在此之上构建高质量、可复用的上层并发构件（正如图书第 6、7、9 章所示范的那样）。
3. **后续标准的逐步扩展**：C++14/17 引入了读写锁（`std::shared_mutex` / `std::shared_lock`）以及并行算法库（Parallel Algorithms）；C++20 则引入了协作式取消可中断线程 `std::jthread`、协程（Coroutines）、信号量（`std::counting_semaphore`）、锁存器与屏障（`std::latch` / `std::barrier`）。

---

## B.3 本章小结

对于来自 Java 或 POSIX C 背景的工程师：
- 如果你习惯了 `pthread_mutex_lock` / `unlock`，在现代 C++ 中应立即拥抱 **RAII 锁包装器**（`std::lock_guard` / `std::unique_lock`），彻底告别手动加解锁；
- 如果你习惯了 Java 的 `synchronized` 与内存可见性规则，请深入研读第 5 章理解 C++ 底层内存顺序，并熟练运用 `std::unique_lock` 与 `std::condition_variable`；
- 如果你来自 Boost.Thread 背景，你会惊喜地发现 C++11 标准线程库几乎是 Boost.Thread 精华设计的直接标准化提炼，迁移成本极低。
