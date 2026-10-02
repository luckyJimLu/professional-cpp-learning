# Asio 开发架构文档

> 基于 [README.md](README.md) 编写 | 版本 1.38.2 | 许可证：Boost Software License 1.0
>
> 文中所有架构图、类图与时序图均采用 **Mermaid** 格式编写，在 GitHub、VS Code 及各类 Markdown 预览器中均可直接渲染。

---

## 1. 概述

Asio 是跨平台、仅头文件的 C++ 网络/底层 I/O 库。其架构围绕三个核心设计展开：

1. **Proactor 模式**：异步操作发起后立即返回，I/O 就绪与数据搬运由运行时完成，再回调用户处理器。
2. **I/O 对象 / 服务（Service）分离**：`basic_socket` 等前端 I/O 对象是轻量句柄，真正的状态与平台调用集中在按 `execution_context` 注册的单例服务中。
3. **可插拔异步完成模型**：同一套发起函数（initiating function）通过 `async_result` 机制适配回调、`future`、协程等多种完成令牌。

---

## 2. 基本概念

### 2.1 Proactor 模式与异步模型

| 角色 | 对应 Asio 实现 | 职责 |
|---|---|---|
| Initiator（发起者） | `async_read_some()` 等发起函数 | 发起异步操作并立即返回 |
| Completion Handler（完成处理器） | 用户回调 / 协程恢复点 | 接收最终结果（错误码 + 字节数等） |
| Completion Token（完成令牌） | 回调、`use_future`、`use_awaitable`、`deferred`… | 描述"结果如何交付" |
| Asio Operation（操作对象） | `detail::reactor_op` 等派生类 | 封装一次未完成异步操作的上下文 |
| Event Demultiplexer | `epoll/kqueue/IOCP/io_uring` | 等待 OS 层 I/O 事件 |
| Proactor | `io_context` + `detail::scheduler` | 派发完成的操作、调用处理器 |

### 2.2 I/O 上下文（io_context / execution_context）

- `execution_context`：轻量上下文基类，内含**服务注册表（service_registry）**，按类型提供全局单例服务。
- `io_context`：核心事件循环，继承自 `execution_context`。用户代码通过 `run()` / `poll()` 驱动它处理完成的异步操作。
- `thread_pool` / `system_context`：同样继承 `execution_context`，提供线程池执行环境。

### 2.3 执行器（Executor）与 Strand

- **Executor**：统一的调度接口（`dispatch` / `post` / `defer`），携带"在哪里、如何执行"的语义。
- **io_context::executor_type**：绑定到具体 `io_context` 的执行器，I/O 对象通过它获得关联的执行环境。
- **strand**：串行化适配器，保证经其派发的处理器不并发执行，是免锁编程的核心工具。
- **any_io_executor**：类型擦除执行器（类似 `std::function`），允许 I/O 对象在运行时持有任意执行器。
- **executor_work_guard**：工作守卫，防止事件循环因无未完成工作而提前退出。

### 2.4 完成令牌（Completion Token）与完成签名

- **完成签名（Completion Signature）**：形如 `void(error_code, std::size_t)` 的函数类型，描述完成处理器参数。
- **`async_result<CompletionToken, Signatures...>`**：核心定制点。默认情况下 `completion_handler_type == CompletionToken`（裸回调即令牌）；针对每种令牌提供特化：
  - `use_future_t` → 完成时 set 到 `std::future`，发起函数返回 future；
  - `use_awaitable_t` → 完成时恢复挂起的协程，发起函数返回 `awaitable<T>`；
  - `deferred_t` → 不立即执行，返回惰性操作对象；
  - `detached_t` → 忽略结果与异常。
- **`async_initiate`**：推荐使用的发起入口，内部转调 `async_result::initiate(...)`。

### 2.5 I/O 对象与服务（Service 模式）

- I/O 对象（如 `ip::tcp::socket`）仅持有一个 `detail::io_object_impl`，其中保存**服务指针**与**实现类型（implementation_type）**。
- 服务（如 `reactive_socket_service`）按 `io_context` 全局唯一（`use_service<T>()` 创建/获取），集中管理所有同类型 I/O 对象的底层状态。
- 好处：I/O 对象本身极轻（可值拷贝、移动），昂贵的平台资源与状态机集中在服务内。

