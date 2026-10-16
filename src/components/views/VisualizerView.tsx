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
    <div style={{ display: "flex", flexDirection: "column", gap: "16px", minHeight: isEmbed ? "100vh" : "85vh" }}>
      {!isEmbed && (
        <>
          <PageHeader
            eyebrow="GITHUB PAGES READY · 确定性内存视图"
            title="C++ 内存拓扑与生命周期可视化"
            description="基于 Trace Reducer 与 DOM/SVG 的纯前端内存可视化引擎。支持 VS Code 风格单步运行、VCR 逐行回放、块级作用域、智能指针所有权转移与悬挂指针检测。"
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
                <strong>预置轨迹快速路径</strong>：直接解析静态 JSON 快照（<code>/public/traces/</code>），无需编译即可开始回放。
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ color: "#38bdf8", fontFamily: "var(--mono, monospace)", fontSize: "11px" }}>
                支持 iframe 嵌入技术博客: <code>?trace=smart-ptr-unique&embed=true</code>
              </span>
            </div>
          </div>
        </>
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

