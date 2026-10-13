---
id: boost-asio-01-the-basics
title: "第 1 章：基础知识"
titleEn: "Chapter 1: The Basics"
order: 35
category: specialized
description: "介绍 Boost.Asio 的核心基础类：端点 (Endpoint)、主动套接字、被动套接字、DNS 域名解析与连接建立。"
tags: ["Boost.Asio", "C++", "网络编程", "套接字", "端点", "DNS"]
---

# 第 1 章：基础知识

在本章中，我们将涵盖以下内容：

- 创建端点 (Creating an endpoint)
- 创建主动套接字 (Creating an active socket)
- 创建被动套接字 (Creating a passive socket)
- 解析 DNS 域名 (Resolving a DNS name)
- 将套接字绑定到端点 (Binding a socket to an endpoint)
- 连接套接字 (Connecting a socket)
- 接受连接 (Accepting connections)

## 简介

计算机网络与通信协议极大地拓展了现代软件的能力，使不同应用程序或同一应用程序的不同独立部分能够相互通信以实现共同目标。部分应用程序以通信为主要功能，例如即时通讯工具、电子邮件服务器与客户端、文件下载软件等；另一些应用程序则将网络通信层作为底层基础组件，核心功能构建在其之上。这类应用的典型代表包括 Web 浏览器、网络文件系统、分布式数据库管理系统、流媒体播放软件、网络在线游戏，以及支持局域网/互联网多人联机的单机游戏等。此外，当今几乎所有应用程序在主要功能之外，都会提供涉及网络通信的辅助功能。其中最显著的例子莫过于在线注册和软件自动更新——在后一种情况下，更新包会从应用开发者的远程服务器下载并安装到用户的计算机或移动设备上。

由两个或多个运行在独立计算设备上的部分组成，并通过计算机网络彼此通信的应用程序，被称为分布式应用程序（Distributed Application）。例如，Web 服务器与 Web 浏览器共同构成了一个复杂的分布式应用：运行在用户本地设备上的浏览器与运行在远程计算机上的 Web 服务器通信，以达成传输并展示用户所请求网页的共同目标。

与运行在单台计算机上的传统程序相比，分布式应用具备显著优势，其中最有价值的包括：

- 在两台或多台远程计算设备之间传输数据的能力。这是分布式软件最直观、也是最具价值的优势。
- 将多台计算机组网并部署专门软件的能力，由此构建出强大的计算系统，能够执行单台计算机在可接受时间内无法完成的大规模任务。
- 在网络中高效存储和共享数据的能力。在计算机网络中，单台设备可用作数据存储中心来容纳海量数据，其他设备在需要时可轻松请求部分数据，而无需在每台设备上都保存一份完整副本。例如承载数亿网站的大型数据中心：终端用户只需通过网络（通常是互联网）向服务器发送请求，即可随时获取所需网页，无需在用户设备上存储整站数据。中央存储库保存着数据（网站），数以百万计的用户可在需要时随时按需请求数据。

两台运行在不同计算设备上的应用程序若要相互通信，必须遵循相同的通信协议。分布式应用的开发者当然可以自行设计并实现私有协议，但这在实践中极少发生，原因至少有两点：首先，开发此类通信协议极其复杂且耗时；其次，成熟的通信协议早已被定义、标准化，并且在所有主流操作系统中均已内置实现，包括 Windows、macOS 以及绝大多数 Linux 发行版。

这些协议由 TCP/IP 标准规范定义。不要被该标准的名称误导；它不仅定义了 TCP 和 IP，还包含许多其他协议，共同构成了 TCP/IP 协议栈，在协议栈的每一层都包含一个或多个协议。分布式软件开发者通常打交道的是传输层协议（例如 TCP 或 UDP）。更低层次的协议通常对开发者隐藏，由操作系统和网络硬件设备自动处理。

在本书中，我们仅探讨能满足绝大多数分布式软件开发者需求的 TCP 和 UDP 协议。如果读者对 TCP/IP 协议栈、OSI 模型或 TCP/UDP 协议尚不熟悉，强烈建议预先阅读相关的理论基础知识。尽管本书会对它们做简明介绍，但主要侧重点仍在分布式软件开发中使用 TCP 与 UDP 协议的工程实践。

TCP（传输控制协议）是一种传输层协议，具有以下核心特性：

- **可靠性（Reliable）**：保证消息按正确的顺序送达，或在送达失败时提供错误通知。协议内置了错误检测与重传机制，开发者无需在应用层自行实现复杂的可靠传输逻辑。
- **面向逻辑连接（Connection-oriented）**：在两个应用程序通过 TCP 通信之前，必须严格按照协议标准通过交换服务消息（三次握手）建立逻辑连接。
- **点对点通信模型（Point-to-point）**：单个连接中仅允许两个应用程序进行双向通信，不支持组播（Multicast）或广播消息。
- **面向字节流（Stream-oriented）**：应用程序发送的数据被协议视为无边界的连续字节流。在工程实践中，这意味着发送方发送的一块数据，并不保证接收方能够单次调用就以完全相同的块大小接收；发送的消息可能被协议拆分为任意大小的数据分片，并分别交付给接收方，但整体顺序是严格保序的。

UDP（用户数据报协议）是另一种传输层协议，具有与 TCP 截然不同（在某种意义上完全相反）的特性：

- **不可靠性（Unreliable）**：发送方通过 UDP 发送消息时，不保证消息一定送达。协议不会尝试检测丢失或修复错误，所有错误处理与可靠性保障均须由应用层开发者自行承担。
- **无连接（Connectionless）**：应用程序在通信之前无需建立连接，可直接发送数据报。
- **支持一对一及一对多通信模型**：协议天然支持单播、组播（Multicast）和广播。
- **面向数据报（Datagram-oriented）**：协议将数据视为具有确定大小的消息单位（数据报），并尝试以整体形式进行投递。每个数据报要么完整送达，要么在底层故障时彻底丢失，不会出现半个数据包的情况。

由于 UDP 本身不可靠，它通常用于相对可靠的局域网环境。若要在不可靠的网络（如互联网）中使用 UDP 通信，开发者必须在应用程序中自行实现丢包重传和差错控制机制。当需要在互联网中进行数据传输时，由于 TCP 自带完备的可靠性保障，它通常是首选方案。

如前所述，TCP 和 UDP 协议及其所需的底层协议均已被主流操作系统内置实现。操作系统向分布式应用开发者提供了一套系统 API 来调用这些协议。TCP/IP 标准本身并未规范具体的协议 API 实现；因此业界存在多种 API，其中基于 Berkeley Sockets（伯克利套接字）API 的实现最为流行且应用最广。

Berkeley Sockets API 是 TCP 和 UDP 协议众多 API 实现中的一种，于 20 世纪 80 年代初由美国加州大学伯克利分校开发（因而得名）。它围绕名为“套接字”（Socket）的抽象对象构建。起这个名字是为了类比常见的电源插座（Electrical Socket），但这一类比在某种程度上并不十分贴切，因为伯克利套接字的概念与机制要复杂得多。

如今，Windows、macOS 以及各 Linux 发行版均已实现了这套 API（尽管细节上存在细微平台差异），软件开发者可以利用它在分布式应用中调用 TCP 和 UDP 协议功能。

