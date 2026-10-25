import { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import hljs from "highlight.js";
import { preprocessSlideContent, type SlideItem } from "../../lib/slides";

export function SlideRenderer({ slide }: { slide: SlideItem }) {
  const content = useMemo(() => {
    return preprocessSlideContent(slide.canvas);
  }, [slide.canvas]);

  const isCover = slide.layout === "cover";

  return (
    <div className={`slidev-layout ${isCover ? "cover" : "default"}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={{
          pre({ children, ...props }) {
            return (
              <div className="slide-code-wrapper">
                <pre {...props}>{children}</pre>
              </div>
            );
          },
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || "");
            const lang = match ? match[1] : "";
            const isInline = !match && !String(children).includes("\n");

            if (isInline) {
              return (
                <code className="slide-inline-code" {...props}>
                  {children}
                </code>
              );
            }

            const codeString = String(children).replace(/\n$/, "");
            let highlighted = codeString;
            const validLang = lang && hljs.getLanguage(lang) ? lang : "cpp";
            try {
              highlighted = hljs.highlight(codeString, {
                language: validLang,
              }).value;
            } catch {
              highlighted = codeString;
            }

            return (
              <code
                className={`hljs language-${validLang}`}
                dangerouslySetInnerHTML={{ __html: highlighted }}
              />
            );
          },
          table({ children }) {
            return (
              <div className="slide-table-scroll">
                <table className="slide-table">{children}</table>
              </div>
            );
          },
          a({ href, children, ...props }) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                {...props}
              >
                {children}
              </a>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
