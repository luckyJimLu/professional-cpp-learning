import outlineRaw from "../../PPT/设计模式大纲.md?raw";

export interface SlideItem {
  index: number;
  pptNumber?: number;
  layout?: string;
  title: string;
  subtitle?: string;
  kicker?: string;
  canvas: string;
  notes: string;
  clicks?: number;
  frontmatter: Record<string, string>;
}

export interface SlideDeck {
  id: string; // e.g. "lesson-01"
  lessonNumber: number; // e.g. 1
  path: string;
  title: string;
  lessonTitle: string;
  theme?: string;
  aspectRatio?: string;
  totalSlides: number;
  slides: SlideItem[];
  raw: string;
}

export interface SyllabusPptUnit {
  pptNum: number;
  title: string;
  focus: string;
  presentation: string;
  notes: string;
}

export interface SyllabusLesson {
  lessonNum: number;
  title: string;
  units: Record<number, SyllabusPptUnit>;
}

// Vite glob for all slide decks under slides/lesson-*.md
const rawDecks = import.meta.glob("../../slides/lesson-*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

/**
 * Split a Slidev markdown file into frontmatter and body pairs.
 * Follows the exact delimiter and peek-ahead logic from check_slides.py.
 */
export function splitSlides(
  text: string,
): { frontmatter: Record<string, string>; body: string }[] {
  const lines = text.split(/\r?\n/);
  const slides: { frontmatter: Record<string, string>; body: string }[] = [];
  let i = 0;
  const n = lines.length;

  while (i < n) {
    while (i < n && !lines[i].trim()) i++;
    if (i >= n) break;

    const fm: Record<string, string> = {};
    if (lines[i].trim() === "---") {
      i++;
      while (i < n && lines[i].trim() !== "---") {
        const line = lines[i];
        const m = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line);
        if (m) {
          fm[m[1].trim()] = m[2].trim().replace(/^['"]|['"]$/g, "");
        }
        i++;
      }
      if (i < n && lines[i].trim() === "---") {
        i++;
      }
    }

    const bodyLines: string[] = [];
    let inCode = false;
    while (i < n) {
      const line = lines[i];
      if (line.trim().startsWith("```")) {
        inCode = !inCode;
      }
      if (!inCode && line.trim() === "---") {
        let j = i + 1;
        let isFm = false;
        while (j < n && lines[j].trim() !== "---") {
          if (/^[A-Za-z0-9_-]+:\s*.*$/.test(lines[j].trim())) {
            isFm = true;
          } else if (lines[j].trim() && !lines[j].startsWith("  ")) {
            isFm = false;
            break;
          }
          j++;
        }
        if (j < n && lines[j].trim() === "---" && isFm) break;
        if (j === i + 1) break;
      }
      bodyLines.push(line);
      i++;
    }
    slides.push({ frontmatter: fm, body: bodyLines.join("\n") });
  }
  return slides;
}

/**
 * Extract trailing speaker notes (<!-- ... -->) from the slide body.
 */
export function extractNotesAndCanvas(
  body: string,
): { canvas: string; notes: string } {
  const regex = /<!--([\s\S]*?)-->/g;
  let lastMatch: RegExpExecArray | null = null;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(body)) !== null) {
    lastMatch = match;
  }
  if (!lastMatch) {
    return { canvas: body.trim(), notes: "" };
  }
  const trailing = body.slice(lastMatch.index + lastMatch[0].length).trim();
  if (trailing) {
    return { canvas: body.trim(), notes: "" };
  }
  const canvas = body.slice(0, lastMatch.index).trim();
  const notes = lastMatch[1].trim();
  return { canvas, notes };
}

/**
 * Extract slide title and subtitles from canvas.
 */
export function extractSlideMetadata(
  canvas: string,
  frontmatter: Record<string, string>,
): {
  title: string;
  subtitle?: string;
  kicker?: string;
} {
  const kickerMatch = /<div class="pc-kicker">([\s\S]*?)<\/div>/i.exec(canvas);
  const subtitleMatch = /<div class="pc-subtitle">([\s\S]*?)<\/div>/i.exec(
    canvas,
  );

  let title = frontmatter.title || "";
  const lines = canvas.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("# ")) {
      title = trimmed.replace(/^#\s+/, "").trim();
      break;
    }
  }

  if (!title) {
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("## ")) {
        title = trimmed.replace(/^##\s+/, "").trim();
        break;
      }
    }
  }

  return {
    title: title || "幻灯片",
    subtitle: subtitleMatch ? subtitleMatch[1].trim() : undefined,
    kicker: kickerMatch ? kickerMatch[1].trim() : undefined,
  };
}

/**
 * Preprocess slide markdown into clean HTML/Markdown ready for ReactMarkdown.
 * Translates Slidev components (<Callout>, <Quote>) and strips Slidev click markers.
 */
