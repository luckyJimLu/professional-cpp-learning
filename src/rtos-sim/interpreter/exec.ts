/**
 * RTOS 模拟器 · 生成器解释器
 *
 * 每个任务对应一个 `Generator<KernelCall, void, KernelResult>`（以及 ISR / Timer 回调的
 * 子生成器）。解释器执行到内核 API 时 `yield` 一个 `KernelCall`，由内核决定何时 `resume`
 * 并传回 `KernelResult`。
 */

import type { Expr, FuncDecl, Program, Stmt, VarDeclStmt } from "../frontend/ast.ts";
import { lookupObjectType, NAMESPACE_CONSTANTS } from "../frontend/apiCatalog.ts";
import type { KernelCall, KernelGen, KernelResult, ObjectInitSpec, ThreadAttrs } from "../kernel/types.ts";
import { RTOS_STATEMENT_BUDGET, type RtosConfig, type RtosDiagnostic } from "../types.ts";
import { Env, ScopeFrame } from "./env.ts";
import {
  VOID,
  boolValue,
  durationOf,
  formatValue,
  intValue,
  truthy,
  typeOfValue,
  type GuardValue,
  type LambdaValue,
  type Value,
} from "./values.ts";

class ReturnSignal {
  readonly value: Value;
  constructor(value: Value) {
    this.value = value;
  }
}
class BreakSignal {}
class ContinueSignal {}

const MAX_CALL_DEPTH = 64;

export interface InterpreterRuntime {
  program: Program;
  globals: Map<string, Value>;
  diagnostics: RtosDiagnostic[];
  makeMain(): KernelGen<void>;
  makeTask(entry: Value, args: Value[]): KernelGen<void> | null;
  makeCallback(entry: Value): KernelGen<void> | null;
  evalPredicate(pred: Value): KernelGen<boolean>;
}

function scalarDefault(typeText: string): Value {
  return typeText.replace(/\s+/g, "") === "bool" ? boolValue(false) : intValue(0);
}

function numberOf(v: Value): number {
  if (v.kind === "int") return v.value;
  if (v.kind === "bool") return v.value ? 1 : 0;
  if (v.kind === "char") return v.code;
  if (v.kind === "duration") return v.ms;
  return 0;
}

function timeoutOf(v: Value | undefined): { ms: number | null; forever: boolean } {
  if (!v) return { ms: null, forever: true };
  const duration = durationOf(v);
  if (duration && "forever" in duration) return { ms: null, forever: true };
  return { ms: duration && "ms" in duration ? duration.ms : numberOf(v), forever: false };
}

export function createInterpreter(program: Program, diagnostics: RtosDiagnostic[]): InterpreterRuntime {
  const globals = new Map<string, Value>();

  const runtime: InterpreterRuntime = {
    program,
    globals,
    diagnostics,
    makeMain() {
      return runMain(runtime);
    },
    makeTask(entry, args) {
      if (entry.kind === "func") {
        const fn = program.functions.get(entry.name);
        if (!fn) {
          diagnostics.push({ level: "error", message: `未定义的函数 "${entry.name}"` });
          return null;
        }
        return runTaskFunction(fn, args, runtime);
      }
      if (entry.kind === "lambda") {
        return runTaskLambda(entry, args, runtime);
      }
      diagnostics.push({ level: "error", message: "线程入口必须是已定义的函数或 lambda" });
      return null;
    },
    makeCallback(entry) {
      if (entry.kind === "func") {
        const fn = program.functions.get(entry.name);
        if (!fn) return null;
        return runTaskFunction(fn, [], runtime);
      }
      if (entry.kind === "lambda") {
        return runTaskLambda(entry, [], runtime);
      }
      return null;
    },
    evalPredicate(pred) {
      return runPredicate(pred, runtime);
    },
  };

  return runtime;
}

function* runMain(runtime: InterpreterRuntime): KernelGen<void> {
  const env = new Env(runtime.globals);
  for (const decl of runtime.program.globals) {
    yield* declareVar(decl, env, runtime, null, true);
  }
  yield* callFunction(runtime.program.main, [], env, runtime, runtime.program.main.line);
}

function* runTaskFunction(fn: FuncDecl, args: Value[], runtime: InterpreterRuntime): KernelGen<void> {
  const env = new Env(runtime.globals);
  yield* callFunction(fn, args, env, runtime, fn.line);
}

function* runTaskLambda(lambda: LambdaValue, args: Value[], runtime: InterpreterRuntime): KernelGen<void> {
  const env = new Env(runtime.globals);
  yield* callLambda(lambda, args, env, runtime, lambda.decl.line);
}

function* runPredicate(pred: Value, runtime: InterpreterRuntime): KernelGen<boolean> {
  const env = new Env(runtime.globals);
  if (pred.kind === "lambda") {
    const res = yield* callLambda(pred, [], env, runtime, pred.decl.line);
    return truthy(res);
  }
  if (pred.kind === "func") {
    const fn = runtime.program.functions.get(pred.name);
    if (fn) {
      const res = yield* callFunction(fn, [], env, runtime, fn.line);
      return truthy(res);
    }
  }
  return truthy(pred);
}

