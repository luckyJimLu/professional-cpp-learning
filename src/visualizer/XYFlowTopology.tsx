import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  BackgroundVariant,
  Handle,
  Position,
  BaseEdge,
  getBezierPath,
  type Node,
  type Edge,
  type NodeProps,
  type EdgeProps,
  type NodeTypes,
  type EdgeTypes,
  useReactFlow,
  ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import ELK from "elkjs/lib/elk.bundled.js";
import type { MemorySnapshot, StackFrame, HeapBlock, PointerEdge as SnapshotPointerEdge } from "./types";
import { StackFrameNode, HeapBlockNode } from "../components/visualizer/nodes";

const elk = new ELK();





// ==========================================
// 3. 自定义边：平滑贝塞尔指针箭头 (PointerEdge)
// ==========================================
function SmoothPointerEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
}: EdgeProps<Edge<{ edge: SnapshotPointerEdge }>>) {
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

  const strokeColor = isDangling ? "#ef4444" : isSmart ? "#38bdf8" : "#10b981";

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: strokeColor,
          strokeWidth: isDangling ? 2.5 : 2,
          strokeDasharray: isDangling ? "5, 4" : undefined,
          animation: isDangling ? "dash-animation 1s linear infinite" : undefined,
          filter: isDangling ? "drop-shadow(0 0 4px rgba(239, 68, 68, 0.6))" : undefined,
        }}
      />
      {/* 箭头标记与文字提示 */}
      <circle cx={sourceX} cy={sourceY} r={3} fill={strokeColor} />
      <polygon
        points={`${targetX},${targetY} ${targetX - 7},${targetY - 4} ${targetX - 7},${targetY + 4}`}
        fill={strokeColor}
      />
      {data?.edge && (
        <foreignObject
          width={120}
          height={24}
          x={labelX - 60}
          y={labelY - 12}
          style={{ overflow: "visible", pointerEvents: "none" }}
        >
          <div
            style={{
              background: "rgba(15, 23, 42, 0.85)",
              border: `1px solid ${strokeColor}`,
              borderRadius: "4px",
              padding: "1px 6px",
              fontSize: "10px",
              color: strokeColor,
              textAlign: "center",
              fontFamily: "var(--mono, monospace)",
              whiteSpace: "nowrap",
              backdropFilter: "blur(4px)",
            }}
          >
            {isDangling ? "⚠️ 野指针" : data.edge.fromVar}
          </div>
        </foreignObject>
      )}
    </>
  );
}

const nodeTypes: NodeTypes = {
  stackFrameNode: StackFrameNode,
  heapBlockNode: HeapBlockNode,
};

const edgeTypes: EdgeTypes = {
  smoothPointerEdge: SmoothPointerEdgeComponent,
};

// ==========================================
// 4. ELKjs 拓扑自动分层布局辅助函数
// ==========================================
async function getLayoutedElements(
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
      "elk.spacing.nodeNode": isHorizontal ? "40" : "50",
      "elk.layered.spacing.nodeNodeBetweenLayers": isHorizontal ? "100" : "80",
      "elk.layered.spacing.edgeNodeBetweenLayers": "40",
      "elk.layered.nodePlacement.strategy": "NETWORK_SIMPLEX",
      "elk.padding": "[top=30,left=30,bottom=30,right=30]",
    },
    children: nodes.map((node) => ({
      id: node.id,
      width: node.id.startsWith("stack-") ? 280 : 260,
      height: node.id.startsWith("stack-") ? 180 : 150,
    })),
    edges: edges.map((edge) => ({
      id: edge.id,
      sources: [edge.source],
      targets: [edge.target],
    })),
  };

  try {
    const layout = await elk.layout(elkGraph);

    const layoutedNodes = nodes.map((node) => {
      const elkNode = layout.children?.find((c) => c.id === node.id);
      return {
        ...node,
        position: {
          x: elkNode?.x ?? 0,
          y: elkNode?.y ?? 0,
        },
      };
    });

    return { nodes: layoutedNodes, edges };
  } catch (err) {
    console.warn("ELK layout computation failed, falling back to simple grid:", err);
    // 降级回退：栈帧放左边，堆块放右边
    let stackY = 40;
    let heapY = 40;
    const fallbackNodes = nodes.map((node) => {
      if (node.id.startsWith("stack-")) {
        const pos = { x: 40, y: stackY };
        stackY += 200;
        return { ...node, position: pos };
      }
      const pos = { x: 380, y: heapY };
      heapY += 170;
      return { ...node, position: pos };
    });
    return { nodes: fallbackNodes, edges };
  }
}

