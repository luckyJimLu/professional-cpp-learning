/**
 * RtosApp · 独立全屏 RTOS 并发模拟器顶层应用
 *
 * 解析 URL 参数：
 * - ?scenario=<id>：选择预置场景（支持别名如 priority-inversion / mutex）
 * - ?day=<number>：记录来源课程天数，“← 返回课程”可精确回到对应课程页
 */

import { useEffect, useMemo, useState } from "react";
import { findScenario, RTOS_SCENARIOS } from "./scenarios.ts";
import { RtosWorkbench } from "./ui/RtosWorkbench.tsx";

export function RtosApp() {
  const params = useMemo(() => new URLSearchParams(location.search), []);
  const initialScenario = useMemo(
    () => findScenario(params.get("scenario")),
    [params],
  );
  const fromDay = params.get("day");

  const [id, setId] = useState(initialScenario.id);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const scenario = findScenario(id);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        }
      }
    } catch (err) {
      console.warn("Fullscreen toggle failed:", err);
    }
  };

  const change = (next: string) => {
    setId(next);
    const url = new URL(location.href);
    url.searchParams.set("scenario", next);
    history.replaceState({}, "", url);
  };

  const backHref = fromDay
    ? `${import.meta.env.BASE_URL}?view=lesson&day=${encodeURIComponent(fromDay)}`
    : import.meta.env.BASE_URL;

  return (
    <div className={`rtos-app${isFullscreen ? " is-fullscreen" : ""}`}>
      <header className="rtos-header">
        <div className="rtos-brand">
          <span className="kernel-mark" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <div>
            <h1>RTOS 并发模拟器</h1>
            <span>DETERMINISTIC KERNEL LAB</span>
          </div>
        </div>
        <div className="scenario-context">
          <label htmlFor="scenario">场景</label>
          <select id="scenario" value={scenario.id} onChange={(e) => change(e.target.value)}>
            {RTOS_SCENARIOS.map((s) => (
              <option value={s.id} key={s.id}>
                {s.title}
              </option>
            ))}
          </select>
          <p>{scenario.lesson}</p>
        </div>
        <div className="rtos-header-actions">
          <button
            type="button"
            className="fullscreen-btn"
            onClick={toggleFullscreen}
            title={isFullscreen ? "退出全屏 (Esc)" : "全屏模式"}
            aria-label={isFullscreen ? "退出全屏" : "全屏模式"}
          >
            {isFullscreen ? (
              <>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
                </svg>
                <span>退出全屏</span>
              </>
            ) : (
              <>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                </svg>
                <span>全屏</span>
              </>
            )}
          </button>
          <a className="back-link" href={backHref}>
            ← 返回课程
          </a>
        </div>
      </header>
      <div id="rtos-main">
        <RtosWorkbench key={scenario.id} scenario={scenario} />
      </div>
    </div>
  );
}
