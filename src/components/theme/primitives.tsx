import type { ReactNode } from 'react';

import { RACE_EMBLEMS, raceForPlayer } from '@/components/theme/emblems';

/**
 * Tailwind class recipes shared across the /design proposal sections.
 * Kept as constants (not CSS classes) so the markup stays utility-first.
 */

const btnBase =
  'inline-flex cursor-pointer items-center justify-center gap-2 rounded-full font-extrabold transition active:translate-y-px';

const btn = {
  primary: `${btnBase} border border-[#f0d48a99] bg-linear-to-b from-(--gold-hi) via-(--gold) to-[#a8843c] px-6 py-2.5 text-[#211803] shadow-[0_4px_18px_rgba(201,165,87,0.25)] hover:brightness-105`,
  secondary: `${btnBase} border border-(--hair) bg-(--panel-2) px-6 py-2.5 text-(--parchment) hover:border-(--hair-gold) hover:text-(--gold-hi)`,
  ghost: `${btnBase} border border-transparent px-4 py-2 text-(--faded) hover:text-(--parchment)`,
  danger: `${btnBase} border border-[#cf6a4873] px-6 py-2.5 text-(--ember) hover:bg-[#cf6a481f]`,
} as const;

/** Quiet gold text link ("Cómo llegar →"): an action without a button. */
const linkGold =
  'whitespace-nowrap font-bold text-(--gold) text-sm transition-colors hover:text-(--gold-hi)';

const panel =
  'd-scape rounded-xl border border-(--hair) shadow-[inset_0_1px_0_#f0d48a0d,0_12px_30px_#00000059]';

const panelGold =
  'd-scape rounded-xl border border-(--hair-gold) shadow-[inset_0_1px_0_#f0d48a1f,0_12px_34px_#00000066]';

const eyebrow =
  'font-mono text-xl font-bold uppercase tracking-[0.35em] text-(--gold)';

const label =
  'mb-1.5 block font-mono text-[0.62rem] font-bold uppercase tracking-[0.22em] text-(--faded)';

const input =
  'w-full rounded-lg border border-(--hair) bg-(--night-2) px-3.5 py-2 text-(--parchment) transition-colors placeholder:text-[#95a4978c] hover:border-(--hair-gold) focus:border-(--gold) focus:outline-none';

const tag =
  'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-(--hair-gold) px-2.5 py-1 font-mono text-[0.6rem] font-bold uppercase tracking-[0.22em] text-(--gold)';

const th =
  'border-b border-(--hair-gold) px-3 py-2.5 text-left font-mono text-[0.6rem] font-bold uppercase tracking-[0.22em] text-(--faded)';

const td = 'border-b border-(--hair) px-3 py-2.5 align-middle';

const SectionHeader = ({
  eyebrowText,
  title,
  lead,
}: {
  eyebrowText: string;
  title: string;
  lead?: string;
}) => (
  <div className="flex flex-col items-center gap-3 text-center">
    <span className={eyebrow}>{eyebrowText}</span>
    <h2 className="d-display font-bold text-3xl uppercase sm:text-4xl">
      {title}
    </h2>
    {lead ? <p className="max-w-[58ch] text-(--faded)">{lead}</p> : null}
  </div>
);

/**
 * Trophy ring. Both championships forge GOLD rings: the team one is a plain
 * band; the individual one ('solitaire') is a thinner band crowned with a
 * bright gem — smaller and distinct, never lesser.
 */
const RingGlyph = ({
  size = 14,
  tone = 'gold',
}: {
  size?: number;
  tone?: 'gold' | 'solitaire';
}) => (
  <svg aria-hidden="true" height={size} viewBox="0 0 16 16" width={size}>
    <circle
      cx="8"
      cy="8.5"
      fill="none"
      r="5.2"
      stroke="var(--gold)"
      strokeWidth={tone === 'gold' ? 2.4 : 1.7}
    />
    <circle
      cx="8"
      cy="8.5"
      fill="none"
      opacity="0.9"
      r="5.2"
      stroke="var(--gold-hi)"
      strokeDasharray="6 28"
      strokeLinecap="round"
      strokeWidth={tone === 'gold' ? 2.4 : 1.7}
    />
    {tone === 'solitaire' ? (
      <>
        <circle cx="8" cy="3" fill="var(--gold)" r="2.4" />
        <circle cx="8" cy="3" fill="#f6e2a4" r="1.5" />
      </>
    ) : null}
  </svg>
);

const Divider = () => (
  <div aria-hidden className="d-divider mx-auto w-full max-w-[520px] px-6">
    <RingGlyph size={18} />
  </div>
);

const BLAZON_SIZES = {
  sm: 'w-[30px]',
  md: 'w-[42px]',
  lg: 'w-[70px]',
  xl: 'w-[116px]',
} as const;

