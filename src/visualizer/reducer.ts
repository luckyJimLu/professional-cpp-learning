import type {
  HeapBlock,
  MemorySnapshot,
  PointerEdge,
  StackFrame,
  StackVariable,
  TraceEvent,
} from "./types";

export const MAX_EVENTS = 1000;
export const MAX_SNAPSHOTS = 300;

export interface SnapshotComputationResult {
  snapshots: MemorySnapshot[];
  diagnostics: string[];
}

/**
 * 格式化地址为规范化十六进制字符串（如 0x1000）
 */
function normalizeAddr(addr: number | string | null | undefined): string {
  if (addr === null || addr === undefined) return "0x0";
  if (typeof addr === "number") {
    return `0x${addr.toString(16)}`;
  }
  const clean = addr.trim();
  if (clean.startsWith("0x") || clean.startsWith("0X")) {
    return clean.toLowerCase();
  }
  const parsed = Number(clean);
  if (!Number.isNaN(parsed)) {
    return `0x${parsed.toString(16)}`;
  }
  return clean.toLowerCase();
}

/**
 * 从完整的 stdout 中解析出 [VIS] 协议事件流与纯文本 stdout
 */
export function parseTraceOutput(rawStdout: string): {
  events: TraceEvent[];
  cleanStdout: string;
  diagnostics: string[];
} {
  const events: TraceEvent[] = [];
  const stdoutLines: string[] = [];
  const diagnostics: string[] = [];

  const lines = rawStdout.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("[VIS]")) {
      const jsonStr = trimmed.slice(5).trim();
      try {
        const parsed = JSON.parse(jsonStr) as unknown;
        if (isTraceEvent(parsed)) {
          events.push(parsed);
        } else {
          diagnostics.push(`忽略不合法的 VIS 事件: ${jsonStr.slice(0, 120)}`);
        }
      } catch (err) {
        console.warn("Failed to parse [VIS] payload:", jsonStr, err);
        diagnostics.push(`无法解析 VIS 事件: ${jsonStr.slice(0, 120)}`);
      }
    } else if (line.length > 0) {
      stdoutLines.push(line);
      events.push({ op: "stdout", text: `${line}\n` });
    }
  }

  return {
    events,
    cleanStdout: stdoutLines.join("\n"),
    diagnostics,
  };
}

const TRACE_OPS = new Set<TraceEvent["op"]>([
  "scope_enter",
  "scope_exit",
  "enter_scope",
  "exit_scope",
  "var_decl",
  "var_set",
  "obj_ctor",
  "obj_dtor",
  "heap_alloc",
  "heap_free",
  "ptr_set",
  "ptr_move",
  "step",
  "stdout",
]);

export function isTraceEvent(value: unknown): value is TraceEvent {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  if (typeof candidate.op !== "string" || !TRACE_OPS.has(candidate.op as TraceEvent["op"])) {
    return false;
  }
  const finiteLine = typeof candidate.line === "number" && Number.isFinite(candidate.line);
  const string = (key: string) => typeof candidate[key] === "string" && candidate[key] !== "";
  const address = (key: string) =>
    (typeof candidate[key] === "string" && candidate[key] !== "") ||
    (typeof candidate[key] === "number" && Number.isFinite(candidate[key]));
  switch (candidate.op) {
    case "stdout": return typeof candidate.text === "string";
    case "scope_exit": return candidate.line === undefined || finiteLine;
    case "scope_enter": return finiteLine && string("name");
    case "enter_scope":
    case "exit_scope":
    case "step": return finiteLine;
    case "var_decl": return finiteLine && string("name") && string("type");
    case "var_set": return finiteLine && string("name") && typeof candidate.value === "string";
    case "obj_ctor": return finiteLine && string("id") && string("type");
    case "obj_dtor": return finiteLine && string("id");
    case "heap_alloc": return finiteLine && address("addr") && typeof candidate.size === "number" && Number.isFinite(candidate.size) && candidate.size >= 0;
    case "heap_free": return finiteLine && address("addr");
    case "ptr_set": return finiteLine && string("var") && (candidate.to === null || address("to"));
    case "ptr_move": return finiteLine && string("from") && string("toVar") && address("addr");
    default: return false;
  }
}

/**
 * 纯函数：将 TraceEvent 事件流归约（Reduce）为离散的步骤快照数组
 */
export function computeSnapshots(
  events: TraceEvent[],
  initialStdout = "",
): MemorySnapshot[] {
  return computeSnapshotsWithDiagnostics(events, initialStdout).snapshots;
}

