'use client';

import Link from 'next/link';
import { useState } from 'react';

import { group, segment } from '@/components/media/gallery-toolbar';
import { DocumentGlyph, PlayGlyph } from '@/components/media/media-gallery';
import { btn, panelGold, td, th } from '@/components/theme/primitives';
import { documentLabel, formatFileSize } from '@/lib/media/documents';
import type { MediaItem } from '@/server/api/routers/media-queries';
import { api } from '@/trpc/react';

type Mode = 'gallery' | 'table';

const cellLink =
  'text-(--faded) transition-colors hover:text-(--gold-hi) hover:underline';

const rowAction =
  'inline-flex cursor-pointer rounded-full border border-(--hair) px-3 py-1 font-mono text-(--faded) text-2xs uppercase tracking-2xl transition-colors hover:border-(--hair-gold) hover:text-(--gold-hi)';

const checkbox =
  'size-4 cursor-pointer accent-(--gold) disabled:cursor-default disabled:opacity-30';

/** Galería / Tabla, the same capsule wherever an archive is shown. */
const ModeToggle = ({
  mode,
  onChange,
}: {
  mode: Mode;
  onChange: (mode: Mode) => void;
}) => (
  <fieldset className={group}>
    <legend className="sr-only">Vista</legend>
    <button
      aria-pressed={mode === 'gallery'}
      className={segment(mode === 'gallery')}
      onClick={() => onChange('gallery')}
      type="button"
    >
      Galería
    </button>
    <button
      aria-pressed={mode === 'table'}
      className={segment(mode === 'table')}
      onClick={() => onChange('table')}
      type="button"
    >
      Tabla
    </button>
  </fieldset>
);

/**
 * A row's Editar / Eliminar. Eliminar asks in place, like the figure
 * does (never a browser dialog), and while it asks the question takes the
 * whole cell so the row keeps its width.
 */
const RowActions = ({
  href,
  item,
  onChanged,
}: {
  /** The file's page, straight into the editor. */
  href: string;
  item: MediaItem;
  onChanged: () => void;
}) => {
  const [confirming, setConfirming] = useState(false);
  const remove = api.media.remove.useMutation({ onSuccess: onChanged });
  if (confirming) {
    return (
      <span className="inline-flex items-center justify-end gap-2">
        <span className="text-(--ember) text-xs">Para siempre.</span>
        <button
          className={`${btn.danger} px-3 py-1 text-2xs`}
          disabled={remove.isPending}
          onClick={() => remove.mutate({ id: item.id })}
          type="button"
        >
          {remove.isPending ? 'Eliminando…' : 'Sí, eliminar'}
        </button>
        <button
          className={rowAction}
          onClick={() => setConfirming(false)}
          type="button"
        >
          No
        </button>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center justify-end gap-2">
      <Link className={rowAction} href={href}>
        Editar
      </Link>
      <button
        className={`${rowAction} hover:border-(--ember)/60 hover:text-(--ember)`}
        onClick={() => setConfirming(true)}
        type="button"
      >
        Eliminar
      </button>
    </span>
  );
};

/**
 * The bar over the table while files are ticked: how many, Eliminar
 * seleccionados with the same in-place confirmation as a single row, and
 * a way to untick everything.
 */
const SelectionBar = ({
  count,
  onClear,
  onRemove,
  pending,
  error,
}: {
  count: number;
  onClear: () => void;
  onRemove: () => void;
  pending: boolean;
  error: string | null;
}) => {
  const [confirming, setConfirming] = useState(false);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-(--hair-gold) bg-(--gold)/6 px-4 py-2.5">
      <span className="font-mono text-(--parchment) text-2xs uppercase tracking-2xl">
        {count === 1 ? '1 seleccionado' : `${count} seleccionados`}
      </span>
      <span className="inline-flex flex-wrap items-center gap-2">
        {error ? <span className="text-(--ember) text-xs">{error}</span> : null}
        {confirming ? (
          <>
            <span className="text-(--ember) text-xs">
              Para siempre, también del almacén.
            </span>
            <button
              className={`${btn.danger} px-3 py-1 text-2xs`}
              disabled={pending}
              onClick={onRemove}
              type="button"
            >
              {pending
                ? 'Eliminando…'
                : `Sí, eliminar ${count === 1 ? '1 archivo' : `${count} archivos`}`}
            </button>
            <button
              className={rowAction}
              onClick={() => setConfirming(false)}
              type="button"
            >
              No
            </button>
          </>
        ) : (
          <>
            <button
              className={`${rowAction} hover:border-(--ember)/60 hover:text-(--ember)`}
              onClick={() => setConfirming(true)}
              type="button"
            >
              Eliminar seleccionados
            </button>
            <button className={rowAction} onClick={onClear} type="button">
              Quitar selección
            </button>
          </>
        )}
      </span>
    </div>
  );
};

