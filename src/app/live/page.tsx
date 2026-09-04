import type { Metadata } from 'next';
import Link from 'next/link';

import { SiteShell } from '@/components/layout/site-shell';
import { LiveHub } from '@/components/live/live-hub';
import { btn, Section, SectionHeader } from '@/components/theme/primitives';
import { db } from '@/server/db';
import { getCurrentTournament, getLiveState } from '@/server/live/state';

export const metadata: Metadata = { title: 'Torneo en vivo — Frikiparty' };

// The live module changes by the second: always rendered on demand.
export const dynamic = 'force-dynamic';

/**
 * Temporary home of the live module while it's being built and tested;
 * once a tournament is under way the same block lives on /council.
 */
const LivePage = async () => {
  const current = await getCurrentTournament(db);
  const state = current ? await getLiveState(db, current.id) : null;
  return (
    <SiteShell>
      <main>
        <Section id="live">
          {state ? (
            <LiveHub initial={state} />
          ) : (
            <>
              <SectionHeader
                eyebrowText="Torneo en vivo"
                lead="Cuando el Concilio cree el torneo de la próxima edición, aquí se seguirá cada paso."
                title="Nada en marcha"
              />
              <div className="flex justify-center">
                <Link className={btn.outline} href="/live/setup">
                  Preparar un torneo
                </Link>
              </div>
            </>
          )}
        </Section>
      </main>
    </SiteShell>
  );
};

export default LivePage;
