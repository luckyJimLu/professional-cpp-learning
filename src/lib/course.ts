import { useSyncExternalStore } from "react";
import { fetchContentText, loadContentManifest } from "./contentRuntime";
import type { ContentLesson } from "@/types/contentManifest";

export const STEP_DEFS = [
  { key: "read", label: "READ", title: "阅读" },
  { key: "recall", label: "RECALL", title: "回忆" },
  { key: "concept", label: "CONCEPT", title: "概念" },
  { key: "refactor", label: "REFACTOR", title: "C → C++" },
  { key: "design", label: "DESIGN", title: "设计模式" },
  { key: "embedded", label: "EMBEDDED", title: "Embedded" },
  { key: "rules", label: "RULES", title: "规范" },
  { key: "lab", label: "LAB", title: "实验" },
  { key: "review", label: "REVIEW", title: "常见坑" },
  { key: "pass", label: "PASS", title: "Quiz" },
] as const;

export type StepKey = (typeof STEP_DEFS)[number]["key"];

export interface StepDefinition {
  key: StepKey;
  label: string;
  title: string;
}

export const LEGACY_STEP_DEFS: readonly StepDefinition[] = [
  { key: "read", label: "READ", title: "阅读" },
  { key: "recall", label: "RECALL", title: "回忆" },
  { key: "concept", label: "CONCEPT", title: "概念" },
  { key: "refactor", label: "REFACTOR", title: "C → C++" },
  { key: "rules", label: "RULES", title: "规范" },
  { key: "lab", label: "LAB", title: "实验" },
  { key: "review", label: "REVIEW", title: "常见坑" },
  { key: "pass", label: "PASS", title: "Quiz" },
];

const TEN_STAGE_START_DAY = 67;

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
  steps: readonly StepDefinition[];
  labCode?: string;
  labChecklist: string[];
  nextSummary?: string;
}

const mainCppCache = new Map<string, string>();
const headerCache = new Map<string, string>();

async function fetchMainCpp(day: number): Promise<string | undefined> {
  if (!mainCppCache.size) {
    const manifest = await loadContentManifest();
    await Promise.all(
      manifest.lessons
        .filter((entry) => entry.lab && entry.lab.endsWith("main.cpp"))
        .map(async (entry) => {
          mainCppCache.set(entry.lab, await fetchContentText(entry.lab));
        }),
    );
  }
  return mainCppCache.get(`examples/day-${String(day).padStart(3, "0")}/main.cpp`);
}

async function fetchHeader(headerPath: string): Promise<string | undefined> {
  if (!headerCache.has(headerPath)) {
    try {
      headerCache.set(headerPath, await fetchContentText(headerPath));
    } catch {
      headerCache.set(headerPath, "");
    }
  }
  const cached = headerCache.get(headerPath);
  return cached || undefined;
}

async function bundleExample(path: string, source: string, stack: string[] = []): Promise<string> {
  const replacements = await Promise.all(
    [...source.matchAll(/[ \t]*#include[ \t]+"([^"\n]+)"[^\n]*$/gm)].map(async (match) => {
      const name = match[1];
      const parts = `${path.slice(0, path.lastIndexOf("/"))}/${name}`.split("/");
      const normalized: string[] = [];
      for (const part of parts) {
        if (part === ".." && normalized.length && normalized.at(-1) !== "..") normalized.pop();
        else if (part !== ".") normalized.push(part);
      }
      const headerPath = normalized.join("/");
      const header = await fetchHeader(headerPath);
      if (header === undefined || stack.includes(headerPath)) {
        return { match, replacement: match[0] };
      }
      const line = source.slice(0, match.index!).split("\n").length;
      const bundled = await bundleExample(headerPath, header, [...stack, headerPath]);
      return {
        match,
        replacement: `#line 1 "${name}"\n${bundled}\n#line ${line + 1} "${path.split("/").at(-1)}"`,
      };
    }),
  );
  return replacements.reduceRight(
    (text, { match, replacement }) =>
      text.slice(0, match.index!) + replacement + text.slice(match.index! + match[0].length),
    source,
  );
}

