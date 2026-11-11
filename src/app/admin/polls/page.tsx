import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { PollsAdmin } from '@/app/admin/polls/_components/polls-admin';
import { SiteShell } from '@/components/layout/site-shell';
import { Section, SectionHeader } from '@/components/theme/primitives';
import { isAdmin } from '@/lib/roles';
import { getSession } from '@/server/better-auth/server';

export const metadata: Metadata = { title: 'Encuestas — Frikiparty' };

export const dynamic = 'force-dynamic';

/** The polls desk: show, hide, open, pause and close each poll. */
const AdminPollsPage = async () => {
  const session = await getSession();
  if (!session || !isAdmin(session.user)) notFound();
  return (
    <SiteShell>
      <main>
        <Section id="admin-polls">
          <SectionHeader
            eyebrowText="Administración"
            lead="Muestra u oculta cada encuesta, ábrela o ponla en pausa y fija cuándo se abre y se cierra. Las horas van en tu hora local. Los resultados no se ven aquí: siguen las mismas reglas que para todos."
            title="Encuestas"
          />
          <PollsAdmin />
        </Section>
      </main>
    </SiteShell>
  );
};

export default AdminPollsPage;
