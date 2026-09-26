declare module "@live-codes/clang-wasm" {
  export type CppStandard =
    | "gnu++11"
    | "gnu++14"
    | "gnu++17"
    | "gnu++20"
    | "gnu++23";

  export interface CompilerOptions {
    baseUrl?: URL;
    std?: CppStandard | null;
    compileArgs?: string[];
    args?: string[];
    fileName?: string;
    onProgress?: (value: number) => void;
    maxAssetBytes?: number;
  }

  export interface CompilerRunOptions {
    std?: CppStandard | null;
    args?: string[];
    compileArgs?: string[];
    fileName?: string;
  }

  export interface CompilerRunResult {
    stdout: string;
    stderr: string;
    output: string;
    errors: string[];
    exitCode: number | null;
    compileMs: number;
    runMs: number | null;
  }

  export interface Compiler {
    readonly std: CppStandard | null;
    readonly standards: CppStandard[];
    run(
      code: string,
      input?: string | Uint8Array,
      options?: CompilerRunOptions,
    ): Promise<CompilerRunResult>;
    dispose(): void;
  }

  export function createCompiler(
    language: "cpp" | "c++" | "cc" | "cxx",
    options?: CompilerOptions,
  ): Promise<Compiler>;
}
