/**
 * RTOS 并发可视化模拟器 · 公共类型定义
 *
 * 与现有 `src/visualizer/types.ts` 平行：RTOS 链路的事件、快照、任务、对象与配置
 * 全部定义在 `src/rtos-sim/` 内，两条链路互相隔离。
 */

import type { StackFrame, StackVariable } from "../visualizer/types";

// ==========================================
// 基础标识
// ==========================================

/** 任务 id：main / idle / timer-svc / t0,t1... */
export type TaskId = string;

export type TaskState = "Ready" | "Running" | "Blocked" | "Suspended" | "Deleted";

/** 阻塞原因（Blocked 状态细分） */
export type BlockReason =
  | "Delay" // sleep_for / notify_take 等待中的超时
  | "Mutex"
  | "CondVar"
  | "Semaphore"
  | "QueueSend"
  | "QueueReceive"
  | "EventGroup"
  | "Notify"
  | "Join"
  | "TimerService";

/** 内核对象种类 */
export type ObjectType =
  | "mutex"
  | "semaphore"
  | "condvar"
  | "queue"
  | "event_group"
  | "timer"
  | "isr";

/** 模拟器配置（rtos::config 可在运行时覆盖前四项） */
export interface RtosConfig {
  tick_ms: number;
  time_slice_ticks: number;
  /** 每 N 个 tick 注入一次虚假唤醒；0 = 关闭 */
  spurious_wakeup_every: number;
  max_ticks: number;
}

export const DEFAULT_RTOS_CONFIG: RtosConfig = {
  tick_ms: 1,
  time_slice_ticks: 5,
  spurious_wakeup_every: 0,
  max_ticks: 2000,
};

/** 优先级上限与内核保留优先级（优先级越大越高，与 FreeRTOS 一致） */
export const RTOS_MAX_PRIORITY = 9;
/** std::thread / main 的默认优先级 */
export const RTOS_DEFAULT_PRIORITY = 2;
/** Timer service 任务优先级（最高 - 1） */
export const RTOS_TIMER_SERVICE_PRIORITY = 8;
/** Idle 任务优先级 */
export const RTOS_IDLE_PRIORITY = 0;

export const MAX_RTOS_TICKS = 5000;
export const MAX_RTOS_SNAPSHOTS = 3000;
export const MAX_RTOS_EVENTS = 20000;
/** 单个任务在一个“清醒周期”内可执行的最大语句数（防止忙等死循环） */
export const RTOS_STATEMENT_BUDGET = 10000;
/** 无优先级继承的互斥锁反转持续超过该 tick 数时给出告警 */
export const RTOS_INVERSION_WARN_TICKS = 20;

export interface RtosDiagnostic {
  level: "error" | "warning";
  message: string;
  line?: number;
  task?: TaskId;
}

// ==========================================
// 轨迹事件（RtosTraceEvent）
// ==========================================

export interface TaskCreateEvent {
  op: "task_create";
  tick: number;
  task: TaskId;
  name: string;
  priority: number;
  line: number;
}

export interface TaskDeleteEvent {
  op: "task_delete";
  tick: number;
  task: TaskId;
  reason: "return" | "terminate";
}

export interface TaskStateEvent {
  op: "task_state";
  tick: number;
  task: TaskId;
  from: TaskState;
  to: TaskState;
  reason: BlockReason | null;
  objectId?: string;
  detail?: string; // "preempt" | "timeout" | "notify" | "resume" | "suspend" | "spurious" | ...
  line: number;
}

export interface ContextSwitchEvent {
  op: "context_switch";
  tick: number;
  from: TaskId | null;
  to: TaskId;
  cause: "preempt" | "block" | "yield" | "timeslice" | "isr_return" | "exit" | "start" | "idle";
}

export interface PrioChangeEvent {
  op: "prio_inherit" | "prio_restore";
  tick: number;
  task: TaskId;
  from: number;
  to: number;
  objectId: string;
}

export type KernelObjectInit =
  | { kind: "mutex"; inherit: boolean; recursive: boolean; timed: boolean }
  | { kind: "semaphore"; count: number; max: number }
  | { kind: "condvar" }
  | { kind: "queue"; capacity: number }
  | { kind: "event_group" }
  | { kind: "timer"; periodMs: number; periodic: boolean }
  | { kind: "isr" };

export interface ObjCreateEvent {
  op: "obj_create";
  tick: number;
  object: { id: string; kind: ObjectType; name: string; init: KernelObjectInit };
  line: number;
}

export interface ObjOpEvent {
  op: "obj_op";
  tick: number;
  task: TaskId | "isr";
  objectId: string;
  action: string;
  value?: string;
  ok: boolean;
  line: number;
  /** 操作完成后对象的完整视图（reducer 直接采用，避免重复实现内核语义） */
  state?: KernelObjectView;
}

export interface IsrEnterEvent {
  op: "isr_enter";
  tick: number;
  isr: string;
}

export interface IsrExitEvent {
  op: "isr_exit";
  tick: number;
  isr: string;
  /** ISR 返回后恢复运行的任务（portYIELD_FROM_ISR 之后） */
  resume: TaskId | null;
}

export interface TimerFireEvent {
  op: "timer_fire";
  tick: number;
  timer: string;
}

export interface SpuriousWakeupEvent {
  op: "spurious_wakeup";
  tick: number;
  task: TaskId;
  objectId: string;
}

