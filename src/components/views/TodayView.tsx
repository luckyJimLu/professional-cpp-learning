import { useState } from "react";
import {
  STAGE_DESCRIPTIONS,
  TODAY_PATHWAYS,
  type LearningPathwayMeta,
} from "../../data/courseMetadata";
import {
  STEP_DEFS,
  latestLesson,
  lessonByDay,
  lessons,
  type StepKey,
} from "../../lib/course";
import { CompileRail } from "../common/CompileRail";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

function PathwayIcon({ id }: { id: LearningPathwayMeta["id"] }) {
  switch (id) {
    case "topics":
      return (
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polygon points="12 2 2 7 12 12 22 7 12 2" />
          <polyline points="2 17 12 22 22 17" />
          <polyline points="2 12 12 17 22 12" />
        </svg>
      );
    case "lab":
      return (
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="4 17 10 11 4 5" />
          <line x1="12" y1="19" x2="20" y2="19" />
        </svg>
      );
    case "slides":
      return (
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
        </svg>
      );
    case "rtos":
      return (
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="2" y="4" width="20" height="16" rx="2" />
          <path d="M6 8h4" />
          <path d="M14 12h4" />
          <path d="M8 16h6" />
        </svg>
      );
  }
}

export function TodayView({
  currentDay,
  lastLessonDay,
  openLesson,
  isStepComplete,
}: {
  currentDay: number;
  lastLessonDay?: number;
  openLesson: (day: number) => void;
  isStepComplete: (day: number, step: StepKey) => boolean;
}) {
  const latest = latestLesson();
  const planned = lessonByDay(currentDay);
  const recent = lastLessonDay ? lessonByDay(lastLessonDay) : undefined;
  const target = recent ?? planned ?? latest;

  const activeSteps = target?.steps ?? STEP_DEFS;
  const firstIncompleteStep =
    activeSteps.find((s) => target && !isStepComplete(target.day, s.key))?.key ??
    "read";
  const [activeStage, setActiveStage] = useState<StepKey>(firstIncompleteStep);

  const completedSteps = target
    ? activeSteps.filter((s) => isStepComplete(target.day, s.key)).length
    : 0;
  const activeStageKey = activeSteps.some((s) => s.key === activeStage)
    ? activeStage
    : firstIncompleteStep;
  const activeStageDef =
    activeSteps.find((s) => s.key === activeStageKey) ?? activeSteps[0];
  const activeStageMeta = STAGE_DESCRIPTIONS[activeStageDef.key];

  return (
    <div className="docs-layout today-layout">
      <article className="guide-document">
        <header className="guide-title" id="introduction">
          <h1>从 C 出发，写出专业的 C++</h1>
          <p className="guide-lead">
            面向具备 C
            与基础嵌入式经验的开发者，每天一小时，配合可运行实验从语言机制走向系统架构。
          </p>
        </header>

        {target && (
          <Card
            asChild
            id="current-lesson"
            className="guide-current-lesson"
            aria-label="当前课程"
          >
            <section>
              <div className="guide-current-main">
                <h2>
                  Day {target.day} · {target.title}
                </h2>
                <div className="guide-current-top">
                  <span className="page-eyebrow">
                    {recent
                      ? "本浏览器上次阅读 · 不代表完成"
                      : planned
                        ? "仓库学习计划"
                        : "最新发布 · 可开始复习"}
                  </span>
                  <Badge variant="outline" className="guide-current-badge mono font-normal">
                    课程 {target.day} / {lessons.length} 节 · 第 {target.week} 周
                  </Badge>
                </div>
                <p className="guide-current-meta">
                  第 {target.week} 周
                  {target.chapter ? ` · 第 ${target.chapter} 章` : ""}
                  {target.chapterTitle ? ` (${target.chapterTitle})` : ""} · 预计{" "}
                  {target.duration} 分钟 · 已完成 {completedSteps} /{" "}
                  {activeSteps.length} 阶段
                </p>
                <div
                  className="mini-progress guide-progress-bar"
                  role="progressbar"
                  aria-label={`Day ${target.day} 学习阶段`}
                  aria-valuemin={0}
                  aria-valuemax={activeSteps.length}
                  aria-valuenow={completedSteps}
                >
                  <i
                    style={{
                      width: `${Math.round((completedSteps / activeSteps.length) * 100)}%`,
                    }}
                  />
                </div>
                <div className="guide-hero-cta">
                  <Button
                    type="button"
                    className="primary-button hero-cta-btn"
                    onClick={() => openLesson(target.day)}
                  >
                    {recent
                      ? `继续阅读 · Day ${recent.day} →`
                      : planned
                        ? `打开计划课程 · Day ${planned.day} →`
                        : `打开最新课程 · Day ${latest?.day ?? 1} →`}
                  </Button>
                  <Button variant="outline" asChild className="ghost-button">
                    <a href="?view=lessons">
                      浏览全部课程 ({lessons.length} 节)
                    </a>
                  </Button>
                </div>
              </div>
            </section>
          </Card>
        )}

        <nav id="pathways" className="guide-pathways" aria-label="学习入口">
          {TODAY_PATHWAYS.map((item) => (
            <a
              key={item.id}
              href={
                item.isExternalBase
                  ? `${import.meta.env.BASE_URL}${item.href}`
                  : item.href
              }
            >
              <span className="pathway-icon" aria-hidden="true">
                <PathwayIcon id={item.id} />
              </span>
              <strong>
                {item.title} <span aria-hidden="true">{item.arrow}</span>
              </strong>
              <span>{item.description}</span>
            </a>
          ))}
        </nav>

        <section id="learning-method" className="guide-section">
          <div className="guide-section-header">
            <h2>每天一小时 · 学习闭环</h2>
            <Badge variant="secondary" className="guide-section-badge font-normal">
              10 阶段 · 60 分钟标准节奏
            </Badge>
          </div>
          <p>
            通过十个阶段完成一次扎实的学习：阅读、回忆、概念、C/C++ 对照、设计模式、Embedded 场景、规范、实验、避坑与自测。点击任一阶段可查看任务说明，或直接进入对应章节。
          </p>
          {target && (
            <div className="guide-pipeline">
              <CompileRail
                lesson={target}
                active={activeStageKey}
                isStepComplete={isStepComplete}
                onSelect={(step) => {
                  setActiveStage(step);
                }}
              />
              <div className="pipeline-stage-detail">
                <div className="pipeline-stage-info">
                  <span className="pipeline-stage-tag mono">
                    {activeStageDef.label} · 约 {activeStageMeta.budget} 分钟
                  </span>
                  <strong>{activeStageDef.title}</strong>
                  <p>{activeStageMeta.desc}</p>
                </div>
                <Button variant="outline" asChild className="ghost-button pipeline-stage-link">
                  <a
                    href={`?view=lesson&day=${target.day}#section-${activeStageDef.key}`}
                  >
                    进入本阶段 →
                  </a>
                </Button>
              </div>
            </div>
          )}
          <p className="guide-footnote">
            学习进度保存在当前浏览器。课文与源码均来自仓库，随时可查阅原文。
          </p>
        </section>

        <footer className="article-footer">
          <div className="article-footer-left">
            <a
              className="github-footer-link"
              href="https://github.com/luckyJimLu/professional-cpp-learning"
              target="_blank"
              rel="noreferrer"
            >
              <svg
                className="github-icon"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                />
              </svg>
              <span>在 GitHub 查看源码 ↗</span>
            </a>
          </div>
        </footer>
      </article>

      <aside className="today-aside" aria-label="本页概览与快捷导航">
        <div className="today-aside-card">
          <span className="page-eyebrow">本页目录</span>
          <nav aria-label="学习指南章节" className="today-aside-nav">
            <a href="#introduction">工程化学习概览</a>
            <a href="#current-lesson">当前课程 · Day {target?.day ?? 1}</a>
            <a href="#pathways">四个学习入口</a>
            <a href="#learning-method">每天一小时闭环</a>
          </nav>
        </div>
      </aside>
    </div>
  );
}
