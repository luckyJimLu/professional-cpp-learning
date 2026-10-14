import { useEffect, useState } from "react";
import { type Lesson, type StepKey } from "../../lib/course";
import { compileAndRun, type CompileRunResult } from "../../lib/browserCompiler";
import { PageHeader } from "../common/PageHeader";
import { Markdown } from "../Markdown";

function cx(...values: Array<string | false | undefined>) {
  return values.filter(Boolean).join(" ");
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
    setCompilerState("idle");
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
      } else {
        setCompilerState("failure");
      }
    } catch (error) {
      setCompilerState("failure");
      setCompilerError(error instanceof Error ? error.message : String(error));
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

        <section className="code-workbench">
          <div className="code-panel editable">
            <div className="panel-title">
              <span>
                {lesson.labPath ??
                  `day-${String(lesson.day).padStart(3, "0")}/main.cpp`}
              </span>
              <span>EDITABLE · C++23</span>
            </div>

            <textarea
              aria-label="C++ lab source editor"
              className="resize-none"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              spellCheck={false}
            />

            <footer>
              <span>-Wall</span>
              <span>-Wextra</span>
              <span>-Wconversion</span>
              <span>-Wpedantic</span>
              <button
                className="compile-button"
                disabled={compilerBusy || !code.trim()}
                onClick={runCompiler}
                type="button"
              >
                {compilerBusy ? "Working…" : "Compile & Run ▶"}
              </button>
            </footer>
          </div>

          <section className={cx("compiler-output", compilerState)}>
            <div className="panel-title">
              <span>TERMINAL</span>
              {result && (
                <span>
                  compile {Math.round(result.compileMs)}ms
                  {result.runMs !== null
                    ? ` · run ${Math.round(result.runMs)}ms`
                    : ""}
                </span>
              )}
            </div>

            {compilerState === "loading" && (
              <div className="compiler-loading">
                <div>
                  <i
                    style={{ width: `${Math.round(compilerProgress * 100)}%` }}
                  />
                </div>
                <p>
                  First run downloads the browser toolchain. Later runs reuse it
                  for this page session.
                </p>
              </div>
            )}

            {compilerState === "idle" ? (
              <pre>
                <code>
                  $ clang++ main.cpp -std=gnu++23 -Wall -Wextra -Wconversion
                  -Wpedantic{"\n"}$ ./main
                </code>
              </pre>
            ) : displayOutput ? (
              <pre>
                <code>{displayOutput}</code>
              </pre>
            ) : compilerState === "compiling" ? (
              <pre>
                <code>Compiling and linking…</code>
              </pre>
            ) : null}

            {result && (
              <footer>
                <span>exit {result.exitCode ?? "compile-error"}</span>
                <span>{result.errors.length} compiler error(s)</span>
              </footer>
            )}
          </section>
        </section>
      </div>
    </div>
  );
}
