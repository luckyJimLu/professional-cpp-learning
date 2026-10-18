/**
 * Condition Variable 内核对象（支持 wait / wait_for / notify_one / notify_all / 虚假唤醒注入）
 */

import type { CondvarView, TaskId } from "../../types.ts";

export class KernelCondVar {
  readonly kind = "condvar" as const;
  readonly id: string;
  readonly name: string;
  waiters: TaskId[] = [];
  attachedLock: string | null = null;
  /** 记录等待者释放的锁 ID，唤醒后需重新获取该锁 */
  readonly waiterLocks = new Map<TaskId, string>();

  constructor(id: string, name: string) {
    this.id = id;
    this.name = name;
  }

  view(): CondvarView {
    return {
      kind: "condvar",
      id: this.id,
      name: this.name,
      waiters: [...this.waiters],
      attachedLock: this.attachedLock,
    };
  }

  removeWaiter(taskId: TaskId): string | null {
    const idx = this.waiters.indexOf(taskId);
    if (idx >= 0) this.waiters.splice(idx, 1);
    const lockId = this.waiterLocks.get(taskId) ?? null;
    this.waiterLocks.delete(taskId);
    if (this.waiters.length === 0) this.attachedLock = null;
    return lockId;
  }
}