function chapterToPart(chapter?: number): string | undefined {
  if (!chapter) return undefined;
  if (chapter <= 3) return "I";
  if (chapter <= 6) return "II";
  if (chapter <= 24) return "III";
  if (chapter <= 27) return "IV";
  return "V";
}

function sectionStep(
  title: string,
  steps: readonly StepDefinition[],
): StepKey | undefined {
  const marker = title.trim()[0];
  const index = "①②③④⑤⑥⑦⑧⑨⑩".indexOf(marker);
  return index >= 0 ? steps[index]?.key : undefined;
}

function splitSections(body: string): {
  sections: LessonSection[];
  steps: readonly StepDefinition[];
} {
  const heading = /^##\s+(.+)$/gm;
  const matches = [...body.matchAll(heading)];
  const hasTenStages = matches.some((match) =>
    /^[⑨⑩]/.test(match[1].trim()),
  );
  const steps = hasTenStages ? STEP_DEFS : LEGACY_STEP_DEFS;
  if (!matches.length) return { sections: [], steps };

  const sections = matches.map((match, index) => {
    const start = (match.index ?? 0) + match[0].length;
    const end = matches[index + 1]?.index ?? body.length;
    const title = match[1].trim();

    return {
      title,
      body: body.slice(start, end).trim(),
      step: sectionStep(title, steps),
    };
  });
  return { sections, steps };
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

function stripDayPrefix(title: string, day: number): string {
  return title
    .replace(new RegExp(`^Day\\s+0*${day}\\s*[·:-]\\s*`, "i"), "")
    .replace(/^Day\s+\d+\s*[·:-]\s*/i, "");
}

function titleFromBody(body: string, day: number): string {
  const h1 = body.match(/^#\s+(.+)$/m)?.[1]?.trim();
  if (!h1) return `Day ${day}`;
  return stripDayPrefix(h1, day);
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

export const lessons: Lesson[] = [];

export function stepDefsForDay(day: number): readonly StepDefinition[] {
  return (
    lessons.find((lesson) => lesson.day === day)?.steps ??
    (day >= TEN_STAGE_START_DAY ? STEP_DEFS : LEGACY_STEP_DEFS)
  );
}

const manifestLessons: ContentLesson[] = [];
const lessonBodyTasks = new Map<number, Promise<void>>();

let courseVersion = 0;
const courseListeners = new Set<() => void>();

function bumpCourseVersion() {
  courseVersion += 1;
  for (const listener of courseListeners) listener();
}

function subscribeCourseVersion(listener: () => void): () => void {
  courseListeners.add(listener);
  return () => courseListeners.delete(listener);
}

export function useCourseVersion(): number {
  return useSyncExternalStore(subscribeCourseVersion, () => courseVersion);
}

async function loadLessonBody(entry: ContentLesson): Promise<void> {
  const day = entry.number;
  const raw = await fetchContentText(entry.path);
  const body = raw.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "");
  const chapter = Number(entry.chapter || chapterFromBody(body)) || undefined;
  const lab = typeof entry.lab === "string" ? entry.lab : "";
  const labPath = lab && lab !== "rtos-sim" ? lab : undefined;
  const labMode = lab === "rtos-sim" ? ("rtos-sim" as const) : undefined;
  const parsed = splitSections(body);
  const sections = parsed.sections;
  const steps = parsed.steps;
  const labSection = sections.find((section) => section.step === "lab");
  const nextSection = sections.find((section) => /下一步|next/i.test(section.title));
  const main = await fetchMainCpp(day);
  const labCode = main
    ? await bundleExample(`examples/day-${String(day).padStart(3, "0")}/main.cpp`, main)
    : extractCode(labSection);
  const lesson = lessons.find((item) => item.day === day);
  if (!lesson) return;
  Object.assign(lesson, {
    chapter,
    chapterTitle: typeof entry.chapterTitle === "string" ? entry.chapterTitle : undefined,
    title:
      lesson.title === `Day ${day}`
        ? stripDayPrefix(cleanChineseTitle(body, day) || `Day ${day}`, day)
        : lesson.title,
    labPath,
    labMode,
    rtosScenario: typeof entry.rtosScenario === "string" ? entry.rtosScenario : undefined,
    raw: body,
    sections,
    steps,
    labCode,
    labChecklist: extractChecklist(labSection),
    nextSummary: nextSection ? cleanInline(nextSection.body) : undefined,
  });
  bumpCourseVersion();
}

export function ensureLessonBody(day: number): Promise<void> {
  const existing = lessonBodyTasks.get(day);
  if (existing) return existing;
  const entry = manifestLessons.find((item) => item.number === day);
  const task = entry
    ? loadLessonBody(entry).catch(() => undefined)
    : Promise.resolve();
  lessonBodyTasks.set(day, task);
  return task;
}

let repoCompletedDayValue = 0;

export function repoCompletedDay(): number {
  return repoCompletedDayValue;
}
export function nextPlannedDay(): number {
  return repoCompletedDayValue + 1;
}
export function loadLearningPlan(): Promise<string> {
  return fetchContentText("docs/learning-plan.md");
}
export function loadGuideline(): Promise<string> {
  return fetchContentText("guidelines/embedded-cpp-guideline-notes.md");
}
export function loadProgress(): Promise<string> {
  return fetchContentText("progress.md");
}

let hydrating: Promise<void> | null = null;

export function hydrateCourses(): Promise<void> {
  hydrating ??= (async () => {
    const manifest = await loadContentManifest();
    manifestLessons.push(...manifest.lessons);
    for (const entry of manifest.lessons) {
      const day = entry.number;
      const chapter = Number(entry.chapter) || undefined;
      const lab = typeof entry.lab === "string" ? entry.lab : "";
      const labPath = lab && lab !== "rtos-sim" ? lab : undefined;
      const labMode = lab === "rtos-sim" ? ("rtos-sim" as const) : undefined;
      lessons.push({
        day,
        week: Number(entry.week) || Math.ceil(day / 7),
        part: String(entry.part || chapterToPart(chapter) || "").replace(/^Part\s+/i, "") || undefined,
        chapter,
        chapterTitle: typeof entry.chapterTitle === "string" ? entry.chapterTitle : undefined,
        title: stripDayPrefix(entry.title || `Day ${day}`, day),
        duration: Number(entry.duration) || 60,
        status: entry.status || "published",
        topics: entry.topics ?? [],
        guidelines: entry.guidelines ?? [],
        labPath,
        labMode,
        rtosScenario: typeof entry.rtosScenario === "string" ? entry.rtosScenario : undefined,
        path: entry.path,
        raw: "",
        sections: [],
        steps: day >= TEN_STAGE_START_DAY ? STEP_DEFS : LEGACY_STEP_DEFS,
        labCode: undefined,
        labChecklist: [],
        nextSummary: undefined,
      });
    }
    lessons.sort((a, b) => a.day - b.day);
    bumpCourseVersion();
    const progress = await loadProgress();
    repoCompletedDayValue =
      Number(progress.match(/已完成[^\n]*Day\s+(\d+)/i)?.[1]) ||
      Number(progress.match(/同步到\s+\*\*Day\s+(\d+)/i)?.[1]) ||
      Number(progress.match(/Day\s+(\d+)/i)?.[1]) ||
      0;
    bumpCourseVersion();
    // 各课正文在后台并行加载,不阻塞 courseReady;正在阅读的课由 ensureLessonBody 按需优先拉取
    void Promise.allSettled(
      manifestLessons.map((entry) => ensureLessonBody(entry.number)),
    );
  })();
  return hydrating;
}

export const courseReady = hydrateCourses();

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
