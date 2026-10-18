/**
 * 等待关系图（Wait-For Graph）与死锁 / 全局卡死检测
 */

import type { KernelObjectView, TaskId, WaitForEdge } from "../types.ts";

export interface WaitGraphTask {
  id: TaskId;
  name: string;
  state: string;
  blockReason: string | null;
  blockedObjectId: string | null;
  wakeTick: number | null;
}

/**
 * 构建当前时刻的等待边列表（用于快照 UI 渲染与环检测）
 */
export function buildWaitForEdges(
  tasks: Iterable<WaitGraphTask>,
  objects: Map<string, KernelObjectView>,
): WaitForEdge[] {
  const edges: WaitForEdge[] = [];
  const taskMap = new Map<string, WaitGraphTask>();
  for (const t of tasks) taskMap.set(t.id, t);

  for (const task of taskMap.values()) {
    if (task.state !== "Blocked" || !task.blockReason) continue;
    if (task.blockReason === "Join" && task.blockedObjectId) {
      const targetTask = taskMap.get(task.blockedObjectId);
      if (targetTask && targetTask.state !== "Deleted") {
        edges.push({
          from: task.id,
          to: targetTask.id,
          via: targetTask.id,
          label: `join(${targetTask.name})`,
        });
      }
      continue;
    }

    if (!task.blockedObjectId) continue;
    const obj = objects.get(task.blockedObjectId);
    if (!obj) continue;

    if (obj.kind === "mutex" && obj.owner) {
      edges.push({
        from: task.id,
        to: obj.owner,
        via: obj.id,
        label: obj.name,
      });
    } else {
      edges.push({
        from: task.id,
        to: obj.id,
        via: obj.id,
        label: obj.name,
      });
    }
  }

  return edges;
}

/**
 * 在任务间等待关系（Mutex 持有关系 + Join 等待关系）中用 DFS 检测死锁环。
 * 若发现环，返回以名称展示的环路径（如 `["P0", "f1", "P1", "f0", "P0"]`），否则返回 null。
 */
export function detectDeadlockCycle(
  tasks: Iterable<WaitGraphTask>,
  objects: Map<string, KernelObjectView>,
): string[] | null {
  const taskMap = new Map<string, WaitGraphTask>();
  for (const t of tasks) taskMap.set(t.id, t);

  // 每个 Blocked 任务最多等待一个下游任务（Mutex owner 或 Join target）
  const nextEdge = new Map<string, { toTask: string; viaName: string }>();

  for (const task of taskMap.values()) {
    if (task.state !== "Blocked" || !task.blockedObjectId) continue;
    if (task.blockReason === "Mutex") {
      const obj = objects.get(task.blockedObjectId);
      if (obj?.kind === "mutex" && obj.owner && obj.owner !== task.id) {
        nextEdge.set(task.id, { toTask: obj.owner, viaName: obj.name });
      }
    } else if (task.blockReason === "Join") {
      const target = taskMap.get(task.blockedObjectId);
      if (target && target.state !== "Deleted" && target.id !== task.id) {
        nextEdge.set(task.id, { toTask: target.id, viaName: `join(${target.name})` });
      }
    }
  }

  const visited = new Set<string>();

  for (const startId of nextEdge.keys()) {
    if (visited.has(startId)) continue;
    const trailTasks: string[] = [];
    const trailVia: string[] = [];
    const indexInTrail = new Map<string, number>();

    let curr: string | undefined = startId;
    while (curr !== undefined) {
      if (indexInTrail.has(curr)) {
        const loopStart = indexInTrail.get(curr)!;
        const cycle: string[] = [];
        for (let i = loopStart; i < trailTasks.length; i++) {
          const tName = taskMap.get(trailTasks[i])?.name ?? trailTasks[i];
          cycle.push(tName);
          cycle.push(trailVia[i]);
        }
        const firstName = taskMap.get(curr)?.name ?? curr;
        cycle.push(firstName);
        return cycle;
      }
      if (visited.has(curr)) break;
      visited.add(curr);
      const edge = nextEdge.get(curr);
      if (!edge) break;
      indexInTrail.set(curr, trailTasks.length);
      trailTasks.push(curr);
      trailVia.push(edge.viaName);
      curr = edge.toTask;
    }
  }

  return null;
}
