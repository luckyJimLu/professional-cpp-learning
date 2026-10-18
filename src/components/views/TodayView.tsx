import {
  latestLesson,
  lessonByDay,
  lessons,
  type StepKey,
} from "../../lib/course";
import { CompileRail } from "../common/CompileRail";

export function TodayView({
  currentDay,
  openLesson,
  isStepComplete,
}: {
  currentDay: number;
  openLesson: (day: number) => void;
  isStepComplete: (day: number, step: StepKey) => boolean;
}) {
  const latest = latestLesson();
  const planned = lessonByDay(currentDay);
  const target = planned ?? latest;

  return (
    <div className="docs-layout today-layout">
      <article className="guide-document">
        <header className="guide-title" id="introduction">
          <h1>从 C 出发，写出专业的 C++</h1>
          <p className="guide-lead">
            面向具备 C 与基础嵌入式经验的开发者，每天一小时，配合可运行实验从语言机制走向系统架构。
          </p>
          <div className="guide-hero-cta">
            <button
              type="button"
              className="primary-button hero-cta-btn"
              onClick={() => openLesson(currentDay > 1 ? target?.day ?? 1 : 1)}
            >
              {currentDay > 1
                ? `继续学习 · Day ${target?.day ?? 1} →`
                : "开始 Day 1 →"}
            </button>
            <a href="?view=lessons" className="ghost-button">
              浏览全部课程 ({lessons.length} 节)
            </a>
          </div>
        </header>

        <section id="learning-method" className="guide-section">
          <h2>每天一小时 · 学习闭环</h2>
          <p>
            通过八个阶段完成一次扎实的学习：阅读、回忆、理解、重构、规范、实验、避坑与自测。解释清楚、运行通过，再标记完成。
          </p>
          {target && (
            <div className="guide-pipeline">
              <CompileRail
                lesson={target}
                isStepComplete={isStepComplete}
                onSelect={(step) => {
                  window.location.href = `?view=lesson&day=${target.day}#section-${step}`;
                }}
              />
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
              <span>在 GitHub 查看源码</span>
            </a>
          </div>

        </footer>
      </article>
    </div>
  );
}
