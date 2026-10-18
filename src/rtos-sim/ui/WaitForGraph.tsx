/**
 * WaitForGraph · 任务等待关系图 (SVG + 列表)
 *
 * 将任务与内核对象渲染为有向依赖图，并在检测到死锁环时用红色高亮环路。
 */

import type { RtosSnapshot } from "../types.ts";

export function WaitForGraph({ snapshot }: { snapshot: RtosSnapshot }) {
  const { waitFor, tasks, warnings } = snapshot;

  const taskName = (id: string) => tasks.find((t) => t.id === id)?.name ?? id;
  const deadlockWarning = warnings.find((w) => w.includes("死锁"));
  const hasDeadlock = Boolean(deadlockWarning || snapshot.event.op === "deadlock_detected");

  if (waitFor.length === 0) {
    return (
      <div className="empty-state">
        <strong>当前没有等待关系</strong>
        <span>任务发生阻塞时，这里会显示资源依赖图与死锁环检测结果。</span>
      </div>
    );
  }

  return (
    <div className="wait-graph-container">
      {hasDeadlock && (
        <div className="deadlock-alert" role="alert">
          <strong>⚠ 死锁环告警</strong>
          <span>{deadlockWarning ?? "检测到循环等待死锁环"}</span>
        </div>
      )}

      <svg
        viewBox={`0 0 600 ${Math.max(96, waitFor.length * 46 + 24)}`}
        className="wait-graph-svg"
        role="img"
        aria-label="任务等待关系图"
      >
        <defs>
          <marker id="wf-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M 0 1 L 10 5 L 0 9 z" fill={hasDeadlock ? "#dc2626" : "#d97706"} />
          </marker>
        </defs>

        {waitFor.map((edge, i) => {
          const y = 34 + i * 44;
          const fromLabel = taskName(edge.from);
          const toLabel = taskName(edge.to);
          const stroke = hasDeadlock ? "#dc2626" : "#d97706";
          return (
            <g key={i} className={hasDeadlock ? "wf-row is-deadlock" : "wf-row"}>
              <rect x="24" y={y - 16} width="128" height="32" rx="6" className="wf-node wf-task" />
              <text x="88" y={y + 4} textAnchor="middle" className="wf-text">
                {fromLabel}
              </text>

              <line x1="152" y1={y} x2="232" y2={y} stroke={stroke} strokeWidth="2" markerEnd="url(#wf-arrow)" />

              <rect x="236" y={y - 14} width="128" height="28" rx="14" className="wf-node wf-resource" />
              <text x="300" y={y + 4} textAnchor="middle" className="wf-text">
                {edge.label}
              </text>

              {edge.to !== edge.via && (
                <>
                  <line x1="364" y1={y} x2="440" y2={y} stroke={stroke} strokeWidth="2" markerEnd="url(#wf-arrow)" />
                  <rect x="444" y={y - 16} width="128" height="32" rx="6" className="wf-node wf-owner" />
                  <text x="508" y={y + 4} textAnchor="middle" className="wf-text">
                    {toLabel} (持有)
                  </text>
                </>
              )}
            </g>
          );
        })}
      </svg>

      <div className="wait-list">
        {waitFor.map((edge, i) => (
          <div key={i} className={hasDeadlock ? "is-deadlock" : ""}>
            <code>{taskName(edge.from)}</code>
            <span>等待</span>
            <code>{edge.label}</code>
            <span>→</span>
            <code>{taskName(edge.to)}</code>
          </div>
        ))}
      </div>
    </div>
  );
}
