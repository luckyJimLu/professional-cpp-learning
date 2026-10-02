// ==============================================================================
// 01_sync_tcp_echo.cpp
// 基础同步阻塞 TCP Echo 服务器
//
// 对应知识点：
//   - Ch13 I/O: 网络 Socket 概念、端口绑定与监听
//   - Asio 核心概念: io_context、ip::tcp::socket、ip::tcp::acceptor、asio::buffer
// ==============================================================================

#include <iostream>
#include <string>
#include <asio.hpp>

using asio::ip::tcp;

void Session(tcp::socket sock) {
  try {
    char data[1024];
    for (;;) {
      asio::error_code ec;
      // 阻塞读取数据
      std::size_t length = sock.read_some(asio::buffer(data), ec);
      if (ec == asio::error::eof) {
        std::cout << "[Info] 客户端主动断开连接" << std::endl;
        break; // 客户端关闭连接
      } else if (ec) {
        throw asio::system_error(ec); // 其它错误抛出异常
      }

      // 将收到的数据原样回写（Echo）
      asio::write(sock, asio::buffer(data, length));
    }
  } catch (const std::exception& e) {
    std::cerr << "[Exception in thread] " << e.what() << std::endl;
  }
}

int main(int argc, char* argv[]) {
  try {
    unsigned short port = 8080;
    if (argc >= 2) {
      port = static_cast<unsigned short>(std::stoi(argv[1]));
    }

    asio::io_context io_context;
    tcp::acceptor acceptor(io_context, tcp::endpoint(tcp::v4(), port));

    std::cout << ">>> 同步 Echo 服务器正在监听端口 " << port << "..." << std::endl;
    std::cout << ">>> 可以使用: nc 127.0.0.1 " << port << " 进行测试" << std::endl;

    for (;;) {
      // 阻塞等待客户端接入
      tcp::socket socket = acceptor.accept();
      std::cout << "[Info] 接受来自 " << socket.remote_endpoint() << " 的连接" << std::endl;
      // 阻塞式单会话处理（一次处理一个客户端）
      Session(std::move(socket));
    }
  } catch (const std::exception& e) {
    std::cerr << "[Fatal Error] " << e.what() << std::endl;
    return 1;
  }

  return 0;
}
