---
id: boost-asio-05-http-and-ssl-tls
title: "第 5 章：HTTP 与 SSL/TLS 安全通信"
titleEn: "Chapter 5: HTTP and SSL/TLS"
order: 39
category: specialized
description: "实现 HTTP 协议编解码、SSL/TLS 加密通信流、数字证书验证与安全可靠的分布式系统连接。"
tags: ["Boost.Asio", "HTTP协议", "SSL", "TLS", "加密通信", "OpenSSL"]
---

# 第 5 章：HTTP 与 SSL/TLS 安全通信

在本章中，我们将介绍以下主题：

- 实现 HTTP 客户端应用程序（Implementing the HTTP client application）
- 实现 HTTP 服务端应用程序（Implementing the HTTP server application）
- 为客户端应用添加 SSL/TLS 支持（Adding SSL/TLS support to client applications）
- 为服务端应用添加 SSL/TLS 支持（Adding SSL/TLS support to server applications）

## 引言

本章涵盖两个主要主题：第一个是 HTTP 协议的实现；第二个是 SSL/TLS 协议的使用。让我们简要了解一下它们各自的背景。

HTTP 协议是运行在 TCP 协议之上的应用层协议。它在互联网中得到了极其广泛的应用，允许客户端应用程序向服务器请求特定的资源，并由服务器将所请求的资源回传给客户端。此外，HTTP 还允许客户端上传数据以及向服务器发送控制命令。

HTTP 协议定义了多种通信模型或方法（Method），每种方法专为特定用途而设计。其中最简单的方法是 GET 方法，其典型的事件流程如下：

1. HTTP 客户端应用程序（例如 Web 浏览器）生成包含所请求特定资源（驻留在服务器上）信息的请求消息，并使用 TCP 作为传输层协议将其发送给 HTTP 服务端应用程序（例如 Web 服务器）。
2. HTTP 服务端应用程序在收到来自客户端的请求后对其进行解析，从存储介质（例如文件系统或数据库）中提取所请求的资源，并将其作为 HTTP 响应消息的一部分发送回客户端。

请求消息和响应消息的格式均由 HTTP 协议规范明确定义。

HTTP 协议还定义了其他几种方法，允许客户端应用程序主动向服务器发送数据或上传资源、删除服务器上的资源以及执行其他操作。在本章的配方中，我们将重点考虑 GET 方法的实现。由于 HTTP 协议的各种方法在原理上是相通的，掌握其中一种方法的实现即可为实现其他方法提供极佳的借鉴。

本章涵盖的另一个主题是 SSL 和 TLS 协议。安全套接字层（Secure Socket Layer，简称 SSL）与传输层安全（Transport Layer Security，简称 TLS）协议运行在 TCP 协议之上，旨在实现以下两个主要目标：

- 提供一种使用数字证书对每个通信参与方进行身份验证（Authentication）的途径。
- 对通过底层 TCP 协议传输的数据进行加密保护，确保数据的保密性与完整性。

SSL 和 TLS 协议极为普及，尤其是在 Web 领域。绝大多数可能接收客户端敏感数据（如密码、信用卡号、个人隐私数据等）的 Web 服务器都支持启用 SSL/TLS 的通信。在这种情况下，通常使用所谓的 HTTPS（HTTP over SSL/TLS）协议：一方面允许客户端对服务器进行身份验证（有时服务器也可能需要验证客户端身份，不过这种情况相对少见）；另一方面通过对传输数据进行加密来保障安全，即使数据被恶意攻击者截获也无法被解读。

Boost.Asio 自身并不包含 SSL/TLS 协议的原生实现。相反，它依赖底层的 OpenSSL 库。Boost.Asio 提供了一组类、函数和数据结构，用于封装和简化 OpenSSL 提供的功能，使应用程序的代码更加统一且符合面向对象的设计规范。

在本章中，我们不会深入探讨 OpenSSL 库或 SSL/TLS 协议本身的底层细节，这些主题超出了本书的讨论范围。相反，我们将重点关注 Boost.Asio 提供的依赖于 OpenSSL 库的高级工具，以及如何利用它们在网络应用程序中支持 SSL/TLS 协议。

接下来的两个配方将演示如何构建使用 SSL/TLS 协议保障通信安全的客户端和服务端应用程序。为了使应用中与 SSL/TLS 相关的方面更加清晰直观，示例中涉及的其他业务逻辑均被设计得尽可能简单。客户端和服务端应用程序均采用同步模型，并基于本书前面章节中的配方构建。这使我们能够将基础的 TCP 客户端或服务端应用与支持 SSL/TLS 的高级版本进行清晰对照，从而更好地理解为分布式应用添加 SSL/TLS 支持需要做些什么。

## 实现 HTTP 客户端应用程序

HTTP 客户端构成了分布式软件中非常重要的一个类别，并体现在众多应用程序中。Web 浏览器是该类别最典型的代表，它们使用 HTTP 协议向 Web 服务器请求网页。然而，如今 HTTP 协议已不仅局限于 Web 浏览。许多分布式应用程序都使用该协议来交换各种自定义数据。通常，在设计分布式应用程序时，选择 HTTP 作为通信协议往往比从头设计自定义协议要明智得多。

在本配方中，我们将考虑使用 Boost.Asio 实现一个满足以下基本要求的 HTTP 客户端：

- 支持 HTTP GET 请求方法
- 异步执行请求
- 支持请求取消操作

下面让我们进入具体实现。

### 操作步骤

由于客户端应用程序的要求之一是支持取消已发起但尚未完成的请求，我们需要确保在所有目标平台上都已启用取消功能。因此，我们首先对 Boost.Asio 库进行配置以启用请求取消。关于异步操作取消相关问题的更多细节，请参阅第 2 章《I/O 操作》中的“取消异步操作”配方：

```cpp
#include <boost/predef.h> // 用于识别操作系统的工具宏

// 在 Windows XP、Windows Server 2003 及更早版本上，
// 需要定义以下宏以启用 I/O 操作的取消功能。
// 详情请参阅 Boost.Asio 官方文档。
#ifdef BOOST_OS_WINDOWS
#define _WIN32_WINNT 0x0501
#if _WIN32_WINNT <= 0x0502 // Windows Server 2003 或更早版本
#define BOOST_ASIO_DISABLE_IOCP
#define BOOST_ASIO_ENABLE_CANCELIO
#endif
#endif
```

接下来，我们包含 Boost.Asio 库头文件以及实现应用程序所需的 C++ 标准库组件头文件：

```cpp
#include <boost/asio.hpp>

#include <thread>
#include <mutex>
#include <memory>
#include <iostream>

using namespace boost;
```

现在，在实现构成客户端应用程序的类和函数之前，我们还必须做好一项与错误表示和处理相关的准备工作。

在实现 HTTP 客户端应用程序时，我们需要处理三类错误：
- 第一类错误是执行 Boost.Asio 函数和类方法时可能发生的各种底层错误。例如，如果我们对未打开的套接字调用 `write_some()` 方法，该方法将返回依赖于操作系统的错误码（取决于使用的重载形式，或者抛出异常，或者通过传出参数返回），指出在未打开的套接字上执行了无效操作。
- 第二类错误包括 HTTP 协议定义的状态码（包含成功与失败状态）。例如，服务器针对客户端特定请求返回的状态码 200，表示客户端请求已成功完成；另一方面，状态码 500 表示服务器在执行所请求的操作时发生了错误，导致请求未能被满足。
- 第三类错误包括与 HTTP 协议解析本身相关的错误。如果服务器针对客户端发出的正确请求所返回的消息并非格式规范的 HTTP 响应，客户端应用程序应当有手段用错误码来表示这一情况。

第一类错误的错误码已在 Boost.Asio 库源码中定义；第二类状态码由 HTTP 协议规范定义；而第三类错误并没有现成的定义，我们必须在应用程序中自行定义对应的错误码。

我们定义一个通用的错误码，用于表示从服务器接收到的消息不是正确的 HTTP 响应消息，因而客户端无法解析它。我们将此错误码命名为 `invalid_response`：

