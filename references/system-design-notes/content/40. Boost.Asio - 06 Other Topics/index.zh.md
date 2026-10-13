---
id: boost-asio-06-other-topics
title: "第 6 章：高级与进阶主题"
titleEn: "Chapter 6: Other Topics"
order: 40
category: specialized
description: "深入探索高精度异步定时器、套接字底层配置选项、组合缓冲区与进阶系统网络操作。"
tags: ["Boost.Asio", "定时器", "套接字选项", "组合缓冲", "UNIX域套接字"]
---

# 第 6 章：高级与进阶主题

在本章中，我们将介绍以下操作配方（Recipe）：

- 使用组合缓冲区进行分散/聚集操作（Using composite buffers for scatter/gather operations）
- 使用定时器（Using timers）
- 获取与设置套接字选项（Getting and setting socket options）
- 执行基于流的 I/O（Performing a stream-based I/O）

## 引言

这最后一章包含了四个配方，它们与前面各章展示的 Boost.Asio 核心概念（涵盖大多数典型用例）有所不同。然而，这绝不意味着本章展示的配方不重要。相反，它们在特定场景下非常关键甚至是必不可少的。只不过在一般的分布式应用程序中，它们的使用频率相对较低。

虽然大多数应用不需要分散/聚集 I/O 操作以及组合缓冲区，但对于那些将消息的不同部分存放在不同缓冲区中的应用来说，这些功能会显得极其好用和便捷。

Boost.Asio 定时器是一个用于测量时间间隔的强大工具。通常，它用于为可能耗时不可控的操作设置截止时间（deadline），并在这些操作运行超过特定时间段未能完成时将其打断。对于许多分布式应用程序而言，这一机制至关重要，特别是考虑到 Boost.Asio 本身并未为可能长时间运行的操作直接提供超时参数。此外，Boost.Asio 提供的定时器还可用于解决与网络通信无关的其他定时任务。

允许获取和设置套接字选项的工具也同样非常重要。在开发简单的网络应用程序时，开发者完全可以使用实例化套接字对象时自动设置的默认选项值。但在更为复杂的高级场景中，根据应用程序的具体需求定制套接字选项并重新配置套接字就变得完全不可或缺。

Boost.Asio 中包装了套接字并为其提供类似流（stream-like）接口的类，允许我们构建简单且优雅的分布式应用。而众所周知，简单性正是优秀软件的关键特质之一。

现在，让我们深入探讨上述各个主题。

## 使用组合缓冲区进行分散/聚集操作

在第 2 章《I/O 操作》中的“使用固定长度 I/O 缓冲区”配方中，我们介绍了简单的 I/O 缓冲区，但只是粗略提及了分散/聚集操作和组合缓冲区。在本配方中，我们将更加详细地探讨这一主题。

组合缓冲区本质上是一个由两个或多个简单缓冲区（连续内存块）组成的复合缓冲区，这些简单缓冲区分布在进程的地址空间各处。此类缓冲区在两种情况下尤为实用。

第一种情况是：应用程序需要一个缓冲区，用于在将消息发送到远程应用之前暂存数据，或者接收远程应用发送的消息。问题在于，消息的尺寸过大，由于进程地址空间碎片化，分配单个足够容纳它的连续缓冲区可能会失败。此时，分配多个较小的缓冲区（其大小总和足以容纳数据），并将它们组合成单个组合缓冲区，便是解决该问题的绝佳方案。

另一种情况实际上与第一种相反。由于应用程序设计的特殊性，要发送给远程应用程序的消息被拆分成了几个部分，分别保存在不同的缓冲区中；或者从远程应用程序接收的消息需要被拆分为几个部分，每部分都应存储在独立的缓冲区中以供进一步处理。在这两种情况下，将多个缓冲区合并为一个组合缓冲区，然后使用分散发送（scatter send）或聚集接收（gather receive）操作，都是解决问题的良好方法。

在本配方中，我们将了解如何创建组合缓冲区并在分散/聚集 I/O 操作中使用它们。

### 准备工作

为了理解本配方呈现的内容，最好熟悉第 2 章《I/O 操作》中的“使用固定长度 I/O 缓冲区”配方，该配方提供了 Boost.Asio 固定长度 I/O 缓冲区的总体概述。因此，在继续阅读本配方之前，建议先了解该配方。

### 操作步骤

让我们来看两个算法及其对应的代码示例，它们描述了如何创建和准备用于 Boost.Asio I/O 操作的组合缓冲区。第一个算法处理用于聚集输出操作的组合缓冲区，第二个算法处理用于分散输入操作的组合缓冲区。

#### 为聚集输出操作准备组合缓冲区

以下算法及对应的代码示例描述了如何准备组合缓冲区，以便与执行输出操作的套接字方法（例如 `asio::ip::tcp::socket::send()`）或自由函数（例如 `asio::write()`）配合使用：

