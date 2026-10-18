/**
 * Event Group 内核对象（支持位图置位、清除、ANY/ALL 等待与退出自动清除）
 */

import type { EventGroupView, TaskId } from "../../types.ts";

export interface EventGroupWaiter {
  task: TaskId;
  mask: number;
  all: boolean;
  clearOnExit: boolean;
}

export class KernelEventGroup {
  readonly kind = "event_group" as const;
  readonly id: string;
  readonly name: string;
  bits = 0;
  waiters: EventGroupWaiter[] = [];

  constructor(id: string, name: string) {
    this.id = id;
    this.name = name;
  }

  matches(mask: number, waitAll: boolean): boolean {
    if (mask === 0) return true;
    return waitAll ? (this.bits & mask) === mask : (this.bits & mask) !== 0;
  }

  view(): EventGroupView {
    return {
      kind: "event_group",
      id: this.id,
      name: this.name,
      bits: this.bits,
      waiters: this.waiters.map((w) => ({ task: w.task, mask: w.mask, all: w.all })),
    };
  }

  removeWaiter(taskId: TaskId): boolean {
    const idx = this.waiters.findIndex((w) => w.task === taskId);
    if (idx < 0) return false;
    this.waiters.splice(idx, 1);
    return true;
  }
}
