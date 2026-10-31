import { useState, useRef } from "react";
import { PRESET_TRACES_META } from "./presetTraces";
import { normalizeVisualizerTrace } from "./traceProtocol";
import type { VisualizerTrace } from "./types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function TraceSelectorModal({
  isOpen,
  onClose,
  onSelectPreset,
  onImportCustomTrace,
  currentTraceId,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSelectPreset: (id: string) => void;
  onImportCustomTrace: (trace: VisualizerTrace) => void;
  currentTraceId?: string;
}) {
  const [activeTab, setActiveTab] = useState<"presets" | "upload" | "paste">("presets");
  const [pasteText, setPasteText] = useState("");
  const [parseError, setParseError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setParseError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const raw = JSON.parse(event.target?.result as string);
        const parsed = normalizeVisualizerTrace(raw);
        onImportCustomTrace(parsed);
        onClose();
      } catch (err) {
        setParseError(`文件解析失败: ${err instanceof Error ? err.message : String(err)}`);
      }
    };
    reader.onerror = () => setParseError("读取文件失败");
    reader.readAsText(file);
  };

  const handlePasteImport = () => {
    setParseError(null);
    if (!pasteText.trim()) {
      setParseError("请先粘贴 JSON 文本内容");
      return;
    }
    try {
      const raw = JSON.parse(pasteText);
      const parsed = normalizeVisualizerTrace(raw);
      onImportCustomTrace(parsed);
      onClose();
    } catch (err) {
      setParseError(`解析失败: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="trace-modal-dialog p-0 gap-0 max-w-2xl bg-[#0d131d] border-[#1e293b] text-[#f8fafc] overflow-hidden"
        aria-labelledby="trace-dialog-title"
      >
        {/* Modal 头部 */}
        <DialogHeader className="trace-modal-header p-4 border-b border-[#1e293b] bg-[#162032] flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-2">
            <span className="text-base">📂</span>
            <DialogTitle
              id="trace-dialog-title"
              className="text-sm font-semibold text-[#f8fafc]"
            >
              C++ 内存执行轨迹剧本库 (Trace Library)
            </DialogTitle>
          </div>
        </DialogHeader>

        {/* Tab 切换 */}
        <div className="trace-modal-tabs flex bg-[#090d13] px-4 py-2 border-b border-[#1e293b] gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("presets")}
            className={`trace-modal-tab px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === "presets"
                ? "is-active bg-[#1e293b] text-[#38bdf8]"
                : "text-[#94a3b8] hover:text-[#f8fafc]"
            }`}
          >
            📚 内置经典案例 (5)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("upload")}
            className={`trace-modal-tab px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === "upload"
                ? "is-active bg-[#1e293b] text-[#38bdf8]"
                : "text-[#94a3b8] hover:text-[#f8fafc]"
            }`}
          >
            ⬆️ 本地上传 JSON
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("paste")}
            className={`trace-modal-tab px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === "paste"
                ? "is-active bg-[#1e293b] text-[#38bdf8]"
                : "text-[#94a3b8] hover:text-[#f8fafc]"
            }`}
          >
            📋 粘贴 JSON 文本
          </button>
        </div>

        {/* 内容区 */}
        <div className="trace-modal-body p-4 max-h-[60vh] overflow-y-auto">
          {activeTab === "presets" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>
                纯静态无需编译，点击任一案例即刻开始交互式单步调试：
              </div>
              {PRESET_TRACES_META.map((item) => {
                const isSelected = currentTraceId === item.id;
                return (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => {
                      onSelectPreset(item.id);
                      onClose();
                    }}
                    style={{
                      background: isSelected ? "rgba(56, 189, 248, 0.1)" : "#131a27",
                      border: isSelected ? "1px solid #38bdf8" : "1px solid #1e293b",
                      borderRadius: "8px",
                      padding: "10px 14px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      transition: "all 0.15s ease",
                      width: "100%",
                      textAlign: "left",
                    }}
                  >
                    <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontSize: "13px", fontWeight: 600, color: "#f8fafc" }}>
                          {item.title}
                        </span>
                        <span
                          style={{
                            fontSize: "10px",
                            color: "#38bdf8",
                            background: "rgba(56, 189, 248, 0.15)",
                            padding: "1px 6px",
                            borderRadius: "4px",
                          }}
                        >
                          {item.badge}
                        </span>
                      </div>
                      <span style={{ fontSize: "11.5px", color: "#94a3b8" }}>
                        {item.description}
                      </span>
                    </div>
                    <span style={{ fontSize: "12px", color: "#38bdf8" }}>载入 ▶</span>
                  </button>
                );
              })}
            </div>
          )}

          {activeTab === "upload" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: "2px dashed #334155",
                  borderRadius: "8px",
                  padding: "36px 20px",
                  textAlign: "center",
                  cursor: "pointer",
                  background: "#090d13",
                  transition: "border-color 0.15s ease",
                }}
              >
                <div style={{ fontSize: "32px", marginBottom: "8px" }}>📁</div>
                <div style={{ fontSize: "13px", color: "#cbd5e1", fontWeight: 500 }}>
                  点击选择本地 JSON 轨迹文件
                </div>
                <div style={{ fontSize: "11px", color: "#64748b", marginTop: "4px" }}>
                  支持由专业版 C++ 探针或模拟器导出的标准 .json 格式
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,application/json"
                  style={{ display: "none" }}
                  onChange={handleFileUpload}
                />
              </div>

              {parseError && (
                <div
                  role="alert"
                  style={{
                    padding: "8px 12px",
                    background: "#450a0a",
                    border: "1px solid #7f1d1d",
                    borderRadius: "6px",
                    color: "#fca5a5",
                    fontSize: "12px",
                  }}
                >
                  {parseError}
                </div>
              )}
            </div>
          )}

          {activeTab === "paste" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <div style={{ fontSize: "11px", color: "#94a3b8" }}>
                直接粘贴包含 sourceCode 和 snapshots 的完整 JSON 字符串：
              </div>
              <textarea
                aria-label="粘贴轨迹 JSON"
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder='{\n  "sourceCode": "...",\n  "snapshots": [...]\n}'
                rows={8}
                style={{
                  width: "100%",
                  background: "#090d13",
                  border: "1px solid #1e293b",
                  borderRadius: "6px",
                  color: "#e2e8f0",
                  fontFamily: "var(--mono, monospace)",
                  fontSize: "11px",
                  padding: "10px",
                  boxSizing: "border-box",
                  resize: "vertical",
                  outline: "none",
                }}
              />

              {parseError && (
                <div
                  role="alert"
                  style={{
                    padding: "8px 12px",
                    background: "#450a0a",
                    border: "1px solid #7f1d1d",
                    borderRadius: "6px",
                    color: "#fca5a5",
                    fontSize: "12px",
                  }}
                >
                  {parseError}
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                <button
                  type="button"
                  onClick={() => {
                    setPasteText("");
                    setParseError(null);
                  }}
                  style={{
                    padding: "6px 12px",
                    fontSize: "12px",
                    background: "transparent",
                    color: "#94a3b8",
                    border: "1px solid #334155",
                    borderRadius: "6px",
                    cursor: "pointer",
                  }}
                >
                  清空
                </button>
                <button
                  type="button"
                  onClick={handlePasteImport}
                  style={{
                    padding: "6px 16px",
                    fontSize: "12px",
                    background: "#0284c7",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontWeight: 500,
                  }}
                >
                  导入并解析
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal 底部小提示 */}
        <div className="trace-modal-footer px-4 py-2.5 bg-[#090d13] border-t border-[#1e293b] flex items-center justify-between text-[11px] text-[#64748b]">
          <span>提示: 纯前端渲染，所有内存轨迹仅在本地浏览器执行，绝不上传服务器</span>
          <span style={{ fontFamily: "var(--mono, monospace)" }}>Visualizer v2.1</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
