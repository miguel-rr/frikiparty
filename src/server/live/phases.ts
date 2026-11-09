import { asc, eq, inArray } from 'drizzle-orm';

import { gamesToWinFor } from '@/lib/live/games-to-win';
import type { RingSides } from '@/lib/live/map-board';
import { matchScore } from '@/lib/live/match-score';
import type { GroupTiebreakCriterion } from '@/lib/tournament/tiebreak';
import type { db as Db } from '@/server/db';
import {
  type MatchGameStatus,
  match,
  matchGame,
  matchGameFactionDraw,
  matchGamePlayerFaction,
  matchGamePlayerPosition,
  matchGameSaveFile,
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
  groups: {
    id: string;
    index: number;
    label: string;
    teamIds: string[];
    tieResolutions: string[][];
  }[];
  matches: LiveMatch[];
};

/** One game of a match, with everything the sheet shows. */
type LiveGame = {
  id: string;
  gameNumber: number | null;
  winnerTeamId: string | null;
  status: MatchGameStatus;
  map: string | null;
  mapId: string | null;
  readyTeamAAt: string | null;
  readyTeamBAt: string | null;
  confirmedTeamAAt: string | null;
  confirmedTeamBAt: string | null;
  startedAt: string | null;
  playedAt: string | null;
  /** What the draw handed each team, in draw order. */
  draws: { teamId: string; factionId: string; drawOrder: number }[];
  /**
   * The captains' distribution: one faction per player. Secret until the
   * game starts (both confirmed): empty for readers without `secrets`.
   */
  lineup: { playerId: string; factionId: string }[];
  /** Which rings of the map's board each team uses; null without a board. */
  ringSides: RingSides | null;
  /** Each player's ring on the board; secret like the line-up. */
  positions: { playerId: string; ring: number }[];
  saveFiles: {
    id: string;
    url: string;
    fileName: string | null;
    fileSize: number | null;
    uploadedByUserId: string | null;
    createdAt: string;
  }[];
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
  games: LiveGame[];
};

/**
 * Every phase of a tournament with its configuration, groups and matches.
 * A game's line-up and positions stay out until it starts, unless the
 * caller acts on them (`secrets`): the snapshot is broadcast to everyone,
 * the organiser included, and the rival captain must not see them.
 */
const loadPhases = async (
  db: Database | Tx,
  tournamentId: string,
  options: { secrets?: boolean } = {},
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
  const gameIds = games.map((g) => g.id);
  const [draws, lineups, saveFiles, positions] =
    gameIds.length > 0
      ? await Promise.all([
          db
            .select()
            .from(matchGameFactionDraw)
            .where(inArray(matchGameFactionDraw.matchGameId, gameIds))
            .orderBy(asc(matchGameFactionDraw.drawOrder)),
          db
            .select()
            .from(matchGamePlayerFaction)
            .where(inArray(matchGamePlayerFaction.matchGameId, gameIds)),
          db
            .select()
            .from(matchGameSaveFile)
            .where(inArray(matchGameSaveFile.matchGameId, gameIds))
            .orderBy(asc(matchGameSaveFile.createdAt)),
          db
            .select()
            .from(matchGamePlayerPosition)
            .where(inArray(matchGamePlayerPosition.matchGameId, gameIds)),
        ])
      : [[], [], [], []];
  const revealed = (status: MatchGameStatus) =>
    options.secrets || status === 'ready' || status === 'completed';
  const iso = (value: Date | null) => value?.toISOString() ?? null;
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
        tieResolutions: g.tieResolutions,
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
            .map(
              (g): LiveGame => ({
                id: g.id,
                gameNumber: g.gameNumber,
                winnerTeamId: g.winnerTeamId,
                status: g.status,
                map: g.map,
                mapId: g.mapId,
                readyTeamAAt: iso(g.readyTeamAAt),
                readyTeamBAt: iso(g.readyTeamBAt),
                confirmedTeamAAt: iso(g.confirmedTeamAAt),
                confirmedTeamBAt: iso(g.confirmedTeamBAt),
                startedAt: iso(g.startedAt),
                playedAt: iso(g.playedAt),
                draws: draws
                  .filter((d) => d.matchGameId === g.id)
                  .map((d) => ({
                    teamId: d.teamId,
                    factionId: d.factionId,
                    drawOrder: d.drawOrder,
                  })),
                lineup: revealed(g.status)
                  ? lineups
                      .filter((l) => l.matchGameId === g.id)
                      .map((l) => ({
                        playerId: l.playerId,
                        factionId: l.factionId,
                      }))
                  : [],
                ringSides: g.ringSides ?? null,
                positions: revealed(g.status)
                  ? positions
                      .filter((p) => p.matchGameId === g.id)
                      .map((p) => ({ playerId: p.playerId, ring: p.ring }))
                  : [],
                saveFiles: saveFiles
                  .filter((f) => f.matchGameId === g.id)
                  .map((f) => ({
                    id: f.id,
                    url: f.url,
                    fileName: f.fileName,
                    fileSize: f.fileSize,
                    uploadedByUserId: f.uploadedByUserId,
                    createdAt: f.createdAt.toISOString(),
                  })),
              }),
            ),
        })),
    };
  });
};

export {
  gamesToWinFor,
  type LiveGame,
  type LiveMatch,
  type LivePhase,
  loadPhases,
  matchScore,
};
