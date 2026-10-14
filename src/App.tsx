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

const Topics = lazy(() =>
  import("./components/Topics").then((module) => ({ default: module.Topics })),
);
const CodeSearch = lazy(() =>
  import("./components/CodeSearch").then((module) => ({
    default: module.CodeSearch,
  })),
);

export default function App() {
  const params = useLocationParams();
  const requestedView = params.get("view");
  const view: View =
    requestedView === "lesson" || NAV.some((item) => item.id === requestedView)
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
    const title =
      view === "lesson"
        ? selectedLesson?.title
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

  return (
    <Shell view={view} setView={setView} currentDay={currentLearningDay}>
      {page}
    </Shell>
  );
}
