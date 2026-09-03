import {
  type GalleryView,
  paramsFromView,
  viewFromParams,
} from '@/lib/media/gallery-view';

/**
 * How /archive and /archive/<id> hand the current view to each other.
 * The list writes its view into the links it renders; the item page
 * reads it back to offer previous/next in the same order and to return
 * to the same list after an edit. `from=archive` marks that round trip;
 * a plain /archive/<id> (shared link, lightbox "Enlace") shows nothing of it.
 */
type ArchiveContext = {
  view: GalleryView;
  table: boolean;
};

type SearchParams = Record<string, string | string[] | undefined>;

const first = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

const contextParams = (context: ArchiveContext) => {
  const params = paramsFromView(context.view);
  if (context.table) {
    params.set('view', 'table');
  }
  return params;
};

const withQuery = (path: string, params: URLSearchParams) => {
  const query = params.toString();
  return query ? `${path}?${query}` : path;
};

/** The list, with its view. */
const archiveHref = (context: ArchiveContext) =>
  withQuery('/archive', contextParams(context));

/** One file, remembering the list it came from; `edit` opens the editor. */
const archiveItemHref = (
  id: string,
  context: ArchiveContext,
  { edit = false } = {},
) => {
  const params = contextParams(context);
  params.set('from', 'archive');
  if (edit) {
    params.set('edit', '1');
  }
  return withQuery(`/archive/${id}`, params);
};

/** What /archive/<id> was opened with. Null unless it came from the list. */
const readArchiveContext = (searchParams: SearchParams) => {
  if (first(searchParams.from) !== 'archive') {
    return null;
  }
  return {
    context: {
      view: viewFromParams({
        sort: first(searchParams.sort),
        type: first(searchParams.type),
        q: first(searchParams.q),
      }),
      table: first(searchParams.view) === 'table',
    },
    edit: first(searchParams.edit) === '1',
  };
};

export {
  type ArchiveContext,
  archiveHref,
  archiveItemHref,
  readArchiveContext,
};
