import type { Expr, FuncDecl, Program, Stmt, VarDeclStmt } from "../frontend/ast.ts";
import { lookupObjectType, NAMESPACE_CONSTANTS } from "../frontend/apiCatalog.ts";
import type { KernelCall, KernelGen, KernelResult, ObjectInitSpec, ThreadAttrs } from "../kernel/types.ts";
import type { RtosDiagnostic } from "../types.ts";
import {
  VOID,
  boolValue,
  durationOf,
  formatValue,
  intValue,
  truthy,
  type Value,
} from "./values.ts";

class ReturnSignal { readonly value:Value; constructor(value: Value) { this.value=value; } }
class BreakSignal {}
class ContinueSignal {}

type Scope = Map<string, Value>;

export interface InterpreterRuntime {
  program: Program;
  globals: Scope;
  diagnostics: RtosDiagnostic[];
  makeMain(): KernelGen<void>;
  makeTask(entry: Value, args: Value[]): KernelGen<void> | null;
}

function scalarDefault(typeText: string): Value {
  return typeText.replace(/\s/g, "") === "bool" ? boolValue(false) : intValue(0);
}

function numberOf(v: Value): number {
  if (v.kind === "int") return v.value;
  if (v.kind === "bool") return v.value ? 1 : 0;
  if (v.kind === "char") return v.code;
  if (v.kind === "duration") return v.ms;
  return 0;
}

function valueTypeLabel(v: Value): string {
  return v.kind === "object" ? v.objectType : v.kind;
}

function timeoutOf(v: Value | undefined): { ms: number | null; forever: boolean } {
  if (!v) return { ms: null, forever: true };
  const duration = durationOf(v);
  if (duration && "forever" in duration) return { ms: null, forever: true };
  return { ms: duration && "ms" in duration ? duration.ms : numberOf(v), forever: false };
}

function makeRuntime(program: Program, diagnostics: RtosDiagnostic[]): InterpreterRuntime {
  const globals: Scope = new Map();
  const runtime: InterpreterRuntime = {
    program,
    globals,
    diagnostics,
    makeMain: () => runMain(),
    makeTask(entry, args) {
      const fn = entry.kind === "func" ? program.functions.get(entry.name) : undefined;
      if (entry.kind === "lambda") return runLambda(entry, args, globals, runtime);
      if (!fn) {
        diagnostics.push({ level: "error", message: "线程入口必须是已定义的函数或 lambda" });
        return null;
      }
      return runFunction(fn, args, globals, runtime);
    },
  };

  function* runMain(): KernelGen<void> {
    const scopes: Scope[] = [];
    for (const decl of program.globals) yield* declare(decl, scopes, globals, runtime, true);
    yield* runFunction(program.main, [], globals, runtime);
  }

  return runtime;
}

export function createInterpreter(program: Program, diagnostics: RtosDiagnostic[]): InterpreterRuntime {
  return makeRuntime(program, diagnostics);
}

function lookup(name: string, scopes: Scope[], globals: Scope, runtime: InterpreterRuntime): Value | undefined {
  for (let i = scopes.length - 1; i >= 0; i--) {
    if (scopes[i].has(name)) return scopes[i].get(name);
  }
  if (globals.has(name)) return globals.get(name);
  if (runtime.program.functions.has(name) || name === "main") return { kind: "func", name };
  const constant = NAMESPACE_CONSTANTS[name];
  if (constant?.kind === "int") return intValue(constant.value ?? 0);
  if (constant?.kind === "duration") return { kind: "forever" };
  if (constant?.kind === "tag") return { kind: "tag", name: constant.name ?? name };
  if (name === "std::endl") return { kind: "string", value: "\n" };
  return undefined;
}

function assign(name: string, value: Value, scopes: Scope[], globals: Scope): void {
  for (let i = scopes.length - 1; i >= 0; i--) {
    if (scopes[i].has(name)) { scopes[i].set(name, value); return; }
  }
  globals.set(name, value);
}

function* emitVar(name: string, value: Value, line: number, global: boolean): KernelGen<void> {
  yield { kind: "var_update", scope: global ? "global" : "local", name, type: valueTypeLabel(value), value: formatValue(value), line };
}

