import Link from 'next/link';

import { api } from '@/trpc/server';

// Biggest first; ties on rings share a size, so the ladder tiers by
// distinct rings value rather than by row position. Capped — anyone below
// the ladder's depth just gets the smallest size, no need for more tiers
// than a friend group of ~25 players will ever produce.
const SIZE_LADDER = [
  'text-6xl sm:text-7xl',
  'text-4xl sm:text-5xl',
  'text-3xl sm:text-4xl',
  'text-2xl sm:text-3xl',
  'text-xl sm:text-2xl',
  'text-lg sm:text-xl',
  'text-base',
];

const ringsLabel = (rings: number) =>
  `${rings} ${rings === 1 ? 'anillo' : 'anillos'}`;

const individualRingsLabel = (individualRings: number) =>
  `${individualRings} ${individualRings === 1 ? 'anillo individual' : 'anillos individuales'}`;

const RankingPage = async () => {
  const ranking = await api.player.historicalRanking();

  const smallestSize = SIZE_LADDER[SIZE_LADDER.length - 1] ?? 'text-base';
  const tierByRings = new Map<number, string>();
  [...new Set(ranking.map((p) => p.rings))]
    .sort((a, b) => b - a)
    .forEach((rings, index) => {
      tierByRings.set(
        rings,
        SIZE_LADDER[Math.min(index, SIZE_LADDER.length - 1)] ?? smallestSize,
      );
    });
  const maxRings = ranking[0]?.rings ?? 0;

  return (
    <main className="mx-auto flex max-w-[1180px] flex-col gap-10 px-4 py-8 sm:px-8">
      <h1 className="font-display text-3xl uppercase tracking-tight sm:text-4xl">
        Ranking histórico
      </h1>

      {ranking.length === 0 ? (
        <p className="text-muted text-sm">Todavía no hay datos de ranking.</p>
      ) : (
        <ol className="flex flex-col items-center gap-6 py-4">
          {ranking.map((entry) => (
            <li className="flex flex-col items-center gap-1" key={entry.id}>
              <Link
                className={`font-display uppercase leading-none tracking-tight transition-opacity hover:opacity-80 ${tierByRings.get(entry.rings)} ${
                  entry.rings === maxRings && maxRings > 0
                    ? 'text-amber'
                    : 'text-ink'
                }`}
                href={`/players/${entry.slug}`}
              >
                {entry.name}
              </Link>
              <span className="font-mono text-muted text-sm uppercase tracking-widest sm:text-base">
                {ringsLabel(entry.rings)}
              </span>
              {entry.individualRings > 0 ? (
                <span className="font-mono text-[0.6rem] text-muted/60 uppercase tracking-widest">
                  {individualRingsLabel(entry.individualRings)}
                </span>
              ) : null}
            </li>
          ))}
        </ol>
      )}
    </main>
  );
};

export default RankingPage;