export interface VarUpdateEvent {
  op: "var_update";
  tick: number;
  task: TaskId;
  /** "global" 或调用路径（如 "main/worker"） */
  scope: string;
  name: string;
  type: string;
  value: string;
  line: number;
}

export interface StdoutEvent {
  op: "stdout";
  tick: number;
  task: TaskId | "isr";
  text: string;
  line: number;
}

export interface DeadlockEvent {
  op: "deadlock_detected";
  tick: number;
  cycle: string[];
}

export interface SystemStallEvent {
  op: "system_stall";
  tick: number;
}

export interface DiagnosticEvent {
  op: "diagnostic";
  tick: number;
  level: "warning" | "error";
  message: string;
  line?: number;
  task?: TaskId;
}

export type RtosTraceEvent =
  | TaskCreateEvent
  | TaskDeleteEvent
  | TaskStateEvent
  | ContextSwitchEvent
  | PrioChangeEvent
  | ObjCreateEvent
  | ObjOpEvent
  | IsrEnterEvent
  | IsrExitEvent
  | TimerFireEvent
  | SpuriousWakeupEvent
  | VarUpdateEvent
  | StdoutEvent
  | DeadlockEvent
  | SystemStallEvent
  | DiagnosticEvent;

// ==========================================
// 视图模型
// ==========================================

export type MutexView = {
  kind: "mutex";
  id: string;
  name: string;
  owner: string | null;
  ownerEffective: number;
  recursion: number;
  inherit: boolean;
  recursive: boolean;
  waiters: string[];
};

export type SemaphoreView = {
  kind: "semaphore";
  id: string;
  name: string;
  count: number;
  max: number;
  waiters: string[];
};

export type CondvarView = {
  kind: "condvar";
  id: string;
  name: string;
  waiters: string[];
  attachedLock: string | null;
};

export type QueueView = {
  kind: "queue";
  id: string;
  name: string;
  capacity: number;
  buffer: string[];
  head: number;
  senders: string[];
  receivers: string[];
};

export type EventGroupView = {
  kind: "event_group";
  id: string;
  name: string;
  bits: number;
  waiters: { task: string; mask: number; all: boolean }[];
};

export type TimerView = {
  kind: "timer";
  id: string;
  name: string;
  periodMs: number;
  periodic: boolean;
  running: boolean;
  nextFireTick: number | null;
};

export type IsrView = {
  kind: "isr";
  id: string;
  name: string;
  nextFireTick: number | null;
  everyMs: number | null;
  firedCount: number;
};

export type KernelObjectView =
  | MutexView
  | SemaphoreView
  | CondvarView
  | QueueView
  | EventGroupView
  | TimerView
  | IsrView;

export interface TaskView {
  id: TaskId;
  name: string;
  kind: "main" | "user" | "timer-service" | "idle";
  state: TaskState;
  basePriority: number;
  effectivePriority: number;
  blockedOn: { reason: BlockReason; objectName: string | null } | null;
  currentLine: number;
  frames: StackFrame[];
  joinable: boolean;
  notifyValue: number;
}

export interface WaitForEdge {
  from: TaskId;
  to: TaskId | string;
  via: string;
  /** 等待的对象/任务名称 */
  label: string;
}

export interface RtosSnapshot {
  stepIndex: number;
  tick: number;
  description: string;
  running: TaskId | "isr" | null;
  tasks: TaskView[];
  objects: KernelObjectView[];
  waitFor: WaitForEdge[];
  timelineUntilTick: number;
  stdout: string;
  warnings: string[];
  activeLines: Record<TaskId, number>;
  globals: StackVariable[];
  /** 本步骤对应的事件（用于联动高亮与 E2E 断言） */
  event: RtosTraceEvent;
}

export interface TimelineSegment {
  task: TaskId;
  start: number;
  end: number;
  state: TaskState | "isr";
  reason?: BlockReason | null;
  inherited?: boolean;
}

/** 导出 / 预置轨迹（与 VisualizerTraceV2 平行，模式为 rtos-sim） */
export interface VisualizerTraceV3 {
  schemaVersion: 3;
  mode: "rtos-sim";
  accuracy: "exact";
  title?: string;
  sourceCode: string;
  config: RtosConfig;
  events: RtosTraceEvent[];
  timeline: TimelineSegment[];
  endedReason: RtosEndedReason;
}

export type RtosEndedReason =
  | "completed" // 所有任务正常结束
  | "max_ticks" // 达到最大 tick
  | "stalled" // 系统卡死
  | "deadlock" // 死锁后停止（死锁事件单独存在；通常继续运行到 stall/max_ticks）
  | "aborted" // 解释器中止（忙等/运行时错误）
  | "parse_error"; // 解析失败（无 events）

export interface RtosSimulationResult {
  trace: VisualizerTraceV3 | null;
  diagnostics: RtosDiagnostic[];
}

/** UI 任务配色（按任务创建顺序固定分配） */
export const RTOS_TASK_COLORS = [
  "#f59e0b", // amber
  "#38bdf8", // sky
  "#a78bfa", // violet
  "#34d399", // emerald
  "#fb7185", // rose
  "#facc15", // yellow
  "#4ade80", // green
  "#22d3ee", // cyan
  "#c084fc", // purple
  "#fda4af", // pink
  "#fdba74", // orange
  "#7dd3fc", // light sky
] as const;

export function taskColor(index: number): string {
  return RTOS_TASK_COLORS[index % RTOS_TASK_COLORS.length];
}
