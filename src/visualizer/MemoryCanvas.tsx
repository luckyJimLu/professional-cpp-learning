import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { HeapBlock, MemorySnapshot, PointerEdge, StackFrame } from "./types";

interface RenderedEdge {
  edge: PointerEdge;
  path: string;
  color: string;
  marker: string;
}

const stackEndpoint = (frameId: string, variableId: string) =>
  `stack:${frameId}:${variableId}`;
const heapEndpoint = (block: HeapBlock) => `heap:${block.allocationId ?? block.rawAddr}`;

function sourceEndpoint(edge: PointerEdge, frames: StackFrame[], heap: HeapBlock[]) {
  if (!edge.fromVar.includes("->")) {
    const source = frames.find((frame) => frame.id === edge.fromFrameId)?.variables
      .find((variable) => variable.variableId === edge.fromVariableId || variable.name === edge.fromVar.replace(".data()", ""));
    return source ? stackEndpoint(edge.fromFrameId, source.variableId ?? source.name) : "warning";
  }
  const [owner, field] = edge.fromVar.split("->");
  const block = heap.find(
    (candidate) => candidate.label === owner || candidate.label.startsWith(owner) || candidate.rawAddr === owner,
  );
  return block ? `heap-field:${block.allocationId ?? block.rawAddr}:${field}` : "warning";
}

function targetEndpoint(edge: PointerEdge, frames: StackFrame[], heap: HeapBlock[]) {
  if (edge.isDangling || edge.target?.kind === "unknown") return "warning";
  if (edge.target?.kind === "stack") return stackEndpoint(edge.target.frameId, edge.target.variableId);
  if (edge.target?.kind === "heap") return `heap:${edge.target.allocationId}`;
  const block = heap.find((candidate) => candidate.rawAddr === edge.toRawAddr);
  if (block) return heapEndpoint(block);
  const stackTarget = frames.flatMap((frame) =>
    frame.variables.map((variable) => ({ frame, variable })),
  ).find(({ variable }) => variable.rawAddress === edge.toRawAddr);
  return stackTarget ? stackEndpoint(stackTarget.frame.id, stackTarget.variable.variableId ?? stackTarget.variable.name) : "warning";
}

