import { useEffect, useState } from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
  HelpCircle,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { XianTuTrial } from '../types';
import { RichProse } from './RichProse';
import { SealStamp } from './SealStamp';
import { SectionHeader } from './SectionHeader';

interface HeartDemonTrialProps {
  eraLabel: string;
  trial: XianTuTrial;
  solvedBugIds: string[];
  onSolveBug: (bugId: string) => void;
  onResetTrial: () => void;
}

export function HeartDemonTrial({
  eraLabel,
  trial,
  solvedBugIds,
  onSolveBug,
  onResetTrial,
}: HeartDemonTrialProps) {
  const defaultBugId = trial.bugs[0]?.id ?? null;
  const [selectedBugId, setSelectedBugId] = useState<string | null>(defaultBugId);
  const [selectedOptionMap, setSelectedOptionMap] = useState<Record<string, string>>({});
  const [showHint, setShowHint] = useState(false);
  const [showFixedCode, setShowFixedCode] = useState(false);
  const [cleanLineNotice, setCleanLineNotice] = useState<number | null>(null);
  const [copiedFixed, setCopiedFixed] = useState(false);

  useEffect(() => {
    setSelectedBugId(trial.bugs[0]?.id ?? null);
    setSelectedOptionMap({});
    setShowHint(false);
    setShowFixedCode(false);
    setCleanLineNotice(null);
    setCopiedFixed(false);
  }, [trial]);

  const allSolved = solvedBugIds.length === trial.bugs.length;
  const activeBug = trial.bugs.find((b) => b.id === selectedBugId) ?? null;

  const handleLineClick = (lineNumber: number, bugId?: string) => {
    if (bugId) {
      setSelectedBugId(bugId);
      setCleanLineNotice(null);
    } else {
      setSelectedBugId(null);
      setCleanLineNotice(lineNumber);
    }
  };

  const handleChooseOption = (bugId: string, optionId: string, isCorrect: boolean) => {
    setSelectedOptionMap((prev) => ({ ...prev, [bugId]: optionId }));
    if (isCorrect) {
      onSolveBug(bugId);
    }
  };

  const handleReset = () => {
    setSelectedOptionMap({});
    setShowFixedCode(false);
    setCleanLineNotice(null);
    setSelectedBugId(defaultBugId);
    onResetTrial();
  };

  const handleCopyFixed = async () => {
    try {
      await navigator.clipboard.writeText(trial.fixedFullCode);
      setCopiedFixed(true);
      window.setTimeout(() => setCopiedFixed(false), 1800);
    } catch {
      // Clipboard unavailable in restricted sandbox
    }
  };

  const formatBugLines = (lineNumber: number, secondaryLineNumber?: number) =>
    secondaryLineNumber ? `L${lineNumber}/L${secondaryLineNumber}` : `L${lineNumber}`;

  return (
    <section id="trial" data-xt-section className="xt-section">
      <SectionHeader
        tone="cinnabar"
        eyebrow={`${eraLabel}终极考核 · 已识破 ${solvedBugIds.length} / ${trial.bugs.length} 处心魔`}
        title={trial.title}
        titleAddon={
          allSolved ? <SealStamp label="炼气圆满" tone="vermilion" size="md" animated /> : null
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowHint((v) => !v)}>
              <HelpCircle className="w-3.5 h-3.5 mr-1.5" strokeWidth={1.6} />
              {showHint ? '隐藏提示' : '查看提示'}
            </Button>

            <Button variant="outline" size="sm" onClick={() => setShowFixedCode((v) => !v)}>
              {showFixedCode ? (
                <EyeOff className="w-3.5 h-3.5 mr-1.5" strokeWidth={1.6} />
              ) : (
                <Eye className="w-3.5 h-3.5 mr-1.5" strokeWidth={1.6} />
              )}
              {showFixedCode ? '收起正道代码' : '查看修复代码'}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="text-[var(--muted)]"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" strokeWidth={1.6} />
              重置试炼
            </Button>
          </div>
        }
      />

        <p className="text-[15px] text-[var(--xt-prose)] mb-5 leading-relaxed max-w-4xl">
          <RichProse text={trial.intro} />
        </p>

        {showHint && (
          <div className="mb-6 p-4 rounded-lg bg-[var(--xt-gold-soft)] border border-[var(--xt-gold)]/25 text-sm text-[var(--xt-gold-ink)] leading-relaxed animate-panel-reveal">
            <RichProse text={trial.hint} />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Interactive clickable C++23 code editor surface */}
          <div className="lg:col-span-6 rounded-xl bg-[var(--code)] text-[#E3ECE8] border border-[#25332F] overflow-hidden flex flex-col">
            <div className="px-5 py-3.5 border-b border-white/10 flex items-center justify-between text-xs text-[#9AB0A8]">
              <span className="font-code">{trial.filename} · C++23</span>
              <span>点击任意代码行排查心魔</span>
            </div>

            <div className="p-3 sm:p-4 font-code text-xs sm:text-[13px] leading-6 flex-1 overflow-x-auto">
              {trial.codeLines.map((line) => {
                const isBugLine = Boolean(line.bugId);
                const isSolved = line.bugId ? solvedBugIds.includes(line.bugId) : false;
                const isSelected = Boolean(
                  activeBug &&
                    (activeBug.lineNumber === line.lineNumber ||
                      activeBug.secondaryLineNumber === line.lineNumber ||
                      (line.bugId && line.bugId === activeBug.id)),
                );
                const isEmpty = line.content.trim() === '';

                return (
                  <button
                    key={line.lineNumber}
                    type="button"
                    disabled={isEmpty}
                    onClick={() => handleLineClick(line.lineNumber, line.bugId)}
                    className={`w-full text-left flex items-center gap-4 px-3 py-1 rounded transition-colors ${
                      isEmpty
                        ? 'cursor-default h-5'
                        : isSelected
                          ? 'bg-[#263E35] text-white'
                          : isSolved
                            ? 'bg-[#173027] text-[#A8DFCA] hover:bg-[#1E3B30]'
                            : 'hover:bg-white/6 text-[#DCE6E2]'
                    }`}
                  >
                    <span className="w-5 text-right select-none text-[#6C827A] shrink-0">
                      {line.lineNumber}
                    </span>
                    <span className="whitespace-pre flex-1">{line.content}</span>
                    {isBugLine && isSolved && (
                      <span className="text-[11px] font-sans text-[#68D3AD] whitespace-nowrap shrink-0">
                        已破妄
                      </span>
                    )}
                    {isBugLine && !isSolved && isSelected && (
                      <span className="text-[11px] font-sans text-[#F09A8E] whitespace-nowrap shrink-0">
                        排查中
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="px-5 py-3.5 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs text-[#9AB0A8]">
              <span>快捷定位 {trial.bugs.length} 处心魔：</span>
              <div className="flex flex-wrap items-center gap-1.5">
                {trial.bugs.map((bug, idx) => {
                  const solved = solvedBugIds.includes(bug.id);
                  const isActive = selectedBugId === bug.id;
                  return (
                    <button
                      key={bug.id}
                      type="button"
                      onClick={() => {
                        setSelectedBugId(bug.id);
                        setCleanLineNotice(null);
                      }}
                      className={`min-h-[30px] px-2.5 py-1 rounded font-code text-[11px] transition-colors whitespace-nowrap ${
                        isActive
                          ? 'bg-[#4FA687] text-[#0E1614] font-semibold'
                          : solved
                            ? 'bg-[#1D3B31] text-[#8EE0C1]'
                            : 'bg-white/8 text-[#DCE6E2] hover:bg-white/15'
                      }`}
                    >
                      心魔{idx + 1} ({formatBugLines(bug.lineNumber, bug.secondaryLineNumber)}) {solved ? '✓' : ''}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Diagnostic Panel */}
          <div className="lg:col-span-6 rounded-xl bg-white border border-[var(--line)] p-6 sm:p-7 flex flex-col">
            {activeBug ? (
              <div key={activeBug.id} className="flex-1 flex flex-col animate-panel-reveal">
                <div className="pb-4 mb-5 border-b border-[var(--line)]">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--muted)] mb-1.5">
                    <span className="font-code">
                      {activeBug.secondaryLineNumber
                        ? `第 ${activeBug.lineNumber} / ${activeBug.secondaryLineNumber} 行`
                        : `第 ${activeBug.lineNumber} 行`}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="font-medium text-[var(--xt-jade)]">
                      {activeBug.dimension}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="font-medium text-[var(--xt-cinnabar)]">
                      {activeBug.category}
                    </span>
                  </div>
                  <h3 className="font-editorial text-lg sm:text-xl font-semibold text-[var(--ink)]">
                    {activeBug.title}
                  </h3>
                  <code className="font-code text-xs block mt-2.5 px-3.5 py-2.5 rounded-lg bg-[var(--canvas)] text-[var(--ink)] border border-[var(--line)] overflow-x-auto">
                    {activeBug.codeExcerpt}
                  </code>
                </div>

                <p className="text-sm sm:text-[15px] text-[var(--xt-prose)] mb-4 leading-relaxed">
                  <RichProse text={activeBug.prompt} />
                </p>

                <div className="space-y-2.5 mb-5">
                  {activeBug.options.map((opt) => {
                    const chosenId = selectedOptionMap[activeBug.id];
                    const isChosen = chosenId === opt.id;
                    const isBugSolved = solvedBugIds.includes(activeBug.id);

                    let borderClass =
                      'border-[var(--line)] hover:border-[var(--xt-jade)]';
                    if (isChosen && opt.isCorrect) {
                      borderClass =
                        'border-[var(--xt-jade)] bg-[var(--xt-jade-soft)]';
                    } else if (isChosen && !opt.isCorrect) {
                      borderClass =
                        'border-[var(--xt-cinnabar)] bg-[var(--xt-cinnabar-soft)]';
                    } else if (isBugSolved && opt.isCorrect) {
                      borderClass =
                        'border-[var(--xt-jade)]/50 bg-[var(--xt-jade-soft)]/60';
                    }

                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => handleChooseOption(activeBug.id, opt.id, opt.isCorrect)}
                        className={`w-full text-left p-3.5 rounded-lg border text-xs sm:text-sm leading-relaxed transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--blue)] ${borderClass}`}
                      >
                        <div className="flex items-start gap-2.5">
                          <span className="mt-0.5 shrink-0">
                            {isChosen && opt.isCorrect ? (
                              <CheckCircle2 className="w-4 h-4 text-[var(--xt-jade)]" strokeWidth={1.8} />
                            ) : isChosen && !opt.isCorrect ? (
                              <AlertCircle className="w-4 h-4 text-[var(--xt-cinnabar)]" strokeWidth={1.8} />
                            ) : (
                              <span className="block w-4 h-4 rounded-full border border-[var(--line-strong)]" />
                            )}
                          </span>
                          <span className="text-[var(--ink)]">
                            <RichProse text={opt.label} />
                          </span>
                        </div>
                        {isChosen && (
                          <p
                            className={`mt-2.5 pl-6 text-xs leading-relaxed ${
                              opt.isCorrect
                                ? 'text-[var(--xt-jade-ink)]'
                                : 'text-[var(--xt-cinnabar-ink)]'
                            }`}
                          >
                            <RichProse text={opt.feedback} />
                          </p>
                        )}
                      </button>
                    );
                  })}
                </div>

                {solvedBugIds.includes(activeBug.id) && (
                  <div className="mt-auto pt-4 border-t border-[var(--line)] text-xs space-y-2">
                    <div className="font-semibold text-[var(--xt-jade)]">正道修复写法</div>
                    <pre className="font-code block p-3 rounded-lg bg-[var(--xt-jade-soft)] text-[var(--xt-jade-ink)] border border-[var(--xt-jade)]/15 whitespace-pre-wrap overflow-x-auto">
                      <code>{activeBug.fixedLine}</code>
                    </pre>
                  </div>
                )}
              </div>
            ) : cleanLineNotice !== null ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
                <ShieldCheck className="w-9 h-9 text-[var(--xt-jade)] mb-3" strokeWidth={1.5} />
                <h3 className="font-editorial text-lg font-semibold text-[var(--ink)] mb-2">
                  第 {cleanLineNotice} 行清净无碍
                </h3>
                <p className="text-sm text-[var(--muted)] max-w-sm leading-relaxed">
                  这一行代码本身并无致命心魔。请继续排查左侧代码中的隐患行，或点击下方快捷定位按钮直接切入。
                </p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
                <p className="text-sm text-[var(--muted)]">
                  请在左侧代码中点击疑似存在心魔的代码行开始排查。
                </p>
              </div>
            )}
          </div>
        </div>

        {allSolved && (
          <div className="mt-6 p-6 rounded-xl bg-[var(--xt-jade-soft)] border border-[var(--xt-jade)]/25 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-panel-reveal">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-[var(--xt-jade)] shrink-0 mt-0.5" strokeWidth={1.8} />
              <div>
                <h3 className="font-editorial text-lg font-semibold text-[var(--xt-jade-ink)]">
                  五处综合心魔尽数破除 · 炼气期大圆满
                </h3>
                <p className="text-xs sm:text-sm text-[var(--xt-jade-ink)] mt-1 leading-relaxed">
                  元信息与保留字命名、统一初始化防窄化、单行 if 括号与求值顺序、返回局部悬垂视图以及临时字符串视图绑定五重关卡尽数通关，可展开完整正道代码留存对照。
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowFixedCode(true)}
              className="min-h-[40px] px-4 py-2 text-xs font-medium rounded-lg bg-[var(--xt-jade)] text-white hover:opacity-90 transition-opacity whitespace-nowrap shrink-0"
            >
              检视完整正道代码
            </button>
          </div>
        )}

        {showFixedCode && (
          <div className="mt-6 rounded-xl bg-[var(--code)] text-[#E3ECE8] border border-[#25332F] p-5 sm:p-6 animate-panel-reveal">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3.5">
              <span className="text-xs font-semibold text-[#68D3AD]">
                现代 C++23 完整修复版 · {trial.filename}
              </span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleCopyFixed}
                  className="inline-flex items-center gap-1.5 text-xs text-[#A8C2B8] hover:text-white transition-colors whitespace-nowrap"
                >
                  {copiedFixed ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-[#68D3AD]" strokeWidth={1.8} />
                      已复制
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" strokeWidth={1.6} />
                      复制代码
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowFixedCode(false)}
                  className="text-xs text-[#9AB0A8] hover:text-white transition-colors"
                >
                  收起
                </button>
              </div>
            </div>
            <pre className="font-code text-xs sm:text-[13px] leading-[1.7] overflow-x-auto text-[#D5E8E0]">
              <code>{trial.fixedFullCode}</code>
            </pre>
          </div>
        )}
    </section>
  );
}
