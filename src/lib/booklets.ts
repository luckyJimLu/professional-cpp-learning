import cppSource from "../../booklets/cpp.md?raw";
import cSource from "../../booklets/c.md?raw";

export interface BookletEntry {
  id: string;
  title: string;
  keywords: string;
  body: string;
  category: string;
  categoryTitle: string;
  bookId?: string;
  bookTitle?: string;
}
export interface BookletSection {
  id: string;
  title: string;
  entries: BookletEntry[];
}

function parseSections(
  source: string,
  bookId?: string,
  bookTitle?: string,
): BookletSection[] {
  const headings = [
    ...source.matchAll(/^## (.+?) <!-- category: ([a-z0-9-]+) -->$/gm),
  ];
  return headings.map((match, index) => {
    const body = source.slice(
      match.index! + match[0].length,
      headings[index + 1]?.index,
    );
    const entries = [
      ...body.matchAll(/^### (.+?) <!-- entry: ([a-z0-9-]+) -->$/gm),
    ];
    return {
      id: match[2],
      title: match[1],
      entries: entries.map((entry, i) => {
        const text = body
          .slice(entry.index! + entry[0].length, entries[i + 1]?.index)
          .trim();
        const keywords = text.match(/^关键词：(.+)$/m)?.[1] ?? "";
        return {
          id: entry[2],
          title: entry[1],
          keywords,
          body: text.replace(/^关键词：.+\n?/m, "").trim(),
          category: match[2],
          categoryTitle: match[1],
          bookId,
          bookTitle,
        };
      }),
    };
  });
}

const downloads = import.meta.glob("../../booklets/**/*.{md,c,cpp}", {
  query: "?url&no-inline",
  import: "default",
  eager: true,
}) as Record<string, string>;
export const cBooklet = {
  id: "c",
  title: "C 语言速查",
  standard: "ISO C17",
  sections: parseSections(cSource, "c", "C 语言"),
  downloadUrl: downloads["../../booklets/c.md"],
  exampleUrl: downloads["../../booklets/examples/c17-reference.c"],
};
export const cppBooklet = {
  id: "cpp",
  title: "C++ 语言速查",
  standard: "ISO C++98–C++23",
  sections: parseSections(cppSource, "cpp", "C++"),
  downloadUrl: downloads["../../booklets/cpp.md"],
  exampleUrl: downloads["../../booklets/examples/cpp20-reference.cpp"],
};
export const booklets = [cBooklet, cppBooklet];
export const bookletEntries = cBooklet.sections.flatMap(
  (section) => section.entries,
);
const normalize = (value: string) => value.normalize("NFKC").toLowerCase();
export function searchBooklet(query: string, booklet?: typeof cBooklet) {
  const terms = normalize(query).trim().split(/\s+/).filter(Boolean);
  const score = (entry: BookletEntry) =>
    terms.reduce(
      (value, term) =>
        value +
        (entry.id === term ? 100 : 0) +
        (normalize(entry.title).includes(term) ? 50 : 0) +
        (normalize(entry.keywords).split(/\s+/).includes(term) ? 30 : 0),
      0,
    ) -
    (terms.length && ["keywords", "standard-headers"].includes(entry.id)
      ? 5
      : 0);

  const targetSections = booklet
    ? booklet.sections
    : booklets.flatMap((b) => b.sections);

  return targetSections
    .flatMap((section) => section.entries)
    .filter((entry) => {
      const text = normalize(
        `${entry.title} ${entry.keywords} ${entry.categoryTitle} ${entry.body}`,
      );
      return terms.every((term) => text.includes(term));
    })
    .sort((left, right) => score(right) - score(left));
}

export function bookletHref(values: Record<string, string | undefined>) {
  const url = new URL(window.location.href);
  url.searchParams.set("view", "booklets");
  if (!booklets.some((book) => book.id === url.searchParams.get("book")))
    url.searchParams.set("book", "c");
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) url.searchParams.delete(key);
    else url.searchParams.set(key, value);
  }
  url.hash = "";
  return url.href;
}
