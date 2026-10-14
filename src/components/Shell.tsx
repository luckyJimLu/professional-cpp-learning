import { useEffect, type ReactNode } from "react";
import { NAV, type View } from "../lib/navigation";
import { repoCompletedDay } from "../lib/course";

export function Shell({
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
  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if (
        !event.isComposing &&
        (event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === "k"
      ) {
        event.preventDefault();
        setView("search");
        requestAnimationFrame(() =>
          document.getElementById("code-query")?.focus(),
        );
      }
    };
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, [setView]);
  const label = NAV.find((item) => item.id === view)?.label ?? "课程阅读";
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        跳到正文
      </a>
      <header className="docs-header">
        <a
          className="brand"
          href="?view=today"
          aria-label="Professional C++ 学习指南"
        >
          <span className="brand-mark">C++</span>
          <div>
            <strong>Professional C++</strong>
            <span>学习文档</span>
          </div>
        </a>
        <button className="shell-search" onClick={() => setView("search")}>
          <span>搜索代码与示例…</span> <kbd>Ctrl K</kbd>
        </button>
        <a
          className="repo-link"
          href="https://github.com/luckyJimLu/professional-cpp-learning"
        >
          GitHub ↗
        </a>
      </header>
      <aside className="sidebar">
        <div className="sidebar-edition">
          <span className="eyebrow">学习手册</span>
          <span>C++23</span>
        </div>
        <nav className="side-nav" aria-label="Primary navigation">
          {["学习路径", "知识与实践", "学习记录"].map((group) => (
            <div className="nav-group" key={group}>
              <span className="eyebrow">{group}</span>
              {NAV.filter((item) => item.group === group).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`nav-item ${view === item.id || (view === "lesson" && item.id === "lessons") ? "is-active" : ""}`}
                  aria-current={
                    view === item.id ||
                    (view === "lesson" && item.id === "lessons")
                      ? "page"
                      : undefined
                  }
                  onClick={() => setView(item.id)}
                >
                  <span>{item.label}</span>
                  {item.id === "today" && <small>Day {currentDay}</small>}
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-status">
          <span>仓库课程进度</span>
          <strong>Day {repoCompletedDay} / 112</strong>
          <div className="mini-progress">
            <i style={{ width: `${(repoCompletedDay / 112) * 100}%` }} />
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <div className="workspace-header">
          <span className="mono">
            C++ / <strong>{label}</strong>
          </span>
          <button className="ghost-button" onClick={() => setView("search")}>
            代码搜索
          </button>
        </div>
        <details className="mobile-menu">
          <summary>导航 · {label}</summary>
          <nav aria-label="Mobile navigation">
            {NAV.map((item) => (
              <button
                key={item.id}
                aria-current={
                  view === item.id ||
                  (view === "lesson" && item.id === "lessons")
                    ? "page"
                    : undefined
                }
                onClick={(event) => {
                  setView(item.id);
                  event.currentTarget
                    .closest("details")
                    ?.removeAttribute("open");
                }}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </details>
        <main className="content" id="main-content" tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  );
}
