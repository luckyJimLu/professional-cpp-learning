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
        eyebrow="16-WEEK PATH"
        title="Roadmap"
        description="跟随 Professional C++，从语言基础逐步进入类设计、复用与系统工程。"
      />
      <div className="roadmap">
        {weeks.map((week) => {
          const part = week.lessons.find((lesson) => lesson.part)?.part;
          return (
            <section className="roadmap-week" key={week.week}>
              <div className="week-marker">
                <span>{part ? `PART ${part}` : "COURSE"}</span>
                <strong>Week {String(week.week).padStart(2, "0")}</strong>
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
                      <span className="mono">Day {lesson.day}</span>
                      <strong>{lesson.title}</strong>
                      {lesson.chapter && <small>Ch {lesson.chapter}</small>}
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
              <span>NEXT</span>
              <strong>Day {currentDay}</strong>
            </div>
            <div className="week-lessons">
              <div className="roadmap-placeholder">
                <span className="roadmap-state">○</span>
                <span className="mono">Day {currentDay}</span>
                <strong>{latestNextSummary() ?? "下一课准备中"}</strong>
              </div>
            </div>
          </section>
        )}
      </div>
      <details className="source-details">
        <summary>查看完整 16 周学习计划</summary>
        <Markdown>{learningPlan}</Markdown>
      </details>
    </div>
  );
}
