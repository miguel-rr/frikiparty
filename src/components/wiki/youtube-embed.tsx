'use client';

import { useState } from 'react';

/**
 * A YouTube video or playlist that costs nothing until it's clicked: the
 * thumbnail and a play button first, the privacy-enhanced player after.
 * Playlists have no thumbnail of their own, so they show a plain card.
 */
const YouTubeEmbed = ({
  youtubeId,
  playlist = false,
  title,
}: {
  youtubeId: string;
  playlist?: boolean;
  title: string;
}) => {
  const [playing, setPlaying] = useState(false);
  const src = playlist
    ? `https://www.youtube-nocookie.com/embed/videoseries?list=${youtubeId}&autoplay=1`
    : `https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1`;

  if (playing)
    return (
      <iframe
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="aspect-video w-full rounded-lg"
        src={src}
        title={title}
      />
    );

  return (
    <button
      aria-label={`Reproducir: ${title}`}
      className="group relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-lg border border-(--hair) bg-(--night-2)"
      onClick={() => setPlaying(true)}
      type="button"
    >
      {playlist ? (
        <span className="font-mono text-(--faded) text-2xs uppercase tracking-2xl">
          Lista de vídeos
        </span>
      ) : (
        // biome-ignore lint/performance/noImgElement: YouTube's thumbnail host is not allow-listed for next/image
        <img
          alt=""
          className="absolute inset-0 size-full object-cover opacity-85 transition-opacity group-hover:opacity-100"
          loading="lazy"
          src={`https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`}
        />
      )}
      <span className="absolute flex size-14 items-center justify-center rounded-full border border-(--gold-hi)/60 bg-[#141a15d9] text-(--gold-hi) shadow-[0_0_18px_rgba(201,165,87,0.35)] transition-transform group-hover:scale-110">
        <svg aria-hidden="true" height="22" viewBox="0 0 24 24" width="22">
          <path d="M8 5v14l11-7z" fill="currentColor" />
        </svg>
      </span>
    </button>
  );
};

export { YouTubeEmbed };
