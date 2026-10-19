import { isValidElement, type ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Root } from "mdast";

// Legacy topic documents sometimes use multiple h1 sections. Keep one title
// and normalize later sections in the Markdown AST, leaving fenced code intact.
function embeddedHeadings() {
  return (tree: Root) => {
    for (const node of tree.children) {
      if (node.type === "heading")
        node.depth = Math.min(6, node.depth + 1) as 1 | 2 | 3 | 4 | 5 | 6;
    }
  };
}
function documentHeadings() {
  return (tree: Root) => {
    let hasTitle = false;
    let sectionShift = 0;
    for (const node of tree.children) {
      if (node.type !== "heading") continue;
      if (node.depth === 1) {
        if (!hasTitle) {
          hasTitle = true;
          continue;
        }
        sectionShift = 1;
      }
      node.depth = Math.min(6, node.depth + sectionShift) as
        1 | 2 | 3 | 4 | 5 | 6;
    }
  };
}
import { resolveAsset } from "../lib/contentAssets";
import { MermaidDiagram } from "./MermaidDiagram";
import { PlantUmlDiagram, isPlantUmlSource } from "./PlantUmlDiagram";
import { CodeBlock } from "./CodeBlock";

function headingText(value: ReactNode): string {
  if (typeof value === "string" || typeof value === "number")
    return String(value);
  if (Array.isArray(value)) return value.map(headingText).join("");
  if (isValidElement<{ children?: ReactNode }>(value))
    return headingText(value.props.children);
  return "";
}
function headingId(value: ReactNode) {
  return headingText(value)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}_\s-]/gu, "")
    .replace(/\s/g, "-");
}

const components: Components = {
  table({ children }) {
    return (
      <div
        className="markdown-table-scroll"
        role="region"
        aria-label="数据表格，可横向滚动"
        tabIndex={0}
      >
        <table>{children}</table>
      </div>
    );
  },
  h2({ children }) {
    return <h2 id={headingId(children)}>{children}</h2>;
  },
  h3({ children }) {
    return <h3 id={headingId(children)}>{children}</h3>;
  },
  pre({ children, node: _node, ...props }) {
    if (
      isValidElement<{ className?: string; children?: ReactNode }>(children)
    ) {
      const match = /(?:^|\s)language-([^\s]+)(?:\s|$)/.exec(
        children.props.className ?? "",
      );
      const lang = match ? match[1].toLowerCase() : "";
      const codeString = String(children.props.children ?? "").replace(
        /\n$/,
        "",
      );

      if (lang === "mermaid") {
        return <MermaidDiagram source={codeString} />;
      }

      if (
        ["plantuml", "puml", "uml"].includes(lang) ||
        isPlantUmlSource(codeString)
      ) {
        return <PlantUmlDiagram key={codeString} code={codeString} />;
      }

      return <CodeBlock lang={lang} codeString={codeString} />;
    }
    return <pre {...props}>{children}</pre>;
  },
};

export function Markdown({
  children,
  className = "",
  sourcePath,
  onNavigate,
  resolveHref,
  normalizeDocumentHeadings = false,
  embedDocument = false,
}: {
  children: string;
  className?: string;
  sourcePath?: string;
  onNavigate?: (href: string) => boolean;
  resolveHref?: (href: string) => string;
  normalizeDocumentHeadings?: boolean;
  embedDocument?: boolean;
}) {
  return (
    <div className={`markdown ${className}`}>
      <ReactMarkdown
        remarkPlugins={
          embedDocument
            ? [remarkGfm, embeddedHeadings]
            : normalizeDocumentHeadings
              ? [remarkGfm, documentHeadings]
              : [remarkGfm]
        }
        components={{
          ...components,
          img({ node: _node, src, alt, ...props }) {
            return (
              <img
                {...props}
                loading="lazy"
                src={
                  sourcePath && src
                    ? (resolveAsset(sourcePath, src) ?? src)
                    : src
                }
                alt={alt ?? ""}
              />
            );
          },
          a({ node: _node, href, children, ...props }) {
            const targetHref =
              sourcePath && href
                ? (resolveAsset(sourcePath, href) ??
                  resolveHref?.(href) ??
                  (href.startsWith("#/chapter/")
                    ? `https://luckyJimLu.github.io/system-design-notes/${href}`
                    : href))
                : href;
            return (
              <a
                {...props}
                href={targetHref}
                onClick={(event) => {
                  if (
                    href &&
                    onNavigate &&
                    !event.ctrlKey &&
                    !event.metaKey &&
                    !event.shiftKey &&
                    !event.altKey &&
                    onNavigate(href)
                  )
                    event.preventDefault();
                }}
              >
                {children}
              </a>
            );
          },
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
