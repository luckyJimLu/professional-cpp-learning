import {
  latestNextSummary,
  learningPlan,
  lessonByDay,
  roadmapByWeek,
} from "../../lib/course";
import { PageHeader } from "../common/PageHeader";
import { Markdown } from "../Markdown";

export function RoadmapView({
  currentDay,
  openLesson,
  isDayComplete,
}: {
  currentDay: number;
  openLesson: (day: number) => void;
  isDayComplete: (day: number) => boolean;
}) {
  const weeks = roadmapByWeek();
  return (
    <div>
      <PageHeader
        eyebrow="16 周进阶路径"
        title="学习路线图"
        description="跟随 Professional C++，从语言基础逐步进入类设计、复用与系统工程。"
      />
      <div className="roadmap">
        {weeks.map((week) => {
          return (
            <section className="roadmap-week" key={week.week}>
              <div className="week-marker">
                <span>阶段 {week.week}</span>
                <strong>第 {week.week} 周</strong>
              </div>
              <div className="week-lessons">
                {week.lessons.map((lesson) => {
                  const complete = isDayComplete(lesson.day);
                  const current = lesson.day === currentDay && !complete;
                  return (
                    <button
                      key={lesson.day}
                      onClick={() => openLesson(lesson.day)}
                      type="button"
                    >
                      <span className="roadmap-state">
                        {complete ? "●" : current ? "◐" : "○"}
                      </span>
                      <span className="mono">第 {lesson.day} 天</span>
                      <strong>{lesson.title}</strong>
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
        {!lessonByDay(currentDay) && (
          <section className="roadmap-week upcoming">
            <div className="week-marker">
              <span>下一阶段</span>
              <strong>第 {currentDay} 天</strong>
            </div>
            <div className="week-lessons">
              <div className="roadmap-placeholder">
                <span className="roadmap-state">○</span>
                <span className="mono">第 {currentDay} 天</span>
                <strong>{latestNextSummary() ?? "下一课准备中"}</strong>
              </div>
            </div>
          </section>
        )}
      </div>
      <details className="source-details">
        <summary>查看完整 16 周学习路线规划</summary>
        <Markdown>{learningPlan}</Markdown>
      </details>
    </div>
  );
}