### 2.6 缓冲区（Buffer）

- `mutable_buffer` / `const_buffer`：单块连续缓冲区的非拥有视图（指针 + 长度）。
- `buffer()` 自由函数：从数组、`vector`、`string` 等创建缓冲区视图，自动推导大小。
- 缓冲区序列（BufferSequence）：多块缓冲区组成的序列，支持 scatter/gather。
- `basic_streambuf`：动态缓冲区（派生自 `std::streambuf`），配合 `read_until` 等使用。

### 2.7 取消机制（Cancellation）

- `cancellation_signal`：发出取消请求的信号源。
- `cancellation_slot`：与一次异步操作关联的取消槽，操作发起时登记取消处理器。
- `cancellation_state` / `cancellation_type`：过滤取消类型（`terminal` / `partial` / `total`）。
- `cancel_after` / `cancel_at`：到相对/绝对时间点自动 emit 取消。

### 2.8 平台反应器（Reactor Backends）

`detail` 层按平台与编译期配置选择后端，公共代码无感知：

| 后端 | 平台/条件 | 服务层对应 |
|---|---|---|
| `epoll_reactor` | Linux | `reactive_socket_service` 等 |
| `kqueue_reactor` | macOS / BSD | 同上 |
| `select_reactor` / `dev_poll_reactor` | 兜底 / Solaris | 同上 |
| `win_iocp_io_context` | Windows IOCP | `win_iocp_socket_service` 等 |
| `io_uring_service` | Linux io_uring | `io_uring_socket_service` 等 |
| WinRT 系列 | UWP | `winrt_*_service` |

---

## 3. 总体分层架构

```mermaid
flowchart TD
    subgraph App["用户代码（应用层）"]
        AppLogic["业务逻辑 / 回调 / 协程体"]
    end

    subgraph PublicAPI["Asio 公共 API 层（boost/asio/*.hpp）"]
        IOObj["I/O 对象<br/>socket / acceptor / timer / file / pipe"]
        Proto["协议与端点<br/>ip::tcp / udp / icmp / local / ssl"]
        Tokens["完成令牌<br/>use_future / use_awaitable / deferred / detached"]
        Buf["缓冲区<br/>buffer / streambuf / registered_buffer"]
    end

    subgraph AsyncFW["异步框架层"]
        AsyncResult["async_result / async_initiate<br/>完成模型适配"]
        Exec["executor / strand / any_io_executor<br/>执行与调度语义"]
        Cancel["cancellation_signal / slot<br/>取消机制"]
    end

    subgraph Runtime["运行时层"]
        IOCtx["io_context / scheduler<br/>事件循环与操作派发"]
        ThreadPool["thread_pool / system_executor<br/>线程池执行"]
        ExecCtx["execution_context / service_registry<br/>服务注册"]
    end

    subgraph Detail["平台抽象层（detail/）"]
        Reactors["epoll_reactor / kqueue_reactor /<br/>select_reactor / dev_poll_reactor"]
        IOCP["win_iocp_io_context"]
        Uring["io_uring_service"]
        Ops["socket_ops / descriptor_ops<br/>系统调用封装"]
    end

    subgraph OS["操作系统 / 内核"]
        Kernel["epoll / kqueue / IOCP /<br/>io_uring / sockets"]
    end

    AppLogic -->|"使用 API"| PublicAPI
    AppLogic -->|"提供完成令牌"| AsyncFW
    PublicAPI -->|"async_initiate<br/>(发起异步操作)"| AsyncFW
    PublicAPI -->|"use_service&lt;T&gt;()<br/>(获取 I/O 服务)"| Runtime
    AsyncFW -->|"dispatch / post / defer"| Runtime
    Runtime -->|"选择并驱动后端"| Detail
    Detail -->|"epoll_wait / ::recv 等"| OS
```

---

## 4. 关键 UML 类图

### 4.1 核心运行时与 Service 模式