```cpp
namespace http_errors {
  enum http_error_codes
  {
    invalid_response = 1
  };

  class http_errors_category
    : public boost::system::error_category
  {
  public:
    const char* name() const BOOST_SYSTEM_NOEXCEPT
    { return "http_errors"; }

    std::string message(int e) const {
      switch (e) {
      case invalid_response:
        return "Server response cannot be parsed.";
        break;
      default:
        return "Unknown error.";
        break;
      }
    }
  };

  const boost::system::error_category&
  get_http_errors_category()
  {
    static http_errors_category cat;
    return cat;
  }

  boost::system::error_code
    make_error_code(http_error_codes e)
  {
    return boost::system::error_code(
      static_cast<int>(e), get_http_errors_category());
  }
} // namespace http_errors
```

在应用程序能够使用新定义的错误码之前，最后一步是让 Boost 库知道 `http_error_codes` 枚举的成员应当被视为错误码枚举。为此，我们在 `boost::system` 命名空间中加入以下特化结构体定义：

```cpp
namespace boost {
  namespace system {
    template<>
    struct is_error_code_enum<http_errors::http_error_codes>
    {
      BOOST_STATIC_CONSTANT(bool, value = true);
    };
  } // namespace system
} // namespace boost
```

由于我们的 HTTP 客户端应用程序是异步工作的，客户端用户在发起请求时需要提供一个回调函数指针，该回调函数将在请求完成时被调用。我们需要定义一个表示该回调函数签名的类型。

回调函数在被调用时，需要传入明确指示三件事的参数：
- 哪个请求已完成
- 响应内容是什么
- 请求是否成功完成；若未成功，指示所发生错误的错误码是什么

请注意，后续我们将定义分别表示 HTTP 请求与 HTTP 响应的 `HTTPRequest` 和 `HTTPResponse` 类，在此我们先使用前向声明。回调函数指针类型的声明如下：

```cpp
class HTTPClient;
class HTTPRequest;
class HTTPResponse;

typedef void(*Callback) (const HTTPRequest& request,
  const HTTPResponse& response,
  const system::error_code& ec);
```

#### HTTPResponse 类

现在，我们可以定义一个表示作为请求回复发送给客户端的 HTTP 响应消息的类：

```cpp
class HTTPResponse {
  friend class HTTPRequest;
  HTTPResponse() :
    m_response_stream(&m_response_buf)
  {}

public:
  unsigned int get_status_code() const {
    return m_status_code;
  }

  const std::string& get_status_message() const {
    return m_status_message;
  }

  const std::map<std::string, std::string>& get_headers() {
    return m_headers;
  }

  const std::istream& get_response() const {
    return m_response_stream;
  }

private:
  asio::streambuf& get_response_buf() {
    return m_response_buf;
  }

  void set_status_code(unsigned int status_code) {
    m_status_code = status_code;
  }

  void set_status_message(const std::string& status_message) {
    m_status_message = status_message;
  }

  void add_header(const std::string& name,
  const std::string& value)
  {
    m_headers[name] = value;
  }

private:
  unsigned int m_status_code; // HTTP 状态码
  std::string m_status_message; // HTTP 状态消息

  // 响应头映射表
  std::map<std::string, std::string> m_headers;
  asio::streambuf m_response_buf;
  std::istream m_response_stream;
};
```

`HTTPResponse` 类非常简洁。其私有数据成员代表 HTTP 响应的组成部分，例如响应状态码、状态消息、响应头和响应体。其公共接口包含返回相应数据成员值的方法，而私有方法则允许设置这些值。

接下来要定义的表示 HTTP 请求的 `HTTPRequest` 类被声明为 `HTTPResponse` 的友元类。我们稍后将看到 `HTTPRequest` 类的对象如何在收到响应消息时使用 `HTTPResponse` 类的私有方法来设置其数据成员的值。

#### HTTPRequest 类

接下来，我们定义表示 HTTP 请求的类。该类包含根据用户提供的信息构建 HTTP 请求消息、将其发送到服务器，然后接收并解析 HTTP 响应消息的功能。

该类处于我们应用程序的核心地位，因为大部分业务逻辑与网络流程都封装在此。

稍后，我们将定义代表 HTTP 客户端的 `HTTPClient` 类，该类的职责仅限于维护所有 `HTTPRequest` 对象共享的单个 `asio::io_service` 实例，并充当 `HTTPRequest` 对象的工厂。因此，我们将 `HTTPClient` 类声明为 `HTTPRequest` 类的友元，并将 `HTTPRequest` 类的构造函数设为私有：

```cpp
class HTTPRequest {
  friend class HTTPClient;

  static const unsigned int DEFAULT_PORT = 80;

  HTTPRequest(asio::io_service& ios, unsigned int id) :
    m_port(DEFAULT_PORT),
    m_id(id),
    m_callback(nullptr),
    m_sock(ios),
    m_resolver(ios),
    m_was_cancelled(false),
    m_ios(ios)
  {}
```

构造函数接受两个参数：对 `asio::io_service` 类对象的引用，以及名为 `id` 的无符号整数。后者包含请求的唯一标识符，由类的使用者指定，用于区分不同的请求对象。

然后，我们定义构成该类公共接口的方法：

```cpp
public:
  void set_host(const std::string& host) {
    m_host = host;
  }

  void set_port(unsigned int port) {
    m_port = port;
  }

  void set_uri(const std::string& uri) {
    m_uri = uri;
  }

  void set_callback(Callback callback) {
    m_callback = callback;
  }

  std::string get_host() const {
    return m_host;
  }

  unsigned int get_port() const {
    return m_port;
  }

  const std::string& get_uri() const {
    return m_uri;
  }

  unsigned int get_id() const {
    return m_id;
  }

  void execute() {
    // 确保前置条件成立
    assert(m_port > 0);
    assert(m_host.length() > 0);
    assert(m_uri.length() > 0);
    assert(m_callback != nullptr);

    // 准备域名解析查询
    asio::ip::tcp::resolver::query resolver_query(m_host,
      std::to_string(m_port),
      asio::ip::tcp::resolver::query::numeric_service);

    std::unique_lock<std::mutex>
      cancel_lock(m_cancel_mux);

    if (m_was_cancelled) {
      cancel_lock.unlock();
      on_finish(boost::system::error_code(
      asio::error::operation_aborted));
      return;
    }

    // 异步解析主机域名
    m_resolver.async_resolve(resolver_query,
      [this](const boost::system::error_code& ec,
      asio::ip::tcp::resolver::iterator iterator)
    {
      on_host_name_resolved(ec, iterator);
    });
  }

  void cancel() {
    std::unique_lock<std::mutex>
      cancel_lock(m_cancel_mux);

    m_was_cancelled = true;

    m_resolver.cancel();

    if (m_sock.is_open()) {
      m_sock.cancel();
    }
  }
```

公共接口包括允许使用者设置和获取 HTTP 请求参数的方法，例如运行服务器的主机 DNS 域名、协议端口号以及所请求资源的 URI。此外，还有一个方法允许设置在请求完成时调用的回调函数指针。

`execute()` 方法发起请求的异步执行链。同时，`cancel()` 方法允许在发起的请求完成之前将其取消。我们将在本配方的下一小节中详细考察这些方法的工作机制。

现在，我们定义包含大部分实现细节的一组私有方法。首先，我们定义用作异步 DNS 域名解析操作回调的方法：

```cpp
private:
  void on_host_name_resolved(
    const boost::system::error_code& ec,
    asio::ip::tcp::resolver::iterator iterator)
  {
    if (ec != 0) {
      on_finish(ec);
      return;
    }

    std::unique_lock<std::mutex>
      cancel_lock(m_cancel_mux);

    if (m_was_cancelled) {
      cancel_lock.unlock();
      on_finish(boost::system::error_code(
      asio::error::operation_aborted));
      return;
    }

    // 连接到目标主机
    asio::async_connect(m_sock,
      iterator,
      [this](const boost::system::error_code& ec,
      asio::ip::tcp::resolver::iterator iterator)
    {
      on_connection_established(ec, iterator);
    });
  }
```

然后，我们定义用作异步连接操作回调的方法，该操作在刚定义的 `on_host_name_resolved()` 方法中发起：

