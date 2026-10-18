/**
 * RtosApp · 独立全屏 RTOS 并发模拟器顶层应用
 *
 * 解析 URL 参数：
 * - ?scenario=<id>：选择预置场景（支持别名如 priority-inversion / mutex）
 * - ?day=<number>：记录来源课程天数，“← 返回课程”可精确回到对应课程页
 */

import { useMemo, useState } from "react";
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
  const scenario = findScenario(id);

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
    <div className="rtos-app">
      <a className="skip-link" href="#rtos-main">
        跳到模拟器
      </a>
      <header className="rtos-header">
        <div className="rtos-brand">
          <span className="kernel-mark" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <div>
            <strong>RTOS 并发模拟器</strong>
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
        <a className="back-link" href={backHref}>
          ← 返回课程
        </a>
      </header>
      <div id="rtos-main">
        <RtosWorkbench key={scenario.id} scenario={scenario} />
      </div>
    </div>
  );
}
