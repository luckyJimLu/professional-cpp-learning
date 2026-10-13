import { Component, Suspense, type ReactNode } from "react";

class ContentErrorBoundary extends Component<
  { children: ReactNode; label: string },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed) {
      return (
        <section role="alert" className="search-empty">
          <h2>{this.props.label}加载失败</h2>
          <p>检查网络连接，然后重新加载页面。</p>
          <button
            className="ghost-button"
            onClick={() => window.location.reload()}
          >
            重新加载
          </button>
        </section>
      );
    }
    return this.props.children;
  }
}
export function DeferredContent({
  children,
  label = "代码搜索",
}: {
  children: ReactNode;
  label?: string;
}) {
  return (
    <ContentErrorBoundary label={label}>
      <Suspense fallback={<p role="status">正在加载{label}…</p>}>
        {children}
      </Suspense>
    </ContentErrorBoundary>
  );
}
