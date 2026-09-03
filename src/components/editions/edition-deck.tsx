import Link from 'next/link';

import { ChampionPortrait } from '@/components/editions/champion-portrait';
import { RingGlyph } from '@/components/theme/primitives';
import { formatDateRange } from '@/lib/dates';
import type { EditionView } from '@/lib/tournament/edition-view';

const artStyle = (edition: EditionView) => ({
  backgroundImage: `linear-gradient(180deg, rgba(10,15,12,0.15) 0%, rgba(10,15,12,0.35) 55%, rgba(10,15,12,0.95) 100%), url(/design/scenes/${edition.scene.file}.jpg)`,
  backgroundPosition: edition.scene.position ?? 'center',
  backgroundSize: edition.scene.zoom ? `${edition.scene.zoom}%` : 'cover',
});

/**
 * Short rule between the team and the individual champion: hairlines
 * dying into the dark on both sides, a solitaire ring at the centre —
 * kin to the home's dividers, sized for a card.
 */
const SolitaireRule = () => (
  <svg
    aria-hidden
    className="w-[min(220px,70%)]"
    fill="none"
    role="presentation"
    viewBox="0 0 220 16"
  >
    <defs>
      <linearGradient
        gradientUnits="userSpaceOnUse"
        id="deck-rule-fade"
        x1="0"
        x2="96"
        y1="8"
        y2="8"
      >
        <stop offset="0" stopColor="#c9a557" stopOpacity="0" />
        <stop offset="1" stopColor="#c9a557" stopOpacity="0.8" />
      </linearGradient>
    </defs>
    <path d="M0 8 H96" stroke="url(#deck-rule-fade)" strokeWidth="1" />
    <g transform="matrix(-1 0 0 1 220 0)">
      <path d="M0 8 H96" stroke="url(#deck-rule-fade)" strokeWidth="1" />
    </g>
    <circle
      cx="110"
      cy="8"
      fill="none"
      r="4"
      stroke="#f0d48a"
      strokeWidth="1.2"
    />
    <circle cx="110" cy="3.2" fill="#f4f8fc" r="1.1" />
  </svg>
);

/**
 * One edition as a tall card from the same deck as the players' cards:
 * gold rim, the painted scene as artwork, the year on the name ribbon and
 * the champions' faces where a card keeps its stats.
 */
const DeckCard = ({ edition }: { edition: EditionView }) => {
  const running = edition.status !== 'past';
  const lost = !running && edition.champions.length === 0;
  return (
    <article
      // One height for every card: the tallest footer (four faces, rule and
      // solitaire) fits in 30rem, so cards with less give the room to the art.
      className={`group relative flex h-full min-h-120 flex-col overflow-hidden rounded-2xl border-2 ${
        running
          ? 'border-(--gold) border-dashed'
          : 'border-(--gold)/40 hover:border-(--gold)'
      } bg-(--night-2) shadow-[0_18px_40px_rgba(0,0,0,0.6)] transition-[border-color,transform] hover:-translate-y-1`}
    >
      {/* Inner hairline, like the cards' second rim. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-1.5 z-10 rounded-xl border border-(--gold-hi)/18"
      />
      {/* The artwork takes whatever the footer leaves, never less than a
          portrait's worth; cards in a grid row share one height. */}
      <div
        className="flex min-h-56 flex-1 flex-col justify-between p-5 sm:min-h-64"
        style={artStyle(edition)}
      >
        <header className="flex items-start justify-end">
          {edition.individual && !running ? (
            <span className="grid place-items-center rounded-full bg-(--night)/80 p-1.5">
              <RingGlyph size={14} tone="solitaire" />
            </span>
          ) : null}
        </header>
        <div className="flex flex-col gap-1">
          <Link
            className="d-display d-gold-text font-black text-5xl tracking-wide drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)] transition-opacity hover:opacity-80"
            href={`/editions/${edition.slug}`}
          >
            {edition.label}
          </Link>
          {edition.venueName ? (
            edition.venueSlug && edition.venueIsPlace ? (
              <Link
                className="font-bold font-mono text-(--parchment) text-2xs uppercase tracking-2xl drop-shadow-[0_1px_6px_rgba(0,0,0,0.9)] transition-colors hover:text-(--gold-hi)"
                href={`/venues/${edition.venueSlug}`}
              >
                {edition.venueName}
              </Link>
            ) : (
              <span className="font-bold font-mono text-(--parchment) text-2xs uppercase tracking-2xl drop-shadow-[0_1px_6px_rgba(0,0,0,0.9)]">
                {edition.venueName}
              </span>
            )
          ) : null}
        </div>
      </div>
      {/* The "text box" of the card: champions instead of an ability. */}
      <footer className="flex min-h-29 flex-col justify-center gap-3 border-(--hair-gold) border-t bg-(--panel) px-5 py-5">
        {running ? (
          <>
            {/* The status is a doorway: the council page counts down to it. */}
            <Link
              className="font-mono text-(--gold) text-2xs uppercase tracking-3xl transition-colors hover:text-(--gold-hi)"
              href="/council"
            >
              {edition.status === 'live' ? 'En juego' : 'Próxima edición'} →
            </Link>
            <p className="text-(--faded) text-sm">
              {edition.startsAt && edition.endsAt
                ? formatDateRange(edition.startsAt, edition.endsAt)
                : 'Fecha por anunciar'}
              . Los campeones aún están por forjar.
            </p>
          </>
        ) : lost ? (
          <p className="text-(--faded) text-sm italic">
            Los anales se perdieron en la Cuenta Larga.
          </p>
        ) : (
          <div className="flex flex-col items-center gap-3">
            {/* Team champions centred with room to breathe; the individual
                champion, when there is one, beneath a short solitaire rule. */}
            <ul className="flex flex-wrap justify-center gap-x-5 gap-y-3 lg:gap-x-4">
              {edition.champions.map((champion, i) => (
                <li key={champion.slug ?? `u-${i}`}>
                  <ChampionPortrait champion={champion} size="fluid" />
                </li>
              ))}
            </ul>
            {edition.individual ? (
              <>
                <SolitaireRule />
                <ChampionPortrait
                  champion={edition.individual}
                  size="fluid"
                  solitaire
                />
              </>
            ) : null}
          </div>
        )}
      </footer>
    </article>
  );
};

/**
 * C — "La baraja de las eras". Every edition is a card from the same deck
 * the players are dealt from, laid out as a collection. The scene is the
 * artwork, the year the ribbon, the champions sit in the text box. The
 * grid trades the timeline's line for a wall you can take in at once.
 */
const EditionDeck = ({ editions }: { editions: EditionView[] }) => (
  <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
    {editions.map((edition) => (
      <li key={edition.id}>
        <DeckCard edition={edition} />
      </li>
    ))}
  </ul>
);

export { EditionDeck };
