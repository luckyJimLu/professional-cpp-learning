---
id: cpp-concurrency-14-appendix-c
title: "附录 C：基于消息传递的并发框架与完整 ATM 示例"
titleEn: "Appendix C: A message-passing framework and complete ATM example"
order: 54
category: specialized
description: "Actor 风格消息传递并发框架实现，以及使用现代 C++ 构建的完整银行自动取款机（ATM）状态机仿真。"
tags: ["C++", "Actor 模型", "消息传递", "ATM 仿真", "状态机"]
---

# 附录 C：基于消息传递的并发框架与完整 ATM 示例

在本书第 4 章中，我曾介绍过一个在独立线程之间借助**消息传递并发框架（Message-Passing Framework）**进行通信的示例，并以银行自动取款机（ATM）的状态机驱动逻辑作为典型案例。

在本附录中，将给出该系统的全部完整实现代码，包括底层轻量级 Actor 风格消息传递框架、各并发实体的状态机实现，以及驱动整个交互仿真的主程序代码。

---

## C.1 消息队列的实现

消息传递系统的核心在于线程安全的消息队列。清单 C.1 展示了 `messaging::queue` 的实现：
- 队列内部维护一个元素类型为基类指针 `std::shared_ptr<message_base>` 的标准队列；
- 具体的消息类型通过派生自该基类的模板类 `wrapped_message<Msg>` 进行承载与类型擦除；
- 生产者调用 `push()` 构造包装类的实例并存入指针，随后唤醒等待者；
- 消费者调用 `wait_and_pop()` 阻塞等待直到队列非空，并取出队首基类指针。由于 `message_base` 不包含具体的业务成员函数，消费线程后续需要将其动态类型转换回具体的 `wrapped_message<T>` 指针以读取消息正文。

### 清单 C.1 简易线程安全消息队列

```cpp
#include <mutex>
#include <condition_variable>
#include <queue>
#include <memory>

namespace messaging
{
    // 队列中所有消息项的基类（支持多态析构与动态类型检查）
    struct message_base
    {
        virtual ~message_base()
        {}
    };

    // 针对每种具体消息类型的特化包装模板类
    template<typename Msg>
    struct wrapped_message:
        message_base
    {
        Msg contents;
        explicit wrapped_message(Msg const& contents_):
            contents(contents_)
        {}
    };

    // 线程安全的消息队列
    class queue
    {
        std::mutex m;
        std::condition_variable c;
        // 内部存储指向 message_base 的共享指针队列
        std::queue<std::shared_ptr<message_base> > q;

    public:
        // 压入消息：将消息打包并存入指针，唤醒等待线程
        template<typename T>
        void push(T const& msg)
        {
            std::lock_guard<std::mutex> lk(m);
            q.push(std::make_shared<wrapped_message<T> >(msg));
            c.notify_all();
        }

        // 弹出消息：阻塞等待直到队列非空，取出队首元素
        std::shared_ptr<message_base> wait_and_pop()
        {
            std::unique_lock<std::mutex> lk(m);
            c.wait(lk, [&]{ return !q.empty(); });
            auto res = q.front();
            q.pop();
            return res;
        }
    };
}
```

---

## C.2 发送器与接收器的解耦设计

为了遵循最小特权原则并严格限制线程对队列的操作权限，消息系统被解耦为 `sender`（发送端）与 `receiver`（接收端）。

### C.2.1 sender 发送器类

发送消息通过清单 C.2 所示的 `sender` 类完成。它仅是对底层 `queue` 指针的一个轻量封装，只开放单向 `push` 能力。复制 `sender` 对象仅复制指针本身，而不复制底层队列。

### 清单 C.2 sender 发送器类

```cpp
namespace messaging
{
    class sender
    {
        // 仅持有指向消息队列的裸指针
        queue* q;

    public:
        // 默认构造的 sender 不绑定任何队列
        sender():
            q(nullptr)
        {}

        // 允许从消息队列指针构造
        explicit sender(queue* q_):
            q(q_)
        {}

        // 发送消息：将消息转发并压入底层队列
        template<typename Message>
        void send(Message const& msg)
        {
            if(q)
            {
                q->push(msg);
            }
        }
    };
}
```

