import { guideline } from "../../lib/course";
import { PageHeader } from "../common/PageHeader";
import { Markdown } from "../Markdown";

export function GuidelinesView() {
  return (
    <div>
      <PageHeader
        eyebrow="ENGINEERING RULES"
        title="Embedded C++ Guidelines"
        description="复习类型安全、资源管理与嵌入式开发中的编码规范。"
      />
      <article className="document-card">
        <Markdown>{guideline}</Markdown>
      </article>
    </div>
  );
}
