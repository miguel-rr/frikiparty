import { eq } from 'drizzle-orm';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { SiteShell } from '@/components/layout/site-shell';
import { MatchLive } from '@/components/live/match/match-live';
import { pageWidth } from '@/components/theme/primitives';
import { db } from '@/server/db';
import { match, phase } from '@/server/db/schema';
import { getLiveState } from '@/server/live/state';

export const metadata: Metadata = { title: 'Partido — Frikiparty' };

export const dynamic = 'force-dynamic';

/**
 * The match sheet (live plan §8.4): who plays whom, the score, every game
 * with its draw, line-ups, map, result and replays, and the comments.
 * Any tournament's match, past editions included.
 */
const MatchPage = async ({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) => {
  const { matchId } = await params;
  // The sheet belongs to the match's own tournament, so the record of a
  // past edition stays readable, not only the running one.
  const [row] = await db
    .select({ tournamentId: phase.tournamentId })
    .from(match)
    .innerJoin(phase, eq(phase.id, match.phaseId))
    .where(eq(match.id, matchId));
  const state = row ? await getLiveState(db, row.tournamentId) : null;
  if (!state) notFound();
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
