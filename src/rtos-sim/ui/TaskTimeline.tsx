/**
 * TaskTimeline · RTOS 任务调度甘特时间轴 (SVG)
 *
 * 支持：
 * - 按任务渲染执行区间 (.timeline-segment)
 * - 优先级继承区间叠加斜线纹理与标记
 * - ISR 中断脉冲标记
 * - 当前快照游标线与点击 tick 跳转
 */

import { useMemo } from "react";
import { taskColor, type RtosSnapshot, type TimelineSegment } from "../types.ts";

export function TaskTimeline({
  segments,
  snapshot,
  onTick,
}: {
  segments: TimelineSegment[];
  snapshot: RtosSnapshot | null;
  onTick: (tick: number) => void;
}) {
  const taskNameMap = useMemo(() => {
    const map = new Map<string, string>();
    map.set("idle", "idle");
    if (snapshot) {
      for (const t of snapshot.tasks) {
        map.set(t.id, t.name);
      }
    }
    return map;
  }, [snapshot]);

  const rows = useMemo(() => [...new Set(segments.map((s) => s.task))], [segments]);
  const max = Math.max(1, ...segments.map((s) => s.end));
  const width = 920;
  const left = 104;
  const rowH = 34;

  return (
    <section className="rtos-panel timeline-panel" aria-labelledby="timeline-title">
      <div className="panel-heading">
        <div>
          <span className="panel-kicker">SCHEDULER TRACE</span>
          <h2 id="timeline-title">任务时间轴</h2>
        </div>
        <div className="timeline-legend">
          <span className="legend-chip">
            <i className="legend-swatch swatch-run" /> Running
          </span>
          <span className="legend-chip">
            <i className="legend-swatch swatch-inherit" /> 优先级继承
          </span>
          <span className="legend-chip">
            <i className="legend-swatch swatch-idle" /> Idle / ISR
          </span>
          <span className="tick-readout">TICK {snapshot?.tick ?? 0}</span>
        </div>
      </div>

      {segments.length === 0 ? (
        <div className="empty-state">
          <strong>还没有调度轨迹</strong>
          <span>运行代码后，这里会显示任务的执行与等待区间。</span>
        </div>
      ) : (
        <div className="timeline-scroll">
          <svg
            viewBox={`0 0 ${width} ${Math.max(118, rows.length * rowH + 46)}`}
            role="img"
            aria-label="RTOS 任务甘特时间轴"
          >
            <defs>
              <pattern
                id="rtos-inherit-stripe"
                width="6"
                height="6"
                patternTransform="rotate(45 0 0)"
                patternUnits="userSpaceOnUse"
              >
                <line x1="0" y1="0" x2="0" y2="6" stroke="rgba(255,255,255,0.55)" strokeWidth="2.5" />
              </pattern>
            </defs>

            {Array.from({ length: Math.min(max + 1, 21) }, (_, i) =>
              Math.round((i * max) / Math.min(max, 20)),
            ).map((t) => {
              const x = left + (t / max) * (width - left - 20);
              return (
                <g key={t} onClick={() => onTick(t)} style={{ cursor: "pointer" }}>
                  <line x1={x} y1="24" x2={x} y2={rows.length * rowH + 24} className="timeline-grid" />
                  <text x={x} y={rows.length * rowH + 42} textAnchor="middle" className="timeline-tick">
                    {t}
                  </text>
                </g>
              );
            })}

            {rows.map((id, i) => {
              const label = taskNameMap.get(id) ?? id;
              return (
                <g key={id}>
                  <text x="8" y={i * rowH + 44} className="timeline-label">
                    {label}
                  </text>
                  <line x1={left} y1={i * rowH + 39} x2={width - 20} y2={i * rowH + 39} className="timeline-rail" />
                </g>
              );
            })}

            {segments.map((s, i) => {
              const row = rows.indexOf(s.task);
              const x = left + (s.start / max) * (width - left - 20);
              const segW = Math.max(4, ((s.end - s.start) / max) * (width - left - 20));
              const y = row * rowH + 29;
              const isIdle = s.task === "idle";
              const isIsr = s.state === "isr";
              const fill = isIsr ? "#ef4444" : isIdle ? "#94a3b8" : taskColor(row);
              const label = taskNameMap.get(s.task) ?? s.task;
              return (
                <g key={i}>
                  <rect
                    x={x}
                    y={y}
                    width={segW}
                    height="20"
                    rx="3"
                    fill={fill}
                    className={`timeline-segment${s.inherited ? " is-inherited" : ""}${isIdle ? " is-idle" : ""}`}
                    onClick={() => onTick(s.start)}
                  >
                    <title>
                      {label}: tick {s.start}–{s.end}
                      {s.inherited ? " (优先级继承)" : ""}
                    </title>
                  </rect>
                  {s.inherited && (
                    <rect
                      x={x}
                      y={y}
                      width={segW}
                      height="20"
                      rx="3"
                      fill="url(#rtos-inherit-stripe)"
                      pointerEvents="none"
                    />
                  )}
                </g>
              );
            })}

            {snapshot && (
              <line
                x1={left + (Math.min(max, snapshot.tick) / max) * (width - left - 20)}
                x2={left + (Math.min(max, snapshot.tick) / max) * (width - left - 20)}
                y1="18"
                y2={rows.length * rowH + 25}
                className="timeline-cursor"
              />
            )}
          </svg>
        </div>
      )}
    </section>
  );
}