1. 分配完成当前任务所需数量的内存缓冲区。请注意，此步骤不涉及 Boost.Asio 的任何功能或数据类型。
2. 将待输出的数据填充到缓冲区中。
3. 创建一个满足 `ConstBufferSequence` 或 `MutableBufferSequence` 概念要求的类的实例，表示组合缓冲区。
4. 将简单缓冲区添加到组合缓冲区中。每个简单缓冲区都应表示为 `asio::const_buffer` 或 `asio::mutable_buffer` 类的实例。
5. 组合缓冲区已准备就绪，可供 Boost.Asio 输出函数使用。

假设我们要向远程应用程序发送字符串 `"Hello my friend!"`，但我们的消息被拆分成了三部分，每部分都保存在独立的缓冲区中。我们可以将这三个缓冲区表示为一个组合缓冲区，然后在输出操作中使用它。在以下代码中，我们将这样实现：

```cpp
#include <boost/asio.hpp>

using namespace boost;

int main()
{
  // 步骤 1 与步骤 2：创建并填充简单缓冲区。
  const char* part1 = "Hello ";
  const char* part2 = "my ";
  const char* part3 = "friend!";

  // 步骤 3：创建表示组合缓冲区的对象。
  std::vector<asio::const_buffer> composite_buffer;

  // 步骤 4：将简单缓冲区添加到组合缓冲区中。
  composite_buffer.push_back(asio::const_buffer(part1, 6));
  composite_buffer.push_back(asio::const_buffer(part2, 3));
  composite_buffer.push_back(asio::const_buffer(part3, 7));

  // 步骤 5：现在 composite_buffer 可以像由连续内存块
  // 表示的简单缓冲区一样，直接用于 Boost.Asio 输出操作。

  return 0;
}
```

#### 为输入操作准备组合缓冲区

以下算法及对应的代码示例描述了如何准备组合缓冲区，以便与执行输入操作的套接字方法（例如 `asio::ip::tcp::socket::receive()`）或自由函数（例如 `asio::read()`）配合使用：

1. 分配完成当前任务所需数量的内存缓冲区。各缓冲区大小的总和必须大于或等于预期接收到这些缓冲区中的消息大小。请注意，此步骤不涉及 Boost.Asio 的任何功能或数据类型。
2. 创建一个满足 `MutableBufferSequence` 概念要求的类的实例，表示组合缓冲区。
3. 将简单缓冲区添加到组合缓冲区中。每个简单缓冲区都应表示为 `asio::mutable_buffer` 类的实例。
4. 组合缓冲区已准备就绪，可供 Boost.Asio 输入操作使用。

让我们设想一个假想场景：我们想从服务器接收 16 字节长的消息。但是，我们没有一个能够容纳整条消息的单一连续缓冲区。相反，我们有三个缓冲区：长度分别为 6、3 和 7 字节。为了创建一个可以接收 16 字节数据的缓冲区，我们可以将这三个小缓冲区连接为一个组合缓冲区。在以下代码中，我们这样实现：

```cpp
#include <boost/asio.hpp>

using namespace boost;

int main()
{
  // 步骤 1：分配简单缓冲区。
  char part1[6];
  char part2[3];
  char part3[7];

  // 步骤 2：创建表示组合缓冲区的对象。
  std::vector<asio::mutable_buffer> composite_buffer;

  // 步骤 3：将简单缓冲区添加到组合缓冲区对象中。
  composite_buffer.push_back(asio::mutable_buffer(part1, sizeof(part1)));
  composite_buffer.push_back(asio::mutable_buffer(part2, sizeof(part2)));
  composite_buffer.push_back(asio::mutable_buffer(part3, sizeof(part3)));

  // 现在 composite_buffer 可以像由连续内存块
  // 表示的简单缓冲区一样，直接用于 Boost.Asio 输入操作。

  return 0;
}
```

### 工作原理

让我们看看第一个示例是如何工作的。它首先分配三个只读缓冲区，并在其中填入消息字符串 `"Hello my friend!"` 的各个部分。

在下一步中，创建了 `std::vector<asio::const_buffer>` 类的实例，该实例即是组合缓冲区的具体体现。该实例被赋予对应的名称 `composite_buffer`。因为 `std::vector<asio::const_buffer>` 类满足 `ConstBufferSequence` 的要求，所以它的对象可以用作组合缓冲区，并作为表示数据源的实参传递给 Boost.Asio 的聚集输出函数和方法。

在步骤 4 中，我们的三个缓冲区分别表示为 `asio::const_buffer` 类的实例，并添加到组合缓冲区中。因为所有处理固定大小缓冲区的 Boost.Asio 输出函数和方法都被设计为同样支持组合缓冲区，所以我们的 `composite_buffer` 对象可以像简单缓冲区一样与它们配合使用。

