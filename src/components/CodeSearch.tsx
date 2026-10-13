import { useMemo, useRef, useState } from "react";
import { codeEntries, searchCode } from "../lib/search";
import { navigate, useLocationParams } from "../lib/navigation";
import { topics } from "../lib/topics";

function Highlight({ text, query }: { text: string; query: string }) {
  const at = text.toLowerCase().indexOf(query.toLowerCase());
  if (!query || at < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, at)}
      <mark>{text.slice(at, at + query.length)}</mark>
      {text.slice(at + query.length)}
    </>
  );
}
export function CodeSearch() {
  const params = useLocationParams();
  const query = params.get("q") ?? "";
  const kind = ["file", "snippet"].includes(params.get("kind") ?? "")
    ? params.get("kind")!
    : "all";
  const input = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState(query);
  const [previousQuery, setPreviousQuery] = useState(query);
  const composing = useRef(false);
  if (previousQuery !== query) {
    setPreviousQuery(query);
    setDraft(query);
  }
  const results = useMemo(() => searchCode(query, kind), [query, kind]);
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
  return (
    <div>
      <header className="page-header">
        <span className="eyebrow">SOURCE EXPLORER</span>
        <h1>代码搜索</h1>
        <p>
          检索课程、专题中的 C / C++
          代码块与源码文件。支持符号、代码片段和文件路径。
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
        <label htmlFor="code-query">搜索代码</label>
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
      </form>
      <p className="search-summary" role="status">
        {query.trim()
          ? `${results.length} 处匹配 · 第 ${page} / ${Math.max(1, Math.ceil(results.length / 30))} 页`
          : `已索引 ${codeEntries.filter((entry) => entry.kind === "file").length} 个源码文件与 ${codeEntries.filter((entry) => entry.kind === "snippet").length} 个代码块`}
      </p>
      {!query.trim() && (
        <section className="search-empty">
          <h2>从一个符号开始</h2>
          <p>查找同一个概念在每日课程和工程专题中的用法。</p>
          <div className="search-filters">
            {["std::mutex", "async_read", "unique_ptr", "co_await"].map(
              (value) => (
                <button key={value} onClick={() => updateQuery(value)}>
                  {value}
                </button>
              ),
            )}
          </div>
        </section>
      )}
      {query.trim() && !results.length && (
        <section className="search-empty">
          <h2>没有找到匹配代码</h2>
          <p>
            试试更短的符号或文件名，或切换到“全部代码”。搜索不区分大小写，按输入文本匹配。
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
                <span className="result-meta">
                  {entry.kind === "file" ? "源码" : "代码块"} · L
                  {entry.line + lineIndex}
                </span>
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
              <strong>{selected.path.split("/").pop()}</strong>
              <button
                className="ghost-button"
                onClick={() => navigate({ code: undefined, line: undefined })}
              >
                关闭预览
              </button>
            </header>
            <p className="source-path">{selected.path}</p>
            {topics.some((topic) => topic.path === selected.path) && (
              <button
                className="ghost-button"
                onClick={() =>
                  navigate({ view: "topics", topic: selected.path })
                }
              >
                阅读所在文档 →
              </button>
            )}
            {selected.path.startsWith("daily/") && (
              <button
                className="ghost-button"
                onClick={() =>
                  navigate({
                    view: "lesson",
                    day: String(Number(selected.path.match(/day-(\d+)/)?.[1])),
                  })
                }
              >
                阅读所在课程 →
              </button>
            )}
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
