import { useState, useMemo, useRef } from "react";
import { Icon } from "../common/Icon";
import type { SlideDeck } from "../../lib/slides";

export function SlideGrid({
  deck,
  currentSlideIndex,
  onSelectSlide,
}: {
  deck: SlideDeck;
  currentSlideIndex: number;
  onSelectSlide: (index: number) => void;
}) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const clearQuery = () => {
    setQuery("");
    inputRef.current?.focus();
  };

  const filteredSlides = useMemo(() => {
    if (!query.trim()) return deck.slides;
    const lower = query.toLowerCase();
    return deck.slides.filter(
      (s) =>
        s.title.toLowerCase().includes(lower) ||
        s.canvas.toLowerCase().includes(lower) ||
        s.notes.toLowerCase().includes(lower),
    );
  }, [deck.slides, query]);

  return (
    <div className="slides-grid-wrapper">
      <div className="slides-grid-filter">
        <label htmlFor="slide-filter" className="slides-filter-label">
          <Icon id="search" /> 筛选课件
        </label>
        <input
          ref={inputRef}
          id="slide-filter"
          type="search"
          className="slides-grid-input"
          placeholder="按标题或内容搜索幻灯片..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="筛选幻灯片"
        />
        {query && (
          <button
            type="button"
            className="ghost-button"
            onClick={clearQuery}
            aria-label="清除课件筛选"
          >
            <Icon id="close" /> 清除
          </button>
        )}
        <span className="slides-filter-count" aria-live="polite">
          显示 {filteredSlides.length} / {deck.totalSlides} 页
        </span>
      </div>

      {filteredSlides.length === 0 && (
        <div className="slides-grid-empty" role="status">
          <h3>没有匹配的幻灯片</h3>
          <p>换个关键词，或清除筛选查看全部课件。</p>
          <button type="button" className="ghost-button" onClick={clearQuery}>
            清除筛选
          </button>
        </div>
      )}
      <div className="slides-grid">
        {filteredSlides.map((slide) => {
          const isCurrent = slide.index === currentSlideIndex;
          return (
            <button
              type="button"
              key={slide.index}
              className={`slide-card-item ${isCurrent ? "is-current" : ""}`}
              onClick={() => onSelectSlide(slide.index)}
              aria-current={isCurrent ? "page" : undefined}
            >
              <div className="slide-card-top">
                <span className="slide-card-num">
                  #{String(slide.index).padStart(2, "0")}
                </span>
                <div style={{ display: "flex", gap: "6px" }}>
                  {slide.pptNumber !== undefined && (
                    <span className="slide-stage-tag">
                      PPT {slide.pptNumber}
                    </span>
                  )}
                  {slide.layout && slide.layout !== "default" && (
                    <span className="slide-stage-tag" style={{ opacity: 0.7 }}>
                      {slide.layout}
                    </span>
                  )}
                </div>
              </div>

              <div className="slide-card-title">{slide.title}</div>

              <div className="slide-card-snippet">
                {slide.subtitle ||
                  slide.canvas
                    .replace(/<[^>]*>/g, " ")
                    .replace(/#+\s+/g, "")
                    .slice(0, 120)}
              </div>

              <div
                style={{
                  marginTop: "12px",
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "11px",
                  color: "var(--muted)",
                }}
              >
                <span>{slide.notes ? "含讲义备注" : ""}</span>
                <span style={{ color: "var(--blue)" }}>进入演示 →</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
