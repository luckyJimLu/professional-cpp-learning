import { contentUrl } from "./contentRuntime";
export function resolveContentPath(currentPath: string, href: string) {
  try {
    const url = new URL(href, `https://learning.local/${currentPath}`);
    if (url.origin !== "https://learning.local") return undefined;
    return decodeURIComponent(url.pathname).slice(1);
  } catch {
    return undefined;
  }
}
export function resolveAsset(currentPath: string, href: string) {
  const localGithub =
    "https://github.com/luckyJimLu/system-design-notes/blob/main/";
  const path = href.startsWith(localGithub)
    ? `references/system-design-notes/${decodeURIComponent(href.slice(localGithub.length))}`
    : resolveContentPath(currentPath, href);
  if (!path) return undefined;
  // 内容位于 dist/content 镜像布局（md 中已修复的 assets/ 相对链接与基线原路径一致）。
  return contentUrl(`content/${path}`);
}
