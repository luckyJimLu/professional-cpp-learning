const assets = import.meta.glob(
  ["../../references/**/*.{svg,png,jpg,jpeg,gif,webp,pdf,cpp,hpp,py,sh,puml}"],
  { query: "?url", import: "default", eager: true },
) as Record<string, string>;
const assetUrls = Object.fromEntries(
  Object.entries(assets).map(([path, url]) => [path.slice(6), url]),
);
export const referenceBooks = Object.entries(assetUrls).filter(([path]) =>
  path.endsWith(".pdf"),
);
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
  return path ? assetUrls[path] : undefined;
}
