import { useEffect, useRef, useState, useMemo } from "react";
import * as d3 from "d3";
import type { MemorySnapshot } from "./types";

export interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  type: string;
  category: "stack_var" | "stack_obj" | "heap_block";
  value?: string;
  rawAddress?: string;
  size?: number;
  status?: string;
  frameName?: string;
  isDangling?: boolean;
}

export interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  id: string;
  source: string | GraphNode;
  target: string | GraphNode;
  isSmart?: boolean;
  isDangling?: boolean;
}

export function D3MemoryGraph({
  snapshot,
  className = "",
}: {
  snapshot: MemorySnapshot | null;
  className?: string;
}) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  // 将 MemorySnapshot 转换为图的节点和边
  const { nodes, links } = useMemo(() => {
    if (!snapshot) return { nodes: [], links: [] };

    const nodesList: GraphNode[] = [];
    const linksList: GraphLink[] = [];
    const nodeIds = new Set<string>();

    // 1. 堆内存节点
    for (const block of snapshot.heap) {
      const id = block.rawAddr;
      if (!nodeIds.has(id)) {
        nodeIds.add(id);
        nodesList.push({
          id,
          name: block.label,
          type: block.type,
          category: "heap_block",
          rawAddress: block.rawAddr,
          size: block.size,
          status: block.status,
        });
      }
    }

    // 2. 栈帧与变量节点
    for (const frame of snapshot.callStack) {
      for (const v of frame.variables) {
        const id = `${frame.id}_${v.name}`;
        if (!nodeIds.has(id)) {
          nodeIds.add(id);
          const isObj =
            Boolean(v.fields && Object.keys(v.fields).length > 0) ||
            (v.type.length > 0 && v.type[0] === v.type[0].toUpperCase() && !v.type.includes("*"));

          nodesList.push({
            id,
            name: v.name,
            type: v.type,
            category: isObj ? "stack_obj" : "stack_var",
            value: v.value,
            rawAddress: v.rawAddress,
            status: v.status,
            frameName: frame.name,
          });
        }
      }
    }

    // 3. 指针与引用边
    for (const p of snapshot.pointers) {
      const sourceId = `${p.fromFrameId}_${p.fromVar}`;
      const targetId = p.toRawAddr;

      // 仅当起点和终点节点均有效时建边
      if (nodeIds.has(sourceId) && targetId && nodeIds.has(targetId)) {
        linksList.push({
          id: p.id,
          source: sourceId,
          target: targetId,
          isSmart: p.isSmart,
          isDangling: p.isDangling,
        });
      }
    }

    return { nodes: nodesList, links: linksList };
  }, [snapshot]);

  // D3 力导向仿真渲染
  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const svg = d3.select(svgRef.current);
    const container = containerRef.current;
    const width = container.clientWidth || 600;
    const height = container.clientHeight || 480;

    // 清理先前内容
    svg.selectAll("*").remove();

    // 定义箭头标记与渐变
    const defs = svg.append("defs");

    // 智能指针箭头 (cyan)
    defs
      .append("marker")
      .attr("id", "d3-arrow-smart")
      .attr("viewBox", "0 0 10 10")
      .attr("refX", 26)
      .attr("refY", 5)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto-start-reverse")
      .append("path")
      .attr("d", "M 0 1 L 9 5 L 0 9 z")
      .attr("fill", "#38bdf8");

    // 原生指针箭头 (emerald)
    defs
      .append("marker")
      .attr("id", "d3-arrow-raw")
      .attr("viewBox", "0 0 10 10")
      .attr("refX", 26)
      .attr("refY", 5)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto-start-reverse")
      .append("path")
      .attr("d", "M 0 1 L 9 5 L 0 9 z")
      .attr("fill", "#10b981");

    // 悬挂指针箭头 (red)
    defs
      .append("marker")
      .attr("id", "d3-arrow-dangling")
      .attr("viewBox", "0 0 10 10")
      .attr("refX", 26)
      .attr("refY", 5)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto-start-reverse")
      .append("path")
      .attr("d", "M 0 1 L 9 5 L 0 9 z")
      .attr("fill", "#ef4444");

    // 主绘图图层（支持缩放和平移）
    const g = svg.append("g").attr("class", "d3-zoom-container");

    // 缩放行为
    const zoomBehavior = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 3])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    svg.call(zoomBehavior);

    if (nodes.length === 0) return;

    // 仿真模拟克隆数据
    const simNodes: GraphNode[] = nodes.map((d) => ({ ...d }));
    const simLinks: GraphLink[] = links.map((d) => ({ ...d }));

    // 初始化力导向系统
    const simulation = d3
      .forceSimulation<GraphNode>(simNodes)
      .force(
        "link",
        d3
          .forceLink<GraphNode, GraphLink>(simLinks)
          .id((d) => d.id)
          .distance(120),
      )
      .force("charge", d3.forceManyBody().strength(-300))
      .force("collide", d3.forceCollide().radius(45))
      .force("center", d3.forceCenter(width / 2, height / 2))
      // 栈区偏左，堆区偏右分群
      .force(
        "x",
        d3.forceX<GraphNode>((d) =>
          d.category === "heap_block" ? width * 0.72 : width * 0.28,
        ).strength(0.35),
      )
      .force("y", d3.forceY(height / 2).strength(0.2));

    // 绘制连线
    const link = g
      .append("g")
      .attr("class", "d3-links")
      .selectAll("line")
      .data(simLinks)
      .enter()
      .append("line")
      .attr("stroke", (d) =>
        d.isDangling ? "#ef4444" : d.isSmart ? "#38bdf8" : "#10b981",
      )
      .attr("stroke-width", (d) => (d.isSmart ? 2.5 : 2))
      .attr("stroke-dasharray", (d) => (d.isDangling ? "4,4" : "none"))
      .attr("marker-end", (d) =>
        d.isDangling
          ? "url(#d3-arrow-dangling)"
          : d.isSmart
            ? "url(#d3-arrow-smart)"
            : "url(#d3-arrow-raw)",
      )
      .attr("stroke-opacity", 0.85);

    // 拖拽处理函数
    const drag = d3
      .drag<SVGGElement, GraphNode>()
      .on("start", (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on("drag", (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on("end", (event, d) => {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });

    // 绘制节点组
    const node = g
      .append("g")
      .attr("class", "d3-nodes")
      .selectAll("g")
      .data(simNodes)
      .enter()
      .append("g")
      .attr("class", (d) => `d3-node d3-node-${d.category} d3-status-${d.status || "alive"}`)
      .call(drag as unknown as (selection: d3.Selection<SVGGElement, GraphNode, SVGGElement, unknown>) => void);

    // 节点外形卡片
    node
      .append("rect")
      .attr("width", (d) => (d.category === "heap_block" ? 110 : 96))
      .attr("height", 46)
      .attr("x", (d) => (d.category === "heap_block" ? -55 : -48))
      .attr("y", -23)
      .attr("rx", (d) => (d.category === "heap_block" ? 6 : 8))
      .attr("fill", (d) => {
        if (d.status === "freed") return "#161b22";
        if (d.status === "leaked") return "#381014";
        if (d.status === "destroyed") return "#1a202c";
        if (d.category === "heap_block") return "#0c2824";
        if (d.category === "stack_obj") return "#132337";
        return "#171d29";
      })
      .attr("stroke", (d) => {
        if (d.status === "freed") return "#4b5563";
        if (d.status === "leaked") return "#ef4444";
        if (d.status === "destroyed") return "#475569";
        if (d.category === "heap_block") return "#10b981";
        if (d.category === "stack_obj") return "#0284c7";
        return "#38bdf8";
      })
      .attr("stroke-width", (d) => (d.status === "leaked" ? 2.5 : 1.5))
      .attr("stroke-dasharray", (d) => (d.status === "freed" ? "3,3" : "none"))
      .attr("filter", "drop-shadow(0 2px 6px rgba(0,0,0,0.4))");

    // 节点类别小图标 / 徽章
    node
      .append("text")
      .attr("x", (d) => (d.category === "heap_block" ? -47 : -40))
      .attr("y", -8)
      .attr("font-size", "10px")
      .attr("font-family", "var(--mono, monospace)")
      .attr("fill", (d) => {
        if (d.category === "heap_block") return "#34d399";
        if (d.category === "stack_obj") return "#38bdf8";
        return "#f472b6";
      })
      .attr("font-weight", "600")
      .text((d) => {
        if (d.category === "heap_block") return `📦 ${d.size ? `${d.size}B` : "Heap"}`;
        if (d.category === "stack_obj") return "🧱 Obj";
        return "🏷️ Var";
      });

    // 节点名称
    node
      .append("text")
      .attr("x", 0)
      .attr("y", 8)
      .attr("text-anchor", "middle")
      .attr("font-size", "11.5px")
      .attr("font-weight", "700")
      .attr("fill", "#f1f5f9")
      .attr("font-family", "var(--mono, monospace)")
      .text((d) => {
        const title = d.name;
        return title.length > 12 ? `${title.slice(0, 10)}…` : title;
      });

    // 节点副标题（类型或值）
    node
      .append("text")
      .attr("x", 0)
      .attr("y", 18)
      .attr("text-anchor", "middle")
      .attr("font-size", "9.5px")
      .attr("fill", "#94a3b8")
      .attr("font-family", "var(--mono, monospace)")
      .text((d) => {
        if (d.category === "heap_block") return d.rawAddress || d.type;
        if (d.value && d.value !== "uninitialized") return d.value;
        return d.type;
      });

    // 鼠标悬停交互
    node
      .on("mouseenter", (event, d) => {
        setHoveredNode(d);
        const [x, y] = d3.pointer(event, container);
        setTooltipPos({ x, y });
        d3.select(event.currentTarget as SVGGElement)
          .select("rect")
          .attr("stroke-width", 3)
          .attr("filter", "drop-shadow(0 0 10px rgba(56, 189, 248, 0.6))");
      })
      .on("mousemove", (event) => {
        const [x, y] = d3.pointer(event, container);
        setTooltipPos({ x, y });
      })
      .on("mouseleave", (event, d) => {
        setHoveredNode(null);
        setTooltipPos(null);
        d3.select(event.currentTarget as SVGGElement)
          .select("rect")
          .attr("stroke-width", d.status === "leaked" ? 2.5 : 1.5)
          .attr("filter", "drop-shadow(0 2px 6px rgba(0,0,0,0.4))");
      });

    // 力导向位置更新帧
    simulation.on("tick", () => {
      link
        .attr("x1", (d) => (d.source as GraphNode).x || 0)
        .attr("y1", (d) => (d.source as GraphNode).y || 0)
        .attr("x2", (d) => (d.target as GraphNode).x || 0)
        .attr("y2", (d) => (d.target as GraphNode).y || 0);

      node.attr("transform", (d) => `translate(${d.x || 0}, ${d.y || 0})`);
    });

    return () => {
      simulation.stop();
    };
  }, [nodes, links]);

  // 重置视角处理
  const handleResetZoom = () => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.transition().duration(400).call(
      d3.zoom<SVGSVGElement, unknown>().transform,
      d3.zoomIdentity,
    );
  };

  return (
    <div
      ref={containerRef}
      className={`d3-memory-graph-container ${className}`}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        minHeight: "440px",
        background: "#090d13",
        overflow: "hidden",
      }}
    >
      {/* 顶部悬浮控制栏 */}
      <div className="d3-graph-toolbar">
        <span className="d3-graph-caption">
          🕸️ D3 内存力导图 · 栈区与堆区拓扑
        </span>
        <div className="d3-toolbar-actions">
          <button
            type="button"
            className="d3-tool-btn"
            onClick={handleResetZoom}
            title="复位视角 (Reset Zoom)"
          >
            ⊙ 居中视角
          </button>
        </div>
      </div>

      {/* SVG 画布 */}
      <svg
        ref={svgRef}
        style={{ width: "100%", height: "100%", display: "block" }}
      />

      {/* 空状态提示 */}
      {nodes.length === 0 && (
        <div className="d3-empty-state">
          <div className="d3-empty-icon">🕸️</div>
          <p className="d3-empty-text">
            暂无内存对象拓扑数据。请点击「运行代码」生成实时力导向图。
          </p>
        </div>
      )}

      {/* 悬浮属性气泡卡片 */}
      {hoveredNode && tooltipPos && (
        <div
          className="d3-tooltip-card"
          style={{
            left: `${Math.min(tooltipPos.x + 14, (containerRef.current?.clientWidth || 400) - 220)}px`,
            top: `${Math.max(10, tooltipPos.y - 70)}px`,
          }}
        >
          <div className="d3-tooltip-header">
            <strong>{hoveredNode.name}</strong>
            <span className="d3-tooltip-cat">{hoveredNode.category}</span>
          </div>
          <div className="d3-tooltip-body">
            <div>类型: <code>{hoveredNode.type}</code></div>
            {hoveredNode.value && <div>当前值: <code>{hoveredNode.value}</code></div>}
            {hoveredNode.rawAddress && <div>内存地址: <code>{hoveredNode.rawAddress}</code></div>}
            {hoveredNode.size && <div>占用字节: <code>{hoveredNode.size} Bytes</code></div>}
            {hoveredNode.frameName && <div>所属栈帧: <code>{hoveredNode.frameName}()</code></div>}
            {hoveredNode.status && (
              <div>
                状态:{" "}
                <span className={`status-badge status-${hoveredNode.status}`}>
                  {hoveredNode.status}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
