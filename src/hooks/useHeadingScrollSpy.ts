import { useCallback, useEffect, useState, type RefObject } from "react";

export interface DocHeading {
  id: string;
  title: string;
  level: number;
}

/**
 * 与 Markdown 标题渲染保持一致的锚点 slug 规则
 */
export function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}_\s-]/gu, "")
    .replace(/\s/g, "-");
}

/**
 * 从原始 Markdown 文本中提取标题清单（跳过围栏代码块，支持重复标题计数后缀）
 */
export function extractMarkdownHeadings(
  markdown: string,
  minLevel = 2,
  maxLevel = 3,
): DocHeading[] {
  if (!markdown) return [];
  const headings: DocHeading[] = [];
  const counts = new Map<string, number>();
  let fence: string | null = null;

  for (const rawLine of markdown.split(/\r?\n/)) {
    const fenceMatch = rawLine.match(/^\s*(`{3,}|~{3,})/);
    if (fenceMatch) {
      const marker = fenceMatch[1][0];
      if (!fence) fence = marker;
      else if (fence === marker) fence = null;
      continue;
    }
    if (fence) continue;

    const match = rawLine.match(/^(#{1,6})\s+(.+?)\s*#*$/);
    if (!match) continue;
    const level = match[1].length;
    if (level < minLevel || level > maxLevel) continue;

    const title = match[2].replace(/`([^`]*)`/g, "$1").trim();
    const base = slugifyHeading(title);
    if (!base) continue;
    const seen = counts.get(base) ?? 0;
    counts.set(base, seen + 1);
    const id = seen === 0 ? base : `${base}-${seen}`;
    headings.push({ id, title, level });
  }

  return headings;
}

export interface UseHeadingScrollSpyOptions {
  /** 包含已渲染标题 DOM 的容器引用 */
  containerRef: RefObject<HTMLElement | null>;
  /** 用于查询标题元素的 CSS 选择器，默认 h2[id], h3[id] */
  selector?: string;
  /** 判定当前激活章节的视口顶部阈值（px），默认 140 */
  threshold?: number;
  /** 触发重新提取标题 DOM 的依赖键（如正文文本或路由 key） */
  contentKey?: unknown;
  /** 需要排除的标题文本列表（如“目录”） */
  excludeTitles?: readonly string[];
}

/**
 * 提取容器内渲染后的标题并监听窗口滚动高亮当前章节
 */
export function useHeadingScrollSpy({
  containerRef,
  selector = "h2[id], h3[id]",
  threshold = 140,
  contentKey,
  excludeTitles = [],
}: UseHeadingScrollSpyOptions) {
  const [headings, setHeadings] = useState<DocHeading[]>([]);
  const [activeId, setActiveId] = useState("");
  const excludeSignature = excludeTitles.join("\u0000");

  useEffect(() => {
    const excluded = new Set(
      excludeSignature ? excludeSignature.split("\u0000") : [],
    );
    const nodes = Array.from(
      containerRef.current?.querySelectorAll<HTMLHeadingElement>(selector) ?? [],
    ).filter((heading) => !excluded.has(heading.textContent?.trim() ?? ""));

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
          .find((node) => node.getBoundingClientRect().top <= threshold) ??
        nodes[0];
      setActiveId(current?.id ?? "");
    };

    updateActive();
    window.addEventListener("scroll", updateActive, { passive: true });
    return () => window.removeEventListener("scroll", updateActive);
  }, [containerRef, selector, threshold, contentKey, excludeSignature]);

  const scrollToHeading = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
      block: "start",
    });
  }, []);

  return { headings, activeId, scrollToHeading };
}
