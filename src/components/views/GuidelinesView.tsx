import { guideline } from "../../lib/course";
import { PageHeader } from "../common/PageHeader";
import { Markdown } from "../Markdown";

export function GuidelinesView() {
  return (
    <div className="reading-page guidelines-page">
      <PageHeader
        eyebrow="工程规范 · Embedded C++"
        title="编码规范"
        description="复习类型安全、资源管理与嵌入式开发中的编码规范。"
      />
      <article className="document-card">
        <Markdown embedDocument>{guideline}</Markdown>
      </article>
    </div>
  );
}
