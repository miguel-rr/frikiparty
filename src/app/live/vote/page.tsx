import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { SiteShell } from '@/components/layout/site-shell';
import { BallotForm } from '@/components/live/ballot-form';
import { btn, Section, SectionHeader } from '@/components/theme/primitives';
import { getSession } from '@/server/better-auth/server';
import { db } from '@/server/db';
import { getCurrentTournament, getLiveState } from '@/server/live/state';

export const metadata: Metadata = { title: 'Mi voto — Frikiparty' };

export const dynamic = 'force-dynamic';

/** The ballot. Needs an account; the form itself checks it's a participant. */
const VotePage = async () => {
  const session = await getSession();
  if (!session) {
    redirect('/login?next=/live/vote');
  }
  const current = await getCurrentTournament(db);
  const state = current ? await getLiveState(db, current.id) : null;
  const open = state?.stage === 'voting';
  return (
    <SiteShell>
      <main>
        <Section id="vote">
          <SectionHeader
            eyebrowText={state ? `Edición ${state.editionYear}` : 'Votación'}
            lead={
              open
                ? 'Ordena a los demás participantes de mejor a peor, según tu criterio. Tu voto es secreto y se sella al enviarlo.'
                : 'La votación no está abierta ahora mismo.'
            }
            title="Mi ranking"
          />
          {open && state ? (
            <div className="mx-auto w-full max-w-xl">
              <BallotForm
                players={state.participants.map((p) => ({
                  id: p.id,
                  name: p.name,
                  slug: p.slug,
                }))}
                tournamentId={state.id}
              />
            </div>
          ) : (
            <div className="flex justify-center">
              <Link className={btn.outline} href="/live">
                Volver al torneo
              </Link>
            </div>
          )}
        </Section>
      </main>
    </SiteShell>
  );
};

export default VotePage;
