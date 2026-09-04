import { matchScore } from '@/lib/live/match-score';
import {
  computeStandings,
  type StandingRow,
} from '@/lib/tournament/phase-engine';
import type { GroupTiebreakCriterion } from '@/lib/tournament/tiebreak';

type TeamRef = {
  id: string;
  members: { playerId: string; isCaptain: boolean }[];
};

type ParticipantRef = { id: string; rings: number; individualRings: number };

type MatchRef = {
  groupId: string | null;
  teamAId: string | null;
  teamBId: string | null;
  winnerTeamId: string | null;
  isTiebreak: boolean;
  games: { winnerTeamId: string | null }[];
};

/**
 * Standings of one group from the live snapshot: the phase's tie-break
 * chain over the group's matches, with the roster's average ranking place
 * (worse above, for `ranking_inverse`) and its summed rings (fewer above,
 * for `rings_inverse`). Tie-break matches don't count as group results;
 * the manual resolutions the organiser recorded come in `manual`.
 */
const groupStandings = (input: {
  teamIds: string[];
  teams: TeamRef[];
  participants: ParticipantRef[];
  ranking: string[];
  matches: MatchRef[];
  chain: GroupTiebreakCriterion[];
  manual?: string[][];
}): StandingRow[] => {
  const teamById = new Map(input.teams.map((t) => [t.id, t]));
  const ringsById = new Map(
    input.participants.map((p) => [p.id, p.rings + p.individualRings]),
  );
  const place = (playerId: string) => {
    const index = input.ranking.indexOf(playerId);
    return index === -1 ? input.ranking.length : index;
  };
  const rankKey = (teamId: string) => {
    const team = teamById.get(teamId);
    if (!team || team.members.length === 0) return input.ranking.length;
    return (
      team.members.reduce((sum, m) => sum + place(m.playerId), 0) /
      team.members.length
    );
  };
  const rings = (teamId: string) =>
    (teamById.get(teamId)?.members ?? []).reduce(
      (sum, m) => sum + (ringsById.get(m.playerId) ?? 0),
      0,
    );
  return computeStandings({
    teamIds: input.teamIds,
    matches: input.matches
      .filter((m) => !m.isTiebreak)
      .map((m) => {
        const score = matchScore(m);
        return {
          teamAId: m.teamAId,
          teamBId: m.teamBId,
          winnerTeamId: m.winnerTeamId,
          gamesA: score.a,
          gamesB: score.b,
        };
      }),
    chain: input.chain,
    teamRankKey: rankKey,
    teamRings: rings,
    manual: input.manual,
  });
};

export { groupStandings };