尽管 Berkeley Sockets API 极其流行且广泛使用，但它存在诸多设计缺陷：首先，由于最初被设计为支持多种不同网络协议的通用 API，其接口设计相当庞杂，使用起来相当繁琐；其次，这是一套基于 C 语言风格的函数式 API，类型系统非常薄弱，极易出错。例如，原始 Sockets API 并没有提供独立的类型来表示套接字，而是直接使用内置的 `int` 类型（在 Windows 上为 `SOCKET` 整数句柄），这意味着任何 `int` 类型的值都可能被误传给期望套接字的函数，编译器却无法在编译期捕获这种类型错误。这往往导致难以排查的运行时崩溃与未定义行为。

网络编程本身具有较高的复杂性，而使用底层的 C 风格 Socket API 更会加剧这种复杂度和出错率。Boost.Asio 是一个面向对象的现代 C++ 网络与 I/O 库，它与原生 Socket API 一样围绕套接字概念展开设计。简而言之，Boost.Asio 封装了原生的底层 Socket API，并为开发者提供了优雅的面向对象接口。它旨在通过以下几个方面极大简化网络编程：

- 隐藏晦涩的原生 C 风格 API，向用户提供直观的面向对象接口。
- 提供强类型系统，极大提升代码可读性，并使大量低级错误在编译期即可被捕获。
- 作为跨平台库，极大简化跨平台分布式应用的开发成本，屏蔽底层操作系统（Linux epoll、Windows IOCP、macOS kqueue 等）的实现差异。
- 提供丰富的辅助功能，如分散-聚集 I/O（Scatter-gather I/O）、基于流的 I/O（Stream-based I/O）、基于异常或错误码的灵活错误处理机制等。
- 采用高度可扩展的架构设计，允许开发者相对轻松地添加自定义 I/O 服务与协议扩展。

本章将介绍 Boost.Asio 的核心基础类，并演示如何使用它们完成基础的网络编程操作。

---

## 创建端点

典型的客户端应用程序在与服务端通信以获取服务之前，必须先获取服务端程序所在主机的 IP 地址及其绑定的协议端口号。由 IP 地址和协议端口号组成的二元组，在计算机网络中唯一标识了某台特定主机上运行的特定应用程序，这个二元组被称为**端点（Endpoint）**。

客户端通常通过用户在图形界面中输入、命令行参数传递或从配置文件中读取等方式，获取标识目标服务端的 IP 地址和端口号。

IP 地址可以表示为点分十进制格式的字符串（如果是 IPv4 地址，例如 `192.168.10.112`），或者十六进制格式的字符串（如果是 IPv6 地址，例如 `FE36::0404:C3FA:EF1E:3829`）。此外，服务端的 IP 地址还可以以间接形式提供给客户端——即包含 DNS 域名（Domain Name）的字符串（例如 `localhost` 或 `www.google.com`）。IP 地址的另一种表示方式是整数值：IPv4 地址可用 32 位无符号整数表示，IPv6 地址可用 128 位整数表示；然而由于数字表示的可读性和记忆性极差，在工程中极少直接使用。

如果客户端获得的是 DNS 域名，在与服务端通信之前，它必须先执行 DNS 域名解析，以获取该域名对应的真实主机 IP 地址。有时一个域名可能解析出多个 IP 地址，此时客户端通常会逐一尝试各个地址，直到找到一个能够建立连接的地址。本章后续的小节将专门介绍如何在 Boost.Asio 中解析 DNS 域名。

服务端应用程序同样需要处理端点。服务端使用端点向操作系统声明：它希望在哪个 IP 地址和协议端口上监听来自客户端的连接或消息。若运行服务端的物理主机仅有一块网络接口卡（网卡）并分配了单个 IP 地址，服务端在选择监听地址时别无选择；然而很多时候，主机可能配备有多块网卡，对应拥有多个不同的 IP 地址。此时服务端将面临一个难题：究竟该选择哪个 IP 地址来监听传入消息？服务端在启动时通常对底层的 IP 路由规则、网络拓扑或客户端会通过哪块网卡访问一无所知。因此，让服务端准确预测客户端发来的数据包会到达哪一个 IP 地址是极其困难（有时甚至是不可能）的。

若服务端仅选取其中一个 IP 地址进行监听，就可能会漏掉路由到该主机其他 IP 地址上的客户端请求。因此，服务端通常希望在**本机的所有可用 IP 地址**上同时监听。这保证了无论客户端的数据包到达哪个网卡 IP，只要目标端口匹配，服务端就能准确无误地接收到。

综上所述，端点在网络通信中发挥两个核心作用：

- **客户端应用**使用端点来明确指定其想要与之通信的目标远程服务器。
- **服务端应用**使用端点来指定本地监听的 IP 地址和端口号。当主机具有多个 IP 地址时，服务端通常会创建一个特殊的端点，代表“本机所有可用的 IP 地址”。

本小节将展示如何在 Boost.Asio 中分别为客户端和服务端创建端点。

### 准备工作

在创建端点之前，客户端应用程序必须先获取目标服务器的原始 IP 地址和端口号；而服务端应用程序由于通常监听本机所有可用 IP，因此通常只需要获取一个用于监听的协议端口号。

这里我们不探讨程序如何从外部（命令行、UI 或配置）获取 IP 地址和端口号。在接下来的实现步骤中，我们假定 IP 地址和端口号已经在程序运行伊始就绪。

### 操作步骤

以下两种典型场景分别展示了如何创建端点：第一种演示客户端如何创建指向服务端的端点；第二种演示服务端如何创建用于在所有本地 IP 和指定端口上监听的端点。

#### 在客户端创建指向服务器的端点

以下步骤描述了客户端为了创建指向目标服务器端点所需的操作。假定初始 IP 地址以点分十进制（IPv4）或十六进制（IPv6）字符串形式提供：

1. 获取服务端的 IP 地址字符串和端口号整数。
2. 将原始 IP 地址字符串解析转换为 `asio::ip::address` 类对象。
3. 使用步骤 2 创建的 `address` 对象与端口号，实例化 `asio::ip::tcp::endpoint` 类对象。
4. 端点创建完毕，可用于 Boost.Asio 的网络通信方法（如连接操作）。

对应实现代码如下：

```cpp
#include <boost/asio.hpp>
#include <iostream>

using namespace boost;

int main()
{
  // 步骤 1. 假设客户端应用程序已经获取了服务端的 IP 地址和端口号
  std::string raw_ip_address = "127.0.0.1";
  unsigned short port_num = 3333;

  // 用于保存解析 IP 地址时可能发生的错误信息
  boost::system::error_code ec;

  // 步骤 2. 使用协议版本无关的 IP 地址表示形式
  asio::ip::address ip_address =
    asio::ip::address::from_string(raw_ip_address, ec);

  if (ec.value() != 0) {
    // 提供的 IP 地址格式无效，终止执行
    std::cout
      << "Failed to parse the IP address. Error code = "
      << ec.value() << ". Message: " << ec.message();
      return ec.value();
  }

  // 步骤 3. 使用 IP 地址和端口号构造端点对象
  asio::ip::tcp::endpoint ep(ip_address, port_num);

  // 步骤 4. 端点创建就绪，可用于指定网络中想要通信的目标服务器

  return 0;
}
```

