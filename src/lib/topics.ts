import { resolveContentPath } from "./contentAssets";
import { contentUrl, fetchContentText, loadContentManifest } from "./contentRuntime";
import { useSyncExternalStore } from "react";
import type { ContentTopic } from "@/types/contentManifest";

export interface Topic {
  path: string;
  title: string;
  id?: string;
  locale: string;
  group: string;
  summary?: string;
  body: string;
  raw: string;
}

export function topicGroup(path: string) {
  if (path.includes("references/reading-paths/")) return "参考书导读";
  if (path.startsWith("topics/")) return "专题精读";
  if (/C\+\+ Concurrency/.test(path)) return "C++ 并发编程";
  if (/Boost[. ]Asio|frameworks\/asio/.test(path)) return "网络与异步";
  if (/embedded-systems|frameworks\/(trace32|openharmony)/.test(path))
    return "嵌入式系统";
  if (/patterns|Cpp System/.test(path)) return "设计模式";
  return "框架与阅读指南";
}

export const topics: Topic[] = [];

const FRONTMATTER_RE = /^---\r?\n[\s\S]*?\r?\n---\r?\n/;

let hydrating: Promise<void> | null = null;
let isTopicsReady = false;
const readyListeners = new Set<() => void>();
let rawInflight = new Map<string, Promise<string>>();

export function useTopicsReady(): boolean {
  return useSyncExternalStore(
    (listener) => {
      readyListeners.add(listener);
      return () => readyListeners.delete(listener);
    },
    () => isTopicsReady,
  );
}

export function hydrateTopics(): Promise<void> {
  if (!hydrating) hydrating = (async () => {
    const manifest = await loadContentManifest();
    for (const entry of manifest.topics) {
      topics.push({
        path: entry.path,
        title: entry.title || entry.path.split("/").pop()!,
        id: (entry as ContentTopic & { id?: string }).id,
        locale: entry.locale,
        // topics/<domain>/<slug>/ 的来源分类即知识领域，直接作为分组名；
        // 其余路径沿用原有规则，保持既有目录结构不变。
        group:
          entry.path.startsWith("topics/") && entry.category !== "专题"
            ? entry.category
            : topicGroup(entry.path),
        summary: entry.summary || undefined,
        body: "",
        raw: "",
      });
    }
    topics.sort((a, b) => a.path.localeCompare(b.path, "zh-CN", { numeric: true }));
    isTopicsReady = true;
    for (const listener of readyListeners) listener();
  })();
  return hydrating;
}

export async function fetchTopicText(topic: Topic): Promise<string> {
  if (topic.raw) return topic.body;
  let pending = rawInflight.get(topic.path);
  if (!pending) {
    pending = fetchContentText(topic.path);
    rawInflight.set(topic.path, pending);
  }
  try {
    const raw = await pending;
    topic.raw = raw;
    topic.body = raw.replace(FRONTMATTER_RE, "");
  } finally {
    rawInflight.delete(topic.path);
  }
  return topic.body;
}

export function resolveTopicLink(currentPath: string, href: string) {
  if (href.startsWith("#/chapter/")) {
    const id = href.slice(10).replace(/^content-/, "");
    const locale = currentPath.endsWith(".en.md") ? "en" : "zh";
    return topics.find((topic) => topic.id === id && topic.locale === locale);
  }
  const path = resolveContentPath(currentPath, href);
  return topics.find(
    (topic) =>
      topic.path === path ||
      topic.path === `${path?.replace(/\/$/, "")}/README.md`,
  );
}

export function topicSeries(topic: Topic) {
  const path = topic.path;
  if (path.startsWith("frameworks/openharmony/")) return "OpenHarmony 轻量系统";
  if (path.startsWith("frameworks/trace32/"))
    return "TRACE32 · RTOS 稳定性分析";
  if (/Boost[. ]Asio|frameworks\/asio/.test(path)) return "Asio · 网络与异步";
  if (/patterns|Cpp System/.test(path)) return "C++ 设计模式";
  if (path.startsWith("docs/") && path !== "docs/mermaid.md")
    return "学习路线与实验手册";
  return topic.group;
}

export function topicSummary(topic: Topic) {
  const paragraph = topic.body
    .replace(/```[\s\S]*?```/g, "")
    .split(/\n\s*\n/)
    .map((text) => text.replace(/^>\s?/gm, "").trim())
    .find(
      (text) =>
        text &&
        !/^[#|<!\-]/.test(text) &&
        !/^\d+\./.test(text) &&
        !/不复制原始规范全文/.test(text),
    );
  const text = (topic.summary ?? paragraph ?? "阅读原理、接口与工程实践。")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[*_`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return text.match(/^.*?[。！？]/)?.[0]?.trim() ?? text;
}

export function seriesTopics(topic: Topic) {
  return topics
    .filter(
      (item) =>
        item.locale === topic.locale &&
        topicSeries(item) === topicSeries(topic),
    )
    .sort(
      (a, b) =>
        Number(b.path === "docs/content-map.md") -
          Number(a.path === "docs/content-map.md") ||
        Number(b.path.endsWith("/README.md")) -
          Number(a.path.endsWith("/README.md")) ||
        a.path.localeCompare(b.path, "zh-CN", { numeric: true }),
    );
}

export function referenceGuides() {
  return topics.filter(
    (topic) =>
      topic.path.startsWith("references/reading-paths/") &&
      topic.locale === "zh",
  );
}

let referenceBooksCache: Array<{ path: string; url: string }> = [];

export function referenceBooks(): Array<{ path: string; url: string }> {
  return referenceBooksCache;
}

export function hydrateReferenceBooks(): Promise<void> {
  return hydrateTopics().then(async () => {
    const manifest = await loadContentManifest();
    referenceBooksCache = Object.entries(manifest.assets.byPath)
      .filter(([key]) => key.endsWith(".pdf"))
      .map(([path, value]) => ({ path, url: contentUrl(value) }));
  });
}
