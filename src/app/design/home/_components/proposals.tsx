import Link from 'next/link';
import type { ReactNode } from 'react';

import { SHIELD_PATH } from '@/components/theme/primitives';
import { ASPIRANTS_ANCHOR } from '@/lib/council';

import type { Avatar, EventFacts } from './facts';

/*
 * Four ways of laying out the hero's event line — dates, venue, game,
 * who's coming — each with the Maps link folded into the piece instead of
 * hanging off it as a bare "Cómo llegar →". Every proposal is fed the same
 * real facts and sits under the same headline, so only the treatment
 * changes.
 */

const CINZEL = 'var(--font-cinzel), Georgia, serif';

const MapsLink = ({
  children,
  className,
  facts,
  label,
}: {
  children: ReactNode;
  className: string;
  facts: EventFacts;
  label?: string;
}) =>
  facts.mapsUrl ? (
    <a
      aria-label={label ?? `Cómo llegar a ${facts.venueName} (Google Maps)`}
      className={className}
      href={facts.mapsUrl}
      rel="noreferrer"
      target="_blank"
    >
      {children}
    </a>
  ) : (
    <span className={className}>{children}</span>
  );

/**
 * A tinted Google map that never steals the pointer; the parent links.
 * The iframe is drawn taller than its frame and shifted up, so Google's
 * own chips and attribution bar stay clipped out of the picture.
 */
const TintedMap = ({
  className = '',
  facts,
}: {
  className?: string;
  facts: EventFacts;
}) => (
  <div className={`relative overflow-hidden ${className}`}>
    {facts.mapEmbedSrc ? (
      <iframe
        className="pointer-events-none absolute inset-x-0 -top-16 h-[calc(100%+8rem)] w-full border-0 opacity-90 contrast-92 grayscale-40 sepia-25"
        loading="lazy"
        src={facts.mapEmbedSrc}
        tabIndex={-1}
        title={`Mapa de ${facts.venueName}`}
      />
    ) : (
      <div className="absolute inset-0 bg-(--panel-2)" />
    )}
  </div>
);

/** Overlapping round portraits: who has already answered the call. */
const AvatarStack = ({
  avatars,
  max = 5,
  size = 'h-8 w-8',
}: {
  avatars: Avatar[];
  max?: number;
  size?: string;
}) => {
  const shown = avatars.slice(0, max);
  const rest = avatars.length - shown.length;
  return (
    <span className="flex shrink-0 items-center">
      {shown.map((avatar, index) => (
        // biome-ignore lint/performance/noImgElement: local portrait assets, plain img keeps the stack light
        <img
          alt={avatar.name}
          className={`${size} relative shrink-0 rounded-full border-(--night) border-2 object-cover object-top ${index > 0 ? '-ml-2.5' : ''}`}
          key={avatar.slug}
          src={avatar.portrait}
          style={{ zIndex: shown.length - index }}
        />
      ))}
      {rest > 0 ? (
        <span
          className={`${size} relative z-10 -ml-2.5 flex shrink-0 items-center justify-center rounded-full border-(--night) border-2 bg-(--panel-2) font-bold font-mono text-(--gold) text-2xs`}
        >
          +{rest}
        </span>
      ) : null}
    </span>
  );
};

const dateSpan = (facts: EventFacts) => {
  const first = facts.days[0];
  const last = facts.days[facts.days.length - 1];
  if (!first || !last) {
    return '';
  }
  return first.month === last.month
    ? `${first.day}–${last.day} de ${first.month}`
    : `${first.day} de ${first.month} – ${last.day} de ${last.month}`;
};

const weekdaySpan = (facts: EventFacts) => {
  const first = facts.days[0];
  const last = facts.days[facts.days.length - 1];
  return first && last ? `de ${first.weekday} a ${last.weekday}` : '';
};

/* ------------------------------------------------------------------ */
/* A · El bando: four facts in one gold strip, the map as the "Dónde" cell */
/* ------------------------------------------------------------------ */

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
  moon: (
    <Glyph>
      <path d="M15.5 3.5a8.5 8.5 0 1 0 5 15.3A7 7 0 0 1 15.5 3.5Z" />
      <path d="M4 5.5l.6 1.4 1.4.6-1.4.6L4 9.5l-.6-1.5L2 7.4l1.4-.6Z" />
    </Glyph>
  ),
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
  shield: (
    <Glyph>
      <path d="M12 3l7 2.5v5.7c0 4.6-3 7.9-7 9.8-4-1.9-7-5.2-7-9.8V5.5Z" />
      <path d="M12 7v9M8.5 10.5h7" />
    </Glyph>
  ),
} as const;

