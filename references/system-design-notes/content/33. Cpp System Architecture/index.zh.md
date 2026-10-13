---
id: cpp-system-architecture-practice
title: C++ 系统架构实战：所有权、任务调度与异步结果
titleEn: C++ System Architecture in Practice
author: system-design-notes
order: 33
category: developer-tools
description: 用设备网关串起智能指针、模板、Promise/Future、锁、条件变量、线程池、Handler/Runner，并对照 Java 和真实开源案例。
tags: [C++, 系统架构, 智能指针, 模板, Future, 并发, Java, 嵌入式]
---

# C++ 系统架构实战：所有权、任务调度与异步结果

> 阅读目标：看到一个 C++ 特性时，知道它解决哪类架构问题、放在哪一层、什么时候不该用。
>
> 基线：C++20；C++23 特性单独标注。资料核对日期：2026-09-30。开源项目事实依据官方文档和源码；“设备网关”及配套线程池为本文设计的教学示例，不是对某个项目源码的复制。Java 类比用于理解职责，不能直接等同语言语义。

## 1. 先建立整体脉络

以一个 Linux 上的设备/Modem 网关为例：接收 TCP 请求，解析协议，将命令交给设备，必要时做计算或读写存储，最后返回结果。相同主线也适用于行情服务、日志解析服务和本地任务代理。

系统需要同时回答四个问题：

1. **所有权**：连接、请求、缓冲区是谁的，什么时候销毁？
2. **执行权**：任务在哪个线程执行，谁负责排队和调度？
3. **结果权**：谁产出结果，谁消费结果，怎样交付错误？
4. **终止权**：超时、取消、断连、关闭分别由谁处理？

![请求、调度与结果的整体架构](images/request-runtime.svg)

| 架构层 | 职责 | 常用 C++ 工具 | Java 类比 |
| --- | --- | --- | --- |
| 接入层 | 接收连接、读写、定时器、协议分帧 | Asio / Reactor、回调、缓冲区 | Netty EventLoop / Channel |
| 请求模型 | 表示请求、响应、错误和状态 | 值类型、`variant`、移动语义 | DTO、record、sealed hierarchy |
| 路由与业务层 | 根据请求选择并执行业务 | Handler、接口、模板、函数对象 | Service、CommandHandler、Function |
| 调度层 | 接收任务，决定执行位置 | Executor、Runner、队列、线程池 | ExecutorService、EventExecutor |
| 同步层 | 保护共享状态，等待条件成立 | mutex、RAII lock、CV、atomic | ReentrantLock、Condition、Atomic* |
| 结果层 | 交付一个值或一次异常 | promise、future、packaged_task | Future、CompletableFuture |
| 生命周期层 | 拥有资源、结束后台工作 | unique_ptr、shared_ptr、weak_ptr、join | 强引用、WeakReference、close / shutdown |

最容易混淆的地方是：**Handler 做业务；Runner 驱动执行；Future 表示结果；这些角色都不自动提供线程安全。**

## 2. 智能指针：先判断所有权，再选择类型

### 2.1 一张选择表

| 真实场景 | 优先选择 | 选择理由 | 常见错误 |
| --- | --- | --- | --- |
| 小型请求、配置、返回值 | 普通值对象 | 直接管理生命周期，便于移动 | 所有对象都放到堆上 |
| 临时访问，调用结束不保留 | `T&` / `const T&` | 借用，不接管所有权 | 把借用引用保存到异步任务 |
| 可为空的借用 | `T*` | 表达可选观察关系 | 看到裸指针就默认负责 delete |
| 服务独占一个设备或模块 | `unique_ptr<T>` | 只有一个所有者，可转移 | 为了方便复制换成 shared_ptr |
| 多个异步操作共同延长连接生命周期 | `shared_ptr<T>` | 最后一个所有者离开时释放 | 认为引用计数保护了对象内部数据 |
| 定时器、观察者不应延长对象寿命 | `weak_ptr<T>` | 访问前尝试获得临时所有权 | 回调与对象相互持有强引用 |
| 借用一段字节/字符串 | `span` / `string_view` | 表达视图，避免必要之外的复制 | 原缓冲区释放后继续使用视图 |

**默认从值对象和 unique_ptr 开始，只有证明需要共享生命周期时才引入 shared_ptr。**

### 2.2 unique_ptr：一个明确的负责人

设备网关拥有串口对象；业务层可以访问设备，但不负责销毁它。

