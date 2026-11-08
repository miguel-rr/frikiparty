import Link from 'next/link';
import type { ReactNode } from 'react';

import { ASPIRANTS_ANCHOR } from '@/lib/council';

/*
 * "Las jornadas": the hero's event line under the headline. The days stand
 * as lit beacons on a gold rail, each with what it holds, and one plaque
 * below carries the venue (the Maps link), who has confirmed and the game.
 * Chosen from the proposals at /design/home.
 */

type ConvocationAvatar = {
  name: string;
  slug: string;
  portrait: string;
};

type ConvocationVenue = {
  name: string | null;
  mapsUrl: string | null;
  photoUrl: string | null;
};

type ConvocationDay = {
  iso: string;
  day: number;
  /** "jue", "vie"… */
  weekdayShort: string;
};

const WEEKDAYS_SHORT_ES = [
  'dom',
  'lun',
  'mar',
  'mié',
  'jue',
  'vie',
  'sáb',
] as const;

/** Every day from startsAt to endsAt, inclusive (ISO dates, UTC-safe). */
const daysBetween = (startsAt: string, endsAt: string): ConvocationDay[] => {
  const days: ConvocationDay[] = [];
  const cursor = new Date(`${startsAt}T00:00:00Z`);
  const end = new Date(`${endsAt}T00:00:00Z`);
  while (cursor.getTime() <= end.getTime() && days.length < 14) {
    days.push({
      iso: cursor.toISOString().slice(0, 10),
      day: cursor.getUTCDate(),
      weekdayShort: WEEKDAYS_SHORT_ES[cursor.getUTCDay()] ?? 'lun',
    });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
};

/** One line per day, in the site's register: arrival, the tournament
 *  begins, the final decides everything, scores settled and farewells. */
const DAY_PLANS = [
  'Se encienden las hogueras',
  'Suenan los cuernos: empieza el torneo',
  'Todo se decide en la gran final',
  'Cuentas saldadas y despedidas',
];

const Glyph = ({ children }: { children: ReactNode }) => (
  <svg
    aria-hidden="true"
    className="h-6 w-6 shrink-0 text-(--gold)"
    fill="none"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth="1.6"
    viewBox="0 0 24 24"
  >
    {children}
  </svg>
);

const GLYPHS = {
  mountain: (
    <Glyph>
      <path d="M2 20l6.5-11 3.5 5.5L15 10l7 10Z" />
      <path d="M8.5 9l1.8 2.6M12 3v3M10.5 4.5h3" />
    </Glyph>
  ),
  ring: (
    <Glyph>
      <circle cx="12" cy="12" r="7.5" />
      <circle cx="12" cy="12" r="4.5" />
      <path d="M12 4.5v1.2M12 18.3v1.2M4.5 12h1.2M18.3 12h1.2" />
    </Glyph>
  ),
} as const;

/** A lit beacon: bowl, tongue of fire and its glow, flickering. */
const Beacon = ({ delay }: { delay: number }) => (
  <svg
    aria-hidden="true"
    className="h-14 w-10 overflow-visible"
    viewBox="0 0 40 56"
  >
    <defs>
      <radialGradient cx="50%" cy="60%" id="home-beacon-glow" r="50%">
        <stop offset="0" stopColor="#f0b25a" stopOpacity="0.55" />
        <stop offset="1" stopColor="#f0b25a" stopOpacity="0" />
      </radialGradient>
      <linearGradient id="home-beacon-fire" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" stopColor="#fff1c2" />
        <stop offset="0.45" stopColor="#f0b25a" />
        <stop offset="1" stopColor="#b8431f" />
      </linearGradient>
      <linearGradient id="home-beacon-bowl" x1="0" x2="1" y1="0" y2="0">
        <stop offset="0" stopColor="#8f6b2e" />
        <stop offset="0.5" stopColor="#f0d48a" />
        <stop offset="1" stopColor="#8f6b2e" />
      </linearGradient>
    </defs>
    <circle cx="20" cy="30" fill="url(#home-beacon-glow)" r="26" />
    <g
      className="d-flicker"
      style={{ animationDelay: `${delay}s`, transformOrigin: '20px 44px' }}
    >
      <path
        d="M20 4c1.5 9 9 13 9 24a9 9 0 0 1-18 0c0-6 3-8 5-12 .8 3 2 5 4 6-.6-6-.8-12 0-18Z"
        fill="url(#home-beacon-fire)"
      />
      <path
        d="M20 22c1.2 4 4.5 6 4.5 11a4.5 4.5 0 0 1-9 0c0-3 1.5-4 2.5-6 .4 1.5 1 2.4 2 2.8-.3-3-.3-5 0-7.8Z"
        fill="#fff6dc"
        opacity="0.9"
      />
    </g>
    {/* The bowl and its stem */}
    <path d="M8 40h24c0 5-5 9-12 9S8 45 8 40Z" fill="url(#home-beacon-bowl)" />
    <rect fill="#8f6b2e" height="6" rx="1" width="4" x="18" y="48" />
    <rect
      fill="url(#home-beacon-bowl)"
      height="2"
      rx="1"
      width="14"
      x="13"
      y="54"
    />
  </svg>
);

const AvatarStack = ({
  avatars,
  max,
}: {
  avatars: ConvocationAvatar[];
  max: number;
}) => {
  const shown = avatars.slice(0, max);
  const rest = avatars.length - shown.length;
  return (
    <span className="flex shrink-0 items-center">
      {shown.map((avatar, index) => (
        // biome-ignore lint/performance/noImgElement: local portrait assets, plain img keeps the stack light
        <img
          alt={avatar.name}
          className={`relative h-9 w-9 shrink-0 rounded-full border-(--night) border-2 object-cover object-top ${index > 0 ? '-ml-2.5' : ''}`}
          key={avatar.slug}
          src={avatar.portrait}
          style={{ zIndex: shown.length - index }}
        />
      ))}
      {rest > 0 ? (
        <span className="relative z-10 -ml-2.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-(--night) border-2 bg-(--panel-2) font-bold font-mono text-(--gold) text-2xs">
          +{rest}
        </span>
      ) : null}
    </span>
  );
};

const PlaqueCell = ({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) => (
  <div
    className={`flex min-w-0 items-center gap-2.5 px-3.5 py-3 sm:px-4 ${className}`}
  >
    {children}
  </div>
);

/** Round 36px slot: every row's icon, the same size as one face of the stack. */
const plaqueIcon = 'h-9 w-9 shrink-0 rounded-full border border-(--hair-gold)';

const VenueCell = ({ venue }: { venue: ConvocationVenue }) => (
  <PlaqueCell>
    {venue.photoUrl ? (
      // biome-ignore lint/performance/noImgElement: remote host not allow-listed in next.config for next/image
      <img
        alt=""
        className={`${plaqueIcon} object-cover`}
        src={venue.photoUrl}
      />
    ) : (
      <span
        className={`${plaqueIcon} flex items-center justify-center bg-(--panel-2)`}
      >
        {GLYPHS.mountain}
      </span>
    )}
    <span className="flex min-w-0 flex-col">
      <span className="font-bold text-(--parchment) text-sm leading-tight">
        {venue.name}
      </span>
      {venue.mapsUrl ? (
        <span className="font-bold text-(--gold) text-xs transition-colors group-hover:text-(--gold-hi)">
          Cómo llegar
        </span>
      ) : null}
    </span>
  </PlaqueCell>
);

const venueCellClass =
  'group border-(--hair-gold) border-b transition-colors hover:bg-(--panel-2)/60 sm:border-r sm:border-b-0';

const VenueLink = ({ venue }: { venue: ConvocationVenue }) =>
  venue.mapsUrl ? (
    <a
      aria-label={`Cómo llegar a ${venue.name ?? 'la sede'} (Google Maps)`}
      className={venueCellClass}
      href={venue.mapsUrl}
      rel="noreferrer"
      target="_blank"
    >
      <VenueCell venue={venue} />
    </a>
  ) : (
    <div className={venueCellClass}>
      <VenueCell venue={venue} />
    </div>
  );

const DayRail = ({ days }: { days: ConvocationDay[] }) => (
  // The rail: a gold hairline with a diamond at each end and the beacons
  // standing on it. On phones the four days sit two by two, each pair on
  // its own stretch of rail, split by a hairline.
  <ol className="relative grid grid-cols-2 gap-y-6 sm:grid-cols-4 sm:gap-y-0">
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 top-[3.55rem] hidden items-center sm:flex"
    >
      <span className="h-1.5 w-1.5 rotate-45 bg-(--gold)" />
      <span className="h-px flex-1 bg-linear-to-r from-(--gold) via-(--gold)/50 to-(--gold)" />
      <span className="h-1.5 w-1.5 rotate-45 bg-(--gold)" />
    </div>
    {days.slice(0, 4).map((day, index) => (
      <li
        className={[
          'relative flex flex-col items-center gap-0.5 px-2 pt-1',
          // Phone rail: one stretch per cell, joined across the pair,
          // with the pair's end diamonds on its outer cells.
          "before:absolute before:inset-x-0 before:top-[3.55rem] before:h-px before:bg-(--gold)/55 before:content-[''] sm:before:hidden",
          "after:absolute after:top-[3.35rem] after:h-1.5 after:w-1.5 after:rotate-45 after:bg-(--gold) after:content-[''] sm:after:hidden",
          index % 2 === 0 ? 'after:left-0' : 'after:right-0',
        ].join(' ')}
        key={day.iso}
      >
        {/* Dividers start under the rail so they never cross it:
            between the pair on phones, between every day from sm. */}
        {index % 2 === 0 ? (
          <span
            aria-hidden="true"
            className="absolute top-[4.4rem] right-0 bottom-0 w-px bg-(--hair-gold) sm:hidden"
          />
        ) : null}
        {index > 0 ? (
          <span
            aria-hidden="true"
            className="absolute top-[4.4rem] bottom-0 left-0 hidden w-px bg-(--hair-gold) sm:block"
          />
        ) : null}
        <Beacon delay={index * 0.45} />
        <span className="mt-3 font-bold font-mono text-(--gold) text-2xs uppercase tracking-4xl">
          {day.weekdayShort}
        </span>
        <span className="d-display d-gold-text font-black text-5xl leading-none">
          {day.day}
        </span>
        <span className="mt-1.5 max-w-[17ch] text-(--faded) text-xs leading-snug">
          {DAY_PLANS[index]}
        </span>
      </li>
    ))}
  </ol>
);

const HomeConvocation = ({
  confirmed,
  endsAt,
  startsAt,
  venue,
}: {
  confirmed: ConvocationAvatar[];
  endsAt: string | null;
  startsAt: string | null;
  venue: ConvocationVenue;
}) => {
  const days = startsAt && endsAt ? daysBetween(startsAt, endsAt) : [];
  return (
    <div className="flex w-full max-w-3xl flex-col items-center text-center">
      <div className="flex w-full max-w-2xl flex-col gap-12 sm:gap-7">
        {days.length > 0 ? <DayRail days={days} /> : null}
        {/* One plaque for the rest: venue (the Maps link), roster, game.
            On phones it stacks venue and roster as two full-width rows, so
            the faces never fight the text for room; the game waits for the
            wider, three-cell plaque. */}
        <div className="d-scape grid grid-cols-1 overflow-hidden rounded-xl border border-(--hair-gold) text-left shadow-[inset_0_1px_0_#f0d48a1f,0_12px_34px_#00000066] sm:grid-cols-[1.2fr_1.3fr_1fr]">
          <VenueLink venue={venue} />
          <Link
            className="group transition-colors hover:bg-(--panel-2)/60 sm:border-(--hair-gold) sm:border-r"
            href={`/council#${ASPIRANTS_ANCHOR}`}
          >
            <PlaqueCell>
              {/* The phone row runs full width: room for five faces. The
                  desktop cell shares the plaque with two others: two faces
                  and the tally. */}
              <span className="contents sm:hidden">
                <AvatarStack avatars={confirmed} max={5} />
              </span>
              <span className="hidden sm:contents">
                <AvatarStack avatars={confirmed} max={2} />
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="font-bold text-(--parchment) text-sm leading-tight">
                  {confirmed.length}{' '}
                  {confirmed.length === 1 ? 'confirmado' : 'confirmados'}
                </span>
                <span className="font-bold text-(--gold) text-xs transition-colors group-hover:text-(--gold-hi)">
                  Ver el concilio
                </span>
              </span>
            </PlaqueCell>
          </Link>
          <PlaqueCell className="hidden sm:flex">
            <span
              className={`${plaqueIcon} flex items-center justify-center bg-(--panel-2)`}
            >
              {GLYPHS.ring}
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="font-bold text-(--parchment) text-sm leading-tight">
                Age of the Ring
              </span>
              <span className="text-(--faded) text-xs">
                equipos e individual
              </span>
            </span>
          </PlaqueCell>
        </div>
      </div>
    </div>
  );
};

export type { ConvocationAvatar };
export { HomeConvocation };
