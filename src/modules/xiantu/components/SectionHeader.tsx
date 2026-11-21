import type { ReactNode } from 'react';

export type XianTuTone = 'jade' | 'cinnabar' | 'gold';

interface SectionHeaderProps {
  eyebrow: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  tone?: XianTuTone;
  /** Extra inline content after the title (e.g. a seal stamp). */
  titleAddon?: ReactNode;
  /** Right-aligned controls; rendered instead of the description column when given. */
  actions?: ReactNode;
}

/** Shared section heading so every 仙途 block follows the platform section rhythm. */
export function SectionHeader({
  eyebrow,
  title,
  description,
  tone = 'jade',
  titleAddon,
  actions,
}: SectionHeaderProps) {
  return (
    <header className="xt-section-header">
      <div className="min-w-0">
        <span className="xt-eyebrow" data-tone={tone}>
          {eyebrow}
        </span>
        <div className="flex flex-wrap items-center gap-3">
          <h2>{title}</h2>
          {titleAddon}
        </div>
      </div>
      {actions ?? (description ? <p>{description}</p> : null)}
    </header>
  );
}
