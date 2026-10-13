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
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">C++</span>
          <div>
            <strong>Professional C++</strong>
            <span>Learning Workspace</span>
          </div>
        </div>
        <button className="shell-search" onClick={() => setView("search")}>
          搜索代码 <kbd>⌘ / Ctrl K</kbd>
        </button>
        <nav className="side-nav" aria-label="Primary navigation">
          {["学习路径", "知识与实践", "学习记录"].map((group) => (
            <div className="nav-group" key={group}>
              <span className="eyebrow">{group}</span>
              {NAV.filter((item) => item.group === group).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`nav-item ${view === item.id ? "is-active" : ""}`}
                  aria-current={view === item.id ? "page" : undefined}
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
          <span>课程进度</span>
          <strong>Day {repoCompletedDay} / 112</strong>
          <div className="mini-progress">
            <i style={{ width: `${(repoCompletedDay / 112) * 100}%` }} />
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="workspace-header">
          <span className="mono">
            C++ / <strong>{label}</strong>
          </span>
          <button className="ghost-button" onClick={() => setView("search")}>
            代码搜索
          </button>
        </header>
        <details className="mobile-menu">
          <summary>导航 · {label}</summary>
          <nav aria-label="Mobile navigation">
            {NAV.map((item) => (
              <button
                key={item.id}
                aria-current={view === item.id ? "page" : undefined}
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
