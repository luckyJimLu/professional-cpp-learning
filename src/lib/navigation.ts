import { useEffect, useState } from "react";

export const NAV = [
  { id: "today", label: "学习指南" },
  { id: "lessons", label: "课程" },
  { id: "slides", label: "课件" },
  { id: "topics", label: "专题" },
  { id: "booklets", label: "小册子" },
  { id: "lab", label: "实验" },
  { id: "guidelines", label: "编码规范" },
  { id: "review", label: "复盘" },
] as const;

export const VIEW_ALIASES: Record<string, (typeof NAV)[number]["id"]> = {
  roadmap: "lessons",
  progress: "review",
  ppt: "slides",
  slide: "slides",
};

export type View =
  | (typeof NAV)[number]["id"]
  | "lesson"
  | "search"
  | "visualizer"
  | "roadmap"
  | "progress"
  | "slides";
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
