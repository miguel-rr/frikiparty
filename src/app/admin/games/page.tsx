import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { WikiAdmin } from '@/app/admin/games/_components/wiki-admin';
import { SiteShell } from '@/components/layout/site-shell';
import { Section, SectionHeader } from '@/components/theme/primitives';
import { getSession } from '@/server/better-auth/server';

export const metadata: Metadata = { title: 'Juegos — Frikiparty' };

export const dynamic = 'force-dynamic';

/** The games wiki desk: games, versions, factions, maps and each faction's revisions. */
const AdminGamesPage = async () => {
  const session = await getSession();
  if (session?.user.role !== 'admin') notFound();
  return (
    <SiteShell>
      <main>
        <Section id="admin-games">
          <SectionHeader
            eyebrowText="Administración"
            lead="Versiones, facciones, mapas y la ficha de cada facción en cada versión. Una ficha vale desde su versión hasta que otra la sustituye."
            title="Juegos"
          />
          <WikiAdmin />
        </Section>
      </main>
    </SiteShell>
  );
};

export default AdminGamesPage;
