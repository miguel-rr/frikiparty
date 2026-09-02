import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { SiteShell } from '@/components/layout/site-shell';
import { MediaFigure } from '@/components/media/media-figure';
import { Section } from '@/components/theme/primitives';
import { getMediaItem } from '@/server/api/routers/media-queries';
import { getSession } from '@/server/better-auth/server';
import { db } from '@/server/db';
import { resolveArchiveAccess } from '@/server/media/access';

type PageProps = { params: Promise<{ id: string }> };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Reads the session (archive gate), so it renders on demand.
export const dynamic = 'force-dynamic';

/** Null unless the id is well-formed and the visitor may see the archive. */
const loadItem = async (id: string) => {
  if (!UUID.test(id)) {
    return null;
  }
  const session = await getSession();
  const access = await resolveArchiveAccess(db, session?.user);
  return access.allowed ? getMediaItem(db, id) : null;
};

export const generateMetadata = async ({
  params,
}: PageProps): Promise<Metadata> => {
  const { id } = await params;
  const item = await loadItem(id);
  return {
    title: `${item?.caption ?? 'Los Archivos'} — Frikiparty`,
    openGraph: item?.displayUrl ? { images: [item.displayUrl] } : undefined,
  };
};

/**
 * Shareable page for one file — shareable among members: anyone without
 * archive access gets the same 404 an unknown id would.
 */
const ArchiveItemPage = async ({ params }: PageProps) => {
  const { id } = await params;
  const item = await loadItem(id);
  if (!item) {
    notFound();
  }
  const back = item.edition
    ? { href: `/editions/${item.edition.slug}`, text: item.edition.label }
    : item.players[0]
      ? { href: `/players/${item.players[0].slug}`, text: item.players[0].name }
      : null;

  return (
    <SiteShell>
      <main>
        <Section id="archive-item">
          <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
            {back ? (
              <Link
                className="font-mono text-(--faded) text-[0.62rem] uppercase tracking-[0.18em] transition-colors hover:text-(--gold)"
                href={back.href}
              >
                ← {back.text}
              </Link>
            ) : null}
            <MediaFigure
              item={item}
              priority
              removedHref={back?.href ?? '/archive'}
            />
          </div>
        </Section>
      </main>
    </SiteShell>
  );
};

export default ArchiveItemPage;
