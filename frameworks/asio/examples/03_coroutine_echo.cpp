// ==============================================================================
// 03_coroutine_echo.cpp
// C++20 现代协程风格 TCP Echo 服务器 (co_await / use_awaitable)
//
// 对应知识点：
//   - Ch27 多线程与并发: C++20 协程模型 (co_await, co_return, 协程帧)
//   - ARCHITECTURE.md §4.4, §5.4: async_result<use_awaitable_t> 定制点适配
//   - 对照演进：对比 02_async_tcp_echo 的回调风格，体验“同步语法写异步逻辑”的优雅
// ==============================================================================

#include <iostream>
#include <utility>
#include <asio.hpp>
#include <asio/co_spawn.hpp>
#include <asio/detached.hpp>
#include <asio/use_awaitable.hpp>

using asio::awaitable;
using asio::co_spawn;
using asio::detached;
using asio::use_awaitable;
using asio::ip::tcp;

// 会话协程：用直观的线性逻辑表达异步通信
// 注意：此时不再需要复杂的 enable_shared_from_this 显式计数
// socket 与 buffer 直接作为协程的局部变量，生命周期由 C++20 协程帧（Coroutine Frame）隐式管理！
awaitable<void> EchoSession(tcp::socket socket) {
  try {
    char data[1024];
    for (;;) {
      // 挂起点 1：co_await 异步读取
      // 当底层无数据可读时，协程挂起，控制权返回 io_context 事件循环
      // 当数据就绪时，io_context 恢复本协程并返回读取的字节数
      std::size_t n = co_await socket.async_read_some(asio::buffer(data), use_awaitable);

      // 挂起点 2：co_await 异步回写
      co_await asio::async_write(socket, asio::buffer(data, n), use_awaitable);
    }
  } catch (const std::exception& e) {
    // 客户端断开连接或发生错误时退出循环，协程帧自动销毁，socket 析构并关闭连接
    std::cout << "[Session Ended] " << e.what() << std::endl;
  }
}

// 监听与连接接入协程
awaitable<void> Listener(unsigned short port) {
  auto executor = co_await asio::this_coro::executor;
  tcp::acceptor acceptor(executor, {tcp::v4(), port});

  std::cout << ">>> C++20 协程 Echo 服务器正在监听端口 " << port << "..." << std::endl;

  for (;;) {
    // 异步等待接受新连接
    tcp::socket socket = co_await acceptor.async_accept(use_awaitable);
    std::cout << "[Listener] 接入新客户端连接，启动独立 EchoSession 协程..." << std::endl;

    // 为每个连接在当前执行器上并发派生（spawn）一个独立协程
    co_spawn(executor, EchoSession(std::move(socket)), detached);
  }
}

int main(int argc, char* argv[]) {
  try {
    unsigned short port = 8080;
    if (argc >= 2) {
      port = static_cast<unsigned short>(std::stoi(argv[1]));
    }

    asio::io_context io_context(1);

    // 启动监听根协程
    co_spawn(io_context, Listener(port), detached);

    // 驱动事件循环
    io_context.run();
  } catch (const std::exception& e) {
    std::cerr << "[Fatal Error] " << e.what() << std::endl;
    return 1;
  }

  return 0;
}
