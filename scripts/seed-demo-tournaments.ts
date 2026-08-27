/**
 * One-off seed script: simulates several complete tournaments end to end
 * (draft, auction, classic with group+bracket, swiss individual) to exercise
 * the real schema with realistic data. Reuses the already-validated pure
 * simulator logic (src/lib/simulator/*) for draft turns, auction resolution,
 * and bracket seeding/propagation, instead of re-deriving those algorithms.
 *
 * Run with: pnpm exec tsx scripts/seed-demo-tournaments.ts
 */
import { eq } from 'drizzle-orm';

import { slugify } from '@/lib/slug';

import {
  computeAuctionOrder,
  computeBudget,
  computeMinBidsByPot,
} from '@/lib/tournament/auction';
import {
  buildBracket,
  recordBracketGame,
} from '@/lib/tournament/bracket-phase';
import {
  buildCaptainOrder,
  buildDraftOrder,
  getAvailablePotIndices,
  getUndraftedPlayersInPot,
  resolveNextTurn,
} from '@/lib/tournament/draft';
import {
  computeGroupStandings,
  generateGroupMatches,
} from '@/lib/tournament/group-phase';
import { createPartido, recordGame } from '@/lib/tournament/match';
import { generatePots } from '@/lib/tournament/pots';
import { sortByHistoricalRanking } from '@/lib/tournament/ranking';
import type {
  BracketMatch,
  BracketPhase,
  DraftState,
  GroupPhase,
  Partido,
  Player as SimPlayer,
  Team as SimTeam,
} from '@/lib/tournament/types';
import { db } from '@/server/db';
import {
  auction,
  auctionBid,
  auctionLot,
  draft,
  draftPick,
  edition,
  faction,
  game,
  gameVersion,
  match,
  matchGame,
  matchGamePlayerFaction,
  phase,
  phaseBracketRoundConfig,
  phaseGroupConfig,
  player,
  team,
  teamFormationPotPlayer,
  teamMember,
  tournament,
  tournamentRankingSnapshot,
  tournamentSwissConfig,
  venue,
} from '@/server/db/schema';

const PLAYER_NAMES = [
  'Centella',
  'Yunque',
  'El Cuervo',
  'Trasgo Errante',
  'Doble Filo',
  'Brasa',
  'Espino',
  'Forastero',
  'Grisáceo',
  'Trueno',
  'Cazador Gris',
  'Marisco',
  'Piedra Lunar',
  'Vendaval',
  'Filo Frío',
  'Errante del Norte',
  'Sombra Larga',
  'Puño de Roble',
  'Alba',
  'Custodio',
];

const MAPS = [
  'Osgiliath',
  'Minas Tirith',
  'Cuernavilla',
  'Isengard',
  'Rivendel',
];

const randomItem = <T>(items: T[]): T => {
  const item = items[Math.floor(Math.random() * items.length)];
  if (item === undefined)
    throw new Error('randomItem called on an empty array');
  return item;
};

/** Tracks each player's derived-ranking inputs as tournaments resolve, in chronological order. */
type PlayerStats = {
  rings: number;
  individualRings: number;
  editions: Set<string>;
};

const emptyStats = (): PlayerStats => ({
  rings: 0,
  individualRings: 0,
  editions: new Set(),
});

const statsToRanking = (
  playerIds: string[],
  names: Map<string, string>,
  stats: Map<string, PlayerStats>,
): string[] => {
  const simPlayers: SimPlayer[] = playerIds.map((id) => {
    const s = stats.get(id) ?? emptyStats();
    return {
      id,
      name: names.get(id) ?? id,
      rings: s.rings,
      individualRings: s.individualRings,
      editionsPlayed: s.editions.size,
    };
  });
  return sortByHistoricalRanking(simPlayers);
};

