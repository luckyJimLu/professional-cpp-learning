import { useEffect, useRef, useState } from "react";
import {
  learningPlan,
  lessonByDay,
  lessons,
  roadmapByWeek,
  type Lesson,
} from "../../lib/course";
import { calculateReadingStats } from "../../lib/readingTime";
import { navigate, useLocationParams } from "../../lib/navigation";
import { PageHeader } from "../common/PageHeader";
import { Markdown } from "../Markdown";

export function LessonsView({
  openLesson,
  isDayComplete,
  currentDay,
}: {
  openLesson: (day: number) => void;
  isDayComplete: (day: number) => boolean;
  currentDay?: number;
}) {
  const params = useLocationParams();
  const query = params.get("courseQuery") ?? "";
  const [draft, setDraft] = useState(query);
  const inputRef = useRef<HTMLInputElement>(null);
  const composingRef = useRef(false);
  const activeTab = params.get("courseTab") === "all" ? "all" : "roadmap";
  const target = lessonByDay(currentDay ?? 1) ?? lessons.at(-1);
  const weeks = roadmapByWeek();
  useEffect(() => setDraft(query), [query]);
  const setQuery = (value: string) =>
    navigate({ courseQuery: value || undefined }, true);
  const filtered = lessons
    .slice()
    .reverse()
    .filter((lesson) => {
      const text =
        `${lesson.title} ${lesson.day} ${lesson.chapter ?? ""}`.toLowerCase();
      return text.includes(query.trim().toLowerCase());
    });
  const row = (lesson: Lesson) => (
    <a
      className="course-row"
      key={lesson.day}
      href={`?view=lesson&day=${lesson.day}`}
      onClick={(event) => {
        if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey)
          return;
        event.preventDefault();
        openLesson(lesson.day);
      }}
    >
      <span className="course-day mono">
        DAY {String(lesson.day).padStart(3, "0")}
      </span>
      <span className="course-row-content">
        <strong>{lesson.title}</strong>
        <small>
          第 {lesson.week} 周 · 约 {calculateReadingStats(lesson.raw).minutes}{" "}
          分钟阅读
        </small>
      </span>
      <span
        className={`course-state ${isDayComplete(lesson.day) ? "is-complete" : ""}`}
        aria-label={isDayComplete(lesson.day) ? "已有完成记录" : "待学习"}
      >
        {isDayComplete(lesson.day) ? "✓" : "→"}
      </span>
    </a>
  );
  return (
    <div className="course-page">
      <PageHeader
        eyebrow="16 周进阶路线与目录"
        title="课程"
        description="按周逐步进阶，或按标题、天数与章节查找。每一课都从理解走向可运行的实验。"
      />
      {target && (
        <section className="course-resume" aria-label="继续学习">
          <div>
            <span className="page-eyebrow">
              {currentDay && !lessonByDay(currentDay)
                ? "最新课程 · 回顾与巩固"
                : "继续学习"}
            </span>
            <strong>
              Day {target.day} · {target.title}
            </strong>
          </div>
          <button
            type="button"
            className="primary-button"
            onClick={() => openLesson(target.day)}
          >
            打开课程 →
          </button>
        </section>
      )}
      <div className="course-toolbar">
        <div className="search-input-row course-search">
          <input
            ref={inputRef}
            type="search"
            value={draft}
            placeholder="标题、天数或章节"
            aria-label="检索课程"
            onCompositionStart={() => {
              composingRef.current = true;
            }}
            onCompositionEnd={(event) => {
              composingRef.current = false;
              setQuery(event.currentTarget.value);
            }}
            onChange={(event) => {
              setDraft(event.target.value);
              if (!composingRef.current) setQuery(event.target.value);
            }}
          />
          {draft && (
            <button
              type="button"
              className="ghost-button"
              aria-label="清空课程搜索"
              onClick={() => {
                setDraft("");
                setQuery("");
                inputRef.current?.focus();
              }}
            >
              清空
            </button>
          )}
        </div>
        <div
          className="course-tab-group"
          role="group"
          aria-label="课程浏览方式"
        >
          <button
            type="button"
            aria-pressed={activeTab === "roadmap"}
            onClick={() => navigate({ courseTab: undefined })}
          >
            按周进阶
          </button>
          <button
            type="button"
            aria-pressed={activeTab === "all"}
            onClick={() => navigate({ courseTab: "all" })}
          >
            完整目录 · {lessons.length}
          </button>
        </div>
      </div>
      {query.trim() ? (
        <section aria-label="课程搜索结果" className="course-search-results">
          <p className="result-summary" role="status">
            找到 {filtered.length} 节课程
          </p>
          {filtered.length ? (
            <div className="course-list">{filtered.map(row)}</div>
          ) : (
            <div className="product-empty">
              <h2>没有找到这节课程</h2>
              <p>试试“指针”“54”或章节编号，也可以清空搜索回到进阶路线。</p>
              <button
                className="ghost-button"
                onClick={() => {
                  setDraft("");
                  setQuery("");
                  inputRef.current?.focus();
                }}
              >
                清空搜索
              </button>
            </div>
          )}
        </section>
      ) : activeTab === "all" ? (
        <div className="course-list">{lessons.map(row)}</div>
      ) : (
        <div className="course-weeks">
          {target && (
            <a className="course-locate" href={`#course-week-${target.week}`}>
              定位当前周 · 第 {target.week} 周 ↓
            </a>
          )}
          {weeks.map((week) => (
            <details
              className="course-week"
              key={week.week}
              id={`course-week-${week.week}`}
              open={week.week === target?.week}
            >
              <summary>
                <span>
                  <strong>
                    第 {week.week} 周
                    {week.week === target?.week ? " · 当前周" : ""}
                  </strong>
                  <span className="course-week-theme">
                    {Array.from(
                      new Set(
                        week.lessons.map(
                          (lesson) => lesson.chapterTitle || lesson.title,
                        ),
                      ),
                    )
                      .slice(0, 2)
                      .join(" / ")}
                  </span>
                  <small>
                    Day {week.lessons[0]?.day}–{week.lessons.at(-1)?.day} ·{" "}
                    {week.lessons.length} 节课程
                  </small>
                </span>
                <span className="course-week-action">
                  展开课程 <span aria-hidden="true">⌄</span>
                </span>
              </summary>
              <div className="course-list">{week.lessons.map(row)}</div>
            </details>
          ))}
        </div>
      )}
      <details className="source-details">
        <summary>查看完整 16 周学习路线</summary>
        <Markdown embedDocument>{learningPlan}</Markdown>
      </details>
    </div>
  );
}
