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
        {parts[1]} <span className="booklet-standard">{parts[2]}</span>
      </>
    ) : (
      entry.title
    );
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
          {entryTitle(entry)}
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
      <PageHeader title="小册子" />
      <div className="booklet-heading">
        <h2 id="booklet-top" tabIndex={-1}>
          {booklet.title}
        </h2>
      </div>
      {params.get("book") &&
        !booklets.some((book) => book.id === params.get("book")) && (
          <p role="status">未找到指定小册子，已打开 C 语言速查。</p>
        )}
      <div className="booklet-toolbar" ref={toolbarRef}>
        <div className="booklet-language">
          <label htmlFor="booklet-language">小册子语言</label>
          <NativeSelect
            id="booklet-language"
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
        <form
          className="booklet-search"
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
              onKeyDown={(event) => {
                if (event.key === "Escape" && !composing.current) {
                  event.preventDefault();
                  reset();
                }
              }}
              placeholder="搜索当前小册子"
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
                onClick={reset}
              >
                <Icon id="close" />
              </button>
            )}
          </div>
        </form>
        <div className="booklet-mobile-category">
          <label htmlFor="booklet-category">章节导航</label>
          <NativeSelect
            id="booklet-category"
            value={query.trim() ? "search" : activeSection}
            onChange={(event) => {
              if (event.target.value !== "search")
                setCategory(event.target.value);
            }}
          >
            <option value="all">全部内容</option>
            {query.trim() && (
              <option value="search" disabled>
                搜索结果
              </option>
            )}
            {standardSections.length ? (
              <>
                <optgroup label="按主题">
                  {topicSections.map((section) => (
                    <option key={section.id} value={section.id}>
                      {section.title}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="按标准">
                  {standardSections.map((section) => (
                    <option key={section.id} value={section.id}>
                      {section.title}
                    </option>
                  ))}
                </optgroup>
              </>
            ) : (
              booklet.sections.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.title}
                </option>
              ))
            )}
          </NativeSelect>
        </div>
        <button
          type="button"
          className="ghost-button booklet-return"
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
            <nav className="booklet-search-index" aria-label="搜索结果索引">
              <p>跳到匹配条目</p>
              <ul>
                {visible.map((entry) => (
                  <li key={entry.id}>
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
                      <span>{entry.title}</span>
                      <small>{entry.categoryTitle}</small>
                      <Icon id="right" />
                    </a>
                  </li>
                ))}
              </ul>
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
        </div>
      </div>
    </div>
  );
}
