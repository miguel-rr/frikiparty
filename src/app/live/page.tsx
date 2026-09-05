import type { Metadata } from 'next';

import { CouncilDoor } from '@/components/council/council-door';
import { SiteShell } from '@/components/layout/site-shell';
import { LiveHub } from '@/components/live/live-hub';
import { SetupLink } from '@/components/live/setup-link';
import { pageWidth } from '@/components/theme/primitives';
import {
  getNextEdition,
  listConfirmedPlayers,
} from '@/server/api/routers/edition';
import { db } from '@/server/db';
import {
  getCurrentTournament,
  getLiveState,
  isPublicStage,
} from '@/server/live/state';

export const metadata: Metadata = { title: 'El Concilio — Frikiparty' };

// The live module changes by the second: always rendered on demand.
export const dynamic = 'force-dynamic';

/**
 * The Council as it will be: the door while nothing runs, the live block
 * from the moment the organiser gives the tournament its start. Lives
 * here, unlinked, so /council ships untouched until release day.
 */
const LivePage = async () => {
  const current = await getCurrentTournament(db);
  const live =
    current && isPublicStage(current.stage)
      ? await getLiveState(db, current.id)
      : null;
  if (live) {
    return (
      <SiteShell>
        <main>
          <section
            className={`${pageWidth} flex flex-col gap-10 pt-8 pb-14 sm:pt-10 sm:pb-16`}
            id="council"
          >
            <LiveHub initial={live} />
          </section>
        </main>
      </SiteShell>
    );
  }
  const edition = await getNextEdition(db);
  const confirmedPlayers = edition
    ? await listConfirmedPlayers(db, edition.id)
    : [];
  return (
    <SiteShell>
      <main>
        <section
          className={`${pageWidth} flex flex-col gap-10 pt-4 pb-14 sm:pt-5 sm:pb-16`}
          id="council"
        >
          <CouncilDoor confirmedPlayers={confirmedPlayers} edition={edition} />
          <SetupLink />
        </section>
      </main>
    </SiteShell>
  );
};

export default LivePage;
