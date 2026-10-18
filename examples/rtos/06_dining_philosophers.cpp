#include "rtos_sim.h"

std::mutex fork0;
std::mutex fork1;

void philosopher0() {
  fork0.lock();
  std::this_thread::sleep_for(2ms);
  fork1.lock();
  std::cout << "P0 eating\n";
  fork1.unlock();
  fork0.unlock();
}

void philosopher1() {
  fork1.lock();
  std::this_thread::sleep_for(2ms);
  fork0.lock();
  std::cout << "P1 eating\n";
  fork0.unlock();
  fork1.unlock();
}

int main() {
  rtos::thread p0({.name = "P0", .priority = 3}, philosopher0);
  rtos::thread p1({.name = "P1", .priority = 3}, philosopher1);
  p0.join();
  p1.join();
  return 0;
}
