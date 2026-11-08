import { HomeChampions } from '@/app/_components/home-champions';
import { HomeAwaitingHero, HomeHero } from '@/app/_components/home-hero';
import { SiteShell } from '@/components/layout/site-shell';
import { dealCardSpecs } from '@/lib/tournament/card-lore';
import {
  getLatestChampions,
  getNextEdition,
  listConfirmedPlayers,
} from '@/server/api/routers/edition';
import { getHistoricalRanking } from '@/server/api/routers/player';
import { db } from '@/server/db';

// Built statically; the hero's countdown and the "live" state depend on
// today's date, so the page re-renders hourly (plus on-demand from edits).
export const revalidate = 3600;

const HomePage = async () => {
  const [nextEdition, champions, ranking] = await Promise.all([
    getNextEdition(db),
    getLatestChampions(db),
    getHistoricalRanking(db),
  ]);
  const confirmedPlayers = nextEdition
    ? await listConfirmedPlayers(db, nextEdition.id)
    : [];
  const confirmedCards = dealCardSpecs(confirmedPlayers);
  const confirmed = confirmedPlayers.map((player, index) => ({
    name: player.name,
    slug: player.slug,
    portrait: confirmedCards[index]?.portrait ?? '',
  }));
  const playersByName = Object.fromEntries(
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

  return (
    <SiteShell>
      {nextEdition ? (
        <HomeHero confirmed={confirmed} edition={nextEdition} />
      ) : (
        <HomeAwaitingHero />
      )}
      {champions ? (
        <div className="bg-(--night-2)">
          <HomeChampions champions={champions} playersByName={playersByName} />
        </div>
      ) : null}
    </SiteShell>
  );
};

export default HomePage;
