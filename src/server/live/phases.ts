import { asc, eq, inArray } from 'drizzle-orm';

import { matchScore } from '@/lib/live/match-score';
import type { GroupTiebreakCriterion } from '@/lib/tournament/tiebreak';
import type { db as Db } from '@/server/db';
import {
  match,
  matchGame,
  phase,
  phaseBracketConfig,
  phaseBracketRoundConfig,
  phaseFactionRules,
  phaseGroup,
  phaseGroupConfig,
  phaseGroupTeam,
  tournamentSwissConfig,
} from '@/server/db/schema';
import type { Tx } from '@/server/live/tx';

type Database = typeof Db;

type LivePhase = {
  id: string;
  order: number;
  type: 'group' | 'bracket' | 'swiss';
  name: string | null;
  group: {
    groupCount: number;
    roundsFormat: 'single' | 'double';
    gamesToWinMatch: number;
    tiebreakChain: GroupTiebreakCriterion[];
    qualifiersPerGroup: number;
    groupDistribution: 'random' | 'manual';
  } | null;
  bracket: {
    hasThirdPlaceMatch: boolean;
    seedingSource: 'previous_phase' | 'ranking' | 'manual';
    rounds: { roundIndex: number; gamesToWinMatch: number }[];
  } | null;
  swiss: {
    eliminationLosses: number;
    pairingMethod: 'random' | 'ranking_parity' | 'ranking_seed';
  } | null;
  factions: {
    allowRepeatAcrossTeams: boolean;
    poolMode: 'fresh' | 'depleting';
    poolCarriesOver: boolean;
  } | null;
  groups: { id: string; index: number; label: string; teamIds: string[] }[];
  matches: LiveMatch[];
};

type LiveMatch = {
  id: string;
  phaseId: string;
  groupId: string | null;
  roundIndex: number | null;
  leg: number | null;
  order: number | null;
  teamAId: string | null;
  teamBId: string | null;
  winnerTeamId: string | null;
  status: 'scheduled' | 'in_progress' | 'completed';
  isThirdPlace: boolean;
  isTiebreak: boolean;
  byeTeamId: string | null;
  feederMatchAId: string | null;
  feederMatchBId: string | null;
  games: {
    id: string;
    gameNumber: number | null;
    winnerTeamId: string | null;
    status: string;
  }[];
};

