import Link from 'next/link';

import { ChampionPortrait } from '@/components/editions/champion-portrait';
import {
  Gem,
  PlayerBlazon,
  RingGlyph,
  rarityForPosition,
  td,
  th,
} from '@/components/theme/primitives';
import {
  competitionPositions,
  type RankedPlayer,
} from '@/lib/tournament/ranking';
import type { RingTitle } from '@/server/api/routers/player';

/**
 * Historical ranking table, shared between the /design mock (fixture rows,
 * plain names) and the real /ranking page (rows carry a slug, names link to
 * the player profile). Markup and classes must match the design proposal.
 */

/**
 * One ring in the count. With its title known it links to the edition it
 * was forged in, unfolding a small chronicle on hover (year, venue and the
 * winning roster); the /design mock passes no titles and keeps plain glyphs.
 */
const RingMark = ({
  size,
  title,
  tone,
}: {
  size: number;
  title?: RingTitle;
  tone?: 'gold' | 'solitaire';
}) => {
  if (!title) {
    return <RingGlyph size={size} tone={tone} />;
  }
  return (
    <Link
      aria-label={`Anillo de la edición ${title.label}`}
      className="group relative inline-flex transition-transform hover:scale-125"
      href={`/editions/${title.slug}${
        title.type === 'individual' ? '#individual' : ''
      }`}
    >
      <RingGlyph size={size} tone={tone} />
      <span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden w-max max-w-64 -translate-x-1/2 flex-col gap-1 rounded-lg border border-(--hair-gold) bg-(--night) px-3.5 py-2.5 text-left shadow-[0_10px_28px_rgba(0,0,0,0.65)] group-hover:flex">
        <span className="whitespace-nowrap font-bold font-mono text-(--gold) text-2xs uppercase tracking-2xl">
          {title.label}
          {title.venueName ? ` · ${title.venueName}` : ''}
        </span>
        <span className="font-bold text-(--parchment) text-xs leading-snug">
          {title.type === 'individual'
            ? 'Anillo individual'
            : title.members
                .map((name) => (name === '???' ? 'Desconocido' : name))
                .join(' · ')}
        </span>
      </span>
    </Link>
  );
};

const RingsCell = ({
  individualRings,
  rings,
  titles,
}: {
  individualRings: number;
  rings: number;
  titles?: RingTitle[];
}) => {
  const teamTitles = titles?.filter((title) => title.type === 'team');
  const soloTitles = titles?.filter((title) => title.type === 'individual');
  return (
    <span className="flex flex-wrap items-center gap-1">
      {Array.from({ length: rings }, (_, i) => (
        <RingMark key={`team-${String(i)}`} size={15} title={teamTitles?.[i]} />
      ))}
      {Array.from({ length: individualRings }, (_, i) => (
        <RingMark
          key={`solo-${String(i)}`}
          size={12}
          title={soloTitles?.[i]}
          tone="solitaire"
        />
      ))}
    </span>
  );
};

const GRAIN_FINE =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='240'%3E%3Cfilter id='f'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' seed='23'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='240' height='240' filter='url(%23f)' opacity='0.5'/%3E%3C/svg%3E\")";

const GRAIN_CLOTH =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='520' height='520'%3E%3Cfilter id='c'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.014' numOctaves='4' seed='31'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='520' height='520' filter='url(%23c)' opacity='0.7'/%3E%3C/svg%3E\")";

/**
 * The table's ground, kin to the bearers' treasury: velvet cloth with two
 * scales of weave, the Ring's breath from above, and the One Ring itself
 * lying faint and huge under the roster. Lives in its own clipped layer
 * so the panel can still let the ring tooltips escape.
 */
const TreasuryGround = () => (
  <div
    aria-hidden="true"
    className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-xl"
  >
    <div
      className="absolute inset-0"
      style={{
        backgroundImage:
          'radial-gradient(120% 80% at 50% 0%, #131a12 0%, #0d120c 45%, #090c08 100%)',
      }}
    />
    <div
      className="absolute inset-0 opacity-25 mix-blend-soft-light"
      style={{ backgroundImage: GRAIN_CLOTH, backgroundSize: '520px 520px' }}
    />
    <div
      className="absolute inset-0 opacity-30 mix-blend-soft-light"
      style={{ backgroundImage: GRAIN_FINE, backgroundSize: '240px 240px' }}
    />
    <div
      className="absolute inset-0"
      style={{
        backgroundImage:
          'radial-gradient(70% 30% at 50% 0%, rgba(201,165,87,0.08) 0%, rgba(201,165,87,0.02) 55%, transparent 78%)',
      }}
    />
    {/* biome-ignore lint/performance/noImgElement: decorative local asset, no next/image needed */}
    <img
      alt=""
      className="absolute top-1/2 left-1/2 w-[min(760px,92%)] max-w-none -translate-x-1/2 -translate-y-1/2 opacity-13 mix-blend-screen [mask-image:radial-gradient(circle,black_45%,transparent_70%)]"
      src="/icon-512.png"
    />
    <div className="absolute inset-0 shadow-[inset_0_0_120px_30px_rgba(0,0,0,0.45)]" />
  </div>
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
  players: (RankedPlayer & {
    slug?: string;
    titles?: RingTitle[];
    /** Painted card portrait; without it (the /design mock) the blazon stands in. */
    portrait?: string | null;
  })[];
}) => {
  const positions = competitionPositions(players);
  // Group index = podium banner index: shared positions share a banner.
  const groupIndexByPosition = new Map(
    [...new Set(positions)].sort((a, b) => a - b).map((p, i) => [p, i]),
  );
  // overflow opens up from sm so the ring tooltips can escape the panel;
  // mobile keeps the horizontal scroll (and has no hover anyway).
  return (
    <div className="relative isolate overflow-x-auto rounded-xl border border-(--hair-gold) shadow-[inset_0_1px_0_#f0d48a1f,0_12px_34px_#00000066] sm:overflow-visible">
      <TreasuryGround />
      <table className="w-full border-collapse sm:min-w-120">
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
                    ? 'bg-linear-to-r from-(--gold)/10 to-transparent shadow-[inset_3px_0_0_var(--gold)]'
                    : undefined
                }
                key={player.name}
              >
                <td className={td}>
                  <span className="flex items-center gap-2">
                    <span
                      className={`${metal ? METAL_NUMBER_CLASS[metal] : 'text-(--faded)'} w-4 font-bold font-mono text-sm`}
                    >
                      {position}
                    </span>
                    <Gem rarity={metal ?? rarityForPosition(position)} />
                  </span>
                </td>
                <td className={td}>
                  <span className="flex items-center gap-3">
                    {player.portrait ? (
                      <ChampionPortrait
                        champion={{
                          name: player.name,
                          // The name beside it is the link; the face stays plain.
                          slug: null,
                          portrait: player.portrait,
                          rings: player.rings,
                        }}
                        size="sm"
                        withName={false}
                      />
                    ) : (
                      <PlayerBlazon name={player.name} size="sm" />
                    )}
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
                    titles={player.titles}
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
  <div className="flex flex-wrap items-center gap-5 font-mono text-(--faded) text-2xs uppercase tracking-2xl">
    <span className="flex items-center gap-1.5">
      <RingGlyph size={13} /> Campeonato por equipos
    </span>
    <span className="flex items-center gap-1.5">
      <RingGlyph size={11} tone="solitaire" /> Campeonato individual
    </span>
  </div>
);

export { RankingTable, RingLegend, RingsCell };
