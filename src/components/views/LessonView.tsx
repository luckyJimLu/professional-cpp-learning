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

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash.startsWith("section-")) {
      document.getElementById(hash)?.scrollIntoView();
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) {
          const stepKey = visible[0].target.id.replace(
            "section-",
            "",
          ) as StepKey;
          setActive(stepKey);
        }
      },
      { rootMargin: "-120px 0px -50% 0px", threshold: 0.1 },
    );

    STEP_DEFS.forEach((step) => {
      const el = document.getElementById(`section-${step.key}`);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [lesson.day]);

  const navigate = (step: StepKey) => {
    setActive(step);
    document.getElementById(`section-${step}`)?.scrollIntoView({
      behavior: "smooth",
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
                  <span className="eyebrow">{definition.label} · {definition.title}</span>
                  <h2>{section.title}</h2>
                </div>
                <div className="section-actions">
                  <button
                    className="review-later"
                    onClick={() =>
                      addWeakPoint(
                        `Day ${lesson.day} · ${definition.title} · ${lesson.title}`,
                      )
                    }
                    type="button"
                    title="加入复盘薄弱点清单"
                  >
                    稍后复习
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
              <Markdown>{section.body}</Markdown>
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
