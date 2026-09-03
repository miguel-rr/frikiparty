import Link from 'next/link';

import { linkGold, panelGold } from '@/components/theme/primitives';

type VenueShowcaseProps = {
  name: string;
  slug?: string | null;
  isPlace?: boolean | null;
  photoUrl?: string | null;
  mapsUrl?: string | null;
  mapsEmbedQuery?: string | null;
};

/**
 * Gold panel with the venue's photo and tinted map — both clicking through
 * to Google Maps, same behaviour as the home hero card — plus a footer with
 * the venue's own page and directions. Used wherever an upcoming gathering
 * presents its venue (/council, upcoming edition pages).
 */
const VenueShowcase = ({
  name,
  slug,
  isPlace,
  photoUrl,
  mapsUrl,
  mapsEmbedQuery,
}: VenueShowcaseProps) => {
  const mapSrc = mapsEmbedQuery
    ? `https://maps.google.com/maps?q=${encodeURIComponent(mapsEmbedQuery)}&z=13&output=embed`
    : null;
  const media =
    photoUrl || mapSrc ? (
      <div
        className={`grid grid-cols-1 ${photoUrl && mapSrc ? 'sm:grid-cols-2' : ''}`}
      >
        {photoUrl ? (
          // biome-ignore lint/performance/noImgElement: remote host not allow-listed in next.config for next/image
          <img
            alt={`Fotografía de ${name}`}
            className="h-44 w-full object-cover sm:h-56"
            src={photoUrl}
          />
        ) : null}
        {mapSrc ? (
          <iframe
            className="pointer-events-none h-44 w-full border-0 opacity-90 contrast-92 grayscale-40 sepia-25 sm:h-56"
            loading="lazy"
            src={mapSrc}
            tabIndex={-1}
            title={`Mapa de ${name}`}
          />
        ) : null}
      </div>
    ) : null;

  return (
    <div className={`${panelGold} overflow-hidden`}>
      {media && mapsUrl ? (
        <a
          aria-label={`Cómo llegar a ${name} (Google Maps)`}
          className="group block transition-opacity hover:opacity-90"
          href={mapsUrl}
          rel="noreferrer"
          target="_blank"
        >
          {media}
        </a>
      ) : (
        media
      )}
      <div className="flex items-center justify-between gap-3 border-(--hair-gold) border-t bg-(--panel) px-4 py-3">
        <span className="font-bold text-sm leading-snug">
          {slug && isPlace ? (
            <Link
              className="transition-colors hover:text-(--gold-hi)"
              href={`/venues/${slug}`}
            >
              {name}
            </Link>
          ) : (
            name
          )}
        </span>
        {mapsUrl ? (
          <a
            className={linkGold}
            href={mapsUrl}
            rel="noreferrer"
            target="_blank"
          >
            Cómo llegar →
          </a>
        ) : null}
      </div>
    </div>
  );
};

export { VenueShowcase };
