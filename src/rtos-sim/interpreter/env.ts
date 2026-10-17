/**
 * 解释器作用域
 *
 * - 全局变量表由所有任务共享（模拟 C++ 全局内存，是数据竞争教学点的来源）；
 *   局部帧栈按任务独立。
 * - 帧上记录 `cleanup` 名单：lock_guard 等守卫变量离开作用域时自动解锁，
 *   joinable 的线程句柄析构时触发告警（RAII 语义，由 exec 在帧弹出时 yield）。
 * - callStack 记录函数调用路径，供 var_update.scope 编码（"main/worker"），
 *   reducer 据此重建 StackFrame[]。
 */

import type { Value } from "./values.ts";

export class ScopeFrame {
  readonly vars = new Map<string, Value>();
  /** 离开作用域需要清理的变量名（RAII 守卫、joinable 线程句柄） */
  readonly cleanup: string[] = [];
}

export interface VarSite {
  value: Value;
  /** null = 全局 */
  frame: ScopeFrame | null;
}

export class Env {
  readonly globalVars: Map<string, Value>;
  private frames: ScopeFrame[] = [];
  private callStack: string[] = [];

  constructor(globalVars: Map<string, Value>) {
    this.globalVars = globalVars;
  }

  pushFrame(): ScopeFrame {
    const f = new ScopeFrame();
    this.frames.push(f);
    return f;
  }

  popFrame(): ScopeFrame {
    return this.frames.pop() as ScopeFrame;
  }

  /** lambda 调用期间整体替换帧栈（[&] 引用定义处帧 / [=] 拷贝快照帧） */
  replaceFrames(newFrames: ScopeFrame[]): ScopeFrame[] {
    const old = this.frames;
    this.frames = [...newFrames];
    return old;
  }

  pushCall(fn: string): void {
    this.callStack.push(fn);
  }

  popCall(): void {
    this.callStack.pop();
  }

  callDepth(): number {
    return this.callStack.length;
  }

  callPath(): string[] {
    return [...this.callStack];
  }

  /** var_update.scope：调用路径（如 "main/worker"），无调用时为 "top" */
  scopeLabel(): string {
    return this.callStack.length > 0 ? this.callStack.join("/") : "top";
  }

  declareLocal(frame: ScopeFrame, name: string, value: Value, needsCleanup = false): void {
    frame.vars.set(name, value);
    if (needsCleanup) frame.cleanup.push(name);
  }

  declareGlobal(name: string, value: Value): void {
    this.globalVars.set(name, value);
  }

  /** 查找变量所在位置（局部帧优先，随后全局） */
  lookupSite(name: string): VarSite | null {
    for (let i = this.frames.length - 1; i >= 0; i--) {
      const f = this.frames[i];
      const v = f.vars.get(name);
      if (v !== undefined) return { value: v, frame: f };
    }
    const g = this.globalVars.get(name);
    if (g !== undefined) return { value: g, frame: null };
    return null;
  }

  lookup(name: string): Value | undefined {
    return this.lookupSite(name)?.value;
  }

  /** 就地写回（int 等 Value 视为可变对象直接替换） */
  assign(name: string, value: Value): VarSite | null {
    const site = this.lookupSite(name);
    if (!site) return null;
    if (site.frame) site.frame.vars.set(name, value);
    else this.globalVars.set(name, value);
    return site;
  }

  /** [&] 捕获：引用当前帧对象（保持活性绑定） */
  snapshotFrames(): ScopeFrame[] {
    return [...this.frames];
  }

  /** [=] 捕获：浅拷贝当前可见变量到快照帧 */
  cloneFrames(): ScopeFrame[] {
    const snapshot = new ScopeFrame();
    for (const f of this.frames) {
      for (const [k, v] of f.vars) snapshot.vars.set(k, v);
    }
    for (const [k, v] of this.globalVars) snapshot.vars.set(k, v);
    return [snapshot];
  }
}
