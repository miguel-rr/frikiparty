import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { SiteShell } from '@/components/layout/site-shell';
import {
  panel,
  Section,
  SectionHeader,
  tag,
} from '@/components/theme/primitives';
import { siteFlags } from '@/lib/site-flags';
import { api } from '@/trpc/server';

export const metadata: Metadata = {
  title: 'Sedes — Frikiparty',
  // Reachable by URL only: not linked from the nav, not for search engines.
  robots: { index: false, follow: false },
};

const editionsCount = (count: number) =>
  count === 1 ? '1 edición' : `${count} ediciones`;

const VenuesPage = async () => {
  if (!siteFlags.venuesPage) {
    notFound();
  }
  const venues = await api.venue.list();

  return (
    <SiteShell>
      <main>
        <Section id="venues">
          <SectionHeader
            eyebrowText="Índice"
            lead="Todas las casas y lugares que han acogido al concilio. Las etiquetas que no son una casa real quedan sin ficha."
            title="Las sedes"
          />
          <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {venues.map((venue) => {
              const body = (
                <>
                  {venue.photoUrl ? (
                    // biome-ignore lint/performance/noImgElement: remote host not allow-listed in next.config for next/image
                    <img
                      alt={`Fotografía de ${venue.name}`}
                      className="h-36 w-full object-cover"
                      src={venue.photoUrl}
                    />
                  ) : null}
                  <div className="flex flex-col gap-2 p-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold font-mono text-(--faded) text-[0.62rem] uppercase tracking-[0.22em]">
                        {editionsCount(venue.editions.length)}
                      </span>
                      {venue.isPlace ? null : (
                        <span className={tag}>No es una sede</span>
                      )}
                    </div>
                    <span
                      className={`d-display font-bold text-xl tracking-wide ${
                        venue.isPlace ? 'd-gold-text' : 'text-(--faded)'
                      }`}
                    >
                      {venue.name}
                    </span>
                    <span className="text-(--faded) text-sm">
                      {venue.editions
                        .map((edition) => edition.label)
                        .join(' · ')}
                    </span>
                  </div>
                </>
              );
              return (
                <li key={venue.id}>
                  {venue.isPlace ? (
                    <Link
                      className={`${panel} block overflow-hidden transition-shadow hover:shadow-[0_0_24px_rgba(201,165,87,0.2)]`}
                      href={`/venues/${venue.slug}`}
                    >
                      {body}
                    </Link>
                  ) : (
                    <div className={`${panel} overflow-hidden opacity-70`}>
                      {body}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </Section>
      </main>
    </SiteShell>
  );
};

export default VenuesPage;
