import { useEffect, useState } from "react";
import { type Lesson, type StepKey } from "../../lib/course";
import { compileAndRun, type CompileRunResult } from "../../lib/browserCompiler";
import { PageHeader } from "../common/PageHeader";
import { Markdown } from "../Markdown";
import { VisualizerWorkbench } from "../../visualizer/VisualizerWorkbench";
import { parseTraceOutput, computeSnapshots } from "../../visualizer/reducer";
import type { MemorySnapshot } from "../../visualizer/types";

function cx(...values: Array<string | false | undefined>) {
  return values.filter(Boolean).join(" ");
}

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

  const loadVisualizerDemo = () => {
    setCode(VISUALIZER_DEMO_CODE);
    setCustomOrigin("生命周期可视化示例 (RAII & Heap)");
    setResult(null);
    setCompilerError("");
    setSnapshots([]);
  };

  useEffect(() => {
    try {
      const custom = sessionStorage.getItem("lab_custom_code");
      if (custom) {
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
    setSnapshots([]);
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
      if (next.exitCode === 0 && next.errors.length === 0) {
        setCompilerState("success");
        markStep(lesson.day, "lab");

        // 提取并在内存画布中生成快照
        const { events } = parseTraceOutput(next.stdout);
        if (events.length > 0) {
          const snaps = computeSnapshots(events);
          setSnapshots(snaps);
          setCurrentStep(0);
        } else {
          setSnapshots([]);
        }
      } else {
        setCompilerState("failure");
        setSnapshots([]);
      }
    } catch (error) {
      setCompilerState("failure");
      setCompilerError(error instanceof Error ? error.message : String(error));
      setSnapshots([]);
    }
  };

  const compilerBusy =
    compilerState === "loading" || compilerState === "compiling";
  const displayOutput =
    compilerError ||
    result?.errors.join("\n") ||
    result?.output ||
    (compilerState === "success"
      ? "Program exited successfully with no output."
      : "");

  return (
    <div>
      <PageHeader
        eyebrow={`DAY ${lesson.day} · LAB`}
        title="Compile Mode"
        description="编辑本课 C++ 实验，点击 Compile & Run 查看输出和编译诊断。首次运行需要下载编译工具。"
      />

      <div className="lab-runtime-bar">
        <div>
          <span className="eyebrow">LOCAL TOOLCHAIN</span>
          <strong>Clang 22 · WebAssembly · C++23</strong>
        </div>
        <div className="runtime-state">
          <span className={cx("runtime-dot", compilerState)} />
          <span className="mono">
            {compilerState === "idle" && "READY"}
            {compilerState === "loading" &&
              `LOADING ${Math.round(compilerProgress * 100)}%`}
            {compilerState === "compiling" && "COMPILING"}
            {compilerState === "success" && "BUILD SUCCEEDED"}
            {compilerState === "failure" && "BUILD FAILED"}
          </span>
        </div>
      </div>

      <div className="lab-shell lab-shell-runtime">
        <section className="lab-task">
          <div className="panel-title">
            <span>TASK</span>
            <span className="mono">{lesson.duration} min lesson</span>
          </div>
          <h2>{lesson.title}</h2>
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
          />
        </section>
      </div>
    </div>
  );
}
