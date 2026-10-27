import { useEffect } from "react";
import { PageHeader } from "../common/PageHeader";
import { VisualizerWorkbench } from "../../visualizer/VisualizerWorkbench";
import { loadPresetTrace } from "../../visualizer/presetTraces";
import { useTraceSession } from "../../visualizer/useTraceSession";

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
  const traceSession = useTraceSession(DEFAULT_DEMO_CODE);
  const urlParams = new URLSearchParams(window.location.search);
  const isEmbed = urlParams.get("embed") === "true";

  // 初始化载入智能指针案例
  useEffect(() => {
    let isCancelled = false;
    const params = new URLSearchParams(window.location.search);
    const traceParam = params.get("trace") || "smart-ptr-unique";

    loadPresetTrace(traceParam).then((trace) => {
      if (isCancelled) return;
      if (trace) {
        traceSession.loadTrace(trace);
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [traceSession.loadTrace]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "16px",
        width: "100%",
        minHeight: isEmbed ? "100vh" : "85vh",
      }}
    >
      {!isEmbed && (
        <PageHeader
          title="C++ 对象生命周期可视化"
          description="逐步回放 C++ 对象在栈与堆上的生命周期，观察智能指针所有权转移、作用域销毁与悬挂指针。"
        />
      )}

      {/* 主工作区 */}
      <div style={{ flex: 1, minHeight: "680px" }}>
        <VisualizerWorkbench
          session={traceSession.state}
          onChangeCode={traceSession.setCode}
          onStepChange={traceSession.setStep}
          onRun={traceSession.run}
          onRunApproximate={() => traceSession.runApproximate()}
          onLoadTrace={traceSession.loadTrace}
          className="standalone-workbench"
        />
      </div>
    </div>
  );
}