const recordParticipation = (
  stats: Map<string, PlayerStats>,
  playerIds: string[],
  editionId: string,
) => {
  for (const id of playerIds) {
    const s = stats.get(id) ?? emptyStats();
    s.editions.add(editionId);
    stats.set(id, s);
  }
};

async function main() {
  console.log('Seeding demo tournaments…');

  // --- Players -----------------------------------------------------------
  const players = await db
    .insert(player)
    .values(PLAYER_NAMES.map((name) => ({ name, slug: slugify(name) })))
    .returning({ id: player.id, name: player.name });
  const playerIdByName = new Map(players.map((p) => [p.name, p.id]));
  const nameByPlayerId = new Map(players.map((p) => [p.id, p.name]));
  const id = (name: string): string => {
    const found = playerIdByName.get(name);
    if (!found) throw new Error(`Unknown seed player "${name}"`);
    return found;
  };

  const stats = new Map<string, PlayerStats>();

  const insertRankingSnapshot = async (
    tournamentId: string,
    ranking: string[],
    participantIds: Set<string>,
  ) => {
    const rows = ranking
      .filter((pid) => participantIds.has(pid))
      .map((playerId, index) => {
        const s = stats.get(playerId) ?? emptyStats();
        return {
          tournamentId,
          playerId,
          position: index + 1,
          rings: s.rings,
          individualRings: s.individualRings,
          editionsPlayed: s.editions.size,
        };
      });
    if (rows.length > 0)
      await db.insert(tournamentRankingSnapshot).values(rows);
  };

  // --- Editions ------------------------------------------------------------
  const [gredosVenue] = await db
    .insert(venue)
    .values({ name: 'Refugio de Gredos, Ávila' })
    .returning({ id: venue.id });
  if (!gredosVenue) throw new Error('Failed to insert venue');
  const [edition2025] = await db
    .insert(edition)
    .values({ year: 2025, order: 1, venueId: gredosVenue.id })
    .returning({ id: edition.id });
  const [edition2026] = await db
    .insert(edition)
    .values({ year: 2026, order: 1, venueId: gredosVenue.id })
    .returning({ id: edition.id });
  if (!edition2025 || !edition2026)
    throw new Error('Failed to insert editions');

  // --- Game catalog --------------------------------------------------------
  const [aotr] = await db
    .insert(game)
    .values({ name: 'Age of the Ring', isOfficial: true })
    .returning({ id: game.id });
  if (!aotr) throw new Error('Failed to insert game');
  const [aotrV106] = await db
    .insert(gameVersion)
    .values({ gameId: aotr.id, version: '1.06', releaseOrder: 1 })
    .returning({ id: gameVersion.id });
  if (!aotrV106) throw new Error('Failed to insert game version');
  const factionRows = await db
    .insert(faction)
    .values(
      ['Gondor', 'Rohan', 'Mordor', 'Isengard', 'Rivendel', 'Dol Guldur'].map(
        (name) => ({
          introducedInVersionId: aotrV106.id,
          name,
        }),
      ),
    )
    .returning({ id: faction.id });
  const factionIds = factionRows.map((f) => f.id);
  const randomFactionsFor = (playerIds: string[]): Record<string, string> =>
    Object.fromEntries(playerIds.map((pid) => [pid, randomItem(factionIds)]));

  let dayOffset = 0;
  const nextDate = (baseYear: number): Date => {
    dayOffset += 1;
    return new Date(baseYear, 9, 18 + dayOffset);
  };

  // ---------------------------------------------------------------------
  // Shared simulation + insertion helpers
  // ---------------------------------------------------------------------

  /** Plays a standalone (non-bracket) partido to completion, fully random per game. */
  const simulatePartido = (
    partidoInit: Partido,
    roster: Map<string, string[]>,
  ): Partido => {
    let partido = partidoInit;
    while (!partido.winnerTeamId) {
      const winner = Math.random() < 0.5 ? partido.teamAId : partido.teamBId;
      const playersInGame = [
        ...(roster.get(partido.teamAId) ?? []),
        ...(roster.get(partido.teamBId) ?? []),
      ];
      partido = recordGame(partido, winner, randomFactionsFor(playersInGame));
    }
    return partido;
  };

  const insertPartido = async (
    phaseId: string,
    partido: Partido,
    baseYear: number,
    roundIndex: number | null,
    leg: number | null,
  ): Promise<string> => {
    const [row] = await db
      .insert(match)
      .values({
        phaseId,
        teamAId: partido.teamAId,
        teamBId: partido.teamBId,
        winnerTeamId: partido.winnerTeamId,
        status: 'completed',
        playedAt: nextDate(baseYear),
        roundIndex,
        leg,
      })
      .returning({ id: match.id });
    if (!row) throw new Error('Failed to insert match');

    for (const partidaGame of partido.games) {
      const [gameRow] = await db
        .insert(matchGame)
        .values({
          matchId: row.id,
          winnerTeamId: partidaGame.winningTeamId,
          map: randomItem(MAPS),
          playedAt: nextDate(baseYear),
        })
        .returning({ id: matchGame.id });
      if (!gameRow) throw new Error('Failed to insert match_game');

      const factionEntries = Object.entries(partidaGame.factionByPlayerId);
      if (factionEntries.length > 0) {
        await db.insert(matchGamePlayerFaction).values(
          factionEntries.map(([playerId, factionId]) => ({
            matchGameId: gameRow.id,
            playerId,
            factionId,
          })),
        );
      }
    }

    return row.id;
  };

  const runGroupPhase = async (
    tournamentId: string,
    phaseOrder: number,
    teamIds: string[],
    roster: Map<string, string[]>,
    ranking: string[],
    baseYear: number,
  ) => {
    const groupPhaseDef: GroupPhase = {
      id: 'group',
      type: 'group',
      rounds: 'single',
      gamesToWinMatch: 2,
      tiebreak: 'inverse-ranking',
    };
    const [phaseRow] = await db
      .insert(phase)
      .values({ tournamentId, phaseOrder, type: 'group' })
      .returning({ id: phase.id });
    if (!phaseRow) throw new Error('Failed to insert group phase');
    await db.insert(phaseGroupConfig).values({
      phaseId: phaseRow.id,
      roundsFormat: groupPhaseDef.rounds,
      gamesToWinMatch: groupPhaseDef.gamesToWinMatch,
      tiebreakMethod: 'ranking_inverse',
    });

    const partidos = generateGroupMatches(teamIds, groupPhaseDef);
    const resolved = partidos.map((p) => simulatePartido(p, roster));
    for (const p of resolved) {
      await insertPartido(phaseRow.id, p, baseYear, null, null);
    }

    const simTeams: SimTeam[] = teamIds.map((tid) => ({
      id: tid,
      name: tid,
      playerIds: roster.get(tid) ?? [],
    }));
    // Always uses the 'inverse-ranking' tiebreak, so a rings lookup is never actually needed.
    return computeGroupStandings(
      resolved,
      simTeams,
      groupPhaseDef,
      ranking,
      () => 0,
    );
  };

  /** Plays a single bracket match to completion via recordBracketGame, so propagation into the next round fires naturally. */
  const runBracketPhase = async (
    tournamentId: string,
    phaseOrder: number,
    seededTeamIds: string[],
    roster: Map<string, string[]>,
    baseYear: number,
    finalGamesToWinMatch: number,
  ): Promise<string> => {
    const [phaseRow] = await db
      .insert(phase)
      .values({ tournamentId, phaseOrder, type: 'bracket' })
      .returning({ id: phase.id });
    if (!phaseRow) throw new Error('Failed to insert bracket phase');

    const bracketDef: BracketPhase = {
      id: 'bracket',
      type: 'bracket',
      gamesToWinMatch: 1,
    };
    let matches = buildBracket(seededTeamIds, bracketDef);
    const maxRound = matches.reduce((max, m) => Math.max(max, m.round), 0);

    await db.insert(phaseBracketRoundConfig).values(
      Array.from({ length: maxRound + 1 }, (_, roundIndex) => ({
        phaseId: phaseRow.id,
        roundIndex,
        gamesToWinMatch: roundIndex === maxRound ? finalGamesToWinMatch : 1,
      })),
    );

    const simMatchIdToDbId = new Map<string, string>();

    for (let round = 0; round <= maxRound; round++) {
      const roundMatchIds = matches
        .filter((m) => m.round === round)
        .map((m) => m.id);
      for (const matchId of roundMatchIds) {
        let current = matches.find((m) => m.id === matchId) as BracketMatch;
        if (!current.teamAId || !current.teamBId || !current.partido) continue; // waiting on a feeder that never got teams (shouldn't happen once round-1 completes)

        const nextRoundGamesToWin =
          round + 1 === maxRound ? finalGamesToWinMatch : 1;
        let partido = current.partido;
        while (!partido.winnerTeamId) {
          const winner =
            Math.random() < 0.5 ? partido.teamAId : partido.teamBId;
          const playersInGame = [
            ...(roster.get(partido.teamAId) ?? []),
            ...(roster.get(partido.teamBId) ?? []),
          ];
          matches = recordBracketGame(
            matches,
            matchId,
            winner,
            randomFactionsFor(playersInGame),
            {
              id: 'bracket',
              type: 'bracket',
              gamesToWinMatch: nextRoundGamesToWin,
            },
          );
          current = matches.find((m) => m.id === matchId) as BracketMatch;
          if (!current.partido)
            throw new Error('Bracket match lost its partido mid-simulation');
          partido = current.partido;
        }

        const dbId = await insertPartido(
          phaseRow.id,
          partido,
          baseYear,
          round,
          null,
        );
        simMatchIdToDbId.set(matchId, dbId);
      }
    }

    for (const [simId, dbId] of simMatchIdToDbId) {
      const bm = matches.find((m) => m.id === simId);
      if (!bm) continue;
      const feederAId = bm.feederAMatchId
        ? simMatchIdToDbId.get(bm.feederAMatchId)
        : null;
      const feederBId = bm.feederBMatchId
        ? simMatchIdToDbId.get(bm.feederBMatchId)
        : null;
      if (feederAId || feederBId) {
        await db
          .update(match)
          .set({ feederMatchAId: feederAId, feederMatchBId: feederBId })
          .where(eq(match.id, dbId));
      }
    }

    const finalMatch = matches.find((m) => m.round === maxRound);
    const championTeamId = finalMatch?.partido?.winnerTeamId;
    if (!championTeamId)
      throw new Error('Bracket did not resolve to a champion');
    return championTeamId;
  };

  // ---------------------------------------------------------------------
  // Tournament A — Edición 2025, clásico, equipos, DRAFT, grupos + bracket
  // ---------------------------------------------------------------------
  console.log('Tournament A: 2025, classic, team, draft…');
  {
    const participantIds = PLAYER_NAMES.slice(0, 12).map(id);
    recordParticipation(stats, participantIds, edition2025.id);
    const ranking = statsToRanking(participantIds, nameByPlayerId, stats);

    const [t] = await db
      .insert(tournament)
      .values({
        editionId: edition2025.id,
        gameId: aotr.id,
        isOfficial: true,
        gameVersionId: aotrV106.id,
        model: 'classic',
      })
      .returning({ id: tournament.id });
    if (!t) throw new Error('Failed to insert tournament A');

    await insertRankingSnapshot(t.id, ranking, new Set(participantIds));

    const { pots, teamCount } = generatePots(ranking, 3);
    await db
      .insert(teamFormationPotPlayer)
      .values(
        pots.flatMap((pot, potIndex) =>
          pot.map((playerId) => ({ tournamentId: t.id, potIndex, playerId })),
        ),
      );

    const captains = pots[0] ?? [];
    const baseOrder = buildCaptainOrder(captains, ranking, 'inverse-ranking');
    const draftablePotCount = pots.length - 1;
    const turnQueue = buildDraftOrder(
      captains,
      baseOrder,
      draftablePotCount,
      'inverse-ranking',
      'snake',
    );
    let draftState: DraftState = { method: 'snake', turnQueue, picks: [] };
    const pickTimestamps: Date[] = [];
    for (;;) {
      const captainId = resolveNextTurn(draftState, pots);
      if (!captainId) break;
      const availablePots = getAvailablePotIndices(pots, draftState, captainId);
      const potIndex = randomItem(availablePots);
      const undrafted = getUndraftedPlayersInPot(pots, draftState, potIndex);
      const playerId = randomItem(undrafted);
      draftState = {
        ...draftState,
        picks: [...draftState.picks, { captainId, potIndex, playerId }],
      };
      pickTimestamps.push(nextDate(2025));
    }

    const [draftRow] = await db
      .insert(draft)
      .values({
        tournamentId: t.id,
        method: 'snake',
        captainOrderMethod: 'ranking_inverse',
      })
      .returning({ id: draft.id });
    if (!draftRow) throw new Error('Failed to insert draft');
    await db.insert(draftPick).values(
      draftState.picks.map((pick, index) => ({
        draftId: draftRow.id,
        captainPlayerId: pick.captainId,
        potIndex: pick.potIndex,
        pickedPlayerId: pick.playerId,
        pickedAt: pickTimestamps[index] ?? nextDate(2025),
      })),
    );

    const rosterByCaptain = new Map<string, string[]>();
    for (const captainId of captains)
      rosterByCaptain.set(captainId, [captainId]);
    for (const pick of draftState.picks)
      rosterByCaptain.get(pick.captainId)?.push(pick.playerId);

    const teamRows = await db
      .insert(team)
      .values(
        captains.map((_, index) => ({
          tournamentId: t.id,
          name: `Equipo ${index + 1}`,
        })),
      )
      .returning({ id: team.id });
    if (teamCount !== teamRows.length)
      throw new Error('Unexpected team count for tournament A');

    const teamIds: string[] = [];
    const teamRoster = new Map<string, string[]>();
    captains.forEach((captainId, index) => {
      const dbTeam = teamRows[index] as (typeof teamRows)[number];
      teamIds.push(dbTeam.id);
      teamRoster.set(dbTeam.id, rosterByCaptain.get(captainId) ?? []);
    });
    await db.insert(teamMember).values(
      teamIds.flatMap((teamId, index) => {
        const captainId = captains[index] as string;
        return (teamRoster.get(teamId) ?? []).map((playerId) => ({
          teamId,
          playerId,
          tournamentId: t.id,
          isCaptain: playerId === captainId,
        }));
      }),
    );

    const standings = await runGroupPhase(
      t.id,
      1,
      teamIds,
      teamRoster,
      ranking,
      2025,
    );
    const championId = await runBracketPhase(
      t.id,
      2,
      standings.map((s) => s.teamId),
      teamRoster,
      2025,
      2,
    );

    const championRoster = teamRoster.get(championId) ?? [];
    for (const playerId of championRoster) {
      const s = stats.get(playerId) ?? emptyStats();
      s.rings += 1;
      stats.set(playerId, s);
    }
    console.log(
      `  Champion: ${championRoster.map((pid) => nameByPlayerId.get(pid)).join(', ')}`,
    );
  }

  // ---------------------------------------------------------------------
  // Tournament B — Edición 2026, clásico, equipos, SUBASTA, grupos + bracket (con play-in)
  // ---------------------------------------------------------------------
  console.log('Tournament B: 2026, classic, team, auction…');
  {
    const participantIds = PLAYER_NAMES.slice(4, 16).map(id); // overlaps with A's back half
    recordParticipation(stats, participantIds, edition2026.id);
    const ranking = statsToRanking(participantIds, nameByPlayerId, stats);

    const [t] = await db
      .insert(tournament)
      .values({
        editionId: edition2026.id,
        gameId: aotr.id,
        isOfficial: true,
        gameVersionId: aotrV106.id,
        model: 'classic',
      })
      .returning({ id: tournament.id });
    if (!t) throw new Error('Failed to insert tournament B');

    await insertRankingSnapshot(t.id, ranking, new Set(participantIds));

    const { pots, teamCount } = generatePots(ranking, 2); // 6 captains + 6 pot-1 players -> 6 teams of 2
    await db
      .insert(teamFormationPotPlayer)
      .values(
        pots.flatMap((pot, potIndex) =>
          pot.map((playerId) => ({ tournamentId: t.id, potIndex, playerId })),
        ),
      );

    const captains = pots[0] ?? [];
    const minBidByPot = computeMinBidsByPot(pots);
    const budget = computeBudget(minBidByPot);
    const lots = computeAuctionOrder(pots);

    const [auctionRow] = await db
      .insert(auction)
      .values({ tournamentId: t.id })
      .returning({ id: auction.id });
    if (!auctionRow) throw new Error('Failed to insert auction');

    const rosterByCaptain = new Map<string, string[]>();
    for (const captainId of captains)
      rosterByCaptain.set(captainId, [captainId]);
    void budget; // spent budget is only tracked for realism in bid amounts, not persisted directly
    const wonCaptains = new Set<string>();

    for (let lotIndex = 0; lotIndex < lots.length; lotIndex++) {
      const lot = lots[lotIndex];
      if (!lot) continue;
      const eligible = captains.filter((c) => !wonCaptains.has(c));
      const isLast = lotIndex === lots.length - 1;
      const winner = isLast ? (eligible[0] as string) : randomItem(eligible);
      const price = isLast
        ? (minBidByPot[lot.potIndex] ?? 50)
        : (minBidByPot[lot.potIndex] ?? 50) + Math.floor(Math.random() * 3) * 5;

      const [dbLotRow] = await db
        .insert(auctionLot)
        .values({
          auctionId: auctionRow.id,
          potIndex: lot.potIndex,
          playerId: lot.playerId,
          soldAt: nextDate(2026),
          winningCaptainPlayerId: winner,
          finalPrice: price,
          wasAutoAssigned: isLast,
        })
        .returning({ id: auctionLot.id });
      if (!dbLotRow) throw new Error('Failed to insert auction_lot');

      if (!isLast) {
        await db.insert(auctionBid).values({
          lotId: dbLotRow.id,
          captainPlayerId: winner,
          amount: price,
          bidAt: nextDate(2026),
        });
      }

      wonCaptains.add(winner);
      rosterByCaptain.get(winner)?.push(lot.playerId);
    }

    const teamRows = await db
      .insert(team)
      .values(
        captains.map((_, index) => ({
          tournamentId: t.id,
          name: `Equipo ${index + 1}`,
        })),
      )
      .returning({ id: team.id });
    if (teamCount !== teamRows.length)
      throw new Error('Unexpected team count for tournament B');

    const teamIds: string[] = [];
    const teamRoster = new Map<string, string[]>();
    captains.forEach((captainId, index) => {
      const dbTeam = teamRows[index] as (typeof teamRows)[number];
      teamIds.push(dbTeam.id);
      teamRoster.set(dbTeam.id, rosterByCaptain.get(captainId) ?? []);
    });
    await db.insert(teamMember).values(
      teamIds.flatMap((teamId, index) => {
        const captainId = captains[index] as string;
        return (teamRoster.get(teamId) ?? []).map((playerId) => ({
          teamId,
          playerId,
          tournamentId: t.id,
          isCaptain: playerId === captainId,
        }));
      }),
    );

    const standings = await runGroupPhase(
      t.id,
      1,
      teamIds,
      teamRoster,
      ranking,
      2026,
    );
    const championId = await runBracketPhase(
      t.id,
      2,
      standings.map((s) => s.teamId),
      teamRoster,
      2026,
      2,
    );

    const championRoster = teamRoster.get(championId) ?? [];
    for (const playerId of championRoster) {
      const s = stats.get(playerId) ?? emptyStats();
      s.rings += 1;
      stats.set(playerId, s);
    }
    console.log(
      `  Champion: ${championRoster.map((pid) => nameByPlayerId.get(pid)).join(', ')}`,
    );
  }

  // ---------------------------------------------------------------------
  // Tournament C — Edición 2026, SUIZO, individual
  // ---------------------------------------------------------------------
  console.log('Tournament C: 2026, swiss, individual…');
  {
    const participantIds = PLAYER_NAMES.slice(12, 20).map(id);
    recordParticipation(stats, participantIds, edition2026.id);
    const ranking = statsToRanking(participantIds, nameByPlayerId, stats);

    const [t] = await db
      .insert(tournament)
      .values({
        editionId: edition2026.id,
        gameId: aotr.id,
        isOfficial: true,
        gameVersionId: aotrV106.id,
        model: 'swiss',
      })
      .returning({ id: tournament.id });
    if (!t) throw new Error('Failed to insert tournament C');

    await db.insert(tournamentSwissConfig).values({
      tournamentId: t.id,
      eliminationLosses: 2,
      pairingMethod: 'random',
    });
    await insertRankingSnapshot(t.id, ranking, new Set(participantIds));

    const teamRows = await db
      .insert(team)
      .values(participantIds.map(() => ({ tournamentId: t.id })))
      .returning({ id: team.id });
    await db.insert(teamMember).values(
      teamRows.map((row, index) => ({
        teamId: row.id,
        playerId: participantIds[index] as string,
        tournamentId: t.id,
        isCaptain: false,
      })),
    );
    const teamIds = teamRows.map((r) => r.id);
    const playerByTeam = new Map(
      teamIds.map((tid, i) => [tid, participantIds[i] as string]),
    );

    const [phaseRow] = await db
      .insert(phase)
      .values({ tournamentId: t.id, phaseOrder: 1, type: 'swiss' })
      .returning({ id: phase.id });
    if (!phaseRow) throw new Error('Failed to insert swiss phase');

    const losses = new Map(teamIds.map((tid) => [tid, 0]));
    let round = 1;
    let active = [...teamIds];
    while (active.length > 1 && round < 10) {
      const shuffled = [...active].sort(() => Math.random() - 0.5);
      for (let i = 0; i + 1 < shuffled.length; i += 2) {
        const teamAId = shuffled[i] as string;
        const teamBId = shuffled[i + 1] as string;
        const partido = simulatePartido(
          createPartido(teamAId, teamBId, 1),
          new Map([
            [teamAId, [playerByTeam.get(teamAId) as string]],
            [teamBId, [playerByTeam.get(teamBId) as string]],
          ]),
        );
        await insertPartido(phaseRow.id, partido, 2026, round, null);
        const loserId = partido.winnerTeamId === teamAId ? teamBId : teamAId;
        losses.set(loserId, (losses.get(loserId) ?? 0) + 1);
      }
      active = teamIds.filter((tid) => (losses.get(tid) ?? 0) < 2);
      round += 1;
    }

    const championTeamId = active[0];
    const championPlayerId = championTeamId
      ? playerByTeam.get(championTeamId)
      : undefined;
    if (championPlayerId) {
      const s = stats.get(championPlayerId) ?? emptyStats();
      s.individualRings += 1;
      stats.set(championPlayerId, s);
    }
    console.log(
      `  Champion: ${championPlayerId ? nameByPlayerId.get(championPlayerId) : '—'}`,
    );
  }

  console.log('Done.');
}

await main();
process.exit(0);
