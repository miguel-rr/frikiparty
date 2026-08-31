import { RACE_EMBLEMS } from '@/components/theme/emblems';
import { RingGlyph } from '@/components/theme/primitives';
import type { RankedPlayer } from '@/lib/tournament/ranking';

/**
 * Honor zone above the ranking table: hanging banners (gonfalons) in gold,
 * silver and bronze — first place centered and raised, runners-up at its
 * sides. Motifs are rank emblems, not people: crown (I), crossed swords (II),
 * laurels (III). A shared position renders ONE banner with every tied name
 * beneath it, so a two-way third place is first-class, not an edge case.
 *
 * Sword and laurel motifs from game-icons.net (Lorc, CC BY 3.0); the crown
 * is the same one used across the proposal's emblems.
 */

type Metal = 'gold' | 'silver' | 'bronze';

const METAL_FILL: Record<Metal, string> = {
  gold: 'url(#dsn-blazon-rim)',
  silver: 'url(#dsn-metal-silver)',
  bronze: 'url(#dsn-metal-bronze)',
};

const METAL_TEXT: Record<Metal, string> = {
  gold: 'text-(--gold-hi)',
  silver: 'text-[#dde4ea]',
  bronze: 'text-[#e8b488]',
};

const METAL_GLOW: Record<Metal, string> = {
  gold: 'drop-shadow-[0_0_20px_rgba(201,165,87,0.4)]',
  silver: 'drop-shadow-[0_6px_14px_rgba(0,0,0,0.5)]',
  bronze: 'drop-shadow-[0_6px_14px_rgba(0,0,0,0.5)]',
};

