import { useEffect, useState, type ReactNode } from "react";
import { NAV, type View } from "../lib/navigation";
import { repoCompletedDay } from "../lib/course";

export function Shell({
  view,
  setView,
  currentDay,
  onPreloadSearch,
  children,
}: {
  view: View;
  setView: (view: View) => void;
  currentDay: number;
  onPreloadSearch?: () => void;
  children: ReactNode;
}) {
  const [isSearchExpanded, setIsSearchExpanded] = useState(view === "search");

  useEffect(() => {
    setIsSearchExpanded(view === "search");
  }, [view]);

  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if (
        !event.isComposing &&
        (event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === "k"
      ) {
        event.preventDefault();
        onPreloadSearch?.();
        setView("search");
        setIsSearchExpanded(true);
        requestAnimationFrame(() =>
          document.getElementById("code-query")?.focus(),
        );
      }
    };
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, [setView, onPreloadSearch]);

  const label =
    view === "search"
      ? "代码搜索"
      : (NAV.find((item) => item.id === view)?.label ?? "课程阅读");

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
        <div className="header-actions">
          <button
            className={`shell-search ${isSearchExpanded ? "is-expanded" : ""}`}
            title="搜索代码 (Ctrl+K)"
            aria-label="搜索代码 (Ctrl+K)"
            onMouseEnter={onPreloadSearch}
            onFocus={onPreloadSearch}
            onClick={() => {
              onPreloadSearch?.();
              if (view !== "search") {
                setView("search");
              }
              setIsSearchExpanded(true);
              requestAnimationFrame(() =>
                document.getElementById("code-query")?.focus(),
              );
            }}
          >
            <svg
              className="search-icon"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <span className="search-placeholder">搜索代码与示例…</span>
            <kbd>Ctrl K</kbd>
          </button>
          <a
            className="repo-link"
            href="https://github.com/luckyJimLu/professional-cpp-learning"
          >
            GitHub ↗
          </a>
        </div>
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
