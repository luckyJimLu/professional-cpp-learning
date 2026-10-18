#include "rtos_sim.h"

std::binary_semaphore irqSem(0);
int packetCount = 0;

void deferredHandler() {
  irqSem.acquire();
  packetCount += 1;
  std::cout << "handled packet #" << packetCount << '\n';
}

int main() {
  rtos::thread handler({.name = "irq_worker", .priority = 5}, deferredHandler);
  rtos::isr uart("UART_RX", [] { irqSem.release_from_isr(); });
  uart.trigger_at(4ms);
  handler.join();
  return 0;
}
