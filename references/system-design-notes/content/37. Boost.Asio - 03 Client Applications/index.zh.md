---
id: boost-asio-03-client-applications
title: "第 3 章：构建客户端应用"
titleEn: "Chapter 3: Implementing Client Applications"
order: 37
category: specialized
description: "实战构建高性能同步与异步 TCP/UDP 客户端应用架构，处理连接管理、请求响应流与取消操作。"
tags: ["Boost.Asio", "客户端", "同步客户端", "异步客户端", "TCP客户端", "UDP客户端"]
---

# 第 3 章：构建客户端应用

在本章中，我们将涵盖以下主题：

- 实现同步 TCP 客户端
- 实现同步 UDP 客户端
- 实现异步 TCP 客户端

---

## 引言

客户端是分布式应用程序的一部分，它与应用程序的另一部分（即服务端）进行通信，以使用服务端所提供的服务。另一方面，服务端是分布式应用中被动等待来自客户端请求的一方。当请求到达时，服务端执行所请求的操作，并将响应（即操作的结果）发送回客户端。

客户端的核心特征在于：它需要服务端提供的服务，并且它会主动向服务端发起通信会话以使用该服务。服务端的关键特征则是：通过提供所请求的服务来处理来自客户端的请求。

我们将在下一章详细讨论服务端。而在本章中，我们将专注于客户端应用程序，并深入探讨几种不同类型的客户端实现。

### 客户端应用的分类

客户端应用程序可以按照它们与服务端通信时所使用的传输层协议进行分类：
- 如果客户端使用 UDP 协议，则称为 **UDP 客户端**；
- 如果使用 TCP 协议，则相应地称为 **TCP 客户端**。

当然，客户端应用程序还可以使用许多其他传输层协议进行通信。此外，还存在能够通过多种协议进行通信的多协议客户端。然而，这些内容超出了本书的讨论范围。在本章中，我们将专注于纯粹的 UDP 和 TCP 客户端，它们是当今通用软件中最流行且最常用的客户端类型。

在分布式应用程序设计的早期阶段，就应该根据应用程序规范决定各部分之间采用哪种传输层协议进行通信。由于 TCP 和 UDP 协议在概念上截然不同，在应用程序开发的后期阶段从一种协议切换到另一种协议往往非常困难。

对客户端应用程序进行分类的另一种方式是依据其工作方式为**同步**还是**异步**：
- **同步客户端应用程序**使用同步套接字 API 调用，这些调用会阻塞当前执行线程，直到请求的操作完成或发生错误。因此，典型的同步 TCP 客户端会使用 `asio::ip::tcp::socket::write_some()` 方法或 `asio::write()` 自由函数向服务端发送请求，然后使用 `asio::ip::tcp::socket::read_some()` 方法或 `asio::read()` 自由函数接收响应。这些方法和函数均具有阻塞性，从而使得客户端成为同步客户端。
- 与同步客户端相反，**异步客户端应用程序**使用异步套接字 API 调用。例如，异步 TCP 客户端可以使用 `asio::ip::tcp::socket::async_write_some()` 方法或 `asio::async_write()` 自由函数向服务端发送请求，然后使用 `asio::ip::tcp::socket::async_read_some()` 方法或 `asio::async_read()` 自由函数异步接收响应。

由于同步客户端与异步客户端的体系结构存在显著差异，采用哪种方案的决策必须在应用程序设计初期确立，并且该决策应基于对应用需求的仔细分析。此外，还应充分考虑未来可能出现的演进路径与新增需求。

### 同步与异步的权衡

通常，每种方法各有利弊。同步方法在某种场景下可能表现优异，但在另一种场景下可能完全不可接受；在后一种情况下，就必须采用异步方法。让我们对比这两种方法，以便更好地理解各自适用的场景。

**同步方法的主要优势在于其简单性。** 相比功能相同的异步客户端，同步客户端在开发、调试和维护方面的难度都要低得多。异步客户端之所以更复杂，是因为它们所使用的异步操作是在发起该操作之外的其他地方（主要是回调函数中）完成的。这通常需要在堆内存中分配额外的数据结构来保存请求上下文与回调函数，同时还涉及线程同步及其他附加机制，这可能使程序结构变得相当复杂且容易出错。而同步客户端绝大多数都不需要这些额外开销。此外，异步方法会带来额外的计算和内存开销，在某些条件下其执行效率可能低于同步方法。

然而，**同步方法具有某些功能限制**，这往往使其在许多场景下不可行。这些限制包括：无法在同步操作启动后将其取消，也无法为其指定超时时间以在执行时间过长时中断操作。与同步操作相反，异步操作可以在发起之后、完成之前的任意时刻被取消。

想象一个典型的现代 Web 浏览器。请求取消功能对于此类客户端应用来说至关重要。用户在发出加载某个特定网站的命令后，可能会改变主意，决定在页面完全加载前取消该命令。从用户体验的角度来看，如果必须等到页面完全加载后才能执行取消操作，那将是极不合理的。因此，在这种场景下，同步方法并不是一个好的选择。

