import { useEffect, useRef } from "react";
import { useAsyncContent } from "../../hooks/useAsyncContent";
import { useHeadingScrollSpy } from "../../hooks/useHeadingScrollSpy";
import { loadGuideline } from "../../lib/course";
import { PageHeader } from "../common/PageHeader";
import { Markdown } from "../markdown/Markdown";

export function GuidelinesView() {
  const articleRef = useRef<HTMLElement>(null);
  const indexRef = useRef<HTMLDetailsElement>(null);
  const {
    data: guideline,
    status,
    retry,
  } = useAsyncContent(loadGuideline, "", []);

  const { headings, activeId } = useHeadingScrollSpy({
    containerRef: articleRef,
    selector: "h2[id], h3[id]",
    threshold: 140,
    contentKey: guideline,
  });

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1100px)");
    const syncOpen = () => {
      if (indexRef.current) indexRef.current.open = desktop.matches;
    };
    syncOpen();
    desktop.addEventListener("change", syncOpen);
    return () => desktop.removeEventListener("change", syncOpen);
  }, [headings.length]);

  return (
    <div className="reading-page guidelines-page">
      <PageHeader
        title="编码规范"
        description="复习类型安全、资源管理与嵌入式开发中的编码规范，结合评审清单与每日实验落地。"
      />
      <div className="guidelines-layout">
        <aside className="guidelines-aside" aria-label="规范目录与扩展阅读">
          {headings.length > 0 && (
            <details ref={indexRef} className="reading-index">
              <summary>
                <span>查找规范章节</span>
                <span className="reading-index-count">
                  {headings.length} 节 ▾
                </span>
              </summary>
              <nav aria-label="规范章节">
                {headings.map((heading) => (
                  <a
                    key={heading.id}
                    href={`#${heading.id}`}
                    className={heading.level === 3 ? "is-sub-heading" : ""}
                    aria-current={
                      activeId === heading.id ? "location" : undefined
                    }
                    onClick={() => {
                      if (
                        indexRef.current &&
                        !window.matchMedia("(min-width: 1100px)").matches
                      ) {
                        indexRef.current.open = false;
                      }
                    }}
                  >
                    {heading.title}
                  </a>
                ))}
              </nav>
            </details>
          )}
          <div className="guidelines-related-card">
            <span className="page-eyebrow">配套资源</span>
            <a href="?view=topics&topic=guidelines/review-rubric.md">
              <strong>五项评审与规则案例 →</strong>
              <span>对照反例、推荐写法与例外条件</span>
            </a>
            <a href="?view=topics&topic=docs/content-map.md">
              <strong>课程与规范对照索引 →</strong>
              <span>按规则定位对应课程与可运行实验</span>
            </a>
          </div>
        </aside>
        <article ref={articleRef} className="document-card guidelines-document">
          {status === "loading" ? (
            <p className="product-loading" role="status">
              正在加载编码规范…
            </p>
          ) : status === "error" ? (
            <div className="topic-notice" role="alert">
              <p>编码规范加载失败，请检查网络后重试。</p>
              <button
                type="button"
                className="ghost-button"
                onClick={retry}
              >
                重新加载
              </button>
            </div>
          ) : (
            <Markdown embedDocument>{guideline}</Markdown>
          )}
        </article>
      </div>
    </div>
  );
}