```mermaid
classDiagram
    class execution_context {
        +use_service~T~(ctx)$ T&
        +has_service~T~(ctx)$ bool
        +make_service~T~(args...)$
        +notify_fork(fork_event)*
        -service_registry* service_registry_
    }

    class EService["execution_context::service"] {
        +shutdown()*
        +notify_fork(e)*
        #execution_context& context_
        #service_key key_$
    }

    class io_context {
        +run() count_type
        +run_one()
        +poll()
        +poll_one()
        +stop()
        +stopped() bool
        +restart()
        +get_executor() executor_type
    }

    class IoExec["io_context::executor_type (basic_executor_type)"] {
        +dispatch(f, alloc)
        +post(f, alloc)
        +defer(f, alloc)
        +on_work_started()
        +on_work_finished()
        +running_in_this_thread() bool
    }

    class thread_pool {
        +get_executor() executor_type
        +join()
        +attach()
        -thread_group threads_
    }

    class PoolExec["thread_pool::executor_type"] {
        +dispatch(f, alloc)
        +post(f, alloc)
        +defer(f, alloc)
    }

    class service_registry {
        -do_use_service(key, factory)
        -shutdown_services()
        -destroy_services()
        -notify_forks(e)
    }

    class scheduler {
        -run()
        -stop()
        -schedule_operation(op)
        -post_immediate_completion(op)
        -init_task()
    }

    class epoll_reactor {
        -run(usec, op_queue)
        +start_op(op, interrupt)
        +register_descriptor(fd)
        +register_internal_descriptor(fd)
    }

    class Operation["detail::operation (scheduler_operation)"] {
        #task_func_
        #complete_func_
        +complete(owner, ec, bytes)*
    }

    class IOSvc["I/O 服务 (reactive_socket_service 等)"] {
        +construct(impl)
        +destroy(impl)
        +async_endpoints()*
    }

    class Ops["reactor_op 等具体操作类"]

    execution_context o-- service_registry : 拥有
    execution_context o-- EService : 经注册表管理
    EService <|-- IOSvc
    io_context --|> execution_context
    thread_pool --|> execution_context
    io_context *-- IoExec : executor_type
    thread_pool *-- PoolExec : executor_type
    service_registry o-- scheduler
    service_registry o-- epoll_reactor
    Operation <|-- Ops
```

### 4.2 Socket 类层次与协议

```mermaid
classDiagram
    class socket_base {
        +shutdown_type
        +message_flags
        +bytes_readable
        +max_listen_connections$
    }

    class BasicSocket["basic_socket~Protocol, Executor~"] {
        +executor_type
        +open(protocol)
        +close()
        +cancel()
        +bind(endpoint)
        +local_endpoint()
        +remote_endpoint()
        +set_option(option)
        +get_option(option)
        +connect(endpoint)
        +async_connect(endpoint, token)
        +wait(wait_type)
        +async_wait(wait_type, token)
    }

    class StreamSocket["basic_stream_socket~Protocol, Executor~"] {
        +read_some(buffers)
        +async_read_some(buffers, token)
        +write_some(buffers)
        +async_write_some(buffers, token)
        +send(buffers, flags)
        +receive(buffers, flags)
    }

    class DgramSocket["basic_datagram_socket~Protocol, Executor~"] {
        +send_to(buffers, endpoint)
        +async_send_to(buffers, endpoint, token)
        +receive_from(buffers, endpoint)
        +async_receive_from(buffers, endpoint, token)
    }

    class Acceptor["basic_socket_acceptor~Protocol, Executor~"] {
        +listen(backlog)
        +accept()
        +async_accept(token)
        +move_accept()
        +async_move_accept(token)
    }

    class TcpProto["ip::tcp"] {
        +v4()$
        +v6()$
        +socket: basic_stream_socket~tcp~
        +acceptor: basic_socket_acceptor~tcp~
        +endpoint
        +resolver
        +iostream
    }

    class UdpProto["ip::udp"] {
        +v4()$
        +v6()$
        +socket: basic_datagram_socket~udp~
        +endpoint
        +resolver
    }

    class Endpoint["ip::basic_endpoint~Protocol~"] {
        +address()
        +port()
        +data()
        +size()
        +capacity()
    }

    class Resolver["ip::basic_resolver~Protocol~"] {
        +resolve(query)
        +async_resolve(query, token)
    }

    class IoObjectImpl["detail::io_object_impl~IoObjectService, Executor~"] {
        -service_type* service_
        -implementation_type impl_
        +get_service()
        +get_implementation()
        +get_executor()
    }

    class IOSvc2["I/O 服务 (use_service 获取)"]

    BasicSocket --|> socket_base
    StreamSocket --|> BasicSocket
    DgramSocket --|> BasicSocket
    Acceptor --|> socket_base
    TcpProto ..> StreamSocket : typedef socket
    TcpProto ..> Acceptor : typedef acceptor
    UdpProto ..> DgramSocket : typedef socket
    BasicSocket o-- Endpoint : local / remote endpoint
    TcpProto *-- Endpoint : endpoint
    Resolver o-- Endpoint : resolve 结果
    IoObjectImpl o-- BasicSocket : 内部持有
    IoObjectImpl ..> IOSvc2 : service_
```

