import {
  latestLesson,
  lessonByDay,
  lessons,
  type StepKey,
} from "../../lib/course";
import { CompileRail } from "../common/CompileRail";
import { OnThisPage } from "../common/OnThisPage";

const contents = [
  { id: "introduction", label: "关于这份学习手册" },
  { id: "start-learning", label: "开始学习" },
  { id: "learning-method", label: "每天一小时" },
  { id: "explore", label: "深入工程实践" },
];

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
    <div className="docs-layout">
      <article className="guide-document">
        <header className="guide-title" id="introduction">
          <div className="guide-kicker">
            <span>PROFESSIONAL C++</span>
            <span>第六版 · C++23</span>
          </div>
          <h1>
            从 C 出发，
            <br />
            写出专业的 C++。
          </h1>
          <p className="guide-lead">面向 C / 嵌入式开发者的工程化学习手册。</p>
          <p>
            沿着《Professional
            C++》的章节，从语言机制走向系统设计。读懂一个概念，改写一段代码，再用可运行的实验验证理解。
          </p>
        </header>
        <aside className="docs-note">
          <strong>学习之前</strong>
          <p>
            建议具备 C 语言和基础嵌入式开发经验。课程以 Modern C++ 为主线，结合
            Modem、Driver 与资源受限系统的实际问题。
          </p>
        </aside>
        <section id="start-learning" className="guide-section">
          <h2>
            开始学习{" "}
            <a href="#start-learning" aria-label="链接到开始学习">
              #
            </a>
          </h2>
          <p>第一次来，从 Day 1 开始；已经在学习，可以回到最近发布的课程。</p>
          <div className="start-links">
            <a href="?view=lesson&day=1">
              <span className="link-icon">01</span>
              <strong>从第一课开始</strong>
              <span>C 思维 → Modern C++</span>
              <b aria-hidden="true">↗</b>
            </a>
            <a href="?view=roadmap">
              <span className="link-icon">→</span>
              <strong>浏览学习路线</strong>
              <span>16 周 · 从基础到系统工程</span>
              <b aria-hidden="true">↗</b>
            </a>
          </div>
          {target ? (
            <div className="continue-reading">
              <div>
                <span className="eyebrow">
                  {planned ? "继续学习" : "最近发布"} / DAY {target.day}
                </span>
                <h3>{target.title}</h3>
                <p>
                  已发布 {lessons.length} 节课程
                  {!planned && ` · Day ${currentDay} 尚未发布`}
                </p>
              </div>
              <button
                className="primary-button"
                onClick={() => openLesson(target.day)}
              >
                阅读课程 →
              </button>
            </div>
          ) : (
            <p>课程准备中，先浏览学习路线。</p>
          )}
        </section>
        <section id="learning-method" className="guide-section">
          <h2>
            每天一小时{" "}
            <a href="#learning-method" aria-label="链接到每天一小时">
              #
            </a>
          </h2>
          <p>
            用八个阶段完成一次学习闭环。阅读不等于完成，解释清楚、运行通过，再记录你的学习进度。
          </p>
          {target && (
            <div className="guide-pipeline">
              <div className="terminal-caption">
                <span>learning.pipeline</span>
                <span>约 60 min / 天</span>
              </div>
              <CompileRail
                lesson={target}
                isStepComplete={isStepComplete}
                onSelect={(step) => {
                  window.location.href = `?view=lesson&day=${target.day}#section-${step}`;
                }}
              />
              <div className="pipeline-caption">
                阅读 → 回忆 → 理解 → 重构 → 规范 → 实验 → 避坑 → 自测
              </div>
            </div>
          )}
          <p className="guide-footnote">
            完成状态保存在当前浏览器。课程与代码来自仓库，可随时查看原文。
          </p>
        </section>
        <section id="explore" className="guide-section">
          <h2>
            深入工程实践{" "}
            <a href="#explore" aria-label="链接到深入工程实践">
              #
            </a>
          </h2>
          <div className="resource-links">
            <a href="?view=topics">
              <strong>
                专题知识库 <span>↗</span>
              </strong>
              <p>设计模式、所有权、Asio 与系统架构。</p>
            </a>
            <a href="?view=lab">
              <strong>
                在线编译实验 <span>↗</span>
              </strong>
              <p>修改真实课程代码，在浏览器中编译 C++23。</p>
            </a>
            <a href="?view=guidelines">
              <strong>
                嵌入式编码规范 <span>↗</span>
              </strong>
              <p>把生命周期、接口与资源约束落实到代码。</p>
            </a>
          </div>
        </section>
        <footer className="docs-footer">
          <a href="https://github.com/luckyJimLu/professional-cpp-learning">
            在 GitHub 查看源码 ↗
          </a>
          <span>以实验验证理解</span>
        </footer>
        <a className="next-doc" href="?view=roadmap">
          <span>下一步</span>
          <strong>学习路线 →</strong>
        </a>
      </article>
      <OnThisPage items={contents} />
    </div>
  );
}