第二个示例的工作原理与第一个非常相似。唯一的区别在于：由于本示例中创建的组合缓冲区旨在用作数据目标（而不是像第一个示例中那样作为数据源），因此添加到其中的三个简单缓冲区被创建为可写缓冲区，并在添加到组合缓冲区时表示为 `asio::mutable_buffer` 类的实例。

关于第二个示例需要注意的另一点是，由于该示例中创建的组合缓冲区由可变（mutable）缓冲区构成，因此它既可用于聚集输出操作，也可用于分散输入操作。在当前这个特定示例中，初始缓冲区（`part1`、`part2` 和 `part3`）未填充任何数据，只包含未初始化的垃圾数据；因此，除非向它们填充有意义的数据，否则在输出操作中使用它们是没有意义的。

### 参见

- 第 2 章《I/O 操作》中的“使用固定长度 I/O 缓冲区”配方提供了关于固定大小简单缓冲区的更多信息。
- 第 2 章《I/O 操作》中的“使用可扩展流式 I/O 缓冲区”配方演示了如何使用 Boost.Asio 提供的表示不同类型缓冲区（可扩展缓冲区）的类。

## 使用定时器

计时是整个软件系统、特别是分布式应用中非常重要的一个方面。因此，硬件定时器——用于测量时间间隔的设备——是任何计算机不可或缺的组件，所有现代操作系统都提供了允许应用程序使用它的接口。

与定时器相关的典型用例有两个。第一个用例是应用程序想要获取当前时间，并请求操作系统来读取当前时间。第二个用例是应用程序请求操作系统在经过特定时间段后通知它（通常通过调用回调函数的方式）。

在基于 Boost.Asio 开发分布式应用程序时，第二个用例尤为重要，因为定时器是为异步操作实现超时机制的唯一途径。

Boost.Asio 库包含了多个实现定时器的类，我们将在本配方中对其进行深入探讨。

### 操作步骤

Boost.Asio 库提供了两个实现定时器的模板类。其中一个是 `asio::basic_deadline_timer<>`，它是在 Boost.Asio 1.49 版本发布之前唯一可用的定时器。在 1.49 版本中，引入了第二个定时器类模板 `asio::basic_waitable_timer<>`。

`asio::basic_deadline_timer<>` 类模板旨在与 Boost.Chrono 库兼容，并在内部依赖其提供的功能。该模板类在一定程度上已显陈旧，提供的功能相对有限。因此，我们不会在本配方中对其进行讨论。

相反，较新的 `asio::basic_waitable_timer<>` 类模板与 C++11 的 chrono 库兼容，更加灵活且提供了更多功能。Boost.Asio 包含了从 `asio::basic_waitable_timer<>` 模板类泛型派生出的三个类型别名（typedef）：

```cpp
typedef basic_waitable_timer< std::chrono::system_clock > system_timer;
typedef basic_waitable_timer< std::chrono::steady_clock > steady_timer;
typedef basic_waitable_timer< std::chrono::high_resolution_clock > high_resolution_timer;
```

`asio::system_timer` 类基于 `std::chrono::system_clock` 类，它代表系统级的实时时钟（壁钟时间）。此时钟（以及对应的定时器）会受到外部修改系统当前时间的影响。因此，当我们需要设置一个定时器，在达到某个绝对时间点（例如 13:15:45）时通知我们，同时考虑定时器设置后系统时钟的变动时，`asio::system_timer` 是一个很好的选择。然而，该定时器并不擅长测量相对时间间隔（例如“从现在起 35 秒后”），因为系统时钟的跳变可能导致定时器比实际经过的时间间隔更早或更晚触发。

`asio::steady_timer` 类基于 `std::chrono::steady_clock` 类，它代表不受系统时钟调整影响的稳定时钟（单调时钟）。这意味着 `asio::steady_timer` 是测量时间间隔的理想选择。

最后一个定时器 `asio::high_resolution_timer` 类基于 `std::chrono::high_resolution_clock` 类，它代表高分辨率系统时钟。当时间测量需要极高精度时可以使用它。

在使用 Boost.Asio 库实现的分布式应用程序中，定时器通常用于为异步操作实现超时周期。在异步操作启动后（例如 `asio::async_read()`），应用程序将启动一个设置为在特定时间段（超时周期）后到期的定时器。当定时器到期时，应用程序检查异步操作是否已经完成；如果尚未完成，则认为该操作超时并将其取消。

由于稳定定时器（steady timer）不受系统时钟调整的影响，因此它是实现超时机制的最佳选择。

> [!NOTE]
> 请注意，在某些平台上稳定时钟不可用，表示 `std::chrono::steady_clock` 的相应类表现出的行为与 `std::chrono::system_clock` 相同，这意味着它与后者一样容易受到系统时钟变动的影响。建议查阅平台文档和相应的 C++ 标准库实现，以确定 steady clock 是否真正具有单调稳定性。

