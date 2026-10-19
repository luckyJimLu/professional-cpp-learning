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
      <Suspense
        fallback={
          <section className="product-loading" role="status">
            <span className="page-eyebrow">正在准备内容</span>
            <strong>正在加载{label}…</strong>
            <p>请稍候，载入后即可继续操作。</p>
          </section>
        }
      >
        {children}
      </Suspense>
    </ContentErrorBoundary>
  );
}
