import learningPlanRaw from "../../docs/learning-plan.md?raw";
import guidelineRaw from "../../guidelines/embedded-cpp-guideline-notes.md?raw";
import progressRaw from "../../progress.md?raw";

export const STEP_DEFS = [
  { key: "read", label: "READ", title: "阅读" },
  { key: "recall", label: "RECALL", title: "回忆" },
  { key: "concept", label: "CONCEPT", title: "概念" },
  { key: "refactor", label: "REFACTOR", title: "C → C++" },
  { key: "rules", label: "RULES", title: "规范" },
  { key: "lab", label: "LAB", title: "实验" },
  { key: "review", label: "REVIEW", title: "常见坑" },
  { key: "pass", label: "PASS", title: "Quiz" },
] as const;

export type StepKey = (typeof STEP_DEFS)[number]["key"];

export interface LessonSection {
  title: string;
  body: string;
  step?: StepKey;
}

export interface Lesson {
  day: number;
  week: number;
  part?: string;
  chapter?: number;
  chapterTitle?: string;
  title: string;
  duration: number;
  status: string;
  topics: string[];
  guidelines: string[];
  labPath?: string;
  labMode?: "rtos-sim";
  rtosScenario?: string;
  path: string;
  raw: string;
  sections: LessonSection[];
  labCode?: string;
  labChecklist: string[];
  nextSummary?: string;
}

type Frontmatter = Record<string, string | number | boolean | string[]>;

