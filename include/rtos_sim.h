#pragma once

// RTOS simulator teaching API.
// These declarations exist for editor completion and documentation only. Programs that
// include this header are interpreted by rtos.html and are not intended to be linked.

#include <cstddef>
#include <cstdint>
#include <chrono>

namespace rtos {
inline constexpr int kDefaultPriority = 2;
inline constexpr std::uint32_t kWaitForever = 0xffffffffu;
struct no_priority_inheritance_t {};
inline constexpr no_priority_inheritance_t no_priority_inheritance{};
struct periodic_t {};
struct once_t {};
inline constexpr periodic_t periodic{};
inline constexpr once_t once{};

struct thread_attributes { const char* name = "task"; int priority = kDefaultPriority; std::size_t stack_words = 256; };
class thread;
class mutex;
template<class T, std::size_t Capacity> class message_queue;
class event_group;
class timer;
class isr;

template<class Rep, class Period> void busy_for(std::chrono::duration<Rep, Period>);
void suspend(thread&);
void resume(thread&);
void terminate(thread&);
void notify(thread&, unsigned value = 1);

namespace this_task {
void yield();
void set_priority(int);
unsigned notify_take(std::uint32_t timeout = kWaitForever);
}
}
