import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { SiteShell } from '@/components/layout/site-shell';
import { Section, SectionHeader } from '@/components/theme/primitives';
import { HonorPodium } from '@/components/tournament/honor-podium';
import {
  RankingTable,
  RingLegend,
} from '@/components/tournament/ranking-table';
import { siteFlags } from '@/lib/site-flags';
import { api } from '@/trpc/server';

export const metadata: Metadata = { title: 'Ranking — Frikiparty' };

const RankingPage = async () => {
  if (!siteFlags.rankingPage) {
    notFound();
  }
  const ranking = await api.player.historicalRanking();

  return (
    <SiteShell>
      <main>
        <Section id="ranking">
          <SectionHeader
            eyebrowText="Ranking histórico · Desde 2005"
            lead="Cada campeonato forja un anillo de oro: alianza por equipos, solitario con gema en el individual. El solitario desempata; a empate total, mismo puesto."
            title="El Escalafón"
          />
          {ranking.length > 0 ? (
            <>
              <HonorPodium players={ranking} />
              <RankingTable players={ranking} />
              <RingLegend />
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
