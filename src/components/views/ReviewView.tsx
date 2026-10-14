import { lessons } from "../../lib/course";
import { PageHeader } from "../common/PageHeader";

export function ReviewView({
  isDayComplete,
  weakPoints,
  removeWeakPoint,
}: {
  isDayComplete: (day: number) => boolean;
  weakPoints: string[];
  removeWeakPoint: (value: string) => void;
}) {
  const reviews = lessons.filter(
    (lesson) => lesson.day % 7 === 0 || /review|复盘/i.test(lesson.title),
  );

  return (
    <div>
      <PageHeader
        eyebrow="RECALL · REVIEW · REBUILD"
        title="Review"
        description="Weekly checkpoints plus the exact lesson stages you marked for another pass."
      />

      <section className="weak-points">
        <div className="weak-points-header">
          <div>
            <span className="eyebrow">WEAK POINTS</span>
            <h2>Review queue</h2>
          </div>
          <span className="mono">{weakPoints.length} queued</span>
        </div>

        {weakPoints.length === 0 ? (
          <p className="empty-state">
            No weak points queued. Use “Review later” beside any lesson stage
            when something still feels uncertain.
          </p>
        ) : (
          <div className="weak-point-list">
            {weakPoints.map((point) => (
              <div key={point}>
                <span>{point}</span>
                <button onClick={() => removeWeakPoint(point)} type="button">
                  Resolved
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="review-list">
        {reviews.map((lesson) => (
          <article key={lesson.day}>
            <span className="mono">DAY {lesson.day}</span>
            <h2>{lesson.title}</h2>
            <p>
              {lesson.nextSummary ??
                "Use this checkpoint to review interfaces, lifetime, ownership and error boundaries."}
            </p>
            <strong>
              {isDayComplete(lesson.day) ? "BUILD SUCCEEDED" : "REVIEW PENDING"}
            </strong>
          </article>
        ))}
      </div>
    </div>
  );
}