function lookupIdent(name: string, env: Env, runtime: InterpreterRuntime): Value | undefined {
  const found = env.lookup(name);
  if (found !== undefined) return found;
  if (runtime.program.functions.has(name) || name === "main") {
    return { kind: "func", name };
  }
  const constant = NAMESPACE_CONSTANTS[name];
  if (constant?.kind === "int") return intValue(constant.value ?? 0);
  if (constant?.kind === "duration") return { kind: "forever" };
  if (constant?.kind === "tag") return { kind: "tag", name: constant.name ?? name };
  if (name === "std::endl") return { kind: "string", value: "\n" };
  return undefined;
}

function* emitVarUpdate(name: string, value: Value, line: number, env: Env, isGlobal: boolean): KernelGen<void> {
  if (value.kind === "lambda" || value.kind === "func" || value.kind === "void") return;
  yield {
    kind: "var_update",
    scope: isGlobal ? "global" : env.scopeLabel(),
    name,
    type: typeOfValue(value),
    value: formatValue(value),
    line,
  };
}

function objectInit(
  decl: VarDeclStmt,
  args: Value[],
): { objectType: "mutex" | "semaphore" | "condvar" | "queue" | "event_group"; init: ObjectInitSpec } | null {
  const spec = lookupObjectType(decl.typeText);
  if (!spec || spec.kind !== "object" || !spec.objectType) return null;
  const clean = decl.typeText.replace(/\s+/g, "");
  if (spec.objectType === "mutex") {
    const noInherit = args[0]?.kind === "tag" && args[0].name === "no_priority_inheritance";
    return {
      objectType: "mutex",
      init: {
        kind: "mutex",
        inherit: !noInherit,
        recursive: clean.includes("recursive"),
        timed: clean.includes("timed"),
      },
    };
  }
  if (spec.objectType === "semaphore") {
    const maxMatch = clean.match(/counting_semaphore<(\d+)>/);
    const max = clean.includes("binary_semaphore") ? 1 : Number(maxMatch?.[1] ?? 1);
    const initial = args.length > 0 ? Math.max(0, numberOf(args[0])) : max;
    return {
      objectType: "semaphore",
      init: { kind: "semaphore", count: Math.min(max, initial), max },
    };
  }
  if (spec.objectType === "queue") {
    const capacity = Number(clean.match(/,\s*(\d+)>/)?.[1] ?? 1);
    return {
      objectType: "queue",
      init: { kind: "queue", capacity: Math.max(1, capacity) },
    };
  }
  if (spec.objectType === "condvar") {
    return { objectType: "condvar", init: { kind: "condvar" } };
  }
  return { objectType: "event_group", init: { kind: "event_group" } };
}

