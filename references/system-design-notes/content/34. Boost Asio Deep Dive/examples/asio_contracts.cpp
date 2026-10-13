#include <utility>
#include <boost/asio.hpp>
#include <boost/version.hpp>
#include <cassert>
#include <chrono>
#include <cstdint>
#include <future>
#include <iostream>
#include <memory>
#include <thread>
#include <vector>

namespace asio = boost::asio;
using namespace std::chrono_literals;
static_assert(BOOST_VERSION == 108300, "Teaching baseline: Boost 1.83.0");

// Small teaching adapter: the CPU executor computes; the associated executor
// delivers the result. It deliberately has no cancellation or allocator protocol,
// admission limit or allocation-failure recovery. Do not treat it as a production
// async operation. Both execution contexts must outlive all its completions.
template <class Token>
auto async_square(asio::thread_pool& cpu, asio::io_context& io,
                  std::uint32_t input, Token&& token) {
  return asio::async_initiate<Token, void(std::uint64_t)>(
      [](auto handler, asio::thread_pool* pool, asio::io_context* context,
         std::uint32_t value) {
        auto ex = asio::get_associated_executor(handler, context->get_executor());
        auto work = asio::make_work_guard(ex);
        asio::post(*pool, [handler = std::move(handler), ex,
                          work = std::move(work), value]() mutable {
          const auto result = std::uint64_t(value) * value;
          asio::post(ex, [handler = std::move(handler),
                          work = std::move(work), result]() mutable {
            std::move(handler)(result);
          });
        });
      }, token, &cpu, &io, input);
}

asio::awaitable<std::uint64_t> square_coroutine(asio::thread_pool& cpu,
                                               asio::io_context& io) {
  auto owned = std::make_unique<int>(7);
  auto result = co_await async_square(cpu, io, 8, asio::use_awaitable);
  co_return result + *owned;  // owned survives suspension in the coroutine frame.
}

int main() {
  {
    asio::io_context io;
    asio::thread_pool cpu(2);
    auto serial = asio::make_strand(io);
    bool callback_done = false;
    async_square(cpu, io, 6, asio::bind_executor(serial, [&](std::uint64_t n) {
      assert(serial.running_in_this_thread());
      assert(n == 36);
      callback_done = true;
    }));
    auto future = async_square(cpu, io, 7, asio::use_future);
    auto coroutine = asio::co_spawn(io, square_coroutine(cpu, io), asio::use_future);
    io.run();  // Work guards keep the completion context alive during CPU work.
    cpu.join();
    assert(callback_done && future.get() == 49 && coroutine.get() == 71);
  }
  {
    asio::io_context io;
    auto serial = asio::make_strand(io);
    int count = 0;  // All accesses below run on the same strand, despite two runners.
    for (int i = 0; i < 2000; ++i) asio::post(serial, [&] { ++count; });
    std::thread first([&] { io.run(); });
    std::thread second([&] { io.run(); });
    first.join();
    second.join();
    assert(count == 2000);
  }
  {
    asio::io_context io;
    asio::steady_timer timer(io, 1h);
    asio::cancellation_signal signal;
    int calls = 0;
    timer.async_wait(asio::bind_cancellation_slot(signal.slot(),
        [&](boost::system::error_code ec) {
          assert(ec == asio::error::operation_aborted);
          ++calls;
        }));
    asio::post(io, [&] { signal.emit(asio::cancellation_type::terminal); });
    io.run();
    assert(calls == 1);  // Cancellation still leads to completion processing.
  }
  {
    asio::io_context io;
    asio::steady_timer timer(io, 1h);
    auto failed = timer.async_wait(asio::use_future);
    asio::post(io, [&] { timer.cancel(); });
    io.run();
    bool observed = false;
    try {
      failed.get();
    } catch (const boost::system::system_error& error) {
      observed = error.code() == asio::error::operation_aborted;
    }
    assert(observed);  // error_code became an exception through use_future.
  }
  {
    asio::io_context io;
    int count = 0;
    asio::post(io, [&] { ++count; });
    io.stop();
    io.run();
    assert(count == 0);  // stop() is not draining completion handlers.
    io.restart();
    io.run();
    assert(count == 1);
  }
  {
    asio::io_context io;
    auto owned = std::make_shared<int>(9);
    std::weak_ptr<int> observer = owned;
    asio::post(io, [owned] { assert(*owned == 9); });
    owned.reset();
    assert(!observer.expired());
    io.run();
    assert(observer.expired());
  }
  std::cout << "PASS Asio: tokens, coroutine lifetime, associated executor, work guard, strand, cancellation, future error, stop/restart, shared ownership\n";
}