### C.2.2 receiver 接收器类

与仅持有队列引用的 `sender` 不同，`receiver` 真正拥有（own）队列的生命周期。清单 C.3 展示了 `receiver` 类的定义：
- 提供了到 `sender` 的隐式类型转换操作符，方便对外发布其对应的发送通道；
- 提供了 `wait()` 成员函数，返回一个绑定到自身队列的 `dispatcher`（分发器）对象以启动消息等待链。

### 清单 C.3 receiver 接收器类

```cpp
namespace messaging
{
    class receiver
    {
        // receiver 真正拥有并管理队列实例
        queue q;

    public:
        // 允许隐式转换为引用该队列的 sender
        operator sender()
        {
            return sender(&q);
        }

        // 等待并接收消息，创建一个关联此队列的分发器
        dispatcher wait()
        {
            return dispatcher(&q);
        }
    };
}
```

---

## C.3 消息分发器与链式处理机制

接收和处理消息的逻辑要复杂得多：接收方不仅需要等待消息入队，还必须动态判定消息的具体类型是否与当前期望处理的类型匹配，并在匹配时触发对应的处理函数。

这一机制通过 `dispatcher` 与 `TemplateDispatcher` 共同构建的**责任链模式（Chain of Responsibility）**优雅实现。

### C.3.1 根分发器 dispatcher 类

清单 C.4 展示了根分发器 `dispatcher` 类。该类的一个关键设计在于：**核心的等待与分发逻辑是在析构函数中驱动的**。从 `receiver::wait()` 返回的临时对象在单条表达式结束析构时触发 `wait_and_dispatch()`。

### 清单 C.4 dispatcher 根分发器类

```cpp
namespace messaging
{
    // 用于通知关闭队列的信号消息类型
    class close_queue
    {};

    class dispatcher
    {
        queue* q;
        bool chained;

        // dispatcher 实例禁止复制
        dispatcher(dispatcher const&) = delete;
        dispatcher& operator=(dispatcher const&) = delete;

        // 允许 TemplateDispatcher 访问其内部私有成员
        template<
            typename Dispatcher,
            typename Msg,
            typename Func>
        friend class TemplateDispatcher;

        // 循环等待并分发消息
        void wait_and_dispatch()
        {
            for(;;)
            {
                auto msg = q->wait_and_pop();
                dispatch(msg);
            }
        }

        // 检查消息是否为 close_queue 关闭信号，若是则抛出异常
        bool dispatch(
            std::shared_ptr<message_base> const& msg)
        {
            if(dynamic_cast<wrapped_message<close_queue>*>(msg.get()))
            {
                throw close_queue();
            }
            return false;
        }

    public:
        // 允许移动构造，并将源对象的 chained 置为 true，转移职责
        dispatcher(dispatcher&& other):
            q(other.q), chained(other.chained)
        {
            other.chained = true;
        }

        explicit dispatcher(queue* q_):
            q(q_), chained(false)
        {}

        // 挂载特定消息类型的处理函数，返回链式的 TemplateDispatcher
        template<typename Message, typename Func>
        TemplateDispatcher<dispatcher, Message, Func>
        handle(Func&& f)
        {
            return TemplateDispatcher<dispatcher, Message, Func>(
                q, this, std::forward<Func>(f));
        }

        // 析构函数：驱动消息循环（如果尚未被链入后续处理器）
        ~dispatcher() noexcept(false)
        {
            if(!chained)
            {
                wait_and_dispatch();
            }
        }
    };
}
```

> [!IMPORTANT]
> **关于析构函数 `noexcept(false)` 的技术细节**：  
> 在 C++11 标准中，类的析构函数默认具有隐式的 `noexcept(true)` 规范。但在本设计中，`close_queue` 关闭信号是通过在 `dispatch()` 中抛出异常来跳出死循环的。如果不显式为析构函数标记 `noexcept(false)`，抛出该异常会直接触发 `std::terminate()` 强行中止程序。