#### 创建服务端端点

以下步骤描述了服务端为了监听本机所有可用 IP 地址及指定端口所需的操作：

1. 获取服务端用于监听客户端传入连接请求的端口号。
2. 创建一个特殊的 `asio::ip::address` 对象，代表本机所有可用的 IP 地址（通配地址）。
3. 使用步骤 2 创建的通配地址对象和端口号，实例化 `asio::ip::tcp::endpoint` 对象。
4. 服务端端点创建就绪，可用于指示操作系统在该端口监听所有到达本地网卡的网络流量。

对应实现代码如下（假设服务端在 IPv6 协议下运行）：

```cpp
#include <boost/asio.hpp>
#include <iostream>

using namespace boost;

int main()
{
  // 步骤 1. 假设服务端程序已经获取了监听端口号
  unsigned short port_num = 3333;

  // 步骤 2. 创建特殊的 asio::ip::address 对象，表示本机所有可用的 IP 地址。
  // 注意：这里假设服务端运行在 IPv6 协议之上。
  asio::ip::address ip_address = asio::ip::address_v6::any();

  // 步骤 3. 构造服务端端点
  asio::ip::tcp::endpoint ep(ip_address, port_num);

  // 步骤 4. 端点创建就绪，可用于指定服务端监听连接的 IP 地址与端口号

  return 0;
}
```

### 工作原理

让我们先分析第一个代码示例。该算法适用于客户端角色（即主动向服务端发起通信会话的一方）。客户端必须获知服务端的 IP 地址和端口号。在示例中，假定这两个值在算法启动前已经齐备。

获取原始 IP 地址后，客户端必须将其转换为 Boost.Asio 类型系统中的表示形式。Boost.Asio 提供了三个类来表示 IP 地址：

- `asio::ip::address_v4`：表示 IPv4 地址。
- `asio::ip::address_v6`：表示 IPv6 地址。
- `asio::ip::address`：IP 协议版本无关的类，既能表示 IPv4 地址，也能表示 IPv6 地址。

在示例中，我们使用了 `asio::ip::address` 类，这使客户端能够做到 IP 协议版本无关（IP-version-agnostic），从而无缝支持 IPv4 与 IPv6 服务端。

在步骤 2 中，我们调用了 `asio::ip::address::from_string()` 静态方法。该方法接收字符串格式的原始 IP 地址，执行解析与有效性验证，构造并返回一个 `asio::ip::address` 对象。该方法提供了 4 种重载形式，我们在示例中使用了以下重载：

```cpp
static asio::ip::address from_string(
    const std::string & str,
    boost::system::error_code & ec);
```

该方法非常实用，它会自动检查传入的字符串是否符合标准的 IPv4 或 IPv6 格式。如果格式非法，错误信息会记录在第二个参数 `ec` 中。因此该函数也可以直接作为用户输入的 IP 校验工具。

在步骤 3 中，我们实例化 `boost::asio::ip::tcp::endpoint` 类对象，将 IP 地址对象和端口号传递给构造函数。构造生成的 `ep` 对象便可用于所有后续 Boost.Asio 网络连接函数。

第二个示例遵循类似思路，但在服务端场景下有所调整。服务端通常只关心在哪个端口监听，而不会硬编码具体的物理 IP 地址，因为服务端期望在所有到达本机的网卡接口上都接收连接。

为了表达“本机所有可用 IP”这一概念，`asio::ip::address_v4` 和 `asio::ip::address_v6` 分别提供了静态方法 `any()`，返回一个代表该通配语义的特殊地址对象（对应 IPv4 的 `0.0.0.0` 或 IPv6 的 `::`）。在步骤 2 中，我们调用 `asio::ip::address_v6::any()` 得到了该对象。

需要注意的是，版本无关的基类 `asio::ip::address` 并没有提供 `any()` 方法。服务端必须显式决定是在 IPv4 还是 IPv6 下使用通配地址（分别调用 `asio::ip::address_v4::any()` 或 `asio::ip::address_v6::any()`）。在第二个示例的步骤 2 中，我们假定服务器运行在 IPv6 协议上，因而调用了 IPv6 的版本。

步骤 3 中构造的端点对象汇聚了通配 IP 与目标端口，随后即可传递给套接字进行绑定与监听。

### 深入探讨

在前述示例中，我们使用的 `endpoint` 类属于 `asio::ip::tcp` 类的内部声明。查看 `asio::ip::tcp` 类的定义可以发现：

```cpp
class tcp
{
public:
  /// TCP 端点类型定义
  typedef basic_endpoint<tcp> endpoint;

  // ...
};
```

这意味着这里的 `endpoint` 实际上是类模板 `basic_endpoint<tcp>` 的特化，专用于 TCP 协议的客户端与服务端。

同理，若要在 UDP 协议中使用端点，操作完全一致。我们只需使用声明在 `asio::ip::udp` 作用域下的 `endpoint` 即可。其声明如下：

```cpp
class udp
{
public:
  /// UDP 端点类型定义
  typedef basic_endpoint<udp> endpoint;

  // ...
};
```

例如，如果我们希望在客户端中创建一个用于指定 UDP 服务端的端点，只需轻微调整步骤 3 的实现：

```cpp
// 步骤 3：创建 UDP 端点
asio::ip::udp::endpoint ep(ip_address, port_num);
```

其余代码完全无需变动，因为 IP 地址的解析与验证等操作是完全独立于传输层协议的。

服务端代码亦是如此：若要从 TCP 服务端切换为 UDP 服务端，只需将 `asio::ip::tcp::endpoint` 替换为 `asio::ip::udp::endpoint`。

### 参考阅读

- “将套接字绑定到端点”小节解释了服务端如何使用端点对象。
- “连接套接字”小节解释了客户端如何使用端点对象发起连接。

---

## 创建主动套接字

TCP/IP 官方标准规范中并没有对“套接字”本身做出定义，更没有规定应用程序调用底层 TCP 或 UDP 协议软件时应采用何种具体的 API 形式。

查阅 RFC 793（TCP 协议规范）的第 3.8 节“接口”，可以发现它仅提出了 TCP 协议软件 API 必须提供的一组最小功能需求集合。至于 API 的组织架构、函数命名、对象模型、抽象层次以及辅助函数等，完全留给协议实现者自主决定。每一位网络协议栈的实现者都可以按照自己的理解去设计调用接口。

RFC 768（UDP 协议规范）也是类似的情况：仅列出了一小部分核心必需操作，其他一切接口细节均交由开发者决定。

正如引言中所提及，Berkeley Sockets API 是目前最流行且事实上的 TCP/UDP 标准编程接口。它围绕“套接字”（Socket）这一抽象对象建立——套接字代表了一个通信会话的上下文句柄。在执行任何网络 I/O 操作之前，程序必须先分配一个套接字对象，随后所有的 I/O 操作都依托于该对象进行。

Boost.Asio 深度借鉴了 Berkeley Sockets API 的核心概念，其相似度之高以至于我们可以将其称为“面向对象版的 Berkeley Sockets API”。Boost.Asio 包含了表达套接字抽象的类，提供了与 Berkeley Sockets 风格相近的操作方法。

