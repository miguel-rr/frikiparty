'use client';

import Link from 'next/link';
import { useState } from 'react';

import { MediaGallery, PlayGlyph } from '@/components/media/media-gallery';
import { panelGold, td, th } from '@/components/theme/primitives';
import type { MediaItem } from '@/server/api/routers/media-queries';

const formatSize = (bytes: number | null) =>
  bytes === null
    ? '—'
    : bytes >= 1024 * 1024
      ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
      : `${Math.max(1, Math.round(bytes / 1024))} KB`;

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  });

const cellLink =
  'text-(--faded) transition-colors hover:text-(--gold-hi) hover:underline';

const toggle = (active: boolean) =>
  `cursor-pointer rounded-full px-3.5 py-1 font-mono text-[0.62rem] font-bold uppercase tracking-[0.18em] transition-colors ${
    active
      ? 'bg-[#c9a55726] text-(--gold-hi)'
      : 'text-(--faded) hover:text-(--parchment)'
  }`;

/**
 * Gallery of everything, and for admins a table view that shows the
 * catalogue at a glance: thumbnail, title, who, when, how heavy. Each row
 * links to the file's page, where it can be edited or removed.
 */
const ArchiveBrowser = ({
  isAdmin,
  items,
}: {
  isAdmin: boolean;
  items: MediaItem[];
}) => {
  const [view, setView] = useState<'gallery' | 'table'>('gallery');

  if (items.length === 0) {
    return null;
  }
  return (
    <div className="flex flex-col gap-5">
      {isAdmin ? (
        <div className="flex justify-end">
          <div className="inline-flex rounded-full border border-(--hair) p-0.5">
            <button
              className={toggle(view === 'gallery')}
              onClick={() => setView('gallery')}
              type="button"
            >
              Galería
            </button>
            <button
              className={toggle(view === 'table')}
              onClick={() => setView('table')}
              type="button"
            >
              Tabla
            </button>
          </div>
        </div>
      ) : null}
      {view === 'table' ? (
        <div className={`${panelGold} overflow-x-auto`}>
          <table className="w-full min-w-[52rem] border-collapse text-sm">
            <thead>
              <tr>
                <th className={th}> </th>
                <th className={th}>Título</th>
                <th className={th}>Tipo</th>
                <th className={th}>Jugadores</th>
                <th className={th}>Edición</th>
                <th className={th}>Subido por</th>
                <th className={th}>Fecha</th>
                <th className={th}>Peso</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr className="hover:bg-[#c9a5570a]" key={item.id}>
                  <td className={`${td} w-16`}>
                    <Link
                      className="relative block size-12 overflow-hidden rounded-md border border-(--hair) bg-(--night)"
                      href={`/archive/${item.id}`}
                    >
                      {item.thumbnailUrl ? (
                        // biome-ignore lint/performance/noImgElement: R2 host is not in next.config remotePatterns
                        <img
                          alt=""
                          className="size-full object-cover"
                          loading="lazy"
                          src={item.thumbnailUrl}
                        />
                      ) : null}
                      {item.type === 'video' ? (
                        <span className="pointer-events-none absolute inset-0 grid place-items-center">
                          <PlayGlyph size="size-5" />
                        </span>
                      ) : null}
                    </Link>
                  </td>
                  <td className={td}>
                    <Link
                      className="font-bold text-(--parchment) transition-colors hover:text-(--gold-hi)"
                      href={`/archive/${item.id}`}
                    >
                      {item.caption ?? (
                        <span className="font-normal text-(--faded) italic">
                          Sin título
                        </span>
                      )}
                    </Link>
                  </td>
                  <td className={`${td} font-mono text-(--faded) text-xs`}>
                    {item.type === 'video' ? 'Vídeo' : 'Foto'}
                    {item.width && item.height
                      ? ` · ${item.width}×${item.height}`
                      : ''}
                  </td>
                  <td className={`${td} text-(--faded) text-xs`}>
                    {item.players.map((p, index) => (
                      <span key={p.id}>
                        {index > 0 ? ', ' : null}
                        <Link className={cellLink} href={`/players/${p.slug}`}>
                          {p.name}
                        </Link>
                      </span>
                    ))}
                  </td>
                  <td className={`${td} text-(--faded) text-xs`}>
                    {item.edition ? (
                      <Link
                        className={cellLink}
                        href={`/editions/${item.edition.slug}`}
                      >
                        {item.edition.label}
                      </Link>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className={`${td} text-(--faded) text-xs`}>
                    {item.uploaderName ?? '—'}
                  </td>
                  <td className={`${td} font-mono text-(--faded) text-xs`}>
                    {formatDate(item.createdAt)}
                  </td>
                  <td className={`${td} font-mono text-(--faded) text-xs`}>
                    {formatSize(item.fileSize)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <MediaGallery items={items} />
      )}
    </div>
  );
};

export { ArchiveBrowser };
