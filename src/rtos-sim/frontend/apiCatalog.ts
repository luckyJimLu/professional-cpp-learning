/**
 * API 目录 · 唯一事实来源
 *
 * `std::` / `rtos::` API 的签名表：名称 → 内核调用种类、参数校验、是否允许
 * 在 ISR 中调用。parser（校验）、interpreter（分派）与 include/rtos_sim.h
 * （文档）都从这里派生；rtos-parser.test.ts 会检查头文件与这里保持同步。
 */

import type { ObjectType } from "../types.ts";

/** 命名空间自由函数（std::this_thread::sleep_for / rtos::suspend 等） */
export interface NamespaceCallSpec {
  /** 内核调用种类；"printf"/"cout" 由解释器直接处理 */
  callKind: string;
  minArgs: number;
  maxArgs: number;
  /** 是否允许在 ISR 上下文调用 */
  allowInIsr: boolean;
  /** 教学说明（诊断/文档） */
  zh: string;
}

export const NAMESPACE_CALLS: Record<string, NamespaceCallSpec> = {
  "std::this_thread::sleep_for": { callKind: "sleep", minArgs: 1, maxArgs: 1, allowInIsr: false, zh: "任务休眠（vTaskDelay）" },
  "std::this_thread::yield": { callKind: "yield", minArgs: 0, maxArgs: 0, allowInIsr: false, zh: "主动让出 CPU（taskYIELD）" },
  "rtos::this_task::yield": { callKind: "yield", minArgs: 0, maxArgs: 0, allowInIsr: false, zh: "主动让出 CPU（taskYIELD）" },
  "rtos::busy_for": { callKind: "busy", minArgs: 1, maxArgs: 1, allowInIsr: false, zh: "模拟占用 CPU 的计算" },
  "rtos::this_task::set_priority": { callKind: "set_priority", minArgs: 1, maxArgs: 1, allowInIsr: false, zh: "修改当前任务优先级" },
  "rtos::this_task::notify_take": { callKind: "notify_take", minArgs: 0, maxArgs: 1, allowInIsr: false, zh: "等待任务通知（ulTaskNotifyTake）" },
  "rtos::suspend": { callKind: "thread_suspend", minArgs: 1, maxArgs: 1, allowInIsr: false, zh: "挂起任务（vTaskSuspend）" },
  "rtos::resume": { callKind: "thread_resume", minArgs: 1, maxArgs: 1, allowInIsr: false, zh: "恢复任务（vTaskResume）" },
  "rtos::terminate": { callKind: "thread_terminate", minArgs: 1, maxArgs: 1, allowInIsr: false, zh: "终止任务（vTaskDelete）" },
  "rtos::notify": { callKind: "notify", minArgs: 1, maxArgs: 2, allowInIsr: false, zh: "发送任务通知" },
  "rtos::notify_from_isr": { callKind: "notify_from_isr", minArgs: 1, maxArgs: 2, allowInIsr: true, zh: "从 ISR 发送任务通知" },
  "rtos::config": { callKind: "config", minArgs: 1, maxArgs: 1, allowInIsr: false, zh: "内核配置" },
  "std::chrono::milliseconds": { callKind: "chrono_milliseconds", minArgs: 1, maxArgs: 1, allowInIsr: true, zh: "构造毫秒时长" },
  "std::printf": { callKind: "printf", minArgs: 1, maxArgs: 5, allowInIsr: true, zh: "格式化输出" },
};

/** 命名常量（rtos::kWaitForever 等） */
export const NAMESPACE_CONSTANTS: Record<string, { kind: "duration" | "int" | "tag"; ms?: number; value?: number; name?: string; zh: string }> = {
  "rtos::kWaitForever": { kind: "duration", name: "kWaitForever", zh: "无限等待" },
  "rtos::kDefaultPriority": { kind: "int", value: 2, zh: "默认任务优先级" },
  "rtos::kTimerServicePriority": { kind: "int", value: 8, zh: "Timer service 任务优先级" },
  "rtos::kIdlePriority": { kind: "int", value: 0, zh: "Idle 任务优先级" },
  "rtos::no_priority_inheritance": { kind: "tag", name: "no_priority_inheritance", zh: "关闭互斥锁优先级继承" },
  "rtos::periodic": { kind: "tag", name: "periodic", zh: "周期定时器" },
  "rtos::once": { kind: "tag", name: "once", zh: "单次定时器" },
};

