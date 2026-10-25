import { useEffect, useRef, useState } from "react";
import type { SlideDeck, SyllabusPptUnit } from "../../lib/slides";
import { SlideRenderer } from "./SlideRenderer";

export function SlideStage({
  deck,
  currentSlideIndex,
  onSlideChange,
  onOpenGrid,
  activePptUnit,
}: {
  deck: SlideDeck;
  currentSlideIndex: number;
  onSlideChange: (index: number) => void;
  onOpenGrid: () => void;
  activePptUnit?: SyllabusPptUnit;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [showNotes, setShowNotes] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const currentSlide =
    deck.slides[currentSlideIndex - 1] ?? deck.slides[0];

  const hasPrev = currentSlideIndex > 1;
  const hasNext = currentSlideIndex < deck.totalSlides;

  const goToPrev = () => {
    if (hasPrev) {
      onSlideChange(currentSlideIndex - 1);
      viewportRef.current?.scrollTo({ top: 0, behavior: "instant" });
    }
  };

  const goToNext = () => {
    if (hasNext) {
      onSlideChange(currentSlideIndex + 1);
      viewportRef.current?.scrollTo({ top: 0, behavior: "instant" });
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current
        .requestFullscreen()
        .then(() => setIsFullscreen(true))
        .catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === containerRef.current);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when user is typing in inputs or selects
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      if (e.key === "ArrowLeft" || e.key === "ArrowUp" || e.key === "PageUp") {
        e.preventDefault();
        goToPrev();
      } else if (
        e.key === "ArrowRight" ||
        e.key === "ArrowDown" ||
        e.key === "PageDown" ||
        e.key === " "
      ) {
        e.preventDefault();
        goToNext();
      } else if (e.key === "Home") {
        e.preventDefault();
        onSlideChange(1);
      } else if (e.key === "End") {
        e.preventDefault();
        onSlideChange(deck.totalSlides);
      } else if (e.key.toLowerCase() === "p") {
        e.preventDefault();
        setShowNotes((prev) => !prev);
      } else if (e.key.toLowerCase() === "f") {
        e.preventDefault();
        toggleFullscreen();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [hasPrev, hasNext, currentSlideIndex, deck.totalSlides]);

  return (
    <div
      ref={containerRef}
      className={`slide-stage-wrapper ${isFullscreen ? "is-fullscreen" : ""}`}
    >
      {/* 幻灯片顶部元信息 */}
      <div className="slide-stage-header">
        <div className="slide-stage-meta">
          <span className="slide-stage-tag">
            {deck.lessonTitle}
          </span>
          {currentSlide.pptNumber !== undefined && (
            <span className="slide-stage-tag" title={activePptUnit?.title}>
              PPT {currentSlide.pptNumber}
              {activePptUnit ? ` · ${activePptUnit.title}` : ""}
            </span>
          )}
          {currentSlide.layout && currentSlide.layout !== "default" && (
            <span className="slide-stage-tag" style={{ opacity: 0.8 }}>
              {currentSlide.layout}
            </span>
          )}
        </div>
        <div className="slide-stage-header-actions">
          <span className="slide-counter">
            {String(currentSlideIndex).padStart(2, "0")} /{" "}
            {String(deck.totalSlides).padStart(2, "0")}
          </span>
          <button
            type="button"
            className="slide-ctrl-btn"
            onClick={onOpenGrid}
            title="全部幻灯片缩略总览"
          >
            🗂️ 缩略图
          </button>
        </div>
      </div>

      {/* 16:9 画布视口 */}
      <div ref={viewportRef} className="slide-canvas-viewport">
        {currentSlide && <SlideRenderer slide={currentSlide} />}
      </div>

      {/* 演讲者备注抽屉 (P) */}
      {showNotes && (
        <div className="slide-notes-drawer" role="region" aria-label="演讲者备注">
          <div className="slide-notes-header">
            <span>🎙️ 演讲者备注 & 教学提示 (Speaker Notes)</span>
            <button
              type="button"
              className="slide-ctrl-btn"
              style={{ minHeight: "24px", padding: "2px 8px", fontSize: "11px" }}
              onClick={() => setShowNotes(false)}
            >
              收起 ✕
            </button>
          </div>
          <div className="slide-notes-content">
            {currentSlide.notes ? (
              currentSlide.notes
            ) : (
              <em style={{ color: "var(--pc-muted)" }}>
                本页暂无单独演讲者备注。
              </em>
            )}
          </div>
        </div>
      )}

      {/* 幻灯片控制栏底栏 */}
      <div className="slide-stage-footer">
        <div className="slide-nav-controls">
          <button
            type="button"
            className="slide-ctrl-btn"
            onClick={goToPrev}
            disabled={!hasPrev}
            title="上一页 (← 或 PageUp)"
          >
            ◀ 上一页
          </button>
          <button
            type="button"
            className="slide-ctrl-btn"
            onClick={goToNext}
            disabled={!hasNext}
            title="下一页 (→ 或 空格)"
          >
            下一页 ▶
          </button>
          <span className="slide-counter">
            {currentSlideIndex} / {deck.totalSlides}
          </span>
          <select
            className="slide-jumper-select"
            value={currentSlideIndex}
            onChange={(e) => onSlideChange(Number(e.target.value))}
            aria-label="快速跳转幻灯片"
          >
            {deck.slides.map((s) => (
              <option key={s.index} value={s.index}>
                {String(s.index).padStart(2, "0")}. {s.title}
              </option>
            ))}
          </select>
        </div>

        <div className="slide-stage-footer-actions">
          <button
            type="button"
            className={`slide-ctrl-btn ${showNotes ? "is-active" : ""}`}
            onClick={() => setShowNotes((prev) => !prev)}
            title="查看演讲者备注 (快捷键 P)"
          >
            🎙️ 备注 {currentSlide.notes ? "●" : ""}
          </button>
          <button
            type="button"
            className="slide-ctrl-btn"
            onClick={toggleFullscreen}
            title="全屏演示 (快捷键 F)"
          >
            {isFullscreen ? "🗗 退出全屏" : "⛶ 全屏"}
          </button>
        </div>
      </div>
    </div>
  );
}