export function computeSnapshotsWithDiagnostics(
  events: TraceEvent[],
  initialStdout = "",
): SnapshotComputationResult {
  const snapshots: MemorySnapshot[] = [];
  const diagnostics: string[] = [];

  let currentFrames: StackFrame[] = [];
  const currentHeap: Map<string, HeapBlock> = new Map();
  const activeAllocationByAddress = new Map<string, string>();
  const destroyedStackAddresses = new Set<string>();
  let heapCounter = 0;
  let variableCounter = 0;
  let stdoutAccumulator = initialStdout;

  // 辅助函数：根据当前内存状态构建不可变深拷贝快照
  const pushSnapshot = (
    line: number,
    activeOp: TraceEvent["op"],
    description: string,
  ) => {
    if (snapshots.length >= MAX_SNAPSHOTS) return;
    // 拷贝栈帧
    const clonedFrames: StackFrame[] = currentFrames.map((frame) => ({
      ...frame,
      variables: frame.variables.map((v) => ({
        ...v,
        fields: v.fields ? { ...v.fields } : undefined,
      })),
    }));

    // 拷贝堆块
    const clonedHeap: HeapBlock[] = Array.from(currentHeap.values()).map(
      (b) => ({
        ...b,
        fields: b.fields ? { ...b.fields } : undefined,
      }),
    );

    // 构建指针引用边并检测悬挂指针
    const pointers: PointerEdge[] = [];
    const warnings: string[] = [];

    for (const frame of clonedFrames) {
      for (const v of frame.variables) {
        if (v.isPointer && v.pointsToRaw && v.pointsToRaw !== "0x0") {
          const allocationId = v.pointsToAllocationId ?? activeAllocationByAddress.get(v.pointsToRaw);
          const targetHeap = allocationId ? currentHeap.get(allocationId) : undefined;
          const stackTarget = clonedFrames.flatMap((candidateFrame) =>
            candidateFrame.variables.map((candidate) => ({ candidateFrame, candidate })),
          ).find(({ candidate }) => candidate.rawAddress === v.pointsToRaw);
          const target = targetHeap
            ? {
                kind: "heap" as const,
                allocationId: targetHeap.allocationId ?? allocationId ?? targetHeap.rawAddr,
                rawAddr: targetHeap.rawAddr,
              }
            : stackTarget
              ? {
                  kind: "stack" as const,
                  frameId: stackTarget.candidateFrame.id,
                  variableId: stackTarget.candidate.variableId!,
                  rawAddr: v.pointsToRaw,
                }
              : { kind: "unknown" as const, rawAddr: v.pointsToRaw };
          const isDangling =
            (target.kind === "heap" && targetHeap?.status === "freed") ||
            (target.kind === "unknown" && destroyedStackAddresses.has(v.pointsToRaw));

          pointers.push({
            id: `edge-${frame.id}-${v.name}-to-${target.kind}-${v.pointsToRaw}`,
            fromVar: v.name,
            fromFrameId: frame.id,
            fromVariableId: v.variableId,
            toRawAddr: v.pointsToRaw,
            toLabel: v.pointsToLabel ?? targetHeap?.label ?? v.pointsToRaw,
            isSmart: v.isSmartPointer,
            isDangling,
            relationKind: isDangling
              ? "dangling_ptr"
              : v.relationKind ?? (v.isSmartPointer ? "smart_ptr" : "raw_ptr"),
            target,
          });

          if (isDangling) {
            warnings.push(
              `⚠️ 悬挂指针警告: 变量 [${v.name}] 指向已被释放的堆内存 (${v.pointsToLabel ?? v.pointsToRaw})`,
            );
          }
        }
      }
    }

    snapshots.push({
      stepIndex: snapshots.length,
      line,
      description,
      activeOp,
      callStack: clonedFrames,
      heap: clonedHeap,
      pointers,
      stdout: stdoutAccumulator,
      warnings,
    });
  };

  const validEvents = (events as unknown[]).filter((event, index): event is TraceEvent => {
    if (isTraceEvent(event)) return true;
    diagnostics.push(`忽略第 ${index + 1} 条不合法事件。`);
    return false;
  });
  const boundedEvents = validEvents.slice(0, MAX_EVENTS);
  if (events.length > MAX_EVENTS) {
    diagnostics.push(`轨迹事件超过 ${MAX_EVENTS} 条，已安全截断。`);
  }

  for (const event of boundedEvents) {
    if (snapshots.length >= MAX_SNAPSHOTS) {
      diagnostics.push(`快照超过 ${MAX_SNAPSHOTS} 帧，已安全截断。`);
      break;
    }
    switch (event.op) {
      case "scope_enter": {
        const frameId = `frame_${currentFrames.length}_${event.name}`;
        currentFrames.push({
          id: frameId,
          name: event.name,
          variables: [],
          scopeDepth: 0,
        });
        pushSnapshot(
          event.line,
          event.op,
          `进入作用域 / 调用函数: ${event.name}()`,
        );
        break;
      }

      case "scope_exit": {
        const exitedFrame = currentFrames[currentFrames.length - 1];
        for (const variable of [...(exitedFrame?.variables ?? [])].reverse()) {
          if (variable.rawAddress) destroyedStackAddresses.add(variable.rawAddress);
        }
        currentFrames.pop();
        const frameName = exitedFrame?.name ?? "scope";
        pushSnapshot(
          event.line ?? (snapshots.length > 0 ? snapshots[snapshots.length - 1].line : 1),
          event.op,
          `离开作用域 / 退出函数: ${frameName}()`,
        );
        break;
      }

      case "enter_scope": {
        const currentFrame = currentFrames[currentFrames.length - 1];
        if (!currentFrame) break;
        currentFrame.scopeDepth = (currentFrame.scopeDepth ?? 0) + 1;
        pushSnapshot(event.line, event.op, `进入块级作用域${event.name ? `: ${event.name}` : ""}`);
        break;
      }

      case "exit_scope": {
        const currentFrame = currentFrames[currentFrames.length - 1];
        if (!currentFrame) break;
        const exitingDepth = currentFrame.scopeDepth ?? 0;
        const exiting = currentFrame.variables
          .filter((variable) => (variable.scopeDepth ?? 0) >= exitingDepth)
          .reverse();
        for (const variable of exiting) {
          if (variable.rawAddress) destroyedStackAddresses.add(variable.rawAddress);
        }
        currentFrame.variables = currentFrame.variables.filter(
          (variable) => (variable.scopeDepth ?? 0) < exitingDepth,
        );
        currentFrame.scopeDepth = Math.max(0, exitingDepth - 1);
        pushSnapshot(event.line, event.op, `离开块级作用域${event.name ? `: ${event.name}` : ""}`);
        break;
      }

      case "var_decl": {
        const currentFrame = currentFrames[currentFrames.length - 1];
        if (currentFrame) {
          const isReference = event.type.includes("&");
          const isPtr = event.type.includes("*") || isReference;
          const pointsToRaw = isPtr && event.value ? normalizeAddr(event.value) : null;
          const allocationId = pointsToRaw ? activeAllocationByAddress.get(pointsToRaw) : undefined;
          const targetBlock = allocationId ? currentHeap.get(allocationId) : undefined;

          const variable: StackVariable = {
            variableId: `variable_${++variableCounter}`,
            name: event.name,
            type: event.type,
            value: event.value ?? "uninitialized",
            isPointer: isPtr,
            relationKind: isReference ? "reference" : isPtr ? "raw_ptr" : undefined,
            scopeDepth: currentFrame.scopeDepth ?? 0,
            rawAddress: normalizeAddr(event.addr),
            pointsToRaw,
            pointsToAllocationId: allocationId ?? null,
            pointsToLabel: targetBlock ? targetBlock.label : null,
            status: "created",
          };
          currentFrame.variables.push(variable);
          pushSnapshot(
            event.line,
            event.op,
            `声明变量: ${event.type} ${event.name}`,
          );
        }
        break;
      }

      case "var_set": {
        const currentFrame = currentFrames[currentFrames.length - 1];
        if (currentFrame) {
          const v = [...currentFrame.variables].reverse().find((x) => x.name === event.name);
          if (v) {
            v.value = event.value;
            v.status = "modified";
            pushSnapshot(
              event.line,
              event.op,
              `变量赋值: ${event.name} = ${event.value}`,
            );
          }
        }
        break;
      }

      case "obj_ctor": {
        const currentFrame = currentFrames[currentFrames.length - 1];
        if (currentFrame) {
          const variable: StackVariable = {
            variableId: `variable_${++variableCounter}`,
            name: event.id,
            type: event.type,
            value: `{${event.type}}`,
            rawAddress: normalizeAddr(event.addr),
            fields: event.fields,
            status: "created",
            scopeDepth: currentFrame.scopeDepth ?? 0,
          };
          currentFrame.variables.push(variable);
          pushSnapshot(
            event.line,
            event.op,
            `构造对象: ${event.type} ${event.id}`,
          );
        }
        break;
      }

      case "obj_dtor": {
        const currentFrame = currentFrames[currentFrames.length - 1];
        if (currentFrame) {
          const v = [...currentFrame.variables].reverse().find((x) => x.name === event.id);
          if (v) {
            v.status = "destroyed";
            pushSnapshot(
              event.line,
              event.op,
              `析构对象: ~${v.type}() [${event.id}]`,
            );
          }
        }
        break;
      }

      case "heap_alloc": {
        const rawAddr = normalizeAddr(event.addr);
        heapCounter++;
        const label = event.label ?? `Heap #${heapCounter}`;
        const allocationId = `allocation_${heapCounter}`;
        currentHeap.set(allocationId, {
          allocationId,
          rawAddr,
          label,
          size: event.size,
          type: event.type ?? "raw",
          status: "alive",
        });
        activeAllocationByAddress.set(rawAddr, allocationId);
        pushSnapshot(
          event.line,
          event.op,
          `堆内存分配: ${label} (${event.size} 字节, 类型: ${event.type ?? "raw"})`,
        );
        break;
      }

      case "heap_free": {
        const rawAddr = normalizeAddr(event.addr);
        const allocationId = activeAllocationByAddress.get(rawAddr);
        const block = allocationId ? currentHeap.get(allocationId) : undefined;
        if (block) {
          block.status = "freed";
          activeAllocationByAddress.delete(rawAddr);
          pushSnapshot(
            event.line,
            event.op,
            `释放堆内存: ${block.label} (delete)`,
          );
        }
        break;
      }

      case "ptr_set": {
        const currentFrame = currentFrames[currentFrames.length - 1];
        if (currentFrame) {
          let v = [...currentFrame.variables].reverse().find((x) => x.name === event.var);
          const rawTo = event.to !== null ? normalizeAddr(event.to) : null;
          const allocationId = rawTo ? activeAllocationByAddress.get(rawTo) : undefined;
          const targetBlock = allocationId ? currentHeap.get(allocationId) : undefined;

          if (!v) {
            // 如果此前未声明，自动隐式声明指针变量
            v = {
              variableId: `variable_${++variableCounter}`,
              name: event.var,
              type: event.type ?? "pointer",
              value: rawTo ?? "nullptr",
              isPointer: true,
              isSmartPointer: event.isSmart,
              relationKind: event.isSmart ? "smart_ptr" : "raw_ptr",
              scopeDepth: currentFrame.scopeDepth ?? 0,
              pointsToRaw: rawTo,
              pointsToAllocationId: allocationId ?? null,
              pointsToLabel: targetBlock?.label ?? null,
              status: "created",
            };
            currentFrame.variables.push(v);
          } else {
            v.isPointer = true;
            v.isSmartPointer = event.isSmart ?? v.isSmartPointer;
            v.value = rawTo ?? "nullptr";
            v.pointsToRaw = rawTo;
            v.pointsToAllocationId = allocationId ?? null;
            v.pointsToLabel = targetBlock?.label ?? null;
            v.status = "modified";
          }

          const desc =
            rawTo === null
              ? `指针重置: ${event.var} = nullptr`
              : `指针指向: ${event.var} -> ${targetBlock?.label ?? rawTo}`;

          pushSnapshot(event.line, event.op, desc);
        }
        break;
      }

      case "ptr_move": {
        const currentFrame = currentFrames[currentFrames.length - 1];
        if (currentFrame) {
          const fromV = [...currentFrame.variables].reverse().find((x) => x.name === event.from);
          let toV = [...currentFrame.variables].reverse().find((x) => x.name === event.toVar);
          const rawAddr = normalizeAddr(event.addr);
          const allocationId = activeAllocationByAddress.get(rawAddr);
          const targetBlock = allocationId ? currentHeap.get(allocationId) : undefined;

          if (fromV) {
            fromV.value = "moved (nullptr)";
            fromV.pointsToRaw = null;
            fromV.pointsToAllocationId = null;
            fromV.pointsToLabel = null;
            fromV.status = "moved_from";
          }

          if (!toV) {
            toV = {
              variableId: `variable_${++variableCounter}`,
              name: event.toVar,
              type: fromV?.type ?? "unique_ptr",
              value: rawAddr,
              isPointer: true,
              isSmartPointer: true,
              relationKind: "smart_ptr",
              scopeDepth: currentFrame.scopeDepth ?? 0,
              pointsToRaw: rawAddr,
              pointsToAllocationId: allocationId ?? null,
              pointsToLabel: targetBlock?.label ?? null,
              status: "created",
            };
            currentFrame.variables.push(toV);
          } else {
            toV.value = rawAddr;
            toV.pointsToRaw = rawAddr;
            toV.pointsToAllocationId = allocationId ?? null;
            toV.pointsToLabel = targetBlock?.label ?? null;
            toV.status = "modified";
          }

          pushSnapshot(
            event.line,
            event.op,
            `所有权转移 (std::move): ${event.from} -> ${event.toVar}`,
          );
        }
        break;
      }

      case "step": {
        pushSnapshot(event.line, event.op, event.label ?? `步进到第 ${event.line} 行`);
        break;
      }

      case "stdout": {
        stdoutAccumulator += event.text;
        pushSnapshot(
          event.line ?? (snapshots.length > 0 ? snapshots[snapshots.length - 1].line : 1),
          event.op,
          `控制台输出: ${event.text.trim()}`,
        );
        break;
      }
    }
  }

  // 终态检测：检查是否有未释放的堆块（内存泄漏）
  if (currentFrames.length === 0 && currentHeap.size > 0) {
    const leakedBlocks = Array.from(currentHeap.values()).filter(
      (b) => b.status === "alive",
    );
    if (leakedBlocks.length > 0 && snapshots.length > 0) {
      const lastSnap = snapshots[snapshots.length - 1];
      for (const leaked of leakedBlocks) {
        leaked.status = "leaked";
        const leakedSnapshotBlock = lastSnap.heap.find(
          (block) => (block.allocationId ?? block.rawAddr) === (leaked.allocationId ?? leaked.rawAddr),
        );
        if (leakedSnapshotBlock) leakedSnapshotBlock.status = "leaked";
        lastSnap.warnings.push(
          `🛑 内存泄漏警告: ${leaked.label} (${leaked.size} 字节) 在程序结束时未释放！`,
        );
      }
    }
  }

  return { snapshots, diagnostics };
}

