import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { SiteShell } from '@/components/layout/site-shell';
import { ArrowKeyNav } from '@/components/media/arrow-key-nav';
import { MediaFigure } from '@/components/media/media-figure';
import { Section } from '@/components/theme/primitives';
import {
  archiveHref,
  archiveItemHref,
  readArchiveContext,
} from '@/lib/media/archive-links';
import { applyGalleryView } from '@/lib/media/gallery-view';
import { siteFlags } from '@/lib/site-flags';
import { getMediaItem, listAllMedia } from '@/server/api/routers/media-queries';
import { getSession } from '@/server/better-auth/server';
import { db } from '@/server/db';
import { resolveArchiveAccess } from '@/server/media/access';

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Reads the session (archive gate), so it renders on demand.
export const dynamic = 'force-dynamic';

/** Null item unless the id is well-formed and the visitor may see the archive. */
const loadItem = async (id: string) => {
  const session = await getSession();
  const access = await resolveArchiveAccess(db, session?.user);
  const item =
    UUID.test(id) && access.allowed
      ? await getMediaItem(db, id, session?.user.id ?? null)
      : null;
  return { item, access, viewerId: session?.user.id ?? null };
};

export const generateMetadata = async ({
  params,
}: PageProps): Promise<Metadata> => {
  const { id } = await params;
  const { item } = await loadItem(id);
  return {
    title: `${item?.caption ?? 'Los Archivos'} — Frikiparty`,
    openGraph: item?.displayUrl ? { images: [item.displayUrl] } : undefined,
  };
};

const navLink =
  'inline-flex items-center gap-1.5 rounded-full border border-(--hair) px-3 py-1.5 font-mono text-(--faded) text-2xs uppercase tracking-2xl transition-colors hover:border-(--hair-gold) hover:text-(--gold-hi)';

const navLinkOff =
  'inline-flex items-center gap-1.5 rounded-full border border-(--hair) px-3 py-1.5 font-mono text-2xs text-(--faded)/55 uppercase tracking-2xl';

/**
 * Shareable page for one file — shareable among members: anyone without
 * archive access gets the same 404 an unknown id would. Opened from the
 * list (`from=archive`) it also walks the list in its order: previous,
 * next, back, also with ← and → — and `edit=1` lands straight in the
 * editor, returning to the list on save.
 */
const ArchiveItemPage = async ({ params, searchParams }: PageProps) => {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const { item, access, viewerId } = await loadItem(id);
  if (!item) {
    notFound();
  }

  // The list is admin-only until the flag opens it; the walk follows suit.
  const listAllowed = access.isAdmin || siteFlags.archiveForMembers;
  const trip = listAllowed ? readArchiveContext(query) : null;
  let walk: {
    back: string;
    prev: string | null;
    next: string | null;
    position: number;
    total: number;
  } | null = null;
  if (trip) {
    const visible = applyGalleryView(
      await listAllMedia(db, viewerId),
      trip.context.view,
    );
    const index = visible.findIndex((entry) => entry.id === item.id);
    const href = (entry: { id: string } | undefined) =>
      entry
        ? archiveItemHref(entry.id, trip.context, { edit: trip.edit })
        : null;
    walk = {
      back: archiveHref(trip.context),
      prev: index > 0 ? href(visible[index - 1]) : null,
      next: index >= 0 ? href(visible[index + 1]) : null,
      position: index + 1,
      total: visible.length,
    };
  }

  // Where a delete leaves the visitor: the list it came from, else the
  // edition, else the first player.
  const removedHref =
    walk?.back ??
    (item.edition
      ? `/editions/${item.edition.slug}`
      : item.players[0]
        ? `/players/${item.players[0].slug}`
        : '/archive');

  return (
    <SiteShell>
      <main>
        <Section id="archive-item">
          <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
            {walk ? <ArrowKeyNav next={walk.next} prev={walk.prev} /> : null}
            {walk ? (
              <nav
                aria-label="Recorrer Los Archivos"
                className="flex flex-wrap items-center justify-between gap-2"
              >
                {walk.prev ? (
                  <Link className={navLink} href={walk.prev}>
                    ‹ Anterior
                  </Link>
                ) : (
                  <span className={navLinkOff}>‹ Anterior</span>
                )}
                <Link className={navLink} href={walk.back}>
                  {walk.position > 0
                    ? `${walk.position} / ${walk.total} · `
                    : ''}
                  Volver a Los Archivos
                </Link>
                {walk.next ? (
                  <Link className={navLink} href={walk.next}>
                    Siguiente ›
                  </Link>
                ) : (
                  <span className={navLinkOff}>Siguiente ›</span>
                )}
              </nav>
            ) : null}
            <MediaFigure
              doneHref={walk && trip?.edit ? walk.back : undefined}
              editing={trip?.edit ?? false}
              item={item}
              key={item.id}
              priority
              removedHref={removedHref}
            />
          </div>
        </Section>
      </main>
    </SiteShell>
  );
};

export default ArchiveItemPage;
