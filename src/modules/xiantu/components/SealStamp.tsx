interface SealStampProps {
  label: string;
  tone?: 'vermilion' | 'jade';
  size?: 'sm' | 'md';
  animated?: boolean;
}

/**
 * Classical Chinese scholar seal mark (朱砂印 / 青玉印), strictly reserved
 * for chapter colophons, mastered rounds, and trial completion milestones.
 */
export function SealStamp({
  label,
  tone = 'vermilion',
  size = 'sm',
  animated = false,
}: SealStampProps) {
  const toneClass =
    tone === 'vermilion'
      ? 'border-[#B83B2A] text-[#B83B2A] bg-[#B83B2A]/[0.04] dark:border-[#E57363] dark:text-[#E57363] dark:bg-[#E57363]/[0.07]'
      : 'border-[#1E6B52] text-[#1E6B52] bg-[#1E6B52]/[0.05] dark:border-[#5AB897] dark:text-[#5AB897] dark:bg-[#5AB897]/[0.08]';

  const sizeClass =
    size === 'md'
      ? 'px-2.5 py-1.5 text-xs tracking-[0.22em]'
      : 'px-2 py-0.5 text-[11px] tracking-[0.18em]';

  return (
    <span
      className={`inline-flex items-center justify-center font-editorial font-semibold border rounded-[3px] select-none leading-none whitespace-nowrap shrink-0 ${toneClass} ${sizeClass} ${
        animated ? 'animate-seal-stamp' : ''
      }`}
    >
      {label}
    </span>
  );
}
