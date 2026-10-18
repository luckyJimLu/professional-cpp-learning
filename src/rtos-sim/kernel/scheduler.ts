/**
 * RTOS 确定性内核调度器
 *
 * 支持：
 * 1. 固定优先级抢占 + 同优先级时间片轮转（FIFO）
 * 2. Mutex（含 FreeRTOS 优先级继承与恢复、递归锁、限时锁、反转告警）
 * 3. Semaphore（计数/二值、限时获取、ISR 释放）
 * 4. Condition Variable（原子解锁阻塞、唤醒后重获锁、虚假唤醒注入）
 * 5. Message Queue（定长环形缓冲、阻塞收发、ISR 发送）
 * 6. Event Group（ANY/ALL 位图等待、退出清除、ISR 置位）
 * 7. Task Notification（notify / notify_from_isr / notify_take）
 * 8. Software Timer（高优先级 timer-service 守护任务回调）与 ISR（抢占与阻塞 API 拦截）
 * 9. 等待图（Wait-For Graph）DFS 死锁环检测与系统全局卡死（system_stall）检测
 */

import { isIsrAllowed } from "../frontend/apiCatalog.ts";
import type { InterpreterRuntime } from "../interpreter/exec.ts";
import { VOID, boolValue, formatValue, intValue, type Value } from "../interpreter/values.ts";
import {
  MAX_RTOS_EVENTS,
  MAX_RTOS_TICKS,
  RTOS_DEFAULT_PRIORITY,
  RTOS_INVERSION_WARN_TICKS,
  RTOS_MAX_PRIORITY,
  RTOS_STATEMENT_BUDGET,
  RTOS_TIMER_SERVICE_PRIORITY,
  type BlockReason,
  type KernelObjectView,
  type RtosConfig,
  type RtosDiagnostic,
  type RtosEndedReason,
  type RtosTraceEvent,
  type TaskId,
  type TaskState,
  type TimelineSegment,
} from "../types.ts";
import { KernelCondVar } from "./objects/condvar.ts";
import { KernelEventGroup } from "./objects/eventGroup.ts";
import { KernelIsr } from "./objects/isr.ts";
import { KernelMutex } from "./objects/mutex.ts";
import { KernelQueue } from "./objects/queue.ts";
import { KernelSemaphore } from "./objects/semaphore.ts";
import { KernelTimer } from "./objects/timer.ts";
import type { KernelCall, KernelGen, KernelResult } from "./types.ts";
import { detectDeadlockCycle, type WaitGraphTask } from "./waitFor.ts";

type KernelObjectInstance =
  | KernelMutex
  | KernelSemaphore
  | KernelCondVar
  | KernelQueue
  | KernelEventGroup
  | KernelTimer
  | KernelIsr;

interface Task {
  id: TaskId;
  name: string;
  kind: "main" | "user" | "timer-service";
  priority: number;
  effective: number;
  state: TaskState;
  gen: KernelGen<void>;
  pending: KernelResult;
  wake: number | null;
  blocked: BlockReason | null;
  objectId: string | null;
  order: number;
  busy: number;
  slice: number;
  joiners: TaskId[];
  line: number;
  notify: number;
  joinable: boolean;
  detached: boolean;
  /** 若任務从 CondVar 唤醒后正在等待重新锁住 Mutex，记录目标锁与唤醒结果 */
  relockMutexId: string | null;
  relockResult: Value | null;
  /** 无继承互斥锁发生优先级反转的起始 tick */
  inversionStartTick: number | null;
}

export interface SchedulerResult {
  events: RtosTraceEvent[];
  timeline: TimelineSegment[];
  endedReason: RtosEndedReason;
  diagnostics: RtosDiagnostic[];
}

