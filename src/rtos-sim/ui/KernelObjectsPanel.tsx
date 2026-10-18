/**
 * KernelObjectsPanel · 内核同步原语与定时器/中断图形面板
 *
 * 为每种对象渲染可视化结构：
 * - Queue：环形槽位格子 + head 指针 + 等待者
 * - Semaphore：令牌圆点阵列 + 计数
 * - Mutex：持有者徽标 + 优先级继承指示 + 等待者
 * - EventGroup：8 位二进制位图格
 * - CondVar / Timer / ISR：等待者与触发倒计时
 */

import type { KernelObjectView, TaskView } from "../types.ts";

function taskName(tasks: TaskView[], id: string | null): string {
  if (!id) return "—";
  return tasks.find((t) => t.id === id)?.name ?? id;
}

export function KernelObjectCard({
  object,
  tasks,
}: {
  object: KernelObjectView;
  tasks: TaskView[];
}) {
  if (object.kind === "mutex") {
    const ownerName = object.owner ? taskName(tasks, object.owner) : "—";
    const waiters = object.waiters.map((w) => taskName(tasks, w)).join(", ") || "—";
    return (
      <article className="object-card">
        <div>
          <span className="object-kind kind-mutex">mutex</span>
          <strong>{object.name}</strong>
          <span className="object-badge">{object.inherit ? "优先级继承" : "无继承"}</span>
        </div>
        <p>
          持有者 {ownerName} · 等待 {waiters}
        </p>
      </article>
    );
  }

  if (object.kind === "semaphore") {
    const waiters = object.waiters.map((w) => taskName(tasks, w)).join(", ") || "—";
    const dots = Array.from({ length: Math.min(object.max, 8) }, (_, idx) => idx < object.count);
    return (
      <article className="object-card">
        <div>
          <span className="object-kind kind-semaphore">semaphore</span>
          <strong>{object.name}</strong>
          <span className="token-dots" aria-hidden="true">
            {dots.map((filled, idx) => (
              <i key={idx} className={filled ? "token-dot is-filled" : "token-dot"} />
            ))}
          </span>
        </div>
        <p>
          令牌 {object.count} / {object.max} · 等待 {waiters}
        </p>
      </article>
    );
  }

  if (object.kind === "queue") {
    const slots = Array.from({ length: Math.min(object.capacity, 8) }, (_, idx) => object.buffer[idx] ?? null);
    return (
      <article className="object-card">
        <div>
          <span className="object-kind kind-queue">queue</span>
          <strong>{object.name}</strong>
          <span className="object-badge">head={object.head}</span>
        </div>
        <div className="queue-slots" aria-hidden="true">
          {slots.map((item, idx) => (
            <span key={idx} className={item !== null ? "queue-slot is-occupied" : "queue-slot"}>
              {item ?? "·"}
            </span>
          ))}
        </div>
        <p>
          缓冲 [{object.buffer.join(" · ") || "空"}] · {object.buffer.length}/{object.capacity}
        </p>
      </article>
    );
  }

  if (object.kind === "event_group") {
    const bitStr = object.bits.toString(2).padStart(4, "0");
    return (
      <article className="object-card">
        <div>
          <span className="object-kind kind-event_group">event group</span>
          <strong>{object.name}</strong>
        </div>
        <div className="bit-grid" aria-hidden="true">
          {bitStr.split("").map((b, idx) => (
            <span key={idx} className={b === "1" ? "bit-cell is-set" : "bit-cell"}>
              {b}
            </span>
          ))}
        </div>
        <p>
          位图 0b{bitStr} · 等待者 {object.waiters.length || "—"}
        </p>
      </article>
    );
  }

  if (object.kind === "condvar") {
    const waiters = object.waiters.map((w) => taskName(tasks, w)).join(", ") || "—";
    return (
      <article className="object-card">
        <div>
          <span className="object-kind kind-condvar">condvar</span>
          <strong>{object.name}</strong>
        </div>
        <p>等待队列：{waiters}</p>
      </article>
    );
  }

  if (object.kind === "timer") {
    return (
      <article className="object-card">
        <div>
          <span className="object-kind kind-timer">timer</span>
          <strong>{object.name}</strong>
          <span className="object-badge">{object.periodic ? "周期" : "单次"}</span>
        </div>
        <p>
          周期 {object.periodMs}ms · {object.running ? `下次触发 tick ${object.nextFireTick ?? "—"}` : "已停止"}
        </p>
      </article>
    );
  }

  return (
    <article className="object-card">
      <div>
        <span className="object-kind kind-isr">isr</span>
        <strong>{object.name}</strong>
        <span className="object-badge">已触发 {object.firedCount} 次</span>
      </div>
      <p>下次触发：{object.nextFireTick !== null ? `tick ${object.nextFireTick}` : "—"}</p>
    </article>
  );
}

export function KernelObjectsPanel({
  objects,
  tasks,
}: {
  objects: KernelObjectView[];
  tasks: TaskView[];
}) {
  if (objects.length === 0) {
    return (
      <div className="empty-state">
        <strong>没有内核对象</strong>
        <span>声明 mutex、semaphore、condition_variable 或 message_queue 后会显示在这里。</span>
      </div>
    );
  }

  return (
    <div className="object-grid">
      {objects.map((o) => (
        <KernelObjectCard object={o} tasks={tasks} key={o.id} />
      ))}
    </div>
  );
}
