import { resolveContentPath } from "./contentAssets";
export { referenceBooks } from "./contentAssets";
const sources = import.meta.glob(
  [
    "../../patterns/**/*.md",
    "../../frameworks/**/*.md",
    "../../docs/mermaid.md",
    "../../references/system-design-notes/content/**/*.md",
  ],
  { query: "?raw", import: "default", eager: true },
) as Record<string, string>;

export function topicGroup(path: string) {
  if (/C\+\+ Concurrency/.test(path)) return "C++ 并发编程";
  if (/Boost[. ]Asio/.test(path)) return "Boost.Asio";
  if (/Cpp System/.test(path)) return "C++ 系统架构";
  if (/embedded-systems|frameworks\/(trace32|openharmony)/.test(path))
    return "嵌入式系统";
  if (/Development Tools/.test(path)) return "开发工具";
  if (/patterns/.test(path)) return "设计模式";
  if (/frameworks\/asio/.test(path)) return "网络与异步";
  return "框架与阅读指南";
}
export const topics = Object.entries(sources)
  .map(([path, raw]) => {
    const body = raw.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "");
    return {
      path: path.replace(/^\.\.\/\.\.\//, ""),
      title: body.match(/^#\s+(.+)$/m)?.[1] ?? path.split("/").pop()!,
      id: raw.match(/^id:\s*(.+)$/m)?.[1]?.trim(),
      locale: /\.en\.md$/.test(path) ? "en" : "zh",
      group: topicGroup(path),
      summary: raw.match(/^summary:\s*["']?(.+?)["']?\s*$/m)?.[1],
      body,
      raw,
    };
  })
  .sort((a, b) => a.path.localeCompare(b.path, "zh-CN", { numeric: true }));

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

export type Topic = (typeof topics)[number];

export function topicSeries(topic: Topic) {
  const path = topic.path;
  if (path.startsWith("frameworks/openharmony/")) return "OpenHarmony 轻量系统";
  if (path.startsWith("frameworks/trace32/"))
    return "TRACE32 · RTOS 稳定性分析";
  if (path.startsWith("frameworks/asio/")) return "Asio · 网络与异步";
  if (path.startsWith("patterns/")) return "C++ 设计模式";
  return topic.group;
}

export function topicSummary(topic: Topic) {
  const paragraph = topic.body
    .replace(/```[\s\S]*?```/g, "")
    .split(/\n\s*\n/)
    .map((text) => text.replace(/^>\s?/gm, "").trim())
    .find((text) => text && !/^[#|<!\-]/.test(text) && !/^\d+\./.test(text));
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
        Number(b.path.endsWith("/README.md")) -
          Number(a.path.endsWith("/README.md")) ||
        a.path.localeCompare(b.path, "zh-CN", { numeric: true }),
    );
}
