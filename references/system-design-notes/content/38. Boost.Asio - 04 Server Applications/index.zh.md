---
id: boost-asio-04-server-applications
title: "第 4 章：构建服务端应用"
titleEn: "Chapter 4: Implementing Server Applications"
order: 38
category: specialized
description: "基于 Boost.Asio 设计同步迭代式、同步并发式以及异步高性能 TCP 服务器架构，深入解析会话生命周期与并发控制。"
tags: ["Boost.Asio", "服务端", "迭代服务器", "并发服务器", "异步Accept", "TCP服务器"]
---

# 第 4 章：构建服务端应用

在本章中，我们将涵盖以下主题：

- 实现同步迭代 TCP 服务器
- 实现同步并发 TCP 服务器
- 实现异步 TCP 服务器

---

## 引言

服务端是分布式应用程序的一部分，它负责提供一项或多项服务供该程序的其他部分（即客户端）消费。客户端与服务端通信的目的就是为了获取其提供的服务。

通常，服务端应用程序在客户端-服务端通信过程中扮演**被动角色**。在启动期间，服务端应用程序会绑定到主机上的特定公认端口（Well-known Port，即对潜在客户端公开已知，或客户端可在运行时通过注册服务发现的端口）。之后，它便被动等待来自客户端发往该端口的连接和请求。当请求到达时，服务端根据其所提供服务的业务规范执行相应操作（即提供服务），并完成请求处理。

根据特定服务端所提供的服务类型，请求处理的具体内涵差异极大：
- 例如，HTTP 服务器通常会读取请求消息中指定的文件内容，并将其回传给客户端；
- 代理服务器（Proxy Server）则仅将客户端请求重定向到另一台服务器进行实际处理；
- 其他特定业务的服务器可能会对客户端在请求中提供的数据执行复杂的数值计算，并将计算结果返回给客户端。

并非所有服务端都扮演完全被动的角色。某些服务端应用可以在未等待客户端请求的情况下主动向客户端发送消息。通常这类服务器充当**通知器（Notifier）**，负责向客户端推送特定事件。在这种场景下，客户端可能完全无需向服务端发送任何业务数据，只需被动等待服务端的通知并作出响应。这种通信模型被称为**推送式通信（Push-style Communication）**。该模型在现代 Web 应用中越来越受欢迎，提供了极高的业务灵活性。

因此，对服务端应用程序进行分类的第一种维度是根据其**履行的功能或向客户端提供的服务类型**。

另一个显而易见的分类维度是服务端与客户端通信时所采用的**传输层协议**：
- 当今许多通用服务端应用程序都采用 **TCP 协议**；
- 某些特定场景（如实时音视频流、DNS）则采用 **UDP 协议**；
- 同时通过 TCP 和 UDP 提供服务的混合服务端则属于第三类，被称为**多协议服务器（Multiprotocol Servers）**。在本章中，我们将重点聚焦于几种不同类型的 TCP 服务器。

服务端的另一个重要特征是其**服务客户端的方式**：
- **迭代服务器（Iterative Server）**：以串行、一对一的方式处理客户端，即在当前正在服务的客户端处理完成之前，不会开始服务下一个客户端。
- **并发/并行服务器（Parallel Server）**：能够同时服务多个客户端。
  - 在单核处理器计算机上，并行服务器会在单个处理器上交错执行与多个客户端通信的不同阶段。例如，在连接到第一个客户端并等待其请求消息时，服务器可以切换去接受第二个客户端的连接，或读取第三个客户端的请求；之后再切回第一个客户端继续提供服务。这种并发被称为**伪并行（Pseudo Parallelism）**，因为处理器只是在多个客户端之间频繁切换，并非真正同时处理；
  - 在多核/多处理器计算机上，则可以实现**真正并行（True Parallelism）**，服务端使用不同的硬件线程/核心在同一时刻同时为多个客户端提供服务。

迭代服务器实现相对简单，适合请求到达率较低、且服务器有充分时间在下一个请求到来之前处理完当前请求的场景。显然，**迭代服务器不具备伸缩性（Scalability）**：为运行迭代服务器的计算机增加更多的 CPU 核心并不能提高服务器的吞吐量。相反，并行服务器能够应对更高的并发请求量；如果设计得当，它们具备优异的可伸缩性，在多处理器机器上能够显著提升吞吐能力。

