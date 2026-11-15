/**
 * 可拖拽分栏比例 Hook（支持 localStorage 持久化、最小像素宽度约束、Pointer Capture 与键盘调整）
 */

import { useCallback, useEffect, useRef, useState } from "react";

export interface UseSplitPaneOptions {
  storageKey?: string;
  defaultPercent?: number;
  minPercent?: number;
  maxPercent?: number;
  minLeftWidth?: number;
  minRightWidth?: number;
  gutterWidth?: number;
  keyboardStep?: number;
}

export function useSplitPane({
  storageKey = "cpp-vis-split-percent",
  defaultPercent = 42,
  minPercent = 20,
  maxPercent = 80,
  minLeftWidth = 320,
  minRightWidth = 360,
  gutterWidth = 8,
  keyboardStep = 2,
}: UseSplitPaneOptions = {}) {
  const clampPercent = useCallback(
    (percent: number, containerWidth?: number) => {
      let lower = minPercent;
      let upper = maxPercent;
      if (
        containerWidth &&
        containerWidth > minLeftWidth + minRightWidth + gutterWidth
      ) {
        const minFromLeft = (minLeftWidth / containerWidth) * 100;
        const maxFromRight =
          ((containerWidth - minRightWidth - gutterWidth) / containerWidth) *
          100;
        lower = Math.max(lower, minFromLeft);
        upper = Math.min(upper, maxFromRight);
      }
      if (lower > upper) {
        return Math.round(Math.min(maxPercent, Math.max(minPercent, percent)) * 10) / 10;
      }
      const clamped = Math.min(upper, Math.max(lower, percent));
      return Math.round(clamped * 10) / 10;
    },
    [gutterWidth, maxPercent, minLeftWidth, minPercent, minRightWidth],
  );

  const persist = useCallback(
    (value: number) => {
      try {
        window.localStorage.setItem(storageKey, String(value));
      } catch {
        // ignore storage errors
      }
    },
    [storageKey],
  );

  const [splitPercent, setSplitPercent] = useState<number>(() => {
    if (typeof window === "undefined") return defaultPercent;
    try {
      const saved = window.localStorage.getItem(storageKey);
      if (saved) {
        const parsed = parseFloat(saved);
        if (Number.isFinite(parsed) && parsed >= minPercent && parsed <= maxPercent) {
          return parsed;
        }
      }
    } catch {
      // ignore storage errors
    }
    return defaultPercent;
  });

  const [isResizing, setIsResizing] = useState(false);
  const splitContainerRef = useRef<HTMLDivElement>(null);
  const dragCleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      dragCleanupRef.current?.();
      dragCleanupRef.current = null;
    };
  }, []);

  const handleResetSplit = useCallback(() => {
    setSplitPercent(defaultPercent);
    persist(defaultPercent);
    window.dispatchEvent(new Event("resize"));
  }, [defaultPercent, persist]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.button !== 0) return;
      const container = splitContainerRef.current;
      if (!container) return;

      e.preventDefault();
      try {
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
      } catch {
        // ignore synthetic pointer events
      }
      setIsResizing(true);

      const computePercent = (clientX: number) => {
        const rect = container.getBoundingClientRect();
        if (rect.width <= 0) return null;
        const offsetX = clientX - rect.left;
        return clampPercent((offsetX / rect.width) * 100, rect.width);
      };

      const onPointerMove = (moveEvent: PointerEvent) => {
        const next = computePercent(moveEvent.clientX);
        if (next !== null) setSplitPercent(next);
      };

      const cleanup = () => {
        setIsResizing(false);
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerup", onPointerUp);
        window.removeEventListener("pointercancel", onPointerUp);
        dragCleanupRef.current = null;
      };

      const onPointerUp = (upEvent: PointerEvent) => {
        try {
          (upEvent.target as HTMLElement)?.releasePointerCapture?.(
            upEvent.pointerId,
          );
        } catch {
          // ignore
        }
        cleanup();
        const finalPercent = computePercent(upEvent.clientX);
        if (finalPercent !== null) {
          setSplitPercent(finalPercent);
          persist(finalPercent);
        }
        window.dispatchEvent(new Event("resize"));
      };

      dragCleanupRef.current?.();
      dragCleanupRef.current = cleanup;
      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerUp);
      window.addEventListener("pointercancel", onPointerUp);
    },
    [clampPercent, persist],
  );

  const handleSplitKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault();
        const delta = e.key === "ArrowLeft" ? -keyboardStep : keyboardStep;
        const width = splitContainerRef.current?.getBoundingClientRect().width;
        setSplitPercent((prev) => {
          const next = clampPercent(prev + delta, width);
          persist(next);
          return next;
        });
        window.dispatchEvent(new Event("resize"));
      } else if (e.key === "Home") {
        e.preventDefault();
        handleResetSplit();
      }
    },
    [clampPercent, handleResetSplit, keyboardStep, persist],
  );

  return {
    splitPercent,
    isResizing,
    splitContainerRef,
    handlePointerDown,
    handleResetSplit,
    handleSplitKeyDown,
  };
}
