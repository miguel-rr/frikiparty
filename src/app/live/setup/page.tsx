import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { SiteShell } from '@/components/layout/site-shell';
import { SetupWizard } from '@/components/live/setup/setup-wizard';
import { Section, SectionHeader } from '@/components/theme/primitives';
import { getNextEdition } from '@/server/api/routers/edition';
import { getSession } from '@/server/better-auth/server';
import { db } from '@/server/db';
import { getCurrentTournament } from '@/server/live/state';

export const metadata: Metadata = { title: 'Preparar el torneo — Frikiparty' };

// Reads the session: rendered on demand, never built statically.
export const dynamic = 'force-dynamic';

/** The organiser's desk. Non-admins get a 404, like the other admin pages. */
const LiveSetupPage = async () => {
  const session = await getSession();
  if (session?.user.role !== 'admin') {
    notFound();
  }
  const [nextEdition, current] = await Promise.all([
    getNextEdition(db),
    getCurrentTournament(db),
  ]);
  return (
    <SiteShell>
      <main>
        <Section id="live-setup">
          <SectionHeader
            eyebrowText="Administración"
            lead={
              nextEdition
                ? `Edición ${nextEdition.year}. Cada paso queda registrado; nada se pierde.`
                : 'No hay ninguna edición por venir con fechas: crea una antes de preparar el torneo.'
            }
            title="Preparar el torneo"
          />
          {nextEdition ? (
            <SetupWizard
              nextEdition={{ id: nextEdition.id, year: nextEdition.year }}
              tournamentId={current?.id ?? null}
            />
          ) : null}
        </Section>
      </main>
    </SiteShell>
  );
};

export default LiveSetupPage;
