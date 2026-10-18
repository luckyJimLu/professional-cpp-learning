#include "rtos_sim.h"

std::mutex m;
std::condition_variable cv;
bool dataReady = false;

void consumer() {
  std::unique_lock<std::mutex> lk(m);
  cv.wait(lk, [] { return dataReady; });
  std::cout << "consumer: dataReady=" << dataReady << '\n';
}

void producer() {
  std::this_thread::sleep_for(6ms);
  std::lock_guard<std::mutex> lk(m);
  dataReady = true;
  cv.notify_one();
}

int main() {
  rtos::config({.spurious_wakeup_every = 2, .max_ticks = 60});
  rtos::thread c({.name = "consumer", .priority = 4}, consumer);
  rtos::thread p({.name = "producer", .priority = 3}, producer);
  c.join();
  p.join();
  return 0;
}
