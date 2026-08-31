import Link from 'next/link';

import {
  Gem,
  PlayerBlazon,
  panel,
  RingGlyph,
  rarityForPosition,
  td,
  th,
} from '@/components/theme/primitives';
import {
  competitionPositions,
  type RankedPlayer,
} from '@/lib/tournament/ranking';

/**
 * Historical ranking table, shared between the /design mock (fixture rows,
 * plain names) and the real /ranking page (rows carry a slug, names link to
 * the player profile). Markup and classes must match the design proposal.
 */

const RingsCell = ({
  individualRings,
  rings,
}: {
  individualRings: number;
  rings: number;
}) => (
  <span className="flex flex-wrap items-center gap-1">
    {Array.from({ length: rings }, (_, i) => (
      <RingGlyph key={`team-${String(i)}`} size={15} />
    ))}
    {Array.from({ length: individualRings }, (_, i) => (
      <RingGlyph key={`solo-${String(i)}`} size={12} tone="solitaire" />
    ))}
  </span>
);

/** Second and third GROUPS mirror the podium banners (silver, bronze), ties included. */
const METAL_BY_GROUP: Record<number, 'silver' | 'bronze'> = {
  1: 'silver',
  2: 'bronze',
};

const METAL_NUMBER_CLASS: Record<'silver' | 'bronze', string> = {
  bronze: 'text-[#e8b488]',
  silver: 'text-[#dde4ea]',
};

const RankingTable = ({
  players,
}: {
  players: (RankedPlayer & { slug?: string })[];
}) => {
  const positions = competitionPositions(players);
  // Group index = podium banner index: shared positions share a banner.
  const groupIndexByPosition = new Map(
    [...new Set(positions)].sort((a, b) => a - b).map((p, i) => [p, i]),
  );
  return (
    <div className={`${panel} overflow-x-auto`}>
      <table className="w-full border-collapse sm:min-w-[480px]">
        <thead>
          <tr>
            <th className={`${th} w-16`}>#</th>
            <th className={th}>Jugador</th>
            <th className={th}>Anillos</th>
          </tr>
        </thead>
        <tbody>
          {players.map((player, index) => {
            const position = positions[index] ?? index + 1;
            const leader = position === 1;
            const metal =
              METAL_BY_GROUP[groupIndexByPosition.get(position) ?? -1];
            const nameClass = `font-bold ${leader ? 'text-(--gold-hi)' : ''}`;
            return (
              <tr
                className={
                  leader
                    ? 'bg-linear-to-r from-[#c9a5571a] to-transparent shadow-[inset_3px_0_0_var(--gold)]'
                    : undefined
                }
                key={player.name}
              >
                <td className={td}>
                  <span className="flex items-center gap-2">
                    <span
                      className={`w-4 font-bold font-mono text-sm ${
                        metal ? METAL_NUMBER_CLASS[metal] : 'text-(--faded)'
                      }`}
                    >
                      {position}
                    </span>
                    <Gem rarity={metal ?? rarityForPosition(position)} />
                  </span>
                </td>
                <td className={td}>
                  <span className="flex items-center gap-2.5">
                    <PlayerBlazon name={player.name} size="sm" />
                    {player.slug ? (
                      <Link
                        className={`${nameClass} transition-colors hover:text-(--gold)`}
                        href={`/players/${player.slug}`}
                      >
                        {player.name}
                      </Link>
                    ) : (
                      <span className={nameClass}>{player.name}</span>
                    )}
                  </span>
                </td>
                <td className={td}>
                  <RingsCell
                    individualRings={player.individualRings}
                    rings={player.rings}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

const RingLegend = () => (
  <div className="flex flex-wrap items-center gap-5 font-mono text-(--faded) text-[0.62rem] uppercase tracking-[0.18em]">
    <span className="flex items-center gap-1.5">
      <RingGlyph size={13} /> Campeonato por equipos
    </span>
    <span className="flex items-center gap-1.5">
      <RingGlyph size={11} tone="solitaire" /> Campeonato individual
    </span>
  </div>
);

export { RankingTable, RingLegend, RingsCell };
