import { useSyncExternalStore } from "react";
import { lessonByDay } from "./course";
import { loadSearchIndex } from "./contentRuntime";
import type { SearchIndexFile } from "@/types/contentManifest";

export type CodeCategory = "all" | "daily" | "topics" | "examples" | "patterns";

export interface CodeEntry {
  id: string;
  path: string;
  title: string;
  code: string;
  line: number;
  kind: "file" | "snippet";
  category: "daily" | "topics" | "examples" | "patterns" | "guidelines";
  lines: string[];
}

function resolveCategory(
  path: string,
): "daily" | "topics" | "examples" | "patterns" | "guidelines" {
  if (path.startsWith("daily/") || path.startsWith("weekly/")) return "daily";
  if (path.startsWith("references/") || path.startsWith("frameworks/"))
    return "topics";
  if (path.startsWith("examples/")) return "examples";
  if (path.startsWith("patterns/")) return "patterns";
  if (path.startsWith("guidelines/")) return "guidelines";
  return "topics";
}

export const codeEntries: CodeEntry[] = [];

let hydrated = false;
let hydrating: Promise<void> | null = null;
const hydrationListeners = new Set<() => void>();

export function hydrateSearch(): Promise<void> {
  hydrating ??= (async () => {
    const index = await loadSearchIndex();
    for (const file of index.files) {
      codeEntries.push(...codeEntriesFromFile(file));
    }
    hydrated = true;
    for (const listener of hydrationListeners) listener();
  })();
  return hydrating;
}

export function isSearchHydrated(): boolean {
  // Handle React 18+ StrictMode double-render safely: reading stable boolean.
  return hydrated;
}

function subscribeSearchHydration(listener: () => void): () => void {
  hydrationListeners.add(listener);
  return () => hydrationListeners.delete(listener);
}

export function useSearchHydrated(): boolean {
  return useSyncExternalStore(subscribeSearchHydration, isSearchHydrated);
}

function codeEntriesFromFile(file: SearchIndexFile): CodeEntry[] {
  const path = file.path;
  const raw = file.content;
  const category = resolveCategory(path);
  const day = /day-(\d+)/.exec(path)?.[1];
  const heading = raw.match(/^#\s+(.+)$/m)?.[1];
  const lesson = day ? lessonByDay(Number(day)) : undefined;
  const title = lesson
    ? `Day ${lesson.day} · ${lesson.title}`
    : (heading ?? path.split("/").at(-1) ?? path);

  if (!path.endsWith(".md")) {
    return [
      {
        id: path,
        path,
        title,
        code: raw,
        line: 1,
        kind: "file",
        category,
        lines: raw.split("\n"),
      },
    ];
  }

  return [
    ...raw.matchAll(
      /^(`{3,}|~{3,})(?:cpp|c\+\+|cxx|cc|c|hpp|h)(?:[ \t][^\n]*)?\r?\n([\s\S]*?)^\1\s*$/gm,
    ),
  ].map((match) => {
    const line = raw
      .slice(0, match.index! + match[0].indexOf("\n") + 1)
      .split("\n").length;
    return {
      id: `${path}:${line}`,
      path,
      title,
      code: match[2],
      line,
      kind: "snippet" as const,
      category,
      lines: match[2].replace(/\n$/, "").split("\n"),
    };
  });
}

export type SearchResult = { entry: CodeEntry; lineIndex: number };

export interface SearchOptions {
  caseSensitive?: boolean;
  useRegex?: boolean;
  wholeWord?: boolean;
  category?: string;
}

export function searchCode(
  query: string,
  kind: string = "all",
  options: SearchOptions = {},
): SearchResult[] {
  const rawQuery = query.trim();
  if (!rawQuery) return [];

  const {
    caseSensitive = false,
    useRegex = false,
    wholeWord = false,
    category = "all",
  } = options;

  let matcher: (text: string) => boolean;

  if (useRegex) {
    try {
      const flags = caseSensitive ? "g" : "gi";
      const regex = new RegExp(rawQuery, flags);
      matcher = (text: string) => {
        regex.lastIndex = 0;
        return regex.test(text);
      };
    } catch {
      // If regex is invalid syntax, fall back to literal search
      const needle = caseSensitive ? rawQuery : rawQuery.toLowerCase();
      matcher = (text: string) =>
        (caseSensitive ? text : text.toLowerCase()).includes(needle);
    }
  } else if (wholeWord) {
    const escaped = rawQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`\\b${escaped}\\b`, caseSensitive ? "" : "i");
    matcher = (text: string) => regex.test(text);
  } else {
    const needle = caseSensitive ? rawQuery : rawQuery.toLowerCase();
    matcher = (text: string) =>
      (caseSensitive ? text : text.toLowerCase()).includes(needle);
  }

  return codeEntries
    .filter((entry) => {
      if (kind !== "all" && entry.kind !== kind) return false;
      if (category !== "all" && entry.category !== category) return false;
      return true;
    })
    .flatMap((entry) => {
      const hits = entry.lines.flatMap((line, lineIndex) =>
        matcher(line) ? [{ entry, lineIndex }] : [],
      );
      if (hits.length > 0) return hits;
      if (matcher(entry.path)) return [{ entry, lineIndex: 0 }];
      return [];
    });
}

const defaultCountsByKind: Record<string, Record<string, number>> = {};

function getDefaultCounts(kind: string): Record<string, number> {
  if (isSearchHydrated() && defaultCountsByKind[kind]) return defaultCountsByKind[kind];
  const counts: Record<string, number> = {
    all: 0,
    daily: 0,
    topics: 0,
    examples: 0,
    patterns: 0,
  };
  for (const entry of codeEntries) {
    if (kind !== "all" && entry.kind !== kind) continue;
    counts.all++;
    if (entry.category in counts) {
      counts[entry.category]++;
    }
  }
  defaultCountsByKind[kind] = counts;
  return counts;
}

export function totalFileCount(): number {
  return codeEntries.filter((entry) => entry.kind === "file").length;
}
export function totalSnippetCount(): number {
  return codeEntries.filter((entry) => entry.kind === "snippet").length;
}

export function getCategoryCounts(
  query: string,
  kind: string = "all",
  options: Omit<SearchOptions, "category"> = {},
): Record<string, number> {
  const rawQuery = query.trim();
  if (!rawQuery) {
    return getDefaultCounts(kind);
  }

  const counts: Record<string, number> = {
    all: 0,
    daily: 0,
    topics: 0,
    examples: 0,
    patterns: 0,
  };

  const results = searchCode(query, kind, { ...options, category: "all" });
  for (const { entry } of results) {
    counts.all++;
    if (entry.category in counts) {
      counts[entry.category]++;
    }
  }

  return counts;
}
