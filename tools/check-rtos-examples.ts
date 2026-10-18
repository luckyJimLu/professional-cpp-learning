#!/usr/bin/env node
/**
 * 校验 examples/rtos/*.cpp 与 RTOS_SCENARIOS 中的所有预置场景：
 * 1. 能被 parseCppSubset 零错误解析
 * 2. 能被 simulateRtos 确定性模拟且 0 个 error 诊断
 * 3. 快照归约器 computeRtosSnapshots 能正常生成非空快照序列
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { computeRtosSnapshots } from "../src/rtos-sim/rtosReducer.ts";
import { RTOS_SCENARIOS } from "../src/rtos-sim/scenarios.ts";
import { simulateRtos } from "../src/rtos-sim/simulate.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const examplesDir = path.join(rootDir, "examples", "rtos");

let failures = 0;

if (!fs.existsSync(examplesDir)) {
  console.error("Missing directory: examples/rtos");
  process.exit(1);
}

const cppFiles = fs
  .readdirSync(examplesDir)
  .filter((f) => f.endsWith(".cpp"))
  .sort();

if (cppFiles.length < 8) {
  console.error(`Expected at least 8 example files in examples/rtos/, found ${cppFiles.length}`);
  failures++;
}

for (const file of cppFiles) {
  const fullPath = path.join(examplesDir, file);
  const code = fs.readFileSync(fullPath, "utf8");
  const result = simulateRtos(code);
  const errors = result.diagnostics.filter((d) => d.level === "error");
  if (!result.trace || errors.length > 0) {
    console.error(`✗ ${file}: simulation failed with ${errors.length} error(s):`, errors);
    failures++;
    continue;
  }
  const snapshots = computeRtosSnapshots(result.trace.events, result.trace.timeline);
  if (snapshots.length === 0) {
    console.error(`✗ ${file}: produced 0 snapshots`);
    failures++;
    continue;
  }
  console.log(
    `✓ ${file}: ${result.trace.events.length} events, ${snapshots.length} snapshots, ended=${result.trace.endedReason}`,
  );
}

for (const scenario of RTOS_SCENARIOS) {
  const result = simulateRtos(scenario.code, scenario.config);
  const errors = result.diagnostics.filter((d) => d.level === "error");
  if (!result.trace || errors.length > 0) {
    console.error(`✗ scenario [${scenario.id}]: failed with ${errors.length} error(s):`, errors);
    failures++;
  }
}

if (failures > 0) {
  console.error(`\nRTOS examples check failed with ${failures} problem(s).`);
  process.exit(1);
}

console.log(`\nAll ${cppFiles.length} RTOS examples and ${RTOS_SCENARIOS.length} preset scenarios verified (0 errors).`);
