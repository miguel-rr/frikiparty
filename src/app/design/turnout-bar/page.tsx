import type { Metadata } from 'next';

import { ProposalLabel } from '@/app/design/parchment/_components/ink';
import { SiteShell } from '@/components/layout/site-shell';
import { Section, SectionHeader } from '@/components/theme/primitives';

import { VariantRow } from './variants';

export const metadata: Metadata = {
  robots: { index: false },
  title: 'Frikiparty — Barra de participación',
};

const VARIANTS = [
  {
    key: 'seats',
    label: 'A · Asientos',
    caption: 'Un hueco por confirmado; el del quórum, recuadrado',
  },
  {
    key: 'count',
    label: 'B · Contador grande',
    caption: 'El número manda; barra fina con la marca del quórum',
  },
  {
    key: 'zones',
    label: 'C · Dos zonas',
    caption: 'Antes del quórum, cerrado; después, resultados',
  },
] as const;

const TurnoutBarDesignPage = () => (
  <SiteShell>
    <Section id="variants">
      <SectionHeader
        eyebrowText="Propuesta de diseño"
        lead="Tres formas de mostrar cuánta gente ha votado y cuánto falta para ver resultados. Cada una, con 0, 7, 11 y 17 votos de 20."
        title="Barra de participación"
      />
      {VARIANTS.map((variant) => (
        <div className="flex flex-col gap-5 pt-6" key={variant.key}>
          <ProposalLabel caption={variant.caption} text={variant.label} />
          <VariantRow variant={variant.key} />
        </div>
      ))}
    </Section>
  </SiteShell>
);

export default TurnoutBarDesignPage;
