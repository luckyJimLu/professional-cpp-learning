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
  className = "",
}: {
  session: TraceSessionState;
  onChangeCode: (value: string) => void;
  onStepChange: (step: number) => void;
  onRun: () => void | Promise<unknown>;
  onRunApproximate: () => void;
  onLoadTrace: (trace: VisualizerTrace) => void;
  className?: string;
}) {
  const [activeTab, setActiveTab] = useState<"memory" | "terminal">(
    session.snapshots.length ? "memory" : "terminal",
  );
  const [mobilePane, setMobilePane] = useState<"code" | "output">("output");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const currentSnapshot = session.snapshots[session.currentStep] ?? null;
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
      <TraceSelectorModal
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
      </div>

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
        <div className="code-split-pane"><CodeMirrorEditor value={session.code} onChange={onChangeCode} activeLine={currentSnapshot?.line ?? 0} readOnly={busy} /></div>
        <div className="output-split-pane">
          <div className="output-tabs-header">
            <div className="output-segmented-toggle" role="tablist" aria-label="输出类型">
              <button type="button" role="tab" aria-selected={activeTab === "memory"} className={`segmented-tab ${activeTab === "memory" ? "is-active" : ""}`} onClick={() => setActiveTab("memory")}>内存视图</button>
              <button type="button" role="tab" aria-selected={activeTab === "terminal"} className={`segmented-tab ${activeTab === "terminal" ? "is-active" : ""}`} onClick={() => setActiveTab("terminal")}>终端</button>
            </div>
            <button type="button" className="compile-button" disabled={busy || !session.code.trim()} onClick={() => { void onRun(); setMobilePane("output"); }}>
              {session.status === "loading" ? `加载 ${Math.round(session.progress * 100)}%` : session.status === "running" ? "编译中…" : "运行代码"}
            </button>
          </div>
          <div className="output-tab-panel" role="tabpanel">
            {activeTab === "memory" ? <MemoryCanvas snapshot={currentSnapshot} approximate={session.accuracy === "approximate"} /> : <pre className="terminal-output">{session.terminalOutput || "$ clang++ main.cpp -std=gnu++23\n$ ./main\n(等待运行输出...)"}</pre>}
          </div>
        </div>
      </div>
    </div>
  );
}
