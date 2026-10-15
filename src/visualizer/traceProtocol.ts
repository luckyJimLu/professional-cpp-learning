import { computeSnapshotsWithDiagnostics, isTraceEvent } from "./reducer.ts";
import type {
  HeapBlock,
  MemorySnapshot,
  PointerEdge,
  StackFrame,
  StackVariable,
  VisualizerTrace,
  VisualizerTraceV2,
} from "./types";

function record(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} 必须是对象`);
  }
  return value as Record<string, unknown>;
}

function text(value: unknown, label: string): string {
  if (typeof value !== "string") throw new Error(`${label} 必须是字符串`);
  return value;
}

function normalizeVariable(value: unknown, frameId: string, index: number): StackVariable {
  const item = record(value, "变量");
  const status = item.status;
  if (!["normal", "created", "modified", "destroying", "destroyed", "moved_from"].includes(String(status))) {
    throw new Error(`变量 ${String(item.name ?? index)} 的 status 无效`);
  }
  return {
    ...(item as unknown as StackVariable),
    variableId: typeof item.variableId === "string" ? item.variableId : `${frameId}:variable:${index}`,
    name: text(item.name, "变量 name"),
    type: text(item.type, "变量 type"),
    value: text(item.value, "变量 value"),
    status: status as StackVariable["status"],
    scopeDepth: typeof item.scopeDepth === "number" ? item.scopeDepth : 0,
  };
}

function normalizeFrame(value: unknown, index: number): StackFrame {
  const item = record(value, "栈帧");
  const id = typeof item.id === "string" ? item.id : `frame:${index}`;
  if (!Array.isArray(item.variables)) throw new Error(`栈帧 ${id} 缺少 variables 数组`);
  return {
    id,
    name: text(item.name, "栈帧 name"),
    scopeDepth: typeof item.scopeDepth === "number" ? item.scopeDepth : 0,
    variables: item.variables.map((variable, variableIndex) =>
      normalizeVariable(variable, id, variableIndex),
    ),
  };
}

function normalizeHeap(value: unknown, index: number): HeapBlock {
  const item = record(value, "堆块");
  const rawAddr = text(item.rawAddr, "堆块 rawAddr");
  const status = String(item.status);
  if (!["alive", "freed", "leaked"].includes(status)) {
    throw new Error(`堆块 ${rawAddr} 的 status 无效`);
  }
  if (typeof item.size !== "number" || !Number.isFinite(item.size)) {
    throw new Error(`堆块 ${rawAddr} 的 size 无效`);
  }
  const fields = item.fields && typeof item.fields === "object" && !Array.isArray(item.fields)
    ? item.fields as Record<string, string>
    : undefined;
  const parsedUseCount = Number(item.useCount ?? fields?.use_count);
  const parsedWeakCount = Number(item.weakCount ?? fields?.weak_count);
  return {
    ...(item as unknown as HeapBlock),
    allocationId:
      typeof item.allocationId === "string" ? item.allocationId : `legacy-allocation:${index}:${rawAddr}`,
    rawAddr,
    label: text(item.label, "堆块 label"),
    type: text(item.type, "堆块 type"),
    size: item.size,
    status: status as HeapBlock["status"],
    fields,
    useCount: Number.isFinite(parsedUseCount) ? parsedUseCount : undefined,
    weakCount: Number.isFinite(parsedWeakCount) ? parsedWeakCount : undefined,
  };
}

function normalizePointer(
  value: unknown,
  frames: StackFrame[],
  heap: HeapBlock[],
): PointerEdge {
  const item = record(value, "指针边");
  const fromFrameId = text(item.fromFrameId, "指针 fromFrameId");
  const fromVar = text(item.fromVar, "指针 fromVar");
  const sourceVariable = frames.find((frame) => frame.id === fromFrameId)?.variables
    .find((variable) => variable.name === fromVar.replace(".data()", ""));
  const toRawAddr = text(item.toRawAddr, "指针 toRawAddr");
  const heapTarget = heap.find((block) => block.rawAddr === toRawAddr);
  const stackTarget = frames.flatMap((frame) =>
    frame.variables.map((variable) => ({ frame, variable })),
  ).find(({ variable }) => variable.rawAddress === toRawAddr);
  const target = heapTarget
    ? { kind: "heap" as const, allocationId: heapTarget.allocationId!, rawAddr: toRawAddr }
    : stackTarget
      ? {
          kind: "stack" as const,
          frameId: stackTarget.frame.id,
          variableId: stackTarget.variable.variableId!,
          rawAddr: toRawAddr,
        }
      : { kind: "unknown" as const, rawAddr: toRawAddr };
  const isDangling = Boolean(item.isDangling);
  return {
    ...(item as unknown as PointerEdge),
    id: typeof item.id === "string" ? item.id : `edge:${fromFrameId}:${fromVar}:${toRawAddr}`,
    fromFrameId,
    fromVar,
    fromVariableId: typeof item.fromVariableId === "string" ? item.fromVariableId : sourceVariable?.variableId,
    toRawAddr,
    toLabel: typeof item.toLabel === "string" ? item.toLabel : toRawAddr,
    isDangling,
    target,
    relationKind: isDangling
      ? "dangling_ptr"
      : item.isSmart
        ? "smart_ptr"
        : item.relationKind === "reference"
          ? "reference"
          : "raw_ptr",
  };
}

export function normalizeSnapshot(value: unknown, index: number): MemorySnapshot {
  const item = record(value, "快照");
  if (!Array.isArray(item.callStack) || !Array.isArray(item.heap) || !Array.isArray(item.pointers)) {
    throw new Error(`快照 ${index + 1} 缺少 callStack、heap 或 pointers 数组`);
  }
  const callStack = item.callStack.map(normalizeFrame);
  if (item.activeOp === "ptr_move") {
    for (const frame of callStack) {
      frame.variables = frame.variables.map((variable) =>
        variable.isSmartPointer && (!variable.pointsToRaw || variable.pointsToRaw === "0x0")
          ? { ...variable, value: "moved (nullptr)", status: "moved_from" }
          : variable,
      );
    }
  }
  const heap = item.heap.map(normalizeHeap);
  const pointers = item.pointers.map((pointer) => normalizePointer(pointer, callStack, heap));
  return {
    stepIndex: index,
    line: typeof item.line === "number" ? item.line : 0,
    description: text(item.description, "快照 description"),
    activeOp: text(item.activeOp, "快照 activeOp") as MemorySnapshot["activeOp"],
    callStack,
    heap,
    pointers,
    stdout: typeof item.stdout === "string" ? item.stdout : "",
    warnings: Array.isArray(item.warnings)
      ? item.warnings.filter((warning): warning is string => typeof warning === "string")
      : [],
  };
}

export function normalizeVisualizerTrace(input: unknown): VisualizerTraceV2 {
  const value = record(input, "轨迹 JSON");
  const sourceCode = text(value.sourceCode, "sourceCode");
  const snapshots = Array.isArray(value.snapshots)
    ? value.snapshots.map(normalizeSnapshot)
    : undefined;
  const events = Array.isArray(value.events)
    ? value.events.map((event, index) => {
        if (!isTraceEvent(event)) throw new Error(`事件 ${index + 1} 缺少必需字段或字段类型无效`);
        return event;
      })
    : undefined;
  if ((!snapshots || snapshots.length === 0) && (!events || events.length === 0)) {
    throw new Error("轨迹必须包含非空 snapshots 或 events 数组");
  }
  const mode = value.schemaVersion === 2 && ["preset", "clang-vis", "regex"].includes(String(value.mode))
    ? value.mode as VisualizerTraceV2["mode"]
    : "preset";
  const accuracy = value.schemaVersion === 2 && value.accuracy === "approximate"
    ? "approximate"
    : "exact";
  return {
    schemaVersion: 2,
    id: typeof value.id === "string" ? value.id : undefined,
    title: typeof value.title === "string" ? value.title : undefined,
    category: typeof value.category === "string" ? value.category : undefined,
    description: typeof value.description === "string" ? value.description : undefined,
    sourceCode,
    mode,
    accuracy,
    snapshots,
    events,
  };
}

export function materializeTrace(trace: VisualizerTrace): {
  trace: VisualizerTraceV2;
  snapshots: MemorySnapshot[];
  diagnostics: string[];
} {
  const normalized = normalizeVisualizerTrace(trace);
  if (normalized.snapshots?.length) {
    return { trace: normalized, snapshots: normalized.snapshots, diagnostics: [] };
  }
  const computed = computeSnapshotsWithDiagnostics(normalized.events ?? []);
  return { trace: normalized, ...computed };
}
