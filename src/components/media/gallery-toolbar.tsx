'use client';

import type { ReactNode } from 'react';

import {
  type GalleryView,
  SORT_LABELS,
  SORTS,
  TYPE_LABELS,
  TYPES,
} from '@/lib/media/gallery-view';

/** One capsule of a segmented control (also used by the admin's Galería/Tabla). */
const segment = (active: boolean) =>
  `cursor-pointer whitespace-nowrap rounded-full px-3 py-1 font-mono text-2xs font-bold uppercase tracking-2xl transition-colors ${
    active
      ? 'bg-(--gold)/15 text-(--gold-hi)'
      : 'text-(--faded) hover:text-(--parchment)'
  }`;

const group = 'inline-flex min-w-0 rounded-full border border-(--hair) p-0.5';

/**
 * Sort, type filter and free text over a gallery. Controlled: the parent
 * owns the view (local state on entity pages, the URL on /archive) and
 * the counts come from what the text alone lets through, so the type
 * capsules always say how much each one would show.
 */
const GalleryToolbar = ({
  view,
  onChange,
  counts,
  trailing,
}: {
  view: GalleryView;
  onChange: (view: GalleryView) => void;
  counts: Record<GalleryView['type'], number>;
  /** Extra controls at the end of the row (the admin's view toggle). */
  trailing?: ReactNode;
}) => (
  <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center">
    <fieldset className={group}>
      <legend className="sr-only">Tipo</legend>
      {TYPES.map((type) => (
        <button
          aria-pressed={view.type === type}
          className={segment(view.type === type)}
          key={type}
          onClick={() => onChange({ ...view, type })}
          type="button"
        >
          {TYPE_LABELS[type]}
          <span
            className={`ml-1.5 font-normal ${view.type === type ? 'text-(--gold)' : 'text-(--faded)/55'}`}
          >
            {counts[type]}
          </span>
        </button>
      ))}
    </fieldset>
    <fieldset className={group}>
      <legend className="sr-only">Orden</legend>
      {SORTS.map((sort) => (
        <button
          aria-pressed={view.sort === sort}
          className={segment(view.sort === sort)}
          key={sort}
          onClick={() => onChange({ ...view, sort })}
          type="button"
        >
          {SORT_LABELS[sort]}
        </button>
      ))}
    </fieldset>
    <label className="relative flex min-w-0 flex-1 items-center sm:ml-auto sm:max-w-xs">
      <span className="sr-only">Buscar</span>
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute left-3 size-3.5 text-(--faded)"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        viewBox="0 0 24 24"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" strokeLinecap="round" />
      </svg>
      <input
        className="w-full rounded-full border border-(--hair) bg-(--night-2) py-1.5 pr-8 pl-9 text-(--parchment) text-sm transition-colors placeholder:text-(--faded)/55 hover:border-(--hair-gold) focus:border-(--gold) focus:outline-none"
        onChange={(event) => onChange({ ...view, query: event.target.value })}
        placeholder="Buscar título, jugador, sede, edición…"
        type="text"
        value={view.query}
      />
      {view.query ? (
        <button
          aria-label="Borrar búsqueda"
          className="absolute right-2 grid size-5 cursor-pointer place-items-center rounded-full text-(--faded) transition-colors hover:text-(--gold-hi)"
          onClick={() => onChange({ ...view, query: '' })}
          type="button"
        >
          ✕
        </button>
      ) : null}
    </label>
    {trailing}
  </div>
);

/** What a gallery shows when the view lets nothing through. */
const GalleryEmpty = ({ onReset }: { onReset: () => void }) => (
  <p className="text-(--faded) text-sm italic">
    Nada en Los Archivos con esos filtros.{' '}
    <button
      className="cursor-pointer text-(--gold) not-italic transition-colors hover:text-(--gold-hi)"
      onClick={onReset}
      type="button"
    >
      Ver todo
    </button>
  </p>
);

export { GalleryEmpty, GalleryToolbar, group, segment };
