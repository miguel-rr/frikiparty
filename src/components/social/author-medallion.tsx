import Link from 'next/link';

import type { Author } from '@/server/api/routers/social';

const SIZES = {
  sm: 'size-7 text-[0.6rem]',
  md: 'size-9 text-xs',
} as const;

/**
 * Who liked or wrote something: the player's painted portrait in a thin
 * gold ring (same geometry as the champion portraits, so faces pop out of
 * the rim), or an initial on velvet for accounts without a player.
 */
const AuthorMedallion = ({
  author,
  size = 'md',
}: {
  author: Pick<Author, 'name' | 'portrait'>;
  size?: keyof typeof SIZES;
}) => (
  <span
    className={`relative block ${SIZES[size]} shrink-0 rounded-full p-[1.5px] ${
      author.portrait
        ? 'bg-[conic-gradient(from_200deg,#8f6b2e,#f0d48a_22%,#c9a557_45%,#6e5223_68%,#f0d48a_88%,#8f6b2e)] shadow-[0_2px_8px_rgba(0,0,0,0.6)]'
        : 'bg-(--hair-gold)'
    }`}
    title={author.name}
  >
    <span className="relative grid size-full place-items-center overflow-hidden rounded-full bg-(--night-2) font-bold font-mono text-(--gold) uppercase shadow-[inset_0_0_0_1px_rgba(240,212,138,0.25)]">
      {author.portrait ? (
        // biome-ignore lint/performance/noImgElement: local static portrait
        <img
          alt=""
          className="absolute top-[-8%] left-[-16%] w-[132%] max-w-none"
          src={author.portrait}
        />
      ) : (
        author.name.trim().charAt(0) || '?'
      )}
    </span>
  </span>
);

/** The name, linked to the player's page when the account has one. */
const AuthorName = ({
  author,
  className = '',
}: {
  author: Pick<Author, 'name' | 'slug'>;
  className?: string;
}) =>
  author.slug ? (
    <Link
      className={`font-bold text-(--parchment) transition-colors hover:text-(--gold-hi) ${className}`}
      href={`/players/${author.slug}`}
    >
      {author.name}
    </Link>
  ) : (
    <span className={`font-bold text-(--parchment) ${className}`}>
      {author.name}
    </span>
  );

export { AuthorMedallion, AuthorName };