### C.3.2 模板分发器 TemplateDispatcher 类

通常情况下，我们不会直接孤立调用 `wait()`，而是通过链式调用 `.handle<Msg>(handler)` 来针对不同类型的消息挂载回调。清单 C.5 给出了 `TemplateDispatcher` 模板类的实现。

### 清单 C.5 TemplateDispatcher 模板分发器类

```cpp
namespace messaging
{
    template<typename PreviousDispatcher, typename Msg, typename Func>
    class TemplateDispatcher
    {
        queue* q;
        PreviousDispatcher* prev;
        Func f;
        bool chained;

        TemplateDispatcher(TemplateDispatcher const&) = delete;
        TemplateDispatcher& operator=(TemplateDispatcher const&) = delete;

        // 允许其它模板实例相互访问私有成员
        template<typename Dispatcher, typename OtherMsg, typename OtherFunc>
        friend class TemplateDispatcher;

        void wait_and_dispatch()
        {
            for(;;)
            {
                auto msg = q->wait_and_pop();
                // 一旦成功处理了一条匹配的消息，便跳出等待循环
                if(dispatch(msg))
                    break;
            }
        }

        bool dispatch(std::shared_ptr<message_base> const& msg)
        {
            // 尝试动态类型匹配目标消息类型 Msg
            if(wrapped_message<Msg>* wrapper =
                dynamic_cast<wrapped_message<Msg>*>(msg.get()))
            {
                f(wrapper->contents);
                return true;
            }
            else
            {
                // 若不匹配，则链式回溯到前一个分发器处理
                return prev->dispatch(msg);
            }
        }

    public:
        TemplateDispatcher(TemplateDispatcher&& other):
            q(other.q), prev(other.prev), f(std::move(other.f)),
            chained(other.chained)
        {
            other.chained = true;
        }

        TemplateDispatcher(queue* q_, PreviousDispatcher* prev_, Func&& f_):
            q(q_), prev(prev_), f(std::forward<Func>(f_)), chained(false)
        {
            prev_->chained = true;
        }

        // 支持继续链式挂载其它类型的消息处理器
        template<typename OtherMsg, typename OtherFunc>
        TemplateDispatcher<TemplateDispatcher, OtherMsg, OtherFunc>
        handle(OtherFunc&& of)
        {
            return TemplateDispatcher<
                TemplateDispatcher, OtherMsg, OtherFunc>(
                    q, this, std::forward<OtherFunc>(of));
        }

        // 析构函数：末端分发器开始执行消息循环
        ~TemplateDispatcher() noexcept(false)
        {
            if(!chained)
            {
                wait_and_dispatch();
            }
        }
    };
}
```

### 工作原理梳理：
1. 当开发者书写诸如 `incoming.wait().handle<A>(...).handle<B>(...)` 的链式调用时，系统会在栈上依次构造分发器对象，并构成指向 `prev` 的单向链表。
2. 每次调用 `handle()` 时，前驱对象的 `chained` 标志均被置为 `true`。
3. 当整条完整表达式求值完毕并开始析构临时对象时，只有位于链条最末端的最终分发器实例（其 `chained` 为 `false`）会执行其析构函数，从而触发 `wait_and_dispatch()` 消息循环。
4. 消息入队后，`dispatch()` 优先尝试由当前节点处理；若类型不符，则沿 `prev` 回退传递。若所有自定义类型均未命中，最终到达链底的根 `dispatcher`，由其判定是否为 `close_queue`；若仍未命中则默默忽略并进入下一轮消息等待。
5. 一旦有任一节点成功消费了消息，`wait_and_dispatch()` 立即跳出循环，本次 `wait()` 语句顺利执行完毕，状态机顺畅进入下一个状态。

---

## C.4 业务消息实体定义

清单 C.6 定义了 ATM 系统在不同状态间交互所涉及的各类消息实体：

### 清单 C.6 ATM 交互消息结构定义

