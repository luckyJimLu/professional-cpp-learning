import { useEffect, useState, useRef } from "react";
import { PRESET_TRACES_META } from "./presetTraces";
import { normalizeVisualizerTrace } from "./traceProtocol";
import type { VisualizerTrace } from "./types";

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
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    closeButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>("button, input, textarea, [tabindex]:not([tabindex='-1'])"));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setParseError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = normalizeVisualizerTrace(JSON.parse(content));
        onImportCustomTrace(parsed);
        onClose();
      } catch (err) {
        setParseError(`解析失败: ${err instanceof Error ? err.message : String(err)}`);
      }
    };
    reader.readAsText(file);
  };

  const handlePasteSubmit = () => {
    setParseError(null);
    if (!pasteText.trim()) return;

    try {
      const parsed = normalizeVisualizerTrace(JSON.parse(pasteText));
      onImportCustomTrace(parsed);
      onClose();
    } catch (err) {
      setParseError(`解析失败: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: "var(--z-dialog)",
        background: "rgba(3, 7, 18, 0.75)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="trace-dialog-title"
        style={{
          background: "#0d131d",
          border: "1px solid #1e293b",
          borderRadius: "12px",
          width: "100%",
          maxWidth: "600px",
          maxHeight: "85vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 24px 48px rgba(0, 0, 0, 0.6)",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal 头部 */}
        <div
          style={{
            padding: "14px 18px",
            borderBottom: "1px solid #1e293b",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "#162032",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "16px" }}>📂</span>
            <span id="trace-dialog-title" style={{ fontSize: "14px", fontWeight: 600, color: "#f8fafc" }}>
              C++ 内存执行轨迹剧本库 (Trace Library)
            </span>
          </div>
          <button
            ref={closeButtonRef}
            aria-label="关闭轨迹剧本库"
            type="button"
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "#94a3b8",
              fontSize: "18px",
              cursor: "pointer",
              padding: "4px 8px",
              borderRadius: "4px",
            }}
          >
            ✕
          </button>
        </div>

        {/* Tab 切换 */}
        <div
          style={{
            display: "flex",
            background: "#090d13",
            padding: "6px 16px",
            borderBottom: "1px solid #1e293b",
            gap: "8px",
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab("presets")}
            style={{
              background: activeTab === "presets" ? "#1e293b" : "transparent",
              color: activeTab === "presets" ? "#38bdf8" : "#94a3b8",
              border: "none",
              borderRadius: "6px",
              padding: "6px 12px",
              fontSize: "12px",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            📚 内置经典案例 (5)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("upload")}
            style={{
              background: activeTab === "upload" ? "#1e293b" : "transparent",
              color: activeTab === "upload" ? "#38bdf8" : "#94a3b8",
              border: "none",
              borderRadius: "6px",
              padding: "6px 12px",
              fontSize: "12px",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            ⬆️ 本地上传 JSON
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("paste")}
            style={{
              background: activeTab === "paste" ? "#1e293b" : "transparent",
              color: activeTab === "paste" ? "#38bdf8" : "#94a3b8",
              border: "none",
              borderRadius: "6px",
              padding: "6px 12px",
              fontSize: "12px",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            📋 粘贴 JSON 文本
          </button>
        </div>

        {/* 内容区 */}
        <div style={{ padding: "16px", overflowY: "auto", flex: 1, minHeight: 0 }}>
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
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                border: "2px dashed #1e293b",
                borderRadius: "10px",
                padding: "36px 16px",
                textAlign: "center",
                background: "#090d13",
                gap: "12px",
              }}
            >
              <div style={{ fontSize: "32px" }}>📄</div>
              <div style={{ fontSize: "13px", color: "#e2e8f0", fontWeight: 500 }}>
                选择符合协议的 .json 轨迹文件并在浏览器中校验
              </div>
              <div style={{ fontSize: "11px", color: "#64748b", maxWidth: "360px" }}>
                符合规范的轨迹文件将直接由浏览器前端引擎读取渲染，零服务器开销。
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                style={{ display: "none" }}
                onChange={handleFileUpload}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={{
                  background: "#1e3a5f",
                  color: "#38bdf8",
                  border: "1px solid #2563eb",
                  borderRadius: "6px",
                  padding: "6px 16px",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                  marginTop: "6px",
                }}
              >
                选择本地 JSON 文件
              </button>
            </div>
          )}

          {activeTab === "paste" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <div style={{ fontSize: "12px", color: "#94a3b8" }}>
                直接粘贴包含 sourceCode 与 snapshots 数组的 JSON 剧本：
              </div>
              <textarea
                className="resize-none"
                aria-label="粘贴轨迹 JSON"
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder='{\n  "sourceCode": "...",\n  "snapshots": [ ... ]\n}'
                style={{
                  width: "100%",
                  height: "180px",
                  background: "#090d13",
                  border: "1px solid #1e293b",
                  borderRadius: "6px",
                  padding: "10px",
                  color: "#f1f5f9",
                  fontFamily: "var(--mono, monospace)",
                  fontSize: "12px",
                  lineHeight: "1.5",
                  resize: "none",
                }}
              />
              <button
                type="button"
                onClick={handlePasteSubmit}
                disabled={!pasteText.trim()}
                style={{
                  alignSelf: "flex-end",
                  background: pasteText.trim() ? "#18794e" : "#1e293b",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "6px",
                  padding: "6px 18px",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: pasteText.trim() ? "pointer" : "not-allowed",
                }}
              >
                导入并解析
              </button>
            </div>
          )}

          {parseError && (
            <div
              role="alert"
              style={{
                marginTop: "12px",
                padding: "8px 12px",
                background: "rgba(239, 68, 68, 0.15)",
                border: "1px solid #ef4444",
                borderRadius: "6px",
                color: "#fca5a5",
                fontSize: "12px",
                fontFamily: "var(--mono, monospace)",
              }}
            >
              ⚠️ {parseError}
            </div>
          )}
        </div>

        {/* 底部提示 */}
        <div
          style={{
            padding: "10px 18px",
            background: "#090d13",
            borderTop: "1px solid #1e293b",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: "11px",
            color: "#64748b",
          }}
        >
          <span>💡 支持 URL 参数：<code>?trace=smart-ptr-unique</code> 自动直达</span>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "transparent",
              border: "1px solid #334155",
              color: "#94a3b8",
              borderRadius: "4px",
              padding: "3px 10px",
              fontSize: "11px",
              cursor: "pointer",
            }}
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}