/** 值方法（q.send / m.lock / t.join / blink.start ...），按值类别分派 */
export interface MethodCallSpec {
  callKind: string;
  minArgs: number;
  maxArgs: number;
  allowInIsr: boolean;
  zh: string;
  /** 该方法要求的宿主对象类别 */
  on: "object" | "task" | "timer" | "isr" | "guard";
  /** 对象类别（on === "object" 时校验） */
  objectType?: ObjectType;
}

export const METHOD_CALLS: Record<string, Record<string, MethodCallSpec>> = {
  mutex: {
    lock: { callKind: "mutex_lock", minArgs: 0, maxArgs: 0, allowInIsr: false, zh: "加锁", on: "object", objectType: "mutex" },
    try_lock: { callKind: "mutex_try_lock", minArgs: 0, maxArgs: 0, allowInIsr: false, zh: "尝试加锁", on: "object", objectType: "mutex" },
    try_lock_for: { callKind: "mutex_try_lock_for", minArgs: 1, maxArgs: 1, allowInIsr: false, zh: "限时加锁", on: "object", objectType: "mutex" },
    unlock: { callKind: "mutex_unlock", minArgs: 0, maxArgs: 0, allowInIsr: false, zh: "解锁", on: "object", objectType: "mutex" },
  },
  semaphore: {
    acquire: { callKind: "sem_acquire", minArgs: 0, maxArgs: 0, allowInIsr: false, zh: "获取信号量（P）", on: "object", objectType: "semaphore" },
    try_acquire: { callKind: "sem_try_acquire", minArgs: 0, maxArgs: 0, allowInIsr: false, zh: "尝试获取信号量", on: "object", objectType: "semaphore" },
    try_acquire_for: { callKind: "sem_try_acquire_for", minArgs: 1, maxArgs: 1, allowInIsr: false, zh: "限时获取信号量", on: "object", objectType: "semaphore" },
    release: { callKind: "sem_release", minArgs: 0, maxArgs: 0, allowInIsr: false, zh: "释放信号量（V）", on: "object", objectType: "semaphore" },
    release_from_isr: { callKind: "sem_release_from_isr", minArgs: 0, maxArgs: 0, allowInIsr: true, zh: "从 ISR 释放信号量", on: "object", objectType: "semaphore" },
  },
  condvar: {
    wait: { callKind: "cv_wait", minArgs: 1, maxArgs: 2, allowInIsr: false, zh: "等待条件变量", on: "object", objectType: "condvar" },
    wait_for: { callKind: "cv_wait_for", minArgs: 2, maxArgs: 3, allowInIsr: false, zh: "限时等待条件变量", on: "object", objectType: "condvar" },
    notify_one: { callKind: "cv_notify", minArgs: 0, maxArgs: 0, allowInIsr: false, zh: "唤醒一个等待者", on: "object", objectType: "condvar" },
    notify_all: { callKind: "cv_notify", minArgs: 0, maxArgs: 0, allowInIsr: false, zh: "唤醒全部等待者", on: "object", objectType: "condvar" },
  },
  queue: {
    send: { callKind: "queue_send", minArgs: 1, maxArgs: 2, allowInIsr: false, zh: "向队列发送消息", on: "object", objectType: "queue" },
    receive: { callKind: "queue_receive", minArgs: 1, maxArgs: 2, allowInIsr: false, zh: "从队列接收消息", on: "object", objectType: "queue" },
    send_from_isr: { callKind: "queue_send_from_isr", minArgs: 1, maxArgs: 1, allowInIsr: true, zh: "从 ISR 向队列发送消息", on: "object", objectType: "queue" },
  },
  event_group: {
    set: { callKind: "event_set", minArgs: 1, maxArgs: 1, allowInIsr: false, zh: "置位事件标志", on: "object", objectType: "event_group" },
    set_from_isr: { callKind: "event_set_from_isr", minArgs: 1, maxArgs: 1, allowInIsr: true, zh: "从 ISR 置位事件标志", on: "object", objectType: "event_group" },
    wait: { callKind: "event_wait", minArgs: 1, maxArgs: 3, allowInIsr: false, zh: "等待事件位", on: "object", objectType: "event_group" },
    clear: { callKind: "event_clear", minArgs: 1, maxArgs: 1, allowInIsr: false, zh: "清除事件位", on: "object", objectType: "event_group" },
  },
  task: {
    join: { callKind: "thread_join", minArgs: 0, maxArgs: 0, allowInIsr: false, zh: "等待任务结束", on: "task" },
    detach: { callKind: "thread_detach", minArgs: 0, maxArgs: 0, allowInIsr: false, zh: "解除任务关联", on: "task" },
  },
  timer: {
    start: { callKind: "timer_start", minArgs: 0, maxArgs: 0, allowInIsr: false, zh: "启动定时器", on: "timer" },
    stop: { callKind: "timer_stop", minArgs: 0, maxArgs: 0, allowInIsr: false, zh: "停止定时器", on: "timer" },
  },
  isr: {
    trigger_at: { callKind: "isr_trigger_at", minArgs: 1, maxArgs: 1, allowInIsr: false, zh: "安排一次中断触发", on: "isr" },
    trigger_every: { callKind: "isr_trigger_every", minArgs: 1, maxArgs: 1, allowInIsr: false, zh: "安排周期中断触发", on: "isr" },
  },
  guard: {
    unlock: { callKind: "guard_unlock", minArgs: 0, maxArgs: 0, allowInIsr: false, zh: "手动解锁守卫", on: "guard" },
    lock: { callKind: "guard_lock", minArgs: 0, maxArgs: 0, allowInIsr: false, zh: "重新锁定守卫", on: "guard" },
    owns_lock: { callKind: "guard_owns_lock", minArgs: 0, maxArgs: 0, allowInIsr: false, zh: "查询守卫持有状态", on: "guard" },
  },
};