从实现角度来看，服务端分类的另一个维度是采用**同步**还是**异步**模式：
- **同步服务器**使用同步套接字 API 调用，这些调用会阻塞当前执行线程，直到请求的操作完成或发生错误。因此，典型的同步 TCP 服务器会使用 `asio::ip::tcp::acceptor::accept()` 接受客户端连接请求，使用 `asio::ip::tcp::socket::read_some()` 接收客户端的请求报文，然后使用 `asio::ip::tcp::socket::write_some()` 将响应报文发送回客户端。这三个方法全部是阻塞式的，从而使服务器成为同步服务器。
- 与同步服务器相对，**异步服务器应用程序**使用异步套接字 API 调用。例如，异步 TCP 服务器可以使用 `asio::ip::tcp::acceptor::async_accept()` 方法异步接受连接请求，使用 `asio::ip::tcp::socket::async_read_some()` 方法或 `asio::async_read()` 自由函数异步接收请求，再使用 `asio::ip::tcp::socket::async_write_some()` 方法或 `asio::async_write()` 自由函数异步向客户端发送响应。

由于同步服务器与异步服务器的体系结构存在根本差异，采用哪种方案必须在架构设计早期确立，并且该决策应建立在对吞吐量、延迟及资源开销等需求的深入分析之上。

### 同步与异步的权衡

同步方法相比异步方法的主要优势在于**直观和简单**。相比功能相同的异步服务器，同步服务器的实现、调试和维护要容易得多。异步服务器之所以更复杂，是因为异步操作的完成发生在与发起位置不同的代码上下文中（主要在回调函数中）。这通常需要在堆内存中动态分配数据结构来保存请求上下文，编写分散的回调函数，处理线程同步与竞态，这使得架构变得较为复杂且更容易引入微妙的 bug。此外，异步机制自身也会带来一定的调度与内存开销。

然而，**同步方法具有严重的功能局限性**。最核心的缺陷在于：**无法在同步操作启动后将其取消，也无法为其指定超时时间**。而在异步操作中，任何操作在发起后、完成前均可随时被取消。

同步操作无法取消这一特性，极大地限制了同步服务器的应用场景。公网暴露的同步单线程服务器极易受到**拒绝服务攻击（DoS）**。如果恶意客户端连接到服务器后刻意不发送任何数据，服务器将永久阻塞在同步读取操作上，导致无法响应任何其他正常客户端的连接和请求。

因此，同步服务器通常仅用于受控且受信任的内部局域网环境、或者作为单机多进程通信的内部服务，亦或用于快速验证逻辑的原型开发中。

在应对高并发连接和海量请求吞吐时，基于异步 I/O 的服务器展现出无可比拟的性能与伸缩性优势，特别是在支持原生异步 I/O（如 Linux epoll、Windows IOCP）的现代操作系统上。

### 示例协议

在本章的三个范例中，假定服务器与客户端之间使用以下极简的应用层协议：
- 服务端接受表示为以 ASCII 换行符（`\n`）结尾的 ASCII 字符串请求，换行符之后的所有内容将被忽略；
- 收到请求后，服务端执行模拟耗时操作，并返回固定内容的响应报文：
```text
"Response\n"
```

这种简化的协议设计使我们能够专注于服务器自身的网络并发架构与套接字管理，而无需分心于复杂的业务编解码细节。

---

## 实现同步迭代 TCP 服务器

同步迭代 TCP 服务器满足以下特征：
- 在客户端-服务端通信模型中扮演服务端角色；
- 使用 TCP 协议与客户端通信；
- 使用阻塞执行线程的 I/O 和控制操作，直到操作完成或发生错误；
- 以严格串行、逐个处理（One-by-one）的方式服务客户端。

其典型算法流程如下：
1. 分配一个接收器套接字（Acceptor Socket）并将其绑定到特定的 TCP 端口；
2. 循环运行直到服务器被显式停止：
   1. 等待客户端的连接请求；
   2. 连接到达时接受（Accept）该客户端连接；
   3. 等待客户端发送请求报文；
   4. 读取请求报文；
   5. 处理请求；
   6. 向客户端发送响应报文；
   7. 关闭与该客户端的连接并释放套接字。

### 操作步骤

首先定义负责处理单个客户端业务逻辑的 `Service` 类：