让我们来看一个虽然略显脱离实际但极具代表性的示例程序，它演示了如何创建、启动和取消 Boost.Asio 定时器。在示例中，我们将依次创建并启动两个稳定定时器。当第一个定时器到期时，我们将在第二个定时器有机会到期之前将其取消。

我们从包含必要的 Boost.Asio 头文件和 using 指令开始编写示例应用程序：

```cpp
#include <boost/asio/steady_timer.hpp>
#include <iostream>

using namespace boost;
```

接下来，我们定义程序中唯一的组件：`main()` 入口函数：

```cpp
int main()
{
```

像几乎所有非平凡的 Boost.Asio 应用程序一样，我们需要一个 `asio::io_service` 类的实例：

```cpp
  asio::io_service ios;
```

然后，我们创建并启动第一个定时器 `t1`，它被设置为 2 秒后到期：

```cpp
  asio::steady_timer t1(ios);
  t1.expires_from_now(std::chrono::seconds(2));
```

接着，我们创建并启动第二个定时器 `t2`，它被设置为 5 秒后到期。它显然比第一个定时器更晚到期：

```cpp
  asio::steady_timer t2(ios);
  t2.expires_from_now(std::chrono::seconds(5));
```

现在，我们定义并设置在第一个定时器到期时调用的回调函数：

```cpp
   t1.async_wait([&t2](boost::system::error_code ec) {
      if (ec == 0) {
         std::cout << "Timer #1 has expired!" << std::endl;
      }
      else if (ec == asio::error::operation_aborted) {
         std::cout << "Timer #1 has been cancelled!"
                     << std::endl;
      }
      else {
         std::cout << "Error occured! Error code = "
            << ec.value()
            << ". Message: " << ec.message()
                      << std::endl;
      }

      t2.cancel();
   });
```

然后，我们定义并设置在第二个定时器到期时调用的另一个回调函数：

```cpp
   t2.async_wait([](boost::system::error_code ec) {
      if (ec == 0) {
         std::cout << "Timer #2 has expired!" << std::endl;
      }
      else if (ec == asio::error::operation_aborted) {
         std::cout << "Timer #2 has been cancelled!"
<< std::endl;
      }
      else {
         std::cout << "Error occured! Error code = "
            << ec.value()
            << ". Message: " << ec.message()
<< std::endl;
      }
   });
```

最后一步，我们在 `asio::io_service` 类的实例上调用 `run()` 方法：

```cpp
  ios.run();

  return 0;
}
```

现在，我们的示例应用程序已经准备就绪。

### 工作原理

现在，让我们追踪应用程序的执行路径以更好地理解其工作原理。

`main()` 函数首先创建 `asio::io_service` 类的一个实例。我们需要它是因为就像套接字、接收器、解析器以及 Boost.Asio 库定义的其他使用操作系统服务的组件一样，定时器也需要一个 `asio::io_service` 类的实例。

在下一步中，实例化名为 `t1` 的第一个定时器，然后在其上调用 `expires_from_now()` 方法。该方法将定时器切换为未到期状态并启动它。它接受一个表示时间间隔时长的实参，定时器应在此时间间隔之后到期。在我们的示例中，传递了一个表示 2 秒时长的实参，这意味着从定时器启动那一刻起经过 2 秒，定时器就会到期，并且所有等待此定时器到期事件的对象都会收到通知。

接着，创建名为 `t2` 的第二个定时器，随后启动并设置为 5 秒后到期。

当两个定时器都启动后，我们异步等待定时器的到期事件。换句话说，我们在两个定时器上分别注册了回调，当相应定时器到期时回调将被调用。为此，我们调用定时器的 `async_wait()` 方法，并将指向回调函数的指针（或可调用对象）作为实参传递。`async_wait()` 方法期望其实参是具有以下签名的函数：

```cpp
void callback(
  const boost::system::error_code& ec);
```

回调函数接受单个 `ec` 实参，表示等待完成的状态。在我们的示例应用程序中，我们将 Lambda 表达式用作两个定时器的到期回调。

当两个定时器的到期回调都设置完成后，在 `ios` 对象上调用 `run()` 方法。该方法会发生阻塞，直到两个定时器都处理完毕。调用 `run()` 方法的线程上下文将被用来调用到期回调函数。

当第一个定时器到期时，对应的回调函数被调用。它检查等待完成状态并向标准输出流输出相应的消息。然后，它通过在 `t2` 对象上调用 `cancel()` 方法来取消第二个定时器。

取消第二个定时器会导致其到期回调被调用，并带有一个表明定时器在到期前已被取消的状态码（`asio::error::operation_aborted`）。第二个定时器的到期回调检查到期状态，向标准输出流输出相应消息后返回。