除了上述在复杂性和功能上的差异外，在需要**并行执行多个请求**时，这两种方法在效率上也存在差异。

假设我们正在开发一个网络爬虫（Web Crawler），该程序用于遍历各个网站的网页并进行处理以提取有价值的信息。给定一个包含海量网站列表（例如数百万个）的文件，该程序需要遍历文件中列出的每个站点的所有页面并对其进行处理。显然，该应用的核心需求之一是尽可能快速地完成任务。面对这种需求，我们应该选择同步还是异步方法？

在回答这个问题之前，让我们从客户端应用程序的视角审视一个请求的生命周期及其时间分布。从概念上讲，请求生命周期包含以下五个阶段：

1. **准备请求（Preparing the request）**：该阶段包括准备请求消息所需的任何操作。此步骤的持续时间取决于应用程序解决的具体问题。在我们的示例中，这可能是从输入文件中读取下一个网站地址，并按照 HTTP 协议构建表示请求的字符串。
2. **将请求从客户端传输到服务端（Transmitting a request from the client to the server）**：该阶段涉及通过网络将请求数据从客户端传输到服务端。此步骤的持续时间不由客户端应用程序决定，而是取决于网络的属性及当前网络状态。
3. **服务端处理请求（Processing the request by the server）**：此步骤的耗时取决于服务端的性能和当前负载。在我们的示例中，服务端应用程序是一个 Web 服务器，请求处理主要包括构建所请求的网页，这可能涉及诸如读取文件和从数据库加载数据等 I/O 操作。
4. **将响应从服务端传输到客户端（Transmitting a response from the server to the client）**：与阶段 2 类似，此阶段同样涉及网络上的数据传输，只是方向相反——从服务端传回客户端。该阶段的耗时同样不受客户端或服务端控制，仅取决于网络的属性与当前状态。
5. **客户端处理响应（Processing the response by the client）**：该阶段的耗时取决于客户端预期的具体任务。在我们的示例中，这可能是解析网页、提取感兴趣的信息并将其存入数据库。

> 需要说明的是，为了表述简洁，我们忽略了诸如建立连接和关闭连接等底层子阶段。虽然在使用 TCP 协议时它们十分重要，但并未对我们请求生命周期的概念模型增添实质性差异。

可以看出，客户端仅在**阶段 1** 和**阶段 5** 中执行与该请求相关的有效计算工作。在阶段 1 结束并发起请求数据传输后，客户端必须在接下来的三个阶段（阶段 2、3 和 4）中等待，然后才能接收响应并进行后续处理。

了解了请求生命周期的各个阶段后，我们来看看在实现示例网络爬虫时采用同步与异步方法会发生什么：
- 如果采用**同步方法**，同步处理单个请求的执行线程将在请求生命周期的阶段 2 至 4 期间处于休眠/阻塞状态，只有在阶段 1 和 5 中才会执行有效工作（为简化起见，假定阶段 1 和 5 不包含阻塞线程的指令）。这意味着操作系统资源（即线程）未能得到高效利用，因为在该线程无所事事的同时，外部还有数百万个其他页面等待请求和处理。
- 在这种情况下，**异步方法**显然更为高效。采用异步方法后，执行线程不会在请求生命周期的阶段 2 至 4 中被阻塞，而是可以被充分利用去执行另一个请求的阶段 1 或阶段 5。

通过这种方式，我们让单个线程交叉处理不同请求的不同阶段（这称为**重叠执行 / Overlapping**），从而提高了线程的利用率，进而大幅提升了应用程序的整体吞吐量与性能。

然而，**异步方法并非在所有情况下都优于同步方法**。正如前文所述，异步操作会引入额外的计算和框架开销，这意味着单次异步操作从发起至完成的总耗时会略大于等效的同步操作。因此，如果单个请求中阶段 2 至 4 的平均总等待时间小于异步方案引入的调度开销，那么同步方法反而更加高效，应当被选为更合理的实现路径。

通常需要通过实验测试来评估请求生命周期中阶段 2 至 4 的总耗时以及异步方法的开销。该耗时可能会大幅波动，具体取决于传输请求与响应的网络环境与拥塞状态，以及处理请求的服务端应用程序的处理性能与负载水平。

### 示例协议

在本章中，我们将通过三个具体范例（Recipe）分别展示如何实现特定类型的客户端应用程序：同步 UDP 客户端、同步 TCP 客户端以及异步 TCP 客户端。在所有范例中，假定客户端应用程序均使用以下简单的应用层协议与服务端通信：

服务端接受表示为 ASCII 字符串的请求，其格式如下：
```text
EMULATE_LONG_COMP_OP [s]<LF>
```
其中 `[s]` 为正整数，`<LF>` 为 ASCII 换行符（`\n`）。

服务端将该字符串解析为执行耗时 `[s]` 秒模拟计算操作的请求。例如，请求字符串可能如下所示：
```text
"EMULATE_LONG_COMP_OP 10\n"
```
这表示发送该请求的客户端希望服务端执行模拟操作 10 秒钟，随后向客户端发送响应。

