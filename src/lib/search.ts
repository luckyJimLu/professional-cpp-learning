const sourceFiles = import.meta.glob(
  [
    "../../examples/**/*.{cpp,h,hpp,cc,cxx,ipp}",
    "../../frameworks/**/*.{cpp,h,hpp,cc,cxx,ipp}",
    "../../patterns/**/*.{cpp,h,hpp,cc,cxx,ipp}",
    "../../references/**/*.{cpp,h,hpp,cc,cxx,ipp}",
    "../../daily/**/*.md",
    "../../weekly/**/*.md",
    "../../guidelines/**/*.md",
    "../../patterns/**/*.md",
    "../../frameworks/**/*.md",
    "../../references/**/*.md",
  ],
  { query: "?raw", import: "default", eager: true },
) as Record<string, string>;

export type CodeCategory =
  | "all"
  | "daily"
  | "topics"
  | "examples"
  | "patterns";

export interface CodeEntry {
  id: string;
  path: string;
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

export const codeEntries: CodeEntry[] = Object.entries(
  sourceFiles,
).flatMap<CodeEntry>(([sourcePath, raw]) => {
  const path = sourcePath.slice(6);
  const category = resolveCategory(path);

  if (!path.endsWith(".md")) {
    return [
      {
        id: path,
        path,
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
      /^(\x60{3,}|~{3,})(?:cpp|c\+\+|cxx|cc|c|hpp|h)(?:[ \t][^\n]*)?\r?\n([\s\S]*?)^\1\s*$/gm,
    ),
  ].map((match) => {
    const line = raw
      .slice(0, match.index! + match[0].indexOf("\n") + 1)
      .split("\n").length;
    return {
      id: `${path}:${line}`,
      path,
      code: match[2],
      line,
      kind: "snippet" as const,
      category,
      lines: match[2].replace(/\n$/, "").split("\n"),
    };
  });
});

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
  if (defaultCountsByKind[kind]) return defaultCountsByKind[kind];
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

export const totalFileCount = codeEntries.filter((entry) => entry.kind === "file").length;
export const totalSnippetCount = codeEntries.filter((entry) => entry.kind === "snippet").length;

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
