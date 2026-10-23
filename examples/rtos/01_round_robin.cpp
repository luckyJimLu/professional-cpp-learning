#include "rtos_sim.h"

void workerA() {
  std::cout << "A start\n";
  rtos::busy_for(6ms);
  std::cout << "A done\n";
}

void workerB() {
  std::cout << "B start\n";
  rtos::busy_for(6ms);
  std::cout << "B done\n";
}

int main() {
  rtos::thread a({.name = "worker A", .priority = 2}, workerA);
  rtos::thread b({.name = "worker B", .priority = 2}, workerB);
  a.join();
  b.join();
  return 0;
}
