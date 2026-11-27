import { useMemo, useRef, type RefObject } from "react";
import { FAQ_DIMENSIONS } from "@/data/courseMetadata";
import { useAsyncContent } from "@/hooks/useAsyncContent";
import { useHeadingScrollSpy } from "@/hooks/useHeadingScrollSpy";
import { fetchContentText, loadContentManifest } from "@/lib/contentRuntime";
import { navigate, useLocationParams } from "@/lib/navigation";
import type { ContentFaqChapter } from "@/types/contentManifest";
import { Markdown } from "../markdown/Markdown";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { NativeSelect } from "@/components/ui/native-select";

const FAQ_EXCLUDED_HEADINGS = ["目录"] as const;
const FRONTMATTER_RE = /^---\r?\n[\s\S]*?\r?\n---\r?\n/;
const LEADING_H1_RE = /^#\s+.+\r?\n+/;

function formatChapterLabel(ch: ContentFaqChapter): string {
  return ch.chapter === 0 ? "核心专题" : `Ch ${String(ch.chapter).padStart(2, "0")}`;
}

export function FaqView() {
  const articleRef = useRef<HTMLElement>(null);
  const params = useLocationParams();
  const requestedChapter = params.get("chapter");

  const {
    data: chapters,
    status: catalogStatus,
    retry: retryCatalog,
  } = useAsyncContent<ContentFaqChapter[]>(
    async () => {
      const manifest = await loadContentManifest();
      return manifest.faq ?? [];
    },
    [],
    [],
  );

  const activeIndex = useMemo(() => {
    if (chapters.length === 0) return -1;
    if (requestedChapter) {
      const found = chapters.findIndex((c) => c.id === requestedChapter);
      if (found >= 0) return found;
    }
    return 0;
  }, [chapters, requestedChapter]);

  const activeChapter = activeIndex >= 0 ? chapters[activeIndex] : undefined;
  const prevChapter = activeIndex > 0 ? chapters[activeIndex - 1] : undefined;
  const nextChapter =
    activeIndex >= 0 && activeIndex + 1 < chapters.length
      ? chapters[activeIndex + 1]
      : undefined;

  const groupedParts = useMemo(() => {
    const groups: { part: string; items: ContentFaqChapter[] }[] = [];
    const byPart = new Map<string, ContentFaqChapter[]>();
    for (const item of chapters) {
      let bucket = byPart.get(item.part);
      if (!bucket) {
        bucket = [];
        byPart.set(item.part, bucket);
        groups.push({ part: item.part, items: bucket });
      }
      bucket.push(item);
    }
    return groups;
  }, [chapters]);

  const totalQuestions = useMemo(
    () => chapters.reduce((acc, item) => acc + item.questionCount, 0),
    [chapters],
  );

  const activePath = activeChapter?.path ?? "";

  const {
    data: chapterBody,
    status: bodyStatus,
    retry: retryBody,
  } = useAsyncContent(
    async () => {
      if (!activePath) return "";
      const raw = await fetchContentText(activePath);
      return raw.replace(FRONTMATTER_RE, "").replace(LEADING_H1_RE, "");
    },
    "",
    [activePath],
    { enabled: Boolean(activePath) },
  );

  const { headings, activeId } = useHeadingScrollSpy({
    containerRef: articleRef,
    selector: "h2[id], h3[id]",
    threshold: 140,
    contentKey: `${activePath}:${chapterBody.length}`,
    excludeTitles: FAQ_EXCLUDED_HEADINGS,
  });

  const selectChapter = (id: string) => {
    navigate({ view: "faq", chapter: id });
    window.scrollTo({ top: 0, behavior: "instant" });
  };

  const isLoading = catalogStatus === "loading" || (Boolean(activePath) && bodyStatus === "loading");
  const hasError = catalogStatus === "error" || bodyStatus === "error";

  return (
    <div className="docs-layout today-layout faq-page">
      <article className="guide-document">
        <header className="guide-title" id="faq-top">
          <h1>C++ 常见问题与核心概念辨析 (FAQ)</h1>
          <p className="guide-lead">
            按《Professional C++, 6th Edition》全书章节拆分的苏格拉底式精读问答
            {chapters.length > 0
              ? `，共 ${chapters.length} 个章节 · ${totalQuestions} 组深度辨析。`
              : "，涵盖底层机制、标准演进对比、代码示例与工程避坑准则。"}
          </p>
        </header>

        {chapters.length > 0 && activeChapter && (
          <div className="faq-chapter-bar" role="navigation" aria-label="FAQ 章节切换">
            <label htmlFor="faq-chapter-select" className="faq-chapter-label">
              切换章节
            </label>
            <NativeSelect
              id="faq-chapter-select"
              value={activeChapter.id}
              onChange={(event) => selectChapter(event.target.value)}
              className="faq-chapter-select"
            >
              {groupedParts.map((group) => (
                <optgroup key={group.part} label={group.part}>
                  {group.items.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.title}（{item.questionCount} 问）
                    </option>
                  ))}
                </optgroup>
              ))}
            </NativeSelect>
            <div className="faq-chapter-step-buttons">
              <button
                type="button"
                className="ghost-button"
                disabled={!prevChapter}
                onClick={() => prevChapter && selectChapter(prevChapter.id)}
              >
                ← 上一章
              </button>
              <button
                type="button"
                className="ghost-button"
                disabled={!nextChapter}
                onClick={() => nextChapter && selectChapter(nextChapter.id)}
              >
                下一章 →
              </button>
            </div>
          </div>
        )}

        {activeChapter && (
          <Card
            asChild
            className="guide-current-lesson faq-summary-card"
            aria-label="当前章节概览"
          >
            <section>
              <div className="guide-current-main">
                <div className="guide-current-top">
                  <span className="page-eyebrow">{activeChapter.part}</span>
                  <Badge variant="outline" className="guide-current-badge mono font-normal">
                    {formatChapterLabel(activeChapter)} · {activeChapter.questionCount} 问
                    {activeChapter.stats?.minutes
                      ? ` · 约 ${activeChapter.stats.minutes} 分钟`
                      : ""}
                  </Badge>
                </div>
                <h2>{activeChapter.title}</h2>
                {activeChapter.summary && (
                  <p className="guide-current-meta">{activeChapter.summary}</p>
                )}
              </div>
            </section>
          </Card>
        )}

        <div ref={articleRef as RefObject<HTMLDivElement>} className="document-card faq-document">
          {isLoading ? (
            <p className="product-loading" role="status">
              正在加载常见问题…
            </p>
          ) : hasError ? (
            <div className="topic-notice" role="alert">
              <p>常见问题加载失败，请检查网络后重试。</p>
              <button
                type="button"
                className="ghost-button"
                onClick={() => {
                  if (catalogStatus === "error") retryCatalog();
                  else retryBody();
                }}
              >
                重新加载
              </button>
            </div>
          ) : (
            <Markdown sourcePath={activePath}>
              {chapterBody}
            </Markdown>
          )}
        </div>

        {(prevChapter || nextChapter) && (
          <nav className="faq-chapter-footer" aria-label="相邻章节导航">
            {prevChapter ? (
              <button
                type="button"
                className="faq-chapter-footer-btn"
                onClick={() => selectChapter(prevChapter.id)}
              >
                <small>← 上一章</small>
                <strong>{prevChapter.title}</strong>
              </button>
            ) : (
              <span />
            )}
            {nextChapter && (
              <button
                type="button"
                className="faq-chapter-footer-btn is-next"
                onClick={() => selectChapter(nextChapter.id)}
              >
                <small>下一章 →</small>
                <strong>{nextChapter.title}</strong>
              </button>
            )}
          </nav>
        )}
      </article>

      <aside className="today-aside" aria-label="FAQ 目录与章节导航">
        {headings.length > 0 && (
          <div className="today-aside-card">
            <span className="page-eyebrow">本页目录</span>
            <nav aria-label="FAQ 章节小节导航" className="today-aside-nav">
              {headings.map((heading) => (
                <a
                  key={heading.id}
                  href={`#${heading.id}`}
                  className={heading.level === 3 ? "is-sub-heading" : ""}
                  aria-current={activeId === heading.id ? "location" : undefined}
                >
                  {heading.title}
                </a>
              ))}
            </nav>
          </div>
        )}

        {chapters.length > 0 && (
          <div className="today-aside-card">
            <span className="page-eyebrow">全书章节 ({chapters.length})</span>
            <nav aria-label="FAQ 全书章节目录" className="today-aside-nav faq-aside-chapters">
              {chapters.map((item) => (
                <a
                  key={item.id}
                  href={`?view=faq&chapter=${item.id}`}
                  aria-current={activeChapter?.id === item.id ? "page" : undefined}
                  onClick={(event) => {
                    event.preventDefault();
                    selectChapter(item.id);
                  }}
                >
                  <span className="faq-aside-ch-tag mono">{formatChapterLabel(item)}</span>{" "}
                  {item.title.replace(/^(第\s*\d+\s*章|核心专题)\s*·\s*/, "")}
                </a>
              ))}
            </nav>
          </div>
        )}

        {activeChapter?.id === "modifiers" && (
          <div className="today-aside-card">
            <span className="page-eyebrow">四大作用维度</span>
            <dl className="today-aside-stats">
              {FAQ_DIMENSIONS.map((dim) => (
                <div key={dim.label}>
                  <dt>{dim.label}</dt>
                  <dd>{dim.keywords}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </aside>
    </div>
  );
}
