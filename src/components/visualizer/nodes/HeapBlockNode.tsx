import { memo } from "react";
import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import type { HeapBlock } from "../../../visualizer/types";

export interface HeapBlockNodeData extends Record<string, unknown> {
  block: HeapBlock;
}

export type HeapBlockNodeType = Node<HeapBlockNodeData, "heapBlockNode">;

/**
 * 堆内存块节点 (HeapBlockNode)
 * 渲染 new/malloc 申请的动态堆对象、结构体成员表格，
 * 并在入度端提供 target Handle，结构体指针字段（如 next/prev）提供 source Handle。
 */
export const HeapBlockNode = memo(function HeapBlockNode({
  data,
  selected,
}: NodeProps<HeapBlockNodeType>) {
  const { block } = data;
  const isFreed = block.status === "freed";
  const isLeaked = block.status === "leaked";
  const isAlive = block.status === "alive";

  const fields = block.fields || {};
  const fieldEntries = Object.entries(fields);

  return (
    <div
      className={`relative rounded-lg border shadow-xl overflow-hidden text-xs transition-all duration-200 ${
        isLeaked
          ? "border-rose-500/80 shadow-rose-950/40 ring-2 ring-rose-500/20"
          : isFreed
          ? "border-slate-800 opacity-65 bg-slate-950/80"
          : selected
          ? "border-sky-400 ring-2 ring-sky-500/30"
          : "border-slate-800 hover:border-slate-700"
      }`}
      style={{
        background: isFreed ? "#090d14" : "#0d1726",
        minWidth: "260px",
        maxWidth: "360px",
        fontFamily: "var(--font-sans, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif)",
      }}
    >
      {/* 堆块入度锚点：所有指向本堆块的指针连接于此 */}
      <Handle
        type="target"
        position={Position.Left}
        id="heap-target"
        className={`!w-3 !h-3 !border-2 !border-slate-900 !-left-1.5 ${
          isLeaked ? "!bg-rose-500" : isFreed ? "!bg-slate-600" : "!bg-sky-400"
        }`}
      />

      {/* 堆块顶栏 */}
      <div
        className="px-3 py-2 flex items-center justify-between border-b"
        style={{
          background: isLeaked ? "#2c1116" : isFreed ? "#14171f" : "#13233a",
          borderColor: isLeaked
            ? "rgba(244, 63, 94, 0.3)"
            : isFreed
            ? "rgba(51, 65, 85, 0.4)"
            : "rgba(56, 189, 248, 0.15)",
        }}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm">
            {isFreed ? "🪦" : isLeaked ? "🛑" : "📦"}
          </span>
          <div>
            <div className="flex items-center gap-1.5">
              <span
                className={`font-semibold font-mono text-xs ${
                  isFreed
                    ? "text-slate-400 line-through"
                    : isLeaked
                    ? "text-rose-300"
                    : "text-slate-100"
                }`}
              >
                {block.label}
              </span>
              {isLeaked && (
                <span className="px-1 py-0.2 rounded text-[9px] font-mono bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  LEAK 泄漏
                </span>
              )}
              {isFreed && (
                <span className="px-1 py-0.2 rounded text-[9px] font-mono bg-slate-800 text-slate-400 border border-slate-700">
                  FREED 已释放
                </span>
              )}
              {isAlive && (
                <span className="px-1 py-0.2 rounded text-[9px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  ALIVE 存活
                </span>
              )}
            </div>
            <div className="text-[10px] text-slate-400 font-mono">
              堆地址低位 &rarr; 向高位增长
            </div>
          </div>
        </div>

        {/* 堆物理内存地址十六进制标签 */}
        <span
          className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${
            isFreed
              ? "bg-slate-900 text-slate-500"
              : "bg-sky-950/80 text-sky-300 border border-sky-800/40"
          }`}
        >
          {block.rawAddr}
        </span>
      </div>

      {/* 堆块基本类型与尺寸 */}
      <div className="px-3 py-1.5 flex items-center justify-between text-[11px] font-mono bg-slate-950/40 border-b border-slate-800/60">
        <span className="text-slate-400">
          类型: <strong className="text-slate-200">{block.type}</strong>
        </span>
        <span className="text-slate-400">
          大小: <strong className="text-slate-200">{block.size} 字节</strong>
        </span>
      </div>

      {/* 堆块内容与字段表格 (HTML 语义表格) */}
      {fieldEntries.length === 0 ? (
        <div className="px-3 py-2.5 text-center text-slate-400 font-mono text-[11px]">
          {block.value !== undefined ? (
            <span>
              标量值: <strong className="text-sky-300 font-semibold">{block.value}</strong>
            </span>
          ) : (
            <span className="italic text-slate-500">(纯内存块 / 无子字段)</span>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-800/60 text-[10px] font-mono text-slate-400 bg-slate-900/30">
                <th className="py-1 px-3 font-medium">结构体成员</th>
                <th className="py-1 px-3 font-medium text-right">字段值</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/30">
              {fieldEntries.map(([fieldName, fieldValue]) => {
                const isPtrField =
                  fieldName.toLowerCase().includes("next") ||
                  fieldName.toLowerCase().includes("prev") ||
                  fieldValue.startsWith("0x");
                const isNull = fieldValue === "0x0" || fieldValue === "nullptr" || fieldValue === "null";

                return (
                  <tr
                    key={fieldName}
                    className="relative hover:bg-slate-800/20 transition-colors"
                  >
                    <td className="py-1.5 px-3 font-mono text-[11px] text-slate-300">
                      <span className="text-slate-400">.{fieldName}</span>
                    </td>
                    <td className="py-1.5 px-3 font-mono text-[11px] text-right relative">
                      <span
                        className={`font-medium ${
                          isPtrField
                            ? isNull
                              ? "text-slate-500"
                              : "text-sky-300 font-semibold"
                            : "text-slate-200"
                        }`}
                      >
                        {fieldValue}
                      </span>

                      {/* 堆块字段指针向外的 Handle 锚点 (用于单链表/多节点拓扑连线) */}
                      {isPtrField && !isNull && (
                        <Handle
                          type="source"
                          position={Position.Right}
                          id={`field-${fieldName}`}
                          className="!w-2.5 !h-2.5 !bg-sky-400 !border-2 !border-slate-900 !-right-1.5"
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

      {/* 异常警示提示 */}
      {isLeaked && (
        <div className="px-3 py-1.5 bg-rose-950/40 border-t border-rose-900/50 flex items-center gap-1.5 text-[10px] text-rose-300">
          <span>⚠️ 内存泄漏：未调用 delete 且无指针引用</span>
        </div>
      )}
      {isFreed && (
        <div className="px-3 py-1.5 bg-slate-900/60 border-t border-slate-800/60 flex items-center gap-1.5 text-[10px] text-slate-400">
          <span>☠️ 内存已归还操作系统，若继续访问将触发悬挂指针</span>
        </div>
      )}
    </div>
  );
});