当两个回调都执行完毕后，`run()` 方法返回，`main()` 函数执行到底。此时应用程序的执行便告结束。

## 获取与设置套接字选项

套接字的属性及其行为可以通过修改其各种选项的值来进行配置。当套接字对象被实例化时，其各个选项均具有默认值。在许多情况下，采用默认配置的套接字已经足够完美，而在另一些情况下，可能需要通过更改其选项值来对套接字进行微调，以满足应用程序的具体需求。

在本配方中，我们将看到如何使用 Boost.Asio 获取和设置套接字选项。

### 准备工作

本配方假定读者熟悉第 1 章《基础知识》中介绍的内容。

### 操作步骤

每个可以通过 Boost.Asio 提供的功能进行设置或获取的套接字选项，都由一个独立的类来表示。Boost.Asio 支持的用于设置或获取套接字选项的完整类列表，可以在 Boost.Asio 文档页面找到：`http://www.boost.org/doc/libs/1_58_0/doc/html/boost_asio/reference/socket_base.html`。

请注意，该页面上列出的表示套接字选项的类，少于可从原生套接字（底层操作系统的对象）设置或获取的选项数量。这是因为 Boost.Asio 仅支持有限数量的常用套接字选项。要设置或获取其他套接字选项的值，开发者可能需要通过添加表示所需选项的自定义类来扩展 Boost.Asio 库。然而，扩展 Boost.Asio 库的主题超出了本书的范围。我们将重点关注如何操作该库开箱即用支持的套接字选项。

让我们设想一个假想场景：我们想将套接字接收缓冲区的大小增大为当前大小的两倍。为此，我们首先需要获取当前缓冲区的大小，然后将其乘以 2，最后将相乘后得到的值设置为新的接收缓冲区大小。

以下示例演示了如何在代码中实现这一点：

```cpp
#include <boost/asio.hpp>
#include <iostream>

using namespace boost;

int main()
{
  try {
    asio::io_service ios;

    // 创建并打开一个 TCP 套接字。
    asio::ip::tcp::socket sock(ios, asio::ip::tcp::v4());

    // 创建表示接收缓冲区大小选项的对象。
    asio::socket_base::receive_buffer_size cur_buf_size;

    // 获取该选项当前设置的值。
    sock.get_option(cur_buf_size);

    std::cout << "Current receive buffer size is "
      << cur_buf_size.value() << " bytes."
      << std::endl;

    // 创建表示接收缓冲区大小选项的对象，并传入新值。
    asio::socket_base::receive_buffer_size
      new_buf_size(cur_buf_size.value() * 2);

    // 设置选项的新值。
    sock.set_option(new_buf_size);

    std::cout << "New receive buffer size is "
      << new_buf_size.value() << " bytes."
      << std::endl;
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

我们的示例由单个组件组成：`main()` 入口函数。该函数首先创建 `asio::io_service` 类的一个实例。然后使用该实例创建表示 TCP 套接字的对象。

请注意套接字类构造函数的使用方式，该构造函数会创建并打开套接字。在我们能够对特定套接字对象获取或设置选项之前，相应的套接字必须处于已打开状态。这是因为在 Boost.Asio 套接字对象打开之前，对应操作系统的底层原生套接字对象尚未分配，因此没有任何实体可供设置或获取选项。

接下来，实例化 `asio::socket_base::receive_buffer_size` 类的一个对象。该类表示控制套接字接收缓冲区大小的选项。为了获取该选项的当前值，在套接字对象上调用 `get_option()` 方法，并将对选项对象的引用作为实参传递给它。

`get_option()` 方法通过传递给它的实参类型来推导所请求的选项。然后，它将相应选项的值存储在选项对象中并返回。通过调用表示对应选项的对象上的 `value()` 方法，可以从中获取选项的值。

在获取接收缓冲区大小选项的当前值并输出到标准输出流后，为了设置该选项的新值，`main()` 函数接着创建了 `asio::socket_base::receive_buffer_size` 类的另一个实例，命名为 `new_buf_size`。此实例与第一个实例 `cur_buf_size` 表示相同的选项，但它包含新值。新的选项值作为构造函数实参传递给选项对象。

构建好包含新接收缓冲区大小选项值的选项对象后，将其引用作为实参传递给套接字的 `set_option()` 方法。与 `get_option()` 类似，该方法通过传递给它的实参类型来推导要设置的选项，然后设置相应的选项值，使新值等于选项对象中存储的值。

最后一步，将新选项的值输出到标准输出流。

## 执行基于流的 I/O

当正确使用时，流（Stream）和基于流的 I/O 概念在表达力和优雅性上都极为出色。有时，应用程序的大部分源代码都由基于流的 I/O 操作组成。如果网络通信模块也能通过基于流的操作来实现，那么此类应用程序的源代码可读性和可维护性将会大幅提升。

幸运的是，Boost.Asio 提供了允许我们以流式风格实现进程间通信的工具。在本配方中，我们将了解如何使用它们。

### 操作步骤

Boost.Asio 库包含 `asio::ip::tcp::iostream` 包装类，该类为 TCP 套接字对象提供了类似 I/O 流的接口，允许我们用基于流的操作来表达进程间通信操作。

让我们来看一个利用 Boost.Asio 提供的基于流 I/O 的 TCP 客户端应用程序。采用这种方法时，TCP 客户端程序会变得像以下代码一样简洁明了：

```cpp
#include <boost/asio.hpp>
#include <iostream>