function* declareVar(
  decl: VarDeclStmt,
  env: Env,
  runtime: InterpreterRuntime,
  frame: ScopeFrame | null,
  isGlobal: boolean,
): KernelGen<void> {
  const argExprs = decl.ctorArgs ?? decl.braceArgs ?? [];
  const args: Value[] = [];
  for (const arg of argExprs) {
    args.push(yield* evalExpr(arg, env, runtime));
  }

  // 处理 auto x = T(...) 类型构造表达式
  if (decl.init && decl.init.kind === "call" && decl.init.isTypeCtor) {
    const syntheticDecl: VarDeclStmt = {
      ...decl,
      typeText: decl.init.calleePath,
      ctorArgs: decl.init.args,
      init: undefined,
    };
    yield* declareVar(syntheticDecl, env, runtime, frame, isGlobal);
    return;
  }

  const obj = objectInit(decl, args);
  const cleanType = decl.typeText.replace(/\s+/g, "");
  let value: Value;
  let needsCleanup = false;

  if (obj) {
    const result = yield {
      kind: "obj_create",
      objectType: obj.objectType,
      name: decl.name,
      init: obj.init,
      line: decl.line,
    };
    value = result.value;
  } else if (cleanType === "std::thread" || cleanType === "rtos::thread") {
    let attrs: ThreadAttrs | null = null;
    let entryIndex = 0;
    if (cleanType === "rtos::thread" && args[0]?.kind === "record") {
      const record = args[0];
      attrs = {
        name: record.fields.name?.kind === "string" ? record.fields.name.value : undefined,
        priority: record.fields.priority ? numberOf(record.fields.priority) : undefined,
        stackWords: record.fields.stack_words ? numberOf(record.fields.stack_words) : undefined,
      };
      entryIndex = 1;
    }
    const result = yield {
      kind: "thread_create",
      attrs,
      entry: args[entryIndex] ?? VOID,
      args: args.slice(entryIndex + 1),
      line: decl.line,
    };
    value = result.value;
    needsCleanup = !isGlobal;
  } else if (cleanType === "rtos::timer") {
    const timerName = args[0]?.kind === "string" ? args[0].value : decl.name;
    const periodMs = Math.max(1, numberOf(args[1] ?? intValue(100)));
    const periodic = !(args[2]?.kind === "tag" && args[2].name === "once");
    const callback = args[3] ?? args[2] ?? VOID;
    const result = yield {
      kind: "timer_create",
      name: timerName,
      periodMs,
      periodic,
      callback,
      line: decl.line,
    };
    value = result.value;
  } else if (cleanType === "rtos::isr") {
    const isrName = args[0]?.kind === "string" ? args[0].value : decl.name;
    const callback = args[1] ?? VOID;
    const result = yield {
      kind: "isr_create",
      name: isrName,
      callback,
      line: decl.line,
    };
    value = result.value;
  } else if (/^std::(lock_guard|unique_lock|scoped_lock)/.test(cleanType)) {
    const rawIds = args
      .filter((v): v is Extract<Value, { kind: "object" }> => v.kind === "object")
      .map((v) => v.id);
    // scoped_lock 按对象 ID 字典序（模拟按地址顺序）加锁以消除死锁
    const ids = cleanType.startsWith("std::scoped_lock") ? [...rawIds].sort() : rawIds;
    for (const id of ids) {
      yield { kind: "mutex_lock", objectId: id, line: decl.line };
    }
    const guardType: GuardValue["guardType"] = cleanType.includes("unique_lock")
      ? "unique_lock"
      : cleanType.includes("scoped_lock")
        ? "scoped_lock"
        : "lock_guard";
    value = { kind: "guard", objectIds: ids, owns: true, guardType };
    needsCleanup = true;
  } else if (decl.arraySize !== undefined || cleanType.startsWith("std::array<")) {
    const arrMatch = cleanType.match(/^std::array<[^,]+,\s*(\d+)>$/);
    const size = decl.arraySize ?? Number(arrMatch?.[1] ?? 0);
    let initItems: number[] = [];
    if (decl.init) {
      const evaluated = yield* evalExpr(decl.init, env, runtime);
      if (evaluated.kind === "array") initItems = evaluated.values;
    } else if (args.length > 0) {
      initItems = args.map((a) => numberOf(a));
    }
    const finalSize = Math.max(size, initItems.length);
    const values = Array.from({ length: finalSize }, (_, idx) => initItems[idx] ?? 0);
    value = { kind: "array", values };
  } else if (decl.init) {
    const evaluated = yield* evalExpr(decl.init, env, runtime);
    value = structuredCloneScalar(evaluated);
  } else if (args.length === 1) {
    value = structuredCloneScalar(args[0]);
  } else {
    value = scalarDefault(decl.typeText);
  }

  if (isGlobal || !frame) {
    env.declareGlobal(decl.name, value);
    yield* emitVarUpdate(decl.name, value, decl.line, env, true);
  } else {
    env.declareLocal(frame, decl.name, value, needsCleanup);
    yield* emitVarUpdate(decl.name, value, decl.line, env, false);
  }
}

function structuredCloneScalar(v: Value): Value {
  if (v.kind === "int") return { kind: "int", value: v.value };
  if (v.kind === "bool") return { kind: "bool", value: v.value };
  if (v.kind === "char") return { kind: "char", code: v.code };
  if (v.kind === "duration") return { kind: "duration", ms: v.ms };
  if (v.kind === "array") return { kind: "array", values: [...v.values] };
  return v;
}

function* cleanupFrame(frame: ScopeFrame, line: number): KernelGen<void> {
  for (let i = frame.cleanup.length - 1; i >= 0; i--) {
    const name = frame.cleanup[i];
    const value = frame.vars.get(name);
    if (!value) continue;
    if (value.kind === "guard" && value.owns) {
      value.owns = false;
      for (const id of [...value.objectIds].reverse()) {
        yield { kind: "mutex_unlock", objectId: id, line };
      }
    } else if (value.kind === "task" && value.joinable) {
      yield { kind: "thread_dtor_check", target: value.id, line };
    }
  }
}

function* callFunction(
  fn: FuncDecl,
  args: Value[],
  env: Env,
  runtime: InterpreterRuntime,
  callLine: number,
): KernelGen<Value> {
  if (env.callDepth() >= MAX_CALL_DEPTH) {
    throw new Error(`第 ${callLine} 行函数调用递归深度超过上限 (${MAX_CALL_DEPTH})`);
  }
  env.pushCall(fn.name);
  const savedFrames = env.replaceFrames([]);
  const frame = env.pushFrame();
  let returnValue: Value = VOID;
  try {
    for (let i = 0; i < fn.params.length; i++) {
      const p = fn.params[i];
      const val = structuredCloneScalar(args[i] ?? intValue(0));
      env.declareLocal(frame, p.name, val, false);
      yield* emitVarUpdate(p.name, val, fn.line, env, false);
    }
    yield* execStatements(fn.body.body, env, runtime);
  } catch (sig) {
    if (sig instanceof ReturnSignal) {
      returnValue = sig.value;
    } else {
      throw sig;
    }
  } finally {
    yield* cleanupFrame(frame, fn.body.body.at(-1)?.line ?? fn.line);
    env.popFrame();
    env.replaceFrames(savedFrames);
    env.popCall();
  }
  return returnValue;
}

