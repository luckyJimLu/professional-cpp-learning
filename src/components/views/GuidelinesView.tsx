import { useEffect, useRef, useState } from "react";
import { guideline } from "../../lib/course";
import { PageHeader } from "../common/PageHeader";
import { Markdown } from "../Markdown";

export function GuidelinesView() {
  const articleRef = useRef<HTMLElement>(null);
  const [headings, setHeadings] = useState<{ id: string; title: string }[]>([]);
  useEffect(() => {
    setHeadings(
      Array.from(
        articleRef.current?.querySelectorAll("h2[id], h3[id]") ?? [],
      ).map((heading) => ({
        id: heading.id,
        title: heading.textContent ?? "",
      })),
    );
  }, []);
  return (
    <div className="reading-page guidelines-page">
      <PageHeader
        eyebrow="工程规范 · Embedded C++"
        title="编码规范"
        description="复习类型安全、资源管理与嵌入式开发中的编码规范。"
      />
      {headings.length > 0 && (
        <details className="reading-index">
          <summary>查找规范章节 · {headings.length} 节</summary>
          <nav aria-label="规范章节">
            {headings.map((heading) => (
              <a key={heading.id} href={`#${heading.id}`}>
                {heading.title}
              </a>
            ))}
          </nav>
        </details>
      )}
      <article ref={articleRef} className="document-card">
        <Markdown embedDocument>{guideline}</Markdown>
      </article>
    </div>
  );
}
