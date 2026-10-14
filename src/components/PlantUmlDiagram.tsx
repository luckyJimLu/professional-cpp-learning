import { useEffect, useMemo, useRef, useState } from "react";
import {
  cleanPlantUml,
  getPlantUmlServerUrl,
  getPlantUmlSvgUrl,
  plantUmlSlug,
} from "../lib/plantuml";

export { isPlantUmlSource } from "../lib/plantuml";

interface PlantUmlDiagramProps {
  code: string;
}

export function PlantUmlDiagram({ code }: PlantUmlDiagramProps) {
  const [viewMode, setViewMode] = useState<"diagram" | "code">("diagram");
  const [failed, setFailed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  const cleanCode = useMemo(() => cleanPlantUml(code), [code]);
  const slug = useMemo(() => plantUmlSlug(code), [code]);
  const server = getPlantUmlServerUrl();

  const imageUrl = useMemo(() => {
    const base = getPlantUmlSvgUrl(cleanCode, server);
    return retryKey > 0 ? `${base}?retry=${retryKey}` : base;
  }, [cleanCode, server, retryKey]);

  const handleCopy = () => {
    navigator.clipboard?.writeText(cleanCode).catch(() => {
      // Clipboard access might fail in non-secure contexts; still show copied feedback
    });
    setCopied(true);
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
    }
    timerRef.current = window.setTimeout(() => setCopied(false), 2000);
  };

  const handleRetry = () => {
    setFailed(false);
    setRetryKey((k) => k + 1);
  };

  return (
    <figure className="plantuml-diagram">
      <div className="plantuml-header">
        <div className="plantuml-tabs" role="tablist" aria-label="图表显示模式">
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === "diagram"}
            onClick={() => setViewMode("diagram")}
            className={`plantuml-tab-btn ${
              viewMode === "diagram" ? "is-active" : ""
            }`}
          >
            <svg
              viewBox="0 0 24 24"
              width="14"
              height="14"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            <span>流程图</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === "code"}
            onClick={() => setViewMode("code")}
            className={`plantuml-tab-btn ${
              viewMode === "code" ? "is-active" : ""
            }`}
          >
            <svg
              viewBox="0 0 24 24"
              width="14"
              height="14"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="16 18 22 12 16 6" />
              <polyline points="8 6 2 12 8 18" />
            </svg>
            <span>源码</span>
          </button>
        </div>

        <div className="plantuml-actions">
          <button
            type="button"
            onClick={handleCopy}
            className="plantuml-action-btn"
            aria-label={copied ? "已复制源码" : "复制 PlantUML 源码"}
            title={copied ? "已复制源码" : "复制 PlantUML 源码"}
          >
            {copied ? (
              <>
                <svg
                  viewBox="0 0 24 24"
                  width="13"
                  height="13"
                  fill="none"
                  stroke="#18794e"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span className="text-success">已复制</span>
              </>
            ) : (
              <>
                <svg
                  viewBox="0 0 24 24"
                  width="13"
                  height="13"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                <span>复制源码</span>
              </>
            )}
          </button>

          <a
            href={imageUrl}
            target="_blank"
            rel="noreferrer"
            className="plantuml-action-btn"
            aria-label="在新标签页中打开静态 SVG"
            title="在新标签页中打开静态 SVG"
          >
            <svg
              viewBox="0 0 24 24"
              width="13"
              height="13"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
            <span>SVG</span>
          </a>
        </div>
      </div>

      {viewMode === "code" ? (
        <pre className="plantuml-source-pre">
          <code>{cleanCode}</code>
        </pre>
      ) : failed ? (
        <div className="plantuml-error" role="alert">
          <div className="plantuml-error-header">
            <svg
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <strong>PlantUML 图形未能加载</strong>
            <button
              type="button"
              onClick={handleRetry}
              className="plantuml-retry-btn"
            >
              重试加载
            </button>
          </div>
          <p>
            渲染服务响应超时或网络受限。您可以点击上方“源码”直接查看并复制
            PlantUML 文本，或配置环境变量 <code>VITE_PLANTUML_SERVER</code>{" "}
            指定私有渲染服务。
          </p>
        </div>
      ) : (
        <div
          className="plantuml-viewport"
          tabIndex={0}
          aria-label="PlantUML 流程图，可横向滚动"
        >
          <img
            key={`${slug}-${retryKey}`}
            src={imageUrl}
            alt="PlantUML 流程图"
            className="plantuml-image"
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setFailed(true)}
          />
        </div>
      )}
    </figure>
  );
}
