import { useState, useEffect, useCallback } from "react";
import { CodeMirrorEditor } from "./CodeMirrorEditor";
import { VCRControls } from "./VCRControls";
import { MemoryCanvas } from "./MemoryCanvas";
import { D3MemoryGraph } from "./D3MemoryGraph";
import { XYFlowTopology } from "./XYFlowTopology";
import { TraceSelectorModal } from "./TraceSelectorModal";
import { loadPresetTrace, PRESET_TRACES_META } from "./presetTraces";
import type { MemorySnapshot, VisualizerTrace } from "./types";
import "./visualizer.css";

export function VisualizerWorkbench({
  code,
  onChangeCode,
  snapshots,
  currentStep,
  onStepChange,
  compilerState,
  compilerProgress,
  terminalOutput,
  onRun,
  onStepDebug,
  className = "",
}: {
  code: string;
  onChangeCode?: (val: string) => void;
  snapshots: MemorySnapshot[];
  currentStep: number;
  onStepChange: (step: number) => void;
  compilerState: "idle" | "loading" | "compiling" | "success" | "failure";
  compilerProgress: number;
  terminalOutput: string;
  onRun?: () => void;
  onStepDebug?: () => void;
  className?: string;
}) {
  const [activeTab, setActiveTab] = useState<"xyflow" | "visualizer" | "d3_graph" | "terminal">(
    snapshots.length > 0 ? "xyflow" : "terminal",
  );

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentTraceId, setCurrentTraceId] = useState<string | undefined>("smart-ptr-unique");

  // 检查 URL 是否指定了 trace 参数，如 ?trace=linked-list-reverse
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const traceParam = urlParams.get("trace");
      if (traceParam) {
        loadPresetTrace(traceParam).then((loaded) => {
          if (loaded) {
            setCurrentTraceId(traceParam);
            if (onChangeCode) onChangeCode(loaded.sourceCode);
            onStepChange(0);
            setActiveTab("xyflow");
          }
        });
      }
    } catch {
      // ignore
    }
  }, [onChangeCode, onStepChange]);

  // 当生成了新的 snapshot 时，若当前在终端，自动切到最清晰的 XYFlow 2D 拓扑
  useEffect(() => {
    if (snapshots.length > 0 && activeTab === "terminal") {
      setActiveTab("xyflow");
    }
  }, [snapshots, activeTab]);

  const isBusy = compilerState === "loading" || compilerState === "compiling";
  const currentSnapshot = snapshots[currentStep] || null;
  const activeLine = currentSnapshot ? currentSnapshot.line : 0;

  // 键盘快捷键监听：左右方向键单步调试，Ctrl+Enter 运行
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 当焦点在编辑框内时不劫持左右箭头
      const target = e.target as HTMLElement | null;
      const isInput = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.closest(".cm-editor");

      if (!isInput && snapshots.length > 0) {
        if (e.key === "ArrowRight") {
          e.preventDefault();
          if (currentStep < snapshots.length - 1) {
            onStepChange(currentStep + 1);
          }
        } else if (e.key === "ArrowLeft") {
          e.preventDefault();
          if (currentStep > 0) {
            onStepChange(currentStep - 1);
          }
        }
      }

      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        if (!isBusy && onRun && code.trim()) {
          onRun();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isBusy, onRun, code, snapshots.length, currentStep, onStepChange]);

  // 移动端视图切换模式
  const [mobilePane, setMobilePane] = useState<"code" | "output">("output");

  // 运行时如果切到了输出结果，移动端自动切到 output 面板
  useEffect(() => {
    if (compilerState === "compiling" || compilerState === "success") {
      setMobilePane("output");
    }
  }, [compilerState]);

  // 选择预置案例
  const handleSelectPreset = useCallback(
    async (presetId: string) => {
      const trace = await loadPresetTrace(presetId);
      if (trace) {
        setCurrentTraceId(presetId);
        if (onChangeCode) onChangeCode(trace.sourceCode);
        onStepChange(0);
        setActiveTab("xyflow");
      }
    },
    [onChangeCode, onStepChange],
  );

  // 导入自定义 JSON 轨迹
  const handleImportCustomTrace = useCallback(
    (trace: VisualizerTrace) => {
      setCurrentTraceId(undefined);
      if (onChangeCode && trace.sourceCode) {
        onChangeCode(trace.sourceCode);
      }
      onStepChange(0);
      setActiveTab("xyflow");
    },
    [onChangeCode, onStepChange],
  );

  // 导出当前轨迹为 JSON 文件
  const handleExportJson = useCallback(() => {
    const exportData: VisualizerTrace = {
      title: "C++ Memory Execution Trace",
      sourceCode: code,
      snapshots,
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cpp-trace-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [code, snapshots]);

  return (
    <div className={`visualizer-workbench ${className}`}>
      {/* 轨迹剧本库与导入 Modal */}
      <TraceSelectorModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSelectPreset={handleSelectPreset}
        onImportCustomTrace={handleImportCustomTrace}
        currentTraceId={currentTraceId}
      />

      {/* 顶部工具条：案例快速选择与导入导出 */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "#0d131d",
          borderBottom: "1px solid #1e293b",
          padding: "6px 14px",
          gap: "8px",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "12px", color: "#64748b" }}>案例剧本:</span>
          <div style={{ display: "flex", alignItems: "center", gap: "4px", overflowX: "auto" }}>
            {PRESET_TRACES_META.slice(0, 3).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectPreset(item.id)}
                style={{
                  background: currentTraceId === item.id ? "rgba(56, 189, 248, 0.15)" : "transparent",
                  color: currentTraceId === item.id ? "#38bdf8" : "#94a3b8",
                  border: currentTraceId === item.id ? "1px solid rgba(56, 189, 248, 0.4)" : "1px solid transparent",
                  borderRadius: "4px",
                  padding: "3px 8px",
                  fontSize: "11px",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {item.title}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            style={{
              background: "#162032",
              border: "1px solid #1e293b",
              color: "#38bdf8",
              borderRadius: "4px",
              padding: "3px 10px",
              fontSize: "11px",
              fontWeight: 500,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <span>📂 剧本库 / 导入</span>
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {snapshots.length > 0 && (
            <button
              type="button"
              onClick={handleExportJson}
              title="导出当前轨迹为纯静态 .json 文件（适合提交到 GitHub Pages）"
              style={{
                background: "transparent",
                border: "1px solid #334155",
                color: "#94a3b8",
                borderRadius: "4px",
                padding: "3px 8px",
                fontSize: "11px",
                cursor: "pointer",
              }}
            >
              ⬇️ 导出 JSON
            </button>
          )}

          <span
            style={{
              fontSize: "11px",
              color: "#64748b",
              fontFamily: "var(--mono, monospace)",
            }}
          >
            ← → 方向键单步
          </span>
        </div>
      </div>

      {/* 移动端视图切换条 */}
      <div className="workbench-mobile-switcher">
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
          {activeTab === "xyflow"
            ? "2D 拓扑"
            : activeTab === "d3_graph"
              ? "力导图"
              : activeTab === "visualizer"
                ? "栈堆结构"
                : "终端"}
          {snapshots.length > 0 ? ` (${snapshots.length}步)` : ""}
        </button>
      </div>

      {/* 顶部 VCR 播放控制条 */}
      {snapshots.length > 0 && (activeTab === "xyflow" || activeTab === "visualizer" || activeTab === "d3_graph") && (
        <VCRControls
          snapshots={snapshots}
          currentStep={currentStep}
          onStepChange={onStepChange}
        />
      )}

      {/* 主工作区：左侧代码面板，右侧内存画布 / 终端面板 */}
      <div className={`visualizer-main-split mobile-show-${mobilePane}`}>
        {/* 代码面板 */}
        <div className="code-split-pane">
          <CodeMirrorEditor
            value={code}
            onChange={onChangeCode}
            activeLine={activeLine}
            readOnly={isBusy}
          />
        </div>

        {/* 右侧展示面板（选项卡切换） */}
        <div className="output-split-pane" style={{ display: "flex", flexDirection: "column", background: "#090d13" }}>
          {/* 选项卡头部：分段 Visualize 切换控件与运行按钮 */}
          <div
            className="output-tabs-header"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "#161b22",
              padding: "6px 10px",
              borderBottom: "1px solid #1c2430",
              gap: "8px",
              flexWrap: "wrap",
            }}
          >
            {/* 分段 Visualize 切换控制器 */}
            <div className="output-segmented-toggle">
              <button
                type="button"
                className={`segmented-tab ${activeTab === "xyflow" ? "is-active" : ""}`}
                onClick={() => setActiveTab("xyflow")}
                title="2D 内存拓扑图"
              >
                2D 拓扑
              </button>
              <button
                type="button"
                className={`segmented-tab ${activeTab === "visualizer" ? "is-active" : ""}`}
                onClick={() => setActiveTab("visualizer")}
                title="经典栈堆结构"
              >
                栈堆结构
              </button>
              <button
                type="button"
                className={`segmented-tab ${activeTab === "d3_graph" ? "is-active" : ""}`}
                onClick={() => setActiveTab("d3_graph")}
                title="力导向图"
              >
                力导图
              </button>
              <button
                type="button"
                className={`segmented-tab ${activeTab === "terminal" ? "is-active" : ""}`}
                onClick={() => setActiveTab("terminal")}
                title="终端控制台输出"
              >
                终端
              </button>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              {onStepDebug && (
                <button
                  type="button"
                  className="ghost-button"
                  onClick={onStepDebug}
                  title="逐行模拟单步调试内存状态"
                  style={{
                    padding: "4px 10px",
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "#38bdf8",
                    borderColor: "rgba(56, 189, 248, 0.4)",
                    background: "rgba(56, 189, 248, 0.08)",
                    borderRadius: "6px",
                    cursor: "pointer",
                  }}
                >
                  单步调试
                </button>
              )}
              {onRun && (
                <button
                  type="button"
                  className="compile-button"
                  disabled={isBusy || !code.trim()}
                  onClick={onRun}
                  title="编译并运行当前代码 (快捷键: Ctrl+Enter)"
                  style={{
                    background: "#18794e",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "6px",
                    padding: "4px 14px",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: isBusy ? "not-allowed" : "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  {compilerState === "loading"
                    ? `加载 ${Math.round(compilerProgress * 100)}%`
                    : compilerState === "compiling"
                      ? "编译中…"
                      : "运行代码 ▶"}
                </button>
              )}
            </div>
          </div>

          {/* 选项卡内容区 */}
          <div style={{ flex: 1, minHeight: 0, position: "relative", display: "flex", flexDirection: "column" }}>
            {activeTab === "xyflow" ? (
              <XYFlowTopology snapshot={currentSnapshot} />
            ) : activeTab === "d3_graph" ? (
              <D3MemoryGraph snapshot={currentSnapshot} />
            ) : activeTab === "visualizer" ? (
              <MemoryCanvas snapshot={currentSnapshot} />
            ) : (
              <div
                style={{
                  padding: "14px 16px",
                  fontFamily: "var(--mono, monospace)",
                  fontSize: "12.5px",
                  lineHeight: "1.65",
                  color: "#c9d1d9",
                  height: "100%",
                  overflow: "auto",
                  background: "#090d13",
                  whiteSpace: "pre-wrap",
                }}
              >
                {terminalOutput || "$ clang++ main.cpp -std=gnu++23\n$ ./main\n(等待运行输出...)"}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
