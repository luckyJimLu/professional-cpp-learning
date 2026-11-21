import { lazy, Suspense, useEffect, useState } from "react";
import { Shell } from "./components/Shell";
import { TodayView } from "./components/views/TodayView";
import { LessonsView } from "./components/views/LessonsView";
import { LessonView } from "./components/views/LessonView";
import { ReviewView } from "./components/views/ReviewView";
import { TopicsView } from "./components/views/TopicsView";
import { GuidelinesView } from "./components/views/GuidelinesView";
import { FaqView } from "./components/views/FaqView";
import {
  courseReady,
  ensureLessonBody,
  latestLesson,
  lessonByDay,
  lessons,
  nextPlannedDay,
  repoCompletedDay,
  useCourseVersion,
} from "./lib/course";
import {
  NAV,
  VIEW_ALIASES,
  navigate,
  useLocationParams,
  type View,
} from "./lib/navigation";
import { useLearningProgress } from "./lib/progress";
import { hydrateSearch } from "./lib/search";

const SlidesView = lazy(() =>
  import("./components/views/SlidesView").then((m) => ({
    default: m.SlidesView,
  })),
);
const BookletsView = lazy(() =>
  import("./components/views/BookletsView").then((m) => ({
    default: m.BookletsView,
  })),
);
const LabView = lazy(() =>
  import("./components/views/LabView").then((m) => ({
    default: m.LabView,
  })),
);
const CodeSearchView = lazy(() =>
  import("./components/views/CodeSearchView").then((m) => ({
    default: m.CodeSearchView,
  })),
);
const VisualizerView = lazy(() =>
  import("./components/views/VisualizerView").then((m) => ({
    default: m.VisualizerView,
  })),
);
const XianTuView = lazy(() =>
  import("./components/views/XianTuView").then((m) => ({
    default: m.XianTuView,
  })),
);

const LAST_LESSON_STORAGE_KEY = "professional-cpp-learning:last-lesson-day";

const VALID_VIEWS = new Set<string>([
  ...NAV.map((item) => item.id),
  "lesson",
  "search",
  "visualizer",
]);

