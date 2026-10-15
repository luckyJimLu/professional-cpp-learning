import type { TraceSessionState } from "./types";

export type SessionAction =
  | { type: "SET_CODE"; code: string }
  | { type: "RESET"; code: string }
  | { type: "LOAD_TRACE"; code: string; traceId?: string; mode: "preset" | "clang-vis" | "regex"; accuracy: "exact" | "approximate"; snapshots: TraceSessionState["snapshots"]; diagnostics: string[] }
  | { type: "SET_STEP"; step: number }
  | { type: "RUN_START" }
  | { type: "RUN_PROGRESS"; progress: number }
  | { type: "RUN_READY"; mode: "clang-vis" | "regex"; snapshots: TraceSessionState["snapshots"]; output: string; diagnostics: string[] }
  | { type: "RUN_ERROR"; message: string; output?: string };

export function initialTraceSession(code: string): TraceSessionState {
  return {
    code,
    executedCode: "",
    mode: "none",
    accuracy: "none",
    status: "idle",
    progress: 0,
    snapshots: [],
    currentStep: 0,
    terminalOutput: "",
    diagnostics: [],
    isStale: false,
  };
}

export function traceSessionReducer(state: TraceSessionState, action: SessionAction): TraceSessionState {
  switch (action.type) {
    case "SET_CODE":
      return { ...state, code: action.code, isStale: Boolean(state.executedCode && action.code !== state.executedCode) };
    case "RESET":
      return initialTraceSession(action.code);
    case "LOAD_TRACE": {
      return { ...initialTraceSession(action.code), traceId: action.traceId, executedCode: action.code, mode: action.mode, accuracy: action.accuracy, status: "ready", progress: 1, snapshots: action.snapshots, diagnostics: action.diagnostics };
    }
    case "SET_STEP": {
      const max = Math.max(0, state.snapshots.length - 1);
      return { ...state, currentStep: Math.min(max, Math.max(0, action.step)) };
    }
    case "RUN_START":
      return { ...state, status: "loading", progress: 0, diagnostics: [], terminalOutput: "", isStale: false };
    case "RUN_PROGRESS":
      return { ...state, status: action.progress >= 1 ? "running" : "loading", progress: action.progress };
    case "RUN_READY":
      return { ...state, executedCode: state.code, mode: action.mode, accuracy: action.mode === "regex" ? "approximate" : "exact", status: "ready", progress: 1, snapshots: action.snapshots, currentStep: 0, terminalOutput: action.output, diagnostics: action.diagnostics, isStale: false };
    case "RUN_ERROR":
      return { ...state, status: "error", progress: 0, terminalOutput: action.output ?? state.terminalOutput, diagnostics: [action.message] };
  }
}
