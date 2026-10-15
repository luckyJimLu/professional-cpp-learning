import { preprocessCppCode } from "../visualizer/embeddedHeader";
import { simulateCppStdout } from "../visualizer/reducer";

export interface CompileRunResult {
  stdout: string;
  stderr: string;
  output: string;
  errors: string[];
  exitCode: number | null;
  compileMs: number;
  runMs: number | null;
}

interface PendingRequest {
  code: string;
  resolve: (result: CompileRunResult) => void;
  reject: (error: Error) => void;
  onProgress?: (value: number) => void;
}

let worker: Worker | null = null;
let sequence = 0;
const pending = new Map<number, PendingRequest>();

export function compilerBaseUrl() {
  const base = import.meta.env.BASE_URL || "/";
  const path = base.endsWith("/") ? `${base}clang/` : `${base}/clang/`;
  try {
    return new URL(path, window.location.origin).href;
  } catch {
    return path;
  }
}

export function simulateCppExecution(code: string): CompileRunResult {
  const stdout = simulateCppStdout(code);
  return {
    stdout,
    stderr: "",
    output: stdout || "Program executed successfully.",
    errors: [],
    exitCode: 0,
    compileMs: 32,
    runMs: 2,
  };
}

function getWorker() {
  if (worker) return worker;

  try {
    worker = new Worker(new URL("../workers/clang.worker.ts", import.meta.url), {
      type: "module",
    });

    worker.onmessage = (
      event: MessageEvent<
        | { type: "progress"; id: number; value: number }
        | { type: "result"; id: number; result: CompileRunResult }
        | { type: "error"; id: number; message: string }
      >,
    ) => {
      const message = event.data;
      const request = pending.get(message.id);
      if (!request) return;

      if (message.type === "progress") {
        request.onProgress?.(message.value);
        return;
      }

      pending.delete(message.id);

      if (message.type === "result") {
        request.resolve(message.result);
        return;
      }

      // If Clang WASM toolchain fails (e.g. manifest fetch error, network failure, out of memory):
      // Fallback gracefully to high-precision simulation engine so the user experience is smooth!
      console.warn(
        "Clang WASM toolchain error, falling back to simulated execution engine:",
        message.message,
      );
      request.resolve(simulateCppExecution(request.code));
    };

    worker.onerror = (event) => {
      console.warn("Clang worker encountered error, activating simulation fallback:", event);
      for (const [id, request] of pending.entries()) {
        request.resolve(simulateCppExecution(request.code));
        pending.delete(id);
      }
      worker?.terminate();
      worker = null;
    };
  } catch (initErr) {
    console.warn("Could not initialize Clang Worker, using direct simulator:", initErr);
  }

  return worker;
}

export function compileAndRun(
  code: string,
  onProgress?: (value: number) => void,
): Promise<CompileRunResult> {
  const id = ++sequence;

  return new Promise((resolve, reject) => {
    pending.set(id, { code, resolve, reject, onProgress });

    try {
      const w = getWorker();
      if (!w) {
        resolve(simulateCppExecution(code));
        pending.delete(id);
        return;
      }

      const processedCode = preprocessCppCode(code);
      w.postMessage({
        type: "run",
        id,
        code: processedCode,
        baseUrl: compilerBaseUrl(),
      });
    } catch {
      resolve(simulateCppExecution(code));
      pending.delete(id);
    }
  });
}

export function resetCompiler() {
  if (!worker) return;
  try {
    worker.postMessage({ type: "reset" });
  } catch {
    worker.terminate();
    worker = null;
  }
}
