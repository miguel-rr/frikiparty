'use client';

import { useMusic } from '@/components/music/music-provider';

/**
 * The nav's music control: a hairline capsule with play/pause and, once
 * the music is on, a small "next" beside it. Off it reads as a quiet
 * muted speaker in the faded ink; on, the speaker becomes three bars that
 * breathe while a track is actually playing and hold still while the
 * browser waits for a first gesture.
 */

const iconButton =
  'grid size-9 cursor-pointer place-items-center rounded-full transition-colors';

const MusicControl = () => {
  const music = useMusic();
  if (!music) {
    return null;
  }
  const { enabled, playing, toggle, next } = music;
  const toggleLabel = enabled ? 'Silenciar la música' : 'Activar la música';
  return (
    <div
      className={`flex items-center rounded-full border transition-colors ${
        enabled
          ? 'border-(--hair-gold) text-(--gold)'
          : 'border-(--hair) text-(--faded) hover:border-(--hair-gold) hover:text-(--gold)'
      }`}
    >
      <button
        aria-label={toggleLabel}
        aria-pressed={enabled}
        className={`${iconButton} ${enabled ? 'hover:text-(--gold-hi)' : ''}`}
        onClick={toggle}
        title={toggleLabel}
        type="button"
      >
        {enabled ? (
          <span aria-hidden className="flex h-4 items-end gap-0.5">
            {[0, 1, 2].map((bar) => (
              <span
                className={`w-0.75 rounded-full bg-current ${
                  playing ? 'animate-music-bar' : ''
                }`}
                key={bar}
                style={{
                  animationDelay: `${bar * 180}ms`,
                  height: `${[10, 16, 7][bar]}px`,
                }}
              />
            ))}
          </span>
        ) : (
          <svg
            aria-hidden="true"
            fill="none"
            height="16"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.75"
            viewBox="0 0 16 16"
            width="16"
          >
            <path d="M2 6h2.5L8 3v10L4.5 10H2z" />
            <path d="M11 6l3 4M14 6l-3 4" />
          </svg>
        )}
      </button>
      {enabled ? (
        <button
          aria-label="Siguiente tema"
          className={`${iconButton} mr-0.5 -ml-2 size-7 hover:text-(--gold-hi)`}
          onClick={next}
          title="Siguiente tema"
          type="button"
        >
          <svg
            aria-hidden="true"
            fill="currentColor"
            height="12"
            viewBox="0 0 16 16"
            width="12"
          >
            <path d="M2 3.5v9l7-4.5z" />
            <path d="M11 3h2v10h-2z" />
          </svg>
        </button>
      ) : null}
    </div>
  );
};

export { MusicControl };