export function MemoryCanvas({ snapshot, className = "", approximate = false }: {
  snapshot: MemorySnapshot | null;
  className?: string;
  approximate?: boolean;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const endpoints = useRef(new Map<string, HTMLElement>());
  const frameRequest = useRef<number | null>(null);
  const [renderedEdges, setRenderedEdges] = useState<RenderedEdge[]>([]);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  const registerEndpoint = useCallback((key: string) => (element: HTMLElement | null) => {
    if (element) endpoints.current.set(key, element);
    else endpoints.current.delete(key);
  }, []);

  const calculateEdges = useCallback(() => {
    const container = scrollRef.current;
    if (!container || !snapshot) return setRenderedEdges([]);
    const containerRect = container.getBoundingClientRect();
    const totals = new Map<string, number>();
    snapshot.pointers.forEach((edge) => {
      const key = targetEndpoint(edge, snapshot.callStack, snapshot.heap);
      totals.set(key, (totals.get(key) ?? 0) + 1);
    });
    const indexes = new Map<string, number>();
    const paths: RenderedEdge[] = [];
    for (const edge of snapshot.pointers) {
      const sourceKey = sourceEndpoint(edge, snapshot.callStack, snapshot.heap);
      const targetKey = targetEndpoint(edge, snapshot.callStack, snapshot.heap);
      const source = endpoints.current.get(sourceKey);
      const target = endpoints.current.get(targetKey);
      if (!source || !target) continue;
      const sourceRect = source.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const stackTarget = targetKey.startsWith("stack:");
      const x1 = sourceRect.right - containerRect.left + container.scrollLeft;
      const y1 = sourceRect.top + sourceRect.height / 2 - containerRect.top + container.scrollTop;
      const index = indexes.get(targetKey) ?? 0;
      indexes.set(targetKey, index + 1);
      const spread = (index - ((totals.get(targetKey) ?? 1) - 1) / 2) * 5;
      const x2 = (stackTarget ? targetRect.right : targetRect.left) - containerRect.left + container.scrollLeft;
      const y2 = targetRect.top + targetRect.height / 2 - containerRect.top + container.scrollTop + spread;
      const path = sourceKey.startsWith("stack:") && stackTarget
        ? (() => {
            const detour = Math.min(80, Math.max(36, Math.abs(y2 - y1) * 0.35));
            const bendX = Math.max(x1, x2) + detour;
            return `M ${x1} ${y1} C ${bendX} ${y1}, ${bendX} ${y2}, ${x2} ${y2}`;
          })()
        : (() => {
            const span = Math.max(48, Math.abs(x2 - x1) * 0.48);
            return `M ${x1} ${y1} C ${x1 + span} ${y1}, ${x2 - span} ${y2}, ${x2} ${y2}`;
          })();
      const relation = edge.isDangling ? "dangling_ptr" : edge.relationKind;
      const color = relation === "dangling_ptr" ? "#ef4444" : relation === "smart_ptr" ? "#38bdf8" : relation === "reference" ? "#94a3b8" : "#10b981";
      const marker = relation === "dangling_ptr" ? "red" : relation === "smart_ptr" ? "blue" : relation === "reference" ? "gray" : "green";
      paths.push({ edge, path, color, marker });
    }
    setCanvasSize({ width: container.scrollWidth, height: container.scrollHeight });
    setRenderedEdges(paths);
  }, [snapshot]);

  const scheduleCalculation = useCallback(() => {
    if (frameRequest.current !== null) cancelAnimationFrame(frameRequest.current);
    frameRequest.current = requestAnimationFrame(() => {
      frameRequest.current = null;
      calculateEdges();
    });
  }, [calculateEdges]);

  useLayoutEffect(scheduleCalculation, [scheduleCalculation]);
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const observer = new ResizeObserver(scheduleCalculation);
    observer.observe(container);
    endpoints.current.forEach((element) => observer.observe(element));
    container.addEventListener("scroll", scheduleCalculation, { passive: true });
    return () => {
      observer.disconnect();
      container.removeEventListener("scroll", scheduleCalculation);
      if (frameRequest.current !== null) cancelAnimationFrame(frameRequest.current);
    };
  }, [scheduleCalculation, snapshot]);

  if (!snapshot) {
    return <div className={`memory-canvas-empty ${className}`}>运行代码或选择预置轨迹后，将在这里显示栈与堆。</div>;
  }

  return (
    <div className={`memory-canvas-shell ${className}`}>
      {approximate && <div className="memory-mode-notice" role="status">Regex 近似教学视图：对象关系由源码结构推演，不代表完整运行时语义。</div>}
      <div ref={scrollRef} className="memory-canvas-root">
        <svg className="memory-edges-layer" width={canvasSize.width} height={canvasSize.height} aria-hidden="true">
          <defs>
            {[["green", "#10b981"], ["blue", "#38bdf8"], ["gray", "#94a3b8"], ["red", "#ef4444"]].map(([name, color]) => (
              <marker key={name} id={`memory-arrow-${name}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                <path d="M 0 1 L 9 5 L 0 9 z" fill={color} />
              </marker>
            ))}
          </defs>
          {renderedEdges.map(({ edge, path, color, marker }) => (
            <path key={edge.id} d={path} fill="none" stroke={color}
              strokeWidth={edge.relationKind === "smart_ptr" ? 3 : 2}
              strokeDasharray={edge.isDangling ? "7 5" : edge.relationKind === "reference" ? "2 5" : undefined}
              markerEnd={`url(#memory-arrow-${marker})`}
              className={edge.isDangling ? "memory-edge-path dangling-edge" : "memory-edge-path"} />
          ))}
        </svg>

        <section className="memory-zone stack-zone" aria-labelledby="memory-stack-title">
          <header className="zone-header"><span aria-hidden="true">STACK</span><h3 id="memory-stack-title">调用栈</h3><span className="zone-count">{snapshot.callStack.length} 帧</span></header>
          <div className="stack-frames-list">
            {snapshot.callStack.length === 0 ? <div className="empty-zone-tip">调用栈已清空</div> : snapshot.callStack.map((frame, frameIndex) => (
              <article key={frame.id} className="stack-frame-card">
                <header className="frame-header"><span>{frame.name}()</span><span className="frame-depth">Frame {frameIndex} · Scope {frame.scopeDepth ?? 0}</span></header>
                <div className="frame-variables">
                  {frame.variables.length === 0 ? <div className="empty-zone-tip">暂无局部变量</div> : frame.variables.map((variable) => (
                    <div key={variable.variableId ?? variable.name} className={`var-row var-status-${variable.status}`}
                      ref={registerEndpoint(stackEndpoint(frame.id, variable.variableId ?? variable.name))} data-endpoint={stackEndpoint(frame.id, variable.variableId ?? variable.name)}>
                      <div className="var-meta"><span className="var-type">{variable.type}</span><strong className="var-name">{variable.name}</strong></div>
                      <div className="var-val-wrapper"><span className={variable.isPointer ? "var-value pointer-val" : "var-value"}>{variable.value}</span>
                        {variable.isPointer && <span className={`var-anchor-dot relation-${variable.relationKind ?? "raw_ptr"}`} aria-hidden="true" />}</div>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="memory-zone heap-zone" aria-labelledby="memory-heap-title">
          <header className="zone-header"><span aria-hidden="true">HEAP</span><h3 id="memory-heap-title">动态内存</h3><span className="zone-count">{snapshot.heap.length} 块</span></header>
          <div className="heap-blocks-list">
            {snapshot.heap.length === 0 ? <div className="empty-zone-tip">未发生动态内存分配</div> : snapshot.heap.map((block) => (
              <article key={block.allocationId ?? block.rawAddr} className={`heap-block-card heap-status-${block.status}`}
                ref={registerEndpoint(heapEndpoint(block))} data-endpoint={heapEndpoint(block)}>
                <header className="heap-card-header"><span className="heap-tag">{block.label}</span><span className="heap-header-meta">
                  {block.useCount !== undefined && <span className="ref-count-badge">rc: {block.useCount}</span>}
                  {block.weakCount !== undefined && <span className="ref-count-badge">weak: {block.weakCount}</span>}
                  <span className="heap-size">{block.size}B</span></span></header>
                <div className="heap-card-body"><div>类型: <strong>{block.type}</strong></div><div className="heap-addr">{block.rawAddr}</div>
                  {Object.entries(block.fields ?? {}).map(([field, value]) => (
                    <div key={field} className="heap-field" ref={registerEndpoint(`heap-field:${block.allocationId ?? block.rawAddr}:${field}`)} data-endpoint={`heap-field:${block.allocationId ?? block.rawAddr}:${field}`}><span>.{field}</span><code>{value}</code></div>
                  ))}
                  <span className={`heap-badge ${block.status}-badge`}>{block.status.toUpperCase()}</span></div>
              </article>
            ))}
          </div>
        </section>
        <div ref={registerEndpoint("warning")} data-endpoint="warning" className="memory-warning-anchor" aria-hidden="true">!</div>
      </div>
    </div>
  );
}
