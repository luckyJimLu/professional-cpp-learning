import { useEffect, useId, useState } from "react";

// Mermaid has global rendering state. Serialize diagrams, including retry requests.
let renderQueue: Promise<unknown> = Promise.resolve();

function renderDiagram(id: string, source: string): Promise<string> {
  const job = renderQueue.then(async () => {
    const { default: mermaid } = await import("mermaid");
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: "strict",
      suppressErrorRendering: true,
      maxTextSize: 50000,
      maxEdges: 500,
      theme: "neutral",
      fontFamily: '"Noto Sans TC Variable", "Noto Sans TC", "Noto Sans CJK TC", "Noto Sans SC", system-ui, sans-serif',
      flowchart: { htmlLabels: false, useMaxWidth: true },
      secure: ["secure", "securityLevel", "startOnLoad", "maxTextSize", "maxEdges", "suppressErrorRendering"],
    });
    const container = document.createElement("div");
    container.style.cssText = "position:absolute;left:-100000px;top:0;visibility:hidden";
    document.body.appendChild(container);
    try {
      const { svg } = await mermaid.render(id, source, container);
      return svg;
    } finally {
      container.remove();
    }
  });
  renderQueue = job.catch(() => undefined);
  return job;
}

export function MermaidDiagram({ source }: { source: string }) {
  const id = `mermaid-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ source: string; svg?: string; error?: string }>();
  const current = result?.source === source ? result : undefined;

  useEffect(() => {
    let cancelled = false;
    setResult(undefined);
    renderDiagram(`${id}-${attempt}`, source).then(
      (svg) => { if (!cancelled) setResult({ source, svg }); },
      (error: unknown) => {
        if (!cancelled) setResult({ source, error: error instanceof Error ? error.message : String(error) });
      },
    );
    return () => { cancelled = true; };
  }, [id, source, attempt]);

  return (
    <figure className="mermaid-diagram">
      {!current && <p role="status">正在绘制流程图…</p>}
      {current?.svg && (
        <div className="mermaid-viewport" tabIndex={0} aria-label="Mermaid 图表，可横向滚动"
          dangerouslySetInnerHTML={{ __html: current.svg }} />
      )}
      {current?.error && (
        <div role="alert">
          <p>图表未能绘制，请查看源码检查语法，或重试加载。</p>
          <button type="button" className="ghost-button" onClick={() => setAttempt((value) => value + 1)}>重试绘制</button>
        </div>
      )}
      <details open={current?.error ? true : undefined}>
        <summary>查看 Mermaid 源码</summary>
        <pre><code>{source}</code></pre>
        {current?.error && <p className="mermaid-error">{current.error}</p>}
      </details>
    </figure>
  );
}
