import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCppSubset } from "../src/rtos-sim/frontend/parse.ts";
import { simulateRtos } from "../src/rtos-sim/simulate.ts";
import { computeRtosSnapshots } from "../src/rtos-sim/rtosReducer.ts";
import { RTOS_SCENARIOS } from "../src/rtos-sim/scenarios.ts";

test("parser reports unsupported pointer syntax with a source line",()=>{
  const result=parseCppSubset("int main() {\n  int* pointer = nullptr;\n}");
  assert.equal(result.program,null);
  assert.ok(result.diagnostics.some(d=>d.level==="error"&&d.line===2));
});

test("simulation is deterministic",()=>{
  const scenario=RTOS_SCENARIOS[0];
  const first=simulateRtos(scenario.code,scenario.config);
  const second=simulateRtos(scenario.code,scenario.config);
  assert.deepEqual(first,second);
  assert.equal(first.trace?.endedReason,"completed");
  assert.ok((first.trace?.timeline.length??0)>2);
});

test("mutex contention produces priority inheritance",()=>{
  const scenario=RTOS_SCENARIOS.find(s=>s.id==="mutex")!;
  const result=simulateRtos(scenario.code,scenario.config);
  assert.ok(result.trace?.events.some(e=>e.op==="prio_inherit"));
  assert.ok(result.trace?.events.some(e=>e.op==="obj_op"&&e.action==="lock"&&!e.ok));
});

test("queue wakes the consumer and carries the value",()=>{
  const scenario=RTOS_SCENARIOS.find(s=>s.id==="queue")!;
  const result=simulateRtos(scenario.code,scenario.config);
  const stdout=result.trace?.events.filter(e=>e.op==="stdout").map(e=>e.text).join("");
  assert.equal(stdout,"sample=42\n");
  assert.ok(result.trace?.events.some(e=>e.op==="task_state"&&e.reason==="QueueReceive"));
});

test("reducer creates monotonic replay snapshots",()=>{
  const result=simulateRtos(RTOS_SCENARIOS[3].code,RTOS_SCENARIOS[3].config);
  assert.ok(result.trace);
  const snapshots=computeRtosSnapshots(result.trace.events,result.trace.timeline);
  assert.equal(snapshots.length,result.trace.events.length);
  assert.ok(snapshots.every((s,i)=>i===0||s.tick>=snapshots[i-1].tick));
  assert.ok(snapshots.at(-1)?.stdout.includes("device ready"));
});
