import { useCallback, useEffect, useState, type KeyboardEvent } from "react";
import { CodeMirrorEditor } from "./CodeMirrorEditor";
import { MemoryCanvas } from "./MemoryCanvas";
import { PRESET_TRACES_META, loadPresetTrace } from "./presetTraces";
import { TraceSelectorModal } from "./TraceSelectorModal";
import { VCRControls } from "./VCRControls";
import type { TraceSessionState, VisualizerTrace, VisualizerTraceV2 } from "./types";
import "./visualizer.css";

export function VisualizerWorkbench({
  session,
  onChangeCode,
  onStepChange,
  onRun,
  onRunApproximate,
  onLoadTrace,
  variant = "visualizer",
  className = "",
}: {
  session: TraceSessionState;
  onChangeCode: (value: string) => void;
  onStepChange: (step: number) => void;
  onRun: () => void | Promise<unknown>;
  onRunApproximate: () => void;
  onLoadTrace: (trace: VisualizerTrace) => void;
  variant?: "visualizer" | "lab";
  className?: string;
}) {
  const [activeTab, setActiveTab] = useState<"memory" | "terminal">(
    session.snapshots.length ? "memory" : "terminal",
  );
  const [mobilePane, setMobilePane] = useState<"code" | "output">("output");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const currentSnapshot = session.snapshots[session.currentStep] ?? null;
  const totalSteps = session.snapshots.length;
  const hasTrace = totalSteps > 0;
  const busy = session.status === "loading" || session.status === "running";
  const closeTraceLibrary = useCallback(() => setIsModalOpen(false), []);

  useEffect(() => {
    if (session.traceId && session.snapshots.length > 0) {
      setActiveTab("memory");
    }
  }, [session.traceId, session.snapshots.length]);

  const loadTrace = useCallback(async (id: string) => {
    const trace = await loadPresetTrace(id);
    if (!trace) return;
    onLoadTrace(trace);
    setActiveTab("memory");
    setMobilePane("output");
  }, [onLoadTrace]);

  const exportTrace = useCallback(() => {
    const trace: VisualizerTraceV2 = {
      schemaVersion: 2,
      title: "C++ Memory Execution Trace",
      sourceCode: session.code,
      mode: session.mode === "none" ? "regex" : session.mode,
      accuracy: session.accuracy === "none" ? "approximate" : session.accuracy,
      snapshots: session.snapshots,
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(trace, null, 2)], { type: "application/json" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `cpp-trace-${Date.now()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }, [session]);

  // VS Code 风格单步运行：若尚未生成轨迹或代码已修改，立即启动单步轨迹；否则推进到下一步
  const handleStepRun = useCallback(() => {
    setActiveTab("memory");
    if (!hasTrace || session.isStale) {
      onRunApproximate();
      return;
    }
    if (session.currentStep >= totalSteps - 1) {
      onStepChange(0);
    } else {
      onStepChange(session.currentStep + 1);
    }
  }, [hasTrace, session.isStale, session.currentStep, totalSteps, onRunApproximate, onStepChange]);

  const handleStepPrev = useCallback(() => {
    if (!hasTrace) return;
    setActiveTab("memory");
    onStepChange(Math.max(0, session.currentStep - 1));
  }, [hasTrace, session.currentStep, onStepChange]);

  const handleStepReset = useCallback(() => {
    if (!hasTrace) return;
    setActiveTab("memory");
    onStepChange(0);
  }, [hasTrace, onStepChange]);

  const handleKeyboard = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.nativeEvent.isComposing) return;
    const target = event.target as HTMLElement;
    const editing = target.closest(".cm-editor, input, textarea, select");
    if (!editing && event.key === "ArrowRight") {
      event.preventDefault();
      onStepChange(session.currentStep + 1);
    } else if (!editing && event.key === "ArrowLeft") {
      event.preventDefault();
      onStepChange(session.currentStep - 1);
    } else if (event.key === "F10" && !busy) {
      event.preventDefault();
      handleStepRun();
    } else if ((event.ctrlKey || event.metaKey) && event.key === "Enter" && !busy) {
      event.preventDefault();
      void onRun();
      setActiveTab("memory");
      setMobilePane("output");
    }
  };

  const modeLabel = session.mode === "preset"
    ? "预置轨迹"
    : session.mode === "clang-vis"
      ? "真实 VIS 轨迹"
      : session.mode === "regex"
        ? "Regex 近似推演"
        : "尚未运行";

  return (
    <div className={`visualizer-workbench ${className}`} tabIndex={0} onKeyDown={handleKeyboard}>
      {variant === "visualizer" && <><TraceSelectorModal
        isOpen={isModalOpen}
        onClose={closeTraceLibrary}
        onSelectPreset={loadTrace}
        onImportCustomTrace={(trace) => {
          onLoadTrace(trace);
          setActiveTab("memory");
        }}
        currentTraceId={session.traceId}
      />

      <div className="trace-toolbar">
        <div className="trace-toolbar-presets">
          <span>案例</span>
          {PRESET_TRACES_META.slice(0, 3).map((item) => (
            <button key={item.id} type="button" className={session.traceId === item.id ? "trace-chip is-active" : "trace-chip"} onClick={() => void loadTrace(item.id)}>{item.title}</button>
          ))}
          <button type="button" className="trace-library-button" onClick={() => setIsModalOpen(true)}>剧本库 / 导入</button>
        </div>
        <div className="trace-toolbar-actions">
          <span className={`trace-mode-badge mode-${session.mode}`}>{modeLabel}</span>
          {session.snapshots.length > 0 && <button type="button" className="trace-export-button" onClick={exportTrace}>导出 JSON</button>}
        </div>
      </div></>}

      {variant === "lab" && <div className="lab-session-strip"><span>浏览器编译会话</span><span className={`trace-mode-badge mode-${session.mode}`}>{modeLabel}</span></div>}

      {session.isStale && <div className="trace-stale-banner" role="status">代码已修改，点击“运行”更新内存轨迹</div>}
      {session.diagnostics.length > 0 && <div className={session.status === "error" ? "trace-diagnostics is-error" : "trace-diagnostics"} role={session.status === "error" ? "alert" : "status"}>{session.diagnostics.join(" ")}
        {session.status === "error" && <button type="button" onClick={() => { onRunApproximate(); setActiveTab("memory"); }}>使用近似推演</button>}
      </div>}

      <div className="workbench-mobile-switcher" role="group" aria-label="移动端工作区">
        <button type="button" className={`switcher-tab ${mobilePane === "code" ? "is-active" : ""}`} onClick={() => setMobilePane("code")}>源码</button>
        <button type="button" className={`switcher-tab ${mobilePane === "output" ? "is-active" : ""}`} onClick={() => setMobilePane("output")}>输出</button>
      </div>

      {session.snapshots.length > 0 && activeTab === "memory" && (
        <VCRControls key={`${session.traceId ?? session.executedCode}-${session.mode}`} snapshots={session.snapshots} currentStep={session.currentStep} onStepChange={onStepChange} />
      )}

      <div className={`visualizer-main-split mobile-show-${mobilePane}`}>
        <div className="code-split-pane">
          {/* VS Code 风格固定顶部代码工具栏：滚动代码时固定在顶部不移动 */}
          <div className="vscode-code-toolbar" role="toolbar" aria-label="代码编译与单步调试工具栏">
            <div className="vscode-file-tab">
              <span className="vscode-cpp-badge" aria-hidden="true">C++</span>
              <span className="vscode-file-name">main.cpp</span>
              {currentSnapshot && currentSnapshot.line > 0 && (
                <span className="vscode-line-indicator" title="当前调试执行行">
                  ● Ln {currentSnapshot.line}
                </span>
              )}
            </div>

            <div className="vscode-debug-actions">
              {hasTrace && (
                <div className="vscode-step-cluster" role="group" aria-label="单步控制">
                  <button
                    type="button"
                    className="vscode-icon-btn"
                    title="重置到第一步 (Reset)"
                    disabled={busy || session.currentStep === 0}
                    onClick={handleStepReset}
                  >
                    ⏮
                  </button>
                  <button
                    type="button"
                    className="vscode-icon-btn"
                    title="上一步 (Step Back)"
                    disabled={busy || session.currentStep === 0}
                    onClick={handleStepPrev}
                  >
                    ◀
                  </button>
                </div>
              )}

              <button
                type="button"
                className="vscode-step-button"
                title="按步运行 / 单步调试 (快捷键 F10)"
                disabled={busy || !session.code.trim()}
                onClick={handleStepRun}
              >
                <span aria-hidden="true">↷</span>
                <span>
                  {!hasTrace || session.isStale
                    ? "单步运行"
                    : session.currentStep >= totalSteps - 1
                      ? "重新单步"
                      : `单步 (${session.currentStep + 1}/${totalSteps})`}
                </span>
              </button>

              <button
                type="button"
                className="compile-button"
                disabled={busy || !session.code.trim()}
                onClick={() => {
                  void onRun();
                  setMobilePane("output");
                }}
              >
                {session.status === "loading"
                  ? `加载 ${Math.round(session.progress * 100)}%`
                  : session.status === "running"
                    ? "编译中…"
                    : "运行代码"}
              </button>
            </div>
          </div>

          <CodeMirrorEditor
            value={session.code}
            onChange={onChangeCode}
            activeLine={currentSnapshot?.line ?? 0}
            readOnly={busy}
            wrapLines={variant === "lab"}
          />
        </div>

        <div className="output-split-pane">
          <div className="output-tabs-header">
            <div className="output-segmented-toggle" role="tablist" aria-label="输出类型">
              <button type="button" role="tab" aria-selected={activeTab === "memory"} className={`segmented-tab ${activeTab === "memory" ? "is-active" : ""}`} onClick={() => setActiveTab("memory")}>内存视图</button>
              <button type="button" role="tab" aria-selected={activeTab === "terminal"} className={`segmented-tab ${activeTab === "terminal" ? "is-active" : ""}`} onClick={() => setActiveTab("terminal")}>终端</button>
            </div>
            {currentSnapshot && (
              <span className="output-step-status">
                Step {session.currentStep + 1}/{totalSteps} · Line {currentSnapshot.line}
              </span>
            )}
          </div>
          <div className="output-tab-panel" role="tabpanel">
            {activeTab === "memory" ? <MemoryCanvas snapshot={currentSnapshot} approximate={session.accuracy === "approximate"} /> : <pre className="terminal-output">{session.terminalOutput || "$ clang++ main.cpp -std=gnu++23\n$ ./main\n(等待运行输出...)"}</pre>}
          </div>
        </div>
      </div>
    </div>
  );
}

