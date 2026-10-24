/**
 * RtosWorkbench · RTOS 并发可视化工作台
 *
 * 左侧：CodeMirror 多任务彩色行高亮编辑器 + 行级诊断面板
 * 右侧：上方常驻 Gantt 时间轴，下方 Tab 切换（任务状态机 / 内核对象 / 等待关系 / 任务栈视图）+ 控制台
 * 底部：扩展版 VCR 回放栏（含下一次切换、下一 tick、粒度切换、速度与内核配置浮层）
 */

import { useEffect, useState } from "react";
import { moveTabFocus } from "../../lib/keyboardTabs";
import { CodeMirrorEditor } from "../../visualizer/CodeMirrorEditor.tsx";
import type { SnapshotGranularity } from "../rtosReducer.ts";
import type { RtosScenario } from "../scenarios.ts";
import {
  taskColor,
  type RtosConfig,
  type RtosSnapshot,
  type VisualizerTraceV3,
} from "../types.ts";
import { useRtosSession } from "../useRtosSession.ts";
import { KernelObjectsPanel } from "./KernelObjectsPanel.tsx";
import { RtosConfigPopover } from "./RtosConfigPopover.tsx";
import { TaskStacksView } from "./TaskStacksView.tsx";
import { TaskStateMachine } from "./TaskStateMachine.tsx";
import { TaskTimeline } from "./TaskTimeline.tsx";
import { WaitForGraph } from "./WaitForGraph.tsx";

