import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
  BaseEdge,
  getBezierPath,
  useReactFlow,
  type Node,
  type Edge,
  type EdgeProps,
  type NodeTypes,
  type EdgeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import ELK from "elkjs/lib/elk.bundled.js";
import { StackFrameNode, HeapBlockNode, visualizerNodeTypes } from "./nodes";
import type {
  MemorySnapshot,
  PointerEdge as SnapshotPointerEdge,
} from "../../visualizer/types";

const elk = new ELK();

// ==========================================
// 1. 自定义指针连接边 (SmoothPointerEdge)
// ==========================================
export function SmoothPointerEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
}: EdgeProps<Edge<{ edge?: SnapshotPointerEdge }>>) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    curvature: 0.35,
  });

  const isDangling = Boolean(data?.edge?.isDangling);
  const isSmart = Boolean(data?.edge?.isSmart);

  // 颜色语义：悬挂指针(红) · 智能指针(蓝/紫) · 原生指针(绿)
  const strokeColor = isDangling ? "#ef4444" : isSmart ? "#38bdf8" : "#10b981";

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: strokeColor,
          strokeWidth: isDangling ? 2.5 : 2,
          strokeDasharray: isDangling ? "6, 4" : undefined,
          animation: isDangling ? "dash-animation 1s linear infinite" : undefined,
          filter: isDangling ? "drop-shadow(0 0 5px rgba(239, 68, 68, 0.7))" : undefined,
        }}
      />
      {/* 出发点圆锚 */}
      <circle cx={sourceX} cy={sourceY} r={3.5} fill={strokeColor} />
      {/* 终止点箭头多边形 */}
      <polygon
        points={`${targetX},${targetY} ${targetX - 7},${targetY - 4.5} ${targetX - 7},${targetY + 4.5}`}
        fill={strokeColor}
      />
      {/* 指针变量标注卡片 */}
      {data?.edge && (
        <foreignObject
          width={130}
          height={26}
          x={labelX - 65}
          y={labelY - 13}
          style={{ overflow: "visible", pointerEvents: "none" }}
        >
          <div
            style={{
              background: "rgba(11, 15, 23, 0.88)",
              border: `1px solid ${strokeColor}`,
              borderRadius: "4px",
              padding: "1px 6px",
              fontSize: "10.5px",
              color: strokeColor,
              textAlign: "center",
              fontFamily: "var(--mono, monospace)",
              whiteSpace: "nowrap",
              backdropFilter: "blur(6px)",
              boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
            }}
          >
            {isDangling ? "⚠️ 悬挂指针" : data.edge.fromVar}
          </div>
        </foreignObject>
      )}
    </>
  );
}

const customNodeTypes: NodeTypes = visualizerNodeTypes;

const customEdgeTypes: EdgeTypes = {
  smoothPointerEdge: SmoothPointerEdge,
};