const SHIELD_PATH =
  'M50 5 C61 11 76 14.5 93 15.5 V55 C93 83 75 101 50 111 C25 101 7 83 7 55 V15.5 C24 14.5 39 11 50 5 Z';

/**
 * Shared gradient defs for every blazon on the page. Render exactly once
 * inside the .dsn root — the blazons reference these ids across SVGs.
 */
const BlazonDefs = () => (
  <svg aria-hidden="true" className="absolute size-0" focusable="false">
    <defs>
      <linearGradient id="dsn-blazon-rim" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0" stopColor="#f6e2a4" />
        <stop offset="0.55" stopColor="#c9a557" />
        <stop offset="1" stopColor="#8f6b2e" />
      </linearGradient>
      <radialGradient cx="0.5" cy="0.3" id="dsn-blazon-field" r="0.9">
        <stop offset="0" stopColor="#293721" />
        <stop offset="1" stopColor="#0c120e" />
      </radialGradient>
      <linearGradient id="dsn-blazon-emblem" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" stopColor="#f2d78f" />
        <stop offset="1" stopColor="#ad8c45" />
      </linearGradient>
      <linearGradient id="dsn-metal-silver" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0" stopColor="#eef2f6" />
        <stop offset="0.55" stopColor="#a8b4c0" />
        <stop offset="1" stopColor="#5c6874" />
      </linearGradient>
      <linearGradient id="dsn-metal-bronze" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0" stopColor="#eebe92" />
        <stop offset="0.55" stopColor="#b0714a" />
        <stop offset="1" stopColor="#6e3d22" />
      </linearGradient>
      <linearGradient id="dsn-card-leather" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" stopColor="#261d12" />
        <stop offset="1" stopColor="#120d07" />
      </linearGradient>
      <linearGradient id="dsn-card-parchment" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" stopColor="#f2e7ca" />
        <stop offset="1" stopColor="#d8c598" />
      </linearGradient>
      <radialGradient cx="0.35" cy="0.3" id="dsn-ring-gem" r="0.9">
        <stop offset="0" stopColor="#ffe9ac" />
        <stop offset="0.55" stopColor="#c9a557" />
        <stop offset="1" stopColor="#775a20" />
      </radialGradient>
      <radialGradient cx="0.35" cy="0.3" id="dsn-stat-ember" r="0.9">
        <stop offset="0" stopColor="#e8875c" />
        <stop offset="1" stopColor="#7e2c18" />
      </radialGradient>
      <radialGradient cx="0.35" cy="0.3" id="dsn-stat-moss" r="0.9">
        <stop offset="0" stopColor="#96cda4" />
        <stop offset="1" stopColor="#2c5637" />
      </radialGradient>
      <radialGradient cx="0.5" cy="0.45" id="dsn-vignette" r="0.62">
        <stop offset="0.62" stopColor="#1a1206" stopOpacity="0" />
        <stop offset="1" stopColor="#1a1206" stopOpacity="0.6" />
      </radialGradient>
      <filter id="dsn-grain">
        <feTurbulence baseFrequency="0.9" numOctaves="2" type="fractalNoise" />
        <feColorMatrix
          type="matrix"
          values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.6 0"
        />
      </filter>
    </defs>
  </svg>
);

/**
 * Heraldic shield with the player's race emblem (see emblems.ts for the
 * artwork credits). Replaces the old initial-circle avatar. A null name is
 * a player we never recorded: the shield bears a question mark instead.
 */
const PlayerBlazon = ({
  champion = false,
  name,
  size = 'md',
}: {
  champion?: boolean;
  name: string | null;
  size?: keyof typeof BLAZON_SIZES;
}) => (
  <svg
    aria-hidden="true"
    className={`aspect-[100/116] flex-none ${BLAZON_SIZES[size]} ${
      champion
        ? 'drop-shadow-[0_0_14px_rgba(201,165,87,0.45)]'
        : 'drop-shadow-[0_2px_4px_rgba(0,0,0,0.55)]'
    } ${name === null ? 'opacity-65 saturate-50' : ''}`}
    viewBox="0 0 100 116"
  >
    <path
      d={SHIELD_PATH}
      fill="url(#dsn-blazon-field)"
      stroke="url(#dsn-blazon-rim)"
      strokeWidth={champion ? 5 : 3.5}
    />
    <path
      d={SHIELD_PATH}
      fill="none"
      opacity="0.6"
      stroke="var(--hair-gold)"
      strokeWidth="1.5"
      transform="translate(50 58) scale(0.88) translate(-50 -58)"
    />
    {name === null ? (
      <text
        dominantBaseline="central"
        fill="url(#dsn-blazon-emblem)"
        fontFamily="var(--font-cinzel), Georgia, serif"
        fontSize="52"
        fontWeight="900"
        textAnchor="middle"
        x="50"
        y="54"
      >
        ?
      </text>
    ) : (
      <path
        d={RACE_EMBLEMS[raceForPlayer(name)]}
        fill="url(#dsn-blazon-emblem)"
        transform="translate(22 26) scale(0.109375)"
      />
    )}
  </svg>
);

