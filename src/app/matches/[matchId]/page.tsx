import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { SiteShell } from '@/components/layout/site-shell';
import { btn, pageWidth, panelGold, tag } from '@/components/theme/primitives';
import { matchScore } from '@/lib/live/match-score';
import { teamLabel, teamRoster } from '@/lib/live/team-label';
import { db } from '@/server/db';
import { getCurrentTournament, getLiveState } from '@/server/live/state';

export const metadata: Metadata = { title: 'Partido — Frikiparty' };

export const dynamic = 'force-dynamic';

/**
 * The match sheet: who plays whom, the score so far. The games, the
 * faction draw and the results come with the next phase of the live plan.
 */
const MatchPage = async ({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) => {
  const { matchId } = await params;
  const current = await getCurrentTournament(db);
  const state = current ? await getLiveState(db, current.id) : null;
  const phaseRow = state?.phases.find((p) =>
    p.matches.some((m) => m.id === matchId),
  );
  const m = phaseRow?.matches.find((x) => x.id === matchId);
  if (!state || !phaseRow || !m) notFound();
  const teamById = new Map(state.teams.map((t) => [t.id, t]));
  const a = teamById.get(m.teamAId ?? '');
  const b = teamById.get(m.teamBId ?? '');
  const score = matchScore(m);
  return (
    <SiteShell>
      <main>
        <section
          className={`${pageWidth} flex flex-col gap-8 py-10`}
          id="match"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className={tag}>
              Edición {state.editionYear} ·{' '}
              {phaseRow.name ??
                (phaseRow.type === 'group'
                  ? 'Fase de grupos'
                  : phaseRow.type === 'bracket'
                    ? 'Eliminatorias'
                    : 'Suizo')}
              {m.roundIndex !== null
                ? ` · ${phaseRow.type === 'group' ? 'jornada' : 'ronda'} ${m.roundIndex}`
                : ''}
            </span>
            <Link className={btn.outline} href="/live">
              El torneo
            </Link>
          </div>
          <div
            className={`${panelGold} grid items-center gap-6 p-6 sm:grid-cols-[1fr_auto_1fr] sm:p-10`}
          >
            <div className="flex flex-col items-center gap-1 text-center sm:items-end sm:text-right">
              <span className="d-display font-bold text-(--parchment) text-2xl uppercase">
                {teamLabel(a)}
              </span>
              <span className="text-(--faded) text-sm">{teamRoster(a)}</span>
            </div>
            <span className="d-display text-center font-black text-(--gold-hi) text-6xl tabular-nums">
              {score.a}–{score.b}
            </span>
            <div className="flex flex-col items-center gap-1 text-center sm:items-start sm:text-left">
              <span className="d-display font-bold text-(--parchment) text-2xl uppercase">
                {teamLabel(b)}
              </span>
              <span className="text-(--faded) text-sm">{teamRoster(b)}</span>
            </div>
          </div>
          <p className="text-center text-(--faded) text-sm">
            La ficha completa del partido (partidas, facciones, resultados y
            comentarios) llega en la siguiente fase del módulo.
          </p>
        </section>
      </main>
    </SiteShell>
  );
};

export default MatchPage;
