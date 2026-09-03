'use client';

import { useMemo, useState } from 'react';

import { useSessionUser } from '@/components/layout/auth-slot';
import {
  GalleryEmpty,
  GalleryToolbar,
} from '@/components/media/gallery-toolbar';
import { MediaGallery } from '@/components/media/media-gallery';
import { UploadSheet } from '@/components/media/upload-sheet';
import { RingGlyph } from '@/components/theme/primitives';
import {
  applyGalleryView,
  countByType,
  DEFAULT_VIEW,
  type GalleryView,
} from '@/lib/media/gallery-view';
import { api } from '@/trpc/react';

const label =
  'flex items-center gap-1.5 font-mono text-(--faded) text-2xs uppercase tracking-2xl';

/** Below this many files the toolbar would be noise. */
const TOOLBAR_FROM = 6;

type GalleryTarget =
  | { playerId: string }
  | { editionId: string }
  | { venueId: string };

/**
 * "Los Archivos" block that closes every entity page. The page itself is
 * built statically and knows nothing about who's looking: the block
 * resolves the session on the client and only then fetches the gallery,
 * so anonymous visitors get nothing — not even the heading. Venues are
 * read-only (photos reach them through their editions). The view (sort,
 * type, text) is local state here; /archive keeps it in the URL.
 */
const ArchiveSection = ({
  subject,
  target,
}: {
  /** "de Palons", "de la edición 2019", "de Las 7 encinas". */
  subject: string;
  target: GalleryTarget;
}) => {
  const { user } = useSessionUser();
  const access = api.media.access.useQuery(undefined, {
    enabled: user !== undefined,
  });
  const gallery = api.media.gallery.useQuery(target, {
    enabled: access.data?.allowed === true,
  });
  const [view, setView] = useState<GalleryView>(DEFAULT_VIEW);
  const items = useMemo(() => gallery.data ?? [], [gallery.data]);
  const visible = useMemo(() => applyGalleryView(items, view), [items, view]);
  const counts = useMemo(
    () => countByType(items, view.query),
    [items, view.query],
  );

  if (!access.data?.allowed) {
    return null;
  }
  const canUpload = !('venueId' in target);

  return (
    <div className="flex w-full flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className={label}>
          <RingGlyph size={13} /> Los Archivos
          {items.length > 0 ? (
            <span className="text-(--gold)">· {items.length}</span>
          ) : null}
        </span>
        {canUpload ? <UploadSheet target={target} /> : null}
      </div>
      {items.length >= TOOLBAR_FROM ? (
        <GalleryToolbar counts={counts} onChange={setView} view={view} />
      ) : null}
      {gallery.isPending ? (
        <p className="text-(--faded) text-sm italic">Abriendo Los Archivos…</p>
      ) : items.length === 0 ? (
        <p className="text-(--faded) text-sm italic">
          Aún no hay fotos ni vídeos {subject} en Los Archivos.
        </p>
      ) : visible.length === 0 ? (
        <GalleryEmpty onReset={() => setView(DEFAULT_VIEW)} />
      ) : (
        <MediaGallery items={visible} />
      )}
    </div>
  );
};

export { ArchiveSection };
