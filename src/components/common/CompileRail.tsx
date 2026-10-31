import { STEP_DEFS, type Lesson, type StepKey } from "../../lib/course";
import { cn } from "@/lib/utils";

export function CompileRail({
  lesson,
  active,
  onSelect,
  isStepComplete,
  className,
}: {
  lesson: Lesson;
  active?: StepKey;
  onSelect?: (step: StepKey) => void;
  isStepComplete: (day: number, step: StepKey) => boolean;
  className?: string;
}) {
  return (
    <nav
      className={cn("compile-rail lesson-toc", className)}
      aria-label={`Day ${lesson.day} 学习阶段`}
    >
      {STEP_DEFS.map((step, index) => {
        const complete = isStepComplete(lesson.day, step.key);
        const current = active === step.key;
        return (
          <button
            className={cn(
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
