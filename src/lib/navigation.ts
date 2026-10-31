import { useEffect, useState } from "react";

export const NAV = [
  { id: "today", label: "学习指南", group: "learn" },
  { id: "lessons", label: "课程", group: "learn" },
  { id: "slides", label: "课件", group: "learn" },
  { id: "review", label: "复盘", group: "learn" },
  { id: "topics", label: "专题", group: "reference" },
  { id: "booklets", label: "小册子", group: "reference" },
  { id: "guidelines", label: "编码规范", group: "reference" },
  { id: "faq", label: "FAQ", group: "reference" },
  { id: "lab", label: "实验", group: "tools" },
] as const;

export const NAV_GROUPS = [
  { id: "learn", label: "学习" },
  { id: "reference", label: "知识库" },
  { id: "tools", label: "工具" },
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

const PAGE_PARAMS: Partial<Record<View, string[]>> = {
  topics: ["topic", "topicCategory"],
  booklets: ["book", "bq", "category", "entry"],
  slides: ["deck", "slide", "tab"],
  lab: ["code", "line"],
  lessons: ["courseTab", "courseQuery"],
};

export function navigate(
  values: Record<string, string | undefined>,
  replace = false,
) {
  const url = new URL(window.location.href);
  const rawCurrent = url.searchParams.get("view") ?? "today";
  const currentView = VIEW_ALIASES[rawCurrent] ?? rawCurrent;
  const rawNext = values.view;
  const nextView =
    rawNext !== undefined ? (VIEW_ALIASES[rawNext] ?? rawNext) : undefined;
  if (nextView !== undefined && nextView !== currentView) {
    for (const keys of Object.values(PAGE_PARAMS)) {
      if (!keys) continue;
      for (const key of keys) {
        if (!(key in values)) url.searchParams.delete(key);
      }
    }
  }
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