```cpp
#include <string>

// --- 取款相关消息 ---
struct withdraw
{
    std::string account;
    unsigned amount;
    mutable messaging::sender atm_queue;

    withdraw(std::string const& account_,
             unsigned amount_,
             messaging::sender atm_queue_):
        account(account_), amount(amount_),
        atm_queue(atm_queue_)
    {}
};

struct withdraw_ok
{};

struct withdraw_denied
{};

struct cancel_withdrawal
{
    std::string account;
    unsigned amount;
    cancel_withdrawal(std::string const& account_,
                      unsigned amount_):
        account(account_), amount(amount_)
    {}
};

struct withdrawal_processed
{
    std::string account;
    unsigned amount;
    withdrawal_processed(std::string const& account_,
                         unsigned amount_):
        account(account_), amount(amount_)
    {}
};

// --- 用户物理操作输入消息 ---
struct card_inserted
{
    std::string account;
    explicit card_inserted(std::string const& account_):
        account(account_)
    {}
};

struct digit_pressed
{
    char digit;
    explicit digit_pressed(char digit_):
        digit(digit_)
    {}
};

struct clear_last_pressed
{};

struct eject_card
{};

struct withdraw_pressed
{
    unsigned amount;
    explicit withdraw_pressed(unsigned amount_):
        amount(amount_)
    {}
};

struct cancel_pressed
{};

struct issue_money
{
    unsigned amount;
    issue_money(unsigned amount_):
        amount(amount_)
    {}
};

// --- PIN 码校验相关消息 ---
struct verify_pin
{
    std::string account;
    std::string pin;
    mutable messaging::sender atm_queue;

    verify_pin(std::string const& account_, std::string const& pin_,
               messaging::sender atm_queue_):
        account(account_), pin(pin_), atm_queue(atm_queue_)
    {}
};

struct pin_verified
{};

struct pin_incorrect
{};

// --- 硬件交互显示与提示消息 ---
struct display_enter_pin
{};

struct display_enter_card
{};

struct display_insufficient_funds
{};

struct display_withdrawal_cancelled
{};

struct display_pin_incorrect_message
{};

struct display_withdrawal_options
{};

// --- 余额查询相关消息 ---
struct get_balance
{
    std::string account;
    mutable messaging::sender atm_queue;

    get_balance(std::string const& account_, messaging::sender atm_queue_):
        account(account_), atm_queue(atm_queue_)
    {}
};

struct balance
{
    unsigned amount;
    explicit balance(unsigned amount_):
        amount(amount_)
    {}
};

struct display_balance
{
    unsigned amount;
    explicit display_balance(unsigned amount_):
        amount(amount_)
    {}
};

struct balance_pressed
{};
```

---

## C.5 核心状态机实现

本系统由三个彼此独立运行在各自线程中的状态机组成：
1. **`atm`**：自动取款机核心控制中枢；
2. **`bank_machine`**：后端银行结算服务器；
3. **`interface_machine`**：ATM 外部用户界面与物理硬件仿真器。

### C.5.1 ATM 核心状态机

清单 C.7 展示了 ATM 主状态机的实现。该类使用成员函数指针 `void (atm::*state)()` 高效管理当前所处的状态，实现了纯驱动式的状态迁移。

### 清单 C.7 ATM 状态机类

