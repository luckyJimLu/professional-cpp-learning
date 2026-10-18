import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCppSubset } from "../src/rtos-sim/frontend/parse.ts";

test("rtos-parser: accepts supported C++ subset and reports line-level errors on unsupported constructs", () => {
  const badPtr = parseCppSubset("int main() {\n  int* p = nullptr;\n}");
  assert.equal(badPtr.program, null);
  assert.ok(badPtr.diagnostics.some((d) => d.level === "error" && d.line === 2));

  const badClass = parseCppSubset("struct Foo { int x; };\nint main() { return 0; }");
  assert.equal(badClass.program, null);
  assert.ok(badClass.diagnostics.some((d) => d.level === "error" && d.line === 1));

  const valid = parseCppSubset(`#include "rtos_sim.h"
std::mutex m;
int helper(int a) { return a + 1; }
int main() {
  int v = helper(41);
  std::cout << v << '\\n';
  return 0;
}`);
  assert.ok(valid.program);
  assert.equal(valid.diagnostics.length, 0);
});
