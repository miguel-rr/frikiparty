'use client';

import Link from 'next/link';

import { SHIELD_PATH } from '@/components/theme/primitives';
import { PortraitCard } from '@/components/tournament/portrait-card';
import { confirmedCountSentence } from '@/lib/council';
import { dealCardSpecs } from '@/lib/tournament/card-lore';
import type { ConfirmedPlayer } from '@/server/api/routers/edition';
import { api } from '@/trpc/react';

/**
 * How long the statically rendered roster is trusted before a focus or
 * remount refetches it. A confirmation from the user menu invalidates
 * the query outright, so it never waits this long.
 */
const ROSTER_STALE_MS = 60 * 1000;

/*
 * Cards dealt on the table: each one leans a touch, no two neighbours the
 * same way, and straightens as it rises on hover. Six tilts cycle so the
 * pattern never reads as a repeat across a long row.
 */
const TILTS = ['-2.2deg', '1.6deg', '-1.1deg', '2.3deg', '-1.7deg', '1.2deg'];

const CINZEL = 'var(--font-cinzel), Georgia, serif';

/**
 * An empty seat at the table: the card's silhouette in a dashed gold
 * hairline, the art window holding the unknown-player shield, and the
 * ribbon reading "Asiento libre". Same footprint as a PortraitCard, so the
 * table keeps its rhythm when the first real card arrives.
 */
const EmptySeat = () => (
  <svg
    aria-hidden="true"
    className="aspect-250/360 w-full"
    viewBox="0 0 250 360"
  >
    <rect
      fill="#100c07"
      fillOpacity="0.55"
      height="352"
      rx="20"
      stroke="url(#dsn-blazon-rim)"
      strokeDasharray="6 7"
      strokeOpacity="0.7"
      strokeWidth="2"
      width="242"
      x="4"
      y="4"
    />
    <rect
      fill="none"
      height="332"
      rx="13"
      stroke="var(--hair-gold)"
      strokeOpacity="0.5"
      width="222"
      x="14"
      y="14"
    />
    <ellipse
      cx="125"
      cy="107"
      fill="url(#dsn-blazon-field)"
      fillOpacity="0.6"
      rx="88"
      ry="74"
      stroke="url(#dsn-blazon-rim)"
      strokeDasharray="5 6"
      strokeOpacity="0.7"
      strokeWidth="3"
    />
    <g opacity="0.85" transform="translate(88 64) scale(0.75)">
      <path
        d={SHIELD_PATH}
        fill="url(#dsn-blazon-field)"
        stroke="url(#dsn-blazon-rim)"
        strokeWidth="3.5"
      />
      <text
        dominantBaseline="central"
        fill="url(#dsn-blazon-emblem)"
        fontFamily={CINZEL}
        fontSize="52"
        fontWeight="900"
        textAnchor="middle"
        x="50"
        y="54"
      >
        ?
      </text>
    </g>
    <path
      d="M30,204 C72,188 178,188 220,204 L214,224 C172,210 78,210 36,224 Z"
      fill="none"
      stroke="url(#dsn-blazon-rim)"
      strokeOpacity="0.7"
      strokeWidth="2"
    />
    <text
      fill="#c9a557"
      fontFamily={CINZEL}
      fontSize="13"
      fontWeight="700"
      letterSpacing="2"
      opacity="0.9"
      textAnchor="middle"
      x="125"
      y="212"
    >
      ASIENTO LIBRE
    </text>
    <rect
      fill="none"
      height="86"
      rx="9"
      stroke="var(--hair-gold)"
      strokeDasharray="5 6"
      strokeOpacity="0.6"
      strokeWidth="1.5"
      width="192"
      x="29"
      y="238"
    />
    <circle
      cx="32"
      cy="36"
      fill="none"
      r="25"
      stroke="var(--hair-gold)"
      strokeDasharray="4 5"
      strokeOpacity="0.6"
      strokeWidth="1.5"
    />
    <circle
      cx="218"
      cy="36"
      fill="none"
      r="23"
      stroke="var(--hair-gold)"
      strokeDasharray="4 5"
      strokeOpacity="0.6"
      strokeWidth="1.5"
    />
  </svg>
);

