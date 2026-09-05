import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { SiteShell } from '@/components/layout/site-shell';
import { MatchLive } from '@/components/live/match/match-live';
import { pageWidth } from '@/components/theme/primitives';
import { db } from '@/server/db';
import { getCurrentTournament, getLiveState } from '@/server/live/state';

export const metadata: Metadata = { title: 'Partido — Frikiparty' };

export const dynamic = 'force-dynamic';

/**
 * The match sheet (live plan §8.4): who plays whom, the score, every game
 * with its draw, line-ups, map, result and replays, and the comments.
 */
const MatchPage = async ({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) => {
  const { matchId } = await params;
  const current = await getCurrentTournament(db);
  const state = current ? await getLiveState(db, current.id) : null;
  const known = state?.phases.some((p) =>
    p.matches.some((m) => m.id === matchId),
  );
  if (!state || !known) notFound();
  return (
    <SiteShell>
      <main>
        <section
          className={`${pageWidth} flex flex-col gap-8 py-10`}
          id="match"
        >
          <MatchLive initial={state} matchId={matchId} />
        </section>
      </main>
    </SiteShell>
  );
};

export default MatchPage;
