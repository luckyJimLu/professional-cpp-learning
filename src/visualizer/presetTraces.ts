import type { VisualizerTrace } from "./types";

export interface PresetTraceMeta {
  id: string;
  title: string;
  category: "smart_pointers" | "data_structures" | "memory_safety";
  badge: string;
  description: string;
  fileUrl: string;
}

export const PRESET_TRACES_META: PresetTraceMeta[] = [
  {
    id: "smart-ptr-unique",
    title: "std::unique_ptr 独占与转移",
    category: "smart_pointers",
    badge: "智能指针",
    description: "独占所有权、std::move 语义与离开作用域自动析构回收",
    fileUrl: "/traces/smart-ptr-unique.json",
  },
  {
    id: "smart-ptr-shared",
    title: "std::shared_ptr 引用计数",
    category: "smart_pointers",
    badge: "引用计数",
    description: "Control Block 共享所有权、use_count 增减与最后拥有者释放",
    fileUrl: "/traces/smart-ptr-shared.json",
  },
  {
    id: "linked-list-reverse",
    title: "单链表就地反转",
    category: "data_structures",
    badge: "经典算法",
    description: "prev, curr, next 三指针在堆节点间的就地转向过程",
    fileUrl: "/traces/linked-list-reverse.json",
  },
  {
    id: "vector-grow",
    title: "vector 动态扩容与搬迁",
    category: "data_structures",
    badge: "底盘架构",
    description: "超出 capacity 时的两倍新内存申请、旧元素搬迁与深释放",
    fileUrl: "/traces/vector-grow.json",
  },
  {
    id: "dangling-pointer",
    title: "悬挂指针与内存泄漏",
    category: "memory_safety",
    badge: "安全陷阱",
    description: "提前 delete 导致的野指针 (Dangling Pointer) 与置空防护",
    fileUrl: "/traces/dangling-pointer.json",
  },
];

// 静态内置快照数据缓存，确保无网络/GitHub Pages 相对路径异常时也能 100% 离线秒开
export const BUNDLED_PRESET_TRACES: Record<string, VisualizerTrace> = {};

/**
 * 异步获取指定 preset 的 Trace 数据，优先走 fetch，失败则降级到内置缓存
 */
export async function loadPresetTrace(id: string): Promise<VisualizerTrace | null> {
  const meta = PRESET_TRACES_META.find((p) => p.id === id);
  if (!meta) return null;

  try {
    // 兼容 Vite base 路径与 GitHub Pages 子路径
    const basePath = import.meta.env.BASE_URL || "/";
    const cleanBase = basePath.endsWith("/") ? basePath : `${basePath}/`;
    const tracePath = meta.fileUrl.startsWith("/") ? meta.fileUrl.slice(1) : meta.fileUrl;
    const fetchUrl = `${cleanBase}${tracePath}`;

    const res = await fetch(fetchUrl);
    if (res.ok) {
      const data = (await res.json()) as VisualizerTrace;
      BUNDLED_PRESET_TRACES[id] = data;
      return data;
    }
  } catch (err) {
    console.warn(`[TraceLoader] Failed to fetch ${meta.fileUrl}, checking fallback cache:`, err);
  }

  return BUNDLED_PRESET_TRACES[id] || null;
}
