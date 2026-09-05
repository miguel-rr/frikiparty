import Link from 'next/link';

import { ConfirmedRoster } from '@/components/council/confirmed-roster';
import { DurinDoor } from '@/components/council/durin-door';
import { RingDivider } from '@/components/theme/ornament-dividers';
import { tag } from '@/components/theme/primitives';
import { VenueShowcase } from '@/components/venue/venue-showcase';
import { openingInstant } from '@/lib/countdown';
import { formatDateRange } from '@/lib/dates';
import type {
  getNextEdition,
  listConfirmedPlayers,
} from '@/server/api/routers/edition';

type NextEdition = Awaited<ReturnType<typeof getNextEdition>>;
type ConfirmedPlayers = Awaited<ReturnType<typeof listConfirmedPlayers>>;

/**
 * The Council's waiting state: the Doors of Durin with the countdown, who
 * has answered the call and the venue. Shared by /council (as it ships)
 * and /live (the Council to come, once a tournament is under way).
 */
const CouncilDoor = ({
  edition,
  confirmedPlayers,
}: {
  edition: NextEdition;
  confirmedPlayers: ConfirmedPlayers;
}) => {
  // The fire is lit at 14:00 Madrid time on day one.
  const target = edition?.startsAt ? openingInstant(edition.startsAt) : null;
  return (
    <>
      {/* The door and its dates: one block, the edition name tucked
        right under the date range and leading to its page. */}
      <div className="flex flex-col items-center gap-8">
        <DurinDoor target={target} />
        {edition?.startsAt && edition.endsAt ? (
          <span className="d-display -mt-3 text-(--silver) text-xl uppercase tracking-3xl [text-shadow:0_0_14px_rgba(190,205,220,0.35)] sm:-mt-4 sm:text-2xl">
            {formatDateRange(edition.startsAt, edition.endsAt, {
              withYear: false,
            })}
          </span>
        ) : null}
        {edition ? (
          <Link
            className="-mt-5 font-bold font-mono text-(--gold) text-base uppercase tracking-5xl transition-colors hover:text-(--gold-hi) sm:-mt-6 sm:text-xl"
            href={`/editions/${edition.slug}`}
          >
            Edición {edition.year}
          </Link>
        ) : (
          <span className={tag}>El Concilio · En espera</span>
        )}
        {!edition?.startsAt ? (
          <p className="max-w-[46ch] text-center text-(--faded)">
            El concilio aún no ha convocado la próxima reunión. Cuando las
            estrellas marquen fecha, la cuenta atrás comenzará aquí.
          </p>
        ) : null}
      </div>

      {/* Who has answered the call, before the venue: people first,
        then the place — each behind the home's ring threshold. */}
      {edition?.startsAt ? (
        <>
          <RingDivider />
          <ConfirmedRoster
            editionId={edition.id}
            initialPlayers={confirmedPlayers}
          />
          {edition.venueName ? (
            <>
              <RingDivider />
              <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
                <span className="text-center font-bold font-mono text-(--gold) text-2xs uppercase tracking-2xl">
                  La sede
                </span>
                <VenueShowcase
                  isPlace={edition.venueIsPlace}
                  mapsEmbedQuery={edition.venueMapsEmbedQuery}
                  mapsUrl={edition.venueMapsUrl}
                  name={edition.venueName}
                  photoUrl={edition.venuePhotoUrl}
                  slug={edition.venueSlug}
                />
              </div>
            </>
          ) : null}
        </>
      ) : null}
    </>
  );
};

export { CouncilDoor };
