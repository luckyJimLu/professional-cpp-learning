/**
 * Mutex 内核对象（支持普通/递归/限时获取 + FreeRTOS 语义优先级继承）
 */

import type { MutexView, TaskId } from "../../types.ts";

export class KernelMutex {
  readonly kind = "mutex" as const;
  readonly id: string;
  readonly name: string;
  readonly inherit: boolean;
  readonly recursive: boolean;
  readonly timed: boolean;
  owner: TaskId | null = null;
  ownerEffective = 0;
  recursion = 0;
  waiters: TaskId[] = [];

  constructor(id: string, name: string, opts: { inherit: boolean; recursive: boolean; timed: boolean }) {
    this.id = id;
    this.name = name;
    this.inherit = opts.inherit;
    this.recursive = opts.recursive;
    this.timed = opts.timed;
  }

  view(): MutexView {
    return {
      kind: "mutex",
      id: this.id,
      name: this.name,
      owner: this.owner,
      ownerEffective: this.ownerEffective,
      recursion: this.recursion,
      inherit: this.inherit,
      recursive: this.recursive,
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