const BandoCell = ({
  children,
  className = '',
  glyph,
  heading,
}: {
  children: ReactNode;
  className?: string;
  glyph: keyof typeof GLYPHS;
  heading: string;
}) => (
  <div
    className={`relative flex min-w-0 flex-col gap-2 p-4 sm:p-5 ${className}`}
  >
    <div className="flex items-center gap-2.5">
      {GLYPHS[glyph]}
      <span className="font-bold font-mono text-(--gold) text-2xs uppercase tracking-3xl">
        {heading}
      </span>
    </div>
    {children}
  </div>
);

const ProposalBando = ({ facts }: { facts: EventFacts }) => (
  <div className="flex w-full max-w-3xl flex-col items-center text-center">
    <div className="d-scape grid w-full grid-cols-1 overflow-hidden rounded-xl border border-(--hair-gold) text-left shadow-[inset_0_1px_0_#f0d48a1f,0_12px_34px_#00000066] sm:grid-cols-2 lg:grid-cols-4">
      <BandoCell
        className="border-(--hair-gold) border-b sm:border-r lg:border-b-0"
        glyph="moon"
        heading="Cuándo"
      >
        <span className="d-display font-bold text-(--parchment) text-xl leading-tight">
          {dateSpan(facts)}
        </span>
        <span className="text-(--faded) text-sm">
          {weekdaySpan(facts)} · {facts.days.length} días
        </span>
      </BandoCell>
      <MapsLink
        className="group relative flex min-w-0 flex-col border-(--hair-gold) border-b transition-colors lg:border-r lg:border-b-0"
        facts={facts}
      >
        <TintedMap
          className="absolute inset-0 opacity-45 transition-opacity group-hover:opacity-70"
          facts={facts}
        />
        <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-(--panel) via-(--panel)/70 to-transparent" />
        <BandoCell className="relative h-full" glyph="mountain" heading="Dónde">
          <span className="d-display font-bold text-(--parchment) text-xl leading-tight">
            {facts.venueName}
          </span>
          <span className="text-(--faded) text-sm">
            {facts.venueArea} ·{' '}
            <span className="font-bold text-(--gold) transition-colors group-hover:text-(--gold-hi)">
              Cómo llegar
            </span>
          </span>
        </BandoCell>
      </MapsLink>
      <BandoCell
        className="border-(--hair-gold) border-b sm:border-r sm:border-b-0"
        glyph="ring"
        heading="Qué"
      >
        <span className="d-display font-bold text-(--parchment) text-xl leading-tight">
          Age of the Ring
        </span>
        <span className="text-(--faded) text-sm">
          Torneo por equipos e individual, y juegos de mesa hasta las tantas
        </span>
      </BandoCell>
      <Link
        className="group flex min-w-0 flex-col transition-colors hover:bg-(--panel-2)/60"
        href={`/council#${ASPIRANTS_ANCHOR}`}
      >
        <BandoCell glyph="shield" heading="Quiénes">
          <span className="flex items-center gap-3">
            <AvatarStack avatars={facts.confirmed} />
            <span className="d-display font-bold text-(--parchment) text-xl leading-tight">
              {facts.confirmed.length}
            </span>
          </span>
          <span className="text-(--faded) text-sm">
            {facts.confirmed.length === 1 ? 'confirmado' : 'confirmados'} ·{' '}
            <span className="font-bold text-(--gold) transition-colors group-hover:text-(--gold-hi)">
              Ver el concilio
            </span>
          </span>
        </BandoCell>
      </Link>
    </div>
  </div>
);

/* ------------------------------------------------------------------ */
/* B · La carta de marcha: the map is the piece, a cartouche holds the facts */
/* ------------------------------------------------------------------ */