function objectInit(decl: VarDeclStmt, args: Value[]): { objectType: "mutex" | "semaphore" | "condvar" | "queue" | "event_group"; init: ObjectInitSpec } | null {
  const spec = lookupObjectType(decl.typeText);
  if (!spec || spec.kind !== "object" || !spec.objectType) return null;
  const clean = decl.typeText.replace(/\s/g, "");
  if (spec.objectType === "mutex") return { objectType: "mutex", init: { kind: "mutex", inherit: !(args[0]?.kind === "tag" && args[0].name === "no_priority_inheritance"), recursive: clean.includes("recursive"), timed: clean.includes("timed") } };
  if (spec.objectType === "semaphore") {
    const maxMatch = clean.match(/counting_semaphore<(\d+)>/);
    const max = clean.includes("binary_semaphore") ? 1 : Number(maxMatch?.[1] ?? 1);
    return { objectType: "semaphore", init: { kind: "semaphore", count: Math.max(0, numberOf(args[0] ?? intValue(0))), max } };
  }
  if (spec.objectType === "queue") {
    const capacity = Number(clean.match(/,\s*(\d+)>/)?.[1] ?? 1);
    return { objectType: "queue", init: { kind: "queue", capacity } };
  }
  if (spec.objectType === "condvar") return { objectType: "condvar", init: { kind: "condvar" } };
  return { objectType: "event_group", init: { kind: "event_group" } };
}

function* declare(decl: VarDeclStmt, scopes: Scope[], globals: Scope, runtime: InterpreterRuntime, isGlobal = false): Generator<KernelCall, void, KernelResult> {
  const target = isGlobal ? globals : scopes[scopes.length - 1];
  const argExprs = decl.ctorArgs ?? decl.braceArgs ?? [];
  const args: Value[] = [];
  for (const arg of argExprs) args.push(yield* evalExpr(arg, scopes, globals, runtime));
  const obj = objectInit(decl, args);
  let value: Value;
  if (obj) {
    const result = yield { kind: "obj_create", objectType: obj.objectType, name: decl.name, init: obj.init, line: decl.line };
    value = result.value;
  } else if (decl.typeText.replace(/\s/g, "") === "std::thread" || decl.typeText.replace(/\s/g, "") === "rtos::thread") {
    let attrs: ThreadAttrs | null = null;
    let entryIndex = 0;
    if (decl.typeText.replace(/\s/g, "") === "rtos::thread") {
      const record = args[0];
      if (record?.kind === "record") {
        attrs = {
          name: record.fields.name?.kind === "string" ? record.fields.name.value : undefined,
          priority: record.fields.priority ? numberOf(record.fields.priority) : undefined,
          stackWords: record.fields.stack_words ? numberOf(record.fields.stack_words) : undefined,
        };
        entryIndex = 1;
      }
    }
    const result = yield { kind: "thread_create", attrs, entry: args[entryIndex] ?? VOID, args: args.slice(entryIndex + 1), line: decl.line };
    value = result.value;
  } else if (decl.typeText.replace(/\s/g, "") === "rtos::timer") {
    const result = yield { kind: "timer_create", name: args[0]?.kind === "string" ? args[0].value : decl.name, periodMs: numberOf(args[1] ?? intValue(1)), periodic: args[2]?.kind === "tag" && args[2].name === "periodic", callback: args[3] ?? VOID, line: decl.line };
    value = result.value;
  } else if (decl.typeText.replace(/\s/g, "") === "rtos::isr") {
    const result = yield { kind: "isr_create", name: args[0]?.kind === "string" ? args[0].value : decl.name, callback: args[1] ?? VOID, line: decl.line };
    value = result.value;
  } else if (/std::(lock_guard|unique_lock|scoped_lock)/.test(decl.typeText)) {
    const ids = args.filter((v): v is Extract<Value, { kind: "object" }> => v.kind === "object").map(v => v.id).sort();
    for (const id of ids) yield { kind: "mutex_lock", objectId: id, line: decl.line };
    value = { kind: "guard", objectIds: ids, owns: true, guardType: decl.typeText.includes("unique_lock") ? "unique_lock" : decl.typeText.includes("scoped_lock") ? "scoped_lock" : "lock_guard" };
  } else if (decl.arraySize !== undefined) {
    value = { kind: "array", values: Array(decl.arraySize).fill(0) };
  } else if (decl.init) {
    value = yield* evalExpr(decl.init, scopes, globals, runtime);
  } else {
    value = scalarDefault(decl.typeText);
  }
  target.set(decl.name, value);
  yield* emitVar(decl.name, value, decl.line, isGlobal);
}

