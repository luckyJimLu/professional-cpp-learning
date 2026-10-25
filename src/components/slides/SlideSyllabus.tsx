import type { SlideDeck, SyllabusLesson } from "../../lib/slides";

export function SlideSyllabus({
  deck,
  syllabus,
  currentSlidePptNum,
  onJumpToPpt,
}: {
  deck: SlideDeck;
  syllabus?: SyllabusLesson;
  currentSlidePptNum?: number;
  onJumpToPpt: (pptNum: number) => void;
}) {
  if (!syllabus) {
    return (
      <div className="slides-card-block">
        <p style={{ color: "var(--muted)" }}>
          大纲文件中未找到与当前课次（第 {deck.lessonNumber} 课）完全匹配的条目。
        </p>
      </div>
    );
  }

  const units = Object.values(syllabus.units).sort(
    (a, b) => a.pptNum - b.pptNum,
  );

  return (
    <div className="slides-syllabus-list">
      <div className="slides-card-block">
        <h3>
          📖 {syllabus.title} · 授课大纲对照
        </h3>
        <p style={{ color: "var(--muted)", margin: 0, fontSize: "14px" }}>
          基于《Modern C++ 软件设计与架构精品课程规划与讲义指南》，保障课件重点内容、图表版式与演讲深度严格贴合大纲规范。
        </p>
      </div>

      {units.map((unit) => {
        const isActive = unit.pptNum === currentSlidePptNum;
        const matchingSlide = deck.slides.find(
          (s) => s.pptNumber === unit.pptNum,
        );

        return (
          <div
            key={unit.pptNum}
            className={`slides-syllabus-card ${isActive ? "is-active-ppt" : ""}`}
          >
            <div className="slides-syllabus-header">
              <span className="slides-syllabus-title">
                PPT {unit.pptNum}: {unit.title}
              </span>
              {matchingSlide && (
                <button
                  type="button"
                  className="slide-ctrl-btn"
                  onClick={() => onJumpToPpt(unit.pptNum)}
                  title={`跳至幻灯片第 ${matchingSlide.index} 页`}
                >
                  跳转至对应课件 (#{matchingSlide.index}) →
                </button>
              )}
            </div>

            {unit.focus && (
              <div className="slides-syllabus-section">
                <div className="slides-syllabus-section-label">🎯 重点内容</div>
                <div style={{ whiteSpace: "pre-line", color: "var(--ink)" }}>
                  {unit.focus}
                </div>
              </div>
            )}

            {unit.presentation && (
              <div className="slides-syllabus-section">
                <div className="slides-syllabus-section-label">📐 呈现方式</div>
                <div style={{ whiteSpace: "pre-line", color: "var(--muted)" }}>
                  {unit.presentation}
                </div>
              </div>
            )}

            {unit.notes && (
              <div className="slides-syllabus-section">
                <div className="slides-syllabus-section-label">🎙️ 演讲要点</div>
                <div
                  style={{
                    whiteSpace: "pre-line",
                    color: "var(--muted)",
                    background: "var(--canvas)",
                    padding: "8px 12px",
                    borderRadius: "6px",
                  }}
                >
                  {unit.notes}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
