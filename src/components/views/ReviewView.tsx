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
    <div className="review-page">
      <PageHeader
        title="复盘"
        description="从待复习的知识点开始，回到对应课程和实验，再检查是否能独立解释与实现。"
      />
      <section className="review-points" aria-labelledby="review-points-title">
        <div className="section-title-row">
          <h2 id="review-points-title">待复习知识点</h2>
          <span>{weakPoints.length} 项</span>
        </div>
        {weakPoints.length === 0 ? (
          <div className="product-empty">
            <strong>暂时没有待复习项</strong>
            <p>阅读课程时选择“稍后复习”，就可以把不确定的知识点收集到这里。</p>
            <a className="ghost-button" href="?view=lessons">
              浏览课程 →
            </a>
          </div>
        ) : (
          <div className="review-point-list">
            {weakPoints.map((point) => {
              const day = /Day (\d+)/.exec(point)?.[1];
              return (
                <div key={point}>
                  <div>
                    <strong>{point}</strong>
                    {day && (
                      <a href={`?view=lesson&day=${day}`}>返回这节课程 →</a>
                    )}
                  </div>
                  <button
                    className="ghost-button"
                    type="button"
                    onClick={() => removeWeakPoint(point)}
                    aria-label={`移出复习清单：${point}`}
                  >
                    移出清单
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>
      <section className="review-overview" aria-label="学习记录概览">
        <div>
          <span>仓库学习基线与记录</span>
          <strong>Day {completedDay}</strong>
          <small>已发布 {lessons.length} 节</small>
        </div>
        <div>
          <span>当前主线</span>
          <strong>第 {currentChapter || 1} 章</strong>
          <small>{latestNextSummary() ?? `待学习 Day ${nextPlannedDay}`}</small>
        </div>
        <div>
          <span>待复习</span>
          <strong>{weakPoints.length} 个知识点</strong>
          <small>从课程中标记，按需回顾</small>
        </div>
      </section>
      <p className="record-note">
        记录包含仓库已有的学习基线与本浏览器的操作，不代表测评结果或掌握程度。
      </p>
      <section
        className="review-checkpoints"
        aria-labelledby="review-checkpoints-title"
      >
        <div className="section-title-row">
          <h2 id="review-checkpoints-title">每周复盘检查点</h2>
          <span>{reviews.length} 个阶段</span>
        </div>
        <div className="review-checkpoint-grid">
          {reviews.map((lesson) => (
            <a
              key={lesson.day}
              href={`?view=lesson&day=${lesson.day}`}
              className="review-checkpoint"
            >
              <span className="mono">
                DAY {String(lesson.day).padStart(3, "0")}
              </span>
              <h3>{lesson.title}</h3>
              <p>
                {lesson.nextSummary ??
                  "回顾接口契约、生命周期、资源所有权与错误边界。"}
              </p>
              <span className="review-checkpoint-footer">
                <span>
                  {isDayComplete(lesson.day) ? "已有学习记录" : "待复盘"}
                </span>
                <strong>打开复盘 →</strong>
              </span>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
