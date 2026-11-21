import type { KeyboardEvent } from 'react';
import { Check, ChevronLeft, ChevronRight } from 'lucide-react';
import type { XianTuRound } from '../types';
import { RoundSimulator } from './RoundSimulator';
import { RichProse } from './RichProse';
import { SealStamp } from './SealStamp';
import { SectionHeader } from './SectionHeader';

interface CultivationStagesProps {
  chapterNumber: number;
  rounds: XianTuRound[];
  activeRoundIndex: number;
  completedRoundIds: string[];
  onSelectRound: (index: number) => void;
  onToggleComplete: (roundId: string) => void;
}

export function CultivationStages({
  chapterNumber,
  rounds,
  activeRoundIndex,
  completedRoundIds,
  onSelectRound,
  onToggleComplete,
}: CultivationStagesProps) {
  const currentRound = rounds[activeRoundIndex] ?? rounds[0];
  const isCompleted = completedRoundIds.includes(currentRound.id);
  const chapterCompletedCount = rounds.filter((r) => completedRoundIds.includes(r.id)).length;
  const progressPercent = rounds.length > 1 ? (activeRoundIndex / (rounds.length - 1)) * 100 : 100;

  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      onSelectRound((index + 1) % rounds.length);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      onSelectRound((index - 1 + rounds.length) % rounds.length);
    }
  };

  return (
    <section id="stages" data-xt-section className="xt-section">
      <SectionHeader
        eyebrow={`第 ${chapterNumber} 章主线历练 · 共 ${rounds.length} 回 · 本章已悟道 ${chapterCompletedCount}/${rounds.length}`}
        title="三回破境阶梯"
        description="左侧以古籍纵栏研读遇险、问道与点拨，右侧随屏驻留实时演练台，边读边验证 C++23 语义（支持键盘左右方向键切回）。"
      />

        {/* Connected Realm Meridian Track (3 consolidated rounds per chapter) */}
        <div className="relative mb-8">
          <div
            className="hidden sm:block absolute left-10 right-10 top-1/2 -translate-y-1/2 h-[1px] bg-[var(--line)]"
            aria-hidden="true"
          >
            <div
              className="h-full bg-[var(--blue)] transition-transform duration-300 ease-out origin-left"
              style={{ transform: `scaleX(${progressPercent / 100})` }}
            />
          </div>

          <div
            className="grid grid-cols-1 sm:grid-cols-3 gap-4 relative z-10"
            role="tablist"
            aria-label="境界回合选择"
            aria-orientation="horizontal"
          >
            {rounds.map((round, index) => {
              const isActive = index === activeRoundIndex;
              const done = completedRoundIds.includes(round.id);
              return (
                <button
                  key={round.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onKeyDown={(e) => handleTabKeyDown(e, index)}
                  onClick={() => onSelectRound(index)}
                  className={`text-left px-4 py-3.5 rounded-xl border transition-all duration-150 min-h-[72px] cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--blue)] ${
                    isActive
                      ? 'bg-[var(--surface)] text-[var(--ink)] border-[var(--blue)] ring-1 ring-[var(--blue)] shadow-2xs'
                      : 'bg-[var(--surface)] text-[var(--ink)] border-[var(--line)] hover:border-[var(--line-strong)]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 text-xs mb-1.5">
                    <span
                      className={`font-code whitespace-nowrap ${
                        isActive ? 'text-[var(--blue)] font-semibold' : 'text-[var(--muted)]'
                      }`}
                    >
                      第 {round.index} 回 · {round.realm}
                    </span>
                    {done && (
                      <Check
                        className="w-3.5 h-3.5 shrink-0 text-[var(--xt-jade)]"
                        strokeWidth={2.2}
                      />
                    )}
                  </div>
                  <div className="text-sm font-semibold truncate">{round.shortTitle}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Open-Canvas Asymmetric Editorial Reading Column (7 cols) + Sticky Interactive Lab (5 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
          <article
            key={currentRound.id}
            className="lg:col-span-7 bg-white rounded-xl border border-[var(--line)] p-6 sm:p-9 lg:p-10 animate-panel-reveal"
          >
            {/* Chapter Round Masthead */}
            <header className="pb-6 border-b border-[var(--line)] flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--muted)] mb-2.5">
                  <span>主线</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-code">
                    阶梯 {currentRound.index}/{currentRound.total}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="font-medium text-[var(--xt-jade)]">
                    境界：{currentRound.realm}
                  </span>
                  {currentRound.isBossTrial && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="font-medium text-[var(--xt-cinnabar)]">
                        心魔大劫
                      </span>
                    </>
                  )}
                </div>

                <h3 className="font-editorial text-2xl sm:text-[26px] font-semibold text-[var(--ink)] leading-[1.32]">
                  {currentRound.title}
                </h3>
              </div>

              {isCompleted && (
                <SealStamp label="已悟道" tone="vermilion" size="md" animated />
              )}
            </header>

            {/* Serene Reading Column — 16px Chinese prose, 1.82 leading, generous rhythm, zero nested cards */}
            <div className="py-8 space-y-8 text-[15.5px] sm:text-base leading-[1.82] text-[var(--xt-prose)] max-w-[68ch]">
              {/* 遇险 */}
              <section aria-label="遇险">
                <h4 className="text-xs font-semibold tracking-[0.16em] text-[var(--xt-cinnabar)] mb-2.5">
                  遇险
                </h4>
                <p>
                  <RichProse text={currentRound.peril} />
                </p>
              </section>

              {/* 问道 — Open typographic pull-dialogue separated by hairline top & bottom rules (no nested card) */}
              <section
                aria-label="问道"
                className="py-5 border-y border-[var(--line)]"
              >
                <h4 className="text-xs font-semibold tracking-[0.16em] text-[var(--xt-gold)] mb-2.5">
                  问道
                </h4>
                <p className="font-editorial text-[17px] leading-[1.75] text-[var(--ink)]">
                  <RichProse text={currentRound.question} />
                </p>
              </section>

              {/* 点拨 */}
              <section aria-label="点拨">
                <h4 className="text-xs font-semibold tracking-[0.16em] text-[var(--xt-jade)] mb-3">
                  点拨
                </h4>
                <div className="space-y-4">
                  {currentRound.guidance.map((paragraph, pIdx) => (
                    <p key={pIdx}>
                      {pIdx === 0 && (
                        <span className="font-semibold text-[var(--ink)]">前辈：</span>
                      )}
                      <RichProse text={paragraph} />
                    </p>
                  ))}
                </div>
              </section>

              {/* 悟道 */}
              <section
                aria-label="悟道"
                className="pt-6 border-t border-[var(--line)] space-y-4"
              >
                <h4 className="text-xs font-semibold tracking-[0.16em] text-[var(--xt-jade)]">
                  悟道
                </h4>
                <dl className="space-y-2.5 text-[15px]">
                  <div className="flex flex-col sm:flex-row sm:gap-3">
                    <dt className="font-semibold text-[var(--ink)] shrink-0">主线</dt>
                    <dd className="text-[var(--xt-prose)]">
                      <RichProse text={currentRound.enlightenment.mainline} />
                    </dd>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:gap-3">
                    <dt className="font-semibold text-[var(--ink)] shrink-0">破境</dt>
                    <dd className="text-[var(--xt-prose)]">
                      <RichProse text={currentRound.enlightenment.breakthrough} />
                    </dd>
                  </div>
                </dl>

                <blockquote className="pt-3 font-editorial text-lg sm:text-xl text-[var(--ink)] tracking-wide">
                  「{currentRound.enlightenment.verse}」
                </blockquote>
              </section>
            </div>

            {/* Footer Controls */}
            <footer className="pt-6 border-t border-[var(--line)] flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => onToggleComplete(currentRound.id)}
                className={`inline-flex items-center gap-2 min-h-[40px] px-4 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--blue)] ${
                  isCompleted
                    ? 'bg-[var(--xt-jade-soft)] text-[var(--xt-jade)] border border-[var(--xt-jade)]/25'
                    : 'bg-[var(--xt-jade)] text-white hover:opacity-90'
                }`}
              >
                <Check className="w-4 h-4" strokeWidth={1.8} />
                {isCompleted ? '已落印悟道（点击取消）' : '标记本回已掌握'}
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={activeRoundIndex === 0}
                  onClick={() => onSelectRound(activeRoundIndex - 1)}
                  className="inline-flex items-center gap-1 min-h-[40px] px-3.5 py-2 text-xs font-medium rounded-lg border border-[var(--line-strong)] text-[var(--ink)] disabled:opacity-35 hover:border-[var(--xt-jade)] transition-colors whitespace-nowrap"
                >
                  <ChevronLeft className="w-3.5 h-3.5" strokeWidth={1.6} />
                  上一回
                </button>
                <button
                  type="button"
                  disabled={activeRoundIndex === rounds.length - 1}
                  onClick={() => onSelectRound(activeRoundIndex + 1)}
                  className="inline-flex items-center gap-1 min-h-[40px] px-3.5 py-2 text-xs font-medium rounded-lg border border-[var(--line-strong)] text-[var(--ink)] disabled:opacity-35 hover:border-[var(--xt-jade)] transition-colors whitespace-nowrap"
                >
                  下一回
                  <ChevronRight className="w-3.5 h-3.5" strokeWidth={1.6} />
                </button>
              </div>
            </footer>
          </article>

          {/* Right Sticky Interactive Sandbox */}
          <aside className="lg:col-span-5 lg:sticky lg:top-[var(--xt-scroll-offset)]">
            <RoundSimulator
              key={currentRound.id}
              type={currentRound.simulatorType}
              title={currentRound.simulatorTitle}
              subtitle={currentRound.simulatorSubtitle}
            />
          </aside>
        </div>
    </section>
  );
}
