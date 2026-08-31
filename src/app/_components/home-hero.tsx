import { tag } from '@/components/theme/primitives';
import { TheRing } from '@/components/theme/ring';
import { formatDateRange, formatShortDateRange } from '@/lib/dates';

type NextEdition = {
  year: number;
  startsAt: string | null;
  endsAt: string | null;
  venueName: string | null;
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

/** Venue card: photo + tinted map, one big link to Google Maps. */
const VenueCard = ({ edition }: { edition: NextEdition }) => {
  const mapSrc = edition.venueMapsEmbedQuery
    ? `https://maps.google.com/maps?q=${encodeURIComponent(edition.venueMapsEmbedQuery)}&z=13&output=embed`
    : null;
  const body = (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2">
        {edition.venuePhotoUrl ? (
          // biome-ignore lint/performance/noImgElement: remote host not allow-listed in next.config for next/image yet
          <img
            alt={`Fotografía de ${edition.venueName ?? 'la sede'}`}
            className="h-40 w-full object-cover sm:h-52"
            src={edition.venuePhotoUrl}
          />
        ) : (
          <div className="flex h-40 w-full flex-col items-center justify-center gap-2 bg-[radial-gradient(circle_at_50%_35%,#22301f,var(--night-2)_80%)] sm:h-52">
            <span className="font-mono text-(--faded) text-[0.58rem] uppercase tracking-[0.2em]">
              Foto de la sede
            </span>
          </div>
        )}
        {mapSrc ? (
          <iframe
            className="pointer-events-none h-44 w-full border-0 opacity-90 contrast-[0.92] grayscale-[0.4] sepia-[0.25] sm:h-52"
            loading="lazy"
            src={mapSrc}
            tabIndex={-1}
            title={`Mapa de ${edition.venueName ?? 'la sede'}`}
          />
        ) : null}
      </div>
      <div className="flex items-center justify-between gap-3 border-(--hair-gold) border-t bg-(--panel) px-4 py-3">
        <span className="font-bold text-sm leading-snug">
          <span className="font-mono text-(--gold) text-[0.58rem] uppercase tracking-[0.22em]">
            Sede:{' '}
          </span>
          {edition.venueName}
        </span>
        {edition.venueMapsUrl ? (
          <span className="whitespace-nowrap font-bold text-(--gold) text-sm transition-colors group-hover:text-(--gold-hi)">
            Cómo llegar →
          </span>
        ) : null}
      </div>
    </>
  );
  const frame =
    'group relative block w-full max-w-2xl overflow-hidden rounded-xl border border-(--hair-gold) shadow-[0_12px_30px_rgba(0,0,0,0.4)]';
  if (!edition.venueMapsUrl) {
    return <div className={frame}>{body}</div>;
  }
  return (
    <a
      aria-label={`Cómo llegar a ${edition.venueName ?? 'la sede'} (Google Maps)`}
      className={`${frame} transition-shadow hover:shadow-[0_0_24px_rgba(201,165,87,0.25)]`}
      href={edition.venueMapsUrl}
      rel="noreferrer"
      target="_blank"
    >
      {body}
    </a>
  );
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
      <div className="mx-auto flex max-w-[880px] flex-col items-center gap-12 px-4 pt-14 pb-24 sm:px-6 lg:gap-7 lg:pt-8">
        <TheRing
          className="w-[min(80vw,440px)] lg:w-105"
          title={`Edición ${edition.year}`}
        >
          <span className="font-bold font-mono text-(--gold) text-[1.15rem] uppercase tracking-[0.35em] lg:text-[1.3rem]">
            Edición
          </span>
          <span className="d-display d-gold-text font-black text-7xl lg:text-8xl">
            {edition.year}
          </span>
          {hasDates ? (
            <span className="font-bold font-mono text-(--faded) text-[0.62rem] uppercase tracking-[0.25em] lg:text-[0.7rem]">
              {formatShortDateRange(
                edition.startsAt as string,
                edition.endsAt as string,
              )}
            </span>
          ) : null}
          {!live && remaining !== null && remaining > 0 ? (
            <span className="font-bold font-mono text-(--gold) text-[0.58rem] uppercase tracking-[0.25em] lg:text-[0.64rem]">
              Faltan {remaining} días
            </span>
          ) : null}
        </TheRing>
        <div className="flex flex-col items-center gap-7 text-center lg:gap-5">
          <span className={tag}>
            {live
              ? `La edición ${edition.year} está en juego`
              : `Concilio anual · Edición ${edition.year}`}
          </span>
          <h1 className="d-display font-black text-[clamp(2.1rem,4.6vw,3.6rem)] uppercase leading-[1.08]">
            La Comunidad
            <br />
            <span className="d-gold-text">vuelve a reunirse</span>
          </h1>
          <p className="max-w-[52ch] text-(--faded) text-lg">
            {hasDates
              ? `${formatDateRange(edition.startsAt as string, edition.endsAt as string)} · `
              : null}
            {edition.venueName}. Age of the Ring, juegos de mesa hasta las
            tantas y cuentas pendientes desde 2005.
          </p>
          <div className="mt-5 flex w-full justify-center lg:mt-7">
            <VenueCard edition={edition} />
          </div>
        </div>
      </div>
      <HeroRidge />
    </section>
  );
};

/** Resting state: no upcoming edition announced — the beacons are unlit. */
const HomeAwaitingHero = () => (
  <section className="relative overflow-hidden" id="top">
    <div className="mx-auto flex max-w-[880px] flex-col items-center gap-12 px-4 pt-14 pb-24 sm:px-6 lg:gap-7 lg:pt-8">
      <TheRing
        className="w-[min(80vw,440px)] opacity-90 lg:w-105"
        title="Próxima edición por convocar"
        tone="ash"
      >
        <span className="font-bold font-mono text-(--gold) text-[0.72rem] uppercase tracking-[0.3em] lg:text-[0.8rem]">
          Próxima edición
        </span>
        <span className="d-display font-black text-(--silver) text-[1.35rem] uppercase tracking-wide sm:text-2xl lg:text-3xl">
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