从功能角色划分，套接字主要分为两类：用于向远程主机发送和接收数据，或主动发起连接建立过程的套接字，被称为**主动套接字（Active Socket）**；而用于在本地被动等待远程主机发起连接请求的套接字，被称为**被动套接字（Passive Socket）**。被动套接字本身不参与用户数据的实际传输。我们将在本章稍后讨论被动套接字。

本小节将演示如何在 Boost.Asio 中创建并打开一个主动套接字。

### 操作步骤

以下算法描述了在客户端程序中创建并打开主动套接字所需的步骤：

1. 创建 `asio::io_service` 类实例（在较新版本的 Boost.Asio 中为 `asio::io_context`），或复用先前已创建的实例。
2. 创建代表传输层协议（TCP 或 UDP）以及底层 IP 协议版本（IPv4 或 IPv6）的协议描述对象。
3. 创建对应协议类型的套接字对象，并将 `io_service` 实例作为参数传递给套接字构造函数。
4. 调用套接字的 `open()` 方法，将步骤 2 中创建的协议对象作为参数传入。

对应实现代码如下（假定套接字用于基于 IPv4 的 TCP 协议通信）：

```cpp
#include <boost/asio.hpp>
#include <iostream>

using namespace boost;

int main()
{
  // 步骤 1. 套接字构造函数需要一个 io_service 实例
  asio::io_service ios;

  // 步骤 2. 创建表示底层使用 IPv4 的 TCP 协议对象
  asio::ip::tcp protocol = asio::ip::tcp::v4();

  // 步骤 3. 实例化主动 TCP 套接字对象
  asio::ip::tcp::socket sock(ios);

  // 用于记录打开套接字时发生的错误
  boost::system::error_code ec;

  // 步骤 4. 打开套接字
  sock.open(protocol, ec);

  if (ec.value() != 0) {
    // 套接字打开失败
    std::cout
      << "Failed to open the socket! Error code = "
      << ec.value() << ". Message: " << ec.message();
      return ec.value();
  }

  return 0;
}
```

### 工作原理

在步骤 1 中，我们实例化了 `asio::io_service` 类（在较新的 Boost 版本中推荐使用 `asio::io_context`）。该类是 Boost.Asio I/O 基础设施的绝对核心组件，它负责向下对接操作系统的底层网络 I/O 服务（如 Linux 的 epoll 或 Windows 的 IOCP）。Boost.Asio 的所有套接字都是通过该类对象与操作系统底层 I/O 驱动产生关联的。因此，所有套接字类的构造函数都强制要求传入一个 `io_service`（或 `io_context`）引用。后续章节将深入讨论该类。

在步骤 2 中，我们创建了 `asio::ip::tcp` 类的实例。该类本身不提供任何复杂的 I/O 操作逻辑，其主要作用类似于一个描述协议族属性的类型和数据结构。

`asio::ip::tcp` 类没有公开的默认构造函数，而是提供了两个静态方法：`asio::ip::tcp::v4()` 和 `asio::ip::tcp::v6()`，分别返回基于 IPv4 和 IPv6 的 TCP 协议描述对象。

此外，`asio::ip::tcp` 类中还声明了专属于 TCP 协议的基础类型别名，包括 `asio::ip::tcp::endpoint`、`asio::ip::tcp::socket`、`asio::ip::tcp::acceptor` 等。其在头文件 `boost/asio/ip/tcp.hpp` 中的声明结构如下：

```cpp
namespace boost {
namespace asio {
namespace ip {

  // ...

  class tcp
  {
  public:
    /// TCP 端点类型
    typedef basic_endpoint<tcp> endpoint;

    // ...

    /// TCP 套接字类型
    typedef basic_stream_socket<tcp> socket;

    /// TCP 接收器类型
    typedef basic_socket_acceptor<tcp> acceptor;

    // ...
  };
}
}
}
```

在步骤 3 中，我们创建了 `asio::ip::tcp::socket` 类的实例，并将 `io_service` 对象传递给其构造函数。需要注意的是：**该构造函数并不会立即向底层操作系统申请创建真实的 socket 描述符**。真实的操作系统 socket 句柄是在步骤 4 调用 `open()` 方法并传入指定协议后才向系统内核申请分配的。

在 Boost.Asio 中，“打开（Open）套接字”意味着将其与一组明确描述通信协议的参数相绑定。只有获得了这些协议族参数，Boost.Asio 才有足够的信息调用操作系统的原生系统调用（例如 POSIX 下的 `socket(AF_INET, SOCK_STREAM, IPPROTO_TCP)`）来真正分配内核资源。

`asio::ip::tcp::socket` 类还提供了另一个重载构造函数，允许在构造时直接传入协议对象。该构造函数会在内部完成套接字对象的创建并自动调用 `open()`。但需要注意：如果该构造函数执行失败，它将抛出 `boost::system::system_error` 异常。我们可以将步骤 3 和步骤 4 合并为如下简写形式：

```cpp
try {
  // 单次调用完成步骤 3 + 步骤 4（失败时抛出异常）
  asio::ip::tcp::socket sock(ios, protocol);
} catch (boost::system::system_error & e) {
  std::cout << "Error occured! Error code = " << e.code()
    << ". Message: "<< e.what();
}
```

### 深入探讨

上述示例演示了创建基于 TCP 协议的主动套接字。创建用于 UDP 协议的主动套接字的过程与其高度一致。

以下代码演示了如何创建一个基于 IPv6 的主动 UDP 套接字：

```cpp
#include <boost/asio.hpp>
#include <iostream>

using namespace boost;

int main()
{
  // 步骤 1. 套接字构造函数需要 io_service 实例
  asio::io_service ios;

  // 步骤 2. 创建表示底层使用 IPv6 的 UDP 协议对象
  asio::ip::udp protocol = asio::ip::udp::v6();

  // 步骤 3. 实例化主动 UDP 套接字对象
  asio::ip::udp::socket sock(ios);

  // 用于保存打开套接字时的错误信息
  boost::system::error_code ec;

  // 步骤 4. 打开套接字
  sock.open(protocol, ec);

  if (ec.value() != 0) {
    // 打开套接字失败
    std::cout
      << "Failed to open the socket! Error code = "
      << ec.value() << ". Message: " << ec.message();
    return ec.value();
  }

  return 0;
}
```

### 参考阅读

- “创建被动套接字”小节深入讨论了被动套接字的原理与用法。
- “连接套接字”小节展示了主动套接字的核心用途——连接到远程应用程序。

---

## 创建被动套接字

被动套接字（Passive Socket），又常被称为接收器套接字（Acceptor Socket），是一种专门用于等待远程应用程序发起的 TCP 连接请求的套接字。这一定义包含两层重要含义：

- 被动套接字**仅用于服务端应用**，或既充当客户端又充当服务端的对等（P2P）混合应用。
- 被动套接字**仅存在于 TCP 协议中**。由于 UDP 协议是无连接的，通信双方无需握手建立连接，因此在 UDP 编程中根本不需要被动套接字。

本小节将介绍如何在 Boost.Asio 中创建并打开一个被动套接字。

### 操作步骤

在 Boost.Asio 中，被动套接字由 `asio::ip::tcp::acceptor` 类表示。类名中的 `acceptor`（接收器）直接点明了其核心职责——监听并接受（处理）传入的连接请求。

创建接收器套接字的操作步骤如下：

