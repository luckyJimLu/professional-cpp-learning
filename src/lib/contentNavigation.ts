import { lessons } from "./course";
import { resolveContentPath } from "./contentAssets";
import { resolveTopicLink } from "./topics";

// Markdown stays repository-relative; the web reader maps known documents to
// application routes while unknown/external links retain their normal behavior.
export function resolveContentNavigation(currentPath: string, href: string) {
  if (href.startsWith("#") && !href.startsWith("#/chapter/")) return undefined;
  const path = resolveContentPath(currentPath, href);
  const lesson = lessons.find((item) => item.path === path);
  if (lesson)
    return { view: "lesson", day: String(lesson.day), topic: undefined };
  if (path === "docs/faq.md") {
    return { view: "faq", chapter: undefined, day: undefined, topic: undefined };
  }
  const faqMatch = path?.match(/^docs\/faq\/([^/]+)\.md$/);
  if (faqMatch) {
    return { view: "faq", chapter: faqMatch[1], day: undefined, topic: undefined };
  }
  const topic = resolveTopicLink(currentPath, href);
  if (topic) return { view: "topics", topic: topic.path, day: undefined };
  return undefined;
}

export function resolveContentHref(currentPath: string, href: string) {
  const target = resolveContentNavigation(currentPath, href);
  if (!target)
    return href.startsWith("#/chapter/")
      ? `https://luckyJimLu.github.io/system-design-notes/${href}`
      : href;
  const url = new URL(window.location.href);
  for (const [key, value] of Object.entries(target)) {
    if (value === undefined) url.searchParams.delete(key);
    else url.searchParams.set(key, value);
  }
  url.hash = "";
  return url.href;
}
