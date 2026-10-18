#include "rtos_sim.h"

std::mutex bus;

void lowTask() {
  bus.lock();
  rtos::busy_for(8ms);
  bus.unlock();
}

void highTask() {
  std::this_thread::sleep_for(2ms);
  bus.lock();
  std::cout << "high acquired bus\n";
  bus.unlock();
}

int main() {
  rtos::thread low({.name = "low", .priority = 2}, lowTask);
  rtos::thread high({.name = "high", .priority = 5}, highTask);
  low.join();
  high.join();
}
