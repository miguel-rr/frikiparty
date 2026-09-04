import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Fragment } from 'react';

import { PlayerProfile } from '@/app/players/[slug]/_components/player-profile';
import { SiteShell } from '@/components/layout/site-shell';
import { ArchiveSection } from '@/components/media/archive-section';
import {
  Gem,
  panel,
  RingGlyph,
  rarityForPosition,
  Section,
  tag,
} from '@/components/theme/primitives';
import { siteFlags } from '@/lib/site-flags';
import { cardSpecFor, dealCardSpecs } from '@/lib/tournament/card-lore';
import { getPlayerProfile } from '@/server/api/routers/player';
import { db } from '@/server/db';
import { player as playerTable } from '@/server/db/schema';

type PlayerPageProps = {
  params: Promise<{ slug: string }>;
};

/**
 * A couple dozen players: build every profile up front and refresh via
 * revalidatePath from player.update. New slugs still render on demand.
 */
export const generateStaticParams = async () =>
  (await db.select({ slug: playerTable.slug }).from(playerTable)).map(
    ({ slug }) => ({ slug }),
  );

type Title = {
  year: number;
  order: number;
  game: string | null;
  type: 'team' | 'individual';
};

const ROMAN_ORDINALS = ['I', 'II', 'III', 'IV', 'V'] as const;

const editionLabel = (title: Title) =>
  title.order > 1
    ? `${title.year} · ${ROMAN_ORDINALS[title.order - 1] ?? title.order}`
    : String(title.year);

const StatRow = ({
  children,
  text,
}: {
  children: React.ReactNode;
  text: string;
}) => (
  <div className="flex items-center gap-3">
    {/* Fixed icon slot so every line of text starts at the same x. */}
    <span className="flex w-5 shrink-0 justify-center">{children}</span>
    <span className="text-(--faded) text-sm">{text}</span>
  </div>
);

const PlayerPage = async ({ params }: PlayerPageProps) => {
  if (!siteFlags.playersPage) {
    notFound();
  }
  const { slug } = await params;

  const player = await getPlayerProfile(db, slug);
  if (!player) {
    notFound();
  }

  // A one-card deal: fixed choices (or Richar's pin) hold; otherwise the
  // lore rotates on every visit, like drawing a fresh card from the deck.
  const identity = {
    name: player.name,
    rings: player.rings,
    individualRings: player.individualRings,
    cardPortrait: player.cardPortrait,
    cardAbility: player.cardAbility,
    cardAbilityText: player.cardAbilityText,
    isLeader: player.position === 1,
  };
  const card = dealCardSpecs([identity])[0] ?? cardSpecFor(identity);

  return (
    <SiteShell>
      <main>
        <Section id="player">
          <div className="w-full">
            <PlayerProfile
              bio={player.bio}
              card={card}
              cardAbility={player.cardAbility}
              cardAbilityText={player.cardAbilityText}
              cardPortrait={player.cardPortrait}
              id={player.id}
              individualRings={player.individualRings}
              name={player.name}
              rings={player.rings}
              slug={player.slug}
              stats={
                <div className="flex flex-col gap-3">
                  {player.position !== null ? (
                    <StatRow
                      text={`Nº ${player.position} del escalafón histórico`}
                    >
                      <Gem rarity={rarityForPosition(player.position)} />
                    </StatRow>
                  ) : null}
                  <StatRow
                    text={`${player.rings} ${player.rings === 1 ? 'anillo' : 'anillos'} por equipos`}
                  >
                    <RingGlyph size={15} />
                  </StatRow>
                  <StatRow
                    text={`${player.individualRings} ${player.individualRings === 1 ? 'anillo individual' : 'anillos individuales'}`}
                  >
                    <RingGlyph size={12} tone="solitaire" />
                  </StatRow>
                </div>
              }
            >
              {player.titles.length > 0 ? (
                <div className="flex flex-col gap-3">
                  <span className={tag}>Palmarés</span>
                  <ul
                    className={`${panel} flex flex-col divide-y divide-(--hair)`}
                  >
                    {player.titles.map((title) => (
                      <li
                        className="flex flex-col gap-2 px-4 py-4 sm:flex-row sm:items-center sm:gap-4 sm:py-3"
                        key={`${title.year}-${title.order}-${title.type}`}
                      >
                        {/* Year and venue travel together on the left; on
                            phones the game shares the year's line. */}
                        <div className="flex items-baseline justify-between gap-3 sm:block sm:w-40 sm:shrink-0">
                          <div className="flex min-w-0 flex-col gap-0.5">
                            <Link
                              className="d-display font-black text-(--gold-hi) transition-colors hover:text-(--gold)"
                              href={`/editions/${title.editionSlug}${
                                title.type === 'individual' ? '#individual' : ''
                              }`}
                            >
                              {editionLabel(title)}
                            </Link>
                            {title.venueName ? (
                              <span className="text-(--faded) text-xs italic leading-snug">
                                {title.venueSlug && title.venueIsPlace ? (
                                  <Link
                                    className="transition-colors hover:text-(--gold-hi)"
                                    href={`/venues/${title.venueSlug}`}
                                  >
                                    {title.venueName}
                                  </Link>
                                ) : (
                                  title.venueName
                                )}
                              </span>
                            ) : null}
                          </div>
                          <span className="shrink-0 text-(--faded) text-xs sm:hidden">
                            {title.game ?? 'AotR/BotME'}
                          </span>
                        </div>
                        <span className="flex min-w-0 items-start gap-1.5 font-bold font-mono text-(--parchment) text-2xs uppercase leading-relaxed tracking-2xl sm:items-center">
                          {title.type === 'team' ? (
                            <>
                              <span className="mt-0.5 shrink-0 sm:mt-0">
                                <RingGlyph size={13} />
                              </span>{' '}
                              <span>
                                {title.members.map((member, index) => (
                                  <Fragment
                                    key={`${title.year}-${title.order}-${member.slug ?? index}`}
                                  >
                                    {index > 0 ? ' · ' : null}
                                    {member.slug ? (
                                      <Link
                                        className="transition-colors hover:text-(--gold-hi)"
                                        href={`/players/${member.slug}`}
                                      >
                                        {member.name === '???'
                                          ? 'Desconocido'
                                          : member.name}
                                      </Link>
                                    ) : (
                                      'Desconocido'
                                    )}
                                  </Fragment>
                                ))}
                              </span>
                            </>
                          ) : (
                            <>
                              <span className="mt-0.75 shrink-0 sm:mt-0">
                                <RingGlyph size={11} tone="solitaire" />
                              </span>{' '}
                              En solitario
                            </>
                          )}
                        </span>
                        <span className="ml-auto hidden shrink-0 text-(--faded) text-sm sm:block">
                          {title.game ?? 'AotR/BotME'}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </PlayerProfile>
          </div>
          {/* Extra air above Los Archivos: the palmarés sits inside the
              profile block, so the section gap alone reads too tight. */}
          <div className="mt-6 sm:mt-10">
            <ArchiveSection
              subject={`de ${player.name}`}
              target={{ playerId: player.id }}
            />
          </div>
        </Section>
      </main>
    </SiteShell>
  );
};

export default PlayerPage;
