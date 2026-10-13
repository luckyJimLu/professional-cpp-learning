---
id: boost-asio-deep-dive
title: Boost.Asio 深入解读：从异步操作到系统架构
titleEn: Boost.Asio Deep Dive
author: system-design-notes
order: 34
category: developer-tools
description: 沿异步读源码理解 Completion Token、Executor、Runner、Strand、协程与生命周期，配套可运行代码和 Java 对照。
tags: [C++, Boost.Asio, 异步, 协程, Executor, Strand, Java, 源码解读]
---

# Boost.Asio 深入解读：从异步操作到系统架构

> 读者：已经理解线程、锁和智能指针，希望知道它们怎样组成真实异步系统。
>
> 本文采用 **C++20 + Boost 1.83.0**，源码固定为 Asio 提交 `f2fbbd824c1fafa67c1b9c7ee6e4d2649b343a46`（标签 `boost-1.83.0`）。这是用于可复现阅读和编译的教学基线，不代表当前最新版或新项目版本推荐。核对日期：2026-09-30。源码分析限于默认 Linux epoll 路径；其他平台和配置可能采用不同后端。配套程序为原创教学代码。

前置阅读：[C++ 系统架构实战](#/chapter/content-cpp-system-architecture-practice)。在 GitHub 可读[上一章](../33.%20Cpp%20System%20Architecture/index.zh.md)。

## 1. 为什么选择 Asio，适合拿它做什么

Boost.Asio 是跨平台的网络与异步 I/O 库。本文将它作为异步框架的代表来研究，但它本身不提供完整 RPC、服务治理或业务框架。相比直接封装 epoll，它更值得学习的地方是：**把“异步操作如何实现”与“调用者怎样等待和组合结果”解耦**。

| 项目任务 | Asio 提供的基础 | 应用还需要负责 |
| --- | --- | --- |
| TCP 设备网关 / 代理 | Socket、接入、定时器、异步读写 | 协议分帧、设备命令队列、连接限额 |
| 串口 / Modem 服务 | 串口异步 I/O、定时器 | 命令响应匹配、重试、硬件状态机 |
| HTTP / WebSocket 服务 | 底层执行器与 I/O | 可结合 Boost.Beast，另行设计认证和业务 |
| I/O 与计算混合服务 | io_context、thread_pool、任务投递 | 有界队列、计算取消、结果回投和关闭协议 |
| 裸机 / 强实时 RTOS | 本文不作为通用适配方案 | 单独评估平台、分配策略、确定性和实时调度 |

选型依据来自[项目首页](https://think-async.com/Asio/)和[Boost.Asio 1.83 文档](https://www.boost.org/doc/libs/1_83_0/doc/html/boost_asio.html)。没有把“有名”转换成未经核对的排名、性能数字或 GitHub 星数。

## 2. 先分清六个角色

| 角色 | Asio 中的对应 | 负责什么 | 不自动负责什么 |
| --- | --- | --- | --- |
| 执行上下文 | io_context / thread_pool | 保存、协调与驱动工作 | 业务优先级、任务容量限制 |
| Executor | 对象的 get_executor()、strand executor | 描述工作应在什么执行域运行 | 拥有业务对象、替业务加锁 |
| Runner | 用户调用 io_context.run() 的线程 | 驱动事件处理与 Handler 执行 | 一个连接固定占用一个线程 |
| 异步操作 | async_read_some、async_wait | 发起操作，交付一次完成结果 | 复制并拥有底层缓冲区 |
| Completion Handler | 完成回调 / 协程恢复适配器 | 消费 error_code、字节数等结果 | 等同于业务层 CommandHandler |
| Completion Token | lambda / use_future / use_awaitable | 选择调用形式和结果组合机制 | 单独创建后台运行环境 |

**业务 Handler** 可以放在完成回调之后；两者名字相近，职责并不相同。Runner 也是架构角色名，Asio 并没有要求你继承一个叫 Runner 的类。

![Asio 执行域、I/O 后端与计算池](images/execution-domains.svg)

图中计算池是应用层选择。I/O 线程读取请求后，将独立输入投递到计算池；计算完成再投递回连接的 strand。业务状态只在连接执行域更新。不要让 I/O 回调长时间做压缩、模型推理或阻塞数据库访问。

## 3. 一次异步读：请求返回了，操作仍然存在

下面是概念片段，省略 Session 类定义；完整可编译程序在第 11 节。

```cpp
auto self = shared_from_this();
socket_.async_read_some(asio::buffer(buffer_),
    asio::bind_executor(strand_,
        [self](boost::system::error_code ec, std::size_t n) {
            self->on_read(ec, n);
        }));
```

这段代码建立了三个不同合同：

1. `async_read_some` 用一个缓冲区视图启动读取；调用返回不表示读取完成。
2. `[self]` 延长 Session 生命期，因而也保住它的成员缓冲区。
3. `bind_executor` 指定完成处理的执行域；它不替代 `[self]`，也不延长 buffer 的生命期。

![一次异步读的注册、等待与完成](images/read-completion.svg)

上图画的是需要等待可读事件的路径。数据已经可读时可能走快速路径，不必每次先等一次 epoll。按本文版本的 `async_read_some` 默认语义，即便操作立即完成，用户完成回调也不会从该 initiating function 内直接调用。不要把这个结论外推成所有 Executor、自定义异步操作及新版本适配器都禁止内联执行。[API 合同](https://www.boost.org/doc/libs/1_83_0/doc/html/boost_asio/reference/basic_stream_socket/async_read_some.html)。

## 4. 沿官方源码追踪 async_read_some

### 4.1 公开入口：模板把结果形式交给 Token

在 `basic_stream_socket.hpp` 搜索 `async_read_some` 和 `initiate_async_receive`。公开入口将 token、完成签名、buffer 和接收标志交给 `async_initiate`；具体启动对象再调用 socket service 的 `async_receive`。

这里的完成签名是 `void(error_code, size_t)`。它定义操作最终交付的信息；**返回类型不是固定的 Future**，而由 Token 适配机制决定。

阅读：[固定版本 basic_stream_socket.hpp](https://github.com/boostorg/asio/blob/f2fbbd824c1fafa67c1b9c7ee6e4d2649b343a46/include/boost/asio/basic_stream_socket.hpp)。

### 4.2 Service：把用户 callable 包成 operation

`detail/reactive_socket_service_base.hpp` 的 `async_receive` 做几件重要的事：取得关联 cancellation slot；分配并构造 `reactive_socket_recv_op`；需要时在 slot 中安装取消处理；把 operation 交给 `start_op`。

此时框架持有的是操作状态、Handler 和 buffer 描述。**底层字节内存仍然归调用者负责**。将一个临时 vector 变成 `asio::buffer` 后销毁 vector，不能靠 operation 对象挽救。

阅读：[固定版本 socket service](https://github.com/boostorg/asio/blob/f2fbbd824c1fafa67c1b9c7ee6e4d2649b343a46/include/boost/asio/detail/reactive_socket_service_base.hpp)。

### 4.3 Reactor：就绪信息不等于读取结果

`epoll_reactor::start_op` 在条件允许时先调用 `op->perform()` 尝试非阻塞操作；不能完成才进入等待路径。`epoll_reactor::run` 调用 `epoll_wait`，之后 descriptor 的 `perform_io` 对相关 operation 尝试执行。

`reactive_socket_recv_op_base::do_perform` 的核心工作是 `socket_ops::non_blocking_recv1` / `non_blocking_recv`，将错误码和字节数记录进 operation。epoll 告诉框架“可以尝试读”；真正拿到多少字节仍由 recv 决定。

因此，**Asio 的用户接口表现为完成语义；Linux 此路径由就绪通知驱动实际 I/O**。Windows IOCP、其他 Reactor 以及可选后端需要另读对应 service，不能直接套这个调用链。

阅读：[epoll_reactor.ipp](https://github.com/boostorg/asio/blob/f2fbbd824c1fafa67c1b9c7ee6e4d2649b343a46/include/boost/asio/detail/impl/epoll_reactor.ipp)、[reactive_socket_recv_op.hpp](https://github.com/boostorg/asio/blob/f2fbbd824c1fafa67c1b9c7ee6e4d2649b343a46/include/boost/asio/detail/reactive_socket_recv_op.hpp)。

### 4.4 Scheduler：Runner 驱动的是操作队列

在 `scheduler.ipp` 搜索 `do_run_one`。它区分底层 reactor task 和普通 operation；必要时驱动 reactor，或者取出 operation 调用 `complete`。源码在执行这些工作前释放 scheduler 队列锁，另用清理对象维护 outstanding work。

这与上一章“锁内取任务，锁外执行”的模式相呼应。不过这是**理解模式的类比**，不是说教学线程池已经重现 Asio 的调度算法、线程本地队列和 continuation 优化。

阅读：[scheduler.ipp](https://github.com/boostorg/asio/blob/f2fbbd824c1fafa67c1b9c7ee6e4d2649b343a46/include/boost/asio/detail/impl/scheduler.ipp)。

### 4.5 完成：先整理操作状态，再进入用户代码

`reactive_socket_recv_op::do_complete` 接管 operation 及 outstanding work，把 Handler 与完成参数转入局部 binder，释放 operation 内存，再经 `handler_work::complete` 交付调用。销毁执行上下文时也有只清理而不 upcall 的路径，所以不能假定“无论怎样销毁上下文，所有回调一定都会执行”。

“底层完成”与“用户回调运行”之间仍有 Executor 调度边界。阅读时应继续查看 `detail/handler_work.hpp`，理解关联 Executor 如何参与最终交付，而不是停在 `epoll_wait`。

阅读：[handler_work.hpp](https://github.com/boostorg/asio/blob/f2fbbd824c1fafa67c1b9c7ee6e4d2649b343a46/include/boost/asio/detail/handler_work.hpp)。

## 5. 模板为什么重要：同一个操作支持三种使用方式

| Completion Token | 调用者拿到什么 | 开始时机与消费方式 |
| --- | --- | --- |
| 普通 lambda | 通常没有 Future 返回值 | 发起操作，完成时调用 lambda |
| use_future | std::future 的结果接口 | 发起操作，由其他合适的线程等待结果 |
| use_awaitable | asio::awaitable | 生成可等待对象，实际启动发生于等待该对象时 |

以下是三种调用形态的概念片段，不能对同一个 buffer 同时发起三次读：

```cpp
socket.async_read_some(buffer, callback);
auto future = socket.async_read_some(buffer, asio::use_future);
auto n = co_await socket.async_read_some(buffer, asio::use_awaitable);
```

`async_result` 是定制点，`async_initiate` 负责把完成签名、Token 和启动逻辑连接起来。模板保留 callable 的具体类型，转发避免不必要复制；对不同 Token 的适配把同一个操作转换成不同组合方式。它不是通过一个统一的虚基类在运行时判断“是不是 Future”。

语义来自[Completion Tokens](https://www.boost.org/doc/libs/1_83_0/doc/html/boost_asio/overview/model/completion_tokens.html)，实现入口是[async_result.hpp](https://github.com/boostorg/asio/blob/f2fbbd824c1fafa67c1b9c7ee6e4d2649b343a46/include/boost/asio/async_result.hpp)。

### 5.1 Future 不负责驱动 io_context

如果唯一 Runner 在自己的回调里对一个仍需该 io_context 驱动的 Future 调用 `get()`，线程被阻塞，操作无法继续完成。多个 Runner 也不应被这种等待全部占满。Java 的 Executor 内阻塞等待同池任务也存在类似饥饿问题。

`use_future` 将惯用的 `error_code` 完成错误转换到 Future 的异常通道；不要把它看作提供 CompletableFuture 那样通用回调链的 C++ 标准 Future。若要异步组合，优先沿 Handler、Asio 协程或框架组合操作继续。

依据：[Futures](https://www.boost.org/doc/libs/1_83_0/doc/html/boost_asio/overview/composition/futures.html)。

### 5.2 自定义异步操作：执行地点和完成地点必须分开

配套 `asio_contracts.cpp` 实现一个教学 `async_square`：在 `thread_pool` 计算一个整数平方，再把结果投递到 Handler 的关联 Executor。相同入口验证 lambda、use_future 和 use_awaitable 三种方式。

实现顺序是：取得关联 Executor → 持有其 work guard → 把独立输入和 Handler 移交计算池 → 计算 → 回投结果 → 完成 Handler 并释放 guard。

它体现了架构边界：**计算由 CPU pool 执行，连接状态更新留在连接执行域**。work guard 防止计算期间结果上下文因暂时无工作而提前退出；它不是 Session 所有权。

这只是缩小后的教学适配器：未实现关联 allocator 的完整传播、取消协议、容量限制和分配失败恢复。生产自定义操作还要维护 exactly-once 完成、异常与取消竞争，并认真阅读[async_compose](https://www.boost.org/doc/libs/1_83_0/doc/html/boost_asio/reference/async_compose.html)和[组合操作说明](https://www.boost.org/doc/libs/1_83_0/doc/html/boost_asio/overview/composition/compose.html)。

### 5.3 关联特征为什么要穿过每一层包装

一个 Handler 不只是一个可调用函数：它还可能关联 Executor、allocator 和 cancellation slot。自定义包装如果只保存原 callable 并提供 operator()，却不传播这些特征，外层设置的 strand 或取消通道就可能丢失。包装类型应正确提供关联特征，或者采用框架的组合设施。

关联 allocator 用于操作状态的内存分配，不意味着所有业务 buffer 自动使用该 allocator；更不能推出整个应用“零分配”。固定块分配器可以降低部分分配成本，但块大小、并发访问、分配器对象寿命和回退路径仍要明确。先测量再优化。

API 中的 CompletionToken / BufferSequence 等类型要求约束模板可接受的形态；本文源码的宏也兼顾不同语言版本。`any_io_executor` 等类型擦除接口则方便运行时保存不同 Executor；不要把所有静态模板组合改成虚接口，也不要把类型擦除宣称成没有成本。[关联特征](https://www.boost.org/doc/libs/1_83_0/doc/html/boost_asio/overview/model/associators.html)、[自定义分配](https://www.boost.org/doc/libs/1_83_0/doc/html/boost_asio/overview/core/allocation.html)。

## 6. Executor、post、dispatch 与 Strand

### 6.1 io_context 不等于自动创建线程池

用户创建线程并调用 `run()` 才能驱动 io_context。多个线程同时 `run()` 可以执行不同 Handler；不能假设回调始终返回发起操作的那个线程。`thread_pool` 则管理自己的工作线程，是另一种执行上下文。

| 投递方法 | 理解重点 | 架构影响 |
| --- | --- | --- |
| post | 不在投递调用栈内直接执行该工作 | 明确异步边界，避免立即重入 |
| dispatch | 满足目标执行域条件时可能直接执行 | 状态修改可能在函数返回前发生 |
| defer | 表达后续工作，允许 continuation 相关优化 | 不要当作严格延迟、优先级或定时器 |

采用 `post(ex, ...)` 时，其他 Runner 仍可能并发开始运行工作；“不是调用栈内内联”不等于“函数返回前其他线程一定不能执行”。

依据：[线程模型](https://www.boost.org/doc/libs/1_83_0/doc/html/boost_asio/overview/core/threads.html)、[post](https://www.boost.org/doc/libs/1_83_0/doc/html/boost_asio/reference/post.html)、[dispatch](https://www.boost.org/doc/libs/1_83_0/doc/html/boost_asio/reference/dispatch.html)、[defer](https://www.boost.org/doc/libs/1_83_0/doc/html/boost_asio/reference/defer.html)。

### 6.2 Strand 串行化处理，不绑定某个 OS 线程

同一 strand 上的 Handler 不会并发执行，但可能依次由不同 Runner 执行。它适合保护每连接的协议状态、输出队列和关闭标记。

必须让这些状态的**所有访问**进入同一 strand：读写完成、定时器处理、外部 close 请求、CPU 计算结果回投，都不能漏掉。只给最终回调加 strand，再从任意外部线程直接改 socket 和状态，合同就破了。

另外，两个并行操作的完成先后受 I/O 时序影响。strand 排除并发，不会为任意两次并行读写创造业务顺序。若需要响应有序，应给请求编号并组织队列。

```cpp
// 概念片段：把外部关闭请求交给连接执行域。
asio::post(strand_, [self = shared_from_this()] {
    boost::system::error_code ignored;
    self->socket_.close(ignored);
});
```

依据：[Strands](https://www.boost.org/doc/libs/1_83_0/doc/html/boost_asio/overview/core/strands.html)。配套检查让两个 Runner 执行 2000 个同 strand 的非原子计数操作；这验证代码使用的串行化合同，不是性能压测。

## 7. 智能指针、Buffer 与协程帧

| 对象 / 关系 | 推荐表达 | 要保证的事 |
| --- | --- | --- |
| 协程独占 socket | 按值传参，再 move 给协程 | socket 生命周期覆盖异步链 |
| 单请求的计算输入 | 值对象 / unique_ptr 移交 | 后台线程不借用即将释放的原始输入 |
| Session 被多个异步回调需要 | Handler 捕获 shared_ptr | 同时明确 strand / 锁保护内部状态 |
| 可丢弃观察回调 | weak_ptr，执行时 lock | 对象消失就放弃，不能强行延长寿命 |
| asio::buffer / span / string_view | 非拥有视图 | 底层内存到操作完成前有效且符合访问规则 |
| Coroutine 局部数组 / unique_ptr | 协程帧内对象 | 帧未销毁，读写链不重用仍在使用的内存 |

不要以为 `asio::buffer(std::string("hello"))` 创建了一份可异步保存的字符串。视图被复制也不意味着字节被复制。异步读期间不可并发读取/修改其输出缓冲区；写期间也不能覆盖或释放它。[Buffers](https://www.boost.org/doc/libs/1_83_0/doc/html/boost_asio/overview/core/buffers.html)。

协程也不能修复悬垂引用：以 `Session&` 为参数的协程，仍然借用 Session；捕获变量的临时 coroutine lambda 也可能让 closure 先销毁。配套程序采用**普通命名协程函数**和按值移动 socket，避免靠临时闭包的存活来维持状态。

shared_ptr 的引用计数不保护业务字段。即使最后一份引用被释放的线程可以安全减计数，若析构必须回到设备线程执行，仍需单独安排销毁执行位置。

## 8. C++20 协程：同步写法，异步执行

```cpp
// 概念片段：data 是协程帧内局部数组，socket 按值拥有。
asio::awaitable<void> echo(tcp::socket socket) {
    std::array<char, 4096> data{};
    for (;;) {
        auto n = co_await socket.async_read_some(asio::buffer(data), asio::use_awaitable);
        co_await asio::async_write(socket, asio::buffer(data, n), asio::use_awaitable);
    }
}
```

发生等待时，该协程挂起，Runner 可以运行其他工作；完成后恢复协程继续下一步。`co_await` 不等同于调用阻塞 `read()`，也不自动将 CPU 重活迁移到线程池。恢复位置受协程 Executor 约束。

`co_spawn` 把 awaitable 接入执行上下文，并通过完成 Token 观察协程结果；异常可以通过它的完成回调 / Future 交付。普通 Handler 抛出的异常可传播到当前 Runner 的 run 调用，应用必须决定捕获、记录与恢复策略；它不像 packaged_task 那样自动给每个任意回调创建 Future 异常通道。协程未处理异常则由 co_spawn 的完成结果表达。

`detached` 明确放弃结果观察，适合已在内部处理结果和错误的场景；不要为了少写一个回调而让失败不可见。

惯用 `use_awaitable` 会对 error_code 失败抛出异常；需要把 EOF、取消等作为分支时，可使用 `redirect_error(use_awaitable, ec)`。这只是错误表达形式选择，业务仍须区分 EOF、operation_aborted 和其他错误。

依据：[C++20 Coroutines](https://www.boost.org/doc/libs/1_83_0/doc/html/boost_asio/overview/composition/cpp20_coroutines.html)、[use_awaitable 实现](https://github.com/boostorg/asio/blob/f2fbbd824c1fafa67c1b9c7ee6e4d2649b343a46/include/boost/asio/impl/use_awaitable.hpp)。

## 9. TCP：分帧、单写者和背压要由应用设计

### 9.1 async_read_some 不是读取一个完整业务消息

TCP 是字节流。一次发送可能被分多次读取，多次发送也可能合并读取。`async_read_some` 返回实际字节数；`async_read` 可以组合读取指定数量，但仍需应用定义“指定数量”的协议含义。

设备 RPC 可以选择长度头 + payload：先精确读取固定头，解析并验证长度上限，再读取 payload。长度上限应在分配内存前检查；不能让对端一个超大长度直接触发大分配。

### 9.2 一个连接维护一个写链

`async_write` 是组合操作，会在必要时重复调用底层 `async_write_some`，直到目标完成或出错。在同一 stream 上执行它时，应避免重叠发起其他写操作；将响应入队并让一个写链逐条消费。

只使用 strand 也不够：一个 Handler 发起写后立即返回，另一个 Handler 仍可以再发起写，两个操作生命期会重叠。**串行调用回调与串行异步操作链是不同合同。**

依据：[async_write 的具体重载合同](https://www.boost.org/doc/libs/1_83_0/doc/html/boost_asio/reference/async_write/overload1.html)。

### 9.3 背压必须有数值上限

| 资源 | 至少设置的上限 | 达到上限后的策略 |
| --- | --- | --- |
| 新连接 | 总连接数、每来源速率 | 拒绝或延迟接入 |
| 解析输入 | 单帧字节数、连接累计缓存 | 协议错误、停止继续读取或关闭 |
| CPU 工作 | 排队任务数、占用字节 | 拒绝、降级、稍后重试 |
| 输出队列 | 待写字节数、消息数 | 暂停生产、限流或断开慢客户端 |
| 外部依赖 | 并发数、截止时间 | 受控失败，避免无限挂起 |

这些是本文的应用设计建议。Asio 的 `post` 和 `thread_pool` 不自动提供上一章有界线程池那样的拒绝协议；限制线程数也不能证明排队内存有界。

## 10. 取消、超时与排空关闭

### 10.1 取消是一条请求通道

Socket / timer 可以用对象级 cancel / close 影响未完成操作；一些操作支持 cancellation slot 进行定向取消。`cancellation_signal` 只有一个 slot，不能把同一个 slot 同时绑定到多个并行操作并假定会广播；新的取消处理会覆盖旧的绑定。

terminal、partial、total 描述取消成功时允许的副作用合同，不是停止强度等级。目标不支持请求的类型时，不保证发生取消。取消在操作发起前发出也不是可持久保存的“已取消”旗标。

取消操作通常仍需处理完成回调；正在竞争中的正常完成也可能已经发生。超时处理不能立即销毁 buffer 或给 Promise 第二次 set_value。应用应在同一执行域维护完成状态，使读成功、错误、超时只能选出一个业务结果。

依据：[Per-Operation Cancellation](https://www.boost.org/doc/libs/1_83_0/doc/html/boost_asio/overview/core/cancellation.html)。

### 10.2 超时读的两个完成事件

图中状态由同一 strand 访问；超时分支取消的是尚未完成的目标操作。取消返回不等于目标完成 Handler 已执行。

![读取完成与超时竞争，业务结果只选择一次](images/timeout-race.svg)

即使业务已经选择超时，仍需等待读操作的完成处理释放其状态。读先完成时撤销 timer，随后 timer 的取消完成也要忽略，避免二次交付。真实实现还要给定时器与操作设置请求代号，防止上一轮残余回调影响新一轮读。

### 10.3 排空与强制停止分开设计

1. 停止接收新业务和 CPU 提交，取消 / 关闭 acceptor。
2. 在每连接 strand 设置 closing；按协议决定完成已接受工作还是请求取消。
3. 让 I/O Runner 保持运行，处理读写、定时器和取消完成。
4. 等待 CPU 工作结束及其结果回投；不能从需要处理结果的唯一 I/O Runner 阻塞 join。
5. 活跃操作 / 会话归零后释放工作保持；等待 run 自然返回，join Runner。
6. 最后释放执行上下文、连接与业务资源。

这是一种教学排空协议，具体服务可以有总截止时间和强制停止降级。`io_context.stop()` 使 run 尽快返回，不等于取消 socket、排空 Handler 或等待 CPU 工作结束。`work_guard.reset()` 解除人为保持，也不会取消已有工作；仍有真实未完成工作时 run 可以继续。stop 后再驱动需要 restart，不能与仍在运行的 run 系列调用并发使用 restart。

依据：[io_context](https://www.boost.org/doc/libs/1_83_0/doc/html/boost_asio/reference/io_context.html)、[stop](https://www.boost.org/doc/libs/1_83_0/doc/html/boost_asio/reference/io_context/stop.html)、[restart](https://www.boost.org/doc/libs/1_83_0/doc/html/boost_asio/reference/io_context/restart.html)、[executor_work_guard](https://www.boost.org/doc/libs/1_83_0/doc/html/boost_asio/reference/executor_work_guard.html)。

## 11. 配套实战：能运行、能验证的代码

完整文件位于本文同目录 `examples/`：

| 文件 | 展示内容 | 验证内容 |
| --- | --- | --- |
| [asio_contracts.cpp](https://github.com/luckyJimLu/system-design-notes/blob/main/content/34.%20Boost%20Asio%20Deep%20Dive/examples/asio_contracts.cpp) | 自定义 async_square、关联 Executor、work guard、Token、strand、取消与所有权 | 三种 Token、协程局部 unique_ptr、2000 次串行计数、取消完成一次、Future 错误转换、stop/restart、shared_ptr 释放 |
| [coroutine_echo.cpp](https://github.com/luckyJimLu/system-design-notes/blob/main/content/34.%20Boost%20Asio%20Deep%20Dive/examples/coroutine_echo.cpp) | 按值 socket、协程 buffer、单写链、多会话、自然排空 | 由 Python 通过真实 TCP 测试 |
| [check_echo.py](https://github.com/luckyJimLu/system-design-notes/blob/main/content/34.%20Boost%20Asio%20Deep%20Dive/examples/check_echo.py) | 自动启动临时端口、并发客户端、半关闭发送端 | 二进制数据、碎片发送、256 KiB 流、空流、3 会话结束 |

在 Ubuntu 24.04、仓库根目录执行：

```bash
sudo apt-get update
sudo apt-get install -y --no-install-recommends libboost1.83-dev
bash scripts/check-cpp-examples.sh
```

编译使用 C++20、pthread、`-Wall -Wextra -Werror -pedantic`。示例通过 static_assert 固定 Boost 版本；测试用 timeout 防止挂起。仅使用 Boost 头文件中的 Asio / System 路径，不额外链接 Boost.System 二进制库。脚本同时验证上一章的有界线程池。

### 11.1 Echo 为什么能不使用 shared_ptr

`echo(tcp::socket socket)` 的按值 socket 和局部数组跟随协程帧存在；accept 后将 socket move 给 echo，原持有者不再使用它。一个协程按“读 → 写完 → 再读”的顺序工作，因此没有重叠写，也没有在写完成前复用数组。

main 中只有一个 I/O Runner，因此 finished / failed 计数没有并发访问。若改为多 Runner，不能原样沿用计数器；必须增加合适执行域或同步，并重新审查 listener 与 session 合同。

### 11.2 教学程序的边界

Echo 只监听 loopback，最多接受指定的有限会话数。它不是部署用服务器：没有 TLS、业务分帧、连接读超时、生产总关闭截止时间和全局流控。客户端不关闭时程序可能一直等待；测试的 timeout 负责在 CI 中揭示挂起，不是程序自身的取消协议。

单连接 buffer 有界，但这不证明完整服务的内存有界。要扩展为设备 RPC，应补上第 9、10 节的协议、限额、取消和关闭状态机。

## 12. 对照 Java / Netty：职责相近，生命周期不同

| C++ / Asio | Java 可类比对象 | 必须保留的区别 |
| --- | --- | --- |
| io_context 的 run 线程 | Netty EventLoop / 事件执行线程 | Asio 可多个 Runner 共用上下文，非默认每连接固定线程 |
| strand | 串行执行域 / EventLoop 上串行任务 | strand 保证不并发，不保证固定 OS 线程 |
| post、CPU thread_pool | Executor.execute / ExecutorService | 排队容量和拒绝协议要单独设计 |
| completion Handler | 回调、ChannelFutureListener | Handler 关联执行器、分配器、取消特征 |
| use_future | Future | 都可能阻塞等待；不等同 CompletableFuture 全部组合能力 |
| awaitable + co_spawn | 异步链的结构化表达 | C++ 协程帧、恢复 Executor、资源生命周期需明确 |
| shared_ptr 捕获 | Java 强引用使对象可达 | C++ 引用计数、不自动收集强引用环，销毁时机与线程不同 |
| buffer 非拥有视图 | ByteBuffer / ByteBuf 的部分使用场景 | 不能把内存所有权及 Netty 引用计数协议视为相同 |
| cancel / cancellation slot | cancel 请求 | 两边都要读目标 API 合同，不能假定回滚 I/O 副作用 |

Java 类比用于职责定位。[Netty EventLoop](https://netty.io/4.1/api/io/netty/channel/EventLoop.html)对注册 Channel 的执行规则，与 Asio 共用 io_context 的 Runner 模型不能直接等同；[CompletableFuture](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/CompletableFuture.html)的组合和执行器规则也需单独理解。

## 13. 源码阅读路线与定位实验

| 阶段 | 搜索入口 | 要回答的问题 |
| --- | --- | --- |
| 公开 API | basic_stream_socket.hpp：async_read_some | Buffer 与 Token 的类型怎样进入实现？ |
| Token 适配 | async_result.hpp：async_initiate | 返回形式在哪里改变？ |
| Service | reactive_socket_service_base.hpp：async_receive | operation、取消 slot、分配怎样连接？ |
| 系统 I/O | reactive_socket_recv_op.hpp：do_perform | 哪一步实际 recv 并保存结果？ |
| 事件驱动 | epoll_reactor.ipp：start_op / perform_io | 就绪事件怎样推进操作？立即完成路径是什么？ |
| 调度 | scheduler.ipp：do_run_one | 哪个线程驱动哪个队列？锁在哪里释放？ |
| 最终交付 | handler_work.hpp：complete | 关联 Executor 怎样影响完成位置？ |
| 协程适配 | impl/use_awaitable.hpp | 完成结果怎样接回 awaitable？ |

建议调试三个实验：给 Handler 打印线程 ID，看 strand 串行但不一定固定线程；启用 `BOOST_ASIO_ENABLE_HANDLER_TRACKING` 看操作创建与完成；断点观察 start_op 的 speculative 路径与需要等待的路径。跟踪输出会影响时序，不能据此宣称性能提升。

在本章测试之外，生产验证还应覆盖慢客户端、协议半包、断连时 CPU 回投、取消与正常完成竞争、写队列容量、关闭截止时间和版本升级。这些是待补的验证方向，不是本章声称已经跑过的测试。

## 14. 读完后应能回答的设计问题

- 每份请求、socket 和 buffer 谁拥有？谁只借用？
- 每个业务状态在哪个 Executor / strand 访问？外部 close 是否也进入该执行域？
- Token 决定的启动和等待方式是什么？有没有在 Runner 上阻塞 Future？
- 是否保证同连接只有一条写链？待写字节有上限吗？
- 取消请求发给谁？支持哪种副作用合同？谁处理最后一次完成？
- CPU 工作完成后回到哪里？结果上下文是否仍然运行？
- 是自然排空还是强制停止？work guard 和 Runner 在哪个条件下释放？

## 15. 来源与可复现范围

事实依据均指向官方项目文档或固定源码。文中设备网关部署建议、背压表和排空协议是基于这些合同的应用设计推导，不能当作 Asio 默认提供的功能。

- [Boost.Asio 固定源码树](https://github.com/boostorg/asio/tree/f2fbbd824c1fafa67c1b9c7ee6e4d2649b343a46)
- [Boost.Asio 1.83 文档目录](https://www.boost.org/doc/libs/1_83_0/doc/html/boost_asio.html)
- [线程、Buffer、Token、取消与协程概览](https://www.boost.org/doc/libs/1_83_0/doc/html/boost_asio/overview.html)
- [Handler Tracking](https://www.boost.org/doc/libs/1_83_0/doc/html/boost_asio/overview/core/handler_tracking.html)
- [本仓库自动化检查脚本](https://github.com/luckyJimLu/system-design-notes/blob/main/scripts/check-cpp-examples.sh)

仓库同时提交 `.puml` 和 `.svg`；GitHub 与站点直接加载图像。Actions 对全部图示重新渲染，编译并运行教学代码，检查内容与 TypeScript，构建成功后发布 Pages。升级 Boost 时应同步调整固定链接、版本断言、CI 依赖和本文语义说明。
