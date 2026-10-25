import { useState } from "react";
import type { SlideDeck } from "../../lib/slides";

export function SlidevControls({ deck }: { deck: SlideDeck }) {
  const [slidevUrl, setSlidevUrl] = useState("http://localhost:3030");
  const [showIframe, setShowIframe] = useState(false);

  return (
    <div className="slides-live-panel">
      <div className="slides-card-block">
        <h3>⚡ Slidev 官方运行时与工程命令</h3>
        <p style={{ color: "var(--muted)", fontSize: "14px", lineHeight: "1.6" }}>
          本课程课件基于 <strong>Slidev</strong> 驱动，支持演讲者双屏模式、自由画板批注与热重载。
          你可以随时在终端中启动 Slidev 独立服务，或在此页中直接嵌入预览：
        </p>

        <div style={{ marginTop: "16px" }}>
          <strong style={{ fontSize: "13px", color: "var(--blue)" }}>
            1. 启动 Slidev 本地交互服务器（支持双屏演讲与自由涂鸦）
          </strong>
          <code className="slides-terminal-code">npm --prefix slides run dev</code>
        </div>

        <div style={{ marginTop: "14px" }}>
          <strong style={{ fontSize: "13px", color: "var(--blue)" }}>
            2. 运行幻灯片防幻觉与工程大纲严格校验（三栏边界守护）
          </strong>
          <code className="slides-terminal-code">npm run ppt:check</code>
        </div>

        <div style={{ marginTop: "14px" }}>
          <strong style={{ fontSize: "13px", color: "var(--blue)" }}>
            3. 构建静态站点与导出高清 PDF 讲义
          </strong>
          <code className="slides-terminal-code">
            npm run ppt:build &amp;&amp; npm run ppt:export
          </code>
        </div>
      </div>

      <div className="slides-card-block">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "10px",
            marginBottom: "12px",
          }}
        >
          <div>
            <h3 style={{ margin: "0 0 4px" }}>🖥️ Slidev 实时嵌入视窗</h3>
            <span style={{ fontSize: "13px", color: "var(--muted)" }}>
              启动 <code>npm --prefix slides run dev</code> 后，即可在下方实时联动调试
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <input
              type="url"
              value={slidevUrl}
              onChange={(e) => setSlidevUrl(e.target.value)}
              style={{
                padding: "4px 8px",
                fontSize: "13px",
                border: "1px solid var(--line)",
                borderRadius: "6px",
                minWidth: "200px",
              }}
              aria-label="Slidev 服务地址"
            />
            <button
              type="button"
              className={`slide-ctrl-btn ${showIframe ? "is-active" : ""}`}
              onClick={() => setShowIframe((prev) => !prev)}
            >
              {showIframe ? "关闭嵌入预览" : "打开嵌入预览 ↗"}
            </button>
            <a
              href={slidevUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="slide-ctrl-btn"
              style={{ textDecoration: "none" }}
            >
              在新标签页打开 ↗
            </a>
          </div>
        </div>

        {showIframe && (
          <div className="slides-iframe-container">
            <iframe
              src={slidevUrl}
              title={`Slidev - ${deck.title}`}
              className="slides-iframe"
              allow="fullscreen"
            />
          </div>
        )}
      </div>
    </div>
  );
}
