import { isValidElement, type ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
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

      return (
        <CodeBlock
          lang={lang}
          codeString={codeString}
        />
      );
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
}: {
  children: string;
  className?: string;
  sourcePath?: string;
  onNavigate?: (href: string) => boolean;
  resolveHref?: (href: string) => string;
}) {
  return (
    <div className={`markdown ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
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
