import { test } from "node:test";
import assert from "node:assert/strict";
import { computeRtosSnapshots } from "../src/rtos-sim/rtosReducer.ts";
import { simulateRtos } from "../src/rtos-sim/simulate.ts";
import { findScenario } from "../src/rtos-sim/scenarios.ts";

test("rtos-reducer: monotonic timelineUntilTick, stack frames, and granularity filtering", () => {
  const s = findScenario("thread-lifecycle");
  const res = simulateRtos(s.code, s.config);
  assert.ok(res.trace);

  const stmtSnaps = computeRtosSnapshots(res.trace.events, res.trace.timeline, "statement");
  const kernelSnaps = computeRtosSnapshots(res.trace.events, res.trace.timeline, "kernel");

  assert.equal(stmtSnaps.length, res.trace.events.length);
  assert.ok(kernelSnaps.length < stmtSnaps.length);
  assert.ok(stmtSnaps.every((snap, i) => i === 0 || snap.timelineUntilTick >= stmtSnaps[i - 1].timelineUntilTick));
  assert.ok(stmtSnaps.at(-1)?.globals.some((g) => g.name === "progress" && g.value === "2"));
});