function* cleanup(scope: Scope, line: number): KernelGen<void> {
  for (const value of [...scope.values()].reverse()) {
    if (value.kind === "guard" && value.owns) {
      for (const id of [...value.objectIds].reverse()) yield { kind: "mutex_unlock", objectId: id, line };
    }
    if (value.kind === "task" && value.joinable) yield { kind: "thread_dtor_check", target: value.id, line };
  }
}

function* runFunction(fn: FuncDecl, args: Value[], globals: Scope, runtime: InterpreterRuntime): KernelGen<void> {
  const scopes: Scope[] = [new Map()];
  fn.params.forEach((p, i) => scopes[0].set(p.name, args[i] ?? intValue(0)));
  try { yield* execStatements(fn.body.body, scopes, globals, runtime); }
  catch (signal) { if (!(signal instanceof ReturnSignal)) throw signal; }
  yield* cleanup(scopes[0], fn.line);
}

function* runLambda(entry: Extract<Value, { kind: "lambda" }>, args: Value[], globals: Scope, runtime: InterpreterRuntime): KernelGen<void> {
  const scope: Scope = new Map(entry.captured ?? []);
  entry.decl.params.forEach((name, i) => scope.set(name, args[i] ?? intValue(0)));
  const scopes = [scope];
  try { yield* execStatements(entry.decl.body, scopes, globals, runtime); }
  catch (signal) { if (!(signal instanceof ReturnSignal)) throw signal; }
  yield* cleanup(scope, entry.decl.line);
}

function* execBlock(body: Stmt[], scopes: Scope[], globals: Scope, runtime: InterpreterRuntime): KernelGen<void> {
  const scope = new Map<string, Value>();
  scopes.push(scope);
  try { yield* execStatements(body, scopes, globals, runtime); }
  finally { yield* cleanup(scope, body.at(-1)?.line ?? 0); scopes.pop(); }
}

function* execStatements(body: Stmt[], scopes: Scope[], globals: Scope, runtime: InterpreterRuntime): KernelGen<void> {
  for (const stmt of body) yield* execStmt(stmt, scopes, globals, runtime);
}

function* execStmt(stmt: Stmt, scopes: Scope[], globals: Scope, runtime: InterpreterRuntime): Generator<KernelCall, void, KernelResult> {
  switch (stmt.kind) {
    case "block": yield* execBlock(stmt.body, scopes, globals, runtime); return;
    case "vardecl": yield* declare(stmt, scopes, globals, runtime); return;
    case "expr": yield* evalExpr(stmt.expr, scopes, globals, runtime); return;
    case "return": throw new ReturnSignal(stmt.value ? yield* evalExpr(stmt.value, scopes, globals, runtime) : VOID);
    case "break": throw new BreakSignal();
    case "continue": throw new ContinueSignal();
    case "if": if (truthy(yield* evalExpr(stmt.cond, scopes, globals, runtime))) yield* execStmt(stmt.then, scopes, globals, runtime); else if (stmt.else) yield* execStmt(stmt.else, scopes, globals, runtime); return;
    case "while": {
      let guard = 0;
      while (truthy(yield* evalExpr(stmt.cond, scopes, globals, runtime))) {
        if (++guard > 10000) throw new Error(`第 ${stmt.line} 行疑似忙等/死循环`);
        try { yield* execStmt(stmt.body, scopes, globals, runtime); } catch (s) { if (s instanceof BreakSignal) break; if (!(s instanceof ContinueSignal)) throw s; }
      }
      return;
    }
    case "dowhile": {
      let guard = 0;
      do {
        if (++guard > 10000) throw new Error(`第 ${stmt.line} 行疑似忙等/死循环`);
        try { yield* execStmt(stmt.body, scopes, globals, runtime); } catch (s) { if (s instanceof BreakSignal) break; if (!(s instanceof ContinueSignal)) throw s; }
      } while (truthy(yield* evalExpr(stmt.cond, scopes, globals, runtime)));
      return;
    }
    case "for": {
      const scope = new Map<string, Value>(); scopes.push(scope);
      try {
        if (stmt.init) yield* execStmt(stmt.init, scopes, globals, runtime);
        let guard = 0;
        while (!stmt.cond || truthy(yield* evalExpr(stmt.cond, scopes, globals, runtime))) {
          if (++guard > 10000) throw new Error(`第 ${stmt.line} 行疑似忙等/死循环`);
          try { yield* execStmt(stmt.body, scopes, globals, runtime); } catch (s) { if (s instanceof BreakSignal) break; if (!(s instanceof ContinueSignal)) throw s; }
          if (stmt.inc) yield* evalExpr(stmt.inc, scopes, globals, runtime);
        }
      } finally { yield* cleanup(scope, stmt.line); scopes.pop(); }
      return;
    }
  }
}