/** 类型声明 → 对象类别（`std::mutex`、`rtos::message_queue<int, 4>` 等） */
export interface ObjectTypeSpec {
  kind: "object" | "thread" | "timer" | "isr" | "guard" | "array" | "scalar";
  objectType?: ObjectType;
  /** 从模板实参提取的参数个数（如 counting_semaphore<max>） */
  templateArgs?: number;
  zh: string;
}

export const OBJECT_TYPES: Record<string, ObjectTypeSpec> = {
  "int": { kind: "scalar", zh: "整数" },
  "unsigned": { kind: "scalar", zh: "无符号整数" },
  "unsignedint": { kind: "scalar", zh: "无符号整数" },
  "bool": { kind: "scalar", zh: "布尔" },
  "auto": { kind: "scalar", zh: "自动推导" },
  "std::size_t": { kind: "scalar", zh: "尺寸类型" },
  "size_t": { kind: "scalar", zh: "尺寸类型" },
  "std::mutex": { kind: "object", objectType: "mutex", zh: "互斥锁（优先级继承）" },
  "std::timed_mutex": { kind: "object", objectType: "mutex", zh: "限时互斥锁" },
  "std::recursive_mutex": { kind: "object", objectType: "mutex", zh: "递归互斥锁" },
  "std::recursive_timed_mutex": { kind: "object", objectType: "mutex", zh: "递归限时互斥锁" },
  "rtos::mutex": { kind: "object", objectType: "mutex", zh: "互斥锁（可关继承）" },
  "std::condition_variable": { kind: "object", objectType: "condvar", zh: "条件变量" },
  "std::binary_semaphore": { kind: "object", objectType: "semaphore", templateArgs: 0, zh: "二值信号量" },
  "rtos::event_group": { kind: "object", objectType: "event_group", zh: "事件组" },
  "rtos::timer": { kind: "timer", zh: "软件定时器" },
  "rtos::isr": { kind: "isr", zh: "中断源" },
  "std::thread": { kind: "thread", zh: "线程（默认优先级）" },
  "rtos::thread": { kind: "thread", zh: "任务（可指定属性）" },
  "std::scoped_lock": { kind: "guard", zh: "多锁 RAII 守卫" },
};