与请求类似，服务端返回的响应也表示为 ASCII 字符串：如果操作成功完成，则为 `OK<LF>`；如果操作失败，则为 `ERROR<LF>`。

---

## 实现同步 TCP 客户端

同步 TCP 客户端是分布式应用程序的一部分，满足以下特征：
- 在客户端-服务端通信模型中扮演客户端角色；
- 使用 TCP 协议与服务端应用程序通信；
- 使用阻塞当前执行线程的 I/O 和控制操作（至少涉及与服务端通信的 I/O 操作），直到相应操作完成或发生错误。

典型的同步 TCP 客户端遵循以下算法流程：
1. 获取服务端应用程序的 IP 地址和协议端口号；
2. 分配一个主动套接字（Active Socket）；
3. 与服务端应用程序建立连接；
4. 与服务端交换消息；
5. 关闭（Shut down）连接；
6. 释放套接字资源。

本范例演示如何使用 Boost.Asio 实现同步 TCP 客户端应用程序。

### 操作步骤

下面的代码示例演示了使用 Boost.Asio 实现同步 TCP 客户端的一种方案。该客户端使用引言部分描述的应用层协议：

```cpp
#include <boost/asio.hpp>
#include <iostream>

using namespace boost;

class SyncTCPClient {
public:
  SyncTCPClient(const std::string& raw_ip_address,
    unsigned short port_num) :
    m_ep(asio::ip::address::from_string(raw_ip_address),
    port_num),
    m_sock(m_ios) {

    m_sock.open(m_ep.protocol());
  }

  void connect() {
    m_sock.connect(m_ep);
  }

  void close() {
    m_sock.shutdown(
      boost::asio::ip::tcp::socket::shutdown_both);
    m_sock.close();
  }

  std::string emulateLongComputationOp(
    unsigned int duration_sec) {

    std::string request = "EMULATE_LONG_COMP_OP "
      + std::to_string(duration_sec)
      + "\n";

    sendRequest(request);
    return receiveResponse();
  };

private:
  void sendRequest(const std::string& request) {
    asio::write(m_sock, asio::buffer(request));
  }

  std::string receiveResponse() {
    asio::streambuf buf;
    asio::read_until(m_sock, buf, '\n');

    std::istream input(&buf);

    std::string response;
    std::getline(input, response);

    return response;
  }

private:
  asio::io_service m_ios;

  asio::ip::tcp::endpoint m_ep;
  asio::ip::tcp::socket m_sock;
};

int main()
{
  const std::string raw_ip_address = "127.0.0.1";
  const unsigned short port_num = 3333;

  try {
    SyncTCPClient client(raw_ip_address, port_num);

    // 同步连接
    client.connect();

    std::cout << "Sending request to the server... "
      << std::endl;

    std::string response =
      client.emulateLongComputationOp(10);

    std::cout << "Response received: " << response
      << std::endl;

    // 关闭连接并释放资源
    client.close();
  }
  catch (system::system_error &e) {
    std::cout << "Error occured! Error code = " << e.code()
      << ". Message: " << e.what();

    return e.code().value();
  }

  return 0;
}
```

### 工作原理

示例客户端应用程序由两个核心组件组成：`SyncTCPClient` 类和应用程序入口函数 `main()`，在 `main()` 中使用 `SyncTCPClient` 类与服务端进行通信。下面我们分别对这两个组件进行解析。

#### SyncTCPClient 类

`SyncTCPClient` 类是示例中的核心组件，它实现并对外提供了网络通信功能。

该类包含三个私有成员变量：
- `asio::io_service m_ios`：该对象提供对操作系统底层通信服务的访问接口，供套接字对象使用；
- `asio::ip::tcp::endpoint m_ep`：指定目标服务端应用程序的端点（IP 和端口）；
- `asio::ip::tcp::socket m_sock`：用于网络通信的套接字。

该类的每个实例用于与单个服务端应用程序通信。因此，类的构造函数接收服务端 IP 地址和端口号作为参数，并在构造函数初始化列表中实例化 `m_ep` 对象。套接字对象 `m_sock` 同样在构造函数中被实例化并打开。

`SyncTCPClient` 类对外暴露三个公有方法：
1. `connect()`：将套接字连接到服务端；
2. `close()`：切断连接（shutdown）并关闭套接字，促使操作系统释放相关的套接字文件描述符及底层资源；
3. `emulateLongComputationOp(unsigned int duration_sec)`：执行网络 I/O 的核心业务方法。该方法首先按协议要求构造请求字符串，然后将其传递给私有方法 `sendRequest(const std::string& request)` 发送至服务端。发送完成且 `sendRequest()` 返回后，调用 `receiveResponse()` 方法接收来自服务端的响应。收到响应后，`receiveResponse()` 返回包含响应数据的字符串，最后 `emulateLongComputationOp()` 将该响应返回给调用者。

我们进一步分析 `sendRequest()` 和 `receiveResponse()` 的实现细节：

`sendRequest()` 的声明如下：
```cpp
void sendRequest(const std::string& request)
```
其功能是将作为参数传入的字符串发送到服务端。为了发送数据，内部调用了 `asio::write()` 同步自由函数。该函数在整个请求数据发送完毕后返回。本质上，该方法完全委托给了 `asio::write()`。

