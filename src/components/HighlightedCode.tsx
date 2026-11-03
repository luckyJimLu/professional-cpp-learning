import { useMemo } from "react";
import { hljs } from "../lib/hljs";
import "highlight.js/styles/github-dark.css";

export function HighlightedCode({
  code,
  language,
}: {
  code: string;
  language: string;
}) {
  const normLang = language.toLowerCase();
  const html = useMemo(() => {
    if (hljs.getLanguage(normLang)) {
      return hljs.highlight(code, { language: normLang, ignoreIllegals: true })
        .value;
    }
    return null;
  }, [code, normLang]);

  return html === null ? (
    <code className={`language-${normLang}`}>{code}</code>
  ) : (
    <code
      className={`language-${normLang} hljs`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
