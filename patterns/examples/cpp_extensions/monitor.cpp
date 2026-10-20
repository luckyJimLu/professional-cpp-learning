// Monitor（后台进度监控变体）
// 来源：H 第18章 Patterns for Concurrency / Monitor pattern，约 pp.571–573
// 独立教学改写；行为检查见 main。
#include <atomic>
#include <cassert>
#include <chrono>
#include <thread>

using namespace std;

int main() {
  atomic<int> progress{0};
  atomic<bool> done{false};
  int observed = 0;
  thread monitor([&] {
    while (!done.load(memory_order_acquire)) {
      observed = progress.load(memory_order_relaxed);
      this_thread::sleep_for(chrono::milliseconds(1));
    }
    observed = progress.load(memory_order_relaxed);
  });
  for (int i = 1; i <= 100; ++i) progress.store(i, memory_order_relaxed);
  done.store(true, memory_order_release);
  monitor.join();
  assert(observed == 100);
}