### 4.3 定时器类层次

```mermaid
classDiagram
    class WaitableTimer["basic_waitable_timer~Clock, WaitTraits, Executor~"] {
        +executor_type
        +expires_at()
        +expires_after(duration)
        +wait()
        +async_wait(token)
        +cancel()
        +cancel_one()
    }

    class TimerSvc["detail::deadline_timer_service~TimeTraits~"] {
        -timer_queue_
        -timer_scheduler_
        +construct(impl)
        +destroy(impl)
        +expires_at(impl, time)
        +async_wait(impl, handler)
    }

    class Steady["chrono::steady_clock"]
    class System["chrono::system_clock"]

    WaitableTimer o-- TimerSvc : 经 io_object_impl 持有
    WaitableTimer ..> Steady : steady_timer 默认 Clock
    WaitableTimer ..> System : system_timer Clock

    note for WaitableTimer "typedef: steady_timer = basic_waitable_timer~chrono::steady_clock~<br/>system_timer = basic_waitable_timer~chrono::system_clock~<br/>high_resolution_timer = basic_waitable_timer~chrono::high_resolution_clock~"
```

### 4.4 异步完成模型（async_result / Completion Token）

这是 Asio 最关键的编译期架构：**同一发起函数，通过 `async_result` 特化适配多种交付风格**。

```mermaid
classDiagram
    class TokenConcept["CompletionToken «概念»"]
    <<interface>> TokenConcept

    class AsyncResult["async_result~Token, Signatures...~"] {
        +completion_handler_type
        +return_type
        +initiate(initiation, token, args...)$ return_type
    }

    class AsyncCompletion["async_completion~Token, Signatures...~"] {
        +completion_handler
        +result: async_result
    }

    class ArFuture["async_result~use_future_t, Signatures...~"] {
        +return_type: future
    }

    class ArAwaitable["async_result~use_awaitable_t, Signatures...~"] {
        +return_type: awaitable~T, Executor~
    }

    class Awaitable["awaitable~T, Executor~"] {
        +promise_type
        +executor_
    }

    class ArDeferred["async_result~deferred_t, Signatures...~"] {
        +return_type: deferred 惰性操作
    }

    class ArDetached["async_result~detached_t, Signatures...~"] {
        +return_type: void
    }

    class use_future_t {
        +allocator_
    }

    class use_awaitable_t {
        +executor_
    }

    class deferred_t
    class detached_t

    class AsyncInitiate["async_initiate"] {
        +operator(initiation, token, args...)$
    }

    TokenConcept ..> AsyncResult : 特化依据
    AsyncResult <|-- ArFuture
    AsyncResult <|-- ArAwaitable
    AsyncResult <|-- ArDeferred
    AsyncResult <|-- ArDetached
    ArFuture ..> use_future_t : 令牌类型
    ArAwaitable ..> use_awaitable_t : 令牌类型
    ArAwaitable ..> Awaitable : 返回类型
    AsyncCompletion ..> AsyncResult : 组合
    AsyncInitiate ..> AsyncResult : initiate 入口
```

