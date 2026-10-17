import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  NAV,
  type View,
} from "../lib/navigation";
import { OpenCodeLogo } from "./OpenCodeLogo";

function NavIcon({ id }: { id: string }) {
  const common = {
    className: "nav-icon",
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": "true" as const,
  };

  switch (id) {
    case "today":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="10" />
          <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
        </svg>
      );
    case "lessons":
      return (
        <svg {...common}>
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
        </svg>
      );
    case "topics":
      return (
        <svg {...common}>
          <polygon points="12 2 2 7 12 12 22 7 12 2" />
          <polyline points="2 17 12 22 22 17" />
          <polyline points="2 12 12 17 22 12" />
        </svg>
      );
    case "lab":
      return (
        <svg {...common}>
          <polyline points="4 17 10 11 4 5" />
          <line x1="12" y1="19" x2="20" y2="19" />
        </svg>
      );
    case "guidelines":
      return (
        <svg {...common}>
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      );
    case "review":
      return (
        <svg {...common}>
          <polyline points="1 4 1 10 7 10" />
          <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
        </svg>
      );
    case "search":
      return (
        <svg {...common}>
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      );
    default:
      return null;
  }
}

export function Shell({
  view,
  setView,
  onPreloadSearch,
  children,
}: {
  view: View;
  setView: (view: View) => void;
  currentDay: number;
  onPreloadSearch?: () => void;
  children: ReactNode;
}) {
  const drawerRef = useRef<HTMLDetailsElement>(null);

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
      return localStorage.getItem("cpp_console_sidebar_collapsed") === "true";
    }
    return false;
  });

  const toggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        localStorage.setItem("cpp_console_sidebar_collapsed", String(next));
      }
      return next;
    });
  };

  // 移动端抽屉无障碍：Escape 关闭与 inert 控制
  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && drawerRef.current?.open) {
        drawerRef.current.open = false;
        const main = document.getElementById("main-content");
        if (main) main.removeAttribute("inert");
      }
    };
    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
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

  const closeDrawer = () => {
    if (drawerRef.current) {
      drawerRef.current.open = false;
      const main = document.getElementById("main-content");
      if (main) main.removeAttribute("inert");
    }
  };

  const label =
    view === "search"
      ? "代码搜索"
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
            <summary
              className="mobile-menu-trigger"
              aria-label="打开导航菜单"
              aria-expanded={drawerRef.current?.open ?? false}
            >
              <span className="hamburger-icon" aria-hidden="true">
                ☰
              </span>
            </summary>
            <div
              className="drawer-overlay"
              aria-hidden="true"
              onClick={closeDrawer}
            />
            <div className="drawer-content">
              <div className="drawer-header">
                <span className="drawer-title">导航 · {label}</span>
                <button
                  type="button"
                  className="drawer-close-btn"
                  aria-label="关闭导航菜单"
                  onClick={closeDrawer}
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
                      closeDrawer();
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
                    closeDrawer();
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
              </nav>
            </div>
          </details>

          <button
            type="button"
            className="sidebar-toggle-btn"
            onClick={toggleSidebar}
            aria-label={isSidebarCollapsed ? "展开侧边栏" : "收起侧边栏"}
            title={isSidebarCollapsed ? "展开侧边栏" : "收起侧边栏"}
          >
            <svg
              className="toggle-sidebar-icon"
              width="18"
              height="18"
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
              <path
                d={isSidebarCollapsed ? "m13 10 3 2-3 2" : "m16 10-3 2 3 2"}
              />
            </svg>
          </button>

          <a
            className="brand-logo-link opencode-header-brand"
            href="?view=today"
            aria-label="Professional C++ 学习指南"
          >
            <OpenCodeLogo />
          </a>
        </div>

        <div className="header-actions">
          <button
            type="button"
            className="header-icon-btn header-search-icon-btn"
            title="搜索 (Ctrl+K)"
            aria-label="搜索 (Ctrl+K)"
            onClick={handleHeaderSearchClick}
            onMouseEnter={onPreloadSearch}
            onFocus={onPreloadSearch}
          >
            <svg
              className="search-icon"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>
        </div>
      </header>

      <aside className={`sidebar ${isSidebarCollapsed ? "is-collapsed" : ""}`}>
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
                onClick={() => setView(item.id)}
                title={item.label}
                aria-label={item.label}
              >
                <NavIcon id={item.id} />
                <span>{item.label}</span>
              </button>
            );
          })}
          <a className="nav-item" href={`${import.meta.env.BASE_URL}rtos.html`} title="RTOS 模拟器">
            <span className="nav-icon" aria-hidden="true">⌁</span>
            <span>RTOS 模拟器 ↗</span>
          </a>
        </nav>
      </aside>

      <div className="main-shell">
        <main
          className={`content ${view === "visualizer" ? "is-visualizer-view" : ""}`}
          id="main-content"
          tabIndex={-1}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
