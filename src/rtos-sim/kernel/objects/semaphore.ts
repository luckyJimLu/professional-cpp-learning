/**
 * Semaphore 内核对象（支持计数信号量与二值信号量）
 */

import type { SemaphoreView, TaskId } from "../../types.ts";

export class KernelSemaphore {
  readonly kind = "semaphore" as const;
  readonly id: string;
  readonly name: string;
  readonly max: number;
  count: number;
  waiters: TaskId[] = [];

  constructor(id: string, name: string, count: number, max: number) {
    this.id = id;
    this.name = name;
    this.max = Math.max(1, max);
    this.count = Math.min(this.max, Math.max(0, count));
  }

  view(): SemaphoreView {
    return {
      kind: "semaphore",
      id: this.id,
      name: this.name,
      count: this.count,
      max: this.max,
      waiters: [...this.waiters],
    };
  }

  removeWaiter(taskId: TaskId): boolean {
    const idx = this.waiters.indexOf(taskId);
    if (idx < 0) return false;
    this.waiters.splice(idx, 1);
    return true;
  }
}
