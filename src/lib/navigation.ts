import { useEffect, useState } from "react";

export const NAV = [
  { id: "today", label: "学习指南", group: "学习路径" },
  { id: "roadmap", label: "学习路线", group: "学习路径" },
  { id: "lessons", label: "每日课程", group: "学习路径" },
  { id: "topics", label: "专题", group: "知识与实践" },
  { id: "visualizer", label: "内存可视化", group: "知识与实践" },
  { id: "lab", label: "编译实验", group: "知识与实践" },
  { id: "review", label: "每周复盘", group: "学习记录" },
  { id: "guidelines", label: "编码规范", group: "学习记录" },
  { id: "progress", label: "学习进度", group: "学习记录" },
] as const;
export type View = (typeof NAV)[number]["id"] | "lesson" | "search";
export function navigate(
  values: Record<string, string | undefined>,
  replace = false,
) {
  const url = new URL(window.location.href);
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) url.searchParams.delete(key);
    else url.searchParams.set(key, value);
  }
  url.hash = "";
  if (url.href === window.location.href) return;
  window.history[replace ? "replaceState" : "pushState"]({}, "", url);
  window.dispatchEvent(new PopStateEvent("popstate"));
  if (values.view !== undefined || values.topic !== undefined)
    window.scrollTo({ top: 0, behavior: "instant" });
}
export function useLocationParams() {
  const [search, setSearch] = useState(window.location.search);
  useEffect(() => {
    const update = () => setSearch(window.location.search);
    window.addEventListener("popstate", update);
    return () => window.removeEventListener("popstate", update);
  }, []);
  return new URLSearchParams(search);
}
