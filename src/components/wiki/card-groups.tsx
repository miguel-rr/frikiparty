import type { ReactNode } from 'react';

type CardGroup = {
  key: string;
  label: string;
  cards: ReactNode[];
};

// Static class maps so Tailwind sees every class it has to generate.
const SPAN_SM = ['', 'sm:col-span-1', 'sm:col-span-2'] as const;
const SPAN_LG = [
  '',
  'lg:col-span-1',
  'lg:col-span-2',
  'lg:col-span-3',
] as const;
const COLS_SM = ['', 'sm:grid-cols-1', 'sm:grid-cols-2'] as const;
const COLS_LG = [
  '',
  'lg:grid-cols-1',
  'lg:grid-cols-2',
  'lg:grid-cols-3',
] as const;

/**
 * Groups of cards packed into one shared grid. Each group is a framed box
 * as wide as its cards (up to a full row), so small groups share a row
 * instead of leaving it half empty. `fillGaps` lets a later, smaller group
 * move up into a hole, which reorders groups: leave it off where the order
 * carries meaning.
 */
const CardGroups = ({
  groups,
  fillGaps = false,
}: {
  groups: CardGroup[];
  fillGaps?: boolean;
}) => (
  <div
    className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-3 ${fillGaps ? 'grid-flow-row-dense' : ''}`}
  >
    {groups
      .filter((group) => group.cards.length > 0)
      .map((group) => {
        const sm = Math.min(group.cards.length, 2);
        const lg = Math.min(group.cards.length, 3);
        return (
          <section
            className={`flex flex-col gap-3 rounded-xl border border-(--hair) p-3 ${SPAN_SM[sm]} ${SPAN_LG[lg]}`}
            key={group.key}
          >
            <span className="font-mono text-(--gold) text-2xs uppercase tracking-2xl">
              {group.label}
            </span>
            <ul className={`grid gap-4 ${COLS_SM[sm]} ${COLS_LG[lg]}`}>
              {group.cards}
            </ul>
          </section>
        );
      })}
  </div>
);

export type { CardGroup };
export { CardGroups };
