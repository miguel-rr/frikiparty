'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import { isTypingTarget } from '@/components/media/arrow-key-nav';
import { formatDuration, MediaFigure } from '@/components/media/media-figure';
import { documentLabel } from '@/lib/media/documents';
import type { MediaItem } from '@/server/api/routers/media-queries';

/** A sheet with a folded corner and three ruled lines: the document mark. */
const DocumentGlyph = ({ size = 'size-9' }: { size?: string }) => (
  <svg
    aria-hidden="true"
    className={`${size} text-(--gold) drop-shadow-[0_0_8px_rgba(201,165,87,0.45)]`}
    fill="none"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth="1.5"
    viewBox="0 0 24 24"
  >
    <path d="M6 3h8l5 5v13H6z" />
    <path d="M14 3v5h5" />
    <path d="M9 12h7M9 15.5h7M9 19h4" />
  </svg>
);

/** What a tile or a row is called when it has no caption. */
const kindName = (item: MediaItem) =>
  item.type === 'video'
    ? 'Vídeo'
    : item.type === 'document'
      ? 'Documento'
      : 'Foto';

/** Gold play badge laid over video tiles; `size` is a Tailwind size class. */
const PlayGlyph = ({ size = 'size-9' }: { size?: string }) => (
  <svg
    className={`${size} drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]`}
    fill="none"
    role="img"
    viewBox="0 0 36 36"
  >
    <title>Vídeo</title>
    <circle
      cx="18"
      cy="18"
      fill="#0a0f0cb3"
      r="16"
      stroke="#e8c877"
      strokeWidth="1.5"
    />
    <path d="M14 11.5v13l11-6.5z" fill="#f0d48a" />
  </svg>
);

/**
 * Thumbnail tile. Video without a captured poster still gets a tile of its
 * own so it can be opened; it just wears the play glyph on velvet.
 */
const Tile = ({ item, onOpen }: { item: MediaItem; onOpen: () => void }) => (
  <button
    aria-label={item.caption ?? kindName(item)}
    className="group relative aspect-square cursor-pointer overflow-hidden rounded-lg border border-(--hair) bg-(--night-2) transition-[border-color,box-shadow] hover:border-(--hair-gold) hover:shadow-[0_0_18px_rgba(201,165,87,0.25)] focus-visible:border-(--gold) focus-visible:outline-none"
    onClick={onOpen}
    type="button"
  >
    {item.thumbnailUrl ? (
      // biome-ignore lint/performance/noImgElement: R2 host is not in next.config remotePatterns; thumbnails are pre-sized
      <img
        alt=""
        className="size-full object-cover transition-transform duration-500 group-hover:scale-104"
        loading="lazy"
        src={item.thumbnailUrl}
      />
    ) : item.type === 'document' ? (
      // Typographic tile: no rendition exists for a document, so the
      // velvet carries the mark, the format and the title instead.
      <span className="grid size-full place-items-center overflow-hidden bg-[radial-gradient(circle_at_50%_40%,#1c2a20,#0a0f0c_70%)] p-2 sm:p-3">
        <span className="flex min-w-0 max-w-full flex-col items-center gap-1.5 text-center sm:gap-2">
          <DocumentGlyph size="size-7 sm:size-9" />
          <span className="font-bold font-mono text-(--gold) text-3xs uppercase tracking-2xl sm:text-2xs">
            {documentLabel(item.mimeType)}
          </span>
          {item.caption ? (
            // One line with an ellipsis on a phone's small tile; up to
            // three lines from sm, breaking long file-name words.
            <span className="d-display sm:wrap-anywhere block w-full truncate text-(--parchment) text-xs uppercase leading-snug sm:line-clamp-3 sm:whitespace-normal sm:text-sm">
              {item.caption}
            </span>
          ) : null}
        </span>
      </span>
    ) : (
      <span className="grid size-full place-items-center bg-[radial-gradient(circle_at_50%_40%,#1c2a20,#0a0f0c_70%)]" />
    )}
    {item.likeCount > 0 || item.commentCount > 0 ? (
      <span className="pointer-events-none absolute bottom-1.5 left-1.5 flex items-center gap-1.5 rounded bg-(--night)/80 px-1.5 py-0.5 font-mono text-(--parchment) text-2xs">
        {item.likeCount > 0 ? (
          <span className="inline-flex items-center gap-0.5">
            <span aria-hidden="true" className="text-(--gold)">
              ♥
            </span>
            <span className="sr-only">Me gusta: </span>
            {item.likeCount}
          </span>
        ) : null}
        {item.commentCount > 0 ? (
          <span className="inline-flex items-center gap-0.5">
            <svg
              aria-hidden="true"
              className="size-2.5 text-(--gold)"
              fill="currentColor"
              viewBox="0 0 16 16"
            >
              <path d="M2 2h12v9H6l-3.5 3V11H2z" />
            </svg>
            <span className="sr-only">Comentarios: </span>
            {item.commentCount}
          </span>
        ) : null}
      </span>
    ) : null}
    {item.type === 'video' ? (
      <>
        <span className="pointer-events-none absolute inset-0 grid place-items-center">
          <PlayGlyph />
        </span>
        {item.durationSeconds ? (
          <span className="pointer-events-none absolute right-1.5 bottom-1.5 rounded bg-(--night)/80 px-1.5 py-0.5 font-mono text-(--parchment) text-2xs">
            {formatDuration(item.durationSeconds)}
          </span>
        ) : null}
      </>
    ) : null}
  </button>
);

