#pragma once

// ============================================================================
// RTOS 并发可视化模拟器 · 教学 API 头文件 (include/rtos_sim.h)
//
// 说明：
//   本头文件仅提供类型与函数声明，供 IDE 语法高亮、补全与文档查阅使用。
//   包含本头文件的程序由 RTOS 模拟器 (rtos.html) 确定性解释执行，不可直接链接运行。
// ============================================================================

#include <cstddef>
#include <cstdint>
#include <chrono>

namespace rtos {

inline constexpr int kDefaultPriority = 2;
inline constexpr int kTimerServicePriority = 8;
inline constexpr int kIdlePriority = 0;
inline constexpr std::uint32_t kWaitForever = 0xffffffffu;

struct no_priority_inheritance_t {};
inline constexpr no_priority_inheritance_t no_priority_inheritance{};

struct periodic_t {};
struct once_t {};
inline constexpr periodic_t periodic{};
inline constexpr once_t once{};

struct thread_attributes {
  const char* name = "task";
  int priority = kDefaultPriority;
  std::size_t stack_words = 256;
};

struct kernel_config {
  int tick_ms = 1;
  int time_slice_ticks = 5;
  int spurious_wakeup_every = 0;
  int max_ticks = 2000;
};

struct event_wait_options {
  bool wait_all = true;
  bool clear_on_exit = false;
};

class thread {
public:
  template <class Fn, class... Args>
  thread(thread_attributes attrs, Fn&& fn, Args&&... args);
  void join();
  void detach();
};

class mutex {
public:
  mutex() = default;
  explicit mutex(no_priority_inheritance_t);
  void lock();
  bool try_lock();
  template <class Rep, class Period>
  bool try_lock_for(std::chrono::duration<Rep, Period> timeout);
  void unlock();
};

template <class T, std::size_t Capacity>
class message_queue {
public:
  message_queue() = default;
  template <class Rep, class Period>
  bool send(const T& value, std::chrono::duration<Rep, Period> timeout);
  bool send(const T& value, std::uint32_t timeout = kWaitForever);
  bool send_from_isr(const T& value);
  template <class Rep, class Period>
  bool receive(T& out, std::chrono::duration<Rep, Period> timeout);
  bool receive(T& out, std::uint32_t timeout = kWaitForever);
};

class event_group {
public:
  event_group() = default;
  std::uint32_t set(std::uint32_t bits);
  std::uint32_t set_from_isr(std::uint32_t bits);
  std::uint32_t clear(std::uint32_t bits);
  template <class Rep, class Period>
  std::uint32_t wait(std::uint32_t mask, event_wait_options opts, std::chrono::duration<Rep, Period> timeout);
  std::uint32_t wait(std::uint32_t mask, event_wait_options opts = {}, std::uint32_t timeout = kWaitForever);
};

class timer {
public:
  template <class Rep, class Period, class Mode, class Fn>
  timer(const char* name, std::chrono::duration<Rep, Period> period, Mode mode, Fn&& callback);
  void start();
  void stop();
};

class isr {
public:
  template <class Fn>
  isr(const char* name, Fn&& handler);
  template <class Rep, class Period>
  void trigger_at(std::chrono::duration<Rep, Period> at);
  template <class Rep, class Period>
  void trigger_every(std::chrono::duration<Rep, Period> interval);
};

void config(kernel_config cfg);

template <class Rep, class Period>
void busy_for(std::chrono::duration<Rep, Period> duration);

void suspend(thread& t);
void resume(thread& t);
void terminate(thread& t);
void notify(thread& t, unsigned value = 1);
void notify_from_isr(thread& t, unsigned value = 1);

namespace this_task {
void yield();
void set_priority(int priority);
template <class Rep, class Period>
unsigned notify_take(std::chrono::duration<Rep, Period> timeout);
unsigned notify_take(std::uint32_t timeout = kWaitForever);
} // namespace this_task

} // namespace rtos