1. 创建 `asio::io_service` 类实例，或复用现有实例。
2. 创建 `asio::ip::tcp` 对象，指定 TCP 协议及底层 IP 版本（IPv4 或 IPv6）。
3. 实例化 `asio::ip::tcp::acceptor` 对象，将 `io_service` 实例传递给其构造函数。
4. 调用接收器套接字的 `open()` 方法，将步骤 2 中创建的协议对象作为实参传入。

代码示例如下（假定接收器套接字用于基于 IPv6 的 TCP 协议通信）：

```cpp
#include <boost/asio.hpp>
#include <iostream>

using namespace boost;

int main()
{
  // 步骤 1. 构造函数依赖 io_service 实例
  asio::io_service ios;

  // 步骤 2. 创建表示底层使用 IPv6 的 TCP 协议对象
  asio::ip::tcp protocol = asio::ip::tcp::v6();

  // 步骤 3. 实例化接收器（被动）套接字对象
  asio::ip::tcp::acceptor acceptor(ios);

  // 用于记录打开套接字时的错误信息
  boost::system::error_code ec;

  // 步骤 4. 打开接收器套接字
  acceptor.open(protocol, ec);

  if (ec.value() != 0) {
    // 打开套接字失败
    std::cout
      << "Failed to open the acceptor socket!"
      << "Error code = "
      << ec.value() << ". Message: " << ec.message();
    return ec.value();
  }

  return 0;
}
```

### 工作原理

由于被动套接字与主动套接字在抽象层次上非常相近，二者的创建过程几乎完全对称。关于 `io_service` 和 `asio::ip::tcp` 的详细解析，请参考前一节“创建主动套接字”。

在步骤 1 和 2 中，我们分别准备好 I/O 服务实例和 IPv6 TCP 协议描述对象。在步骤 3 中，我们实例化 `asio::ip::tcp::acceptor` 对象，此时操作系统内部尚未分配真正的 socket 文件描述符。

真正的操作系统套接字是在步骤 4 中分配的：通过调用 `open()` 并传入协议描述对象，操作系统分配底层资源，被动套接字进入就绪状态，后续即可将其绑定到指定端口并开始监听传入的连接请求。如果调用失败，`boost::system::error_code` 对象将记录具体的系统错误信息。

### 参考阅读

- “创建主动套接字”小节详细剖析了 `asio::io_service` 与 `asio::ip::tcp` 类的内部构造。

---

## 解析 DNS 域名

对于人类而言，原始 IP 地址非常难以记忆和阅读，尤其是 128 位的 IPv6 地址。例如 `192.168.10.123`（IPv4）或 `8fee:9930:4545:a:105:f8ff:fe21:67cf`（IPv6），想要记住这些冗长的字符和数字串对于任何人都是巨大的负担。

为了让网络中的计算设备能够使用人类友好的可读名称进行标识，域名系统（Domain Name System, DNS）应运而生。简而言之，DNS 是一种分布式命名体系，用于将易读的名称与计算机网络中的设备相映射。DNS 名称（又称域名）是一个标识网络设备的字符串。

严格来说，DNS 域名并不是直接命名物理设备，而是为**一个或多个可以分配给设备的 IP 地址**提供别名。因此，DNS 在网络寻址特定服务端应用时引入了一层间接抽象。

DNS 的本质是一个分布式数据库，存储着域名与对应 IP 地址之间的映射表，并提供查询接口。将域名转换为对应 IP 地址的过程称为 **DNS 域名解析（DNS Name Resolution）**。现代操作系统内置了能够向 DNS 发送查询并解析域名的解析器组件，并向应用程序提供了相应的系统调用接口。

当客户端拿到一个服务端域名时，必须先通过 DNS 解析得到其背后的真实 IP 地址，然后才能与服务端建立通信。

本小节将演示如何使用 Boost.Asio 执行 DNS 域名解析。

### 操作步骤

客户端为了将域名解析为目标服务端所在主机的一个或多个 IP 地址，需要执行以下操作步骤：

1. 获取表示服务端的 DNS 域名和协议端口号，均以字符串形式表示。
2. 创建 `asio::io_service` 实例，或复用现有实例。
3. 创建 `resolver::query` 类对象，表示一个 DNS 解析查询请求。
4. 针对目标协议类型，创建对应的 DNS 域名解析器对象（Resolver）。
5. 调用解析器的 `resolve()` 方法，将步骤 3 中的查询对象作为实参传入。

对应实现代码如下（假定客户端通过 TCP 协议与服务端通信）：

```cpp
#include <boost/asio.hpp>
#include <iostream>

using namespace boost;

int main()
{
  // 步骤 1. 假设客户端已经获取了 DNS 域名与端口号并表示为字符串
  std::string host = "samplehost.com";
  std::string port_num = "3333";

  // 步骤 2. 创建 I/O 服务对象
  asio::io_service ios;

  // 步骤 3. 创建 DNS 查询对象
  asio::ip::tcp::resolver::query resolver_query(host,
    port_num, asio::ip::tcp::resolver::query::numeric_service);

  // 步骤 4. 创建解析器对象
  asio::ip::tcp::resolver resolver(ios);

  // 用于保存解析过程中发生的错误信息
  boost::system::error_code ec;

  // 步骤 5. 执行解析
  asio::ip::tcp::resolver::iterator it =
    resolver.resolve(resolver_query, ec);

  // 错误处理
  if (ec != 0) {
    // 域名解析失败，终止运行
    std::cout << "Failed to resolve a DNS name."
      << "Error code = " << ec.value()
      << ". Message = " << ec.message();

    return ec.value();
  }

  return 0;
}
```

### 工作原理

在步骤 1 中，我们将域名和端口号都保存为字符串形式。通常这些信息来自用户输入或配置。这里我们假定它们在算法开始时已经齐备。

在步骤 2 中，我们创建 `asio::io_service` 实例。解析器在执行域名解析时需要借助操作系统的解析服务，这一访问也是通过 `io_service` 统一桥接的。

在步骤 3 中，我们创建了 `asio::ip::tcp::resolver::query` 类对象。该对象封装了一次 DNS 查询请求，包含待解析的域名、解析完成后用于组装端点的端口号字符串，以及控制解析细节的位图标志位。在示例中，因为服务端口直接给出了数字（如 `3333`）而非标准服务名（如 `http`、`ftp` 等），我们显式传入了 `asio::ip::tcp::resolver::query::numeric_service` 标志，提示查询对象将端口号当作数字进行解析。

在步骤 4 中，我们创建了 `asio::ip::tcp::resolver` 实例，它封装了底层的域名解析功能。

在步骤 5 中，我们调用解析器对象的 `resolve()` 方法。示例中使用的重载版本接收 `query` 对象与 `system::error_code` 对象。若发生错误，错误信息将存入 `ec`。

解析成功时，该方法返回一个 `asio::ip::tcp::resolver::iterator` 迭代器，指向解析结果集合的第一个元素。该集合中的元素类型为 `asio::ip::basic_resolver_entry<tcp>`。集合中元素的数量等于该域名解析出的 IP 地址总数。集合中的每个元素都包含一个 `asio::ip::tcp::endpoint` 对象（由解析出的一个 IP 地址与查询中提供的端口号组合而成）。可以通过条目的 `endpoint()` 成员函数获取该端点对象。

