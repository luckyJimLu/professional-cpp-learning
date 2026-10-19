/**
 * RtosConfigPopover · 内核时钟/时间片/虚假唤醒配置与 V3 轨迹导出
 */

import { useEffect, useRef } from "react";
import {
  DEFAULT_RTOS_CONFIG,
  type RtosConfig,
  type VisualizerTraceV3,
} from "../types.ts";

export function RtosConfigPopover({
  config,
  onChangeConfig,
  trace,
}: {
  config: Partial<RtosConfig>;
  onChangeConfig: (next: Partial<RtosConfig>) => void;
  trace: VisualizerTraceV3 | null;
}) {
  const disclosureRef = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const dismiss = (event: KeyboardEvent) => {
      if (event.key === "Escape" && disclosureRef.current?.open) {
        disclosureRef.current.open = false;
        disclosureRef.current.querySelector("summary")?.focus();
      }
    };
    const outside = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !disclosureRef.current?.contains(event.target) &&
        disclosureRef.current
      )
        disclosureRef.current.open = false;
    };
    document.addEventListener("keydown", dismiss);
    document.addEventListener("pointerdown", outside);
    return () => {
      document.removeEventListener("keydown", dismiss);
      document.removeEventListener("pointerdown", outside);
    };
  }, []);
  const merged: RtosConfig = { ...DEFAULT_RTOS_CONFIG, ...config };

  const exportTraceJson = () => {
    if (!trace) return;
    const blob = new Blob([JSON.stringify(trace, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rtos-trace-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <details ref={disclosureRef} className="config-popover-wrap">
      <summary className="config-trigger-btn" title="内核参数与导出">
        内核配置
      </summary>
      <div className="config-popover" role="region" aria-label="RTOS 内核配置">
        <div className="config-row">
          <label htmlFor="cfg-slice">时间片 (ticks)</label>
          <input
            id="cfg-slice"
            type="number"
            min={1}
            max={50}
            value={merged.time_slice_ticks}
            onChange={(e) =>
              onChangeConfig({
                ...config,
                time_slice_ticks: Math.max(1, Number(e.target.value) || 1),
              })
            }
          />
        </div>
        <div className="config-row">
          <label htmlFor="cfg-spurious">虚假唤醒间隔 (0=关)</label>
          <input
            id="cfg-spurious"
            type="number"
            min={0}
            max={100}
            value={merged.spurious_wakeup_every}
            onChange={(e) =>
              onChangeConfig({
                ...config,
                spurious_wakeup_every: Math.max(0, Number(e.target.value) || 0),
              })
            }
          />
        </div>
        <div className="config-row">
          <label htmlFor="cfg-max-ticks">最大 Ticks</label>
          <input
            id="cfg-max-ticks"
            type="number"
            min={10}
            max={5000}
            step={50}
            value={merged.max_ticks}
            onChange={(e) =>
              onChangeConfig({
                ...config,
                max_ticks: Math.max(10, Number(e.target.value) || 200),
              })
            }
          />
        </div>
        <div className="config-actions">
          <button type="button" onClick={exportTraceJson} disabled={!trace}>
            导出 V3 JSON
          </button>
          <button
            type="button"
            onClick={() => {
              if (disclosureRef.current) disclosureRef.current.open = false;
              disclosureRef.current?.querySelector("summary")?.focus();
            }}
          >
            完成
          </button>
        </div>
      </div>
    </details>
  );
}
