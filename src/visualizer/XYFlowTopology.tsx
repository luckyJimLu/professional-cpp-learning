import type { MemorySnapshot } from "./types";
import { VisualizerView } from "../components/visualizer/VisualizerView";

/**
 * 2D 内存拓扑图组件
 * 基于 React Flow (@xyflow/react) 与 ELKjs 纯前端拓扑排版引擎
 * 代理渲染 src/components/visualizer/VisualizerView
 */
export function XYFlowTopology({
  snapshot,
  className = "",
}: {
  snapshot: MemorySnapshot | null;
  className?: string;
}) {
  return (
    <VisualizerView
      snapshot={snapshot}
      className={className}
      showMinimap={true}
      showControls={true}
      showToolbar={true}
      showStepBanner={true}
    />
  );
}

export default XYFlowTopology;
