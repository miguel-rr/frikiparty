import { NEXT_EVENT } from '@/app/design/fixtures';
import { RACE_EMBLEMS } from '@/components/theme/emblems';
import { tag } from '@/components/theme/primitives';

const INSCRIPTION =
  'UNA EDICIÓN PARA GOBERNARLAS A TODAS · UNA EDICIÓN PARA ENCONTRARLOS · UNA EDICIÓN PARA ATRAERLOS A TODOS Y EN LAS TINIEBLAS ATARLOS · ';

/** Signature element: the One Ring with a rotating inscription. */
const HeroRing = () => (
  <div className="d-ring-wrap relative w-[min(80vw,440px)] lg:w-105">
    <svg className="block w-full" role="img" viewBox="0 0 320 320">
      <title>{NEXT_EVENT.edition}</title>
      <defs>
        <linearGradient id="ring-gold" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#f0d48a" />
          <stop offset="0.5" stopColor="#c9a557" />
          <stop offset="1" stopColor="#8f6b2e" />
        </linearGradient>
        <path
          d="M160,26 a134,134 0 1,1 -0.02,0"
          fill="none"
          id="ring-text-path"
        />
      </defs>
      <circle
        cx="160"
        cy="160"
        fill="none"
        r="152"
        stroke="url(#ring-gold)"
        strokeWidth="7"
      />
      <circle
        cx="160"
        cy="160"
        fill="none"
        opacity="0.5"
        r="116"
        stroke="var(--hair-gold)"
        strokeWidth="1"
      />
      <g className="d-ring-rotor">
        <text
          fill="var(--gold)"
          fontFamily="var(--font-cinzel), Georgia, serif"
          fontSize="12.5"
          fontWeight="700"
          letterSpacing="2"
        >
          <textPath
            href="#ring-text-path"
            lengthAdjust="spacingAndGlyphs"
            textLength="838"
          >
            {INSCRIPTION}
          </textPath>
        </text>
      </g>
    </svg>
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 lg:gap-3">
      <span className="font-bold font-mono text-(--gold) text-[1.15rem] uppercase tracking-[0.35em] lg:text-[1.3rem]">
        Edición
      </span>
      <span className="d-display d-gold-text font-black text-7xl lg:text-8xl">
        {NEXT_EVENT.year}
      </span>
      <span className="font-bold font-mono text-(--faded) text-[0.62rem] uppercase tracking-[0.25em] lg:text-[0.7rem]">
        {NEXT_EVENT.shortDates}
      </span>
    </div>
  </div>
);

/**
 * Venue card: a themed Google Maps preview (keyless embed, muted to match
 * the palette) that acts as one big link to the real Maps place page. The
 * iframe ignores pointer events so every click lands on the link.
 */
const VenueCard = () => (
  <a
    aria-label={`Cómo llegar a ${NEXT_EVENT.venue} (Google Maps)`}
    className="group relative mt-8 block w-full max-w-2xl overflow-hidden rounded-xl border border-(--hair-gold) shadow-[0_12px_30px_rgba(0,0,0,0.4)] transition-shadow hover:shadow-[0_0_24px_rgba(201,165,87,0.25)]"
    href={NEXT_EVENT.mapsUrl}
    rel="noreferrer"
    target="_blank"
  >
    <div className="grid grid-cols-1 sm:grid-cols-2">
      {NEXT_EVENT.venuePhoto ? (
        // biome-ignore lint/performance/noImgElement: remote host not yet allow-listed in next.config for next/image
        <img
          alt={`Fotografía de ${NEXT_EVENT.venue}`}
          className="h-40 w-full object-cover sm:h-52"
          src={NEXT_EVENT.venuePhoto}
        />
      ) : (
        <div className="flex h-40 w-full flex-col items-center justify-center gap-2 bg-[radial-gradient(circle_at_50%_35%,#22301f,var(--night-2)_80%)] sm:h-52">
          <svg
            aria-hidden="true"
            className="size-12 opacity-70"
            viewBox="0 0 512 512"
          >
            <path d={RACE_EMBLEMS.hobbit} fill="url(#dsn-blazon-emblem)" />
          </svg>
          <span className="font-mono text-(--faded) text-[0.58rem] uppercase tracking-[0.2em]">
            Foto de la sede
          </span>
        </div>
      )}
      <iframe
        className="pointer-events-none h-44 w-full border-0 opacity-90 contrast-[0.92] grayscale-[0.4] sepia-[0.25] sm:h-52"
        loading="lazy"
        src={NEXT_EVENT.mapsEmbedUrl}
        tabIndex={-1}
        title={`Mapa de ${NEXT_EVENT.venue}`}
      />
    </div>
    <div className="flex items-center justify-between gap-3 border-(--hair-gold) border-t bg-(--panel) px-4 py-3">
      <span className="font-bold text-sm leading-snug">
        <span className="font-mono text-(--gold) text-[0.58rem] uppercase tracking-[0.22em]">
          Sede:{' '}
        </span>
        {NEXT_EVENT.venue} · {NEXT_EVENT.venueArea}
      </span>
      <span className="whitespace-nowrap font-bold text-(--gold) text-sm transition-colors group-hover:text-(--gold-hi)">
        Cómo llegar →
      </span>
    </div>
  </a>
);

const Hero = () => (
  <section className="relative overflow-hidden" id="top">
    <div className="mx-auto flex max-w-[880px] flex-col items-center gap-12 px-4 pt-14 pb-24 sm:px-6 lg:gap-7 lg:pt-8">
      <HeroRing />
      <div className="flex flex-col items-center gap-7 text-center lg:gap-5">
        <span className={tag}>Concilio anual · {NEXT_EVENT.edition}</span>
        <h1 className="d-display font-black text-[clamp(2.1rem,4.6vw,3.6rem)] uppercase leading-[1.08]">
          La Comunidad
          <br />
          <span className="d-gold-text">vuelve a reunirse</span>
        </h1>
        <p className="max-w-[52ch] text-(--faded) text-lg">
          {NEXT_EVENT.dates} · {NEXT_EVENT.venue}, donde se coronó la edición de
          2025. Cuatro días de Age of the Ring, juegos de mesa hasta las tantas
          y cuentas pendientes desde 2005.
        </p>
        <VenueCard />
      </div>
    </div>
    <svg
      aria-hidden="true"
      className="block w-full text-(--night-2)"
      fill="currentColor"
      preserveAspectRatio="none"
      viewBox="0 0 1440 90"
    >
      <path
        d="M0,90 L0,58 L160,72 L330,34 L520,64 L710,22 L890,60 L1060,38 L1240,68 L1440,44 L1440,90 Z"
        opacity="0.55"
      />
      <path d="M0,90 L0,70 L200,80 L400,52 L620,76 L840,44 L1040,72 L1250,58 L1440,78 L1440,90 Z" />
    </svg>
  </section>
);

export { Hero };
