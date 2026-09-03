import Link from 'next/link';

import { ChampionPortrait } from '@/components/editions/champion-portrait';
import { tag } from '@/components/theme/primitives';
import { formatDateRange } from '@/lib/dates';
import type { EditionView } from '@/lib/tournament/edition-view';

const eyebrow = 'font-mono text-(--faded) text-2xs uppercase tracking-2xl';

/**
 * The list view: one line per edition, the whole chronicle on a screen.
 * Year and venue on the left, the champions' faces in a row, the
 * individual champion pinned right. Same information as the cards, a
 * fraction of the scroll.
 */
const EditionList = ({ editions }: { editions: EditionView[] }) => (
  <ol className="divide-y divide-(--hair) border-(--hair-gold) border-y">
    {editions.map((edition) => {
      const running = edition.status !== 'past';
      return (
        <li
          // The champions column is exactly four 4rem cells, so the rule
          // before the individual champion sits one column gap after the
          // fourth face and one padding before the solitaire: equidistant.
          className="grid grid-cols-[6.5rem_1fr] gap-x-3 py-4 transition-colors hover:bg-(--gold)/3 sm:grid-cols-[10rem_16rem_1fr] sm:items-center sm:gap-x-6"
          key={edition.id}
        >
          <div className="flex flex-col gap-0.5">
            <Link
              className="d-display d-gold-text font-black text-xl tracking-wide transition-opacity hover:opacity-80 sm:text-2xl"
              href={`/editions/${edition.slug}`}
            >
              {edition.label}
            </Link>
            {edition.venueName ? (
              edition.venueSlug && edition.venueIsPlace ? (
                <Link
                  className={`${eyebrow} transition-colors hover:text-(--gold)`}
                  href={`/venues/${edition.venueSlug}`}
                >
                  {edition.venueName}
                </Link>
              ) : (
                <span className={eyebrow}>{edition.venueName}</span>
              )
            ) : null}
          </div>
          <div
            className={`flex flex-wrap items-center gap-x-4 gap-y-2 ${running ? 'sm:col-span-2' : ''}`}
          >
            {/* Faces sit in fixed 4rem cells so every row's portraits share
                the same vertical lines, whatever the names measure. */}
            {running ? (
              <>
                {/* The status is a doorway: the council page counts down to it. */}
                <Link
                  className={`${tag} transition-colors hover:border-(--gold) hover:text-(--gold-hi)`}
                  href="/council"
                >
                  {edition.status === 'live' ? 'En juego' : 'Próxima edición'}
                </Link>
                {edition.startsAt && edition.endsAt ? (
                  <span className="text-(--faded) text-sm">
                    {formatDateRange(edition.startsAt, edition.endsAt)}
                  </span>
                ) : null}
              </>
            ) : edition.champions.length > 0 ? (
              <ul className="grid grid-cols-[repeat(4,3.5rem)] sm:grid-cols-[repeat(4,4rem)]">
                {edition.champions.map((champion, index) => (
                  <li
                    className="flex w-14 justify-center sm:w-16"
                    key={champion.slug ?? `u-${index}`}
                  >
                    <ChampionPortrait champion={champion} size="sm" />
                  </li>
                ))}
              </ul>
            ) : (
              <span className="text-(--faded) text-sm italic">
                Los anales se perdieron en la Cuenta Larga.
              </span>
            )}
          </div>
          {edition.individual ? (
            <div className="col-start-2 mt-3 flex items-center sm:col-start-3 sm:mt-0 sm:border-(--hair-gold) sm:border-l sm:pl-6">
              <span className="flex w-14 justify-center sm:w-16">
                <ChampionPortrait
                  champion={edition.individual}
                  size="sm"
                  solitaire
                />
              </span>
            </div>
          ) : null}
        </li>
      );
    })}
  </ol>
);

export { EditionList };
