import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { SiteShell } from '@/components/layout/site-shell';
import { LoneStarDivider } from '@/components/theme/ornament-dividers';
import { Section, SectionHeader } from '@/components/theme/primitives';
import { HonorPodium } from '@/components/tournament/honor-podium';
import {
  RankingTable,
  RingLegend,
} from '@/components/tournament/ranking-table';
import { siteFlags } from '@/lib/site-flags';
import { cardSpecFor } from '@/lib/tournament/card-lore';
import {
  getHistoricalRanking,
  listRingTitles,
} from '@/server/api/routers/player';
import { db } from '@/server/db';

export const metadata: Metadata = { title: 'Ranking — Frikiparty' };

const RankingPage = async () => {
  if (!siteFlags.rankingPage) {
    notFound();
  }
  const [ranking, ringTitles] = await Promise.all([
    getHistoricalRanking(db),
    listRingTitles(db),
  ]);
  const rows = ranking.map((player) => ({
    ...player,
    titles: ringTitles.get(player.id) ?? [],
    // The same painted face the player wears on their card and in the chronicle.
    portrait: cardSpecFor({
      name: player.name,
      rings: player.rings,
      individualRings: player.individualRings,
      cardPortrait: player.cardPortrait,
    }).portrait,
  }));

  return (
    <SiteShell>
      <main>
        <Section id="ranking">
          <SectionHeader eyebrowText="El Escalafón" title="Ranking histórico" />
          {ranking.length > 0 ? (
            <>
              <HonorPodium players={ranking} />
              <RankingTable players={rows} />
              <RingLegend />
              {/* The solitaire's lone star closes the page, as the home's dividers do. */}
              <div className="pt-6">
                <LoneStarDivider />
              </div>
            </>
          ) : (
            <p className="text-center text-(--faded)">
              Todavía no hay datos en el escalafón.
            </p>
          )}
        </Section>
      </main>
    </SiteShell>
  );
};

export default RankingPage;