```cpp
  void on_connection_established(
    const boost::system::error_code& ec,
    asio::ip::tcp::resolver::iterator iterator)
  {
    if (ec != 0) {
      on_finish(ec);
      return;
    }

    // 组装 HTTP 请求消息
    m_request_buf += "GET " + m_uri + " HTTP/1.1
";

    // 添加必需的 Host 请求头
    m_request_buf += "Host: " + m_host + "
";

    m_request_buf += "
";

    std::unique_lock<std::mutex>
      cancel_lock(m_cancel_mux);

    if (m_was_cancelled) {
      cancel_lock.unlock();
      on_finish(boost::system::error_code(
      asio::error::operation_aborted));
      return;
    }

    // 发送请求消息
    asio::async_write(m_sock,
      asio::buffer(m_request_buf),
      [this](const boost::system::error_code& ec,
      std::size_t bytes_transferred)
    {
      on_request_sent(ec, bytes_transferred);
    });
  }
```

下一个定义的方法 `on_request_sent()` 是在请求消息发送到服务器后调用的回调函数：

```cpp
  void on_request_sent(const boost::system::error_code& ec,
    std::size_t bytes_transferred)
  {
    if (ec != 0) {
      on_finish(ec);
      return;
    }

    m_sock.shutdown(asio::ip::tcp::socket::shutdown_send);

    std::unique_lock<std::mutex>
      cancel_lock(m_cancel_mux);

    if (m_was_cancelled) {
      cancel_lock.unlock();
      on_finish(boost::system::error_code(
      asio::error::operation_aborted));
      return;
    }

    // 读取响应状态行
    asio::async_read_until(m_sock,
      m_response.get_response_buf(),
      "
",
      [this](const boost::system::error_code& ec,
      std::size_t bytes_transferred)
    {
      on_status_line_received(ec, bytes_transferred);
    });
  }
```

接着，我们需要另一个回调方法，该方法在从服务器接收到响应消息的第一部分（即状态行）时被调用：

```cpp
  void on_status_line_received(
    const boost::system::error_code& ec,
    std::size_t bytes_transferred)
  {
    if (ec != 0) {
      on_finish(ec);
      return;
    }

    // 解析状态行
    std::string http_version;
    std::string str_status_code;
    std::string status_message;

    std::istream response_stream(
    &m_response.get_response_buf());
    response_stream >> http_version;

    if (http_version != "HTTP/1.1"){
      // 响应协议版本不正确
      on_finish(http_errors::invalid_response);
      return;
    }

    response_stream >> str_status_code;

    // 将状态码转换为整数
    unsigned int status_code = 200;

    try {
      status_code = std::stoul(str_status_code);
    }
    catch (std::logic_error&) {
      // 状态码格式错误
      on_finish(http_errors::invalid_response);
      return;
    }

    std::getline(response_stream, status_message, '
');
    // 从缓冲区移除 '
' 符号
    response_stream.get();

    m_response.set_status_code(status_code);
    m_response.set_status_message(status_message);

    std::unique_lock<std::mutex>
      cancel_lock(m_cancel_mux);

    if (m_was_cancelled) {
      cancel_lock.unlock();
      on_finish(boost::system::error_code(
      asio::error::operation_aborted));
      return;
    }

    // 此时状态行已成功接收并解析
    // 接下来读取响应头块
    asio::async_read_until(m_sock,
      m_response.get_response_buf(),
      "

",
      [this](
      const boost::system::error_code& ec,
      std::size_t bytes_transferred)
    {
      on_headers_received(ec, bytes_transferred);
    });
  }
```

现在，我们定义用作回调的方法，当响应消息的下一部分——响应头块——从服务器到达时调用。我们将其命名为 `on_headers_received()`：

```cpp
  void on_headers_received(const boost::system::error_code& ec,
    std::size_t bytes_transferred)
  {
    if (ec != 0) {
      on_finish(ec);
      return;
    }

    // 解析并存储各个头部字段
    std::string header, header_name, header_value;
    std::istream response_stream(
    &m_response.get_response_buf());

    while (true) {
      std::getline(response_stream, header, '
');

      // 从流中移除 
 符号
      response_stream.get();

      if (header == "")
        break;

      size_t separator_pos = header.find(':');
      if (separator_pos != std::string::npos) {
        header_name = header.substr(0, separator_pos);

        if (separator_pos < header.length() - 1)
          header_value = header.substr(separator_pos + 1);
        else
          header_value = "";

        m_response.add_header(header_name, header_value);
      }
    }

    std::unique_lock<std::mutex>
      cancel_lock(m_cancel_mux);

    if (m_was_cancelled) {
      cancel_lock.unlock();
      on_finish(boost::system::error_code(
      asio::error::operation_aborted));
      return;
    }

    // 现在我们开始读取响应体
    asio::async_read(m_sock,
      m_response.get_response_buf(),
      [this](
      const boost::system::error_code& ec,
      std::size_t bytes_transferred)
    {
      on_response_body_received(ec, bytes_transferred);
    });

    return;
  }
```

此外，我们还需要一个处理响应最后一部分——响应体的方法。以下方法用作回调，在响应体数据从服务器到达后调用：

```cpp
  void on_response_body_received(
    const boost::system::error_code& ec,
    std::size_t bytes_transferred)
  {
    if (ec == asio::error::eof)
      on_finish(boost::system::error_code());
    else
      on_finish(ec);
  }
```

最后，我们定义 `on_finish()` 方法，它是从 `execute()` 方法开始的所有执行路径（包括出错路径）的最终汇合点。该方法在请求完成（无论是成功还是失败）时被调用，其目的是调用 `HTTPRequest` 类使用者提供的回调函数以通知请求完成：

```cpp
  void on_finish(const boost::system::error_code& ec)
  {
    if (ec != 0) {
      std::cout << "Error occured! Error code = "
        << ec.value()
        << ". Message: " << ec.message();
    }

    m_callback(*this, m_response, ec);

    return;
  }
```

每个 `HTTPRequest` 类的实例都需要一些关联的数据字段。在此我们声明该类对应的数据成员：

```cpp
private:
  // 请求参数
  std::string m_host;
  unsigned int m_port;
  std::string m_uri;

  // 对象唯一标识符
  unsigned int m_id;

  // 请求完成时调用的回调函数指针
  Callback m_callback;

  // 存放请求消息的缓冲区
  std::string m_request_buf;

  asio::ip::tcp::socket m_sock;
  asio::ip::tcp::resolver m_resolver;

  HTTPResponse m_response;

  bool m_was_cancelled;
  std::mutex m_cancel_mux;

  asio::io_service& m_ios;
};
```

#### HTTPClient 类

应用程序中最后一个需要的类负责以下三项职能：
- 确立线程调度策略
- 在运行 Boost.Asio 事件循环并分发异步操作完成事件的线程池中创建和销毁线程
- 充当 `HTTPRequest` 对象的工厂

我们将此类命名为 `HTTPClient`：

```cpp
class HTTPClient {
public:
  HTTPClient(){
    m_work.reset(new boost::asio::io_service::work(m_ios));

    m_thread.reset(new std::thread([this](){
      m_ios.run();
    }));
  }

  std::shared_ptr<HTTPRequest>
  create_request(unsigned int id)
  {
    return std::shared_ptr<HTTPRequest>(
    new HTTPRequest(m_ios, id));
  }

  void close() {
    // 销毁 work 对象
    m_work.reset(NULL);

    // 等待 I/O 线程退出
    m_thread->join();
  }

private:
  asio::io_service m_ios;
  std::unique_ptr<boost::asio::io_service::work> m_work;
  std::unique_ptr<std::thread> m_thread;
};
```

#### 回调函数与 main() 入口函数

至此，我们已经拥有了包含三个类和若干辅助数据类型的基本 HTTP 客户端。现在，我们将定义两个不属于客户端本身、但演示如何使用它通过 HTTP 协议与服务器通信的函数。第一个函数用作回调，在请求完成时调用。其签名必须与之前定义的函数指针类型 `Callback` 相匹配。我们将回调函数命名为 `handler()`：