```cpp
class Gateway {
    std::unique_ptr<Device> device_;  // Gateway 负责生命周期
public:
    explicit Gateway(std::unique_ptr<Device> device)
        : device_(std::move(device)) {}

    Device& device() { return *device_; }  // 调用者只借用
};
```

`unique_ptr` 不可复制、可以移动。移动的是所有权，不是复制整个设备。`std::move` 本身是类型转换；是否移动、怎样移动由具体类型的构造/赋值实现决定。

异步队列也可以接管一份请求：

```cpp
// 以下为概念示例：executor 必须支持移动型 callable。
auto request = std::make_unique<Request>();
executor.post([request = std::move(request)]() mutable {
    handle(*request);
});
// request 已移交；调用方不能继续解引用它。
```

对应 Java：普通变量赋值一般复制引用，语言通常不会禁止原持有者继续访问。Java 没有与 unique_ptr 相同的通用所有权转移规则；可用封装和约定模拟，不能把两者当作等价。

### 2.3 shared_ptr：共同持有生命周期

连接正在处理请求时，网络层和后台任务都可能需要它活着。后台任务捕获一份 shared_ptr，让连接至少活到任务结束。

```cpp
// 仅在业务明确需要“任务期间连接必须存活”时使用。
auto connection = std::make_shared<Connection>();
executor.post([connection] {
    connection->prepare_response();
});
```

但“对象还活着”与“多个线程可以安全改它”是两件事：

- 不同 shared_ptr 实例共享同一控制块，可以在相应规则下独立增减所有权。
- 多线程并发修改同一个 shared_ptr 变量，需要同步或 `atomic<shared_ptr<T>>`。
- `T` 内部状态仍需要锁、不可变设计或线程归属规则。
- 最后一次释放可能在任意持有者线程发生；如果资源必须在 I/O 线程销毁，需要单独安排析构执行位置。

**Java 类比**：多个强引用让对象可达，但 GC 的可达性和 shared_ptr 的引用计数不同；两者都不保护业务字段的并发访问。