发送请求后，客户端需要接收服务端的响应，这由 `receiveResponse()` 方法完成。该方法内部使用了 `asio::read_until()` 自由函数。根据应用层协议，服务端返回的响应消息长度可能不固定，但必须以换行符 `\n` 结尾；因此，在调用该函数时将换行符作为定界符传入：
```cpp
asio::streambuf buf;
asio::read_until(m_sock, buf, '\n');
```
该函数会阻塞执行线程，直到从服务端接收的数据流中遇到 `\n` 字符为止。函数返回时，流缓冲区 `buf` 中已包含响应数据。随后，数据从 `buf` 读取到 `response` 字符串中并返回。

> 需要指出的是，`SyncTCPClient` 类内部并未包含显式的错误处理代码。这是因为该类使用的是在失败时抛出异常的 Boost.Asio 重载版本。类的调用方负责捕获并处理这些异常。

#### main() 入口函数

该函数是 `SyncTCPClient` 类的调用方。在获取到服务端的 IP 地址和端口号后（示例中直接硬编码），它实例化 `SyncTCPClient` 对象并连接服务端，调用 `emulateLongComputationOp(10)` 请求服务端执行 10 秒的模拟计算服务。代码逻辑简单清晰，异常由 `try-catch` 块捕获并输出错误信息。

### 参考信息

- 第 2 章《网络 I/O 操作》中包含了关于如何执行同步 I/O 操作的详细探讨范例。

---

## 实现同步 UDP 客户端

同步 UDP 客户端是分布式应用程序的一部分，满足以下特征：
- 在客户端-服务端通信模型中扮演客户端角色；
- 使用 UDP 协议与服务端应用程序通信；
- 使用阻塞执行线程的 I/O 和控制操作（至少涉及与服务端通信的 I/O 操作），直到相应操作完成或发生错误。

典型的同步 UDP 客户端遵循以下算法流程：
1. 获取客户端准备与之通信的每个服务端的 IP 地址和协议端口号；
2. 分配一个 UDP 套接字；
3. 与服务端交换消息；
4. 释放套接字资源。

本范例演示如何使用 Boost.Asio 实现同步 UDP 客户端应用程序。

### 操作步骤

下面的代码示例演示了使用 Boost.Asio 实现同步 UDP 客户端的一种方案。假定客户端在底层的 IPv4 协议上使用 UDP 进行通信：

```cpp
#include <boost/asio.hpp>
#include <iostream>

using namespace boost;

class SyncUDPClient {
public:
  SyncUDPClient() :
    m_sock(m_ios) {

    m_sock.open(asio::ip::udp::v4());
  }

  std::string emulateLongComputationOp(
    unsigned int duration_sec,
    const std::string& raw_ip_address,
    unsigned short port_num) {

    std::string request = "EMULATE_LONG_COMP_OP "
      + std::to_string(duration_sec)
      + "\n";

    asio::ip::udp::endpoint ep(
      asio::ip::address::from_string(raw_ip_address),
      port_num);

    sendRequest(ep, request);
    return receiveResponse(ep);
  };

private:
  void sendRequest(const asio::ip::udp::endpoint& ep,
    const std::string& request) {

    m_sock.send_to(asio::buffer(request), ep);
  }

  std::string receiveResponse(asio::ip::udp::endpoint& ep) {
    char response[6];
    std::size_t bytes_recieved =
      m_sock.receive_from(asio::buffer(response), ep);

    m_sock.shutdown(asio::ip::udp::socket::shutdown_both);
    return std::string(response, bytes_recieved);
  }

private:
  asio::io_service m_ios;

  asio::ip::udp::socket m_sock;
};

int main()
{
  const std::string server1_raw_ip_address = "127.0.0.1";
  const unsigned short server1_port_num = 3333;

  const std::string server2_raw_ip_address = "192.168.1.10";
  const unsigned short server2_port_num = 3334;

  try {
    SyncUDPClient client;

    std::cout << "Sending request to the server #1 ... "
      << std::endl;

    std::string response =
      client.emulateLongComputationOp(10,
      server1_raw_ip_address, server1_port_num);

    std::cout << "Response from the server #1 received: "
      << response << std::endl;

    std::cout << "Sending request to the server #2... "
      << std::endl;

    response =
      client.emulateLongComputationOp(10,
      server2_raw_ip_address, server2_port_num);

    std::cout << "Response from the server #2 received: "
      << response << std::endl;
  }
  catch (system::system_error &e) {
    std::cout << "Error occured! Error code = " << e.code()
      << ". Message: " << e.what();

    return e.code().value();
  }

  return 0;
}
```

### 工作原理

该示例由两个主要组件构成：`SyncUDPClient` 类和入口函数 `main()`，后者使用 `SyncUDPClient` 实例与两个服务端程序通信。

#### SyncUDPClient 类

`SyncUDPClient` 类是核心组件，负责提供基于 UDP 的通信功能。

