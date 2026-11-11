import type { Metadata } from 'next';
import Link from 'next/link';

import { SiteShell } from '@/components/layout/site-shell';
import {
  linkGold,
  panelGold,
  Section,
  SectionHeader,
  tag,
} from '@/components/theme/primitives';

export const metadata: Metadata = {
  title: 'Frikiparty — Encuestas',
};

const PAGES = [
  {
    href: '/polls/team-formation-2026',
    tag: 'Frikiparty 2026',
    title: 'Formación de equipos',
    text: 'La subasta como nuevo núcleo y tres propuestas para el paso previo. Dos votaciones orientativas.',
  },
];

const PollsPage = () => (
  <SiteShell>
    <Section id="polls">
      <SectionHeader
        eyebrowText="El Concilio pregunta"
        lead="Lo puede leer cualquiera. Para votar hay que entrar con tu cuenta."
        title="Encuestas"
      />
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
        {PAGES.map((page) => (
          <Link
            className={`${panelGold} flex flex-col gap-2 p-6 transition-shadow hover:shadow-[0_0_30px_rgba(201,165,87,0.2)]`}
            href={page.href}
            key={page.href}
          >
            <span className={`${tag} self-start`}>{page.tag}</span>
            <span className="d-display font-bold text-(--parchment) text-2xl uppercase">
              {page.title}
            </span>
            <span className="text-(--faded)">{page.text}</span>
            <span className={linkGold}>Leer y votar →</span>
          </Link>
        ))}
      </div>
    </Section>
  </SiteShell>
);

export default PollsPage;