function flattenCout(expr: Expr): Expr[] | null {
  if (expr.kind !== "binary" || expr.op !== "<<") return null;
  const left = flattenCout(expr.lhs);
  if (left) return [...left, expr.rhs];
  return expr.lhs.kind === "ident" && expr.lhs.name === "std::cout" ? [expr.rhs] : null;
}

function* evalExpr(expr: Expr, scopes: Scope[], globals: Scope, runtime: InterpreterRuntime): Generator<KernelCall, Value, KernelResult> {
  const cout = flattenCout(expr);
  if (cout) {
    let text = "";
    for (const part of cout) text += formatValue(yield* evalExpr(part, scopes, globals, runtime));
    yield { kind: "stdout", text, line: expr.line };
    return VOID;
  }
  switch (expr.kind) {
    case "int": return intValue(expr.value);
    case "bool": return boolValue(expr.value);
    case "string": return { kind: "string", value: expr.value };
    case "char": return { kind: "char", code: expr.code };
    case "duration": return { kind: "duration", ms: expr.ms };
    case "ident": return lookup(expr.name, scopes, globals, runtime) ?? intValue(0);
    case "lambda": {
      const captured = new Map<string, Value>();
      if (expr.capture !== "none") { for (const scope of scopes) for (const [k, v] of scope) captured.set(k, v); }
      return { kind: "lambda", decl: expr, capture: expr.capture, captured };
    }
    case "array_init": { const values: number[] = []; for (const item of expr.items) values.push(numberOf(yield* evalExpr(item, scopes, globals, runtime))); return { kind: "array", values }; }
    case "designated": { const fields: Record<string, Value> = {}; for (const [k, v] of Object.entries(expr.fields)) fields[k] = yield* evalExpr(v, scopes, globals, runtime); return { kind: "record", fields }; }
    case "comma": { let result = VOID; for (const item of expr.exprs) result = yield* evalExpr(item, scopes, globals, runtime); return result; }
    case "member": return yield* evalExpr(expr.obj, scopes, globals, runtime);
    case "index": { const obj = yield* evalExpr(expr.obj, scopes, globals, runtime); const i = numberOf(yield* evalExpr(expr.index, scopes, globals, runtime)); return obj.kind === "array" ? intValue(obj.values[i] ?? 0) : intValue(0); }
    case "unary": { const v = yield* evalExpr(expr.operand, scopes, globals, runtime); const n = numberOf(v); return expr.op === "!" ? boolValue(!truthy(v)) : intValue(expr.op === "-" ? -n : expr.op === "~" ? ~n : n); }
    case "update": {
      if (expr.target.kind !== "ident") return intValue(0);
      const old = numberOf(lookup(expr.target.name, scopes, globals, runtime) ?? intValue(0));
      const next = old + (expr.op === "++" ? 1 : -1); assign(expr.target.name, intValue(next), scopes, globals); yield* emitVar(expr.target.name, intValue(next), expr.line, globals.has(expr.target.name));
      return intValue(expr.prefix ? next : old);
    }
    case "assign": {
      const rhs = yield* evalExpr(expr.value, scopes, globals, runtime);
      if (expr.target.kind === "ident") {
        const old = numberOf(lookup(expr.target.name, scopes, globals, runtime) ?? intValue(0)); const n = numberOf(rhs);
        const map: Record<string, number> = { "+=": old + n, "-=": old - n, "*=": old * n, "/=": n ? Math.trunc(old / n) : 0, "%=": n ? old % n : 0, "&=": old & n, "|=": old | n, "^=": old ^ n, "<<=": old << n, ">>=": old >> n };
        const value = expr.op === "=" ? rhs : intValue(map[expr.op]); assign(expr.target.name, value, scopes, globals); yield* emitVar(expr.target.name, value, expr.line, globals.has(expr.target.name)); return value;
      }
      if (expr.target.kind === "index" && expr.target.obj.kind === "ident") { const arr = lookup(expr.target.obj.name, scopes, globals, runtime); const i = numberOf(yield* evalExpr(expr.target.index, scopes, globals, runtime)); if (arr?.kind === "array") arr.values[i] = numberOf(rhs); }
      return rhs;
    }
    case "cond": return truthy(yield* evalExpr(expr.cond, scopes, globals, runtime)) ? yield* evalExpr(expr.then, scopes, globals, runtime) : yield* evalExpr(expr.else, scopes, globals, runtime);
    case "binary": {
      const l = yield* evalExpr(expr.lhs, scopes, globals, runtime);
      if (expr.op === "&&" && !truthy(l)) return boolValue(false);
      if (expr.op === "||" && truthy(l)) return boolValue(true);
      const r = yield* evalExpr(expr.rhs, scopes, globals, runtime); const a = numberOf(l), b = numberOf(r);
      const values: Record<string, number | boolean> = { "+": a+b, "-": a-b, "*": a*b, "/": b ? Math.trunc(a/b) : 0, "%": b ? a%b : 0, "<": a<b, ">": a>b, "<=": a<=b, ">=": a>=b, "==": formatValue(l)===formatValue(r), "!=": formatValue(l)!==formatValue(r), "&&": truthy(l)&&truthy(r), "||": truthy(l)||truthy(r), "&": a&b, "|": a|b, "^": a^b, "<<": a<<b, ">>": a>>b };
      const out = values[expr.op]; return typeof out === "boolean" ? boolValue(out) : intValue(out);
    }
    case "call": return yield* evalCall(expr, scopes, globals, runtime);
  }
}

