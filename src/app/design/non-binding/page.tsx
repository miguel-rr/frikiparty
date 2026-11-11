import type { Metadata } from 'next';

import { ProposalLabel } from '@/app/design/parchment/_components/ink';
import { SiteShell } from '@/components/layout/site-shell';
import { Section, SectionHeader } from '@/components/theme/primitives';

import { BandNotice, ParchmentNotice, StampNotice } from './notices';

export const metadata: Metadata = {
  robots: { index: false },
  title: 'Frikiparty — Aviso de votación no vinculante',
};

const LEAD =
  'Dos preguntas. Votan los confirmados para la Frikiparty 2026. El voto es anónimo y puedes cambiarlo hasta el cierre. Los resultados se abren cuando haya votado la mitad más uno, y solo para quien ya ha votado.';

const VARIANTS = [
  {
    key: 'stamp',
    label: 'A · Sello',
    caption: 'Un sello rojo junto al texto',
    Notice: StampNotice,
  },
  {
    key: 'band',
    label: 'B · Banda',
    caption: 'Una franja ancha con el aviso como título',
    Notice: BandNotice,
  },
  {
    key: 'parchment',
    label: 'C · Nota en pergamino',
    caption: 'El único bloque claro de la página',
    Notice: ParchmentNotice,
  },
] as const;

const NonBindingDesignPage = () => (
  <SiteShell>
    {VARIANTS.map(({ key, label, caption, Notice }) => (
      <Section id={key} key={key}>
        <div className="flex flex-col gap-8">
          <ProposalLabel caption={caption} text={label} />
          <SectionHeader
            eyebrowText="Votaciones"
            lead={LEAD}
            title="Ahora te toca a ti"
          />
          <Notice />
        </div>
      </Section>
    ))}
  </SiteShell>
);

export default NonBindingDesignPage;
