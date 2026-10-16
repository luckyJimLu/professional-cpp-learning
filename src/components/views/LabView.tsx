import { useEffect, useState } from "react";
import { type Lesson, type StepKey } from "../../lib/course";
import { Markdown } from "../Markdown";
import { VisualizerWorkbench } from "../../visualizer/VisualizerWorkbench";
import { inferTraceEventsFromCodeAndOutput } from "../../visualizer/reducer";
import { useTraceSession } from "../../visualizer/useTraceSession";

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

function labInstructions(body: string): string {
  return body
    .replace(/(`{3,}|~{3,})[\s\S]*?\1/g, "")
    .replace(/^\s*(?:编译|Compile)\s*[：:]\s*$/gim, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

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
  const initialCode = (() => {
    try {
      const custom = sessionStorage.getItem("lab_custom_code");
      if (custom) return custom;
    } catch {
      // ignore
    }
    return sourceCode;
  })();
  const traceSession = useTraceSession(initialCode);

  const resetToLessonSource = () => {
    try {
      sessionStorage.removeItem("lab_custom_code");
      sessionStorage.removeItem("lab_custom_title");
    } catch {
      // ignore
    }
    setCustomOrigin(null);
    traceSession.reset(sourceCode);
  };

  const runStepDebugger = () => {
    try {
      traceSession.runApproximate();
      markStep(lesson.day, "lab");
    } catch (err) {
      console.warn("Step debugger failed:", err);
    }
  };

  const loadVisualizerDemo = () => {
    traceSession.loadTrace({
      schemaVersion: 2,
      title: "生命周期可视化示例",
      sourceCode: VISUALIZER_DEMO_CODE,
      mode: "regex",
      accuracy: "approximate",
      events: inferTraceEventsFromCodeAndOutput(VISUALIZER_DEMO_CODE, "", 0),
    });
    setCustomOrigin("生命周期可视化示例 (RAII & Heap)");
  };

  useEffect(() => {
    let nextCode = sourceCode;
    let nextOrigin: string | null = null;
    try {
      const custom = sessionStorage.getItem("lab_custom_code");
      if (custom) {
        nextCode = custom;
        nextOrigin = sessionStorage.getItem("lab_custom_title");
      }
    } catch {
      // sessionStorage can be unavailable in restricted browsing contexts.
    }
    setCustomOrigin(nextOrigin);
    traceSession.reset(nextCode);
  }, [lesson.day, sourceCode]);

  const runCompiler = async () => {
    const succeeded = await traceSession.run();
    if (succeeded) {
      markStep(lesson.day, "lab");
    }
  };

  const compilerBusy =
    traceSession.state.status === "loading" || traceSession.state.status === "running";

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
            <Markdown>{labInstructions(lab.body)}</Markdown>
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
              {hint ? "隐藏提示" : "显示提示"}
            </button>
            <button
              className="ghost-button"
              onClick={resetToLessonSource}
              disabled={compilerBusy || (traceSession.state.code === sourceCode && !customOrigin)}
              type="button"
            >
              恢复课例源码
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

        <section className="code-workbench" aria-labelledby="lab-workbench-title">
          <header className="lab-workbench-header">
            <div>
              <span className="eyebrow">BROWSER C++ WORKSPACE</span>
              <h2 id="lab-workbench-title">代码、内存与运行结果</h2>
            </div>
            <p>编辑器使用完整课例源码；长行会在可用宽度内换行，编译输出与内存轨迹保持在同一工作区。</p>
          </header>
          <VisualizerWorkbench
            session={traceSession.state}
            onChangeCode={traceSession.setCode}
            onStepChange={traceSession.setStep}
            onRun={runCompiler}
            onRunApproximate={runStepDebugger}
            onLoadTrace={traceSession.loadTrace}
            variant="lab"
            className="lab-workbench"
          />
        </section>
      </div>
    </div>
  );
}
