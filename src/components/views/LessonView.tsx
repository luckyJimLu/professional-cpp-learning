import { useMemo, useState } from "react";
import { STEP_DEFS, type Lesson, type StepKey } from "../../lib/course";
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
  isDayComplete,
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
    <div className="lesson-layout">
      <aside className="lesson-toc">
        <span className="eyebrow">DAY {lesson.day}</span>
        <h2>{lesson.title}</h2>
        <div className="toc-list">
          {STEP_DEFS.map((step, index) => (
            <button
              className={cx(active === step.key && "is-active")}
              key={step.key}
              onClick={() => navigate(step.key)}
              type="button"
            >
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{step.title}</strong>
              <i>{isStepComplete(lesson.day, step.key) ? "●" : "○"}</i>
            </button>
          ))}
        </div>
      </aside>

      <article className="lesson-document">
        <div className="lesson-title-block">
          <div className="lesson-meta">
            <span>DAY {lesson.day}</span>
            <span>WEEK {lesson.week}</span>
            {lesson.chapter && <span>CHAPTER {lesson.chapter}</span>}
            <span>约 {readingStats.minutes} 分钟阅读 · {readingStats.wordCount.toLocaleString()} 字</span>
          </div>
          <h1>{lesson.title}</h1>
          <CompileRail
            lesson={lesson}
            active={active}
            onSelect={navigate}
            isStepComplete={isStepComplete}
          />
        </div>

        {lesson.sections.map((section) => {
          if (!section.step) return null;
          const definition = STEP_DEFS.find(
            (step) => step.key === section.step,
          )!;
          return (
            <section
              className="lesson-section"
              id={`section-${section.step}`}
              key={section.title}
            >
              <div className="section-heading">
                <div>
                  <span className="eyebrow">{definition.label}</span>
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
                  >
                    Review later
                  </button>
                  <button
                    className={cx(
                      "section-check",
                      isStepComplete(lesson.day, section.step) && "is-complete",
                    )}
                    onClick={() => completeStep(section.step!)}
                    type="button"
                  >
                    {isStepComplete(lesson.day, section.step)
                      ? "✓ Complete"
                      : "Mark complete"}
                  </button>
                </div>
              </div>
              <Markdown>{section.body}</Markdown>
            </section>
          );
        })}

        {isDayComplete(lesson.day) && (
          <section className="build-success">
            <span className="eyebrow">SESSION RESULT</span>
            <h2>BUILD SUCCEEDED</h2>
            <p>Day {lesson.day} completed · concepts · rules · lab · quiz</p>
          </section>
        )}
      </article>

      <aside className="session-panel">
        <span className="eyebrow">SESSION</span>
        <strong>{lesson.duration} min</strong>
        <dl>
          <div>
            <dt>Reading</dt>
            <dd>
              约 {readingStats.minutes} 分钟 ({readingStats.wordCount.toLocaleString()} 字)
            </dd>
          </div>
          <div>
            <dt>Chapter</dt>
            <dd>
              {lesson.chapter
                ? `${lesson.chapter} ${lesson.chapterTitle ?? ""}`
                : "—"}
            </dd>
          </div>
          <div>
            <dt>Part</dt>
            <dd>{lesson.part ? `Part ${lesson.part}` : "—"}</dd>
          </div>
          <div>
            <dt>Source</dt>
            <dd className="mono">{lesson.path}</dd>
          </div>
          <div>
            <dt>Lab</dt>
            <dd className="mono">{lesson.labPath ?? "embedded in Markdown"}</dd>
          </div>
        </dl>
      </aside>
    </div>
  );
}
