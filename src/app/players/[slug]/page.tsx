import { notFound } from 'next/navigation';

import { PlayerProfile } from '@/app/players/[slug]/_components/player-profile';
import { SiteShell } from '@/components/layout/site-shell';
import {
  Gem,
  panel,
  RingGlyph,
  rarityForPosition,
  Section,
  tag,
} from '@/components/theme/primitives';
import { siteFlags } from '@/lib/site-flags';
import {
  cardSpecFor,
  dealCardSpecs,
  hasPinnedLore,
} from '@/lib/tournament/card-lore';
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
    {children}
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
    cardLore: player.cardLore,
  };
  const card = dealCardSpecs([identity])[0] ?? cardSpecFor(identity);

  return (
    <SiteShell>
      <main>
        <Section id="player">
          <div className="mx-auto w-full max-w-4xl">
            <PlayerProfile
              bio={player.bio}
              card={card}
              cardLore={player.cardLore}
              cardPortrait={player.cardPortrait}
              id={player.id}
              individualRings={player.individualRings}
              name={player.name}
              ownerUserId={player.ownerUserId}
              pinnedLore={hasPinnedLore(player.name)}
              rings={player.rings}
            >
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
              {player.titles.length > 0 ? (
                <div className="flex flex-col gap-3">
                  <span className={tag}>Palmarés</span>
                  <ul
                    className={`${panel} flex flex-col divide-y divide-(--hair)`}
                  >
                    {player.titles.map((title) => (
                      <li
                        className="flex flex-wrap items-center gap-3 px-4 py-3"
                        key={`${title.year}-${title.order}-${title.type}`}
                      >
                        <span className="d-display w-20 font-black text-(--gold-hi)">
                          {editionLabel(title)}
                        </span>
                        <span className="flex items-center gap-1.5 font-mono text-(--faded) text-[0.62rem] uppercase tracking-[0.18em]">
                          {title.type === 'team' ? (
                            <>
                              <RingGlyph size={13} /> Por equipos
                            </>
                          ) : (
                            <>
                              <RingGlyph size={11} tone="solitaire" />{' '}
                              Individual
                            </>
                          )}
                        </span>
                        <span className="ml-auto text-(--faded) text-sm">
                          {title.game ?? 'AotR/BotME'}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </PlayerProfile>
          </div>
        </Section>
      </main>
    </SiteShell>
  );
};

export default PlayerPage;
