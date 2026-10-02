// ==============================================================================
// 02_async_tcp_echo.cpp
// 典范异步 TCP Echo 服务器（基于 std::enable_shared_from_this 生命周期绑定）
//
// 对应知识点：
//   - Ch7 内存管理: std::enable_shared_from_this、std::shared_ptr 在异步回调中的延展
//   - SESSION_LIFECYCLE.md: 解决异步操作与栈帧生命周期错配导致的 use-after-free
//   - Asio 核心概念: 异步读写 async_read_some / async_write、Lambda 按值捕获 self
// ==============================================================================

#include <iostream>
#include <memory>
#include <utility>
#include <asio.hpp>

using asio::ip::tcp;

// 会话类：继承 std::enable_shared_from_this<Session>
// 获得从自身安全创建 std::shared_ptr 的能力
class Session : public std::enable_shared_from_this<Session> {
 public:
  explicit Session(tcp::socket socket) : socket_(std::move(socket)) {}

  ~Session() {
    std::cout << "[Lifecycle] ~Session() 析构完成 (所有异步引用已归零)" << std::endl;
  }

  void Start() {
    DoRead();
  }

 private:
  void DoRead() {
    // 【关键要素 1】：获取自身的 shared_ptr 副本
    auto self(shared_from_this());

    socket_.async_read_some(
        asio::buffer(data_, kMaxLength),
        // 【关键要素 2】：Lambda 按值捕获 self！
        // 挂起的操作对象（executor_op）将持有此 Lambda，使 Session 计数 +1
        // 即使 DoRead() 函数栈帧立即销毁，Session 对象在内核 I/O 完成前决不析构
        [this, self](const asio::error_code& ec, std::size_t length) {
          if (!ec) {
            DoWrite(length);
          } else {
            // 发生错误（如客户端断开连接）时不发起新操作
            // Lambda 执行完毕后，栈上的 self 析构，整体引用计数归零，触发 ~Session()
            std::cout << "[Session] 连接结束: " << ec.message() << std::endl;
          }
        });
  }

  void DoWrite(std::size_t length) {
    auto self(shared_from_this());

    asio::async_write(
        socket_, asio::buffer(data_, length),
        [this, self](const asio::error_code& ec, std::size_t /*length*/) {
          if (!ec) {
            // 形成读写回环：继续异步读
            DoRead();
          }
        });
  }

  tcp::socket socket_;
  static constexpr std::size_t kMaxLength = 1024;
  char data_[kMaxLength]{};
};

class Server {
 public:
  Server(asio::io_context& io_context, unsigned short port)
      : acceptor_(io_context, tcp::endpoint(tcp::v4(), port)) {
    DoAccept();
  }

 private:
  void DoAccept() {
    acceptor_.async_accept(
        [this](const asio::error_code& ec, tcp::socket socket) {
          if (!ec) {
            std::cout << "[Server] 接入新连接，创建 Session 对象..." << std::endl;
            // 【关键要素 3】：创建 Session 并通过 Start() 开启生命周期链
            std::make_shared<Session>(std::move(socket))->Start();
          }
          // 继续等待接受下一个客户端连接
          DoAccept();
        });
  }

  tcp::acceptor acceptor_;
};

int main(int argc, char* argv[]) {
  try {
    unsigned short port = 8080;
    if (argc >= 2) {
      port = static_cast<unsigned short>(std::stoi(argv[1]));
    }

    asio::io_context io_context;
    Server server(io_context, port);

    std::cout << ">>> 异步 Echo 服务器已就绪，正在监听端口 " << port << "..." << std::endl;
    std::cout << ">>> 驱动事件循环 io_context.run()..." << std::endl;

    // 单线程运行事件循环
    io_context.run();
  } catch (const std::exception& e) {
    std::cerr << "[Fatal Error] " << e.what() << std::endl;
    return 1;
  }

  return 0;
}
