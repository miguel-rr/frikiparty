'use client';

import Link from 'next/link';

import { panel, panelGold } from '@/components/theme/primitives';
import { matchScore } from '@/lib/live/match-score';
import { teamLabel } from '@/lib/live/team-label';
import type { LivePhase } from '@/server/live/phases';
import type { LiveState } from '@/server/live/state';

/**
 * Swiss the way the big events show it: columns by record, best on the
 * left, each team a chip that moves as its round ends, the eliminated
 * dimmed on the right; below, the current round's pairings and the
 * earlier rounds folded.
 */
const SwissView = ({
  state,
  phase,
  compact,
}: {
  state: LiveState;
  phase: LivePhase;
  compact?: boolean;
}) => {
  const teamById = new Map(state.teams.map((t) => [t.id, t]));
  const limit = phase.swiss?.eliminationLosses ?? 2;
  const record = new Map(
    state.teams.map((t) => [t.id, { wins: 0, losses: 0 }]),
  );
  for (const m of phase.matches) {
    if (!m.winnerTeamId || !m.teamAId || !m.teamBId) continue;
    const loser = m.winnerTeamId === m.teamAId ? m.teamBId : m.teamAId;
    const w = record.get(m.winnerTeamId);
    const l = record.get(loser);
    if (w) w.wins += 1;
    if (l) l.losses += 1;
  }
  const rounds = [...new Set(phase.matches.map((m) => m.roundIndex ?? 0))].sort(
    (a, b) => a - b,
  );
  const currentRound =
    rounds.find((r) =>
      phase.matches.some((m) => m.roundIndex === r && m.status !== 'completed'),
    ) ?? rounds.at(-1);
  const alive = state.teams.filter(
    (t) => (record.get(t.id)?.losses ?? 0) < limit,
  );
  const out = state.teams.filter(
    (t) => (record.get(t.id)?.losses ?? 0) >= limit,
  );
  const keys = [
    ...new Set(
      alive.map((t) => `${record.get(t.id)?.wins}-${record.get(t.id)?.losses}`),
    ),
  ].sort((a, b) => {
    const [aw, al] = a.split('-').map(Number);
    const [bw, bl] = b.split('-').map(Number);
    return (bw ?? 0) - (aw ?? 0) || (al ?? 0) - (bl ?? 0);
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex gap-3 overflow-x-auto pb-2">
        {keys.map((key) => (
          <div
            className={`${panelGold} flex min-w-44 flex-col gap-2 p-3`}
            key={key}
          >
            <span className="d-display font-bold text-(--gold-hi) text-2xl">
              {key}
            </span>
            {alive
              .filter(
                (t) =>
                  `${record.get(t.id)?.wins}-${record.get(t.id)?.losses}` ===
                  key,
              )
              .map((t) => (
                <span
                  className="rounded-lg border border-(--hair) bg-(--panel-2) px-2 py-1 text-(--parchment) text-sm"
                  key={t.id}
                >
                  {teamLabel(t)}
                </span>
              ))}
          </div>
        ))}
        {out.length > 0 ? (
          <div
            className={`${panel} flex min-w-44 flex-col gap-2 p-3 opacity-60`}
          >
            <span className="d-display font-bold text-(--ember) text-2xl">
              Fuera
            </span>
            {out.map((t) => (
              <span
                className="rounded-lg border border-(--hair) px-2 py-1 text-(--faded) text-sm line-through"
                key={t.id}
              >
                {teamLabel(t)}
              </span>
            ))}
          </div>
        ) : null}
      </div>
      <p className="font-mono text-(--faded) text-3xs uppercase tracking-wider">
        Eliminado con {limit} derrota{limit === 1 ? '' : 's'} · queda uno en pie
      </p>

      {rounds.map((round) => {
        const roundMatches = phase.matches.filter(
          (m) => m.roundIndex === round,
        );
        const isCurrent = round === currentRound;
        if (compact && !isCurrent) return null;
        return (
          <details
            className={`${isCurrent ? panelGold : panel} p-4`}
            key={round}
            open={isCurrent}
          >
            <summary
              className={`cursor-pointer font-mono text-2xs uppercase tracking-2xl ${isCurrent ? 'text-(--gold-hi)' : 'text-(--faded)'}`}
            >
              Ronda {round}
              {isCurrent ? ' · en juego' : ''}
            </summary>
            <ul className="mt-3 flex flex-col gap-2">
              {roundMatches.map((m) => {
                if (m.byeTeamId) {
                  return (
                    <li className="text-(--faded) text-sm italic" key={m.id}>
                      Descansa {teamLabel(teamById.get(m.byeTeamId))}
                    </li>
                  );
                }
                const score = matchScore(m);
                return (
                  <li key={m.id}>
                    <Link
                      className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-lg border border-(--hair) bg-(--panel-2) px-3 py-2 text-sm hover:border-(--hair-gold)"
                      href={`/matches/${m.id}`}
                    >
                      <span
                        className={`truncate text-right ${m.winnerTeamId === m.teamAId && m.winnerTeamId ? 'text-(--gold-hi)' : 'text-(--parchment)'}`}
                      >
                        {teamLabel(teamById.get(m.teamAId ?? ''))}
                      </span>
                      <span className="font-bold font-mono text-(--gold-hi) tabular-nums">
                        {score.a}–{score.b}
                      </span>
                      <span
                        className={`truncate ${m.winnerTeamId === m.teamBId && m.winnerTeamId ? 'text-(--gold-hi)' : 'text-(--parchment)'}`}
                      >
                        {teamLabel(teamById.get(m.teamBId ?? ''))}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </details>
        );
      })}
    </div>
  );
};

export { SwissView };
