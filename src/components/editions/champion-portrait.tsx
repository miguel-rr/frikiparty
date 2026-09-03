import Link from 'next/link';

import { PlayerBlazon, RingGlyph } from '@/components/theme/primitives';
import type { ChampionView } from '@/lib/tournament/edition-view';

const SIZES = {
  sm: { box: 'size-9', ring: 'size-3', text: 'text-[0.68rem]' },
  md: { box: 'size-12', ring: 'size-3.5', text: 'text-xs' },
  lg: { box: 'size-16', ring: 'size-4', text: 'text-sm' },
  /** Full size on phones (one card per row), compact once the grid has three columns. */
  fluid: {
    box: 'size-16 lg:size-11',
    ring: 'size-4 lg:size-3',
    text: 'text-sm lg:text-[0.68rem]',
  },
} as const;

/**
 * A champion as their painted card portrait in a gold ring — the same face
 * they wear on /champions and on their own page, so the chronicle and the
 * cards read as one world. `solitaire` marks the individual champion.
 * Champions we never recorded keep an anonymous blazon.
 */
const ChampionPortrait = ({
  champion,
  size = 'md',
  solitaire = false,
  withName = true,
}: {
  champion: ChampionView;
  size?: keyof typeof SIZES;
  solitaire?: boolean;
  withName?: boolean;
}) => {
  const s = SIZES[size];
  // Two copies of the same portrait: one clipped inside the ring, one
  // clipped to the ring's upper half but free to spill over its rim, so
  // heads and shoulders pop out of the frame. Both share one geometry
  // (in ring diameters): left -16%, top -8%, width 132%.
  const face = champion.portrait ? (
    <span className={`relative block ${s.box} shrink-0`}>
      {/* The ring: brushed gold — a conic sweep with a bright and a dark
          flank, an inner hairline and a soft shadow, like the card rims. */}
      <span
        className={`absolute inset-0 rounded-full p-[2px] ${
          solitaire
            ? 'bg-[conic-gradient(from_200deg,#b48b3c,#fff1bf_22%,#f0d48a_45%,#8f6b2e_68%,#fff1bf_88%,#b48b3c)] shadow-[0_0_16px_rgba(240,212,138,0.5),0_2px_6px_rgba(0,0,0,0.6)]'
            : 'bg-[conic-gradient(from_200deg,#8f6b2e,#f0d48a_22%,#c9a557_45%,#6e5223_68%,#f0d48a_88%,#8f6b2e)] shadow-[0_2px_10px_rgba(0,0,0,0.6)]'
        }`}
      >
        <span className="relative block size-full overflow-hidden rounded-full bg-(--night-2) shadow-[inset_0_0_0_1px_rgba(240,212,138,0.3),inset_0_5px_10px_rgba(0,0,0,0.5)]">
          {/* biome-ignore lint/performance/noImgElement: local static portrait */}
          <img
            alt=""
            className="absolute top-[-8%] left-[-16%] w-[132%] max-w-none"
            src={champion.portrait}
          />
        </span>
      </span>
      {/* Pop-out layer: a box from above the ring down to its midline. */}
      <span
        aria-hidden
        className="pointer-events-none absolute top-[-45%] right-[-40%] bottom-1/2 left-[-40%] overflow-hidden"
      >
        {/* biome-ignore lint/performance/noImgElement: local static portrait */}
        <img
          alt=""
          className="absolute top-[38.95%] left-[13.33%] w-[73.33%] max-w-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]"
          src={champion.portrait}
        />
      </span>
    </span>
  ) : (
    <span className={`grid ${s.box} shrink-0 place-items-center`}>
      <PlayerBlazon name={null} size="sm" />
    </span>
  );
  const label = withName ? (
    <span
      className={`whitespace-nowrap font-bold ${s.text} ${
        champion.name
          ? solitaire
            ? 'text-(--gold-hi)'
            : 'text-(--parchment)'
          : 'text-(--faded) italic'
      }`}
    >
      {champion.name ?? 'Desconocido'}
    </span>
  ) : null;
  const badge = solitaire ? (
    <span className="absolute -right-1 -bottom-1 grid place-items-center rounded-full bg-(--night) p-0.5">
      <RingGlyph size={12} tone="solitaire" />
    </span>
  ) : null;

  const inner = (
    <>
      <span className="relative">
        {face}
        {badge}
      </span>
      {label}
    </>
  );
  if (!(champion.slug && champion.name)) {
    return (
      <span className="inline-flex flex-col items-center gap-1.5">{inner}</span>
    );
  }
  return (
    <Link
      className="group inline-flex flex-col items-center gap-1.5 transition-opacity hover:opacity-85"
      href={`/players/${champion.slug}`}
    >
      {inner}
    </Link>
  );
};

export { ChampionPortrait };
