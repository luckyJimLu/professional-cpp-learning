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
import { NativeSelect } from "@/components/ui/native-select";
import "../../booklets.css";

export function BookletsView() {
  const params = useLocationParams();
  const booklet =
    booklets.find((book) => book.id === params.get("book")) ?? cBooklet;
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
  const toolbarRef = useRef<HTMLDivElement>(null);
  const directoryRef = useRef<HTMLElement>(null);
  const resultsRef = useRef<HTMLParagraphElement>(null);
  const topicSections = booklet.sections.filter(
    (section) => !section.id.startsWith("cpp-"),
  );
  const standardSections = booklet.sections.filter((section) =>
    section.id.startsWith("cpp-"),
  );
  useEffect(() => {
    const toolbar = toolbarRef.current;
    const page = toolbar?.closest<HTMLElement>(".booklets-page");
    if (!toolbar || !page) return;
    const update = () =>
      page.style.setProperty(
        "--booklet-toolbar-height",
        `${toolbar.getBoundingClientRect().height}px`,
      );
    const observer = new ResizeObserver(update);
    observer.observe(toolbar);
    update();
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (requestedEntry) return;
    const frame = requestAnimationFrame(() => {
      if (query.trim())
        resultsRef.current?.scrollIntoView({
          block: "start",
          behavior: "instant",
        });
    });
    return () => cancelAnimationFrame(frame);
  }, [query, booklet, requestedEntry]);
  useEffect(() => {
    const directory = directoryRef.current;
    const current = directory?.querySelector<HTMLElement>(
      '[aria-current="location"]',
    );
    if (!directory || !current || query.trim()) return;
    const container = directory.getBoundingClientRect();
    const item = current.getBoundingClientRect();
    if (item.top < container.top)
      directory.scrollTop += item.top - container.top;
    else if (item.bottom > container.bottom)
      directory.scrollTop += item.bottom - container.bottom;
  }, [activeSection, booklet, query]);
  useEffect(() => {
    composing.current = false;
    setDraft(query);
  }, [query, booklet]);
  const matches = useMemo(() => {
    if (!query.trim()) return booklet.sections.flatMap((s) => s.entries);
    return searchBooklet(query);
  }, [query, booklet]);
  const visible = matches;
  const visibleIds = useMemo(
    () => new Set(visible.map((entry) => entry.id)),
    [visible],
  );
  const setQuery = (value: string) => {
    setDraft(value);
    setActiveSection("all");
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
    if (query.trim() || requestedEntry || category === "all") return;
    const frame = requestAnimationFrame(() => jumpToSection(category));
    return () => cancelAnimationFrame(frame);
  }, [category, query, requestedEntry, booklet]);
  useEffect(() => {
    if (query.trim()) return;
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
    setActiveSection("all");
    navigate({ bq: undefined, category: undefined, entry: undefined }, true);
    inputRef.current?.focus({ preventScroll: true });
    requestAnimationFrame(() =>
      resultsRef.current?.scrollIntoView({
        block: "start",
        behavior: "instant",
      }),
    );
  };
  const entryTitle = (entry: BookletEntry) => {
    const parts = entry.title.match(/^(.*?)\s+\[(C\+\+[^\]]+)\]$/);
    return parts ? (
      <>
        <span>{parts[1]}</span>{" "}
        <span className="booklet-standard rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600 ring-1 ring-blue-500/20">
          {parts[2]}
        </span>
      </>
    ) : (
      <>
        <span>{entry.title}</span>
        {query.trim() && entry.bookId === "c" && (
          <span className="ml-2 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 ring-1 ring-slate-400/20">
            C17
          </span>
        )}
      </>
    );
  };
  const renderEntry = (entry: BookletEntry) => {
    const entryBookId = entry.bookId ?? booklet.id;
    const elementId =
      entry.bookId && entry.bookId !== booklet.id
        ? `booklet-${entry.bookId}-${entry.id}`
        : `booklet-${entry.id}`;
    return (
      <article
        key={`${entryBookId}-${entry.id}`}
        id={elementId}
        className="booklet-entry mb-6 rounded-xl border border-slate-200 bg-white p-5 sm:p-6 shadow-2xs"
      >
        <h3 tabIndex={-1} className="text-lg font-bold text-slate-900 mb-2">
          <a
            href={bookletHref({ book: entryBookId, entry: entry.id })}
            className="inline-flex items-center gap-2 hover:text-blue-600 transition"
            onClick={(event) => {
              if (
                event.ctrlKey ||
                event.metaKey ||
                event.shiftKey ||
                event.altKey
              )
                return;
              event.preventDefault();
              navigate({ book: entryBookId, entry: entry.id });
            }}
          >
            {entryTitle(entry)}
            <Icon id="link" className="size-4 text-slate-400" />
          </a>
        </h3>
        {query.trim() && (
          <p className="booklet-entry-category text-xs text-slate-500 mb-3 font-medium">
            {entry.bookTitle ? `${entry.bookTitle} · ` : ""}{entry.categoryTitle}
          </p>
        )}
        <Markdown sourcePath={`booklets/${entryBookId}.md`}>{entry.body}</Markdown>
      </article>
    );
  };
  return (
    <div className="booklets-page">
      <PageHeader title="小册子" />
      <div className="booklet-heading mb-4 flex items-center justify-between gap-3">
        <h2 id="booklet-top" tabIndex={-1} className="text-xl font-bold text-slate-900">
          {booklet.title}
        </h2>
        <div className="booklet-language shrink-0">
          <label htmlFor="booklet-language" className="sr-only">
            小册子语言
          </label>
          <NativeSelect
            id="booklet-language"
            className="w-28 h-9 text-xs rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-slate-700 shadow-2xs focus:border-blue-500 focus:outline-hidden"
            value={booklet.id}
            onChange={(event) => {
              composing.current = false;
              setDraft("");
              setActiveSection("all");
              navigate({
                book: event.target.value,
                bq: undefined,
                category: undefined,
                entry: undefined,
              });
              requestAnimationFrame(() => jumpToSection("all"));
            }}
          >
            {booklets.map((book) => (
              <option key={book.id} value={book.id}>
                {book.id === "c" ? "C 语言" : "C++"}
              </option>
            ))}
          </NativeSelect>
        </div>
      </div>
      {params.get("book") &&
        !booklets.some((book) => book.id === params.get("book")) && (
          <p role="status">未找到指定小册子，已打开 C 语言速查。</p>
        )}
      <div
        className="booklet-toolbar mb-4 flex flex-wrap items-center gap-3"
        ref={toolbarRef}
      >
        <form
          className="booklet-search relative flex-1 min-w-0 max-w-xl m-0"
          role="search"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            if (!composing.current) {
              setQuery(draft);
              requestAnimationFrame(() => {
                resultsRef.current?.scrollIntoView({
                  block: "start",
                  behavior: "instant",
                });
                resultsRef.current?.focus({ preventScroll: true });
              });
            }
          }}
        >
          <label htmlFor="booklet-query" className="sr-only">
            快速查找 按 <kbd>/</kbd> 聚焦
          </label>
          <div className="relative flex items-center min-h-[44px]">
            <Icon
              id="search"
              className="absolute left-3 text-slate-400 pointer-events-none size-4"
            />
            <input
              id="booklet-query"
              ref={inputRef}
              type="search"
              autoComplete="off"
              spellCheck={false}
              onKeyDown={(event) => {
                if (event.key === "Escape" && !composing.current) {
                  event.preventDefault();
                  reset();
                }
              }}
              placeholder="搜索全部小册子（按 / 聚焦）..."
              className="w-full h-11 min-h-[44px] rounded-lg border border-slate-200 bg-white pl-9 pr-11 py-1.5 text-sm text-slate-800 shadow-2xs focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
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
                style={{ width: 44, height: 44, minWidth: 44, minHeight: 44 }}
                className="search-clean-clear-btn absolute right-0 top-0 text-slate-400 hover:text-slate-600 inline-flex items-center justify-center"
                aria-label="清除小册子搜索"
                onClick={reset}
              >
                <Icon id="close" />
              </button>
            )}
          </div>
        </form>
        <button
          type="button"
          className="ghost-button booklet-return ml-auto inline-flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-2xs hover:bg-slate-50 transition"
          aria-label={query.trim() ? "返回搜索结果" : "返回顶部"}
          title={query.trim() ? "返回搜索结果" : "返回顶部"}
          onClick={() => {
            if (query.trim()) {
              navigate({ entry: undefined }, true);
              resultsRef.current?.scrollIntoView({
                block: "start",
                behavior: "instant",
              });
              resultsRef.current?.focus({ preventScroll: true });
            } else setCategory("all");
          }}
        >
          <Icon id="up" />
        </button>
      </div>
      <div className="booklet-layout">
        <aside className="booklet-directory" ref={directoryRef}>
          <h2 className="booklet-directory-title">目录</h2>
          <nav aria-label="小册子目录">
            {[
              { id: "all", title: "全部内容" },
              ...topicSections,
              ...standardSections,
            ].map((item) => (
              <div key={item.id}>
                {standardSections.length > 0 &&
                  item.id === topicSections[0]?.id && (
                    <p className="booklet-directory-group">按主题</p>
                  )}
                {standardSections.length > 0 &&
                  item.id === standardSections[0]?.id && (
                    <p className="booklet-directory-group">按标准</p>
                  )}
                <a
                  href={bookletHref({
                    category: item.id === "all" ? undefined : item.id,
                    entry: undefined,
                    bq: undefined,
                  })}
                  aria-current={
                    !query.trim() && activeSection === item.id
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
                  {item.title}
                </a>
              </div>
            ))}
          </nav>
        </aside>
        <div className="booklet-content">
          {query.trim() && (
            <p
              className="booklet-result-count"
              role="status"
              ref={resultsRef}
              tabIndex={-1}
            >
              “{query.trim()}” · {visible.length} 个结果
            </p>
          )}
          {query.trim() && visible.length > 1 && (
            <nav
              className="booklet-search-index mb-6 rounded-xl border border-slate-200/80 bg-slate-50/60 p-3 shadow-2xs"
              aria-label="搜索结果索引"
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                  跳到匹配条目 ({visible.length})
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {visible.map((entry) => {
                  const entryBookId = entry.bookId ?? booklet.id;
                  return (
                    <a
                      key={`${entryBookId}-${entry.id}`}
                      href={bookletHref({ book: entryBookId, entry: entry.id })}
                      className="group inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs shadow-2xs transition hover:border-blue-300 hover:bg-blue-50/40"
                      onClick={(event) => {
                        if (
                          event.ctrlKey ||
                          event.metaKey ||
                          event.shiftKey ||
                          event.altKey
                        )
                          return;
                        event.preventDefault();
                        navigate({ book: entryBookId, entry: entry.id });
                      }}
                    >
                      <span className="font-medium text-slate-800 group-hover:text-blue-600">
                        {entry.title}
                      </span>
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">
                        {entry.bookTitle ? `${entry.bookTitle} · ` : ""}{entry.categoryTitle}
                      </span>
                    </a>
                  );
                })}
              </div>
            </nav>
          )}
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
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <button type="button" className="ghost-button" onClick={reset}>
                  清除搜索，查看全册
                </button>
              </div>
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
        </div>
      </div>
    </div>
  );
}