using namespace boost;

int main()
{
  asio::ip::tcp::iostream stream("localhost", "3333");
  if (!stream) {
    std::cout << "Error occurred! Error code = "
      << stream.error().value()
      << ". Message = " << stream.error().message()
      << std::endl;

    return -1;
  }

  stream << "Request.";
  stream.flush();

  std::cout << "Response: " << stream.rdbuf();

  return 0;
}
```

### 工作原理

示例 TCP 客户端非常简单，仅包含一个组件：`main()` 入口函数。`main()` 函数首先创建 `asio::ip::tcp::iostream` 类的实例，该类包装了 TCP 套接字并为其提供类似 I/O 流的接口。

`stream` 对象通过接受服务器 DNS 名称和协议端口号的构造函数进行构造，并自动尝试解析 DNS 名称，然后尝试连接到该服务器。请注意，端口号表示为字符串而不是整数。这是因为传递给此构造函数的两个参数直接用于创建解析器查询（resolver query），而查询要求端口号表示为字符串（它可以表示为服务名称（如 `http`、`ftp` 等），也可以表示为字符串形式的端口号（如 `"80"`、`"8081"`、`"3333"` 等））。

或者，我们也可以使用默认构造函数来构造流对象，该构造函数不会立即执行 DNS 名称解析和连接。然后，当对象构造完毕后，我们可以在其上调用 `connect()` 方法，指定 DNS 名称和协议端口号以执行解析并连接套接字。

接下来，测试流对象的状态以查明连接是否成功。如果流对象处于错误或失效状态，则向标准输出流输出相应的错误信息，应用程序退出。`asio::ip::tcp::iostream` 类的 `error()` 方法返回一个 `boost::system::error_code` 类的实例，该实例提供了关于流中发生的最后一次错误的信息。

如果流已成功连接到服务器，则在其上执行输出操作，向服务器发送字符串 `"Request."`。在此之后，在流对象上调用 `flush()` 方法，以确保所有缓冲的数据都被推送到服务器。

在最后一步中，在流上执行输入操作，以读取作为响应从服务器接收到的所有数据。接收到的消息被输出到标准输出流。之后，`main()` 函数返回，应用程序退出。

### 深入探讨

我们不仅可以使用 `asio::ip::tcp::iostream` 类以面向流的方式实现客户端 I/O，还可以在服务端执行基于流的 I/O 操作。此外，该类允许我们为操作指定超时时间，这使得基于流的 I/O 相比普通的同步 I/O 更具优势。让我们看看这是如何做到的。

#### 实现服务端 I/O

以下代码片段演示了如何使用 `asio::ip::tcp::iostream` 类实现执行基于流 I/O 的简单服务端：

```cpp
  // ...
  asio::io_service io_service;

  asio::ip::tcp::acceptor acceptor(io_service,
    asio::ip::tcp::endpoint(asio::ip::tcp::v4(), 3333));

  asio::ip::tcp::iostream stream;

  acceptor.accept(*stream.rdbuf());
  std::cout << "Request: " << stream.rdbuf();
  stream << "Response.";
  // ...