该类包含两个私有成员：
- `asio::io_service m_ios`：提供底层 I/O 服务的上下文对象；
- `asio::ip::udp::socket m_sock`：用于网络通信的 UDP 套接字。

套接字对象 `m_sock` 在类的构造函数中完成实例化和打开。因为客户端指定使用 IPv4 协议，我们向套接字的 `open()` 方法传入 `asio::ip::udp::v4()`。

由于 UDP 属于**无连接（Connectionless）协议**，因此该类的同一个对象实例即可用于与多个不同的服务端进行通信。该类对外仅暴露一个接口方法——`emulateLongComputationOp()`：
```cpp
std::string emulateLongComputationOp(
         unsigned int duration_sec,
         const std::string& raw_ip_address,
         unsigned short port_num)
```
除了表示请求参数的 `duration_sec` 外，该方法还接收目标服务端的 IP 地址和端口号，因此可以被多次调用以分别与不同的服务端进行交互。

该方法首先按照协议格式组织请求字符串，并创建指向目标服务端的端点对象 `ep`。接着，将请求字符串与端点对象传给私有方法 `sendRequest()` 发送数据报。发送完毕后，调用 `receiveResponse()` 等待并接收服务端返回的响应，最终将响应内容返回给调用者。

在 `sendRequest()` 中，使用了套接字的 `send_to()` 方法：
```cpp
template <typename ConstBufferSequence>
std::size_t send_to(const ConstBufferSequence& buffers,
    const endpoint_type& destination)
```
该方法接收包含待发数据的缓冲区以及目标端点作为参数，并发生阻塞，直到整个缓冲区的数据发送到操作系统底层网络栈或发生错误。注意，该方法无错误返回仅表示请求已成功发出，**并不意味着服务端已经接收到该数据**。UDP 协议不保证消息送达，也不提供任何机制供发送端确认数据报是在途中丢失还是已安全到达对端。

发送请求后，`receiveResponse()` 方法负责等待接收响应。由于应用层协议规定的最大响应为 `ERROR\n`（共 6 个 ASCII 字符，即 6 字节），我们直接在栈上分配了一个大小为 6 字节的字符数组 `response`。随后调用套接字的 `receive_from()` 方法接收数据：
```cpp
template <typename MutableBufferSequence>
std::size_t receive_from(const MutableBufferSequence& buffers,
    endpoint_type& sender_endpoint)
```
该方法将来自 `sender_endpoint` 的数据报读取到 `buffers` 中。

关于 `receive_from()` 方法需要注意两点：
1. **阻塞性与丢包风险**：该方法是同步阻塞的。如果服务端响应的数据报在网络传输中丢失，该方法将永远处于阻塞状态，导致整个客户端挂起。
2. **缓冲区容量**：如果接收到的 UDP 数据报大小超过了所提供的缓冲区容量，该操作将失败并报错。

收到数据后，构造 `std::string` 对象并逐层返回至 `main()` 函数。

#### main() 入口函数

在 `main()` 函数中，我们获取两个目标服务端的 IP 地址和端口，随后实例化一个 `SyncUDPClient` 对象，并连续两次调用 `emulateLongComputationOp()`，同步请求两台不同服务端上的服务。

### 参考信息

- 第 2 章《网络 I/O 操作》包含了详细讨论如何执行同步 I/O 操作的范例。

---

## 实现异步 TCP 客户端

正如本章引言中所述，即使是最简单的异步客户端在结构上也比等效的同步客户端更复杂。而当我们在异步客户端中引入**请求取消（Request Canceling）**等功能时，复杂度还会进一步上升。

在本范例中，我们将实现一个支持异步请求执行与请求动态取消的异步 TCP 客户端应用程序。该程序满足以下需求：
1. 来自用户的输入应当在独立的线程（用户界面 / UI 线程）中处理，该线程决不能被长时间阻塞；
2. 用户可以向不同的服务端并发发起多个请求；
3. 用户可以在先前发起的请求尚未完成时继续发起新的请求；
4. 用户可以在请求完成之前随时将其取消。

### 操作步骤

首先，由于应用需要支持取消 I/O 操作，在 Windows 早期版本上需定义相关宏以启用取消支持：

```cpp
#include <boost/predef.h> // 用于识别操作系统类型的工具头文件

// 在 Windows XP、Windows Server 2003 及更早版本上，需要定义以下宏以启用 I/O 操作取消。
// 详情可参考 Boost.Asio 官方文档中关于 basic_stream_socket::cancel 的说明。
#ifdef BOOST_OS_WINDOWS
#define _WIN32_WINNT 0x0501
#if _WIN32_WINNT <= 0x0502 // Windows Server 2003 或更早版本
  #define BOOST_ASIO_DISABLE_IOCP
  #define BOOST_ASIO_ENABLE_CANCELIO
#endif
#endif

#include <boost/asio.hpp>
#include <thread>
#include <mutex>
#include <memory>
#include <iostream>
#include <map>

using namespace boost;
```

接下来，定义表示回调函数指针的数据类型。因为客户端是异步的，我们需要回调机制作为请求完成的通知机制：

