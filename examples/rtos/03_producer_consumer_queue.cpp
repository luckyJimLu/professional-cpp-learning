#include "rtos_sim.h"

rtos::message_queue<int, 2> samples;

void producer() {
  std::this_thread::sleep_for(3ms);
  samples.send(42, 10ms);
  samples.send(84, 10ms);
}

void consumer() {
  int value = 0;
  samples.receive(value, rtos::kWaitForever);
  std::cout << "sample=" << value << '\n';
}

int main() {
  rtos::thread rx({.name = "consumer", .priority = 4}, consumer);
  rtos::thread tx({.name = "producer", .priority = 2}, producer);
  rx.join();
  tx.join();
}
