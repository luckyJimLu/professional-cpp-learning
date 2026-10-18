/**
 * Message Queue 内核对象（定长环形缓冲 + 发送/接收阻塞队列）
 */

import type { Value } from "../../interpreter/values.ts";
import { formatValue } from "../../interpreter/values.ts";
import type { QueueView, TaskId } from "../../types.ts";

export class KernelQueue {
  readonly kind = "queue" as const;
  readonly id: string;
  readonly name: string;
  readonly capacity: number;
  items: Value[] = [];
  head = 0;
  senders: TaskId[] = [];
  receivers: TaskId[] = [];
  readonly senderValues = new Map<TaskId, Value>();

  constructor(id: string, name: string, capacity: number) {
    this.id = id;
    this.name = name;
    this.capacity = Math.max(1, capacity);
  }

  enqueue(v: Value): void {
    this.items.push(v);
  }

  dequeue(): Value | undefined {
    const v = this.items.shift();
    if (v !== undefined) {
      this.head = (this.head + 1) % this.capacity;
    }
    return v;
  }

  view(): QueueView {
    return {
      kind: "queue",
      id: this.id,
      name: this.name,
      capacity: this.capacity,
      buffer: this.items.map((v) => formatValue(v)),
      head: this.head,
      senders: [...this.senders],
      receivers: [...this.receivers],
    };
  }

  removeWaiter(taskId: TaskId): boolean {
    let removed = false;
    const sIdx = this.senders.indexOf(taskId);
    if (sIdx >= 0) {
      this.senders.splice(sIdx, 1);
      this.senderValues.delete(taskId);
      removed = true;
    }
    const rIdx = this.receivers.indexOf(taskId);
    if (rIdx >= 0) {
      this.receivers.splice(rIdx, 1);
      removed = true;
    }
    return removed;
  }
}