const CompassRose = () => (
  <svg
    aria-hidden="true"
    className="h-14 w-14 text-(--gold)"
    fill="none"
    stroke="currentColor"
    strokeLinejoin="round"
    strokeWidth="1.2"
    viewBox="0 0 64 64"
  >
    <circle cx="32" cy="32" opacity="0.5" r="26" />
    <circle cx="32" cy="32" opacity="0.35" r="20" />
    <path d="M32 6l5 22-5 4-5-4Z" fill="currentColor" />
    <path d="M32 58l5-22-5-4-5 4Z" opacity="0.55" />
    <path d="M6 32l22-5 4 5-4 5Z" opacity="0.55" />
    <path d="M58 32l-22-5-4 5 4 5Z" opacity="0.55" />
    <path d="M14 14l14 14M50 14L36 28M14 50l14-14M50 50L36 36" opacity="0.4" />
    <text
      fill="currentColor"
      fontFamily={CINZEL}
      fontSize="8"
      fontWeight="700"
      stroke="none"
      textAnchor="middle"
      x="32"
      y="5"
    >
      N
    </text>
  </svg>
);

const CartoucheRow = ({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) => (
  <div className="flex items-baseline gap-3 border-(--hair-gold) border-t py-2 first:border-t-0 first:pt-0 last:pb-0">
    <span className="w-24 shrink-0 font-bold font-mono text-(--gold) text-2xs uppercase tracking-3xl">
      {label}
    </span>
    <span className="min-w-0 text-(--parchment) text-sm leading-snug">
      {value}
    </span>
  </div>
);

const ProposalCartouche = ({ facts }: { facts: EventFacts }) => (
  <div className="flex w-full max-w-3xl flex-col items-center text-center">
    <div className="relative w-full overflow-hidden rounded-xl border border-(--hair-gold) shadow-[inset_0_1px_0_#f0d48a1f,0_12px_34px_#00000066]">
      <MapsLink
        className="group block"
        facts={facts}
        label={`Abrir ${facts.venueName} en Google Maps`}
      >
        <TintedMap className="h-80 w-full sm:h-88" facts={facts} />
        {/* Vignette so the cartouche and the compass sit on quiet ground */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_90%_at_20%_100%,rgba(10,15,12,0.92)_0%,rgba(10,15,12,0.55)_45%,rgba(10,15,12,0.15)_100%)]" />
        <div className="absolute top-4 right-4 flex flex-col items-center gap-1">
          <CompassRose />
          <span className="font-bold font-mono text-(--gold) text-3xs uppercase tracking-2xl transition-colors group-hover:text-(--gold-hi)">
            Cómo llegar
          </span>
        </div>
      </MapsLink>
      <div className="absolute bottom-4 left-4 w-[min(22rem,calc(100%-2rem))] rounded-lg border border-(--hair-gold) bg-(--night)/85 p-4 text-left shadow-[0_10px_30px_#000000a6] backdrop-blur-sm">
        <CartoucheRow
          label="Fecha"
          value={
            <>
              {dateSpan(facts)}
              <span className="text-(--faded)"> · {weekdaySpan(facts)}</span>
            </>
          }
        />
        <CartoucheRow
          label="Sede"
          value={
            <>
              {facts.venueSlug && facts.venueIsPlace ? (
                <Link
                  className="transition-colors hover:text-(--gold-hi)"
                  href={`/venues/${facts.venueSlug}`}
                >
                  {facts.venueName}
                </Link>
              ) : (
                facts.venueName
              )}
              <span className="text-(--faded)"> · {facts.venueArea}</span>
            </>
          }
        />
        <CartoucheRow
          label="Juego"
          value={
            <>
              Age of the Ring
              <span className="text-(--faded)"> · equipos e individual</span>
            </>
          }
        />
        <CartoucheRow
          label="Confirmados"
          value={
            <Link
              className="flex flex-wrap items-center gap-x-2.5 gap-y-1 transition-colors hover:text-(--gold-hi)"
              href={`/council#${ASPIRANTS_ANCHOR}`}
            >
              <AvatarStack avatars={facts.confirmed} max={4} size="h-6 w-6" />
              <span className="whitespace-nowrap">
                {facts.confirmed.length} en el concilio
              </span>
            </Link>
          }
        />
      </div>
    </div>
  </div>
);

/* ------------------------------------------------------------------ */
/* C · El estandarte: a heraldic pennant hung under the headline          */
/* ------------------------------------------------------------------ */

