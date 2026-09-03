'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import { formatDuration, MediaFigure } from '@/components/media/media-figure';
import type { MediaItem } from '@/server/api/routers/media-queries';

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
    aria-label={item.caption ?? (item.type === 'video' ? 'Vídeo' : 'Foto')}
    className="group relative aspect-square cursor-pointer overflow-hidden rounded-lg border border-(--hair) bg-(--night-2) transition-[border-color,box-shadow] hover:border-(--hair-gold) hover:shadow-[0_0_18px_rgba(201,165,87,0.25)] focus-visible:border-(--gold) focus-visible:outline-none"
    onClick={onOpen}
    type="button"
  >
    {item.thumbnailUrl ? (
      // biome-ignore lint/performance/noImgElement: R2 host is not in next.config remotePatterns; thumbnails are pre-sized
      <img
        alt=""
        className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
        loading="lazy"
        src={item.thumbnailUrl}
      />
    ) : (
      <span className="grid size-full place-items-center bg-[radial-gradient(circle_at_50%_40%,#1c2a20,#0a0f0c_70%)]" />
    )}
    {item.likeCount > 0 || item.commentCount > 0 ? (
      <span className="pointer-events-none absolute bottom-1.5 left-1.5 flex items-center gap-1.5 rounded bg-[#0a0f0ccc] px-1.5 py-0.5 font-mono text-(--parchment) text-[0.6rem]">
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
          <span className="pointer-events-none absolute right-1.5 bottom-1.5 rounded bg-[#0a0f0ccc] px-1.5 py-0.5 font-mono text-(--parchment) text-[0.6rem]">
            {formatDuration(item.durationSeconds)}
          </span>
        ) : null}
      </>
    ) : null}
  </button>
);

/**
 * Grid of tiles opening a lightbox with previous/next. The lightbox is
 * local state; the plaque links to /archive/<id> for a shareable URL.
 */
const MediaGallery = ({ items }: { items: MediaItem[] }) => {
  const [index, setIndex] = useState<number | null>(null);
  const current = index === null ? null : (items[index] ?? null);

  const step = useCallback(
    (delta: number) =>
      setIndex((value) =>
        value === null ? null : (value + delta + items.length) % items.length,
      ),
    [items.length],
  );

  useEffect(() => {
    if (index === null) {
      return;
    }
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIndex(null);
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
  }, [index, step]);

  return (
    <>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3 lg:grid-cols-5">
        {items.map((item, position) => (
          <Tile item={item} key={item.id} onOpen={() => setIndex(position)} />
        ))}
      </div>
      {current ? (
        <div
          aria-modal
          className="fixed inset-0 z-[100] flex flex-col bg-[#05080699] backdrop-blur-sm"
          role="dialog"
        >
          <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <span className="font-mono text-(--faded) text-[0.62rem] uppercase tracking-[0.22em]">
              {(index ?? 0) + 1} / {items.length}
            </span>
            <div className="flex items-center gap-2">
              <Link
                className="rounded-full border border-(--hair) px-3 py-1.5 font-mono text-(--faded) text-[0.62rem] uppercase tracking-[0.18em] transition-colors hover:border-(--hair-gold) hover:text-(--gold-hi)"
                href={`/archive/${current.id}`}
              >
                Enlace
              </Link>
              <button
                aria-label="Cerrar"
                className="grid size-9 cursor-pointer place-items-center rounded-full border border-(--hair) text-(--faded) transition-colors hover:border-(--hair-gold) hover:text-(--gold-hi)"
                onClick={() => setIndex(null)}
                type="button"
              >
                ✕
              </button>
            </div>
          </div>
          <div className="relative flex flex-1 items-start justify-center overflow-y-auto px-4 pb-8 sm:px-16">
            {items.length > 1 ? (
              <>
                <button
                  aria-label="Anterior"
                  className="fixed top-1/2 left-2 z-10 grid size-11 -translate-y-1/2 cursor-pointer place-items-center rounded-full border border-(--hair-gold) bg-[#0a0f0ccc] text-(--gold) transition-colors hover:text-(--gold-hi) sm:left-4"
                  onClick={() => step(-1)}
                  type="button"
                >
                  ‹
                </button>
                <button
                  aria-label="Siguiente"
                  className="fixed top-1/2 right-2 z-10 grid size-11 -translate-y-1/2 cursor-pointer place-items-center rounded-full border border-(--hair-gold) bg-[#0a0f0ccc] text-(--gold) transition-colors hover:text-(--gold-hi) sm:right-4"
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
                onRemoved={() => setIndex(null)}
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
};

export { MediaGallery, PlayGlyph };