依据：[C++ 标准工作草案：shared_ptr](https://eel.is/c++draft/util.smartptr.shared)。

### 2.4 weak_ptr：观察而不强行续命

如果连接断开后不需要继续执行定时回调，回调应捕获弱引用：

```cpp
std::weak_ptr<Connection> weak = connection;
executor.post([weak] {
    if (auto conn = weak.lock()) {
        conn->check_timeout();
    }  // 临时所有权在这里释放
});
```

用途包括观察者列表、定时器、缓存反向关系，以及打断循环引用。典型循环是“连接拥有回调，回调又拥有连接”；可回收这类不可达循环的 GC 与 shared_ptr 不同，shared_ptr 不会自动打破强引用环。

使用 `enable_shared_from_this` 时，必须让对象已经由合适的 shared_ptr 管理，再调用 `shared_from_this()`；不要在构造函数中调用，也不要从同一个 `this` 再构造独立控制块的 shared_ptr。

真实代码入口：[Muduo Channel.cc](https://github.com/chenshuo/muduo/blob/master/muduo/net/Channel.cc)。其事件处理会从弱引用提升出局部 guard，在处理期间保住对象。

### 2.5 RAII 不止用于内存

RAII 把资源释放放在对象析构中，可管理文件描述符、锁、事务回滚、临时文件、限流令牌和回调完成责任。普通作用域退出、提前 return、异常展开均会触发相关析构；进程被强制终止等情况不属于这个保证。

Java 对应的是 `AutoCloseable` + `try-with-resources`，而不是“等待 GC 自动关闭文件”。[Oracle 官方说明](https://docs.oracle.com/javase/tutorial/essential/exceptions/tryResourceClose.html)。

![连接所有权与弱引用](images/connection-ownership.svg)

## 3. 模板、Concepts 和多态：把变化放在合适的时机

### 3.1 模板解决“同一流程，不同类型”

网关要执行不同任务：某些返回 int，某些返回 Response，某些只产生副作用。线程池的 `submit` 用模板保留任务的具体返回类型：

```cpp
template<class F>
    requires std::is_invocable_v<std::decay_t<F>&>
auto submit(F&& function)
    -> std::future<std::invoke_result_t<std::decay_t<F>&>>;
```

这里的职责：

- `F`：接受 lambda、函数对象等不同 callable。
- `F&&`：在模板推导场景下作为转发引用。
- `std::forward<F>`：保留传入对象的值类别。
- `std::decay_t`：得到用于保存 callable 的值类型；传引用需有意识使用 `std::ref`。
- `invoke_result_t`：编译期推导返回值。
- `requires`：在 C++20 中限制合法任务类型，帮助表达接口合同。

**模板适合**：类型安全任务提交、消息编解码、容器、算法、可在编译时选择的策略。**代价**：编译成本、错误信息、代码实例化体积，以及头文件耦合。

Java 泛型也能表达类型关系，但常见泛型采用擦除；C++ 模板实例化还能围绕类型生成实现、参与编译期计算。不要简单理解成“Java 泛型换个语法”。

### 3.2 虚接口解决“运行时替换实现”

运行时选择真实 Modem、模拟器或回放设备，业务层依赖抽象接口更直接：

```cpp
struct IDevice {
    virtual ~IDevice() = default;
    virtual Response execute(const Request&) = 0;
};
```

| 需求 | 合适机制 | 判断依据 |
| --- | --- | --- |
| 部署时或配置中选择设备实现 | 虚接口 / 组合 | 调用者不应依赖具体类型 |
| 热路径上编译期确定编解码器 | 模板策略 / Concepts | 类型固定，编译器有机会优化 |
| 同一队列保存多种任务 | 类型擦除 | 队列需要统一表示 |
| 协议只有有限事件类型 | `variant` + `visit` | 封闭类型集合，显式分支 |
| 隐藏实现和头文件依赖 | PImpl + unique_ptr | 降低实现暴露和重编译传播 |

类型擦除让异构对象经统一接口调用，方便组合，但可能带来间接调用和分配。`std::function` 要求保存的目标可复制；捕获 unique_ptr 的 lambda 通常不可复制。可选 C++23 `std::move_only_function`，或本文 C++20 示例使用的 move-only `packaged_task`。

CRTP 可为具体类型提供编译期共用行为；它不是自动消除所有运行时开销的开关，也不应为了炫技替代清晰的虚接口。

## 4. Handler、Runner、Executor 和线程池

这些名称在不同框架中会略有不同。本文用以下职责定义；`Handler` 和 `Runner` 不是 C++ 标准规定的一对类。

| 角色 | 回答的问题 | 本文网关例子 |
| --- | --- | --- |
| Business Handler | 业务具体做什么？ | 查询设备状态、解析日志、读取行情 |
| Completion Handler | 操作完成之后做什么？ | 检查读写结果，启动下一次读取 |
| Task | 本次要执行哪一份工作？ | 绑定了请求及上下文的 callable |
| Executor | 任务提交给谁、在哪执行？ | I/O executor、CPU executor、串行 executor |
| Runner | 谁持续驱动执行机制？ | 调用 `io_context.run()` 的线程，或 worker 循环 |
| Thread pool | 哪些线程执行，容量如何控制？ | 固定 worker 数量与有界待执行队列 |
| Dispatcher | 根据什么选择 Handler？ | 按请求类型路由到业务实现 |

把 Handler 与 Runner 分开，业务就可以在单元测试中直接调用，在生产中交给线程池，也可以换成串行执行器而不改业务逻辑。

**Boost.Asio 的具体对应**：`io_context` 是执行上下文；线程调用 `run()` 驱动完成回调；`post` 提交工作。多个线程调用同一个 `run()` 可形成执行回调的线程集合。跨平台高层 API 表现为异步完成语义，底层有时由 Reactor 实现，不要把所有底层机制一律叫成同一种模式。[线程模型](https://www.boost.org/doc/libs/latest/doc/html/boost_asio/overview/core/threads.html)、[异步架构](https://www.boost.org/doc/libs/latest/doc/html/boost_asio/overview/core/async.html)、[线程池](https://www.boost.org/doc/libs/latest/doc/html/boost_asio/reference/thread_pool.html)。

**Java 类比**：业务 Handler 类似 Service / Callable；Executor 类似 ExecutorService；Runner 类似工作线程主循环；Asio 的事件循环可类比 Netty EventLoop。它们是职责类比，不表示线程归属、取消和回调调度规则完全相同。[Netty 官方 EventLoop](https://netty.io/4.1/api/io/netty/channel/EventLoop.html)。

## 5. Promise、Future、packaged_task：结果通道与执行机制分离

### 5.1 三者各管什么

| 类型 | 职责 | 适用场景 |
| --- | --- | --- |
| `promise<T>` | 生产者手动写入结果或异常 | 将已有回调式 API 适配为 Future |
| `future<T>` | 消费者等待并取得一次结果 | 提交后台任务后获取响应 |
| `shared_future<T>` | 多个消费者观察同一共享结果 | 一次初始化，多个模块等待；不自动保证结果对象可变访问安全 |
| `packaged_task<R()>` | 将 callable 与结果共享状态关联 | 在线程池中统一交付返回值与异常 |
| `async` | 按启动策略安排求值，返回 Future | 简单独立任务；不能据此假定使用你的有界线程池 |

Promise/Future **不创建线程**。线程池也**不天然交付结果**；两者组合后才构成“提交任务 → 后台执行 → 收到值或异常”。

### 5.2 明确分离生产者和消费者

```cpp
std::promise<Response> producer;
auto consumer = producer.get_future();

// 示例接口 execute_async 是本文假定的回调式业务 API。
execute_async([p = std::move(producer)]() mutable {
    try {
        p.set_value(make_response());
    } catch (...) {
        p.set_exception(std::current_exception());
    }
});
// 仅适合允许阻塞的调用线程；不要在驱动此操作的 I/O 线程 get。
Response response = consumer.get();
```

这个接口要求接收方能保存 move-only 回调，并保证其完成分支最多执行一次。若真实 API 使用可复制回调，需要适配所有权；不能直接把捕获 promise 的 lambda 塞进 std::function。

- `get_future()` 对同一个 Promise 只能成功取得一次普通 Future。
- 普通 Future 的 `get()` 消费结果；多消费者需要考虑 `shared_future`。
- 值和异常构成一次完成，重复完成会出错。
- 未交付结果就丢弃生产者会产生 broken promise。
- 对普通标准 Future，`get()` 在结果未准备好时阻塞。
- `wait_for` 超时只表示没等到结果，**不自动取消后台任务**。

依据：[Promise 规范](https://eel.is/c++draft/futures.promise)、[Future 规范](https://eel.is/c++draft/futures.unique.future)。

### 5.3 与 Java CompletableFuture 的差异

Java CompletableFuture 同时提供完成与观察能力，并支持回调链/组合操作。C++ 的标准 promise 和 future 分离生产端与消费端；C++20 的 `std::future` 没有通用 `.then()` 链，也不能直接当作标准 `co_await` 对象。Seastar 等框架的 Future 另有调度与组合协议。[Oracle CompletableFuture](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/CompletableFuture.html)。

不要在任务内部等待同一小线程池中尚未执行的子任务：当全部 worker 都在 `get()`，而子任务还在排队，就可能发生线程池饥饿死锁。优先让调用方组合结果、使用适配的 continuation，或明确不同执行域。

![任务与异步结果交付](images/task-completion.svg)

## 6. 锁与条件变量 CV：保护状态，等待状态变化

### 6.1 锁保护的是不变量

线程池中，“队列为空吗”“还有容量吗”“是否关闭”必须在同一一致视图中决定。只把关闭标记换成 atomic，并不能自动保护队列和容量之间的不变量。

| 工具 | 应用位置 | 为什么选它 |
| --- | --- | --- |
| `mutex` | 待执行队列、共享状态组合 | 保护复合操作与不变量 |
| `lock_guard` | 入队、短时更新 | 固定作用域持锁，自动释放 |
| `unique_lock` | CV 等待、需要解锁/重锁 | 可在等待时暂时释放锁 |
| `scoped_lock` | 同时取得多个互斥量 | 处理多锁获取；仍要避免业务层环形等待 |
| `shared_mutex` | 经测量证明有利的读多写少场景 | 不应仅凭“读多”就默认更快 |
| `atomic` | 独立计数、合适的状态发布协议 | 原子变量不是多字段事务 |

### 6.2 CV 是“条件等待”，不是存储事件的容器

worker 等待“有任务或正在关闭”：

```cpp
std::unique_lock<std::mutex> lock(mutex);
cv.wait(lock, [&] { return closing || !queue.empty(); });

if (queue.empty()) {
    return;  // 谓词成立且无任务，因此正在关闭
}
auto task = std::move(queue.front());
queue.pop_front();
lock.unlock();
task();  // 不在队列锁内执行用户代码
```

要点：

1. 谓词处理虚假唤醒，也处理真正通知之后状态已被其他 worker 消费的情况。
2. 条件状态由同一 mutex 保护，等待前先检查状态；通知本身不保存为“下一次可消费的消息”。
3. `wait` 在等待过程中释放锁，返回时重新持锁。
4. 入队后通知 worker；关闭时通常通知所有 worker。
5. 避免持队列锁执行 Handler，否则整个线程池可能被串行化，甚至因重入提交而死锁。
6. 销毁 mutex/CV 前，确保 worker 都已经退出并 join。

对应 Java：`ReentrantLock` + `Condition.await()/signal()`，或具有内部同步语义的 `BlockingQueue`。条件变量并不等同一个任务队列。[CV 标准工作草案](https://eel.is/c++draft/thread.condition.condvar)。

## 7. 可运行实战：一个有界线程池

完整源码：[bounded_thread_pool.cpp](https://github.com/luckyJimLu/system-design-notes/blob/main/content/33.%20Cpp%20System%20Architecture/examples/bounded_thread_pool.cpp)。

这个例子把前面的概念集中到一个对象里：

- 模板 `submit(F&&)` 保留结果类型。
- `packaged_task` 负责把返回值和异常交给 Future。
- move-only 任务允许捕获 unique_ptr，避免为适配可复制 callable 而强行共享资源。
- mutex 保护队列、容量与关闭状态。
- CV 让空闲 worker 阻塞等待；它就是 Runner 的等待机制。
- 固定 worker 数量执行任务，等待队列有界。
- 满队列立即拒绝；关闭后拒绝新任务。
- shutdown 排空已接受任务，再 join 所有 worker。

运行命令：

```bash
bash scripts/check-cpp-examples.sh
```

也可独立编译：

```bash
g++ -std=c++20 -Wall -Wextra -Werror -pedantic -pthread \
  'content/33. Cpp System Architecture/examples/bounded_thread_pool.cpp' \
  -o /tmp/bounded-thread-pool
/tmp/bounded-thread-pool
```

覆盖：正常结果、unique_ptr 捕获、异常传递、关闭拒绝、队列容量拒绝、排空退出。容量测试通过 Promise 协调，让一个 worker 确实占用，而不是依赖 sleep 猜测时序。

**教学示例的明确边界**：仅接受无参数 callable（参数用 lambda 绑定）；生命周期由一个外部协调者管理；允许 submit 与关闭状态切换竞争，但 shutdown 不能并发调用，不能在本线程池任务中关闭/销毁自身。任务必须最终返回；它不提供强制打断、超时取消、优先级、指标、work stealing 或生产级资源隔离。返回 `T&` 的任务仍需调用方保证被引用对象存活。

采用 `std::thread` 是为了显式展示 join 责任。C++20 `jthread` 可自动请求停止并 join，但停止是协作式的；使用普通 `condition_variable` 的 wait 不会仅因为 stop token 被请求就自动唤醒，仍要设计通知/等待协议。自动 join 也不能解决永不返回的任务。

## 8. 超时、取消、关闭：写清协议比选类型更重要

| 事件 | 应当定义的行为 | 最容易遗漏的点 |
| --- | --- | --- |
| 排队超时 | 拒绝执行或标为过期 | worker 取出时仍要检查截止时间 |
| 执行超时 | 调用方返回超时，任务协作终止 | 等待超时不代表设备操作已停止 |
| 连接断开 | 取消不再需要的响应或继续完成持久化 | 销毁连接与终止业务不是同一件事 |
| 队列满 | 拒绝、上游背压、合并或丢弃可丢任务 | 无界队列会把过载变成内存问题 |
| 服务关闭 | 停止接入，拒绝新任务，完成或取消旧任务 | 不要先停掉交付结果所依赖的 I/O loop |
| Future 完成 | 值、错误、取消只有一个完成赢家 | 超时线程与任务线程不能各完成一次 Promise |

![有序关闭流程](images/draining-shutdown.svg)

设备网关通常按以下顺序关闭：停止接收新请求；关闭提交入口；对旧任务采用排空或协作取消策略；仍保留结果交付需要的 I/O 执行能力；等待任务与必要回调收尾；join worker；最后停止 I/O Runner 并释放设备资源。实际次序取决于依赖图，不能把这份顺序机械套用到所有系统。

若同时存在“真实任务完成”和“定时超时”两条路径，应把 Pending → Success / Failure / Cancelled 的状态转换放在一个串行执行域，或者使用明确的同步状态机来决定唯一赢家。单纯捕获 shared_ptr 只保住状态对象，不会解决重复完成。

## 9. 多线程、事件循环与协程如何组合

| 模型 | 合适场景 | 避免的误用 |
| --- | --- | --- |
| I/O 事件循环 | 大量连接、定时器、短回调 | 在 I/O 线程做长计算、阻塞 get |
| CPU 线程池 | 解析、压缩、校验、有限计算任务 | 把长时间设备等待塞满计算池 |
| 独立设备 Runner | 要求串行命令或特殊线程归属的设备 | 以更多线程代替协议状态机 |
| Strand / 串行 executor | 同一连接状态有多个来源更新 | 认为串行 executor 必然绑定固定线程 |
| C++20 协程 | 多步异步流程、易读的控制流 | 认为 co_await 自动生成线程或替你保存所有借用对象 |
| 每核分片 | 高吞吐、共享状态竞争成为瓶颈 | 无测量依据就重写成复杂分片系统 |

协程是表达异步控制流的语言机制，执行器/框架决定何时恢复和在哪恢复；不会自动让阻塞系统调用变成非阻塞。跨暂停点使用引用、this、span 时尤其要检查生命周期。协程 lambda 的捕获对象也有自己的寿命，不能因为用了协程就忽略悬空风险。

Java 的 CompletableFuture / 虚拟线程，以及 C++ 的 Seastar Future / 协程，都能改善异步代码表达，但它们对应的栈、运行时、任务调度和对象生命期不同。bthread 也不是 C++20 无栈协程的别名。[JEP 444](https://openjdk.org/jeps/444)、[Seastar 协程教程](https://docs.seastar.io/master/tutorial.html)。

## 10. 真实开源案例：按架构问题阅读

### 10.1 Muduo：事件循环与连接生命期

- **实际问题**：多线程 Linux 网络服务中，连接、事件、回调和 I/O 线程怎样协作。
- **架构重点**：one loop per thread、连接归属、将工作转交正确 EventLoop。
- **语言重点**：RAII、回调函数对象、shared_ptr / weak_ptr 处理异步生命期。
- **阅读入口**：[仓库](https://github.com/chenshuo/muduo)、[作者书籍与章节](https://www.chenshuo.com/book/)、[Channel.cc](https://github.com/chenshuo/muduo/blob/master/muduo/net/Channel.cc)。
- **Java 类比**：Netty EventLoop + Channel + Handler；额外关注 C++ 析构位置与引用环。
- **动手练习**：做一个长度头协议 Echo 服务，加入工作队列、断连回调、结果投递，检查任务完成时连接是否仍有效。

### 10.2 Boost.Asio：Handler 与执行上下文解耦

- **实际问题**：以跨平台方式组织 socket、定时器和异步完成回调。
- **架构重点**：操作启动、完成队列、handler 调度、io_context 与执行线程分离。
- **语言重点**：模板化异步接口、lambda、移动捕获、executor、RAII。
- **阅读入口**：[线程模型](https://www.boost.org/doc/libs/latest/doc/html/boost_asio/overview/core/threads.html)、[Proactor 说明](https://www.boost.org/doc/libs/latest/doc/html/boost_asio/overview/core/async.html)、[thread_pool](https://www.boost.org/doc/libs/latest/doc/html/boost_asio/reference/thread_pool.html)。
- **Java 类比**：EventLoop / ExecutorService；分别辨别业务 handler 与完成 handler。
- **动手练习**：I/O loop 接收数据，CPU pool 解析，结果投回 I/O executor；所有连接写入在同一串行执行域完成。

### 10.3 Apache bRPC：RPC 完成责任与 M:N 调度

- **实际问题**：并发 RPC 服务怎样让业务较易编写，同时控制响应完成与过载。
- **架构重点**：bthread 将多个逻辑执行单元映射到较少 pthread；服务/方法级并发限制。
- **语言重点**：RAII `ClosureGuard`，确保控制路径退出时履行完成回调责任；异步交接时明确 release 后由谁负责。
- **阅读入口**：[Server Basics](https://brpc.apache.org/docs/server/basics/)、[bthread](https://brpc.apache.org/docs/bthread/bthread/)。
- **Java 类比**：虚拟线程可帮助理解“逻辑并发数与 OS 线程数分离”；完成责任可类比 finally，但调度与阻塞适配规则并不相同。
- **动手练习**：实现一个会提前返回错误的 RPC，逐一检查成功、失败、异步交接是否都只完成一次。

### 10.4 RocksDB：可替换策略与非拥有视图

- **实际问题**：嵌入进程内的键值存储，管理读写、WAL、后台整理及配置策略。
- **架构重点**：列族、WriteBatch、后台资源、比较器等扩展边界。
- **语言重点**：虚接口表达可替换策略；Slice 表达指针加长度的非拥有视图，暴露必要的生命周期合同。
- **阅读入口**：[Overview](https://github.com/facebook/rocksdb/wiki/RocksDB-Overview)、[Slice](https://github.com/facebook/rocksdb/blob/main/include/rocksdb/slice.h)、[Comparator](https://github.com/facebook/rocksdb/blob/main/include/rocksdb/comparator.h)。
- **Java 类比**：Comparator / Strategy、ByteBuffer 视图。C++ 的 Slice 不替调用者续命；存储调用的持久性与原子性还要由选项定义。
- **动手练习**：把设备日志按设备 ID + 时间编码为 key；检查键排序、批量写入原子性和临时缓冲区寿命。

### 10.5 Seastar / ScyllaDB：用分片减少共享竞争

- **实际问题**：多核高吞吐服务器中，锁与跨核共享会影响扩展性。
- **架构重点**：每核 reactor / shard、显式跨核消息、框架 Future、协作式调度。
- **语言重点**：C++20 协程、future / continuation、移动语义、thread_local 状态、RAII 限流令牌。不要把其 Future 等同 std::future。
- **阅读入口**：[共享无关设计](https://seastar.io/shared-nothing/)、[官方教程](https://docs.seastar.io/master/tutorial.html)、[协程 lambda 生命周期问题](https://github.com/scylladb/seastar/blob/master/doc/lambda-coroutine-fiasco.md)。
- **Java 类比**：按 key 分片的单线程事件循环，结果组合类似 CompletableFuture；C++ 还要明确跨核对象的销毁归属。
- **动手练习**：为每个设备建立串行执行域，所有状态更新在所属域进行；比较共享 mutex 与消息投递两种设计。

### 10.6 ROS 2：智能指针决定消息传递语义

- **实际问题**：传感器/图像节点组成流水线，减少进程内数据复制。
- **架构重点**：发布/订阅、executor、可组合节点、消息拥有者与观察者。
- **语言重点**：模板消息类型、unique_ptr + move 转交、共享只读消息、weak_ptr 回调。
- **阅读入口**：[官方 two_node_pipeline 示例](https://github.com/ros2/demos/blob/rolling/intra_process_demo/src/two_node_pipeline/two_node_pipeline.cpp)、[进程内通信设计](https://design.ros2.org/articles/intraprocess_communications.html)。后者包含历史方案与版本背景，应结合当前源码阅读。
- **Java 类比**：消息流水线和不可变消息；unique_ptr 明确表达唯一所有权转交，不只是“传一个对象引用”。
- **边界**：同进程、相容配置与合适订阅方式下可避免消息数据复制；一对多独占消费、跨进程及 QoS 条件会改变复制行为，不可宣称所有 ROS 2 通信都零拷贝。
- **动手练习**：比较一个独占消费者与多个只读消费者，打印数据对象地址并记录复制次数。

### 10.7 LLVM：大系统中的模板与扩展合同

- **实际问题**：编译器由大量独立分析/转换 Pass 组合，必须保持可扩展性与接口一致性。
- **架构重点**：IR、Pass pipeline、AnalysisManager、分析结果失效规则。
- **语言重点**：CRTP mixin、concept-based polymorphism 与统一的 run 合同。这里的“concept-based”不能仅凭名称就认定每个接口用了 C++20 `concept` 关键字。
- **阅读入口**：[Writing an LLVM Pass](https://llvm.org/docs/WritingAnLLVMNewPMPass.html)。当前文档使用 OptionalPassInfoMixin / RequiredPassInfoMixin；旧文章可能使用不同名字，应跟随所用版本。
- **Java 类比**：分析/转换流水线的接口与插件；C++ 在部分边界还会结合模板和类型擦除。
- **动手练习**：为协议解析结果建立“校验 → 规范化 → 统计”Pass，每一层说明修改哪些数据、使哪些缓存失效。

## 11. C++ 与 Java 的场景对照速查

| C++ 概念 | Java 理解入口 | 必须保留的差异 |
| --- | --- | --- |
| unique_ptr | 单一模块管理资源 | Java 普通引用没有通用独占与移动合同 |
| shared_ptr | 多个强引用 | 引用计数与 GC 不同；循环与析构位置不同 |
| weak_ptr | WeakReference | 使用 lock 获得临时强所有权；都不替业务字段同步 |
| RAII | try-with-resources / finally | C++ 普通对象析构参与作用域资源管理 |
| 模板 / Concepts | 泛型 / 接口约束 | 实例化、编译期表达与擦除机制不同 |
| 虚接口 | interface / abstract class | C++ 需要明确对象所有者、虚析构等合同 |
| promise + future | CompletableFuture 的完成/观察两端 | std::future 不天然支持 continuation 链 |
| packaged_task | FutureTask / Callable 提交 | 只关联工作和结果；仍需执行器实际调用 |
| mutex / unique_lock | ReentrantLock | 锁类型与重入规则需分别确认 |
| condition_variable | Condition / wait-notify | 共同围绕受保护谓词设计，而不是记录通知 |
| thread pool | ExecutorService | 容量、拒绝、关闭策略不是模板自动赋予的 |
| Handler | Service / Function / ChannelHandler | 区分业务处理与完成回调 |
| Runner | worker loop / event-loop thread | 名称由框架定义；明确谁驱动执行 |
| coroutine | 异步组合 / 虚拟线程的部分表达效果 | 无栈协程与 JVM 虚拟线程不是相同机制 |
| variant + visit | sealed hierarchy + pattern matching | 固定候选类型集与所有权/存储方式不同 |

## 12. 如何迁移到自己的项目

| 项目方向 | 优先借鉴 | 第一件可验证的事 |
| --- | --- | --- |
| Linux Modem / AT 网关 | unique_ptr 设备归属 + 串行设备 Runner + 请求状态机 | 超时和返回竞争时只能完成一个结果 |
| RTOS 固定内存系统 | 固定资源所有者、固定容量队列、显式状态 | 达到最大任务数后行为仍可预测 |
| 行情/日志解析服务 | I/O loop 与 CPU pool 分离、有界队列 | 慢任务不阻塞接入线程，队列满时明确拒绝 |
| 摄像头本地流水线 | 唯一所有权转移、共享只读帧、缓冲池 | 测量复制次数与峰值内存 |
| 可替换数据源或设备 | 虚接口或清晰策略边界 | 真设备和模拟器通过同一业务测试 |

Linux 上的 Muduo、Asio、bRPC、Seastar 不是可直接照搬到 NuttX/LiteOS 的统一答案；线程、socket、动态分配、异常和运行库支持要在目标平台核对。资源受限场景可以先借鉴所有权与执行域，再以平台原语实现固定容量队列和同步。

推荐学习顺序：先读第 1—2 节建立所有权概念；运行第 7 节示例，再回看第 3—6 节的每一种机制；读第 8 节理解关闭合同；最后按自己的系统选择第 10 节的一两个项目，不必同时深入所有框架。

## 13. 设计审查时要能回答的问题

1. 每个资源和缓冲区是谁拥有，异步操作什么时候不再访问它？
2. shared_ptr 的引入是否因为需要共享生命期，而非绕过接口设计？
3. 哪个执行域允许修改连接、设备、请求状态？
4. Handler 执行期间是否持有框架内部锁？
5. 任务数和排队数是否有上限，满了怎样处理？
6. 哪个线程可以阻塞 get，是否可能等待同池任务？
7. 超时、取消和真实完成怎样选出唯一赢家？
8. 所有已接受任务是否都有结果、异常或明确取消？
9. Runner 在什么时候停止，是否仍有回调要投给它？
10. 关闭是否会 join，资源是否在正确的线程销毁？

答案清晰后，再考虑无锁队列、内存池、work stealing、复杂模板等优化，并用吞吐、P95/P99、排队时间、复制次数、峰值内存和关闭耗时证明收益。

## 14. 参考资料与代码

- [配套有界线程池完整代码](https://github.com/luckyJimLu/system-design-notes/blob/main/content/33.%20Cpp%20System%20Architecture/examples/bounded_thread_pool.cpp)
- [自动化检查脚本](https://github.com/luckyJimLu/system-design-notes/blob/main/scripts/check-cpp-examples.sh)
- [C++ 标准工作草案](https://eel.is/c++draft/)
- [Muduo](https://github.com/chenshuo/muduo)
- [Boost.Asio](https://www.boost.org/doc/libs/latest/doc/html/boost_asio.html)
- [Apache bRPC](https://brpc.apache.org/docs/)
- [RocksDB Wiki](https://github.com/facebook/rocksdb/wiki)
- [Seastar 官方教程](https://docs.seastar.io/master/tutorial.html)
- [ROS 2 官方 demos](https://github.com/ros2/demos)
- [LLVM 官方开发文档](https://llvm.org/docs/)
- [Java CompletableFuture](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/CompletableFuture.html)
- [Java 虚拟线程 JEP 444](https://openjdk.org/jeps/444)

本文代码片段除项目事实说明外均为独立教学表达；片段中的 Device、Request、Response、executor 等业务类型或接口需要由实际工程提供。唯一完整可编译程序是配套 bounded_thread_pool.cpp，CI 会编译并运行它。

## 延伸阅读：把这些特性放进真实异步框架

[Boost.Asio 深入解读](#/chapter/content-boost-asio-deep-dive)沿一次异步读追踪 Executor、Handler、Token 和协程的源码，配有真实 TCP 示例。[GitHub 文档](../34.%20Boost%20Asio%20Deep%20Dive/index.zh.md)。
