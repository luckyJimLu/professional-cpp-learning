import { test } from "node:test";
import assert from "node:assert/strict";
import { simulateRtos } from "../src/rtos-sim/simulate.ts";
import { findScenario } from "../src/rtos-sim/scenarios.ts";

test("rtos-objects: priority inheritance vs no_priority_inheritance inversion", () => {
  const s = findScenario("priority-inversion");
  const res = simulateRtos(s.code, s.config);
  assert.ok(res.trace?.events.some((e) => e.op === "prio_inherit" && e.to === 5));
  assert.ok(res.trace?.events.some((e) => e.op === "prio_restore" && e.to === 2));

  const invCode = `#include "rtos_sim.h"
rtos::mutex bus{rtos::no_priority_inheritance};
void lowTask() {
  bus.lock();
  rtos::busy_for(30ms);
  bus.unlock();
}
void medTask() {
  std::this_thread::sleep_for(3ms);
  rtos::busy_for(25ms);
}
void highTask() {
  std::this_thread::sleep_for(2ms);
  bus.lock();
  bus.unlock();
}
int main() {
  rtos::thread l({.name = "low", .priority = 2}, lowTask);
  rtos::thread m({.name = "med", .priority = 3}, medTask);
  rtos::thread h({.name = "high", .priority = 5}, highTask);
  l.join(); m.join(); h.join();
}`;
  const invRes = simulateRtos(invCode);
  assert.ok(!invRes.trace?.events.some((e) => e.op === "prio_inherit"));
  assert.ok(invRes.diagnostics.some((d) => d.message.includes("优先级反转")));
});

test("rtos-objects: queue timeout, notify, ISR deferred, and deadlock detection", () => {
  const isrScenario = findScenario("isr-deferred");
  const isrRes = simulateRtos(isrScenario.code, isrScenario.config);
  assert.ok(isrRes.trace?.events.some((e) => e.op === "isr_enter" && e.isr === "UART_RX"));
  assert.ok(isrRes.trace?.events.some((e) => e.op === "isr_exit" && e.isr === "UART_RX"));

  const dlScenario = findScenario("dining-philosophers");
  const dlRes = simulateRtos(dlScenario.code, dlScenario.config);
  assert.equal(dlRes.trace?.endedReason, "deadlock");
  assert.ok(dlRes.trace?.events.some((e) => e.op === "deadlock_detected"));
});