/** The rod the pennant hangs from: a gold bar with turned finials. */
const BannerRod = () => (
  <svg
    aria-hidden="true"
    className="relative z-10 block w-[calc(100%+3rem)] max-w-none"
    style={{ marginLeft: '-1.5rem' }}
    viewBox="0 0 400 24"
  >
    <defs>
      <linearGradient id="dsn-home-rod" x1="0" x2="1" y1="0" y2="0">
        <stop offset="0" stopColor="#8f6b2e" />
        <stop offset="0.5" stopColor="#f0d48a" />
        <stop offset="1" stopColor="#8f6b2e" />
      </linearGradient>
    </defs>
    <rect
      fill="url(#dsn-home-rod)"
      height="5"
      rx="2.5"
      width="372"
      x="14"
      y="9.5"
    />
    <circle cx="10" cy="12" fill="#f0d48a" r="6" />
    <circle
      cx="10"
      cy="12"
      fill="none"
      r="8.5"
      stroke="#c9a557"
      strokeWidth="1.2"
    />
    <circle cx="390" cy="12" fill="#f0d48a" r="6" />
    <circle
      cx="390"
      cy="12"
      fill="none"
      r="8.5"
      stroke="#c9a557"
      strokeWidth="1.2"
    />
    {/* The rings that carry the cloth */}
    {[70, 200, 330].map((x) => (
      <circle
        cx={x}
        cy="14"
        fill="none"
        key={x}
        r="4.5"
        stroke="#c9a557"
        strokeWidth="1.5"
      />
    ))}
  </svg>
);

const BannerRow = ({ label, value }: { label: string; value: ReactNode }) => (
  <div className="flex flex-col items-center gap-1">
    <span className="font-bold font-mono text-(--gold) text-3xs uppercase tracking-3xl">
      {label}
    </span>
    <span className="text-(--parchment) text-sm leading-snug">{value}</span>
  </div>
);