/** Board-game meeple, tinted per team. */
const Meeple = ({ color, size = 15 }: { color: string; size?: number }) => (
  <svg
    aria-hidden="true"
    className="flex-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]"
    height={size}
    viewBox="0 0 24 24"
    width={size}
  >
    <path
      d="M12 2a3.2 3.2 0 0 1 3.2 3.2c0 1-.5 1.9-1.2 2.6 2.8.8 5.2 2.7 6.8 5.4.4.7-.1 1.6-.9 1.6h-4.3c1 1.9 2.4 3.6 4.1 4.9.8.6.3 1.9-.7 1.9h-4c-1.2 0-2.3-.6-3-1.6-.7 1-1.8 1.6-3 1.6H5c-1 0-1.5-1.3-.7-1.9 1.7-1.3 3.1-3 4.1-4.9H4.1c-.8 0-1.3-.9-.9-1.6 1.6-2.7 4-4.6 6.8-5.4-.7-.7-1.2-1.6-1.2-2.6A3.2 3.2 0 0 1 12 2Z"
      fill={color}
    />
  </svg>
);

type Rarity = 'legendary' | 'epic' | 'rare' | 'common';

/** Gems also come in podium metals, matching the honor banners. */
type GemTone = Rarity | 'silver' | 'bronze';

const Gem = ({ rarity }: { rarity: GemTone }) => (
  <span aria-hidden className={`d-gem d-gem-${rarity}`} />
);

const rarityForPosition = (position: number): Rarity => {
  if (position === 1) {
    return 'legendary';
  }
  if (position <= 3) {
    return 'epic';
  }
  if (position <= 6) {
    return 'rare';
  }
  return 'common';
};

const CoinStack = ({ value }: { value: number }) => (
  <span className="flex items-center gap-1.5">
    <span aria-hidden className="flex">
      <span className="d-coin size-3.5" />
      <span className="d-coin -ml-2 size-3.5" />
      <span className="d-coin -ml-2 size-3.5" />
    </span>
    <span className="font-bold font-mono text-(--gold-hi)">{value}</span>
  </span>
);

const Footer = ({ note }: { note?: ReactNode }) => (
  <footer className="flex flex-col items-center gap-5 px-4 pt-44 pb-10 text-center sm:pt-56">
    <Divider />
    <span className="d-display d-gold-text font-black text-xl tracking-[0.22em]">
      FRIKIPARTY
    </span>
    <p className="font-mono text-(--faded) text-[0.65rem] uppercase tracking-[0.25em]">
      Desde 2005 reuniendo frikis frescos
    </p>
    {note ? (
      <p className="max-w-[52ch] text-(--faded) text-sm">{note}</p>
    ) : null}
    <p className="max-w-[52ch] font-mono text-(--faded) text-[0.6rem] uppercase tracking-[0.15em]">
      Emblemas de{' '}
      <a
        className="underline hover:text-(--gold)"
        href="https://game-icons.net"
        rel="noreferrer"
        target="_blank"
      >
        game-icons.net
      </a>{' '}
      (Lorc, Delapouite, Kier Heyl, Carl Olsen) · CC BY 3.0 — Retratos de{' '}
      <a
        className="underline hover:text-(--gold)"
        href="https://www.wesnoth.org"
        rel="noreferrer"
        target="_blank"
      >
        Battle for Wesnoth
      </a>{' '}
      · GPLv2+ / CC BY-SA 4.0 — Anillo de{' '}
      <a
        className="underline hover:text-(--gold)"
        href="https://commons.wikimedia.org/wiki/File:One_Ring_Blender_Render.png"
        rel="noreferrer"
        target="_blank"
      >
        Peter J. Yost
      </a>{' '}
      · CC BY-SA 4.0
    </p>
  </footer>
);

const Section = ({ children, id }: { children: ReactNode; id?: string }) => (
  <section
    className="mx-auto flex w-full max-w-[1180px] scroll-mt-20 flex-col gap-10 px-4 py-14 sm:px-6 sm:py-16"
    id={id}
  >
    {children}
  </section>
);

export {
  BlazonDefs,
  btn,
  CoinStack,
  Divider,
  eyebrow,
  Footer,
  Gem,
  input,
  label,
  linkGold,
  Meeple,
  PlayerBlazon,
  panel,
  panelGold,
  RingGlyph,
  rarityForPosition,
  Section,
  SectionHeader,
  tag,
  td,
  th,
};
