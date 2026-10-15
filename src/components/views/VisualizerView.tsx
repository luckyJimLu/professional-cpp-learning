import { useState, useEffect } from "react";
import { PageHeader } from "../common/PageHeader";
import { VisualizerWorkbench } from "../../visualizer/VisualizerWorkbench";
import { generateSnapshotsFromCodeAndOutput } from "../../visualizer/reducer";
import { loadPresetTrace } from "../../visualizer/presetTraces";
import type { MemorySnapshot } from "../../visualizer/types";

const DEFAULT_DEMO_CODE = `#include <iostream>
#include <memory>

struct Widget {
    int id;
    Widget(int v) : id(v) {}
};

int main() {
    auto p1 = std::make_unique<Widget>(42);
    std::unique_ptr<Widget> p2 = std::move(p1);
    return 0;
}`;

export function VisualizerView() {
  const [code, setCode] = useState(DEFAULT_DEMO_CODE);
  const [snapshots, setSnapshots] = useState<MemorySnapshot[]>([]);
  const [currentStep, setCurrentStep] = useState(0);

  // 初始化载入智能指针案例
  useEffect(() => {
    let isCancelled = false;
    const urlParams = new URLSearchParams(window.location.search);
    const traceParam = urlParams.get("trace") || "smart-ptr-unique";

    loadPresetTrace(traceParam).then((trace) => {
      if (isCancelled) return;
      if (trace) {
        setCode(trace.sourceCode);
        setSnapshots(trace.snapshots);
        setCurrentStep(0);
      } else {
        const fallbackSnaps = generateSnapshotsFromCodeAndOutput(DEFAULT_DEMO_CODE, "", 0);
        setSnapshots(fallbackSnaps);
        setCurrentStep(0);
      }
    });

    return () => {
      isCancelled = true;
    };
  }, []);

  const handleRunSimulation = () => {
    const snaps = generateSnapshotsFromCodeAndOutput(code, "", 0);
    setSnapshots(snaps);
    setCurrentStep(0);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px", minHeight: "85vh" }}>
      <PageHeader
        eyebrow="GITHUB PAGES READY · 纯静态拓扑引擎"
        title="C++ 内存拓扑与生命周期可视化"
        description="基于 React + XYFlow + ELKjs 的纯前端内存可视化引擎。零服务器后端、极速首屏，支持 VCR 逐行单步调试、指针跳转、智能指针所有权转移与悬挂指针检测。"
      />

      {/* GitHub Pages 部署特性说明横幅 */}
      <div
        style={{
          background: "linear-gradient(90deg, rgba(30, 58, 95, 0.4) 0%, rgba(13, 24, 41, 0.6) 100%)",
          border: "1px solid rgba(56, 189, 248, 0.25)",
          borderRadius: "8px",
          padding: "10px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "10px",
          fontSize: "12px",
          color: "#cbd5e1",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "16px" }}>⚡</span>
          <span>
            <strong>纯前端 0 Token 消耗</strong>：运行期直接解析预置静态 JSON 轨迹（<code>/public/traces/</code>），毫秒级自动算力导排版，无任何 Node.js/Python 依赖。
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ color: "#38bdf8", fontFamily: "var(--mono, monospace)", fontSize: "11px" }}>
            支持 iframe 嵌入技术博客: <code>?trace=smart-ptr-unique&embed=true</code>
          </span>
        </div>
      </div>

      {/* 主工作区 */}
      <div style={{ flex: 1, minHeight: "680px" }}>
        <VisualizerWorkbench
          code={code}
          onChangeCode={setCode}
          snapshots={snapshots}
          currentStep={currentStep}
          onStepChange={setCurrentStep}
          compilerState="idle"
          compilerProgress={1}
          terminalOutput=""
          onRun={handleRunSimulation}
          className="standalone-workbench"
        />
      </div>
    </div>
  );
}
