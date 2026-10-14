import { useState, useEffect } from "react";
import { CodeMirrorEditor } from "./CodeMirrorEditor";
import { VCRControls } from "./VCRControls";
import { MemoryCanvas } from "./MemoryCanvas";
import type { MemorySnapshot } from "./types";
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
  className?: string;
}) {
  const [activeTab, setActiveTab] = useState<"visualizer" | "terminal">(
    snapshots.length > 0 ? "visualizer" : "terminal",
  );

  // 当生成了新的 snapshot 时，自动切到 visualizer 选项卡
  useEffect(() => {
    if (snapshots.length > 0) {
      setActiveTab("visualizer");
    }
  }, [snapshots]);

  const currentSnapshot = snapshots[currentStep] || null;
  const activeLine = currentSnapshot ? currentSnapshot.line : 0;
  const isBusy = compilerState === "loading" || compilerState === "compiling";

  return (
    <div className={`visualizer-workbench ${className}`}>
      {/* 顶部 VCR 播放控制条 */}
      {snapshots.length > 0 && activeTab === "visualizer" && (
        <VCRControls
          snapshots={snapshots}
          currentStep={currentStep}
          onStepChange={onStepChange}
        />
      )}

      {/* 主工作区：左侧代码面板，右侧内存画布 / 终端面板 */}
      <div className="visualizer-main-split">
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
          {/* 选项卡头部 */}
          <div
            className="output-tabs-header"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "#161b22",
              padding: "4px 8px",
              borderBottom: "1px solid #1c2430",
            }}
          >
            <div style={{ display: "flex", gap: "6px" }}>
              <button
                type="button"
                className={`vcr-btn ${activeTab === "visualizer" ? "play-btn" : ""}`}
                onClick={() => setActiveTab("visualizer")}
                style={{ fontSize: "12px", padding: "3px 10px" }}
              >
                📺 内存与生命周期
              </button>
              <button
                type="button"
                className={`vcr-btn ${activeTab === "terminal" ? "play-btn" : ""}`}
                onClick={() => setActiveTab("terminal")}
                style={{ fontSize: "12px", padding: "3px 10px" }}
              >
                💻 终端输出
              </button>
            </div>

            {onRun && (
              <button
                type="button"
                className="compile-button"
                disabled={isBusy || !code.trim()}
                onClick={onRun}
                style={{
                  background: "#18794e",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "6px",
                  padding: "4px 14px",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: isBusy ? "not-allowed" : "pointer",
                }}
              >
                {compilerState === "loading"
                  ? `下载工具链 ${Math.round(compilerProgress * 100)}%`
                  : compilerState === "compiling"
                    ? "编译运行中…"
                    : "编译与可视化 ▶"}
              </button>
            )}
          </div>

          {/* 选项卡内容区 */}
          <div style={{ flex: 1, minHeight: 0, position: "relative" }}>
            {activeTab === "visualizer" ? (
              <MemoryCanvas snapshot={currentSnapshot} />
            ) : (
              <div
                style={{
                  padding: "12px",
                  fontFamily: "var(--mono, monospace)",
                  fontSize: "12.5px",
                  lineHeight: "1.6",
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
