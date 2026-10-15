/**
 * C++ 内存与生命周期可视化器 - Trace 日志与状态机数据类型定义
 */

// 底层原子事件类型（来自 C++ visualizer.h 的 [VIS] 日志）
export type TraceOp =
  | "scope_enter"
  | "scope_exit"
  | "enter_scope"
  | "exit_scope"
  | "var_decl"
  | "var_set"
  | "obj_ctor"
  | "obj_dtor"
  | "heap_alloc"
  | "heap_free"
  | "ptr_set"
  | "ptr_move"
  | "step"
  | "stdout";

export interface ScopeEnterEvent {
  op: "scope_enter";
  line: number;
  name: string;
}

export interface ScopeExitEvent {
  op: "scope_exit";
  line?: number;
  name?: string;
}

export interface EnterScopeEvent {
  op: "enter_scope";
  line: number;
  name?: string;
}

export interface ExitScopeEvent {
  op: "exit_scope";
  line: number;
  name?: string;
}

export interface VarDeclEvent {
  op: "var_decl";
  line: number;
  name: string;
  type: string;
  value?: string;
  addr?: number | string;
}

export interface VarSetEvent {
  op: "var_set";
  line: number;
  name: string;
  value: string;
}

export interface ObjCtorEvent {
  op: "obj_ctor";
  line: number;
  id: string; // 变量名或逻辑标识
  type: string;
  addr?: number | string;
  fields?: Record<string, string>;
}

export interface ObjDtorEvent {
  op: "obj_dtor";
  line: number;
  id: string;
  addr?: number | string;
}

export interface HeapAllocEvent {
  op: "heap_alloc";
  line: number;
  addr: number | string;
  size: number;
  type?: string;
  label?: string;
}

export interface HeapFreeEvent {
  op: "heap_free";
  line: number;
  addr: number | string;
}

export interface PtrSetEvent {
  op: "ptr_set";
  line: number;
  var: string;
  to: number | string | null; // 目标堆地址，为 null 表示置为 nullptr
  type?: string;
  isSmart?: boolean;
}

export interface PtrMoveEvent {
  op: "ptr_move";
  line: number;
  from: string;
  toVar: string;
  addr: number | string;
}

export interface StepEvent {
  op: "step";
  line: number;
  label?: string;
}

export interface StdoutEvent {
  op: "stdout";
  text: string;
  line?: number;
}

export type TraceEvent =
  | ScopeEnterEvent
  | ScopeExitEvent
  | EnterScopeEvent
  | ExitScopeEvent
  | VarDeclEvent
  | VarSetEvent
  | ObjCtorEvent
  | ObjDtorEvent
  | HeapAllocEvent
  | HeapFreeEvent
  | PtrSetEvent
  | PtrMoveEvent
  | StepEvent
  | StdoutEvent;

// ==========================================
// 高层状态快照模型（VCR 播放器使用的数据结构）
// ==========================================

export interface StackVariable {
  variableId?: string;
  name: string;
  type: string;
  value: string;
  isPointer?: boolean;
  rawAddress?: string; // 变量自身的地址 (如 &a)
  pointsToRaw?: string | null; // 指针指向的原生地址 (如 0x1000)
  pointsToAllocationId?: string | null;
  pointsToLabel?: string | null; // 指针指向的逻辑块编号 (如 "Heap #1")
  isSmartPointer?: boolean;
  relationKind?: "raw_ptr" | "smart_ptr" | "reference";
  scopeDepth?: number;
  fields?: Record<string, string>;
  status: "normal" | "created" | "modified" | "destroying" | "destroyed" | "moved_from";
}

export interface StackFrame {
  id: string;
  name: string;
  variables: StackVariable[];
  scopeDepth?: number;
}

export interface HeapBlock {
  allocationId?: string; // 稳定分配身份；兼容旧轨迹时可由 rawAddr 推导
  rawAddr: string; // 真实地址映射键，如 "0x1000"
  label: string; // 逻辑标签，如 "Heap #1"
  size: number;
  type: string;
  value?: string;
  fields?: Record<string, string>;
  useCount?: number;
  weakCount?: number;
  status: "alive" | "freed" | "leaked";
}

export interface PointerEdge {
  id: string; // 唯一标识，如 "edge-p-to-Heap#1"
  fromVar: string; // 源变量名
  fromFrameId: string; // 所属栈帧
  fromVariableId?: string; // 稳定源端点；旧轨迹在规范化时补齐
  toRawAddr: string; // 目标堆地址
  toLabel: string; // 目标堆标签
  isSmart?: boolean;
  relationKind?: "raw_ptr" | "smart_ptr" | "reference" | "dangling_ptr";
  isDangling?: boolean; // 是否是悬挂指针（指向已 freed 的堆块）
  target?: PointerTarget;
}

export type PointerTarget =
  | { kind: "heap"; allocationId: string; rawAddr: string }
  | { kind: "stack"; frameId: string; variableId: string; rawAddr: string }
  | { kind: "null" }
  | { kind: "unknown"; rawAddr: string };

export interface MemorySnapshot {
  stepIndex: number;
  line: number;
  description: string;
  activeOp: TraceOp;
  callStack: StackFrame[];
  heap: HeapBlock[];
  pointers: PointerEdge[];
  stdout: string;
  warnings: string[]; // 教学警告，如 "Dangling Pointer: 指针 p 指向了已被 delete 的堆内存"
}

export interface VisualizerTraceV1 {
  id?: string;
  title?: string;
  category?: string;
  description?: string;
  sourceCode: string;
  snapshots: MemorySnapshot[];
}

export interface VisualizerTraceV2 {
  schemaVersion: 2;
  id?: string;
  title?: string;
  category?: string;
  description?: string;
  sourceCode: string;
  mode: "preset" | "clang-vis" | "regex";
  accuracy: "exact" | "approximate";
  events?: TraceEvent[];
  snapshots?: MemorySnapshot[];
}

export type VisualizerTrace = VisualizerTraceV1 | VisualizerTraceV2;

export interface TraceSessionState {
  code: string;
  executedCode: string;
  traceId?: string;
  mode: "preset" | "clang-vis" | "regex" | "none";
  accuracy: "exact" | "approximate" | "none";
  status: "idle" | "loading" | "running" | "ready" | "error";
  progress: number;
  snapshots: MemorySnapshot[];
  currentStep: number;
  terminalOutput: string;
  diagnostics: string[];
  isStale: boolean;
}
