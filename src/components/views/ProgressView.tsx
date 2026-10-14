import {
  latestNextSummary,
  lessons,
  nextPlannedDay,
  repoCompletedDay,
} from "../../lib/course";
import { PageHeader } from "../common/PageHeader";

const SKILLS = [
  {
    name: "Language",
    range: [1, 3],
    evidence: /constexpr|string_view|enum class|reference|引用|类型安全/i,
  },
  {
    name: "Ownership / RAII",
    range: [7, 9],
    evidence: /ownership|lifetime|raii|所有权|生命周期|unique_ptr/i,
  },
  {
    name: "Class Design",
    range: [4, 6],
    evidence: /class|composition|inheritance|interface|类|接口|继承/i,
  },
  {
    name: "STL",
    range: [13, 24],
    evidence: /iterator|container|algorithm|ranges|span|标准库/i,
  },
  {
    name: "Concurrency",
    range: [27, 27],
    evidence: /thread|mutex|atomic|并发|线程/i,
  },
  { name: "Testing", range: [30, 30], evidence: /test|fake|mock|assert|测试/i },
] as const;

export function ProgressView({
  weakPoints,
  isDayComplete,
}: {
  weakPoints: string[];
  isDayComplete: (day: number) => boolean;
}) {
  const completed = lessons.filter((lesson) => isDayComplete(lesson.day));
  const completedDay = Math.max(
    repoCompletedDay,
    ...completed.map((lesson) => lesson.day),
  );
  const currentChapter = Math.max(
    ...completed.map((lesson) => lesson.chapter ?? 0),
    0,
  );

  const skillRows = SKILLS.map((skill) => {
    const [start, end] = skill.range;
    const chapterCoverage =
      currentChapter < start
        ? 0
        : currentChapter >= end
          ? 100
          : Math.round(
              ((currentChapter - start + 1) / (end - start + 1)) * 100,
            );
    const evidenceCount = completed.filter((lesson) =>
      skill.evidence.test(lesson.raw),
    ).length;
    const evidenceCoverage = Math.min(100, evidenceCount * 20);
    return { ...skill, value: Math.max(chapterCoverage, evidenceCoverage) };
  });

  return (
    <div>
      <PageHeader
        eyebrow="LEARNING EVIDENCE"
        title="Progress"
        description="进度表示课程覆盖与实践记录，可结合自测确认理解程度。"
      />
      <div className="progress-layout">
        <section className="skill-matrix">
          {skillRows.map((skill) => (
            <div className="skill-row" key={skill.name}>
              <div>
                <strong>{skill.name}</strong>
                <span>{skill.value}% coverage</span>
              </div>
              <div className="skill-bar">
                <i style={{ width: `${skill.value}%` }} />
              </div>
            </div>
          ))}
        </section>
        <aside className="progress-summary">
          <span className="eyebrow">CURRENT</span>
          <strong>Chapter {currentChapter || "—"}</strong>
          <p>Day {completedDay} is the latest completed learning unit.</p>
          <hr />
          <span className="eyebrow">NEXT</span>
          <p>
            {latestNextSummary() ??
              `Publish Day ${nextPlannedDay} to continue.`}
          </p>
          <hr />
          <span className="eyebrow">NEEDS REVIEW</span>
          <p>
            {weakPoints.length > 0
              ? `${weakPoints.length} learning stage${weakPoints.length === 1 ? "" : "s"} queued for review.`
              : "No weak points queued."}
          </p>
          <hr />
          <span className="eyebrow">课程</span>
          <p>已发布 {lessons.length} 节课程。</p>
        </aside>
      </div>
    </div>
  );
}
