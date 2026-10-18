/**
 * TaskStateMachine · 任务卡片与五状态机转移图 (SVG)
 *
 * 顶部展示所有任务的状态卡片 (.task-card)，点击可切换下方 SVG 状态机聚焦的任务；
 * 当当前事件为 task_state 时，自动高亮发生的转移边。
 */

import { useState } from "react";
import { taskColor, type RtosSnapshot, type TaskState } from "../types.ts";

const STATE_NODES: { id: TaskState; label: string; x: number; y: number }[] = [
  { id: "Ready", label: "Ready (就绪)", x: 110, y: 80 },
  { id: "Running", label: "Running (运行)", x: 310, y: 80 },
  { id: "Blocked", label: "Blocked (阻塞)", x: 210, y: 175 },
  { id: "Suspended", label: "Suspended (挂起)", x: 480, y: 175 },
  { id: "Deleted", label: "Deleted (结束)", x: 510, y: 80 },
];

const STATE_EDGES: { from: TaskState; to: TaskState; label: string; path: string; lx: number; ly: number }[] = [
  { from: "Ready", to: "Running", label: "dispatch", path: "M 162 70 Q 210 42 258 70", lx: 210, ly: 48 },
  { from: "Running", to: "Ready", label: "preempt / yield / slice", path: "M 258 90 Q 210 116 162 90", lx: 210, ly: 118 },
  { from: "Running", to: "Blocked", label: "sleep / wait / lock", path: "M 295 102 L 238 154", lx: 295, ly: 138 },
  { from: "Blocked", to: "Ready", label: "wake / timeout", path: "M 182 154 L 128 102", lx: 125, ly: 138 },
  { from: "Running", to: "Suspended", label: "suspend", path: "M 345 102 L 445 155", lx: 412, ly: 122 },
  { from: "Ready", to: "Suspended", label: "suspend", path: "M 135 102 Q 260 225 428 182", lx: 310, ly: 205 },
  { from: "Suspended", to: "Ready", label: "resume", path: "M 428 168 Q 270 140 155 98", lx: 335, ly: 152 },
  { from: "Running", to: "Deleted", label: "return / terminate", path: "M 362 80 L 458 80", lx: 410, ly: 68 },
];

export function TaskStateMachine({ snapshot }: { snapshot: RtosSnapshot }) {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const eventTaskId =
    snapshot.event.op === "task_state" || snapshot.event.op === "task_create" || snapshot.event.op === "task_delete"
      ? snapshot.event.task
      : typeof snapshot.running === "string" && snapshot.running !== "isr"
        ? snapshot.running
        : snapshot.tasks[0]?.id ?? null;

  const activeTask =
    snapshot.tasks.find((t) => t.id === (selectedTaskId ?? eventTaskId)) ?? snapshot.tasks[0] ?? null;

  const activeTransition =
    snapshot.event.op === "task_state" && activeTask && snapshot.event.task === activeTask.id
      ? { from: snapshot.event.from, to: snapshot.event.to, reason: snapshot.event.reason }
      : null;

  return (
    <div className="tasks-state-layout">
      <div className="task-grid">
        {snapshot.tasks.map((t, i) => {
          const isSelected = activeTask?.id === t.id;
          return (
            <article
              className={`task-card${isSelected ? " is-selected" : ""}`}
              key={t.id}
              style={{ "--task-color": taskColor(i), cursor: "pointer" } as React.CSSProperties}
              onClick={() => setSelectedTaskId(t.id)}
            >
              <div>
                <span className="task-dot" />
                <strong>{t.name}</strong>
                <span className={`state state-${t.state.toLowerCase()}`}>{t.state}</span>
              </div>
              <dl>
                <div>
                  <dt>优先级</dt>
                  <dd>
                    {t.basePriority}
                    {t.effectivePriority !== t.basePriority ? ` → ${t.effectivePriority} (继承)` : ""}
                  </dd>
                </div>
                <div>
                  <dt>当前位置</dt>
                  <dd>L{t.currentLine || "—"}</dd>
                </div>
                <div>
                  <dt>等待</dt>
                  <dd>
                    {t.blockedOn
                      ? `${t.blockedOn.reason}${t.blockedOn.objectName ? `(${t.blockedOn.objectName})` : ""}`
                      : "—"}
                  </dd>
                </div>
              </dl>
            </article>
          );
        })}
      </div>

      {activeTask && (
        <div className="state-machine-diagram">
          <div className="diagram-toolbar">
            <span>
              状态机视图：<strong>{activeTask.name}</strong>（当前状态：<code>{activeTask.state}</code>）
            </span>
            {activeTransition && (
              <span className="transition-pill">
                本步转移：{activeTransition.from} → {activeTransition.to}
                {activeTransition.reason ? ` (${activeTransition.reason})` : ""}
              </span>
            )}
          </div>
          <svg viewBox="0 0 620 220" role="img" aria-label={`任务 ${activeTask.name} 状态转移图`}>
            <defs>
              <marker id="sm-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#94a3b8" />
              </marker>
              <marker
                id="sm-arrow-active"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto"
              >
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#0b7191" />
              </marker>
            </defs>

            {STATE_EDGES.map((edge, idx) => {
              const isHighlighted =
                activeTransition?.from === edge.from && activeTransition?.to === edge.to;
              return (
                <g key={idx} className={isHighlighted ? "sm-edge is-active" : "sm-edge"}>
                  <path
                    d={edge.path}
                    fill="none"
                    stroke={isHighlighted ? "#0b7191" : "#cbd5e1"}
                    strokeWidth={isHighlighted ? 2.5 : 1.3}
                    markerEnd={isHighlighted ? "url(#sm-arrow-active)" : "url(#sm-arrow)"}
                  />
                  <text x={edge.lx} y={edge.ly} textAnchor="middle" className="sm-edge-label">
                    {edge.label}
                  </text>
                </g>
              );
            })}

            {STATE_NODES.map((node) => {
              const isCurrent = activeTask.state === node.id;
              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x - 52}, ${node.y - 22})`}
                  className={`sm-node state-node-${node.id.toLowerCase()}${isCurrent ? " is-current" : ""}`}
                >
                  <rect width="104" height="44" rx="8" />
                  <text x="52" y="26" textAnchor="middle">
                    {node.label}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      )}
    </div>
  );
}
