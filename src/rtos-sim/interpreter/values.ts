/**
 * RTOS 模拟器 · 值系统
 *
 * 受限 C++ 子集的运行时值。解释器与内核之间通过 KernelCall/KernelResult
 * 交换这些值；内核对象在值系统中以引用（id）表示。
 */

import type { BlockStmt, Expr, LambdaExpr } from "../frontend/ast.ts";
import type { ObjectType, TaskId } from "../types.ts";

export type Value =
  | { kind: "int"; value: number }
  | { kind: "bool"; value: boolean }
  | { kind: "string"; value: string }
  | { kind: "char"; code: number }
  /** 100ms / std::chrono::milliseconds(n) */
  | { kind: "duration"; ms: number }
  /** rtos::kWaitForever */
  | { kind: "forever" }
  /** 命名常量标签：rtos::periodic / rtos::once / rtos::no_priority_inheritance */
  | { kind: "tag"; name: string }
  /** 内核对象引用（mutex/semaphore/condvar/queue/event_group） */
  | { kind: "object"; id: string; objectType: ObjectType; name: string }
  /** 线程句柄（std::thread / rtos::thread 变量的值） */
  | { kind: "task"; id: TaskId; name: string; joinable: boolean }
  /** 软件定时器句柄 */
  | { kind: "timer"; id: string; name: string }
  /** 中断源句柄 */
  | { kind: "isr"; id: string; name: string }
  /** RAII 锁守卫（lock_guard / unique_lock / scoped_lock 变量的值） */
  | { kind: "guard"; objectIds: string[]; owns: boolean; guardType: "lock_guard" | "unique_lock" | "scoped_lock" }
  /** 闭包：捕获作用域链 + 声明 */
  | { kind: "lambda"; decl: LambdaExpr; capture: "ref" | "copy" | "none"; captured?: Map<string, Value>; scopeChain?: unknown }
  /** 函数引用（作为线程入口传入） */
  | { kind: "func"; name: string }
  /** std::array<int,N> / int arr[N] */
  | { kind: "array"; values: number[] }
  /** 指定初始化列表的求值结果（线程属性、内核配置、事件等待选项） */
  | { kind: "record"; fields: Record<string, Value> }
  | { kind: "void" };

export const VOID: Value = { kind: "void" };

export function intValue(n: number): Value {
  return { kind: "int", value: Math.trunc(n) };
}
export function boolValue(b: boolean): Value {
  return { kind: "bool", value: b };
}
export function durationValue(ms: number): Value {
  return { kind: "duration", ms };
}

export function formatValue(v: Value): string {
  switch (v.kind) {
    case "int":
      return String(v.value);
    case "bool":
      return v.value ? "1" : "0";
    case "char":
      return String.fromCharCode(v.code);
    case "string":
      return v.value;
    case "duration":
      return `${v.ms}ms`;
    case "forever":
      return "kWaitForever";
    case "tag":
      return v.name;
    case "object":
      return v.name;
    case "task":
      return v.name;
    case "timer":
      return v.name;
    case "isr":
      return v.name;
    case "guard":
      return v.objectIds.join(",");
    case "lambda":
      return "<lambda>";
    case "func":
      return v.name;
    case "array":
      return `[${v.values.join(", ")}]`;
    case "record":
      return `{${Object.keys(v.fields).join(", ")}}`;
    case "void":
      return "void";
  }
}

/** 变量声明/展示时使用的类型标签 */
export function typeOfValue(v: Value): string {
  switch (v.kind) {
    case "int":
      return "int";
    case "bool":
      return "bool";
    case "char":
      return "char";
    case "string":
      return "const char*";
    case "duration":
      return "std::chrono::milliseconds";
    case "forever":
      return "rtos::duration";
    case "tag":
      return "rtos::constant";
    case "object":
      return v.objectType === "queue" ? "rtos::message_queue" : `std::${v.objectType === "condvar" ? "condition_variable" : v.objectType}`;
    case "task":
      return "std::thread";
    case "timer":
      return "rtos::timer";
    case "isr":
      return "rtos::isr";
    case "guard":
      return `std::${v.guardType}`;
    case "lambda":
      return "lambda";
    case "func":
      return "function";
    case "array":
      return `int[${v.values.length}]`;
    case "record":
      return "{...}";
    case "void":
      return "void";
  }
}

export function truthy(v: Value): boolean {
  if (v.kind === "bool") return v.value;
  if (v.kind === "int") return v.value !== 0;
  if (v.kind === "char") return v.code !== 0;
  if (v.kind === "duration") return v.ms !== 0;
  if (v.kind === "array") return v.values.length > 0;
  return false;
}

/** 提取时长（duration / forever → null 表示无限等待） */
export function durationOf(v: Value): { ms: number } | { forever: true } | null {
  if (v.kind === "duration") return { ms: v.ms };
  if (v.kind === "forever") return { forever: true };
  if (v.kind === "int") return { ms: v.value }; // 宽容：允许裸整数当 ms
  return null;
}

/** Lambda 声明的快捷类型（供 exec 内部使用） */
export type LambdaValue = Extract<Value, { kind: "lambda" }>;
export type FuncValue = Extract<Value, { kind: "func" }>;
export type ObjectValue = Extract<Value, { kind: "object" }>;
export type TaskValue = Extract<Value, { kind: "task" }>;
export type GuardValue = Extract<Value, { kind: "guard" }>;
export type ArrayValue = Extract<Value, { kind: "array" }>;

export type { BlockStmt, Expr };