```cpp
// 函数指针类型：指向在请求完成时调用的回调函数
typedef void(*Callback) (unsigned int request_id,
  const std::string& response,
  const system::error_code& ec);
```

然后，定义一个数据结构来保存在单个请求执行期间所需的所有上下文数据，将其命名为 `Session`：

```cpp
// 表示单个请求上下文的会话结构体
struct Session {
  Session(asio::io_service& ios,
  const std::string& raw_ip_address,
  unsigned short port_num,
  const std::string& request,
  unsigned int id,
  Callback callback) :
  m_sock(ios),
  m_ep(asio::ip::address::from_string(raw_ip_address),
  port_num),
  m_request(request),
  m_id(id),
  m_callback(callback),
  m_was_cancelled(false) {}

  asio::ip::tcp::socket m_sock; // 用于通信的套接字
  asio::ip::tcp::endpoint m_ep; // 远程服务端端点
  std::string m_request;        // 请求字符串

  // 存储响应数据的流缓冲区
  asio::streambuf m_response_buf;
  std::string m_response;       // 解析后的响应字符串

  // 记录请求生命周期中发生的错误代码
  system::error_code m_ec;

  unsigned int m_id;            // 分配给请求的唯一标识符

  // 请求完成时触发的回调函数指针
  Callback m_callback;

  bool m_was_cancelled;         // 标记请求是否已被取消
  std::mutex m_cancel_guard;    // 保护取消状态与操作的互斥锁
};
```

接下来，定义封装异步通信功能的客户端管理类 `AsyncTCPClient`：

```cpp
class AsyncTCPClient : public boost::noncopyable {
public:
   AsyncTCPClient(){
      m_work.reset(new boost::asio::io_service::work(m_ios));

      m_thread.reset(new std::thread([this](){
         m_ios.run();
      }));
   }

   void emulateLongComputationOp(
      unsigned int duration_sec,
      const std::string& raw_ip_address,
      unsigned short port_num,
      Callback callback,
      unsigned int request_id) {

      // 准备请求字符串
      std::string request = "EMULATE_LONG_CALC_OP "
         + std::to_string(duration_sec)
         + "\n";

      std::shared_ptr<Session> session =
         std::shared_ptr<Session>(new Session(m_ios,
         raw_ip_address,
         port_num,
         request,
         request_id,
         callback));

      session->m_sock.open(session->m_ep.protocol());

      // 将新会话添加到活动会话列表中，
      // 以便在用户决定提前取消请求时能够检索到该会话。
      // 由于活跃会话列表会被多线程并发访问，我们使用互斥锁对其进行同步保护。
      std::unique_lock<std::mutex>
         lock(m_active_sessions_guard);

      m_active_sessions[request_id] = session;
      lock.unlock();

      session->m_sock.async_connect(session->m_ep,
         [this, session](const system::error_code& ec)
         {
         if (ec != 0) {
            session->m_ec = ec;
            onRequestComplete(session);
            return;
         }

         std::unique_lock<std::mutex>
            cancel_lock(session->m_cancel_guard);

         if (session->m_was_cancelled) {
            onRequestComplete(session);
            return;
         }

         asio::async_write(session->m_sock,
            asio::buffer(session->m_request),
            [this, session](const boost::system::error_code& ec,
               std::size_t bytes_transferred)
            {
            if (ec != 0) {
               session->m_ec = ec;
               onRequestComplete(session);
               return;
            }

            std::unique_lock<std::mutex>
               cancel_lock(session->m_cancel_guard);

            if (session->m_was_cancelled) {
               onRequestComplete(session);
               return;
            }

            asio::async_read_until(session->m_sock,
               session->m_response_buf,
               '\n',
               [this, session](const boost::system::error_code& ec,
                  std::size_t bytes_transferred)
               {
               if (ec != 0) {
                  session->m_ec = ec;
               } else {
                  std::istream strm(&session->m_response_buf);
                  std::getline(strm, session->m_response);
               }

               onRequestComplete(session);
            });
         });
      });
   };

   // 取消指定的请求
   void cancelRequest(unsigned int request_id) {
      std::unique_lock<std::mutex>
         lock(m_active_sessions_guard);

      auto it = m_active_sessions.find(request_id);
      if (it != m_active_sessions.end()) {
         std::unique_lock<std::mutex>
            cancel_lock(it->second->m_cancel_guard);

         it->second->m_was_cancelled = true;
         it->second->m_sock.cancel();
      }
   }

   void close() {
      // 销毁 work 对象。这允许 I/O 线程在没有待处理的异步操作时退出事件循环。
      m_work.reset(NULL);

      // 等待 I/O 线程执行结束退出
      m_thread->join();
   }

private:
   void onRequestComplete(std::shared_ptr<Session> session) {
      // 关闭连接。如果套接字未连接，该方法可能会失败。
      // 我们在此忽略可能的错误代码。
      boost::system::error_code ignored_ec;

      session->m_sock.shutdown(
         asio::ip::tcp::socket::shutdown_both,
         ignored_ec);

      // 从活跃会话映射表中移除该会话
      std::unique_lock<std::mutex>
         lock(m_active_sessions_guard);

      auto it = m_active_sessions.find(session->m_id);
      if (it != m_active_sessions.end())
         m_active_sessions.erase(it);

      lock.unlock();

      boost::system::error_code ec;

      if (session->m_ec == 0 && session->m_was_cancelled)
         ec = asio::error::operation_aborted;
      else
         ec = session->m_ec;

      // 调用用户提供的完成回调函数
      session->m_callback(session->m_id,
         session->m_response, ec);
   };

private:
   asio::io_service m_ios;
   std::map<int, std::shared_ptr<Session>> m_active_sessions;
   std::mutex m_active_sessions_guard;
   std::unique_ptr<boost::asio::io_service::work> m_work;
   std::unique_ptr<std::thread> m_thread;
};
```