/** Rank motifs — objects, never faces. Gold reuses the proposal's crown. */
const RANK_MOTIFS: Record<Metal, string> = {
  gold: RACE_EMBLEMS.king,
  silver:
    'M19.75 14.438c59.538 112.29 142.51 202.35 232.28 292.718l3.626 3.75.063-.062c21.827 21.93 44.04 43.923 66.405 66.25-18.856 14.813-38.974 28.2-59.938 40.312l28.532 28.53 68.717-68.717c42.337 27.636 76.286 63.646 104.094 105.81l28.064-28.06c-42.47-27.493-79.74-60.206-106.03-103.876l68.936-68.938-28.53-28.53c-11.115 21.853-24.413 42.015-39.47 60.593-43.852-43.8-86.462-85.842-130.125-125.47-.224-.203-.432-.422-.656-.625C183.624 122.75 108.515 63.91 19.75 14.437zm471.875 0c-83.038 46.28-154.122 100.78-221.97 161.156l22.814 21.562 56.81-56.812 13.22 13.187-56.438 56.44 24.594 23.186c61.802-66.92 117.6-136.92 160.97-218.72zm-329.53 125.906l200.56 200.53c-4.36 4.443-8.84 8.793-13.405 13.032L148.875 153.53l13.22-13.186zm-76.69 113.28l-28.5 28.532 68.907 68.906c-26.29 43.673-63.53 76.414-106 103.907l28.063 28.06c27.807-42.164 61.758-78.174 104.094-105.81l68.718 68.717 28.53-28.53c-20.962-12.113-41.08-25.5-59.937-40.313 17.865-17.83 35.61-35.433 53.157-52.97l-24.843-25.655-55.47 55.467c-4.565-4.238-9.014-8.62-13.374-13.062l55.844-55.844-24.53-25.374c-18.28 17.856-36.602 36.06-55.158 54.594-15.068-18.587-28.38-38.758-39.5-60.625z',
  bronze:
    'M234.7 18.05c-21 .2-38.8 2.5-62 10.2-4.1 2-8.2 4.1-12.2 6.2.8 5.26 3.2 10.77 5.5 14.7-4.9 4.2-9.6 8.4-14.1 12.8-3.7-5.5-6.6-11.4-8.3-17.4-14.2 9.2-27.7 19.6-40.1 31.4 1.9 9.5 9.2 18.21 15.2 24.15-3.7 5.2-7.2 10.4-10.5 15.7-8.22-7.2-15.12-15.5-19.32-24.65C74.97 108.1 61.92 126 53.08 142.3c5.29 13 19.01 22.7 29.8 28.4-2 6.1-3.7 12.2-5.1 18.4-13.5-6.4-26.3-15.7-34.5-26.6-8.7 20.1-14.7 40.7-18.2 61.4 9.63 15.5 30.57 22.9 46 25.9.1 6.4.4 12.8.9 19.2-17.79-2.7-37.26-9.6-49.9-20.4-1.6 22.3-.5 44.5 3.4 66.2 15.25 13.7 41.14 15.3 58.6 13.7 2 6.1 4.1 12.2 6.5 18.1-18.61 4.5-43.29 1.1-59.3-6.2 6.6 23.7 16.4 46.4 29.2 67.4 19.33 8.6 44.52 3.6 61.72-2.5 3.7 5.3 7.6 10.5 11.6 15.5-17.8 9.5-39.9 11.5-57.52 10.1 12.3 16.3 26.62 31.2 42.72 44.4 4.9 1.1 10.5 1.1 16.7.3 11.7-1.7 25.2-7 37.9-14.7 16.7 13.5 34.9 24.7 54.1 33.1l7.5-17.2c-16-6.9-31.3-16.2-45.6-27.3 13.3-10.9 24.3-24 30.2-36.5 4.7-9.7 6.3-18.4 4.5-26.3-10.7-5.7-20.6-12.5-29.5-20.3-7.8 20.8-26.4 36.1-43.5 46-4-4.9-7.9-9.9-11.6-15 16.8-9.8 39.9-27.5 39.1-47.1-8.9-10.3-16.6-21.8-22.9-34.1-12 14-30.7 22.5-46.5 26.7-2.4-5.8-4.6-11.6-6.6-17.6 16.8-5.2 37.9-13 44.1-29.7-4.3-11.5-7.5-23.6-9.7-36-13.8 8.4-32 11.1-46.32 10.9-.6-6.2-1-12.4-1.2-18.7 15.52-.6 33.92-2.5 44.92-14.3-.8-12.6-.5-25.5.9-38.5-13.4 2.8-29 .3-40.42-3.2 1.3-6 2.9-12.1 4.8-18.1 12.82 3.2 27.12 6.7 38.82.8 2.7-13.6 6.7-27.3 12-40.8-9.9-1.8-20.2-6.3-27.7-10.7 3.3-5.3 6.8-10.5 10.5-15.7 8.1 4.2 16.3 8.8 25.2 8.4 5.7-11.6 12.3-22.65 19.5-32.75-5.1-2.7-10-6.4-14.4-10.6 4.4-4.3 9.1-8.5 13.9-12.7 3.8 3.54 8 6.18 12.3 8.2 15.9-18.6 35.9-36.23 49-53.8zm38.4 0c15.4 20.75 33.8 35.63 48.9 53.7 4.6-1.76 9.1-5.23 12.3-8.1 4.9 4.2 9.5 8.4 13.9 12.7-4.4 4.2-9.2 7.9-14.4 10.6 7.3 10.1 13.9 21.05 19.6 32.65 9-.1 18.4-4.4 25.2-8.4 3.7 5.2 7.2 10.4 10.4 15.7-8.8 5.9-18.2 9.6-27.6 10.7 5.3 13.5 9.3 27.2 12 40.8 12.3 5.4 27.3 2.7 38.7-.8 1.9 6 3.5 12.1 4.9 18.1-14.2 3.4-27.3 6.2-40.4 3.3 1.4 12.9 1.6 25.8.8 38.5 11.4 12.3 30.2 14.4 44.9 14.2-.2 6.3-.5 12.5-1.2 18.7-17.1-.5-32.8-2.5-46.3-10.9-2.1 12.4-5.3 24.5-9.6 36.1 8.2 17.4 27.8 25.3 44.1 29.6-2 6-4.2 11.8-6.6 17.6-18.5-5.6-34.9-13-46.6-26.7-6.3 12.4-13.9 23.8-22.9 34.1 1.5 22.4 22.4 37.8 39.2 47.1-3.7 5.1-7.6 10.1-11.6 15-19-11.8-36.6-25.8-43.5-46-9 7.8-18.8 14.6-29.6 20.3-1.8 7.9-.1 16.6 4.5 26.3 6 12.5 17 25.6 30.3 36.5-14.3 11.1-29.6 20.4-45.6 27.3l7.4 17.2c19.3-8.4 37.4-19.6 54.1-33.2 12.7 7.8 26.2 13.1 38 14.8 6.2.8 11.8.8 16.7-.3 16.1-13.2 30.4-28.1 42.7-44.4-18 1.7-37.9-2.3-56.5-9.7-.3-.1-.7-.3-1.1-.4 4.1-5 7.9-10.2 11.7-15.5 18.2 7.8 43.7 11.7 61.6 2.5 12.8-21 22.6-43.7 29.2-67.4-.4.2-.8.4-1.2.5-20.5 6.4-40.1 7.6-58.1 5.7 2.4-5.9 4.5-12 6.5-18 19.1 1.7 45.2.1 58.6-13.8 3.9-21.7 5.1-43.9 3.4-66.2-14.4 10.7-34.9 17.9-49.9 20.4.5-6.4.9-12.8 1-19.2 16.8-4.8 37.9-10 45.9-25.9-3.5-20.7-9.5-41.3-18.2-61.4-9.4 11.6-23.1 21-34.4 26.5-1.5-6.1-3.2-12.2-5.2-18.3 12-7.4 25.1-15.3 29.9-28.4-10.1-18.7-22.2-35.8-35.9-51.05-4.2 9.05-11.1 17.45-19.2 24.65-3.3-5.3-6.8-10.5-10.6-15.7 6.2-7.17 14.2-14.71 15.2-24.15-12.4-11.8-25.8-22.2-40-31.4-1.8 6-4.7 11.9-8.3 17.4-4.5-4.4-9.2-8.6-14.1-12.8 2.7-4.82 4.7-9.62 5.4-14.7-4-2.1-8.1-4.2-12.2-6.2-24.7-8.2-43.3-10.3-66.2-10.2z',
};

