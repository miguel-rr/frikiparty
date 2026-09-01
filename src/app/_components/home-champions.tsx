import Link from 'next/link';

import {
  panelGold,
  Section,
  SectionHeader,
  tag,
} from '@/components/theme/primitives';
import { PortraitCard } from '@/components/tournament/portrait-card';
import { type CardIdentity, dealCardSpecs } from '@/lib/tournament/card-lore';

type Champions = {
  year: number;
  venueName: string | null;
  venueSlug: string | null;
  venueIsPlace: boolean | null;
  teamChampions: string[];
  individualChampion: string | null;
};

type PlayerCardData = Omit<CardIdentity, 'name'> & { slug?: string };

/** Hall of champions of the latest recorded edition, straight from the DB. */
const HomeChampions = ({
  champions,
  playersByName,
}: {
  champions: Champions;
  playersByName: Record<string, PlayerCardData>;
}) => {
  // One deal for the whole section: no ability/text repeats between cards.
  const cards = dealCardSpecs(
    [
      ...champions.teamChampions,
      ...(champions.individualChampion ? [champions.individualChampion] : []),
    ].map((name) => ({
      name,
      rings: 0,
      individualRings: 0,
      ...playersByName[name],
    })),
  );
  const individualCard = champions.individualChampion
    ? cards[cards.length - 1]
    : undefined;
  const teamCards = champions.individualChampion ? cards.slice(0, -1) : cards;
  return (
    <Section id="champions">
      <SectionHeader
        eyebrowHref={`/editions/${champions.year}`}
        eyebrowText={`Edición ${champions.year}`}
        lead="Los nombres quedan grabados aquí; los anillos, en el escalafón."
        title="Salón de los Campeones"
      />
      <div className="flex flex-col gap-10">
        <div
          className={`${panelGold} d-corners flex flex-col gap-7 p-6 sm:p-8`}
        >
          <div className="d-corner-b" />
          <div className="flex flex-col items-center gap-3 text-center">
            <span className={tag}>Campeones por equipos</span>
            {champions.venueName ? (
              <p className="font-bold font-mono text-(--faded) text-[0.62rem] uppercase tracking-[0.22em]">
                Sede:{' '}
                {champions.venueSlug && champions.venueIsPlace ? (
                  <Link
                    className="transition-colors hover:text-(--gold)"
                    href={`/venues/${champions.venueSlug}`}
                  >
                    {champions.venueName}
                  </Link>
                ) : (
                  champions.venueName
                )}
              </p>
            ) : null}
          </div>
          {/* Never an uneven 3+1: one column, 2+2, or (from lg) a centered row. */}
          <ul className="mx-auto grid max-w-[470px] grid-cols-1 place-items-center gap-5 sm:grid-cols-2 lg:flex lg:max-w-none lg:flex-wrap lg:justify-center sm:[&>li:last-child:nth-child(odd)]:col-span-2">
            {teamCards.map((card) => {
              const slug = playersByName[card.name]?.slug;
              return (
                <li key={card.name}>
                  {slug ? (
                    <Link
                      className="block transition-transform hover:-translate-y-1"
                      href={`/players/${slug}`}
                    >
                      <PortraitCard
                        card={card}
                        className="w-[235px] sm:w-[195px]"
                      />
                    </Link>
                  ) : (
                    <PortraitCard
                      card={card}
                      className="w-[235px] sm:w-[195px]"
                    />
                  )}
                </li>
              );
            })}
          </ul>
          <p className="text-center text-(--faded) text-sm italic">
            El equipo no tenía nombre; nadie olvidará a sus jugadores. Un anillo
            más para cada uno.
          </p>
        </div>
        {individualCard ? (
          <div className="flex flex-col items-center gap-4">
            <span className={tag}>Campeón individual</span>
            {playersByName[individualCard.name]?.slug ? (
              <Link
                className="block transition-transform hover:-translate-y-1"
                href={`/players/${playersByName[individualCard.name]?.slug}`}
              >
                <PortraitCard card={individualCard} className="w-[230px]" />
              </Link>
            ) : (
              <PortraitCard card={individualCard} className="w-[230px]" />
            )}
          </div>
        ) : null}
      </div>
    </Section>
  );
};

export { HomeChampions };