```cpp
void handler(const HTTPRequest& request,
  const HTTPResponse& response,
  const system::error_code& ec)
{
  if (ec == 0) {
    std::cout << "Request #" << request.get_id()
      << " has completed. Response: "
      << response.get_response().rdbuf();
  }
  else if (ec == asio::error::operation_aborted) {
    std::cout << "Request #" << request.get_id()
      << " has been cancelled by the user."
      << std::endl;
  }
  else {
    std::cout << "Request #" << request.get_id()
      << " failed! Error code = " << ec.value()
      << ". Error message = " << ec.message()
      << std::endl;
  }

  return;
}
```

第二个也是最后一个需要定义的函数是 `main()` 应用程序入口函数，它使用 HTTP 客户端向服务器发送 HTTP 请求：

```cpp
int main()
{
  try {
    HTTPClient client;

    std::shared_ptr<HTTPRequest> request_one =
      client.create_request(1);

    request_one->set_host("localhost");
    request_one->set_uri("/index.html");
    request_one->set_port(3333);
    request_one->set_callback(handler);

    request_one->execute();

    std::shared_ptr<HTTPRequest> request_two =
      client.create_request(2);

    request_two->set_host("localhost");
    request_two->set_uri("/example.html");
    request_two->set_port(3333);
    request_two->set_callback(handler);

    request_two->execute();

    request_two->cancel();

    // 暂停 15 秒，让请求有充分时间执行完成
    std::this_thread::sleep_for(std::chrono::seconds(15));

    // 关闭客户端并退出应用程序
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

现在让我们考察 HTTP 客户端的工作原理。该应用程序由五个组件构成，其中包括三个类（`HTTPClient`、`HTTPRequest` 和 `HTTPResponse`）以及两个函数（`handler()` 回调函数和 `main()` 应用程序入口函数）。让我们分别了解每个组件的工作方式。

#### HTTPClient 类

类的构造函数首先创建一个 `asio::io_service::work` 对象的实例，以确保当没有未决的异步操作时，运行事件循环的线程不会退出该循环。然后，通过在 `m_ios` 对象上调用 `run()` 方法生成控制线程并将其加入池中。这就是 `HTTPClient` 类执行其第一项以及第二项部分职责的地方：确立线程策略并向池中添加工作线程。

`HTTPClient` 类的第三项职责——充当表示 HTTP 请求的对象的工厂——在其公共方法 `create_request()` 中实现。该方法在堆内存中创建 `HTTPRequest` 类的实例，并返回指向它的智能指针 `std::shared_ptr` 对象。作为输入参数，该方法接受一个整数值，代表分配给新创建请求对象的唯一标识符。该标识符用于区分不同的请求对象。

公共接口中的 `close()` 方法销毁 `asio::io_service::work` 对象，从而允许线程在所有挂起操作完成后立即退出事件循环。该方法会阻塞等待，直到所有线程退出完毕。

#### HTTPRequest 类

让我们首先通过检查 `HTTPRequest` 类的数据成员及其用途来了解其行为。`HTTPRequest` 类包含 12 个数据成员，其中包括：
- 请求参数：`std::string m_host`、`unsigned int m_port`、`std::string m_uri`
- 请求的唯一标识符：`unsigned int m_id`
- 使用者提供的回调函数指针，在请求完成时调用：`Callback m_callback`
- 用于存放 HTTP 请求消息的字符串缓冲区：`std::string m_request_buf`
- 用于与服务器通信的套接字对象：`asio::ip::tcp::socket m_sock`
- 用于解析用户提供的服务器主机 DNS 域名的解析器对象：`asio::ip::tcp::resolver m_resolver`
- 表示从服务器接收到的响应的 `HTTPResponse` 实例：`HTTPResponse m_response`
- 支持请求取消功能的布尔标志和互斥锁对象：`bool m_was_cancelled` 和 `std::mutex m_cancel_mux`
- 解析器和套接字对象所需的对 `asio::io_service` 类实例的引用：`asio::io_service& m_ios`（该单一实例由 `HTTPClient` 对象维护）

`HTTPRequest` 对象的实例代表单个 HTTP GET 请求。该类的设计使得发送请求需要经过两个步骤：首先，通过在对象上调用相应的 setter 方法设置请求参数以及请求完成时调用的回调函数；然后作为第二步，调用 `execute()` 方法发起请求的执行。当请求完成时，回调函数被触发。

`set_host()`、`set_port()`、`set_uri()` 和 `set_callback()` 方法允许设置服务器主机的 DNS 域名、端口号、所请求资源的 URI 以及回调函数。每个方法接受一个参数并将其值存储在 `HTTPRequest` 对象的对应数据成员中。

`get_host()`、`get_port()` 和 `get_uri()` getter 方法返回对应 setter 设置的值。`get_id()` getter 方法返回在实例化时传递给构造函数的请求对象唯一标识符。

`execute()` 方法通过发起一系列异步操作来开始请求的执行。每个异步操作执行请求执行流程中的一个步骤：

1. **DNS 域名解析**：由于请求对象中的服务器主机是用 DNS 域名（而不是 IP 地址）表示的，在向服务器发送请求消息之前，必须先将指定的 DNS 域名解析转换为 IP 地址。因此，请求执行的第一步是 DNS 解析。`execute()` 方法首先准备解析查询对象，然后调用解析器对象的 `async_resolve()` 方法，指定 `HTTPRequest` 类的私有方法 `on_host_name_resolved()` 作为操作完成回调。
2. **异步连接**：当服务器主机 DNS 域名解析完成后，`on_host_name_resolved()` 方法被调用。该方法接收两个参数：表示操作状态的错误码，以及可用于遍历解析所得端点列表的迭代器。`on_host_name_resolved()` 通过调用 `asio::async_connect()` 自由函数发起序列中的下一个异步操作，将套接字对象 `m_sock` 和迭代器传递给它，以便套接字连接到第一个有效端点。`on_connection_established()` 方法被指定为异步连接完成的回调。
3. **发送请求消息**：当异步连接操作完成时，`on_connection_established()` 方法被调用。传入的第一个参数 `ec` 表示操作完成状态；若值为 0，表示套接字已成功连接到其中一个端点。该方法使用存储在 `HTTPRequest` 对应数据成员中的请求参数构造 HTTP GET 请求消息。接着，调用 `asio::async_write()` 自由函数将构造好的请求消息异步发送给服务器。私有方法 `on_request_sent()` 被指定为 `asio::async_write()` 操作完成时的回调。
4. **关闭发送端并等待状态行**：请求发送成功后，客户端应用程序必须通过关闭套接字的发送端来告知服务器完整请求已发送完毕且客户端不会再发送任何数据。随后客户端必须等待服务器返回响应消息。这正是 `on_request_sent()` 方法所做的事情。它首先调用套接字对象的 `shutdown()` 方法，传入 `asio::ip::tcp::socket::shutdown_send`；然后调用 `asio::async_read_until()` 自由函数接收来自服务器的响应。
   由于响应可能非常庞大且我们事先不知道其大小，我们不希望一次性读取全部数据。我们首先只想读取 HTTP 响应状态行；在对其进行分析之后，再决定是继续读取响应的其余部分还是将其丢弃。因此，我们将指示 HTTP 响应状态行结束的 `
` 符号序列作为定界符传递给 `asio::async_read_until()`。`on_status_line_received()` 方法被指定为完成回调。
5. **解析状态行与读取头部**：接收到状态行后，`on_status_line_received()` 方法被调用。该方法解析状态行，从中提取 HTTP 协议版本、响应状态码和响应状态消息。每个值都会经过正确性验证：我们期望 HTTP 版本为 1.1，否则认为响应不正确并中断请求；状态码必须是合法的整数值，若字符串转换失败同样中断请求。如果状态行合法，则提取的状态码和状态消息被存入 `m_response` 成员对象中，并启动下一个异步操作：调用 `asio::async_read_until()` 以 `

