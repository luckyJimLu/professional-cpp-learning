/**
 * RTOS 内核 · 内部类型
 *
 * 解释器与内核之间的协议（KernelCall / KernelResult）、任务记录、内核对象
 * 基类以及对象模块使用的宿主接口（KernelObjectHost）。
 */

import type { RtosConfig, RtosTraceEvent, TaskId, TaskState, BlockReason, ObjectType, KernelObjectView } from "../types.ts";
import type { Value } from "../interpreter/values.ts";

// ==========================================
// 解释器 ↔ 内核 协议
// ==========================================

export type ThreadAttrs = {
  name?: string;
  priority?: number;
  stackWords?: number;
};

export type KernelCall =
  | { kind: "sleep"; ms: number; line: number }
  | { kind: "busy"; ms: number; line: number }
  | { kind: "yield"; line: number }
  | { kind: "stdout"; text: string; line: number }
  | { kind: "var_update"; scope: string; name: string; type: string; value: string; line: number }
  | { kind: "config"; config: Partial<RtosConfig>; line: number }
  | { kind: "thread_create"; attrs: ThreadAttrs | null; entry: Value; args: Value[]; line: number }
  | { kind: "thread_join"; target: TaskId; line: number }
  | { kind: "thread_detach"; target: TaskId; line: number }
  | { kind: "thread_suspend"; target: TaskId; line: number }
  | { kind: "thread_resume"; target: TaskId; line: number }
  | { kind: "thread_terminate"; target: TaskId; line: number }
  | { kind: "set_priority"; priority: number; line: number }
  | { kind: "notify"; target: TaskId; value: number; line: number }
  | { kind: "notify_from_isr"; target: TaskId; value: number; line: number }
  | { kind: "notify_take"; timeoutMs: number | null; forever: boolean; line: number }
  | { kind: "obj_create"; objectType: ObjectType; name: string; init: ObjectInitSpec; line: number }
  | { kind: "mutex_lock"; objectId: string; line: number }
  | { kind: "mutex_try_lock"; objectId: string; line: number }
  | { kind: "mutex_try_lock_for"; objectId: string; ms: number; line: number }
  | { kind: "mutex_unlock"; objectId: string; line: number }
  | { kind: "sem_acquire"; objectId: string; line: number }
  | { kind: "sem_try_acquire"; objectId: string; line: number }
  | { kind: "sem_try_acquire_for"; objectId: string; ms: number; line: number }
  | { kind: "sem_release"; objectId: string; line: number }
  | { kind: "sem_release_from_isr"; objectId: string; line: number }
  | { kind: "cv_wait"; cvId: string; lockId: string; line: number }
  | { kind: "cv_wait_for"; cvId: string; lockId: string; ms: number; line: number }
  | { kind: "cv_notify"; cvId: string; all: boolean; line: number }
  | { kind: "queue_send"; objectId: string; value: Value; timeoutMs: number | null; forever: boolean; line: number }
  | { kind: "queue_send_from_isr"; objectId: string; value: Value; line: number }
  | { kind: "queue_receive"; objectId: string; timeoutMs: number | null; forever: boolean; line: number }
  | { kind: "event_set"; objectId: string; bits: number; line: number }
  | { kind: "event_set_from_isr"; objectId: string; bits: number; line: number }
  | { kind: "event_wait"; objectId: string; mask: number; waitAll: boolean; clearOnExit: boolean; timeoutMs: number | null; forever: boolean; line: number }
  | { kind: "event_clear"; objectId: string; bits: number; line: number }
  | { kind: "timer_create"; name: string; periodMs: number; periodic: boolean; callback: Value; line: number }
  | { kind: "timer_start"; timerId: string; line: number }
  | { kind: "timer_stop"; timerId: string; line: number }
  | { kind: "isr_create"; name: string; callback: Value; line: number }
  | { kind: "isr_trigger_at"; isrId: string; atMs: number; line: number }
  | { kind: "isr_trigger_every"; isrId: string; everyMs: number; line: number }
  | { kind: "thread_dtor_check"; target: TaskId; line: number }
  /** Timer service 任务内部：阻塞到下一个到期定时器 */
  | { kind: "timer_service_wait"; line: number };

export type ObjectInitSpec =
  | { kind: "mutex"; inherit: boolean; recursive: boolean; timed: boolean }
  | { kind: "semaphore"; count: number; max: number }
  | { kind: "condvar" }
  | { kind: "queue"; capacity: number }
  | { kind: "event_group" };

export interface KernelResult {
  value: Value;
  /** timer_service_wait 返回的待执行回调 */
  callbacks?: Value[];
}

export type KernelGen<T = void> = Generator<KernelCall, T, KernelResult>;

