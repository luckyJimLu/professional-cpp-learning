import { useEffect, useRef, useState } from "react";
import { type Lesson, type StepKey } from "../../lib/course";
import { Markdown } from "../Markdown";
import { PageHeader } from "../common/PageHeader";
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
  const instructionsRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 980px)");
    const syncDisclosure = () => {
      if (instructionsRef.current) {
        instructionsRef.current.open = desktop.matches;
      }
    };
    syncDisclosure();
    desktop.addEventListener("change", syncDisclosure);
    return () => desktop.removeEventListener("change", syncDisclosure);
  }, [lesson.day]);
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
    traceSession.state.status === "loading" ||
    traceSession.state.status === "running";

  return (
    <div className="lab-page-container">
      <PageHeader
        eyebrow="运行 · 观察 · 验证"
        title="实验"
        description="从当前课例开始。先查看任务与自测清单，再运行代码，结合输出或轨迹验证理解。"
      />
      <div className="lab-shell lab-shell-runtime">
        <section className="lab-task">
          <div className="lab-task-header">
            <span className="page-eyebrow">
              第 {lesson.day} 天实验 · {lesson.duration} 分钟
            </span>
            <h2>{lesson.title}</h2>
          </div>
          <details ref={instructionsRef} className="lab-instructions">
            <summary>
              <strong>实验说明与自测清单</strong>
              <span>点击展开或收起 ▾</span>
            </summary>
            <div className="lab-instructions-body">
              {lab ? (
                <Markdown>{labInstructions(lab.body)}</Markdown>
              ) : (
                <p>当前课程暂无独立实验说明，可先阅读本课概念与示例。</p>
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
            </div>

            <div className="lab-actions">
              <button
                className="ghost-button"
                onClick={() => setHint((value) => !value)}
                type="button"
              >
                {hint ? "隐藏提示" : "显示提示"}
              </button>
              {!customOrigin && (
                <button
                  className="ghost-button"
                  onClick={resetToLessonSource}
                  disabled={
                    compilerBusy || traceSession.state.code === sourceCode
                  }
                  type="button"
                >
                  重置代码
                </button>
              )}
            </div>

            {hint && (
              <div className="hint">
                {lesson.sections.find((section) => section.step === "rules") ? (
                  <Markdown>
                    {
                      lesson.sections.find(
                        (section) => section.step === "rules",
                      )!.body
                    }
                  </Markdown>
                ) : (
                  "复习本课的规范要点，以此作为实验自测清单。"
                )}
              </div>
            )}
          </details>
          {customOrigin && (
            <div className="custom-code-banner">
              <span>
                已加载外部代码：<strong>{customOrigin}</strong>
              </span>
              <button
                className="ghost-button"
                onClick={resetToLessonSource}
                type="button"
              >
                恢复课例源码
              </button>
            </div>
          )}
        </section>

        <section
          className="code-workbench"
          aria-labelledby="lab-workbench-title"
        >
          <header
            className={`lab-workbench-header ${lesson.labMode !== "rtos-sim" ? "is-compiler" : ""}`}
          >
            <div>
              <span className="eyebrow">工作区</span>
              <h2 id="lab-workbench-title">
                {lesson.labMode === "rtos-sim"
                  ? "RTOS 并发模拟实验"
                  : "代码、运行与内存分析"}
              </h2>
            </div>
            {lesson.labMode === "rtos-sim" && (
              <a
                className="primary-button"
                href={`${import.meta.env.BASE_URL}rtos.html?scenario=${encodeURIComponent(lesson.rtosScenario ?? "round-robin")}&day=${lesson.day}`}
              >
                在模拟器中打开 ↗
              </a>
            )}
          </header>
          {lesson.labMode === "rtos-sim" ? (
            <div className="custom-code-banner" style={{ margin: "16px" }}>
              <span>
                本章使用确定性 RTOS
                教学模拟器。选择“在模拟器中打开”后，可运行场景、回放任务切换并观察同步关系；打开页面本身不会标记实验完成。
              </span>
            </div>
          ) : (
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
          )}
        </section>
      </div>
    </div>
  );
}
