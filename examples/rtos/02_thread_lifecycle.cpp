#include "rtos_sim.h"

int progress = 0;

void backgroundWorker() {
  std::cout << "worker step 1\n";
  progress = 1;
  std::this_thread::sleep_for(4ms);
  std::cout << "worker step 2\n";
  progress = 2;
}

int main() {
  rtos::thread worker({.name = "worker", .priority = 3}, backgroundWorker);
  std::this_thread::sleep_for(2ms);
  rtos::suspend(worker);
  std::cout << "worker suspended\n";
  std::this_thread::sleep_for(3ms);
  rtos::resume(worker);
  worker.join();
  std::cout << "all done\n";
  return 0;
}