const rawLessons = import.meta.glob("../../daily/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const rawExamples = import.meta.glob("../../examples/**/main.cpp", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

function parseScalar(value: string): string | number | boolean | string[] {
  const array = value.trim().match(/^\[(.*)\]$/);
  if (array) return array[1].split(",").map((item) => item.trim().replace(/^["']|["']$/g, "")).filter(Boolean);
  const clean = value.trim().replace(/^["']|["']$/g, "");
  if (/^-?\d+(\.\d+)?$/.test(clean)) return Number(clean);
  if (clean === "true") return true;
  if (clean === "false") return false;
  return clean;
}

function readFrontmatter(raw: string): { meta: Frontmatter; body: string } {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) return { meta: {}, body: raw };

  const meta: Frontmatter = {};
  let listKey: string | undefined;

  for (const line of match[1].split(/\r?\n/)) {
    const top = line.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
    if (top) {
      const [, key, value] = top;
      listKey = undefined;
      if (value.trim() === "") {
        meta[key] = [];
        listKey = key;
      } else {
        meta[key] = parseScalar(value);
      }
      continue;
    }

    const item = line.match(/^\s+-\s+(.+)$/);
    if (item && listKey && Array.isArray(meta[listKey])) {
      (meta[listKey] as string[]).push(String(parseScalar(item[1])));
    }
  }

  return { meta, body: raw.slice(match[0].length) };
}

function chapterToPart(chapter?: number): string | undefined {
  if (!chapter) return undefined;
  if (chapter <= 3) return "I";
  if (chapter <= 6) return "II";
  if (chapter <= 24) return "III";
  if (chapter <= 27) return "IV";
  return "V";
}

function sectionStep(title: string): StepKey | undefined {
  const marker = title.trim()[0];
  const index = "①②③④⑤⑥⑦⑧".indexOf(marker);
  return index >= 0 ? STEP_DEFS[index].key : undefined;
}

function splitSections(body: string): LessonSection[] {
  const heading = /^##\s+(.+)$/gm;
  const matches = [...body.matchAll(heading)];
  if (!matches.length) return [];

  return matches.map((match, index) => {
    const start = (match.index ?? 0) + match[0].length;
    const end = matches[index + 1]?.index ?? body.length;
    const title = match[1].trim();

    return {
      title,
      body: body.slice(start, end).trim(),
      step: sectionStep(title),
    };
  });
}

const CHINESE_TITLES: Record<number, string> = {
  33: "多态与虚函数接口",
  45: "泛型数据结构与算法：模板应用",
  46: "防御式设计：提供完备的校验与防护机制",
  47: "为扩展性而设计：开闭原则与演进架构",
  48: "设计易用接口：一致性与人体工学",
  49: "面向受众与目标场景的接口设计",
  50: "防呆接口设计：让正确使用变得自然，让错误使用无法编译",
};

function titleFromBody(body: string, day: number): string {
  const h1 = body.match(/^#\s+(.+)$/m)?.[1]?.trim();
  if (!h1) return `Day ${day}`;
  return h1.replace(new RegExp(`^Day\\s+${day}\\s*[·:-]\\s*`, "i"), "").replace(/^Day\s+\d+\s*[·:-]\s*/i, "");
}

function cleanChineseTitle(body: string, day: number): string {
  if (CHINESE_TITLES[day]) {
    return CHINESE_TITLES[day];
  }
  const raw = titleFromBody(body, day);
  return raw
    .replace(/Chapter\s*\d+\s*[：:·-]\s*/gi, "")
    .replace(/Chapter\s*\d+\s*收束[：:·-]\s*/gi, "")
    .replace(/第\s*\d+\s*章\s*[：:·-]?\s*/g, "")
    .replace(/章节/g, "")
    .replace(/^Designing Professional C\+\+ Programs[：:·-]\s*/i, "")
    .replace(/^Coding with Style[：:·-]\s*/i, "")
    .replace(/^Professional C\+\+ Basics[：:·-]\s*/i, "")
    .replace(/^A Crash Course in C\+\+ and the Standard Library[：:·-]\s*/i, "")
    .trim();
}

function chapterFromBody(body: string): number | undefined {
  const match = body.match(/Chapter\s+(\d+)/i);
  return match ? Number(match[1]) : undefined;
}

function cleanInline(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1")
    .replace(/[*_>#`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function extractCode(section?: LessonSection): string | undefined {
  if (!section) return undefined;
  return section.body.match(/(?:^|\n)(`{3,}|~{3,})(?:cpp|c\+\+)[ \t]*\r?\n([\s\S]*?)\r?\n\1(?=\s|$)/i)?.[2]?.trim();
}

function extractChecklist(section?: LessonSection): string[] {
  if (!section) return [];
  return section.body
    .split(/\r?\n/)
    .map((line) => line.match(/^\s*-\s+(.+)$/)?.[1]?.trim())
    .filter((line): line is string => Boolean(line && line.length <= 100))
    .slice(-6);
}

function exampleForDay(day: number, labPath?: string): string | undefined {
  if (labPath) {
    const normalized = labPath.replace(/^\.\//, "");
    const direct = Object.entries(rawExamples).find(([path]) => path.endsWith(normalized));
    if (direct) return direct[1];
  }

  const token = `/day-${String(day).padStart(3, "0")}/main.cpp`;
  return Object.entries(rawExamples).find(([path]) => path.includes(token))?.[1];
}

function buildLesson(path: string, raw: string): Lesson | undefined {
  const day = Number(path.match(/day-(\d{3})-/)?.[1]);
  if (!day) return undefined;

  const { meta, body } = readFrontmatter(raw);
  const chapter = Number(meta.chapter || chapterFromBody(body)) || undefined;
  const nestedLabPath = raw.match(/^lab:\s*$[\s\S]*?^\s+path:\s*(.+)$/m)?.[1]?.trim();
  const labMode = meta.lab === "rtos-sim" ? "rtos-sim" : undefined;
  const rtosScenario = meta.rtos_scenario ? String(meta.rtos_scenario) : undefined;
  const sections = splitSections(body);
  const labSection = sections.find((section) => section.step === "lab");
  const nextSection = sections.find((section) => /下一步|next/i.test(section.title));
  const topics = Array.isArray(meta.topics) ? meta.topics : [];
  const guidelines = Array.isArray(meta.guidelines) ? meta.guidelines : [];

  return {
    day,
    week: Number(meta.week) || Math.ceil(day / 7),
    part: String(meta.part || chapterToPart(chapter) || "").replace(/^Part\s+/i, "") || undefined,
    chapter,
    chapterTitle: meta.chapter_title ? String(meta.chapter_title) : undefined,
    title: cleanChineseTitle(body, day),
    duration: Number(meta.duration) || 60,
    status: meta.status ? String(meta.status) : "published",
    topics,
    guidelines,
    labPath: nestedLabPath,
    labMode,
    rtosScenario,
    path: path.replace(/^\.\.\/\.\.\//, ""),
    raw: body,
    sections,
    labCode: exampleForDay(day, nestedLabPath) ?? extractCode(labSection),
    labChecklist: extractChecklist(labSection),
    nextSummary: nextSection ? cleanInline(nextSection.body) : undefined,
  };
}

export const lessons = Object.entries(rawLessons)
  .map(([path, raw]) => buildLesson(path, raw))
  .filter((lesson): lesson is Lesson => Boolean(lesson))
  .sort((a, b) => a.day - b.day);

export const repoCompletedDay =
  Number(progressRaw.match(/已完成[^\n]*Day\s+(\d+)/i)?.[1]) ||
  Number(progressRaw.match(/同步到\s+\*\*Day\s+(\d+)/i)?.[1]) ||
  Number(progressRaw.match(/Day\s+(\d+)/i)?.[1]) ||
  0;

export const nextPlannedDay = repoCompletedDay + 1;
export const learningPlan = learningPlanRaw;
export const guideline = guidelineRaw;

export function lessonByDay(day: number): Lesson | undefined {
  return lessons.find((lesson) => lesson.day === day);
}

export function latestLesson(): Lesson | undefined {
  return lessons.at(-1);
}

export function roadmapByWeek(): Array<{ week: number; lessons: Lesson[] }> {
  const map = new Map<number, Lesson[]>();
  for (const lesson of lessons) {
    map.set(lesson.week, [...(map.get(lesson.week) ?? []), lesson]);
  }
  return [...map.entries()].map(([week, items]) => ({ week, lessons: items }));
}

export function latestNextSummary(): string | undefined {
  return latestLesson()?.nextSummary;
}
