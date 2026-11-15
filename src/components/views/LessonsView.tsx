import { useEffect, useRef, useState } from "react";
import {
  SLIDE_ENABLED_DAYS,
  WEEK_ZH_THEMES,
} from "../../data/courseMetadata";
import { useAsyncContent } from "../../hooks/useAsyncContent";
import {
  loadLearningPlan,
  lessonByDay,
  lessons,
  roadmapByWeek,
  type Lesson,
} from "../../lib/course";
import { calculateReadingStats } from "../../lib/readingTime";
import { navigate, useLocationParams } from "../../lib/navigation";
import { PageHeader } from "../common/PageHeader";
import { Markdown } from "../markdown/Markdown";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

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
  const {
    data: learningPlan,
    status: planStatus,
    retry: retryPlan,
  } = useAsyncContent(loadLearningPlan, "", []);
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
          第 {lesson.week} 周 · 约{" "}
          {(lesson.stats ?? calculateReadingStats(lesson.raw)).minutes} 分钟阅读
          {SLIDE_ENABLED_DAYS.has(lesson.day) && (
            <span
              style={{
                marginLeft: "8px",
                color: "var(--blue)",
                fontWeight: 600,
              }}
              title="本课包含配套 Slidev 工程蓝图课件"
            >
              · 配套课件 ↗
            </span>
          )}
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
    <div className="course-page docs-layout today-layout">
      <div className="guide-document">
        <PageHeader
          title="课程"
          description="按周逐步进阶，或按标题、天数与章节查找。每一课都从理解走向可运行的实验。"
        />
        {target && (
          <Card
            asChild
            className="course-resume guide-current-lesson"
            aria-label="继续学习"
          >
            <section>
              <div className="guide-current-main">
                <div className="guide-current-top">
                  <span className="page-eyebrow">
                    {currentDay && !lessonByDay(currentDay)
                      ? "最新课程 · 回顾与巩固"
                      : "继续学习"}
                  </span>
                  <Badge variant="outline" className="guide-current-badge mono font-normal">
                    第 {target.week} 周 · 课程共 {lessons.length} 节
                  </Badge>
                </div>
                <strong>
                  Day {target.day} · {target.title}
                </strong>
              </div>
              <Button
                type="button"
                className="primary-button"
                onClick={() => openLesson(target.day)}
              >
                打开课程 →
              </Button>
            </section>
          </Card>
        )}
      <div className="course-toolbar">
        <search className="search-input-row course-search" aria-label="课程搜索">
          <Input
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
            <Button
              type="button"
              variant="outline"
              className="ghost-button"
              aria-label="清空课程搜索"
              onClick={() => {
                setDraft("");
                setQuery("");
                inputRef.current?.focus();
              }}
            >
              清空
            </Button>
          )}
        </search>
        <div className="course-toolbar-actions">
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
              <Button
                type="button"
                variant="outline"
                className="ghost-button"
                onClick={() => {
                  setDraft("");
                  setQuery("");
                  inputRef.current?.focus();
                }}
              >
                清空搜索
              </Button>
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
                        第 {week.week} 周{zhTheme ? ` · ${zhTheme}` : ""}
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
        <details className="source-details" id="course-plan">
          <summary>查看章节里程碑与原始路线</summary>
          {planStatus === "loading" ? (
            <p className="product-loading" role="status">
              正在加载学习路线…
            </p>
          ) : planStatus === "error" ? (
            <div className="topic-notice" role="alert">
              <p>学习路线加载失败，请检查网络后重试。</p>
              <button
                type="button"
                className="ghost-button"
                onClick={retryPlan}
              >
                重新加载
              </button>
            </div>
          ) : (
            <Markdown embedDocument>{learningPlan}</Markdown>
          )}
        </details>
      </div>

      <aside className="today-aside" aria-label="课程周次导航">
        <div className="today-aside-card">
          <span className="page-eyebrow">周次导航</span>
          <nav aria-label="课程周次跳转" className="today-aside-nav">
            {weeks.map((week) => (
              <a key={week.week} href={`#course-week-${week.week}`}>
                第 {week.week} 周 · Day {week.lessons[0]?.day}–
                {week.lessons.at(-1)?.day}
              </a>
            ))}
            <a href="#course-plan">章节里程碑与原始路线</a>
          </nav>
        </div>
      </aside>
    </div>
  );
}
