import { STEP_DEFS, type Lesson, type StepKey } from "../../lib/course";

function cx(...values: Array<string | false | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function CompileRail({
  lesson,
  active,
  onSelect,
  isStepComplete,
}: {
  lesson: Lesson;
  active?: StepKey;
  onSelect?: (step: StepKey) => void;
  isStepComplete: (day: number, step: StepKey) => boolean;
}) {
  return (
    <nav
      className="compile-rail lesson-toc"
      aria-label={`Day ${lesson.day} 学习阶段`}
    >
      {STEP_DEFS.map((step, index) => {
        const complete = isStepComplete(lesson.day, step.key);
        const current = active === step.key;
        return (
          <button
            className={cx(
              "rail-step",
              complete && "is-complete",
              current && "is-current",
            )}
            aria-current={current ? "location" : undefined}
            key={step.key}
            onClick={() => onSelect?.(step.key)}
            type="button"
            title={`${step.label} · ${step.title}`}
          >
            <span className="rail-label">{step.label}</span>
            <span className="rail-title">{step.title}</span>
            <span className="rail-track" aria-hidden="true">
              <span className="rail-dot">
                {complete ? "●" : current ? "◐" : "○"}
              </span>
              {index < STEP_DEFS.length - 1 && <span className="rail-line" />}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
