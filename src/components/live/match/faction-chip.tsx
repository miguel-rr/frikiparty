'use client';

import { FactionEmblem } from '@/components/wiki/faction-emblem';

type FactionRef = { id: string; name: string; code: string | null };

/**
 * A drawn faction as a card: emblem and name. `tone` marks the state in a
 * line-up editor (picked, still to hand out); `delay` staggers the reveal.
 */
const FactionChip = ({
  faction,
  tone = 'plain',
  size = 'md',
  delay = 0,
  onClick,
}: {
  faction: FactionRef | undefined;
  tone?: 'plain' | 'selected' | 'unassigned' | 'dim';
  size?: 'sm' | 'md';
  delay?: number;
  onClick?: () => void;
}) => {
  if (!faction) return null;
  const base =
    size === 'sm'
      ? 'gap-1.5 rounded-md px-2 py-1 text-3xs'
      : 'gap-2 rounded-lg px-3 py-2 text-2xs';
  const tones = {
    plain: 'border-(--hair-gold) bg-(--night-2) text-(--parchment)',
    selected:
      'border-(--gold-hi) bg-(--gold)/15 text-(--gold-hi) shadow-[0_0_14px_rgba(201,165,87,0.35)]',
    unassigned:
      'border-(--hair-gold) border-dashed bg-(--night-2) text-(--parchment) hover:border-(--gold)',
    dim: 'border-(--hair) bg-(--night-2) text-(--faded)',
  } as const;
  const inner = (
    <>
      <FactionEmblem
        className={tone === 'dim' ? 'text-(--faded)' : 'text-(--gold)'}
        code={faction.code}
        size={size === 'sm' ? 16 : 22}
      />
      <span className="font-bold font-mono uppercase tracking-xl">
        {faction.name}
      </span>
    </>
  );
  const className = `inline-flex items-center border ${base} ${tones[tone]}`;
  const style = {
    animation: 'live-card-in 500ms ease-out both',
    animationDelay: `${delay}ms`,
  };
  return onClick ? (
    <button
      className={`${className} cursor-pointer transition-colors`}
      onClick={onClick}
      style={style}
      type="button"
    >
      {inner}
    </button>
  ) : (
    <span className={className} style={style}>
      {inner}
    </span>
  );
};

export { FactionChip, type FactionRef };
