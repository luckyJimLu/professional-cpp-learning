import { useMemo, useState, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  STEP_DEFS,
  guideline,
  latestLesson,
  latestNextSummary,
  learningPlan,
  lessonByDay,
  lessons,
  nextPlannedDay,
  repoCompletedDay,
  roadmapByWeek,
  type Lesson,
  type StepKey,
} from "./lib/course";
import { useLearningProgress } from "./lib/progress";

type View =
  | "today"
  | "roadmap"
  | "lessons"
  | "lab"
  | "review"
  | "guidelines"
  | "progress"
  | "lesson";

const NAV: Array<{ id: Exclude<View, "lesson">; label: string; short: string }> = [
  { id: "today", label: "Today", short: "Today" },
  { id: "roadmap", label: "Roadmap", short: "Roadmap" },
  { id: "lessons", label: "Lessons", short: "Lessons" },
  { id: "lab", label: "Lab", short: "Lab" },
  { id: "review", label: "Review", short: "Review" },
  { id: "guidelines", label: "Guidelines", short: "Rules" },
  { id: "progress", label: "Progress", short: "Progress" },
];

function cx(...values: Array<string | false | undefined>) {
  return values.filter(Boolean).join(" ");
}

function Markdown({ children, className = "" }: { children: string; className?: string }) {
  return (
    <div className={cx("markdown", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  );
}

function CompileRail({
  lesson,
  active,
  onSelect,
  isStepComplete,
}: {
  lesson: Lesson;
  active?: StepKey;
  onSelect?: (step: StepKey) => void;
  isStepComplete: (day: number, step: StepKey) => boolean;
}) {
  return (
    <div className="compile-rail" aria-label={`Day ${lesson.day} learning pipeline`}>
      {STEP_DEFS.map((step, index) => {
        const complete = isStepComplete(lesson.day, step.key);
        const current = active === step.key;
        return (
          <button
            className={cx("rail-step", complete && "is-complete", current && "is-current")}
            key={step.key}
            onClick={() => onSelect?.(step.key)}
            type="button"
          >
            <span className="rail-label">{step.label}</span>
            <span className="rail-track" aria-hidden="true">
              <span className="rail-dot">{complete ? "●" : current ? "◐" : "○"}</span>
              {index < STEP_DEFS.length - 1 && <span className="rail-line" />}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function Shell({
  view,
  setView,
  currentDay,
  children,
}: {
  view: View;
  setView: (view: View) => void;
  currentDay: number;
  children: ReactNode;
}) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">C++</span>
          <div>
            <strong>Professional C++</strong>
            <span>Learning Console</span>
          </div>
        </div>

        <nav className="side-nav" aria-label="Primary navigation">
          {NAV.map((item) => (
            <button
              className={cx("nav-item", view === item.id && "is-active")}
              key={item.id}
              onClick={() => setView(item.id)}
              type="button"
            >
              <span>{item.label}</span>
              {item.id === "today" && <small>Day {currentDay}</small>}
            </button>
          ))}
        </nav>

        <div className="sidebar-status">
          <span>Repository baseline</span>
          <strong>Day {repoCompletedDay} / 112</strong>
          <div className="mini-progress">
            <i style={{ width: `${Math.min(100, (repoCompletedDay / 112) * 100)}%` }} />
          </div>
        </div>
      </aside>

      <div className="main-shell">
        <header className="mobile-header">
          <div className="brand compact">
            <span className="brand-mark">C++</span>
            <strong>Professional C++</strong>
          </div>
          <span className="mono">Day {currentDay}</span>
        </header>
        <main className="content">{children}</main>
        <nav className="bottom-nav" aria-label="Mobile navigation">
          {NAV.filter((item) => ["today", "roadmap", "lab", "progress"].includes(item.id)).map(
            (item) => (
              <button
                className={cx(view === item.id && "is-active")}
                key={item.id}
                onClick={() => setView(item.id)}
                type="button"
              >
                {item.short}
              </button>
            ),
          )}
        </nav>
      </div>
    </div>
  );
}

function PageHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <header className="page-header">
      <span className="eyebrow">{eyebrow}</span>
      <h1>{title}</h1>
      {description && <p>{description}</p>}
    </header>
  );
}

function Today({
  currentDay,
  openLesson,
  isStepComplete,
}: {
  currentDay: number;
  openLesson: (day: number) => void;
  isStepComplete: (day: number, step: StepKey) => boolean;
}) {
  const planned = lessonByDay(currentDay);
  const latestPublished = latestLesson();
  const baseline = lessonByDay(currentDay - 1);
  const nextSummary = latestNextSummary();

  if (!latestPublished) {
    return <PageHeader eyebrow="TODAY" title="No lessons published yet" />;
  }

  const target = planned ?? latestPublished;

  return (
    <div className="today-page">
      <PageHeader
        eyebrow="TODAY"
        title={planned ? `Continue Day ${planned.day}` : `Day ${currentDay} · Ready for content`}
        description={
          planned
            ? "One focused session. Read → recall → refactor → compile."
            : "The UI is already following repository progress. Publish the next Markdown lesson and it appears here automatically."
        }
      />

      <section className="hero-card">
        <div className="hero-copy">
          <div className="lesson-meta">
            <span>DAY {planned?.day ?? currentDay}</span>
            <span>WEEK {planned?.week ?? Math.ceil(currentDay / 7)}</span>
            <span>{planned?.chapter ? `CHAPTER ${planned.chapter}` : "NEXT"}</span>
          </div>

          <h2>{planned?.title ?? `Next learning unit · Day ${currentDay}`}</h2>
          <p className="hero-summary">
            {planned
              ? planned.nextSummary ?? "Continue the current Professional C++ learning path."
              : nextSummary ||
                "Continue Chapter 5 with polymorphism, virtual interface cost, and embedded trade-offs."}
          </p>

          <div className="session-row">
            <span className="mono">{planned?.duration ?? 60} min session</span>
            <span className="muted">
              {planned ? "Markdown source available" : "Next Markdown not published yet"}
            </span>
          </div>

          <button
            className="primary-button"
            onClick={() => openLesson(target.day)}
            type="button"
          >
            {planned ? "Continue learning →" : `Review Day ${latestPublished.day} →`}
          </button>
        </div>

        <div className="hero-pipeline">
          <div className="terminal-caption">
            <span>compile.pipeline</span>
            <span>{planned ? "ACTIVE" : "WAITING FOR SOURCE"}</span>
          </div>
          <CompileRail
            lesson={target}
            active={planned ? target.sections.find((section) => section.step)?.step : undefined}
            isStepComplete={isStepComplete}
          />
          <div className="build-line">
            <span className="build-prompt">$</span>
            <span>
              {planned
                ? `lesson --day ${planned.day} --mode focused`
                : `next --day ${currentDay} --source daily/day-${String(currentDay).padStart(3, "0")}-*.md`}
            </span>
          </div>
        </div>
      </section>

      <section className="focus-grid">
        <article>
          <span className="eyebrow">COMPLETED BASELINE</span>
          <strong>Day {currentDay - 1}</strong>
          <p>{baseline?.title ?? "Repository completion baseline"}</p>
        </article>
        <article>
          <span className="eyebrow">NEXT ACTION</span>
          <strong>{planned ? "Continue" : `Publish Day ${currentDay}`}</strong>
          <p>
            {planned
              ? "Resume at the first incomplete compile-rail stage."
              : "No frontend change is required when the lesson is added."}
          </p>
        </article>
        <article>
          <span className="eyebrow">CONTENT MODEL</span>
          <strong>Markdown first</strong>
          <p>Daily lessons remain the source of truth; the console only adds learning state.</p>
        </article>
      </section>
    </div>
  );
}

function LessonView({
  lesson,
  markStep,
  isStepComplete,
  isDayComplete,
  addWeakPoint,
}: {
  lesson: Lesson;
  markStep: (day: number, step: StepKey) => void;
  isStepComplete: (day: number, step: StepKey) => boolean;
  isDayComplete: (day: number) => boolean;
  addWeakPoint: (value: string) => void;
}) {
  const firstIncomplete =
    STEP_DEFS.find((step) => !isStepComplete(lesson.day, step.key))?.key ?? "pass";
  const [active, setActive] = useState<StepKey>(firstIncomplete);

  const navigate = (step: StepKey) => {
    setActive(step);
    document.getElementById(`section-${step}`)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const completeStep = (step: StepKey) => {
    markStep(lesson.day, step);
    const index = STEP_DEFS.findIndex((item) => item.key === step);
    const next = STEP_DEFS[index + 1]?.key;
    if (next) {
      window.setTimeout(() => navigate(next), 120);
    }
  };

  return (
    <div className="lesson-layout">
      <aside className="lesson-toc">
        <span className="eyebrow">DAY {lesson.day}</span>
        <h2>{lesson.title}</h2>
        <div className="toc-list">
          {STEP_DEFS.map((step, index) => (
            <button
              className={cx(active === step.key && "is-active")}
              key={step.key}
              onClick={() => navigate(step.key)}
              type="button"
            >
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{step.title}</strong>
              <i>{isStepComplete(lesson.day, step.key) ? "●" : "○"}</i>
            </button>
          ))}
        </div>
      </aside>

      <article className="lesson-document">
        <div className="lesson-title-block">
          <div className="lesson-meta">
            <span>DAY {lesson.day}</span>
            <span>WEEK {lesson.week}</span>
            {lesson.chapter && <span>CHAPTER {lesson.chapter}</span>}
          </div>
          <h1>{lesson.title}</h1>
          <CompileRail
            lesson={lesson}
            active={active}
            onSelect={navigate}
            isStepComplete={isStepComplete}
          />
        </div>

        {lesson.sections.map((section) => {
          if (!section.step) return null;
          const definition = STEP_DEFS.find((step) => step.key === section.step)!;
          return (
            <section className="lesson-section" id={`section-${section.step}`} key={section.title}>
              <div className="section-heading">
                <div>
                  <span className="eyebrow">{definition.label}</span>
                  <h2>{section.title}</h2>
                </div>
                <div className="section-actions">
                  <button
                    className="review-later"
                    onClick={() =>
                      addWeakPoint(
                        `Day ${lesson.day} · ${definition.title} · ${lesson.title}`,
                      )
                    }
                    type="button"
                  >
                    Review later
                  </button>
                  <button
                    className={cx(
                      "section-check",
                      isStepComplete(lesson.day, section.step) && "is-complete",
                    )}
                    onClick={() => completeStep(section.step!)}
                    type="button"
                  >
                    {isStepComplete(lesson.day, section.step) ? "✓ Complete" : "Mark complete"}
                  </button>
                </div>
              </div>
              <Markdown>{section.body}</Markdown>
            </section>
          );
        })}

        {isDayComplete(lesson.day) && (
          <section className="build-success">
            <span className="eyebrow">SESSION RESULT</span>
            <h2>BUILD SUCCEEDED</h2>
            <p>Day {lesson.day} completed · concepts · rules · lab · quiz</p>
          </section>
        )}
      </article>

      <aside className="session-panel">
        <span className="eyebrow">SESSION</span>
        <strong>{lesson.duration} min</strong>
        <dl>
          <div>
            <dt>Chapter</dt>
            <dd>{lesson.chapter ? `${lesson.chapter} ${lesson.chapterTitle ?? ""}` : "—"}</dd>
          </div>
          <div>
            <dt>Part</dt>
            <dd>{lesson.part ? `Part ${lesson.part}` : "—"}</dd>
          </div>
          <div>
            <dt>Source</dt>
            <dd className="mono">{lesson.path}</dd>
          </div>
          <div>
            <dt>Lab</dt>
            <dd className="mono">{lesson.labPath ?? "embedded in Markdown"}</dd>
          </div>
        </dl>
      </aside>
    </div>
  );
}

function Roadmap({
  currentDay,
  openLesson,
  isDayComplete,
}: {
  currentDay: number;
  openLesson: (day: number) => void;
  isDayComplete: (day: number) => boolean;
}) {
  const weeks = roadmapByWeek();
  return (
    <div>
      <PageHeader
        eyebrow="16-WEEK PATH"
        title="Roadmap"
        description="A vertical execution path, not a card catalog. Course order remains aligned with Professional C++."
      />
      <div className="roadmap">
        {weeks.map((week) => {
          const part = week.lessons.find((lesson) => lesson.part)?.part;
          return (
            <section className="roadmap-week" key={week.week}>
              <div className="week-marker">
                <span>{part ? `PART ${part}` : "COURSE"}</span>
                <strong>Week {String(week.week).padStart(2, "0")}</strong>
              </div>
              <div className="week-lessons">
                {week.lessons.map((lesson) => {
                  const complete = isDayComplete(lesson.day);
                  const current = lesson.day === currentDay && !complete;
                  return (
                    <button key={lesson.day} onClick={() => openLesson(lesson.day)} type="button">
                      <span className="roadmap-state">{complete ? "●" : current ? "◐" : "○"}</span>
                      <span className="mono">Day {lesson.day}</span>
                      <strong>{lesson.title}</strong>
                      {lesson.chapter && <small>Ch {lesson.chapter}</small>}
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
        <section className="roadmap-week upcoming">
          <div className="week-marker">
            <span>NEXT</span>
            <strong>Day {nextPlannedDay}</strong>
          </div>
          <div className="week-lessons">
            <div className="roadmap-placeholder">
              <span className="roadmap-state">○</span>
              <span className="mono">Day {currentDay}</span>
              <strong>{latestNextSummary() ?? "Waiting for next Markdown lesson"}</strong>
            </div>
          </div>
        </section>
      </div>
      <details className="source-details">
        <summary>View canonical 16-week source plan</summary>
        <Markdown>{learningPlan}</Markdown>
      </details>
    </div>
  );
}

function Lessons({
  openLesson,
  isDayComplete,
}: {
  openLesson: (day: number) => void;
  isDayComplete: (day: number) => boolean;
}) {
  return (
    <div>
      <PageHeader
        eyebrow="COURSE INDEX"
        title="Lessons"
        description="Generated directly from daily/*.md. No lesson cards are hard-coded in the frontend."
      />
      <div className="lesson-index">
        {lessons
          .slice()
          .reverse()
          .map((lesson) => (
            <button key={lesson.day} onClick={() => openLesson(lesson.day)} type="button">
              <span className="mono">DAY {String(lesson.day).padStart(3, "0")}</span>
              <strong>{lesson.title}</strong>
              <span>{lesson.chapter ? `Chapter ${lesson.chapter}` : `Week ${lesson.week}`}</span>
              <i>{isDayComplete(lesson.day) ? "●" : "○"}</i>
            </button>
          ))}
      </div>
    </div>
  );
}

function Lab({
  lesson,
  markStep,
  isStepComplete,
}: {
  lesson: Lesson;
  markStep: (day: number, step: StepKey) => void;
  isStepComplete: (day: number, step: StepKey) => boolean;
}) {
  const lab = lesson.sections.find((section) => section.step === "lab");
  const [hint, setHint] = useState(false);
  const code = lesson.labCode ?? "// This lesson has no extracted C++ example yet.";

  return (
    <div>
      <PageHeader
        eyebrow={`DAY ${lesson.day} · LAB`}
        title="Compile Mode"
        description="Phase 1 reads the repository source directly. Browser-side compilation can be added later without changing the content contract."
      />
      <div className="lab-shell">
        <section className="lab-task">
          <div className="panel-title">
            <span>TASK</span>
            <span className="mono">{lesson.duration} min lesson</span>
          </div>
          <h2>{lesson.title}</h2>
          {lab ? <Markdown>{lab.body.replace(/```[\s\S]*?```/g, "")}</Markdown> : <p>No lab section found.</p>}

          {lesson.labChecklist.length > 0 && (
            <div className="checklist">
              <span className="eyebrow">CHECKLIST</span>
              {lesson.labChecklist.map((item) => (
                <label key={item}>
                  <input type="checkbox" /> <span>{item}</span>
                </label>
              ))}
            </div>
          )}

          <div className="lab-actions">
            <button className="ghost-button" onClick={() => setHint((value) => !value)} type="button">
              {hint ? "Hide hint" : "Reveal hint"}
            </button>
            <button className="primary-button" onClick={() => markStep(lesson.day, "lab")} type="button">
              {isStepComplete(lesson.day, "lab") ? "✓ Lab complete" : "Mark lab complete"}
            </button>
          </div>

          {hint && (
            <div className="hint">
              {lesson.sections.find((section) => section.step === "rules") ? (
                <Markdown>
                  {lesson.sections.find((section) => section.step === "rules")!.body}
                </Markdown>
              ) : (
                "Re-read the lesson rules and use them as the review checklist for this lab."
              )}
            </div>
          )}
        </section>

        <section className="code-panel">
          <div className="panel-title">
            <span>{lesson.labPath ?? `day-${String(lesson.day).padStart(3, "0")}/main.cpp`}</span>
            <span>C++23</span>
          </div>
          <pre>
            <code>{code}</code>
          </pre>
          <footer>
            <span>-Wall</span>
            <span>-Wextra</span>
            <span>-Wconversion</span>
            <span>-Wpedantic</span>
          </footer>
        </section>
      </div>
    </div>
  );
}

function Review({
  isDayComplete,
  weakPoints,
  removeWeakPoint,
}: {
  isDayComplete: (day: number) => boolean;
  weakPoints: string[];
  removeWeakPoint: (value: string) => void;
}) {
  const reviews = lessons.filter(
    (lesson) => lesson.day % 7 === 0 || /review|复盘/i.test(lesson.title),
  );

  return (
    <div>
      <PageHeader
        eyebrow="RECALL · REVIEW · REBUILD"
        title="Review"
        description="Weekly checkpoints plus the exact lesson stages you marked for another pass."
      />

      <section className="weak-points">
        <div className="weak-points-header">
          <div>
            <span className="eyebrow">WEAK POINTS</span>
            <h2>Review queue</h2>
          </div>
          <span className="mono">{weakPoints.length} queued</span>
        </div>

        {weakPoints.length === 0 ? (
          <p className="empty-state">
            No weak points queued. Use “Review later” beside any lesson stage when something still
            feels uncertain.
          </p>
        ) : (
          <div className="weak-point-list">
            {weakPoints.map((point) => (
              <div key={point}>
                <span>{point}</span>
                <button onClick={() => removeWeakPoint(point)} type="button">
                  Resolved
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="review-list">
        {reviews.map((lesson) => (
          <article key={lesson.day}>
            <span className="mono">DAY {lesson.day}</span>
            <h2>{lesson.title}</h2>
            <p>
              {lesson.nextSummary ??
                "Use this checkpoint to review interfaces, lifetime, ownership and error boundaries."}
            </p>
            <strong>{isDayComplete(lesson.day) ? "BUILD SUCCEEDED" : "REVIEW PENDING"}</strong>
          </article>
        ))}
      </div>
    </div>
  );
}

function Guidelines() {
  return (
    <div>
      <PageHeader
        eyebrow="ENGINEERING RULES"
        title="Embedded C++ Guidelines"
        description="Rendered from guidelines/embedded-cpp-guideline-notes.md."
      />
      <article className="document-card">
        <Markdown>{guideline}</Markdown>
      </article>
    </div>
  );
}

const SKILLS = [
  {
    name: "Language",
    range: [1, 3],
    evidence: /constexpr|string_view|enum class|reference|引用|类型安全/i,
  },
  {
    name: "Ownership / RAII",
    range: [7, 9],
    evidence: /ownership|lifetime|raii|所有权|生命周期|unique_ptr/i,
  },
  {
    name: "Class Design",
    range: [4, 6],
    evidence: /class|composition|inheritance|interface|类|接口|继承/i,
  },
  { name: "STL", range: [13, 24], evidence: /iterator|container|algorithm|ranges|span|标准库/i },
  { name: "Concurrency", range: [27, 27], evidence: /thread|mutex|atomic|并发|线程/i },
  { name: "Testing", range: [30, 30], evidence: /test|fake|mock|assert|测试/i },
] as const;

function ProgressView({
  weakPoints,
  isDayComplete,
}: {
  weakPoints: string[];
  isDayComplete: (day: number) => boolean;
}) {
  const completed = lessons.filter((lesson) => isDayComplete(lesson.day));
  const completedDay = Math.max(repoCompletedDay, ...completed.map((lesson) => lesson.day));
  const currentChapter = Math.max(...completed.map((lesson) => lesson.chapter ?? 0), 0);

  const skillRows = SKILLS.map((skill) => {
    const [start, end] = skill.range;
    const chapterCoverage =
      currentChapter < start
        ? 0
        : currentChapter >= end
          ? 100
          : Math.round(((currentChapter - start + 1) / (end - start + 1)) * 100);
    const evidenceCount = completed.filter((lesson) => skill.evidence.test(lesson.raw)).length;
    const evidenceCoverage = Math.min(100, evidenceCount * 20);
    return { ...skill, value: Math.max(chapterCoverage, evidenceCoverage) };
  });

  return (
    <div>
      <PageHeader
        eyebrow="LEARNING EVIDENCE"
        title="Progress"
        description="Bars represent course coverage and repeated evidence in completed Markdown, not an exam score."
      />
      <div className="progress-layout">
        <section className="skill-matrix">
          {skillRows.map((skill) => (
            <div className="skill-row" key={skill.name}>
              <div>
                <strong>{skill.name}</strong>
                <span>{skill.value}% coverage</span>
              </div>
              <div className="skill-bar">
                <i style={{ width: `${skill.value}%` }} />
              </div>
            </div>
          ))}
        </section>
        <aside className="progress-summary">
          <span className="eyebrow">CURRENT</span>
          <strong>Chapter {currentChapter || "—"}</strong>
          <p>Day {completedDay} is the latest completed learning unit.</p>
          <hr />
          <span className="eyebrow">NEXT</span>
          <p>{latestNextSummary() ?? `Publish Day ${nextPlannedDay} to continue.`}</p>
          <hr />
          <span className="eyebrow">NEEDS REVIEW</span>
          <p>
            {weakPoints.length > 0
              ? `${weakPoints.length} learning stage${weakPoints.length === 1 ? "" : "s"} queued for review.`
              : "No weak points queued."}
          </p>
          <hr />
          <span className="eyebrow">SYSTEM</span>
          <p>{lessons.length} Markdown lessons indexed automatically.</p>
        </aside>
      </div>
    </div>
  );
}

export default function App() {
  const [view, setView] = useState<View>("today");
  const [selectedDay, setSelectedDay] = useState(() => latestLesson()?.day ?? repoCompletedDay);
  const progress = useLearningProgress();
  const completedDay = Math.max(repoCompletedDay, ...progress.state.completedDays);
  const currentLearningDay = completedDay + 1;

  const selectedLesson = useMemo(
    () => lessonByDay(selectedDay) ?? latestLesson(),
    [selectedDay],
  );

  const openLesson = (day: number) => {
    setSelectedDay(day);
    setView("lesson");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  let page: ReactNode;
  switch (view) {
    case "today":
      page = (
        <Today
          currentDay={currentLearningDay}
          openLesson={openLesson}
          isStepComplete={progress.isStepComplete}
        />
      );
      break;
    case "roadmap":
      page = (
        <Roadmap
          currentDay={currentLearningDay}
          openLesson={openLesson}
          isDayComplete={progress.isDayComplete}
        />
      );
      break;
    case "lessons":
      page = <Lessons openLesson={openLesson} isDayComplete={progress.isDayComplete} />;
      break;
    case "lab":
      page = selectedLesson ? (
        <Lab
          lesson={selectedLesson}
          markStep={progress.markStep}
          isStepComplete={progress.isStepComplete}
        />
      ) : null;
      break;
    case "review":
      page = (
        <Review
          isDayComplete={progress.isDayComplete}
          weakPoints={progress.state.weakPoints}
          removeWeakPoint={progress.removeWeakPoint}
        />
      );
      break;
    case "guidelines":
      page = <Guidelines />;
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