const ROMAN_NUMERALS = ['I', 'II', 'III', 'IV', 'V'] as const;

const BANNER_PATH = 'M35,19 H115 V138 L75,172 L35,138 Z';

const Banner = ({ metal, position }: { metal: Metal; position: number }) => (
  <svg
    aria-hidden="true"
    className={`w-full ${METAL_GLOW[metal]}`}
    viewBox="0 0 150 185"
  >
    {/* Hanging bar with finials */}
    <circle cx="24" cy="15" fill={METAL_FILL[metal]} r="5" stroke="#0d0a05" />
    <circle cx="126" cy="15" fill={METAL_FILL[metal]} r="5" stroke="#0d0a05" />
    <rect
      fill={METAL_FILL[metal]}
      height="7"
      rx="3"
      stroke="#0d0a05"
      strokeWidth="1.5"
      width="106"
      x="22"
      y="11.5"
    />
    {/* Banner cloth */}
    <path d={BANNER_PATH} fill="none" stroke="#0d0a05" strokeWidth="8" />
    <path
      d={BANNER_PATH}
      fill="url(#dsn-blazon-field)"
      stroke={METAL_FILL[metal]}
      strokeWidth="4"
    />
    <path
      d={BANNER_PATH}
      fill="none"
      opacity="0.45"
      stroke={METAL_FILL[metal]}
      strokeWidth="1.5"
      transform="translate(75 95) scale(0.88) translate(-75 -95)"
    />
    {/* Rank motif */}
    <path
      d={RANK_MOTIFS[metal]}
      fill={METAL_FILL[metal]}
      opacity="0.95"
      transform="translate(40 52) scale(0.1367)"
    />
    {/* Roman-numeral lozenge */}
    <rect
      fill={METAL_FILL[metal]}
      height="24"
      rx="3"
      stroke="#0d0a05"
      strokeWidth="2"
      transform="rotate(45 75 19)"
      width="24"
      x="63"
      y="7"
    />
    <text
      fill="#1a1206"
      fontSize="13"
      fontWeight="700"
      style={{ fontFamily: 'var(--font-cinzel), Georgia, serif' }}
      textAnchor="middle"
      x="75"
      y="24"
    >
      {ROMAN_NUMERALS[position - 1] ?? position}
    </text>
  </svg>
);

