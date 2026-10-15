import { preprocessCppCode } from "../visualizer/embeddedHeader";

export interface CompileRunResult {
  mode: "clang-wasm";
  stdout: string;
  stderr: string;
  output: string;
  errors: string[];
  exitCode: number | null;
  compileMs: number;
  runMs: number | null;
}

interface PendingRequest {
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

      request.reject(new Error(message.message));
    };

    worker.onerror = (event) => {
      console.warn("Clang worker encountered error, activating simulation fallback:", event);
      for (const [id, request] of pending.entries()) {
        request.reject(new Error("Clang WASM Worker 运行失败"));
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
    pending.set(id, { resolve, reject, onProgress });

    try {
      const w = getWorker();
      if (!w) {
        reject(new Error("无法初始化 Clang WASM Worker"));
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
    } catch (error) {
      reject(error instanceof Error ? error : new Error(String(error)));
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