function* evalCall(expr: Extract<Expr, { kind: "call" }>, scopes: Scope[], globals: Scope, runtime: InterpreterRuntime): Generator<KernelCall, Value, KernelResult> {
  const args: Value[] = []; for (const arg of expr.args) args.push(yield* evalExpr(arg, scopes, globals, runtime));
  if (!expr.calleeObj && runtime.program.functions.has(expr.calleePath)) { const fn = runtime.program.functions.get(expr.calleePath)!; yield* runFunction(fn, args, globals, runtime); return VOID; }
  if (expr.calleePath === "std::chrono::milliseconds") return { kind: "duration", ms: numberOf(args[0] ?? intValue(0)) };
  if (expr.calleePath === "std::printf") { let text = args[0]?.kind === "string" ? args[0].value : ""; let i=1; text=text.replace(/%[du]/g,()=>String(numberOf(args[i++] ?? intValue(0)))); yield {kind:"stdout",text,line:expr.line}; return VOID; }
  const duration = timeoutOf(args[0]);
  if (expr.calleePath === "std::this_thread::sleep_for") return (yield { kind: "sleep", ms: duration.ms ?? 0, line: expr.line }).value;
  if (expr.calleePath === "rtos::busy_for") return (yield { kind: "busy", ms: duration.ms ?? 0, line: expr.line }).value;
  if (expr.calleePath === "std::this_thread::yield" || expr.calleePath === "rtos::this_task::yield") return (yield { kind: "yield", line: expr.line }).value;
  if (expr.calleePath === "rtos::this_task::set_priority") return (yield { kind: "set_priority", priority: numberOf(args[0] ?? intValue(0)), line: expr.line }).value;
  if (expr.calleePath === "rtos::notify") { const t=args[0]; return (yield {kind:"notify",target:t.kind==="task"?t.id:"",value:numberOf(args[1]??intValue(1)),line:expr.line}).value; }
  if (expr.calleePath === "rtos::suspend" || expr.calleePath === "rtos::resume" || expr.calleePath === "rtos::terminate") { const t=args[0]; const kind=expr.calleePath.endsWith("suspend")?"thread_suspend":expr.calleePath.endsWith("resume")?"thread_resume":"thread_terminate"; return (yield {kind,target:t.kind==="task"?t.id:"",line:expr.line} as KernelCall).value; }
  if (expr.calleePath === "rtos::this_task::notify_take") { const t=timeoutOf(args[0]); return (yield {kind:"notify_take",timeoutMs:t.ms,forever:t.forever,line:expr.line}).value; }
  if (!expr.calleeObj) return VOID;
  const owner = yield* evalExpr(expr.calleeObj, scopes, globals, runtime);
  if (owner.kind === "task") {
    if (expr.calleePath === "join") { const result=yield {kind:"thread_join",target:owner.id,line:expr.line}; owner.joinable=false; return result.value; }
    if (expr.calleePath === "detach") { const result=yield {kind:"thread_detach",target:owner.id,line:expr.line}; owner.joinable=false; return result.value; }
  }
  if (owner.kind === "timer") return (yield {kind:expr.calleePath === "start"?"timer_start":"timer_stop",timerId:owner.id,line:expr.line}).value;
  if (owner.kind === "isr") { const d=timeoutOf(args[0]); return (yield {kind:expr.calleePath === "trigger_every"?"isr_trigger_every":"isr_trigger_at",isrId:owner.id,...(expr.calleePath === "trigger_every"?{everyMs:d.ms??0}:{atMs:d.ms??0}),line:expr.line} as KernelCall).value; }
  if (owner.kind !== "object") return VOID;
  const id=owner.id, line=expr.line;
  if (owner.objectType === "mutex") {
    if (expr.calleePath === "unlock") return (yield {kind:"mutex_unlock",objectId:id,line}).value;
    if (expr.calleePath === "try_lock") return (yield {kind:"mutex_try_lock",objectId:id,line}).value;
    if (expr.calleePath === "try_lock_for") return (yield {kind:"mutex_try_lock_for",objectId:id,ms:timeoutOf(args[0]).ms??0,line}).value;
    return (yield {kind:"mutex_lock",objectId:id,line}).value;
  }
  if (owner.objectType === "semaphore") {
    if (expr.calleePath.includes("release")) return (yield {kind:expr.calleePath.includes("from_isr")?"sem_release_from_isr":"sem_release",objectId:id,line} as KernelCall).value;
    if (expr.calleePath === "try_acquire") return (yield {kind:"sem_try_acquire",objectId:id,line}).value;
    if (expr.calleePath === "try_acquire_for") return (yield {kind:"sem_try_acquire_for",objectId:id,ms:timeoutOf(args[0]).ms??0,line}).value;
    return (yield {kind:"sem_acquire",objectId:id,line}).value;
  }
  if (owner.objectType === "queue") {
    if (expr.calleePath.startsWith("send")) { const t=timeoutOf(args[1]); return (yield {kind:expr.calleePath.includes("from_isr")?"queue_send_from_isr":"queue_send",objectId:id,value:args[0]??VOID,...(expr.calleePath.includes("from_isr")?{}:{timeoutMs:t.ms,forever:t.forever}),line} as KernelCall).value; }
    const t=timeoutOf(args[1]); const result=yield {kind:"queue_receive",objectId:id,timeoutMs:t.ms,forever:t.forever,line}; if(expr.args[0]?.kind==="ident") {assign(expr.args[0].name,result.value,scopes,globals); yield* emitVar(expr.args[0].name,result.value,line,globals.has(expr.args[0].name));} return boolValue(result.value.kind!=="void");
  }
  if (owner.objectType === "event_group") {
    if(expr.calleePath==="set"||expr.calleePath==="set_from_isr") return (yield {kind:expr.calleePath==="set"?"event_set":"event_set_from_isr",objectId:id,bits:numberOf(args[0]??intValue(0)),line} as KernelCall).value;
    if(expr.calleePath==="clear") return (yield {kind:"event_clear",objectId:id,bits:numberOf(args[0]??intValue(0)),line}).value;
  }
  return VOID;
}
