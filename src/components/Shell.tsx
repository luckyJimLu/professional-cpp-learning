import { useEffect, useRef, useState, type ReactNode } from "react";
import { NAV, navigate, useLocationParams, type View } from "../lib/navigation";
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
  const params = useLocationParams();
  const currentQuery = params.get("q") ?? "";
  const [headerDraft, setHeaderDraft] = useState(currentQuery);
  const headerInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsSearchExpanded(view === "search");
  }, [view]);

  useEffect(() => {
    setHeaderDraft(currentQuery);
  }, [currentQuery]);

  const triggerMainSearchFocus = () => {
    const mainInput = document.getElementById("code-query") as HTMLInputElement | null;
    if (mainInput) {
      mainInput.focus();
      mainInput.classList.remove("input-pulse");
      void mainInput.offsetWidth; // trigger reflow
      mainInput.classList.add("input-pulse");
    }
  };

  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if (
        !event.isComposing &&
        (event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === "k"
      ) {
        event.preventDefault();
        onPreloadSearch?.();
        setIsSearchExpanded(true);
        if (view !== "search") {
          setView("search");
          requestAnimationFrame(() => {
            triggerMainSearchFocus();
          });
        } else {
          triggerMainSearchFocus();
        }
      }
    };
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, [view, setView, onPreloadSearch]);

  const handleHeaderSearchClick = () => {
    onPreloadSearch?.();
    setIsSearchExpanded(true);
    if (view !== "search") {
      setView("search");
      requestAnimationFrame(() => {
        triggerMainSearchFocus();
      });
    } else {
      triggerMainSearchFocus();
    }
  };

  const handleHeaderInputChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const val = event.target.value;
    setHeaderDraft(val);
    if (view !== "search") {
      navigate(
        {
          view: "search",
          q: val || undefined,
          page: undefined,
          code: undefined,
          line: undefined,
        },
        true,
      );
    } else {
      navigate(
        {
          q: val || undefined,
          page: undefined,
          code: undefined,
          line: undefined,
        },
        true,
      );
    }
  };

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
        <details className="mobile-menu mobile-drawer">
          <summary className="mobile-menu-trigger" aria-label="打开导航菜单">
            <span className="hamburger-icon" aria-hidden="true">
              ☰
            </span>
          </summary>
          <div
            className="drawer-overlay"
            aria-hidden="true"
            onClick={(e) => {
              e.currentTarget.closest("details")?.removeAttribute("open");
            }}
          />
          <div className="drawer-content">
            <div className="drawer-header">
              <span className="drawer-title">导航 · {label}</span>
              <button
                type="button"
                className="drawer-close-btn"
                aria-label="关闭导航菜单"
                onClick={(e) => {
                  e.currentTarget.closest("details")?.removeAttribute("open");
                }}
              >
                ✕
              </button>
            </div>
            <nav aria-label="Mobile navigation">
              {NAV.map((item) => (
                <button
                  key={item.id}
                  type="button"
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
              <button
                key="search"
                type="button"
                aria-current={view === "search" ? "page" : undefined}
                onClick={(event) => {
                  setView("search");
                  event.currentTarget
                    .closest("details")
                    ?.removeAttribute("open");
                }}
              >
                代码搜索
              </button>
            </nav>
          </div>
        </details>

        <a
          className="brand"
          href="?view=today"
          aria-label="Professional C++ 学习指南"
        >
          <span className="brand-mark">C++</span>
          <div className="brand-copy">
            <strong className="brand-title">
              <span className="title-desktop">Professional C++</span>
              <span className="title-mobile">C++ 学习</span>
            </strong>
            <span className="brand-subtitle">学习文档</span>
          </div>
        </a>
        <div className="header-actions">
          {view !== "search" && (
            <div
              className={`shell-search ${isSearchExpanded ? "is-expanded" : ""}`}
              onMouseEnter={onPreloadSearch}
              onFocus={onPreloadSearch}
            >
              <button
                type="button"
                className="shell-search-icon-btn"
                title="搜索代码 (Ctrl+K)"
                aria-label="搜索代码 (Ctrl+K)"
                onClick={handleHeaderSearchClick}
              >
                <svg
                  className="search-icon"
                  width="16"
                  height="16"
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
              </button>

              {isSearchExpanded ? (
                <input
                  ref={headerInputRef}
                  type="text"
                  className="header-search-input"
                  aria-label="全局快速搜索"
                  placeholder="搜索代码与示例…"
                  value={headerDraft}
                  autoComplete="off"
                  spellCheck={false}
                  onChange={handleHeaderInputChange}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") {
                      if (view !== "search") {
                        setIsSearchExpanded(false);
                      }
                    } else if (event.key === "Enter") {
                      if (view !== "search") {
                        setView("search");
                      }
                      triggerMainSearchFocus();
                    }
                  }}
                />
              ) : (
                <span
                  className="shell-search-trigger"
                  onClick={handleHeaderSearchClick}
                >
                  <span className="search-placeholder">搜索代码与示例…</span>
                </span>
              )}

              <kbd
                className="search-shortcut"
                title="快捷键 Ctrl+K"
                onClick={handleHeaderSearchClick}
              >
                Ctrl K
              </kbd>
            </div>
          )}
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
        <main className="content" id="main-content" tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  );
}