/**
 * The catalogue at a glance: thumbnail, title, format, who, edition,
 * uploader, likes, comments — and, on rows the visitor may edit, Editar /
 * Eliminar plus a checkbox for batch deletion. Shared by /archive and the
 * archive block on player, edition and venue pages; the caller says which
 * rows are the visitor's to remove, where a row's page is, and what to
 * refresh once something is deleted.
 */
const MediaTable = ({
  canRemove,
  hrefFor,
  items,
  onChanged,
}: {
  canRemove: (item: MediaItem) => boolean;
  /** The file's page; `edit` should land straight in the editor. */
  hrefFor: (item: MediaItem, options?: { edit?: boolean }) => string;
  /** Sorted and filtered already. */
  items: MediaItem[];
  /** After a deletion: invalidate the gallery, refresh the page… */
  onChanged: () => void;
}) => {
  // Ticked rows, by id: survives re-sorting and filtering; rows the
  // current filter hides don't count until they show again.
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const removable = items.filter(canRemove);
  const selectedVisible = removable.filter((item) => selected.has(item.id));
  const toggle = (id: string) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  const toggleAll = () =>
    setSelected(
      selectedVisible.length === removable.length
        ? new Set()
        : new Set(removable.map((item) => item.id)),
    );
  const removeMany = api.media.removeMany.useMutation({
    onSuccess: () => {
      setSelected(new Set());
      onChanged();
    },
  });

  return (
    <div className="flex flex-col gap-5">
      {selectedVisible.length > 0 ? (
        <SelectionBar
          count={selectedVisible.length}
          error={removeMany.error?.message ?? null}
          onClear={() => setSelected(new Set())}
          onRemove={() =>
            removeMany.mutate({ ids: selectedVisible.map((item) => item.id) })
          }
          pending={removeMany.isPending}
        />
      ) : null}
      <div className={`${panelGold} overflow-x-auto`}>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className={`${th} w-8`}>
                {removable.length > 0 ? (
                  <input
                    aria-label="Seleccionar todos los visibles"
                    checked={selectedVisible.length === removable.length}
                    className={checkbox}
                    onChange={toggleAll}
                    type="checkbox"
                  />
                ) : null}
              </th>
              <th className={th}> </th>
              <th className={th}>Título</th>
              <th className={th}>Tipo</th>
              <th className={th}>Jugadores</th>
              <th className={th}>Edición</th>
              <th className={`${th} whitespace-nowrap`}>Subido por</th>
              <th className={th}>Likes</th>
              <th className={th}>Coment.</th>
              <th className={th}> </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr
                className={
                  selected.has(item.id)
                    ? 'bg-(--gold)/8'
                    : 'hover:bg-(--gold)/4'
                }
                key={item.id}
              >
                <td className={`${td} w-8`}>
                  {canRemove(item) ? (
                    <input
                      aria-label={`Seleccionar ${item.caption ?? 'archivo'}`}
                      checked={selected.has(item.id)}
                      className={checkbox}
                      onChange={() => toggle(item.id)}
                      type="checkbox"
                    />
                  ) : null}
                </td>
                <td className={`${td} w-16`}>
                  <Link
                    className="relative block size-12 overflow-hidden rounded-md border border-(--hair) bg-(--night)"
                    href={hrefFor(item)}
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
                    href={hrefFor(item)}
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
                <td className={`${td} whitespace-nowrap text-right`}>
                  {canRemove(item) ? (
                    <RowActions
                      href={hrefFor(item, { edit: true })}
                      item={item}
                      onChanged={onChanged}
                    />
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export { MediaTable, type Mode, ModeToggle };