```cpp
#include <boost/asio.hpp>
#include <thread>
#include <atomic>
#include <memory>
#include <iostream>

using namespace boost;

class Service {
public:
  Service(){}

  void HandleClient(asio::ip::tcp::socket& sock) {
    try {
      asio::streambuf request;
      asio::read_until(sock, request, '\n');

      // 模拟请求处理：计算密集型操作与阻塞 I/O
      int i = 0;
      while (i != 1000000)
        i++;
      std::this_thread::sleep_for(
        std::chrono::milliseconds(500));

      // 发送响应报文
      std::string response = "Response\n";
      asio::write(sock, asio::buffer(response));
    }
    catch (system::system_error& e) {
      std::cout << "Error occured! Error code = "
        << e.code() << ". Message: "
        << e.what();
    }
  }
};
```

接下来定义高层接收器类 `Acceptor`，封装底层的 `asio::ip::tcp::acceptor`：

```cpp
class Acceptor {
public:
  Acceptor(asio::io_service& ios, unsigned short port_num) :
    m_ios(ios),
    m_acceptor(m_ios,
        asio::ip::tcp::endpoint(
              asio::ip::address_v4::any(),
              port_num))
  {
    m_acceptor.listen();
  }

  void Accept() {
    asio::ip::tcp::socket sock(m_ios);

    m_acceptor.accept(sock);

    Service svc;
    svc.HandleClient(sock);
  }

private:
  asio::io_service& m_ios;
  asio::ip::tcp::acceptor m_acceptor;
};
```

接下来定义表示服务器主体的 `Server` 类：

```cpp
class Server {
public:
  Server() : m_stop(false) {}

  void Start(unsigned short port_num) {
    m_thread.reset(new std::thread([this, port_num]() {
      Run(port_num);
    }));
  }

  void Stop() {
    m_stop.store(true);
    m_thread->join();
  }

private:
  void Run(unsigned short port_num) {
    Acceptor acc(m_ios, port_num);

    while (!m_stop.load()) {
      acc.Accept();
    }
  }

  std::unique_ptr<std::thread> m_thread;
  std::atomic<bool> m_stop;
  asio::io_service m_ios;
};
```

最后，编写入口函数 `main()` 启动并运行服务器：

```cpp
int main()
{
  unsigned short port_num = 3333;

  try {
    Server srv;
    srv.Start(port_num);

    std::this_thread::sleep_for(std::chrono::seconds(60));

    srv.Stop();
  }
  catch (system::system_error& e) {
    std::cout << "Error occured! Error code = "
      << e.code() << ". Message: "
      << e.what();
  }

  return 0;
}
```

### 工作原理

该同步迭代服务器包含四个核心组件：`Service`、`Acceptor`、`Server` 和 `main()` 函数。

#### Service 类
`Service` 是实际承载业务功能的组件。其唯一方法 `HandleClient(asio::ip::tcp::socket& sock)` 接收已建立连接的套接字。它使用 `asio::read_until()` 同步读取数据直至遇到换行符 `\n`，随后模拟执行消耗 CPU 和休眠 500 毫秒的操作，最后通过 `asio::write()` 将响应同步写回对端。内部通过 `try-catch` 捕获异常，确保单次会话的失败不会导致服务器崩溃。

#### Acceptor 类
`Acceptor` 在构造时绑定到指定端口并调用 `m_acceptor.listen()` 开启监听。其公有方法 `Accept()` 创建一个局部的活跃套接字 `sock` 并调用 `m_acceptor.accept(sock)` 阻塞等待连接请求。当连接建立后，就地实例化 `Service svc` 并调用 `svc.HandleClient(sock)`。由于 `HandleClient()` 也是完全阻塞的，在当前客户端的整个处理完成之前，`Accept()` 不会返回，因而服务器绝对无法接收下一个客户端的连接。

#### Server 类及其固有缺陷
`Server` 类通过 `Start()` 创建一个新线程来执行私有方法 `Run()` 中的主循环。`Stop()` 方法将原子变量 `m_stop` 置为 `true` 并调用 `m_thread->join()` 等待工作线程退出。

