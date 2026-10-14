import {
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  NAV,
  useLocationParams,
  type View,
} from "../lib/navigation";
import { repoCompletedDay } from "../lib/course";
import { SearchModal } from "./SearchModal";

function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > 400);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <button
      type="button"
      className={`back-to-top-fab ${visible ? "is-visible" : ""}`}
      onClick={scrollToTop}
      aria-label="返回顶部"
      title="返回顶部"
    >
      <svg
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
        <path d="M18 15l-6-6-6 6" />
      </svg>
    </button>
  );
}

function NavIcon({ id }: { id: string }) {
  switch (id) {
    case "today": // 学习指南 - Compass
      return (
        <svg
          className="nav-icon"
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
          <circle cx="12" cy="12" r="10" />
          <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
        </svg>
      );
    case "roadmap": // 学习路线 - Map
      return (
        <svg
          className="nav-icon"
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
          <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
          <line x1="8" y1="2" x2="8" y2="18" />
          <line x1="16" y1="6" x2="16" y2="22" />
        </svg>
      );
    case "lessons": // 每日课程 - BookOpen
      return (
        <svg
          className="nav-icon"
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
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
        </svg>
      );
    case "topics": // 专题 - Layers
      return (
        <svg
          className="nav-icon"
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
          <polygon points="12 2 2 7 12 12 22 7 12 2" />
          <polyline points="2 17 12 22 22 17" />
          <polyline points="2 12 12 17 22 12" />
        </svg>
      );
    case "lab": // 编译实验 - Terminal
      return (
        <svg
          className="nav-icon"
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
          <polyline points="4 17 10 11 4 5" />
          <line x1="12" y1="19" x2="20" y2="19" />
        </svg>
      );
    case "review": // 每周复盘 - RotateCcw
      return (
        <svg
          className="nav-icon"
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
          <polyline points="1 4 1 10 7 10" />
          <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
        </svg>
      );
    case "guidelines": // 编码规范 - ShieldCheck
      return (
        <svg
          className="nav-icon"
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
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      );
    case "progress": // 学习进度 - BarChart2
      return (
        <svg
          className="nav-icon"
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
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
      );
    case "search":
      return (
        <svg
          className="nav-icon"
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
      );
    default:
      return null;
  }
}

const GROUPS = ["学习路径", "知识与实践", "学习记录"] as const;

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
  const params = useLocationParams();
  const [isSearchOpen, setIsSearchOpen] = useState(
    params.get("view") === "search" || params.get("q") !== null,
  );

  useEffect(() => {
    if (params.get("view") === "search") {
      setIsSearchOpen(true);
    }
  }, [params]);

  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if (
        !event.isComposing &&
        (event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === "k"
      ) {
        event.preventDefault();
        onPreloadSearch?.();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, [onPreloadSearch]);

  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (group: string) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [group]: !prev[group],
    }));
  };

  const handleHeaderSearchClick = () => {
    onPreloadSearch?.();
    setIsSearchOpen(true);
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
                  <NavIcon id={item.id} />
                  <span>{item.label}</span>
                </button>
              ))}
              <button
                key="search"
                type="button"
                aria-current={view === "search" ? "page" : undefined}
                onClick={(event) => {
                  setIsSearchOpen(true);
                  event.currentTarget
                    .closest("details")
                    ?.removeAttribute("open");
                }}
              >
                <NavIcon id="search" />
                <span>代码搜索</span>
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
          <strong className="brand-title">
            <span className="title-desktop">Professional C++</span>
            <span className="title-mobile">C++ 学习</span>
          </strong>
        </a>

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
      <aside className="sidebar">
        <nav className="side-nav" aria-label="Primary navigation">
          <button
            type="button"
            className={`nav-item nav-item-root ${view === "today" ? "is-active" : ""}`}
            aria-current={view === "today" ? "page" : undefined}
            onClick={() => setView("today")}
          >
            <NavIcon id="today" />
            <span>学习指南</span>
          </button>

          {GROUPS.map((group) => {
            const isCollapsed = !!collapsedGroups[group];
            const groupItems = NAV.filter(
              (item) => item.group === group && item.id !== "today",
            );
            return (
              <div className="nav-accordion-group" key={group}>
                <button
                  type="button"
                  className="nav-accordion-trigger"
                  onClick={() => toggleGroup(group)}
                  aria-expanded={!isCollapsed}
                >
                  <span className="nav-group-title">{group}</span>
                  <svg
                    className={`nav-chevron-icon ${isCollapsed ? "is-collapsed" : ""}`}
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#94a3b8"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
                {!isCollapsed && (
                  <div className="nav-accordion-items">
                    {groupItems.map((item) => (
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
                        <NavIcon id={item.id} />
                        <span>{item.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
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

      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />
      <BackToTop />
    </div>
  );
}
