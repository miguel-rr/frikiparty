'use client';

import Link from 'next/link';

import { btn, panelGold, RingGlyph } from '@/components/theme/primitives';
import { finalStandings } from '@/lib/live/progression';
import { teamLabel, teamRoster } from '@/lib/live/team-label';
import type { LiveState } from '@/server/live/state';

/** The tournament's final classification, once it is over, and the way to its edition. */
const FinalStandings = ({ state }: { state: LiveState }) => {
  const rows = finalStandings(state);
  if (rows.length === 0) return null;
  const teamById = new Map(state.teams.map((t) => [t.id, t]));
  return (
    <section className={`${panelGold} flex flex-col gap-4 p-5 sm:p-7`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="d-display font-bold text-(--parchment) text-xl uppercase">
          Clasificación final
        </h3>
        <Link className={btn.outline} href={`/editions/${state.editionSlug}`}>
          La edición {state.editionYear}
        </Link>
      </div>
      <ol className="flex flex-col gap-2">
        {rows.map((row, index) => {
          const team = teamById.get(row.teamId);
          const top = index === 0;
          return (
            <li
              className={`flex items-center gap-4 rounded-lg border px-4 py-3 ${
                top ? 'border-(--gold) bg-(--gold)/8' : 'border-(--hair)'
              }`}
              key={row.teamId}
            >
              <span className="w-7 shrink-0 text-right font-bold font-mono text-(--gold) text-lg">
                {index + 1}
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span
                  className={`d-display font-bold uppercase ${top ? 'd-gold-text text-lg' : 'text-(--parchment)'}`}
                >
                  {teamLabel(team)}
                </span>
                <span className="truncate text-(--faded) text-xs">
                  {teamRoster(team)}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-1.5 font-mono text-(--faded) text-2xs uppercase tracking-xl">
                {top ? <RingGlyph size={12} tone="solitaire" /> : null}
                {row.label}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
};

export { FinalStandings };
