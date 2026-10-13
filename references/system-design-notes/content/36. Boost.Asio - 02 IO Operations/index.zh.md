---
id: boost-asio-02-io-operations
title: "第 2 章：I/O 操作"
titleEn: "Chapter 2: I/O Operations"
order: 36
category: specialized
description: "掌握 Boost.Asio 的同步与异步套接字读写操作、流式缓冲管理 (streambuf) 与错误处理模型。"
tags: ["Boost.Asio", "I/O", "同步", "异步", "缓冲区", "TCP"]
---

# 第 2 章：I/O 操作

在本章中，我们将涵盖以下技术专题：

- 使用定长 I/O 缓冲区 (Using fixed length I/O buffers)
- 使用可扩展流式 I/O 缓冲区 (Using extensible stream-oriented I/O buffers)
- 同步向 TCP 套接字写入数据 (Writing to a TCP socket synchronously)
- 同步从 TCP 套接字读取数据 (Reading from a TCP socket synchronously)
- 异步向 TCP 套接字写入数据 (Writing to a TCP socket asynchronously)
- 异步从 TCP 套接字读取数据 (Reading from a TCP socket asynchronously)
- 取消异步操作 (Canceling asynchronous operations)
- 关闭与优雅关闭套接字 (Shutting down and closing a socket)

## 简介

I/O 操作是任何分布式应用程序网络基础设施的核心。它们直接参与数据交换的全过程：输入（Input）操作用于从远程应用程序接收数据，而输出（Output）操作则负责向远程主机发送数据。

在本章中，我们将通过一系列实战范式，深入演示如何执行各类 I/O 操作及相关辅助操作。此外，我们还将学习 Boost.Asio 专门配合 I/O 操作设计的辅助类和概念模型。

以下是对本章探讨核心主题的简要概述与背景介绍。

### I/O 缓冲区

网络编程的本质是组织计算机网络上的跨进程通信（IPC）。在此语境下的通信，意味着两个或多个进程之间进行数据交换。从参与通信的单进程视角来看，该进程在持续执行 I/O 操作：向其他进程发送数据，以及从其他进程接收数据。

与任何其他类型的 I/O（如文件或管道）一样，网络 I/O 必须依托内存缓冲区（Memory Buffer）进行。缓冲区是分配在进程地址空间中的一块连续内存，用于暂存待处理的数据。在执行任何输入操作时（例如从文件、管道或网络套接字读取数据），数据到达进程后必须暂存在其地址空间的某处，以便后续业务逻辑能够访问。这就是缓冲区的用武之地：在发起输入操作之前，程序预先分配好缓冲区并将其作为数据的接收目标；输入操作完成时，缓冲区中已填充了接收到的数据。同样，在执行输出操作之前，待发送的数据必须先组织好并放入输出缓冲区中；输出操作将该缓冲区作为数据源，逐字节推送到网络中。

显而易见，缓冲区是所有进行 I/O 操作的程序不可或缺的基础设施。因此，熟练掌握如何分配、组织和准备 I/O 缓冲区以适配 Boost.Asio 的操作接口，是分布式系统开发者的基本功。

### 同步与异步 I/O 操作

Boost.Asio 支持两种核心类型的 I/O 操作：**同步操作（Synchronous）**与**异步操作（Asynchronous）**。

- **同步操作**：在被调用时会直接阻塞（挂起）当前的执行线程，只有当底层 I/O 操作彻底完成或发生错误时，调用才会返回并唤醒线程。这种调用与返回在时序上步调一致的特性，正是“同步”一词的由来。
- **异步操作**：在被发起（Initiate）时是立即返回的，不会阻塞调用线程。每个异步操作都会关联一个由应用程序提供的回调函数（Callback）或函数对象。当底层 I/O 操作在后台完成后，Boost.Asio 运行时会自动调用该回调以通知程序。异步 I/O 带来了极高的并发弹性与吞吐能力，但由于改变了线性的代码执行流，代码设计和生命周期管理会更为复杂。异步操作发起极其迅速，调用线程可以立即腾出手去处理其他高优先级任务，而无需在空闲等待中浪费 CPU 时间。

Boost.Asio 库采用经典的**控制反转（Inversion of Control, IoC）**设计模式与反应堆/前摄器（Proactor）架构构建。当发起一个或多个异步操作后，应用程序通常需要将一个或多个执行线程的控制权移交给 Boost.Asio（通过调用事件循环函数如 `io_service::run()`），由库利用这些线程去驱动底层事件循环，并在 I/O 操作就绪或完成时分发调用程序注册的回调函数。异步操作的执行结果（如错误码和传输字节数）均作为实参传递给回调函数。

### 附加操作

除了常规的数据收发，我们还将探讨几类至关重要的套接字控制操作：取消异步操作、优雅关闭（Shutdown）以及关闭（Close）套接字。

- **取消异步操作**：能够在操作发起后、完成前主动终止其执行。当业务逻辑判断某个异步操作已经过时或失效（例如用户取消了请求、或者操作发生超时）时，及时取消操作可以立即止损，避免 CPU、内存和网络带宽的无谓浪费。
- **优雅关闭（Shutdown）套接字**：当应用层协议没有在报文中显式包含长度字段或定界符时，发送方在发送完毕后可以通过关闭套接字的发送端（Half-close 半关闭状态），向对端发送一个传输层服务信号（TCP FIN 报文），告知对方“数据已全部发送完毕”。
- **关闭套接字（Close）**：套接字属于操作系统的核心系统资源（文件描述符/内核句柄）。当套接字使用完毕后，必须将其交还给操作系统以避免句柄泄漏。显式关闭或通过 RAII 析构关闭套接字能确保系统资源的及时释放。

---

## 使用定长 I/O 缓冲区

定长 I/O 缓冲区通常在已知待发送或待接收消息确切大小的场景下使用，充当数据源或数据目标。例如，它可以是栈上分配的字符数组常量（包含待发送到服务器的固定请求字符串），也可以是在堆上动态分配的可写字符数组（用于读取固定长度的响应包体）。

本小节将演示如何构建和表示定长缓冲区，使其能够与 Boost.Asio 的各种 I/O 操作无缝配合。

### 操作步骤

在 Boost.Asio 中，定长缓冲区在最底层由两个基础类表示：`asio::mutable_buffer` 与 `asio::const_buffer`。这两个类在逻辑上都抽象了一块连续内存，由首字节内存地址和以字节为单位的长度二元组组成。正如其名称所示：

- `asio::mutable_buffer`：表示**可写（可修改）**的缓冲区，通常用于输入操作（接收数据）。
- `asio::const_buffer`：表示**只读（常量）**的缓冲区，通常用于输出操作（发送数据）。

然而需要特别强调的是：**`asio::mutable_buffer` 和 `asio::const_buffer` 这两个基础类并不会直接作为 Boost.Asio I/O 函数和方法的实参！** 

Boost.Asio 在 API 设计上引入了名为 `MutableBufferSequence` 和 `ConstBufferSequence` 的 C++ 概念（Concepts）：
- `MutableBufferSequence` 概念规范了一个对象必须代表**一组 `asio::mutable_buffer` 对象的集合**（容器）。
- `ConstBufferSequence` 概念规范了一个对象必须代表**一组 `asio::const_buffer` 对象的集合**（容器）。

