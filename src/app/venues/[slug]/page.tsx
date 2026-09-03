import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { VenueEditor } from '@/app/venues/[slug]/_components/venue-editor';
import { EditionsView } from '@/components/editions/editions-view';
import { SiteShell } from '@/components/layout/site-shell';
import { ArchiveSection } from '@/components/media/archive-section';
import {
  linkGold,
  panelGold,
  RingGlyph,
  Section,
  tag,
} from '@/components/theme/primitives';
import { siteFlags } from '@/lib/site-flags';
import { sceneForIndex, sceneStyle } from '@/lib/tournament/edition-scenes';
import { buildEditionViews } from '@/lib/tournament/edition-view';
import { listEditions } from '@/server/api/routers/edition';
import { getHistoricalRanking } from '@/server/api/routers/player';
import { getVenue } from '@/server/api/routers/venue';
import { db } from '@/server/db';
import { venue as venueTable } from '@/server/db/schema';

type PageProps = { params: Promise<{ slug: string }> };

/**
 * Few venues, rarely edited: build every page up front and refresh via
 * revalidatePath from venue.update. New slugs still render on demand.
 */
export const generateStaticParams = async () => {
  const rows = await db
    .select({ slug: venueTable.slug, isPlace: venueTable.isPlace })
    .from(venueTable);
  return rows.filter((row) => row.isPlace).map(({ slug }) => ({ slug }));
};

export const generateMetadata = async ({
  params,
}: PageProps): Promise<Metadata> => {
  const { slug } = await params;
  const found = await getVenue(db, slug);
  return { title: `${found?.name ?? 'Sede'} — Frikiparty` };
};

const label =
  'flex items-center gap-1.5 font-mono text-(--faded) text-2xs uppercase tracking-2xl';

const editionsCount = (count: number) =>
  count === 1 ? '1 edición' : `${count} ediciones`;

const VenuePage = async ({ params }: PageProps) => {
  if (!siteFlags.venuesPage) {
    notFound();
  }
  const { slug } = await params;
  const venue = await getVenue(db, slug);
  if (!venue) {
    notFound();
  }
  // The chronicle's own deck, filtered to this house: views are built
  // from the full list first so each card keeps the scene it wears on
  // /editions (scenes go by position in the whole timeline).
  const [allEditions, players] = await Promise.all([
    listEditions(db),
    getHistoricalRanking(db),
  ]);
  const editions = buildEditionViews(allEditions, players).filter(
    (edition) => edition.venueSlug === venue.slug,
  );

  const mapSrc = venue.mapsEmbedQuery
    ? `https://maps.google.com/maps?q=${encodeURIComponent(venue.mapsEmbedQuery)}&z=13&output=embed`
    : null;
  // With no photo the cover borrows the painted scene of the latest edition
  // held here, so the house still gets a face.
  const coverScene = sceneForIndex(venue.editions[0]?.sceneIndex ?? 0);
  const twoUp = Boolean(venue.photoUrl) && Boolean(mapSrc);

  return (
    <SiteShell>
      <main>
        <Section id="venue">
          <div className={`${panelGold} flex flex-col overflow-hidden`}>
            <div
              className={`grid grid-cols-1 ${twoUp ? 'sm:grid-cols-2' : ''}`}
            >
              {venue.photoUrl ? (
                // biome-ignore lint/performance/noImgElement: remote host not allow-listed in next.config for next/image
                <img
                  alt={`Fotografía de ${venue.name}`}
                  className="h-56 w-full object-cover sm:h-72"
                  src={venue.photoUrl}
                />
              ) : (
                <div
                  className="flex h-56 w-full items-end px-6 pb-5 sm:h-72"
                  style={sceneStyle(coverScene)}
                >
                  <span className="font-mono text-(--faded) text-2xs uppercase tracking-2xl drop-shadow-[0_1px_6px_rgba(0,0,0,0.9)]">
                    {coverScene.alt}
                  </span>
                </div>
              )}
              {mapSrc ? (
                <iframe
                  className="pointer-events-none h-56 w-full border-0 opacity-90 contrast-92 grayscale-40 sepia-25 sm:h-72"
                  loading="lazy"
                  src={mapSrc}
                  tabIndex={-1}
                  title={`Mapa de ${venue.name}`}
                />
              ) : null}
            </div>
            <div className="flex flex-col gap-4 border-(--hair-gold) border-t px-6 py-6 sm:flex-row sm:items-end sm:justify-between sm:px-8">
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  <span className={tag}>Sede</span>
                  <span className="font-bold font-mono text-(--faded) text-2xs uppercase tracking-2xl">
                    {editionsCount(venue.editions.length)}
                  </span>
                </div>
                <h1 className="d-display d-gold-text font-black text-4xl tracking-wide sm:text-5xl">
                  {venue.name}
                </h1>
                {venue.editions.length > 0 ? (
                  <ul className="flex flex-wrap gap-x-4 gap-y-1">
                    {venue.editions.map((edition) => (
                      <li key={edition.id}>
                        <Link
                          className="font-bold text-(--parchment) text-sm transition-colors hover:text-(--gold-hi)"
                          href={`/editions/${edition.slug}`}
                        >
                          {edition.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
              {venue.mapsUrl ? (
                <a
                  className={`${linkGold} shrink-0`}
                  href={venue.mapsUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  Cómo llegar →
                </a>
              ) : null}
            </div>
          </div>

          <VenueEditor venue={venue} />

          {venue.description ? (
            <p className="mx-auto max-w-[62ch] whitespace-pre-line text-center text-(--parchment) leading-relaxed">
              {venue.description}
            </p>
          ) : null}

          {editions.length > 0 ? (
            <div className="flex flex-col gap-5">
              <span className={label}>
                <RingGlyph size={13} /> Las ediciones en esta casa
              </span>
              <EditionsView
                editions={editions}
                showVenue={false}
                toggleAlign="start"
              />
            </div>
          ) : (
            <p className="text-center text-(--faded) text-sm italic">
              Ninguna edición se ha celebrado aquí todavía.
            </p>
          )}
          <ArchiveSection
            subject={`de ${venue.name}`}
            target={{ venueId: venue.id }}
          />
        </Section>
      </main>
    </SiteShell>
  );
};

export default VenuePage;