### 4.5 SSL 流类层次（装饰器模式）

```mermaid
classDiagram
    class SslStream["ssl::stream~Stream~"] {
        +handshake(type)
        +async_handshake(type, token)
        +buffered_handshake(type)
        +async_buffered_handshake(type, token)
        +shutdown()
        +async_shutdown(token)
        +read_some(buffers)
        +write_some(buffers)
        -next_layer_: Stream
    }

    class StreamBase["stream_base"] {
        +handshake_type
    }

    class TcpSocket["ip::tcp::socket"] {
        +read_some()
        +write_some()
        +async_read_some()
        +async_write_some()
    }

    class SslContext["ssl::context"] {
        +use_certificate_chain_file()
        +use_private_key_file()
        +set_verify_mode(mode)
    }

    class HostVerification["ssl::host_name_verification"] {
        +verify(preverified, ctx) bool
    }

    StreamBase <|-- SslStream
    SslStream o-- TcpSocket : "next_layer_ (被装饰的流)"
    SslStream o-- SslContext : 构造时注入
    SslContext o-- HostVerification : verify 回调

    note for SslStream "典型用法: ssl::stream~ip::tcp::socket~ sock(ctx_io, ssl_ctx);"
```

### 4.6 取消机制类图

```mermaid
classDiagram
    class cancellation_signal {
        +emit(type)
        +slot() cancellation_slot&
        -impl_: cancellation_state
    }

    class cancellation_slot {
        +assign~C~(cancellation_handler)
        +operator()(type)
        -handler 指针
    }

    class cancellation_state {
        +state() cancellation_type
        +cancelled() cancellation_type
        +slot() cancellation_slot
    }

    class cancellation_type {
        <<enumeration>>
        none
        terminal
        partial
        total
    }

    class CancelAfter["cancel_after"] {
        +定时到期自动 emit
    }

    class CancelAt["cancel_at"] {
        +绝对时间点自动 emit
    }

    class PendingOp["挂起的异步操作 (持有 slot)"] {
        +取消处理器: 强制完成并返回 operation_aborted
    }

    cancellation_signal o-- cancellation_state
    cancellation_state o-- cancellation_slot
    cancellation_signal ..> cancellation_type : emit(type)
    cancellation_slot --> PendingOp : 指向登记的取消处理器
    CancelAfter ..> cancellation_signal : 到期 emit
    CancelAt ..> cancellation_signal : 到期 emit
```

---

## 5. 关键 UML 流程图

### 5.1 io_context.run() 事件循环

```mermaid
sequenceDiagram
    autonumber
    actor User as 用户线程
    participant Ctx as io_context
    participant Sched as detail::scheduler
    participant Reactor as epoll_reactor 等后端
    participant Kernel as 内核

    User->>Ctx: run()
    Ctx->>Sched: run()

    loop 直到无未完成工作或 stop()
        Sched->>Sched: 从任务队列取出已完成的<br/>scheduler_operation
        alt 队列为空
            Sched->>Reactor: run(timeout) 阻塞等待
            Reactor->>Kernel: epoll_wait() / kqueue 等
            Kernel-->>Reactor: I/O 事件就绪
            Reactor->>Reactor: 对应 reactor_op 标记完成<br/>(可执行 perform())
            Reactor-->>Sched: 完成的操作放入任务队列
        end
        Sched->>Sched: op->complete(owner, ec, bytes)<br/>调用用户完成处理器
    end

    Ctx-->>User: 返回已处理数量
```

### 5.2 同步读操作流程

```mermaid
sequenceDiagram
    autonumber
    actor App as 应用
    participant Sock as ip::tcp::socket<br/>(basic_stream_socket)
    participant Svc as reactive_socket_service
    participant Ops as socket_ops<br/>(系统调用封装)
    participant Kernel as 内核

    App->>Sock: read_some(buffers)
    Sock->>Svc: receive(impl_, buffers, flags)
    Svc->>Ops: ::recv(fd, data, size, flags)
    Ops->>Kernel: 系统调用
    Kernel-->>Ops: bytes_transferred 或 EAGAIN
    alt EAGAIN（非阻塞场景）
        Ops->>Ops: 内部短暂重试/阻塞等待
    end
    Ops-->>Svc: 结果
    Svc-->>Sock: bytes_transferred / error_code
    Sock-->>App: 返回（或抛出异常）
```

