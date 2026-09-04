'use client';

import Link from 'next/link';

import { panel, panelGold } from '@/components/theme/primitives';
import { matchScore } from '@/lib/live/match-score';
import { teamLabel, teamRoster } from '@/lib/live/team-label';
import type { LiveState } from '@/server/live/state';

/**
 * The calendar: every phase, jornada by jornada (round by round in swiss
 * and brackets), each match with its teams, state and score, opening its
 * sheet. The current jornada — the first with something left to play —
 * glows.
 */
const Calendar = ({
  state,
  compact,
}: {
  state: LiveState;
  compact?: boolean;
}) => {
  const teamById = new Map(state.teams.map((t) => [t.id, t]));
  const phasesWithMatches = state.phases.filter((p) => p.matches.length > 0);
  if (phasesWithMatches.length === 0) {
    return (
      <p className="text-(--faded) text-sm">
        El calendario aún no está forjado.
      </p>
    );
  }
  const current =
    state.phases.find((p) => p.matches.some((m) => m.status !== 'completed')) ??
    state.phases.at(-1);
  return (
    <div className="flex flex-col gap-8">
      {phasesWithMatches.map((phaseRow) => {
        const rounds = [
          ...new Set(phaseRow.matches.map((m) => m.roundIndex ?? 0)),
        ].sort((a, b) => a - b);
        const currentRound = rounds.find((r) =>
          phaseRow.matches.some(
            (m) =>
              m.roundIndex === r &&
              m.status !== 'completed' &&
              (m.teamAId || m.teamBId || m.byeTeamId),
          ),
        );
        return (
          <section className="flex flex-col gap-4" key={phaseRow.id}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="d-display font-bold text-(--parchment) text-xl uppercase">
                {phaseRow.name ?? phaseTitle(phaseRow.type)}
              </h3>
              <span className="font-mono text-(--faded) text-2xs uppercase tracking-2xl">
                {phaseRow.id === current?.id ? 'Fase actual' : ''}
              </span>
            </div>
            {rounds.map((round) => {
              const roundMatches = phaseRow.matches.filter(
                (m) => m.roundIndex === round,
              );
              const isCurrent =
                round === currentRound && phaseRow.id === current?.id;
              const known = roundMatches.filter(
                (m) => m.teamAId || m.teamBId || m.byeTeamId,
              );
              if (known.length === 0 && phaseRow.type !== 'bracket')
                return null;
              return (
                <div
                  className={`${isCurrent ? panelGold : panel} flex flex-col gap-3 p-4`}
                  key={round}
                >
                  <span
                    className={`font-mono text-2xs uppercase tracking-2xl ${isCurrent ? 'text-(--gold-hi)' : 'text-(--faded)'}`}
                  >
                    {roundLabel(
                      phaseRow.type,
                      round,
                      rounds,
                      phaseRow.bracket !== null,
                    )}
                    {isCurrent ? ' · en juego' : ''}
                  </span>
                  <ul className="flex flex-col gap-2">
                    {roundMatches.map((m) => {
                      const a = teamById.get(m.teamAId ?? '');
                      const b = teamById.get(m.teamBId ?? '');
                      const score = matchScore(m);
                      const group = phaseRow.groups.find(
                        (g) => g.id === m.groupId,
                      );
                      if (m.byeTeamId) {
                        return (
                          <li
                            className="text-(--faded) text-sm italic"
                            key={m.id}
                          >
                            Descansa {teamLabel(teamById.get(m.byeTeamId))}
                          </li>
                        );
                      }
                      return (
                        <li key={m.id}>
                          <Link
                            className={`grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-lg border px-3 py-2 transition-colors hover:border-(--hair-gold) ${
                              m.status === 'completed'
                                ? 'border-(--hair) bg-(--panel-2)/50'
                                : m.status === 'in_progress'
                                  ? 'border-(--gold)/60 bg-(--gold)/6'
                                  : 'border-(--hair) bg-(--panel-2)'
                            }`}
                            href={`/matches/${m.id}`}
                          >
                            <TeamSide
                              align="right"
                              name={teamLabel(a)}
                              roster={compact ? '' : teamRoster(a)}
                              winner={
                                m.winnerTeamId !== null &&
                                m.winnerTeamId === m.teamAId
                              }
                            />
                            <span className="flex flex-col items-center gap-0.5">
                              <span className="font-black font-mono text-(--gold-hi) text-lg tabular-nums">
                                {score.a}–{score.b}
                              </span>
                              <span className="font-mono text-(--faded) text-3xs uppercase tracking-wider">
                                {group && phaseRow.groups.length > 1
                                  ? `Grupo ${group.label} · `
                                  : ''}
                                {m.isThirdPlace ? '3er puesto · ' : ''}
                                {m.isTiebreak ? 'Desempate · ' : ''}
                                {statusLabel(m.status)}
                              </span>
                            </span>
                            <TeamSide
                              align="left"
                              name={teamLabel(b)}
                              roster={compact ? '' : teamRoster(b)}
                              winner={
                                m.winnerTeamId !== null &&
                                m.winnerTeamId === m.teamBId
                              }
                            />
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </section>
        );
      })}
    </div>
  );
};

const TeamSide = ({
  name,
  roster,
  align,
  winner,
}: {
  name: string;
  roster: string;
  align: 'left' | 'right';
  winner: boolean;
}) => (
  <span
    className={`flex min-w-0 flex-col ${align === 'right' ? 'items-end text-right' : 'items-start text-left'}`}
  >
    <span
      className={`truncate font-semibold ${winner ? 'text-(--gold-hi)' : 'text-(--parchment)'}`}
    >
      {name}
    </span>
    {roster ? (
      <span className="truncate text-(--faded) text-2xs">{roster}</span>
    ) : null}
  </span>
);

const phaseTitle = (type: 'group' | 'bracket' | 'swiss') =>
  type === 'group'
    ? 'Fase de grupos'
    : type === 'bracket'
      ? 'Eliminatorias'
      : 'Suizo';

const roundLabel = (
  type: 'group' | 'bracket' | 'swiss',
  round: number,
  rounds: number[],
  isBracket: boolean,
) => {
  if (type === 'group') return `Jornada ${round}`;
  if (type === 'swiss') return `Ronda ${round}`;
  if (isBracket) {
    const last = Math.max(...rounds);
    if (round === 0) return 'Play-in';
    if (round === last) return 'Final';
    if (round === last - 1) return 'Semifinales';
    if (round === last - 2) return 'Cuartos de final';
    return `Ronda ${round}`;
  }
  return `Ronda ${round}`;
};

const statusLabel = (status: 'scheduled' | 'in_progress' | 'completed') =>
  status === 'completed'
    ? 'Terminado'
    : status === 'in_progress'
      ? 'En juego'
      : 'Pendiente';

export { Calendar, roundLabel };
