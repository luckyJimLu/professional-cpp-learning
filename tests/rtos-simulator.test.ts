import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCppSubset } from "../src/rtos-sim/frontend/parse.ts";
import { simulateRtos } from "../src/rtos-sim/simulate.ts";
import { computeRtosSnapshots } from "../src/rtos-sim/rtosReducer.ts";
import { findScenario, RTOS_SCENARIOS } from "../src/rtos-sim/scenarios.ts";

test("parser reports unsupported pointer and switch syntax with source line numbers", () => {
  const ptrResult = parseCppSubset("int main() {\n  int* pointer = nullptr;\n}");
  assert.equal(ptrResult.program, null);
  assert.ok(ptrResult.diagnostics.some((d) => d.level === "error" && d.line === 2));

  const switchResult = parseCppSubset("int main() {\n  int x = 1;\n  switch (x) { case 1: break; }\n}");
  assert.equal(switchResult.program, null);
  assert.ok(switchResult.diagnostics.some((d) => d.level === "error" && d.line === 3));
});

test("parser recovers template ctor (Case A) and vexing parse guard (Case B)", () => {
  const code = `#include "rtos_sim.h"
std::mutex m;
std::counting_semaphore<2> sem(1);
int main() {
  std::lock_guard<std::mutex> guard(m);
  sem.acquire();
  sem.release();
  return 0;
}`;
  const parsed = parseCppSubset(code);
  assert.ok(parsed.program);
  assert.equal(parsed.diagnostics.length, 0);
});

test("simulation is deterministic", () => {
  const scenario = RTOS_SCENARIOS[0];
  const first = simulateRtos(scenario.code, scenario.config);
  const second = simulateRtos(scenario.code, scenario.config);
  assert.deepEqual(first, second);
  assert.equal(first.trace?.endedReason, "completed");
  assert.ok((first.trace?.timeline.length ?? 0) > 2);
});

test("all preset scenarios expose the state transition promised by their lesson", () => {
  const run = (id: string) => {
    const scenario = findScenario(id);
    const result = simulateRtos(scenario.code, scenario.config);
    assert.ok(result.trace, `${id} should produce a trace`);
    return result.trace;
  };

  const roundRobin = run("round-robin");
  assert.deepEqual(
    roundRobin.events.filter((e) => e.op === "stdout").map((e) => e.text.trim()),
    ["A start", "B start", "A done", "B done"],
  );
  assert.deepEqual(
    roundRobin.timeline.filter((s) => s.task === "t0" || s.task === "t1").slice(0, 6).map((s) => s.task),
    ["t0", "t1", "t0", "t1", "t0", "t1"],
  );

  const mutex = run("mutex");
  assert.deepEqual(
    mutex.events.filter((e) => e.op === "obj_op" && e.objectId === "o0").map((e) => [e.action, e.ok]),
    [["lock", true], ["lock", false], ["unlock", true], ["lock", true], ["unlock", true]],
  );
  assert.ok(mutex.events.some((e) => e.op === "prio_inherit" && e.to === 5));
  assert.ok(mutex.events.some((e) => e.op === "prio_restore" && e.to === 2));

  const queue = run("queue");
  const send42 = queue.events.find(
    (e) => e.op === "obj_op" && e.action === "send" && e.ok && e.value === "42",
  );
  assert.ok(send42?.state?.kind === "queue");
  assert.deepEqual(send42.state.buffer, ["42"]);
  const receive42 = queue.events.find(
    (e) => e.op === "obj_op" && e.action === "receive" && e.ok && e.value === "42",
  );
  assert.ok(receive42?.state?.kind === "queue");
  assert.deepEqual(receive42.state.buffer, []);

  const semaphore = run("semaphore");
  assert.deepEqual(
    semaphore.events.filter((e) => e.op === "obj_op" && e.objectId === "o0").map((e) => [e.action, e.ok]),
    [["acquire", false], ["release", true], ["acquire", true]],
  );

  const lifecycle = run("thread-lifecycle");
  const workerId = lifecycle.events.find((e) => e.op === "task_create" && e.name === "worker")?.task;
  assert.ok(workerId);
  const workerStates = new Set([
    "Ready",
    ...lifecycle.events
      .filter((e) => e.op === "task_state" && e.task === workerId)
      .flatMap((e) => [e.from, e.to]),
  ]);
  assert.deepEqual(workerStates, new Set(["Ready", "Running", "Blocked", "Suspended", "Deleted"]));

  const condvar = run("condvar-spurious");
  assert.ok(condvar.events.some((e) => e.op === "spurious_wakeup"));
  assert.ok(condvar.events.some((e) => e.op === "obj_op" && e.action === "wait" && e.ok));
  assert.ok(condvar.events.some((e) => e.op === "obj_op" && e.action === "notify_one" && e.ok));

  const deadlock = run("dining-philosophers");
  assert.equal(deadlock.endedReason, "deadlock");
  assert.ok(deadlock.events.some((e) => e.op === "deadlock_detected" && e.cycle.length === 5));

  const isr = run("isr-deferred");
  assert.ok(isr.events.some((e) => e.op === "isr_exit" && e.resume !== null));
  assert.ok(isr.events.some((e) => e.op === "obj_op" && e.action === "acquire" && e.ok));

  const eventGroup = run("timer-eventgroup");
  assert.ok(eventGroup.events.some((e) => e.op === "timer_fire" && e.timer === "heartbeat"));
  assert.ok(eventGroup.events.some(
    (e) => e.op === "obj_op" && e.action === "set" && e.state?.kind === "event_group" && e.state.bits === 0b11,
  ));
  assert.ok(eventGroup.events.some(
    (e) => e.op === "obj_op" && e.action === "event_wait" && e.ok && e.value === "0b11" && e.state?.kind === "event_group" && e.state.bits === 0,
  ));
});

