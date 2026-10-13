#include <cassert>
#include <condition_variable>
#include <cstddef>
#include <deque>
#include <future>
#include <iostream>
#include <memory>
#include <mutex>
#include <stdexcept>
#include <thread>
#include <type_traits>
#include <utility>
#include <vector>

// C++20 teaching example: bounded waiting queue, rejection, result/exception
// delivery and draining shutdown. Lifecycle belongs to one external coordinator.
// Do not call shutdown() or destroy this pool from one of its own tasks; do not
// concurrently call shutdown(). Running tasks must eventually return.
class BoundedThreadPool {
 public:
  BoundedThreadPool(std::size_t worker_count, std::size_t capacity)
      : capacity_(capacity) {
    if (worker_count == 0 || capacity == 0) {
      throw std::invalid_argument("workers and capacity must be positive");
    }
    workers_.reserve(worker_count);
    try {
      for (std::size_t i = 0; i < worker_count; ++i) {
        workers_.emplace_back([this] { run(); });
      }
    } catch (...) {
      shutdown();  // Join any workers already created before rethrowing.
      throw;
    }
  }

  BoundedThreadPool(const BoundedThreadPool&) = delete;
  BoundedThreadPool& operator=(const BoundedThreadPool&) = delete;
  ~BoundedThreadPool() { shutdown(); }

  template <class F>
    requires std::is_invocable_v<std::decay_t<F>&>
  auto submit(F&& function)
      -> std::future<std::invoke_result_t<std::decay_t<F>&>> {
    using Result = std::invoke_result_t<std::decay_t<F>&>;
    std::packaged_task<Result()> result_task(std::forward<F>(function));
    auto result = result_task.get_future();
    // Queue homogeneous void() tasks without requiring copyable callables.
    std::packaged_task<void()> queued_task(
        [task = std::move(result_task)]() mutable { task(); });
    {
      std::lock_guard<std::mutex> lock(mutex_);
      if (closing_) throw std::runtime_error("pool is closing");
      if (queue_.size() >= capacity_) throw std::runtime_error("queue is full");
      queue_.push_back(std::move(queued_task));
    }
    available_.notify_one();
    return result;
  }

  // Stop accepting work, drain accepted tasks, then join workers. Repeated
  // sequential calls are safe; submit may race with this first state change.
  void shutdown() {
    {
      std::lock_guard<std::mutex> lock(mutex_);
      closing_ = true;
    }
    available_.notify_all();
    for (auto& worker : workers_) {
      if (worker.joinable()) worker.join();
    }
  }

 private:
  void run() {
    for (;;) {
      std::packaged_task<void()> task;
      {
        std::unique_lock<std::mutex> lock(mutex_);
        available_.wait(lock, [this] { return closing_ || !queue_.empty(); });
        if (queue_.empty()) return;  // Predicate implies closing_.
        task = std::move(queue_.front());
        queue_.pop_front();
      }  // Release the queue lock before calling user code.
      task();  // packaged_task transports user exceptions through the future.
    }
  }

  const std::size_t capacity_;
  std::mutex mutex_;
  std::condition_variable available_;
  std::deque<std::packaged_task<void()>> queue_;
  bool closing_ = false;  // Read and written under mutex_.
  std::vector<std::thread> workers_;
};

int main() {
  {
    BoundedThreadPool pool(2, 8);
    auto answer = pool.submit([] { return 42; });
    assert(answer.get() == 42);
    auto move_only = pool.submit([p = std::make_unique<int>(7)] { return *p; });
    assert(move_only.get() == 7);
    auto failure = pool.submit([]() -> int { throw std::logic_error("handler failed"); });
    bool delivered = false;
    try {
      (void)failure.get();
    } catch (const std::logic_error&) {
      delivered = true;
    }
    assert(delivered);
    pool.shutdown();
    bool rejected = false;
    try {
      (void)pool.submit([] { return 0; });
    } catch (const std::runtime_error&) {
      rejected = true;
    }
    assert(rejected);
  }
  {
    BoundedThreadPool pool(1, 1);
    std::promise<void> entered;
    auto entered_future = entered.get_future();
    std::promise<void> release;
    auto gate = release.get_future().share();
    auto running = pool.submit([&entered, gate] { entered.set_value(); gate.wait(); return 1; });
    entered_future.get();  // Deterministically occupy the one worker.
    auto queued = pool.submit([] { return 2; });
    bool full = false;
    try {
      (void)pool.submit([] { return 3; });
    } catch (const std::runtime_error&) {
      full = true;
    }
    assert(full);
    release.set_value();
    pool.shutdown();  // Drains the accepted queued task before returning.
    assert(running.get() == 1 && queued.get() == 2);
  }
  std::cout << "PASS: result, move-only ownership, exception, close rejection, queue bound, draining shutdown\n";
}