` 作为定界符读取响应头块，并将 `on_headers_received()` 指定为回调。
6. **解析头部与读取响应体**：当响应头块接收完毕时，`on_headers_received()` 被调用。该方法将头部块解析拆分为独立的键值对，并存入 `m_response` 中。随后，通过调用 `asio::async_read()` 自由函数发起读取响应体数据的异步操作，并将 `on_response_body_received()` 指定为回调。
7. **响应完成通知**：最终，`on_response_body_received()` 被调用，通知整条响应消息已接收完毕。由于 HTTP 服务器在发送完响应消息的最后一部分后可能会立即关闭其套接字的发送端，因此在客户端，最后一次读取操作可能会以等于 `asio::error::eof` 的错误码完成。这不应被视为实际错误，而应视为正常结束事件。因此，如果 `ec` 等于 `asio::error::eof`，我们向 `on_finish()` 传递默认构造的 `boost::system::error_code` 对象以表示请求成功完成。否则传入原始错误码。`on_finish()` 进而调用使用者提供的回调函数。当回调函数返回后，请求处理即告结束。

#### HTTPResponse 类

`HTTPResponse` 类没有提供复杂的业务逻辑。它更像是一个简单的数据结构，包含表示响应不同部分的数据成员，并定义了允许获取和设置对应成员值的 getter 与 setter 方法。

所有 setter 方法均为私有，只有 `HTTPRequest` 类的对象才有权访问它们（因为 `HTTPRequest` 被声明为 `HTTPResponse` 的友元类）。每个 `HTTPRequest` 对象都拥有一个 `HTTPResponse` 类型的成员。`HTTPRequest` 对象在接收并解析来自 HTTP 服务器的响应时，负责填充其 `HTTPResponse` 成员对象的各个属性。

#### 回调函数与 main() 入口函数

这些函数演示了如何使用 `HTTPClient` 和 `HTTPRequest` 类向 HTTP 服务器发送 GET 请求，以及如何使用 `HTTPResponse` 类获取响应。

`main()` 函数首先创建 `HTTPClient` 类的实例，然后用它创建两个 `HTTPRequest` 类的实例，每个实例代表一个独立的 GET HTTP 请求。两个请求对象都被设置了相应的参数并随后启动执行。但在第二个请求刚刚启动执行后，便立即调用其 `cancel()` 方法将其取消。

用作两个请求对象完成回调的 `handler()` 函数在每个请求完成时被调用，无论请求是成功、失败还是被取消。`handler()` 函数分析传入的错误码、请求对象和响应对象，并将相应信息打印到标准输出流中。

### 参见

- 第 3 章《实现客户端应用》中的“实现异步 TCP 客户端”配方提供了关于如何实现异步 TCP 客户端的更多信息。
- 第 6 章《高级与进阶主题》中的“使用定时器”配方演示了如何使用 Boost.Asio 提供的定时器。定时器可用于实现异步操作超时机制。

## 实现 HTTP 服务端应用程序

如今，市面上有许多成熟的 HTTP 服务端应用程序。然而在某些情况下，我们需要实现自定义的 HTTP 服务器。这可能是一个小巧简便的服务器，支持 HTTP 协议的特定子集（可能带有自定义扩展）；或者它并不是标准的 HTTP 服务器，但支持与 HTTP 类似或基于 HTTP 的通信协议。

在本配方中，我们将考虑使用 Boost.Asio 实现一个基础的 HTTP 服务端应用程序。以下是我们的应用程序必须满足的要求：

- 支持 HTTP 1.1 协议规范
- 支持 GET 请求方法
- 能够并行处理多个请求，即它应该是一个异步并发服务器

事实上，我们已经在前面的章节中实现过部分满足上述要求的服务端应用。在第 4 章《构建服务端应用》中，“实现异步 TCP 服务器”配方演示了如何实现一个异步并发 TCP 服务器，该服务器根据一个虚构的应用层协议与客户端通信。所有的通信功能和协议细节都被封装在名为 `Service` 的单个类中。该配方中定义的所有其他类和函数在设计上都属于基础设施性质，与具体的应用层协议解耦。因此，本配方将基于第 4 章中的实现，我们在此仅需考虑 `Service` 类的实现，所有其他组件保持完全相同。

> [!WARNING]
> 请注意，在本配方中我们未深入涉及应用程序的安全防护细节。在将服务器开放到公网环境之前，请务必确保服务器具备完善的安全防护，以防因潜在的安全漏洞而被恶意攻击者利用。

现在让我们进入 HTTP 服务端应用程序的实现。

### 准备工作

由于本配方中展示的应用程序基于第 4 章《构建服务端应用》中“实现异步 TCP 服务器”配方展示的应用程序，因此在继续阅读本配方之前，有必要先熟悉该配方。

### 操作步骤

我们从包含所需数据类型和函数的头文件开始编写应用程序：

```cpp
#include <boost/asio.hpp>
#include <boost/filesystem.hpp>

#include <fstream>
#include <atomic>
#include <thread>
#include <iostream>

