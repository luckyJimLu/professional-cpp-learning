import { useState } from "react";
import { lessons } from "../../lib/course";
import { PageHeader } from "../common/PageHeader";

export function LessonsView({
  openLesson,
  isDayComplete,
}: {
  openLesson: (day: number) => void;
  isDayComplete: (day: number) => boolean;
}) {
  const [filterText, setFilterText] = useState("");

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

  return (
    <div>
      <PageHeader
        eyebrow="COURSE INDEX"
        title="Lessons"
        description="按课程主题选择学习单元，完成阅读、实验和自测。"
      />

      <div className="search-input-row" style={{ maxWidth: 480, marginBottom: 20 }}>
        <input
          type="search"
          placeholder="按标题、天数或章节快速筛选课程..."
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
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

      <div className="lesson-index">
        {filteredLessons.map((lesson) => (
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
              {lesson.chapter
                ? `Chapter ${lesson.chapter}`
                : `Week ${lesson.week}`}
            </span>
            <i>{isDayComplete(lesson.day) ? "●" : "○"}</i>
          </button>
        ))}
      </div>
    </div>
  );
}
