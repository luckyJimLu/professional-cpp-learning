import { resolveContentPath } from "./contentAssets";
export { referenceBooks } from "./contentAssets";
const sources = import.meta.glob(
  [
    "../../patterns/**/*.md",
    "../../references/reading-paths/*.md",
    "../../frameworks/**/*.md",
    "../../docs/mermaid.md",
    "../../docs/content-map.md",
    "../../docs/beginner-start.md",
    "../../docs/beginner-course-map.md",
    "../../docs/beginner-course-refinement.md",
    "../../docs/lab-environments.md",
    "../../docs/engineering-learning-path.md",
    "../../docs/chapter-06-review.md",
    "../../docs/historical-exercises.md",
    "../../docs/reference-reading-guide.md",
    "../../docs/cpp-implementation-deep-dive.md",
    "../../docs/content-refinement-validation.md",
    "../../docs/memory-visualizer-guide.md",
    "../../docs/rtos-simulator/LEARNING-GUIDE.md",
    "../../docs/learning-plan.md",
    "../../docs/content-migration.md",
    "../../docs/harmonyos-mini-cpp11-compatibility.md",
    "../../docs/zephyr-cpp20-zpp.md",
    "../../guidelines/*.md",
    "../../utils/**/*.md",
    "../../references/system-design-notes/content/**/*.md",
  ],
  { query: "?raw", import: "default", eager: true },
) as Record<string, string>;

export function topicGroup(path: string) {
  if (path.includes("references/reading-paths/")) return "参考书导读";
  if (/C\+\+ Concurrency/.test(path)) return "C++ 并发编程";
  if (/Boost[. ]Asio|frameworks\/asio/.test(path)) return "网络与异步";
  if (/embedded-systems|frameworks\/(trace32|openharmony)/.test(path))
    return "嵌入式系统";
  if (/patterns|Cpp System/.test(path)) return "设计模式";
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

export const referenceGuides = topics.filter(
  (topic) =>
    topic.path.startsWith("references/reading-paths/") && topic.locale === "zh",
);
