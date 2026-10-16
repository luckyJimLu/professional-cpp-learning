import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseTraceOutput, computeSnapshots, computeSnapshotsWithDiagnostics, generateSnapshotsFromCodeAndOutput, inferTraceEventsFromCodeAndOutput, MAX_EVENTS, MAX_SNAPSHOTS } from "../src/visualizer/reducer.ts";
import { preprocessCppCode, VISUALIZER_HEADER_SOURCE } from "../src/visualizer/embeddedHeader.ts";

test("include/visualizer.h and VISUALIZER_HEADER_SOURCE remain strictly synchronized", () => {
  const diskHeader = readFileSync(new URL("../include/visualizer.h", import.meta.url), "utf8").trim();
  assert.equal(VISUALIZER_HEADER_SOURCE.trim(), diskHeader);
});

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
  assert.deepEqual(events.map((event) => event.op), [
    "stdout", "scope_enter", "stdout", "var_decl", "stdout", "scope_exit",
  ]);

  assert.ok(cleanStdout.includes("Hello, World!"));
  assert.ok(cleanStdout.includes("Computing data..."));
  assert.ok(cleanStdout.includes("Result is 42"));
  assert.ok(!cleanStdout.includes("[VIS]"));
});

test("block scope exit invalidates pointers to destroyed stack variables", () => {
  const snapshots = computeSnapshots([
    { op: "scope_enter", line: 1, name: "main" },
    { op: "var_decl", line: 2, name: "p", type: "int*", value: "0x0", addr: "0x10" },
    { op: "enter_scope", line: 3, name: "inner" },
    { op: "var_decl", line: 4, name: "value", type: "int", value: "42", addr: "0x20" },
    { op: "ptr_set", line: 5, var: "p", to: "0x20", type: "int*" },
    { op: "exit_scope", line: 6, name: "inner" },
  ]);
  assert.equal(snapshots[4].pointers[0].target?.kind, "stack");
  assert.equal(snapshots[5].callStack[0].variables.some((v) => v.name === "value"), false);
  assert.equal(snapshots[5].pointers[0].isDangling, true);
  assert.equal(snapshots[5].pointers[0].relationKind, "dangling_ptr");
});

test("regex inference frees the named allocation instead of the latest allocation", () => {
  const code = `int main() {
    int* x = new int(1);
    int* y = new int(2);
    delete x;
    return 0;
  }`;
  const snapshots = computeSnapshots(inferTraceEventsFromCodeAndOutput(code, "", 0));
  const final = snapshots.at(-1)!;
  assert.equal(final.heap[0].status, "freed");
  assert.equal(final.heap[1].status, "leaked");
});

test("address reuse keeps distinct allocation identities", () => {
  const snapshots = computeSnapshots([
    { op: "scope_enter", line: 1, name: "main" },
    { op: "heap_alloc", line: 2, addr: "0x100", size: 4 },
    { op: "heap_free", line: 3, addr: "0x100" },
    { op: "heap_alloc", line: 4, addr: "0x100", size: 8 },
  ]);
  const heap = snapshots.at(-1)!.heap;
  assert.equal(heap.length, 2);
  assert.notEqual(heap[0].allocationId, heap[1].allocationId);
  assert.equal(heap[0].status, "freed");
  assert.equal(heap[1].status, "alive");
});

test("trace computation applies event and snapshot hard caps", () => {
  const events = [
    { op: "scope_enter" as const, line: 1, name: "main" },
    ...Array.from({ length: MAX_EVENTS + 25 }, (_, index) => ({
      op: "step" as const,
      line: index + 2,
      label: `step ${index}`,
    })),
  ];
  const result = computeSnapshotsWithDiagnostics(events);
  assert.equal(result.snapshots.length, MAX_SNAPSHOTS);
  assert.ok(result.diagnostics.some((message) => message.includes(String(MAX_EVENTS))));
  assert.ok(result.diagnostics.some((message) => message.includes(String(MAX_SNAPSHOTS))));
});

test("invalid events are diagnosed and later valid events still reduce", () => {
  const result = computeSnapshotsWithDiagnostics([
    { op: "heap_alloc", line: 1 } as never,
    { op: "scope_enter", line: 2, name: "main" },
  ]);
  assert.equal(result.snapshots.length, 1);
  assert.equal(result.snapshots[0].callStack[0].name, "main");
  assert.ok(result.diagnostics.some((message) => message.includes("不合法事件")));
});

