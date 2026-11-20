import { useEffect, useState } from 'react';
import { ArrowDown, ArrowRight, Moon, RotateCcw, Sun } from 'lucide-react';
import { ERA_01_LIANQI } from './data/era01';
import { getXianTuChapterById } from './data/chapters';
import { EditorialPlate } from './components/EditorialPlate';
import { ResilientArtwork } from './components/ResilientArtwork';
import { ArtifactGallery } from './components/ArtifactGallery';
import { CultivationStages } from './components/CultivationStages';
import { EpilogueSection } from './components/EpilogueSection';
import { HeartDemonTrial } from './components/HeartDemonTrial';
import { RichProse } from './components/RichProse';
import { SealStamp } from './components/SealStamp';

interface EraProgress {
  completedRoundIds: string[];
  checkedRuleIds: string[];
  solvedBugIds: string[];
}

const STORAGE_KEY_V3 = 'xiantu_era01_progress_v3';

const EMPTY_ERA_PROGRESS: EraProgress = {
  completedRoundIds: [],
  checkedRuleIds: [],
  solvedBugIds: [],
};

function loadEraProgress(): EraProgress {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_V3);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<EraProgress>;
      return {
        completedRoundIds: Array.isArray(parsed.completedRoundIds) ? parsed.completedRoundIds : [],
        checkedRuleIds: Array.isArray(parsed.checkedRuleIds) ? parsed.checkedRuleIds : [],
        solvedBugIds: Array.isArray(parsed.solvedBugIds) ? parsed.solvedBugIds : [],
      };
    }
  } catch {
    // Ignore storage errors
  }
  return EMPTY_ERA_PROGRESS;
}

interface XianTuModuleProps {
  isDark: boolean;
  onToggleTheme: () => void;
}

