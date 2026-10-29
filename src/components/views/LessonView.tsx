import { useEffect, useMemo, useState } from "react";
import {
  STEP_DEFS,
  lessonByDay,
  type Lesson,
  type StepKey,
} from "../../lib/course";
import { calculateReadingStats } from "../../lib/readingTime";
import { CompileRail } from "../common/CompileRail";
import { Markdown } from "../Markdown";
import { navigate as navigateRoute } from "../../lib/navigation";
import {
  resolveContentHref,
  resolveContentNavigation,
} from "../../lib/contentNavigation";

function cx(...values: Array<string | false | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function LessonView({
  lesson,
  markStep,
  isStepComplete,
  isDayComplete: _isDayComplete,
  addWeakPoint,
}: {
  lesson: Lesson;
  markStep: (day: number, step: StepKey) => void;
  isStepComplete: (day: number, step: StepKey) => boolean;
  isDayComplete: (day: number) => boolean;
  addWeakPoint: (value: string) => void;
}) {
  const firstIncomplete =
    STEP_DEFS.find((step) => !isStepComplete(lesson.day, step.key))?.key ??
    "pass";
  const [active, setActive] = useState<StepKey>(firstIncomplete);
  const [queuedReview, setQueuedReview] = useState<Set<StepKey>>(new Set());
  useEffect(() => setQueuedReview(new Set()), [lesson.day]);

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash.startsWith("section-")) {
      document.getElementById(hash)?.scrollIntoView();
    }

    const sections = STEP_DEFS.flatMap((step) => {
      const element = document.getElementById(`section-${step.key}`);
      return element ? [{ key: step.key, element }] : [];
    });
    let frame = 0;
    const update = () => {
      frame = 0;
      // Section height must not decide whether a long chapter is current.
      const passed = sections.filter(
        ({ element }) =>
          element.getBoundingClientRect().top <=
          (Number.parseFloat(getComputedStyle(element).scrollMarginTop) ||
            100) +
            2,
      );
      const atBottom =
        window.scrollY > 0 &&
        window.scrollY + window.innerHeight >=
          document.documentElement.scrollHeight - 2;
      const current = atBottom
        ? sections.at(-1)
        : (passed.at(-1) ?? sections[0]);
      if (current) setActive(current.key);
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    const observer = new ResizeObserver(schedule);
    const article = document.querySelector(".lesson-document");
    if (article) observer.observe(article);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      observer.disconnect();
    };
  }, [lesson.day]);

  const navigate = (step: StepKey) => {
    setActive(step);
    document.getElementById(`section-${step}`)?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
      block: "start",
    });
  };

  const completeStep = (step: StepKey) => {
    markStep(lesson.day, step);
    const index = STEP_DEFS.findIndex((item) => item.key === step);
    const next = STEP_DEFS[index + 1]?.key;
    if (next) {
      window.setTimeout(() => navigate(next), 120);
    }
  };

  const readingStats = useMemo(
    () => calculateReadingStats(lesson.raw),
    [lesson.raw],
  );

  return (
    <div className="lesson-layout lesson-layout-single">
      <article className="lesson-document">
        <header className="lesson-title-block">
          <div className="lesson-meta">
            <span>DAY {lesson.day}</span>
            <span>第 {lesson.week} 周</span>
            {lesson.chapter && <span>第 {lesson.chapter} 章</span>}
            <span>
              约 {readingStats.minutes} 分钟阅读 ·{" "}
              {readingStats.wordCount.toLocaleString()} 字
            </span>
          </div>
          <h1>{lesson.title}</h1>
          <div className="lesson-rail-sticky">
            <CompileRail
              lesson={lesson}
              active={active}
              onSelect={navigate}
              isStepComplete={isStepComplete}
            />
          </div>
        </header>

        {lesson.sections.map((section) => {
          if (!section.step) return null;
          const definition = STEP_DEFS.find(
            (step) => step.key === section.step,
          )!;
          const complete = isStepComplete(lesson.day, section.step);
          return (
            <section
              className="lesson-section"
              id={`section-${section.step}`}
              key={section.title}
            >
              <div className="section-heading">
                <div>
                  <span className="eyebrow">
                    {definition.label} · {definition.title}
                  </span>
                  <h2>{section.title}</h2>
                </div>
                <div className="section-actions">
                  <button
                    className="review-later"
                    aria-pressed={queuedReview.has(section.step!)}
                    onClick={() => {
                      addWeakPoint(
                        `Day ${lesson.day} · ${definition.title} · ${lesson.title}`,
                      );
                      setQueuedReview((previous) =>
                        new Set(previous).add(section.step!),
                      );
                    }}
                    type="button"
                    title="加入复盘薄弱点清单"
                  >
                    {queuedReview.has(section.step!)
                      ? "已加入复习"
                      : "稍后复习"}
                  </button>
                  <button
                    className={cx("section-check", complete && "is-complete")}
                    onClick={() => completeStep(section.step!)}
                    type="button"
                  >
                    {complete ? "✓ 已完成" : "完成本节"}
                  </button>
                </div>
              </div>
              <Markdown
                sourcePath={lesson.path}
                resolveHref={(href) => resolveContentHref(lesson.path, href)}
                onNavigate={(href) => {
                  const target = resolveContentNavigation(lesson.path, href);
                  if (!target) return false;
                  navigateRoute(target);
                  return true;
                }}
              >
                {section.body}
              </Markdown>
            </section>
          );
        })}

        <footer className="lesson-footer">
          <div className="lesson-source-bar">
            <a
              href={`https://github.com/luckyJimLu/professional-cpp-learning/blob/main/${lesson.path}`}
              target="_blank"
              rel="noreferrer"
              className="ghost-button"
            >
              在 GitHub 查看本课 Markdown 源码
            </a>
          </div>

          <nav className="lesson-pagination" aria-label="相邻课程">
            {lessonByDay(lesson.day - 1) && (
              <a href={`?view=lesson&day=${lesson.day - 1}`}>
                ← 上一课 · Day {lesson.day - 1}
              </a>
            )}
            {lessonByDay(lesson.day + 1) && (
              <a href={`?view=lesson&day=${lesson.day + 1}`}>
                下一课 · Day {lesson.day + 1} →
              </a>
            )}
          </nav>
        </footer>
      </article>
    </div>
  );
}