默认构造的 `asio::ip::tcp::resolver::iterator` 对象即表示“尾后迭代器”（End Iterator）。遍历解析结果并访问端点的典型用法如下：

```cpp
asio::ip::tcp::resolver::iterator it =
    resolver.resolve(resolver_query, ec);

asio::ip::tcp::resolver::iterator it_end;

for (; it != it_end; ++it) {
  // 通过 it->endpoint() 访问每个解析出的端点
  asio::ip::tcp::endpoint ep = it->endpoint();
}
```

通常，当域名解析出多个 IP 地址及对应端点时，客户端预先并不知道哪一个端点最稳定或可用。工程上的通用策略是**按顺序逐个尝试连接**，直到与某个端点成功握手。

需要注意：若域名同时绑定了 IPv4 和 IPv6 地址，解析结果集合中可能同时混杂着 IPv4 和 IPv6 类型的端点对象。

### 深入探讨

若要解析域名以获取用于 UDP 协议客户端的端点集合，代码结构与 TCP 高度相似。示例代码如下：

```cpp
#include <boost/asio.hpp>
#include <iostream>

using namespace boost;

int main()
{
  // 步骤 1. 假设已获取域名与端口字符串
  std::string host = "samplehost.book";
  std::string port_num = "3333";

  // 步骤 2. 创建 I/O 服务对象
  asio::io_service ios;

  // 步骤 3. 创建 UDP 查询对象
  asio::ip::udp::resolver::query resolver_query(host,
    port_num, asio::ip::udp::resolver::query::numeric_service);

  // 步骤 4. 创建 UDP 解析器
  asio::ip::udp::resolver resolver(ios);

  // 保存解析错误信息
  boost::system::error_code ec;

  // 步骤 5. 执行解析
  asio::ip::udp::resolver::iterator it =
    resolver.resolve(resolver_query, ec);

  if (ec != 0) {
    std::cout << "Failed to resolve a DNS name."
      << "Error code = " << ec.value()
      << ". Message = " << ec.message();

    return ec.value();
  }

  asio::ip::udp::resolver::iterator it_end;

  for (; it != it_end; ++it) {
    // 访问 UDP 端点
    asio::ip::udp::endpoint ep = it->endpoint();
  }

  return 0;
}
```

### 参考阅读

- “创建端点”小节提供了关于端点的详细概念。
- 关于 DNS 系统的详细技术规范，可参考 RFC 1034 和 RFC 1035 文档。

---

## 将套接字绑定到端点

在主动套接字与远程主机通信、或被动套接字接受传入连接请求之前，套接字必须与一个本地特定的 IP 地址（或多个地址）和协议端口号相关联，即必须关联到一个端点。将套接字与特定端点相关联的过程称为**绑定（Binding）**。

当套接字被绑定到特定端点后，所有从网络流入本机、且目标地址与端口与该端点相匹配的网络数据包，都会由操作系统内核精准转发给该套接字。同样，从该套接字发送出去的所有数据，都会由操作系统通过该端点所对应 IP 的网络接口输出到网络中。

某些操作会**隐式绑定**尚未绑定的套接字。例如，当客户端调用 `connect()` 连接远程服务器时，如果该主动套接字尚未绑定，操作系统会自动为其随机分配一个空闲的本地端口和合适的本地 IP，并完成隐式绑定。通常情况下，客户端应用完全不需要显式绑定特定端点，因为客户端并不在乎自己使用哪个本地端口与服务端通信；让操作系统代为挑选临时端口（Ephemeral Port）是最简便且安全的做法。但在极少数特殊网络需求下（例如防火墙出站规则限制、双网卡指定出口），客户端才需要显式绑定特定本地端点。

当套接字绑定交由操作系统自动处理时，不能保证每次分配到相同的端口。即使主机只有单块网卡和单一 IP，每次隐式绑定所分配到的端口号通常都是随机变化的。

与客户端不同，**服务端应用程序通常必须显式将其被动（接收器）套接字绑定到固定端点**。这是因为服务端的监听端点必须公开并为所有潜在客户端所知，且在服务端程序重启之后必须保持不变。

本小节将展示如何在 Boost.Asio 中将套接字显式绑定到特定端点。

### 操作步骤

以下算法展示了在基于 IPv4 的 TCP 服务端程序中，如何创建接收器套接字并将其绑定到代表本机所有可用 IP 与指定端口的端点：

1. 获取服务端用于监听传入连接的端口号。
2. 创建代表本机所有可用 IP（通配地址）和指定端口号的端点。
3. 创建并打开接收器套接字。
4. 调用接收器套接字的 `bind()` 方法，将步骤 2 中创建的端点作为实参传入。

对应实现代码如下：

```cpp
#include <boost/asio.hpp>
#include <iostream>

using namespace boost;

int main()
{
  // 步骤 1. 假设服务端程序已经获取了监听端口号
  unsigned short port_num = 3333;

  // 步骤 2. 创建服务端端点（绑定所有可用 IPv4 地址及指定端口）
  asio::ip::tcp::endpoint ep(asio::ip::address_v4::any(),
    port_num);

  // 供接收器构造函数使用
  asio::io_service ios;

  // 步骤 3. 创建并打开接收器套接字
  asio::ip::tcp::acceptor acceptor(ios, ep.protocol());

  boost::system::error_code ec;

  // 步骤 4. 将接收器套接字绑定到端点
  acceptor.bind(ep, ec);

  // 错误处理
  if (ec != 0) {
    // 绑定失败，终止执行
    std::cout << "Failed to bind the acceptor socket."
      << "Error code = " << ec.value() << ". Message: "
      << ec.message();

    return ec.value();
  }

  return 0;
}
```

### 工作原理

首先在步骤 1 中准备好端口号。步骤 2 中创建了表示本机通配 IPv4 地址（`0.0.0.0`）及该端口的端点对象 `ep`。

在步骤 3 中，我们实例化并打开接收器套接字。由于在步骤 2 创建的 `ep` 端点中已经蕴含了传输协议与底层 IP 版本信息（IPv4 TCP），我们无需重新单独构造协议对象，而是直接调用 `ep.protocol()`，它会返回代表对应协议的 `asio::ip::tcp` 对象并传递给接收器的构造函数，完成套接字的初始化与打开。

绑定的核心逻辑发生在步骤 4。操作非常直接：调用接收器对象的 `bind()` 方法并传入目标端点。如果调用成功，套接字即成功绑定到指定端口，随后即可启动监听；如果端口已被占用或权限不足（例如在非 root 权限下绑定 1024 以下的特权端口），错误信息会记录到 `ec` 中。

### 深入探讨

UDP 服务端由于无需握手建立连接，因此直接使用**主动套接字**来监听和等待传入请求。将 UDP 主动套接字绑定到本地端点的流程与 TCP 接收器完全一致：

