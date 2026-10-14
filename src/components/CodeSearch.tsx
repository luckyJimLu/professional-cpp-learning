import { useEffect, useMemo, useRef, useState } from "react";
import {
  codeEntries,
  searchCode,
  getCategoryCounts,
  totalFileCount,
  totalSnippetCount,
  type SearchOptions,
} from "../lib/search";
import { navigate, useLocationParams } from "../lib/navigation";

function Highlight({
  text,
  query,
  caseSensitive = false,
  useRegex = false,
}: {
  text: string;
  query: string;
  caseSensitive?: boolean;
  useRegex?: boolean;
}) {
  const trimmed = query.trim();
  if (!trimmed) return <>{text}</>;

  if (useRegex) {
    try {
      const regex = new RegExp(`(${trimmed})`, caseSensitive ? "g" : "gi");
      const parts = text.split(regex);
      if (parts.length <= 1) return <>{text}</>;
      return (
        <>
          {parts.map((part, index) =>
            regex.test(part) ? <mark key={index}>{part}</mark> : part,
          )}
        </>
      );
    } catch {
      // fallback
    }
  }

  const at = caseSensitive
    ? text.indexOf(trimmed)
    : text.toLowerCase().indexOf(trimmed.toLowerCase());
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
  const kind = ["file", "snippet"].includes(params.get("kind") ?? "")
    ? params.get("kind")!
    : "all";
  const category = params.get("cat") ?? "all";
  const caseSensitive = params.get("case") === "1";
  const useRegex = params.get("re") === "1";
  const wholeWord = params.get("word") === "1";

  const input = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState(query);
  const [previousQuery, setPreviousQuery] = useState(query);
  const [copied, setCopied] = useState(false);
  const composing = useRef(false);

  useEffect(() => {
    input.current?.focus();
  }, []);

  if (previousQuery !== query) {
    setPreviousQuery(query);
    setDraft(query);
  }

  const searchOptions: SearchOptions = useMemo(
    () => ({
      caseSensitive,
      useRegex,
      wholeWord,
      category,
    }),
    [caseSensitive, useRegex, wholeWord, category],
  );

  const results = useMemo(
    () => searchCode(query, kind, searchOptions),
    [query, kind, searchOptions],
  );

  const categoryCounts = useMemo(
    () =>
      getCategoryCounts(query, kind, {
        caseSensitive,
        useRegex,
        wholeWord,
      }),
    [query, kind, caseSensitive, useRegex, wholeWord],
  );

  const page = Math.min(
    Math.max(1, Math.floor(Number(params.get("page"))) || 1),
    Math.max(1, Math.ceil(results.length / 30)),
  );

  const selected = codeEntries.find((entry) => entry.id === params.get("code"));
  const matchLine = Number(params.get("line")) || selected?.line || 1;

  const updateQuery = (value: string) =>
    navigate(
      {
        q: value || undefined,
        page: undefined,
        code: undefined,
        line: undefined,
      },
      true,
    );

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
    // Store selected code in sessionStorage so Lab view can load it
    try {
      sessionStorage.setItem("lab_custom_code", entry.code);
      sessionStorage.setItem("lab_custom_title", entry.path);
    } catch {
      // ignore
    }
    navigate({ view: "lab", code: entry.id });
  };

  return (
    <div>
      <header className="page-header search-header-compact">
        <h1>代码搜索</h1>
        <p>
          检索课程与工程专题中的 C/C++ 代码及文件
        </p>
      </header>

      <form
        className="search-form"
        role="search"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          if (!composing.current) updateQuery(draft);
        }}
      >
        <label htmlFor="code-query" className="visually-hidden">
          搜索代码
        </label>
        <div className="search-input-row">
          <input
            id="code-query"
            ref={input}
            autoFocus
            type="search"
            value={draft}
            placeholder="例如 std::mutex、async_read、unique_ptr"
            autoComplete="off"
            spellCheck={false}
            onCompositionStart={() => {
              composing.current = true;
            }}
            onCompositionEnd={(event) => {
              composing.current = false;
              updateQuery(event.currentTarget.value);
            }}
            onChange={(event) => {
              setDraft(event.target.value);
              if (!composing.current) updateQuery(event.target.value);
            }}
          />
          {draft && (
            <button
              type="button"
              className="ghost-button"
              aria-label="清除搜索"
              onClick={() => {
                setDraft("");
                updateQuery("");
                input.current?.focus();
              }}
            >
              清除
            </button>
          )}
          <button className="primary-button" type="submit">
            搜索
          </button>
        </div>

        <div className="search-filter-controls">
          <div className="search-filters" aria-label="代码类型">
            {[
              ["all", "全部代码"],
              ["file", "源码文件"],
              ["snippet", "文档代码块"],
            ].map(([value, label]) => (
              <button
                type="button"
                key={value}
                aria-pressed={kind === value}
                onClick={() =>
                  navigate({ kind: value, page: undefined, code: undefined })
                }
              >
                {label}
              </button>
            ))}
          </div>

          <div className="search-options" aria-label="搜索选项">
            <button
              type="button"
              className={`option-chip ${caseSensitive ? "is-active" : ""}`}
              aria-pressed={caseSensitive}
              title="大小写敏感 (Case Sensitive)"
              onClick={() =>
                navigate({
                  case: caseSensitive ? undefined : "1",
                  page: undefined,
                })
              }
            >
              <span className="mono">Aa</span> 大小写敏感
            </button>
            <button
              type="button"
              className={`option-chip ${useRegex ? "is-active" : ""}`}
              aria-pressed={useRegex}
              title="正则表达式模式 (Regex)"
              onClick={() =>
                navigate({
                  re: useRegex ? undefined : "1",
                  page: undefined,
                })
              }
            >
              <span className="mono">.*</span> 正则
            </button>
            <button
              type="button"
              className={`option-chip ${wholeWord ? "is-active" : ""}`}
              aria-pressed={wholeWord}
              title="全词匹配 (Whole Word)"
              onClick={() =>
                navigate({
                  word: wholeWord ? undefined : "1",
                  page: undefined,
                })
              }
            >
              <span className="mono">\b</span> 全词
            </button>
          </div>
        </div>

        <div className="search-category-tabs" aria-label="按内容领域过滤">
          {[
            ["all", "全部", categoryCounts.all],
            ["daily", "每日课程", categoryCounts.daily],
            ["topics", "工程架构", categoryCounts.topics],
            ["examples", "实验例程", categoryCounts.examples],
            ["patterns", "设计模式", categoryCounts.patterns],
          ].map(([catValue, label, count]) => (
            <button
              type="button"
              key={String(catValue)}
              className={`category-tab ${category === catValue ? "is-active" : ""}`}
              onClick={() =>
                navigate({
                  cat: catValue === "all" ? undefined : String(catValue),
                  page: undefined,
                  code: undefined,
                })
              }
            >
              <span>{label}</span>
              <span className="category-count">{Number(count || 0)}</span>
            </button>
          ))}
        </div>
      </form>

      <p className="search-summary" role="status">
        {query.trim()
          ? `${results.length} 处匹配 · 第 ${page} / ${Math.max(1, Math.ceil(results.length / 30))} 页`
          : `已索引 ${totalFileCount} 个源码文件与 ${totalSnippetCount} 个代码块`}
      </p>

      {!query.trim() && (
        <section className="search-empty">
          <h2>从一个符号开始</h2>
          <p>查找同一个概念在每日课程和工程专题中的用法。</p>
          <div className="search-filters">
            {[
              "std::mutex",
              "async_read",
              "unique_ptr",
              "co_await",
              "constexpr",
              "string_view",
              "enum class",
              "RingBuffer",
            ].map((value) => (
              <button key={value} onClick={() => updateQuery(value)}>
                {value}
              </button>
            ))}
          </div>
        </section>
      )}

      {query.trim() && !results.length && (
        <section className="search-empty">
          <h2>没有找到匹配代码</h2>
          <p>
            试试更短的符号或文件名，或切换到“全部代码”或重置选项。搜索支持普通文本与正则表达式匹配。
          </p>
        </section>
      )}

      <div className={`search-layout ${selected ? "has-selection" : ""}`}>
        <div className="search-results">
          {results
            .slice((page - 1) * 30, page * 30)
            .map(({ entry, lineIndex }) => (
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
                        <span>
                          {entry.line + Math.max(0, lineIndex - 1) + i}
                        </span>
                        <code>
                          <Highlight
                            text={line}
                            query={query.trim()}
                            caseSensitive={caseSensitive}
                            useRegex={useRegex}
                          />
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
                    <Highlight
                      text={line}
                      query={query.trim()}
                      caseSensitive={caseSensitive}
                      useRegex={useRegex}
                    />
                  </code>
                </span>
              ))}
            </pre>
          </section>
        )}
      </div>

      {results.length > 30 && (
        <nav className="pagination" aria-label="搜索结果分页">
          <button
            className="ghost-button"
            disabled={page <= 1}
            onClick={() => navigate({ page: String(page - 1) })}
          >
            上一页
          </button>
          <span>
            {page} / {Math.ceil(results.length / 30)}
          </span>
          <button
            className="ghost-button"
            disabled={page * 30 >= results.length}
            onClick={() => navigate({ page: String(page + 1) })}
          >
            下一页
          </button>
        </nav>
      )}
    </div>
  );
}
