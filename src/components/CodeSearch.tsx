import { useEffect, useMemo, useRef, useState } from "react";
import { codeEntries, searchCode, type CodeEntry } from "../lib/search";
import { navigate, useLocationParams } from "../lib/navigation";
import { PageHeader } from "./common/PageHeader";

function Highlight({ text, query }: { text: string; query: string }) {
  const trimmed = query.trim();
  if (!trimmed) return <>{text}</>;
  const at = text.toLowerCase().indexOf(trimmed.toLowerCase());
  if (at < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, at)}
      <mark>{text.slice(at, at + trimmed.length)}</mark>
      {text.slice(at + trimmed.length)}
    </>
  );
}

export function CodeSearch() {
  const params = useLocationParams();
  const query = params.get("q") ?? "";
  const [draft, setDraft] = useState(query);
  const [previousQuery, setPreviousQuery] = useState(query);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const composingRef = useRef(false);
  const debounceTimerRef = useRef<number | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  if (previousQuery !== query) {
    setPreviousQuery(query);
    setDraft(query);
  }

  const results = useMemo(() => {
    const trimmed = query.trim();
    if (!trimmed) return [];
    return searchCode(trimmed, "all");
  }, [query]);

  const pageSize = 30;
  const totalPages = Math.max(1, Math.ceil(results.length / pageSize));
  const page = Math.min(
    Math.max(1, Math.floor(Number(params.get("page"))) || 1),
    totalPages,
  );

  const selected = codeEntries.find((entry) => entry.id === params.get("code"));
  const matchLine = Number(params.get("line")) || selected?.line || 1;

  const updateQuery = (value: string) => {
    navigate(
      {
        q: value || undefined,
        page: undefined,
        code: undefined,
        line: undefined,
      },
      true,
    );
  };

  const handleInputChange = (value: string) => {
    setDraft(value);
    if (composingRef.current) return;
    if (debounceTimerRef.current) {
      window.clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = window.setTimeout(() => {
      updateQuery(value);
    }, 200);
  };

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        window.clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const handleCopyCode = async (codeToCopy: string) => {
    try {
      await navigator.clipboard.writeText(codeToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleRunInLab = (entry: typeof selected) => {
    if (!entry) return;
    try {
      sessionStorage.setItem("lab_custom_code", entry.code);
      sessionStorage.setItem("lab_custom_title", entry.path);
    } catch {
      // ignore
    }
    navigate({ view: "lab", code: entry.id });
  };

  const pagedResults = useMemo(() => {
    return results.slice((page - 1) * pageSize, page * pageSize);
  }, [results, page]);

  return (
    <div className="search-page-container">
      <PageHeader
        eyebrow="课程源码 · 专题示例 · 工程实践"
        title="代码搜索"
        description="查找函数、类型或关键字，查看原文件行号，或将示例带入实验工作区。"
      />
      <form
        className="search-clean-form"
        role="search"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          if (debounceTimerRef.current) {
            window.clearTimeout(debounceTimerRef.current);
          }
          if (!composingRef.current) updateQuery(draft);
        }}
      >
        <label htmlFor="code-query" className="visually-hidden">
          搜索代码
        </label>
        <div className="search-clean-box">
          <svg
            className="search-clean-icon"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#94a3b8"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            id="code-query"
            ref={inputRef}
            autoFocus
            type="search"
            value={draft}
            placeholder="搜索全站课程、专题与代码..."
            autoComplete="off"
            spellCheck={false}
            onCompositionStart={() => {
              composingRef.current = true;
            }}
            onCompositionEnd={(event) => {
              composingRef.current = false;
              handleInputChange(event.currentTarget.value);
            }}
            onChange={(event) => {
              handleInputChange(event.target.value);
            }}
          />
          {draft && (
            <button
              type="button"
              className="search-clean-clear-btn"
              aria-label="清除搜索"
              title="清除搜索"
              onClick={() => {
                setDraft("");
                updateQuery("");
                inputRef.current?.focus();
              }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>
      </form>

      <div className="visually-hidden" role="status">
        {query.trim()
          ? `${results.length} 处匹配 · 第 ${page} / ${totalPages} 页`
          : "已索引全站课程与代码"}
      </div>

      {!query.trim() && (
        <div className="search-quick-tags-panel">
          <p className="search-example-label">从一个熟悉的关键字开始</p>
          <div className="search-quick-chips">
            {[
              "std::mutex",
              "unique_ptr",
              "RingBuffer",
              "constexpr",
              "co_await",
            ].map((term) => (
              <button
                key={term}
                type="button"
                className="search-quick-chip"
                onClick={() => {
                  setDraft(term);
                  updateQuery(term);
                }}
              >
                {term}
              </button>
            ))}
          </div>
          <p className="search-scope-note">
            范围：C/C++ 源文件及 Markdown
            中的代码片段。输入中文时，确认候选词后再搜索。
          </p>
        </div>
      )}

      {query.trim() && results.length === 0 && (
        <section className="search-empty">
          <h2>没有找到匹配代码</h2>
          <p>
            没有找到与 &quot;{query}&quot;
            匹配的代码片段。试试更短的函数名、类型名，或清空搜索重新查找。
          </p>
        </section>
      )}

      <div className={`search-layout ${selected ? "has-selection" : ""}`}>
        <div className="search-results">
          {pagedResults.map(({ entry, lineIndex }) => (
            <button
              className="search-result"
              key={`${entry.id}:${lineIndex}`}
              aria-pressed={
                selected?.id === entry.id &&
                matchLine === entry.line + lineIndex
              }
              onClick={() =>
                navigate({
                  code: entry.id,
                  line: String(entry.line + lineIndex),
                })
              }
            >
              <div className="result-header">
                <span className="result-meta">
                  {entry.kind === "file" ? "源码" : "代码块"} · L
                  {entry.line + lineIndex}
                </span>
                <span className="result-category-badge">
                  {entry.category === "daily"
                    ? "课程"
                    : entry.category === "topics"
                      ? "架构"
                      : entry.category === "examples"
                        ? "实验"
                        : entry.category === "patterns"
                          ? "模式"
                          : "规范"}
                </span>
              </div>
              <strong>{entry.path}</strong>
              <pre>
                {entry.lines
                  .slice(Math.max(0, lineIndex - 1), lineIndex + 2)
                  .map((line, i) => (
                    <span className="preview-line" key={i}>
                      <span>{entry.line + Math.max(0, lineIndex - 1) + i}</span>
                      <code>
                        <Highlight text={line} query={query.trim()} />
                      </code>
                    </span>
                  ))}
              </pre>
            </button>
          ))}
        </div>

        {selected && (
          <section className="source-viewer" aria-label="代码预览">
            <header>
              <div>
                <strong>{selected.path.split("/").pop()}</strong>
                <span className="source-viewer-kind">
                  {selected.kind === "file" ? "源码文件" : "文档代码块"}
                </span>
              </div>
              <div className="source-header-actions">
                <button
                  className="ghost-button"
                  onClick={() => handleCopyCode(selected.code)}
                  title="复制代码内容"
                >
                  {copied ? "已复制！" : "复制代码"}
                </button>
                <button
                  className="ghost-button"
                  onClick={() => navigate({ code: undefined, line: undefined })}
                >
                  关闭预览
                </button>
              </div>
            </header>
            <p className="source-path">{selected.path}</p>

            <div className="source-action-links">
              <button
                className="action-pill primary"
                onClick={() => handleRunInLab(selected)}
              >
                在在线 Lab 中运行 ▶
              </button>

              {selected.path.endsWith(".md") &&
                (selected.category === "topics" ||
                  selected.category === "patterns") && (
                  <button
                    className="action-pill"
                    onClick={() =>
                      navigate({ view: "topics", topic: selected.path })
                    }
                  >
                    阅读所在文档 →
                  </button>
                )}
              {selected.path.startsWith("daily/") && (
                <button
                  className="action-pill"
                  onClick={() =>
                    navigate({
                      view: "lesson",
                      day: String(
                        Number(selected.path.match(/day-(\d+)/)?.[1]),
                      ),
                    })
                  }
                >
                  阅读所在课程 →
                </button>
              )}
            </div>

            <pre
              tabIndex={0}
              key={`${selected.id}:${matchLine}`}
              ref={(node) => {
                const active = node?.querySelector<HTMLElement>(".is-match");
                if (node && active)
                  node.scrollTop = Math.max(0, active.offsetTop - 100);
              }}
            >
              {selected.lines.map((line, i) => (
                <span
                  key={i}
                  className={`source-line ${selected.line + i === matchLine ? "is-match" : ""}`}
                >
                  <span>{selected.line + i}</span>
                  <code>
                    <Highlight text={line} query={query.trim()} />
                  </code>
                </span>
              ))}
            </pre>
          </section>
        )}
      </div>

      {results.length > pageSize && (
        <nav className="pagination" aria-label="搜索结果分页">
          <button
            className="ghost-button"
            disabled={page <= 1}
            onClick={() => navigate({ page: String(page - 1) })}
          >
            上一页
          </button>
          <span>
            第 {page} / {totalPages} 页
          </span>
          <button
            className="ghost-button"
            disabled={page >= totalPages}
            onClick={() => navigate({ page: String(page + 1) })}
          >
            下一页
          </button>
        </nav>
      )}
    </div>
  );
}
