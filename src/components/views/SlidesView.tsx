import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "../common/PageHeader";
import {
  allSlideDecks,
  getDeckById,
  syllabusLessons,
} from "../../lib/slides";
import { navigate, useLocationParams } from "../../lib/navigation";
import { SlideStage } from "../slides/SlideStage";
import { SlideGrid } from "../slides/SlideGrid";
import { SlideSyllabus } from "../slides/SlideSyllabus";
import { SlidevControls } from "../slides/SlidevControls";
import "../../slides.css";

type TabMode = "presenter" | "grid" | "syllabus" | "live";

export function SlidesView() {
  const params = useLocationParams();

  // Read deck and slide parameters from URL
  const requestedDeckId = params.get("deck") || "lesson-01";
  const requestedSlide = Number(params.get("slide")) || 1;
  const requestedTab = (params.get("tab") as TabMode) || "presenter";

  const selectedDeck = useMemo(
    () => getDeckById(requestedDeckId) || allSlideDecks[0],
    [requestedDeckId],
  );

  const [currentSlideIndex, setCurrentSlideIndex] = useState(() => {
    return Math.max(
      1,
      Math.min(requestedSlide, selectedDeck?.totalSlides || 1),
    );
  });

  const [activeTab, setActiveTab] = useState<TabMode>(requestedTab);

  // Sync state if URL changes
  useEffect(() => {
    const slideParam = params.get("slide");
    if (slideParam) {
      const num = Number(slideParam);
      if (num >= 1 && num <= selectedDeck.totalSlides) {
        setCurrentSlideIndex(num);
      }
    }
    const tabParam = params.get("tab") as TabMode | null;
    if (
      tabParam &&
      ["presenter", "grid", "syllabus", "live"].includes(tabParam)
    ) {
      setActiveTab(tabParam);
    } else if (!tabParam) {
      setActiveTab("presenter");
    }
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
    const targetSlide = selectedDeck.slides.find(
      (s) => s.pptNumber === pptNum,
    );
    if (targetSlide) {
      goToSlide(targetSlide.index, "presenter");
    }
  };

  return (
    <div className="slides-page reading-page">
      <PageHeader
        eyebrow="工程蓝图课件 · Slidev"
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
                {d.lessonTitle} · {d.title} ({d.totalSlides} 页)
              </option>
            ))}
          </select>
        </div>

        <div className="slides-view-tabs" role="tablist" aria-label="课件显示模式">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "presenter"}
            className={`slides-view-tab ${activeTab === "presenter" ? "is-active" : ""}`}
            onClick={() => updateTab("presenter")}
          >
            🖥️ 演示播放
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "grid"}
            className={`slides-view-tab ${activeTab === "grid" ? "is-active" : ""}`}
            onClick={() => updateTab("grid")}
          >
            🗂️ 缩略图总览
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "syllabus"}
            className={`slides-view-tab ${activeTab === "syllabus" ? "is-active" : ""}`}
            onClick={() => updateTab("syllabus")}
          >
            📋 授课大纲对照
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "live"}
            className={`slides-view-tab ${activeTab === "live" ? "is-active" : ""}`}
            onClick={() => updateTab("live")}
          >
            ⚡ Slidev 与导出
          </button>
        </div>
      </div>

      {/* 主视图渲染区 */}
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
  );
}
