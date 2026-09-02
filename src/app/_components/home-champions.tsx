import Link from 'next/link';

import { BearersFan } from '@/components/champions/bearers-fan';
import {
  LoneStarDivider,
  RingDivider,
} from '@/components/theme/ornament-dividers';
import { Section, SectionHeader } from '@/components/theme/primitives';
import { PortraitCard } from '@/components/tournament/portrait-card';
import { type CardIdentity, dealCardSpecs } from '@/lib/tournament/card-lore';

type Champions = {
  year: number;
  editionSlug: string;
  venueName: string | null;
  venueSlug: string | null;
  venueIsPlace: boolean | null;
  teamChampions: string[];
  individualChampion: string | null;
};

type PlayerCardData = Omit<CardIdentity, 'name'> & { slug?: string };

/**
 * The antechamber to /champions: the reigning fan holds the spotlight over
 * a faint photographic Ring, the edition info shrinks to the eyebrow, the
 * solitaire champion gets a one-line mention, and a gilded door invites
 * into the full hall.
 */
const HomeChampions = ({
  champions,
  playersByName,
}: {
  champions: Champions;
  playersByName: Record<string, PlayerCardData>;
}) => {
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
  const slugByName = Object.fromEntries(
    Object.entries(playersByName).map(([name, data]) => [name, data.slug]),
  );
  const soloSlug = champions.individualChampion
    ? playersByName[champions.individualChampion]?.slug
    : undefined;
  return (
    <Section id="champions">
      <RingDivider />
      <SectionHeader title="Los Portadores del Anillo" />
      <div className="flex flex-col items-center gap-9">
        <div className="relative isolate w-full">
          {/* The Ring, faint behind the hand */}
          {/* biome-ignore lint/performance/noImgElement: decorative local asset, no next/image needed */}
          <img
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-1/2 -z-10 w-[min(480px,105vw)] max-w-none -translate-x-1/2 -translate-y-1/2 opacity-[0.07] mix-blend-screen [mask-image:radial-gradient(circle,black_48%,transparent_70%)] lg:opacity-[0.12]"
            src="/icon-512.png"
          />
          <BearersFan cards={teamCards} compact slugByName={slugByName} />
        </div>
        {individualCard ? <LoneStarDivider /> : null}
        {individualCard ? (
          <div className="flex flex-col items-center gap-5">
            {soloSlug ? (
              <Link
                className="block rotate-[-2deg] drop-shadow-[0_14px_20px_rgba(0,0,0,0.55)] transition-transform duration-300 hover:translate-y-[-8px] hover:rotate-0"
                href={`/players/${soloSlug}`}
              >
                <PortraitCard card={individualCard} className="w-[190px]" />
              </Link>
            ) : (
              <PortraitCard card={individualCard} className="w-[190px]" />
            )}
          </div>
        ) : null}
      </div>
    </Section>
  );
};

export { HomeChampions };