```cpp
class atm
{
    messaging::receiver incoming;
    messaging::sender bank;
    messaging::sender interface_hardware;

    // 当前状态指针
    void (atm::*state)();

    std::string account;
    unsigned withdrawal_amount;
    std::string pin;

    // 状态：处理取款确认流程
    void process_withdrawal()
    {
        incoming.wait()
            .handle<withdraw_ok>(
                [&](withdraw_ok const& msg)
                {
                    interface_hardware.send(
                        issue_money(withdrawal_amount));
                    bank.send(
                        withdrawal_processed(account, withdrawal_amount));
                    state = &atm::done_processing;
                }
                )
            .handle<withdraw_denied>(
                [&](withdraw_denied const& msg)
                {
                    interface_hardware.send(display_insufficient_funds());
                    state = &atm::done_processing;
                }
                )
            .handle<cancel_pressed>(
                [&](cancel_pressed const& msg)
                {
                    bank.send(
                        cancel_withdrawal(account, withdrawal_amount));
                    interface_hardware.send(
                        display_withdrawal_cancelled());
                    state = &atm::done_processing;
                }
                );
    }

    // 状态：处理余额查询流程
    void process_balance()
    {
        incoming.wait()
            .handle<balance>(
                [&](balance const& msg)
                {
                    interface_hardware.send(display_balance(msg.amount));
                    state = &atm::wait_for_action;
                }
                )
            .handle<cancel_pressed>(
                [&](cancel_pressed const& msg)
                {
                    state = &atm::done_processing;
                }
                );
    }

    // 状态：等待用户选择业务功能（取款、查额或取消）
    void wait_for_action()
    {
        interface_hardware.send(display_withdrawal_options());
        incoming.wait()
            .handle<withdraw_pressed>(
                [&](withdraw_pressed const& msg)
                {
                    withdrawal_amount = msg.amount;
                    bank.send(withdraw(account, msg.amount, incoming));
                    state = &atm::process_withdrawal;
                }
                )
            .handle<balance_pressed>(
                [&](balance_pressed const& msg)
                {
                    bank.send(get_balance(account, incoming));
                    state = &atm::process_balance;
                }
                )
            .handle<cancel_pressed>(
                [&](cancel_pressed const& msg)
                {
                    state = &atm::done_processing;
                }
                );
    }

    // 状态：等待银行校验 PIN 码结果
    void verifying_pin()
    {
        incoming.wait()
            .handle<pin_verified>(
                [&](pin_verified const& msg)
                {
                    state = &atm::wait_for_action;
                }
                )
            .handle<pin_incorrect>(
                [&](pin_incorrect const& msg)
                {
                    interface_hardware.send(
                        display_pin_incorrect_message());
                    state = &atm::done_processing;
                }
                )
            .handle<cancel_pressed>(
                [&](cancel_pressed const& msg)
                {
                    state = &atm::done_processing;
                }
                );
    }

    // 状态：获取并拼接用户输入的 PIN 码
    void getting_pin()
    {
        incoming.wait()
            .handle<digit_pressed>(
                [&](digit_pressed const& msg)
                {
                    unsigned const pin_length = 4;
                    pin += msg.digit;
                    if(pin.length() == pin_length)
                    {
                        bank.send(verify_pin(account, pin, incoming));
                        state = &atm::verifying_pin;
                    }
                }
                )
            .handle<clear_last_pressed>(
                [&](clear_last_pressed const& msg)
                {
                    if(!pin.empty())
                    {
                        pin.pop_back();
                    }
                }
                )
            .handle<cancel_pressed>(
                [&](cancel_pressed const& msg)
                {
                    state = &atm::done_processing;
                }
                );
    }

    // 状态：等待插卡
    void waiting_for_card()
    {
        interface_hardware.send(display_enter_card());
        incoming.wait()
            .handle<card_inserted>(
                [&](card_inserted const& msg)
                {
                    account = msg.account;
                    pin = "";
                    interface_hardware.send(display_enter_pin());
                    state = &atm::getting_pin;
                }
                );
    }

    // 状态：业务完成，退卡并重置
    void done_processing()
    {
        interface_hardware.send(eject_card());
        state = &atm::waiting_for_card;
    }

    atm(atm const&) = delete;
    atm& operator=(atm const&) = delete;

public:
    atm(messaging::sender bank_,
        messaging::sender interface_hardware_):
        bank(bank_), interface_hardware(interface_hardware_)
    {}

    void done()
    {
        get_sender().send(messaging::close_queue());
    }

    void run()
    {
        state = &atm::waiting_for_card;
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

    messaging::sender get_sender()
    {
        return incoming;
    }
};
```

---

### C.5.2 后端银行状态机

清单 C.8 展示了银行结算系统的状态机。在真实系统中这通常是一台独立的远程服务器，但在本并发仿真中它作为一个单独的线程运行，维护账户余额并处理校验与扣款。

### 清单 C.8 银行模拟状态机类

