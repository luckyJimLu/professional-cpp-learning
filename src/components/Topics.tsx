import { useState, useEffect } from "react";
import { topics, referenceBooks, resolveTopicLink } from "../lib/topics";
import { navigate, useLocationParams } from "../lib/navigation";
import { Markdown } from "./Markdown";

export function Topics() {
  const params = useLocationParams();
  const selected =
    topics.find((topic) => topic.path === params.get("topic")) ??
    topics.find((topic) => topic.path === "patterns/README.md") ??
    topics[0];
  const locale = selected?.locale ?? "zh";
  const groups = [...new Set(topics.map((topic) => topic.group))];
  const [activeCategory, setActiveCategory] = useState<string>(
    selected?.group ?? groups[0],
  );

  useEffect(() => {
    if (selected?.group && activeCategory !== "books") {
      setActiveCategory(selected.group);
    }
  }, [selected?.path]);

  const select = (path: string) => navigate({ view: "topics", topic: path });
  const alternate =
    topics.find(
      (topic) =>
        topic.path ===
        selected?.path.replace(
          /(?:\.(?:en|zh))?\.md$/,
          locale === "en" ? ".zh.md" : ".en.md",
        ),
    ) ??
    topics.find(
      (topic) =>
        locale === "en" &&
        topic.path === selected?.path.replace(/\.en\.md$/, ".md"),
    );

  return (
    <div className="topics-page-view">
      <header className="page-header topics-page-header">
        <h1>专题知识库</h1>
        <p>从语言机制到系统工程。阅读原理，对照示例，回到实践。</p>
      </header>

      {/* 顶部轻量级分类导航条 (Top Filter Bar) */}
      <div className="topics-top-filter-bar">
        <div className="topics-category-scroll">
          <div
            className="topics-category-row"
            role="tablist"
            aria-label="专题分类"
          >
            {groups.map((group) => {
              const count = topics.filter(
                (topic) => topic.group === group && topic.locale === locale,
              ).length;
              const isActive = activeCategory === group;
              return (
                <button
                  key={group}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  className={`topics-cat-pill ${isActive ? "is-active" : ""}`}
                  onClick={() => setActiveCategory(group)}
                >
                  <span className="cat-name">{group}</span>
                  <span className="cat-count">({count})</span>
                </button>
              );
            })}
            <button
              type="button"
              role="tab"
              aria-selected={activeCategory === "books"}
              className={`topics-cat-pill ${activeCategory === "books" ? "is-active" : ""}`}
              onClick={() =>
                setActiveCategory(
                  activeCategory === "books"
                    ? (selected?.group ?? groups[0])
                    : "books",
                )
              }
            >
              <span className="cat-name">参考书籍 · PDF</span>
              <span className="cat-count">({referenceBooks.length})</span>
            </button>
          </div>
        </div>

        {/* 展开的对应分类文章列表 */}
        <div className="topics-articles-shelf" aria-label="文章列表">
          {activeCategory === "books" ? (
            <div className="topics-books-list">
              {referenceBooks.map(([path, url]) => (
                <a
                  className="book-pill-link"
                  href={url}
                  key={path}
                  target="_blank"
                  rel="noreferrer"
                >
                  <span>📖 {path.split("/").pop()}</span>
                  <span className="ext-icon" aria-hidden="true">
                    ↗
                  </span>
                </a>
              ))}
            </div>
          ) : (
            <div className="topics-articles-list">
              {topics
                .filter(
                  (topic) =>
                    topic.group === activeCategory && topic.locale === locale,
                )
                .map((topic) => {
                  const isCurrent = selected?.path === topic.path;
                  return (
                    <button
                      key={topic.path}
                      type="button"
                      className={`topic-article-chip ${isCurrent ? "is-active" : ""}`}
                      aria-current={isCurrent ? "page" : undefined}
                      onClick={() => select(topic.path)}
                    >
                      {topic.title}
                    </button>
                  );
                })}
            </div>
          )}
        </div>
      </div>

      {/* 正文全宽居中阅读区域 (max-width: 820px; margin: 0 auto;) */}
      {selected && (
        <article
          className="document-card topic-document-centered"
          key={selected.path}
        >
          <div className="document-toolbar">
            <span className="topic-group-tag">{selected.group}</span>
            {alternate && (
              <button
                className="ghost-button"
                onClick={() => select(alternate.path)}
              >
                {locale === "zh" ? "Read in English" : "阅读中文版"}
              </button>
            )}
          </div>
          <Markdown
            sourcePath={selected.path}
            resolveHref={(href) => {
              const target =
                href.startsWith("#") && !href.startsWith("#/chapter/")
                  ? undefined
                  : resolveTopicLink(selected.path, href);
              if (!target)
                return href.startsWith("#/chapter/")
                  ? `https://luckyJimLu.github.io/system-design-notes/${href}`
                  : href;
              const url = new URL(window.location.href);
              url.searchParams.set("view", "topics");
              url.searchParams.set("topic", target.path);
              url.hash = "";
              return url.href;
            }}
            onNavigate={(href) => {
              if (href.startsWith("#") && !href.startsWith("#/chapter/"))
                return false;
              const target = resolveTopicLink(selected.path, href);
              if (!target) return false;
              select(target.path);
              return true;
            }}
          >
            {selected.body}
          </Markdown>
          <footer className="source-path">来源：{selected.path}</footer>
        </article>
      )}
    </div>
  );
}
