import { createPartido, recordGame } from '@/lib/tournament/match';
import type { GroupPhase, Partido, Team } from '@/lib/tournament/types';

/** Every required pairing: once per pair (`single`) or twice (`double`). */
const generateGroupMatches = (
  teamIds: string[],
  phase: GroupPhase,
): Partido[] => {
  const matches: Partido[] = [];
  for (let i = 0; i < teamIds.length; i++) {
    for (let j = i + 1; j < teamIds.length; j++) {
      const teamAId = teamIds[i];
      const teamBId = teamIds[j];
      if (!teamAId || !teamBId) continue;
      matches.push(createPartido(teamAId, teamBId, phase.gamesToWinMatch));
      if (phase.rounds === 'double') {
        matches.push(createPartido(teamAId, teamBId, phase.gamesToWinMatch));
      }
    }
  }
  return matches;
};

const isGroupPhaseComplete = (matches: Partido[]): boolean =>
  matches.every((match) => match.winnerTeamId !== null);

const averageRankingPosition = (team: Team, ranking: string[]): number => {
  const positions = team.playerIds.map((id) => {
    const index = ranking.indexOf(id);
    return index === -1 ? ranking.length : index;
  });
  return (
    positions.reduce((sum, position) => sum + position, 0) /
    (positions.length || 1)
  );
};

const sumRings = (
  team: Team,
  getPlayerRings: (playerId: string) => number,
): number => team.playerIds.reduce((sum, id) => sum + getPlayerRings(id), 0);

type GroupStanding = { teamId: string; wins: number; losses: number };

/**
 * Sorted by wins descending; ties broken per `phase.tiebreak`. Both
 * tiebreaks deliberately favor the weaker-rostered team on a tie, exactly
 * as `core-logic.md` specifies ("el peor equipo... quedará por encima").
 * `getPlayerRings` is only consulted for the `'inverse-rings'` tiebreak —
 * callers with no rings data (or that never use that tiebreak) can pass
 * `() => 0`.
 */
const computeGroupStandings = (
  matches: Partido[],
  teams: Team[],
  phase: GroupPhase,
  ranking: string[],
  getPlayerRings: (playerId: string) => number,
): GroupStanding[] => {
  const teamById = new Map(teams.map((team) => [team.id, team]));

  const standings: GroupStanding[] = teams.map((team) => ({
    teamId: team.id,
    wins: matches.filter((match) => match.winnerTeamId === team.id).length,
    losses: matches.filter(
      (match) =>
        match.winnerTeamId &&
        match.winnerTeamId !== team.id &&
        (match.teamAId === team.id || match.teamBId === team.id),
    ).length,
  }));

  return [...standings].sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    const teamA = teamById.get(a.teamId);
    const teamB = teamById.get(b.teamId);
    if (!teamA || !teamB) return 0;
    if (phase.tiebreak === 'inverse-ranking') {
      return (
        averageRankingPosition(teamB, ranking) -
        averageRankingPosition(teamA, ranking)
      );
    }
    return sumRings(teamA, getPlayerRings) - sumRings(teamB, getPlayerRings);
  });
};

export type { GroupStanding };
export {
  computeGroupStandings,
  generateGroupMatches,
  isGroupPhaseComplete,
  recordGame,
};
