/**
 * RTOS 轨迹事件归约器（纯函数）
 *
 * 将确定性 `RtosTraceEvent[]` 归约为可供 VCR 逐步回放的 `RtosSnapshot[]`，
 * 重建每个任务的调用栈帧（`StackFrame[]`）、全局变量、内核对象视图与等待关系图。
 */

import type { StackFrame, StackVariable } from "../visualizer/types.ts";
import { ACTION_LABELS } from "./frontend/apiCatalog.ts";
import { buildWaitForEdges, type WaitGraphTask } from "./kernel/waitFor.ts";
import {
  MAX_RTOS_SNAPSHOTS,
  type KernelObjectView,
  type RtosSnapshot,
  type RtosTraceEvent,
  type TaskView,
  type TimelineSegment,
} from "./types.ts";

export type SnapshotGranularity = "statement" | "kernel";

const cloneObjects = (objects: Map<string, KernelObjectView>): KernelObjectView[] =>
  [...objects.values()].map((o) => structuredClone(o));

const cloneTasks = (tasks: Map<string, TaskView>): TaskView[] =>
  [...tasks.values()].map((t) => structuredClone(t));

function describe(
  e: RtosTraceEvent,
  tasks: Map<string, TaskView>,
  objects: Map<string, KernelObjectView>,
): string {
  const task =
    "task" in e && typeof e.task === "string"
      ? e.task === "isr"
        ? "ISR"
        : (tasks.get(e.task)?.name ?? e.task)
      : "";
  switch (e.op) {
    case "task_create":
      return `创建任务 ${e.name}（优先级 ${e.priority}）`;
    case "task_delete":
      return `${task} 已结束（${e.reason === "return" ? "函数返回" : "被终止"}）`;
    case "task_state": {
      const objName = e.objectId ? (objects.get(e.objectId)?.name ?? e.objectId) : null;
      const reasonStr = e.reason ? ` · ${e.reason}${objName ? `(${objName})` : ""}` : "";
      return `${task}: ${e.from} → ${e.to}${reasonStr}`;
    }
    case "context_switch": {
      const fromName = e.from ? (tasks.get(e.from)?.name ?? e.from) : "启动";
      const toName = tasks.get(e.to)?.name ?? e.to;
      return `上下文切换：${fromName} → ${toName}（${e.cause}）`;
    }
    case "obj_create":
      return `创建内核对象 ${e.object.name}（${e.object.kind}）`;
    case "obj_op": {
      const objName = objects.get(e.objectId)?.name ?? e.objectId;
      const valSuffix = e.value !== undefined && e.value !== "" ? ` [${e.value}]` : "";
      return `${task} ${ACTION_LABELS[e.action] ?? e.action} ${objName}${valSuffix}${e.ok ? "" : "（阻塞等待/超时）"}`;
    }
    case "stdout":
      return `${task} 输出 ${JSON.stringify(e.text)}`;
    case "var_update":
      return `${task} 更新变量 ${e.name} = ${e.value}`;
    case "prio_inherit":
      return `${task} 优先级继承提升 ${e.from} → ${e.to}`;
    case "prio_restore":
      return `${task} 优先级恢复 ${e.from} → ${e.to}`;
    case "deadlock_detected":
      return `检测到死锁环：${e.cycle.join(" → ")}`;
    case "system_stall":
      return "全局卡死：所有任务均处于等待状态且无后续唤醒源";
    case "diagnostic":
      return e.message;
    case "isr_enter":
      return `⚡ 进入中断服务程序 ${e.isr}`;
    case "isr_exit":
      return `⚡ 退出中断服务程序 ${e.isr}${e.resume ? ` → 恢复 ${tasks.get(e.resume)?.name ?? e.resume}` : ""}`;
    case "timer_fire":
      return `⏱ 软件定时器 ${e.timer} 到期触发`;
    case "spurious_wakeup": {
      const objName = objects.get(e.objectId)?.name ?? e.objectId;
      return `⚠ ${task} 在 ${objName} 上发生虚假唤醒（spurious wakeup）`;
    }
  }
}