test("embedded visualizer header restores main.cpp line numbering", () => {
  const processed = preprocessCppCode('#include "visualizer.h"\nint main() { return 0; }');
  assert.match(processed, /#line 1 "visualizer\.h"/);
  assert.match(processed, /#line 2 "main\.cpp"/);
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
  assert.equal(p1.value, "moved (nullptr)");
  assert.equal(p1.pointsToRaw, null);

  assert.equal(p2.value, "0x2000");
  assert.equal(p2.pointsToLabel, "Heap #1");

  // 边只有一条，从 p2 指向 Heap #1
  assert.equal(moveSnap.pointers.length, 1);
  assert.equal(moveSnap.pointers[0].fromVar, "p2");
});

test("computeSnapshots builds heap-to-heap edges via heap_field_set", () => {
  const snapshots = computeSnapshots([
    { op: "scope_enter", line: 1, name: "main" },
    { op: "heap_alloc", line: 2, addr: "0x3010", size: 16, type: "Node", label: "Node #1" },
    { op: "heap_alloc", line: 3, addr: "0x3020", size: 16, type: "Node", label: "Node #2" },
    { op: "heap_field_set", line: 4, addr: "0x3010", field: "next", value: "0x3020" },
  ]);
  const last = snapshots.at(-1)!;
  assert.equal(last.heap[0].fields?.next, "0x3020");
  assert.equal(last.pointers.length, 1);
  assert.equal(last.pointers[0].fromVar, "Node #1->next");
  assert.equal(last.pointers[0].toRawAddr, "0x3020");
});

test("inferTraceEventsFromCodeAndOutput handles multi-line comments, inner block scopes, and std::move", () => {
  const code = `
#include <memory>
struct Widget { int id; };
/*
  int* ignored_in_comment = new int(999);
*/
int main() {
  auto p1 = std::make_unique<Widget>(1);
  {
    Widget scoped_w{2};
  }
  auto p2 = std::move(p1);
  return 0;
}
  `.trim();

  const events = inferTraceEventsFromCodeAndOutput(code, "", 0);
  const ops = events.map((e) => e.op);
  assert.ok(ops.includes("enter_scope"), "inner block should emit enter_scope");
  assert.ok(ops.includes("exit_scope"), "inner block should emit exit_scope");
  assert.ok(ops.includes("ptr_move"), "std::move should emit ptr_move");

  // Verify scoped_w is destroyed before ptr_move
  const dtorIdx = events.findIndex((e) => e.op === "obj_dtor" && e.id === "scoped_w");
  const moveIdx = events.findIndex((e) => e.op === "ptr_move");
  assert.ok(dtorIdx > 0 && dtorIdx < moveIdx, "scoped_w must be destroyed upon inner block exit before std::move");
});

test("generateSnapshotsFromCodeAndOutput generates stack frames and RAII destruction for standard C++ code", () => {
  const code = `
#include <iostream>

class GpioResetPolicy {
 public:
  bool Reset() { return true; }
};

class ModemController {
 public:
  explicit ModemController(GpioResetPolicy& p) {}
  bool Recover() { return true; }
};

int main() {
  GpioResetPolicy gpio_reset;
  ModemController board_a{gpio_reset};
  const bool ok = board_a.Recover();
  std::cout << "reset via GPIO\\n";
  return 0;
}
  `.trim();

  const stdout = "reset via GPIO\n";
  const snapshots = generateSnapshotsFromCodeAndOutput(code, stdout, 0);

  // 必须生成完整的步骤快照
  assert.ok(snapshots.length >= 4);

  // 校验包含 main 栈帧
  assert.equal(snapshots[0].callStack[0].name, "main");

  // 校验对象构造被记录
  const objectSnap = snapshots.find((s) => s.callStack[0]?.variables.some((v) => v.name === "gpio_reset"));
  assert.ok(objectSnap, "gpio_reset should be tracked on call stack");

  // 校验 RAII 逆序析构（board_a 先析构，gpio_reset 后析构）
  const dtorSnaps = snapshots.filter((s) => s.activeOp === "obj_dtor");
  assert.ok(dtorSnaps.length >= 2, "Both objects should have RAII destruction events");
  assert.ok(dtorSnaps[0].description.includes("board_a"));
  assert.ok(dtorSnaps[1].description.includes("gpio_reset"));
});

