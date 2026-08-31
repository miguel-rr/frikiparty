import { RANKING } from '@/app/design/fixtures';
import { btn, Section, SectionHeader } from '@/components/theme/primitives';
import { HonorPodium } from '@/components/tournament/honor-podium';
import {
  RankingTable,
  RingLegend,
} from '@/components/tournament/ranking-table';

const Ranking = () => (
  <Section id="ranking">
    <SectionHeader
      eyebrowText="Ranking histórico · Desde 2005"
      lead="Cada campeonato forja un anillo de oro: alianza por equipos, solitario con gema en el individual. El solitario desempata; a empate total, mismo puesto."
      title="El Escalafón"
    />
    <HonorPodium players={RANKING} />
    <RankingTable players={RANKING} />
    <div className="flex flex-wrap items-center justify-between gap-4">
      <RingLegend />
      <a className={btn.ghost} href="#top">
        Ver ranking completo →
      </a>
    </div>
  </Section>
);

export { Ranking };
