import type {
  HeapBlock,
  MemorySnapshot,
  PointerEdge,
  StackFrame,
  StackVariable,
  TraceEvent,
} from "./types";

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
} {
  const events: TraceEvent[] = [];
  const stdoutLines: string[] = [];

  const lines = rawStdout.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("[VIS]")) {
      const jsonStr = trimmed.slice(5).trim();
      try {
        const parsed = JSON.parse(jsonStr) as TraceEvent;
        events.push(parsed);
      } catch (err) {
        console.warn("Failed to parse [VIS] payload:", jsonStr, err);
      }
    } else if (line.length > 0) {
      stdoutLines.push(line);
    }
  }

  return {
    events,
    cleanStdout: stdoutLines.join("\n"),
  };
}

/**
 * 纯函数：将 TraceEvent 事件流归约（Reduce）为离散的步骤快照数组
 */
export function computeSnapshots(
  events: TraceEvent[],
  initialStdout = "",
): MemorySnapshot[] {
  const snapshots: MemorySnapshot[] = [];

  let currentFrames: StackFrame[] = [];
  let currentHeap: Map<string, HeapBlock> = new Map();
  let heapCounter = 0;
  let stdoutAccumulator = initialStdout;

  // 辅助函数：根据当前内存状态构建不可变深拷贝快照
  const pushSnapshot = (
    line: number,
    activeOp: TraceEvent["op"],
    description: string,
  ) => {
    // 拷贝栈帧
    const clonedFrames: StackFrame[] = currentFrames.map((frame) => ({
      ...frame,
      variables: frame.variables.map((v) => ({ ...v })),
    }));

    // 拷贝堆块
    const clonedHeap: HeapBlock[] = Array.from(currentHeap.values()).map(
      (b) => ({
        ...b,
      }),
    );

    // 构建指针引用边并检测悬挂指针
    const pointers: PointerEdge[] = [];
    const warnings: string[] = [];

    for (const frame of clonedFrames) {
      for (const v of frame.variables) {
        if (v.isPointer && v.pointsToRaw && v.pointsToRaw !== "0x0") {
          const targetHeap = currentHeap.get(v.pointsToRaw);
          const isDangling = Boolean(
            !targetHeap || targetHeap.status === "freed",
          );

          pointers.push({
            id: `edge-${frame.id}-${v.name}-to-${v.pointsToRaw}`,
            fromVar: v.name,
            fromFrameId: frame.id,
            toRawAddr: v.pointsToRaw,
            toLabel: v.pointsToLabel ?? targetHeap?.label ?? v.pointsToRaw,
            isSmart: v.isSmartPointer,
            isDangling,
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

  for (const event of events) {
    switch (event.op) {
      case "scope_enter": {
        const frameId = `frame_${currentFrames.length}_${event.name}`;
        currentFrames.push({
          id: frameId,
          name: event.name,
          variables: [],
        });
        pushSnapshot(
          event.line,
          event.op,
          `进入作用域 / 调用函数: ${event.name}()`,
        );
        break;
      }

      case "scope_exit": {
        const exitedFrame = currentFrames.pop();
        const frameName = exitedFrame?.name ?? "scope";
        pushSnapshot(
          event.line ?? (snapshots.length > 0 ? snapshots[snapshots.length - 1].line : 1),
          event.op,
          `离开作用域 / 退出函数: ${frameName}()`,
        );
        break;
      }

      case "var_decl": {
        const currentFrame = currentFrames[currentFrames.length - 1];
        if (currentFrame) {
          const isPtr = event.type.includes("*");
          const pointsToRaw = isPtr && event.value ? normalizeAddr(event.value) : null;
          const targetBlock = pointsToRaw ? currentHeap.get(pointsToRaw) : null;

          const variable: StackVariable = {
            name: event.name,
            type: event.type,
            value: event.value ?? "uninitialized",
            isPointer: isPtr,
            rawAddress: normalizeAddr(event.addr),
            pointsToRaw,
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
          const v = currentFrame.variables.find((x) => x.name === event.name);
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
            name: event.id,
            type: event.type,
            value: `{${event.type}}`,
            rawAddress: normalizeAddr(event.addr),
            fields: event.fields,
            status: "created",
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
          const v = currentFrame.variables.find((x) => x.name === event.id);
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
        currentHeap.set(rawAddr, {
          rawAddr,
          label,
          size: event.size,
          type: event.type ?? "raw",
          status: "alive",
        });
        pushSnapshot(
          event.line,
          event.op,
          `堆内存分配: ${label} (${event.size} 字节, 类型: ${event.type ?? "raw"})`,
        );
        break;
      }

      case "heap_free": {
        const rawAddr = normalizeAddr(event.addr);
        const block = currentHeap.get(rawAddr);
        if (block) {
          block.status = "freed";
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
          let v = currentFrame.variables.find((x) => x.name === event.var);
          const rawTo = event.to !== null ? normalizeAddr(event.to) : null;
          const targetBlock = rawTo ? currentHeap.get(rawTo) : null;

          if (!v) {
            // 如果此前未声明，自动隐式声明指针变量
            v = {
              name: event.var,
              type: event.type ?? "pointer",
              value: rawTo ?? "nullptr",
              isPointer: true,
              isSmartPointer: event.isSmart,
              pointsToRaw: rawTo,
              pointsToLabel: targetBlock?.label ?? null,
              status: "created",
            };
            currentFrame.variables.push(v);
          } else {
            v.isPointer = true;
            v.isSmartPointer = event.isSmart ?? v.isSmartPointer;
            v.value = rawTo ?? "nullptr";
            v.pointsToRaw = rawTo;
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
          const fromV = currentFrame.variables.find((x) => x.name === event.from);
          let toV = currentFrame.variables.find((x) => x.name === event.toVar);
          const rawAddr = normalizeAddr(event.addr);
          const targetBlock = currentHeap.get(rawAddr);

          if (fromV) {
            fromV.value = "nullptr";
            fromV.pointsToRaw = null;
            fromV.pointsToLabel = null;
            fromV.status = "modified";
          }

          if (!toV) {
            toV = {
              name: event.toVar,
              type: fromV?.type ?? "unique_ptr",
              value: rawAddr,
              isPointer: true,
              isSmartPointer: true,
              pointsToRaw: rawAddr,
              pointsToLabel: targetBlock?.label ?? null,
              status: "created",
            };
            currentFrame.variables.push(toV);
          } else {
            toV.value = rawAddr;
            toV.pointsToRaw = rawAddr;
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
        lastSnap.warnings.push(
          `🛑 内存泄漏警告: ${leaked.label} (${leaked.size} 字节) 在程序结束时未释放！`,
        );
      }
    }
  }

  return snapshots;
}