const ProposalBanner = ({ facts }: { facts: EventFacts }) => {
  const first = facts.days[0];
  const last = facts.days[facts.days.length - 1];
  const month = (last?.month ?? '').slice(0, 3).toUpperCase();
  return (
    <div className="flex w-full max-w-3xl flex-col items-center text-center">
      <div className="relative w-full max-w-sm">
        <BannerRod />
        {/* The cloth: swallow-tailed, hemmed in gold, the site's own dark ground */}
        <div
          className="relative -mt-3 bg-[#c9a557] p-px shadow-[0_18px_40px_#000000a6]"
          style={{
            clipPath:
              'polygon(0 0, 100% 0, 100% calc(100% - 3.25rem), 50% 100%, 0 calc(100% - 3.25rem))',
          }}
        >
          <div
            className="d-scape flex flex-col items-center gap-5 px-6 pt-8 pb-20"
            style={{
              clipPath:
                'polygon(0 0, 100% 0, 100% calc(100% - 3.25rem), 50% 100%, 0 calc(100% - 3.25rem))',
            }}
          >
            {/* Inner hem */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-2.5 border border-(--hair-gold)"
              style={{
                clipPath:
                  'polygon(0 0, 100% 0, 100% calc(100% - 3rem), 50% 100%, 0 calc(100% - 3rem))',
              }}
            />
            {/* The dates are the device on the cloth */}
            <div className="flex flex-col items-center pt-1">
              <span className="d-display d-gold-text font-black text-6xl leading-none">
                {first?.day}–{last?.day}
              </span>
              <span
                className="font-bold text-(--parchment) text-xl uppercase tracking-3xl"
                style={{ fontFamily: CINZEL }}
              >
                {month}
              </span>
              <span className="mt-1 text-(--faded) text-sm">
                {weekdaySpan(facts)} · {facts.days.length} días
              </span>
            </div>
            <div className="flex w-full items-center gap-3">
              <span className="h-px flex-1 bg-(--hair-gold)" />
              <span className="h-1.5 w-1.5 rotate-45 bg-(--gold)" />
              <span className="h-px flex-1 bg-(--hair-gold)" />
            </div>
            {/* The venue as a medallion, the link to Maps */}
            <MapsLink
              className="group flex flex-col items-center gap-2.5"
              facts={facts}
            >
              <span className="relative flex h-24 w-24 items-center justify-center rounded-full bg-[#c9a557] p-0.5 shadow-[0_0_0_4px_rgba(201,165,87,0.18),0_8px_20px_#00000080] transition-shadow group-hover:shadow-[0_0_0_6px_rgba(201,165,87,0.28),0_8px_24px_#00000080]">
                {facts.venuePhotoUrl ? (
                  // biome-ignore lint/performance/noImgElement: remote host not allow-listed in next.config for next/image
                  <img
                    alt={`Fotografía de ${facts.venueName}`}
                    className="h-full w-full rounded-full object-cover"
                    src={facts.venuePhotoUrl}
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center rounded-full bg-(--panel-2)">
                    {GLYPHS.mountain}
                  </span>
                )}
              </span>
              <span className="flex flex-col items-center">
                <span
                  className="font-bold text-(--parchment) text-lg leading-tight transition-colors group-hover:text-(--gold-hi)"
                  style={{ fontFamily: CINZEL }}
                >
                  {facts.venueName}
                </span>
                <span className="text-(--faded) text-sm">
                  {facts.venueArea} ·{' '}
                  <span className="font-bold text-(--gold) transition-colors group-hover:text-(--gold-hi)">
                    Cómo llegar
                  </span>
                </span>
              </span>
            </MapsLink>
            <div className="grid w-full grid-cols-2 gap-4 border-(--hair-gold) border-t pt-5">
              <BannerRow
                label="Juego"
                value={
                  <>
                    Age of the Ring
                    <br />
                    <span className="text-(--faded)">equipos e individual</span>
                  </>
                }
              />
              <BannerRow
                label="Confirmados"
                value={
                  <Link
                    className="group flex flex-col items-center gap-1.5 transition-colors hover:text-(--gold-hi)"
                    href={`/council#${ASPIRANTS_ANCHOR}`}
                  >
                    <AvatarStack
                      avatars={facts.confirmed}
                      max={4}
                      size="h-7 w-7"
                    />
                    <span>
                      {facts.confirmed.length}{' '}
                      <span className="text-(--faded) group-hover:text-(--gold)">
                        en el concilio
                      </span>
                    </span>
                  </Link>
                }
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* D · Las jornadas: beacons on a rail, one plaque for venue and roster  */
/* ------------------------------------------------------------------ */

/** A lit beacon: bowl, tongue of fire and its glow, flickering. */
const Beacon = ({ delay }: { delay: number }) => (
  <svg
    aria-hidden="true"
    className="h-14 w-10 overflow-visible"
    viewBox="0 0 40 56"
  >
    <defs>
      <radialGradient cx="50%" cy="60%" id="dsn-home-beacon-glow" r="50%">
        <stop offset="0" stopColor="#f0b25a" stopOpacity="0.55" />
        <stop offset="1" stopColor="#f0b25a" stopOpacity="0" />
      </radialGradient>
      <linearGradient id="dsn-home-beacon-fire" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" stopColor="#fff1c2" />
        <stop offset="0.45" stopColor="#f0b25a" />
        <stop offset="1" stopColor="#b8431f" />
      </linearGradient>
      <linearGradient id="dsn-home-beacon-bowl" x1="0" x2="1" y1="0" y2="0">
        <stop offset="0" stopColor="#8f6b2e" />
        <stop offset="0.5" stopColor="#f0d48a" />
        <stop offset="1" stopColor="#8f6b2e" />
      </linearGradient>
    </defs>
    <circle cx="20" cy="30" fill="url(#dsn-home-beacon-glow)" r="26" />
    <g
      className="d-flicker"
      style={{ animationDelay: `${delay}s`, transformOrigin: '20px 44px' }}
    >
      <path
        d="M20 4c1.5 9 9 13 9 24a9 9 0 0 1-18 0c0-6 3-8 5-12 .8 3 2 5 4 6-.6-6-.8-12 0-18Z"
        fill="url(#dsn-home-beacon-fire)"
      />
      <path
        d="M20 22c1.2 4 4.5 6 4.5 11a4.5 4.5 0 0 1-9 0c0-3 1.5-4 2.5-6 .4 1.5 1 2.4 2 2.8-.3-3-.3-5 0-7.8Z"
        fill="#fff6dc"
        opacity="0.9"
      />
    </g>
    {/* The bowl and its stem */}
    <path
      d="M8 40h24c0 5-5 9-12 9S8 45 8 40Z"
      fill="url(#dsn-home-beacon-bowl)"
    />
    <rect fill="#8f6b2e" height="6" rx="1" width="4" x="18" y="48" />
    <rect
      fill="url(#dsn-home-beacon-bowl)"
      height="2"
      rx="1"
      width="14"
      x="13"
      y="54"
    />
  </svg>
);

/** One line per day, in the site's register: arrival, the tournament
 *  begins, the final decides everything, scores settled and farewells. */
const DAY_PLANS = [
  'Se encienden las hogueras',
  'Suenan los cuernos: empieza el torneo',
  'Todo se decide en la gran final',
  'Cuentas saldadas y despedidas',
];

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

const ProposalBeacons = ({ facts }: { facts: EventFacts }) => (
  <div className="flex w-full max-w-3xl flex-col items-center text-center">
    <div className="flex w-full max-w-2xl flex-col gap-12 sm:gap-7">
      {/* The rail: a gold hairline with a diamond at each end and the
          beacons standing on it. On phones the four days sit two by two,
          each pair on its own stretch of rail, split by a hairline. */}
      <ol className="relative grid grid-cols-2 gap-y-6 sm:grid-cols-4 sm:gap-y-0">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-[3.55rem] hidden items-center sm:flex"
        >
          <span className="h-1.5 w-1.5 rotate-45 bg-(--gold)" />
          <span className="h-px flex-1 bg-linear-to-r from-(--gold) via-(--gold)/50 to-(--gold)" />
          <span className="h-1.5 w-1.5 rotate-45 bg-(--gold)" />
        </div>
        {facts.days.slice(0, 4).map((day, index) => (
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
      {/* One plaque for the rest: venue (the Maps link), roster, game.
          On phones it stacks venue and roster as two full-width rows, so
          the faces never fight the text for room; the game waits for the
          wider, three-cell plaque. */}
      <div className="d-scape grid grid-cols-1 overflow-hidden rounded-xl border border-(--hair-gold) text-left shadow-[inset_0_1px_0_#f0d48a1f,0_12px_34px_#00000066] sm:grid-cols-[1.2fr_1.3fr_1fr]">
        <MapsLink
          className="group border-(--hair-gold) border-b transition-colors hover:bg-(--panel-2)/60 sm:border-r sm:border-b-0"
          facts={facts}
        >
          <PlaqueCell>
            {facts.venuePhotoUrl ? (
              // biome-ignore lint/performance/noImgElement: remote host not allow-listed in next.config for next/image
              <img
                alt=""
                className={`${plaqueIcon} object-cover`}
                src={facts.venuePhotoUrl}
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
                {facts.venueName}
              </span>
              <span className="text-(--faded) text-xs">
                {/* The full area on the wide phone row; just the town in
                    the narrower desktop cell, so the line never breaks. */}
                <span className="sm:hidden">{facts.venueArea}</span>
                <span className="hidden sm:inline">
                  {facts.venueArea.split(',')[0]}
                </span>{' '}
                ·{' '}
                <span className="font-bold text-(--gold) transition-colors group-hover:text-(--gold-hi)">
                  Cómo llegar
                </span>
              </span>
            </span>
          </PlaqueCell>
        </MapsLink>
        <Link
          className="group transition-colors hover:bg-(--panel-2)/60 sm:border-(--hair-gold) sm:border-r"
          href={`/council#${ASPIRANTS_ANCHOR}`}
        >
          <PlaqueCell>
            {/* The phone row runs full width: room for five faces. The
                desktop cell shares the plaque with two others: two faces
                and the tally. */}
            <span className="contents sm:hidden">
              <AvatarStack avatars={facts.confirmed} max={5} size="h-9 w-9" />
            </span>
            <span className="hidden sm:contents">
              <AvatarStack avatars={facts.confirmed} max={2} size="h-9 w-9" />
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="font-bold text-(--parchment) text-sm leading-tight">
                {facts.confirmed.length}{' '}
                {facts.confirmed.length === 1 ? 'confirmado' : 'confirmados'}
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
            <span className="text-(--faded) text-xs">equipos e individual</span>
          </span>
        </PlaqueCell>
      </div>
    </div>
  </div>
);

/* ------------------------------------------------------------------ */
/* Shared: the shield for the unknown player, used when nobody confirmed */
/* ------------------------------------------------------------------ */

const UnknownShield = () => (
  <svg aria-hidden="true" className="h-8 w-8" viewBox="0 0 512 512">
    <path
      d={SHIELD_PATH}
      fill="url(#dsn-blazon-field)"
      stroke="url(#dsn-blazon-rim)"
      strokeWidth="14"
    />
  </svg>
);

export {
  ProposalBando,
  ProposalBanner,
  ProposalBeacons,
  ProposalCartouche,
  UnknownShield,
};
