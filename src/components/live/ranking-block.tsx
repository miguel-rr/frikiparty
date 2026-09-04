import Link from 'next/link';

import { panel } from '@/components/theme/primitives';
import type { LiveState } from '@/server/live/state';

/**
 * The tournament ranking once it's public: final position, and where the
 * historical order and the vote had each player, so the blend is legible.
 */
const RankingBlock = ({ state }: { state: LiveState }) => {
  if (!state.ranking) return null;
  const byId = new Map(state.participants.map((p) => [p.id, p]));
  const votePos = new Map(
    (state.voteRanking ?? []).map((id, index) => [id, index + 1]),
  );
  const showVote = state.voteRanking !== null;
  return (
    <section className={`${panel} flex flex-col gap-4 p-5 sm:p-7`}>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h3 className="d-display font-bold text-(--parchment) text-xl uppercase">
          El ranking del torneo
        </h3>
        <span className="font-mono text-(--faded) text-2xs uppercase tracking-2xl">
          {state.rankingSource === 'historical'
            ? 'Histórico'
            : state.rankingSource === 'vote'
              ? 'Por votación'
              : `Combinado · ${state.historicalWeightPercent ?? 50}% histórico`}
        </span>
      </div>
      <ol className="grid gap-x-8 gap-y-1 sm:grid-cols-2">
        {state.ranking.map((id, index) => {
          const participant = byId.get(id);
          if (!participant) return null;
          return (
            <li className="flex items-center gap-3 text-sm" key={id}>
              <span className="w-6 shrink-0 text-right font-bold font-mono text-(--gold)">
                {index + 1}
              </span>
              <Link
                className="flex-1 truncate text-(--parchment) transition-colors hover:text-(--gold-hi)"
                href={`/players/${participant.slug}`}
              >
                {participant.name}
              </Link>
              <span className="shrink-0 font-mono text-(--faded) text-2xs uppercase tracking-wider">
                hist. {participant.position}
                {showVote ? ` · voto ${votePos.get(id) ?? '—'}` : ''}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
};

export { RankingBlock };
