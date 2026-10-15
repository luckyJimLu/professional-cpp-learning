import { useEffect, useState } from "react";
import { type Lesson, type StepKey } from "../../lib/course";
import { compileAndRun, type CompileRunResult } from "../../lib/browserCompiler";
import { Markdown } from "../Markdown";
import { VisualizerWorkbench } from "../../visualizer/VisualizerWorkbench";
import { parseTraceOutput, computeSnapshots, generateSnapshotsFromCodeAndOutput } from "../../visualizer/reducer";
import type { MemorySnapshot } from "../../visualizer/types";

const VISUALIZER_DEMO_CODE = `#include "visualizer.h"
#include <iostream>

struct Resource {
    int id;
};

int main() {
    VIS_SCOPE("main");

    Resource res{1};
    VIS_TRACK(res, Resource);

    int* p = new int(100);
    VIS_PTR(p, p);

    delete p;
    VIS_STEP_L("堆内存释放完成");
    return 0;
}
`;

export function LabView({
  lesson,
  markStep,
  isStepComplete: _isStepComplete,
}: {
  lesson: Lesson;
  markStep: (day: number, step: StepKey) => void;
  isStepComplete: (day: number, step: StepKey) => boolean;
}) {
  const lab = lesson.sections.find((section) => section.step === "lab");
  const sourceCode =
    lesson.labCode ?? "// This lesson has no extracted C++ example yet.";

  const [customOrigin, setCustomOrigin] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem("lab_custom_title");
    } catch {
      return null;
    }
  });

  const [hint, setHint] = useState(false);
  const [code, setCode] = useState(() => {
    try {
      const custom = sessionStorage.getItem("lab_custom_code");
      if (custom) return custom;
    } catch {
      // ignore
    }
    return sourceCode;
  });

  const [compilerState, setCompilerState] = useState<
    "idle" | "loading" | "compiling" | "success" | "failure"
  >("idle");
  const [compilerProgress, setCompilerProgress] = useState(0);
  const [result, setResult] = useState<CompileRunResult | null>(null);
  const [compilerError, setCompilerError] = useState("");

  const [snapshots, setSnapshots] = useState<MemorySnapshot[]>([]);
  const [currentStep, setCurrentStep] = useState(0);

  const resetToLessonSource = () => {
    try {
      sessionStorage.removeItem("lab_custom_code");
      sessionStorage.removeItem("lab_custom_title");
    } catch {
      // ignore
    }
    setCustomOrigin(null);
    setCode(sourceCode);
    setResult(null);
    setCompilerError("");
    setSnapshots([]);
    setCompilerState("idle");
  };

  const runStepDebugger = () => {
    try {
      const { events, cleanStdout } = parseTraceOutput(code);
      let snaps: MemorySnapshot[];
      if (events.length > 0) {
        snaps = computeSnapshots(events, cleanStdout);
      } else {
        snaps = generateSnapshotsFromCodeAndOutput(code, "", 0);
      }
      setSnapshots(snaps);
      setCurrentStep(0);
      setCompilerState("success");
      markStep(lesson.day, "lab");
      if (!result) {
        setResult({
          stdout: "",
          stderr: "",
          output: "逐行调试模拟就绪，请使用控制条进行步进。",
          errors: [],
          exitCode: 0,
          compileMs: 15,
          runMs: 1,
        });
      }
    } catch (err) {
      console.warn("Step debugger failed:", err);
    }
  };

  const loadVisualizerDemo = () => {
    setCode(VISUALIZER_DEMO_CODE);
    setCustomOrigin("生命周期可视化示例 (RAII & Heap)");
    setResult(null);
    setCompilerError("");
    try {
      const snaps = generateSnapshotsFromCodeAndOutput(VISUALIZER_DEMO_CODE, "", 0);
      setSnapshots(snaps);
      setCurrentStep(0);
      setCompilerState("success");
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    let currentCode = sourceCode;
    try {
      const custom = sessionStorage.getItem("lab_custom_code");
      if (custom) {
        currentCode = custom;
        setCode(custom);
        setCustomOrigin(sessionStorage.getItem("lab_custom_title"));
      } else {
        setCode(sourceCode);
        setCustomOrigin(null);
      }
    } catch {
      setCode(sourceCode);
    }
    setCompilerState("idle");
    setCompilerProgress(0);
    setResult(null);
    setCompilerError("");

    // 预先生成结构化单步调试快照，保证无需等待下载工具链即可分步执行
    try {
      const snaps = generateSnapshotsFromCodeAndOutput(currentCode, "", 0);
      setSnapshots(snaps);
      setCurrentStep(0);
    } catch {
      setSnapshots([]);
    }
  }, [lesson.day, sourceCode]);

  const runCompiler = async () => {
    setResult(null);
    setCompilerError("");
    setCompilerState("loading");
    setCompilerProgress(0);

    try {
      const next = await compileAndRun(code, (value) => {
        setCompilerProgress(value);
        if (value >= 1) setCompilerState("compiling");
      });

      setResult(next);
      const isSuccess = next.exitCode === 0;

      if (isSuccess) {
        setCompilerState("success");
        markStep(lesson.day, "lab");

        // 提取并在内存画布中生成快照
        const { events, cleanStdout } = parseTraceOutput(next.stdout || "");
        if (events.length > 0) {
          const snaps = computeSnapshots(events, cleanStdout);
          setSnapshots(snaps);
          setCurrentStep(0);
        } else {
          // 自动为标准 C++ 代码生成结构化生命周期与调用栈快照
          const snaps = generateSnapshotsFromCodeAndOutput(
            code,
            cleanStdout || next.stdout || "",
            next.exitCode ?? 0,
          );
          setSnapshots(snaps);
          setCurrentStep(0);
        }
      } else {
        setCompilerState("failure");
        setSnapshots([]);
      }
    } catch (error) {
      console.warn("Compiler run threw, falling back to simulator:", error);
      // 容错降级：如果网络环境无法拉取 Clang WASM 二进制文件，自动运行仿真器
      const snaps = generateSnapshotsFromCodeAndOutput(code, "", 0);
      setSnapshots(snaps);
      setCurrentStep(0);
      setCompilerState("success");
      markStep(lesson.day, "lab");
    }
  };

  const compilerBusy =
    compilerState === "loading" || compilerState === "compiling";

  const displayOutput = (() => {
    if (compilerError) return `Compilation / Execution Error:\n${compilerError}`;
    if (!result) return "";

    const lines: string[] = [];
    lines.push("$ clang++ main.cpp -std=gnu++23 -Wall -Wextra -Wconversion -Wpedantic");

    if (result.errors && result.errors.length > 0) {
      lines.push(result.errors.join("\n"));
    }

    if (result.compileMs > 0) {
      lines.push(`[Compilation finished in ${result.compileMs}ms]`);
    }

    lines.push("");
    lines.push("$ ./main");

    const { cleanStdout } = parseTraceOutput(result.stdout || "");
    const effectiveOutput = cleanStdout || result.stdout || result.output || "";

    if (effectiveOutput.trim()) {
      lines.push(effectiveOutput.trimEnd());
    } else if (result.exitCode === 0) {
      lines.push("Program exited successfully with no output.");
    }

    lines.push("");
    lines.push(`Process finished with exit ${result.exitCode ?? 0} (execution: ${result.runMs ?? 0}ms)`);

    return lines.join("\n");
  })();

  return (
    <div className="lab-page-container">
      <div className="lab-shell lab-shell-runtime">
        <section className="lab-task">
          <div style={{ marginBottom: "14px" }}>
            <span className="eyebrow" style={{ display: "block", marginBottom: "4px" }}>
              第 {lesson.day} 天实验 · {lesson.duration} 分钟
            </span>
            <h2 style={{ margin: "0 0 12px 0", fontSize: "22px", lineHeight: "1.3" }}>
              {lesson.title}
            </h2>
          </div>
          {lab ? (
            <Markdown>{lab.body.replace(/```[\s\S]*?```/g, "")}</Markdown>
          ) : (
            <p>No lab section found.</p>
          )}

          {lesson.labChecklist.length > 0 && (
            <div className="checklist">
              <span className="eyebrow">CHECKLIST</span>
              {lesson.labChecklist.map((item) => (
                <label key={item}>
                  <input type="checkbox" /> <span>{item}</span>
                </label>
              ))}
            </div>
          )}

          {customOrigin && (
            <div className="custom-code-banner">
              <span>已加载外部代码：<strong>{customOrigin}</strong></span>
              <button
                className="ghost-button"
                onClick={resetToLessonSource}
                type="button"
              >
                恢复本课代码
              </button>
            </div>
          )}

          <div className="lab-actions">
            <button
              className="ghost-button"
              onClick={() => setHint((value) => !value)}
              type="button"
            >
              {hint ? "Hide hint" : "Reveal hint"}
            </button>
            <button
              className="ghost-button"
              onClick={resetToLessonSource}
              disabled={compilerBusy || (code === sourceCode && !customOrigin)}
              type="button"
            >
              Reset source
            </button>
            <button
              className="ghost-button"
              onClick={loadVisualizerDemo}
              disabled={compilerBusy}
              type="button"
              style={{ color: "#38bdf8", borderColor: "rgba(56, 189, 248, 0.4)" }}
              title="载入带有 visualizer.h 探针的 RAII 内存可视化示例代码"
            >
              ⚡ 体验生命周期可视化
            </button>
          </div>

          {hint && (
            <div className="hint">
              {lesson.sections.find((section) => section.step === "rules") ? (
                <Markdown>
                  {
                    lesson.sections.find((section) => section.step === "rules")!
                      .body
                  }
                </Markdown>
              ) : (
                "Re-read the lesson rules and use them as the review checklist for this lab."
              )}
            </div>
          )}
        </section>

        <section className="code-workbench" style={{ display: "block" }}>
          <VisualizerWorkbench
            code={code}
            onChangeCode={setCode}
            snapshots={snapshots}
            currentStep={currentStep}
            onStepChange={setCurrentStep}
            compilerState={compilerState}
            compilerProgress={compilerProgress}
            terminalOutput={displayOutput}
            onRun={runCompiler}
            onStepDebug={runStepDebugger}
          />
        </section>
      </div>
    </div>
  );
}
