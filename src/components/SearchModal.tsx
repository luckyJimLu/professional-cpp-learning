import { useEffect, useMemo, useRef, useState } from "react";
import { codeEntries, searchCode, type CodeEntry } from "../lib/search";
import { navigate, useLocationParams } from "../lib/navigation";

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

export function SearchModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const params = useLocationParams();
  const initialQuery = params.get("q") ?? "";
  const [query, setQuery] = useState(initialQuery);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [page, setPage] = useState(1);
  const inputRef = useRef<HTMLInputElement>(null);
  const composingRef = useRef(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery(params.get("q") ?? "");
      setSelectedIndex(0);
      setPage(1);
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          onClose();
        }
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => {
        clearTimeout(timer);
        window.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [isOpen, params]);

  const results = useMemo(() => {
    const trimmed = query.trim();
    if (!trimmed) return [];
    return searchCode(trimmed, "all");
  }, [query]);

  const pageSize = 30;
  const totalPages = Math.max(1, Math.ceil(results.length / pageSize));
  const currentResults = useMemo(() => {
    return results.slice((page - 1) * pageSize, page * pageSize);
  }, [results, page]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query, page]);

  const handleSelect = (entry: CodeEntry) => {
    onClose();
    if (entry.category === "daily" || entry.path.startsWith("daily/")) {
      const match = entry.path.match(/day-(\d+)/);
      const day = match ? match[1] : "1";
      navigate({ view: "lesson", day });
    } else if (
      entry.category === "topics" ||
      entry.category === "patterns" ||
      entry.path.startsWith("references/") ||
      entry.path.startsWith("frameworks/")
    ) {
      navigate({ view: "topics", topic: entry.path });
    } else if (entry.category === "guidelines") {
      navigate({ view: "guidelines" });
    } else {
      try {
        sessionStorage.setItem("lab_custom_code", entry.code);
        sessionStorage.setItem("lab_custom_title", entry.path);
      } catch {
        // ignore
      }
      navigate({ view: "lab", code: entry.id });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev < currentResults.length - 1 ? prev + 1 : 0,
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev > 0 ? prev - 1 : currentResults.length - 1,
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (currentResults[selectedIndex]) {
        handleSelect(currentResults[selectedIndex].entry);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="search-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-label="全局搜索"
    >
      <div className="search-modal-box">
        <form
          className="search-modal-form"
          role="search"
          noValidate
          onSubmit={(e) => e.preventDefault()}
        >
          <label htmlFor="global-search-input" className="visually-hidden">
            搜索代码
          </label>
          <div className="search-modal-input-wrapper">
            <svg
              className="search-modal-icon"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              id="global-search-input"
              ref={inputRef}
              type="search"
              className="search-modal-input"
              placeholder="Search..."
              value={query}
              autoComplete="off"
              spellCheck={false}
              onCompositionStart={() => {
                composingRef.current = true;
              }}
              onCompositionEnd={(e) => {
                composingRef.current = false;
                setQuery(e.currentTarget.value);
              }}
              onChange={(e) => {
                setQuery(e.target.value);
              }}
              onKeyDown={handleKeyDown}
            />
            {query && (
              <button
                type="button"
                className="search-modal-clear-btn"
                aria-label="清除搜索"
                title="清除搜索"
                onClick={() => {
                  setQuery("");
                  inputRef.current?.focus();
                }}
              >
                <svg
                  width="16"
                  height="16"
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
          <div className="search-modal-empty-state">
            <div className="search-modal-quick-chips">
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
                  className="search-modal-chip"
                  onClick={() => {
                    setQuery(term);
                    inputRef.current?.focus();
                  }}
                >
                  {term}
                </button>
              ))}
            </div>
          </div>
        )}

        {query.trim() && results.length === 0 && (
          <div className="search-modal-empty-state">
            <h2 className="visually-hidden">没有找到匹配代码</h2>
            <p className="search-modal-no-results">
              没有找到与 &quot;{query}&quot; 匹配的内容
            </p>
          </div>
        )}

        {currentResults.length > 0 && (
          <div className="search-modal-results" ref={listRef}>
            {currentResults.map(({ entry, lineIndex }, index) => {
              const line = entry.lines[lineIndex] || "";
              const fileName = entry.path.split("/").pop();
              return (
                <button
                  key={`${entry.id}:${lineIndex}`}
                  type="button"
                  className={`search-result-item search-result ${index === selectedIndex ? "is-selected" : ""}`}
                  onClick={() => handleSelect(entry)}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <div className="search-result-main">
                    <div className="search-result-header">
                      <span className="search-result-badge">
                        {entry.category === "daily"
                          ? "课程"
                          : entry.category === "topics"
                            ? "专题"
                            : entry.category === "examples"
                              ? "实验"
                              : "代码"}
                      </span>
                      <strong className="search-result-title">
                        {fileName}
                      </strong>
                      <span className="search-result-path">
                        L{entry.line + lineIndex} · {entry.path}
                      </span>
                    </div>
                    {line && (
                      <div className="search-result-preview">
                        <code>
                          <Highlight text={line} query={query.trim()} />
                        </code>
                      </div>
                    )}
                  </div>
                  <span className="search-result-action" aria-hidden="true">
                    ↵
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {results.length > pageSize && (
          <div className="search-modal-pagination">
            <button
              type="button"
              className="ghost-button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              上一页
            </button>
            <span className="pagination-text">
              第 {page} / {totalPages} 页
            </span>
            <button
              type="button"
              className="ghost-button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              下一页
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
