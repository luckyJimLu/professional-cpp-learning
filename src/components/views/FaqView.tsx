import { useEffect, useRef, useState } from "react";
import faqRaw from "../../../docs/faq.md?raw";
import { Markdown } from "../Markdown";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

const faqBody = faqRaw
  .replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "")
  .replace(/^[\s\S]*?(?=^## Q1:)/m, "");

export function FaqView() {
  const articleRef = useRef<HTMLElement>(null);
  const [headings, setHeadings] = useState<
    { id: string; title: string; level: number }[]
  >([]);
  const [activeId, setActiveId] = useState("");

  useEffect(() => {
    const nodes = Array.from(
      articleRef.current?.querySelectorAll<HTMLHeadingElement>(
        "h2[id], h3[id]",
      ) ?? [],
    ).filter((h) => h.textContent?.trim() !== "目录");
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

  return (
    <div className="docs-layout today-layout faq-page">
      <article className="guide-document">
        <header className="guide-title" id="faq-top">
          <h1>C++ 常见问题与核心概念辨析 (FAQ)</h1>
          <p className="guide-lead">
            汇总现代 C++ 学习、工程重构与代码评审中的高频疑难问题，涵盖底层机制、标准演进对比、代码示例与工程避坑准则。
          </p>
        </header>

        <Card
          asChild
          className="guide-current-lesson faq-summary-card"
          aria-label="核心主题速览"
        >
          <section>
            <div className="guide-current-main">
              <div className="guide-current-top">
                <span className="page-eyebrow">高频专题 Q1 · 语言机制全景</span>
                <Badge variant="outline" className="guide-current-badge mono font-normal">
                  6 大分类 · 4 大作用维度 · C++11–C++23
                </Badge>
              </div>
              <h2>
                C++ 修饰符（说明符 Specifiers、限定符 Qualifiers 与属性 Attributes）深度辨析
              </h2>
              <p className="guide-current-meta">
                从访问权限、常量与编译期求值、存储期与链接性、成员函数约束、C++20 模块化到标准属性，系统梳理核心区别与工程选型。
              </p>
            </div>
          </section>
        </Card>

        <div ref={articleRef as React.RefObject<HTMLDivElement>} className="document-card faq-document">
          <Markdown embedDocument>{faqBody}</Markdown>
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
            <div>
              <dt>权限与边界维度</dt>
              <dd>public / protected / private / export</dd>
            </div>
            <div>
              <dt>求值与只读维度</dt>
              <dd>const / mutable / constexpr / consteval</dd>
            </div>
            <div>
              <dt>实例与调用约束</dt>
              <dd>&amp; / &amp;&amp; / explicit / noexcept / virtual</dd>
            </div>
            <div>
              <dt>链接与编译器指导</dt>
              <dd>static / extern / inline / [[...]]</dd>
            </div>
          </dl>
        </div>
      </aside>
    </div>
  );
}