using namespace boost;
```

接下来，我们开始定义提供 HTTP 协议实现的 `Service` 类。首先，我们声明一个包含 HTTP 状态码和状态描述消息的静态常量映射表。该映射表的具体定义将在 `Service` 类定义之后给出：

```cpp
class Service {
  static const std::map<unsigned int, std::string> http_status_table;
```

类的构造函数接受单个参数——指向连接到客户端的套接字实例的智能指针 `shared_ptr`。以下是构造函数的定义：

```cpp
public:
  Service(std::shared_ptr<boost::asio::ip::tcp::socket> sock) :
    m_sock(sock),
    m_request(4096),
    m_response_status_code(200), // 默认假定成功
    m_resource_size_bytes(0)
  {};
```

接下来，我们定义构成 `Service` 类公共接口的唯一方法。该方法与连接到套接字（其指针已传递给 `Service` 类构造函数）的客户端发起异步通信会话：

```cpp
  void start_handling() {
    asio::async_read_until(*m_sock.get(),
      m_request,
      "
",
      [this](
      const boost::system::error_code& ec,
      std::size_t bytes_transferred)
    {
      on_request_line_received(ec, bytes_transferred);
    });
  }
```

然后，我们定义一组私有方法，用于接收和处理客户端发送的请求、解析并执行请求，并将响应发回客户端。首先，我们定义处理 HTTP 请求行的方法：

```cpp
private:
  void on_request_line_received(
    const boost::system::error_code& ec,
    std::size_t bytes_transferred)
  {
    if (ec != 0) {
      std::cout << "Error occured! Error code = "
        << ec.value()
        << ". Message: " << ec.message();

      if (ec == asio::error::not_found) {
        // 在请求消息中未找到定界符（请求行过长）
        m_response_status_code = 413;
        send_response();
        return;
      }
      else {
        // 遇到其他任何错误，关闭套接字并执行清理
        on_finish();
        return;
      }
    }

    // 解析请求行
    std::string request_line;
    std::istream request_stream(&m_request);
    std::getline(request_stream, request_line, '
');
    // 从缓冲区移除 '
' 符号
    request_stream.get();

    std::string request_method;
    std::istringstream request_line_stream(request_line);
    request_line_stream >> request_method;

    // 本服务器仅支持 GET 方法
    if (request_method.compare("GET") != 0) {
      // 不支持的方法
      m_response_status_code = 501;
      send_response();
      return;
    }

    request_line_stream >> m_requested_resource;

    std::string request_http_version;
    request_line_stream >> request_http_version;

    if (request_http_version.compare("HTTP/1.1") != 0) {
      // 不支持的 HTTP 版本或请求格式不正确
      m_response_status_code = 505;
      send_response();
      return;
    }

    // 此时请求行已成功接收并解析，接下来读取请求头
    asio::async_read_until(*m_sock.get(),
      m_request,
      "

",
      [this](
      const boost::system::error_code& ec,
      std::size_t bytes_transferred)
    {
      on_headers_received(ec, bytes_transferred);
    });

    return;
  }
```

接下来，我们定义处理并存储请求头部块的方法：

```cpp
  void on_headers_received(const boost::system::error_code& ec,
    std::size_t bytes_transferred)
  {
    if (ec != 0) {
      std::cout << "Error occured! Error code = "
        << ec.value()
        << ". Message: " << ec.message();

      if (ec == asio::error::not_found) {
        // 请求头过长，未找到定界符
        m_response_status_code = 413;
        send_response();
        return;
      }
      else {
        // 遇到其他任何错误，关闭套接字并清理
        on_finish();
        return;
      }
    }

    // 解析并存储请求头
    std::istream request_stream(&m_request);
    std::string header_name, header_value;

    while (!request_stream.eof()) {
      std::getline(request_stream, header_name, ':');
      if (!request_stream.eof()) {
        std::getline(request_stream, header_value, '
');

        // 从流中移除 
 符号
        request_stream.get();
        m_request_headers[header_name] = header_value;
      }
    }

    // 现在我们已获得处理请求所需的所有信息
    process_request();
    send_response();

    return;
  }
```

此外，我们还需要一个执行满足客户端请求所需动作的方法。我们定义 `process_request()` 方法，其目的是从文件系统中读取所请求资源的内容并存入缓冲区，以便回传给客户端：

```cpp
  void process_request() {
    // 读取文件（以指定根目录为例）
    std::string resource_file_path =
      std::string("D:\http_root") + m_requested_resource;

    if (!boost::filesystem::exists(resource_file_path)) {
      // 资源不存在
      m_response_status_code = 404;
      return;
    }

    std::ifstream resource_fstream(
      resource_file_path,
      std::ifstream::binary);

    if (!resource_fstream.is_open()) {
      // 无法打开文件，发生内部错误
      m_response_status_code = 500;
      return;
    }

    // 获取文件大小
    resource_fstream.seekg(0, std::ifstream::end);
    m_resource_size_bytes =
      static_cast<std::size_t>(resource_fstream.tellg());

    m_resource_buffer.reset(new char[m_resource_size_bytes]);

    resource_fstream.seekg(std::ifstream::beg);
    resource_fstream.read(m_resource_buffer.get(), m_resource_size_bytes);

    m_response_headers += std::string("content-length") +
      ": " +
      std::to_string(m_resource_size_bytes) +
      "
";
  }
```

最后，我们定义组装响应消息并将其发送给客户端的方法：

```cpp
  void send_response() {
    m_sock->shutdown(asio::ip::tcp::socket::shutdown_receive);

    auto status_line = http_status_table.at(m_response_status_code);

    m_response_status_line = std::string("HTTP/1.1 ") +
      status_line + "
";

    m_response_headers += "
";

    std::vector<asio::const_buffer> response_buffers;
    response_buffers.push_back(asio::buffer(m_response_status_line));

    if (m_response_headers.length() > 0) {
      response_buffers.push_back(asio::buffer(m_response_headers));
    }

    if (m_resource_size_bytes > 0) {
      response_buffers.push_back(
        asio::buffer(m_resource_buffer.get(), m_resource_size_bytes));
    }

    // 发起异步写入操作
    asio::async_write(*m_sock.get(),
      response_buffers,
      [this](
      const boost::system::error_code& ec,
      std::size_t bytes_transferred)
    {
      on_response_sent(ec, bytes_transferred);
    });
  }
```

当响应发送完成时，我们需要关闭套接字以通知客户端完整响应已发送且服务端不会再发送更多数据。为此我们定义 `on_response_sent()` 方法：

```cpp
  void on_response_sent(const boost::system::error_code& ec,
    std::size_t bytes_transferred)
  {
    if (ec != 0) {
      std::cout << "Error occured! Error code = "
        << ec.value()
        << ". Message: " << ec.message();
    }

    m_sock->shutdown(asio::ip::tcp::socket::shutdown_both);

    on_finish();
  }

  // 清理自身
  void on_finish() {
    delete this;
  }
```

当然，我们类中还需要一些数据成员。我们声明以下私有成员变量：

```cpp
private:
  std::shared_ptr<boost::asio::ip::tcp::socket> m_sock;
  boost::asio::streambuf m_request;
  std::map<std::string, std::string> m_request_headers;
  std::string m_requested_resource;
  std::unique_ptr<char[]> m_resource_buffer;
  unsigned int m_response_status_code;
  std::size_t m_resource_size_bytes;
  std::string m_response_headers;
  std::string m_response_status_line;
};
```

完成服务类定义的最后一件事，是定义前面声明的静态成员 `http_status_table` 并为其填充数据——HTTP 状态码及对应的状态描述消息：

```cpp
const std::map<unsigned int, std::string>
  Service::http_status_table =
{
  { 200, "200 OK" },
  { 404, "404 Not Found" },
  { 413, "413 Request Entity Too Large" },
  { 500, "500 Server Error" },
  { 501, "501 Not Implemented" },
  { 505, "505 HTTP Version Not Supported" }
};
```

至此，我们的 `Service` 类已经准备完毕。

### 工作原理

让我们首先分析 `Service` 类的数据成员，然后探讨其具体功能。`Service` 类包含以下非静态数据成员：
- `std::shared_ptr<boost::asio::ip::tcp::socket> m_sock`：指向连接到客户端的 TCP 套接字对象的共享指针。
- `boost::asio::streambuf m_request`：用于读取请求消息的流缓冲区。
- `std::map<std::string, std::string> m_request_headers`：解析 HTTP 请求头块后存放请求头的映射表。
- `std::string m_requested_resource`：客户端所请求资源的 URI。
- `std::unique_ptr<char[]> m_resource_buffer`：在作为响应消息的一部分发送给客户端之前，用于存放所请求资源内容的内存缓冲区。
- `unsigned int m_response_status_code`：HTTP 响应状态码。
- `std::size_t m_resource_size_bytes`：所请求资源内容的字节大小。
- `std::string m_response_headers`：包含格式规范的响应头块的字符串。
- `std::string m_response_status_line`：包含响应状态行的字符串。

了解了数据成员的用途后，让我们追踪其运行逻辑。在此我们仅探讨 `Service` 类的工作机制；服务端应用程序的所有其他组件及其工作方式已在第 4 章《构建服务端应用》中的“实现异步 TCP 服务器”配方中详述。

当客户端发起 TCP 连接请求且该请求在服务端被接受时（这发生在 `Acceptor` 类中），将创建 `Service` 类的一个实例，其构造函数会接收指向已连接到该客户端的 TCP 套接字对象的共享指针。指针存储在成员变量 `m_sock` 中。

此外，在构造 `Service` 对象期间，`m_request` 流缓冲区成员被初始化为大小 4096 字节，这限制了缓冲区的最大容量。限制请求缓冲区的大小是一项安全防范措施，有助于保护服务器免受恶意客户端发送极长虚假请求消息耗尽服务器内存的攻击。对于合法的正常请求，4096 字节的缓冲区绰绰有余。

构造 `Service` 对象后，`Acceptor` 类调用其 `start_handling()` 方法。从该方法开始，触发一系列异步方法调用，依次执行请求接收、处理和响应发送：

1. `start_handling()` 立即调用 `asio::async_read_until()` 发起异步读取操作，以接收客户端发送的 HTTP 请求行。`on_request_line_received()` 方法被指定为回调。
2. 当 `on_request_line_received()` 被调用时，首先检查错误码。如果错误码等于 `asio::error::not_found`，意味着从客户端接收到的字节数已超过缓冲区容量且仍未遇到请求行定界符（`
`）。该情况由 HTTP 状态码 413（请求实体过大）表示。我们将 `m_response_status_code` 设为 413 并调用 `send_response()` 将指示错误的响应发回客户端，此时请求处理结束。若遇到不可恢复的其他错误，则打印日志并调用 `on_finish()` 清理断开连接。
3. 若请求行成功接收，则解析出请求方法、URI 和 HTTP 版本。由于服务器仅支持 GET 方法，若不是 GET 则返回 501 状态码（未实现）；若协议版本不是 1.1 则返回 505 状态码。
4. 请求行解析成功后，调用 `asio::async_read_until()` 以 `

` 为定界符异步读取请求头块，并将 `on_headers_received()` 设为回调。
5. 在 `on_headers_received()` 中，头部键值对被解析并存入 `m_request_headers` 中。随后依次调用 `process_request()` 和 `send_response()`。
6. `process_request()` 检查文件系统中的对应资源文件。若文件不存在则设置状态码 404；若无法打开则设置 500；若读取成功则计算文件大小，在堆中分配相应大小的缓冲区将内容读入，并在响应头中添加 `Content-Length`。
7. `send_response()` 首先关闭套接字的接收端（指示不再接收数据），从 `http_status_table` 查找状态码对应的文本描述，组装状态行与头部，并构建一个由三个只读缓冲区（状态行、响应头、文件数据体）构成的组合缓冲区（`vector<asio::const_buffer>`）。然后调用 `asio::async_write()` 一并发送给客户端，回调设为 `on_response_sent()`。
8. 响应发送完毕后，`on_response_sent()` 关闭套接字的两端并调用 `on_finish()`。`on_finish()` 通过 `delete this;` 销毁当前的 `Service` 实例。至此，对该客户端的处理全部结束。

### 参见

- 第 4 章《构建服务端应用》中的“实现异步 TCP 服务器”配方提供了关于本配方所依托的异步 TCP 服务器实现的更多信息。
- 第 6 章《高级与进阶主题》中的“使用定时器”配方演示了如何使用 Boost.Asio 定时器实现超时机制。

## 为客户端应用添加 SSL/TLS 支持

当客户端应用程序需要传输敏感数据（如密码、信用卡号、个人隐私等）时，通常会使用 SSL/TLS 协议。SSL/TLS 协议允许客户端验证服务器身份并对数据进行加密。服务器身份验证确保数据将发送到预期的合法接收方；数据加密则保证即使传输途中的数据被拦截，窃听者也无法获知其内容。

本配方演示了如何使用 Boost.Asio 和 OpenSSL 库实现一个支持 SSL/TLS 协议的同步 TCP 客户端应用程序。我们以第 3 章《实现客户端应用》中的“实现同步 TCP 客户端”配方为基础，通过修改和新增部分代码来添加 SSL/TLS 支持。

### 准备工作

在开始本配方之前，必须已正确安装 OpenSSL 库，并在项目中配置好与其链接。关于 OpenSSL 的安装与链接步骤超出了本书范围，请参阅 OpenSSL 官方文档。

此外，建议先熟悉第 3 章《实现客户端应用》中的“实现同步 TCP 客户端”配方。

### 操作步骤

以下代码示例展示了支持 SSL/TLS 协议以验证服务器身份并加密传输数据的同步 TCP 客户端实现：

```cpp
#include <boost/asio.hpp>
#include <boost/asio/ssl.hpp>
#include <iostream>

using namespace boost;
```

`<boost/asio/ssl.hpp>` 头文件包含了与 OpenSSL 库集成所需的核心类型与函数。

接下来，我们定义充当支持 SSL/TLS 的同步 TCP 客户端的类 `SyncSSLClient`：

```cpp
class SyncSSLClient {
public:
  SyncSSLClient(const std::string& raw_ip_address,
    unsigned short port_num) :
    m_ep(asio::ip::address::from_string(raw_ip_address),
    port_num),
    m_ssl_context(asio::ssl::context::sslv23_client),
    m_ssl_stream(m_ios, m_ssl_context)
  {
    // 设置验证模式，指定我们要验证对端身份
    m_ssl_stream.set_verify_mode(asio::ssl::verify_peer);

    // 设置证书验证回调函数
    m_ssl_stream.set_verify_callback([this](
      bool preverified,
      asio::ssl::verify_context& context)->bool{
      return on_peer_verify(preverified, context);
    });
  }

  void connect() {
    // 首先连接底层 TCP 套接字
    m_ssl_stream.lowest_layer().connect(m_ep);

    // 执行 SSL 握手
    m_ssl_stream.handshake(asio::ssl::stream_base::client);
  }

  void close() {
    // 忽略关闭过程中可能发生的错误
    boost::system::error_code ec;

    m_ssl_stream.shutdown(ec); // 关闭 SSL 连接

    // 关闭底层套接字
    m_ssl_stream.lowest_layer().shutdown(
      boost::asio::ip::tcp::socket::shutdown_both, ec);

    m_ssl_stream.lowest_layer().close(ec);
  }

  std::string emulate_long_computation_op(
    unsigned int duration_sec) {

    std::string request = "EMULATE_LONG_COMP_OP "
      + std::to_string(duration_sec)
      + "
";

    send_request(request);
    return receive_response();
  };

private:
  bool on_peer_verify(bool preverified,
    asio::ssl::verify_context& context)
  {
    // 在此处验证证书并返回验证结果
    return true;
  }

  void send_request(const std::string& request) {
    asio::write(m_ssl_stream, asio::buffer(request));
  }

  std::string receive_response() {
    asio::streambuf buf;
    asio::read_until(m_ssl_stream, buf, '
');

    std::string response;
    std::istream input(&buf);
    std::getline(input, response);

    return response;
  }

private:
  asio::io_service m_ios;
  asio::ip::tcp::endpoint m_ep;

  asio::ssl::context m_ssl_context;
  asio::ssl::stream<asio::ip::tcp::socket> m_ssl_stream;
};
```

现在我们实现 `main()` 入口函数，使用 `SyncSSLClient` 类来验证服务器并基于 SSL/TLS 协议安全地与其通信：

```cpp
int main()
{
  const std::string raw_ip_address = "127.0.0.1";
  const unsigned short port_num = 3333;

  try {
    SyncSSLClient client(raw_ip_address, port_num);

    // 同步连接与握手
    client.connect();

    std::cout << "Sending request to the server... "
      << std::endl;

    std::string response =
      client.emulate_long_computation_op(10);

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

示例客户端应用程序包含两个主要组件：`SyncSSLClient` 类，以及使用该类通过 SSL/TLS 协议与服务端通信的 `main()` 入口函数。

#### SyncSSLClient 类

`SyncSSLClient` 类是应用程序的关键组件，它实现了核心通信功能。该类拥有以下四个私有数据成员：
- `asio::io_service m_ios`：提供对套接字所用操作系统通信服务的访问。
- `asio::ip::tcp::endpoint m_ep`：指定服务端应用程序的网络端点。
- `asio::ssl::context m_ssl_context`：表示 SSL 上下文的对象，本质上是对 OpenSSL 库定义的 `SSL_CTX` 结构的封装，包含 SSL/TLS 通信所需的全局配置与参数。
- `asio::ssl::stream<asio::ip::tcp::socket> m_ssl_stream`：包装了 TCP 套接字并实现了所有 SSL/TLS 加密通信操作的流对象。

类的构造函数接受目标服务器的 IP 地址和端口号，并在初始化列表中实例化 `m_ep`。接着构造 `m_ssl_context` 和 `m_ssl_stream`。我们将 `asio::ssl::context::sslv23_client` 传递给上下文构造函数，指示该上下文仅用于客户端角色，并且支持包括 SSL 与 TLS 各版本在内的多种安全协议（对应 OpenSSL 的 `SSLv23_client_method()`）。

在构造函数体内配置 SSL 流：首先将对端验证模式设置为 `asio::ssl::verify_peer`，要求在握手期间验证服务端证书；随后设置验证回调函数，在收到证书链时对每个证书依次调用。在示例中，`on_peer_verify()` 仅简单返回 `true` 作为演示。

`SyncSSLClient` 的公共接口包含三个方法：
- `connect()` 执行两项操作：首先通过 `m_ssl_stream.lowest_layer().connect(m_ep)` 连接底层 TCP 套接字；连接成功后调用 `m_ssl_stream.handshake(asio::ssl::stream_base::client)` 发起客户端 SSL 握手。该方法为同步阻塞调用，直至握手成功或失败返回。握手完成后，安全信道建立完毕。
- `close()` 在 `m_ssl_stream` 上调用 `shutdown()` 关闭 SSL 会话，随后关闭并清理底层 TCP 套接字。
- `emulate_long_computation_op()` 负责应用层协议数据的读写。值得注意的是，该方法内部调用的 `send_request()` 和 `receive_response()` 与普通的同步 TCP 客户端几乎完全一致，唯一的区别在于：在 `SyncSSLClient` 中，传递给 `asio::write()` 和 `asio::read_until()` 的是 `m_ssl_stream`（SSL 加密流），而不是普通的套接字对象。所有底层加密和解密操作均由该流透明完成。

#### main() 入口函数

`main()` 函数作为 `SyncSSLClient` 的使用者，获取服务器 IP 和端口号后实例化客户端对象，调用 `connect()` 建立安全连接，发送长计算模拟请求并等待响应打印结果，最后调用 `close()` 安全退出。

### 参见

- 第 3 章《实现客户端应用》中的“实现同步 TCP 客户端”配方提供了关于同步客户端基础架构的更多信息。

## 为服务端应用添加 SSL/TLS 支持

当服务端提供的服务涉及客户端向服务器发送敏感数据（如密码、信用卡信息、身份信息等）时，通常需要向服务端应用添加 SSL/TLS 协议支持。此时，添加 SSL/TLS 允许客户端验证服务器的数字身份，并建立加密信道以确保数据在传输过程中的安全性。

本配方演示了如何使用 Boost.Asio 和 OpenSSL 库实现一个支持 SSL/TLS 协议的同步迭代型 TCP 服务端应用程序。我们以第 4 章《构建服务端应用》中的“实现同步迭代型 TCP 服务器”配方为基础，通过针对性修改和扩展来实现 SSL/TLS 服务端。

### 准备工作

在开始本配方之前，必须已安装 OpenSSL 库并配置好工程链接。此外，由于需要配置服务器证书、私钥以及 Diffie-Hellman 参数文件（如 `server.crt`、`server.key`、`dhparams.pem`），应提前准备好这些安全凭据文件。

同时，建议先阅读第 4 章《构建服务端应用》中的“实现同步迭代型 TCP 服务器”配方。

### 操作步骤

以下代码示例展示了支持 SSL/TLS 协议的同步 TCP 服务端实现：

```cpp
#include <boost/asio.hpp>
#include <boost/asio/ssl.hpp>

#include <thread>
#include <atomic>
#include <iostream>

using namespace boost;
```

`<boost/asio/ssl.hpp>` 包含了 OpenSSL 集成所需的类型和函数。

接下来，我们定义负责通过读取请求、处理业务并发送响应来服务单个客户端的 `Service` 类：

```cpp
class Service {
public:
  Service(){}

  void handle_client(
    asio::ssl::stream<asio::ip::tcp::socket>& ssl_stream)
  {
    try {
      // 阻塞直到 SSL 握手完成
      ssl_stream.handshake(asio::ssl::stream_base::server);

      asio::streambuf request;
      asio::read_until(ssl_stream, request, '
');

      // 模拟请求处理
      int i = 0;
      while (i != 1000000)
        i++;

      std::this_thread::sleep_for(std::chrono::milliseconds(500));

      // 发送响应
      std::string response = "Response
";
      asio::write(ssl_stream, asio::buffer(response));
    }
    catch (system::system_error &e) {
      std::cout << "Error occured! Error code = "
        << e.code() << ". Message: "
        << e.what();
    }
  }
};
```

接下来，我们定义一个表示高阶接收器概念的 `Acceptor` 类。该类负责接受来自客户端的连接请求，并实例化 `Service` 类对象来为已连接的客户端提供服务：

```cpp
class Acceptor {
public:
  Acceptor(asio::io_service& ios, unsigned short port_num) :
    m_ios(ios),
    m_acceptor(m_ios,
    asio::ip::tcp::endpoint(
    asio::ip::address_v4::any(),
    port_num)),
    m_ssl_context(asio::ssl::context::sslv23_server)
  {
    // 配置 SSL 上下文选项
    m_ssl_context.set_options(
      boost::asio::ssl::context::default_workarounds
      | boost::asio::ssl::context::no_sslv2
      | boost::asio::ssl::context::single_dh_use);

    m_ssl_context.set_password_callback(
      [this](std::size_t max_length,
      asio::ssl::context::password_purpose purpose)
      -> std::string
        {return get_password(max_length, purpose);}
    );

    m_ssl_context.use_certificate_chain_file("server.crt");
    m_ssl_context.use_private_key_file("server.key",
      boost::asio::ssl::context::pem);
    m_ssl_context.use_tmp_dh_file("dhparams.pem");

    // 开始监听传入的连接请求
    m_acceptor.listen();
  }

  void accept() {
    asio::ssl::stream<asio::ip::tcp::socket>
      ssl_stream(m_ios, m_ssl_context);

    m_acceptor.accept(ssl_stream.lowest_layer());

    Service svc;
    svc.handle_client(ssl_stream);
  }

private:
  std::string get_password(std::size_t max_length,
    asio::ssl::context::password_purpose purpose) const
  {
    return "pass";
  }

private:
  asio::io_service& m_ios;
  asio::ip::tcp::acceptor m_acceptor;

  asio::ssl::context m_ssl_context;
};
```

现在我们定义代表服务端核心控制逻辑的 `Server` 类：

```cpp
class Server {
public:
  Server() : m_stop(false) {}

  void start(unsigned short port_num) {
    m_thread.reset(new std::thread([this, port_num]() {
      run(port_num);
    }));
  }

  void stop() {
    m_stop.store(true);
    m_thread->join();
  }

private:
  void run(unsigned short port_num) {
    Acceptor acc(m_ios, port_num);

    while (!m_stop.load()) {
      acc.accept();
    }
  }

  std::unique_ptr<std::thread> m_thread;
  std::atomic<bool> m_stop;
  asio::io_service m_ios;
};
```

最后，我们实现演示如何使用 `Server` 类的 `main()` 入口函数：

```cpp
int main()
{
  unsigned short port_num = 3333;

  try {
    Server srv;
    srv.start(port_num);

    std::this_thread::sleep_for(std::chrono::seconds(60));

    srv.stop();
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

示例服务端应用程序由四个组件构成：`Service`、`Acceptor` 和 `Server` 类，以及演示如何运行服务器的 `main()` 函数。由于 `Server` 类与 `main()` 函数的代码和功能与第 4 章中的基础版本完全相同，在此我们只聚焦讨论经过 SSL/TLS 升级的 `Service` 和 `Acceptor` 类。

#### Service 类

`Service` 类是应用的关键业务组件，实现了客户端实际所需的服务逻辑。

该类包含单个 `handle_client()` 方法，接收对包装了底层 TCP 套接字的 `asio::ssl::stream<asio::ip::tcp::socket>` 对象的引用作为输入参数。

方法首先调用 `ssl_stream.handshake(asio::ssl::stream_base::server)` 执行服务端 SSL/TLS 握手。该方法是同步阻塞的，直至握手完成或出错。

握手成功后，使用 `asio::read_until()` 从加密流中读取以换行符 `
` 结尾的请求消息。随后进行请求处理（示例中为计数循环并睡眠 500 毫秒），最后使用 `asio::write()` 将响应写回加密流。所有 Boost.Asio 异常都在方法内部捕获处理，以确保单个客户端通信失败不会导致整个服务器崩溃。

与第 4 章的基础版本相比，核心区别在于：`handle_client()` 在 SSL 流（而非原始 TCP 套接字）上执行 I/O 操作，且在读取请求前显式增加了服务端的 SSL/TLS 握手阶段。

#### Acceptor 类

`Acceptor` 类负责服务端的基础连接管理。每个对象持有一个 `asio::ssl::context` 类的实例 `m_ssl_context`。

在构造函数中，我们将 `asio::ssl::context::sslv23_server` 传入 `m_ssl_context`，表示该上下文仅用于服务端并支持多种安全协议。随后在构造函数中进行全面的 SSL 配置：
- 设置规避已知 Bug 与禁用陈旧协议的选项（`default_workarounds | no_sslv2 | single_dh_use`）
- 设置私钥密码回调函数
- 加载证书链文件（`server.crt`）、私钥文件（`server.key`）以及临时 Diffie-Hellman 参数文件（`dhparams.pem`）
- 调用底层接收器的 `listen()` 方法开始监听传入连接请求

`Acceptor` 暴露公共的 `accept()` 方法。该方法首先实例化基于当前 SSL 上下文的 `ssl_stream` 对象；然后调用 `m_acceptor.accept(ssl_stream.lowest_layer())` 接受底层 TCP 连接；连接成功后，实例化 `Service` 对象并调用其 `handle_client(ssl_stream)` 开始加密通信与业务处理。

### 参见

- 第 4 章《构建服务端应用》中的“实现同步迭代型 TCP 服务器”配方提供了关于服务端基础框架的更多信息。