/**
 * 模拟标准 C++ 代码执行并生成预期控制台输出
 * 用于快速仿真模式或工具链离线/网络受限时的降级执行
 */
export function simulateCppStdout(code: string): string {
  const lines = code.split(/\r?\n/);
  const output: string[] = [];
  const varValues: Record<string, string> = {};

  for (const rawLine of lines) {
    const line = rawLine.replace(/\/\/.*$/, "").trim();
    if (!line) continue;

    // 追踪基础原始变量值
    const varMatch = line.match(/(?:const\s+)?(?:int|double|float|char|bool|std::string|auto)\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*([^;]+);/);
    if (varMatch) {
      varValues[varMatch[1]] = varMatch[2].trim().replace(/^["']|["']$/g, "");
    }

    // 匹配 std::cout 表达式
    if (line.includes("std::cout")) {
      const parts = line.replace(/std::cout\s*<<\s*/, "").split("<<");
      let lineText = "";
      for (const rawPart of parts) {
        const part = rawPart.trim().replace(/;$/, "").trim();
        if (!part) continue;
        if (part === "std::endl" || part === "'\\n'" || part === '"\\n"') {
          lineText += "\n";
        } else if (part.startsWith('"') && part.endsWith('"')) {
          lineText += part.slice(1, -1);
        } else if (varValues[part] !== undefined) {
          lineText += varValues[part];
        } else if (/^[0-9]+(?:\.[0-9]+)?$/.test(part)) {
          lineText += part;
        } else if (part.includes("(") && part.includes(")")) {
          lineText += `[${part}]`;
        } else {
          lineText += part;
        }
      }
      if (lineText) {
        output.push(lineText.replace(/\n+$/, ""));
      }
    } else if (line.startsWith("printf(") || line.includes("printf(")) {
      const printfMatch = line.match(/printf\s*\(\s*"([^"]*)"/);
      if (printfMatch) {
        output.push(printfMatch[1].replace(/\\n/g, ""));
      }
    }
  }

  return output.length > 0 ? output.join("\n") + "\n" : "";
}

/**
 * 自动分析标准 C++ 源码与运行输出，自动生成高保真结构化生命周期与调用栈快照
 * 支持：
 * - 逐行调试模拟（每个可执行语句都有高亮行与步进状态）
 * - 栈帧推进与函数调用 (scope_enter / scope_exit)
 * - 原始指针与悬挂指针检测 (int* p = &a; p = new int; delete p;)
 * - 现代 C++ 智能指针 (std::unique_ptr, std::make_unique, std::shared_ptr)
 * - RAII 局部变量 LIFO 逆序析构
 * - 控制台 std::cout 逐步打印
 */
export function inferTraceEventsFromCodeAndOutput(
  code: string,
  stdout: string,
  exitCode = 0,
): TraceEvent[] {
  const events: TraceEvent[] = [];
  const lines = code.split(/\r?\n/);
  const effectiveStdout = stdout || simulateCppStdout(code);
  const stdoutLines = effectiveStdout
    ? effectiveStdout.trim().split(/\r?\n/).filter(Boolean)
    : [];
  let stdoutIdx = 0;

  // 1. 扫描源码中定义的自定义类型（class, struct, enum）与函数签名
  const customTypes = new Set<string>();
  const definedFunctions = new Map<string, { startLine: number; endLine: number; bodyLines: number[] }>();

  let funcName: string | null = null;
  let funcStart = 0;
  let funcBraces = 0;
  let funcBody: number[] = [];

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.replace(/\/\/.*$/, "").trim();

    const classMatch = line.match(/(?:class|struct)\s+([A-Za-z_][A-Za-z0-9_]*)/);
    if (classMatch) {
      customTypes.add(classMatch[1]);
    }

    // 发现函数定义（除 main 外）
    if (!funcName && !/^\s*(?:if|while|for|switch|catch)\b/.test(line)) {
      const fnMatch = line.match(/^(?:(?:inline|static|virtual|constexpr)\s+)*(?:void|int|bool|double|float|auto|[A-Za-z_][A-Za-z0-9_:]*)\s+([A-Za-z_][A-Za-z0-9_]*)\s*\([^)]*\)\s*\{?/);
      if (fnMatch && fnMatch[1] !== "main") {
        funcName = fnMatch[1];
        funcStart = i + 1;
        funcBraces = 0;
        funcBody = [];
      }
    }

    if (funcName) {
      for (const ch of line) {
        if (ch === "{") funcBraces++;
        if (ch === "}") funcBraces--;
      }
      funcBody.push(i + 1);
      if (funcBraces <= 0 && line.includes("}")) {
        definedFunctions.set(funcName, {
          startLine: funcStart,
          endLine: i + 1,
          bodyLines: funcBody,
        });
        funcName = null;
      }
    }
  }

  // 2. 定位 main 函数所在行与作用域
  let mainLine = 1;
  let inMain = false;
  let mainBraceCount = 0;
  const constructedObjects: Array<{ id: string; type: string; line: number }> = [];
  const allocatedHeaps = new Map<string, { addr: string; label: string; smart: boolean }>();
  const stackVarAddresses = new Map<string, string>();
  let heapCounter = 0;

  for (let i = 0; i < lines.length; i++) {
    const lineNum = i + 1;
    const rawLine = lines[i];
    const line = rawLine.replace(/\/\/.*$/, "").trim(); // 去除单行注释

    if (!inMain) {
      if (/\bint\s+main\s*\(/.test(line) || /\bvoid\s+main\s*\(/.test(line)) {
        inMain = true;
        mainLine = lineNum;
        events.push({
          op: "scope_enter",
          name: "main",
          line: mainLine,
        });
        if (line.includes("{")) mainBraceCount++;
      }
      continue;
    }

    // 统计括号深度
    for (const char of line) {
      if (char === "{") mainBraceCount++;
      if (char === "}") mainBraceCount--;
    }

    if (mainBraceCount <= 0 && inMain) {
      // main 函数结束
      break;
    }

    if (!line) continue;

    // A. 现代 C++ 智能指针分配:
    // auto p = std::make_unique<Resource>(1); 或 std::unique_ptr<int> p = std::make_unique<int>(100);
    const smartPtrMatch = line.match(/(?:(?:std::)?(?:unique_ptr|shared_ptr)<([^>]+)>\s+|(?:auto)\s+)([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(?:std::)?make_(?:unique|shared)<([^>]+)>\s*\(([^)]*)\)\s*;/);
    if (smartPtrMatch) {
      heapCounter++;
      const type = smartPtrMatch[3] || smartPtrMatch[1] || "Resource";
      const varName = smartPtrMatch[2];
      const addr = `0x${(0x2000 + heapCounter * 0x40).toString(16)}`;
      const isShared = line.includes("shared_ptr") || line.includes("make_shared");
      allocatedHeaps.set(varName, {
        addr,
        label: `${type} (Heap #${heapCounter})`,
        smart: true,
      });

      events.push({
        op: "heap_alloc",
        line: lineNum,
        addr,
        size: type === "int" || type === "float" ? 4 : type === "double" ? 8 : 16,
        type,
        label: `${type} 堆实例`,
      });

      events.push({
        op: "ptr_set",
        line: lineNum,
        var: varName,
        to: addr,
        type: isShared ? `std::shared_ptr<${type}>` : `std::unique_ptr<${type}>`,
        isSmart: true,
      });

      events.push({
        op: "step",
        line: lineNum,
        label: `智能指针初始化: ${isShared ? "std::shared_ptr" : "std::unique_ptr"}<${type}> [${varName}] -> ${addr}`,
      });
      continue;
    }

    // B. 原生堆分配匹配：如 int* p = new int(100); 或 auto p = new Resource;
    const newMatch = line.match(/(?:(?:const\s+)?([A-Za-z_][A-Za-z0-9_:<>*\s&]+?)\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*new\s+([A-Za-z_][A-Za-z0-9_:]*)(?:[^;]*);/);
    if (newMatch) {
      heapCounter++;
      const type = newMatch[3] || "int";
      const varName = newMatch[2];
      const addr = `0x${(0x2000 + heapCounter * 0x40).toString(16)}`;
      allocatedHeaps.set(varName, {
        addr,
        label: `${type} (Heap #${heapCounter})`,
        smart: false,
      });

      events.push({
        op: "heap_alloc",
        line: lineNum,
        addr,
        size: type === "int" || type === "float" ? 4 : type === "double" ? 8 : 16,
        type,
        label: `${type} 堆实例`,
      });

      events.push({
        op: "ptr_set",
        line: lineNum,
        var: varName,
        to: addr,
        type: `${type}*`,
      });

      events.push({
        op: "step",
        line: lineNum,
        label: `原生堆内存分配: new ${type} 得到地址 ${addr}，赋值给指针 ${varName}`,
      });
      continue;
    }

    // C. 堆释放匹配：如 delete p; 或 delete[] arr; 或 p.reset();
    const deleteMatch = line.match(/(?:delete\s+(?:\[\]\s*)?([A-Za-z_][A-Za-z0-9_]*)|([A-Za-z_][A-Za-z0-9_]*)\.reset\(\))\s*;/);
    if (deleteMatch) {
      const varName = deleteMatch[1] || deleteMatch[2];
      const heap = allocatedHeaps.get(varName);
      if (heap) {
        events.push({
          op: "heap_free",
          line: lineNum,
          addr: heap.addr,
        });
        allocatedHeaps.delete(varName);
      }
      events.push({
        op: "step",
        line: lineNum,
        label: `释放堆内存: 销毁变量 [${varName}] 指向的堆块 (地址: ${heap?.addr || "0x2000"})`,
      });
      continue;
    }

    // D. 指针指向局部变量地址：如 int* p = &a; 或 p = &b;
    const refPtrMatch = line.match(/(?:(?:const\s+)?([A-Za-z_][A-Za-z0-9_:]*)\s*\*\s*)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*&([A-Za-z_][A-Za-z0-9_]*)\s*;/);
    if (refPtrMatch) {
      const type = refPtrMatch[1] || "void";
      const ptrName = refPtrMatch[2];
      const targetVar = refPtrMatch[3];
      const targetAddr = stackVarAddresses.get(targetVar) || `0x7ffd${(0x1000 + lineNum * 0x10).toString(16)}`;

      events.push({
        op: "ptr_set",
        line: lineNum,
        var: ptrName,
        to: targetAddr,
        type: `${type}*`,
      });

      events.push({
        op: "step",
        line: lineNum,
        label: `指针取地址: ${ptrName} = &${targetVar} (指向栈地址 ${targetAddr})`,
      });
      continue;
    }

    // E. 控制台输出匹配：std::cout << ...
    if (line.includes("std::cout") || line.includes("printf(")) {
      const textToEmit = stdoutLines[stdoutIdx] || "";
      if (textToEmit) {
        stdoutIdx++;
        events.push({
          op: "stdout",
          line: lineNum,
          text: textToEmit + "\n",
        });
      } else {
        events.push({
          op: "step",
          line: lineNum,
          label: `执行控制台输出语句 (std::cout)`,
        });
      }
      continue;
    }

    // F. 函数调用匹配 (如果调用了代码中定义的其它函数): 如 helper(x);
    let matchedFnCall = false;
    for (const [fn, info] of definedFunctions.entries()) {
      const callRegex = new RegExp(`\\b${fn}\\s*\\(`);
      if (callRegex.test(line)) {
        matchedFnCall = true;
        events.push({
          op: "scope_enter",
          name: fn,
          line: lineNum,
        });
        events.push({
          op: "step",
          line: lineNum,
          label: `调用函数 ${fn}()，压入新调用栈帧`,
        });

        // 步入函数体各行
        for (const bodyLine of info.bodyLines) {
          const bodyText = (lines[bodyLine - 1] || "").trim();
          if (bodyText && !bodyText.startsWith("//") && bodyText !== "{" && bodyText !== "}") {
            events.push({
              op: "step",
              line: bodyLine,
              label: `[${fn}] 执行: ${bodyText}`,
            });
            if ((bodyText.includes("std::cout") || bodyText.includes("printf")) && stdoutIdx < stdoutLines.length) {
              events.push({
                op: "stdout",
                line: bodyLine,
                text: stdoutLines[stdoutIdx++] + "\n",
              });
            }
          }
        }

        events.push({
          op: "scope_exit",
          name: fn,
          line: info.endLine,
        });
        events.push({
          op: "step",
          line: lineNum,
          label: `函数 ${fn}() 执行完毕，弹出调用栈帧`,
        });
        break;
      }
    }
    if (matchedFnCall) continue;

    // G. 变量与对象声明匹配：如 int x = 10; Resource res{1}; ModemController modem;
    const declMatch = line.match(/^(?:const\s+)?([A-Za-z_][A-Za-z0-9_:<>*]*)\s+([A-Za-z_][A-Za-z0-9_]*)\s*(\{[^}]*\}|\([^)]*\)|=[^;]+)?\s*;/);
    if (declMatch && !line.startsWith("return") && !line.startsWith("throw")) {
      const type = declMatch[1];
      const name = declMatch[2];
      const init = (declMatch[3] || "").trim();
      const addr = `0x${(0x7ffd0000 + (lineNum % 256) * 0x10).toString(16)}`;
      stackVarAddresses.set(name, addr);

      const isCustomClass = customTypes.has(type) || /^[A-Z]/.test(type);

      if (isCustomClass) {
        constructedObjects.push({ id: name, type, line: lineNum });
        events.push({
          op: "obj_ctor",
          id: name,
          type,
          line: lineNum,
          addr,
        });
        events.push({
          op: "step",
          line: lineNum,
          label: `构造局部对象: ${type} [${name}] (栈地址: ${addr})`,
        });
      } else {
        let val = "0";
        if (type === "bool") {
          val = init.includes("true") ? "true" : init.includes("false") ? "false" : "true";
        } else if (init) {
          val = init.replace(/^[={(\s]+|[})]+$/g, "").trim();
        }

        events.push({
          op: "var_decl",
          name,
          type,
          value: val || "uninitialized",
          line: lineNum,
          addr,
        });

        events.push({
          op: "step",
          line: lineNum,
          label: `定义局部变量: ${type} ${name} = ${val || "默认值"}`,
        });
      }

      // 如果有对应的 stdout 产生（如构造函数内打印或紧随其后的调用）
      if (init.includes("()") && stdoutIdx < stdoutLines.length) {
        events.push({
          op: "stdout",
          line: lineNum,
          text: stdoutLines[stdoutIdx++] + "\n",
        });
      }
      continue;
    }

    // H. 方法调用：如 board_a.Recover(); 或 modem.SendTelemetry(...);
    const callMatch = line.match(/([A-Za-z_][A-Za-z0-9_]*)\.([A-Za-z_][A-Za-z0-9_]*)\s*\(/);
    if (callMatch) {
      const obj = callMatch[1];
      const method = callMatch[2];
      events.push({
        op: "step",
        line: lineNum,
        label: `调用成员方法: ${obj}.${method}()`,
      });

      if (stdoutIdx < stdoutLines.length) {
        events.push({
          op: "stdout",
          line: lineNum,
          text: stdoutLines[stdoutIdx++] + "\n",
        });
      }
      continue;
    }

    // I. return 语句
    if (line.startsWith("return")) {
      events.push({
        op: "step",
        line: lineNum,
        label: `执行函数返回: ${line}`,
      });
      continue;
    }

    // J. 普通赋值或可执行语句: 产生一个逐行单步事件
    if (line.endsWith(";")) {
      events.push({
        op: "step",
        line: lineNum,
        label: `逐行步进: ${line}`,
      });
    }
  }

  // 3. 将剩余未匹配的 stdout 行附加进来
  while (stdoutIdx < stdoutLines.length) {
    events.push({
      op: "stdout",
      line: mainLine,
      text: stdoutLines[stdoutIdx++] + "\n",
    });
  }

  // 4. RAII 栈对象反向析构（LIFO 顺序销毁局部变量）
  while (constructedObjects.length > 0) {
    const obj = constructedObjects.pop()!;
    events.push({
      op: "obj_dtor",
      id: obj.id,
      line: obj.line,
    });
  }

  // 5. 智能指针在离开 main 作用域时自动释放所有权资源
  for (const [varName, heap] of allocatedHeaps.entries()) {
    if (!heap.smart) continue;
    events.push({ op: "heap_free", line: mainLine, addr: heap.addr });
    events.push({
      op: "step",
      line: mainLine,
      label: `智能指针 [${varName}] 离开作用域，自动释放 ${heap.label}`,
    });
  }

  // 6. 离开 main 作用域
  events.push({
    op: "scope_exit",
    name: "main",
    line: mainLine,
  });

  // 如果事件过少，至少生成基础执行快照
  if (events.length === 0) {
    events.push({
      op: "scope_enter",
      name: "main",
      line: 1,
    });
    if (effectiveStdout) {
      events.push({
        op: "stdout",
        line: 1,
        text: effectiveStdout,
      });
    }
    events.push({
      op: "step",
      line: 1,
      label: `程序运行完成，退出代码: ${exitCode}`,
    });
    events.push({
      op: "scope_exit",
      name: "main",
      line: 1,
    });
  }

  return events;
}

export function generateSnapshotsFromCodeAndOutput(
  code: string,
  stdout: string,
  exitCode = 0,
): MemorySnapshot[] {
  return computeSnapshots(inferTraceEventsFromCodeAndOutput(code, stdout, exitCode));
}
