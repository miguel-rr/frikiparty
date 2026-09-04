'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import {
  GalleryEmpty,
  GalleryToolbar,
} from '@/components/media/gallery-toolbar';
import { MediaGallery } from '@/components/media/media-gallery';
import {
  MediaTable,
  type Mode,
  ModeToggle,
} from '@/components/media/media-table';
import { archiveItemHref } from '@/lib/media/archive-links';
import {
  applyGalleryView,
  countByType,
  DEFAULT_VIEW,
  type GalleryView,
  paramsFromView,
  viewFromParams,
} from '@/lib/media/gallery-view';
import type { MediaItem } from '@/server/api/routers/media-queries';
import { api } from '@/trpc/react';

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
  const router = useRouter();
  const utils = api.useUtils();
  const canRemove = (item: MediaItem) =>
    canModerate || (viewerId !== null && item.uploadedByUserId === viewerId);
  // Deletions: the page is dynamic, so a refresh redraws the list; the
  // galleries on entity pages are invalidated as well.
  const changed = () => {
    utils.media.gallery.invalidate();
    router.refresh();
  };
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
        trailing={<ModeToggle mode={mode} onChange={setMode} />}
        view={view}
      />
      {visible.length === 0 ? (
        <GalleryEmpty onReset={() => setView(DEFAULT_VIEW)} />
      ) : mode === 'table' ? (
        <MediaTable
          canRemove={canRemove}
          hrefFor={(item, options) =>
            archiveItemHref(item.id, context, options)
          }
          items={visible}
          onChanged={changed}
        />
      ) : (
        <MediaGallery items={visible} />
      )}
    </div>
  );
};

export { ArchiveBrowser };