function* callLambda(
  lambda: LambdaValue,
  args: Value[],
  env: Env,
  runtime: InterpreterRuntime,
  callLine: number,
): KernelGen<Value> {
  if (env.callDepth() >= MAX_CALL_DEPTH) {
    throw new Error(`第 ${callLine} 行 lambda 调用递归深度超过上限 (${MAX_CALL_DEPTH})`);
  }
  env.pushCall(lambda.decl.label);
  const capturedFrames = Array.isArray(lambda.scopeChain) ? (lambda.scopeChain as ScopeFrame[]) : [];
  const savedFrames = env.replaceFrames(capturedFrames);
  const frame = env.pushFrame();
  let returnValue: Value = VOID;
  try {
    for (let i = 0; i < lambda.decl.params.length; i++) {
      const paramName = lambda.decl.params[i];
      const val = structuredCloneScalar(args[i] ?? intValue(0));
      env.declareLocal(frame, paramName, val, false);
      yield* emitVarUpdate(paramName, val, lambda.decl.line, env, false);
    }
    yield* execStatements(lambda.decl.body, env, runtime);
  } catch (sig) {
    if (sig instanceof ReturnSignal) {
      returnValue = sig.value;
    } else {
      throw sig;
    }
  } finally {
    yield* cleanupFrame(frame, lambda.decl.body.at(-1)?.line ?? lambda.decl.line);
    env.popFrame();
    env.replaceFrames(savedFrames);
    env.popCall();
  }
  return returnValue;
}

function* execBlock(body: Stmt[], env: Env, runtime: InterpreterRuntime, blockLine: number): KernelGen<void> {
  const frame = env.pushFrame();
  try {
    yield* execStatements(body, env, runtime);
  } finally {
    yield* cleanupFrame(frame, body.at(-1)?.line ?? blockLine);
    env.popFrame();
  }
}

function* execStatements(body: Stmt[], env: Env, runtime: InterpreterRuntime): KernelGen<void> {
  for (const stmt of body) {
    yield* execStmt(stmt, env, runtime);
  }
}

