'use client';

import Link from 'next/link';

import { panel, panelGold } from '@/components/theme/primitives';
import { matchScore } from '@/lib/live/match-score';
import { groupStandings } from '@/lib/live/standings';
import { teamLabel, teamRoster } from '@/lib/live/team-label';
import { TIEBREAK_LABELS } from '@/lib/tournament/tiebreak';
import type { LivePhase } from '@/server/live/phases';
import type { LiveState } from '@/server/live/state';

/**
 * A group phase at a glance: per group, the standings (with the tie-break
 * that decided each border and any tie still open), the cross grid of
 * every pairing, and the jornadas. Qualifiers sit above the cut line.
 */
const GroupView = ({
  state,
  phase,
  compact,
}: {
  state: LiveState;
  phase: LivePhase;
  compact?: boolean;
}) => {
  const teamById = new Map(state.teams.map((t) => [t.id, t]));
  const config = phase.group;
  if (!config) return null;
  return (
    <div className="flex flex-col gap-8">
      {phase.groups.map((group) => {
        const matches = phase.matches.filter((m) => m.groupId === group.id);
        const rows = groupStandings({
          teamIds: group.teamIds,
          teams: state.teams,
          participants: state.participants,
          ranking: state.ranking ?? [],
          matches,
          chain: config.tiebreakChain,
        });
        const openTies = rows.filter((r) => r.tiedWith.length > 0);
        return (
          <section className="flex flex-col gap-5" key={group.id}>
            {phase.groups.length > 1 ? (
              <h4 className="d-display font-bold text-(--gold) text-lg uppercase">
                Grupo {group.label}
              </h4>
            ) : null}

            {/* Standings */}
            <div className={`${panelGold} overflow-x-auto p-4`}>
              <table className="w-full min-w-120 border-collapse text-sm">
                <thead>
                  <tr className="font-mono text-(--faded) text-2xs uppercase tracking-2xl">
                    <th className="px-2 py-1.5 text-left">#</th>
                    <th className="px-2 py-1.5 text-left">Equipo</th>
                    <th className="px-2 py-1.5 text-right">J</th>
                    <th className="px-2 py-1.5 text-right">G</th>
                    <th className="px-2 py-1.5 text-right">P</th>
                    <th className="px-2 py-1.5 text-right">Partidas</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => {
                    const team = teamById.get(row.teamId);
                    const qualifies = index < config.qualifiersPerGroup;
                    const cut = index === config.qualifiersPerGroup;
                    return (
                      <tr
                        className={`border-(--hair) border-t ${cut ? 'border-t-(--gold)/60 border-t-2' : ''} ${qualifies ? '' : 'opacity-70'}`}
                        key={row.teamId}
                      >
                        <td className="px-2 py-2 font-bold font-mono text-(--gold)">
                          {row.position}
                        </td>
                        <td className="px-2 py-2">
                          <span className="block font-semibold text-(--parchment)">
                            {teamLabel(team)}
                          </span>
                          {compact ? null : (
                            <span className="block text-(--faded) text-2xs">
                              {teamRoster(team)}
                            </span>
                          )}
                          {row.separatedBy && row.separatedBy !== 'wins' ? (
                            <span className="block font-mono text-(--faded) text-3xs uppercase tracking-wider">
                              por{' '}
                              {TIEBREAK_LABELS[row.separatedBy].toLowerCase()}
                            </span>
                          ) : null}
                          {row.tiedWith.length > 0 ? (
                            <span className="block font-mono text-(--ember) text-3xs uppercase tracking-wider">
                              empate pendiente
                            </span>
                          ) : null}
                        </td>
                        <td className="px-2 py-2 text-right font-mono text-(--faded)">
                          {row.played}
                        </td>
                        <td className="px-2 py-2 text-right font-mono text-(--parchment)">
                          {row.wins}
                        </td>
                        <td className="px-2 py-2 text-right font-mono text-(--parchment)">
                          {row.losses}
                        </td>
                        <td className="px-2 py-2 text-right font-mono text-(--faded)">
                          {row.gamesFor}–{row.gamesAgainst}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <p className="mt-3 font-mono text-(--faded) text-3xs uppercase tracking-wider">
                Clasifican {config.qualifiersPerGroup} · desempate:{' '}
                {config.tiebreakChain
                  .map((c) => TIEBREAK_LABELS[c].split(' (')[0])
                  .join(' → ')}
                {openTies.length > 0
                  ? ' · hay un empate que resolverá el organizador'
                  : ''}
              </p>
            </div>

            {/* Cross grid */}
            {compact ? null : (
              <div className={`${panel} overflow-x-auto p-4`}>
                <table className="border-collapse text-xs">
                  <thead>
                    <tr>
                      <th className="px-2 py-1" />
                      {rows.map((col) => (
                        <th
                          className="px-2 py-1 text-center font-mono text-(--faded) text-3xs uppercase"
                          key={col.teamId}
                        >
                          {shortLabel(teamById.get(col.teamId))}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr className="border-(--hair) border-t" key={row.teamId}>
                        <th className="px-2 py-1.5 text-left font-semibold text-(--parchment)">
                          {shortLabel(teamById.get(row.teamId))}
                        </th>
                        {rows.map((col) => {
                          if (row.teamId === col.teamId) {
                            return (
                              <td
                                className="bg-(--hair)/40 px-2 py-1.5"
                                key={col.teamId}
                              />
                            );
                          }
                          const cells = matches.filter(
                            (m) =>
                              !m.isTiebreak &&
                              ((m.teamAId === row.teamId &&
                                m.teamBId === col.teamId) ||
                                (m.teamAId === col.teamId &&
                                  m.teamBId === row.teamId)),
                          );
                          return (
                            <td
                              className="px-2 py-1.5 text-center"
                              key={col.teamId}
                            >
                              <span className="flex flex-col items-center gap-0.5">
                                {cells.map((m) => {
                                  const score = matchScore(m);
                                  const mine =
                                    m.teamAId === row.teamId
                                      ? score.a
                                      : score.b;
                                  const theirs =
                                    m.teamAId === row.teamId
                                      ? score.b
                                      : score.a;
                                  const won = m.winnerTeamId === row.teamId;
                                  const lost = m.winnerTeamId !== null && !won;
                                  return (
                                    <Link
                                      className={`rounded px-1.5 py-0.5 font-mono tabular-nums ${
                                        won
                                          ? 'bg-(--moss)/20 text-(--moss)'
                                          : lost
                                            ? 'bg-(--ember)/15 text-(--ember)'
                                            : 'text-(--faded)'
                                      }`}
                                      href={`/matches/${m.id}`}
                                      key={m.id}
                                    >
                                      {m.winnerTeamId
                                        ? `${mine}–${theirs}`
                                        : '·'}
                                    </Link>
                                  );
                                })}
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
};

/** Captain's name: short enough for a grid header. */
const shortLabel = (team: LiveState['teams'][number] | undefined) =>
  team?.name ?? team?.members.find((m) => m.isCaptain)?.name ?? '—';

export { GroupView };
