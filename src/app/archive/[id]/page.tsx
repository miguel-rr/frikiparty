import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { SiteShell } from '@/components/layout/site-shell';
import { MediaFigure } from '@/components/media/media-figure';
import { Section } from '@/components/theme/primitives';
import { getMediaItem } from '@/server/api/routers/media-queries';
import { db } from '@/server/db';

type PageProps = { params: Promise<{ id: string }> };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const generateMetadata = async ({
  params,
}: PageProps): Promise<Metadata> => {
  const { id } = await params;
  const item = UUID.test(id) ? await getMediaItem(db, id) : null;
  return {
    title: `${item?.caption ?? 'Los Archivos'} — Frikiparty`,
    openGraph: item?.displayUrl ? { images: [item.displayUrl] } : undefined,
  };
};

/**
 * Shareable page for one file. Rendered on demand (ids are unbounded) and
 * cached until media.update/remove revalidates it.
 */
const ArchiveItemPage = async ({ params }: PageProps) => {
  const { id } = await params;
  const item = UUID.test(id) ? await getMediaItem(db, id) : null;
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
