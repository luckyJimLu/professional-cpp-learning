import { useEffect, useState } from 'react';
import { Check, Copy, ShieldAlert, X } from 'lucide-react';
import type { XianTuArtifact } from '../types';
import { EditorialPlate } from './EditorialPlate';
import { ResilientArtwork } from './ResilientArtwork';
import { RichProse } from './RichProse';
import { SectionHeader } from './SectionHeader';

interface ArtifactGalleryProps {
  chapterNumber: number;
  artifacts: XianTuArtifact[];
}

export function ArtifactGallery({ chapterNumber, artifacts }: ArtifactGalleryProps) {
  const [selectedId, setSelectedId] = useState<string>(artifacts[0]?.id ?? '');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    setSelectedId(artifacts[0]?.id ?? '');
    setCopiedId(null);
  }, [artifacts]);

  const activeArtifact = artifacts.find((item) => item.id === selectedId) ?? artifacts[0];
  const activeIndex = Math.max(
    0,
    artifacts.findIndex((item) => item.id === activeArtifact?.id),
  );

  const handleCopyModern = async () => {
    if (!activeArtifact) return;
    try {
      await navigator.clipboard.writeText(activeArtifact.modernCode);
      setCopiedId(activeArtifact.id);
      window.setTimeout(() => {
        setCopiedId((prev) => (prev === activeArtifact.id ? null : prev));
      }, 1800);
    } catch {
      // Clipboard unavailable in restricted sandbox
    }
  };

  return (
    <section id="artifacts" data-xt-section className="xt-section">
      <SectionHeader
        eyebrow={`第 ${chapterNumber} 章器物谱 · 共 ${artifacts.length} 件本命法宝`}
        title="登场法宝"
        description="点选任意器物图版，在下方展台细察其本命神通、致命弱点，以及旧式写法与现代 C++23 正道写法的代码对照。"
      />

        {/* Tier 2 Museum Catalog Grid — Clean, uncrowded 4-plate gallery */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4" role="tablist" aria-label="登场法宝图谱">
          {artifacts.map((artifact, idx) => {
            const isSelected = artifact.id === activeArtifact?.id;
            return (
              <button
                key={artifact.id}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => setSelectedId(artifact.id)}
                className={`group text-left flex flex-col rounded-xl overflow-hidden transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--blue)] ${
                  isSelected
                    ? 'bg-white ring-2 ring-[var(--blue)]'
                    : 'bg-white/80 border border-[var(--line)] hover:border-[var(--xt-jade)]/45'
                }`}
              >
                <div className="aspect-[4/3] w-full overflow-hidden bg-[var(--canvas)] relative">
                  {artifact.plateId ? (
                    <EditorialPlate
                      plateId={artifact.plateId}
                      alt={artifact.imageAlt}
                      className="w-full h-full transition-transform duration-300 ease-out group-hover:scale-[1.03]"
                    />
                  ) : (
                    <ResilientArtwork
                      src={artifact.imageUrl ?? ''}
                      alt={artifact.imageAlt}
                      title={artifact.name}
                      className="w-full h-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.03]"
                    />
                  )}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent px-4 py-2.5 flex items-center justify-between gap-2">
                    <span className="font-code text-xs text-white/95 truncate">{artifact.syntax}</span>
                    <span className="font-code text-[11px] text-white/75 shrink-0">0{idx + 1}</span>
                  </div>
                </div>

                <div className="p-5 flex-1 flex flex-col">
                  <div className="flex items-baseline justify-between gap-2 mb-2">
                    <h3 className="font-editorial text-lg font-semibold text-[var(--ink)]">
                      {artifact.name}
                    </h3>
                    <span
                      className={`text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                        isSelected
                          ? 'text-[var(--xt-jade)]'
                          : 'text-[var(--muted)] group-hover:text-[var(--ink)]'
                      }`}
                    >
                      {isSelected ? '正在鉴赏' : '展开详参'}
                    </span>
                  </div>
                  <p className="text-sm text-[var(--muted)] leading-relaxed">
                    {artifact.identity}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Dedicated Museum Inspection Bench for the Active Artifact */}
        {activeArtifact && (
          <div
            key={activeArtifact.id}
            className="mt-8 rounded-xl bg-white border border-[var(--line)] p-6 sm:p-8 animate-panel-reveal"
          >
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-6 border-b border-[var(--line)]">
              <div>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--muted)] mb-1.5">
                  <span className="font-code">器物 0{activeIndex + 1}</span>
                  <span aria-hidden="true">·</span>
                  <span>{activeArtifact.identity}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-code text-[var(--xt-jade)]">
                    {activeArtifact.syntax}
                  </span>
                </div>
                <h3 className="font-editorial text-xl sm:text-2xl font-semibold text-[var(--ink)]">
                  {activeArtifact.name} · 器物图说与代码对照
                </h3>
              </div>

              <button
                type="button"
                onClick={handleCopyModern}
                className="inline-flex items-center justify-center gap-1.5 min-h-[40px] px-4 py-2 text-xs font-medium rounded-lg border border-[var(--line-strong)] text-[var(--ink)] hover:border-[var(--xt-jade)] transition-colors whitespace-nowrap shrink-0 self-start lg:self-auto"
              >
                {copiedId === activeArtifact.id ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[var(--xt-jade)]" strokeWidth={1.8} />
                    <span>已复制正道代码</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" strokeWidth={1.6} />
                    <span>复制正道代码</span>
                  </>
                )}
              </button>
            </div>

            {/* Superpower vs Weakness structured hairline grid */}
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-6 py-6 border-b border-[var(--line)]">
              <div>
                <dt className="text-xs font-semibold tracking-wider text-[var(--xt-jade)] mb-2">
                  本命神通
                </dt>
                <dd className="text-[15px] leading-[1.78] text-[var(--xt-prose)]">
                  <RichProse text={activeArtifact.superpower} />
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold tracking-wider text-[var(--xt-cinnabar)] mb-2">
                  致命弱点
                </dt>
                <dd className="text-[15px] leading-[1.78] text-[var(--xt-prose)]">
                  <RichProse text={activeArtifact.weakness} />
                </dd>
              </div>
            </dl>

            {/* Legacy vs Modern C++23 Side-by-Side Code Comparison */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-[var(--xt-cinnabar)] mb-2.5">
                  <X className="w-4 h-4 shrink-0" strokeWidth={1.8} />
                  <span>旧式散修写法（隐患 / 反例）</span>
                </div>
                <pre className="font-code text-xs sm:text-[13px] leading-[1.7] p-4 rounded-lg bg-[var(--xt-cinnabar-soft)] text-[var(--xt-cinnabar-ink)] overflow-x-auto border border-[var(--xt-cinnabar)]/15">
                  <code>{activeArtifact.legacyCode}</code>
                </pre>
              </div>

              <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-[var(--xt-jade)] mb-2.5">
                  <Check className="w-4 h-4 shrink-0" strokeWidth={1.8} />
                  <span>现代 C++23 正道写法</span>
                </div>
                <pre className="font-code text-xs sm:text-[13px] leading-[1.7] p-4 rounded-lg bg-[var(--xt-jade-soft)] text-[var(--xt-jade-ink)] overflow-x-auto border border-[var(--xt-jade)]/15">
                  <code>{activeArtifact.modernCode}</code>
                </pre>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-[var(--line)] flex items-start gap-2.5 text-sm text-[var(--muted)]">
              <ShieldAlert className="w-4 h-4 text-[var(--xt-gold)] shrink-0 mt-1" strokeWidth={1.6} />
              <p className="leading-relaxed">
                <span className="font-semibold text-[var(--ink)]">工程注记：</span>
                <RichProse text={activeArtifact.comparisonNote} />
              </p>
            </div>
          </div>
        )}
    </section>
  );
}
