import { memo } from "react";
import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import type { StackFrame, StackVariable } from "../../../visualizer/types";

export interface StackFrameNodeData extends Record<string, unknown> {
  frame: StackFrame;
}

export type StackFrameNodeType = Node<StackFrameNodeData, "stackFrameNode">;

/**
 * 栈帧节点 (StackFrameNode)
 * 渲染函数调用栈帧，包含变量与结构体字段的 HTML 语义表格，
 * 并在每个指针或结构体字段右侧挂载 Handle 锚点供拓扑连线。
 */
export const StackFrameNode = memo(function StackFrameNode({
  data,
  selected,
}: NodeProps<StackFrameNodeType>) {
  const { frame } = data;
  const variables = frame.variables || [];

  return (
    <div
      className={`rounded-lg border shadow-xl overflow-hidden text-xs transition-all duration-200 ${
        selected
          ? "border-sky-400 ring-2 ring-sky-500/30"
          : "border-slate-800 hover:border-slate-700"
      }`}
      style={{
        background: "#0c121e",
        minWidth: "280px",
        maxWidth: "380px",
        fontFamily: "var(--font-sans, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif)",
      }}
    >
      {/* 栈帧顶栏 */}
      <div
        className="px-3 py-2 flex items-center justify-between border-b border-slate-800"
        style={{ background: "#141d2e" }}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm">🥞</span>
          <div className="flex flex-col">
            <span className="font-semibold text-slate-100 font-mono tracking-tight text-xs">
              {frame.name}()
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              栈地址高位 &rarr; 向上增长
            </span>
          </div>
        </div>
        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-slate-800/80 text-slate-300 border border-slate-700">
          {variables.length} 局部变量
        </span>
      </div>

      {/* 变量列表渲染（HTML 语义表格） */}
      {variables.length === 0 ? (
        <div className="px-4 py-3 text-center text-slate-500 italic text-[11px]">
          (暂无局部变量 / 空栈帧)
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-800/70 text-[10px] font-mono text-slate-400 bg-slate-900/50">
                <th className="py-1.5 px-3 font-medium">标识符 / 类型</th>
                <th className="py-1.5 px-2 font-medium text-right">值 / 指向</th>
                <th className="py-1.5 px-2 font-medium text-right">变量地址</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {variables.map((v) => {
                const isPtr = Boolean(v.isPointer);
                const isSmart = Boolean(v.isSmartPointer);
                const isCreated = v.status === "created";
                const isModified = v.status === "modified";
                const isDestroyed = v.status === "destroyed";

                const hasFields = v.fields && Object.keys(v.fields).length > 0;

                return (
                  <tr
                    key={v.name}
                    className={`relative transition-colors ${
                      isCreated
                        ? "bg-emerald-950/20 text-emerald-200"
                        : isModified
                        ? "bg-amber-950/20 text-amber-200"
                        : isDestroyed
                        ? "opacity-50 line-through bg-slate-900/30"
                        : "hover:bg-slate-800/30"
                    }`}
                  >
                    {/* 变量名与类型 */}
                    <td className="py-2 px-3 align-top">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`font-semibold font-mono text-[11px] ${
                            isPtr
                              ? isSmart
                                ? "text-sky-400"
                                : "text-emerald-400"
                              : "text-slate-200"
                          }`}
                        >
                          {v.name}
                        </span>
                        {isSmart && (
                          <span className="text-[9px] px-1 py-0.2 rounded border border-sky-500/40 text-sky-300 bg-sky-950/40">
                            smart
                          </span>
                        )}
                        {isCreated && (
                          <span className="text-[9px] px-1 rounded bg-emerald-500/20 text-emerald-300">
                            new
                          </span>
                        )}
                        {isModified && (
                          <span className="text-[9px] px-1 rounded bg-amber-500/20 text-amber-300">
                            mod
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono tracking-tight">
                        {v.type}
                      </div>

                      {/* 如果是包含复合字段的栈上结构体对象 */}
                      {hasFields && (
                        <div className="mt-1.5 pl-2 border-l border-slate-700/60 space-y-1">
                          {Object.entries(v.fields!).map(([fieldKey, fieldValue]) => {
                            const isFieldPointer =
                              fieldKey.toLowerCase().includes("next") ||
                              fieldKey.toLowerCase().includes("prev") ||
                              fieldValue.startsWith("0x");

                            return (
                              <div
                                key={fieldKey}
                                className="relative flex items-center justify-between text-[10px] font-mono text-slate-300 pr-2"
                              >
                                <span className="text-slate-400">.{fieldKey} =</span>
                                <span className={isFieldPointer ? "text-sky-300 font-semibold" : "text-slate-200"}>
                                  {fieldValue}
                                </span>

                                {/* 结构体字段内部指针 Handle 锚点 */}
                                {isFieldPointer && fieldValue !== "0x0" && fieldValue !== "nullptr" && (
                                  <Handle
                                    type="source"
                                    position={Position.Right}
                                    id={`var-${v.name}-field-${fieldKey}`}
                                    className="!w-2 !h-2 !bg-sky-400 !border !border-slate-900 !-right-2"
                                  />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </td>

                    {/* 变量当前值 / 指针指向 */}
                    <td className="py-2 px-2 align-top text-right font-mono">
                      <div
                        className={`text-[11px] font-medium ${
                          isPtr
                            ? v.pointsToRaw
                              ? "text-sky-300"
                              : "text-slate-400"
                            : "text-slate-100"
                        }`}
                      >
                        {v.value}
                      </div>
                      {v.pointsToLabel && (
                        <div className="text-[9px] text-sky-400/80 font-mono">
                          &rarr; {v.pointsToLabel}
                        </div>
                      )}
                    </td>

                    {/* 栈上内存地址 */}
                    <td className="py-2 px-2 align-top text-right font-mono text-[10px] text-slate-400 relative">
                      {v.rawAddress ? (
                        <span>&amp;{v.rawAddress}</span>
                      ) : (
                        <span className="text-slate-600">-</span>
                      )}

                      {/* 指针变量的主 Handle 锚点 (右侧) */}
                      {isPtr && (
                        <Handle
                          type="source"
                          position={Position.Right}
                          id={`var-${v.name}`}
                          className={`!w-2.5 !h-2.5 !border-2 !border-slate-900 !-right-1.5 ${
                            isSmart ? "!bg-sky-400" : "!bg-emerald-400"
                          }`}
                        />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
});