function DetailPanel({ snapshot }: { snapshot: RtosSnapshot | null }) {
  const [tab, setTab] = useState<"tasks" | "objects" | "wait" | "stacks">(
    "tasks",
  );

  return (
    <section className="rtos-panel detail-panel">
      <div className="tabs" role="tablist" aria-label="模拟器详情">
        {(
          [
            ["tasks", "任务状态"],
            ["objects", "内核对象"],
            ["wait", "等待关系"],
            ["stacks", "任务栈视图"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            role="tab"
            id={`rtos-tab-${id}`}
            aria-controls="rtos-detail-panel"
            tabIndex={tab === id ? 0 : -1}
            onKeyDown={moveTabFocus}
            aria-selected={tab === id}
            className={tab === id ? "is-active" : ""}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      <div
        className="tab-body"
        id="rtos-detail-panel"
        role="tabpanel"
        aria-labelledby={`rtos-tab-${tab}`}
        tabIndex={0}
      >
        {!snapshot ? (
          <div className="empty-state">
            <strong>等待第一次运行</strong>
            <span>
              你可以直接使用预置代码，或在左侧编辑后按 Ctrl / ⌘ + Enter。
            </span>
          </div>
        ) : tab === "tasks" ? (
          <TaskStateMachine snapshot={snapshot} />
        ) : tab === "objects" ? (
          <KernelObjectsPanel
            objects={snapshot.objects}
            tasks={snapshot.tasks}
          />
        ) : tab === "wait" ? (
          <WaitForGraph snapshot={snapshot} />
        ) : (
          <TaskStacksView snapshot={snapshot} />
        )}
      </div>
    </section>
  );
}

function Playback({
  snapshot,
  total,
  current,
  onChange,
  onNextSwitch,
  onNextTick,
  granularity,
  onChangeGranularity,
  config,
  onChangeConfig,
  trace,
  onRun,
  stale,
  running,
}: {
  snapshot: RtosSnapshot | null;
  total: number;
  current: number;
  onChange: (n: number) => void;
  onNextSwitch: () => void;
  onNextTick: () => void;
  granularity: SnapshotGranularity;
  onChangeGranularity: (g: SnapshotGranularity) => void;
  config: Partial<RtosConfig>;
  onChangeConfig: (next: Partial<RtosConfig>) => void;
  trace: VisualizerTraceV3 | null;
  onRun: () => void;
  stale: boolean;
  running: boolean;
}) {
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(650);

  useEffect(() => {
    if (!playing) return;
    if (current >= total - 1) {
      setPlaying(false);
      return;
    }
    const id = window.setTimeout(() => onChange(current + 1), speed);
    return () => clearTimeout(id);
  }, [playing, current, total, speed, onChange]);

  return (
    <footer className="playback">
      <div className="playback-buttons">
        <button
          onClick={() => onChange(0)}
          disabled={!total || current === 0}
          aria-label="回到开始"
          title="回到开始"
        >
          ⏮
        </button>
        <button
          onClick={() => onChange(current - 1)}
          disabled={!total || current === 0}
          aria-label="上一步"
          title="上一步"
        >
          ◀
        </button>
        <button
          className="play-main"
          onClick={() => {
            if (!playing && current >= total - 1) onChange(0);
            setPlaying((v) => !v);
          }}
          disabled={!total}
        >
          {playing ? "暂停" : "播放"}
        </button>
        <button
          onClick={() => onChange(current + 1)}
          disabled={!total || current >= total - 1}
          aria-label="下一步"
          title="下一步"
        >
          ▶
        </button>
        <button
          onClick={() => onChange(total - 1)}
          disabled={!total || current >= total - 1}
          aria-label="跳到结尾"
          title="跳到结尾"
        >
          ⏭
        </button>
        <button
          type="button"
          className="step-shortcut-btn"
          onClick={onNextSwitch}
          disabled={!total || current >= total - 1}
          title="跳到下一次上下文切换"
        >
          下一次切换 ⇥
        </button>
        <button
          type="button"
          className="step-shortcut-btn"
          onClick={onNextTick}
          disabled={!total || current >= total - 1}
          title="跳到下一 Tick"
        >
          下一 tick
        </button>
      </div>

      <input
        aria-label="回放步骤"
        type="range"
        min="0"
        max={Math.max(0, total - 1)}
        value={current}
        onChange={(e) => onChange(Number(e.target.value))}
      />

      <div className="playback-meta">
        <span className="step-count">
          {total ? `${current + 1} / ${total}` : "0 / 0"}
        </span>
        <select
          aria-label="播放速度"
          className="playback-select"
          value={speed}
          onChange={(e) => setSpeed(Number(e.target.value))}
        >
          <option value={1000}>0.6x</option>
          <option value={650}>1.0x</option>
          <option value={300}>2.0x</option>
        </select>
        <select
          aria-label="快照粒度"
          className="playback-select"
          value={granularity}
          onChange={(e) =>
            onChangeGranularity(e.target.value as SnapshotGranularity)
          }
        >
          <option value="statement">粒度: 语句</option>
          <option value="kernel">粒度: 事件</option>
        </select>
        <RtosConfigPopover
          config={config}
          onChangeConfig={onChangeConfig}
          trace={trace}
        />
      </div>

      <button
        className="run-button"
        onClick={onRun}
        disabled={running}
        aria-busy={running}
      >
        {running ? "模拟中…" : stale ? "重新运行" : "运行模拟"}
      </button>

      <div className="event-caption">
        <span>当前事件</span>
        {snapshot?.description ??
          (running ? "正在生成确定性轨迹…" : "运行模拟后逐步查看内核事件")}
      </div>
    </footer>
  );
}

export function RtosWorkbench({ scenario }: { scenario: RtosScenario }) {
  const session = useRtosSession(scenario.code, scenario.config);
  const snapshot = session.snapshots[session.currentStep] ?? null;

  useEffect(() => {
    session.run();
  }, [scenario.id]);

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (!e.isComposing && (e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        session.run();
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [session.run]);

  const activeLines = Object.fromEntries(
    Object.entries(snapshot?.activeLines ?? {}).map(([id, line], i) => [
      id,
      { line, color: taskColor(i) },
    ]),
  );

  const jumpTick = (tick: number) => {
    const i = session.snapshots.findIndex((s) => s.tick >= tick);
    session.setCurrentStep(i < 0 ? session.snapshots.length - 1 : i);
  };

  return (
    <main className="rtos-workbench">
      <section className="code-pane">
        <div className="code-pane-heading">
          <div>
            <span className="panel-kicker">C++ SUBSET</span>
            <h2>任务代码</h2>
          </div>
          <span
            className={session.stale ? "draft-badge is-stale" : "draft-badge"}
          >
            {session.stale ? "轨迹待更新" : "轨迹已同步"}
          </span>
        </div>
        <div className="editor-wrap">
          <CodeMirrorEditor
            value={session.code}
            onChange={session.setCode}
            activeLines={activeLines}
            wrapLines
          />
        </div>
        <div className="diagnostics" aria-live="polite">
          {session.diagnostics.length ? (
            session.diagnostics.map((d, i) => (
              <p className={d.level} key={i}>
                <strong>{d.level === "error" ? "错误" : "提示"}</strong>
                {d.line ? ` L${d.line}` : ""} · {d.message}
              </p>
            ))
          ) : (
            <p>受限 C++ 子集 · 模拟时钟不会调用 Clang / WASM</p>
          )}
        </div>
      </section>

      <section className="trace-pane">
        <TaskTimeline
          segments={session.trace?.timeline ?? []}
          snapshot={snapshot}
          onTick={jumpTick}
        />
        <DetailPanel snapshot={snapshot} />
        <section className="console-panel">
          <div>
            <span className="panel-kicker">STDOUT</span>
            <pre>{snapshot?.stdout || "// 程序输出会出现在这里"}</pre>
          </div>
          {snapshot?.warnings.length ? (
            <div className="warning-box">
              <strong>内核告警</strong>
              {snapshot.warnings.map((w, i) => (
                <p key={i}>{w}</p>
              ))}
            </div>
          ) : null}
        </section>
      </section>

      <Playback
        snapshot={snapshot}
        total={session.snapshots.length}
        current={session.currentStep}
        onChange={session.setCurrentStep}
        onNextSwitch={session.jumpNextSwitch}
        onNextTick={session.jumpNextTick}
        granularity={session.granularity}
        onChangeGranularity={session.setGranularity}
        config={session.config}
        onChangeConfig={session.setConfig}
        trace={session.trace}
        onRun={session.run}
        stale={session.stale}
        running={session.status === "running"}
      />
    </main>
  );
}
