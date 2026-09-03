import type { MediaItem } from '@/server/api/routers/media-queries';

/**
 * How a gallery is looked at: sort, type filter and free text. Pure
 * functions over the loaded list — every gallery already has all of its
 * items in memory, so the browser does the work and the URL (on /archive)
 * or local state (on entity pages) holds the view.
 */

const SORTS = ['likes', 'comments', 'recent'] as const;
const TYPES = ['all', 'image', 'video'] as const;

type GallerySort = (typeof SORTS)[number];
type GalleryType = (typeof TYPES)[number];

type GalleryView = {
  sort: GallerySort;
  type: GalleryType;
  query: string;
};

const DEFAULT_VIEW: GalleryView = { sort: 'likes', type: 'all', query: '' };

const SORT_LABELS: Record<GallerySort, string> = {
  likes: 'Likes',
  comments: 'Comentarios',
  recent: 'Recientes',
};

const TYPE_LABELS: Record<GalleryType, string> = {
  all: 'Todos',
  image: 'Fotos',
  video: 'Vídeos',
};

const isSort = (value: unknown): value is GallerySort =>
  SORTS.includes(value as GallerySort);

const isType = (value: unknown): value is GalleryType =>
  TYPES.includes(value as GalleryType);

/** Lowercase, no accents, collapsed whitespace: what both sides get compared as. */
const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

/** Everything the free text can hit, as one normalized haystack. */
const haystackOf = (item: MediaItem) =>
  normalize(
    [
      item.caption ?? '',
      item.description ?? '',
      ...item.players.map((player) => player.name),
      item.venue?.name ?? '',
      item.edition?.label ?? '',
      item.edition?.slug ?? '',
    ].join(' '),
  );

const byRecent = (a: MediaItem, b: MediaItem) =>
  b.createdAt.localeCompare(a.createdAt);

const COMPARATORS: Record<GallerySort, (a: MediaItem, b: MediaItem) => number> =
  {
    likes: (a, b) => b.likeCount - a.likeCount || byRecent(a, b),
    comments: (a, b) => b.commentCount - a.commentCount || byRecent(a, b),
    recent: byRecent,
  };

/** Every word typed must appear somewhere in the item. */
const matchesQuery = (item: MediaItem, query: string) => {
  const words = normalize(query).split(' ').filter(Boolean);
  if (words.length === 0) {
    return true;
  }
  const haystack = haystackOf(item);
  return words.every((word) => haystack.includes(word));
};

const applyGalleryView = (items: MediaItem[], view: GalleryView) =>
  items
    .filter(
      (item) =>
        (view.type === 'all' || item.type === view.type) &&
        matchesQuery(item, view.query),
    )
    .sort(COMPARATORS[view.sort]);

/** Photo and video counts of what the text alone lets through. */
const countByType = (items: MediaItem[], query: string) => {
  const counts = { all: 0, image: 0, video: 0 };
  for (const item of items) {
    if (matchesQuery(item, query)) {
      counts.all += 1;
      counts[item.type] += 1;
    }
  }
  return counts;
};

/** URL ↔ view for /archive; defaults are left out so the address stays clean. */
const viewFromParams = (params: {
  sort?: string;
  type?: string;
  q?: string;
}): GalleryView => ({
  sort: isSort(params.sort) ? params.sort : DEFAULT_VIEW.sort,
  type: isType(params.type) ? params.type : DEFAULT_VIEW.type,
  query: params.q?.trim() ?? '',
});

const paramsFromView = (view: GalleryView) => {
  const params = new URLSearchParams();
  if (view.sort !== DEFAULT_VIEW.sort) {
    params.set('sort', view.sort);
  }
  if (view.type !== DEFAULT_VIEW.type) {
    params.set('type', view.type);
  }
  if (view.query.trim()) {
    params.set('q', view.query.trim());
  }
  return params;
};

const isDefaultView = (view: GalleryView) =>
  view.sort === DEFAULT_VIEW.sort &&
  view.type === DEFAULT_VIEW.type &&
  view.query.trim() === '';

export {
  applyGalleryView,
  countByType,
  DEFAULT_VIEW,
  type GallerySort,
  type GalleryType,
  type GalleryView,
  isDefaultView,
  paramsFromView,
  SORT_LABELS,
  SORTS,
  TYPE_LABELS,
  TYPES,
  viewFromParams,
};
