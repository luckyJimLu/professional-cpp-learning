import { lazy, useEffect, useMemo, type ReactNode } from "react";
import { DeferredContent } from "./components/DeferredContent";
import { Shell } from "./components/Shell";
import { NAV, navigate, useLocationParams, type View } from "./lib/navigation";
import { latestLesson, lessonByDay, repoCompletedDay } from "./lib/course";
import { useLearningProgress } from "./lib/progress";

import { TodayView } from "./components/views/TodayView";
import { RoadmapView } from "./components/views/RoadmapView";
import { LessonsView } from "./components/views/LessonsView";
import { LessonView } from "./components/views/LessonView";
import { LabView } from "./components/views/LabView";
import { ReviewView } from "./components/views/ReviewView";
import { GuidelinesView } from "./components/views/GuidelinesView";
import { ProgressView } from "./components/views/ProgressView";
import { VisualizerView } from "./components/views/VisualizerView";

const Topics = lazy(() =>
  import("./components/Topics").then((module) => ({ default: module.Topics })),
);
export const preloadCodeSearch = () => import("./components/CodeSearch");
const CodeSearch = lazy(() =>
  preloadCodeSearch().then((module) => ({
    default: module.CodeSearch,
  })),
);

export default function App() {
  const params = useLocationParams();
  const requestedView = params.get("view");
  const view: View =
    requestedView === "search" ||
    requestedView === "lesson" ||
    NAV.some((item) => item.id === requestedView)
      ? (requestedView as View)
      : "today";
  const setView = (value: View) => navigate({ view: value });
  const selectedDay =
    Number(params.get("day")) || latestLesson()?.day || repoCompletedDay;
  const progress = useLearningProgress();
  const completedDay = Math.max(
    repoCompletedDay,
    ...progress.state.completedDays,
  );
  const currentLearningDay = completedDay + 1;

  const selectedLesson = useMemo(
    () => lessonByDay(selectedDay) ?? latestLesson(),
    [selectedDay],
  );

  useEffect(() => {
    if (typeof window !== "undefined") {
      const idle =
        "requestIdleCallback" in window
          ? (
              window as unknown as {
                requestIdleCallback: (cb: () => void) => number;
              }
            ).requestIdleCallback
          : (cb: () => void) => setTimeout(cb, 1000);
      idle(preloadCodeSearch);
    }
  }, []);

  useEffect(() => {
    const title =
      view === "lesson"
        ? selectedLesson?.title
        : view === "search"
          ? "代码搜索"
          : NAV.find((item) => item.id === view)?.label;
    document.title = `${title ?? "学习文档"} · Professional C++`;
  }, [view, selectedLesson]);

  const openLesson = (day: number) => {
    navigate({ view: "lesson", day: String(day) });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  let page: ReactNode;
  switch (view) {
    case "today":
      page = (
        <TodayView
          currentDay={currentLearningDay}
          openLesson={openLesson}
          isStepComplete={progress.isStepComplete}
        />
      );
      break;
    case "roadmap":
      page = (
        <RoadmapView
          currentDay={currentLearningDay}
          openLesson={openLesson}
          isDayComplete={progress.isDayComplete}
        />
      );
      break;
    case "lessons":
      page = (
        <LessonsView
          openLesson={openLesson}
          isDayComplete={progress.isDayComplete}
        />
      );
      break;
    case "search":
      page = (
        <DeferredContent key="search">
          <CodeSearch />
        </DeferredContent>
      );
      break;
    case "topics":
      page = (
        <DeferredContent key="topics" label="专题知识库">
          <Topics />
        </DeferredContent>
      );
      break;
    case "visualizer":
      page = <VisualizerView />;
      break;
    case "lab":
      page = selectedLesson ? (
        <LabView
          lesson={selectedLesson}
          markStep={progress.markStep}
          isStepComplete={progress.isStepComplete}
        />
      ) : null;
      break;
    case "review":
      page = (
        <ReviewView
          isDayComplete={progress.isDayComplete}
          weakPoints={progress.state.weakPoints}
          removeWeakPoint={progress.removeWeakPoint}
        />
      );
      break;
    case "guidelines":
      page = <GuidelinesView />;
      break;
    case "progress":
      page = (
        <ProgressView
          weakPoints={progress.state.weakPoints}
          isDayComplete={progress.isDayComplete}
        />
      );
      break;
    case "lesson":
      page = selectedLesson ? (
        <LessonView
          key={selectedLesson.day}
          lesson={selectedLesson}
          markStep={progress.markStep}
          isStepComplete={progress.isStepComplete}
          isDayComplete={progress.isDayComplete}
          addWeakPoint={progress.addWeakPoint}
        />
      ) : null;
      break;
  }

  // 纯静态 iframe 嵌入模式：如果带有 ?embed=true，直接全屏沉浸式渲染工作区，无外层侧边栏
  const isEmbed = params.get("embed") === "true";
  if (isEmbed) {
    return (
      <div style={{ width: "100vw", height: "100vh", overflow: "hidden", background: "#090d13" }}>
        {page ?? <VisualizerView />}
      </div>
    );
  }

  return (
    <Shell
      view={view}
      setView={setView}
      currentDay={currentLearningDay}
      onPreloadSearch={preloadCodeSearch}
    >
      {page}
    </Shell>
  );
}
