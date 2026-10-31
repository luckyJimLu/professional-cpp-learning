import { useEffect, useMemo, useRef, useState } from "react";
import {
  cBooklet,
  booklets,
  searchBooklet,
  bookletHref,
  type BookletEntry,
} from "../../lib/booklets";
import { navigate, useLocationParams } from "../../lib/navigation";
import { Icon } from "../common/Icon";
import { Markdown } from "../Markdown";
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
  const [searchScope, setSearchScope] = useState<"all" | "c" | "cpp">("all");
  const [isScrolled, setIsScrolled] = useState(false);
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
    if (!query.trim()) setSearchScope("all");
  }, [query, booklet]);
  const allMatches = useMemo(() => {
    if (!query.trim()) return [];
    return searchBooklet(query);
  }, [query]);
  const cMatchesCount = useMemo(
    () => allMatches.filter((entry) => entry.bookId === "c").length,
    [allMatches],
  );
  const cppMatchesCount = useMemo(
    () => allMatches.filter((entry) => entry.bookId === "cpp").length,
    [allMatches],
  );
  const matches = useMemo(() => {
    if (!query.trim()) return booklet.sections.flatMap((s) => s.entries);
    if (searchScope === "all") return allMatches;
    return allMatches.filter((entry) => entry.bookId === searchScope);
  }, [query, booklet, allMatches, searchScope]);
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
    setIsScrolled(value !== "all" || window.scrollY > 120);
  };
  const setCategory = (value: string) => {
    setDraft("");
    setSearchScope("all");
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
    let frame = 0;
    const update = () => {
      frame = 0;
      setIsScrolled(window.scrollY > 120);
      if (query.trim()) return;
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
    setSearchScope("all");
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
  const showReturnButton =
    isScrolled ||
    Boolean(query.trim()) ||
    Boolean(requestedEntry) ||
    activeSection !== "all";
  return (
    <div className="booklets-page">
      <div className="booklet-heading mb-3 flex items-center justify-between gap-3">
        <h1
          id="booklet-top"
          tabIndex={-1}
          className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 m-0"
        >
          {booklet.title}
        </h1>
        <div
          className="booklet-language inline-flex items-center rounded-lg border border-slate-200 bg-slate-100/90 p-1 shrink-0"
          role="group"
          aria-label="小册子语言"
        >
          {booklets.map((book) => {
            const active = book.id === booklet.id;
            return (
              <button
                key={book.id}
                type="button"
                aria-pressed={active}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  active
                    ? "bg-white text-blue-600 shadow-2xs ring-1 ring-slate-200/60"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                onClick={() => {
                  if (active) return;
                  composing.current = false;
                  setDraft("");
                  setSearchScope("all");
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
              </button>
            );
          })}
        </div>
      </div>
      {params.get("book") &&
        !booklets.some((book) => book.id === params.get("book")) && (
          <p role="status">未找到指定小册子，已打开 C 语言速查。</p>
        )}
      <div
        className="booklet-toolbar mb-4 flex items-center gap-3"
        ref={toolbarRef}
      >
        <form
          className="booklet-search relative flex-1 w-full min-w-0 m-0"
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
              className="absolute left-3.5 text-slate-400 pointer-events-none size-4"
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
              placeholder="搜索 C / C++ 小册子…"
              className={`w-full h-11 min-h-[44px] rounded-xl border border-slate-200/90 bg-slate-50/90 hover:bg-slate-100/60 focus:bg-white pl-10 ${
                draft ? "pr-24" : "pr-12"
              } py-1.5 text-sm text-slate-800 transition-colors focus:border-blue-500 focus:outline-hidden focus:ring-3 focus:ring-blue-500/15 [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden`}
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
            {!draft ? (
              <kbd
                aria-hidden="true"
                className="pointer-events-none absolute right-3.5 select-none rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[11px] font-medium text-slate-400 shadow-2xs"
              >
                /
              </kbd>
            ) : (
              <>
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute right-11 select-none rounded-md bg-slate-200/70 px-2 py-0.5 text-xs font-medium text-slate-600 tabular-nums"
                >
                  {visible.length} 条
                </span>
                <button
                  type="button"
                  style={{
                    width: 44,
                    height: 44,
                    minWidth: 44,
                    minHeight: 44,
                  }}
                  className="search-clean-clear-btn absolute right-0 top-0 text-slate-400 hover:text-slate-600 inline-flex items-center justify-center cursor-pointer"
                  aria-label="清除小册子搜索"
                  onClick={reset}
                >
                  <Icon id="close" />
                </button>
              </>
            )}
          </div>
        </form>
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
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <p
                className="booklet-result-count m-0"
                role="status"
                ref={resultsRef}
                tabIndex={-1}
              >
                “{query.trim()}” · {visible.length} 个结果
              </p>
              <div
                className="booklet-scope-filters inline-flex flex-wrap items-center gap-1.5"
                role="group"
                aria-label="搜索范围筛选"
              >
                {(
                  [
                    { id: "all", label: "全部", count: allMatches.length },
                    { id: "c", label: "C", count: cMatchesCount },
                    { id: "cpp", label: "C++", count: cppMatchesCount },
                  ] as const
                ).map((scope) => {
                  const active = searchScope === scope.id;
                  return (
                    <button
                      key={scope.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setSearchScope(scope.id)}
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition cursor-pointer ${
                        active
                          ? "bg-blue-600 text-white shadow-2xs"
                          : "border border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-600"
                      }`}
                    >
                      <span>{scope.label}</span>
                      <span
                        className={`rounded-full px-1.5 py-0.2 text-[11px] tabular-nums ${
                          active
                            ? "bg-blue-500/40 text-white"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {scope.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
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
      {showReturnButton && (
        <button
          type="button"
          className="ghost-button booklet-return fixed bottom-6 right-6 z-30 inline-flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-slate-200 bg-white/95 text-slate-700 shadow-lg backdrop-blur-xs hover:bg-slate-50 hover:text-blue-600 transition cursor-pointer"
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
            } else {
              setCategory("all");
              setIsScrolled(false);
            }
          }}
        >
          <Icon id="up" />
        </button>
      )}
    </div>
  );
}
