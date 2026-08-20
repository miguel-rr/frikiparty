import { createPartido, recordGame } from '@/lib/simulator/match';
import type { BracketMatch, BracketPhase } from '@/lib/simulator/types';

/**
 * Standard bracket seeding (1 vs last, 2 vs second-last, ...) from
 * `seededTeamIds` (best first). When the team count isn't a power of two,
 * the bottom seeds play a play-in round (round 0) instead of getting byes,
 * and the winners fill the lowest seed lines of the main bracket.
 */
const buildBracket = (
  seededTeamIds: string[],
  phase: BracketPhase,
): BracketMatch[] => {
  const n = seededTeamIds.length;
  const target = n <= 1 ? 1 : 2 ** Math.floor(Math.log2(n));
  const excess = n - target;

  const matches: BracketMatch[] = [];
  const slotTeam: (string | null)[] = new Array(target + 1).fill(null);
  const slotFeeder: (string | null)[] = new Array(target + 1).fill(null);

  if (excess > 0) {
    // Bottom 2 * excess seeds play (excess) play-in matches; winners take
    // the lowest seed lines (target - excess + 1 .. target).
    const playInTeams = seededTeamIds.slice(target - excess);
    for (let i = 0; i < excess; i++) {
      const teamAId = playInTeams[2 * i] ?? null;
      const teamBId = playInTeams[2 * i + 1] ?? null;
      const match: BracketMatch = {
        id: crypto.randomUUID(),
        round: 0,
        teamAId,
        teamBId,
        feederAMatchId: null,
        feederBMatchId: null,
        partido:
          teamAId && teamBId
            ? createPartido(teamAId, teamBId, phase.gamesToWinMatch)
            : null,
      };
      matches.push(match);
      slotFeeder[target - excess + 1 + i] = match.id;
    }
    for (let seed = 1; seed <= target - excess; seed++) {
      slotTeam[seed] = seededTeamIds[seed - 1] ?? null;
    }
  } else {
    for (let seed = 1; seed <= target; seed++) {
      slotTeam[seed] = seededTeamIds[seed - 1] ?? null;
    }
  }

  let roundMatchIds: string[] = [];
  for (let seed = 1; seed <= target / 2; seed++) {
    const otherSeed = target + 1 - seed;
    const teamAId = slotTeam[seed] ?? null;
    const teamBId = slotTeam[otherSeed] ?? null;
    const match: BracketMatch = {
      id: crypto.randomUUID(),
      round: 1,
      teamAId,
      teamBId,
      feederAMatchId: teamAId ? null : (slotFeeder[seed] ?? null),
      feederBMatchId: teamBId ? null : (slotFeeder[otherSeed] ?? null),
      partido:
        teamAId && teamBId
          ? createPartido(teamAId, teamBId, phase.gamesToWinMatch)
          : null,
    };
    matches.push(match);
    roundMatchIds.push(match.id);
  }

  let round = 2;
  while (roundMatchIds.length > 1) {
    const nextRoundIds: string[] = [];
    for (let i = 0; i < roundMatchIds.length; i += 2) {
      const match: BracketMatch = {
        id: crypto.randomUUID(),
        round,
        teamAId: null,
        teamBId: null,
        feederAMatchId: roundMatchIds[i] ?? null,
        feederBMatchId: roundMatchIds[i + 1] ?? null,
        partido: null,
      };
      matches.push(match);
      nextRoundIds.push(match.id);
    }
    roundMatchIds = nextRoundIds;
    round++;
  }

  return matches;
};

/** Records a game into the given match, then propagates a resolved winner into whichever match feeds from it. */
const recordBracketGame = (
  matches: BracketMatch[],
  matchId: string,
  winningTeamId: string,
  factionByPlayerId: Record<string, string>,
  phase: BracketPhase,
): BracketMatch[] => {
  const current = matches.find((match) => match.id === matchId);
  if (!current?.partido) return matches;

  const updatedPartido = recordGame(
    current.partido,
    winningTeamId,
    factionByPlayerId,
  );
  let next = matches.map((match) =>
    match.id === matchId ? { ...match, partido: updatedPartido } : match,
  );

  if (!updatedPartido.winnerTeamId) return next;
  const winnerTeamId = updatedPartido.winnerTeamId;

  next = next.map((match) => {
    const feedsA = match.feederAMatchId === matchId;
    const feedsB = match.feederBMatchId === matchId;
    if (!feedsA && !feedsB) return match;
    const teamAId = feedsA ? winnerTeamId : match.teamAId;
    const teamBId = feedsB ? winnerTeamId : match.teamBId;
    const partido =
      teamAId && teamBId
        ? createPartido(teamAId, teamBId, phase.gamesToWinMatch)
        : match.partido;
    return { ...match, teamAId, teamBId, partido };
  });

  return next;
};

const isBracketPhaseComplete = (matches: BracketMatch[]): boolean => {
  const maxRound = matches.reduce(
    (max, match) => Math.max(max, match.round),
    0,
  );
  const final = matches.find((match) => match.round === maxRound);
  return Boolean(final?.partido?.winnerTeamId);
};

const getBracketChampion = (matches: BracketMatch[]): string | null => {
  const maxRound = matches.reduce(
    (max, match) => Math.max(max, match.round),
    0,
  );
  const final = matches.find((match) => match.round === maxRound);
  return final?.partido?.winnerTeamId ?? null;
};

/**
 * Best-effort team order once a bracket phase is done, for seeding a phase
 * that follows it (uncommon — brackets are normally last). Champion first,
 * then by the round they were eliminated in (later = better); ties within
 * the same round keep the order they were resolved in, which is a
 * reasonable approximation rather than a spec-defined ranking.
 */
const getBracketFinalOrder = (matches: BracketMatch[]): string[] => {
  const maxRound = matches.reduce(
    (max, match) => Math.max(max, match.round),
    0,
  );
  const eliminatedAtRound = new Map<string, number>();
  for (const match of matches) {
    if (!match.partido?.winnerTeamId) continue;
    const loserId =
      match.partido.teamAId === match.partido.winnerTeamId
        ? match.partido.teamBId
        : match.partido.teamAId;
    eliminatedAtRound.set(loserId, match.round);
  }
  const champion = getBracketChampion(matches);
  if (champion) eliminatedAtRound.set(champion, maxRound + 1);
  return [...eliminatedAtRound.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([teamId]) => teamId);
};

export {
  buildBracket,
  getBracketChampion,
  getBracketFinalOrder,
  isBracketPhaseComplete,
  recordBracketGame,
};
