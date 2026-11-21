import { Check, CornerLeftUp } from 'lucide-react';
import type { XianTuEra } from '../types';
import { RichProse } from './RichProse';
import { SealStamp } from './SealStamp';
import { SectionHeader } from './SectionHeader';

interface EpilogueSectionProps {
  era: XianTuEra;
  activeChapterId: string;
  checkedRuleIds: string[];
  onToggleRule: (ruleId: string) => void;
  onJumpToChapterRound: (chapterId: string, roundIndexZeroBased: number) => void;
}

export function EpilogueSection({
  era,
  activeChapterId,
  checkedRuleIds,
  onToggleRule,
  onJumpToChapterRound,
}: EpilogueSectionProps) {
  const allRulesChecked =
    era.commandments.length > 0 && checkedRuleIds.length === era.commandments.length;

  const allVerses = era.chapters.flatMap((chap) =>
    chap.rounds.map((round, idx) => ({
      id: round.id,
      chapterId: chap.id,
      chapterNumber: chap.chapterNumber,
      roundIndex: round.index,
      roundZeroIndex: idx,
      realm: round.realm,
      text: round.enlightenment.verse,
    })),
  );

  return (
    <section id="epilogue" data-xt-section className="xt-section">
      <SectionHeader
        eyebrow="第一时期总复盘 · 炼气期功成回望"
        title="三章演进脉络与十大宗门戒律"
      />
      <p className="text-[15.5px] leading-[1.82] text-[var(--xt-prose)] max-w-3xl -mt-2 mb-8">
        <RichProse text={era.overview} />
      </p>

        {/* Era 1 Three-Chapter Evolution Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-12">
          {era.evolution.map((step) => {
            const isCurrent = step.chapterId === activeChapterId;
            return (
              <button
                key={step.chapterId}
                type="button"
                onClick={() => onJumpToChapterRound(step.chapterId, 0)}
                className={`text-left p-6 rounded-xl border transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--blue)] ${
                  isCurrent
                    ? 'bg-white border-[var(--xt-jade)]'
                    : 'bg-white/80 border-[var(--line)] hover:border-[var(--xt-jade)]/45'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <span className="font-code text-xs text-[var(--muted)]">
                    第 {step.chapterNumber} 章
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs text-[var(--xt-jade)]">
                    <CornerLeftUp className="w-3 h-3" strokeWidth={1.6} />
                    {isCurrent ? '当前研习' : '切至本章'}
                  </span>
                </div>
                <h3 className="font-editorial text-xl font-semibold text-[var(--ink)] mb-2">
                  {step.keyword}
                </h3>
                <p className="text-sm text-[var(--xt-prose)] leading-[1.75]">
                  <RichProse text={step.summary} />
                </p>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* Interactive 10-rule Lianqi Era engineering checklist */}
          <div className="lg:col-span-7">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <h3 className="font-editorial text-xl font-semibold text-[var(--ink)]">
                  炼气期十大宗门戒律（行动清单）
                </h3>
                {allRulesChecked && <SealStamp label="十戒圆满" tone="jade" size="sm" animated />}
              </div>
              <span className="font-code text-xs text-[var(--muted)] whitespace-nowrap">
                已践行 {checkedRuleIds.length} / {era.commandments.length}
              </span>
            </div>

            <div className="divide-y divide-[var(--line)] border-y border-[var(--line)]">
              {era.commandments.map((rule, index) => {
                const checked = checkedRuleIds.includes(rule.id);
                const numLabel = String(index + 1).padStart(2, '0');
                return (
                  <div key={rule.id} className="py-4.5 flex items-start gap-4 transition-colors">
                    <button
                      type="button"
                      onClick={() => onToggleRule(rule.id)}
                      aria-pressed={checked}
                      aria-label={`标记戒律「${rule.title}」`}
                      className={`mt-0.5 w-5 h-5 rounded flex items-center justify-center shrink-0 border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--blue)] ${
                        checked
                          ? 'bg-[var(--xt-jade)] border-[var(--xt-jade)] text-white'
                          : 'border-[var(--line-strong)] bg-white hover:border-[var(--xt-jade)]'
                      }`}
                    >
                      {checked && <Check className="w-3.5 h-3.5" strokeWidth={2.2} />}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 mb-1.5">
                        <button
                          type="button"
                          onClick={() => onToggleRule(rule.id)}
                          className={`text-left text-[15px] font-semibold transition-colors ${
                            checked
                              ? 'text-[var(--xt-jade)]'
                              : 'text-[var(--ink)]'
                          }`}
                        >
                          <span className="font-code mr-1.5">{numLabel}.</span>
                          {rule.title}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            onJumpToChapterRound(rule.relatedChapterId, rule.relatedRoundIndex)
                          }
                          className="inline-flex items-center gap-1 text-xs text-[var(--muted)] hover:text-[var(--xt-jade)] transition-colors whitespace-nowrap shrink-0"
                        >
                          <CornerLeftUp className="w-3 h-3" strokeWidth={1.6} />
                          第 {rule.relatedChapterNumber} 章 · 第 {rule.relatedRoundIndex + 1} 回
                        </button>
                      </div>
                      <p className="text-sm sm:text-[14.5px] text-[var(--xt-prose)] leading-[1.75]">
                        <RichProse text={rule.detail} />
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Classical Nine Verses Scroll across all 3 chapters */}
          <div className="lg:col-span-5 rounded-xl bg-white border border-[var(--line)] p-6 sm:p-8 lg:sticky lg:top-[var(--xt-scroll-offset)]">
            <div className="pb-4 mb-5 border-b border-[var(--line)] flex items-end justify-between gap-2">
              <div>
                <p className="text-xs font-medium tracking-[0.14em] text-[var(--xt-gold)] mb-1">
                  炼气期九重心法口诀
                </p>
                <h3 className="font-editorial text-xl font-semibold text-[var(--ink)]">
                  九回偈语串烧
                </h3>
              </div>
              <span className="text-[11px] text-[var(--muted)]">点击可直达对应章节</span>
            </div>

            <ol className="divide-y divide-[var(--line)]">
              {allVerses.map((verse) => (
                <li key={verse.id}>
                  <button
                    type="button"
                    onClick={() => onJumpToChapterRound(verse.chapterId, verse.roundZeroIndex)}
                    className="w-full text-left group py-3 flex items-baseline justify-between gap-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--blue)]"
                  >
                    <div>
                      <span className="text-xs text-[var(--muted)] block mb-0.5">
                        第 {verse.chapterNumber} 章 · 第 {verse.roundIndex} 回 · {verse.realm}
                      </span>
                      <span className="font-editorial text-[16px] leading-snug text-[var(--ink)] group-hover:text-[var(--xt-jade)] transition-colors">
                        {verse.text}
                      </span>
                    </div>
                    <CornerLeftUp
                      className="w-3.5 h-3.5 text-[var(--muted)] group-hover:text-[var(--xt-jade)] shrink-0 transition-colors"
                      strokeWidth={1.6}
                    />
                  </button>
                </li>
              ))}
            </ol>
          </div>
        </div>
    </section>
  );
}
