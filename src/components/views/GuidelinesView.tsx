import { useEffect, useRef, useState } from "react";
import { guideline } from "../../lib/course";
import { PageHeader } from "../common/PageHeader";
import { Markdown } from "../Markdown";

export function GuidelinesView() {
  const articleRef = useRef<HTMLElement>(null);
  const indexRef = useRef<HTMLDetailsElement>(null);
  const [headings, setHeadings] = useState<
    { id: string; title: string; level: number }[]
  >([]);
  const [activeId, setActiveId] = useState("");

  useEffect(() => {
    const nodes = Array.from(
      articleRef.current?.querySelectorAll<HTMLHeadingElement>(
        "h2[id], h3[id]",
      ) ?? [],
    );
    setHeadings(
      nodes.map((heading) => ({
        id: heading.id,
        title: heading.textContent ?? "",
        level: heading.tagName === "H3" ? 3 : 2,
      })),
    );
    const updateActive = () => {
      const current =
        [...nodes]
          .reverse()
          .find((node) => node.getBoundingClientRect().top <= 140) ?? nodes[0];
      setActiveId(current?.id ?? "");
    };
    updateActive();
    window.addEventListener("scroll", updateActive, { passive: true });
    return () => window.removeEventListener("scroll", updateActive);
  }, []);

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
        {headings.length > 0 && (
          <aside className="guidelines-aside" aria-label="规范目录与扩展阅读">
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
        )}
        <article ref={articleRef} className="document-card guidelines-document">
          <Markdown embedDocument>{guideline}</Markdown>
        </article>
      </div>
    </div>
  );
}