// ==========================================
// 2. ELKjs 拓扑自动分层布局计算
// ==========================================
export async function calculateTopologyLayout(
  nodes: Node[],
  edges: Edge[],
  direction: "RIGHT" | "DOWN" = "RIGHT",
): Promise<{ nodes: Node[]; edges: Edge[] }> {
  if (nodes.length === 0) {
    return { nodes: [], edges: [] };
  }

  const isHorizontal = direction === "RIGHT";

  const elkGraph = {
    id: "root",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": direction,
      "elk.spacing.nodeNode": isHorizontal ? "42" : "50",
      "elk.layered.spacing.nodeNodeBetweenLayers": isHorizontal ? "95" : "75",
      "elk.layered.spacing.edgeNodeBetweenLayers": "38",
      "elk.layered.nodePlacement.strategy": "NETWORK_SIMPLEX",
      "elk.padding": "[top=32,left=32,bottom=32,right=32]",
    },
    children: nodes.map((node) => ({
      id: node.id,
      width: node.id.startsWith("stack-") ? 280 : 260,
      height: node.id.startsWith("stack-") ? 180 : 160,
    })),
    edges: edges.map((edge) => ({
      id: edge.id,
      sources: [edge.source],
      targets: [edge.target],
    })),
  };

  try {
    const layouted = await elk.layout(elkGraph);
    const layoutedNodes = nodes.map((node) => {
      const elkNode = layouted.children?.find((n) => n.id === node.id);
      return {
        ...node,
        position: {
          x: elkNode?.x ?? node.position.x,
          y: elkNode?.y ?? node.position.y,
        },
      };
    });

    return { nodes: layoutedNodes, edges };
  } catch (err) {
    console.error("ELKjs 拓扑排版计算异常，采用网格回退方案:", err);
    // 回退网格排版
    let stackIdx = 0;
    let heapIdx = 0;
    const fallbackNodes = nodes.map((node) => {
      if (node.id.startsWith("stack-")) {
        const pos = isHorizontal
          ? { x: 40, y: 40 + stackIdx * 200 }
          : { x: 40 + stackIdx * 300, y: 40 };
        stackIdx++;
        return { ...node, position: pos };
      }
      const pos = isHorizontal
        ? { x: 380 + (heapIdx % 2) * 280, y: 40 + Math.floor(heapIdx / 2) * 190 }
        : { x: 40 + (heapIdx % 2) * 280, y: 280 + Math.floor(heapIdx / 2) * 190 };
      heapIdx++;
      return { ...node, position: pos };
    });
    return { nodes: fallbackNodes, edges };
  }
}

// ==========================================
// 3. 画布接口定义
// ==========================================
export interface VisualizerViewProps {
  snapshot?: MemorySnapshot | null;
  nodes?: Node[];
  edges?: Edge[];
  direction?: "RIGHT" | "DOWN";
  className?: string;
  style?: React.CSSProperties;
  showMinimap?: boolean;
  showControls?: boolean;
  showToolbar?: boolean;
  showStepBanner?: boolean;
  onNodeClick?: (event: React.MouseEvent, node: Node) => void;
}

