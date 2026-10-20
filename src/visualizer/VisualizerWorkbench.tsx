import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { CodeMirrorEditor } from "./CodeMirrorEditor";
import { moveTabFocus } from "../lib/keyboardTabs";
import { MemoryCanvas, type MemoryLayoutMode } from "./MemoryCanvas";
import { PRESET_TRACES_META, loadPresetTrace } from "./presetTraces";
import { TraceSelectorModal } from "./TraceSelectorModal";
import type {
  TraceSessionState,
  VisualizerTrace,
  VisualizerTraceV2,
} from "./types";
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
  const [mobilePane, setMobilePane] = useState<"code" | "output">(
    variant === "lab" ? "code" : "output",
  );
  useEffect(() => {
    if (session.status === "loading" || session.status === "running")
      setMobilePane("output");
  }, [session.status]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const currentSnapshot = session.snapshots[session.currentStep] ?? null;
  const totalSteps = session.snapshots.length;
  const hasTrace = totalSteps > 0;
  const busy = session.status === "loading" || session.status === "running";
  const closeTraceLibrary = useCallback(() => setIsModalOpen(false), []);

  // 内存拓扑布局模式（宽屏默认左右并排，小屏纵向）
  const MEMORY_LAYOUT_KEY = "cpp-vis-memory-layout";
  const [layoutMode, setLayoutMode] = useState<MemoryLayoutMode>(() => {
    try {
      const saved = localStorage.getItem(MEMORY_LAYOUT_KEY);
      if (saved === "horizontal" || saved === "vertical") return saved;
    } catch {}
    if (typeof window !== "undefined" && window.innerWidth >= 1024)
      return "horizontal";
    return "vertical";
  });

  // 统一自动播放控制器
  const [isPlaying, setIsPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState<number>(1000);

  useEffect(() => {
    if (!isPlaying) return;
    if (session.currentStep >= totalSteps - 1) {
      setIsPlaying(false);
      return;
    }
    const timer = setTimeout(() => {
      onStepChange(session.currentStep + 1);
    }, playSpeed);
    return () => clearTimeout(timer);
  }, [isPlaying, session.currentStep, totalSteps, playSpeed, onStepChange]);

  const handleTogglePlay = useCallback(() => {
    setActiveTab("memory");
    if (session.currentStep >= totalSteps - 1) {
      onStepChange(0);
      setIsPlaying(true);
    } else {
      setIsPlaying((prev) => !prev);
    }
  }, [session.currentStep, totalSteps, onStepChange]);

  const SPLIT_STORAGE_KEY = "cpp-vis-split-percent";
  const [splitPercent, setSplitPercent] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(SPLIT_STORAGE_KEY);
      if (saved) {
        const val = parseFloat(saved);
        if (!isNaN(val) && val >= 20 && val <= 80) return val;
      }
    } catch {}
    return 42;
  });
  const [isResizing, setIsResizing] = useState(false);
  const splitContainerRef = useRef<HTMLDivElement>(null);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.button !== 0) return;
      const container = splitContainerRef.current;
      if (!container) return;

      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      setIsResizing(true);

      const onPointerMove = (moveEvent: PointerEvent) => {
        const rect = container.getBoundingClientRect();
        if (rect.width <= 0) return;
        const offsetX = moveEvent.clientX - rect.left;
        const newPercent = Math.min(
          80,
          Math.max(20, (offsetX / rect.width) * 100),
        );
        setSplitPercent(Math.round(newPercent * 10) / 10);
      };

      const onPointerUp = (upEvent: PointerEvent) => {
        try {
          (upEvent.target as HTMLElement)?.releasePointerCapture?.(
            upEvent.pointerId,
          );
        } catch {}
        setIsResizing(false);
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerup", onPointerUp);
        window.removeEventListener("pointercancel", onPointerUp);

        const rect = container.getBoundingClientRect();
        if (rect.width > 0) {
          const offsetX = upEvent.clientX - rect.left;
          const finalPercent = Math.min(
            80,
            Math.max(20, (offsetX / rect.width) * 100),
          );
          const rounded = Math.round(finalPercent * 10) / 10;
          setSplitPercent(rounded);
          try {
            localStorage.setItem(SPLIT_STORAGE_KEY, String(rounded));
          } catch {}
        }
        window.dispatchEvent(new Event("resize"));
      };

      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerUp);
      window.addEventListener("pointercancel", onPointerUp);
    },
    [],
  );

  const handleResetSplit = useCallback(() => {
    setSplitPercent(42);
    try {
      localStorage.setItem(SPLIT_STORAGE_KEY, "42");
    } catch {}
    window.dispatchEvent(new Event("resize"));
  }, []);

  const handleSplitKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setSplitPercent((prev) => {
          const next = Math.max(20, Math.round((prev - 2) * 10) / 10);
          try {
            localStorage.setItem(SPLIT_STORAGE_KEY, String(next));
          } catch {}
          return next;
        });
        window.dispatchEvent(new Event("resize"));
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setSplitPercent((prev) => {
          const next = Math.min(80, Math.round((prev + 2) * 10) / 10);
          try {
            localStorage.setItem(SPLIT_STORAGE_KEY, String(next));
          } catch {}
          return next;
        });
        window.dispatchEvent(new Event("resize"));
      } else if (e.key === "Home") {
        e.preventDefault();
        handleResetSplit();
      }
    },
    [handleResetSplit],
  );

  useEffect(() => {
    if (session.traceId && session.snapshots.length > 0) {
      setActiveTab("memory");
    }
  }, [session.traceId, session.snapshots.length]);

  const loadTrace = useCallback(
    async (id: string) => {
      const trace = await loadPresetTrace(id);
      if (!trace) return;
      onLoadTrace(trace);
      setActiveTab("memory");
      setMobilePane("output");
    },
    [onLoadTrace],
  );

  const exportTrace = useCallback(() => {
    const trace: VisualizerTraceV2 = {
      schemaVersion: 2,
      title: "C++ Memory Execution Trace",
      sourceCode: session.code,
      mode: session.mode === "none" ? "regex" : session.mode,
      accuracy: session.accuracy === "none" ? "approximate" : session.accuracy,
      snapshots: session.snapshots,
    };
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(trace, null, 2)], { type: "application/json" }),
    );
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
  }, [
    hasTrace,
    session.isStale,
    session.currentStep,
    totalSteps,
    onRunApproximate,
    onStepChange,
  ]);

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
    } else if (
      (event.ctrlKey || event.metaKey) &&
      event.key === "Enter" &&
      !busy
    ) {
      event.preventDefault();
      void onRun();
      setActiveTab("memory");
      setMobilePane("output");
    }
  };

  const modeLabel =
    session.mode === "preset"
      ? "预置轨迹"
      : session.mode === "clang-vis"
        ? "真实 VIS 轨迹"
        : session.mode === "regex"
          ? "Regex 近似推演"
          : "尚未运行";

  return (
    <div
      className={`visualizer-workbench ${className}`}
      tabIndex={0}
      onKeyDown={handleKeyboard}
    >
      {variant === "visualizer" && (
        <>
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
                <button
                  key={item.id}
                  type="button"
                  className={
                    session.traceId === item.id
                      ? "trace-chip is-active"
                      : "trace-chip"
                  }
                  onClick={() => void loadTrace(item.id)}
                >
                  {item.title}
                </button>
              ))}
              <button
                type="button"
                className="trace-library-button"
                onClick={() => setIsModalOpen(true)}
              >
                剧本库 / 导入
              </button>
            </div>
            <div className="trace-toolbar-actions">
              <span className={`trace-mode-badge mode-${session.mode}`}>
                {modeLabel}
              </span>
              {session.snapshots.length > 0 && (
                <button
                  type="button"
                  className="trace-export-button"
                  onClick={exportTrace}
                >
                  导出 JSON
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {variant === "lab" && (
        <div className="lab-session-strip">
          <span className="lab-session-title">
            <span className="lab-session-dot" aria-hidden="true" />
            浏览器编译会话
          </span>
          <span className={`trace-mode-badge mode-${session.mode}`}>
            {modeLabel}
          </span>
        </div>
      )}

      {session.isStale && (
        <div className="trace-stale-banner" role="status">
          代码已修改，点击“运行”更新内存轨迹
        </div>
      )}
      {session.diagnostics.length > 0 && (
        <div
          className={
            session.status === "error"
              ? "trace-diagnostics is-error"
              : "trace-diagnostics"
          }
          role={session.status === "error" ? "alert" : "status"}
        >
          {session.diagnostics.join(" ")}
          {session.status === "error" && (
            <button
              type="button"
              onClick={() => {
                onRunApproximate();
                setActiveTab("memory");
              }}
            >
              使用近似推演
            </button>
          )}
        </div>
      )}

      <div
        className="workbench-mobile-switcher"
        role="group"
        aria-label="移动端工作区"
      >
        <button
          type="button"
          className={`switcher-tab ${mobilePane === "code" ? "is-active" : ""}`}
          onClick={() => setMobilePane("code")}
        >
          源码
        </button>
        <button
          type="button"
          className={`switcher-tab ${mobilePane === "output" ? "is-active" : ""}`}
          onClick={() => setMobilePane("output")}
        >
          输出
        </button>
      </div>

      {/* Shared controls remain available in source and output panes. */}
      <div
        className="vscode-code-toolbar"
        role="toolbar"
        aria-label="代码编译与单步调试工具栏"
      >
        <div className="vscode-file-tab">
          <span className="vscode-cpp-badge" aria-hidden="true">
            C++
          </span>
          <span className="vscode-file-name">main.cpp</span>
          {currentSnapshot && currentSnapshot.line > 0 && (
            <span className="vscode-line-indicator" title="当前调试执行行">
              ● Ln {currentSnapshot.line}
            </span>
          )}
        </div>

        <div className="vscode-debug-actions">
          {hasTrace && (
            <div
              className="vscode-step-cluster"
              role="group"
              aria-label="单步与播放控制"
            >
              <button
                type="button"
                className="vscode-icon-btn"
                title="重置到第一步"
                aria-label="重置到第一步"
                disabled={busy || session.currentStep === 0}
                onClick={() => {
                  setIsPlaying(false);
                  handleStepReset();
                }}
              >
                ⏮
              </button>
              <button
                type="button"
                className="vscode-icon-btn"
                title="上一步"
                aria-label="上一步"
                disabled={busy || session.currentStep === 0}
                onClick={() => {
                  setIsPlaying(false);
                  handleStepPrev();
                }}
              >
                ◀
              </button>
              <button
                type="button"
                className={`vscode-icon-btn ${isPlaying ? "is-playing" : ""}`}
                title={isPlaying ? "暂停自动播放" : "自动连续播放"}
                aria-label={isPlaying ? "暂停自动播放" : "自动连续播放"}
                disabled={busy}
                onClick={handleTogglePlay}
              >
                {isPlaying ? "⏸" : "▶"}
              </button>
            </div>
          )}

          <button
            type="button"
            className="vscode-step-button"
            title="生成近似轨迹或回放下一步（F10）"
            disabled={busy || !session.code.trim()}
            onClick={() => {
              setIsPlaying(false);
              handleStepRun();
            }}
          >
            <span aria-hidden="true">↷</span>
            <span>
              {!hasTrace || session.isStale
                ? "近似推演"
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
              setIsPlaying(false);
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

      <div
        ref={splitContainerRef}
        className={`visualizer-main-split mobile-show-${mobilePane} ${isResizing ? "is-resizing" : ""}`}
        style={
          {
            "--split-left-ratio": `${splitPercent}%`,
            gridTemplateColumns: `var(--split-left-ratio, 42%) 8px minmax(0, 1fr)`,
          } as React.CSSProperties
        }
      >
        <div className="code-split-pane">
          <CodeMirrorEditor
            value={session.code}
            onChange={onChangeCode}
            activeLine={currentSnapshot?.line ?? 0}
            readOnly={busy}
            wrapLines={variant === "lab"}
          />
        </div>

        <div
          className="visualizer-split-gutter"
          role="separator"
          tabIndex={0}
          aria-orientation="vertical"
          aria-label="拖拽调整代码与输出视图宽度，双击复位"
          aria-valuenow={Math.round(splitPercent)}
          aria-valuemin={20}
          aria-valuemax={80}
          title="按住拖拽调整分栏宽度，双击恢复默认"
          onPointerDown={handlePointerDown}
          onDoubleClick={handleResetSplit}
          onKeyDown={handleSplitKeyDown}
        >
          <div className="split-gutter-line" aria-hidden="true" />
        </div>

        <div className="output-split-pane">
          <div className="output-tabs-header">
            <div
              className="output-segmented-toggle"
              role="tablist"
              aria-label="输出类型"
            >
              <button
                type="button"
                role="tab"
                id="memory-tab-memory"
                aria-controls="memory-tab-panel"
                tabIndex={activeTab === "memory" ? 0 : -1}
                onKeyDown={moveTabFocus}
                aria-selected={activeTab === "memory"}
                className={`segmented-tab ${activeTab === "memory" ? "is-active" : ""}`}
                onClick={() => setActiveTab("memory")}
              >
                内存视图
              </button>
              <button
                type="button"
                role="tab"
                id="memory-tab-terminal"
                aria-controls="memory-tab-panel"
                tabIndex={activeTab === "terminal" ? 0 : -1}
                onKeyDown={moveTabFocus}
                aria-selected={activeTab === "terminal"}
                className={`segmented-tab ${activeTab === "terminal" ? "is-active" : ""}`}
                onClick={() => setActiveTab("terminal")}
              >
                终端
              </button>
            </div>

            {activeTab === "memory" && (
              <div className="output-header-right">
                <div
                  className="memory-layout-toggle"
                  role="group"
                  aria-label="内存布局"
                >
                  <button
                    type="button"
                    className={`memory-layout-btn ${layoutMode === "horizontal" ? "is-active" : ""}`}
                    aria-pressed={layoutMode === "horizontal"}
                    title="横向排列：调用栈与堆左右并排（流动感最佳）"
                    onClick={() => {
                      setLayoutMode("horizontal");
                      try {
                        localStorage.setItem(MEMORY_LAYOUT_KEY, "horizontal");
                      } catch {}
                      window.dispatchEvent(new Event("resize"));
                    }}
                  >
                    <span aria-hidden="true">⫿</span> 并排
                  </button>
                  <button
                    type="button"
                    className={`memory-layout-btn ${layoutMode === "vertical" ? "is-active" : ""}`}
                    aria-pressed={layoutMode === "vertical"}
                    title="纵向排列：调用栈在上，堆在下（适合小屏或窄分栏）"
                    onClick={() => {
                      setLayoutMode("vertical");
                      try {
                        localStorage.setItem(MEMORY_LAYOUT_KEY, "vertical");
                      } catch {}
                      window.dispatchEvent(new Event("resize"));
                    }}
                  >
                    <span aria-hidden="true">⫸</span> 上下
                  </button>
                </div>
              </div>
            )}
          </div>
          <div
            className="output-tab-panel"
            id="memory-tab-panel"
            role="tabpanel"
            aria-labelledby={`memory-tab-${activeTab}`}
            tabIndex={0}
          >
            {activeTab === "memory" ? (
              <MemoryCanvas
                snapshot={currentSnapshot}
                layoutMode={layoutMode}
                approximate={session.accuracy === "approximate"}
              />
            ) : (
              <pre className="terminal-output">
                {session.terminalOutput ||
                  "$ clang++ main.cpp -std=gnu++23\n$ ./main\n(等待运行输出...)"}
              </pre>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
