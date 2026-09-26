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
  resolve: (result: CompileRunResult) => void;
  reject: (error: Error) => void;
  onProgress?: (value: number) => void;
}

let worker: Worker | null = null;
let sequence = 0;
const pending = new Map<number, PendingRequest>();

function compilerBaseUrl() {
  return new URL(`${import.meta.env.BASE_URL}clang/`, window.location.href).href;
}

function getWorker() {
  if (worker) return worker;

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
    const error = new Error(event.message || "Clang worker failed.");
    for (const request of pending.values()) request.reject(error);
    pending.clear();
    worker?.terminate();
    worker = null;
  };

  return worker;
}

export function compileAndRun(
  code: string,
  onProgress?: (value: number) => void,
): Promise<CompileRunResult> {
  const id = ++sequence;

  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject, onProgress });
    getWorker().postMessage({
      type: "run",
      id,
      code,
      baseUrl: compilerBaseUrl(),
    });
  });
}

export function resetCompiler() {
  if (!worker) return;
  worker.postMessage({ type: "reset" });
}