```cpp
class bank_machine
{
    messaging::receiver incoming;
    unsigned balance;

public:
    bank_machine():
        balance(199) // 设定初始模拟账户余额为 199
    {}

    void done()
    {
        get_sender().send(messaging::close_queue());
    }

    void run()
    {
        try
        {
            for(;;)
            {
                incoming.wait()
                    .handle<verify_pin>(
                        [&](verify_pin const& msg)
                        {
                            // 预设正确 PIN 码为 "1937"
                            if(msg.pin == "1937")
                            {
                                msg.atm_queue.send(pin_verified());
                            }
                            else
                            {
                                msg.atm_queue.send(pin_incorrect());
                            }
                        }
                        )
                    .handle<withdraw>(
                        [&](withdraw const& msg)
                        {
                            if(balance >= msg.amount)
                            {
                                msg.atm_queue.send(withdraw_ok());
                                balance -= msg.amount;
                            }
                            else
                            {
                                msg.atm_queue.send(withdraw_denied());
                            }
                        }
                        )
                    .handle<get_balance>(
                        [&](get_balance const& msg)
                        {
                            msg.atm_queue.send(::balance(balance));
                        }
                        )
                    .handle<withdrawal_processed>(
                        [&](withdrawal_processed const& msg)
                        {
                        }
                        )
                    .handle<cancel_withdrawal>(
                        [&](cancel_withdrawal const& msg)
                        {
                        }
                        );
            }
        }
        catch(messaging::close_queue const&)
        {
        }
    }

    messaging::sender get_sender()
    {
        return incoming;
    }
};
```

---

### C.5.3 硬件用户界面状态机

清单 C.9 展示了模拟物理 ATM 操作界面（屏幕显示与出钞口）的状态机。由于多个线程可能向终端并发输出日志，这里使用全局互斥量 `iom` 保护控制台 `std::cout` 的线程安全。

### 清单 C.9 用户界面状态机类

```cpp
#include <iostream>

// 全局 I/O 互斥量，防止控制台文本交错混乱
std::mutex iom;

class interface_machine
{
    messaging::receiver incoming;

public:
    void done()
    {
        get_sender().send(messaging::close_queue());
    }

    void run()
    {
        try
        {
            for(;;)
            {
                incoming.wait()
                    .handle<issue_money>(
                        [&](issue_money const& msg)
                        {
                            {
                                std::lock_guard<std::mutex> lk(iom);
                                std::cout << "Issuing "
                                          << msg.amount << std::endl;
                            }
                        }
                        )
                    .handle<display_insufficient_funds>(
                        [&](display_insufficient_funds const& msg)
                        {
                            {
                                std::lock_guard<std::mutex> lk(iom);
                                std::cout << "Insufficient funds" << std::endl;
                            }
                        }
                        )
                    .handle<display_enter_pin>(
                        [&](display_enter_pin const& msg)
                        {
                            {
                                std::lock_guard<std::mutex> lk(iom);
                                std::cout << "Please enter your PIN (0-9)"
                                          << std::endl;
                            }
                        }
                        )
                    .handle<display_enter_card>(
                        [&](display_enter_card const& msg)
                        {
                            {
                                std::lock_guard<std::mutex> lk(iom);
                                std::cout << "Please enter your card (I)"
                                          << std::endl;
                            }
                        }
                        )
                    .handle<display_balance>(
                        [&](display_balance const& msg)
                        {
                            {
                                std::lock_guard<std::mutex> lk(iom);
                                std::cout << "The balance of your account is "
                                          << msg.amount << std::endl;
                            }
                        }
                        )
                    .handle<display_withdrawal_options>(
                        [&](display_withdrawal_options const& msg)
                        {
                            {
                                std::lock_guard<std::mutex> lk(iom);
                                std::cout << "Withdraw 50? (w)" << std::endl;
                                std::cout << "Display Balance? (b)" << std::endl;
                                std::cout << "Cancel? (c)" << std::endl;
                            }
                        }
                        )
                    .handle<display_withdrawal_cancelled>(
                        [&](display_withdrawal_cancelled const& msg)
                        {
                            {
                                std::lock_guard<std::mutex> lk(iom);
                                std::cout << "Withdrawal cancelled" << std::endl;
                            }
                        }
                        )
                    .handle<display_pin_incorrect_message>(
                        [&](display_pin_incorrect_message const& msg)
                        {
                            {
                                std::lock_guard<std::mutex> lk(iom);
                                std::cout << "PIN incorrect" << std::endl;
                            }
                        }
                        )
                    .handle<eject_card>(
                        [&](eject_card const& msg)
                        {
                            {
                                std::lock_guard<std::mutex> lk(iom);
                                std::cout << "Ejecting card" << std::endl;
                            }
                        }
                        );
            }
        }
        catch(messaging::close_queue&)
        {
        }
    }

    messaging::sender get_sender()
    {
        return incoming;
    }
};
```