```

此代码片段展示了一个简单服务端应用程序的部分源代码。它创建了接收器（acceptor）和 `asio::ip::tcp::iostream` 类的实例。接着，有趣的事情发生了。

在接收器对象上调用了 `accept()` 方法。作为实参，传递给该方法的是对流对象调用 `rdbuf()` 方法所返回指针解引用后的对象。流对象的 `rdbuf()` 方法返回指向流缓冲区对象的指针。该流缓冲区对象是继承自 `asio::ip::tcp::socket` 类的某个类的实例，这意味着 `asio::ip::tcp::iostream` 类的对象所使用的流缓冲区兼具双重角色：既是流缓冲区，又是套接字。因此，这个兼具流缓冲区与套接字双重功能的对象可以像普通的主动套接字一样，用于连接客户端应用程序并与其通信。

当连接请求被接受且连接建立后，与客户端的后续通信将以流式风格进行，正如本配方前面在客户端应用程序中演示的那样。

#### 设置超时时间间隔

由于 `asio::ip::tcp::iostream` 类提供的 I/O 操作会阻塞执行线程，并且它们可能潜在运行相当长的时间，因此该类提供了一种设置超时周期的方法；当超时到期时，如果当前存在阻塞线程的操作，将导致该操作被中断。

超时时间间隔可以通过 `asio::ip::tcp::iostream` 类的 `expires_from_now()` 方法进行设置。该方法接受超时时间间隔的时长作为输入参数并启动内部定时器。如果在定时器到期的那一刻，I/O 操作仍在进行中，则该操作被视为超时，因此会被强制中断。

## 索引与附录

### 术语索引（Index）

#### A
- **active socket（主动套接字）**
  - 概述：12
  - 创建：13-16
- **asynchronous client application（异步客户端应用）**
  - 概述：96
  - 与同步客户端对比：97
- **asynchronous operations（异步操作）**
  - 取消：80-85
- **asynchronous server application（异步服务端应用）**：129
- **asynchronous TCP client（异步 TCP 客户端）**
  - 应用启动：119
  - 客户端关闭：124
  - 实现：110-119
  - 初始化：119
  - 请求取消：123, 124
  - 请求完成：119
  - 请求发起：120-123
- **asynchronous TCP server（异步 TCP 服务端）**
  - 概述：147
  - Acceptor 类：156
  - 实现：147-154
  - main() 入口函数：157
  - Server 类：157
  - Service 类：155, 156
  - 运行机制：155
- **AsyncTCPClient 类**：119

#### B
- **Berkeley Sockets API**：4
- **binding（绑定）**：25
- **Boost.Asio**：12

#### C
- **client（客户端）**：95
- **client applications（客户端应用）**
  - 分类：96
  - 通信：40
- **composite buffers（组合缓冲区）**
  - 概述：212
  - 为聚集输出操作准备：213
  - 为输入操作准备：214-216
  - 用于分散/聚集操作：212, 213
- **connections（连接）**
  - 接受连接：34-38

#### D
- **distributed application（分布式应用）**
  - 概述：2
  - 优势：2
- **DNS name（DNS 域名）**
  - 概述：19
  - 解析：19-23
- **DNS name resolution（DNS 域名解析）**：20
- **domain name（域名）**：19
- **Domain Name System (DNS)**：19

#### E
- **endpoint（端点）**
  - 概述：5
  - 创建：5-11
  - 在客户端创建以指定服务器：7
  - 目标：6
  - 套接字绑定到端点：25-27
- **execute() 方法**：181
- **extensible buffers（可扩展缓冲区）**
  - 概述：47, 48
  - 运行机制：49

#### F
- **fixed length I/O buffers（固定长度 I/O 缓冲区）**
  - 为输入操作准备：44-46
  - 为输出操作准备：43, 45
  - 使用：41-43

#### G
- **multiprotocol servers（多协议服务端）**：128
- **multithreaded TCP client application（多线程 TCP 客户端应用）**
  - 实现：124-126

#### H
- **handler() 函数**：183
- **HTTP client application（HTTP 客户端应用）**
  - 回调：177, 183
  - HTTPClient 类：176, 179
  - HTTPRequest 类：166-182
  - HTTPResponse 类：165, 166, 183
  - 实现：161-164
  - main() 入口函数：177-179
- **HTTP protocol（HTTP 协议）**
  - 概述：159
  - HTTP 客户端应用：159
  - HTTP 服务端应用：159
- **HTTP request line（HTTP 请求行）**：186
- **HTTP response status line（HTTP 响应状态行）**：182
- **HTTP server application（HTTP 服务端应用）**
  - 实现：184-195

#### I
- **inversion of control approach（控制反转模式）**：40
  - 概述：39
  - 额外操作：41
  - 异步操作：40
  - I/O 缓冲区：40
  - 同步操作：40
- **iterative server（迭代型服务端）**：128

#### N
- **network programming（网络编程）**
  - 概述：5
  - 简化：5
- **notifiers（通知器）**：128
- **notify clients（通知客户端）**：128

#### O
- **on_connection_established() 方法**：181
- **on_host_name_resolved() 方法**：181
- **overlapping（重叠 I/O）**：99

#### P
- **parallel server（并发并行服务端）**：128
- **passive socket（被动套接字）**
  - 概述：12, 17
  - 创建：17-19
- **private members, SyncTCPClient class**：
  - `asio::io_service m_ios`：103
  - `asio::ip::tcp::endpoint m_ep`：103
  - `asio::ip::tcp::socket m_sock`：103
- **private members, SyncUDPClient class**：
  - `asio::io_service m_ios`：108
  - `asio::ip::udp::socket m_sock`：108
- **push-style communication model（推模式通信模型）**：128

#### R
- **request headers block（请求头块）**：188
- **request life cycle（请求生命周期）**
  - 阶段：98
- **response body（响应体）**：175
- **response headers block（响应头块）**：173

#### S
- **sample protocol（示例协议）**：99
- **Secure Socket Layer (SSL)**：160
- **server（服务端）**：95, 127
- **server endpoint（服务端端点）**
  - 创建：8
- **simplicity（简单性）**：130
- **single-threaded TCP client（单线程 TCP 客户端）**：124
- **socket（套接字）**
  - 概述：4
  - 绑定到端点：25-27
  - 连接：29-34
- **socket options（套接字选项）**
  - 获取：221-223
  - 设置：221-223
- **SSL context（SSL 上下文）**：208
- **SSL/TLS handshake（SSL/TLS 握手）**：208
- **SSL/TLS support（SSL/TLS 支持）**
  - 概述：202
  - Acceptor 类：208, 209
  - 添加到客户端应用：196-200
  - 添加到服务端应用：202-207
  - main() 入口函数：202
  - Service 类：208
  - SyncSSLClient 类：200-202
- **status line（状态行）**：171
- **stream-based I/O（基于流的 I/O）**
  - 执行：223-225
  - 服务端 I/O 实现：225, 226
  - 超时间隔设置：226
- **synchronous approach（同步方式）**
  - 概述：130
  - 优势：130
  - 示例协议：130, 131
- **synchronous client application（同步客户端应用）**
  - 概述：96
  - 与异步客户端对比：97
- **synchronous iterative TCP server（同步迭代型 TCP 服务端）**
  - Acceptor 类：136
  - 消除缺陷：138
  - 实现：131-135
  - main() 入口函数：137
  - 结果分析：139
  - Server 类：136, 137
  - Service 类：135
  - 在合理时间内停止：138
  - 处理漏洞：139
- **synchronous operations（同步操作）**：129
- **synchronous parallel TCP server（同步并发 TCP 服务端）**
  - Acceptor 类：145
  - 实现：139-144
  - main() 入口函数：147
  - Server 类：146
  - Service 类：144, 145
  - Start() 方法：146
  - Stop() 方法：146
- **synchronous server（同步服务端）**：129
- **synchronous TCP client（同步 TCP 客户端）**
  - 概述：100
  - 实现：100-103
  - main() 入口函数：104
  - SyncTCPClient 类：103, 104
- **synchronous UDP client（同步 UDP 客户端）**
  - 概述：105
  - 实现：105-108
  - main() 入口函数：110
  - SyncUDPClient 类：108-110
- **SyncTCPClient 类**：
  - 概述：103, 104
  - 私有成员：103
- **SyncUDPClient 类**：
  - 概述：108-110
  - 私有成员：108

#### T
- **TCP client（TCP 客户端）**：96
- **TCP protocol（TCP 协议）**
  - 特性：3
- **TCP socket（TCP 套接字）**
  - `asio::read_at()` 函数：62
  - `asio::read()` 函数：59
  - `asio::read_until()` 函数：60, 61
  - 客户端应用：88, 89
  - 关闭：87-91
  - 异步读取：71-79
  - 同步读取：55-58
  - `receive()` 方法：58
  - `send()` 方法：53
  - 服务端应用：90, 91
  - 关闭连接（shutdown）：86, 87
  - 异步写入：62-70
  - 同步写入：49-52
- **timers（定时器）**
  - 概述：216
  - 使用：216-220
- **Transport Layer Security (TLS)**：160

#### U
- **UDP client（UDP 客户端）**：96
- **UDP protocol（UDP 协议）**
  - 特性：3

---

### 出版信息与延伸阅读推荐

**感谢您购买《Boost.Asio C++ Network Programming Cookbook》**

#### 关于 Packt Publishing
Packt 于 2004 年 4 月出版了第一本书，随后继续专注于出版高度针对特定技术和解决方案的书籍。我们的出版物凝聚了同行 IT 专业人员在适配和定制当今系统、应用及框架方面的丰富经验。

#### 延伸阅读图书推荐
1. **《Learning Boost C++ Libraries》** (ISBN: 978-1-78355-121-7)
   - 通过实用的编程示例学习应用丰富的 Boost 库，包括容器、智能指针、正则表达式、多线程、网络 I/O 及其他实用工具。
2. **《Boost C++ Application Development Cookbook》** (ISBN: 978-1-84951-488-0)
   - 超过 80 个基于任务的实用配方，涵盖多线程、网络通信、元编程与泛型编程。
3. **《Learning Object-Oriented Programming》** (ISBN: 978-1-78528-963-7)
   - 探索 Python、JavaScript 和 C# 中的面向对象编程精髓。
4. **《Objective-C Memory Management Essentials》** (ISBN: 978-1-84969-712-5)
   - 深入学习 Objective-C 中的内存管理技术，开发健壮的 iOS 应用程序。
