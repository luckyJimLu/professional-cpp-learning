/**
 * ISR 中断源内核对象（支持单次 trigger_at 与周期 trigger_every）
 */

import type { Value } from "../../interpreter/values.ts";
import type { IsrView } from "../../types.ts";

export class KernelIsr {
  readonly kind = "isr" as const;
  readonly id: string;
  readonly name: string;
  readonly callback: Value;
  readonly oneShotTicks = new Set<number>();
  everyTicks: number | null = null;
  everyMs: number | null = null;
  nextPeriodicTick: number | null = null;
  firedCount = 0;

  constructor(id: string, name: string, callback: Value) {
    this.id = id;
    this.name = name;
    this.callback = callback;
  }

  nextTick(afterOrAtTick: number): number | null {
    let best: number | null = null;
    for (const t of this.oneShotTicks) {
      if (t >= afterOrAtTick && (best === null || t < best)) {
        best = t;
      }
    }
    if (this.nextPeriodicTick !== null && this.nextPeriodicTick >= afterOrAtTick) {
      if (best === null || this.nextPeriodicTick < best) {
        best = this.nextPeriodicTick;
      }
    }
    return best;
  }

  shouldFireAt(tick: number): boolean {
    let fire = false;
    if (this.oneShotTicks.has(tick)) {
      this.oneShotTicks.delete(tick);
      fire = true;
    }
    if (this.nextPeriodicTick !== null && tick >= this.nextPeriodicTick) {
      fire = true;
      if (this.everyTicks !== null && this.everyTicks > 0) {
        this.nextPeriodicTick = tick + this.everyTicks;
      } else {
        this.nextPeriodicTick = null;
      }
    }
    if (fire) this.firedCount++;
    return fire;
  }

  view(currentTick = 0): IsrView {
    return {
      kind: "isr",
      id: this.id,
      name: this.name,
      nextFireTick: this.nextTick(currentTick),
      everyMs: this.everyMs,
      firedCount: this.firedCount,
    };
  }
}
