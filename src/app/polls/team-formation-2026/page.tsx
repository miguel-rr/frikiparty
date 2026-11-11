import type { Metadata } from 'next';

import { SiteShell } from '@/components/layout/site-shell';
import { Divider, Section, SectionHeader } from '@/components/theme/primitives';

import {
  Advantages,
  Annexes,
  AuctionIntro,
  Opening,
  Proposals,
  WhyFree,
} from './_components/blocks';
import { DEPARTMENT, POLLS_INTRO } from './_components/content';
import { PollSection } from './_components/poll-section';

export const metadata: Metadata = {
  title: 'Frikiparty — Formación de equipos 2026',
  description:
    'La propuesta para formar los equipos de la Frikiparty 2026: la subasta y tres opciones para el paso previo. Vota.',
};

const TeamFormationPollPage = () => (
  <SiteShell>
    <Section id="opening">
      <span className="text-center font-mono text-(--gold) text-2xs uppercase tracking-3xl">
        {DEPARTMENT}
      </span>
      <Opening />
    </Section>
    <Divider />
    <Section id="auction">
      <AuctionIntro />
      <Advantages />
    </Section>
    <Divider />
    <Section id="proposals">
      <SectionHeader
        eyebrowText="El paso previo"
        lead="Las tres siguen el mismo esquema (ranking, capitanes y subasta) para poder compararlas de un vistazo."
        title="Tres propuestas"
      />
      <Proposals />
    </Section>
    <Section id="why-free">
      <WhyFree />
    </Section>
    <Divider />
    <Section id="polls">
      <SectionHeader
        eyebrowText="Votaciones"
        lead={POLLS_INTRO.lead}
        title={POLLS_INTRO.title}
      />
      <PollSection />
    </Section>
    <Divider />
    <Section id="annexes">
      <SectionHeader
        eyebrowText="Para quien quiera el detalle"
        title="Anexos"
      />
      <Annexes />
    </Section>
  </SiteShell>
);

export default TeamFormationPollPage;