所有执行 I/O 操作的 Boost.Asio 函数和方法，其参数类型均被约束为满足 `MutableBufferSequence` 或 `ConstBufferSequence` 概念的对象。

> [!NOTE]
> 有关这两个概念的官方完整规范，请参阅 Boost.Asio 官方文档：
> - [`MutableBufferSequence` 规范](http://www.boost.org/doc/libs/1_58_0/doc/html/boost_asio/reference/MutableBufferSequence.html)
> - [`ConstBufferSequence` 规范](http://www.boost.org/doc/libs/1_58_0/doc/html/boost_asio/reference/ConstBufferSequence.html)

虽然在大多数日常场景中，单次 I/O 操作通常只涉及一块单一的连续内存，但在某些高性能或特殊内存场景下（例如操作系统级别的分散/聚集 I/O，或内存碎片严重的受限系统），开发者往往需要使用由分布在进程各处的多个小缓冲区拼接而成的**复合缓冲区（Composite Buffer）**。Boost.Asio 的 I/O 接口从设计之初就天然支持复合缓冲区：例如，一个 `std::vector<asio::mutable_buffer>` 容器对象完全满足 `MutableBufferSequence` 概念的要求，因此可以直接传递给任何 I/O 函数。

因此，如果我们手头仅有一个 `asio::mutable_buffer` 或 `asio::const_buffer` 独立对象，它是无法直接传入 I/O 函数的。我们必须将其放入一个容器中（例如构造一个只包含该单个元素的 `std::vector<asio::mutable_buffer>`）。

显然，对于只想收发一块简单内存的常见任务，每次都去创建一个 `std::vector` 包装显得冗长且存在无谓的堆内存分配开销。为此，Boost.Asio 提供了非常优雅且高效的轻量级适配工具。

自由函数 `asio::buffer()` 拥有多达 28 个重载版本，能够接收几乎所有常见的 C++ 内存表示（原生指针加长度、C 风格原生数组、`std::string`、`std::vector`、`std::array` 等），并自动返回一个极轻量级的适配器类对象：`asio::mutable_buffers_1` 或 `asio::const_buffers_1`。
- 若传入的原始数据是常量类型，函数返回 `asio::const_buffers_1` 对象。
- 若传入的原始数据可写，函数返回 `asio::mutable_buffers_1` 对象。

类 `asio::mutable_buffers_1` 和 `asio::const_buffers_1` 分别是单元素可修改缓冲区与只读缓冲区的适配器。它们在极低开销（通常零开销）的前提下，完全实现了 `MutableBufferSequence` 和 `ConstBufferSequence` 概念所要求的迭代器接口，因此可以直接无缝作为实参传递给 Boost.Asio 的所有 I/O 函数和方法。

下面通过两个算法与代码示例，演示如何准备分别用于输出和输入操作的定长缓冲区。

#### 为输出操作准备缓冲区

以下步骤演示了如何准备可供 `asio::ip::tcp::socket::send()` 或 `asio::write()` 使用的输出缓冲区：

1. 分配一块内存缓冲区（该步骤不涉及任何 Boost.Asio 的特定类型或功能）。
2. 将待发送的数据填充到该缓冲区中。
3. 将原始缓冲区通过 `asio::buffer()` 适配为满足 `ConstBufferSequence` 概念的对象。
4. 适配后的缓冲区就绪，可供输出函数使用。

假设我们要向对端发送字符串 `"Hello"`，代码如下：

```cpp
#include <boost/asio.hpp>
#include <iostream>

using namespace boost;

int main()
{
  std::string buf; // 'buf' 是原始数据缓冲区

  buf = "Hello";   // 单行内完成步骤 1 与步骤 2

  // 步骤 3. 创建满足 ConstBufferSequence 概念要求的缓冲区表示
  asio::const_buffers_1 output_buf = asio::buffer(buf);

  // 步骤 4. 'output_buf' 是缓冲区 'buf' 的适配表示，
  // 可直接用于 Boost.Asio 的各项输出操作。

  return 0;
}
```

#### 为输入操作准备缓冲区

以下步骤演示了如何准备可供 `asio::ip::tcp::socket::receive()` 或 `asio::read()` 使用的输入缓冲区：

1. 分配一块足够容纳预期接收数据的内存空间。
2. 使用满足 `MutableBufferSequence` 概念的对象对该缓冲区进行适配表示。
3. 缓冲区就绪，可供输入函数接收数据。

假设我们预期从网络接收不超过 20 字节的数据：

```cpp
#include <boost/asio.hpp>
#include <iostream>
#include <memory> // 引入 std::unique_ptr<>

using namespace boost;

int main()
{
  // 预期接收不超过 20 字节的数据块
  const size_t BUF_SIZE_BYTES = 20;

  // 步骤 1. 分配原始内存缓冲区
  std::unique_ptr<char[]> buf(new char[BUF_SIZE_BYTES]);

  // 步骤 2. 创建满足 MutableBufferSequence 概念要求的适配对象
  asio::mutable_buffers_1 input_buf =
    asio::buffer(static_cast<void*>(buf.get()),
     BUF_SIZE_BYTES);

  // 步骤 3. 'input_buf' 可直接用于 Boost.Asio 的各项输入操作

  return 0;
}
```

### 工作原理

#### 输出缓冲区深度剖析

在第一个示例中，我们在 `main()` 中首先实例化了 `std::string` 对象 `buf`，随后将其赋值为 `"Hello"`，完成了原始缓冲区的内存分配与内容填充。

接下来，为了将其传给套接字方法，我们必须理解为什么需要适配器。查看 TCP 套接字类的 `send()` 成员函数签名：

```cpp
template<typename ConstBufferSequence>
std::size_t send(const ConstBufferSequence & buffers);
```

这是一个模板方法，要求实参满足 `ConstBufferSequence`。它要求该对象能够提供类似容器的 `begin()` / `end()` 接口以供遍历其内部持有的 `asio::const_buffer` 元素。虽然 `std::string` 内部有连续字符数组，但它本身并没有实现 Boost.Asio 的 BufferSequence 概念。

如果不使用便捷函数，我们必须手动编写如下冗长代码：

```cpp
asio::const_buffer asio_buf(buf.c_str(), buf.length());
std::vector<asio::const_buffer> buffers_sequence;
buffers_sequence.push_back(asio_buf);
```

代码中的 `buffers_sequence` 满足了概念要求，但带来了多余的 `vector` 构造与内存开销。而辅助函数 `asio::buffer(buf)` 则返回了一个栈上的 `asio::const_buffers_1` 轻量级对象，以极低开销实现了同样的概念约束。

#### 输入缓冲区深度剖析

第二个示例逻辑结构类似，但核心区别在于缓冲区是用来**写入**数据的。

在输入场景下，缓冲区必须满足 `MutableBufferSequence`（即可变缓冲区序列）。我们使用 `asio::buffer()` 包装一个裸指针及其长度时，由于传递的是非 `const` 的 `void*`，函数自动返回了 `asio::mutable_buffers_1`。

#### 缓冲区生命周期与所有权

> [!WARNING]
> **极其重要的一点**：无论是 Boost.Asio 的底层缓冲区类（`asio::mutable_buffer`、`asio::const_buffer`），还是适配器类（`asio::mutable_buffers_1`、`asio::const_buffers_1`），**均不持有底层原始内存的所有权！**
> 
> 这些类内部仅仅保存了一个原始裸指针和字节长度计数器，并不负责分配与释放内存。因此，开发者必须绝对确保底层的原始内存块（无论是栈上的局部变量、堆上的智能指针还是全局变量）在整个 I/O 操作执行期间都有效且未被销毁！

### 参考阅读

- “同步向 TCP 套接字写入数据”小节展示了如何从定长缓冲区写出数据。
- “同步从 TCP 套接字读取数据”小节展示了如何将数据读入定长缓冲区。
- 后续章节中的“在分散/聚集操作中使用复合缓冲区”展示了多缓冲区序列的高级用法。

---

## 使用可扩展流式 I/O 缓冲区

可扩展缓冲区（Extensible Buffer）是指在向其写入新数据时能够**动态扩容**的缓冲区。它们最常用于从套接字中读取**预先未知报文大小**的场景。

很多经典的应用层协议并没有在数据包头中固定报文长度，而是通过特定的结束边界符来标志报文结束（例如 HTTP/1.1 请求头以连续的 `<CR><LF><CR><LF>` 序列即 `\r\n\r\n` 作为头部结束标志），或者通过 TCP 流的结束符（EOF，即对端优雅关闭连接）来表明传输完成。

在这些场景下，定长缓冲区极难处理：分配太小会导致溢出或无法完整接收，分配过大又会造成内存浪费。Boost.Asio 提供的动态可扩展缓冲区及流式 I/O 函数为此提供了完美的解决方案。

本小节将演示如何实例化可扩展流式缓冲区，以及如何对其进行基本的数据读写。

### 操作步骤

Boost.Asio 中的可扩展流式缓冲区由 `asio::streambuf` 类表示，它本质上是模板类 `asio::basic_streambuf` 的类型别名：

```cpp
typedef basic_streambuf<> streambuf;
```

`asio::basic_streambuf<>` 继承自 C++ 标准库的 `std::streambuf`。这意味着它可以完全无缝地作为标准 C++ I/O 流（STL Stream）的底层流缓冲区使用。此外，Boost.Asio 提供的众多高级网络 I/O 函数（如 `asio::read()`、`asio::read_until()`）均原生支持直接对 `asio::streambuf` 对象进行操作。

我们可以像对待任何标准流缓冲区一样操作 `asio::streambuf` 对象。例如，可以将其绑定到一个 `std::ostream`、`std::istream` 或 `std::iostream` 对象上，然后直接使用重载的流提取运算符 `<<` 和流插入运算符 `>>` 进行类型安全的数据读写。

以下示例演示了创建 `asio::streambuf` 对象、向其写入文本数据、再通过输入流按行读取回 `std::string` 的完整过程：

```cpp
#include <boost/asio.hpp>
#include <iostream>

using namespace boost;

int main()
{
  asio::streambuf buf;

  std::ostream output(&buf);

  // 向基于流的缓冲区写入数据
  output << "Message1\nMessage2";

  // 现在我们期望从 streambuf 中读取数据，直到遇到换行符 '\n'。
  // 实例化一个绑定了该流缓冲区的输入流
  std::istream input(&buf);

  // 用于存储读取出的数据
  std::string message1;

  std::getline(input, message1);

  // 此时 message1 中包含 'Message1'

  return 0;
}
```

注意：本示例聚焦于 `asio::streambuf` 内部的数据流动机制，未引入网络套接字代码。在实际网络编程中，向 `buf` 写入数据的操作通常是由 Boost.Asio 的网络输入函数（例如 `asio::read_until()`）在后台完成的。

### 工作原理

程序首先实例化了 `asio::streambuf` 对象 `buf`，随后构造了 `std::ostream` 对象 `output` 并以 `&buf` 作为其底层流缓冲区。

通过 `output << "Message1\nMessage2"`，格式化文本被写入该流缓冲区中，缓冲区内部会自动动态扩容以承载该内容。

在真实的网络客户端或服务端中，数据通常是由网络驱动填充的：例如调用 `asio::read(sock, buf)`，Boost.Asio 会自动向底层操作系统申请读取套接字并将数据追加到 `buf` 中。

随后，为了从缓冲区中取回数据，我们构造了一个 `std::istream` 对象 `input(&buf)`。调用标准库的 `std::getline(input, message1)` 会沿着输入流持续读取，直到遇到定界符 `\n`。读取完成后，`message1` 包含第一行内容 `"Message1"`，而定界符之后的内容 `"Message2"` 则安全地继续驻留在 `buf` 中，等待下一次读取。

### 参考阅读

- “异步从 TCP 套接字读取数据”小节展示了如何将数据从网络套接字异步读取到可扩展流缓冲区中。

---

## 同步向 TCP 套接字写入数据

向 TCP 套接字写入数据是一种输出操作，用于向连接到该套接字的对端远程程序发送数据。同步写入是 Boost.Asio 中发送数据最直观、最简单的途径：执行同步写入的函数或方法会直接阻塞调用线程，直到有数据被成功写入套接字发送缓冲区，或者发生致命网络错误时才返回。

本小节将演示如何以同步方式向 TCP 套接字发送数据。

### 操作步骤

Boost.Asio 套接字最基础的写数据方法是 `asio::ip::tcp::socket::write_some()`。其典型重载声明如下：

```cpp
template<typename ConstBufferSequence>
std::size_t write_some(const ConstBufferSequence & buffers);
```

该方法接收一个满足 `ConstBufferSequence` 概念的缓冲区对象作为参数。正如其方法名所暗示（`write_some` 即“写入一部分”），它向套接字写入一定量的数据。如果方法执行成功，其返回值表示本次实际写入的字节数。

> [!IMPORTANT]
> **必须重点注意**：`write_some()` 并不保证将传入缓冲区中的所有数据一次性全部发送出去！它在协议层面仅保证：只要未发生错误，**单次调用至少写入 1 个字节**。
> 
> 这意味着在通常情况下，为了将整个缓冲区中的数据完整发送给对端，我们必须在循环中多次调用该方法，直到所有字节全部传输完毕。

在分布式应用中同步写入数据的标准流程如下：

1. 客户端分配、打开并连接主动 TCP 套接字；服务端则通过接收器套接字接受连接以获取已连接的主动套接字。
2. 分配缓冲区并填入待发送的数据。
3. 在循环中反复调用套接字的 `write_some()` 方法，直到缓冲区内的所有数据全部发送完毕。

客户端同步发送的完整代码示例如下：

```cpp
#include <boost/asio.hpp>
#include <iostream>

using namespace boost;

void writeToSocket(asio::ip::tcp::socket& sock) {
  // 步骤 2. 分配并填充缓冲区
  std::string buf = "Hello";

  std::size_t total_bytes_written = 0;

  // 步骤 3. 循环调用，直到全部数据写入套接字
  while (total_bytes_written != buf.length()) {
    total_bytes_written += sock.write_some(
      asio::buffer(buf.c_str() +
      total_bytes_written,
      buf.length() - total_bytes_written));
  }
}

int main()
{
  std::string raw_ip_address = "127.0.0.1";
  unsigned short port_num = 3333;

  try {
    asio::ip::tcp::endpoint
      ep(asio::ip::address::from_string(raw_ip_address),
      port_num);

    asio::io_service ios;

    // 步骤 1. 分配并打开套接字
    asio::ip::tcp::socket sock(ios, ep.protocol());

    sock.connect(ep);

    writeToSocket(sock);
  }
  catch (system::system_error &e) {
    std::cout << "Error occured! Error code = " << e.code()
      << ". Message: " << e.what();

    return e.code().value();
  }

  return 0;
}
```

虽然上述示例是在客户端上下文中执行写入，但相同的逻辑与代码结构完全适用于服务端向客户端回写响应。

### 工作原理

在 `main()` 函数中，套接字被建立并连接到远程服务端，随后被传递给 `writeToSocket()` 函数。

在 `writeToSocket()` 中，我们维护了一个计数器 `total_bytes_written`，初始值为 0。随后进入 `while` 循环：

```cpp
while (total_bytes_written != buf.length()) {
  total_bytes_written += sock.write_some(
    asio::buffer(buf.c_str() +
    total_bytes_written,
    buf.length() - total_bytes_written));
}
```

循环的退出条件是 `total_bytes_written` 等于待发送数据的总长度。在每次循环迭代中：
- 缓冲区起始指针向前偏移 `total_bytes_written` 字节（跳过之前轮次已经成功写出的数据）。
- 缓冲区有效长度相应缩减为 `buf.length() - total_bytes_written`。
- 将本次 `write_some()` 返回的成功写入字节数累加到计数器中。

单次调用 `write_some()` 能写入多少字节，受制于底层的 TCP 发送窗口大小、内核套接字发送缓冲区剩余空间以及网络拥塞状况等多种动态因素。上述方案屏蔽了这些不确定性，确保所有字节被完整送达内核。

#### 替代方案：`send()` 方法

`asio::ip::tcp::socket` 类还提供了另一个同步写方法 `send()`。该方法有 3 个重载版本：
1. 第一个重载与 `write_some()` 完全等价，参数签名与内部行为完全一致。
2. 第二个重载允许额外传入一个控制标志位参数 `flags`：
   ```cpp
   template<typename ConstBufferSequence>
   std::size_t send(
       const ConstBufferSequence & buffers,
       socket_base::message_flags flags);
   ```
   该参数是位掩码（如 `message_out_of_band` 等），在常规网络开发中极少用到。
3. 第三个重载在第二个重载的基础上，通过出参 `boost::system::error_code &ec` 返回错误信息，而不是抛出异常。

### 深入探讨

对于像发送几字节或几十字节这样极其常见的操作，若每次都需要手写一个 `while` 循环并手动计算内存指针偏移与剩余长度，不仅繁琐而且容易出现计算偏差。

Boost.Asio 贴心地提供了一个高层级的独立自由函数：`asio::write()`。其核心重载如下：

```cpp
template<
    typename SyncWriteStream,
    typename ConstBufferSequence>
std::size_t write(
    SyncWriteStream & s,
    const ConstBufferSequence & buffers);
```

该函数的第一个参数 `s` 是一个满足 `SyncWriteStream` 概念的流对象（`asio::ip::tcp::socket` 类完全满足该约束）；第二个参数是待发送的缓冲区。

与仅写一部分数据的 `write_some()` 截然不同：**`asio::write()` 承诺会自动内部循环调用底层写入，直到将缓冲区中的所有数据完整写入，或者在遇到不可恢复错误时才返回！**

使用 `asio::write()` 可以将前述手写循环的代码极大地简化：

```cpp
void writeToSocketEnhanced(asio::ip::tcp::socket& sock) {
  // 分配并填充缓冲区
  std::string buf = "Hello";

  // 一次性将整个缓冲区完整写出到套接字
  asio::write(sock, asio::buffer(buf));
}
```

`asio::write()` 内部实现与我们手写的 `writeToSocket()` 本质一致，但经过了高度优化并具备更周全的异常与错误处理。

### 参考阅读

- 后续章节中的“实现同步 TCP 客户端”演示了在客户端如何同步发送请求。
- 后续章节中的“实现同步迭代型 TCP 服务端”演示了在服务端如何同步发送响应。

---

## 同步从 TCP 套接字读取数据

从 TCP 套接字读取数据是一种输入操作，用于从与该套接字连接的对端接收数据。同步读取操作会直接阻塞调用线程，直到有数据被读入目标缓冲区，或发生连接断开或网络错误时才返回。

本小节将演示如何以同步方式从 TCP 套接字读取数据。

### 操作步骤

Boost.Asio 读取套接字最基础的方法是 `asio::ip::tcp::socket::read_some()`。其典型签名如下：

```cpp
template<typename MutableBufferSequence>
std::size_t read_some(const MutableBufferSequence & buffers);
```

该方法接收一个满足 `MutableBufferSequence` 概念的可写缓冲区。成功返回时，其返回值表示本次实际读入的字节数。

> [!IMPORTANT]
> 同样需要牢记：`read_some()` 无法控制一次性读取多少字节。它在协议层面仅保证：只要未发生错误，**单次调用至少读入 1 个字节**。
> 
> 如果我们预期接收一条确定长度的消息（例如 7 字节），通常必须在循环中多次调用该方法，直到累计接收到完整的预期字节数。

同步读取数据的标准流程如下：

1. 客户端连接主动套接字，或服务端接受连接获得主动套接字。
2. 分配一个足以容纳预期消息的内存缓冲区。
3. 在循环中反复调用 `read_some()`，直到读满整条消息。

代码示例如下（客户端预期接收恰好 7 字节的响应）：

```cpp
#include <boost/asio.hpp>
#include <iostream>

using namespace boost;

std::string readFromSocket(asio::ip::tcp::socket& sock) {
  const unsigned char MESSAGE_SIZE = 7;
  char buf[MESSAGE_SIZE];
  std::size_t total_bytes_read = 0;

  while (total_bytes_read != MESSAGE_SIZE) {
    total_bytes_read += sock.read_some(
      asio::buffer(buf + total_bytes_read,
      MESSAGE_SIZE - total_bytes_read));
  }

  return std::string(buf, total_bytes_read);
}

int main()
{
  std::string raw_ip_address = "127.0.0.1";
  unsigned short port_num = 3333;

  try {
    asio::ip::tcp::endpoint
      ep(asio::ip::address::from_string(raw_ip_address),
      port_num);

    asio::io_service ios;

    asio::ip::tcp::socket sock(ios, ep.protocol());

    sock.connect(ep);

    readFromSocket(sock);
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

在 `readFromSocket()` 函数中，我们分配了 7 字节的局部数组 `buf`，并用计数器 `total_bytes_read` 追踪当前已读入的字节数。

在 `while` 循环内部：

```cpp
while (total_bytes_read != MESSAGE_SIZE) {
  total_bytes_read += sock.read_some(
    asio::buffer(buf + total_bytes_read,
    MESSAGE_SIZE - total_bytes_read));
}
```

每次调用 `read_some()` 时，写入地址向后偏移已读字节数，剩余可容纳长度相应缩减。循环持续执行直到累计读入 7 个字节。随后将其构造为 `std::string` 返回。

单次调用读取的字节数取决于网络 MTU、对端发送频率以及本地内核接收缓冲区的就绪数据量。循环机制保证了不论数据被网络拆分成怎样的小分片，都能完整拼接成目标报文。

#### 替代方案：`receive()` 方法

`asio::ip::tcp::socket` 类还提供了 `receive()` 方法，拥有与 `read_some()` 类似的三种重载版本，支持传递控制标志位 `flags` 和使用 `boost::system::error_code` 出参，其在概念上是同步接收的同义词。

### 深入探讨

手写循环读取同样繁琐且容易引入越界等隐患。Boost.Asio 提供了一系列高层级的自由读取函数：

#### 1. `asio::read()` 函数

`asio::read()` 是最常用的高层读取函数：

```cpp
template<
    typename SyncReadStream,
    typename MutableBufferSequence>
std::size_t read(
    SyncReadStream & s,
    const MutableBufferSequence & buffers);
```

与 `read_some()` 仅读一部分不同，**`asio::read()` 会持续阻塞读取，直到传入的目标缓冲区被彻底填满，或者中途出现连接断开/网络错误才返回**。

使用 `asio::read()` 后的简化版本：

```cpp
std::string readFromSocketEnhanced(asio::ip::tcp::socket& sock) {
  const unsigned char MESSAGE_SIZE = 7;
  char buf[MESSAGE_SIZE];

  asio::read(sock, asio::buffer(buf, MESSAGE_SIZE));

  return std::string(buf, MESSAGE_SIZE);
}
```

调用将严格阻塞直到恰好读取 7 字节，代码极其简洁清晰。

#### 2. `asio::read_until()` 函数

当消息没有固定长度，而是以特定定界符（如换行符 `\n`）标志结尾时，`asio::read_until()` 是绝佳工具：

```cpp
template<
    typename SyncReadStream,
    typename Allocator>
std::size_t read_until(
    SyncReadStream & s,
    boost::asio::basic_streambuf< Allocator > & b,
    char delim);
```

该函数从套接字 `s` 读取数据并存入流缓冲区 `b`，直到在流中检测到字符 `delim` 为止。

> [!IMPORTANT]
> **粘包与多余数据注意**：`asio::read_until()` 内部是按块读取套接字数据的。当该函数返回时，缓冲区 `b` 中**不仅包含定界符本身，还很可能包含定界符之后由对端紧接着发来的后续数据（如下一条消息的前缀）！** 开发者有责任解析缓冲区并妥善处理定界符之后的内容。

使用示例：

```cpp
std::string readFromSocketDelim(asio::ip::tcp::socket& sock) {
  asio::streambuf buf;

  // 同步从套接字读取，直到遇到换行符 '\n'
  asio::read_until(sock, buf, '\n');

  std::string message;

  // 由于 buf 中可能包含 '\n' 之后的多余数据，
  // 我们通过 std::getline 只提取定界符之前的那一行数据
  std::istream input_stream(&buf);
  std::getline(input_stream, message);
  return message;
}
```

#### 3. `asio::read_at()` 函数

允许从指定的随机偏移位置开始读取（主要用于支持随机访问的设备/文件描述符），在常规流式套接字中较少使用。

### 参考阅读

- “使用可扩展流式 I/O 缓冲区”小节讲解了 `asio::streambuf` 的操作细节。
- 后续章节中的“实现同步 TCP 客户端”演示了如何在客户端同步接收服务端响应。

---

## 异步向 TCP 套接字写入数据

异步写入是将数据发送至远程主机最高效、最灵活的方式。发起异步写入的线程无需等待网络底层发送完毕，可立即投入其他计算任务。

本小节将演示如何使用 Boost.Asio 异步向 TCP 套接字写入数据。

### 操作步骤

执行异步写入最基础的原语是套接字类的 `async_write_some()` 方法：

```cpp
template<
    typename ConstBufferSequence,
    typename WriteHandler>
void async_write_some(
    const ConstBufferSequence & buffers,
    WriteHandler handler);
```

该方法立即向操作系统提交写请求并瞬时返回。其第一个参数是待写缓冲区，第二个参数是**写完成处理回调（WriteHandler）**。回调函数的签名约定必须为：

```cpp
void write_handler(
    const boost::system::error_code& ec,
    std::size_t bytes_transferred);
```

其中 `ec` 反映执行过程中的错误码，`bytes_transferred` 指明该次异步写入实际传输出去的字节数。

与同步的 `write_some()` 一样，**`async_write_some()` 仅保证单次操作至少写入 1 字节**。因此通常需要在回调函数中判断是否写完，若未写完则需递归触发下一次异步写入。

异步写入应用程序的标准设计步骤如下：

1. 定义一个会话数据结构（Session），保存套接字指针、数据缓冲区和已写字节计数器。
2. 定义一个写完成回调函数，在被调用时递增计数器；若尚未写完全部数据，则发起下一次 `async_write_some()`。
3. 客户端连接套接字（或服务端接受连接）。
4. 分配并填充待发送的缓冲区数据。
5. 调用 `async_write_some()` 发起首次异步写入，绑定回调。
6. 调用 `asio::io_service::run()` 驱动事件循环。
7. 在回调中完成状态流转，直至全部发送完毕。

客户端异步写实现的完整代码如下：

```cpp
#include <boost/asio.hpp>
#include <iostream>

using namespace boost;

// 保持异步操作上下文的会话结构体，
// 在回调中用于判断是否写完全部数据，并在必要时发起下一次异步写
struct Session {
  std::shared_ptr<asio::ip::tcp::socket> sock;
  std::string buf;
  std::size_t total_bytes_written;
};

// 异步写回调函数
void callback(const boost::system::error_code& ec,
        std::size_t bytes_transferred,
        std::shared_ptr<Session> s)
{
  if (ec != 0) {
    std::cout << "Error occured! Error code = "
    << ec.value()
    << ". Message: " << ec.message();

    return;
  }

  s->total_bytes_written += bytes_transferred;

  // 数据已全部写完，结束操作
  if (s->total_bytes_written == s->buf.length()) {
    return;
  }

  // 尚未写完，调整偏移并发起下一次异步写入
  s->sock->async_write_some(
    asio::buffer(
      s->buf.c_str() + s->total_bytes_written,
      s->buf.length() - s->total_bytes_written),
    std::bind(callback, std::placeholders::_1,
      std::placeholders::_2, s));
}

void writeToSocket(std::shared_ptr<asio::ip::tcp::socket> sock) {
  std::shared_ptr<Session> s(new Session);

  // 步骤 4. 分配并填充缓冲区
  s->buf = std::string("Hello");
  s->total_bytes_written = 0;
  s->sock = sock;

  // 步骤 5. 发起初次异步写入
  s->sock->async_write_some(
    asio::buffer(s->buf),
    std::bind(callback,
      std::placeholders::_1,
      std::placeholders::_2,
      s));
}

int main()
{
  std::string raw_ip_address = "127.0.0.1";
  unsigned short port_num = 3333;

  try {
    asio::ip::tcp::endpoint
      ep(asio::ip::address::from_string(raw_ip_address),
      port_num);

    asio::io_service ios;

    // 步骤 3. 分配、打开并连接套接字
    std::shared_ptr<asio::ip::tcp::socket> sock(
      new asio::ip::tcp::socket(ios, ep.protocol()));

    sock->connect(ep);

    writeToSocket(sock);

    // 步骤 6. 驱动事件循环，阻塞直到所有异步操作完成
    ios.run();
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

程序由单线程执行。在 `main()` 中建立连接后调用 `writeToSocket()`，该函数发起异步操作并立即返回。随后主线程调用 `ios.run()`，控制权交予 Boost.Asio。`run()` 会阻塞当前线程，专职负责监听 I/O 事件并在完成时调度回调函数。当所有未决的异步操作均告结束且没有新操作排队时，`run()` 正常退出。

#### 为什么需要 `std::shared_ptr<Session>`？

> [!CAUTION]
> 在异步编程中，**内存生命周期管理是最高频的崩溃源头**。
> 
> 由于异步操作由操作系统在后台异步执行，从发起操作到回调被调用的这段时间跨度内，传入的缓冲区内存必须始终在内存中有效且不被移动。如果在栈上分配局部变量，函数返回后该栈内存立即失效，操作系统写入或读取将直接触发野指针或内存越界！
> 
> 因此，我们将套接字、数据字符串和状态变量封装在堆上分配的 `Session` 结构体中，并通过智能指针 `std::shared_ptr<Session>` 传递。我们在 `std::bind` 中捕获该智能指针，使得只要异步操作尚未完成，回调对象自身就持有一份 `shared_ptr` 引用计数，保证了 `Session` 在整个异步链路中绝对不会提前被析构。

在回调中，我们累加 `bytes_transferred`。若 `total_bytes_written` 小于数据总长，则重新计算首地址指针与剩余长度，再次调用 `async_write_some()` 发起下一轮写入。当全部字节写完后，回调直接返回且不再发起新操作，此时 `io_service` 内部任务计数归零，`ios.run()` 解除阻塞并安全退出程序。

### 深入探讨

为了免去手写多轮异步回调状态机，Boost.Asio 提供了高阶异步自由函数 `asio::async_write()`：

```cpp
template<
    typename AsyncWriteStream,
    typename ConstBufferSequence,
    typename WriteHandler>
void async_write(
    AsyncWriteStream & s,
    const ConstBufferSequence & buffers,
    WriteHandler handler);
```

**`asio::async_write()` 保证在内部自动进行多轮写入，直到把整个缓冲区的数据全部写入完毕（或发生错误）后，才仅调用一次用户的回调函数！**

利用 `asio::async_write()`，我们的代码可以大幅精简：
- 无需在 `Session` 中手动记录 `total_bytes_written`。
- 回调函数中只要未报错，即可 100% 确认所有数据已经完整发送，无需任何分支判断与二次发起。

精简后的会话结构与回调如下：

```cpp
struct Session {
  std::shared_ptr<asio::ip::tcp::socket> sock;
  std::string buf;
};

void callback(const boost::system::error_code& ec,
  std::size_t bytes_transferred,
  std::shared_ptr<Session> s)
{
  if (ec != 0) {
    std::cout << "Error occured! Error code = "
      << ec.value()
      << ". Message: " << ec.message();
    return;
  }

  // 此时可以百分之百断定整个缓冲区的数据已全部写入套接字
}
```

在发起写入时，直接使用：

```cpp
asio::async_write(*(s->sock), asio::buffer(s->buf),
  std::bind(callback, std::placeholders::_1, std::placeholders::_2, s));
```

### 参考阅读

- “同步向 TCP 套接字写入数据”小节介绍了同步写入逻辑。
- 后续章节中的“实现异步 TCP 客户端”展示了工业级异步客户端的设计。
- 后续章节中的“实现异步 TCP 服务端”展示了异步并发服务端的实现。

---

## 异步从 TCP 套接字读取数据

异步读取是从网络接收数据的核心利器。本小节将演示如何使用 Boost.Asio 异步从 TCP 套接字中读取数据。

### 操作步骤

最底层的异步读取方法是套接字的 `async_read_some()` 方法：

```cpp
template<
    typename MutableBufferSequence,
    typename ReadHandler>
void async_read_some(
    const MutableBufferSequence & buffers,
    ReadHandler handler);
```

该方法立即提交异步读取请求并返回。其回调函数签名规范为：

```cpp
void read_handler(
    const boost::system::error_code& ec,
    std::size_t bytes_transferred);
```

该方法单次调用只保证读取至少 1 字节。为了读满一条定长消息，需要在回调中持续追加读取。

实现异步读取的标准流程如下：

1. 定义会话结构体（保存套接字指针、目标堆缓冲区、预期大小和已读计数器）。
2. 定义读完成回调函数。
3. 建立套接字连接。
4. 分配可写缓冲区。
5. 调用 `async_read_some()` 提交异步读操作。
6. 调用 `ios.run()` 启动事件分发。
7. 回调函数在读取未达目标大小时，自动计算偏移并发起下一次读取。

完整代码示例如下（客户端异步读取恰好 7 字节）：

```cpp
#include <boost/asio.hpp>
#include <iostream>

using namespace boost;

// 保持异步读上下文的会话结构体
struct Session {
  std::shared_ptr<asio::ip::tcp::socket> sock;
  std::unique_ptr<char[]> buf;
  std::size_t total_bytes_read;
  unsigned int buf_size;
};

// 异步读回调函数
void callback(const boost::system::error_code& ec,
  std::size_t bytes_transferred,
  std::shared_ptr<Session> s)
{
  if (ec != 0) {
    std::cout << "Error occured! Error code = "
      << ec.value()
      << ". Message: " << ec.message();

    return;
  }

  s->total_bytes_read += bytes_transferred;

  // 已读取完整报文，任务完成
  if (s->total_bytes_read == s->buf_size) {
    return;
  }

  // 尚未填满缓冲区，调整写入偏移并发起下一次异步读
  s->sock->async_read_some(
    asio::buffer(
      s->buf.get() + s->total_bytes_read,
      s->buf_size - s->total_bytes_read),
    std::bind(callback, std::placeholders::_1,
      std::placeholders::_2, s));
}

void readFromSocket(std::shared_ptr<asio::ip::tcp::socket> sock) {
  std::shared_ptr<Session> s(new Session);

  // 步骤 4. 分配堆缓冲区
  const unsigned int MESSAGE_SIZE = 7;

  s->buf.reset(new char[MESSAGE_SIZE]);
  s->total_bytes_read = 0;
  s->sock = sock;
  s->buf_size = MESSAGE_SIZE;

  // 步骤 5. 发起初次异步读操作
  s->sock->async_read_some(
    asio::buffer(s->buf.get(), s->buf_size),
    std::bind(callback,
      std::placeholders::_1,
      std::placeholders::_2,
      s));
}

int main()
{
  std::string raw_ip_address = "127.0.0.1";
  unsigned short port_num = 3333;

  try {
    asio::ip::tcp::endpoint
      ep(asio::ip::address::from_string(raw_ip_address),
      port_num);

    asio::io_service ios;

    // 步骤 3. 连接套接字
    std::shared_ptr<asio::ip::tcp::socket> sock(
      new asio::ip::tcp::socket(ios, ep.protocol()));

    sock->connect(ep);

    readFromSocket(sock);

    // 步骤 6. 驱动事件循环
    ios.run();
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

与异步写入类似，`readFromSocket()` 创建堆上的 `Session` 实例。目标字符数组通过 `std::unique_ptr<char[]>` 托管在 `Session` 内部，确保在异步读取全流程中这块内存始终有效。

首次调用 `async_read_some()` 提交请求后，调用立即返回，主线程在 `ios.run()` 处挂起并监听事件。底层操作系统在收到对端网卡数据后，通过 Boost.Asio 唤醒线程执行 `callback()`。

在 `callback()` 中，若累计字节数 `total_bytes_read` 尚未达到 `buf_size`（7 字节），则通过指针偏移更新缓冲区边界，再次提交 `async_read_some()`。一旦填满 7 字节，回调直接返回，`ios.run()` 退出。

### 深入探讨

Boost.Asio 同样提供了高阶自由函数 `asio::async_read()`：

```cpp
template<
    typename AsyncReadStream,
    typename MutableBufferSequence,
    typename ReadHandler>
void async_read(
    AsyncReadStream & s,
    const MutableBufferSequence & buffers,
    ReadHandler handler);
```

**`asio::async_read()` 会持续在后台调度读取，直到将传入的目标缓冲区彻底填满、或者发生错误/连接断开时，才触发一次用户回调！**

利用 `asio::async_read()`，`Session` 结构体中无需保存 `total_bytes_read` 计数器，回调函数中也无需判断剩余字节数，极大降低了代码复杂度。

### 参考阅读

- “同步从 TCP 套接字读取数据”小节介绍了同步读取的细节。
- 后续章节中的“实现异步 TCP 客户端”与“实现异步 TCP 服务端”展示了完整的异步读写流水线。

---

## 取消异步操作

在分布式系统开发中，异步操作往往需要耗费难以预测的时间（受制于对端响应速度、网络拥塞以及物理距离等）。在此期间，应用上下文很可能发生剧烈变动，导致先前提交的异步操作彻底失去意义。例如：
- 用户在 Web 浏览器中输入网址后，页面尚未加载完毕便关掉了标签页，或输入了新网址；
- 客户端向服务端发送 RPC 请求后，服务端陷入死锁长时间无响应，客户端触发了请求超时；
- 应用程序正在关闭退出，需要及时清理所有未完成的后台网络任务。

在上述场景中，如果不提供主动取消机制，无效的后台操作将继续霸占套接字描述符、内存缓冲区与网络带宽。

Boost.Asio 的一大核心优势在于：**所有已提交但未完成的异步操作，均可在任意时刻被主动取消**。本小节将演示如何取消异步操作。

### 操作步骤

取消异步操作的标准步骤如下：

1. 针对特定的陈旧 Windows 平台（Windows XP / Windows Server 2003），按需定义宏以启用取消支持。
2. 分配并打开套接字。
3. 定义异步操作的回调函数，并在其中加入判断操作是否被取消的专门分支。
4. 发起一个或多个异步操作（例如 `async_connect`）。
5. 启动独立工作线程运行 `ios.run()` 驱动事件循环。
6. 当满足取消条件时，在套接字对象上调用 `cancel()` 方法，撤销该套接字上排队的所有未决异步操作。

完整代码示例如下（主动发起异步连接，模拟等待 2 秒后强制取消）：

```cpp
#include <boost/predef.h> // 操作系统环境检测工具

#ifdef BOOST_OS_WINDOWS
#define _WIN32_WINNT 0x0501
#if _WIN32_WINNT <= 0x0502 // Windows Server 2003 或更早版本
#define BOOST_ASIO_DISABLE_IOCP
#define BOOST_ASIO_ENABLE_CANCELIO
#endif
#endif

#include <boost/asio.hpp>
#include <iostream>
#include <thread>

using namespace boost;

int main()
{
  std::string raw_ip_address = "127.0.0.1";
  unsigned short port_num = 3333;

  try {
    asio::ip::tcp::endpoint
      ep(asio::ip::address::from_string(raw_ip_address),
      port_num);

    asio::io_service ios;

    std::shared_ptr<asio::ip::tcp::socket> sock(
      new asio::ip::tcp::socket(ios, ep.protocol()));

    // 步骤 4. 发起异步连接操作
    sock->async_connect(ep,
      [sock](const boost::system::error_code& ec)
    {
      // 步骤 3. 若异步操作被取消或出错，ec 将包含相应的错误码
      if (ec != 0) {
        if (ec == asio::error::operation_aborted) {
          std::cout << "Operation cancelled!";
        }
        else {
          std::cout << "Error occured!"
            << " Error code = "
            << ec.value()
            << ". Message: "
            << ec.message();
        }

        return;
      }
      // 连接成功，可用于通信
    });

    // 步骤 5. 启动专门的工作线程驱动 Boost.Asio 事件循环
    std::thread worker_thread([&ios](){
      try {
        ios.run();
      }
      catch (system::system_error &e) {
        std::cout << "Error occured!"
        << " Error code = " << e.code()
        << ". Message: " << e.what();
      }
    });

    // 模拟等待耗时（2 秒）
    std::this_thread::sleep_for(std::chrono::seconds(2));

    // 步骤 6. 主动取消该套接字上所有未完成的异步操作
    sock->cancel();

    // 等待工作线程安全退出
    worker_thread.join();
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

程序首先通过 `async_connect()` 提交异步连接请求。随后启动后台工作线程 `worker_thread` 并在其中调用 `ios.run()`，负责分发底层事件。

主线程通过 `std::this_thread::sleep_for(std::chrono::seconds(2))` 休眠 2 秒以模拟业务延迟，随后显式调用 `sock->cancel()`。

`cancel()` 方法会要求底层操作系统撤销与该套接字绑定的所有未完成异步 I/O。

> [!NOTE]
> **被取消操作的回调行为**：
> 异步操作被取消时，其关联的回调函数**并不会被静默抛弃，而是仍然会被调用一次**！
> 此时传入回调的错误码参数 `ec` 会被赋予特殊的值：`asio::error::operation_aborted`（操作已中止）。
> 
> 如果在调用 `cancel()` 时底层操作实际上已经顺利完成，则 `cancel()` 调用没有任何副作用，回调函数会接收到成功的状态。

当回调处理完毕退出且没有其他异步任务时，工作线程中的 `ios.run()` 正常结束，`join()` 返回，程序安全退出。

### 深入探讨

不仅 TCP 套接字的连接、读、写等异步操作可以被取消，UDP 套接字上的异步数据报收发同样可以通过对 UDP 套接字调用 `cancel()` 予以撤销。

此外，异步域名解析操作（`asio::ip::tcp::resolver::async_resolve()`）也可以通过对解析器对象调用 `resolver.cancel()` 进行中止。所有通过 Boost.Asio 高阶自由函数发起的异步任务，均可通过对其绑定的首个参数对象（套接字或解析器）调用 `cancel()` 来实现撤销。

### 参考阅读

- 后续章节中的“实现异步 TCP 客户端”展示了带有超时取消保护的完整客户端范式。
- 第 1 章“基础知识”展示了同步连接与解析的操作。

---

## 关闭与优雅关闭套接字

在基于 TCP 协议传输任意长度的二进制消息时，一个经典的协议设计难题是：**接收方如何准确感知一条消息在何时完整结束？**

常见的解决方案有两种：

1. **固定包头 + 变长包体**：在每条消息前预置一个结构固定（如 4 字节整数）的包头，其中指明后续包体的精确字节数。接收方先读完包头解析出长度，再精准读取指定字节的包体。该方案成熟且通用，但引入了额外的编码开销与协议冗余。
2. **利用 TCP 半关闭机制（Shutdown）指明边界**：如果分布式应用采用“每条消息独占一个连接”（例如经典的 HTTP/1.0 模式），发送方在完整写出消息后，主动关闭其套接字的**发送方向通道（Shutdown Send）**。底层 TCP 协议会自动向接收方发送一个 FIN 报文。接收方在读完全部数据后，会读到一个标准的 EOF（文件结束符）信号，从而获知整条消息已完整送达。

#### 优雅关闭（Shutdown）与真正关闭（Close）的本质区别

- **优雅关闭（Shutdown）**：仅用于协议层面的单向或双向流截断（如停止发送、停止接收或两者均停止），并向对端发送 TCP FIN 服务报文。**它绝不会销毁套接字本身**，操作系统底层的套接字句柄依然有效！例如，关闭发送端后，套接字依然处于半打开（Half-closed）状态，本地依然可以继续从对端读取数据。
- **真正关闭（Close）**：属于系统资源的销毁操作。它会彻底中断现有 TCP 连接，向操作系统内核交还 socket 文件描述符，释放所有关联的内核缓冲区与资源。

本小节将演示如何优雅关闭与关闭套接字。

### 操作步骤

我们构建一对精简的客户端与服务端，演示如何利用套接字半关闭特性来划定未知长度二进制消息的边界。

#### 客户端实现

客户端连接服务端，向其写入二进制请求后，调用 `shutdown(shutdown_send)` 通知发送完毕；随后持续读取服务端的未知长度响应，直到读到服务端的 EOF 信号为止：

```cpp
#include <boost/asio.hpp>
#include <iostream>

using namespace boost;

void communicate(asio::ip::tcp::socket& sock) {
  // 分配并填充包含二进制数据的请求缓冲区
  const char request_buf[] = {0x48, 0x65, 0x0, 0x6c, 0x6c, 0x6f};

  // 发送请求数据
  asio::write(sock, asio::buffer(request_buf));

  // 优雅关闭套接字的发送通道，通知服务端请求已全部发送完毕
  sock.shutdown(asio::socket_base::shutdown_send);

  // 使用可扩展流式缓冲区接收未知长度的响应数据
  asio::streambuf response_buf;

  system::error_code ec;
  asio::read(sock, response_buf, ec);

  if (ec == asio::error::eof) {
    // 成功接收到完整的响应数据，进入业务处理
  }
  else {
    throw system::system_error(ec);
  }
}

int main()
{
  std::string raw_ip_address = "127.0.0.1";
  unsigned short port_num = 3333;

  try {
    asio::ip::tcp::endpoint
      ep(asio::ip::address::from_string(raw_ip_address),
      port_num);

    asio::io_service ios;

    asio::ip::tcp::socket sock(ios, ep.protocol());

    sock.connect(ep);

    communicate(sock);
  }
  catch (system::system_error &e) {
    std::cout << "Error occured! Error code = " << e.code()
      << ". Message: " << e.what();

    return e.code().value();
  }

  return 0;
}
```

#### 服务端实现

服务端接受连接，持续读取客户端请求直到检测到客户端发来的 EOF，随后向客户端写出响应，写完后同样调用 `shutdown(shutdown_send)` 通知对端：

```cpp
#include <boost/asio.hpp>
#include <iostream>

using namespace boost;

void processRequest(asio::ip::tcp::socket& sock) {
  // 使用可扩展流缓冲区接收未知长度的请求
  asio::streambuf request_buf;

  system::error_code ec;

  // 接收请求，直到对端 shutdown 发送通道
  asio::read(sock, request_buf, ec);

  if (ec != asio::error::eof)
    throw system::system_error(ec);

  // 请求已完整接收，组织二进制响应并回传
  const char response_buf[] = { 0x48, 0x69, 0x21 };

  asio::write(sock, asio::buffer(response_buf));

  // 优雅关闭套接字发送通道，通知客户端响应发送完毕
  sock.shutdown(asio::socket_base::shutdown_send);
}

int main()
{
  unsigned short port_num = 3333;

  try {
    asio::ip::tcp::endpoint ep(asio::ip::address_v4::any(),
      port_num);

    asio::io_service ios;

    asio::ip::tcp::acceptor acceptor(ios, ep);

    asio::ip::tcp::socket sock(ios);

    acceptor.accept(sock);

    processRequest(sock);
  }
  catch (system::system_error &e) {
    std::cout << "Error occured! Error code = " << e.code()
      << ". Message: " << e.what();

    return e.code().value();
  }

  return 0;
}
```

#### 关闭套接字（Close）

若要显式销毁套接字并归还系统内核资源，可直接调用 `sock.close()`。然而在现代 C++ 工程实践中，**通常无需显式调用 `close()`**。因为 `asio::ip::tcp::socket` 严格遵循 RAII 原则，在其析构函数执行时会自动安全地关闭底层套接字句柄。

### 工作原理

1. 客户端发送完请求后，调用 `sock.shutdown(asio::socket_base::shutdown_send)`。该调用使套接字发送端关闭，且不可逆。同时，底层 TCP 栈发出 FIN 报文。
2. 服务端在 `asio::read(sock, request_buf, ec)` 中阻塞读取。当对端的 FIN 报文到达时，`asio::read` 正常返回，同时错误码设置为 `asio::error::eof`。服务端借此确认请求报文已完整收全。
3. 双方随后交换角色：服务端将处理结果写入套接字，并在发送完成后同样执行 `sock.shutdown(asio::socket_base::shutdown_send)`。
4. 客户端此时在 `asio::read` 处等待响应，当接收到服务端的 EOF 后，确认响应报文已接收完整。
5. 需要特别注意：客户端在关闭其自身的发送端之后，**其接收端依然保持开启**，完全能够正常接收服务端回传的全部数据。

### 参考阅读

- “同步向 TCP 套接字写入数据”与“同步从 TCP 套接字读取数据”小节介绍了同步 I/O 的基础机制。
- 第 5 章“HTTP 与 SSL/TLS”中的“实现 HTTP 客户端应用”与“实现 HTTP 服务端应用”小节深入展示了套接字半关闭在 HTTP/1.0 协议标准中的经典工程落地。