export function XianTuModule({ isDark, onToggleTheme }: XianTuModuleProps) {
  const era = ERA_01_LIANQI;
  const chapters = era.chapters;

  const [activeChapterId, setActiveChapterId] = useState<string>(chapters[0].id);
  const [activeRoundIndex, setActiveRoundIndex] = useState<number>(0);
  const [progress, setProgress] = useState<EraProgress>(() => loadEraProgress());
  const [confirmReset, setConfirmReset] = useState(false);

  const chapter = getXianTuChapterById(activeChapterId);
  const chapterIndex = chapters.findIndex((c) => c.id === chapter.id);
  const nextChapter = chapters[chapterIndex + 1] ?? null;

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY_V3, JSON.stringify(progress));
    } catch {
      // Ignore storage quota or sandbox restrictions
    }
  }, [progress]);

  const handleSelectChapter = (chapterId: string, roundIndex = 0, scrollTargetId?: string) => {
    setActiveChapterId(chapterId);
    setActiveRoundIndex(roundIndex);
    setConfirmReset(false);

    if (scrollTargetId) {
      window.requestAnimationFrame(() => {
        const el = document.getElementById(scrollTargetId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const toggleRoundComplete = (roundId: string) => {
    setProgress((prev) => {
      const exists = prev.completedRoundIds.includes(roundId);
      return {
        ...prev,
        completedRoundIds: exists
          ? prev.completedRoundIds.filter((id) => id !== roundId)
          : [...prev.completedRoundIds, roundId],
      };
    });
  };

  const toggleRuleCheck = (ruleId: string) => {
    setProgress((prev) => {
      const exists = prev.checkedRuleIds.includes(ruleId);
      return {
        ...prev,
        checkedRuleIds: exists
          ? prev.checkedRuleIds.filter((id) => id !== ruleId)
          : [...prev.checkedRuleIds, ruleId],
      };
    });
  };

  const markBugSolved = (bugId: string) => {
    setProgress((prev) => {
      if (prev.solvedBugIds.includes(bugId)) return prev;
      return {
        ...prev,
        solvedBugIds: [...prev.solvedBugIds, bugId],
      };
    });
  };

  const resetTrial = () => {
    setProgress((prev) => ({
      ...prev,
      solvedBugIds: [],
    }));
  };

  const resetAllEraProgress = () => {
    if (!confirmReset) {
      setConfirmReset(true);
      window.setTimeout(() => setConfirmReset(false), 3500);
      return;
    }
    setProgress(EMPTY_ERA_PROGRESS);
    setConfirmReset(false);
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Compute dynamic Era 1 cultivation realm across all 9 mainline rounds + 5-bug mastery trial
  const totalEraRounds = chapters.reduce((acc, c) => acc + c.rounds.length, 0);
  const completedEraCount = progress.completedRoundIds.length;
  const chapterCompletedCount = chapter.rounds.filter((r) =>
    progress.completedRoundIds.includes(r.id),
  ).length;
  const isChapterComplete = chapterCompletedCount === chapter.rounds.length;
  const trialComplete = progress.solvedBugIds.length === era.trial.bugs.length;

  let currentEraRealm = '外门散修';
  if (completedEraCount >= totalEraRounds && trialComplete) {
    currentEraRealm = '炼气大圆满';
  } else if (completedEraCount >= 7) {
    currentEraRealm = '炼气后期';
  } else if (completedEraCount >= 4) {
    currentEraRealm = '炼气中期';
  } else if (completedEraCount >= 2) {
    currentEraRealm = '炼气小成';
  } else if (completedEraCount >= 1) {
    currentEraRealm = '炼气初期';
  }

  const hasAnyProgress =
    progress.completedRoundIds.length > 0 ||
    progress.checkedRuleIds.length > 0 ||
    progress.solvedBugIds.length > 0;

  return (
    <main>
      {/* Workspace Era Shelf & Chapter Switcher (below 3-zone top header contract) */}
      <div className="border-b border-[#141918]/10 dark:border-[#E8ECEA]/10 bg-[#EFF2EF]/75 dark:bg-[#131A18]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
            <span className="font-medium text-[#1E6B52] dark:text-[#5AB897] whitespace-nowrap">
              {era.eraLabel}
            </span>
            <span aria-hidden="true" className="text-[#141918]/20 dark:text-[#E8ECEA]/20">
              /
            </span>
            <div
              className="flex flex-wrap items-center gap-1.5"
              role="tablist"
              aria-label="炼气期章节切换"
            >
              {chapters.map((chap) => {
                const chapDone = chap.rounds.filter((r) =>
                  progress.completedRoundIds.includes(r.id),
                ).length;
                const isSelected = chap.id === chapter.id;
                return (
                  <button
                    key={chap.id}
                    type="button"
                    role="tab"
                    aria-selected={isSelected}
                    onClick={() => handleSelectChapter(chap.id)}
                    className={`min-h-[36px] px-3.5 py-1.5 rounded-md font-medium transition-colors whitespace-nowrap flex items-center gap-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1E6B52] ${
                      isSelected
                        ? 'bg-white dark:bg-[#1D2824] text-[#141918] dark:text-[#F0F4F2] shadow-xs ring-1 ring-[#141918]/8 dark:ring-[#E8ECEA]/10'
                        : 'text-[#525E5B] dark:text-[#98A6A1] hover:text-[#141918] dark:hover:text-white'
                    }`}
                  >
                    <span>
                      第 {chap.chapterNumber} 章 · {chap.shortName}
                    </span>
                    <span className="font-code text-[11px] opacity-65">
                      {chapDone}/{chap.rounds.length}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {hasAnyProgress && (
              <button
                type="button"
                onClick={resetAllEraProgress}
                className={`inline-flex items-center gap-1.5 min-h-[36px] px-3 py-1.5 text-xs font-medium rounded-md border transition-colors whitespace-nowrap ${
                  confirmReset
                    ? 'border-[#B83B2A] text-[#B83B2A] dark:border-[#E57363] dark:text-[#E57363] bg-[#FAF0EE] dark:bg-[#271614]'
                    : 'border-[#141918]/12 dark:border-[#E8ECEA]/12 bg-white dark:bg-[#17201D] text-[#596662] dark:text-[#98A6A1] hover:text-[#141918] dark:hover:text-white'
                }`}
              >
                <RotateCcw className="w-3.5 h-3.5" strokeWidth={1.6} />
                {confirmReset ? '再次点击确认重置' : '重置时期记录'}
              </button>
            )}

            <button
              type="button"
              onClick={onToggleTheme}
              className="inline-flex items-center gap-1.5 min-h-[36px] px-3 py-1.5 text-xs font-medium rounded-md border border-[#141918]/12 dark:border-[#E8ECEA]/12 bg-white dark:bg-[#17201D] text-[#3C4845] dark:text-[#C5D1CD] hover:border-[#1E6B52] dark:hover:border-[#5AB897] transition-colors whitespace-nowrap"
            >
              {isDark ? (
                <Sun className="w-3.5 h-3.5" strokeWidth={1.6} />
              ) : (
                <Moon className="w-3.5 h-3.5" strokeWidth={1.6} />
              )}
              {isDark ? '宣纸浅色' : '墨夜深色'}
            </button>
          </div>
        </div>
      </div>

      {/* Hero Editorial Monograph Split */}
      <section id="overview" className="py-12 md:py-16 lg:py-20 paper-frame-tint">
        <div key={chapter.id} className="max-w-7xl mx-auto px-6 lg:px-8 animate-panel-reveal">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
            <div className="lg:col-span-6 flex flex-col justify-between py-2">
              <div>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium text-[#596662] dark:text-[#98A6A1] mb-4">
                  <span className="text-[#1E6B52] dark:text-[#5AB897]">{era.title}</span>
                  <span aria-hidden="true">·</span>
                  <span>{chapter.stageLabel}</span>
                  <span aria-hidden="true">·</span>
                  <span>{chapter.realmStage}</span>
                </div>

                <div className="flex items-start justify-between gap-4 mb-6">
                  <h1 className="font-editorial text-3xl sm:text-4xl lg:text-[40px] font-semibold tracking-tight text-[#141918] dark:text-[#F0F4F2] leading-[1.24]">
                    {chapter.title}
                    <span className="block text-xl sm:text-2xl text-[#1E6B52] dark:text-[#5AB897] mt-2 font-medium">
                      {chapter.stageLabel}
                    </span>
                  </h1>
                  <div className="pt-1 hidden sm:block">
                    <SealStamp
                      label={isChapterComplete ? '本章悟道' : `卷之零${chapter.chapterNumber}`}
                      tone={isChapterComplete ? 'jade' : 'vermilion'}
                      size="md"
                    />
                  </div>
                </div>

                {/* Classical Prologue with Editorial Drop Cap */}
                <div className="mb-8">
                  <span className="text-xs font-semibold tracking-[0.16em] text-[#9A7B3E] dark:text-[#D4B36E] block mb-2.5">
                    楔子
                  </span>
                  <p className="text-[15.5px] sm:text-base leading-[1.85] dark:leading-[1.9] dark:tracking-[0.012em] text-[#283431] dark:text-[#CBD5D1] max-w-xl first-letter:font-editorial first-letter:text-[42px] first-letter:font-semibold first-letter:float-left first-letter:mr-2.5 first-letter:mt-1 first-letter:leading-[0.9] first-letter:text-[#1E6B52] dark:first-letter:text-[#5AB897]">
                    <RichProse text={chapter.prologue} />
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => scrollToSection('stages')}
                  className="inline-flex items-center gap-2 min-h-[42px] px-5 py-2.5 text-sm font-medium rounded-lg bg-[#1E6B52] dark:bg-[#4FA687] text-white dark:text-[#0E1614] hover:opacity-90 transition-opacity whitespace-nowrap"
                >
                  进入三回阶梯
                  <ArrowDown className="w-4 h-4" strokeWidth={1.6} />
                </button>
                <button
                  type="button"
                  onClick={() => scrollToSection('artifacts')}
                  className="min-h-[42px] px-5 py-2.5 text-sm font-medium rounded-lg border border-[#141918]/15 dark:border-[#E8ECEA]/15 bg-white/80 dark:bg-[#151D1B] text-[#141918] dark:text-[#E8ECEA] hover:border-[#1E6B52] dark:hover:border-[#5AB897] transition-colors whitespace-nowrap"
                >
                  阅览登场法宝
                </button>
              </div>
            </div>

            <figure className="lg:col-span-6 flex flex-col">
              <div className="relative flex-1 min-h-[280px] sm:min-h-[340px] rounded-xl overflow-hidden border border-[#141918]/10 dark:border-[#E8ECEA]/10 bg-[#ECEFED] dark:bg-[#19221F]">
                {chapter.heroPlateId ? (
                  <EditorialPlate
                    plateId={chapter.heroPlateId}
                    alt={chapter.heroImageAlt}
                    className="w-full h-full"
                  />
                ) : (
                  <ResilientArtwork
                    src={chapter.heroImageUrl ?? ''}
                    alt={chapter.heroImageAlt}
                    title={chapter.title}
                    className="w-full h-full lg:h-full object-cover"
                  />
                )}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/82 via-black/45 to-transparent px-6 py-5 text-white">
                  <p className="font-editorial text-base sm:text-lg leading-snug">
                    {chapter.heroVerse}
                  </p>
                  <p className="text-xs text-white/85 mt-1">{chapter.heroTagline}</p>
                </div>
              </div>
              <figcaption className="mt-2.5 text-xs font-editorial text-[#5E6B67] dark:text-[#93A19C] text-right">
                {chapter.heroCaption}
              </figcaption>
            </figure>
          </div>

          {/* Full-width 4-column Era 1 progress summary strip */}
          <dl className="mt-10 grid grid-cols-2 lg:grid-cols-4 border border-[#141918]/10 dark:border-[#E8ECEA]/10 rounded-xl bg-white dark:bg-[#151D1B] divide-y lg:divide-y-0 lg:divide-x divide-[#141918]/10 dark:divide-[#E8ECEA]/10">
            <div className="p-5">
              <dt className="text-xs text-[#596662] dark:text-[#98A6A1] mb-1.5">炼气期主线进度</dt>
              <dd className="font-code text-xl font-semibold text-[#141918] dark:text-[#F0F4F2]">
                {completedEraCount} / {totalEraRounds} 回
              </dd>
            </div>
            <div className="p-5">
              <dt className="text-xs text-[#596662] dark:text-[#98A6A1] mb-1.5">当前修为境界</dt>
              <dd className="font-editorial text-xl font-semibold text-[#1E6B52] dark:text-[#5AB897]">
                {currentEraRealm}
              </dd>
            </div>
            <div className="p-5">
              <dt className="text-xs text-[#596662] dark:text-[#98A6A1] mb-1.5">十大宗门戒律</dt>
              <dd className="font-code text-xl font-semibold text-[#141918] dark:text-[#F0F4F2]">
                {progress.checkedRuleIds.length} / {era.commandments.length} 条
              </dd>
            </div>
            <div className="p-5">
              <dt className="text-xs text-[#596662] dark:text-[#98A6A1] mb-1.5">大圆满综合试炼</dt>
              <dd className="font-code text-xl font-semibold text-[#B83B2A] dark:text-[#E57363]">
                {progress.solvedBugIds.length} / {era.trial.bugs.length} 处
              </dd>
            </div>
          </dl>
        </div>
      </section>

      {/* Section 2: 本章登场法宝 */}
      <ArtifactGallery chapterNumber={chapter.chapterNumber} artifacts={chapter.artifacts} />

      {/* Section 3: 本章三回破境阶梯 + 双模块 C++23 演练台 */}
      <CultivationStages
        chapterNumber={chapter.chapterNumber}
        rounds={chapter.rounds}
        activeRoundIndex={activeRoundIndex}
        completedRoundIds={progress.completedRoundIds}
        onSelectRound={setActiveRoundIndex}
        onToggleComplete={toggleRoundComplete}
      />

      {/* Next Chapter Transition Band (Chapters 1 & 2) */}
      {nextChapter && (
        <section className="py-10 bg-white/70 dark:bg-[#141C19] border-y border-[#141918]/10 dark:border-[#E8ECEA]/10">
          <div className="max-w-7xl mx-auto px-6 lg:px-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-xs font-medium tracking-[0.14em] text-[#1E6B52] dark:text-[#5AB897] mb-1">
                下一卷宗 · {nextChapter.realmStage}
              </p>
              <h3 className="font-editorial text-xl font-semibold text-[#141918] dark:text-[#F0F4F2]">
                {nextChapter.title}（{nextChapter.stageLabel}）
              </h3>
            </div>
            <button
              type="button"
              onClick={() => handleSelectChapter(nextChapter.id)}
              className="inline-flex items-center gap-2 min-h-[42px] px-5 py-2.5 text-sm font-medium rounded-lg bg-[#141918] text-[#F6F7F5] dark:bg-[#4FA687] dark:text-[#0E1614] hover:opacity-90 transition-opacity whitespace-nowrap self-start sm:self-auto"
            >
              前往第 {nextChapter.chapterNumber} 章
              <ArrowRight className="w-4 h-4" strokeWidth={1.6} />
            </button>
          </div>
        </section>
      )}

      {/* Section 4: 第一时期总复盘 · 三章脉络、十大宗门戒律、九回偈语串烧 */}
      <EpilogueSection
        era={era}
        activeChapterId={chapter.id}
        checkedRuleIds={progress.checkedRuleIds}
        onToggleRule={toggleRuleCheck}
        onJumpToChapterRound={(chapterId, roundIdx) =>
          handleSelectChapter(chapterId, roundIdx, 'stages')
        }
      />

      {/* Section 5: 炼气期大圆满综合试炼 · 5 处综合心魔排雷台 */}
      <HeartDemonTrial
        eraLabel={era.eraLabel}
        trial={era.trial}
        solvedBugIds={progress.solvedBugIds}
        onSolveBug={markBugSolved}
        onResetTrial={resetTrial}
      />

      {/* Next Era Quiet Monograph Preview Band */}
      <section className="py-12 border-t border-[#141918]/10 dark:border-[#E8ECEA]/10">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-xs font-medium tracking-[0.14em] text-[#9A7B3E] dark:text-[#D4B36E] mb-1">
              下一时期预告
            </p>
            <h3 className="font-editorial text-xl font-semibold text-[#141918] dark:text-[#F0F4F2]">
              {era.nextEraPreview}
            </h3>
            <p className="text-sm text-[#596662] dark:text-[#98A6A1] mt-1">
              待炼气期九回功成、五处综合心魔尽破，即可携无垢道基正式踏入筑基期架构设计与抽象之境。
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleSelectChapter(chapters[0].id)}
            className="inline-flex items-center gap-2 min-h-[42px] px-5 py-2.5 text-sm font-medium rounded-lg border border-[#141918]/15 dark:border-[#E8ECEA]/15 bg-white dark:bg-[#151D1B] text-[#141918] dark:text-[#E8ECEA] hover:border-[#1E6B52] dark:hover:border-[#5AB897] transition-colors whitespace-nowrap self-start sm:self-auto"
          >
            重温第 1 章卷首
          </button>
        </div>
      </section>
    </main>
  );
}
