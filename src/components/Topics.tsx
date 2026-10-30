import { useEffect, useRef, useState } from "react";
import {
  topics,
  referenceBooks,
  referenceGuides,
  topicSeries,
  topicSummary,
  seriesTopics,
  type Topic,
} from "../lib/topics";
import { navigate, useLocationParams } from "../lib/navigation";
import { Markdown } from "./Markdown";
import {
  resolveContentHref,
  resolveContentNavigation,
} from "../lib/contentNavigation";

const kLastRead = "professional-cpp:topic:last-read";
const positionKey = (path: string) => `professional-cpp:topic:position:${path}`;
function readSaved(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function save(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* Reading works without browser storage. */
  }
}
function topicUrl(path?: string, category?: string) {
  const url = new URL(window.location.href);
  url.searchParams.set("view", "topics");
  if (path) url.searchParams.set("topic", path);
  else url.searchParams.delete("topic");
  if (category) url.searchParams.set("topicCategory", category);
  else url.searchParams.delete("topicCategory");
  url.hash = "";
  return url.href;
}

export function Topics() {
  const params = useLocationParams();
  const path = params.get("topic");
  const selected = topics.find((topic) => topic.path === path);
  const groupNames = [
    ...new Set(
      topics
        .filter((topic) => topic.locale === "zh" && topic.group !== "参考书导读")
        .map((topic) => topic.group),
    ),
  ];
  const rawCategory = params.get("topicCategory") ?? "all";
  const requestedCategory = rawCategory === "参考书导读" ? "books" : rawCategory;
  const category = ["all", "books", ...groupNames].includes(requestedCategory)
    ? requestedCategory
    : "all";
  const lastRead = topics.find((topic) => topic.path === readSaved(kLastRead));
  const changeCategory = (value: string) =>
    navigate({
      view: "topics",
      topic: undefined,
      topicCategory: value === "all" ? undefined : value,
    });
  const select = (value: string) => navigate({ view: "topics", topic: value });

  if (selected)
    return (
      <TopicReader key={selected.path} selected={selected} onSelect={select} />
    );

  const visible = topics.filter(
    (topic) =>
      topic.locale === "zh" &&
      topic.group !== "参考书导读" &&
      (category === "all" || topic.group === category),
  );
  const collections = [...new Set(visible.map(topicSeries))].map((title) => {
    const first = visible.find((topic) => topicSeries(topic) === title)!;
    return { title, articles: seriesTopics(first) };
  });
  return (
    <div className="topics-page-view topics-catalog">
      <header className="page-header topics-page-header">
        <h1>专题知识库</h1>
        <p className="page-description">
          先选一个专题，沿着目录深入。随时回到上次阅读的位置。
        </p>
      </header>
      {path && (
        <p className="topic-notice" role="status">
          这篇文章暂未收录，请从下面的专题目录继续浏览。
        </p>
      )}
      <div className="topics-catalog-controls">
        <label htmlFor="topic-category">浏览领域</label>
        <select
          id="topic-category"
          value={category}
          onChange={(event) => changeCategory(event.target.value)}
        >
          <option value="all">全部领域</option>
          {groupNames.map((group) => (
            <option key={group} value={group}>
              {group}
            </option>
          ))}
          <option value="books">参考书籍</option>
        </select>
        <span className="topic-result-count" aria-live="polite">
          {category === "books"
            ? `${referenceGuides.length} 篇导读 · ${referenceBooks.length} 本 PDF`
            : `${collections.length} 个专题 · ${visible.length} 篇文章`}
        </span>
      </div>
      {lastRead && category !== "books" && (
        <a
          className="topic-continue"
          href={topicUrl(
            lastRead.path,
            category === "all" ? undefined : category,
          )}
        >
          <span>
            <small>继续上次阅读</small>
            <strong>{lastRead.title}</strong>
          </span>
          <span aria-hidden="true">继续阅读 →</span>
        </a>
      )}
      {category === "books" ? (
        <section aria-label="参考书籍" className="topic-books">
          <header className="reference-section-heading">
            <h2>按路线选书</h2>
            <p>先明确学习目标，再沿阶段阅读与实践。</p>
          </header>
          <div className="reference-guide-grid">
            {referenceGuides.map((guide) => (
              <a href={topicUrl(guide.path, "books")} key={guide.path}>
                <h3>{guide.title}</h3>
                <p>{topicSummary(guide)}</p>
                <span>阅读路线与书目 →</span>
              </a>
            ))}
          </div>
          <header className="reference-section-heading">
            <h2>PDF 资料库</h2>
            <p>直接打开原书文件，在新标签页阅读。</p>
          </header>
          <div className="reference-pdf-grid">
            {referenceBooks.length ? (
              referenceBooks.map(([file, url]) => (
                <a href={url} key={file} target="_blank" rel="noreferrer">
                  {file.split("/").pop()}
                  <span>打开 PDF ↗</span>
                </a>
              ))
            ) : (
              <p>暂无 PDF，可先阅读书单导读。</p>
            )}
          </div>
        </section>
      ) : (
        <div className="topic-collections">
          {collections.map(({ title, articles }) => (
            <section
              className="topic-collection"
              key={title}
              data-domain={articles[0].group}
            >
              <h2>
                <a
                  href={topicUrl(
                    articles[0].path,
                    category === "all" ? undefined : category,
                  )}
                >
                  <span>{title}</span>
                  <span className="topic-card-arrow" aria-hidden="true">
                    →
                  </span>
                </a>
              </h2>
              <div className="topic-collection-meta">
                <span className="topic-domain-badge">{articles[0].group}</span>
                <span className="topic-count-badge">{articles.length} 篇</span>
              </div>
              <p>{topicSummary(articles[0])}</p>
              <details className="topic-collection-directory">
                <summary>
                  <span>查看文章目录</span>
                  <span className="topic-dir-toggle" aria-hidden="true">
                    {articles.length} 篇 ▾
                  </span>
                </summary>
                <nav aria-label={`${title}文章目录`}>
                  {articles.map((topic) => (
                    <a
                      key={topic.path}
                      href={topicUrl(
                        topic.path,
                        category === "all" ? undefined : category,
                      )}
                    >
                      {topic.title}
                      <span aria-hidden="true">→</span>
                    </a>
                  ))}
                </nav>
              </details>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function TopicReader({
  selected,
  onSelect,
}: {
  selected: Topic;
  onSelect: (path: string) => void;
}) {
  const articleRef = useRef<HTMLElement>(null);
  const directoryRef = useRef<HTMLDetailsElement>(null);
  const tocRef = useRef<HTMLDetailsElement>(null);
  const [headings, setHeadings] = useState<{ id: string; text: string }[]>([]);
  const [activeHeading, setActiveHeading] = useState("");
  const articles = seriesTopics(selected);
  const index = articles.findIndex((topic) => topic.path === selected.path);
  const previous = articles[index - 1];
  const next = articles[index + 1];
  const alternate =
    topics.find(
      (topic) =>
        topic.path ===
        selected.path.replace(
          /(?:\.(?:en|zh))?\.md$/,
          selected.locale === "en" ? ".zh.md" : ".en.md",
        ),
    ) ??
    topics.find(
      (topic) =>
        selected.locale === "en" &&
        topic.path === selected.path.replace(/\.en\.md$/, ".md"),
    );

  useEffect(() => {
    save(kLastRead, selected.path);
    const nodes = [
      ...(articleRef.current?.querySelectorAll<HTMLHeadingElement>(
        ".markdown h2[id]",
      ) ?? []),
    ];
    setHeadings(
      nodes.map((node) => ({ id: node.id, text: node.textContent ?? "" })),
    );
    let y = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const update = () => {
      y = window.scrollY;
      const current =
        [...nodes]
          .reverse()
          .find((node) => node.getBoundingClientRect().top <= 155) ?? nodes[0];
      setActiveHeading(current?.id ?? "");
      clearTimeout(timer);
      timer = setTimeout(
        () => save(positionKey(selected.path), String(y)),
        200,
      );
    };
    const savedY = Number(readSaved(positionKey(selected.path)) ?? 0);
    const frame = requestAnimationFrame(() => {
      if (!window.location.hash && Number.isFinite(savedY) && savedY > 0)
        window.scrollTo({ top: savedY, behavior: "instant" });
      update();
    });
    window.addEventListener("scroll", update, { passive: true });
    const persist = () => save(positionKey(selected.path), String(y));
    window.addEventListener("pagehide", persist);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
      window.removeEventListener("scroll", update);
      window.removeEventListener("pagehide", persist);
      persist();
    };
  }, [selected.path]);

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1100px)");
    const update = () => {
      if (directoryRef.current) directoryRef.current.open = desktop.matches;
      if (tocRef.current) tocRef.current.open = desktop.matches;
    };
    update();
    desktop.addEventListener("change", update);
    return () => desktop.removeEventListener("change", update);
  }, [headings.length]);

  const select = (path: string) => {
    save(positionKey(selected.path), String(window.scrollY));
    if (directoryRef.current) directoryRef.current.open = false;
    onSelect(path);
  };
  return (
    <div className="topics-page-view topic-reading">
      <nav aria-label="专题路径" className="topic-breadcrumb">
        <a href={topicUrl()}>专题知识库</a>
        <span aria-hidden="true">/</span>
        <a
          href={topicUrl(
            undefined,
            selected.group === "参考书导读" ? "books" : selected.group,
          )}
        >
          {selected.group}
        </a>
        {topicSeries(selected) !== selected.group && (
          <>
            <span aria-hidden="true">/</span>
            <span>{topicSeries(selected)}</span>
          </>
        )}
        <span aria-hidden="true">/</span>
        <span className="topic-breadcrumb-current" aria-current="page">
          {selected.title}
        </span>
      </nav>
      <div className="topic-reader-layout">
        <aside className="topic-reader-tools" aria-label="阅读导航">
          <details ref={directoryRef} className="topic-reader-directory">
            <summary>
              专题目录{" "}
              <span>
                {index + 1} / {articles.length}
              </span>
            </summary>
            <nav aria-label="专题文章目录">
              {articles.map((topic) => (
                <a
                  href={topicUrl(topic.path)}
                  key={topic.path}
                  aria-current={
                    topic.path === selected.path ? "page" : undefined
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
                    select(topic.path);
                  }}
                >
                  {topic.title}
                </a>
              ))}
            </nav>
          </details>
          {headings.length > 0 && (
            <details ref={tocRef} className="topic-reader-toc">
              <summary>
                本文目录 <span>{headings.length} 节</span>
              </summary>
              <nav aria-label="本文目录">
                {headings.map((heading, i) => (
                  <a
                    key={`${heading.id}-${i}`}
                    href={`#${heading.id}`}
                    aria-current={
                      activeHeading === heading.id ? "location" : undefined
                    }
                    onClick={() => {
                      if (
                        tocRef.current &&
                        !window.matchMedia("(min-width: 1100px)").matches
                      )
                        tocRef.current.open = false;
                    }}
                  >
                    {heading.text}
                  </a>
                ))}
              </nav>
            </details>
          )}
          {alternate && (
            <a className="topic-language" href={topicUrl(alternate.path)}>
              {selected.locale === "zh" ? "Read in English" : "阅读中文版"}
            </a>
          )}
        </aside>
        <div className="topic-reader-main">
          <article
            className="document-card topic-document-centered"
            ref={articleRef}
          >
            <Markdown
              normalizeDocumentHeadings
              sourcePath={selected.path}
              resolveHref={(href) => resolveContentHref(selected.path, href)}
              onNavigate={(href) => {
                const target = resolveContentNavigation(selected.path, href);
                if (!target) return false;
                navigate(target);
                return true;
              }}
            >
              {selected.body}
            </Markdown>
            <footer className="source-path">来源：{selected.path}</footer>
          </article>
          <nav className="topic-adjacent" aria-label="相邻文章">
            {previous ? (
              <a href={topicUrl(previous.path)}>
                <small>← 上一篇</small>
                <span>{previous.title}</span>
              </a>
            ) : (
              <a
                href={topicUrl(
                  undefined,
                  selected.group === "参考书导读" ? "books" : selected.group,
                )}
              >
                返回专题列表
              </a>
            )}
            {next && (
              <a href={topicUrl(next.path)}>
                <small>下一篇 →</small>
                <span>{next.title}</span>
              </a>
            )}
          </nav>
        </div>
      </div>
    </div>
  );
}
