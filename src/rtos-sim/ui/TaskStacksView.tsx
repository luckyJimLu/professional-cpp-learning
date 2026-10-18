/**
 * TaskStacksView · 按任务的栈帧与共享全局变量视图
 *
 * 每个存活任务一列展示其调用栈帧 (StackFrame[]) 与局部变量，顶部展示所有任务共享的全局变量。
 */

import { taskColor, type RtosSnapshot } from "../types.ts";

export function TaskStacksView({ snapshot }: { snapshot: RtosSnapshot }) {
  return (
    <div className="stacks-view">
      {snapshot.globals.length > 0 && (
        <div className="globals-bar">
          <span className="panel-kicker">GLOBAL MEMORY</span>
          <div className="var-chips">
            {snapshot.globals.map((g) => (
              <span
                key={g.name}
                className={`var-chip${g.status === "modified" ? " is-modified" : ""}`}
              >
                <small>{g.type}</small> <strong>{g.name}</strong> = <code>{g.value}</code>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="task-stacks-columns">
        {snapshot.tasks.map((task, idx) => (
          <section
            key={task.id}
            className={`task-stack-col state-col-${task.state.toLowerCase()}`}
            style={{ "--task-color": taskColor(idx) } as React.CSSProperties}
          >
            <header className="stack-col-header">
              <span className="task-dot" />
              <strong>{task.name}</strong>
              <span className={`state state-${task.state.toLowerCase()}`}>{task.state}</span>
            </header>

            <div className="stack-frames-list">
              {task.frames.map((frame, fIdx) => (
                <div key={fIdx} className="stack-frame-box">
                  <div className="frame-title">
                    <code>{frame.name}()</code>
                    <span>L{task.currentLine || "—"}</span>
                  </div>
                  {frame.variables.length === 0 ? (
                    <p className="frame-empty">无局部变量</p>
                  ) : (
                    <ul className="frame-vars">
                      {frame.variables.map((v) => (
                        <li key={v.name} className={v.status === "modified" ? "is-modified" : ""}>
                          <span>
                            <small>{v.type}</small> {v.name}
                          </span>
                          <code>{v.value}</code>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