function* execStmt(stmt: Stmt, env: Env, runtime: InterpreterRuntime): KernelGen<void> {
  switch (stmt.kind) {
    case "block":
      yield* execBlock(stmt.body, env, runtime, stmt.line);
      return;
    case "vardecl": {
      const currentFrame = env.snapshotFrames().at(-1) ?? null;
      yield* declareVar(stmt, env, runtime, currentFrame, currentFrame === null);
      return;
    }
    case "expr":
      yield* evalExpr(stmt.expr, env, runtime);
      return;
    case "return": {
      const val = stmt.value ? yield* evalExpr(stmt.value, env, runtime) : VOID;
      throw new ReturnSignal(val);
    }
    case "break":
      throw new BreakSignal();
    case "continue":
      throw new ContinueSignal();
    case "if": {
      const cond = yield* evalExpr(stmt.cond, env, runtime);
      if (truthy(cond)) {
        yield* execStmt(stmt.then, env, runtime);
      } else if (stmt.else) {
        yield* execStmt(stmt.else, env, runtime);
      }
      return;
    }
    case "while": {
      let guard = 0;
      while (truthy(yield* evalExpr(stmt.cond, env, runtime))) {
        if (++guard > RTOS_STATEMENT_BUDGET) {
          throw new Error(`第 ${stmt.line} 行疑似忙等/死循环（单次循环超过 ${RTOS_STATEMENT_BUDGET} 步）`);
        }
        try {
          yield* execStmt(stmt.body, env, runtime);
        } catch (s) {
          if (s instanceof BreakSignal) break;
          if (!(s instanceof ContinueSignal)) throw s;
        }
      }
      return;
    }
    case "dowhile": {
      let guard = 0;
      do {
        if (++guard > RTOS_STATEMENT_BUDGET) {
          throw new Error(`第 ${stmt.line} 行疑似忙等/死循环（单次循环超过 ${RTOS_STATEMENT_BUDGET} 步）`);
        }
        try {
          yield* execStmt(stmt.body, env, runtime);
        } catch (s) {
          if (s instanceof BreakSignal) break;
          if (!(s instanceof ContinueSignal)) throw s;
        }
      } while (truthy(yield* evalExpr(stmt.cond, env, runtime)));
      return;
    }
    case "for": {
      const frame = env.pushFrame();
      try {
        if (stmt.init) yield* execStmt(stmt.init, env, runtime);
        let guard = 0;
        while (!stmt.cond || truthy(yield* evalExpr(stmt.cond, env, runtime))) {
          if (++guard > RTOS_STATEMENT_BUDGET) {
            throw new Error(`第 ${stmt.line} 行疑似忙等/死循环（单次循环超过 ${RTOS_STATEMENT_BUDGET} 步）`);
          }
          try {
            yield* execStmt(stmt.body, env, runtime);
          } catch (s) {
            if (s instanceof BreakSignal) break;
            if (!(s instanceof ContinueSignal)) throw s;
          }
          if (stmt.inc) yield* evalExpr(stmt.inc, env, runtime);
        }
      } finally {
        yield* cleanupFrame(frame, stmt.line);
        env.popFrame();
      }
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

function* evalExpr(expr: Expr, env: Env, runtime: InterpreterRuntime): KernelGen<Value> {
  const cout = flattenCout(expr);
  if (cout) {
    let text = "";
    for (const part of cout) {
      text += formatValue(yield* evalExpr(part, env, runtime));
    }
    yield { kind: "stdout", text, line: expr.line };
    return VOID;
  }

  switch (expr.kind) {
    case "int":
      return intValue(expr.value);
    case "bool":
      return boolValue(expr.value);
    case "string":
      return { kind: "string", value: expr.value };
    case "char":
      return { kind: "char", code: expr.code };
    case "duration":
      return { kind: "duration", ms: expr.ms };
    case "ident":
      return lookupIdent(expr.name, env, runtime) ?? intValue(0);
    case "lambda": {
      let scopeChain: ScopeFrame[] = [];
      if (expr.capture === "ref") {
        scopeChain = env.snapshotFrames();
      } else if (expr.capture === "copy") {
        scopeChain = env.cloneFrames();
      }
      return {
        kind: "lambda",
        decl: expr,
        capture: expr.capture,
        scopeChain,
      };
    }
    case "array_init": {
      const values: number[] = [];
      for (const item of expr.items) {
        values.push(numberOf(yield* evalExpr(item, env, runtime)));
      }
      return { kind: "array", values };
    }
    case "designated": {
      const fields: Record<string, Value> = {};
      for (const [k, v] of Object.entries(expr.fields)) {
        fields[k] = yield* evalExpr(v, env, runtime);
      }
      return { kind: "record", fields };
    }
    case "comma": {
      let result: Value = VOID;
      for (const item of expr.exprs) {
        result = yield* evalExpr(item, env, runtime);
      }
      return result;
    }
    case "member":
      return yield* evalExpr(expr.obj, env, runtime);
    case "index": {
      const obj = yield* evalExpr(expr.obj, env, runtime);
      const idx = numberOf(yield* evalExpr(expr.index, env, runtime));
      if (obj.kind === "array") {
        return intValue(obj.values[idx] ?? 0);
      }
      return intValue(0);
    }
    case "unary": {
      const v = yield* evalExpr(expr.operand, env, runtime);
      const n = numberOf(v);
      if (expr.op === "!") return boolValue(!truthy(v));
      if (expr.op === "-") return intValue(-n);
      if (expr.op === "~") return intValue(~n);
      return intValue(n);
    }
    case "update": {
      if (expr.target.kind === "ident") {
        const site = env.lookupSite(expr.target.name);
        const oldVal = numberOf(site?.value ?? intValue(0));
        const nextVal = oldVal + (expr.op === "++" ? 1 : -1);
        const next = intValue(nextVal);
        const assigned = env.assign(expr.target.name, next);
        yield* emitVarUpdate(expr.target.name, next, expr.line, env, assigned?.frame === null);
        return intValue(expr.prefix ? nextVal : oldVal);
      }
      if (expr.target.kind === "index" && expr.target.obj.kind === "ident") {
        const site = env.lookupSite(expr.target.obj.name);
        const idx = numberOf(yield* evalExpr(expr.target.index, env, runtime));
        if (site?.value.kind === "array") {
          const oldVal = site.value.values[idx] ?? 0;
          const nextVal = oldVal + (expr.op === "++" ? 1 : -1);
          site.value.values[idx] = nextVal;
          yield* emitVarUpdate(expr.target.obj.name, site.value, expr.line, env, site.frame === null);
          return intValue(expr.prefix ? nextVal : oldVal);
        }
      }
      return intValue(0);
    }
    case "assign": {
      const rhs = yield* evalExpr(expr.value, env, runtime);
      if (expr.target.kind === "ident") {
        const site = env.lookupSite(expr.target.name);
        const old = numberOf(site?.value ?? intValue(0));
        const n = numberOf(rhs);
        const map: Record<string, number> = {
          "+=": old + n,
          "-=": old - n,
          "*=": old * n,
          "/=": n ? Math.trunc(old / n) : 0,
          "%=": n ? old % n : 0,
          "&=": old & n,
          "|=": old | n,
          "^=": old ^ n,
          "<<=": old << n,
          ">>=": old >> n,
        };
        const value = expr.op === "=" ? structuredCloneScalar(rhs) : intValue(map[expr.op] ?? n);
        const updated = env.assign(expr.target.name, value);
        yield* emitVarUpdate(expr.target.name, value, expr.line, env, updated?.frame === null);
        return value;
      }
      if (expr.target.kind === "index" && expr.target.obj.kind === "ident") {
        const site = env.lookupSite(expr.target.obj.name);
        const idx = numberOf(yield* evalExpr(expr.target.index, env, runtime));
        if (site?.value.kind === "array" && idx >= 0 && idx < site.value.values.length) {
          const old = site.value.values[idx] ?? 0;
          const n = numberOf(rhs);
          const map: Record<string, number> = {
            "=": n,
            "+=": old + n,
            "-=": old - n,
            "*=": old * n,
            "/=": n ? Math.trunc(old / n) : 0,
            "%=": n ? old % n : 0,
            "&=": old & n,
            "|=": old | n,
            "^=": old ^ n,
            "<<=": old << n,
            ">>=": old >> n,
          };
          site.value.values[idx] = map[expr.op] ?? n;
          yield* emitVarUpdate(expr.target.obj.name, site.value, expr.line, env, site.frame === null);
        }
      }
      return rhs;
    }
    case "cond":
      return truthy(yield* evalExpr(expr.cond, env, runtime))
        ? yield* evalExpr(expr.then, env, runtime)
        : yield* evalExpr(expr.else, env, runtime);
    case "binary": {
      const l = yield* evalExpr(expr.lhs, env, runtime);
      if (expr.op === "&&") return boolValue(truthy(l) ? truthy(yield* evalExpr(expr.rhs, env, runtime)) : false);
      if (expr.op === "||") return boolValue(truthy(l) ? true : truthy(yield* evalExpr(expr.rhs, env, runtime)));
      const r = yield* evalExpr(expr.rhs, env, runtime);
      if (expr.op === "==" || expr.op === "!=") {
        const eq =
          (l.kind === "int" || l.kind === "bool" || l.kind === "char") &&
          (r.kind === "int" || r.kind === "bool" || r.kind === "char")
            ? numberOf(l) === numberOf(r)
            : formatValue(l) === formatValue(r);
        return boolValue(expr.op === "==" ? eq : !eq);
      }
      const a = numberOf(l);
      const b = numberOf(r);
      switch (expr.op) {
        case "+": return intValue(a + b);
        case "-": return intValue(a - b);
        case "*": return intValue(a * b);
        case "/": return intValue(b ? Math.trunc(a / b) : 0);
        case "%": return intValue(b ? a % b : 0);
        case "<": return boolValue(a < b);
        case ">": return boolValue(a > b);
        case "<=": return boolValue(a <= b);
        case ">=": return boolValue(a >= b);
        case "&": return intValue(a & b);
        case "|": return intValue(a | b);
        case "^": return intValue(a ^ b);
        case "<<": return intValue(a << b);
        case ">>": return intValue(a >> b);
      }
      return intValue(0);
    }
    case "call":
      return yield* evalCall(expr, env, runtime);
  }
}

function formatPrintf(fmt: string, args: Value[]): string {
  let argIdx = 0;
  return fmt.replace(/%[dsu%]/g, (token) => {
    if (token === "%%") return "%";
    const arg = args[argIdx++];
    if (!arg) return "";
    if (token === "%s") return formatValue(arg);
    return String(numberOf(arg));
  });
}

function extractLockId(arg: Value | undefined): string {
  if (!arg) return "";
  if (arg.kind === "guard") return arg.objectIds[0] ?? "";
  if (arg.kind === "object" && arg.objectType === "mutex") return arg.id;
  return "";
}

function* evalPredInPlace(pred: Value, env: Env, runtime: InterpreterRuntime, line: number): KernelGen<boolean> {
  if (pred.kind === "lambda") {
    const res = yield* callLambda(pred, [], env, runtime, line);
    return truthy(res);
  }
  if (pred.kind === "func") {
    const fn = runtime.program.functions.get(pred.name);
    if (fn) {
      const res = yield* callFunction(fn, [], env, runtime, line);
      return truthy(res);
    }
  }
  return truthy(pred);
}

function* evalCall(
  expr: Extract<Expr, { kind: "call" }>,
  env: Env,
  runtime: InterpreterRuntime,
): KernelGen<Value> {
  const args: Value[] = [];
  for (const arg of expr.args) {
    args.push(yield* evalExpr(arg, env, runtime));
  }

  // 1. 用户自定义函数调用
  if (!expr.calleeObj && runtime.program.functions.has(expr.calleePath)) {
    const fn = runtime.program.functions.get(expr.calleePath)!;
    return yield* callFunction(fn, args, env, runtime, expr.line);
  }

  // 2. 命名空间自由函数调用
  if (!expr.calleeObj) {
    switch (expr.calleePath) {
      case "std::chrono::milliseconds":
        return { kind: "duration", ms: numberOf(args[0] ?? intValue(0)) };
      case "std::printf": {
        const fmt = args[0]?.kind === "string" ? args[0].value : "";
        const text = formatPrintf(fmt, args.slice(1));
        yield { kind: "stdout", text, line: expr.line };
        return intValue(text.length);
      }
      case "rtos::config": {
        const rec = args[0];
        const cfg: Partial<RtosConfig> = {};
        if (rec?.kind === "record") {
          if (rec.fields.tick_ms) cfg.tick_ms = Math.max(1, numberOf(rec.fields.tick_ms));
          if (rec.fields.time_slice_ticks) cfg.time_slice_ticks = Math.max(1, numberOf(rec.fields.time_slice_ticks));
          if (rec.fields.spurious_wakeup_every !== undefined) {
            cfg.spurious_wakeup_every = Math.max(0, numberOf(rec.fields.spurious_wakeup_every));
          }
          if (rec.fields.max_ticks) cfg.max_ticks = Math.max(1, numberOf(rec.fields.max_ticks));
        }
        return (yield { kind: "config", config: cfg, line: expr.line }).value;
      }
      case "std::this_thread::sleep_for": {
        const d = timeoutOf(args[0]);
        return (yield { kind: "sleep", ms: d.ms ?? 0, line: expr.line }).value;
      }
      case "rtos::busy_for": {
        const d = timeoutOf(args[0]);
        return (yield { kind: "busy", ms: d.ms ?? 0, line: expr.line }).value;
      }
      case "std::this_thread::yield":
      case "rtos::this_task::yield":
        return (yield { kind: "yield", line: expr.line }).value;
      case "rtos::this_task::set_priority":
        return (yield {
          kind: "set_priority",
          priority: numberOf(args[0] ?? intValue(0)),
          line: expr.line,
        }).value;
      case "rtos::notify":
      case "rtos::notify_from_isr": {
        const target = args[0]?.kind === "task" ? args[0].id : "";
        const value = numberOf(args[1] ?? intValue(1));
        const kind = expr.calleePath === "rtos::notify_from_isr" ? "notify_from_isr" : "notify";
        return (yield { kind, target, value, line: expr.line }).value;
      }
      case "rtos::suspend":
      case "rtos::resume":
      case "rtos::terminate": {
        const target = args[0]?.kind === "task" ? args[0].id : "";
        const kind = expr.calleePath.endsWith("suspend")
          ? "thread_suspend"
          : expr.calleePath.endsWith("resume")
            ? "thread_resume"
            : "thread_terminate";
        if (kind === "thread_terminate" && args[0]?.kind === "task") {
          args[0].joinable = false;
        }
        return (yield { kind, target, line: expr.line } as KernelCall).value;
      }
      case "rtos::this_task::notify_take": {
        const t = timeoutOf(args[0]);
        return (yield {
          kind: "notify_take",
          timeoutMs: t.ms,
          forever: t.forever,
          line: expr.line,
        }).value;
      }
      default:
        return VOID;
    }
  }

  // 3. 成员方法调用 (obj.method(...))
  const owner = yield* evalExpr(expr.calleeObj, env, runtime);
  const line = expr.line;

  if (owner.kind === "task") {
    if (expr.calleePath === "join") {
      const result = yield { kind: "thread_join", target: owner.id, line };
      owner.joinable = false;
      return result.value;
    }
    if (expr.calleePath === "detach") {
      const result = yield { kind: "thread_detach", target: owner.id, line };
      owner.joinable = false;
      return result.value;
    }
    return VOID;
  }

  if (owner.kind === "guard") {
    if (expr.calleePath === "unlock") {
      if (owner.owns) {
        owner.owns = false;
        for (const id of [...owner.objectIds].reverse()) {
          yield { kind: "mutex_unlock", objectId: id, line };
        }
      }
      return VOID;
    }
    if (expr.calleePath === "lock") {
      if (!owner.owns) {
        for (const id of owner.objectIds) {
          yield { kind: "mutex_lock", objectId: id, line };
        }
        owner.owns = true;
      }
      return VOID;
    }
    if (expr.calleePath === "owns_lock") {
      return boolValue(owner.owns);
    }
    return VOID;
  }

  if (owner.kind === "timer") {
    const kind = expr.calleePath === "start" ? "timer_start" : "timer_stop";
    return (yield { kind, timerId: owner.id, line }).value;
  }

  if (owner.kind === "isr") {
    const d = timeoutOf(args[0]);
    if (expr.calleePath === "trigger_every") {
      return (yield { kind: "isr_trigger_every", isrId: owner.id, everyMs: d.ms ?? 1, line }).value;
    }
    return (yield { kind: "isr_trigger_at", isrId: owner.id, atMs: d.ms ?? 0, line }).value;
  }

  if (owner.kind !== "object") return VOID;
  const id = owner.id;

  if (owner.objectType === "mutex") {
    if (expr.calleePath === "unlock") return (yield { kind: "mutex_unlock", objectId: id, line }).value;
    if (expr.calleePath === "try_lock") return (yield { kind: "mutex_try_lock", objectId: id, line }).value;
    if (expr.calleePath === "try_lock_for") {
      return (yield { kind: "mutex_try_lock_for", objectId: id, ms: timeoutOf(args[0]).ms ?? 0, line }).value;
    }
    return (yield { kind: "mutex_lock", objectId: id, line }).value;
  }

  if (owner.objectType === "semaphore") {
    if (expr.calleePath === "release_from_isr") {
      return (yield { kind: "sem_release_from_isr", objectId: id, line }).value;
    }
    if (expr.calleePath === "release") {
      return (yield { kind: "sem_release", objectId: id, line }).value;
    }
    if (expr.calleePath === "try_acquire") {
      return (yield { kind: "sem_try_acquire", objectId: id, line }).value;
    }
    if (expr.calleePath === "try_acquire_for") {
      return (yield { kind: "sem_try_acquire_for", objectId: id, ms: timeoutOf(args[0]).ms ?? 0, line }).value;
    }
    return (yield { kind: "sem_acquire", objectId: id, line }).value;
  }

  if (owner.objectType === "condvar") {
    if (expr.calleePath === "notify_one" || expr.calleePath === "notify_all") {
      return (yield {
        kind: "cv_notify",
        cvId: id,
        all: expr.calleePath === "notify_all",
        line,
      }).value;
    }
    if (expr.calleePath === "wait") {
      const lockId = extractLockId(args[0]);
      const pred = args[1];
      if (!pred) {
        return (yield { kind: "cv_wait", cvId: id, lockId, line }).value;
      }
      let guard = 0;
      while (!(yield* evalPredInPlace(pred, env, runtime, line))) {
        if (++guard > 200) break;
        yield { kind: "cv_wait", cvId: id, lockId, line };
      }
      return VOID;
    }
    if (expr.calleePath === "wait_for") {
      const lockId = extractLockId(args[0]);
      const ms = timeoutOf(args[1]).ms ?? 0;
      const pred = args[2];
      if (!pred) {
        return (yield { kind: "cv_wait_for", cvId: id, lockId, ms, line }).value;
      }
      if (yield* evalPredInPlace(pred, env, runtime, line)) {
        return boolValue(true);
      }
      const res = yield { kind: "cv_wait_for", cvId: id, lockId, ms, line };
      if (!truthy(res.value)) {
        return boolValue(yield* evalPredInPlace(pred, env, runtime, line));
      }
      return boolValue(yield* evalPredInPlace(pred, env, runtime, line));
    }
  }

  if (owner.objectType === "queue") {
    if (expr.calleePath === "send_from_isr") {
      return (yield {
        kind: "queue_send_from_isr",
        objectId: id,
        value: args[0] ?? intValue(0),
        line,
      }).value;
    }
    if (expr.calleePath === "send") {
      const t = timeoutOf(args[1]);
      return (yield {
        kind: "queue_send",
        objectId: id,
        value: args[0] ?? intValue(0),
        timeoutMs: t.ms,
        forever: t.forever,
        line,
      }).value;
    }
    if (expr.calleePath === "receive") {
      const t = timeoutOf(args[1]);
      const result = yield {
        kind: "queue_receive",
        objectId: id,
        timeoutMs: t.ms,
        forever: t.forever,
        line,
      };
      if (result.value.kind !== "void" && expr.args[0]?.kind === "ident") {
        const varName = expr.args[0].name;
        const site = env.assign(varName, result.value);
        yield* emitVarUpdate(varName, result.value, line, env, site?.frame === null);
        return boolValue(true);
      }
      return boolValue(result.value.kind !== "void");
    }
  }

  if (owner.objectType === "event_group") {
    if (expr.calleePath === "set" || expr.calleePath === "set_from_isr") {
      const kind = expr.calleePath === "set_from_isr" ? "event_set_from_isr" : "event_set";
      return (yield { kind, objectId: id, bits: numberOf(args[0] ?? intValue(0)), line }).value;
    }
    if (expr.calleePath === "clear") {
      return (yield { kind: "event_clear", objectId: id, bits: numberOf(args[0] ?? intValue(0)), line }).value;
    }
    if (expr.calleePath === "wait") {
      const mask = numberOf(args[0] ?? intValue(0));
      let waitAll = true;
      let clearOnExit = false;
      let timeoutArg: Value | undefined = args[1];
      if (args[1]?.kind === "record") {
        const rec = args[1];
        if (rec.fields.wait_all !== undefined) waitAll = truthy(rec.fields.wait_all);
        if (rec.fields.clear_on_exit !== undefined) clearOnExit = truthy(rec.fields.clear_on_exit);
        timeoutArg = args[2];
      }
      const t = timeoutOf(timeoutArg);
      return (yield {
        kind: "event_wait",
        objectId: id,
        mask,
        waitAll,
        clearOnExit,
        timeoutMs: t.ms,
        forever: t.forever,
        line,
      }).value;
    }
  }

  return VOID;
}
