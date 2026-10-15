import { StackFrameNode, type StackFrameNodeData, type StackFrameNodeType } from "./StackFrameNode";
import { HeapBlockNode, type HeapBlockNodeData, type HeapBlockNodeType } from "./HeapBlockNode";
import type { NodeTypes } from "@xyflow/react";

export { StackFrameNode, HeapBlockNode };
export type { StackFrameNodeData, StackFrameNodeType, HeapBlockNodeData, HeapBlockNodeType };

export const visualizerNodeTypes: NodeTypes = {
  stackFrameNode: StackFrameNode,
  heapBlockNode: HeapBlockNode,
};
