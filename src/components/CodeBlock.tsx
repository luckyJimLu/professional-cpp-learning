import { useEffect, useRef, useState } from "react";
import { HighlightedCode } from "./HighlightedCode";

interface CodeBlockProps {
  lang: string;
  codeString: string;
  copyLabel?: string;
  copiedLabel?: string;
}

export function CodeBlock({
  lang,
  codeString,
  copyLabel = "复制代码",
  copiedLabel = "已复制",
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(codeString).catch(() => {
      // Clipboard API may be unavailable in some contexts
    });
    setCopied(true);
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
    }
    timerRef.current = window.setTimeout(() => setCopied(false), 2000);
  };

  const displayLang = lang.trim() ? lang.toUpperCase() : "TEXT";

  return (
    <div className="code-block-card">
      <div className="code-block-header">
        <span className="code-block-lang">{displayLang}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="code-block-copy-btn"
          aria-label={copied ? copiedLabel : copyLabel}
          title={copied ? copiedLabel : copyLabel}
        >
          {copied ? (
            <>
              <svg
                className="code-block-icon icon-success"
                viewBox="0 0 24 24"
                width="14"
                height="14"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span className="code-block-copy-text text-success">
                {copiedLabel}
              </span>
            </>
          ) : (
            <>
              <svg
                className="code-block-icon"
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
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              <span className="code-block-copy-text">{copyLabel}</span>
            </>
          )}
        </button>
      </div>
      <pre>
        <HighlightedCode code={codeString} language={lang} />
      </pre>
    </div>
  );
}
