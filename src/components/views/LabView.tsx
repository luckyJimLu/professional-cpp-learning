import { useEffect, useRef, useState } from "react";
import { VISUALIZER_DEMO_CODE } from "../../data/visualizerPresets";
import { type Lesson, type StepKey } from "../../lib/course";
import { Markdown } from "../markdown/Markdown";
import { PageHeader } from "../common/PageHeader";
import { VisualizerWorkbench } from "../../visualizer/VisualizerWorkbench";
import { inferTraceEventsFromCodeAndOutput } from "../../visualizer/reducer";
import { useTraceSession } from "../../visualizer/useTraceSession";

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
  const hasExtractedCode = Boolean(lesson.labCode);
  const sourceCode =
    lesson.labCode ?? "// 本课暂未提取独立 C++ 实验源码，可先阅读本课概念或加载示例。";

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
    if (instructionsRef.current) instructionsRef.current.open = false;
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

  const runAttemptedRef = useRef(false);

  const clangUnavailable = traceSession.state.diagnostics.some((item) =>
    item.includes("Clang WASM 工具链提示"),
  );
  const compileFailed = traceSession.state.status === "error";

  useEffect(() => {
    if (!runAttemptedRef.current) return;
    if (
      traceSession.state.status === "loading" ||
      traceSession.state.status === "running"
    ) {
      return;
    }
    runAttemptedRef.current = false;
    if (traceSession.state.status === "ready" && !clangUnavailable) {
      markStep(lesson.day, "lab");
    }
  }, [
    clangUnavailable,
    lesson.day,
    markStep,
    traceSession.state.status,
  ]);

  const runCompiler = async () => {
    runAttemptedRef.current = true;
    await traceSession.run();
  };

  const compilerBusy =
    traceSession.state.status === "loading" ||
    traceSession.state.status === "running";

  return (
    <div className="lab-page-container">
      <PageHeader
        title="实验"
        description="从当前课例开始。先查看任务与自测清单，再运行代码，结合输出或轨迹验证理解。"
      />
      <div className="lab-shell lab-shell-runtime">
        <section className="lab-task guide-current-lesson">
          <div className="lab-task-header">
            <div className="guide-current-top">
              <span className="page-eyebrow">
                第 {lesson.day} 天实验 · {lesson.duration} 分钟
              </span>
              <span className="guide-current-badge mono">
                第 {lesson.week} 周 · {lesson.labMode === "rtos-sim" ? "RTOS 并发模拟" : "Clang C++23 · 内存轨迹"}
              </span>
            </div>
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
                className="ghost-button min-h-[44px] sm:min-h-0"
                onClick={() => setHint((value) => !value)}
                type="button"
              >
                {hint ? "隐藏提示" : "显示提示"}
              </button>
              {!customOrigin && (
                <button
                  className="ghost-button min-h-[44px] sm:min-h-0"
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
            <>
              {!hasExtractedCode && !customOrigin && (
                <div className="topic-notice" role="status" style={{ margin: "16px 16px 0" }}>
                  <p>本课暂未提取独立 C++ 实验源码，可在下方编辑代码或加载可视化示例进行实验。</p>
                  <button
                    type="button"
                    className="ghost-button min-h-[44px] sm:min-h-0"
                    onClick={loadVisualizerDemo}
                  >
                    加载可视化示例
                  </button>
                </div>
              )}
              {compileFailed && (
                <div className="topic-notice" role="alert" style={{ margin: "16px 16px 0" }}>
                  <p>
                    Clang 编译或程序运行失败，本次实验尚未标记完成。请根据下方终端诊断修正代码后重试，或恢复课例源码。
                  </p>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    <button
                      type="button"
                      className="ghost-button min-h-[44px] sm:min-h-0"
                      disabled={compilerBusy}
                      onClick={() => void runCompiler()}
                    >
                      重试编译运行
                    </button>
                    <button
                      type="button"
                      className="ghost-button min-h-[44px] sm:min-h-0"
                      disabled={compilerBusy}
                      onClick={resetToLessonSource}
                    >
                      恢复课例源码
                    </button>
                  </div>
                </div>
              )}
              {!compileFailed && clangUnavailable && (
                <div className="topic-notice" role="alert" style={{ margin: "16px 16px 0" }}>
                  <p>
                    Clang/WASM 编译沙箱当前不可用，本次未执行真实编译，也未标记实验完成。下方仅展示近似推演轨迹（非真实运行时结果），可检查网络或本地编译资源后重试。
                  </p>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    <button
                      type="button"
                      className="ghost-button min-h-[44px] sm:min-h-0"
                      disabled={compilerBusy}
                      onClick={() => void runCompiler()}
                    >
                      重试 Clang 编译
                    </button>
                    <button
                      type="button"
                      className="ghost-button min-h-[44px] sm:min-h-0"
                      disabled={compilerBusy}
                      onClick={resetToLessonSource}
                    >
                      恢复课例源码
                    </button>
                  </div>
                </div>
              )}
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
            </>
          )}
        </section>
      </div>
    </div>
  );
}
