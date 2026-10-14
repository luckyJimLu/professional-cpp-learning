import { test } from "node:test";
import assert from "node:assert/strict";
import { parseTraceOutput, computeSnapshots } from "../src/visualizer/reducer.ts";

test("parseTraceOutput separates [VIS] events from standard stdout", () => {
  const raw = `
Hello, World!
[VIS]{"op":"scope_enter","line":5,"name":"main"}
Computing data...
[VIS]{"op":"var_decl","line":6,"name":"x","type":"int","value":"42"}
Result is 42
[VIS]{"op":"scope_exit","line":7}
`.trim();

  const { events, cleanStdout } = parseTraceOutput(raw);
  assert.equal(events.length, 3);
  assert.equal(events[0].op, "scope_enter");
  assert.equal(events[1].op, "var_decl");
  assert.equal(events[2].op, "scope_exit");

  assert.ok(cleanStdout.includes("Hello, World!"));
  assert.ok(cleanStdout.includes("Computing data..."));
  assert.ok(cleanStdout.includes("Result is 42"));
  assert.ok(!cleanStdout.includes("[VIS]"));
});

test("computeSnapshots tracks stack frames and local objects", () => {
  const raw = `
[VIS]{"op":"scope_enter","line":5,"name":"main"}
[VIS]{"op":"obj_ctor","line":6,"id":"a","type":"Resource"}
[VIS]{"op":"obj_ctor","line":7,"id":"b","type":"Resource"}
[VIS]{"op":"obj_dtor","line":8,"id":"b"}
[VIS]{"op":"obj_dtor","line":9,"id":"a"}
[VIS]{"op":"scope_exit","line":10}
`.trim();

  const { events } = parseTraceOutput(raw);
  const snapshots = computeSnapshots(events);

  assert.equal(snapshots.length, 6);
  // Step 0: main 入栈
  assert.equal(snapshots[0].callStack.length, 1);
  assert.equal(snapshots[0].callStack[0].name, "main");

  // Step 2: a, b 都已构造
  assert.equal(snapshots[2].callStack[0].variables.length, 2);
  assert.equal(snapshots[2].callStack[0].variables[0].name, "a");
  assert.equal(snapshots[2].callStack[0].variables[1].name, "b");

  // Step 3: b 析构 (逆序先析构 b)
  assert.equal(snapshots[3].callStack[0].variables[1].status, "destroyed");
  assert.equal(snapshots[3].callStack[0].variables[0].status, "created");

  // Step 4: a 析构
  assert.equal(snapshots[4].callStack[0].variables[0].status, "destroyed");

  // Step 5: main 出栈
  assert.equal(snapshots[5].callStack.length, 0);
});

test("computeSnapshots detects dangling pointer and memory leak", () => {
  const raw = `
[VIS]{"op":"scope_enter","line":5,"name":"main"}
[VIS]{"op":"heap_alloc","line":6,"addr":"0x1000","size":16,"type":"Node"}
[VIS]{"op":"ptr_set","line":7,"var":"p","to":"0x1000","type":"Node*"}
[VIS]{"op":"heap_free","line":8,"addr":"0x1000"}
[VIS]{"op":"scope_exit","line":9}
`.trim();

  const { events } = parseTraceOutput(raw);
  const snapshots = computeSnapshots(events);

  // 检查 Step 2 (ptr_set): 指针正常指向 Heap #1
  const stepPtrSet = snapshots[2];
  assert.equal(stepPtrSet.pointers.length, 1);
  assert.equal(stepPtrSet.pointers[0].fromVar, "p");
  assert.equal(stepPtrSet.pointers[0].isDangling, false);

  // 检查 Step 3 (heap_free): 此时堆已释放，指针 p 变为悬挂指针 (dangling)
  const stepFree = snapshots[3];
  assert.equal(stepFree.pointers.length, 1);
  assert.equal(stepFree.pointers[0].isDangling, true);
  assert.ok(stepFree.warnings.some((w) => w.includes("悬挂指针警告")));
});

test("computeSnapshots tracks std::move ownership transfer", () => {
  const raw = `
[VIS]{"op":"scope_enter","line":5,"name":"main"}
[VIS]{"op":"heap_alloc","line":6,"addr":"0x2000","size":32,"type":"Data"}
[VIS]{"op":"ptr_set","line":7,"var":"p1","to":"0x2000","type":"unique_ptr<Data>","isSmart":true}
[VIS]{"op":"ptr_move","line":8,"from":"p1","toVar":"p2","addr":"0x2000"}
`.trim();

  const { events } = parseTraceOutput(raw);
  const snapshots = computeSnapshots(events);

  // Step 3 (ptr_move)
  const moveSnap = snapshots[3];
  const frame = moveSnap.callStack[0];
  const p1 = frame.variables.find((v) => v.name === "p1");
  const p2 = frame.variables.find((v) => v.name === "p2");

  assert.ok(p1 && p2);
  assert.equal(p1.value, "nullptr");
  assert.equal(p1.pointsToRaw, null);

  assert.equal(p2.value, "0x2000");
  assert.equal(p2.pointsToLabel, "Heap #1");

  // 边只有一条，从 p2 指向 Heap #1
  assert.equal(moveSnap.pointers.length, 1);
  assert.equal(moveSnap.pointers[0].fromVar, "p2");
});