### 5.3 异步读操作流程（回调风格）

```mermaid
sequenceDiagram
    autonumber
    actor App as 应用
    participant Sock as ip::tcp::socket
    participant AR as async_initiate /<br/>async_result
    participant Svc as reactive_socket_service
    participant Op as detail::reactive_socket_recv_op<br/>(reactor_op)
    participant Ctx as io_context / scheduler
    participant Reactor as epoll_reactor
    participant Kernel as 内核

    App->>Sock: async_read_some(buffers, handler)
    Sock->>AR: async_initiate(initiate_async_receive{}, token, impl, buffers, flags)
    AR->>AR: 由 token 生成 completion_handler_type<br/>（绑定关联执行器/分配器/取消槽）
    AR->>Svc: async_receive(impl, buffers, flags, handler)
    Svc->>Op: 构造 reactor_op<br/>(封装 handler 与缓冲区)
    Svc->>Ctx: schedule_operation(op)
    Ctx->>Reactor: start_op(op)
    Reactor->>Kernel: epoll_ctl(ADD/MOD)<br/>注册读就绪事件
    Ctx->>Ctx: on_work_started()<br/>（run() 不会因无任务退出）

    Note over Ctx, Kernel: I/O 完成与数据搬运
    Ctx->>Reactor: (run 循环) epoll_wait()
    Kernel-->>Reactor: fd 读就绪
    Reactor->>Op: perform(ec, bytes)<br/>（执行 ::recv 搬运数据）
    Op-->>Reactor: 完成
    Reactor->>Ctx: op 入任务队列
    Ctx-->>App: handler(ec, bytes_transferred)<br/>（经关联执行器派发）
```

### 5.4 协程异步流程（co_spawn / use_awaitable）

```mermaid
sequenceDiagram
    autonumber
    actor App as 应用
    participant Spawn as co_spawn
    participant Coro as awaitable~T~ 协程体
    participant Sock as ip::tcp::socket
    participant UA as async_result~use_awaitable_t~
    participant Ctx as io_context / scheduler

    App->>Spawn: co_spawn(ctx, coro, completion_handler)
    Spawn->>Coro: 在关联执行器上启动协程<br/>（进入协程帧）

    Coro->>Sock: co_await socket.async_read_some(buf, use_awaitable)
    Sock->>UA: async_initiate(..., use_awaitable, ...)
    UA->>Ctx: 创建完成处理器并登记<br/>（处理器持有协程恢复点）
    Note right of UA: 协程在此挂起，<br/>控制权返回 io_context.run()
    Ctx->>Ctx: 继续运行其他任务... 直到 I/O 完成

    UA-->>Coro: 恢复协程<br/>co_await 表达式得到 (ec, bytes)

    Coro->>Sock: （后续可继续 co_await 其他操作）
    Coro->>Spawn: co_return result
    Spawn-->>App: completion_handler(ec, result)
```

### 5.5 TCP 服务器：连接接受流程

```mermaid
sequenceDiagram
    autonumber
    actor App as 应用 (TCP 服务器)
    participant Acc as ip::tcp::acceptor
    participant Svc as reactive_socket_service
    participant Ctx as io_context / scheduler
    participant Reactor as epoll_reactor
    actor Client as 客户端

    App->>Acc: acceptor(io_context, endpoint)
    App->>Acc: listen()
    App->>Acc: async_accept(token)
    Acc->>Svc: async_accept(impl_, peer, handler)
    Svc->>Ctx: 登记 accept reactor_op<br/>(epoll_ctl 注册可读事件)

    Client->>Client: connect() 发起连接
    Ctx->>Reactor: epoll_wait() → 监听 fd 可读
    Reactor->>Svc: perform() → ::accept()
    Svc-->>Ctx: 生成新 socket 并入完成队列
    Ctx-->>App: handler(ec, peer_socket)<br/>（新连接的 socket 交回应用）
    App->>App: 为新连接启动读循环 /<br/>再次 async_accept() 等待下一连接
```