function readLastLessonDay(): number | undefined {
  try {
    const raw = window.localStorage.getItem(LAST_LESSON_STORAGE_KEY);
    if (!raw) return undefined;
    const parsed = Number(raw);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function saveLastLessonDay(day: number) {
  try {
    window.localStorage.setItem(LAST_LESSON_STORAGE_KEY, String(day));
  } catch {
    // Ignore storage restrictions.
  }
}

function resolveView(rawView: string | null): View {
  const key = rawView?.trim() || "today";
  const aliased = VIEW_ALIASES[key] ?? key;
  return VALID_VIEWS.has(aliased) ? (aliased as View) : "today";
}

function ViewFallback() {
  return (
    <div className="p-8 text-sm text-[var(--muted)]" role="status">
      正在加载模块…
    </div>
  );
}

export function App() {
  const params = useLocationParams();
  useCourseVersion();

  const [ready, setReady] = useState(lessons.length > 0);
  const [lastLessonDay, setLastLessonDay] = useState<number | undefined>(() =>
    readLastLessonDay(),
  );

  const {
    markStep,
    isDayComplete,
    isStepComplete,
    addWeakPoint,
    removeWeakPoint,
    state: progressState,
  } = useLearningProgress();

  useEffect(() => {
    let active = true;
    void courseReady.then(() => {
      if (active) setReady(true);
    });
    return () => {
      active = false;
    };
  }, []);

  const view = resolveView(params.get("view"));
  const isEmbed = params.get("embed") === "true";

  const publishedDay = latestLesson()?.day ?? Math.max(repoCompletedDay(), lessons.length);
  const plannedDay = nextPlannedDay();
  const currentDay = lessonByDay(plannedDay) ? plannedDay : publishedDay || 1;

  const requestedDay = Number(params.get("day"));
  const activeDay =
    Number.isInteger(requestedDay) && requestedDay > 0
      ? requestedDay
      : (lastLessonDay ?? currentDay);

  const activeLesson =
    lessonByDay(activeDay) ?? lessonByDay(currentDay) ?? latestLesson();

  useEffect(() => {
    if ((view === "lesson" || view === "lab") && activeLesson) {
      void ensureLessonBody(activeLesson.day);
    }
  }, [view, activeLesson]);

  useEffect(() => {
    const navLabel = NAV.find((item) => item.id === view)?.label;
    let pageTitle = "学习指南";
    if (view === "lesson" && activeLesson) {
      pageTitle = `Day ${activeLesson.day} · ${activeLesson.title}`;
    } else if (view === "search") {
      pageTitle = "代码搜索";
    } else if (view === "visualizer") {
      pageTitle = "内存可视化";
    } else if (navLabel) {
      pageTitle = navLabel;
    }
    document.title = `${pageTitle} · Professional C++`;
  }, [view, activeLesson]);

  const setView = (nextView: View) => {
    navigate({ view: nextView });
  };

  const openLesson = (day: number) => {
    setLastLessonDay(day);
    saveLastLessonDay(day);
    navigate({ view: "lesson", day: String(day) });
  };

  if (view === "visualizer" && isEmbed) {
    return (
      <Suspense fallback={<ViewFallback />}>
        <VisualizerView />
      </Suspense>
    );
  }

  const renderView = () => {
    if (view === "xiantu") {
      return (
        <Suspense fallback={<ViewFallback />}>
          <XianTuView />
        </Suspense>
      );
    }

    if (!ready && lessons.length === 0 && ["today", "lessons", "lesson", "lab", "review"].includes(view)) {
      return <ViewFallback />;
    }

    switch (view) {
      case "today":
        return (
          <TodayView
            currentDay={currentDay}
            lastLessonDay={lastLessonDay}
            openLesson={openLesson}
            isStepComplete={isStepComplete}
          />
        );
      case "lessons":
      case "roadmap":
        return (
          <LessonsView
            openLesson={openLesson}
            isDayComplete={isDayComplete}
            currentDay={currentDay}
          />
        );
      case "lesson":
        return activeLesson ? (
          <LessonView
            key={activeLesson.day}
            lesson={activeLesson}
            markStep={markStep}
            isStepComplete={isStepComplete}
            isDayComplete={isDayComplete}
            addWeakPoint={addWeakPoint}
          />
        ) : (
          <ViewFallback />
        );
      case "slides":
        return (
          <Suspense fallback={<ViewFallback />}>
            <SlidesView />
          </Suspense>
        );
      case "review":
      case "progress":
        return (
          <ReviewView
            isDayComplete={isDayComplete}
            weakPoints={progressState.weakPoints}
            removeWeakPoint={removeWeakPoint}
          />
        );
      case "topics":
        return <TopicsView />;
      case "booklets":
        return (
          <Suspense fallback={<ViewFallback />}>
            <BookletsView />
          </Suspense>
        );
      case "guidelines":
        return <GuidelinesView />;
      case "faq":
        return <FaqView />;
      case "lab":
        return activeLesson ? (
          <Suspense fallback={<ViewFallback />}>
            <LabView
              key={activeLesson.day}
              lesson={activeLesson}
              markStep={markStep}
              isStepComplete={isStepComplete}
            />
          </Suspense>
        ) : (
          <ViewFallback />
        );
      case "search":
        return (
          <Suspense fallback={<ViewFallback />}>
            <CodeSearchView />
          </Suspense>
        );
      case "visualizer":
        return (
          <Suspense fallback={<ViewFallback />}>
            <VisualizerView />
          </Suspense>
        );
      default:
        return (
          <TodayView
            currentDay={currentDay}
            lastLessonDay={lastLessonDay}
            openLesson={openLesson}
            isStepComplete={isStepComplete}
          />
        );
    }
  };

  return (
    <Shell
      view={view}
      setView={setView}
      publishedDay={publishedDay}
      onPreloadSearch={() => void hydrateSearch()}
    >
      {renderView()}
    </Shell>
  );
}

export default App;
