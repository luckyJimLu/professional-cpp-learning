import { useEffect, useRef, useState } from "react";
import type { MemorySnapshot, PointerEdge } from "./types";

interface AnchorPoint {
  x: number;
  y: number;
}

export function MemoryCanvas({
  snapshot,
  className = "",
}: {
  snapshot: MemorySnapshot | null;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredVar, setHoveredVar] = useState<string | null>(null);
  const [edgePaths, setEdgePaths] = useState<
    Array<{
      edge: PointerEdge;
      d: string;
      color: string;
      isDangling: boolean;
    }>
  >([]);

  // 动态计算 SVG 连线坐标
  const updateEdgeCoordinates = () => {
    if (!containerRef.current || !snapshot) {
      setEdgePaths([]);
      return;
    }

    const containerRect = containerRef.current.getBoundingClientRect();
    const newPaths: typeof edgePaths = [];

    for (const edge of snapshot.pointers) {
      const sourceEl = containerRef.current.querySelector(
        `[data-var-anchor="${edge.fromVar}"]`,
      );
      const targetEl = containerRef.current.querySelector(
        `[data-heap-anchor="${edge.toRawAddr}"]`,
      );

      if (sourceEl && targetEl) {
        const srcRect = sourceEl.getBoundingClientRect();
        const tgtRect = targetEl.getBoundingClientRect();

        // 计算相对容器的坐标（源点取右端点，终点取左端点）
        const x1 = srcRect.right - containerRect.left;
        const y1 = srcRect.top + srcRect.height / 2 - containerRect.top;
        const x2 = tgtRect.left - containerRect.left;
        const y2 = tgtRect.top + tgtRect.height / 2 - containerRect.top;

        // 三次贝塞尔曲线控制点
        const dx = Math.max(30, Math.abs(x2 - x1) * 0.5);
        const pathData = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;

        const isDangling = Boolean(edge.isDangling);
        const color = isDangling
          ? "#ef4444"
          : edge.isSmart
            ? "#38bdf8"
            : "#10b981";

        newPaths.push({
          edge,
          d: pathData,
          color,
          isDangling,
        });
      }
    }

    setEdgePaths(newPaths);
  };

  useEffect(() => {
    // 渲染后或 DOM 变动后重新计算连线位置
    const timer = setTimeout(updateEdgeCoordinates, 50);
    window.addEventListener("resize", updateEdgeCoordinates);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", updateEdgeCoordinates);
    };
  }, [snapshot]);

  if (!snapshot) {
    return (
      <div className={`memory-canvas empty ${className}`}>
        <p>暂无内存快照数据</p>
      </div>
    );
  }

  const { callStack, heap } = snapshot;

  return (
    <div ref={containerRef} className={`memory-canvas-root ${className}`}>
      {/* SVG 连线图层 */}
      <svg className="memory-edges-layer" aria-hidden="true">
        <defs>
          <marker
            id="arrow-green"
            viewBox="0 0 10 10"
            refX="6"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 1 L 8 5 L 0 9 z" fill="#10b981" />
          </marker>
          <marker
            id="arrow-blue"
            viewBox="0 0 10 10"
            refX="6"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 1 L 8 5 L 0 9 z" fill="#38bdf8" />
          </marker>
          <marker
            id="arrow-red"
            viewBox="0 0 10 10"
            refX="6"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 1 L 8 5 L 0 9 z" fill="#ef4444" />
          </marker>
        </defs>

        {edgePaths.map(({ edge, d, color, isDangling }) => {
          const isHovered = hoveredVar === edge.fromVar;
          const markerId = isDangling
            ? "url(#arrow-red)"
            : edge.isSmart
              ? "url(#arrow-blue)"
              : "url(#arrow-green)";

          return (
            <path
              key={edge.id}
              d={d}
              fill="none"
              stroke={color}
              strokeWidth={isHovered ? 3.5 : 2}
              strokeDasharray={isDangling ? "5,4" : undefined}
              markerEnd={markerId}
              className={`memory-edge-path ${isDangling ? "dangling-edge" : ""} ${
                isHovered ? "hovered-edge" : ""
              }`}
            />
          );
        })}
      </svg>

      {/* 栈区 (Call Stack) */}
      <div className="memory-zone stack-zone">
        <div className="zone-header">
          <span className="zone-icon">🥞</span>
          <h3>栈区 (Call Stack)</h3>
          <span className="zone-count">{callStack.length} 帧</span>
        </div>

        <div className="stack-frames-list">
          {callStack.length === 0 ? (
            <div className="empty-zone-tip">空栈 (调用栈已清空)</div>
          ) : (
            callStack.map((frame, frameIdx) => (
              <div key={frame.id} className="stack-frame-card">
                <div className="frame-header">
                  <span className="frame-name">{frame.name}()</span>
                  <span className="frame-depth">#Frame {frameIdx}</span>
                </div>

                <div className="frame-variables">
                  {frame.variables.length === 0 ? (
                    <div className="no-vars-tip">无局部变量</div>
                  ) : (
                    frame.variables.map((v) => {
                      const isHovered = hoveredVar === v.name;
                      return (
                        <div
                          key={v.name}
                          className={`var-row var-status-${v.status} ${
                            isHovered ? "var-hovered" : ""
                          }`}
                          onMouseEnter={() => setHoveredVar(v.name)}
                          onMouseLeave={() => setHoveredVar(null)}
                        >
                          <div className="var-meta">
                            <span className="var-type">{v.type}</span>
                            <span className="var-name">{v.name}</span>
                          </div>

                          <div className="var-val-wrapper">
                            <span
                              className={`var-value ${
                                v.isPointer ? "pointer-val" : ""
                              }`}
                            >
                              {v.value}
                            </span>
                            {v.isPointer && (
                              <span
                                className="var-anchor-dot"
                                data-var-anchor={v.name}
                                title={`指针锚点: ${v.name}`}
                              />
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 堆区 (Heap) */}
      <div className="memory-zone heap-zone">
        <div className="zone-header">
          <span className="zone-icon">📦</span>
          <h3>堆区 (Heap Memory)</h3>
          <span className="zone-count">{heap.length} 块</span>
        </div>

        <div className="heap-blocks-list">
          {heap.length === 0 ? (
            <div className="empty-zone-tip">堆区为空 (未发生动态内存分配)</div>
          ) : (
            heap.map((block) => (
              <div
                key={block.rawAddr}
                className={`heap-block-card heap-status-${block.status}`}
                data-heap-anchor={block.rawAddr}
              >
                <div className="heap-card-header">
                  <span className="heap-tag">{block.label}</span>
                  <span className="heap-size">{block.size}B</span>
                </div>

                <div className="heap-card-body">
                  <div className="heap-type">
                    类型: <strong>{block.type}</strong>
                  </div>
                  <div className="heap-addr">地址: {block.rawAddr}</div>
                  {block.status === "freed" && (
                    <div className="heap-badge freed-badge">已释放 (Freed)</div>
                  )}
                  {block.status === "leaked" && (
                    <div className="heap-badge leaked-badge">
                      内存泄漏 (Leaked)
                    </div>
                  )}
                  {block.status === "alive" && (
                    <div className="heap-badge alive-badge">活跃 (In Use)</div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