仔细推敲此处的实现，会发现该架构存在**致命设计缺陷：`Stop()` 方法可能永远无法返回**。
- 如果在调用 `Stop()` 时，工作线程正阻塞在 `m_acceptor.accept()` 上等待新客户端连接，或者阻塞在 `HandleClient()` 内部的 `asio::read_until()` 上，那么在新的网络事件到达之前，线程根本没有机会执行到 `while (!m_stop.load())` 的条件检查处；
- 若此时再无新客户端发起连接，工作线程将永久处于阻塞等待状态，导致 `Stop()` 永远无法完成 `join()`，服务器彻底死锁挂起。

#### 消除缺陷的探讨

针对上述阻塞挂起问题，主要有两种规避思路：
1. **解除 Accept 阻塞**：在 `Stop()` 中将 `m_stop` 设为 `true` 之后，在本地创建一个临时套接字主动连接自身监听的端口并发送哑数据。这会强制唤醒处于 `accept()` 阻塞中的工作线程，使其随后在循环条件判断中发现 `m_stop == true` 并退出；
2. **防范客户端恶意挂起**：若客户端建立连接后故意不发送数据，同步服务器在缺乏超时机制的情况下将永远卡死。要彻底解决该问题，必须脱离纯同步模型，转向支持超时的非阻塞或异步 I/O 架构。

### 参考信息

- 第 2 章《网络 I/O 操作》包含关于如何进行同步读写 I/O 的详细范例。

---

## 实现同步并发 TCP 服务器

同步并发 TCP 服务器满足以下特征：
- 在客户端-服务端通信模型中扮演服务端角色；
- 使用 TCP 协议与客户端通信；
- 使用阻塞当前执行线程的 I/O 和控制操作；
- **能够同时并发处理多个客户端连接**。

其典型算法流程如下：
1. 分配一个接收器套接字并绑定到特定 TCP 端口；
2. 循环运行直到服务器被停止：
   1. 等待客户端的连接请求；
   2. 接受客户端的连接请求；
   3. **派生一个新的执行线程**，并在该新线程的上下文中：
      - 等待并读取客户端请求报文；
      - 处理请求；
      - 发送响应报文给客户端；
      - 关闭连接并释放套接字及资源。

### 操作步骤

首先重构 `Service` 类，使其在新派生的独立线程中处理客户端会话：

```cpp
#include <boost/asio.hpp>
#include <thread>
#include <atomic>
#include <memory>
#include <iostream>

using namespace boost;

class Service {
public:
   Service(){}

   void StartHandligClient(
         std::shared_ptr<asio::ip::tcp::socket> sock) {

      std::thread th(([this, sock]() {
         HandleClient(sock);
      }));

      th.detach();
   }

private:
   void HandleClient(std::shared_ptr<asio::ip::tcp::socket> sock) {
      try {
         asio::streambuf request;
         asio::read_until(*sock.get(), request, '\n');

         // 模拟耗时请求处理
         int i = 0;
         while (i != 1000000)
            i++;

         std::this_thread::sleep_for(
            std::chrono::milliseconds(500));

         // 发送响应报文
         std::string response = "Response\n";
         asio::write(*sock.get(), asio::buffer(response));
      }
      catch (system::system_error &e) {
         std::cout << "Error occured! Error code = "
            << e.code() << ". Message: "
            << e.what();
      }

      // 处理完毕后释放自身内存
      delete this;
   }
};
```

接下来调整 `Acceptor` 类，在接受连接后为每个会话动态创建 `Service` 实例并将其移交给独立线程：

```cpp
class Acceptor {
public:
   Acceptor(asio::io_service& ios, unsigned short port_num) :
      m_ios(ios),
      m_acceptor(m_ios,
          asio::ip::tcp::endpoint(
              asio::ip::address_v4::any(),
              port_num))
   {
      m_acceptor.listen();
   }

   void Accept() {
      std::shared_ptr<asio::ip::tcp::socket>
         sock(new asio::ip::tcp::socket(m_ios));

      m_acceptor.accept(*sock.get());

      (new Service)->StartHandligClient(sock);
   }

private:
   asio::io_service& m_ios;
   asio::ip::tcp::acceptor m_acceptor;
};
```

`Server` 类结构保持不变：

