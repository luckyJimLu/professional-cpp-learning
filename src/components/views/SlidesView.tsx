import { useEffect, useMemo, useState } from "react";
import { Icon } from "../common/Icon";
import { moveTabFocus } from "../../lib/keyboardTabs";
import { PageHeader } from "../common/PageHeader";
import { allSlideDecks, getDeckById, syllabusLessons } from "../../lib/slides";
import { navigate, useLocationParams } from "../../lib/navigation";
import { SlideStage } from "../slides/SlideStage";
import { SlideGrid } from "../slides/SlideGrid";
import { SlideSyllabus } from "../slides/SlideSyllabus";
import { SlidevControls } from "../slides/SlidevControls";
import "../../slides.css";

const TAB_MODES = ["presenter", "grid", "syllabus", "live"] as const;
type TabMode = (typeof TAB_MODES)[number];
const resolveTab = (value: string | null): TabMode =>
  TAB_MODES.includes(value as TabMode) ? (value as TabMode) : "presenter";
const resolveSlide = (value: string | null, total: number) => {
  const parsed = Number(value);
  return Math.max(
    1,
    Math.min(Number.isFinite(parsed) ? Math.trunc(parsed) : 1, total),
  );
};

export function SlidesView() {
  const params = useLocationParams();

  // Read deck and slide parameters from URL
  const requestedDeckId = params.get("deck") || "lesson-01";
  const requestedSlide = params.get("slide");
  const requestedTab = resolveTab(params.get("tab"));

  const selectedDeck = useMemo(
    () => getDeckById(requestedDeckId) || allSlideDecks[0],
    [requestedDeckId],
  );

  const [currentSlideIndex, setCurrentSlideIndex] = useState(() => {
    return resolveSlide(requestedSlide, selectedDeck?.totalSlides || 1);
  });

  const [activeTab, setActiveTab] = useState<TabMode>(requestedTab);

  // Sync state if URL changes
  useEffect(() => {
    setCurrentSlideIndex(
      resolveSlide(params.get("slide"), selectedDeck.totalSlides),
    );
    setActiveTab(resolveTab(params.get("tab")));
  }, [params, selectedDeck.totalSlides]);

  const goToSlide = (index: number, tab: TabMode = "presenter") => {
    setCurrentSlideIndex(index);
    setActiveTab(tab);
    navigate(
      {
        view: "slides",
        deck: selectedDeck.id,
        slide: String(index),
        tab: tab === "presenter" ? undefined : tab,
      },
      true,
    );
  };

  const updateTab = (tab: TabMode) => {
    setActiveTab(tab);
    navigate(
      {
        view: "slides",
        deck: selectedDeck.id,
        slide: String(currentSlideIndex),
        tab: tab === "presenter" ? undefined : tab,
      },
      true,
    );
  };

  const handleDeckChange = (deckId: string) => {
    setCurrentSlideIndex(1);
    navigate(
      {
        view: "slides",
        deck: deckId,
        slide: "1",
        tab: activeTab === "presenter" ? undefined : activeTab,
      },
      false,
    );
  };

  const currentSlide =
    selectedDeck?.slides[currentSlideIndex - 1] ?? selectedDeck?.slides[0];

  const syllabus = syllabusLessons[selectedDeck.lessonNumber];
  const activePptUnit =
    currentSlide?.pptNumber !== undefined && syllabus
      ? syllabus.units[currentSlide.pptNumber]
      : undefined;

  const handleJumpToPpt = (pptNum: number) => {
    const targetSlide = selectedDeck.slides.find((s) => s.pptNumber === pptNum);
    if (targetSlide) {
      goToSlide(targetSlide.index, "presenter");
    }
  };

  return (
    <div className="slides-page reading-page">
      <PageHeader
        title="架构与设计模式课件"
        description="配套工程蓝图风格的交互式幻灯片，深入剖析 C++ 语言机制、依赖管理、设计模式与架构权衡。支持单页演示、缩略图总览、大纲对照及 Slidev 运行时联动。"
      />

      {/* 顶部工具栏：课次选择与视图切换 */}
      <div className="slides-toolbar">
        <div className="slides-deck-select-group">
          <label htmlFor="deck-select" className="slides-deck-select-label">
            选择课程课件：
          </label>
          <select
            id="deck-select"
            className="slides-deck-select"
            value={selectedDeck.id}
            onChange={(e) => handleDeckChange(e.target.value)}
          >
            {allSlideDecks.map((d) => (
              <option key={d.id} value={d.id}>
                {d.lessonTitle} ({d.totalSlides} 页)
              </option>
            ))}
          </select>
        </div>

        <div
          className="slides-view-tabs"
          role="tablist"
          aria-label="课件显示模式"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "presenter"}
            id="slides-tab-presenter"
            aria-controls="slides-panel"
            tabIndex={activeTab === "presenter" ? 0 : -1}
            onKeyDown={moveTabFocus}
            className={`slides-view-tab ${activeTab === "presenter" ? "is-active" : ""}`}
            onClick={() => updateTab("presenter")}
          >
            <Icon id="slides" /> 演示播放
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "grid"}
            id="slides-tab-grid"
            aria-controls="slides-panel"
            tabIndex={activeTab === "grid" ? 0 : -1}
            onKeyDown={moveTabFocus}
            className={`slides-view-tab ${activeTab === "grid" ? "is-active" : ""}`}
            onClick={() => updateTab("grid")}
          >
            <Icon id="grid" /> 缩略图总览
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "syllabus"}
            id="slides-tab-syllabus"
            aria-controls="slides-panel"
            tabIndex={activeTab === "syllabus" ? 0 : -1}
            onKeyDown={moveTabFocus}
            className={`slides-view-tab ${activeTab === "syllabus" ? "is-active" : ""}`}
            onClick={() => updateTab("syllabus")}
          >
            <Icon id="list" /> 授课大纲对照
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "live"}
            id="slides-tab-live"
            aria-controls="slides-panel"
            tabIndex={activeTab === "live" ? 0 : -1}
            onKeyDown={moveTabFocus}
            className={`slides-view-tab ${activeTab === "live" ? "is-active" : ""}`}
            onClick={() => updateTab("live")}
          >
            <Icon id="terminal" /> Slidev 与导出
          </button>
        </div>
      </div>

      {/* 主视图渲染区 */}
      <div
        id="slides-panel"
        className="slides-tab-panel"
        role="tabpanel"
        aria-labelledby={`slides-tab-${activeTab}`}
      >
        {activeTab === "presenter" && (
          <SlideStage
            deck={selectedDeck}
            currentSlideIndex={currentSlideIndex}
            onSlideChange={(idx) => goToSlide(idx, "presenter")}
            onOpenGrid={() => updateTab("grid")}
            activePptUnit={activePptUnit}
          />
        )}

        {activeTab === "grid" && (
          <SlideGrid
            deck={selectedDeck}
            currentSlideIndex={currentSlideIndex}
            onSelectSlide={(idx) => goToSlide(idx, "presenter")}
          />
        )}

        {activeTab === "syllabus" && (
          <SlideSyllabus
            deck={selectedDeck}
            syllabus={syllabus}
            currentSlidePptNum={currentSlide?.pptNumber}
            onJumpToPpt={handleJumpToPpt}
          />
        )}

        {activeTab === "live" && <SlidevControls deck={selectedDeck} />}
      </div>
    </div>
  );
}
