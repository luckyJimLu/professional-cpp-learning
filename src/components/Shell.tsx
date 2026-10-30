import { useEffect, useRef, useState, type ReactNode } from "react";
import { NAV, type View } from "../lib/navigation";
import { Icon as NavIcon } from "./common/Icon";
import { OpenCodeLogo } from "./OpenCodeLogo";

export function Shell({
  view,
  setView,
  publishedDay,
  onPreloadSearch,
  children,
}: {
  view: View;
  setView: (view: View) => void;
  publishedDay: number;
  onPreloadSearch?: () => void;
  children: ReactNode;
}) {
  const drawerRef = useRef<HTMLDetailsElement>(null);

  const focusMainContent = () => {
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: "auto" });
      document.getElementById("main-content")?.focus({ preventScroll: true });
    });
  };

  const goToView = (nextView: View) => {
    setView(nextView);
    focusMainContent();
  };

  const triggerMainSearchFocus = () => {
    const mainInput = document.getElementById(
      "code-query",
    ) as HTMLInputElement | null;
    if (mainInput) {
      mainInput.focus();
      mainInput.classList.remove("input-pulse");
      void mainInput.offsetWidth;
      mainInput.classList.add("input-pulse");
    }
  };

  const handleHeaderSearchClick = () => {
    onPreloadSearch?.();
    if (view !== "search") {
      setView("search");
      requestAnimationFrame(() => {
        triggerMainSearchFocus();
      });
    } else {
      triggerMainSearchFocus();
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

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        return localStorage.getItem("cpp_console_sidebar_collapsed") === "true";
      } catch {
        return false;
      }
    }
    return false;
  });

  const toggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("cpp_console_sidebar_collapsed", String(next));
        } catch {
          /* Navigation remains usable when storage is blocked. */
        }
      }
      return next;
    });
  };

  // The drawer is the shared mobile navigation: trap focus, restore it on
  // dismissal, and release inert content when crossing the desktop breakpoint.
  useEffect(() => {
    const release = () => {
      if (drawerRef.current) drawerRef.current.open = false;
      document.getElementById("main-content")?.removeAttribute("inert");
    };
    const handleKeydown = (event: KeyboardEvent) => {
      if (!drawerRef.current?.open) return;
      if (event.key === "Escape") {
        release();
        drawerRef.current.querySelector("summary")?.focus();
      }
      if (event.key === "Tab") {
        const elements = [
          ...drawerRef.current.querySelectorAll<HTMLElement>(
            "summary, button, a[href]",
          ),
        ].filter((el) => el.tabIndex >= 0);
        const first = elements[0];
        const last = elements.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    const desktop = window.matchMedia("(min-width: 761px)");
    const resize = () => {
      if (desktop.matches) release();
    };
    window.addEventListener("keydown", handleKeydown);
    desktop.addEventListener("change", resize);
    return () => {
      release();
      window.removeEventListener("keydown", handleKeydown);
      desktop.removeEventListener("change", resize);
    };
  }, []);

  const handleDrawerToggle = () => {
    const isOpen = drawerRef.current?.open ?? false;
    const main = document.getElementById("main-content");
    if (main) {
      if (isOpen) {
        main.setAttribute("inert", "");
      } else {
        main.removeAttribute("inert");
      }
    }
  };

  const closeDrawer = (restoreTriggerFocus = true) => {
    if (drawerRef.current) {
      drawerRef.current.open = false;
      const main = document.getElementById("main-content");
      if (main) main.removeAttribute("inert");
      if (restoreTriggerFocus)
        drawerRef.current.querySelector("summary")?.focus();
    }
  };

  const label =
    view === "search"
      ? "代码搜索"
      : view === "visualizer"
        ? "内存可视化"
        : view === "lesson"
          ? "课程阅读"
          : (NAV.find((item) => item.id === view)?.label ?? "课程");

  return (
    <div
      className={`app-shell ${isSidebarCollapsed ? "is-sidebar-collapsed" : ""}`}
    >
      <a className="skip-link" href="#main-content">
        跳到正文
      </a>
      <header className="docs-header">
        <div className="header-left">
          <details
            ref={drawerRef}
            className="mobile-menu mobile-drawer"
            onToggle={handleDrawerToggle}
          >
            <summary className="mobile-menu-trigger" aria-label="打开导航菜单">
              <span className="hamburger-icon" aria-hidden="true">
                ☰
              </span>
            </summary>
            <div
              className="drawer-overlay"
              aria-hidden="true"
              onClick={() => closeDrawer()}
            />
            <div className="drawer-content">
              <div className="drawer-header">
                <span className="drawer-title">导航 · {label}</span>
                <button
                  type="button"
                  className="drawer-close-btn"
                  aria-label="关闭导航菜单"
                  onClick={() => closeDrawer()}
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
                    onClick={() => {
                      setView(item.id);
                      closeDrawer(false);
                      focusMainContent();
                    }}
                  >
                    <NavIcon id={item.id} />
                    <span>{item.label}</span>
                  </button>
                ))}
                <button
                  key="search"
                  type="button"
                  aria-current={view === "search" ? "page" : undefined}
                  onClick={() => {
                    setView("search");
                    closeDrawer(false);
                    requestAnimationFrame(() => {
                      triggerMainSearchFocus();
                    });
                  }}
                >
                  <NavIcon id="search" />
                  <span>代码搜索</span>
                </button>
                <a href={`${import.meta.env.BASE_URL}rtos.html`}>
                  <span aria-hidden="true">⌁</span>
                  <span>RTOS 模拟器 ↗</span>
                </a>
                <a
                  href="https://github.com/luckyJimLu/professional-cpp-learning"
                  target="_blank"
                  rel="noreferrer"
                >
                  <NavIcon id="github" />
                  <span>GitHub 仓库 ↗</span>
                </a>
              </nav>
            </div>
          </details>
          <a
            className="brand-logo-link opencode-header-brand"
            href="?view=today"
            aria-label="Pro C++ 学习指南"
            onClick={(e) => {
              if (!e.metaKey && !e.ctrlKey) {
                e.preventDefault();
                goToView("today");
              }
            }}
          >
            <OpenCodeLogo showFullText={false} />
          </a>
        </div>
        <div className="shell-context">
          <nav aria-label="当前位置" className="shell-current-page">
            <span className="shell-breadcrumb-root">工程手册</span>
            <span className="shell-breadcrumb-sep" aria-hidden="true">
              ›
            </span>
            <strong>{label}</strong>
          </nav>
          <button
            type="button"
            className="shell-search-action"
            onClick={handleHeaderSearchClick}
            aria-label="搜索代码与课程"
            aria-keyshortcuts="Control+K Meta+K"
            onMouseEnter={onPreloadSearch}
            onFocus={onPreloadSearch}
          >
            <NavIcon id="search" />
            <span>搜索代码与课程</span>
            <kbd>Ctrl K</kbd>
          </button>
        </div>
      </header>

      <aside className={`sidebar ${isSidebarCollapsed ? "is-collapsed" : ""}`}>
        <div className="sidebar-top-bar">
          {!isSidebarCollapsed ? (
            <div className="sidebar-search-row">
              <button
                type="button"
                className="sidebar-progress-pill"
                onClick={() => goToView("lessons")}
                title="查看已发布课程与学习记录"
              >
                <span className="sidebar-progress-dot" aria-hidden="true" />
                <span className="sidebar-progress-text">
                  已发布 · Day {publishedDay}
                </span>
              </button>

              <button
                type="button"
                className="sidebar-collapse-btn"
                onClick={toggleSidebar}
                aria-label="收起侧边栏"
                title="收起侧边栏"
              >
                <svg
                  className="toggle-sidebar-icon"
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <line x1="9" y1="3" x2="9" y2="21" />
                  <path d="m16 10-3 2 3 2" />
                </svg>
              </button>
            </div>
          ) : (
            <div className="sidebar-collapsed-controls">
              <button
                type="button"
                className="sidebar-control-btn sidebar-expand-btn"
                onClick={toggleSidebar}
                aria-label="展开侧边栏"
                title="展开侧边栏"
              >
                <svg
                  className="toggle-sidebar-icon"
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <line x1="9" y1="3" x2="9" y2="21" />
                  <path d="m13 10 3 2-3 2" />
                </svg>
              </button>
            </div>
          )}
        </div>

        <nav className="side-nav" aria-label="Primary navigation">
          {NAV.map((item) => {
            const isActive =
              view === item.id || (view === "lesson" && item.id === "lessons");
            return (
              <button
                key={item.id}
                type="button"
                className={`nav-item ${isActive ? "is-active" : ""}`}
                aria-current={isActive ? "page" : undefined}
                onClick={() => goToView(item.id)}
                title={item.label}
                aria-label={item.label}
              >
                <NavIcon id={item.id} />
                <span>{item.label}</span>
              </button>
            );
          })}
          <a
            className="nav-item nav-item-external"
            href={`${import.meta.env.BASE_URL}rtos.html`}
            title="RTOS 模拟器"
          >
            <span className="nav-icon" aria-hidden="true">
              ⌁
            </span>
            <span>RTOS 模拟器</span>
            <small className="nav-external-badge" aria-hidden="true">
              ↗
            </small>
          </a>
        </nav>

        <div className="sidebar-footer">
          <a
            className="nav-item sidebar-github-link"
            href="https://github.com/luckyJimLu/professional-cpp-learning"
            target="_blank"
            rel="noreferrer"
            title="在 GitHub 查看本项目仓库"
            aria-label="GitHub 仓库"
          >
            <NavIcon id="github" />
            <span>GitHub 仓库</span>
            <small className="nav-external-badge" aria-hidden="true">
              ↗
            </small>
          </a>
        </div>
      </aside>

      <div className="main-shell">
        <main
          className={`content ${view === "visualizer" ? "is-visualizer-view" : ""}`}
          id="main-content"
          tabIndex={-1}
          data-view={view}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