### 5.6 定时取消流程（cancel_after）

```mermaid
sequenceDiagram
    autonumber
    actor App as 应用
    participant Sig as cancellation_signal
    participant Op as 挂起的异步操作<br/>(tcp::socket.async_read_some)
    participant TimerSvc as 定时器服务
    participant Ctx as io_context / scheduler

    App->>Sig: 创建 cancellation_signal
    App->>Op: 发起 async_read_some(..., sig.slot())
    Op->>Op: 在 cancellation_slot 上登记取消处理器
    App->>TimerSvc: cancel_after(sig, 5s)
    TimerSvc->>Ctx: 登记 5s 后到期的定时器项

    Note over App, Ctx: 分支 1：5 秒后定时器到期（若操作尚未完成）
    Ctx->>TimerSvc: 定时器项到期
    TimerSvc->>Sig: emit(cancellation_type::terminal)
    Sig->>Op: 调用取消处理器
    Op->>Ctx: 强制完成挂起操作<br/>(ec = operation_aborted)
    Ctx-->>App: handler(operation_aborted, 0)

    Note over App, Ctx: 分支 2：若操作在 5s 内正常完成
    Op->>Op: 到期时槽已清空<br/>取消被忽略
```

---

## 6. 线程模型与线程安全

| 对象 | 多线程共享 | 说明 |
|---|---|---|
| `io_context` | 需外部同步或 strand | 多线程可同时调用 `run()`，但共享 I/O 对象的处理器需 `strand` 串行化 |
| I/O 对象（socket 等） | 不安全 | 官方约定：不同对象之间安全，同一对象共享不安全（显式说明的除外） |
| `strand` | 安全 | 保证经其派发的处理器互斥执行 |
| `execution_context::service` | 安全 | 服务内部自行保证状态一致性 |
| `thread_pool` | 安全 | 设计为多线程提交任务 |

---

## 7. 扩展点

| 扩展点 | 机制 | 用途 |
|---|---|---|
| 自定义完成令牌 | 特化 `async_result<Token, Signatures...>` | 接入自定义异步交付风格 |
| 自定义执行器 | 满足 Executor 概念（`execute()` + 关联 `execution_context`） | 自定义调度策略 |
| 自定义 I/O 服务 | 继承 `execution_context::service` + `use_service<T>()` 注册 | 注入自定义服务（如 asio 自身的 `ssl` 即以服务方式扩展） |
| 自定义协议 | 定义 Protocol 类型（含 `endpoint` / `socket` / `acceptor` typedef） | 复用 `basic_*` 模板接入新协议（`generic/` 已内置通用协议） |
| 处理器追踪 | `BOOST_ASIO_ENABLE_HANDLER_TRACKING` + `tools/handler*.{pl}` | 调试异步调用链（`handlerviz.pl` 可视化） |

---

## 8. 附录：关于图表渲染（Mermaid）

本文所有架构图、类图与时序图均采用标准 **Mermaid** 格式编写：

- **GitHub / GitLab**：开箱即用，无需任何插件或额外依赖，在线即可直接原生渲染为清晰的矢量图。
- **VS Code / Cursor**：原生 Markdown 预览器（`Ctrl+Shift+V` 或 `Cmd+Shift+V`）内置 Mermaid 渲染支持。
- **命令行导出**：如需将图表批量导出为图片或离线文档，可使用 `@mermaid-js/mermaid-cli`：
  ```bash
  # 使用 mmdc 导出离线预览
  npx -y @mermaid-js/mermaid-cli -i ARCHITECTURE.md -o ARCHITECTURE.pdf
  ```

---

## 参考链接

- [README.md](README.md) —— 本仓库代码树与模块功能说明
- `doc/overview/` —— 概念性概览（异步模型、执行器、缓冲区等官方文档源）
- `doc/net_ts.qbk` —— Networking TS 兼容性说明