```cpp
class Server {
public:
  Server() : m_stop(false) {}

  void Start(unsigned short port_num) {
    m_thread.reset(new std::thread([this, port_num]() {
      Run(port_num);
    }));
  }

  void Stop() {
    m_stop.store(true);
    m_thread->join();
  }

private:
  void Run(unsigned short port_num) {
    Acceptor acc(m_ios, port_num);

    while (!m_stop.load()) {
      acc.Accept();
    }
  }

  std::unique_ptr<std::thread> m_thread;
  std::atomic<bool> m_stop;
  asio::io_service m_ios;
};
```

入口函数 `main()` 与上一节完全一致：

```cpp
int main()
{
   unsigned short port_num = 3333;

   try {
      Server srv;
      srv.Start(port_num);

      std::this_thread::sleep_for(std::chrono::seconds(60));

      srv.Stop();
   }
   catch (system::system_error &e) {
      std::cout << "Error occured! Error code = "
         << e.code() << ". Message: "
         << e.what();
   }

   return 0;
}
```

### 工作原理

相比迭代服务器，同步并发服务器的核心改进在于**解除了主连接接受循环与客户端读写处理之间的直接耦合**：

#### 并发模型剖析
1. 在 `Acceptor::Accept()` 中，当 `m_acceptor.accept()` 成功后，套接字通过智能指针管理，并动态分配一个 `Service` 对象；
2. 随后调用 `Service::StartHandligClient(sock)`。该方法立即派生一个独立的 `std::thread` 执行私有成员方法 `HandleClient()`，并在创建后立即调用 `th.detach()` 分离该线程；
3. `StartHandligClient()` 派生线程后立即返回，`Accept()` 随之结束并迅速进入下一次迭代，继续调用 `m_acceptor.accept()` 等待后续连接。
4. 在分离的子线程中，`HandleClient()` 独立执行同步读、计算模拟和同步写。处理完毕后，执行 `delete this;` 销毁自身堆对象。

这种设计使得多个客户端的 I/O 阻塞和计算操作在各自专有的线程中进行，互不干扰，从而实现了**并发服务能力**。

#### 局限性与潜在问题
虽然解决了并发处理能力，但该方案仍存在显著缺陷：
1. **线程暴涨（Thread Explosion）**：为每个连接无节制地创建原生操作系统线程，在面对高并发连接时会导致巨大的内存开销与频繁的上下文切换惩罚；
2. **依然无法优雅退出**：工作线程若仍阻塞在 `acc.Accept()` 上，在没有新连接到达时，`Server::Stop()` 依然可能永久卡住。

### 参考信息

- 第 2 章《网络 I/O 操作》包含关于同步读写操作的深入解析。

---

## 实现异步 TCP 服务器

异步 TCP 服务器满足以下特征：
- 在客户端-服务端通信模型中扮演服务端角色；
- 使用 TCP 协议与客户端通信；
- **全链路采用非阻塞异步 I/O 与事件驱动控制操作**；
- 能够高效、高吞吐地同时处理大量并发客户端。

其典型算法流程如下：
1. 分配一个接收器套接字并绑定到特定 TCP 端口；
2. 发起异步接受连接操作（Async Accept）；
3. 派生一个或多个工作线程，加入到运行 Boost.Asio 事件循环（Event Loop）的线程池中；
4. 当异步接收完成时，立即发起下一个异步接收以准备处理后续连接；
5. 对已连接的客户端发起异步读取操作（Async Read）；
6. 异步读取完成后，处理业务请求并准备响应报文；
7. 发起异步写入操作（Async Write）向客户端回传响应；
8. 异步写入完成后，关闭连接并销毁会话资源。

由于采用全异步事件驱动模型，上述各步骤的回调执行顺序可能交错进行，即使在单核机器上也能以非阻塞方式交织推进。

### 操作步骤

首先定义异步会话管理类 `Service`：

