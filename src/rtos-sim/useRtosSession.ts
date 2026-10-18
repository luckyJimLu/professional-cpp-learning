/**
 * RTOS 模拟器独立会话状态 Hook
 *
 * 负责代码编辑、Web Worker 异步确定性模拟（带超时保护）、快照归约、
 * 粒度切换（语句级 / 事件级）以及“下一次切换 / 下一 tick”快捷步进。
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { computeRtosSnapshots, type SnapshotGranularity } from "./rtosReducer.ts";
import type { RtosConfig, RtosDiagnostic, VisualizerTraceV3 } from "./types.ts";

export function useRtosSession(
  initialCode: string,
  initialConfig: Partial<RtosConfig> = {},
) {
  const [code, setCodeState] = useState(initialCode);
  const [config, setConfigState] = useState<Partial<RtosConfig>>(initialConfig);
  const [granularity, setGranularity] = useState<SnapshotGranularity>("statement");
  const [trace, setTrace] = useState<VisualizerTraceV3 | null>(null);
  const [diagnostics, setDiagnostics] = useState<RtosDiagnostic[]>([]);
  const [currentStep, setCurrentStepState] = useState(0);
  const [stale, setStale] = useState(false);
  const [status, setStatus] = useState<"idle" | "running">("idle");
  const workerRef = useRef<Worker | null>(null);
  const timeoutRef = useRef<number | null>(null);

  const snapshots = useMemo(
    () => (trace ? computeRtosSnapshots(trace.events, trace.timeline, granularity) : []),
    [trace, granularity],
  );

  const setCode = useCallback((next: string) => {
    setCodeState(next);
    setStale(true);
  }, []);

  const setConfig = useCallback((next: Partial<RtosConfig>) => {
    setConfigState(next);
    setStale(true);
  }, []);

  const clearWorker = useCallback(() => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
  }, []);

  const run = useCallback(() => {
    clearWorker();
    const worker = new Worker(new URL("../workers/rtos.worker.ts", import.meta.url), {
      type: "module",
    });
    workerRef.current = worker;
    setStatus("running");

    timeoutRef.current = window.setTimeout(() => {
      if (workerRef.current === worker) {
        clearWorker();
        setDiagnostics([
          { level: "error", message: "模拟执行超时（> 3000ms），请检查是否存在死循环" },
        ]);
        setStatus("idle");
      }
    }, 3000);

    worker.onmessage = (event) => {
      clearWorker();
      const result = event.data;
      setTrace(result.trace);
      setDiagnostics(result.diagnostics);
      setCurrentStepState(0);
      setStale(false);
      setStatus("idle");
    };

    worker.onerror = () => {
      clearWorker();
      setDiagnostics([{ level: "error", message: "模拟器 Worker 启动失败，请重新运行" }]);
      setStatus("idle");
    };

    worker.postMessage({ code, config });
  }, [code, config, clearWorker]);

  useEffect(() => () => clearWorker(), [clearWorker]);

  const setCurrentStep = useCallback(
    (step: number) =>
      setCurrentStepState(Math.max(0, Math.min(Math.max(0, snapshots.length - 1), step))),
    [snapshots.length],
  );

  const jumpNextSwitch = useCallback(() => {
    if (snapshots.length === 0) return;
    for (let i = currentStep + 1; i < snapshots.length; i++) {
      if (snapshots[i].event.op === "context_switch" || snapshots[i].event.op === "isr_enter") {
        setCurrentStepState(i);
        return;
      }
    }
    setCurrentStepState(snapshots.length - 1);
  }, [snapshots, currentStep]);

  const jumpNextTick = useCallback(() => {
    if (snapshots.length === 0) return;
    const curTick = snapshots[currentStep]?.tick ?? 0;
    for (let i = currentStep + 1; i < snapshots.length; i++) {
      if (snapshots[i].tick > curTick) {
        setCurrentStepState(i);
        return;
      }
    }
    setCurrentStepState(snapshots.length - 1);
  }, [snapshots, currentStep]);

  return {
    code,
    setCode,
    config,
    setConfig,
    granularity,
    setGranularity,
    trace,
    diagnostics,
    snapshots,
    currentStep,
    setCurrentStep,
    jumpNextSwitch,
    jumpNextTick,
    run,
    stale,
    status,
  };
}