// ==========================================
// 5. 内部包装组件（处理 useReactFlow 视口控制）
// ==========================================
function FlowInner({
  snapshot,
  className = "",
}: {
  snapshot: MemorySnapshot | null;
  className?: string;
}) {
  const { fitView } = useReactFlow();
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [isLayouting, setIsLayouting] = useState(false);
  const prevSnapshotStepRef = useRef<number | null>(null);

  // 根据当前快照转换 XYFlow 的 raw nodes 和 edges
  const { rawNodes, rawEdges } = useMemo(() => {
    if (!snapshot) {
      return { rawNodes: [], rawEdges: [] };
    }

    const nList: Node[] = [];
    const eList: Edge[] = [];

    // 1. 转换栈帧为节点
    for (const frame of snapshot.callStack) {
      nList.push({
        id: `stack-${frame.id}`,
        type: "stackFrameNode",
        position: { x: 0, y: 0 },
        data: { frame },
      });
    }

    // 2. 转换堆块为节点
    for (const block of snapshot.heap) {
      nList.push({
        id: `heap-${block.rawAddr}`,
        type: "heapBlockNode",
        position: { x: 0, y: 0 },
        data: { block },
      });
    }

    // 3. 转换指针引用为边
    for (const ptr of snapshot.pointers) {
      // 判断起点：可能是栈变量，也可能是堆内指针字段（如 Node#1->next）
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
  }, [snapshot]);

  // 当 snapshot 发生变化时，使用 ELKjs 计算自动布局
  useEffect(() => {
    let isCancelled = false;

    if (rawNodes.length === 0) {
      setNodes([]);
      setEdges([]);
      return;
    }

    setIsLayouting(true);
    getLayoutedElements(rawNodes, rawEdges, "RIGHT").then(({ nodes: layoutedNodes, edges: layoutedEdges }) => {
      if (isCancelled) return;
      setNodes(layoutedNodes);
      setEdges(layoutedEdges);
      setIsLayouting(false);

      // 如果步骤发生变更，自动聚焦并平滑过渡到整张图
      if (prevSnapshotStepRef.current !== snapshot?.stepIndex) {
        prevSnapshotStepRef.current = snapshot?.stepIndex ?? null;
        setTimeout(() => {
          fitView({ duration: 300, padding: 0.15 });
        }, 50);
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [rawNodes, rawEdges, fitView, snapshot?.stepIndex]);

  if (!snapshot) {
    return (
      <div
        className={`xyflow-empty ${className}`}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          color: "#64748b",
          fontFamily: "var(--mono, monospace)",
          fontSize: "13px",
          gap: "8px",
        }}
      >
        <div style={{ fontSize: "28px" }}>🥞 ➔ 📦</div>
        <div>等待编译生成内存快照或选择预置案例</div>
      </div>
    );
  }

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        background: "#080c14",
      }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        minZoom={0.2}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#1e293b" />
        <Controls
          style={{
            background: "#162032",
            border: "1px solid #1e293b",
            borderRadius: "6px",
            fill: "#94a3b8",
          }}
        />
        <MiniMap
          nodeColor={(n) => (n.id.startsWith("stack-") ? "#3b82f6" : "#10b981")}
          maskColor="rgba(8, 12, 20, 0.75)"
          style={{
            background: "#0d131d",
            border: "1px solid #1e293b",
            borderRadius: "6px",
            width: 130,
            height: 90,
          }}
        />
      </ReactFlow>

      {/* 底部浮动：当前步骤说明与告警浮层 */}
      <div
        style={{
          position: "absolute",
          bottom: "16px",
          left: "16px",
          right: "16px",
          display: "flex",
          flexDirection: "column",
          gap: "6px",
          pointerEvents: "none",
        }}
      >
        {snapshot.warnings && snapshot.warnings.length > 0 && (
          <div
            style={{
              background: "rgba(239, 68, 68, 0.15)",
              border: "1px solid rgba(239, 68, 68, 0.4)",
              backdropFilter: "blur(8px)",
              borderRadius: "6px",
              padding: "8px 12px",
              color: "#fca5a5",
              fontSize: "12px",
              fontFamily: "var(--mono, monospace)",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              pointerEvents: "auto",
            }}
          >
            <span>{snapshot.warnings[0]}</span>
          </div>
        )}

        <div
          style={{
            background: "rgba(15, 23, 42, 0.88)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            backdropFilter: "blur(8px)",
            borderRadius: "6px",
            padding: "8px 14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            pointerEvents: "auto",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span
              style={{
                fontSize: "11px",
                color: "#f59e0b",
                fontFamily: "var(--mono, monospace)",
                fontWeight: 600,
                background: "rgba(245, 158, 11, 0.12)",
                padding: "2px 6px",
                borderRadius: "4px",
              }}
            >
              Step {snapshot.stepIndex + 1} · Line {snapshot.line}
            </span>
            <span style={{ fontSize: "12.5px", color: "#e2e8f0" }}>
              {snapshot.description}
            </span>
          </div>

          <span
            style={{
              fontSize: "11px",
              color: "#64748b",
              fontFamily: "var(--mono, monospace)",
            }}
          >
            ELKjs 自动拓扑
          </span>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 6. 根导出组件 (带 ReactFlowProvider)
// ==========================================
export function XYFlowTopology({
  snapshot,
  className = "",
}: {
  snapshot: MemorySnapshot | null;
  className?: string;
}) {
  return (
    <ReactFlowProvider>
      <FlowInner snapshot={snapshot} className={className} />
    </ReactFlowProvider>
  );
}