export function runScheduler(runtime: InterpreterRuntime, config: RtosConfig): SchedulerResult {
  const events: RtosTraceEvent[] = [];
  const diagnostics: RtosDiagnostic[] = [];
  const timeline: TimelineSegment[] = [];
  const tasks = new Map<TaskId, Task>();
  const objects = new Map<string, KernelObjectInstance>();

  let tick = 0;
  let seq = 0;
  let taskSeq = 0;
  let objSeq = 0;
  let current: TaskId | null = null;
  let segmentStart = 0;
  let segmentInherited = false;
  let endedReason = "completed" as RtosEndedReason;
  const isStopped = (): boolean => endedReason === "aborted" || endedReason === "deadlock";

  const msToTicks = (ms: number): number => Math.max(1, Math.ceil(ms / Math.max(1, config.tick_ms)));

  const emit = (event: RtosTraceEvent): void => {
    if (events.length < MAX_RTOS_EVENTS) {
      events.push(event);
    }
  };

  const emitDiag = (level: "error" | "warning", message: string, line?: number, task?: TaskId): void => {
    diagnostics.push({ level, message, line, task });
    emit({ op: "diagnostic", tick, level, message, line, task });
  };

  const viewObject = (o: KernelObjectInstance): KernelObjectView => {
    if (o.kind === "isr") return o.view(tick);
    return o.view();
  };

  const allObjectViews = (): Map<string, KernelObjectView> => {
    const out = new Map<string, KernelObjectView>();
    for (const [id, o] of objects) out.set(id, viewObject(o));
    return out;
  };

  const waitGraphTasks = (): WaitGraphTask[] =>
    [...tasks.values()].map((t) => ({
      id: t.id,
      name: t.name,
      state: t.state,
      blockReason: t.blocked,
      blockedObjectId: t.objectId,
      wakeTick: t.wake,
    }));

  const transition = (
    t: Task,
    to: TaskState,
    reason: BlockReason | null,
    detail: string,
    line = t.line,
  ): void => {
    const from = t.state;
    if (from === to && t.blocked === reason) return;
    t.state = to;
    t.blocked = reason;
    emit({
      op: "task_state",
      tick,
      task: t.id,
      from,
      to,
      reason,
      objectId: t.objectId ?? undefined,
      detail,
      line,
    });
  };

  const addTask = (
    name: string,
    priority: number,
    gen: KernelGen<void>,
    kind: "main" | "user" | "timer-service" = "user",
    line = 1,
  ): Task => {
    const clampedPrio = Math.max(0, Math.min(RTOS_MAX_PRIORITY, priority));
    const id = kind === "main" ? "main" : kind === "timer-service" ? "timer-svc" : `t${taskSeq++}`;
    const t: Task = {
      id,
      name,
      kind,
      priority: clampedPrio,
      effective: clampedPrio,
      state: "Ready",
      gen,
      pending: { value: VOID },
      wake: null,
      blocked: null,
      objectId: null,
      order: seq++,
      busy: 0,
      slice: 0,
      joiners: [],
      line,
      notify: 0,
      joinable: kind === "user",
      detached: kind !== "user",
      relockMutexId: null,
      relockResult: null,
      inversionStartTick: null,
    };
    tasks.set(id, t);
    emit({ op: "task_create", tick, task: id, name, priority: clampedPrio, line });
    return t;
  };

  addTask("main", RTOS_DEFAULT_PRIORITY, runtime.makeMain(), "main", runtime.program.main.line);

  const closeSegment = (
    next: TaskId | null,
    causeOverride?: "preempt" | "block" | "yield" | "timeslice" | "isr_return" | "exit" | "start" | "idle",
  ): void => {
    if (current !== next) {
      if (current) {
        timeline.push({
          task: current,
          start: segmentStart,
          end: Math.max(tick, segmentStart + 1),
          state: current === "idle" ? "Ready" : "Running",
          inherited: segmentInherited || undefined,
        });
      }
      const nextTask = next ? tasks.get(next) : undefined;
      const cause = causeOverride ?? (current ? "preempt" : "start");
      emit({
        op: "context_switch",
        tick,
        from: current,
        to: next ?? "idle",
        cause,
      });
      current = next;
      segmentStart = tick;
      segmentInherited = Boolean(nextTask && nextTask.effective > nextTask.priority);
    } else if (current) {
      const curTask = tasks.get(current);
      if (curTask && curTask.effective > curTask.priority) {
        segmentInherited = true;
      }
    }
  };

  const ready = (): Task | undefined =>
    [...tasks.values()]
      .filter((t) => t.state === "Ready" || t.state === "Running")
      .sort((a, b) => b.effective - a.effective || a.order - b.order)[0];

  const emitOp = (
    actor: TaskId | "isr",
    objectId: string,
    action: string,
    ok: boolean,
    line: number,
    value?: string,
  ): void => {
    const o = objects.get(objectId);
    emit({
      op: "obj_op",
      tick,
      task: actor,
      objectId,
      action,
      ok,
      line,
      value,
      state: o ? viewObject(o) : undefined,
    });
  };

  const checkDeadlock = (): void => {
    const cycle = detectDeadlockCycle(waitGraphTasks(), allObjectViews());
    if (cycle) {
      emit({ op: "deadlock_detected", tick, cycle });
      diagnostics.push({
        level: "warning",
        message: `检测到死锁环：${cycle.join(" → ")}`,
      });
      endedReason = "deadlock";
    }
  };

  const block = (t: Task, reason: BlockReason, objectId: string | null, wakeTick: number | null): void => {
    t.objectId = objectId;
    t.wake = wakeTick;
    t.slice = 0;
    transition(t, "Blocked", reason, "block");
    if (reason === "Mutex" || reason === "Join") {
      checkDeadlock();
    }
  };

  const wake = (t: Task, value: Value = VOID, detail = "ready"): void => {
    t.pending = { value };
    t.wake = null;
    t.objectId = null;
    t.inversionStartTick = null;
    t.order = seq++;
    transition(t, "Ready", null, detail);
  };

  const pickWaiter = (ids: string[]): Task | undefined =>
    ids
      .map((id) => tasks.get(id))
      .filter((t): t is Task => Boolean(t && t.state !== "Deleted"))
      .sort((a, b) => b.effective - a.effective || a.order - b.order)[0];

  const recomputePriorities = (): void => {
    const prevEffective = new Map<TaskId, { prio: number; objId: string }>();
    for (const t of tasks.values()) {
      prevEffective.set(t.id, { prio: t.effective, objId: "" });
      t.effective = t.priority;
    }

    // 迭代传播优先级继承链
    let changed = true;
    let guard = 0;
    const inheritedByObj = new Map<TaskId, string>();
    while (changed && guard++ < 16) {
      changed = false;
      for (const o of objects.values()) {
        if (o.kind === "mutex" && o.inherit && o.owner) {
          const owner = tasks.get(o.owner);
          const highestWaiter = pickWaiter(o.waiters);
          if (owner && highestWaiter && highestWaiter.effective > owner.effective) {
            owner.effective = highestWaiter.effective;
            inheritedByObj.set(owner.id, o.id);
            changed = true;
          }
          if (owner) {
            o.ownerEffective = owner.effective;
          }
        } else if (o.kind === "mutex" && o.owner) {
          const owner = tasks.get(o.owner);
          if (owner) o.ownerEffective = owner.effective;
        }
      }
    }

    for (const t of tasks.values()) {
      const prev = prevEffective.get(t.id)?.prio ?? t.priority;
      if (t.effective > prev) {
        const objId = inheritedByObj.get(t.id) ?? "";
        emit({ op: "prio_inherit", tick, task: t.id, from: prev, to: t.effective, objectId: objId });
        if (current === t.id) segmentInherited = true;
      } else if (t.effective < prev) {
        emit({ op: "prio_restore", tick, task: t.id, from: prev, to: t.effective, objectId: "" });
      }
    }
  };

  const acquireMutexOrBlock = (
    t: Task,
    o: KernelMutex,
    mode: "lock" | "try_lock" | "try_lock_for",
    timeoutMs: number,
    line: number,
    isRelock = false,
    relockReturnVal: Value = VOID,
  ): boolean => {
    if (!o.owner) {
      o.owner = t.id;
      o.recursion = 1;
      o.ownerEffective = t.effective;
      if (!isRelock) emitOp(t.id, o.id, "lock", true, line);
      t.pending = { value: isRelock ? relockReturnVal : boolValue(true) };
      return true;
    }
    if (o.owner === t.id) {
      if (o.recursive) {
        o.recursion++;
        if (!isRelock) emitOp(t.id, o.id, "lock", true, line);
        t.pending = { value: isRelock ? relockReturnVal : boolValue(true) };
        return true;
      }
      emitDiag("warning", `任务 ${t.name} 对非递归互斥锁 ${o.name} 重复加锁`, line, t.id);
    }
    if (mode === "try_lock") {
      emitOp(t.id, o.id, "try_lock", false, line);
      t.pending = { value: boolValue(false) };
      return true;
    }
    if (!o.waiters.includes(t.id)) o.waiters.push(t.id);
    if (isRelock) {
      t.relockMutexId = o.id;
      t.relockResult = relockReturnVal;
    }
    const wakeTick = mode === "try_lock_for" ? tick + msToTicks(timeoutMs) : null;
    block(t, "Mutex", o.id, wakeTick);
    recomputePriorities();
    if (!o.inherit && o.owner) {
      const owner = tasks.get(o.owner);
      if (owner && t.effective > owner.effective && t.inversionStartTick === null) {
        t.inversionStartTick = tick;
      }
    }
    if (!isRelock) emitOp(t.id, o.id, "lock", false, line);
    return false;
  };

  const releaseMutex = (t: Task, o: KernelMutex, line: number, silentOp = false): boolean => {
    if (o.owner !== t.id) {
      if (!silentOp) emitOp(t.id, o.id, "unlock", false, line);
      emitDiag("warning", `${t.name} 试图释放未持有的互斥锁 ${o.name}`, line, t.id);
      return false;
    }
    if (o.recursion > 1) {
      o.recursion--;
      if (!silentOp) emitOp(t.id, o.id, "unlock", true, line);
      return true;
    }
    o.owner = null;
    o.recursion = 0;
    o.ownerEffective = 0;
    const w = pickWaiter(o.waiters);
    if (w) {
      o.removeWaiter(w.id);
      o.owner = w.id;
      o.recursion = 1;
      o.ownerEffective = w.effective;
      const resumeVal = w.relockMutexId === o.id && w.relockResult ? w.relockResult : boolValue(true);
      w.relockMutexId = null;
      w.relockResult = null;
      wake(w, resumeVal, "mutex");
    }
    recomputePriorities();
    if (!silentOp) emitOp(t.id, o.id, "unlock", true, line);
    return true;
  };

  const wakeCondVarWaiter = (w: Task, cv: KernelCondVar, resultVal: Value, detail: string, line: number): void => {
    const lockId = cv.removeWaiter(w.id);
    const mutex = lockId ? objects.get(lockId) : undefined;
    if (mutex?.kind === "mutex") {
      if (!mutex.owner) {
        mutex.owner = w.id;
        mutex.recursion = 1;
        mutex.ownerEffective = w.effective;
        wake(w, resultVal, detail);
      } else {
        // 锁正被占用，转为阻塞在 Mutex 上等待重新加锁
        w.relockMutexId = mutex.id;
        w.relockResult = resultVal;
        if (!mutex.waiters.includes(w.id)) mutex.waiters.push(w.id);
        block(w, "Mutex", mutex.id, null);
        recomputePriorities();
      }
    } else {
      wake(w, resultVal, detail);
    }
    void line;
  };

  const createObject = (call: Extract<KernelCall, { kind: "obj_create" }>): Value => {
    const id = `o${objSeq++}`;
    let o: KernelObjectInstance;
    if (call.init.kind === "mutex") {
      o = new KernelMutex(id, call.name, call.init);
    } else if (call.init.kind === "semaphore") {
      o = new KernelSemaphore(id, call.name, call.init.count, call.init.max);
    } else if (call.init.kind === "condvar") {
      o = new KernelCondVar(id, call.name);
    } else if (call.init.kind === "queue") {
      o = new KernelQueue(id, call.name, call.init.capacity);
    } else {
      o = new KernelEventGroup(id, call.name);
    }
    objects.set(id, o);
    emit({
      op: "obj_create",
      tick,
      object: { id, kind: call.objectType, name: call.name, init: call.init },
      line: call.line,
    });
    return { kind: "object", id, objectType: call.objectType, name: call.name };
  };

  const handleCall = (t: Task, c: KernelCall, inIsr = false): boolean => {
    t.line = c.line;

    if (inIsr && !isIsrAllowed(c.kind)) {
      emitDiag(
        "error",
        `ISR 中禁止调用阻塞或非中断安全 API (${c.kind})，请改用 *_from_isr 变体`,
        c.line,
        t.id,
      );
      endedReason = "aborted";
      return false;
    }

    const actor: TaskId | "isr" = inIsr ? "isr" : t.id;

    switch (c.kind) {
      case "stdout":
        emit({ op: "stdout", tick, task: actor, text: c.text, line: c.line });
        t.pending = { value: VOID };
        return true;

      case "var_update":
        emit({
          op: "var_update",
          tick,
          task: t.id,
          scope: c.scope,
          name: c.name,
          type: c.type,
          value: c.value,
          line: c.line,
        });
        t.pending = { value: VOID };
        return true;

      case "config":
        if (c.config.tick_ms !== undefined) config.tick_ms = Math.max(1, c.config.tick_ms);
        if (c.config.time_slice_ticks !== undefined) {
          config.time_slice_ticks = Math.max(1, c.config.time_slice_ticks);
        }
        if (c.config.spurious_wakeup_every !== undefined) {
          config.spurious_wakeup_every = Math.max(0, c.config.spurious_wakeup_every);
        }
        if (c.config.max_ticks !== undefined) {
          config.max_ticks = Math.min(MAX_RTOS_TICKS, Math.max(1, c.config.max_ticks));
        }
        t.pending = { value: VOID };
        return true;

      case "obj_create":
        t.pending = { value: createObject(c) };
        return true;

      case "thread_create": {
        const gen = runtime.makeTask(c.entry, c.args);
        if (!gen) {
          t.pending = { value: VOID };
          return true;
        }
        const childName =
          c.attrs?.name ?? (c.entry.kind === "func" ? c.entry.name : `task-${taskSeq}`);
        const childPrio = c.attrs?.priority ?? RTOS_DEFAULT_PRIORITY;
        const child = addTask(childName, childPrio, gen, "user", c.line);
        t.pending = { value: { kind: "task", id: child.id, name: child.name, joinable: true } };
        return child.effective <= t.effective;
      }

      case "timer_create": {
        const id = `o${objSeq++}`;
        const timer = new KernelTimer(id, c.name, c.periodMs, c.periodic, c.callback);
        objects.set(id, timer);
        emit({
          op: "obj_create",
          tick,
          object: {
            id,
            kind: "timer",
            name: c.name,
            init: { kind: "timer", periodMs: c.periodMs, periodic: c.periodic },
          },
          line: c.line,
        });
        t.pending = { value: { kind: "timer", id, name: c.name } };
        return true;
      }

      case "timer_start": {
        const o = objects.get(c.timerId);
        if (o?.kind === "timer") {
          o.running = true;
          o.nextFireTick = tick + msToTicks(o.periodMs);
          emitOp(actor, o.id, "start", true, c.line);
        }
        t.pending = { value: VOID };
        return true;
      }

      case "timer_stop": {
        const o = objects.get(c.timerId);
        if (o?.kind === "timer") {
          o.running = false;
          o.nextFireTick = null;
          emitOp(actor, o.id, "stop", true, c.line);
        }
        t.pending = { value: VOID };
        return true;
      }

      case "isr_create": {
        const id = `o${objSeq++}`;
        const isr = new KernelIsr(id, c.name, c.callback);
        objects.set(id, isr);
        emit({
          op: "obj_create",
          tick,
          object: { id, kind: "isr", name: c.name, init: { kind: "isr" } },
          line: c.line,
        });
        t.pending = { value: { kind: "isr", id, name: c.name } };
        return true;
      }

      case "isr_trigger_at": {
        const o = objects.get(c.isrId);
        if (o?.kind === "isr") {
          o.oneShotTicks.add(tick + msToTicks(c.atMs));
          emitOp(actor, o.id, "trigger_at", true, c.line, `${c.atMs}ms`);
        }
        t.pending = { value: VOID };
        return true;
      }

      case "isr_trigger_every": {
        const o = objects.get(c.isrId);
        if (o?.kind === "isr") {
          const periodTicks = msToTicks(c.everyMs);
          o.everyMs = c.everyMs;
          o.everyTicks = periodTicks;
          o.nextPeriodicTick = tick + periodTicks;
          emitOp(actor, o.id, "trigger_every", true, c.line, `${c.everyMs}ms`);
        }
        t.pending = { value: VOID };
        return true;
      }

      case "sleep":
        block(t, "Delay", null, tick + msToTicks(c.ms));
        return false;

      case "busy":
        t.busy = msToTicks(c.ms);
        t.pending = { value: VOID };
        return false;

      case "yield":
        t.order = seq++;
        t.slice = 0;
        transition(t, "Ready", null, "yield");
        t.pending = { value: VOID };
        return false;

      case "thread_join": {
        const target = tasks.get(c.target);
        if (!target) {
          t.pending = { value: VOID };
          return true;
        }
        target.joinable = false;
        if (target.state === "Deleted") {
          t.pending = { value: VOID };
          return true;
        }
        target.joiners.push(t.id);
        block(t, "Join", c.target, null);
        return false;
      }

      case "thread_detach": {
        const target = tasks.get(c.target);
        if (target) {
          target.joinable = false;
          target.detached = true;
        }
        t.pending = { value: VOID };
        return true;
      }

      case "thread_dtor_check": {
        const target = tasks.get(c.target);
        if (target && target.state !== "Deleted" && target.joinable) {
          emitDiag(
            "error",
            `线程 ${target.name} 析构时仍可 join（未调用 join/detach），触发 std::terminate`,
            c.line,
            t.id,
          );
          endedReason = "aborted";
        }
        t.pending = { value: VOID };
        return true;
      }

      case "thread_suspend": {
        const x = tasks.get(c.target);
        if (x && x.state !== "Deleted") {
          transition(x, "Suspended", null, "suspend", c.line);
          t.pending = { value: VOID };
          return x.id !== t.id;
        }
        t.pending = { value: VOID };
        return true;
      }

      case "thread_resume": {
        const x = tasks.get(c.target);
        if (x && x.state === "Suspended") {
          wake(x, VOID, "resume");
          t.pending = { value: VOID };
          return x.effective <= t.effective;
        }
        t.pending = { value: VOID };
        return true;
      }

      case "thread_terminate": {
        const x = tasks.get(c.target);
        if (x && x.state !== "Deleted") {
          // 清理等待队列
          for (const o of objects.values()) {
            if ("removeWaiter" in o) o.removeWaiter(x.id);
          }
          x.joinable = false;
          transition(x, "Deleted", null, "terminate", c.line);
          emit({ op: "task_delete", tick, task: x.id, reason: "terminate" });
          for (const jId of x.joiners) {
            const j = tasks.get(jId);
            if (j && j.state === "Blocked") wake(j, VOID, "join");
          }
          recomputePriorities();
          t.pending = { value: VOID };
          return x.id !== t.id;
        }
        t.pending = { value: VOID };
        return true;
      }

      case "set_priority": {
        const clamped = Math.max(0, Math.min(RTOS_MAX_PRIORITY, c.priority));
        t.priority = clamped;
        recomputePriorities();
        t.pending = { value: VOID };
        const top = ready();
        return !top || top.id === t.id;
      }

      case "notify":
      case "notify_from_isr": {
        const x = tasks.get(c.target);
        if (x && x.state !== "Deleted") {
          x.notify += Math.max(1, c.value);
          if (x.state === "Blocked" && x.blocked === "Notify") {
            const taken = x.notify;
            x.notify = 0;
            wake(x, intValue(taken), "notify");
            t.pending = { value: VOID };
            return inIsr || x.effective <= t.effective;
          }
        }
        t.pending = { value: VOID };
        return true;
      }

      case "notify_take": {
        if (t.notify > 0) {
          const n = t.notify;
          t.notify = 0;
          t.pending = { value: intValue(n) };
          return true;
        }
        const wakeTick = c.forever ? null : tick + msToTicks(c.timeoutMs ?? 0);
        block(t, "Notify", null, wakeTick);
        return false;
      }

      case "mutex_lock":
      case "mutex_try_lock":
      case "mutex_try_lock_for": {
        const o = objects.get(c.objectId);
        if (!o || o.kind !== "mutex") {
          t.pending = { value: boolValue(false) };
          return true;
        }
        const mode =
          c.kind === "mutex_try_lock"
            ? "try_lock"
            : c.kind === "mutex_try_lock_for"
              ? "try_lock_for"
              : "lock";
        const timeoutMs = c.kind === "mutex_try_lock_for" ? c.ms : 0;
        return acquireMutexOrBlock(t, o, mode, timeoutMs, c.line);
      }

      case "mutex_unlock": {
        const o = objects.get(c.objectId);
        if (o?.kind === "mutex") {
          releaseMutex(t, o, c.line);
          t.pending = { value: VOID };
          const top = ready();
          return !top || top.id === t.id;
        }
        t.pending = { value: VOID };
        return true;
      }

      case "cv_wait":
      case "cv_wait_for": {
        const cv = objects.get(c.cvId);
        const mtx = objects.get(c.lockId);
        if (!cv || cv.kind !== "condvar") {
          t.pending = { value: boolValue(false) };
          return true;
        }
        if (!mtx || mtx.kind !== "mutex" || mtx.owner !== t.id) {
          emitDiag("error", `任务 ${t.name} 在未持有互斥锁的情况下调用 ${cv.name}.wait()`, c.line, t.id);
          endedReason = "aborted";
          return false;
        }
        // 1. 原子释放持有的互斥锁
        releaseMutex(t, mtx, c.line, true);
        // 2. 挂入条件变量等待队列
        cv.attachedLock = mtx.id;
        if (!cv.waiters.includes(t.id)) cv.waiters.push(t.id);
        cv.waiterLocks.set(t.id, mtx.id);
        const wakeTick = c.kind === "cv_wait_for" ? tick + msToTicks(c.ms) : null;
        block(t, "CondVar", cv.id, wakeTick);
        emitOp(t.id, cv.id, c.kind === "cv_wait_for" ? "wait_for" : "wait", false, c.line);
        return false;
      }

      case "cv_notify": {
        const cv = objects.get(c.cvId);
        if (cv?.kind === "condvar") {
          if (c.all) {
            const allWaiters = [...cv.waiters]
              .map((id) => tasks.get(id))
              .filter((x): x is Task => Boolean(x))
              .sort((a, b) => b.effective - a.effective || a.order - b.order);
            for (const w of allWaiters) {
              wakeCondVarWaiter(w, cv, boolValue(true), "notify_all", c.line);
            }
            emitOp(actor, cv.id, "notify_all", true, c.line);
          } else {
            const w = pickWaiter(cv.waiters);
            if (w) {
              wakeCondVarWaiter(w, cv, boolValue(true), "notify_one", c.line);
            }
            emitOp(actor, cv.id, "notify_one", true, c.line);
          }
          t.pending = { value: VOID };
          const top = ready();
          return inIsr || !top || top.id === t.id;
        }
        t.pending = { value: VOID };
        return true;
      }

      case "sem_acquire":
      case "sem_try_acquire":
      case "sem_try_acquire_for": {
        const o = objects.get(c.objectId);
        if (!o || o.kind !== "semaphore") {
          t.pending = { value: boolValue(false) };
          return true;
        }
        if (o.count > 0) {
          o.count--;
          emitOp(t.id, o.id, "acquire", true, c.line);
          t.pending = { value: boolValue(true) };
          return true;
        }
        if (c.kind === "sem_try_acquire") {
          emitOp(t.id, o.id, "try_acquire", false, c.line);
          t.pending = { value: boolValue(false) };
          return true;
        }
        if (!o.waiters.includes(t.id)) o.waiters.push(t.id);
        const wakeTick = c.kind === "sem_try_acquire_for" ? tick + msToTicks(c.ms) : null;
        block(t, "Semaphore", o.id, wakeTick);
        emitOp(t.id, o.id, "acquire", false, c.line);
        return false;
      }

      case "sem_release":
      case "sem_release_from_isr": {
        const o = objects.get(c.objectId);
        if (o?.kind === "semaphore") {
          const w = pickWaiter(o.waiters);
          if (w) {
            o.removeWaiter(w.id);
            wake(w, boolValue(true), "semaphore");
          } else {
            o.count = Math.min(o.max, o.count + 1);
          }
          emitOp(actor, o.id, c.kind === "sem_release_from_isr" ? "release_from_isr" : "release", true, c.line);
          t.pending = { value: VOID };
          const top = ready();
          return inIsr || !top || top.id === t.id;
        }
        t.pending = { value: VOID };
        return true;
      }

      case "queue_send":
      case "queue_send_from_isr": {
        const o = objects.get(c.objectId);
        if (!o || o.kind !== "queue") {
          t.pending = { value: boolValue(false) };
          return true;
        }
        const valStr = formatValue(c.value);
        const receiver = pickWaiter(o.receivers);
        if (receiver) {
          o.removeWaiter(receiver.id);
          wake(receiver, c.value, "queue_receive");
          emitOp(actor, o.id, c.kind === "queue_send_from_isr" ? "send_from_isr" : "send", true, c.line, valStr);
          t.pending = { value: boolValue(true) };
          const top = ready();
          return inIsr || !top || top.id === t.id;
        }
        if (o.items.length < o.capacity) {
          o.enqueue(c.value);
          emitOp(actor, o.id, c.kind === "queue_send_from_isr" ? "send_from_isr" : "send", true, c.line, valStr);
          t.pending = { value: boolValue(true) };
          return true;
        }
        if (c.kind === "queue_send_from_isr" || (!c.forever && (c.timeoutMs ?? 0) <= 0)) {
          emitOp(actor, o.id, c.kind === "queue_send_from_isr" ? "send_from_isr" : "send", false, c.line, valStr);
          t.pending = { value: boolValue(false) };
          return true;
        }
        o.senders.push(t.id);
        o.senderValues.set(t.id, c.value);
        block(t, "QueueSend", o.id, c.forever ? null : tick + msToTicks(c.timeoutMs ?? 0));
        emitOp(t.id, o.id, "send", false, c.line, valStr);
        return false;
      }

      case "queue_receive": {
        const o = objects.get(c.objectId);
        if (!o || o.kind !== "queue") {
          t.pending = { value: VOID };
          return true;
        }
        if (o.items.length > 0) {
          const item = o.dequeue()!;
          const sender = pickWaiter(o.senders);
          if (sender) {
            const sv = o.senderValues.get(sender.id) ?? intValue(0);
            o.removeWaiter(sender.id);
            o.enqueue(sv);
            wake(sender, boolValue(true), "queue_send");
          }
          emitOp(t.id, o.id, "receive", true, c.line, formatValue(item));
          t.pending = { value: item };
          const top = ready();
          return !top || top.id === t.id;
        }
        if (!c.forever && (c.timeoutMs ?? 0) <= 0) {
          emitOp(t.id, o.id, "receive", false, c.line);
          t.pending = { value: VOID };
          return true;
        }
        o.receivers.push(t.id);
        block(t, "QueueReceive", o.id, c.forever ? null : tick + msToTicks(c.timeoutMs ?? 0));
        emitOp(t.id, o.id, "receive", false, c.line);
        return false;
      }

      case "event_set":
      case "event_set_from_isr": {
        const o = objects.get(c.objectId);
        if (o?.kind === "event_group") {
          o.bits |= c.bits;
          // 检查满足条件的等待者（按优先级 + FIFO）
          const satisfied = o.waiters
            .filter((w) => o.matches(w.mask, w.all))
            .map((w) => ({ w, task: tasks.get(w.task) }))
            .filter((item): item is { w: (typeof o.waiters)[number]; task: Task } => Boolean(item.task))
            .sort((a, b) => b.task.effective - a.task.effective || a.task.order - b.task.order);

          let clearMask = 0;
          const matchedBits = o.bits;
          for (const { w, task } of satisfied) {
            o.removeWaiter(task.id);
            if (w.clearOnExit) clearMask |= w.mask;
            wake(task, intValue(matchedBits), "event_group");
          }
          if (clearMask) o.bits &= ~clearMask;
          emitOp(
            actor,
            o.id,
            c.kind === "event_set_from_isr" ? "set_from_isr" : "set",
            true,
            c.line,
            `0b${c.bits.toString(2)}`,
          );
          t.pending = { value: intValue(o.bits) };
          const top = ready();
          return inIsr || !top || top.id === t.id;
        }
        t.pending = { value: intValue(0) };
        return true;
      }

      case "event_clear": {
        const o = objects.get(c.objectId);
        if (o?.kind === "event_group") {
          o.bits &= ~c.bits;
          emitOp(actor, o.id, "clear", true, c.line, `0b${c.bits.toString(2)}`);
          t.pending = { value: intValue(o.bits) };
          return true;
        }
        t.pending = { value: intValue(0) };
        return true;
      }

      case "event_wait": {
        const o = objects.get(c.objectId);
        if (!o || o.kind !== "event_group") {
          t.pending = { value: intValue(0) };
          return true;
        }
        if (o.matches(c.mask, c.waitAll)) {
          const snapshotBits = o.bits;
          if (c.clearOnExit) o.bits &= ~c.mask;
          emitOp(t.id, o.id, "event_wait", true, c.line, `0b${snapshotBits.toString(2)}`);
          t.pending = { value: intValue(snapshotBits) };
          return true;
        }
        if (!c.forever && (c.timeoutMs ?? 0) <= 0) {
          emitOp(t.id, o.id, "event_wait", false, c.line);
          t.pending = { value: intValue(o.bits) };
          return true;
        }
        o.waiters.push({
          task: t.id,
          mask: c.mask,
          all: c.waitAll,
          clearOnExit: c.clearOnExit,
        });
        block(t, "EventGroup", o.id, c.forever ? null : tick + msToTicks(c.timeoutMs ?? 0));
        emitOp(t.id, o.id, "event_wait", false, c.line, `0b${c.mask.toString(2)}`);
        return false;
      }

      default:
        t.pending = { value: VOID };
        return true;
    }
  };

  // 执行单次 ISR 回调
  const executeIsr = (isr: KernelIsr): void => {
    emit({ op: "isr_enter", tick, isr: isr.name });
    timeline.push({
      task: `ISR:${isr.name}`,
      start: tick,
      end: tick + 1,
      state: "isr",
    });

    const gen = runtime.makeCallback(isr.callback);
    if (gen) {
      const dummyTask: Task = {
        id: `isr:${isr.name}`,
        name: isr.name,
        kind: "user",
        priority: RTOS_MAX_PRIORITY + 1,
        effective: RTOS_MAX_PRIORITY + 1,
        state: "Running",
        gen,
        pending: { value: VOID },
        wake: null,
        blocked: null,
        objectId: null,
        order: 0,
        busy: 0,
        slice: 0,
        joiners: [],
        line: 1,
        notify: 0,
        joinable: false,
        detached: true,
        relockMutexId: null,
        relockResult: null,
        inversionStartTick: null,
      };
      let keep = true;
      let steps = 0;
      while (keep && steps++ < 1000 && endedReason !== "aborted") {
        try {
          const next = gen.next(dummyTask.pending);
          dummyTask.pending = { value: VOID };
          if (next.done) keep = false;
          else keep = handleCall(dummyTask, next.value, true);
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          emitDiag("error", message, dummyTask.line);
          endedReason = "aborted";
          keep = false;
        }
      }
    }

    const nextReady = ready();
    emit({ op: "isr_exit", tick, isr: isr.name, resume: nextReady?.id ?? null });
    if (nextReady && current && nextReady.id !== current) {
      closeSegment(nextReady.id, "isr_return");
    }
  };

  // Timer Service 回调队列
  const pendingTimerCallbacks: { timer: KernelTimer; cb: Value }[] = [];
  let timerSvcTask: Task | null = null;

  function* timerServiceLoop(): KernelGen<void> {
    while (true) {
      while (pendingTimerCallbacks.length > 0) {
        const item = pendingTimerCallbacks.shift()!;
        const subGen = runtime.makeCallback(item.cb);
        if (subGen) {
          yield* subGen;
        }
      }
      yield { kind: "timer_service_wait", line: 1 };
    }
  }

  const ensureTimerServiceTask = (): Task => {
    if (!timerSvcTask) {
      timerSvcTask = addTask("timer_svc", RTOS_TIMER_SERVICE_PRIORITY, timerServiceLoop(), "timer-service", 1);
    }
    return timerSvcTask;
  };

  // 检查未来最早的定时器或中断 tick
  const earliestTimerOrIsrTick = (): number | null => {
    let best: number | null = null;
    for (const o of objects.values()) {
      if (o.kind === "timer" && o.running && o.nextFireTick !== null && o.nextFireTick > tick) {
        if (best === null || o.nextFireTick < best) best = o.nextFireTick;
      } else if (o.kind === "isr") {
        const nt = o.nextTick(tick + 1);
        if (nt !== null && (best === null || nt < best)) best = nt;
      }
    }
    return best;
  };

  let inversionWarned = new Set<string>();
  let lastBoundaryTick = -1;

  // 主调度循环
  while (tick <= config.max_ticks && !isStopped()) {
    const isNewTick = tick !== lastBoundaryTick;
    lastBoundaryTick = tick;

    // 1. 处理到期阻塞任务超时
    for (const t of tasks.values()) {
      if (t.state === "Blocked" && t.wake !== null && t.wake <= tick) {
        const o = t.objectId ? objects.get(t.objectId) : null;
        if (o) {
          if (o.kind === "condvar") {
            wakeCondVarWaiter(t, o, boolValue(false), "timeout", t.line);
            continue;
          }
          if (o.kind === "mutex" || o.kind === "semaphore" || o.kind === "queue" || o.kind === "event_group") {
            o.removeWaiter(t.id);
          }
          if (o.kind === "mutex") recomputePriorities();
          if (o.kind === "event_group") {
            wake(t, intValue(o.bits), "timeout");
            continue;
          }
        }
        const timeoutVal =
          t.blocked === "QueueReceive"
            ? VOID
            : t.blocked === "Notify"
              ? intValue(0)
              : boolValue(false);
        wake(t, timeoutVal, "timeout");
      }
    }

    // 2. 处理软件定时器到期
    for (const o of objects.values()) {
      if (o.kind === "timer" && o.running && o.nextFireTick !== null && o.nextFireTick <= tick) {
        emit({ op: "timer_fire", tick, timer: o.name });
        pendingTimerCallbacks.push({ timer: o, cb: o.callback });
        if (o.periodic) {
          o.nextFireTick = tick + msToTicks(o.periodMs);
        } else {
          o.running = false;
          o.nextFireTick = null;
        }
        const svc = ensureTimerServiceTask();
        if (svc.state === "Blocked") {
          wake(svc, VOID, "timer_fire");
        }
      }
    }

    // 3. 处理 ISR 中断触发（每个 tick 边界检查一次）
    if (isNewTick) {
      for (const o of objects.values()) {
        if (o.kind === "isr" && o.shouldFireAt(tick)) {
          executeIsr(o);
          if (isStopped()) break;
        }
      }
    }
    if (isStopped()) break;

    // 4. 处理虚假唤醒注入（spurious_wakeup_every，每个匹配 tick 边界至多注入一次）
    if (isNewTick && config.spurious_wakeup_every > 0 && tick > 0 && tick % config.spurious_wakeup_every === 0) {
      for (const o of objects.values()) {
        if (o.kind === "condvar" && o.waiters.length > 0) {
          const victim = pickWaiter(o.waiters);
          if (victim) {
            emit({ op: "spurious_wakeup", tick, task: victim.id, objectId: o.id });
            wakeCondVarWaiter(victim, o, boolValue(true), "spurious", victim.line);
            break;
          }
        }
      }
    }

    // 5. 检查优先级反转持续时长告警
    for (const t of tasks.values()) {
      if (t.state === "Blocked" && t.blocked === "Mutex" && t.objectId && t.inversionStartTick !== null) {
        const mtx = objects.get(t.objectId);
        if (mtx?.kind === "mutex" && !mtx.inherit && mtx.owner) {
          const duration = tick - t.inversionStartTick;
          const warnKey = `${t.id}:${mtx.id}`;
          if (duration >= RTOS_INVERSION_WARN_TICKS && !inversionWarned.has(warnKey)) {
            inversionWarned.add(warnKey);
            emitDiag(
              "warning",
              `优先级反转告警：高优先级任务 ${t.name} 等待无优先级继承的互斥锁 ${mtx.name} 已持续 ${duration} ticks`,
              t.line,
              t.id,
            );
          }
        }
      }
    }

    // 6. 检查是否所有用户任务与 main 任务均已结束
    const nonDaemonTasks = [...tasks.values()].filter((x) => x.kind !== "timer-service");
    if (nonDaemonTasks.length > 0 && nonDaemonTasks.every((x) => x.state === "Deleted")) {
      endedReason = "completed";
      break;
    }

    // 7. 选择最高优先级 Ready 任务
    const t = ready();
    if (!t) {
      closeSegment("idle", "idle");
      const futureTaskWake = [...tasks.values()]
        .map((x) => x.wake)
        .filter((x): x is number => x !== null && x > tick)
        .sort((a, b) => a - b)[0];
      const futureObjWake = earliestTimerOrIsrTick();
      const candidates = [futureTaskWake, futureObjWake].filter((x): x is number => x !== undefined && x !== null);
      if (candidates.length === 0) {
        emit({ op: "system_stall", tick });
        endedReason = "stalled";
        break;
      }
      const nextTick = Math.min(...candidates);
      // 若开启了虚假唤醒且存在 CondVar 等待者，按步推进以触发周期虚假唤醒
      const hasCvWaiter = [...objects.values()].some((o) => o.kind === "condvar" && o.waiters.length > 0);
      if (config.spurious_wakeup_every > 0 && hasCvWaiter) {
        tick++;
      } else {
        tick = nextTick;
      }
      continue;
    }

    closeSegment(t.id);
    if (t.state !== "Running") {
      transition(t, "Running", null, "dispatch");
    }

    // 8. 若任务正在模拟占用 CPU 的 busy_for
    if (t.busy > 0) {
      tick++;
      t.busy--;
      t.slice++;
      if (t.busy === 0) {
        t.order = seq++;
        t.slice = 0;
        transition(t, "Ready", null, "busy_done");
      } else if (t.slice >= config.time_slice_ticks) {
        t.slice = 0;
        t.order = seq++;
        transition(t, "Ready", null, "timeslice");
      }
      continue;
    }

    // 9. 运行任务生成器直到发生阻塞/让出/结束
    let keep = true;
    let steps = 0;
    while (keep && steps++ < RTOS_STATEMENT_BUDGET) {
      try {
        const next = t.gen.next(t.pending);
        t.pending = { value: VOID };
        if (next.done) {
          // 若 main 退出时仍有未 join/detach 的活跃用户线程，给出告警
          if (t.kind === "main") {
            for (const other of tasks.values()) {
              if (other.kind === "user" && other.joinable && other.state !== "Deleted") {
                emitDiag(
                  "warning",
                  `main() 返回时线程 ${other.name} 尚未 join 或 detach`,
                  t.line,
                  t.id,
                );
              }
            }
          }
          t.joinable = false;
          transition(t, "Deleted", null, "return");
          emit({ op: "task_delete", tick, task: t.id, reason: "return" });
          for (const id of t.joiners) {
            const j = tasks.get(id);
            if (j && j.state === "Blocked") wake(j, VOID, "join");
          }
          keep = false;
        } else if (next.value.kind === "timer_service_wait") {
          block(t, "TimerService", null, null);
          keep = false;
        } else {
          keep = handleCall(t, next.value, false);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        emitDiag("error", message, t.line, t.id);
        endedReason = "aborted";
        keep = false;
      }
    }

    if (steps >= RTOS_STATEMENT_BUDGET) {
      emitDiag("error", "单个 tick 内执行语句过多，疑似无阻塞忙等或死循环", t.line, t.id);
      endedReason = "aborted";
    }
  }

  if (tick > config.max_ticks && endedReason === "completed") {
    endedReason = "max_ticks";
    diagnostics.push({ level: "warning", message: `模拟达到最大 tick（${config.max_ticks}）` });
  }

  closeSegment(null, "exit");
  return { events, timeline, endedReason, diagnostics };
}
