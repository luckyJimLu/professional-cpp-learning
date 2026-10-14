import {
  latestLesson,
  latestNextSummary,
  lessonByDay,
  type StepKey,
} from "../../lib/course";
import { PageHeader } from "../common/PageHeader";
import { CompileRail } from "../common/CompileRail";

export function TodayView({
  currentDay,
  openLesson,
  isStepComplete,
}: {
  currentDay: number;
  openLesson: (day: number) => void;
  isStepComplete: (day: number, step: StepKey) => boolean;
}) {
  const planned = lessonByDay(currentDay);
  const latestPublished = latestLesson();
  const baseline = lessonByDay(currentDay - 1);
  const nextSummary = latestNextSummary();

  if (!latestPublished) {
    return <PageHeader eyebrow="TODAY" title="No lessons published yet" />;
  }

  const target = planned ?? latestPublished;

  return (
    <div className="today-page">
      <PageHeader
        eyebrow="TODAY"
        title={
          planned
            ? `Continue Day ${planned.day}`
            : `Day ${currentDay} · Ready for content`
        }
        description={
          planned
            ? "One focused session. Read → recall → refactor → compile."
            : "下一课尚未发布，可以复习最近课程并完成实验。"
        }
      />

      <section className="hero-card">
        <div className="hero-copy">
          <div className="lesson-meta">
            <span>DAY {planned?.day ?? currentDay}</span>
            <span>WEEK {planned?.week ?? Math.ceil(currentDay / 7)}</span>
            <span>
              {planned?.chapter ? `CHAPTER ${planned.chapter}` : "NEXT"}
            </span>
          </div>

          <h2>{planned?.title ?? `Next learning unit · Day ${currentDay}`}</h2>
          <p className="hero-summary">
            {planned
              ? (planned.nextSummary ??
                "Continue the current Professional C++ learning path.")
              : nextSummary ||
                "Continue Chapter 5 with polymorphism, virtual interface cost, and embedded trade-offs."}
          </p>

          <div className="session-row">
            <span className="mono">{planned?.duration ?? 60} min session</span>
            <span className="muted">
              {planned ? "课程已发布" : "下一课准备中"}
            </span>
          </div>

          <button
            className="primary-button"
            onClick={() => openLesson(target.day)}
            type="button"
          >
            {planned
              ? "Continue learning →"
              : `Review Day ${latestPublished.day} →`}
          </button>
        </div>

        <div className="hero-pipeline">
          <div className="terminal-caption">
            <span>compile.pipeline</span>
            <span>{planned ? "ACTIVE" : "WAITING FOR SOURCE"}</span>
          </div>
          <CompileRail
            lesson={target}
            active={
              planned
                ? target.sections.find((section) => section.step)?.step
                : undefined
            }
            isStepComplete={isStepComplete}
          />
          <div className="build-line">
            <span className="build-prompt">$</span>
            <span>
              {planned
                ? `lesson --day ${planned.day} --mode focused`
                : `review --day ${latestPublished.day} --mode focused`}
            </span>
          </div>
        </div>
      </section>

      <section className="focus-grid">
        <article>
          <span className="eyebrow">COMPLETED BASELINE</span>
          <strong>Day {currentDay - 1}</strong>
          <p>{baseline?.title ?? "已完成课程"}</p>
        </article>
        <article>
          <span className="eyebrow">NEXT ACTION</span>
          <strong>
            {planned ? "Continue" : `复习 Day ${latestPublished.day}`}
          </strong>
          <p>
            {planned
              ? "Resume at the first incomplete compile-rail stage."
              : "复习上一课，整理仍不确定的概念与实验结果。"}
          </p>
        </article>
        <article>
          <span className="eyebrow">学习方法</span>
          <strong>阅读 → 实践 → 自测</strong>
          <p>先解释概念，再运行实验，最后用自测检查理解。</p>
        </article>
      </section>
    </div>
  );
}
