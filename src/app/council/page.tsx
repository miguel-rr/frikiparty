import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { SiteShell } from '@/components/layout/site-shell';
import { DurinDoor } from '@/components/pifouds/durin-door';
import { linkGold, tag } from '@/components/theme/primitives';
import { formatDateRange } from '@/lib/dates';
import { siteFlags } from '@/lib/site-flags';
import { getNextEdition } from '@/server/api/routers/edition';
import { db } from '@/server/db';

export const metadata: Metadata = { title: 'El Pifouds — Frikiparty' };

// Built statically; which edition is next depends on today's date, so the
// page re-renders hourly (plus on-demand from venue edits).
export const revalidate = 3600;

/** "12 de noviembre" — the day the door opens. */
const formatOpeningDay = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
  });

const PifoudsPage = async () => {
  if (!siteFlags.pifoudsPage) {
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
          className="mx-auto flex w-full max-w-[1180px] flex-col gap-10 px-4 pt-4 pb-14 sm:px-6 sm:pt-5 sm:pb-16"
          id="pifouds"
        >
          <div className="flex flex-col items-center gap-8">
            <DurinDoor target={target} />
            {edition ? (
              <span className="font-bold font-mono text-(--gold) text-base uppercase tracking-[0.4em] sm:text-xl">
                Edición {edition.year}
              </span>
            ) : (
              <span className={tag}>El Pifouds · En espera</span>
            )}
            {edition?.startsAt ? (
              <div className="flex flex-col items-center gap-2 text-center">
                <p className="max-w-[46ch] text-(--faded)">
                  La puerta se abre al mediodía del{' '}
                  {formatOpeningDay(edition.startsAt)}. Contraseña:{' '}
                  <span className="font-bold text-(--silver) italic">
                    mellon
                  </span>{' '}
                  — o presentarse en{' '}
                  {edition.venueSlug && edition.venueIsPlace ? (
                    <Link
                      className="font-bold text-(--parchment) transition-colors hover:text-(--gold-hi)"
                      href={`/venues/${edition.venueSlug}`}
                    >
                      {edition.venueName}
                    </Link>
                  ) : (
                    <span className="font-bold">{edition.venueName}</span>
                  )}
                  .
                </p>
                {edition.endsAt ? (
                  <p className="font-bold font-mono text-(--faded) text-[0.68rem] uppercase tracking-[0.22em]">
                    {formatDateRange(edition.startsAt, edition.endsAt)}
                  </p>
                ) : null}
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

export default PifoudsPage;
