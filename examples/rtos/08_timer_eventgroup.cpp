#include "rtos_sim.h"

rtos::event_group sysEvents;
int ticksFired = 0;

void coordinator() {
  auto bits = sysEvents.wait(0b11, {.wait_all = true, .clear_on_exit = true}, 20ms);
  std::cout << "all ready bits=" << bits << '\n';
}

void sensorInit() {
  std::this_thread::sleep_for(3ms);
  sysEvents.set(0b01);
}

int main() {
  rtos::timer beat("heartbeat", 4ms, rtos::once, [] {
    ticksFired += 1;
    sysEvents.set(0b10);
  });
  beat.start();
  rtos::thread coord({.name = "coordinator", .priority = 4}, coordinator);
  rtos::thread sensor({.name = "sensor", .priority = 3}, sensorInit);
  coord.join();
  sensor.join();
  return 0;
}
