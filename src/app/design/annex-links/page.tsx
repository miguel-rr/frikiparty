import type { Metadata } from 'next';

import { ProposalLabel } from '@/app/design/parchment/_components/ink';
import { Annexes } from '@/app/polls/team-formation-2026/_components/blocks';
import { SiteShell } from '@/components/layout/site-shell';
import { Divider, Section, SectionHeader } from '@/components/theme/primitives';

import { ProposalRow } from './variants';

export const metadata: Metadata = {
  robots: { index: false },
  title: 'Frikiparty — Anexos en las propuestas',
};

const VARIANTS = [
  {
    key: 'footnotes',
    label: 'A · Notas al pie',
    caption:
      'Un número pequeño en el paso que lo necesita; las notas al pie de la tarjeta',
  },
  {
    key: 'fineprint',
    label: 'B · Letra pequeña',
    caption: 'Una sola línea discreta de enlaces al final de la tarjeta',
  },
  {
    key: 'info',
    label: 'C · Interrogante en el paso',
    caption:
      'Un «?» en el paso; al tocarlo, la respuesta corta y el enlace al anexo',
  },
  {
    key: 'fold',
    label: 'D · Casos especiales plegados',
    caption: 'Dentro de la tarjeta, sin saltar a ningún sitio',
  },
] as const;

const AnnexLinksDesignPage = () => (
  <SiteShell>
    <Section id="variants">
      <SectionHeader
        eyebrowText="Propuesta de diseño"
        lead="Cuatro formas de llevar a los anexos desde las tarjetas de las tres propuestas. Los anexos están abajo, como en la página real: prueba los enlaces."
        title="Anexos en las propuestas"
      />
      {VARIANTS.map((variant) => (
        <div className="flex flex-col gap-5 pt-6" key={variant.key}>
          <ProposalLabel caption={variant.caption} text={variant.label} />
          <ProposalRow variant={variant.key} />
        </div>
      ))}
    </Section>
    <Divider />
    <Section id="annexes">
      <SectionHeader title="Anexos" />
      <Annexes />
    </Section>
  </SiteShell>
);

export default AnnexLinksDesignPage;