---

## C.6 驱动程序与运行交互

最后，清单 C.10 给出了 `main()` 函数驱动程序。它启动并分别运行这三个状态机线程，主线程则在控制台捕获用户击键，并将相应的物理事件消息转发给 ATM 队列；在收到退出信号 `'q'` 后，向各线程队列广播 `close_queue` 关闭指令并调用 `join()` 安全回收所有子线程。

### 清单 C.10 主驱动程序

```cpp
#include <thread>
#include <cstdio>

int main()
{
    bank_machine bank;
    interface_machine interface_hardware;
    atm machine(bank.get_sender(), interface_hardware.get_sender());

    // 分别在独立线程中启动银行、硬件界面和 ATM
    std::thread bank_thread(&bank_machine::run, &bank);
    std::thread if_thread(&interface_machine::run, &interface_hardware);
    std::thread atm_thread(&atm::run, &machine);

    messaging::sender atmqueue(machine.get_sender());
    bool quit_pressed = false;

    // 控制台事件循环：根据键盘击键模拟外界交互
    while(!quit_pressed)
    {
        char c = getchar();
        switch(c)
        {
        case '0':
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
        case '6':
        case '7':
        case '8':
        case '9':
            atmqueue.send(digit_pressed(c));
            break;
        case 'b':
            atmqueue.send(balance_pressed());
            break;
        case 'w':
            atmqueue.send(withdraw_pressed(50));
            break;
        case 'c':
            atmqueue.send(cancel_pressed());
            break;
        case 'q':
            quit_pressed = true;
            break;
        case 'i':
            atmqueue.send(card_inserted("acc1234"));
            break;
        }
    }

    // 优雅停机：向各个队列发送关闭命令
    bank.done();
    machine.done();
    interface_hardware.done();

    // 等待所有后台线程正常退出
    atm_thread.join();
    bank_thread.join();
    if_thread.join();

    return 0;
}
```

---

## C.7 架构设计深度解析

### 1. CSP（通信顺序进程）与 Actor 模式
该架构完美实践了 **CSP（Communicating Sequential Processes）** 理念：各个线程之间没有任何直接共享的可变状态（Shared Mutable State），完全避免了复杂业务逻辑中极易滋生死锁与数据竞争的低级互斥锁。所有跨线程协作均通过单向传递不可变数据消息来实现。

### 2. 利用 C++ 临时对象生命周期与 RAII 驱动事件循环
本框架最精妙的 C++ 技艺在于利用了**完整表达式末尾销毁临时对象**的语言机制：
```cpp
incoming.wait()
    .handle<TypeA>([](TypeA const& msg){ ... })
    .handle<TypeB>([](TypeB const& msg){ ... });
```
在整条语句执行结束时，最外层的 `TemplateDispatcher` 临时对象被销毁。其析构函数检测到自身未被进一步链入后驱（`!chained`），随即启动阻塞的消息拉取与分发循环。一旦捕获到期望的消息类型并执行完毕回调，立刻跳出循环，析构正常结束，控制流顺畅流向下一行代码。这种将同步等待逻辑封装在析构函数中的手法极具创新性，同时配合 `noexcept(false)` 优雅支持了异常终止。
