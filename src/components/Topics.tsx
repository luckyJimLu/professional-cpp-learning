import { topics, referenceBooks, resolveTopicLink } from "../lib/topics";
import { navigate, useLocationParams } from "../lib/navigation";
import { Markdown } from "./Markdown";

export function Topics() {
  const params = useLocationParams();
  const selected =
    topics.find((topic) => topic.path === params.get("topic")) ??
    topics.find((topic) => topic.path === "patterns/README.md") ??
    topics[0];
  const locale = selected?.locale ?? "zh";
  const groups = [...new Set(topics.map((topic) => topic.group))];
  const select = (path: string) => navigate({ view: "topics", topic: path });
  const alternate =
    topics.find(
      (topic) =>
        topic.path ===
        selected?.path.replace(
          /(?:\.(?:en|zh))?\.md$/,
          locale === "en" ? ".zh.md" : ".en.md",
        ),
    ) ??
    topics.find(
      (topic) =>
        locale === "en" &&
        topic.path === selected?.path.replace(/\.en\.md$/, ".md"),
    );
  return (
    <div>
      <header className="page-header">
        <span className="eyebrow">C++ KNOWLEDGE LIBRARY</span>
        <h1>专题知识库</h1>
        <p>从语言机制到系统工程。阅读原理，对照示例，回到实践。</p>
      </header>
      <div className="library-layout">
        <aside className="library-nav">
          <div className="library-caption">
            {topics.filter((topic) => topic.locale === locale).length} 篇文档 ·{" "}
            {locale === "en" ? "English" : "中文"}
          </div>
          <nav aria-label="学习专题">
            {groups.map((group) => (
              <details key={group} open={group === selected?.group}>
                <summary>
                  {group}
                  <span>
                    {
                      topics.filter(
                        (topic) =>
                          topic.group === group && topic.locale === locale,
                      ).length
                    }
                  </span>
                </summary>
                {topics
                  .filter(
                    (topic) => topic.group === group && topic.locale === locale,
                  )
                  .map((topic) => (
                    <button
                      key={topic.path}
                      aria-current={
                        selected?.path === topic.path ? "page" : undefined
                      }
                      onClick={() => select(topic.path)}
                    >
                      {topic.title}
                    </button>
                  ))}
              </details>
            ))}
          </nav>
          <details>
            <summary>参考书籍 · PDF</summary>
            {referenceBooks.map(([path, url]) => (
              <a
                className="book-link"
                href={url}
                key={path}
                target="_blank"
                rel="noreferrer"
              >
                {path.split("/").pop()}
              </a>
            ))}
          </details>
        </aside>
        {selected && (
          <article
            className="document-card library-document"
            key={selected.path}
          >
            <div className="document-toolbar">
              <span>{selected.group}</span>
              {alternate && (
                <button
                  className="ghost-button"
                  onClick={() => select(alternate.path)}
                >
                  {locale === "zh" ? "Read in English" : "阅读中文版"}
                </button>
              )}
            </div>
            <Markdown
              sourcePath={selected.path}
              resolveHref={(href) => {
                const target =
                  href.startsWith("#") && !href.startsWith("#/chapter/")
                    ? undefined
                    : resolveTopicLink(selected.path, href);
                if (!target)
                  return href.startsWith("#/chapter/")
                    ? `https://luckyJimLu.github.io/system-design-notes/${href}`
                    : href;
                const url = new URL(window.location.href);
                url.searchParams.set("view", "topics");
                url.searchParams.set("topic", target.path);
                url.hash = "";
                return url.href;
              }}
              onNavigate={(href) => {
                if (href.startsWith("#") && !href.startsWith("#/chapter/"))
                  return false;
                const target = resolveTopicLink(selected.path, href);
                if (!target) return false;
                select(target.path);
                return true;
              }}
            >
              {selected.body}
            </Markdown>
            <footer className="source-path">来源：{selected.path}</footer>
          </article>
        )}
      </div>
    </div>
  );
}
