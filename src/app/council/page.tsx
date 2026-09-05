import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { CouncilDoor } from '@/components/council/council-door';
import { SiteShell } from '@/components/layout/site-shell';
import { pageWidth } from '@/components/theme/primitives';
import { siteFlags } from '@/lib/site-flags';
import {
  getNextEdition,
  listConfirmedPlayers,
} from '@/server/api/routers/edition';
import { db } from '@/server/db';

export const metadata: Metadata = { title: 'El Concilio — Frikiparty' };

// Built statically; which edition is next depends on today's date, so the
// page re-renders hourly (plus on-demand from venue edits).
export const revalidate = 3600;

/**
 * The Council as it ships today: the door, the roster and the venue. The
 * live module rehearses on /live and takes this page over on release day.
 */
const CouncilPage = async () => {
  if (!siteFlags.councilPage) {
    notFound();
  }
  const edition = await getNextEdition(db);
  const confirmedPlayers = edition
    ? await listConfirmedPlayers(db, edition.id)
    : [];

  return (
    <SiteShell>
      <main>
        {/* Shared Section metrics, minus most of the top padding: the door
            should hang right under the nav. */}
        <section
          className={`${pageWidth} flex flex-col gap-10 pt-4 pb-14 sm:pt-5 sm:pb-16`}
          id="council"
        >
          <CouncilDoor confirmedPlayers={confirmedPlayers} edition={edition} />
        </section>
      </main>
    </SiteShell>
  );
};

export default CouncilPage;
