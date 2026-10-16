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
  "heap_field_set",
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
    case "heap_field_set": return finiteLine && address("addr") && string("field") && typeof candidate.value === "string";
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
  const lastAllocationByAddress = new Map<string, string>();
  const destroyedStackAddresses = new Set<string>();
  let sawScopeEnter = false;
  let heapCounter = 0;
  let variableCounter = 0;
  let stdoutAccumulator = initialStdout;

  const findHeapByAddress = (rawAddr: string, preferredAllocationId?: string | null): HeapBlock | undefined => {
    const id = preferredAllocationId ?? activeAllocationByAddress.get(rawAddr) ?? lastAllocationByAddress.get(rawAddr);
    return id ? currentHeap.get(id) : undefined;
  };

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
          const targetHeap = findHeapByAddress(v.pointsToRaw, v.pointsToAllocationId);
          const stackTarget = clonedFrames.flatMap((candidateFrame) =>
            candidateFrame.variables.map((candidate) => ({ candidateFrame, candidate })),
          ).find(({ candidate }) => candidate.rawAddress === v.pointsToRaw);
          const target = targetHeap
            ? {
                kind: "heap" as const,
                allocationId: targetHeap.allocationId ?? targetHeap.rawAddr,
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
              `⚠️ 悬挂指针警告: 变量 [${v.name}] 指向已被释放的内存 (${v.pointsToLabel ?? v.pointsToRaw})`,
            );
          }
        }
      }
    }

    // 构建堆块内部字段指向其它堆块/栈变量的拓扑边（如链表 node->next）
    const defaultFrameId = clonedFrames[0]?.id ?? "heap";
    for (const block of clonedHeap) {
      if (block.status !== "alive" || !block.fields) continue;
      for (const [field, rawVal] of Object.entries(block.fields)) {
        const trimmed = rawVal.trim();
        if (!/^0x[0-9a-f]+$/i.test(trimmed)) continue;
        const normAddr = normalizeAddr(trimmed);
        if (normAddr === "0x0") continue;
        const targetHeap = findHeapByAddress(normAddr);
        if (!targetHeap) continue;
        const isDangling = targetHeap.status === "freed";
        pointers.push({
          id: `edge-heap-${block.allocationId ?? block.rawAddr}-${field}-to-${normAddr}`,
          fromVar: `${block.label}->${field}`,
          fromFrameId: defaultFrameId,
          toRawAddr: normAddr,
          toLabel: targetHeap.label,
          isSmart: false,
          isDangling,
          relationKind: isDangling ? "dangling_ptr" : "raw_ptr",
          target: {
            kind: "heap",
            allocationId: targetHeap.allocationId ?? targetHeap.rawAddr,
            rawAddr: targetHeap.rawAddr,
          },
        });
        if (isDangling) {
          warnings.push(
            `⚠️ 悬挂指针警告: 堆块字段 [${block.label}->${field}] 指向已被释放的堆内存 (${targetHeap.label})`,
          );
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

    // 快照生成后，将瞬态 modified 状态复位为 normal，避免后续步骤一直重复闪烁修改高亮
    for (const frame of currentFrames) {
      for (const v of frame.variables) {
        if (v.status === "modified") {
          v.status = "normal";
        }
      }
    }
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
        sawScopeEnter = true;
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
        let currentFrame = currentFrames[currentFrames.length - 1];
        if (!currentFrame) {
          currentFrame = { id: "frame_0_main", name: "main", variables: [], scopeDepth: 0 };
          currentFrames.push(currentFrame);
        }
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
        let currentFrame = currentFrames[currentFrames.length - 1];
        if (!currentFrame) {
          currentFrame = { id: "frame_0_main", name: "main", variables: [], scopeDepth: 0 };
          currentFrames.push(currentFrame);
        }
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
        break;
      }

      case "obj_dtor": {
        const currentFrame = currentFrames[currentFrames.length - 1];
        if (currentFrame) {
          const v = [...currentFrame.variables].reverse().find((x) => x.name === event.id && x.status !== "destroyed");
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
          fields: event.fields ? { ...event.fields } : undefined,
          status: "alive",
        });
        activeAllocationByAddress.set(rawAddr, allocationId);
        lastAllocationByAddress.set(rawAddr, allocationId);
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

      case "heap_field_set": {
        const rawAddr = normalizeAddr(event.addr);
        const block = findHeapByAddress(rawAddr);
        if (block) {
          block.fields = { ...(block.fields ?? {}), [event.field]: event.value };
          if (event.field === "use_count") {
            const parsed = Number(event.value);
            if (Number.isFinite(parsed)) block.useCount = parsed;
          }
          pushSnapshot(
            event.line,
            event.op,
            `更新堆字段: ${block.label}.${event.field} = ${event.value}`,
          );
        }
        break;
      }

      case "ptr_set": {
        let currentFrame = currentFrames[currentFrames.length - 1];
        if (!currentFrame) {
          currentFrame = { id: "frame_0_main", name: "main", variables: [], scopeDepth: 0 };
          currentFrames.push(currentFrame);
        }
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
        break;
      }

      case "ptr_move": {
        let currentFrame = currentFrames[currentFrames.length - 1];
        if (!currentFrame) {
          currentFrame = { id: "frame_0_main", name: "main", variables: [], scopeDepth: 0 };
          currentFrames.push(currentFrame);
        }
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

  // 终态检测：当主作用域结束或无显式 VIS_SCOPE 的程序走完时，检查未释放的堆块（内存泄漏）
  if ((currentFrames.length === 0 || !sawScopeEnter) && currentHeap.size > 0) {
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
 * 剥离 C++ 多行注释并保留原始换行符，确保行号 100% 对齐
 */
function stripCommentsPreservingLines(code: string): string {
  return code
    .replace(/\/\*[\s\S]*?\*\//g, (match) => match.replace(/[^\r\n]/g, " "))
    .replace(/\/\/.*$/gm, "");
}

/**
 * 剥离字符串与字符字面量内容，防止引号内的花括号或关键字干扰语法分析
 */
function maskStringLiterals(line: string): string {
  return line.replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g, '""');
}

/**
 * 模拟标准 C++ 代码执行并生成预期控制台输出
 * 用于快速仿真模式或工具链离线/网络受限时的降级执行
 */
export function simulateCppStdout(code: string): string {
  const cleanCode = stripCommentsPreservingLines(code);
  const lines = cleanCode.split(/\r?\n/);
  const output: string[] = [];
  const varValues: Record<string, string> = {};

  for (const rawLine of lines) {
    const line = rawLine.trim();
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
          lineText += part.slice(1, -1).replace(/\\n/g, "\n");
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
 * - 多行注释与字符串字面量安全过滤（行号严格对齐）
 * - 块级作用域 (enter_scope / exit_scope) 与局部 RAII 对象逆序析构
 * - 栈帧推进与函数调用 (scope_enter / scope_exit)
 * - 原始指针、空指针重置与悬挂指针检测 (int* p = &a; p = new int; delete p; p = nullptr;)
 * - 现代 C++ 智能指针与所有权移动 (std::unique_ptr, std::shared_ptr, std::move)
 * - 堆结构体字段指针变更 (curr->next = prev;)
 */
export function inferTraceEventsFromCodeAndOutput(
  code: string,
  stdout: string,
  exitCode = 0,
): TraceEvent[] {
  const events: TraceEvent[] = [];
  const cleanLines = stripCommentsPreservingLines(code).split(/\r?\n/);
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

  for (let i = 0; i < cleanLines.length; i++) {
    const line = cleanLines[i].trim();
    const maskedLine = maskStringLiterals(line);

    const classMatch = maskedLine.match(/(?:class|struct)\s+([A-Za-z_][A-Za-z0-9_]*)/);
    if (classMatch) {
      customTypes.add(classMatch[1]);
    }

    // 发现函数定义（除 main 外）
    if (!funcName && !/^\s*(?:if|else|while|for|switch|catch)\b/.test(maskedLine)) {
      const fnMatch = maskedLine.match(/^(?:(?:inline|static|virtual|constexpr)\s+)*(?:void|int|bool|double|float|auto|[A-Za-z_][A-Za-z0-9_:]*)\s+([A-Za-z_][A-Za-z0-9_]*)\s*\([^;]*\)\s*\{?/);
      if (fnMatch && fnMatch[1] !== "main" && !maskedLine.endsWith(";")) {
        funcName = fnMatch[1];
        funcStart = i + 1;
        funcBraces = 0;
        funcBody = [];
      }
    }

    if (funcName) {
      for (const ch of maskedLine) {
        if (ch === "{") funcBraces++;
        if (ch === "}") funcBraces--;
      }
      funcBody.push(i + 1);
      if (funcBraces <= 0 && maskedLine.includes("}")) {
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
  let mainEndLine = cleanLines.length;
  let inMain = false;
  let mainBraceCount = 0;
  const constructedObjects: Array<{ id: string; type: string; line: number; depth: number }> = [];
  const allocatedHeaps = new Map<string, { addr: string; label: string; smart: boolean; isShared?: boolean; depth: number }>();
  const stackVarAddresses = new Map<string, string>();
  let heapCounter = 0;

  const cleanupScopeAtDepth = (depth: number, exitLine: number) => {
    for (let idx = constructedObjects.length - 1; idx >= 0; idx--) {
      if (constructedObjects[idx].depth >= depth) {
        const [obj] = constructedObjects.splice(idx, 1);
        events.push({
          op: "obj_dtor",
          id: obj.id,
          line: exitLine,
        });
      }
    }
    for (const [varName, heap] of Array.from(allocatedHeaps.entries()).reverse()) {
      if (heap.smart && heap.depth >= depth) {
        events.push({ op: "heap_free", line: exitLine, addr: heap.addr });
        events.push({
          op: "step",
          line: exitLine,
          label: `智能指针 [${varName}] 离开作用域，自动释放 ${heap.label}`,
        });
        allocatedHeaps.delete(varName);
      }
    }
  };

  for (let i = 0; i < cleanLines.length; i++) {
    const lineNum = i + 1;
    const line = cleanLines[i].trim();
    const maskedLine = maskStringLiterals(line);

    if (!inMain) {
      if (/\bint\s+main\s*\(/.test(maskedLine) || /\bvoid\s+main\s*\(/.test(maskedLine)) {
        inMain = true;
        mainLine = lineNum;
        events.push({
          op: "scope_enter",
          name: "main",
          line: mainLine,
        });
        for (const ch of maskedLine) {
          if (ch === "{") mainBraceCount++;
          if (ch === "}") mainBraceCount--;
        }
      }
      continue;
    }

    const prevBraceCount = mainBraceCount;
    for (const char of maskedLine) {
      if (char === "{") mainBraceCount++;
      if (char === "}") mainBraceCount--;
    }

    if (mainBraceCount <= 0 && inMain) {
      mainEndLine = lineNum;
      break;
    }

    // 检测内部块级作用域进入/退出 (例如 { ... } 局部块)
    if (maskedLine === "{") {
      events.push({ op: "enter_scope", line: lineNum, name: "block" });
      continue;
    }
    if (maskedLine === "}") {
      if (prevBraceCount > 1 && mainBraceCount < prevBraceCount) {
        cleanupScopeAtDepth(prevBraceCount - 1, lineNum);
        events.push({ op: "exit_scope", line: lineNum, name: "block" });
      }
      continue;
    }

    if (!line) continue;
    const currentDepth = Math.max(0, mainBraceCount - 1);

    // A. 现代 C++ 智能指针分配:
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
        isShared,
        depth: currentDepth,
      });

      events.push({
        op: "heap_alloc",
        line: lineNum,
        addr,
        size: type === "int" || type === "float" ? 4 : type === "double" ? 8 : 16,
        type,
        label: `${type} 堆实例`,
        fields: isShared ? { use_count: "1" } : undefined,
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

    // A2. std::move 所有权转移: 如 auto p2 = std::move(p1); 或 p2 = std::move(p1);
    const moveMatch = line.match(/(?:(?:std::)?(?:unique_ptr|shared_ptr)<[^>]+>\s+|auto\s+|vis::unique_ptr<[^>]+>\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*std::move\(\s*([A-Za-z_][A-Za-z0-9_]*)\s*\)\s*;/);
    if (moveMatch) {
      const toVar = moveMatch[1];
      const fromVar = moveMatch[2];
      const heap = allocatedHeaps.get(fromVar);
      const addr = heap?.addr ?? "0x2040";
      if (heap) {
        allocatedHeaps.delete(fromVar);
        allocatedHeaps.set(toVar, { ...heap, depth: currentDepth });
      }
      events.push({
        op: "ptr_move",
        line: lineNum,
        from: fromVar,
        toVar,
        addr,
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
        depth: currentDepth,
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
      const isReset = Boolean(deleteMatch[2]);
      const heap = allocatedHeaps.get(varName);
      if (heap) {
        events.push({
          op: "heap_free",
          line: lineNum,
          addr: heap.addr,
        });
        allocatedHeaps.delete(varName);
      }
      if (isReset) {
        events.push({
          op: "ptr_set",
          line: lineNum,
          var: varName,
          to: null,
          isSmart: true,
        });
      }
      events.push({
        op: "step",
        line: lineNum,
        label: `释放堆内存: 销毁变量 [${varName}] 指向的堆块 (地址: ${heap?.addr || "0x2000"})`,
      });
      continue;
    }

    // C2. 指针置空：如 p = nullptr; 或 p = NULL;
    const nullPtrMatch = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(?:nullptr|NULL|0)\s*;/);
    if (nullPtrMatch) {
      const ptrName = nullPtrMatch[1];
      events.push({
        op: "ptr_set",
        line: lineNum,
        var: ptrName,
        to: null,
      });
      continue;
    }

    // C3. 堆成员指针更新：如 curr->next = prev;
    const arrowFieldMatch = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*->\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*([^;]+);/);
    if (arrowFieldMatch) {
      const ownerVar = arrowFieldMatch[1];
      const fieldName = arrowFieldMatch[2];
      const rhs = arrowFieldMatch[3].trim();
      const ownerHeap = allocatedHeaps.get(ownerVar);
      if (ownerHeap) {
        const rhsHeap = allocatedHeaps.get(rhs);
        const resolvedVal = rhs === "nullptr" || rhs === "NULL" ? "0x0" : rhsHeap ? rhsHeap.addr : rhs;
        events.push({
          op: "heap_field_set",
          line: lineNum,
          addr: ownerHeap.addr,
          field: fieldName,
          value: resolvedVal,
        });
        continue;
      }
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
      if (callRegex.test(maskedLine)) {
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
          const bodyText = (cleanLines[bodyLine - 1] || "").trim();
          if (bodyText && bodyText !== "{" && bodyText !== "}") {
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
    const declMatch = line.match(/^(?:const\s+|constexpr\s+)?([A-Za-z_][A-Za-z0-9_:<>*&]*)\s+([A-Za-z_][A-Za-z0-9_]*)\s*(\{[^}]*\}|\([^)]*\)|=[^;]+)?\s*;/);
    if (declMatch && !line.startsWith("return") && !line.startsWith("throw") && !line.startsWith("delete")) {
      const type = declMatch[1];
      const name = declMatch[2];
      const init = (declMatch[3] || "").trim();
      const addr = `0x${(0x7ffd0000 + (lineNum % 256) * 0x10).toString(16)}`;
      stackVarAddresses.set(name, addr);

      // 检查是否是指针别名拷贝 (如 Node* curr = head; 或 std::shared_ptr<Data> s2 = s1;)
      const rhsVar = init.startsWith("=") ? init.slice(1).trim() : "";
      if (rhsVar && allocatedHeaps.has(rhsVar)) {
        const targetHeap = allocatedHeaps.get(rhsVar)!;
        const isSmart = type.includes("shared_ptr") || type.includes("unique_ptr") || targetHeap.smart;
        events.push({
          op: "ptr_set",
          line: lineNum,
          var: name,
          to: targetHeap.addr,
          type,
          isSmart,
        });
        continue;
      }

      const isCustomClass = customTypes.has(type) || (/^[A-Z]/.test(type) && !type.includes("*"));

      if (isCustomClass) {
        constructedObjects.push({ id: name, type, line: lineNum, depth: currentDepth });
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

    // J. 变量赋值语句：如 x = 42;
    const assignMatch = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*([^;]+);/);
    if (assignMatch && stackVarAddresses.has(assignMatch[1])) {
      const varName = assignMatch[1];
      const rhs = assignMatch[2].trim();
      events.push({
        op: "var_set",
        line: lineNum,
        name: varName,
        value: rhs,
      });
      continue;
    }

    // K. 普通可执行语句: 产生一个逐行单步事件
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
      line: mainEndLine,
      text: stdoutLines[stdoutIdx++] + "\n",
    });
  }

  // 4 & 5. 离开 main 作用域时，逆序析构剩余局部 RAII 对象与智能指针
  cleanupScopeAtDepth(0, mainEndLine);

  // 6. 离开 main 作用域
  events.push({
    op: "scope_exit",
    name: "main",
    line: mainEndLine,
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