该类提供了客户端的主要接口：
- `void emulateLongComputationOp(...)`：发起一个异步请求；
- `void cancelRequest(unsigned int request_id)`：取消先前发起的具有指定 ID 的请求；
- `void close()`：阻塞调用线程直到所有正在运行的请求完成并清理客户端。

接下来，定义一个作为完成通知的通用回调函数 `handler`：

```cpp
void handler(unsigned int request_id,
  const std::string& response,
  const system::error_code& ec)
{
  if (ec == 0) {
    std::cout << "Request #" << request_id
      << " has completed. Response: "
      << response << std::endl;
  } else if (ec == asio::error::operation_aborted) {
    std::cout << "Request #" << request_id
      << " has been cancelled by the user."
      << std::endl;
  } else {
    std::cout << "Request #" << request_id
      << " failed! Error code = " << ec.value()
      << ". Error message = " << ec.message()
      << std::endl;
  }

  return;
}
```

最后，在 `main()` 函数中模拟用户行为：发起三个请求并在中途取消其中一个：

```cpp
int main()
{
  try {
    AsyncTCPClient client;

    // 模拟用户交互行为

    // 用户发起 ID 为 1 的请求
    client.emulateLongComputationOp(10, "127.0.0.1", 3333,
      handler, 1);
    // 休眠 5 秒
    std::this_thread::sleep_for(std::chrono::seconds(5));
    // 发起 ID 为 2 的请求
    client.emulateLongComputationOp(11, "127.0.0.1", 3334,
      handler, 2);
    // 决定取消 ID 为 1 的请求
    client.cancelRequest(1);
    // 休眠 6 秒
    std::this_thread::sleep_for(std::chrono::seconds(6));
    // 发起 ID 为 3 的请求
    client.emulateLongComputationOp(12, "127.0.0.1", 3335,
      handler, 3);
    // 等待 15 秒以待请求处理完毕
    std::this_thread::sleep_for(std::chrono::seconds(15));
    // 退出并关闭客户端
    client.close();
  }
  catch (system::system_error &e) {
    std::cout << "Error occured! Error code = " << e.code()
      << ". Message: " << e.what();

    return e.code().value();
  }

  return 0;
};
```

### 工作原理

我们的示例客户端使用了两个执行线程：
1. **UI 线程（用户界面线程）**：负责接收用户输入并触发请求发起与取消。
2. **I/O 线程**：负责运行事件循环（Event Loop）并在异步操作完成时调用相应的回调例程。

这种双线程分离架构确保了客户端的用户界面始终保持高响应度，不会因为底层网络 I/O 阻塞而卡顿。

#### 应用启动与 main() 入口函数

`main()` 函数在 UI 线程上下文中执行。它首先创建 `AsyncTCPClient` 类的实例，然后调用三次 `emulateLongComputationOp()` 发起三个异步请求，每次指定不同的目标服务端。在请求 1 发起几秒后，通过调用 `cancelRequest(1)` 将其显式取消。

#### 请求完成与 handler() 回调函数

发起的所有请求均以 `handler()` 作为完成回调。无论请求是以何种原因结束（成功、网络错误或被用户取消），该函数都会被调用。参数说明：
- `unsigned int request_id`：发起请求时分配的唯一请求 ID；
- `std::string& response`：服务端返回的响应数据（仅当请求成功且未被取消时有效）；
- `system::error_code& ec`：错误代码对象。若请求被用户取消，其值为 `asio::error::operation_aborted`。

#### AsyncTCPClient 类的初始化

与服务端通信相关的所有核心逻辑均封装在 `AsyncTCPClient` 类中。其默认构造函数执行两项操作：
1. 实例化 `boost::asio::io_service::work` 对象，并传入内部的 `m_ios` 对象。`work` 对象的存在确保了即使当前没有处于挂起状态的异步操作，事件循环也不会退出；
2. 启动一个后台工作线程，该线程调用 `m_ios.run()` 进入事件循环。此线程即为客户端的 I/O 线程，所有异步操作的回调函数都将在此线程的上下文中被分发和执行。

#### 发起请求的生命周期与链式异步调用

