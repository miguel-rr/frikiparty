'use client';

import { useSessionUser } from '@/components/layout/auth-slot';
import { MediaGallery } from '@/components/media/media-gallery';
import { UploadSheet } from '@/components/media/upload-sheet';
import { RingGlyph } from '@/components/theme/primitives';
import { api } from '@/trpc/react';

const label =
  'flex items-center gap-1.5 font-mono text-(--faded) text-[0.62rem] uppercase tracking-[0.18em]';

type GalleryTarget =
  | { playerId: string }
  | { editionId: string }
  | { venueId: string };

/**
 * "Los Archivos" block that closes every entity page. The page itself is
 * built statically and knows nothing about who's looking: the block
 * resolves the session on the client and only then fetches the gallery,
 * so anonymous visitors get nothing — not even the heading. Venues are
 * read-only (photos reach them through their editions).
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

  if (!access.data?.allowed) {
    return null;
  }
  const items = gallery.data ?? [];
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
      {gallery.isPending ? (
        <p className="text-(--faded) text-sm italic">Abriendo Los Archivos…</p>
      ) : items.length > 0 ? (
        <MediaGallery items={items} />
      ) : (
        <p className="text-(--faded) text-sm italic">
          Aún no hay fotos ni vídeos {subject} en Los Archivos.
        </p>
      )}
    </div>
  );
};

export { ArchiveSection };