type PodiumGroup = { position: number; players: RankedPlayer[] };

/** One banner per position; every tied name listed beneath it. */
const Honoree = ({
  className = '',
  first = false,
  group,
  metal,
}: {
  className?: string;
  first?: boolean;
  group: PodiumGroup;
  metal: Metal;
}) => {
  const shared = group.players.length > 1;
  const rings = group.players[0]?.rings ?? 0;
  const individualRings = shared ? 0 : (group.players[0]?.individualRings ?? 0);
  return (
    <div
      className={`flex flex-col items-center gap-1.5 ${
        first ? 'w-36 sm:w-40' : 'w-27 sm:w-30'
      } ${className}`}
    >
      <Banner metal={metal} position={group.position} />
      {group.players.map((player) => (
        <span
          className={`d-display font-bold uppercase leading-tight ${
            first ? 'd-gold-text text-2xl' : `text-lg ${METAL_TEXT[metal]}`
          }`}
          key={player.name}
        >
          {player.name}
        </span>
      ))}
      <span className="flex items-center gap-1">
        {Array.from({ length: rings }, (_, i) => (
          <RingGlyph key={`t-${String(i)}`} size={first ? 14 : 12} />
        ))}
        {Array.from({ length: individualRings }, (_, i) => (
          <RingGlyph
            key={`s-${String(i)}`}
            size={first ? 11 : 10}
            tone="solitaire"
          />
        ))}
      </span>
    </div>
  );
};

/**
 * Groups a ranked list into shared positions (individual rings break ring
 * ties, per core-logic); returns the first three groups.
 */
const buildPodiumGroups = (players: RankedPlayer[]): PodiumGroup[] => {
  const groups: PodiumGroup[] = [];
  for (const [index, player] of players.entries()) {
    const previous = players[index - 1];
    const currentGroup = groups.at(-1);
    if (
      currentGroup &&
      previous &&
      previous.rings === player.rings &&
      previous.individualRings === player.individualRings
    ) {
      currentGroup.players.push(player);
    } else {
      if (groups.length === 3) {
        break;
      }
      groups.push({ position: index + 1, players: [player] });
    }
  }
  return groups;
};

const HonorPodium = ({ players }: { players: RankedPlayer[] }) => {
  const [first, second, third] = buildPodiumGroups(players);
  return (
    <div className="grid grid-cols-2 items-end justify-items-center gap-x-4 gap-y-9 py-4 sm:flex sm:items-start sm:justify-center sm:gap-12">
      {second ? (
        <Honoree
          className="sm:order-1 sm:mt-12"
          group={second}
          metal="silver"
        />
      ) : null}
      {first ? (
        <Honoree
          className="order-first col-span-2 sm:order-2 sm:col-auto"
          first
          group={first}
          metal="gold"
        />
      ) : null}
      {third ? (
        <Honoree className="sm:order-3 sm:mt-12" group={third} metal="bronze" />
      ) : null}
    </div>
  );
};

export { HonorPodium, RANK_MOTIFS };
