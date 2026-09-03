'use client';

import Link from 'next/link';

import { MediaActions } from '@/components/media/media-actions';
import { CommentThread } from '@/components/social/comment-thread';
import { LikeButton } from '@/components/social/like-button';
import type { MediaItem } from '@/server/api/routers/media-queries';

const formatDuration = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${rest.toString().padStart(2, '0')}`;
};

const chipLink =
  'inline-flex items-center rounded-full border border-(--hair-gold) px-2.5 py-1 font-mono text-2xs font-bold uppercase tracking-2xl text-(--gold) transition-colors hover:border-(--gold) hover:text-(--gold-hi)';

/**
 * One archived file at full size with its plaque: the image or video on
 * top, then caption, who appears and which edition; then the likes and
 * the comment thread. Shared by the gallery lightbox and
 * the /archive/<id> page.
 */
const MediaFigure = ({
  item,
  priority = false,
  editing = false,
  doneHref,
  onRemoved,
  removedHref,
}: {
  item: MediaItem;
  /** Eager-load the picture (the standalone page). */
  priority?: boolean;
  /** Open with the editor already unfolded (the list's Editar button). */
  editing?: boolean;
  /** Where saving or cancelling that edit leads (back to the list). */
  doneHref?: string;
  /** After a delete: close the lightbox… */
  onRemoved?: () => void;
  /** …or leave for this page (the standalone /archive/<id> route). */
  removedHref?: string;
}) => (
  <figure className="flex w-full flex-col gap-4">
    <div className="grid max-h-[70vh] w-full place-items-center overflow-hidden rounded-xl border border-(--hair) bg-(--night) sm:max-h-[74vh]">
      {item.type === 'video' ? (
        // biome-ignore lint/a11y/useMediaCaption: home videos have no captions track
        <video
          className="max-h-[70vh] w-full sm:max-h-[74vh]"
          controls
          playsInline
          poster={item.displayUrl ?? undefined}
          preload="metadata"
          src={item.playbackUrl ?? item.originalUrl}
        />
      ) : (
        // biome-ignore lint/performance/noImgElement: R2 host is not in next.config remotePatterns; renditions are pre-sized
        <img
          alt={item.caption ?? ''}
          className="max-h-[70vh] w-auto max-w-full object-contain sm:max-h-[74vh]"
          height={item.height ?? undefined}
          loading={priority ? 'eager' : 'lazy'}
          src={item.displayUrl ?? item.originalUrl}
          width={item.width ?? undefined}
        />
      )}
    </div>
    <figcaption className="flex flex-col gap-3">
      {item.caption ? (
        <p className="d-display font-bold text-(--parchment) text-lg uppercase leading-snug">
          {item.caption}
        </p>
      ) : null}
      {item.description ? (
        <p className="whitespace-pre-line text-(--faded) text-sm">
          {item.description}
        </p>
      ) : null}
      {item.playbackStatus === 'converting' ? (
        <p className="text-(--gold) text-xs">
          Preparando una versión que se vea en cualquier navegador… De momento
          se sirve el original.
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-1.5">
        {item.edition ? (
          <Link className={chipLink} href={`/editions/${item.edition.slug}`}>
            {item.edition.label}
          </Link>
        ) : null}
        {item.players.map((player) => (
          <Link
            className={chipLink}
            href={`/players/${player.slug}`}
            key={player.id}
          >
            {player.name}
          </Link>
        ))}
      </div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <LikeButton
          likeCount={item.likeCount}
          likedByMe={item.likedByMe}
          target={{ mediaId: item.id }}
        />
        <MediaActions
          doneHref={doneHref}
          editing={editing}
          item={item}
          onRemoved={onRemoved}
          removedHref={removedHref}
        />
      </div>
      <CommentThread target={{ mediaId: item.id }} />
    </figcaption>
  </figure>
);

export { formatDuration, MediaFigure };