`emulateLongComputationOp()` 负责发起异步请求：
1. 构造请求报文字符串，并在堆上分配 `Session` 结构体实例以承载该请求的全部状态（包括独立的通信套接字）；
2. 打开套接字，并将 `session` 指针存入 `m_active_sessions` 映射表中。该表用于记录所有正在执行且未完成的请求，以便支持用户后续根据 `request_id` 进行动态取消。访问该表时通过 `m_active_sessions_guard` 互斥锁进行同步，因为 UI 线程会向表中添加项，而 I/O 线程在请求完成时会从中删除项；
3. 调用 `session->m_sock.async_connect()` 发起异步连接操作。当连接发起后，`emulateLongComputationOp()` 立即返回，UI 线程不会发生任何阻塞。

在 `async_connect()` 的完成回调中，通过链式调用依次执行后续步骤：
- **检查错误与取消标记**：若连接失败，记录错误并调用 `onRequestComplete()`；若连接成功，在持有 `session->m_cancel_guard` 互斥锁的情况下检查 `m_was_cancelled` 标志，若用户已在此期间发起取消，则直接结束请求；
- **发起异步写入**：调用 `asio::async_write()` 将请求字符串发送至服务端；
- **发起异步读取**：写入完成的回调中，再次检查错误与取消状态，随后调用 `asio::async_read_until()` 读取服务端响应直到遇到 `\n`；
- **完成处理**：读取完成后，从流缓冲区解析响应文本，并调用私有方法 `onRequestComplete()`。

#### 请求取消的精确边界控制

在异步模型中实现请求取消存在一个关键竞态场景：当用户调用 `cancelRequest()` 时，前一个异步操作可能刚刚完成，而链条中的下一个异步操作尚未发起。例如：I/O 线程当前正在执行 `async_connect()` 的回调函数，此时套接字上并无挂起的异步操作，如果直接调用 `socket::cancel()` 将不会产生任何效果。

为了解决这一问题，我们引入了 `Session::m_was_cancelled` 标志和 `Session::m_cancel_guard` 互斥锁：
1. 在 `cancelRequest()` 中，先获取互斥锁，将 `m_was_cancelled` 置为 `true`，然后调用套接字的 `cancel()`；
2. 在每个异步阶段的回调函数中，在发起下一步异步操作之前，均获取该互斥锁并检查 `m_was_cancelled`。若已被置位，则放弃发起后续异步操作并直接调用 `onRequestComplete()`。

这种互斥锁保护机制强制规定了状态检查与后续操作发起的严格顺序，确保了无论用户在何时调用 `cancelRequest()`，请求都能被可靠且确定性地取消。

#### 关闭客户端

当客户端不再使用时，调用 `close()` 方法：
1. 首先将 `m_work` 重置为 `NULL`。这样在所有挂起的异步操作处理完毕后，I/O 线程将自然退出 `run()` 事件循环；
2. 随后调用 `m_thread->join()`，阻塞等待 I/O 线程完全退出，完成安全优雅的停机。

---

### 深入探讨：实现多线程 TCP 客户端

上述示例中的 `AsyncTCPClient` 属于单 I/O 线程模型。通常情况下，当请求到达率较低、响应体积较小且回调中的数据处理不耗费大量 CPU 时，单个 I/O 线程便足以应对。

然而，如果我们需要客户端并发处理数以万计的海量请求，并且客户端运行在多核处理器上时，我们可以将客户端扩展为**多线程 I/O 模型**，使多个 I/O 线程真正并行处理网络事件和用户回调。

为了将单线程客户端改造为多线程客户端，需要进行以下三处调整：

1. 将单个 `m_thread` 替换为线程指针列表：
```cpp
std::list<std::unique_ptr<std::thread>> m_threads;
```

2. 修改构造函数，使其接受线程数参数，并启动指定数量的线程同时运行同一个 `io_service` 实例的 `run()` 方法：
```cpp
AsyncTCPClient(unsigned char num_of_threads){
  m_work.reset(new boost::asio::io_service::work(m_ios));

  for (unsigned char i = 1; i <= num_of_threads; i++) {
    std::unique_ptr<std::thread> th(
      new std::thread([this](){
        m_ios.run();
      }));

    m_threads.push_back(std::move(th));
  }
}
```
此时，所有线程都被加入到由 `m_ios` 控制的线程池中。在多核系统上，多个异步操作的完成回调将在不同的硬件核心上真正并行执行。

3. 修改 `close()` 方法以等待所有 I/O 线程退出：
```cpp
void close() {
  // 销毁 work 对象，允许所有 I/O 线程在任务耗尽后退出事件循环
  m_work.reset(NULL);

  // 等待所有 I/O 线程退出
  for (auto& thread : m_threads) {
    thread->join();
  }
}
```

完成这些修改后，我们在实例化 `AsyncTCPClient` 时即可传入期望的工作线程数（例如 `std::thread::hardware_concurrency()`）。

### 参考信息

- 第 2 章《网络 I/O 操作》：包含关于如何对 TCP 套接字执行异步 I/O 以及如何取消异步操作的详细指南。
- 第 6 章《其他技术主题》中的“使用定时器”范例：演示如何使用 Boost.Asio 定时器为异步操作实现超时控制机制。