/** 需要模板实参匹配的类型（正则 → 规格） */
export const TEMPLATE_OBJECT_TYPES: { pattern: RegExp; spec: ObjectTypeSpec }[] = [
  { pattern: /^std::counting_semaphore<(\d+)>$/, spec: { kind: "object", objectType: "semaphore", templateArgs: 1, zh: "计数信号量" } },
  { pattern: /^rtos::message_queue<[^,]+,\s*(\d+)>$/, spec: { kind: "object", objectType: "queue", templateArgs: 1, zh: "消息队列" } },
  { pattern: /^std::array<[^,]+,\s*(\d+)>$/, spec: { kind: "array", templateArgs: 1, zh: "定长数组" } },
  { pattern: /^std::lock_guard<(.+)>$/, spec: { kind: "guard", zh: "RAII 锁守卫" } },
  { pattern: /^std::unique_lock<(.+)>$/, spec: { kind: "guard", zh: "RAII 可解锁守卫" } },
];

export function lookupObjectType(typeText: string): ObjectTypeSpec | null {
  const clean = typeText.replace(/\s+/g, "");
  const direct = OBJECT_TYPES[clean];
  if (direct) return direct;
  for (const { pattern, spec } of TEMPLATE_OBJECT_TYPES) {
    if (pattern.test(clean)) return spec;
  }
  return null;
}

/** obj_op action → 中文标签（快照 description 用） */
export const ACTION_LABELS: Record<string, string> = {
  lock: "加锁",
  try_lock: "尝试加锁",
  try_lock_for: "限时加锁",
  unlock: "解锁",
  acquire: "获取信号量",
  try_acquire: "尝试获取信号量",
  try_acquire_for: "限时获取信号量",
  release: "释放信号量",
  release_from_isr: "从 ISR 释放信号量",
  wait: "等待条件变量",
  wait_for: "限时等待条件变量",
  notify_one: "唤醒一个等待者",
  notify_all: "唤醒全部等待者",
  send: "发送消息",
  receive: "接收消息",
  send_from_isr: "从 ISR 发送消息",
  set: "置位事件",
  set_from_isr: "从 ISR 置位事件",
  event_wait: "等待事件位",
  clear: "清除事件位",
  start: "启动定时器",
  stop: "停止定时器",
  join: "join 任务",
  detach: "detach 任务",
  notify: "发送任务通知",
  notify_from_isr: "从 ISR 发送任务通知",
  notify_take: "等待任务通知",
  sleep: "休眠",
  busy: "忙等计算",
  yield: "让出 CPU",
  suspend: "挂起任务",
  resume: "恢复任务",
  terminate: "终止任务",
  trigger_at: "安排中断触发",
  trigger_every: "安排周期中断",
  set_priority: "调整优先级",
};

/** 允许在 ISR 中调用的内核调用种类（含 from_isr 变体与瞬时操作） */
export const ISR_ALLOWED_CALL_KINDS = new Set<string>([
  "queue_send_from_isr",
  "sem_release_from_isr",
  "notify_from_isr",
  "event_set_from_isr",
  "stdout",
  "var_update",
  "obj_create",
  "printf",
  "cout",
]);

export function isIsrAllowed(kind: string): boolean {
  return ISR_ALLOWED_CALL_KINDS.has(kind);
}