/**
 * Grid of tiles opening a lightbox with previous/next over the list as
 * given (already sorted and filtered by the caller). The open file is
 * tracked by id, not position: a like can re-sort the list under a
 * lightbox sorted by likes, and the figure must stay on the same photo.
 * The plaque links to /archive/<id> for a shareable URL.
 */
const MediaGallery = ({ items }: { items: MediaItem[] }) => {
  const [openId, setOpenId] = useState<string | null>(null);
  const index = openId === null ? -1 : items.findIndex((i) => i.id === openId);
  const current = index === -1 ? null : (items[index] ?? null);

  const step = useCallback(
    (delta: number) => {
      if (index === -1) {
        return;
      }
      setOpenId(
        items[(index + delta + items.length) % items.length]?.id ?? null,
      );
    },
    [index, items],
  );

  useEffect(() => {
    if (current === null) {
      return;
    }
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenId(null);
      } else if (isTypingTarget(event)) {
        // Arrows move the caret in a comment or the editor, not the file.
        return;
      } else if (event.key === 'ArrowRight') {
        step(1);
      } else if (event.key === 'ArrowLeft') {
        step(-1);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [current, step]);

  return (
    <>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3 lg:grid-cols-5">
        {items.map((item) => (
          <Tile item={item} key={item.id} onOpen={() => setOpenId(item.id)} />
        ))}
      </div>
      {current
        ? createPortal(
            // Rendered on <body>: no ancestor can clip or offset it. Sized
            // to the dynamic viewport so phone toolbars never hide the
            // header, and a click on the backdrop (outside the figure)
            // closes it, like Escape.
            // biome-ignore lint/a11y/useKeyWithClickEvents: Escape closes it through the document keydown handler above
            <div
              aria-modal
              className="fixed inset-0 z-100 flex h-dvh flex-col bg-[#05080699] backdrop-blur-sm"
              onClick={(event) => {
                if (event.target === event.currentTarget) {
                  setOpenId(null);
                }
              }}
              role="dialog"
            >
              <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
                <span className="font-mono text-(--faded) text-2xs uppercase tracking-2xl">
                  {index + 1} / {items.length}
                </span>
                <div className="flex items-center gap-2">
                  <Link
                    className="rounded-full border border-(--hair) px-3 py-1.5 font-mono text-(--faded) text-2xs uppercase tracking-2xl transition-colors hover:border-(--hair-gold) hover:text-(--gold-hi)"
                    href={`/archive/${current.id}`}
                  >
                    Enlace
                  </Link>
                  <button
                    aria-label="Cerrar"
                    className="grid size-9 cursor-pointer place-items-center rounded-full border border-(--hair) text-(--faded) transition-colors hover:border-(--hair-gold) hover:text-(--gold-hi)"
                    onClick={() => setOpenId(null)}
                    type="button"
                  >
                    ✕
                  </button>
                </div>
              </div>
              {/* biome-ignore lint/a11y/useKeyWithClickEvents: Escape closes it through the document keydown handler above */}
              {/* biome-ignore lint/a11y/noStaticElementInteractions: the backdrop margin around the figure, a click-outside target only */}
              <div
                className="relative flex flex-1 items-start justify-center overflow-y-auto overscroll-contain px-4 pb-8 sm:px-16"
                onClick={(event) => {
                  if (event.target === event.currentTarget) {
                    setOpenId(null);
                  }
                }}
              >
                {items.length > 1 ? (
                  <>
                    <button
                      aria-label="Anterior"
                      className="fixed top-1/2 left-2 z-10 grid size-11 -translate-y-1/2 cursor-pointer place-items-center rounded-full border border-(--hair-gold) bg-(--night)/80 text-(--gold) transition-colors hover:text-(--gold-hi) sm:left-4"
                      onClick={() => step(-1)}
                      type="button"
                    >
                      ‹
                    </button>
                    <button
                      aria-label="Siguiente"
                      className="fixed top-1/2 right-2 z-10 grid size-11 -translate-y-1/2 cursor-pointer place-items-center rounded-full border border-(--hair-gold) bg-(--night)/80 text-(--gold) transition-colors hover:text-(--gold-hi) sm:right-4"
                      onClick={() => step(1)}
                      type="button"
                    >
                      ›
                    </button>
                  </>
                ) : null}
                <div className="w-full max-w-4xl">
                  <MediaFigure
                    item={current}
                    key={current.id}
                    onRemoved={() => setOpenId(null)}
                  />
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
};

export { DocumentGlyph, MediaGallery, PlayGlyph };
