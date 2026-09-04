import type { Metadata } from 'next';
import Link from 'next/link';

import { SiteShell } from '@/components/layout/site-shell';
import { ReplayPlayer } from '@/components/live/formation/replay-player';
import {
  btn,
  pageWidth,
  Section,
  SectionHeader,
} from '@/components/theme/primitives';
import { db } from '@/server/db';
import { getCurrentTournament, getLiveState } from '@/server/live/state';

export const metadata: Metadata = { title: 'Revive la sala — Frikiparty' };

export const dynamic = 'force-dynamic';

/** Revive la subasta o el draft del torneo en curso. */
const ReplayPage = async () => {
  const current = await getCurrentTournament(db);
  const state = current ? await getLiveState(db, current.id) : null;
  const kind =
    state?.formationMethod === 'auction'
      ? 'auction'
      : state?.formationMethod === 'draft'
        ? 'draft'
        : null;
  return (
    <SiteShell>
      <main>
        {state && kind ? (
          <section
            className={`${pageWidth} flex flex-col gap-8 py-10`}
            id="replay"
          >
            <div className="flex flex-wrap items-end justify-between gap-3">
              <SectionHeader
                eyebrowText={`Edición ${state.editionYear}`}
                title={
                  kind === 'auction' ? 'Revive la subasta' : 'Revive el draft'
                }
              />
              <Link className={btn.outline} href="/live">
                El torneo
              </Link>
            </div>
            <ReplayPlayer kind={kind} live={state} />
          </section>
        ) : (
          <Section id="replay">
            <SectionHeader
              lead="Este torneo no se formó con draft ni subasta."
              title="Nada que revivir"
            />
          </Section>
        )}
      </main>
    </SiteShell>
  );
};

export default ReplayPage;
