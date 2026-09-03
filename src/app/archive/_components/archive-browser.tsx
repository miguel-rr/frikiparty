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
import { MediaGallery, PlayGlyph } from '@/components/media/media-gallery';
import { panelGold, td, th } from '@/components/theme/primitives';
import {
  applyGalleryView,
  countByType,
  DEFAULT_VIEW,
  type GalleryView,
  paramsFromView,
  viewFromParams,
} from '@/lib/media/gallery-view';
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

/**
 * The view lives in the URL (?sort=&type=&q=) so a filtered archive can
 * be shared and survives a trip into a file's page. Read once on mount,
 * written back with replaceState so typing never reloads the page.
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
  useEffect(() => {
    const query = paramsFromView(view).toString();
    const url = `${window.location.pathname}${query ? `?${query}` : ''}`;
    if (url !== `${window.location.pathname}${window.location.search}`) {
      window.history.replaceState(window.history.state, '', url);
    }
  }, [view]);
  return [view, setView] as const;
};

/**
 * Gallery of everything, and for admins a table view that shows the
 * catalogue at a glance: thumbnail, title, who, when, how heavy. Both
 * views show the same sorted and filtered list. Each row links to the
 * file's page, where it can be edited or removed.
 */
const ArchiveBrowser = ({
  isAdmin,
  items,
}: {
  isAdmin: boolean;
  items: MediaItem[];
}) => {
  const [mode, setMode] = useState<'gallery' | 'table'>('gallery');
  const [view, setView] = useUrlView();
  const visible = useMemo(() => applyGalleryView(items, view), [items, view]);
  const counts = useMemo(
    () => countByType(items, view.query),
    [items, view.query],
  );

  if (items.length === 0) {
    return null;
  }
  return (
    <div className="flex flex-col gap-5">
      <GalleryToolbar
        counts={counts}
        onChange={setView}
        trailing={
          isAdmin ? (
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
          ) : null
        }
        view={view}
      />
      {visible.length === 0 ? (
        <GalleryEmpty onReset={() => setView(DEFAULT_VIEW)} />
      ) : mode === 'table' ? (
        <div className={`${panelGold} overflow-x-auto`}>
          <table className="w-full min-w-[58rem] border-collapse text-sm">
            <thead>
              <tr>
                <th className={th}> </th>
                <th className={th}>Título</th>
                <th className={th}>Tipo</th>
                <th className={th}>Jugadores</th>
                <th className={th}>Edición</th>
                <th className={th}>Subido por</th>
                <th className={th}>Fecha</th>
                <th className={th}>Likes</th>
                <th className={th}>Coment.</th>
                <th className={th}>Peso</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((item) => (
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
                    {item.likeCount}
                  </td>
                  <td className={`${td} font-mono text-(--faded) text-xs`}>
                    {item.commentCount}
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
        <MediaGallery items={visible} />
      )}
    </div>
  );
};

export { ArchiveBrowser };
