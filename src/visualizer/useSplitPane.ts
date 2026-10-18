/**
 * 可拖拽分栏比例 Hook（支持 localStorage 持久化与无障碍键盘调整）
 */

import { useCallback, useEffect, useRef, useState } from "react";

export interface UseSplitPaneOptions {
  storageKey: string;
  defaultRatio?: number;
  minRatio?: number;
  maxRatio?: number;
  direction?: "horizontal" | "vertical";
}

export function useSplitPane({
  storageKey,
  defaultRatio = 0.42,
  minRatio = 0.24,
  maxRatio = 0.72,
  direction = "horizontal",
}: UseSplitPaneOptions) {
  const clamp = useCallback(
    (val: number) => Math.min(maxRatio, Math.max(minRatio, val)),
    [minRatio, maxRatio],
  );

  const [ratio, setRatioState] = useState<number>(() => {
    if (typeof window === "undefined") return defaultRatio;
    try {
      const saved = window.localStorage.getItem(storageKey);
      const parsed = saved ? Number(saved) : NaN;
      return Number.isFinite(parsed) ? clamp(parsed) : defaultRatio;
    } catch {
      return defaultRatio;
    }
  });

  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLElement | null>(null);

  const setRatio = useCallback(
    (next: number) => {
      const clamped = clamp(next);
      setRatioState(clamped);
      try {
        window.localStorage.setItem(storageKey, String(clamped));
      } catch {
        // ignore storage errors
      }
    },
    [clamp, storageKey],
  );

  useEffect(() => {
    if (!isDragging) return;

    const handleMove = (e: PointerEvent) => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (direction === "horizontal") {
        if (rect.width <= 0) return;
        setRatio((e.clientX - rect.left) / rect.width);
      } else {
        if (rect.height <= 0) return;
        setRatio((e.clientY - rect.top) / rect.height);
      }
    };

    const handleUp = () => {
      setIsDragging(false);
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, [isDragging, direction, setRatio]);

  const onSplitterKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const step = 0.03;
      if (direction === "horizontal") {
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          setRatio(ratio - step);
        } else if (e.key === "ArrowRight") {
          e.preventDefault();
          setRatio(ratio + step);
        }
      } else {
        if (e.key === "ArrowUp") {
          e.preventDefault();
          setRatio(ratio - step);
        } else if (e.key === "ArrowDown") {
          e.preventDefault();
          setRatio(ratio + step);
        }
      }
    },
    [direction, ratio, setRatio],
  );

  return {
    ratio,
    setRatio,
    isDragging,
    containerRef,
    startDrag: () => setIsDragging(true),
    onSplitterKeyDown,
  };
}