/**
 * The table before anyone sits: three empty seats fading to the right
 * (two on phones), and a nudge — the call is answered from the player
 * menu, one click away.
 */
const EmptyTable = () => (
  <>
    <ul className="flex w-full flex-wrap justify-center gap-x-3 sm:gap-x-5">
      {['opacity-90', 'opacity-55', 'opacity-30 max-sm:hidden'].map(
        (fade, index) => (
          <li
            className={`w-[calc(50%-0.375rem)] max-w-44 rotate-(--tilt) sm:w-40 lg:w-44 ${fade}`}
            key={fade}
            style={{ ['--tilt' as string]: TILTS[index] }}
          >
            <EmptySeat />
          </li>
        ),
      )}
    </ul>
    <p className="max-w-[46ch] text-center text-(--faded) text-sm italic">
      Los primeros asientos esperan. Confirma el tuyo desde tu menú de jugador.
    </p>
  </>
);

/**
 * The confirmed players of the upcoming edition, as their own cards. A
 * wrapped, centred row so any count sits well: one card alone in the
 * middle, a full hand of five per row from lg, and a last row that
 * centres itself whatever is left over. Two per row on phones. With no
 * one confirmed yet, the table shows its empty seats instead.
 *
 * The page is static: the roster hydrates from the build-time list and
 * then lives on the tRPC query, so confirming from the menu (which
 * invalidates it) redraws the table at once, no regeneration needed.
 */
const ConfirmedRoster = ({
  editionId,
  initialPlayers,
}: {
  editionId: string;
  initialPlayers: ConfirmedPlayer[];
}) => {
  const { data: players } = api.edition.confirmedPlayers.useQuery(
    { editionId },
    { initialData: initialPlayers, staleTime: ROSTER_STALE_MS },
  );
  const cards = dealCardSpecs(players);
  const slugByName = new Map(players.map((p) => [p.name, p.slug]));
  return (
    <section
      aria-labelledby="council-roster"
      className="flex w-full flex-col items-center gap-7"
    >
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="font-bold font-mono text-(--gold) text-2xs uppercase tracking-2xl">
          {players.length === 0
            ? 'La llamada está lanzada'
            : 'Han respondido a la llamada'}
        </span>
        <h2
          className="d-display text-(--silver) text-2xl uppercase tracking-3xl [text-shadow:0_0_14px_rgba(190,205,220,0.35)] sm:text-3xl"
          id="council-roster"
        >
          Los aspirantes
        </h2>
        <p className="max-w-[46ch] text-(--faded) text-sm">
          {players.length === 0
            ? 'Aún nadie ha confirmado su asiento en el Concilio.'
            : confirmedCountSentence(
                players.length,
                'su asiento en el Concilio.',
              )}
        </p>
      </div>
      {players.length === 0 ? <EmptyTable /> : null}
      <ul className="flex w-full flex-wrap justify-center gap-x-3 gap-y-5 sm:gap-x-5 sm:gap-y-7">
        {cards.map((card, index) => {
          const slug = slugByName.get(card.name);
          const body = <PortraitCard card={card} className="w-full" />;
          return (
            <li
              className="w-[calc(50%-0.375rem)] max-w-44 rotate-(--tilt) transition-transform duration-300 hover:z-10 hover:-translate-y-2 hover:rotate-0 sm:w-40 lg:w-44"
              key={card.name}
              style={{ ['--tilt' as string]: TILTS[index % TILTS.length] }}
            >
              {slug ? (
                <Link
                  className="block drop-shadow-[0_14px_20px_rgba(0,0,0,0.55)]"
                  href={`/players/${slug}`}
                >
                  {body}
                </Link>
              ) : (
                body
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
};

export { ConfirmedRoster };