```cpp
#include <boost/asio.hpp>
#include <thread>
#include <atomic>
#include <memory>
#include <iostream>
#include <vector>
#include <cassert>

using namespace boost;

class Service {
public:
   Service(std::shared_ptr<asio::ip::tcp::socket> sock) :
      m_sock(sock)
   {}

   void StartHandling() {
      asio::async_read_until(*m_sock.get(),
            m_request,
            '\n',
            [this](
               const boost::system::error_code& ec,
               std::size_t bytes_transferred)
            {
               onRequestReceived(ec, bytes_transferred);
            });
   }

private:
   void onRequestReceived(const boost::system::error_code& ec,
                std::size_t bytes_transferred) {
      if (ec != 0) {
         std::cout << "Error occured! Error code = "
            << ec.value()
            << ". Message: " << ec.message();

         onFinish();
         return;
      }

      // 处理业务请求
      m_response = ProcessRequest(m_request);

      // 发起异步写入操作
      asio::async_write(*m_sock.get(),
            asio::buffer(m_response),
            [this](
               const boost::system::error_code& ec,
               std::size_t bytes_transferred)
            {
               onResponseSent(ec, bytes_transferred);
            });
   }

   void onResponseSent(const boost::system::error_code& ec,
                      std::size_t bytes_transferred) {
      if (ec != 0) {
         std::cout << "Error occured! Error code = "
            << ec.value()
            << ". Message: " << ec.message();
      }

      onFinish();
   }

   // 清理并销毁会话对象
   void onFinish() {
      delete this;
   }

   std::string ProcessRequest(asio::streambuf& request) {
      // 在此方法中解析请求、执行业务计算并构建响应

      // 模拟 CPU 计算开销
      int i = 0;
      while (i != 1000000)
         i++;

      // 模拟微小的阻塞调用（例如磁盘 I/O）
      std::this_thread::sleep_for(
         std::chrono::milliseconds(100));

      std::string response = "Response\n";
      return response;
   }

private:
   std::shared_ptr<asio::ip::tcp::socket> m_sock;
   std::string m_response;
   asio::streambuf m_request;
};
```

接下来定义全异步的 `Acceptor` 类：

```cpp
class Acceptor {
public:
  Acceptor(asio::io_service& ios, unsigned short port_num) :
    m_ios(ios),
    m_acceptor(m_ios,
      asio::ip::tcp::endpoint(
                  asio::ip::address_v4::any(),
                  port_num)),
    m_isStopped(false)
  {}

  // 开始监听并异步接受连接
  void Start() {
    m_acceptor.listen();
    InitAccept();
  }

  // 停止接受新连接
  void Stop() {
    m_isStopped.store(true);
  }

private:
  void InitAccept() {
    std::shared_ptr<asio::ip::tcp::socket>
              sock(new asio::ip::tcp::socket(m_ios));

    m_acceptor.async_accept(*sock.get(),
      [this, sock](const boost::system::error_code& error)
      {
        onAccept(error, sock);
      });
  }

  void onAccept(const boost::system::error_code& ec,
               std::shared_ptr<asio::ip::tcp::socket> sock)
  {
    if (ec == 0) {
      (new Service(sock))->StartHandling();
    }
    else {
      std::cout << "Error occured! Error code = "
        << ec.value()
        << ". Message: " << ec.message();
    }

    // 若未收到停止指令，继续发起下一次异步接受
    if (!m_isStopped.load()) {
      InitAccept();
    }
    else {
      // 停止接受新连接并释放底层接收器资源
      m_acceptor.close();
    }
  }

private:
  asio::io_service& m_ios;
  asio::ip::tcp::acceptor m_acceptor;
  std::atomic<bool> m_isStopped;
};
```

接下来定义管理线程池与 I/O 上下文的 `Server` 类：

```cpp
class Server {
public:
   Server() {
      m_work.reset(new asio::io_service::work(m_ios));
   }

   // 启动服务器
   void Start(unsigned short port_num,
      unsigned int thread_pool_size) {

      assert(thread_pool_size > 0);

      // 创建并启动 Acceptor
      acc.reset(new Acceptor(m_ios, port_num));
      acc->Start();

      // 创建指定数量的工作线程并加入线程池
      for (unsigned int i = 0; i < thread_pool_size; i++) {
         std::unique_ptr<std::thread> th(
            new std::thread([this]()
            {
               m_ios.run();
            }));

         m_thread_pool.push_back(std::move(th));
      }
   }

   // 停止服务器
   void Stop() {
      acc->Stop();
      m_ios.stop();

      for (auto& th : m_thread_pool) {
         th->join();
      }
   }

private:
   asio::io_service m_ios;
   std::unique_ptr<asio::io_service::work> m_work;
   std::unique_ptr<Acceptor> acc;
   std::vector<std::unique_ptr<std::thread>> m_thread_pool;
};
```

最后实现入口函数 `main()`，根据硬件并发度配置线程池规模：

