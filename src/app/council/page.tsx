import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { DurinDoor } from '@/components/council/durin-door';
import { SiteShell } from '@/components/layout/site-shell';
import { pageWidth, tag } from '@/components/theme/primitives';
import { VenueShowcase } from '@/components/venue/venue-showcase';
import { formatDateRange } from '@/lib/dates';
import { siteFlags } from '@/lib/site-flags';
import { getNextEdition } from '@/server/api/routers/edition';
import { db } from '@/server/db';

export const metadata: Metadata = { title: 'El Concilio — Frikiparty' };

// Built statically; which edition is next depends on today's date, so the
// page re-renders hourly (plus on-demand from venue edits).
export const revalidate = 3600;

/** "12 de noviembre" — the day the door opens. */
const formatOpeningDay = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
  });

const CouncilPage = async () => {
  if (!siteFlags.councilPage) {
    notFound();
  }
  const edition = await getNextEdition(db);
  // The fire is lit at noon of day one.
  const target = edition?.startsAt ? `${edition.startsAt}T12:00:00` : null;

  return (
    <SiteShell>
      <main>
        {/* Shared Section metrics, minus most of the top padding: the door
            should hang right under the nav. */}
        <section
          className={`${pageWidth} flex flex-col gap-10 pt-4 pb-14 sm:pt-5 sm:pb-16`}
          id="council"
        >
          <div className="flex flex-col items-center gap-8">
            <DurinDoor target={target} />
            {edition?.startsAt && edition.endsAt ? (
              <span className="d-display -mt-3 text-(--silver) text-xl uppercase tracking-[0.24em] [text-shadow:0_0_14px_rgba(190,205,220,0.35)] sm:-mt-4 sm:text-2xl">
                {formatDateRange(edition.startsAt, edition.endsAt)}
              </span>
            ) : null}
            {edition ? (
              <span className="font-bold font-mono text-(--gold) text-base uppercase tracking-[0.4em] sm:text-xl">
                Edición {edition.year}
              </span>
            ) : (
              <span className={tag}>El Concilio · En espera</span>
            )}
            {edition?.startsAt ? (
              <div className="flex flex-col items-center gap-2 text-center">
                <p className="max-w-[46ch] text-(--faded)">
                  La puerta se abre al mediodía del{' '}
                  {formatOpeningDay(edition.startsAt)}.
                </p>
                <p className="font-bold text-lg">
                  <span className="text-(--parchment)">Contraseña:</span>{' '}
                  <span className="text-(--silver) italic">mellon</span>
                </p>
                {edition.venueName ? (
                  <div className="mt-6 w-full max-w-2xl text-left">
                    <VenueShowcase
                      isPlace={edition.venueIsPlace}
                      mapsEmbedQuery={edition.venueMapsEmbedQuery}
                      mapsUrl={edition.venueMapsUrl}
                      name={edition.venueName}
                      photoUrl={edition.venuePhotoUrl}
                      slug={edition.venueSlug}
                    />
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="max-w-[46ch] text-center text-(--faded)">
                El concilio aún no ha convocado la próxima reunión. Cuando las
                estrellas marquen fecha, la cuenta atrás comenzará aquí.
              </p>
            )}
          </div>
        </section>
      </main>
    </SiteShell>
  );
};

export default CouncilPage;
