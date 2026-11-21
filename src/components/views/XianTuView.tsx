import { useEffect, useState } from "react";
import { XianTuModule } from "../../modules/xiantu/XianTuModule";

export function XianTuView() {
  const [isDark, setIsDark] = useState<boolean>(() => {
    try {
      return window.localStorage.getItem("xiantu_theme") === "dark";
    } catch {
      return false;
    }
  });
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    try {
      window.localStorage.setItem("xiantu_theme", isDark ? "dark" : "light");
    } catch {
      // Ignore storage restrictions
    }
  }, [isDark]);

  useEffect(() => {
    let rafId = 0;
    const updateScroll = () => {
      rafId = 0;
      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - window.innerHeight;
      const ratio =
        scrollable > 0 ? Math.min(1, Math.max(0, window.scrollY / scrollable)) : 0;
      setScrollProgress(ratio);
    };

    const handleScroll = () => {
      if (!rafId) {
        rafId = window.requestAnimationFrame(updateScroll);
      }
    };

    updateScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, []);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className={`xiantu-view ${isDark ? "dark" : ""}`}>
      <div className="min-h-[calc(100vh-var(--header-height,56px))] flex flex-col bg-[#F6F7F5] text-[#141918] dark:bg-[#101514] dark:text-[#E8ECEA] transition-colors duration-200 selection:bg-[#1E6B52]/20 selection:text-[#141918] dark:selection:bg-[#4FA687]/25 dark:selection:text-[#F0F4F2]">
        {/* Sub-module sticky header positioned directly below the main Shell header */}
        <header className="sticky top-[var(--header-height,56px)] z-20 bg-[#F6F7F5]/94 dark:bg-[#101514]/94 backdrop-blur-md border-b border-[#141918]/10 dark:border-[#E8ECEA]/10">
          <div
            className="h-[2px] w-full bg-[#1E6B52] dark:bg-[#5AB897] origin-left will-change-transform"
            style={{ transform: `scaleX(${scrollProgress})` }}
            aria-hidden="true"
          />
          <div className="max-w-7xl mx-auto px-6 lg:px-8 h-14 flex items-center justify-between gap-6">
            <button
              type="button"
              onClick={() => scrollToSection("overview")}
              className="font-editorial text-base sm:text-lg font-semibold tracking-tight text-[#141918] dark:text-[#F0F4F2] whitespace-nowrap shrink-0 bg-transparent border-0 p-0 cursor-pointer"
            >
              仙途 · C++ 修仙录
            </button>

            <nav
              className="hidden md:flex items-center gap-6 text-sm font-medium text-[#525E5B] dark:text-[#A0AEA9]"
              aria-label="仙途章节导航"
            >
              <button
                type="button"
                onClick={() => scrollToSection("overview")}
                className="hover:text-[#141918] dark:hover:text-white transition-colors whitespace-nowrap shrink-0 bg-transparent border-0 p-0 cursor-pointer"
              >
                本章概览
              </button>
              <button
                type="button"
                onClick={() => scrollToSection("artifacts")}
                className="hover:text-[#141918] dark:hover:text-white transition-colors whitespace-nowrap shrink-0 bg-transparent border-0 p-0 cursor-pointer"
              >
                登场法宝
              </button>
              <button
                type="button"
                onClick={() => scrollToSection("stages")}
                className="hover:text-[#141918] dark:hover:text-white transition-colors whitespace-nowrap shrink-0 bg-transparent border-0 p-0 cursor-pointer"
              >
                三回阶梯
              </button>
              <button
                type="button"
                onClick={() => scrollToSection("epilogue")}
                className="hover:text-[#141918] dark:hover:text-white transition-colors whitespace-nowrap shrink-0 bg-transparent border-0 p-0 cursor-pointer"
              >
                时期复盘
              </button>
              <button
                type="button"
                onClick={() => scrollToSection("trial")}
                className="hover:text-[#141918] dark:hover:text-white transition-colors whitespace-nowrap shrink-0 bg-transparent border-0 p-0 cursor-pointer"
              >
                圆满试炼
              </button>
            </nav>

            <div className="flex items-center shrink-0">
              <button
                type="button"
                onClick={() => scrollToSection("trial")}
                className="min-h-[34px] px-3.5 py-1.5 text-xs font-medium rounded-lg bg-[#141918] text-[#F6F7F5] dark:bg-[#4FA687] dark:text-[#0E1614] hover:opacity-90 transition-opacity whitespace-nowrap shrink-0"
              >
                综合试炼
              </button>
            </div>
          </div>
        </header>

        <div className="flex-1">
          <XianTuModule isDark={isDark} onToggleTheme={() => setIsDark((v) => !v)} />
        </div>

        <footer className="border-t border-[#141918]/10 dark:border-[#E8ECEA]/10 py-8">
          <div className="max-w-7xl mx-auto px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#596662] dark:text-[#98A6A1]">
            <p className="font-editorial text-sm text-[#141918] dark:text-[#E8ECEA] m-0">
              仙途 · 现代 C++23 修仙录（第一时期 · 炼气期 第 1–3 章）
            </p>
            <div className="flex flex-wrap items-center gap-5">
              <button
                type="button"
                onClick={() => scrollToSection("overview")}
                className="hover:text-[#1E6B52] dark:hover:text-[#5AB897] transition-colors bg-transparent border-0 p-0 cursor-pointer"
              >
                返回卷首
              </button>
              <button
                type="button"
                onClick={() => scrollToSection("artifacts")}
                className="hover:text-[#1E6B52] dark:hover:text-[#5AB897] transition-colors bg-transparent border-0 p-0 cursor-pointer"
              >
                登场法宝
              </button>
              <button
                type="button"
                onClick={() => scrollToSection("stages")}
                className="hover:text-[#1E6B52] dark:hover:text-[#5AB897] transition-colors bg-transparent border-0 p-0 cursor-pointer"
              >
                三回阶梯
              </button>
              <button
                type="button"
                onClick={() => scrollToSection("epilogue")}
                className="hover:text-[#1E6B52] dark:hover:text-[#5AB897] transition-colors bg-transparent border-0 p-0 cursor-pointer"
              >
                时期复盘
              </button>
              <button
                type="button"
                onClick={() => scrollToSection("trial")}
                className="hover:text-[#1E6B52] dark:hover:text-[#5AB897] transition-colors bg-transparent border-0 p-0 cursor-pointer"
              >
                圆满试炼
              </button>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default XianTuView;
