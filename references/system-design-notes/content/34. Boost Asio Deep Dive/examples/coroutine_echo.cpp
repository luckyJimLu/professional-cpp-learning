#include <utility>
#include <boost/asio.hpp>
#include <boost/version.hpp>
#include <array>
#include <exception>
#include <iostream>
#include <stdexcept>
#include <string>

namespace asio = boost::asio;
using tcp = asio::ip::tcp;
static_assert(BOOST_VERSION == 108300, "Teaching baseline: Boost 1.83.0");

// Loopback-only finite-session teaching server. One runner; one coroutine owns
// each moved socket and its buffer. This is byte-stream echo, not framed RPC.
asio::awaitable<void> echo(tcp::socket socket) {
  std::array<char, 4096> data{};
  for (;;) {
    boost::system::error_code ec;
    const auto n = co_await socket.async_read_some(
        asio::buffer(data), asio::redirect_error(asio::use_awaitable, ec));
    // If an operation reports bytes together with an error, consume the bytes.
    if (n != 0) co_await asio::async_write(socket, asio::buffer(data, n), asio::use_awaitable);
    if (ec == asio::error::eof) co_return;
    if (ec) throw boost::system::system_error(ec);
  }
}

asio::awaitable<void> accept_sessions(tcp::acceptor& acceptor, int sessions,
                                     int& finished, int& failed) {
  for (int i = 0; i < sessions; ++i) {
    auto socket = co_await acceptor.async_accept(asio::use_awaitable);
    auto ex = socket.get_executor();  // Resolve before moving the socket.
    asio::co_spawn(ex, echo(std::move(socket)),
        [&](std::exception_ptr error) {
          ++finished;
          if (error) {
            ++failed;
            try { std::rethrow_exception(error); }
            catch (const std::exception& e) { std::cerr << e.what() << '\n'; }
          }
        });
  }
  boost::system::error_code ignored;
  acceptor.close(ignored);
}

int main(int argc, char** argv) {
  try {
    const int sessions = argc == 2 ? std::stoi(argv[1]) : 3;
    if (sessions < 1 || sessions > 32) throw std::invalid_argument("sessions: 1..32");
    asio::io_context io;
    tcp::acceptor acceptor(io, {asio::ip::make_address("127.0.0.1"), 0});
    int finished = 0;
    int failed = 0;
    std::exception_ptr listener_error;
    asio::co_spawn(io, accept_sessions(acceptor, sessions, finished, failed),
        [&](std::exception_ptr error) { listener_error = error; });
    std::cout << "PORT " << acceptor.local_endpoint().port() << std::endl;
    io.run();  // Returns naturally when acceptance and every session complete.
    if (listener_error) std::rethrow_exception(listener_error);
    if (failed != 0 || finished != sessions) return 1;
    std::cout << "PASS echo: " << finished << " sessions drained\n";
  } catch (const std::exception& e) {
    std::cerr << e.what() << '\n';
    return 1;
  }
}
