import {
  latestNextSummary,
  lessons,
  nextPlannedDay,
  repoCompletedDay,
} from "../../lib/course";
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
  const completed = lessons.filter((lesson) => isDayComplete(lesson.day));
  const completedDay = Math.max(
    repoCompletedDay,
    ...completed.map((lesson) => lesson.day),
  );
  const currentChapter = Math.max(
    ...completed.map((lesson) => lesson.chapter ?? 0),
    0,
  );

  const reviews = lessons.filter(
    (lesson) => lesson.day % 7 === 0 || /review|复盘/i.test(lesson.title),
  );

  return (
    <div>
      <PageHeader
        eyebrow="学习进度与复盘"
        title="复盘"
        description="跟踪学习进度闭环，回顾薄弱点清单，完成每周工程里程碑复盘。"
      />

      <section
        className="progress-card"
        style={{
          background: "var(--surface, #fff)",
          border: "1px solid var(--line, #e2e8f0)",
          borderRadius: "12px",
          padding: "20px 24px",
          marginBottom: "28px",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "20px",
            alignItems: "center",
          }}
        >
          <div>
            <span
              className="eyebrow"
              style={{ display: "block", marginBottom: "4px" }}
            >
              当前进度
            </span>
            <strong
              style={{
                fontSize: "24px",
                fontFamily: "var(--mono, monospace)",
                color: "var(--blue, #00599c)",
              }}
            >
              Day {completedDay}
            </strong>
            <span
              style={{ fontSize: "14px", color: "#64748b", marginLeft: "8px" }}
            >
              / 已发布 {lessons.length} 节
            </span>
            <div
              className="mini-progress"
              style={{
                marginTop: "10px",
                height: "6px",
                background: "rgba(0,0,0,0.06)",
                borderRadius: "3px",
                overflow: "hidden",
              }}
            >
              <i
                style={{
                  display: "block",
                  height: "100%",
                  background: "var(--green, #18794e)",
                  width: `${Math.min(100, (completed.length / lessons.length) * 100)}%`,
                }}
              />
            </div>
          </div>

          <div>
            <span
              className="eyebrow"
              style={{ display: "block", marginBottom: "4px" }}
            >
              正在进行
            </span>
            <strong style={{ fontSize: "18px" }}>第 {currentChapter || 1} 章</strong>
            <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#64748b" }}>
              {latestNextSummary() ?? `待学习 Day ${nextPlannedDay}`}
            </p>
          </div>

          <div>
            <span
              className="eyebrow"
              style={{ display: "block", marginBottom: "4px" }}
            >
              待复习阶段
            </span>
            <strong
              style={{
                fontSize: "18px",
                color: weakPoints.length > 0 ? "var(--amber, #b35c00)" : "inherit",
              }}
            >
              {weakPoints.length} 个
            </strong>
            <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#64748b" }}>
              {weakPoints.length > 0
                ? "标记了稍后复习的知识点"
                : "当前无待复习记录"}
            </p>
          </div>
        </div>
      </section>

      <section className="weak-points">
        <div className="weak-points-header">
          <div>
            <span className="eyebrow">薄弱点清单</span>
            <h2>待复习阶段</h2>
          </div>
          <span className="mono">{weakPoints.length} 待复习</span>
        </div>

        {weakPoints.length === 0 ? (
          <p className="empty-state">
            暂无待复习项。在课程阅读中遇到不确定的阶段时，点击「稍后复习」即可加入此列表。
          </p>
        ) : (
          <div className="weak-point-list">
            {weakPoints.map((point) => (
              <div key={point}>
                <span>{point}</span>
                <button onClick={() => removeWeakPoint(point)} type="button">
                  已掌握 ✓
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <div style={{ marginTop: "32px" }}>
        <span
          className="eyebrow"
          style={{ display: "block", marginBottom: "8px" }}
        >
          CHECKPOINTS
        </span>
        <h2 style={{ margin: "0 0 16px 0", fontSize: "20px" }}>
          每周复盘检查点
        </h2>
        <div className="review-list">
          {reviews.map((lesson) => (
            <article key={lesson.day}>
              <span className="mono">DAY {lesson.day}</span>
              <h2>{lesson.title}</h2>
              <p>
                {lesson.nextSummary ??
                  "复盘本周在接口契约、生命周期、资源所有权与错误边界的理解。"}
              </p>
              <strong>
                {isDayComplete(lesson.day) ? "已通过" : "待复盘"}
              </strong>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
