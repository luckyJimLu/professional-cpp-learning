import { isValidElement, type ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { MermaidDiagram } from "./MermaidDiagram";

const components: Components = {
  pre({ children, node: _node, ...props }) {
    if (isValidElement<{ className?: string; children?: ReactNode }>(children)
      && /(?:^|\s)language-mermaid(?:\s|$)/.test(children.props.className ?? "")) {
      return <MermaidDiagram source={String(children.props.children ?? "").replace(/\n$/, "")} />;
    }
    return <pre {...props}>{children}</pre>;
  },
};

export function Markdown({ children, className = "", onNavigate }: { children: string; className?: string; onNavigate?: (href: string) => boolean }) {
  return <div className={`markdown ${className}`}>
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ ...components, a({ node: _node, href, children, ...props }) {
      return <a {...props} href={href} onClick={(event) => {
        if (href && onNavigate && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey
          && onNavigate(href)) event.preventDefault();
      }}>{children}</a>;
    } }}>{children}</ReactMarkdown>
  </div>;
}