/** Every phase of a tournament with its configuration, groups and matches. */
const loadPhases = async (
  db: Database | Tx,
  tournamentId: string,
): Promise<LivePhase[]> => {
  const phaseRows = await db
    .select()
    .from(phase)
    .where(eq(phase.tournamentId, tournamentId))
    .orderBy(asc(phase.phaseOrder));
  if (phaseRows.length === 0) return [];
  const phaseIds = phaseRows.map((row) => row.id);
  const [
    groupConfigs,
    bracketConfigs,
    roundConfigs,
    factionRules,
    swissConfigs,
    groups,
    groupTeams,
    matches,
  ] = await Promise.all([
    db
      .select()
      .from(phaseGroupConfig)
      .where(inArray(phaseGroupConfig.phaseId, phaseIds)),
    db
      .select()
      .from(phaseBracketConfig)
      .where(inArray(phaseBracketConfig.phaseId, phaseIds)),
    db
      .select()
      .from(phaseBracketRoundConfig)
      .where(inArray(phaseBracketRoundConfig.phaseId, phaseIds))
      .orderBy(asc(phaseBracketRoundConfig.roundIndex)),
    db
      .select()
      .from(phaseFactionRules)
      .where(inArray(phaseFactionRules.phaseId, phaseIds)),
    db
      .select()
      .from(tournamentSwissConfig)
      .where(eq(tournamentSwissConfig.tournamentId, tournamentId)),
    db
      .select()
      .from(phaseGroup)
      .where(inArray(phaseGroup.phaseId, phaseIds))
      .orderBy(asc(phaseGroup.groupIndex)),
    db.select().from(phaseGroupTeam),
    db
      .select()
      .from(match)
      .where(inArray(match.phaseId, phaseIds))
      .orderBy(asc(match.roundIndex), asc(match.order), asc(match.createdAt)),
  ]);
  const matchIds = matches.map((row) => row.id);
  const games =
    matchIds.length > 0
      ? await db
          .select()
          .from(matchGame)
          .where(inArray(matchGame.matchId, matchIds))
          .orderBy(asc(matchGame.gameNumber), asc(matchGame.playedAt))
      : [];
  const groupIds = new Set(groups.map((g) => g.id));
  const swiss = swissConfigs[0] ?? null;

  return phaseRows.map((row) => {
    const gc = groupConfigs.find((c) => c.phaseId === row.id);
    const bc = bracketConfigs.find((c) => c.phaseId === row.id);
    const fr = factionRules.find((c) => c.phaseId === row.id);
    const phaseGroups = groups
      .filter((g) => g.phaseId === row.id)
      .map((g) => ({
        id: g.id,
        index: g.groupIndex,
        label: g.label,
        teamIds: groupTeams
          .filter((gt) => gt.groupId === g.id && groupIds.has(gt.groupId))
          .sort((a, b) => a.seed - b.seed)
          .map((gt) => gt.teamId),
      }));
    return {
      id: row.id,
      order: row.phaseOrder,
      type: row.type,
      name: row.name,
      group: gc
        ? {
            groupCount: gc.groupCount,
            roundsFormat: gc.roundsFormat,
            gamesToWinMatch: gc.gamesToWinMatch,
            tiebreakChain: gc.tiebreakChain,
            qualifiersPerGroup: gc.qualifiersPerGroup,
            groupDistribution: gc.groupDistribution,
          }
        : null,
      bracket: bc
        ? {
            hasThirdPlaceMatch: bc.hasThirdPlaceMatch,
            seedingSource: bc.seedingSource,
            rounds: roundConfigs
              .filter((r) => r.phaseId === row.id)
              .map((r) => ({
                roundIndex: r.roundIndex,
                gamesToWinMatch: r.gamesToWinMatch,
              })),
          }
        : null,
      swiss:
        row.type === 'swiss' && swiss
          ? {
              eliminationLosses: swiss.eliminationLosses,
              pairingMethod: swiss.pairingMethod,
            }
          : null,
      factions: fr
        ? {
            allowRepeatAcrossTeams: fr.allowRepeatAcrossTeams,
            poolMode: fr.poolMode,
            poolCarriesOver: fr.poolCarriesOver,
          }
        : null,
      groups: phaseGroups,
      matches: matches
        .filter((m) => m.phaseId === row.id)
        .map((m) => ({
          id: m.id,
          phaseId: m.phaseId,
          groupId: m.groupId,
          roundIndex: m.roundIndex,
          leg: m.leg,
          order: m.order,
          teamAId: m.teamAId,
          teamBId: m.teamBId,
          winnerTeamId: m.winnerTeamId,
          status: m.status,
          isThirdPlace: m.isThirdPlace,
          isTiebreak: m.isTiebreak,
          byeTeamId: m.byeTeamId,
          feederMatchAId: m.feederMatchAId,
          feederMatchBId: m.feederMatchBId,
          games: games
            .filter((g) => g.matchId === m.id)
            .map((g) => ({
              id: g.id,
              gameNumber: g.gameNumber,
              winnerTeamId: g.winnerTeamId,
              status: g.status,
            })),
        })),
    };
  });
};

/** Games needed to win a given match, from its phase's configuration. */
const gamesToWinFor = (
  phaseRow: LivePhase,
  m: Pick<LiveMatch, 'roundIndex'>,
) => {
  if (phaseRow.group) return phaseRow.group.gamesToWinMatch;
  if (phaseRow.bracket) {
    return (
      phaseRow.bracket.rounds.find((r) => r.roundIndex === m.roundIndex)
        ?.gamesToWinMatch ??
      phaseRow.bracket.rounds.at(-1)?.gamesToWinMatch ??
      1
    );
  }
  return 1;
};

export {
  gamesToWinFor,
  type LiveMatch,
  type LivePhase,
  loadPhases,
  matchScore,
};
