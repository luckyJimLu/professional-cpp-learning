import { useEffect, useState } from 'react';
import { Check, Copy, ShieldAlert, X } from 'lucide-react';
import type { XianTuArtifact } from '../types';
import { EditorialPlate } from './EditorialPlate';
import { ResilientArtwork } from './ResilientArtwork';
import { RichProse } from './RichProse';

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
    <section id="artifacts" className="py-16 md:py-22">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="wenwu-rule mb-12" aria-hidden="true" />

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
          <div>
            <p className="text-xs font-medium tracking-[0.14em] text-[#1E6B52] dark:text-[#5AB897] mb-2">
              第 {chapterNumber} 章器物谱 · 共 {artifacts.length} 件本命法宝
            </p>
            <h2 className="font-editorial text-2xl sm:text-3xl font-semibold text-[#141918] dark:text-[#F0F4F2]">
              登场法宝
            </h2>
          </div>
          <p className="text-sm text-[#525E5B] dark:text-[#9AA8A3] max-w-md leading-relaxed">
            点选任意器物图版，在下方展台细察其本命神通、致命弱点以及旧式写法与现代 C++23 正道范式的代码对照。
          </p>
        </div>

        {/* Tier 2 Museum Catalog Grid — Clean, uncrowded 4-plate gallery */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6" role="tablist" aria-label="登场法宝图谱">
          {artifacts.map((artifact, idx) => {
            const isSelected = artifact.id === activeArtifact?.id;
            return (
              <button
                key={artifact.id}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => setSelectedId(artifact.id)}
                className={`group text-left flex flex-col rounded-xl overflow-hidden transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1E6B52] ${
                  isSelected
                    ? 'bg-white dark:bg-[#161F1C] ring-1 ring-[#1E6B52] dark:ring-[#5AB897]'
                    : 'bg-white/80 dark:bg-[#141B19] border border-[#141918]/10 dark:border-[#E8ECEA]/10 hover:border-[#1E6B52]/45 dark:hover:border-[#5AB897]/45'
                }`}
              >
                <div className="aspect-[4/3] w-full overflow-hidden bg-[#ECEFED] dark:bg-[#1B2421] relative">
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
                    <h3 className="font-editorial text-lg font-semibold text-[#141918] dark:text-[#F0F4F2]">
                      {artifact.name}
                    </h3>
                    <span
                      className={`text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                        isSelected
                          ? 'text-[#1E6B52] dark:text-[#5AB897]'
                          : 'text-[#6A7773] dark:text-[#8E9D98] group-hover:text-[#141918] dark:group-hover:text-white'
                      }`}
                    >
                      {isSelected ? '正在鉴赏' : '展开详参'}
                    </span>
                  </div>
                  <p className="text-sm text-[#4B5653] dark:text-[#A0AEA9] leading-relaxed">
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
            className="mt-8 rounded-xl bg-white dark:bg-[#151D1B] border border-[#141918]/10 dark:border-[#E8ECEA]/10 p-6 sm:p-8 animate-panel-reveal"
          >
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-6 border-b border-[#141918]/10 dark:border-[#E8ECEA]/10">
              <div>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#596662] dark:text-[#98A6A1] mb-1.5">
                  <span className="font-code">器物 0{activeIndex + 1}</span>
                  <span aria-hidden="true">·</span>
                  <span>{activeArtifact.identity}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-code text-[#1E6B52] dark:text-[#5AB897]">
                    {activeArtifact.syntax}
                  </span>
                </div>
                <h3 className="font-editorial text-xl sm:text-2xl font-semibold text-[#141918] dark:text-[#F0F4F2]">
                  {activeArtifact.name} · 器物图说与代码对照
                </h3>
              </div>

              <button
                type="button"
                onClick={handleCopyModern}
                className="inline-flex items-center justify-center gap-1.5 min-h-[40px] px-4 py-2 text-xs font-medium rounded-lg border border-[#141918]/15 dark:border-[#E8ECEA]/15 text-[#141918] dark:text-[#E8ECEA] hover:border-[#1E6B52] dark:hover:border-[#5AB897] transition-colors whitespace-nowrap shrink-0 self-start lg:self-auto"
              >
                {copiedId === activeArtifact.id ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[#1E6B52] dark:text-[#5AB897]" strokeWidth={1.8} />
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
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-6 py-6 border-b border-[#141918]/8 dark:border-[#E8ECEA]/8">
              <div>
                <dt className="text-xs font-semibold tracking-wider text-[#1E6B52] dark:text-[#5AB897] mb-2">
                  本命神通
                </dt>
                <dd className="text-[15px] leading-[1.78] text-[#1F2A27] dark:text-[#D3DDD9] dark:tracking-[0.01em]">
                  <RichProse text={activeArtifact.superpower} />
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold tracking-wider text-[#B83B2A] dark:text-[#E57363] mb-2">
                  致命弱点
                </dt>
                <dd className="text-[15px] leading-[1.78] text-[#35403D] dark:text-[#B9C5C1] dark:tracking-[0.01em]">
                  <RichProse text={activeArtifact.weakness} />
                </dd>
              </div>
            </dl>

            {/* Legacy vs Modern C++23 Side-by-Side Code Comparison */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-[#B83B2A] dark:text-[#E57363] mb-2.5">
                  <X className="w-4 h-4 shrink-0" strokeWidth={1.8} />
                  <span>旧式散修写法（隐患 / 反例）</span>
                </div>
                <pre className="font-code text-xs sm:text-[13px] leading-[1.7] p-4 rounded-lg bg-[#F7F3F2] dark:bg-[#221716] text-[#3B1F1B] dark:text-[#F0CCC6] overflow-x-auto border border-[#B83B2A]/15 dark:border-[#E57363]/20">
                  <code>{activeArtifact.legacyCode}</code>
                </pre>
              </div>

              <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-[#1E6B52] dark:text-[#5AB897] mb-2.5">
                  <Check className="w-4 h-4 shrink-0" strokeWidth={1.8} />
                  <span>现代 C++23 正道写法</span>
                </div>
                <pre className="font-code text-xs sm:text-[13px] leading-[1.7] p-4 rounded-lg bg-[#F1F6F3] dark:bg-[#13221D] text-[#143328] dark:text-[#C9E7DC] overflow-x-auto border border-[#1E6B52]/15 dark:border-[#5AB897]/20">
                  <code>{activeArtifact.modernCode}</code>
                </pre>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-[#141918]/8 dark:border-[#E8ECEA]/8 flex items-start gap-2.5 text-sm text-[#4B5653] dark:text-[#A3B0AC]">
              <ShieldAlert className="w-4 h-4 text-[#9A7B3E] dark:text-[#D4B36E] shrink-0 mt-1" strokeWidth={1.6} />
              <p className="leading-relaxed">
                <span className="font-semibold text-[#141918] dark:text-[#E8ECEA]">工程注记：</span>
                <RichProse text={activeArtifact.comparisonNote} />
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