export function preprocessSlideContent(canvas: string): string {
  let content = canvas;

  // Transform <Callout type="..." title="...">body</Callout>
  content = content.replace(
    /<Callout(?:\s+type="([^"]*)")?(?:\s+title="([^"]*)")?\s*>([\s\S]*?)<\/Callout>/g,
    (_, type = "info", title = "", body = "") => {
      const icon = type === "bad" ? "❌" : type === "good" ? "✅" : "💡";
      return `<div class="pc-callout ${type}"><div class="pc-callout-title">${icon} ${title}</div><div class="pc-callout-body">\n\n${body.trim()}\n\n</div></div>`;
    },
  );

  // Transform <Quote author="..." zh="...">en</Quote>
  content = content.replace(
    /<Quote(?:\s+author="([^"]*)")?(?:\s+zh="([^"]*)")?\s*>([\s\S]*?)<\/Quote>/g,
    (_, author = "", zh = "", en = "") => {
      return `<figure class="pc-quote"><blockquote class="pc-quote-en">${en.trim()}</blockquote>${zh ? `<p class="pc-quote-zh">${zh}</p>` : ""}<figcaption class="pc-quote-author">— ${author}</figcaption></figure>`;
    },
  );

  // Strip Slidev click directives: <v-clicks>, </v-clicks>, v-click attributes
  content = content.replace(/<\/?v-clicks>/g, "");
  content = content.replace(/\bv-click(?:="[^"]*")?/g, "");

  return content;
}

/**
 * Parse design pattern syllabus outline from PPT/设计模式大纲.md.
 */
export function parseSyllabus(raw: string): Record<number, SyllabusLesson> {
  const lessons: Record<number, SyllabusLesson> = {};
  const lessonRegex =
    /##\s*📌?\s*第\s*(\d+)\s*课[：:]\s*([^\n\r]+)([\s\S]*?)(?=(?:##\s*📌?\s*第\s*\d+\s*课|$))/g;

  let lMatch: RegExpExecArray | null;
  while ((lMatch = lessonRegex.exec(raw)) !== null) {
    const lessonNum = parseInt(lMatch[1], 10);
    const lessonTitle = lMatch[2].trim();
    const lessonBody = lMatch[3];

    const units: Record<number, SyllabusPptUnit> = {};
    const pptRegex =
      /###\s*PPT\s*(\d+)\s*[:：]\s*([^\n\r]+)([\s\S]*?)(?=(?:###\s*PPT\s*\d+|$))/g;

    let pMatch: RegExpExecArray | null;
    while ((pMatch = pptRegex.exec(lessonBody)) !== null) {
      const pptNum = parseInt(pMatch[1], 10);
      const title = pMatch[2].trim();
      const body = pMatch[3];

      const focusMatch =
        /\*\s*\*\*重点内容\*\*[：:]([\s\S]*?)(?=(?:\*\s*\*\*呈现方式\*\*|\*\s*\*\*演讲要点\*\*|$))/i.exec(
          body,
        );
      const presMatch =
        /\*\s*\*\*呈现方式\*\*[：:]([\s\S]*?)(?=(?:\*\s*\*\*演讲要点\*\*|$))/i.exec(
          body,
        );
      const notesMatch = /\*\s*\*\*演讲要点\*\*[：:]([\s\S]*?)$/i.exec(body);

      units[pptNum] = {
        pptNum,
        title,
        focus: focusMatch ? focusMatch[1].trim() : "",
        presentation: presMatch ? presMatch[1].trim() : "",
        notes: notesMatch ? notesMatch[1].trim() : "",
      };
    }

    lessons[lessonNum] = {
      lessonNum,
      title: lessonTitle,
      units,
    };
  }

  return lessons;
}

export const syllabusLessons: Record<number, SyllabusLesson> =
  parseSyllabus(outlineRaw);

/**
 * Parse all decks found in slides/lesson-*.md.
 */
function loadAllDecks(): SlideDeck[] {
  const decks: SlideDeck[] = [];

  for (const [path, raw] of Object.entries(rawDecks)) {
    const filenameMatch = /lesson-(\d+)\.md$/.exec(path);
    if (!filenameMatch) continue;

    const lessonNumber = parseInt(filenameMatch[1], 10);
    const id = `lesson-${String(lessonNumber).padStart(2, "0")}`;

    const rawSlides = splitSlides(raw);
    const deckFrontmatter = rawSlides[0]?.frontmatter ?? {};

    const deckTitle =
      deckFrontmatter.title || `Professional C++ · 第 ${lessonNumber} 课`;
    const lessonTitle =
      deckFrontmatter.lesson || `第 ${lessonNumber} 课`;

    const slides: SlideItem[] = rawSlides.map((s, idx) => {
      const { canvas, notes } = extractNotesAndCanvas(s.body);
      const meta = extractSlideMetadata(canvas, s.frontmatter);
      const pptNumber = s.frontmatter.ppt
        ? parseInt(s.frontmatter.ppt, 10)
        : idx === 0
          ? 1
          : undefined;

      return {
        index: idx + 1,
        pptNumber,
        layout: s.frontmatter.layout || (idx === 0 ? "cover" : "default"),
        title: meta.title,
        subtitle: meta.subtitle,
        kicker: meta.kicker,
        canvas,
        notes,
        frontmatter: s.frontmatter,
      };
    });

    decks.push({
      id,
      lessonNumber,
      path,
      title: deckTitle,
      lessonTitle,
      theme: deckFrontmatter.theme || "default",
      aspectRatio: deckFrontmatter.aspectRatio || "16/9",
      totalSlides: slides.length,
      slides,
      raw,
    });
  }

  return decks.sort((a, b) => a.lessonNumber - b.lessonNumber);
}

export const allSlideDecks: SlideDeck[] = loadAllDecks();

export function getDeckById(id: string): SlideDeck | undefined {
  return (
    allSlideDecks.find((d) => d.id === id) ??
    allSlideDecks.find((d) => d.lessonNumber === Number(id)) ??
    allSlideDecks[0]
  );
}

export function getDeckByLessonNumber(
  lessonNum: number,
): SlideDeck | undefined {
  return allSlideDecks.find((d) => d.lessonNumber === lessonNum);
}
