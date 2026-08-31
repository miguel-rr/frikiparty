import Link from 'next/link';

import { HomeChampions } from '@/app/_components/home-champions';
import { HomeAwaitingHero, HomeHero } from '@/app/_components/home-hero';
import { UserMenu } from '@/app/_components/user-menu';
import { TopNav } from '@/components/layout/top-nav';
import { ParallaxBackground } from '@/components/theme/parallax-bg';
import { BlazonDefs, btn, Footer } from '@/components/theme/primitives';
import { siteFlags } from '@/lib/site-flags';
import { getSession } from '@/server/better-auth/server';
import { api } from '@/trpc/server';

const NAV_LINKS = [
  { href: '/ranking', text: 'Ranking' },
  { href: '/ediciones', text: 'Ediciones' },
  { href: '/pifouds', text: 'El Pifouds' },
];

const HomePage = async () => {
  const [nextEdition, champions, ranking, session] = await Promise.all([
    api.edition.next(),
    api.edition.latestChampions(),
    api.player.historicalRanking(),
    getSession(),
  ]);
  const ringsByName = Object.fromEntries(
    ranking.map((player) => [
      player.name,
      player.rings + player.individualRings,
    ]),
  );

  return (
    <div className="theme-night text-[1.0625rem] leading-relaxed">
      <BlazonDefs />
      <ParallaxBackground />
      <TopNav
        authSlot={
          siteFlags.auth ? (
            session ? (
              <UserMenu label={session.user.name || session.user.email} />
            ) : (
              <Link
                className={`${btn.primary} px-4 py-1.5 text-sm`}
                href="/login"
              >
                Entrar
              </Link>
            )
          ) : null
        }
        links={siteFlags.navigation ? NAV_LINKS : []}
      />
      {nextEdition ? <HomeHero edition={nextEdition} /> : <HomeAwaitingHero />}
      {champions ? (
        <div className="bg-(--night-2)">
          <HomeChampions champions={champions} ringsByName={ringsByName} />
        </div>
      ) : null}
      <Footer />
    </div>
  );
};

export default HomePage;
