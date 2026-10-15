import { test } from "node:test";
import assert from "node:assert/strict";
import { traceSessionReducer } from "../src/visualizer/traceSessionState.ts";
import { normalizeVisualizerTrace } from "../src/visualizer/traceProtocol.ts";
import type { TraceSessionState } from "../src/visualizer/types.ts";

const baseState: TraceSessionState = {
  code: "int main() {}",
  executedCode: "int main() {}",
  mode: "regex",
  accuracy: "approximate",
  status: "ready",
  progress: 1,
  snapshots: [],
  currentStep: 0,
  terminalOutput: "",
  diagnostics: [],
  isStale: false,
};

test("editing code preserves a ready trace and marks it stale", () => {
  const next = traceSessionReducer(baseState, {
    type: "SET_CODE",
    code: "int main() { return 0; }",
  });
  assert.equal(next.status, "ready");
  assert.equal(next.isStale, true);
  assert.equal(next.executedCode, baseState.executedCode);
});

test("step changes are clamped to the available snapshot range", () => {
  const state = {
    ...baseState,
    snapshots: [{
      stepIndex: 0,
      line: 1,
      description: "start",
      activeOp: "step" as const,
      callStack: [],
      heap: [],
      pointers: [],
      stdout: "",
      warnings: [],
    }],
  };
  assert.equal(traceSessionReducer(state, { type: "SET_STEP", step: 99 }).currentStep, 0);
  assert.equal(traceSessionReducer(state, { type: "SET_STEP", step: -4 }).currentStep, 0);
});

test("legacy snapshot traces normalize to schema version 2", () => {
  const trace = normalizeVisualizerTrace({
    sourceCode: "int main() {}",
    snapshots: [{
      stepIndex: 9,
      line: 1,
      description: "start",
      activeOp: "step",
      callStack: [],
      heap: [],
      pointers: [],
      stdout: "",
      warnings: [],
    }],
  });
  assert.equal(trace.schemaVersion, 2);
  assert.equal(trace.mode, "preset");
  assert.equal(trace.snapshots?.[0].stepIndex, 0);
});

test("malformed imported traces are rejected", () => {
  assert.throws(
    () => normalizeVisualizerTrace({ sourceCode: "int main() {}", snapshots: [{}] }),
    /callStack/,
  );
});
