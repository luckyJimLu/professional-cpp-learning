import type { KeyboardEvent } from 'react';
import { Check, ChevronLeft, ChevronRight } from 'lucide-react';
import type { XianTuRound } from '../types';
import { RoundSimulator } from './RoundSimulator';
import { RichProse } from './RichProse';
import { SealStamp } from './SealStamp';

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
    <section
      id="stages"
      className="py-16 md:py-22 bg-[#EEF1EE]/60 dark:bg-[#121917] border-t border-[#141918]/10 dark:border-[#E8ECEA]/10"
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
          <div>
            <p className="text-xs font-medium tracking-[0.14em] text-[#1E6B52] dark:text-[#5AB897] mb-2">
              第 {chapterNumber} 章主线历练 · 共 {rounds.length} 回 · 本章已悟道 {chapterCompletedCount}/{rounds.length}
            </p>
            <h2 className="font-editorial text-2xl sm:text-3xl font-semibold text-[#141918] dark:text-[#F0F4F2]">
              三回破境阶梯
            </h2>
          </div>
          <p className="text-sm text-[#525E5B] dark:text-[#9AA8A3] max-w-md leading-relaxed">
            左侧以静心古籍纵栏研读遇险、问道与点拨，右侧随屏驻留双模块实时演练台，边读边验证 C++23 语义（支持键盘左右方向键切回）。
          </p>
        </div>

        {/* Connected Realm Meridian Track (3 consolidated rounds per chapter) */}
        <div className="relative mb-10">
          <div
            className="hidden sm:block absolute left-10 right-10 top-1/2 -translate-y-1/2 h-[1px] bg-[#141918]/12 dark:bg-[#E8ECEA]/12"
            aria-hidden="true"
          >
            <div
              className="h-full bg-[#1E6B52] dark:bg-[#5AB897] transition-transform duration-300 ease-out origin-left"
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
                  className={`text-left px-4 py-3.5 rounded-lg border transition-all duration-150 min-h-[74px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1E6B52] ${
                    isActive
                      ? 'bg-[#141918] text-[#F6F7F5] border-[#141918] dark:bg-[#4FA687] dark:text-[#0E1614] dark:border-[#4FA687]'
                      : 'bg-white dark:bg-[#161F1C] text-[#141918] dark:text-[#E8ECEA] border-[#141918]/10 dark:border-[#E8ECEA]/10 hover:border-[#1E6B52]/50 dark:hover:border-[#5AB897]/50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 text-xs mb-1.5">
                    <span
                      className={`font-code whitespace-nowrap ${
                        isActive
                          ? 'text-white/80 dark:text-[#0E1614]/80'
                          : 'text-[#596662] dark:text-[#98A6A1]'
                      }`}
                    >
                      第 {round.index} 回 · {round.realm}
                    </span>
                    {done && (
                      <Check
                        className={`w-3.5 h-3.5 shrink-0 ${
                          isActive ? 'text-[#7CE0B9] dark:text-[#0E1614]' : 'text-[#1E6B52] dark:text-[#5AB897]'
                        }`}
                        strokeWidth={2}
                      />
                    )}
                  </div>
                  <div className="text-sm font-medium truncate">{round.shortTitle}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Open-Canvas Asymmetric Editorial Reading Column (7 cols) + Sticky Interactive Lab (5 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
          <article
            key={currentRound.id}
            className="lg:col-span-7 bg-white dark:bg-[#151D1B] rounded-xl border border-[#141918]/10 dark:border-[#E8ECEA]/10 p-6 sm:p-9 lg:p-10 animate-panel-reveal"
          >
            {/* Chapter Round Masthead */}
            <header className="pb-6 border-b border-[#141918]/10 dark:border-[#E8ECEA]/10 flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#596662] dark:text-[#98A6A1] mb-2.5">
                  <span>主线</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-code">
                    阶梯 {currentRound.index}/{currentRound.total}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="font-medium text-[#1E6B52] dark:text-[#5AB897]">
                    境界：{currentRound.realm}
                  </span>
                  {currentRound.isBossTrial && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="font-medium text-[#B83B2A] dark:text-[#E57363]">
                        心魔大劫
                      </span>
                    </>
                  )}
                </div>

                <h3 className="font-editorial text-2xl sm:text-[26px] font-semibold text-[#141918] dark:text-[#F0F4F2] leading-[1.32]">
                  {currentRound.title}
                </h3>
              </div>

              {isCompleted && (
                <SealStamp label="已悟道" tone="vermilion" size="md" animated />
              )}
            </header>

            {/* Serene Reading Column — 16px Chinese prose, 1.82 leading, generous rhythm, zero nested cards */}
            <div className="py-8 space-y-8 text-[15.5px] sm:text-base leading-[1.82] dark:leading-[1.88] dark:tracking-[0.012em] text-[#222D2A] dark:text-[#D2DBD8] max-w-[68ch]">
              {/* 遇险 */}
              <section aria-label="遇险">
                <h4 className="text-xs font-semibold tracking-[0.16em] text-[#B83B2A] dark:text-[#E57363] mb-2.5">
                  遇险
                </h4>
                <p>
                  <RichProse text={currentRound.peril} />
                </p>
              </section>

              {/* 问道 — Open typographic pull-dialogue separated by hairline top & bottom rules (no nested card) */}
              <section
                aria-label="问道"
                className="py-5 border-y border-[#141918]/10 dark:border-[#E8ECEA]/10"
              >
                <h4 className="text-xs font-semibold tracking-[0.16em] text-[#9A7B3E] dark:text-[#D4B36E] mb-2.5">
                  问道
                </h4>
                <p className="font-editorial text-[17px] leading-[1.75] text-[#141918] dark:text-[#EFF3F1]">
                  <RichProse text={currentRound.question} />
                </p>
              </section>

              {/* 点拨 */}
              <section aria-label="点拨">
                <h4 className="text-xs font-semibold tracking-[0.16em] text-[#1E6B52] dark:text-[#5AB897] mb-3">
                  点拨
                </h4>
                <div className="space-y-4">
                  {currentRound.guidance.map((paragraph, pIdx) => (
                    <p key={pIdx}>
                      {pIdx === 0 && (
                        <span className="font-semibold text-[#141918] dark:text-[#F0F4F2]">前辈：</span>
                      )}
                      <RichProse text={paragraph} />
                    </p>
                  ))}
                </div>
              </section>

              {/* 悟道 */}
              <section
                aria-label="悟道"
                className="pt-6 border-t border-[#141918]/10 dark:border-[#E8ECEA]/10 space-y-4"
              >
                <h4 className="text-xs font-semibold tracking-[0.16em] text-[#1E6B52] dark:text-[#5AB897]">
                  悟道
                </h4>
                <dl className="space-y-2.5 text-[15px]">
                  <div className="flex flex-col sm:flex-row sm:gap-3">
                    <dt className="font-semibold text-[#141918] dark:text-[#F0F4F2] shrink-0">主线</dt>
                    <dd className="text-[#3C4845] dark:text-[#BCC7C3]">
                      <RichProse text={currentRound.enlightenment.mainline} />
                    </dd>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:gap-3">
                    <dt className="font-semibold text-[#141918] dark:text-[#F0F4F2] shrink-0">破境</dt>
                    <dd className="text-[#3C4845] dark:text-[#BCC7C3]">
                      <RichProse text={currentRound.enlightenment.breakthrough} />
                    </dd>
                  </div>
                </dl>

                <blockquote className="pt-3 font-editorial text-lg sm:text-xl text-[#141918] dark:text-[#F0F4F2] tracking-wide">
                  「{currentRound.enlightenment.verse}」
                </blockquote>
              </section>
            </div>

            {/* Footer Controls */}
            <footer className="pt-6 border-t border-[#141918]/10 dark:border-[#E8ECEA]/10 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => onToggleComplete(currentRound.id)}
                className={`inline-flex items-center gap-2 min-h-[40px] px-4 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1E6B52] ${
                  isCompleted
                    ? 'bg-[#EEF6F2] dark:bg-[#172B24] text-[#1E6B52] dark:text-[#66C7A5] border border-[#1E6B52]/25 dark:border-[#5AB897]/30'
                    : 'bg-[#1E6B52] dark:bg-[#4FA687] text-white dark:text-[#0E1614] hover:opacity-90'
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
                  className="inline-flex items-center gap-1 min-h-[40px] px-3.5 py-2 text-xs font-medium rounded-lg border border-[#141918]/15 dark:border-[#E8ECEA]/15 text-[#141918] dark:text-[#E8ECEA] disabled:opacity-35 hover:border-[#1E6B52] transition-colors whitespace-nowrap"
                >
                  <ChevronLeft className="w-3.5 h-3.5" strokeWidth={1.6} />
                  上一回
                </button>
                <button
                  type="button"
                  disabled={activeRoundIndex === rounds.length - 1}
                  onClick={() => onSelectRound(activeRoundIndex + 1)}
                  className="inline-flex items-center gap-1 min-h-[40px] px-3.5 py-2 text-xs font-medium rounded-lg border border-[#141918]/15 dark:border-[#E8ECEA]/15 text-[#141918] dark:text-[#E8ECEA] disabled:opacity-35 hover:border-[#1E6B52] transition-colors whitespace-nowrap"
                >
                  下一回
                  <ChevronRight className="w-3.5 h-3.5" strokeWidth={1.6} />
                </button>
              </div>
            </footer>
          </article>

          {/* Right Sticky Interactive Sandbox */}
          <aside className="lg:col-span-5 lg:sticky lg:top-24">
            <RoundSimulator
              key={currentRound.id}
              type={currentRound.simulatorType}
              title={currentRound.simulatorTitle}
              subtitle={currentRound.simulatorSubtitle}
            />
          </aside>
        </div>
      </div>
    </section>
  );
}
