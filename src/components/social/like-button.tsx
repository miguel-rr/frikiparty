'use client';

import { useEffect, useState } from 'react';

import {
  AuthorMedallion,
  AuthorName,
} from '@/components/social/author-medallion';
import type { SocialTarget } from '@/components/social/target';
import { api } from '@/trpc/react';

const HeartGlyph = ({ filled }: { filled: boolean }) => (
  <svg
    aria-hidden="true"
    className={`size-[1.05rem] transition-transform duration-300 ${filled ? 'scale-110' : ''}`}
    fill={filled ? '#e8c877' : 'none'}
    stroke="currentColor"
    strokeWidth="1.6"
    viewBox="0 0 24 24"
  >
    <path d="M12 20.5s-7.5-4.6-9.3-9.6C1.5 7.6 3.6 4.5 6.8 4.5c1.9 0 3.5 1 4.4 2.5.9-1.5 2.5-2.5 4.4-2.5 3.2 0 5.3 3.1 4.1 6.4-1.8 5-9.3 9.6-9.3 9.6z" />
  </svg>
);

/**
 * One "me gusta" per person. The heart flips at once (optimistic) and the
 * server settles the count; tapping the count unfolds who gave it.
 */
const LikeButton = ({
  target,
  likeCount,
  likedByMe,
}: {
  target: SocialTarget;
  likeCount: number;
  likedByMe: boolean;
}) => {
  const [state, setState] = useState({ liked: likedByMe, count: likeCount });
  const [showLikers, setShowLikers] = useState(false);
  const utils = api.useUtils();

  // Fresh props (another file in the lightbox, a refetched gallery) win.
  useEffect(() => {
    setState({ liked: likedByMe, count: likeCount });
  }, [likedByMe, likeCount]);

  const likers = api.social.likers.useQuery(target, { enabled: showLikers });
  const toggle = api.social.toggleLike.useMutation({
    onMutate: () =>
      setState((current) => ({
        liked: !current.liked,
        count: current.count + (current.liked ? -1 : 1),
      })),
    onSuccess: (result) => {
      setState(result);
      utils.media.gallery.invalidate();
      if (showLikers) {
        utils.social.likers.invalidate(target);
      }
    },
    onError: () => setState({ liked: likedByMe, count: likeCount }),
  });

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1">
        <button
          aria-label={state.liked ? 'Quitar el me gusta' : 'Me gusta'}
          aria-pressed={state.liked}
          className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 font-mono text-[0.62rem] uppercase tracking-[0.18em] transition-colors ${
            state.liked
              ? 'border-(--gold) bg-[#c9a55726] text-(--gold-hi)'
              : 'border-(--hair) text-(--faded) hover:border-(--hair-gold) hover:text-(--gold-hi)'
          }`}
          disabled={toggle.isPending}
          onClick={() => toggle.mutate(target)}
          type="button"
        >
          <HeartGlyph filled={state.liked} />
          {state.liked ? 'Te gusta' : 'Me gusta'}
        </button>
        {state.count > 0 ? (
          <button
            aria-expanded={showLikers}
            className="cursor-pointer rounded-full px-2 py-1 font-mono text-(--faded) text-[0.62rem] uppercase tracking-[0.18em] transition-colors hover:text-(--gold-hi)"
            onClick={() => setShowLikers((value) => !value)}
            type="button"
          >
            {state.count} me gusta
          </button>
        ) : null}
      </div>
      {showLikers ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          {likers.data?.map((author) => (
            <span
              className="inline-flex items-center gap-1.5"
              key={author.userId}
            >
              <AuthorMedallion author={author} size="sm" />
              <AuthorName author={author} className="text-xs" />
            </span>
          ))}
          {likers.isPending ? (
            <span className="text-(--faded) text-xs italic">Cargando…</span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};

export { LikeButton };
