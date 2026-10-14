import { useMemo } from "react";
import hljs from "highlight.js/lib/core";
import c from "highlight.js/lib/languages/c";
import cpp from "highlight.js/lib/languages/cpp";
import bash from "highlight.js/lib/languages/bash";
import cmake from "highlight.js/lib/languages/cmake";
import python from "highlight.js/lib/languages/python";
import json from "highlight.js/lib/languages/json";
import yaml from "highlight.js/lib/languages/yaml";
import diff from "highlight.js/lib/languages/diff";
import markdown from "highlight.js/lib/languages/markdown";
import rust from "highlight.js/lib/languages/rust";
import xml from "highlight.js/lib/languages/xml";
import plaintext from "highlight.js/lib/languages/plaintext";
import "highlight.js/styles/github-dark.css";

hljs.registerLanguage("c", c);
hljs.registerLanguage("cpp", cpp);
hljs.registerLanguage("bash", bash);
hljs.registerLanguage("cmake", cmake);
hljs.registerLanguage("python", python);
hljs.registerLanguage("json", json);
hljs.registerLanguage("yaml", yaml);
hljs.registerLanguage("diff", diff);
hljs.registerLanguage("markdown", markdown);
hljs.registerLanguage("rust", rust);
hljs.registerLanguage("xml", xml);
hljs.registerLanguage("plaintext", plaintext);

hljs.registerAliases(["c++", "cc", "cxx", "hpp"], { languageName: "cpp" });
hljs.registerAliases(["sh", "shell", "zsh"], { languageName: "bash" });
hljs.registerAliases(["py"], { languageName: "python" });
hljs.registerAliases(["yml"], { languageName: "yaml" });
hljs.registerAliases(["md"], { languageName: "markdown" });
hljs.registerAliases(["text", "txt"], { languageName: "plaintext" });

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
