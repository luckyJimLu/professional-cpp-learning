import { useEffect, useState } from 'react';
import { ArrowDown, ArrowRight, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
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

const SECTIONS = [
  { id: 'overview', label: '本章概览' },
  { id: 'artifacts', label: '登场法宝' },
  { id: 'stages', label: '三回阶梯' },
  { id: 'epilogue', label: '时期复盘' },
  { id: 'trial', label: '圆满试炼' },
] as const;

type SectionId = (typeof SECTIONS)[number]['id'];

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/** Highlights the section currently under the sticky toolbar. */
function useActiveSection(): SectionId {
  const [active, setActive] = useState<SectionId>('overview');
  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const toolbar = document.querySelector<HTMLElement>('.xt-toolbar');
      const offset = toolbar ? toolbar.getBoundingClientRect().bottom + 24 : 160;
      let current: SectionId = 'overview';
      for (const { id } of SECTIONS) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= offset) current = id;
      }
      const atBottom =
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
      setActive(atBottom ? 'trial' : current);
    };
    const onScroll = () => {
      if (!raf) raf = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, []);
  return active;
}

export function XianTuModule() {
  const era = ERA_01_LIANQI;
  const chapters = era.chapters;

  const [activeChapterId, setActiveChapterId] = useState<string>(chapters[0].id);
  const [activeRoundIndex, setActiveRoundIndex] = useState<number>(0);
  const [progress, setProgress] = useState<EraProgress>(() => loadEraProgress());
  const [confirmReset, setConfirmReset] = useState(false);
  const activeSection = useActiveSection();

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
      // Keep the reader in place unless the chapter hero is already above the fold.
      const overview = document.getElementById('overview');
      if (overview && overview.getBoundingClientRect().top < 0) {
        window.requestAnimationFrame(() => scrollToSection('overview'));
      }
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

  // Era-wide cultivation realm across all mainline rounds + the mastery trial
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
    <div className="xiantu-page">
      {/* 1. Page header — same structure as the other modules */}
      <header className="page-header xt-page-header">
        <div className="min-w-0">
          <span className="page-eyebrow">仙途 · {era.eraLabel}</span>
          <h1>C++ 修仙录</h1>
          <p className="page-description">
            以修仙小说串起现代 C++23：每章三回历练，读故事、鉴法宝、上手演练，最后以心魔试炼检验道基。
          </p>
        </div>
        <div className="xt-realm">
          <div className="xt-realm-text">
            <small>当前修为境界</small>
            <strong>{currentEraRealm}</strong>
          </div>
          {hasAnyProgress && (
            <Button
              variant="outline"
              size="sm"
              onClick={resetAllEraProgress}
              className={
                confirmReset
                  ? 'border-[var(--xt-cinnabar)] text-[var(--xt-cinnabar)] hover:bg-[var(--xt-cinnabar-soft)] hover:text-[var(--xt-cinnabar)]'
                  : 'text-[var(--muted)]'
              }
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" strokeWidth={1.8} />
              {confirmReset ? '再次点击确认重置' : '重置记录'}
            </Button>
          )}
        </div>
      </header>

      {/* 2. Era progress summary */}
      <dl className="xt-card xt-stats" aria-label="炼气期修行进度">
        <div>
          <dt>主线进度</dt>
          <dd>
            {completedEraCount} / {totalEraRounds} 回
          </dd>
        </div>
        <div>
          <dt>第 {chapter.chapterNumber} 章进度</dt>
          <dd className={isChapterComplete ? 'text-[var(--xt-jade)]' : undefined}>
            {chapterCompletedCount} / {chapter.rounds.length} 回
          </dd>
        </div>
        <div>
          <dt>宗门戒律</dt>
          <dd>
            {progress.checkedRuleIds.length} / {era.commandments.length} 条
          </dd>
        </div>
        <div>
          <dt>综合试炼</dt>
          <dd className="text-[var(--xt-cinnabar)]">
            {progress.solvedBugIds.length} / {era.trial.bugs.length} 处
          </dd>
        </div>
      </dl>

      {/* 3. Sticky toolbar: chapter switcher + in-page section navigation */}
      <div className="xt-toolbar">
        <div className="xt-chapter-tabs" role="tablist" aria-label="炼气期章节切换">
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
                className="xt-chapter-tab"
                onClick={() => handleSelectChapter(chap.id)}
              >
                <span>
                  第 {chap.chapterNumber} 章 · {chap.shortName}
                </span>
                <span
                  className="xt-chapter-count"
                  data-done={chapDone === chap.rounds.length}
                >
                  {chapDone}/{chap.rounds.length}
                </span>
              </button>
            );
          })}
        </div>

        <nav className="xt-section-nav" aria-label="仙途章节导航">
          {SECTIONS.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              aria-current={activeSection === section.id ? 'location' : undefined}
              onClick={(event) => {
                event.preventDefault();
                scrollToSection(section.id);
              }}
            >
              {section.label}
            </a>
          ))}
        </nav>
      </div>

      {/* 4. Chapter hero — the narrative opening (serif title, seal, prologue, ink plate) */}
      <section
        id="overview"
        data-xt-section
        key={chapter.id}
        className="xt-card overflow-hidden animate-panel-reveal"
        aria-label={`第 ${chapter.chapterNumber} 章概览`}
      >
        <div className="grid grid-cols-1 lg:grid-cols-12">
          <div className="lg:col-span-7 p-6 sm:p-8 lg:p-10 flex flex-col">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium text-[var(--muted)] mb-4">
              <span className="text-[var(--xt-jade)]">{era.title}</span>
              <span aria-hidden="true">·</span>
              <span>{chapter.stageLabel}</span>
              <span aria-hidden="true">·</span>
              <span>{chapter.realmStage}</span>
            </div>

            <div className="flex items-start justify-between gap-4 mb-6">
              <h2 className="font-editorial text-[28px] sm:text-[34px] font-semibold tracking-tight text-[var(--ink)] leading-[1.28] m-0">
                {chapter.title}
              </h2>
              <div className="pt-1.5 hidden sm:block">
                <SealStamp
                  label={isChapterComplete ? '本章悟道' : `卷之零${chapter.chapterNumber}`}
                  tone={isChapterComplete ? 'jade' : 'vermilion'}
                  size="md"
                />
              </div>
            </div>

            <div className="mb-8">
              <span className="text-xs font-semibold tracking-[0.16em] text-[var(--xt-gold)] block mb-2.5">
                楔子
              </span>
              <p className="text-[15.5px] sm:text-base leading-[1.85] text-[var(--xt-prose)] max-w-xl m-0 first-letter:font-editorial first-letter:text-[42px] first-letter:font-semibold first-letter:float-left first-letter:mr-2.5 first-letter:mt-1 first-letter:leading-[0.9] first-letter:text-[var(--xt-jade)]">
                <RichProse text={chapter.prologue} />
              </p>
            </div>

            <div className="mt-auto flex flex-wrap items-center gap-3">
              <Button onClick={() => scrollToSection('stages')}>
                进入三回阶梯
                <ArrowDown className="w-4 h-4 ml-1.5" strokeWidth={1.8} />
              </Button>
              <Button variant="outline" onClick={() => scrollToSection('artifacts')}>
                阅览登场法宝
              </Button>
            </div>
          </div>

          <figure className="lg:col-span-5 m-0 flex flex-col border-t lg:border-t-0 lg:border-l border-[var(--line)]">
            <div className="relative flex-1 min-h-[260px] sm:min-h-[320px] bg-[var(--canvas)]">
              <div className="absolute inset-0">
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
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-6 pt-10 pb-5 text-white">
                <p className="font-editorial text-base sm:text-lg leading-snug m-0">
                  {chapter.heroVerse}
                </p>
                <p className="text-xs text-white/85 mt-1 mb-0">{chapter.heroTagline}</p>
              </div>
            </div>
            <figcaption className="px-5 py-2.5 text-xs font-editorial text-[var(--muted)] text-right border-t border-[var(--line)] bg-[var(--canvas)]">
              {chapter.heroCaption}
            </figcaption>
          </figure>
        </div>
      </section>

      {/* 5. 本章登场法宝 */}
      <ArtifactGallery chapterNumber={chapter.chapterNumber} artifacts={chapter.artifacts} />

      {/* 6. 本章三回破境阶梯 + C++23 演练台 */}
      <CultivationStages
        chapterNumber={chapter.chapterNumber}
        rounds={chapter.rounds}
        activeRoundIndex={activeRoundIndex}
        completedRoundIds={progress.completedRoundIds}
        onSelectRound={setActiveRoundIndex}
        onToggleComplete={toggleRoundComplete}
      />

      {nextChapter && (
        <div className="xt-card xt-continue">
          <div>
            <small>下一卷宗 · {nextChapter.realmStage}</small>
            <strong>
              {nextChapter.title}（{nextChapter.stageLabel}）
            </strong>
          </div>
          <Button onClick={() => handleSelectChapter(nextChapter.id)}>
            前往第 {nextChapter.chapterNumber} 章
            <ArrowRight className="w-4 h-4 ml-1.5" strokeWidth={1.8} />
          </Button>
        </div>
      )}

      {/* 7. 第一时期总复盘 */}
      <EpilogueSection
        era={era}
        activeChapterId={chapter.id}
        checkedRuleIds={progress.checkedRuleIds}
        onToggleRule={toggleRuleCheck}
        onJumpToChapterRound={(chapterId, roundIdx) =>
          handleSelectChapter(chapterId, roundIdx, 'stages')
        }
      />

      {/* 8. 炼气期大圆满综合试炼 */}
      <HeartDemonTrial
        eraLabel={era.eraLabel}
        trial={era.trial}
        solvedBugIds={progress.solvedBugIds}
        onSolveBug={markBugSolved}
        onResetTrial={resetTrial}
      />

      {/* 9. Next era preview */}
      <div className="xt-card xt-continue" data-tone="gold">
        <div>
          <small>下一时期预告</small>
          <strong>{era.nextEraPreview}</strong>
          <p>待炼气期九回功成、五处综合心魔尽破，即可携无垢道基踏入筑基期架构设计与抽象之境。</p>
        </div>
        <Button variant="outline" onClick={() => handleSelectChapter(chapters[0].id, 0, 'overview')}>
          重温第 1 章卷首
        </Button>
      </div>
    </div>
  );
}
