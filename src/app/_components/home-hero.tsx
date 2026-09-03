import Link from 'next/link';

import { linkGold, pageWidth, tag } from '@/components/theme/primitives';
import { TheRing } from '@/components/theme/ring';
import { formatDateRange, formatShortDateRange } from '@/lib/dates';

type NextEdition = {
  year: number;
  startsAt: string | null;
  endsAt: string | null;
  venueName: string | null;
  venueSlug: string | null;
  venueIsPlace: boolean | null;
  venueMapsUrl: string | null;
  venuePhotoUrl: string | null;
  venueMapsEmbedQuery: string | null;
};

const DAY_MS = 24 * 60 * 60 * 1000;

const daysUntil = (iso: string) => {
  const target = new Date(`${iso}T00:00:00`);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target.getTime() - today.getTime()) / DAY_MS);
};

/** Hero for an announced (or running) edition. */
const HomeHero = ({ edition }: { edition: NextEdition }) => {
  const hasDates = edition.startsAt !== null && edition.endsAt !== null;
  const today = new Date().toISOString().slice(0, 10);
  const live =
    hasDates &&
    (edition.startsAt as string) <= today &&
    today <= (edition.endsAt as string);
  const remaining = hasDates ? daysUntil(edition.startsAt as string) : null;
  return (
    <section className="relative overflow-hidden" id="top">
      <div
        className={`${pageWidth} flex flex-col items-center gap-12 pt-14 pb-12 lg:gap-7 lg:pt-8 lg:pb-14`}
      >
        <TheRing
          className="w-[min(80vw,440px)] lg:w-105"
          title={`Edición ${edition.year}`}
        >
          <span className="font-bold font-mono text-(--gold) text-lg uppercase tracking-5xl lg:text-xl">
            Edición
          </span>
          <span className="d-display d-gold-text font-black text-7xl lg:text-8xl">
            {edition.year}
          </span>
          {hasDates ? (
            <span className="font-bold font-mono text-(--faded) text-2xs uppercase tracking-3xl lg:text-xs">
              {formatShortDateRange(
                edition.startsAt as string,
                edition.endsAt as string,
              )}
            </span>
          ) : null}
          {!live && remaining !== null && remaining > 0 ? (
            <span className="font-bold font-mono text-(--gold) text-3xs uppercase tracking-3xl lg:text-2xs">
              Faltan {remaining} días
            </span>
          ) : null}
        </TheRing>
        <div className="flex flex-col items-center gap-7 text-center lg:gap-5">
          <Link
            className={`${tag} transition-colors hover:border-(--gold) hover:text-(--gold-hi)`}
            href="/council"
          >
            {live
              ? `La edición ${edition.year} está en juego`
              : `Concilio anual · Edición ${edition.year}`}
          </Link>
          <h1 className="d-display font-black text-[clamp(2.1rem,4.6vw,3.6rem)] uppercase leading-[1.08]">
            La Comunidad
            <br />
            <span className="d-gold-text">vuelve a reunirse</span>
          </h1>
          <p className="max-w-[52ch] text-(--faded) text-lg">
            {hasDates
              ? `${formatDateRange(edition.startsAt as string, edition.endsAt as string)} · `
              : null}
            {edition.venueSlug && edition.venueIsPlace ? (
              <Link
                className="text-(--parchment) transition-colors hover:text-(--gold-hi)"
                href={`/venues/${edition.venueSlug}`}
              >
                {edition.venueName}
              </Link>
            ) : (
              edition.venueName
            )}
            . Age of the Ring, juegos de mesa hasta las tantas y cuentas
            pendientes desde 2005.
          </p>
          {edition.venueMapsUrl ? (
            <a
              className={linkGold}
              href={edition.venueMapsUrl}
              rel="noreferrer"
              target="_blank"
            >
              Cómo llegar →
            </a>
          ) : null}
        </div>
      </div>
      <HeroRidge />
    </section>
  );
};

/** Resting state: no upcoming edition announced — the beacons are unlit. */
const HomeAwaitingHero = () => (
  <section className="relative overflow-hidden" id="top">
    <div
      className={`${pageWidth} flex flex-col items-center gap-12 pt-14 pb-24 lg:gap-7 lg:pt-8`}
    >
      <TheRing
        className="w-[min(80vw,440px)] opacity-90 lg:w-105"
        title="Próxima edición por convocar"
        tone="ash"
      >
        <span className="font-bold font-mono text-(--gold) text-xs uppercase tracking-4xl lg:text-xs">
          Próxima edición
        </span>
        <span className="d-display font-black text-(--silver) text-xl uppercase tracking-wide sm:text-2xl lg:text-3xl">
          Por convocar
        </span>
      </TheRing>
      <div className="flex flex-col items-center gap-7 text-center lg:gap-5">
        <span className={tag}>El concilio aún no se ha reunido</span>
        <h1 className="d-display font-black text-[clamp(2.1rem,4.6vw,3.6rem)] uppercase leading-[1.08]">
          Las almenaras
          <br />
          <span className="d-gold-text">están apagadas</span>
        </h1>
        <p className="max-w-[52ch] text-(--faded) text-lg">
          Todavía no hay convocatoria para la próxima edición. Cuando las
          almenaras se enciendan, lo sabréis los primeros — mantened las espadas
          afiladas.
        </p>
      </div>
    </div>
    <HeroRidge />
  </section>
);

/** Mountain silhouette closing the hero. */
const HeroRidge = () => (
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
);

export { HomeAwaitingHero, HomeHero };
