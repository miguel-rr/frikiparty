'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import {
  GalleryEmpty,
  GalleryToolbar,
  group,
  segment,
} from '@/components/media/gallery-toolbar';
import {
  DocumentGlyph,
  MediaGallery,
  PlayGlyph,
} from '@/components/media/media-gallery';
import { panelGold, td, th } from '@/components/theme/primitives';
import { archiveItemHref } from '@/lib/media/archive-links';
import { documentLabel, formatFileSize } from '@/lib/media/documents';
import {
  applyGalleryView,
  countByType,
  DEFAULT_VIEW,
  type GalleryView,
  paramsFromView,
  viewFromParams,
} from '@/lib/media/gallery-view';
import type { MediaItem } from '@/server/api/routers/media-queries';

const cellLink =
  'text-(--faded) transition-colors hover:text-(--gold-hi) hover:underline';

type Mode = 'gallery' | 'table';

/**
 * The view lives in the URL (?sort=&type=&q=&view=) so a filtered archive
 * can be shared and survives a refresh or a trip into a file's page. Read
 * once on mount, written back with replaceState so typing never reloads
 * the page. Defaults stay out of the address.
 */
const useUrlView = () => {
  const params = useSearchParams();
  const [view, setView] = useState<GalleryView>(() =>
    viewFromParams({
      sort: params.get('sort') ?? undefined,
      type: params.get('type') ?? undefined,
      q: params.get('q') ?? undefined,
    }),
  );
  const [mode, setMode] = useState<Mode>(() =>
    params.get('view') === 'table' ? 'table' : 'gallery',
  );
  useEffect(() => {
    const search = paramsFromView(view);
    if (mode === 'table') {
      search.set('view', 'table');
    }
    const query = search.toString();
    const url = `${window.location.pathname}${query ? `?${query}` : ''}`;
    if (url !== `${window.location.pathname}${window.location.search}`) {
      window.history.replaceState(window.history.state, '', url);
    }
  }, [view, mode]);
  return { view, setView, mode, setMode };
};

/**
 * Gallery of everything, and a table view that shows the catalogue at a
 * glance: thumbnail, title, who, likes, comments. Both views show the
 * same sorted and filtered list. A row's Editar leads to the file's
 * page, and only shows where the visitor may edit: their own uploads,
 * or everything for a moderator.
 */
const ArchiveBrowser = ({
  canModerate,
  items,
  viewerId,
}: {
  canModerate: boolean;
  items: MediaItem[];
  viewerId: string | null;
}) => {
  const { view, setView, mode, setMode } = useUrlView();
  const visible = useMemo(() => applyGalleryView(items, view), [items, view]);
  const counts = useMemo(
    () => countByType(items, view.query),
    [items, view.query],
  );
  // Rows carry the view along so the file page can walk the list and come back.
  const context = { view, table: mode === 'table' };

  if (items.length === 0) {
    return null;
  }
  return (
    <div className="flex flex-col gap-5">
      <GalleryToolbar
        counts={counts}
        onChange={setView}
        trailing={
          <fieldset className={group}>
            <legend className="sr-only">Vista</legend>
            <button
              aria-pressed={mode === 'gallery'}
              className={segment(mode === 'gallery')}
              onClick={() => setMode('gallery')}
              type="button"
            >
              Galería
            </button>
            <button
              aria-pressed={mode === 'table'}
              className={segment(mode === 'table')}
              onClick={() => setMode('table')}
              type="button"
            >
              Tabla
            </button>
          </fieldset>
        }
        view={view}
      />
      {visible.length === 0 ? (
        <GalleryEmpty onReset={() => setView(DEFAULT_VIEW)} />
      ) : mode === 'table' ? (
        <div className={`${panelGold} overflow-x-auto`}>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className={th}> </th>
                <th className={th}>Título</th>
                <th className={th}>Tipo</th>
                <th className={th}>Jugadores</th>
                <th className={th}>Edición</th>
                <th className={th}>Subido por</th>
                <th className={th}>Likes</th>
                <th className={th}>Coment.</th>
                <th className={th}> </th>
              </tr>
            </thead>
            <tbody>
              {visible.map((item) => (
                <tr className="hover:bg-(--gold)/4" key={item.id}>
                  <td className={`${td} w-16`}>
                    <Link
                      className="relative block size-12 overflow-hidden rounded-md border border-(--hair) bg-(--night)"
                      href={archiveItemHref(item.id, context)}
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
                      ) : item.type === 'document' ? (
                        <span className="pointer-events-none absolute inset-0 grid place-items-center">
                          <DocumentGlyph size="size-5" />
                        </span>
                      ) : null}
                    </Link>
                  </td>
                  <td className={td}>
                    <Link
                      className="font-bold text-(--parchment) transition-colors hover:text-(--gold-hi)"
                      href={archiveItemHref(item.id, context)}
                    >
                      {item.caption ?? (
                        <span className="font-normal text-(--faded) italic">
                          Sin título
                        </span>
                      )}
                    </Link>
                  </td>
                  <td className={`${td} font-mono text-(--faded) text-xs`}>
                    {item.type === 'document'
                      ? `${documentLabel(item.mimeType)}${item.fileSize ? ` · ${formatFileSize(item.fileSize)}` : ''}`
                      : `${item.type === 'video' ? 'Vídeo' : 'Foto'}${
                          item.width && item.height
                            ? ` · ${item.width}×${item.height}`
                            : ''
                        }`}
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
                    {item.likeCount}
                  </td>
                  <td className={`${td} font-mono text-(--faded) text-xs`}>
                    {item.commentCount}
                  </td>
                  <td className={`${td} text-right`}>
                    {canModerate ||
                    (viewerId !== null &&
                      item.uploadedByUserId === viewerId) ? (
                      <Link
                        className="inline-flex rounded-full border border-(--hair) px-3 py-1 font-mono text-(--faded) text-2xs uppercase tracking-2xl transition-colors hover:border-(--hair-gold) hover:text-(--gold-hi)"
                        href={archiveItemHref(item.id, context, {
                          edit: true,
                        })}
                      >
                        Editar
                      </Link>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <MediaGallery items={visible} />
      )}
    </div>
  );
};

export { ArchiveBrowser };
