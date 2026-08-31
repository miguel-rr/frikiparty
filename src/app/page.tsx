import { HomeChampions } from '@/app/_components/home-champions';
import { HomeAwaitingHero, HomeHero } from '@/app/_components/home-hero';
import { SiteShell } from '@/components/layout/site-shell';
import { api } from '@/trpc/server';

const HomePage = async () => {
  const [nextEdition, champions, ranking] = await Promise.all([
    api.edition.next(),
    api.edition.latestChampions(),
    api.player.historicalRanking(),
  ]);
  const playersByName = Object.fromEntries(
    ranking.map((player) => [
      player.name,
      {
        rings: player.rings,
        individualRings: player.individualRings,
        cardPortrait: player.cardPortrait,
        cardLore: player.cardLore,
      },
    ]),
  );

  return (
    <SiteShell>
      {nextEdition ? <HomeHero edition={nextEdition} /> : <HomeAwaitingHero />}
      {champions ? (
        <div className="bg-(--night-2)">
          <HomeChampions champions={champions} playersByName={playersByName} />
        </div>
      ) : null}
    </SiteShell>
  );
};

export default HomePage;