// ==========================================
// 任务记录
// ==========================================

/** 任务被唤醒后需要从内核带回的上下文（如收到的消息、cv 等待结果） */
export type WaitState =
  | { type: "sleep" }
  | { type: "busy" }
  | { type: "mutex"; objectId: string; tryFor: boolean; resultOnTimeout: Value }
  | { type: "cv_wait"; cvId: string; lockId: string; timeoutMs: number | null; hasTimeout: boolean }
  | { type: "cv_relock"; cvId: string; lockId: string; notified: boolean }
  | { type: "semaphore"; objectId: string; tryFor: boolean }
  | { type: "queue_send"; objectId: string; value: Value; try: boolean }
  | { type: "queue_receive"; objectId: string; try: boolean }
  | { type: "event_group"; objectId: string; mask: number; waitAll: boolean; clearOnExit: boolean; try: boolean }
  | { type: "notify_take" }
  | { type: "join"; target: TaskId }
  | { type: "timer_service" };

export interface TaskRecord {
  id: TaskId;
  name: string;
  kind: "main" | "user" | "timer-service" | "idle";
  basePriority: number;
  effectivePriority: number;
  state: TaskState;
  blockReason: BlockReason | null;
  blockedObjectId: string | null;
  waitState: WaitState | null;
  wakeTick: number | null; // 超时唤醒的 tick（null = 无限期）
  joiners: TaskId[]; // 等待本任务结束的任务
  generator: KernelGen<void> | null;
  /** 传回 generator.next() 的挂起结果 */
  pendingResult: KernelResult | null;
  /** 是否已完成（generator 结束或被 terminate） */
  finished: boolean;
  joinable: boolean; // 仍有存活线程句柄引用（未 join/detach）
  detached: boolean;
  notifyValue: number;
  busyRemainingTicks: number;
  timesliceTicks: number; // 本轮连续运行累计的 tick（时间片轮转）
  statementBudget: number;
  /** 解释器上下文（调用路径等） */
  interp: TaskInterpInfo | null;
  /** 阻塞开始时等待的对象名（用于反转跟踪） */
  inversionSinceTick: number | null;
}

export interface TaskInterpInfo {
  /** var_update 用调用路径 */
  callPath: string[];
  /** 当前语句行 */
  currentLine: number;
}

// ==========================================
// 内核对象基类与宿主接口
// ==========================================

/** 对象对内核操作的请求结果 */
export type ObjectRequestResult =
  | { status: "granted"; value?: Value }
  | { status: "blocked"; reason: BlockReason; state: WaitState; timeoutTick: number | null }
  | { status: "error"; message: string; level?: "error" | "warning" };

/** 对象模块可以使用的内核能力（由 scheduler 实现，避免循环依赖） */
export interface KernelObjectHost {
  readonly tick: number;
  readonly tasks: Map<TaskId, TaskRecord>;
  /** ms → tick 数（向上取整，至少 1） */
  msToTicks(ms: number): number;
  emit(event: RtosTraceEvent): void;
  /** 阻塞任务（设置 waitState/wakeTick 并发 task_state 事件） */
  blockTask(task: TaskRecord, reason: BlockReason, objectId: string | null, state: WaitState, timeoutTick: number | null): void;
  /** Blocked → Ready（发 task_state 事件）；任务随后由调度器接管 */
  wakeTask(task: TaskRecord, detail: string): void;
  /** 任务已就绪，请求调度器在当前批处理后检查抢占 */
  scheduleCheck(): void;
  /** 重算优先级继承（mutex waiter/owner 变化时调用） */
  recomputePriorities(): void;
  /** 诊断（不会中止模拟） */
  warn(message: string, line?: number, task?: TaskId): void;
}

export interface KernelObjectBase {
  readonly id: string;
  readonly name: string;
  readonly kind: ObjectType;
  /** 当前视图状态（快照/obj_op.state 用） */
  view(): KernelObjectView;
  /** 超时回调：把任务从等待队列移除；返回 true 表示已处理 */
  onTimeout(task: TaskRecord): boolean;
}

export function makeTaskRecord(init: Partial<TaskRecord> & Pick<TaskRecord, "id" | "name" | "kind" | "basePriority">): TaskRecord {
  return {
    state: "Ready",
    blockReason: null,
    blockedObjectId: null,
    waitState: null,
    wakeTick: null,
    joiners: [],
    generator: null,
    pendingResult: null,
    finished: false,
    joinable: false,
    detached: false,
    notifyValue: 0,
    busyRemainingTicks: 0,
    timesliceTicks: 0,
    statementBudget: 0,
    interp: null,
    inversionSinceTick: null,
    effectivePriority: init.basePriority ?? 0,
    ...init,
  };
}
