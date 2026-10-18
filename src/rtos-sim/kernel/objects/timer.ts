/**
 * Software Timer 内核对象（由高优先级 timer-service 任务执行回调）
 */

import type { Value } from "../../interpreter/values.ts";
import type { TimerView } from "../../types.ts";

export class KernelTimer {
  readonly kind = "timer" as const;
  readonly id: string;
  readonly name: string;
  readonly periodMs: number;
  readonly periodic: boolean;
  readonly callback: Value;
  running = false;
  nextFireTick: number | null = null;

  constructor(id: string, name: string, periodMs: number, periodic: boolean, callback: Value) {
    this.id = id;
    this.name = name;
    this.periodMs = Math.max(1, periodMs);
    this.periodic = periodic;
    this.callback = callback;
  }

  view(): TimerView {
    return {
      kind: "timer",
      id: this.id,
      name: this.name,
      periodMs: this.periodMs,
      periodic: this.periodic,
      running: this.running,
      nextFireTick: this.nextFireTick,
    };
  }
}
