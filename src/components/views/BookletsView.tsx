import { useEffect, useMemo, useRef, useState } from "react";
import {
  cBooklet,
  booklets,
  searchBooklet,
  bookletHref,
  type BookletEntry,
} from "../../lib/booklets";
import { navigate, useLocationParams } from "../../lib/navigation";
import { PageHeader } from "../common/PageHeader";
import { Icon } from "../common/Icon";
import { Markdown } from "../Markdown";
import "../../booklets.css";

export function BookletsView() {
  const params = useLocationParams();
  const booklet =
    booklets.find((book) => book.id === params.get("book")) ?? cBooklet;
  const bookletEntries = useMemo(
    () => booklet.sections.flatMap((section) => section.entries),
    [booklet],
  );
  const query = params.get("bq") ?? "";
  const requestedCategory = params.get("category") ?? "all";
  const category = booklet.sections.some(
    (item) => item.id === requestedCategory,
  )
    ? requestedCategory
    : "all";
  const requestedEntry = params.get("entry");
  const [activeSection, setActiveSection] = useState(category);
  const [draft, setDraft] = useState(query);
  const inputRef = useRef<HTMLInputElement>(null);
  const composing = useRef(false);
  useEffect(() => setDraft(query), [query]);
  const matches = useMemo(
    () => searchBooklet(query, booklet),
    [query, booklet],
  );
  const visible = matches;
  const visibleIds = useMemo(
    () => new Set(visible.map((entry) => entry.id)),
    [visible],
  );
  const setQuery = (value: string) => {
    setDraft(value);
    navigate(
      { bq: value || undefined, category: undefined, entry: undefined },
      true,
    );
  };
  const jumpToSection = (value: string) => {
    const heading = document.getElementById(
      value === "all" ? "booklet-top" : `booklet-category-${value}`,
    );
    heading?.scrollIntoView({ block: "start", behavior: "instant" });
    heading?.focus({ preventScroll: true });
  };
  const setCategory = (value: string) => {
    setDraft("");
    composing.current = false;
    navigate({
      category: value === "all" ? undefined : value,
      entry: undefined,
      bq: undefined,
    });
    setActiveSection(value);
    requestAnimationFrame(() => jumpToSection(value));
  };
  useEffect(() => {
    if (query || requestedEntry || category === "all") return;
    const frame = requestAnimationFrame(() => jumpToSection(category));
    return () => cancelAnimationFrame(frame);
  }, [category, query, requestedEntry, booklet]);
  useEffect(() => {
    if (query) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const current = booklet.sections
        .filter((section) => {
          const heading = document.getElementById(
            `booklet-category-${section.id}`,
          );
          return (
            heading &&
            heading.getBoundingClientRect().top <=
              Number.parseFloat(getComputedStyle(heading).scrollMarginTop) + 4
          );
        })
        .at(-1);
      setActiveSection(current?.id ?? "all");
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    const observer = new ResizeObserver(schedule);
    const content = document.querySelector(".booklet-content");
    if (content) observer.observe(content);
    update();
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      observer.disconnect();
    };
  }, [query, booklet]);
  useEffect(() => {
    if (!requestedEntry || !visibleIds.has(requestedEntry)) return;
    const frame = requestAnimationFrame(() => {
      const node = document.getElementById(`booklet-${requestedEntry}`);
      node?.scrollIntoView({ block: "start", behavior: "instant" });
      node?.querySelector<HTMLElement>("h3")?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [requestedEntry, query, category, booklet, visibleIds]);
  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      const node = event.target as HTMLElement | null;
      if (
        event.key !== "/" ||
        event.isComposing ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        node?.closest("input, textarea, select, [contenteditable='true']")
      )
        return;
      event.preventDefault();
      inputRef.current?.focus();
    };
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, []);
  const reset = () => {
    setDraft("");
    composing.current = false;
    navigate({ bq: undefined, category: undefined, entry: undefined }, true);
    inputRef.current?.focus();
  };
  const renderEntry = (entry: BookletEntry) => (
    <article
      key={entry.id}
      id={`booklet-${entry.id}`}
      className="booklet-entry"
    >
      <h3 tabIndex={-1}>
        <a
          href={bookletHref({ entry: entry.id })}
          onClick={(event) => {
            if (
              event.ctrlKey ||
              event.metaKey ||
              event.shiftKey ||
              event.altKey
            )
              return;
            event.preventDefault();
            navigate({ entry: entry.id });
          }}
        >
          {entry.title}
          <Icon id="link" />
        </a>
      </h3>
      {query.trim() && (
        <p className="booklet-entry-category">{entry.categoryTitle}</p>
      )}
      <Markdown sourcePath={`booklets/${booklet.id}.md`}>{entry.body}</Markdown>
    </article>
  );
  return (
    <div className="booklets-page">
      <PageHeader
        title="小册子"
        description="常用语法、标准库与边界提醒。按关键字查找，随用随查。"
      />
      <nav className="booklet-language" aria-label="小册子语言">
        {booklets.map((book) => (
          <a
            key={book.id}
            className="ghost-button"
            href={bookletHref({
              book: book.id,
              bq: undefined,
              category: undefined,
              entry: undefined,
            })}
            aria-current={booklet.id === book.id ? "page" : undefined}
            onClick={(event) => {
              if (
                event.ctrlKey ||
                event.metaKey ||
                event.shiftKey ||
                event.altKey
              )
                return;
              event.preventDefault();
              composing.current = false;
              setDraft("");
              setActiveSection("all");
              navigate({
                book: book.id,
                bq: undefined,
                category: undefined,
                entry: undefined,
              });
              requestAnimationFrame(() => jumpToSection("all"));
            }}
          >
            {book.id === "c" ? "C 语言" : "C++"}
          </a>
        ))}
      </nav>
      <div className="booklet-heading">
        <div>
          <h2 id="booklet-top" tabIndex={-1}>
            {booklet.title}
          </h2>
          <p>
            {booklet.standard} · 中文说明 · {bookletEntries.length} 个速查条目
          </p>
        </div>
        <a
          className="ghost-button booklet-download"
          href={booklet.downloadUrl}
          download={`${booklet.id}-cheatsheet.md`}
          aria-label="下载 Markdown"
        >
          <span className="booklet-download-label">下载 Markdown</span>
          <span className="booklet-download-short">下载</span>{" "}
          <Icon id="right" />
        </a>
      </div>
      {params.get("book") &&
        !booklets.some((book) => book.id === params.get("book")) && (
          <p role="status">未找到指定小册子，已打开 C 语言速查。</p>
        )}
      <form
        className="booklet-search"
        role="search"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          if (!composing.current) setQuery(draft);
        }}
      >
        <label htmlFor="booklet-query">
          快速查找{" "}
          <span>
            按 <kbd>/</kbd> 聚焦
          </span>
        </label>
        <div className="search-clean-box">
          <Icon id="search" />
          <input
            id="booklet-query"
            ref={inputRef}
            type="search"
            autoComplete="off"
            spellCheck={false}
            placeholder={
              booklet.id === "c"
                ? "例如 malloc、字符串、%zu"
                : "例如 unique_ptr、C++20、生命周期"
            }
            value={draft}
            onCompositionStart={() => {
              composing.current = true;
            }}
            onCompositionEnd={(event) => {
              composing.current = false;
              setQuery(event.currentTarget.value);
            }}
            onChange={(event) => {
              setDraft(event.target.value);
              if (!composing.current) setQuery(event.target.value);
            }}
          />
          {draft && (
            <button
              type="button"
              className="search-clean-clear-btn"
              aria-label="清除小册子搜索"
              onClick={() => {
                composing.current = false;
                setQuery("");
                inputRef.current?.focus();
              }}
            >
              <Icon id="close" />
            </button>
          )}
        </div>
        <p className="booklet-search-help">
          匹配标题、关键词和示例；多词用空格分开，优先显示直接匹配。
        </p>
      </form>
      <div className="booklet-quick" aria-label="常用关键字">
        {(booklet.id === "c"
          ? ["printf", "指针", "malloc", "字符串", "%zu"]
          : ["unique_ptr", "string_view", "C++17", "C++20", "生命周期"]
        ).map((term) => (
          <button type="button" key={term} onClick={() => setQuery(term)}>
            {term}
          </button>
        ))}
      </div>
      <div className="booklet-layout">
        <aside className="booklet-directory">
          <nav aria-label="小册子目录">
            {[{ id: "all", title: "册首与搜索" }, ...booklet.sections].map(
              (item) => {
                const count =
                  item.id === "all"
                    ? bookletEntries.length
                    : booklet.sections.find(
                        (section) => section.id === item.id,
                      )!.entries.length;
                return (
                  <a
                    key={item.id}
                    href={bookletHref({
                      category: item.id === "all" ? undefined : item.id,
                      entry: undefined,
                      bq: undefined,
                    })}
                    aria-current={
                      !query && activeSection === item.id
                        ? "location"
                        : undefined
                    }
                    onClick={(event) => {
                      if (
                        event.metaKey ||
                        event.ctrlKey ||
                        event.shiftKey ||
                        event.altKey
                      )
                        return;
                      event.preventDefault();
                      setCategory(item.id);
                    }}
                  >
                    <span>{item.title}</span>
                    <span>{count}</span>
                  </a>
                );
              },
            )}
          </nav>
        </aside>
        <div className="booklet-content">
          <div className="booklet-mobile-category">
            <label htmlFor="booklet-category">章节导航</label>
            <select
              id="booklet-category"
              value={query ? "search" : activeSection}
              onChange={(event) => {
                if (event.target.value !== "search")
                  setCategory(event.target.value);
              }}
            >
              <option value="all">册首与搜索</option>
              {query && (
                <option value="search" disabled>
                  搜索结果
                </option>
              )}
              {booklet.sections.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.title}
                </option>
              ))}
            </select>
          </div>
          <p className="booklet-result-count" role="status">
            {query.trim() ? `“${query.trim()}” · ` : ""}
            {visible.length} 个条目
            {query.trim() ? " · 搜索结果" : " · 全册同页，目录可定位章节"}
          </p>
          {requestedEntry && !visibleIds.has(requestedEntry) && (
            <p className="booklet-notice">
              该条目不存在或未匹配当前搜索。
              <button type="button" onClick={reset}>
                查看全部条目
              </button>
            </p>
          )}
          {!visible.length && (
            <section className="booklet-empty">
              <h2>没有找到匹配条目</h2>
              <p>换一个函数名、中文术语，或清除搜索回到完整小册子。</p>
              <button type="button" className="ghost-button" onClick={reset}>
                清除搜索，查看全册
              </button>
            </section>
          )}
          {query.trim() ? (
            visible.length > 0 ? (
              <section className="booklet-section" aria-label="关键词匹配结果">
                {visible.map(renderEntry)}
              </section>
            ) : null
          ) : (
            booklet.sections.map((section) => {
              const entries = section.entries.filter((entry) =>
                visibleIds.has(entry.id),
              );
              if (!entries.length) return null;
              return (
                <section
                  key={section.id}
                  className="booklet-section"
                  aria-labelledby={`booklet-category-${section.id}`}
                >
                  <h2 id={`booklet-category-${section.id}`} tabIndex={-1}>
                    {section.title}
                  </h2>
                  {entries.map(renderEntry)}
                </section>
              );
            })
          )}
          <footer className="booklet-footer">
            {booklet.id === "cpp" ? (
              <p>
                <a href={booklet.exampleUrl} download="cpp20-reference.cpp">
                  下载 C++20 主机自测源码
                </a>
                。 按条目标注的 ISO C++
                版本查阅。局部片段需包含相应头文件；库支持还取决于工具链。
                <a
                  href="https://en.cppreference.com/w/cpp.html"
                  target="_blank"
                  rel="noreferrer"
                >
                  C++ 语言与标准库参考
                </a>
                。
              </p>
            ) : (
              <>
                <p>
                  <a href={cBooklet.exampleUrl} download="c17-reference.c">
                    下载 C17 自测源码
                  </a>{" "}
                  · 主机编译：
                  <code>gcc -std=c17 c17-reference.c -o c17-check</code>
                  ，再运行生成的程序。
                </p>
                <p>
                  局部示例需放入合适的函数，并包含对应头文件。按 C17 查阅，勿与
                  C++ 或 POSIX 扩展混用。
                </p>
                <p>
                  参考{" "}
                  <a
                    href="https://coddy.tech/cheat-sheets/c"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Coddy C Cheat Sheet
                  </a>{" "}
                  的主题组织，中文说明与示例重新编写。
                  <a
                    href="https://en.cppreference.com/w/c.html"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {" "}
                    C 语言与标准库参考
                  </a>
                  。
                </p>
              </>
            )}
          </footer>
        </div>
      </div>
    </div>
  );
}
