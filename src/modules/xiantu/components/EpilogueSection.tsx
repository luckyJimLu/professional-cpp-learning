import { Check, CornerLeftUp } from 'lucide-react';
import type { XianTuEra } from '../types';
import { RichProse } from './RichProse';
import { SealStamp } from './SealStamp';

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
    <section id="epilogue" className="py-16 md:py-22">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="wenwu-rule mb-12" aria-hidden="true" />

        <div className="max-w-3xl mb-10">
          <p className="text-xs font-medium tracking-[0.14em] text-[#1E6B52] dark:text-[#5AB897] mb-2">
            第一时期总复盘 · 炼气期功成回望
          </p>
          <h2 className="font-editorial text-2xl sm:text-3xl font-semibold text-[#141918] dark:text-[#F0F4F2] mb-4">
            三章演进脉络与十大宗门戒律
          </h2>
          <p className="text-[15.5px] sm:text-base leading-[1.82] dark:leading-[1.88] dark:tracking-[0.012em] text-[#2D3835] dark:text-[#C5D0CC]">
            <RichProse text={era.overview} />
          </p>
        </div>

        {/* Era 1 Three-Chapter Evolution Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-12">
          {era.evolution.map((step) => {
            const isCurrent = step.chapterId === activeChapterId;
            return (
              <button
                key={step.chapterId}
                type="button"
                onClick={() => onJumpToChapterRound(step.chapterId, 0)}
                className={`text-left p-6 rounded-xl border transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1E6B52] ${
                  isCurrent
                    ? 'bg-white dark:bg-[#161F1C] border-[#1E6B52] dark:border-[#5AB897]'
                    : 'bg-white/80 dark:bg-[#141B19] border-[#141918]/10 dark:border-[#E8ECEA]/10 hover:border-[#1E6B52]/45 dark:hover:border-[#5AB897]/45'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <span className="font-code text-xs text-[#596662] dark:text-[#98A6A1]">
                    第 {step.chapterNumber} 章
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs text-[#1E6B52] dark:text-[#5AB897]">
                    <CornerLeftUp className="w-3 h-3" strokeWidth={1.6} />
                    {isCurrent ? '当前研习' : '切至本章'}
                  </span>
                </div>
                <h3 className="font-editorial text-xl font-semibold text-[#141918] dark:text-[#F0F4F2] mb-2">
                  {step.keyword}
                </h3>
                <p className="text-sm text-[#45514E] dark:text-[#AAB7B3] leading-[1.75]">
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
                <h3 className="font-editorial text-xl font-semibold text-[#141918] dark:text-[#F0F4F2]">
                  炼气期十大宗门戒律（行动清单）
                </h3>
                {allRulesChecked && <SealStamp label="十戒圆满" tone="jade" size="sm" animated />}
              </div>
              <span className="font-code text-xs text-[#596662] dark:text-[#98A6A1] whitespace-nowrap">
                已践行 {checkedRuleIds.length} / {era.commandments.length}
              </span>
            </div>

            <div className="divide-y divide-[#141918]/10 dark:divide-[#E8ECEA]/10 border-y border-[#141918]/10 dark:border-[#E8ECEA]/10">
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
                      className={`mt-0.5 w-5 h-5 rounded flex items-center justify-center shrink-0 border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1E6B52] ${
                        checked
                          ? 'bg-[#1E6B52] border-[#1E6B52] dark:bg-[#4FA687] dark:border-[#4FA687] text-white dark:text-[#0E1614]'
                          : 'border-[#141918]/25 dark:border-[#E8ECEA]/25 bg-white dark:bg-[#161E1C] hover:border-[#1E6B52]'
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
                              ? 'text-[#1E6B52] dark:text-[#5AB897]'
                              : 'text-[#141918] dark:text-[#F0F4F2]'
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
                          className="inline-flex items-center gap-1 text-xs text-[#596662] dark:text-[#98A6A1] hover:text-[#1E6B52] dark:hover:text-[#5AB897] transition-colors whitespace-nowrap shrink-0"
                        >
                          <CornerLeftUp className="w-3 h-3" strokeWidth={1.6} />
                          第 {rule.relatedChapterNumber} 章 · 第 {rule.relatedRoundIndex + 1} 回
                        </button>
                      </div>
                      <p className="text-sm sm:text-[14.5px] text-[#45514E] dark:text-[#AAB7B3] leading-[1.75]">
                        <RichProse text={rule.detail} />
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Classical Nine Verses Scroll across all 3 chapters */}
          <div className="lg:col-span-5 rounded-xl bg-white dark:bg-[#151D1B] border border-[#141918]/10 dark:border-[#E8ECEA]/10 p-6 sm:p-8 lg:sticky lg:top-24">
            <div className="pb-4 mb-5 border-b border-[#141918]/10 dark:border-[#E8ECEA]/10 flex items-end justify-between gap-2">
              <div>
                <p className="text-xs font-medium tracking-[0.14em] text-[#9A7B3E] dark:text-[#D4B36E] mb-1">
                  炼气期九重心法口诀
                </p>
                <h3 className="font-editorial text-xl font-semibold text-[#141918] dark:text-[#F0F4F2]">
                  九回偈语串烧
                </h3>
              </div>
              <span className="text-[11px] text-[#6B7874] dark:text-[#8E9D98]">点击可直达对应章节</span>
            </div>

            <ol className="divide-y divide-[#141918]/8 dark:divide-[#E8ECEA]/8">
              {allVerses.map((verse) => (
                <li key={verse.id}>
                  <button
                    type="button"
                    onClick={() => onJumpToChapterRound(verse.chapterId, verse.roundZeroIndex)}
                    className="w-full text-left group py-3 flex items-baseline justify-between gap-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1E6B52]"
                  >
                    <div>
                      <span className="text-xs text-[#596662] dark:text-[#98A6A1] block mb-0.5">
                        第 {verse.chapterNumber} 章 · 第 {verse.roundIndex} 回 · {verse.realm}
                      </span>
                      <span className="font-editorial text-[16px] leading-snug text-[#141918] dark:text-[#F0F4F2] group-hover:text-[#1E6B52] dark:group-hover:text-[#5AB897] transition-colors">
                        {verse.text}
                      </span>
                    </div>
                    <CornerLeftUp
                      className="w-3.5 h-3.5 text-[#8C9995] group-hover:text-[#1E6B52] dark:group-hover:text-[#5AB897] shrink-0 transition-colors"
                      strokeWidth={1.6}
                    />
                  </button>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
