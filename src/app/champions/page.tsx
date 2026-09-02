import type { Metadata } from 'next';
import Link from 'next/link';

import { RingVeil } from '@/app/champions/_components/ring-veil';
import { TreasuryBackdrop } from '@/app/champions/_components/treasury-backdrop';
import { BearersFan } from '@/components/champions/bearers-fan';
import { SiteShell } from '@/components/layout/site-shell';
import {
  RingGlyph,
  Section,
  SectionHeader,
} from '@/components/theme/primitives';
import { PortraitCard } from '@/components/tournament/portrait-card';
import { formatDateRange } from '@/lib/dates';
import { type CardIdentity, dealCardSpecs } from '@/lib/tournament/card-lore';
import {
  getEditionDetail,
  getLatestChampions,
} from '@/server/api/routers/edition';
import { getHistoricalRanking } from '@/server/api/routers/player';
import { db } from '@/server/db';

export const metadata: Metadata = { title: 'Los Portadores — Frikiparty' };

const COUNT_WORDS: Record<number, string> = {
  2: 'DOS',
  3: 'TRES',
  4: 'CUATRO',
  5: 'CINCO',
};

const ChampionsPage = async () => {
  const champions = await getLatestChampions(db);
  const [edition, ranking] = await Promise.all([
    champions ? getEditionDetail(db, champions.editionSlug) : null,
    getHistoricalRanking(db),
  ]);

  if (!champions) {
    return (
      <SiteShell backdrop={<TreasuryBackdrop />}>
        <main>
          <Section id="champions">
            <SectionHeader
              eyebrowText="El trono aguarda"
              title="Los Portadores del Anillo"
            />
          </Section>
        </main>
      </SiteShell>
    );
  }

  const playersByName: Record<
    string,
    Omit<CardIdentity, 'name' | 'rings'> & { rings: number; slug?: string }
  > = Object.fromEntries(
    ranking.map((player, index) => [
      player.name,
      {
        slug: player.slug,
        rings: player.rings,
        individualRings: player.individualRings,
        cardPortrait: player.cardPortrait,
        cardAbility: player.cardAbility,
        cardAbilityText: player.cardAbilityText,
        isLeader: index === 0,
      },
    ]),
  );

  // One deal for the page so no generic line repeats between cards.
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

  const countWord = COUNT_WORDS[teamCards.length] ?? String(teamCards.length);

  return (
    <SiteShell backdrop={<TreasuryBackdrop />}>
      <main>
        <Section id="champions">
          <SectionHeader
            eyebrowHref={`/editions/${champions.editionSlug}`}
            eyebrowText={`Edición ${champions.year}`}
            title="Los Portadores del Anillo"
          />
          <div className="flex flex-col gap-12">
            {/* The bearers' hand raised against the night: no frame,
                only light — a colossal halo and the Ring behind the fan. */}
            <div className="relative isolate flex flex-col items-center gap-7 pt-10 pb-2">
              <RingVeil />
              {/* The One Ring itself, photographic and faint, behind the
                  hand: screen-blended so only the metal glows through. */}
              {/* biome-ignore lint/performance/noImgElement: decorative local asset, no next/image needed */}
              <img
                alt=""
                aria-hidden="true"
                className="pointer-events-none absolute top-[52%] left-1/2 -z-10 hidden w-[min(660px,110vw)] max-w-none -translate-x-1/2 -translate-y-1/2 opacity-30 mix-blend-screen [mask-image:radial-gradient(circle,black_48%,transparent_70%)] lg:block"
                src="/icon-512.png"
              />
              {/* The inscription, bent like the writing on the Ring */}
              <svg
                aria-hidden="true"
                className="mx-auto hidden w-full max-w-[680px] text-(--gold) lg:-mb-16 lg:block"
                role="presentation"
                viewBox="0 0 680 110"
              >
                <path
                  d="M30 104 Q340 6 650 104"
                  fill="none"
                  id="dsn-bearers-arc"
                />
                <text
                  fill="var(--gold-hi)"
                  fontFamily="var(--font-cinzel), Georgia, serif"
                  fontSize="15"
                  fontWeight="700"
                  letterSpacing="3.5"
                  paintOrder="stroke"
                  stroke="#0a0f0c"
                  strokeWidth="4"
                >
                  <textPath
                    href="#dsn-bearers-arc"
                    startOffset="50%"
                    textAnchor="middle"
                  >
                    · {countWord} NOMBRES PARA GOBERNARLOS A TODOS ·
                  </textPath>
                </text>
              </svg>
              <BearersFan
                cards={teamCards}
                slugByName={Object.fromEntries(
                  Object.entries(playersByName).map(([name, data]) => [
                    name,
                    data.slug,
                  ]),
                )}
              />
              {/* The ground the hand casts its shadow on */}
              <span
                aria-hidden="true"
                className="pointer-events-none -mt-8 h-8 w-3/5 rounded-full bg-black/60 blur-2xl"
              />
              <div
                aria-hidden
                className="d-divider hidden w-full max-w-[520px] px-6 lg:block"
              />
              {edition?.venueName ? (
                <p className="hidden font-bold font-mono text-(--faded) text-[0.62rem] uppercase tracking-[0.22em] lg:block">
                  {edition.venueSlug && edition.venueIsPlace ? (
                    <Link
                      className="transition-colors hover:text-(--gold)"
                      href={`/venues/${edition.venueSlug}`}
                    >
                      {edition.venueName}
                    </Link>
                  ) : (
                    edition.venueName
                  )}
                  {edition.startsAt && edition.endsAt ? (
                    <> · {formatDateRange(edition.startsAt, edition.endsAt)}</>
                  ) : null}
                </p>
              ) : null}
            </div>
            {/* The solitaire bearer: one still figure in moonlight,
                the cold silver answer to the golden fan above. */}
            {individualCard ? (
              <div className="relative isolate flex flex-col items-center gap-7 py-4">
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute top-[54%] left-1/2 -z-10 hidden size-[min(560px,110vw)] -translate-x-1/2 -translate-y-1/2 rounded-full lg:block"
                  style={{
                    backgroundImage:
                      'radial-gradient(circle, rgba(220,230,238,0.1) 0%, rgba(220,230,238,0.03) 45%, transparent 70%)',
                  }}
                />
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute top-[52%] left-1/2 -z-10 hidden -translate-x-1/2 -translate-y-1/2 opacity-[0.06] lg:block"
                >
                  <RingGlyph size={400} tone="solitaire" />
                </span>
                <p className="d-display flex items-center gap-4 text-center font-bold text-[#dce6ee] text-[0.8rem] uppercase tracking-[0.28em] [text-shadow:0_0_12px_rgba(190,205,220,0.35)]">
                  <span
                    aria-hidden="true"
                    className="hidden h-px w-12 bg-[#aeb9c2]/40 sm:block"
                  />
                  · Y un nombre para alzarse solo ·
                  <span
                    aria-hidden="true"
                    className="hidden h-px w-12 bg-[#aeb9c2]/40 sm:block"
                  />
                </p>
                {playersByName[individualCard.name]?.slug ? (
                  <Link
                    className="block rotate-[-2deg] drop-shadow-[0_16px_24px_rgba(0,0,0,0.6)] transition-transform duration-300 hover:translate-y-[-10px] hover:rotate-0"
                    href={`/players/${playersByName[individualCard.name]?.slug}`}
                  >
                    <PortraitCard card={individualCard} className="w-[245px]" />
                  </Link>
                ) : (
                  <PortraitCard card={individualCard} className="w-[245px]" />
                )}
              </div>
            ) : null}
            {/* Mobile colophon: the gathering's seal closes the page. */}
            {edition?.venueName ? (
              <div className="flex flex-col items-center gap-4 lg:hidden">
                <div
                  aria-hidden
                  className="d-divider w-full max-w-[420px] px-6"
                />
                <div className="flex flex-col items-center gap-1.5 text-center">
                  {edition.venueSlug && edition.venueIsPlace ? (
                    <Link
                      className="d-display d-gold-text font-black text-xl tracking-[0.08em] transition-opacity hover:opacity-80"
                      href={`/venues/${edition.venueSlug}`}
                    >
                      {edition.venueName}
                    </Link>
                  ) : (
                    <span className="d-display d-gold-text font-black text-xl tracking-[0.08em]">
                      {edition.venueName}
                    </span>
                  )}
                  {edition.startsAt && edition.endsAt ? (
                    <span className="font-bold font-mono text-(--faded) text-[0.62rem] uppercase tracking-[0.24em]">
                      {formatDateRange(edition.startsAt, edition.endsAt)}
                    </span>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        </Section>
      </main>
    </SiteShell>
  );
};

export default ChampionsPage;
