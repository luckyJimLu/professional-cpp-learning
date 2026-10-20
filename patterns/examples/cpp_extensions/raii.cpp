// RAII（资源管理惯用法）
// 来源：H 第5章 A Comprehensive Look at RAII，RAII for other resources；S 第1章 RAII 讨论
// 独立教学改写；行为检查见 main。
#include <cassert>
#include <mutex>
#include <stdexcept>
#include <thread>

using namespace std;

int main() {
  mutex m;
  bool threw = false;
  try {
    lock_guard<mutex> guard(m);
    throw runtime_error("operation failed");
  } catch (const runtime_error&) {
    threw = true;
  }
  assert(threw);
  // A different thread checks release; it does not try to relock an owned mutex.
  bool acquired = false;
  thread probe([&] {
    if (m.try_lock()) {
      acquired = true;
      m.unlock();
    }
  });
  probe.join();
  assert(acquired);
}