test("mutex contention produces priority inheritance and restoration", () => {
  const scenario = RTOS_SCENARIOS.find((s) => s.id === "mutex")!;
  const result = simulateRtos(scenario.code, scenario.config);
  assert.ok(result.trace?.events.some((e) => e.op === "prio_inherit" && e.from === 2 && e.to === 5));
  assert.ok(result.trace?.events.some((e) => e.op === "prio_restore" && e.from === 5 && e.to === 2));
  assert.ok(result.trace?.events.some((e) => e.op === "obj_op" && e.action === "lock" && !e.ok));
});

test("queue wakes the consumer and carries the value", () => {
  const scenario = RTOS_SCENARIOS.find((s) => s.id === "queue")!;
  const result = simulateRtos(scenario.code, scenario.config);
  const queueOps = result.trace?.events.filter(
    (e) => e.op === "obj_op" && e.state?.kind === "queue" && e.state.name === "samples",
  );
  const stdout = result.trace?.events
    .filter((e) => e.op === "stdout")
    .map((e) => e.text)
    .join("");
  assert.equal(stdout, "sample=42\n");
  assert.ok(result.trace?.events.some((e) => e.op === "task_state" && e.reason === "QueueReceive"));
  assert.deepEqual(queueOps?.map((e) => [e.action, e.value, e.state?.buffer]), [
    ["receive", undefined, []],
    ["send", "42", ["42"]],
    ["receive", "42", []],
    ["send", "84", ["84"]],
  ]);
});

test("condvar predicate loop survives spurious wakeups while bare wait wakes prematurely", () => {
  const safeScenario = findScenario("condvar-spurious");
  const safeRes = simulateRtos(safeScenario.code, safeScenario.config);
  assert.ok(safeRes.trace?.events.some((e) => e.op === "spurious_wakeup"));
  const safeOut = safeRes.trace?.events
    .filter((e) => e.op === "stdout")
    .map((e) => e.text)
    .join("");
  assert.equal(safeOut, "consumer: dataReady=1\n");

  const buggyCode = `#include "rtos_sim.h"
std::mutex m;
std::condition_variable cv;
bool dataReady = false;
void consumer() {
  std::unique_lock<std::mutex> lk(m);
  if (!dataReady) cv.wait(lk);
  std::cout << "consumer: dataReady=" << dataReady << '\\n';
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
}`;
  const buggyRes = simulateRtos(buggyCode);
  const buggyOut = buggyRes.trace?.events
    .filter((e) => e.op === "stdout")
    .map((e) => e.text)
    .join("");
  assert.equal(buggyOut, "consumer: dataReady=0\n");
});

