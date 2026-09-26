import { createCompiler } from "@live-codes/clang-wasm";

interface RunMessage {
  type: "run";
  id: number;
  code: string;
  baseUrl: string;
}

interface ResetMessage {
  type: "reset";
}

type IncomingMessage = RunMessage | ResetMessage;

let compilerPromise: ReturnType<typeof createCompiler> | null = null;
let progressRequestId = 0;

async function getCompiler(baseUrl: string, requestId: number) {
  progressRequestId = requestId;

  if (!compilerPromise) {
    compilerPromise = createCompiler("cpp", {
      baseUrl: new URL(baseUrl),
      std: "gnu++23",
      compileArgs: ["-Wall", "-Wextra", "-Wconversion", "-Wpedantic"],
      onProgress(value) {
        self.postMessage({
          type: "progress",
          id: progressRequestId,
          value,
        });
      },
    }).catch((error: unknown) => {
      compilerPromise = null;
      throw error;
    });
  }

  return compilerPromise;
}

self.onmessage = async (event: MessageEvent<IncomingMessage>) => {
  const message = event.data;

  if (message.type === "reset") {
    if (compilerPromise) {
      try {
        const compiler = await compilerPromise;
        compiler.dispose();
      } catch {
        // The next run will recreate a clean compiler instance.
      }
    }
    compilerPromise = null;
    return;
  }

  try {
    const compiler = await getCompiler(message.baseUrl, message.id);
    const result = await compiler.run(message.code, "");

    self.postMessage({
      type: "result",
      id: message.id,
      result: {
        stdout: result.stdout,
        stderr: result.stderr,
        output: result.output,
        errors: result.errors,
        exitCode: result.exitCode,
        compileMs: result.compileMs,
        runMs: result.runMs,
      },
    });
  } catch (error) {
    self.postMessage({
      type: "error",
      id: message.id,
      message: error instanceof Error ? error.message : String(error),
    });
  }
};