```cpp
#include <boost/asio.hpp>
#include <iostream>

using namespace boost;

int main()
{
  // 步骤 1. 获取监听端口
  unsigned short port_num = 3333;

  // 步骤 2. 创建 UDP 端点
  asio::ip::udp::endpoint ep(asio::ip::address_v4::any(),
    port_num);

  // 供套接字使用的 I/O 服务实例
  asio::io_service ios;

  // 步骤 3. 创建并打开 UDP 套接字
  asio::ip::udp::socket sock(ios, ep.protocol());

  boost::system::error_code ec;

  // 步骤 4. 将 UDP 套接字绑定到端点
  sock.bind(ep, ec);

  if (ec != 0) {
    std::cout << "Failed to bind the socket."
      << "Error code = " << ec.value() << ". Message: "
      << ec.message();

    return ec.value();
  }

  return 0;
}
```

### 参考阅读

- “创建端点”小节介绍了端点的基础概念与创建方式。
- “创建主动套接字”小节介绍了主动套接字的机制以及 `asio::io_service` 的职责。
- “创建被动套接字”小节介绍了接收器套接字的打开过程。

---

## 连接套接字

在 TCP 套接字能够与远程主机传输数据之前，必须先与其建立逻辑连接。按照 TCP 规范，连接建立过程依赖两端应用程序之间交换特定的握手服务报文（三次握手：SYN -> SYN+ACK -> ACK）。一旦握手成功，双方便逻辑相连，可开展全双工数据传输。

连接建立的大致过程如下：客户端为了与服务端通信，首先创建并打开一个主动套接字，对其执行 `connect()` 命令，并在参数中指定服务端的端点对象。这触发操作系统向网络发送连接建立请求报文（SYN）。服务端的操作系统网络栈接收该请求，创建并标记连接状态，并向客户端回传确认报文（SYN+ACK）。客户端收到确认后，将其套接字标记为已连接，并向服务端发出最终确认报文（ACK）。当服务端收到最终确认后，双方的 TCP 逻辑连接正式建立。

两个已连接的套接字之间遵循**点对点通信模型（Point-to-point）**：如果套接字 A 与套接字 B 建立了连接，则套接字 A 只能与套接字 B 通信，绝不能同时向第三者套接字 C 发送数据。在套接字 A 与套接字 C 通信之前，必须先关闭与套接字 B 的现有连接，再重新发起对 C 的连接。

本小节将介绍如何使用 Boost.Asio 以同步方式将主动套接字连接到远程服务端。

### 操作步骤

TCP 客户端将主动套接字连接到服务端的步骤如下：

1. 获取目标服务端的 IP 地址和端口号。
2. 使用获取的 IP 与端口创建 `asio::ip::tcp::endpoint` 对象。
3. 创建并打开主动套接字。
4. 调用套接字的 `connect()` 方法，将步骤 2 中的端点作为实参传入。
5. 若方法成功返回，套接字即视为已连接，随后即可调用读写方法收发数据。

对应实现代码如下：

```cpp
#include <boost/asio.hpp>
#include <iostream>

using namespace boost;

int main()
{
  // 步骤 1. 假设客户端已经获取目标服务端的 IP 地址和端口号
  std::string raw_ip_address = "127.0.0.1";
  unsigned short port_num = 3333;

  try {
    // 步骤 2. 创建指向目标服务端的端点
    asio::ip::tcp::endpoint
      ep(asio::ip::address::from_string(raw_ip_address),
      port_num);

    asio::io_service ios;

    // 步骤 3. 创建并打开主动套接字
    asio::ip::tcp::socket sock(ios, ep.protocol());

    // 步骤 4. 连接到目标端点
    sock.connect(ep);

    // 此时套接字 sock 已与服务端成功建立连接，
    // 可用于向服务端发送数据或接收来自服务端的数据。
  }
  // 示例中使用的 asio::ip::address::from_string() 和
  // asio::ip::tcp::socket::connect() 重载版本在出错时均抛出异常
  catch (system::system_error &e) {
    std::cout << "Error occured! Error code = " << e.code()
      << ". Message: " << e.what();

    return e.code().value();
  }

  return 0;
}
```

### 工作原理

步骤 1 获取 IP 和端口。步骤 2 使用 `asio::ip::address::from_string()` 构造出目标端点 `ep`。步骤 3 创建并打开 TCP 套接字。

在步骤 4 中，我们调用了套接字对象的 `connect()` 方法并传入 `ep`。该方法在底层触发 TCP 握手。由于这是同步调用，**调用线程将被阻塞**，直到连接成功建立或发生网络错误（例如连接被拒绝、超时、网络不可达等）。

值得注意的是：在调用 `connect()` 之前，我们并没有显式调用 `sock.bind()`。这并不意味着套接字不经绑定就能通信。在真正发起网络握手前，`sock.connect()` 方法在内部会自动为套接字执行隐式绑定，挑选由操作系统分配的合适本地 IP 和临时端口。

此外，本例中使用的 `connect()` 重载会在发生网络故障时抛出 `boost::system::system_error` 异常，步骤 2 中的 `from_string()` 亦是如此。因此代码被包裹在 `try-catch` 块中。这两个函数也提供了不抛异常、接收 `error_code` 的重载，开发者可根据工程规范选择合适的错误处理风格。

### 深入探讨

前述代码假定客户端直接拿到了明确的 IP 地址与端口号。但在更多实际网络场景中，客户端往往拿到的是一个域名，而该域名可能解析为一个或多个 IP 地址。此时我们需要先使用 `asio::ip::tcp::resolver::resolve()` 解析域名，获取一个端点迭代器。

当域名解析出多个 IP 地址时，客户端并不清楚哪个地址可用。标准的做法是**遍历端点集合并逐个尝试连接，直到成功为止**。Boost.Asio 提供了非常便利的独立自由函数（Free function）`asio::connect()` 来自动化完成这一逻辑。

`asio::connect()` 函数接收一个主动套接字引用和一个端点迭代器作为输入参数，在内部遍历该端点集合，并依次尝试连接。一旦与某个端点成功建立连接，函数立即返回；只有在尝试完集合中的所有端点均宣告失败、或发生严重系统错误时，函数才会返回错误或抛出异常。

基于域名和 `asio::connect()` 建立连接的操作步骤如下：

1. 获取服务端主机的 DNS 域名及服务端口字符串。
2. 使用 `asio::ip::tcp::resolver` 解析域名。
3. 创建主动套接字（**保持未打开状态**）。
4. 调用 `asio::connect()` 函数，传入套接字与步骤 2 中获得的解析器迭代器。

代码实现如下：

```cpp
#include <boost/asio.hpp>
#include <iostream>

using namespace boost;

int main()
{
  // 步骤 1. 假设客户端已经获取了 DNS 域名与端口字符串
  std::string host = "samplehost.book";
  std::string port_num = "3333";

  // 供解析器与套接字使用
  asio::io_service ios;

  // 创建解析查询对象
  asio::ip::tcp::resolver::query resolver_query(host, port_num,
    asio::ip::tcp::resolver::query::numeric_service);

  // 创建解析器
  asio::ip::tcp::resolver resolver(ios);

  try {
    // 步骤 2. 解析 DNS 域名
    asio::ip::tcp::resolver::iterator it =
      resolver.resolve(resolver_query);

    // 步骤 3. 创建套接字（注意：此处暂不打开）
    asio::ip::tcp::socket sock(ios);

    // 步骤 4. asio::connect() 依次遍历端点迭代器中的每个端点，
    // 直到成功连接到其中一个。若所有端点均连接失败则抛出异常。
    asio::connect(sock, it);

    // 此时套接字 sock 已与服务端成功建立连接，可开展数据收发。
  }
  catch (system::system_error &e) {
    std::cout << "Error occured! Error code = " << e.code()
      << ". Message: " << e.what();

    return e.code().value();
  }

  return 0;
}
```