test("dining philosophers detects deadlock cycle and scoped_lock resolves it", () => {
  const deadlockScenario = findScenario("dining-philosophers");
  const deadlockRes = simulateRtos(deadlockScenario.code, deadlockScenario.config);
  assert.equal(deadlockRes.trace?.endedReason, "deadlock");
  const dlEvent = deadlockRes.trace?.events.find((e) => e.op === "deadlock_detected");
  assert.ok(dlEvent && dlEvent.op === "deadlock_detected");
  assert.ok(dlEvent.cycle.includes("P0") && dlEvent.cycle.includes("P1"));

  const fixedCode = `#include "rtos_sim.h"
std::mutex fork0;
std::mutex fork1;
void philosopher0() {
  std::scoped_lock lk(fork0, fork1);
  std::this_thread::sleep_for(2ms);
  std::cout << "P0 eating\\n";
}
void philosopher1() {
  std::scoped_lock lk(fork1, fork0);
  std::this_thread::sleep_for(2ms);
  std::cout << "P1 eating\\n";
}
int main() {
  rtos::thread p0({.name = "P0", .priority = 3}, philosopher0);
  rtos::thread p1({.name = "P1", .priority = 3}, philosopher1);
  p0.join();
  p1.join();
}`;
  const fixedRes = simulateRtos(fixedCode);
  assert.equal(fixedRes.trace?.endedReason, "completed");
  assert.ok(!fixedRes.trace?.events.some((e) => e.op === "deadlock_detected"));
});

test("blocking call inside ISR triggers an error diagnostic", () => {
  const badIsrCode = `#include "rtos_sim.h"
std::mutex m;
int main() {
  rtos::isr uart("UART_RX", [] {
    m.lock();
  });
  uart.trigger_at(1ms);
  std::this_thread::sleep_for(3ms);
}`;
  const res = simulateRtos(badIsrCode);
  assert.equal(res.trace?.endedReason, "aborted");
  assert.ok(res.diagnostics.some((d) => d.level === "error" && d.message.includes("ISR")));
});

test("timer and event_group wait_all synchronize properly", () => {
  const scenario = findScenario("timer-eventgroup");
  const res = simulateRtos(scenario.code, scenario.config);
  assert.equal(res.trace?.endedReason, "completed");
  assert.ok(res.trace?.events.some((e) => e.op === "timer_fire" && e.timer === "heartbeat"));
  const stdout = res.trace?.events
    .filter((e) => e.op === "stdout")
    .map((e) => e.text)
    .join("");
  assert.equal(stdout, "all ready bits=3\n");
});

test("reducer creates monotonic replay snapshots and supports kernel granularity", () => {
  const result = simulateRtos(RTOS_SCENARIOS[3].code, RTOS_SCENARIOS[3].config);
  assert.ok(result.trace);
  const snapshots = computeRtosSnapshots(result.trace.events, result.trace.timeline);
  assert.equal(snapshots.length, result.trace.events.length);
  assert.ok(snapshots.every((s, i) => i === 0 || s.tick >= snapshots[i - 1].tick));
  assert.ok(snapshots.at(-1)?.stdout.includes("device ready"));

  const lifecycle = findScenario("thread-lifecycle");
  const lcRes = simulateRtos(lifecycle.code, lifecycle.config);
  assert.ok(lcRes.trace);
  const stmtSnaps = computeRtosSnapshots(lcRes.trace.events, lcRes.trace.timeline, "statement");
  const kernelSnaps = computeRtosSnapshots(lcRes.trace.events, lcRes.trace.timeline, "kernel");
  assert.ok(kernelSnaps.length < stmtSnaps.length);
  assert.equal(kernelSnaps.at(-1)?.stdout, stmtSnaps.at(-1)?.stdout);
});
