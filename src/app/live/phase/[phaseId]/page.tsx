import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { SiteShell } from '@/components/layout/site-shell';
import { PhaseLive } from '@/components/live/phase/phase-view';
import { pageWidth } from '@/components/theme/primitives';
import { db } from '@/server/db';
import { getCurrentTournament, getLiveState } from '@/server/live/state';

export const metadata: Metadata = { title: 'Fase — Frikiparty' };

export const dynamic = 'force-dynamic';

/** A phase in full: standings and crosses, the bracket, or the swiss board. */
const PhasePage = async ({
  params,
}: {
  params: Promise<{ phaseId: string }>;
}) => {
  const { phaseId } = await params;
  const current = await getCurrentTournament(db);
  const state = current ? await getLiveState(db, current.id) : null;
  if (!state?.phases.some((p) => p.id === phaseId)) notFound();
  return (
    <SiteShell>
      <main>
        <section
          className={`${pageWidth} flex flex-col gap-8 py-10`}
          id="phase"
        >
          <PhaseLive initial={state} phaseId={phaseId} />
        </section>
      </main>
    </SiteShell>
  );
};

export default PhasePage;