// ==========================================
// 4. 内部 Canvas 组件（由 ReactFlowProvider 托管）
// ==========================================
export function VisualizerCanvas({
  snapshot,
  nodes: externalNodes,
  edges: externalEdges,
  direction: initialDirection = "RIGHT",
  className = "",
  style,
  showMinimap = true,
  showControls = true,
  showToolbar = true,
  showStepBanner = true,
  onNodeClick,
}: VisualizerViewProps) {
  const { fitView } = useReactFlow();
  const [direction, setDirection] = useState<"RIGHT" | "DOWN">(initialDirection);
  const [minimapVisible, setMinimapVisible] = useState(showMinimap);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [isLayouting, setIsLayouting] = useState(false);
  const prevStepRef = useRef<number | null>(null);

  // 1. 将 MemorySnapshot 转化为 XYFlow 节点与连线
  const { rawNodes, rawEdges } = useMemo(() => {
    if (externalNodes && externalEdges) {
      return { rawNodes: externalNodes, rawEdges: externalEdges };
    }
    if (!snapshot) {
      return { rawNodes: [], rawEdges: [] };
    }

    const nList: Node[] = [];
    const eList: Edge[] = [];

    // 栈帧节点
    for (const frame of snapshot.callStack) {
      nList.push({
        id: `stack-${frame.id}`,
        type: "stackFrameNode",
        position: { x: 0, y: 0 },
        data: { frame },
      });
    }

    // 堆内存块节点
    for (const block of snapshot.heap) {
      nList.push({
        id: `heap-${block.rawAddr}`,
        type: "heapBlockNode",
        position: { x: 0, y: 0 },
        data: { block },
      });
    }

    // 指针关系边
    for (const ptr of snapshot.pointers) {
      const isInternalField = ptr.fromVar.includes("->");
      const sourceNodeId = isInternalField
        ? `heap-${ptr.fromVar.split("->")[0].replace("Node#1", "0x3010").replace("Node#2", "0x3020").replace("Node#3", "0x3030")}`
        : `stack-${ptr.fromFrameId}`;
      const targetNodeId = `heap-${ptr.toRawAddr}`;

      eList.push({
        id: ptr.id,
        type: "smoothPointerEdge",
        source: sourceNodeId,
        target: targetNodeId,
        sourceHandle: isInternalField
          ? `field-${ptr.fromVar.split("->")[1] || "next"}`
          : `var-${ptr.fromVar.replace(".data()", "")}`,
        targetHandle: "heap-target",
        data: { edge: ptr },
      });
    }

    return { rawNodes: nList, rawEdges: eList };
  }, [snapshot, externalNodes, externalEdges]);

  // 2. 当数据发生变化时，利用 ELKjs 计算自动排版
  const runLayout = useCallback(
    (targetDirection: "RIGHT" | "DOWN") => {
      if (rawNodes.length === 0) {
        setNodes([]);
        setEdges([]);
        return;
      }

      setIsLayouting(true);
      calculateTopologyLayout(rawNodes, rawEdges, targetDirection).then(
        ({ nodes: layoutedNodes, edges: layoutedEdges }) => {
          setNodes(layoutedNodes);
          setEdges(layoutedEdges);
          setIsLayouting(false);

          // 步骤变更或初次渲染时自动聚焦
          setTimeout(() => {
            fitView({ duration: 320, padding: 0.18 });
          }, 60);
        },
      );
    },
    [rawNodes, rawEdges, fitView],
  );

  useEffect(() => {
    runLayout(direction);
  }, [runLayout, direction, snapshot?.stepIndex]);

  // 统计指标
  const metrics = useMemo(() => {
    const stackCount = snapshot?.callStack.length || 0;
    const heapCount = snapshot?.heap.length || 0;
    const aliveHeapCount = snapshot?.heap.filter((h) => h.status === "alive").length || 0;
    const ptrCount = snapshot?.pointers.length || 0;
    const danglingCount = snapshot?.pointers.filter((p) => p.isDangling).length || 0;
    const leakedCount = snapshot?.heap.filter((h) => h.status === "leaked").length || 0;

    return { stackCount, heapCount, aliveHeapCount, ptrCount, danglingCount, leakedCount };
  }, [snapshot]);

  // 空状态提示
  if (!snapshot && (!externalNodes || externalNodes.length === 0)) {
    return (
      <div
        className={`visualizer-canvas-empty ${className}`}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          minHeight: "450px",
          background: "#080c14",
          color: "#94a3b8",
          fontFamily: "var(--mono, monospace)",
          padding: "32px",
          textAlign: "center",
          gap: "12px",
          ...style,
        }}
      >
        <div style={{ fontSize: "36px", filter: "drop-shadow(0 4px 12px rgba(56, 189, 248, 0.25))" }}>
          🥞 ➔ 📦
        </div>
        <div style={{ fontSize: "15px", fontWeight: 600, color: "#e2e8f0" }}>
          C++ 内存拓扑画布就绪 (React Flow Canvas)
        </div>
        <div style={{ fontSize: "12px", color: "#64748b", maxWidth: "420px", lineHeight: "1.6" }}>
          等待载入执行轨迹或编译运行。单步执行时，函数栈帧与堆块将在本画布自动分层排版并连接指针。
        </div>
      </div>
    );
  }

  return (
    <div
      className={`visualizer-canvas-wrapper ${className}`}
      style={{
        width: "100%",
        height: "100%",
        minHeight: "480px",
        position: "relative",
        background: "#080c14",
        overflow: "hidden",
        ...style,
      }}
    >
      {/* 顶部工具栏：布局切换、自适应全屏与内存统计 */}
      {showToolbar && (
        <div
          style={{
            position: "absolute",
            top: "12px",
            left: "12px",
            right: "12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            zIndex: 10,
            pointerEvents: "none",
            gap: "8px",
            flexWrap: "wrap",
          }}
        >
          {/* 左侧控制按钮组 */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              background: "rgba(18, 24, 36, 0.88)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              backdropFilter: "blur(8px)",
              borderRadius: "6px",
              padding: "4px 8px",
              pointerEvents: "auto",
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
            }}
          >
            {/* 排版方向切换 */}
            <button
              type="button"
              onClick={() => {
                const nextDir = direction === "RIGHT" ? "DOWN" : "RIGHT";
                setDirection(nextDir);
                runLayout(nextDir);
              }}
              title="切换拓扑排版方向（水平向右 / 垂直向下）"
              style={{
                background: "transparent",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                color: "#cbd5e1",
                padding: "3px 8px",
                borderRadius: "4px",
                fontSize: "11px",
                fontFamily: "var(--mono, monospace)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <span>{direction === "RIGHT" ? "➔ 水平流" : "⬇ 垂直流"}</span>
            </button>

            {/* 重新计算排版 */}
            <button
              type="button"
              onClick={() => runLayout(direction)}
              disabled={isLayouting}
              title="重新运行 ELKjs 智能排版"
              style={{
                background: isLayouting ? "rgba(56, 189, 248, 0.1)" : "transparent",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                color: isLayouting ? "#38bdf8" : "#94a3b8",
                padding: "3px 8px",
                borderRadius: "4px",
                fontSize: "11px",
                fontFamily: "var(--mono, monospace)",
                cursor: isLayouting ? "wait" : "pointer",
              }}
            >
              {isLayouting ? "⚡ 排版中..." : "↺ 重排"}
            </button>

            {/* 自适应视口 */}
            <button
              type="button"
              onClick={() => fitView({ duration: 250, padding: 0.18 })}
              title="聚焦居中所有节点"
              style={{
                background: "transparent",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                color: "#94a3b8",
                padding: "3px 8px",
                borderRadius: "4px",
                fontSize: "11px",
                fontFamily: "var(--mono, monospace)",
                cursor: "pointer",
              }}
            >
              ⛶ 适应
            </button>

            {/* 切换小地图 */}
            <button
              type="button"
              onClick={() => setMinimapVisible((prev) => !prev)}
              title="显示/隐藏导航小地图"
              style={{
                background: minimapVisible ? "rgba(56, 189, 248, 0.15)" : "transparent",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                color: minimapVisible ? "#38bdf8" : "#64748b",
                padding: "3px 8px",
                borderRadius: "4px",
                fontSize: "11px",
                fontFamily: "var(--mono, monospace)",
                cursor: "pointer",
              }}
            >
              🗺 小地图
            </button>
          </div>

          {/* 右侧内存拓扑统计 */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              background: "rgba(18, 24, 36, 0.88)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              backdropFilter: "blur(8px)",
              borderRadius: "6px",
              padding: "4px 10px",
              pointerEvents: "auto",
              fontSize: "11px",
              fontFamily: "var(--mono, monospace)",
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
            }}
          >
            <span style={{ color: "#38bdf8" }}>栈帧 {metrics.stackCount}</span>
            <span style={{ color: "#475569" }}>·</span>
            <span style={{ color: "#10b981" }}>堆块 {metrics.aliveHeapCount}</span>
            <span style={{ color: "#475569" }}>·</span>
            <span style={{ color: "#a855f7" }}>指针 {metrics.ptrCount}</span>
            {metrics.danglingCount > 0 && (
              <>
                <span style={{ color: "#475569" }}>·</span>
                <span style={{ color: "#ef4444", fontWeight: 700 }}>
                  ⚠️ 野指针 {metrics.danglingCount}
                </span>
              </>
            )}
            {metrics.leakedCount > 0 && (
              <>
                <span style={{ color: "#475569" }}>·</span>
                <span style={{ color: "#f59e0b", fontWeight: 700 }}>
                  🚨 泄漏 {metrics.leakedCount}
                </span>
              </>
            )}
          </div>
        </div>
      )}

      {/* 主 React Flow 画布 */}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={customNodeTypes}
        edgeTypes={customEdgeTypes}
        fitView
        minZoom={0.15}
        maxZoom={2.2}
        proOptions={{ hideAttribution: true }}
        onNodeClick={onNodeClick}
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#1e293b" />
        
        {showControls && (
          <Controls
            style={{
              background: "#121824",
              border: "1px solid #1e293b",
              borderRadius: "6px",
              fill: "#94a3b8",
              bottom: "70px",
            }}
          />
        )}

        {minimapVisible && (
          <MiniMap
            nodeColor={(n) => {
              if (n.id.startsWith("stack-")) return "#3b82f6";
              const blockStatus = (n.data as any)?.block?.status;
              if (blockStatus === "freed") return "#475569";
              if (blockStatus === "leaked") return "#ef4444";
              return "#10b981";
            }}
            maskColor="rgba(8, 12, 20, 0.78)"
            style={{
              background: "#0d131d",
              border: "1px solid #1e293b",
              borderRadius: "6px",
              width: 130,
              height: 90,
              bottom: "70px",
            }}
          />
        )}
      </ReactFlow>

      {/* 底部浮动信息条：显示当前步进与安全告警 */}
      {showStepBanner && snapshot && (
        <div
          style={{
            position: "absolute",
            bottom: "12px",
            left: "12px",
            right: "12px",
            display: "flex",
            flexDirection: "column",
            gap: "6px",
            pointerEvents: "none",
            zIndex: 10,
          }}
        >
          {snapshot.warnings && snapshot.warnings.length > 0 && (
            <div
              style={{
                background: "rgba(239, 68, 68, 0.18)",
                border: "1px solid rgba(239, 68, 68, 0.45)",
                backdropFilter: "blur(10px)",
                borderRadius: "6px",
                padding: "8px 12px",
                color: "#fca5a5",
                fontSize: "12px",
                fontFamily: "var(--mono, monospace)",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                boxShadow: "0 4px 16px rgba(239, 68, 68, 0.2)",
              }}
            >
              <span style={{ fontSize: "14px" }}>⚠️</span>
              <div style={{ flex: 1 }}>{snapshot.warnings.join(" ； ")}</div>
            </div>
          )}

          <div
            style={{
              background: "rgba(18, 24, 36, 0.92)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              backdropFilter: "blur(10px)",
              borderRadius: "6px",
              padding: "7px 12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
              boxShadow: "0 4px 14px rgba(0, 0, 0, 0.4)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", overflow: "hidden" }}>
              <span
                style={{
                  fontSize: "11px",
                  color: "#f59e0b",
                  fontFamily: "var(--mono, monospace)",
                  fontWeight: 600,
                  background: "rgba(245, 158, 11, 0.12)",
                  padding: "2px 6px",
                  borderRadius: "4px",
                  whiteSpace: "nowrap",
                }}
              >
                第 {snapshot.stepIndex + 1} 步 · 行 {snapshot.line}
              </span>
              <span
                style={{
                  fontSize: "12.5px",
                  color: "#e2e8f0",
                  whiteSpace: "nowrap",
                  textOverflow: "ellipsis",
                  overflow: "hidden",
                }}
              >
                {snapshot.description}
              </span>
            </div>

            <span
              style={{
                fontSize: "11px",
                color: "#64748b",
                fontFamily: "var(--mono, monospace)",
                whiteSpace: "nowrap",
              }}
            >
              ELKjs 自动拓扑引擎
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// 5. 顶层导出的 VisualizerView 组件（封装 ReactFlowProvider）
// ==========================================
export function VisualizerView(props: VisualizerViewProps) {
  return (
    <ReactFlowProvider>
      <VisualizerCanvas {...props} />
    </ReactFlowProvider>
  );
}

export default VisualizerView;
