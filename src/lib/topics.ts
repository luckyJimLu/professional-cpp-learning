const sources = import.meta.glob([
  "../../patterns/*.md",
  "../../frameworks/asio/*.md",
  "../../docs/mermaid.md",
], { query: "?raw", import: "default", eager: true }) as Record<string, string>;

export const topics = Object.entries(sources).map(([path, body]) => ({
  path: path.replace(/^\.\.\/\.\.\//, ""),
  title: body.match(/^#\s+(.+)$/m)?.[1] ?? path.split("/").pop()!,
  body,
})).sort((a, b) => a.path.localeCompare(b.path));

export function resolveTopicLink(currentPath: string, href: string) {
  const url = new URL(href, `https://learning.local/${currentPath}`);
  if (url.origin !== "https://learning.local") return undefined;
  const path = decodeURIComponent(url.pathname).replace(/^\//, "");
  return topics.find((topic) => topic.path === path || topic.path === `${path.replace(/\/$/, "")}/README.md`);
}
