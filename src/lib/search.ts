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
export type CodeEntry = {
  id: string;
  path: string;
  code: string;
  line: number;
  kind: "file" | "snippet";
  lines: string[];
};
export const codeEntries: CodeEntry[] = Object.entries(
  sourceFiles,
).flatMap<CodeEntry>(([sourcePath, raw]) => {
  const path = sourcePath.slice(6);
  if (!path.endsWith(".md"))
    return [
      {
        id: path,
        path,
        code: raw,
        line: 1,
        kind: "file",
        lines: raw.split("\n"),
      },
    ];
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
      lines: match[2].replace(/\n$/, "").split("\n"),
    };
  });
});
export type SearchResult = { entry: CodeEntry; lineIndex: number };
export function searchCode(query: string, kind: string): SearchResult[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];
  return codeEntries
    .filter((entry) => kind === "all" || entry.kind === kind)
    .flatMap((entry) => {
      const hits = entry.lines.flatMap((line, lineIndex) =>
        line.toLowerCase().includes(needle) ? [{ entry, lineIndex }] : [],
      );
      return hits.length
        ? hits
        : entry.path.toLowerCase().includes(needle)
          ? [{ entry, lineIndex: 0 }]
          : [];
    });
}