```cpp
const unsigned int DEFAULT_THREAD_POOL_SIZE = 2;

int main()
{
  unsigned short port_num = 3333;

  try {
    Server srv;

    // 推荐的线程池规模计算：硬件核心数 * 2
    unsigned int thread_pool_size =
      std::thread::hardware_concurrency() * 2;

    if (thread_pool_size == 0)
      thread_pool_size = DEFAULT_THREAD_POOL_SIZE;

    srv.Start(port_num, thread_pool_size);

    std::this_thread::sleep_for(std::chrono::seconds(60));

    srv.Stop();
  }
  catch (system::system_error& e) {
    std::cout << "Error occured! Error code = "
               << e.code() << ". Message: "
               << e.what();
  }

  return 0;
}
```

### 工作原理

异步 TCP 服务器实现了纯事件驱动与多线程 I/O 线程池模型，架构由以下各部分协同配合：

#### Service 类的生命周期与异步回调链
每个连入的客户端都会对应堆上分配的一个独立 `Service` 实例：
1. `StartHandling()` 调用 `asio::async_read_until()` 异步读取请求数据，完成时触发 `onRequestReceived()`；
2. `onRequestReceived()` 验证无错误后，调用 `ProcessRequest()` 生成响应文本，随后调用 `asio::async_write()` 异步将响应写回对端；
3. 写操作完成触发 `onResponseSent()`，最终调用 `onFinish()` 执行 `delete this;`，安全销毁会话自身对象，完成单次会话的全部生命周期。

整个过程没有任何线程在此处被阻塞，CPU 线程在各异步 I/O 挂起期间可以处理其他并发客户端的任务。

#### Acceptor 类的异步循环与可控停止
`Acceptor` 采用**自驱动链式调用（Self-perpetuating Loop）**模式：
- `Start()` 调用 `InitAccept()` 发起 `async_accept()` 操作；
- 当连接到达并触发 `onAccept()` 时，首先启动 `Service` 处理该连接；
- 随后检查原子变量 `m_isStopped`：若未要求停止，则再次调用 `InitAccept()` 挂起下一个 `async_accept()`，从而周而复始地持续接受新连接；若已被要求停止，则显式调用 `m_acceptor.close()`，彻底关闭接收器。

#### Server 类的线程池调度与平滑停机
`Server` 封装了 `asio::io_service` 及其事件循环线程池：
1. 在构造函数中，利用 `m_work` 对象防止 `m_ios.run()` 在暂无异步任务时提前退出；
2. `Start()` 启动 `Acceptor`，并启动 `thread_pool_size` 个工作线程同时执行 `m_ios.run()`。这构成了典型的 **Proactor 架构**，多个工作线程并发从内部事件队列中取出完成事件并执行回调；
3. `Stop()` 方法首先通知 `Acceptor` 停止接收新连接，随后调用 `m_ios.stop()` 强制终止所有线程上的事件循环，最后逐个 `join()` 工作线程以确保所有线程安全退出。

#### main() 线程池伸缩优化
在入口函数中，通过 `std::thread::hardware_concurrency() * 2` 计算出最适宜的 I/O 线程数量，当探测失败返回 0 时回退到预设常量 `DEFAULT_THREAD_POOL_SIZE = 2`。该配置能在充分利用多核心并行能力的同时，有效控制线程上下文切换开销。

---

## 本章小结

在本章中，我们对比了构建 TCP 服务端应用的三种核心架构：
- **同步迭代服务器**：结构最为简单直观，但无法并发服务多个客户端，且极易因单个慢速或恶意客户端陷入全局死锁；
- **同步并发服务器**：通过为每个会话动态创建并分离线程实现并发，但面临线程资源无序膨胀和高并发瓶颈；
- **异步事件驱动服务器**：结合 Boost.Asio 的 Proactor 异步 I/O 与固定容量线程池，实现了高吞吐、强韧性与优异的可伸缩性，是构建生产级高性能网络服务的标准实践范式。

### 参考信息

- 第 2 章《网络 I/O 操作》：深入讲解了异步套接字读写操作及其取消机制。
- 第 6 章《其他技术主题》中的“使用定时器”范例：演示如何利用 Boost.Asio 定时器为异步会话添加超时控制，进一步防范慢速客户端拒绝服务风险。
