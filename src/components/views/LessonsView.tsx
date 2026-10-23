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

const WEEK_ZH_THEMES: Record<number, string> = {
  1: "从 C 到现代 C++ 基础与状态建模",
  2: "字符串视图、生命周期与编码风格",
  3: "工程边界、错误处理与可测试架构",
  4: "抽象契约、耦合内聚与类不变式",
  5: "对象组合、所有权与多态虚拟接口",
  6: "继承边界、切片防御与 Mixin 组合",
  7: "代码复用、泛型模板与防御性检查",
  8: "易用接口设计、受众边界与 SOLID",
  9: "智能指针、动态内存与资源分配边界",
};

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
        eyebrow="章节里程碑与课程目录"
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
        <div className="course-toolbar-actions">
          {target && !query.trim() && activeTab === "roadmap" && (
            <a className="course-locate" href={`#course-week-${target.week}`}>
              定位当前周 · 第 {target.week} 周 ↓
            </a>
          )}
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
          {weeks.map((week) => {
            const isCurrentWeek = week.week === target?.week;
            const completedInWeek = week.lessons.filter((l) =>
              isDayComplete(l.day),
            ).length;
            const isWeekComplete =
              week.lessons.length > 0 &&
              completedInWeek === week.lessons.length;
            const zhTheme = WEEK_ZH_THEMES[week.week];
            const enTheme = Array.from(
              new Set(
                week.lessons.map(
                  (lesson) => lesson.chapterTitle || lesson.title,
                ),
              ),
            )
              .slice(0, 2)
              .join(" / ");

            return (
              <details
                className={`course-week ${isCurrentWeek ? "is-current-week" : ""} ${isWeekComplete ? "is-week-complete" : ""}`}
                key={week.week}
                id={`course-week-${week.week}`}
                open={isCurrentWeek}
              >
                <summary>
                  <span>
                    <span className="course-week-heading-row">
                      <strong>
                        第 {week.week} 周
                        {zhTheme ? ` · ${zhTheme}` : ""}
                      </strong>
                      {isCurrentWeek && (
                        <span className="week-badge is-current">进行中</span>
                      )}
                      {isWeekComplete && (
                        <span className="week-badge is-complete">
                          ✓ 已学完 {completedInWeek}/{week.lessons.length}
                        </span>
                      )}
                      {!isWeekComplete && completedInWeek > 0 && (
                        <span className="week-badge">
                          已学 {completedInWeek}/{week.lessons.length}
                        </span>
                      )}
                    </span>
                    <span className="course-week-theme">{enTheme}</span>
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
            );
          })}
        </div>
      )}
      <details className="source-details">
        <summary>查看章节里程碑与原始路线</summary>
        <Markdown embedDocument>{learningPlan}</Markdown>
      </details>
    </div>
  );
}
