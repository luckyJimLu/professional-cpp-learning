import { test } from "node:test";
import assert from "node:assert/strict";
import { simulateRtos } from "../src/rtos-sim/simulate.ts";
import { findScenario } from "../src/rtos-sim/scenarios.ts";

test("rtos-kernel: deterministic scheduling and round-robin time slicing", () => {
  const s = findScenario("round-robin");
  const r1 = simulateRtos(s.code, s.config);
  const r2 = simulateRtos(s.code, s.config);
  assert.deepEqual(r1, r2);
  assert.equal(r1.trace?.endedReason, "completed");
});

test("rtos-kernel: suspend, resume, and user function return values", () => {
  const s = findScenario("thread-lifecycle");
  const res = simulateRtos(s.code, s.config);
  assert.equal(res.trace?.endedReason, "completed");
  assert.ok(res.trace?.events.some((e) => e.op === "task_state" && e.to === "Suspended"));
  assert.ok(res.trace?.events.some((e) => e.op === "task_state" && e.from === "Suspended" && e.to === "Ready"));
});