function updateTaskFrameVar(task: TaskView, scope: string, name: string, type: string, value: string): void {
  const parts = scope.split("/").filter(Boolean);
  const frameName = parts.at(-1) ?? task.name;

  // 先将已有变量的 modified 状态重置为 normal
  for (const f of task.frames) {
    for (const v of f.variables) {
      if (v.status === "modified") v.status = "normal";
    }
  }

  let frame = task.frames.find((f) => f.name === frameName);
  if (!frame) {
    const newFrame: StackFrame = { id: `${task.id}:${frameName}`, name: frameName, variables: [] };
    task.frames.push(newFrame);
    frame = newFrame;
  }

  const existing = frame.variables.find((v) => v.name === name);
  if (existing) {
    existing.value = value;
    existing.type = type;
    existing.status = "modified";
  } else {
    frame.variables.push({
      name,
      type,
      value,
      status: "modified",
    });
  }
}

export function computeRtosSnapshots(
  events: RtosTraceEvent[],
  timeline: TimelineSegment[] = [],
  granularity: SnapshotGranularity = "statement",
): RtosSnapshot[] {
  void timeline;
  const tasks = new Map<string, TaskView>();
  const taskBlockedObjId = new Map<string, string | null>();
  const objects = new Map<string, KernelObjectView>();
  const globalVars = new Map<string, StackVariable>();
  const warnings: string[] = [];
  let stdout = "";
  let running: string | null = null;
  const snapshots: RtosSnapshot[] = [];

  for (const e of events) {
    if (snapshots.length >= MAX_RTOS_SNAPSHOTS) break;

    // 重置上一帧全局变量的 modified 标记
    for (const gv of globalVars.values()) {
      if (gv.status === "modified") gv.status = "normal";
    }

    if (e.op === "task_create") {
      const kind: TaskView["kind"] =
        e.task === "main" ? "main" : e.task === "timer-svc" ? "timer-service" : "user";
      tasks.set(e.task, {
        id: e.task,
        name: e.name,
        kind,
        state: "Ready",
        basePriority: e.priority,
        effectivePriority: e.priority,
        blockedOn: null,
        currentLine: e.line,
        frames: [{ id: `${e.task}:${e.name}`, name: e.name, variables: [] }],
        joinable: kind === "user",
        notifyValue: 0,
      });
      taskBlockedObjId.set(e.task, null);
    } else if (e.op === "task_delete") {
      const t = tasks.get(e.task);
      if (t) {
        t.state = "Deleted";
        t.blockedOn = null;
        t.joinable = false;
      }
      taskBlockedObjId.set(e.task, null);
    } else if (e.op === "task_state") {
      const t = tasks.get(e.task);
      if (t) {
        t.state = e.to;
        if (e.line > 0) t.currentLine = e.line;
        const objId = e.objectId ?? null;
        taskBlockedObjId.set(e.task, e.to === "Blocked" ? objId : null);
        if (e.to === "Blocked" && e.reason) {
          const objName = objId
            ? (objects.get(objId)?.name ?? tasks.get(objId)?.name ?? objId)
            : null;
          t.blockedOn = { reason: e.reason, objectName: objName };
        } else {
          t.blockedOn = null;
        }
      }
    } else if (e.op === "context_switch") {
      running = e.to === "idle" ? null : e.to;
    } else if (e.op === "prio_inherit" || e.op === "prio_restore") {
      const t = tasks.get(e.task);
      if (t) t.effectivePriority = e.to;
    } else if (e.op === "obj_create") {
      const i = e.object.init;
      let o: KernelObjectView;
      if (i.kind === "mutex") {
        o = {
          kind: "mutex",
          id: e.object.id,
          name: e.object.name,
          owner: null,
          ownerEffective: 0,
          recursion: 0,
          inherit: i.inherit,
          recursive: i.recursive,
          waiters: [],
        };
      } else if (i.kind === "semaphore") {
        o = {
          kind: "semaphore",
          id: e.object.id,
          name: e.object.name,
          count: i.count,
          max: i.max,
          waiters: [],
        };
      } else if (i.kind === "condvar") {
        o = {
          kind: "condvar",
          id: e.object.id,
          name: e.object.name,
          waiters: [],
          attachedLock: null,
        };
      } else if (i.kind === "queue") {
        o = {
          kind: "queue",
          id: e.object.id,
          name: e.object.name,
          capacity: i.capacity,
          buffer: [],
          head: 0,
          senders: [],
          receivers: [],
        };
      } else if (i.kind === "event_group") {
        o = {
          kind: "event_group",
          id: e.object.id,
          name: e.object.name,
          bits: 0,
          waiters: [],
        };
      } else if (i.kind === "timer") {
        o = {
          kind: "timer",
          id: e.object.id,
          name: e.object.name,
          periodMs: i.periodMs,
          periodic: i.periodic,
          running: false,
          nextFireTick: null,
        };
      } else {
        o = {
          kind: "isr",
          id: e.object.id,
          name: e.object.name,
          nextFireTick: null,
          everyMs: null,
          firedCount: 0,
        };
      }
      objects.set(o.id, o);
    } else if (e.op === "obj_op") {
      if (e.state) {
        objects.set(e.objectId, structuredClone(e.state));
      }
      if (e.task !== "isr") {
        const t = tasks.get(e.task);
        if (t && e.line > 0) t.currentLine = e.line;
      }
    } else if (e.op === "stdout") {
      stdout += e.text;
      if (e.task !== "isr") {
        const t = tasks.get(e.task);
        if (t && e.line > 0) t.currentLine = e.line;
      }
    } else if (e.op === "var_update") {
      const t = tasks.get(e.task);
      if (t && e.line > 0) t.currentLine = e.line;
      if (e.scope === "global") {
        globalVars.set(e.name, {
          name: e.name,
          type: e.type,
          value: e.value,
          status: "modified",
        });
      } else if (t) {
        updateTaskFrameVar(t, e.scope, e.name, e.type, e.value);
      }
    } else if (e.op === "diagnostic" || e.op === "system_stall" || e.op === "deadlock_detected") {
      warnings.push(describe(e, tasks, objects));
    }

    // 若粒度为 "kernel"（内核事件级），跳过 var_update 单独产生快照，状态已累计
    if (granularity === "kernel" && e.op === "var_update") {
      continue;
    }

    const activeLines: Record<string, number> = {};
    for (const t of tasks.values()) {
      if (t.currentLine > 0 && t.state !== "Deleted") {
        activeLines[t.id] = t.currentLine;
      }
    }

    const waitTasks: WaitGraphTask[] = [...tasks.values()].map((t) => ({
      id: t.id,
      name: t.name,
      state: t.state,
      blockReason: t.blockedOn?.reason ?? null,
      blockedObjectId: taskBlockedObjId.get(t.id) ?? null,
      wakeTick: null,
    }));

    snapshots.push({
      stepIndex: snapshots.length,
      tick: e.tick,
      description: describe(e, tasks, objects),
      running: eventRunning(e, running),
      tasks: cloneTasks(tasks),
      objects: cloneObjects(objects),
      waitFor: buildWaitForEdges(waitTasks, objects),
      timelineUntilTick: e.tick,
      stdout,
      warnings: [...warnings],
      activeLines,
      globals: [...globalVars.values()].map((v) => ({ ...v })),
      event: e,
    });
  }

  return snapshots;
}

function eventRunning(e: RtosTraceEvent, running: string | null): string | "isr" | null {
  return e.op === "isr_enter" ? "isr" : running;
}
