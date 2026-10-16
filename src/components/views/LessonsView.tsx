import { useState } from "react";
import {
  latestNextSummary,
  learningPlan,
  lessonByDay,
  lessons,
  roadmapByWeek,
} from "../../lib/course";
import { calculateReadingStats } from "../../lib/readingTime";
import { PageHeader } from "../common/PageHeader";
import { Markdown } from "../Markdown";

export function LessonsView({
  openLesson,
  isDayComplete,
  currentDay,
}: {
  openLesson: (day: number) => void;
  isDayComplete: (day: number) => boolean;
  currentDay?: number;
}) {
  const [filterText, setFilterText] = useState("");
  const [activeTab, setActiveTab] = useState<"roadmap" | "all">("roadmap");
  const weeks = roadmapByWeek();

  const filteredLessons = lessons
    .slice()
    .reverse()
    .filter((lesson) => {
      if (!filterText.trim()) return true;
      const term = filterText.toLowerCase();
      return (
        lesson.title.toLowerCase().includes(term) ||
        String(lesson.day).includes(term) ||
        (lesson.chapter && String(lesson.chapter).includes(term))
      );
    });

  const isSearching = filterText.trim().length > 0;

  return (
    <div>
      <PageHeader
        eyebrow="16 周进阶路线与目录"
        title="课程"
        description="系统化从 C 思维进阶到 Modern C++ 架构。可按周循序渐进，也可按天数或主题检索。"
      />

      <div className="course-toolbar" style={{ display: "flex", gap: "12px", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", marginBottom: "20px" }}>
        <div className="search-input-row" style={{ maxWidth: 420, flex: 1, margin: 0 }}>
          <input
            type="search"
            placeholder="按标题、天数或章节检索课程..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            aria-label="检索课程"
          />
          {filterText && (
            <button
              type="button"
              className="ghost-button"
              onClick={() => setFilterText("")}
            >
              清空
            </button>
          )}
        </div>

        {!isSearching && (
          <div className="course-tab-group" role="tablist" style={{ display: "inline-flex", gap: "4px", background: "rgba(0, 0, 0, 0.05)", padding: "3px", borderRadius: "8px" }}>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "roadmap"}
              className={`course-tab-btn ghost-button ${activeTab === "roadmap" ? "is-active" : ""}`}
              onClick={() => setActiveTab("roadmap")}
              style={activeTab === "roadmap" ? { background: "var(--surface, #fff)", fontWeight: 600, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" } : { border: "none" }}
            >
              按周进阶路线
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "all"}
              className={`course-tab-btn ghost-button ${activeTab === "all" ? "is-active" : ""}`}
              onClick={() => setActiveTab("all")}
              style={activeTab === "all" ? { background: "var(--surface, #fff)", fontWeight: 600, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" } : { border: "none" }}
            >
              完整目录 ({lessons.length})
            </button>
          </div>
        )}
      </div>

      {isSearching ? (
        <div className="lesson-index">
          {filteredLessons.length === 0 ? (
            <p className="empty-state">未找到匹配 "{filterText}" 的课程。</p>
          ) : (
            filteredLessons.map((lesson) => (
              <button
                key={lesson.day}
                onClick={() => openLesson(lesson.day)}
                type="button"
              >
                <span className="mono">
                  DAY {String(lesson.day).padStart(3, "0")}
                </span>
                <strong>{lesson.title}</strong>
                <span>
                  第 {lesson.week} 周 · 约 {calculateReadingStats(lesson.raw).minutes} 分钟阅读
                </span>
                <i>{isDayComplete(lesson.day) ? "●" : "○"}</i>
              </button>
            ))
          )}
        </div>
      ) : activeTab === "roadmap" ? (
        <div className="roadmap">
          {weeks.map((week) => (
            <section className="roadmap-week" key={week.week}>
              <div className="week-marker">
                <span>阶段 {week.week}</span>
                <strong>第 {week.week} 周</strong>
              </div>
              <div className="week-lessons">
                {week.lessons.map((lesson) => {
                  const complete = isDayComplete(lesson.day);
                  const current = currentDay !== undefined && lesson.day === currentDay && !complete;
                  return (
                    <button
                      key={lesson.day}
                      onClick={() => openLesson(lesson.day)}
                      type="button"
                    >
                      <span className="roadmap-state">
                        {complete ? "●" : current ? "◐" : "○"}
                      </span>
                      <span className="mono">
                        DAY {String(lesson.day).padStart(3, "0")}
                      </span>
                      <strong>{lesson.title}</strong>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
          {currentDay !== undefined && !lessonByDay(currentDay) && (
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
      ) : (
        <div className="lesson-index">
          {lessons.map((lesson) => (
            <button
              key={lesson.day}
              onClick={() => openLesson(lesson.day)}
              type="button"
            >
              <span className="mono">
                DAY {String(lesson.day).padStart(3, "0")}
              </span>
              <strong>{lesson.title}</strong>
              <span>
                第 {lesson.week} 周 · 约 {calculateReadingStats(lesson.raw).minutes} 分钟阅读
              </span>
              <i>{isDayComplete(lesson.day) ? "●" : "○"}</i>
            </button>
          ))}
        </div>
      )}

      <details className="source-details">
        <summary>查看完整 16 周学习路线规划文档</summary>
        <Markdown>{learningPlan}</Markdown>
      </details>
    </div>
  );
}
