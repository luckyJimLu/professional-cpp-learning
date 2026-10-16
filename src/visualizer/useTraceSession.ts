import { useCallback, useReducer, useRef } from "react";
import { compileAndRun, type CompileRunResult } from "../lib/browserCompiler";
import {
  computeSnapshotsWithDiagnostics,
  inferTraceEventsFromCodeAndOutput,
  parseTraceOutput,
} from "./reducer";
import { initialTraceSession, traceSessionReducer } from "./traceSessionState";
import { materializeTrace } from "./traceProtocol";
import type { TraceSessionState, VisualizerTrace } from "./types";

function stripVisLines(text: string): string {
  return text
    .split(/\r?\n/)
    .filter((line) => !line.trim().startsWith("[VIS]"))
    .join("\n");
}

function formatTerminal(result: CompileRunResult, cleanStdout: string): string {
  const lines = ["$ clang++ main.cpp -std=gnu++23 -Wall -Wextra -Wconversion -Wpedantic"];
  if (result.errors.length) lines.push(result.errors.join("\n"));
  if (result.stderr.trim()) lines.push(result.stderr.trimEnd());
  lines.push(`[Compilation finished in ${result.compileMs}ms]`, "", "$ ./main");
  const output = cleanStdout || stripVisLines(result.output || result.stdout);
  if (output.trim()) lines.push(output.trimEnd());
  else if (result.exitCode === 0) lines.push("Program exited successfully with no output.");
  lines.push("", `Process finished with exit ${result.exitCode ?? "unknown"} (execution: ${result.runMs ?? 0}ms)`);
  return lines.join("\n");
}

export function useTraceSession(initialCode: string) {
  const [state, dispatch] = useReducer(traceSessionReducer, initialCode, initialTraceSession);
  const runSequence = useRef(0);

  const setCode = useCallback((code: string) => dispatch({ type: "SET_CODE", code }), []);
  const setStep = useCallback((step: number) => dispatch({ type: "SET_STEP", step }), []);
  const reset = useCallback((code: string) => dispatch({ type: "RESET", code }), []);
  const loadTrace = useCallback((trace: VisualizerTrace) => {
    const materialized = materializeTrace(trace);
    dispatch({
      type: "LOAD_TRACE",
      code: materialized.trace.sourceCode,
      traceId: materialized.trace.id,
      mode: materialized.trace.mode,
      accuracy: materialized.trace.accuracy,
      snapshots: materialized.snapshots,
      diagnostics: materialized.diagnostics,
    });
  }, []);

  const runApproximate = useCallback((stdout = "") => {
    const events = inferTraceEventsFromCodeAndOutput(state.code, stdout, 0);
    const result = computeSnapshotsWithDiagnostics(events);
    dispatch({
      type: "RUN_READY",
      mode: "regex",
      snapshots: result.snapshots,
      output: stdout,
      diagnostics: ["当前为 Regex 近似推演，不代表完整 C++ 运行时语义。", ...result.diagnostics],
    });
    return result.snapshots;
  }, [state.code]);

  const run = useCallback(async () => {
    const sequence = ++runSequence.current;
    dispatch({ type: "RUN_START" });
    try {
      const result = await compileAndRun(state.code, (progress) => {
        if (sequence === runSequence.current) dispatch({ type: "RUN_PROGRESS", progress });
      });
      if (sequence !== runSequence.current) return false;
      const parsed = parseTraceOutput(result.stdout);
      const terminal = formatTerminal(result, parsed.cleanStdout);
      if (result.exitCode !== 0) {
        dispatch({
          type: "RUN_ERROR",
          message: "Clang 编译或程序执行失败；旧轨迹仍可查看。",
          output: terminal,
        });
        return false;
      }
      const hasVisualizerEvents = parsed.events.some((event) => event.op !== "stdout");
      const events = hasVisualizerEvents
        ? parsed.events
        : inferTraceEventsFromCodeAndOutput(state.code, parsed.cleanStdout, result.exitCode ?? 0);
      const computed = computeSnapshotsWithDiagnostics(events);
      dispatch({
        type: "RUN_READY",
        mode: hasVisualizerEvents ? "clang-vis" : "regex",
        snapshots: computed.snapshots,
        output: terminal,
        diagnostics: [
          ...parsed.diagnostics,
          ...(hasVisualizerEvents ? [] : ["程序未输出 VIS 事件，已生成 Regex 近似教学轨迹。"]),
          ...computed.diagnostics,
        ],
      });
      return true;
    } catch (error) {
      if (sequence !== runSequence.current) return false;
      dispatch({
        type: "RUN_ERROR",
        message: `Clang WASM 工具链不可用：${error instanceof Error ? error.message : String(error)}`,
      });
      return false;
    }
  }, [state.code]);

  return { state, setCode, setStep, reset, loadTrace, run, runApproximate };
}