注意：在步骤 3 中构造套接字时，我们**并没有打开套接字**（即未指定协议对象）。这是因为域名解析出的地址可能是 IPv4 也可能是 IPv6。`asio::connect()` 函数非常智能，它会在逐个尝试端点前，根据当前尝试端点的协议族自动打开套接字；如果连接失败，它会自动关闭该套接字并在下一次尝试中重新以正确的协议族打开。

### 参考阅读

- “创建端点”小节深入讲解了端点的表示。
- “创建主动套接字”小节介绍了主动套接字与 `asio::io_service` 的用法。
- “解析 DNS 域名”小节详细剖析了域名解析的流程。
- “将套接字绑定到端点”小节探讨了套接字绑定的机制。

---

## 接受连接

当客户端想要通过 TCP 协议与服务端通信时，它首先会通过主动套接字向服务端发起连接请求。

在服务端，操作系统网络栈在能够接受来自客户端的连接请求之前，服务端应用必须预先做好一系列准备工作。在此之前，所有发往该服务端口的客户端连接请求都会被操作系统内核直接丢弃或拒绝（发送 RST 报文）。

首先，服务端应用创建并打开一个接收器套接字，并将其绑定到特定的监听端点。然而此时，抵达该端口的连接请求仍然会被系统拒绝。为了让操作系统真正开始处理发往该端点的连接请求，接收器套接字**必须切换到监听模式（Listening mode）**。调用监听后，操作系统内核会为该接收器套接字分配一个挂起连接请求队列（Backlog Queue），并正式开始受理到达该端口的三次握手请求。

当新的握手请求到达时，操作系统底层负责完成 TCP 握手，随后将已就绪的连接放入与该接收器关联的就绪连接队列中。这些就绪连接在队列中排队，等待服务端应用程序将其取出并处理。服务端准备就绪后，从队列中弹出一个连接进行业务处理。

必须强调的是：**接收器套接字（被动套接字）仅用于监听和接受来自客户端的连接建立请求，绝不直接参与后续的数据传输！** 当处理队列中的连接请求时，接收器套接字会分配并打开一个**全新的主动套接字**，将其绑定到系统分配的本地端点，并与发起请求的特定客户端逻辑相连。随后，这个新创建的主动套接字被交付给服务端代码用于开展具体通信，而接收器套接字则继续驻留在监听状态，准备接受下一个来自客户端的连接请求。

本小节将演示如何使用 Boost.Asio 将接收器套接字置于监听模式，并以同步方式接受客户端的连接请求。

### 操作步骤

以下算法展示了如何配置接收器套接字进入监听状态，并以同步阻塞模式提取处理挂起的客户端连接请求（此处以处理单次连接为例）：

1. 获取服务端用于接收连接请求的端口号。
2. 创建服务端监听端点。
3. 实例化并打开接收器套接字。
4. 将接收器套接字绑定到步骤 2 创建的服务端端点。
5. 调用接收器套接字的 `listen()` 方法，使其进入网络监听模式。
6. 实例化一个主动套接字对象（暂不打开）。
7. 当服务端准备好处理连接时，调用接收器套接字的 `accept()` 方法，并将步骤 6 中创建的主动套接字作为参数传入。
8. 若方法成功返回，该主动套接字即已与客户端建立起连接，可用于后续数据收发。

对应服务端实现代码如下（假定采用基于 IPv4 的 TCP 协议）：

```cpp
#include <boost/asio.hpp>
#include <iostream>

using namespace boost;

int main()
{
  // 操作系统维护的待处理连接请求队列的最大容量 (Backlog)
  const int BACKLOG_SIZE = 30;

  // 步骤 1. 获取监听端口
  unsigned short port_num = 3333;

  // 步骤 2. 创建服务端监听端点
  asio::ip::tcp::endpoint ep(asio::ip::address_v4::any(),
    port_num);

  asio::io_service ios;

  try {
    // 步骤 3. 实例化并打开接收器套接字
    asio::ip::tcp::acceptor acceptor(ios, ep.protocol());

    // 步骤 4. 将接收器套接字绑定到监听端点
    acceptor.bind(ep);

    // 步骤 5. 开始监听传入的连接请求
    acceptor.listen(BACKLOG_SIZE);

    // 步骤 6. 创建主动套接字（用于承接新建立的连接）
    asio::ip::tcp::socket sock(ios);

    // 步骤 7. 提取下一个就绪连接请求，并将主动套接字连接到客户端
    acceptor.accept(sock);

    // 此时套接字 sock 已与客户端建立连接，
    // 可用于向客户端发送数据或接收来自客户端的数据。
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

步骤 1 到步骤 4 分别完成了端口确定、端点构造、接收器创建打开以及绑定。

核心转换发生在步骤 5：我们调用了接收器对象的 `listen()` 方法，并传入常量 `BACKLOG_SIZE`。该调用在操作系统底层执行相应的系统调用（如 POSIX 的 `listen(fd, backlog)`），将内核套接字状态切换为 `LISTEN`。只有执行了该方法后，操作系统才会真正响应发往该端口的握手报文；否则所有连接尝试都会被直接丢弃或重置。

`listen()` 的参数指定了内核为该套接字维护的未决/已就绪连接队列的最大长度。客户端发起连接并在队列中排队，等待服务端程序出队（De-queue）处理。当该队列被占满而服务端未来得及 accept 时，新的连接请求将被操作系统拒绝或忽略。

步骤 6 创建了一个未初始化的主动套接字对象 `sock`。

在步骤 7 中，我们调用 `acceptor.accept(sock)`。该方法执行以下几项操作：
- 首先检查接收器套接字的挂起连接队列。若队列为空，**该方法将阻塞调用线程**，直到有新的客户端连接完成握手并进入队列。
- 一旦队列中有就绪连接，它将队首连接取出，配置传入的 `sock` 对象，使其获得底层内核连接描述符并与该客户端建立绑定。
- 连接建立成功后，`accept()` 方法解除阻塞并返回。此时 `sock` 是一个完全打开且已连接的主动套接字，可以直接用来向该客户端收发数据。

> [!NOTE]
> 必须牢记：在处理客户端连接时，接收器套接字本身**绝不会**与客户端建立直接的数据通路。它的职责是充当工厂角色，为每一次新连接打开并关联一个**新的主动套接字**。接收器套接字始终保持其监听状态，以便继续接受后续其他客户端的连接。

需要再次说明的是：UDP 服务端完全不使用接收器套接字，因为 UDP 协议没有“连接”这一抽象。UDP 服务端只需将一个主动套接字绑定到本地端口上，直接调用数据报接收函数接收任何客户端发送过来的数据包，并使用同一个套接字回传响应。

### 参考阅读

- “创建被动套接字”小节介绍了被动套接字的基础概念。
- “创建端点”小节深入讲解了服务端端点的构建。
- “创建主动套接字”小节介绍了主动套接字的概念与 `asio::io_service` 的作用。
- “将套接字绑定到端点”小节详细介绍了套接字与端点绑定的原理。
