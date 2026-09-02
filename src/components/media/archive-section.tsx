import { MediaGallery } from '@/components/media/media-gallery';
import { UploadSheet } from '@/components/media/upload-sheet';
import { RingGlyph } from '@/components/theme/primitives';
import type { MediaItem } from '@/server/api/routers/media-queries';

const label =
  'flex items-center gap-1.5 font-mono text-(--faded) text-[0.62rem] uppercase tracking-[0.18em]';

/**
 * "Los Archivos" block that closes every entity page: the gallery of what
 * is tagged to it (derived server-side) and, for accounts allowed to
 * upload, the button that adds more. Without an upload target (venues)
 * the block is read-only.
 */
const ArchiveSection = ({
  items,
  subject,
  target,
}: {
  items: MediaItem[];
  /** "de Palons", "de la edición 2019", "de Las 7 encinas". */
  subject: string;
  target?: { playerId?: string; editionId?: string };
}) => (
  <div className="flex w-full flex-col gap-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <span className={label}>
        <RingGlyph size={13} /> Los Archivos
        {items.length > 0 ? (
          <span className="text-(--gold)">· {items.length}</span>
        ) : null}
      </span>
      {target ? <UploadSheet target={target} /> : null}
    </div>
    {items.length > 0 ? (
      <MediaGallery items={items} />
    ) : (
      <p className="text-(--faded) text-sm italic">
        Aún no hay fotos ni vídeos {subject} en Los Archivos.
      </p>
    )}
  </div>
);

export { ArchiveSection };
