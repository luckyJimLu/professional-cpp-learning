import { useRef, type RefObject } from "react";
import {
  FAQ_DIMENSIONS,
  FAQ_HIGHLIGHT_CARDS,
} from "@/data/courseMetadata";
import { useAsyncContent } from "@/hooks/useAsyncContent";
import { useHeadingScrollSpy } from "@/hooks/useHeadingScrollSpy";
import { fetchContentText } from "@/lib/contentRuntime";
import { Markdown } from "../markdown/Markdown";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

const FAQ_PATH = "docs/faq.md";
const FAQ_EXCLUDED_HEADINGS = ["目录"] as const;

export function FaqView() {
  const articleRef = useRef<HTMLElement>(null);
  const {
    data: topicText,
    status,
    retry,
  } = useAsyncContent(
    async () => {
      const raw = await fetchContentText(FAQ_PATH);
      return raw
        .replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "")
        .replace(/^[\s\S]*?(?=^## Q1:)/m, "");
    },
    "",
    [],
  );

  const { headings, activeId } = useHeadingScrollSpy({
    containerRef: articleRef,
    selector: "h2[id], h3[id]",
    threshold: 140,
    contentKey: topicText,
    excludeTitles: FAQ_EXCLUDED_HEADINGS,
  });

  return (
    <div className="docs-layout today-layout faq-page">
      <article className="guide-document">
        <header className="guide-title" id="faq-top">
          <h1>C++ 常见问题与核心概念辨析 (FAQ)</h1>
          <p className="guide-lead">
            汇总现代 C++ 学习、工程重构与代码评审中的高频疑难问题，涵盖底层机制、标准演进对比、代码示例与工程避坑准则。
          </p>
        </header>

        {FAQ_HIGHLIGHT_CARDS.map((card) => (
          <Card
            key={card.id}
            asChild
            className="guide-current-lesson faq-summary-card"
            aria-label="核心主题速览"
          >
            <section>
              <div className="guide-current-main">
                <div className="guide-current-top">
                  <span className="page-eyebrow">{card.eyebrow}</span>
                  <Badge variant="outline" className="guide-current-badge mono font-normal">
                    {card.badge}
                  </Badge>
                </div>
                <h2>{card.title}</h2>
                <p className="guide-current-meta">{card.summary}</p>
              </div>
            </section>
          </Card>
        ))}

        <div ref={articleRef as RefObject<HTMLDivElement>} className="document-card faq-document">
          {status === "loading" ? (
            <p className="product-loading" role="status">
              正在加载常见问题…
            </p>
          ) : status === "error" ? (
            <div className="topic-notice" role="alert">
              <p>常见问题加载失败，请检查网络后重试。</p>
              <button
                type="button"
                className="ghost-button"
                onClick={retry}
              >
                重新加载
              </button>
            </div>
          ) : (
            <Markdown embedDocument>{topicText}</Markdown>
          )}
        </div>
      </article>

      <aside className="today-aside" aria-label="FAQ 目录与维度速览">
        {headings.length > 0 && (
          <div className="today-aside-card">
            <span className="page-eyebrow">本页目录</span>
            <nav aria-label="FAQ 章节导航" className="today-aside-nav">
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
      </aside>
    </div>
  );
}
