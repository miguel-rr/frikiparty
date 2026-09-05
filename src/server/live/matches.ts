import { TRPCError } from '@trpc/server';
import { and, eq, inArray } from 'drizzle-orm';

import { matchScore } from '@/lib/live/match-score';
import {
  champion,
  phaseIsComplete,
  qualifiersSeeding,
  swissRecords,
} from '@/lib/live/progression';
import { type DrawRules, drawFactions } from '@/lib/tournament/faction-draw';
import { pairSwissRound, teamRankOrder } from '@/lib/tournament/phase-engine';
import {
  match,
  matchGame,
  matchGameFactionDraw,
  matchGamePlayerFaction,
  tournament,
} from '@/server/db/schema';
import {
  gamesToWinFor,
  type LiveGame,
  type LiveMatch,
  type LivePhase,
} from '@/server/live/phases';
import type { LiveState } from '@/server/live/state';
import type { TournamentTx } from '@/server/live/tx';

/**
 * What happens to a match during play (plan §6.7–§6.8): games opening,
 * the faction draw, results and their consequences on the phase. Every
 * function runs inside a tournament transaction and records events on
 * the `match` stream; the snapshot passed in is the one read before the
 * transaction, so callers re-read it after.
 */

type Located = { phase: LivePhase; match: LiveMatch };

const bad = (message: string) =>
  new TRPCError({ code: 'BAD_REQUEST', message });

const locate = (state: LiveState, matchId: string): Located => {
  for (const phase of state.phases) {
    const found = phase.matches.find((m) => m.id === matchId);
    if (found) return { phase, match: found };
  }
  throw new TRPCError({ code: 'NOT_FOUND', message: 'Ese partido no existe.' });
};

const teamOf = (state: LiveState, teamId: string | null) =>
  state.teams.find((t) => t.id === teamId) ?? null;

/** 'A' or 'B' for a team in a match; null when it does not play it. */
const sideOf = (m: LiveMatch, teamId: string): 'A' | 'B' | null =>
  m.teamAId === teamId ? 'A' : m.teamBId === teamId ? 'B' : null;

/** The team a player captains, if any. */
const captainedTeam = (state: LiveState, playerId: string) =>
  state.teams.find((t) =>
    t.members.some((m) => m.playerId === playerId && m.isCaptain),
  ) ?? null;

/** The side a captain plays in a match, or an error. */
const captainSide = (state: LiveState, m: LiveMatch, playerId: string) => {
  const team = captainedTeam(state, playerId);
  const side = team ? sideOf(m, team.id) : null;
  if (!team || !side)
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Sólo los capitanes de este partido pueden hacer eso.',
    });
  return { team, side };
};

const openGame = (m: LiveMatch) =>
  m.games.find((g) => g.status !== 'completed') ?? null;

const assertPlayable = (state: LiveState, { match: m }: Located) => {
  if (state.stage !== 'in_progress') throw bad('El torneo no está en juego.');
  if (m.status === 'completed') throw bad('Este partido ya está decidido.');
  if (!m.teamAId || !m.teamBId) throw bad('Faltan equipos en este partido.');
};

const gameRowToLive = (row: typeof matchGame.$inferSelect): LiveGame => ({
  id: row.id,
  gameNumber: row.gameNumber,
  winnerTeamId: row.winnerTeamId,
  status: row.status,
  map: row.map,
  mapId: row.mapId,
  readyTeamAAt: row.readyTeamAAt?.toISOString() ?? null,
  readyTeamBAt: row.readyTeamBAt?.toISOString() ?? null,
  confirmedTeamAAt: row.confirmedTeamAAt?.toISOString() ?? null,
  confirmedTeamBAt: row.confirmedTeamBAt?.toISOString() ?? null,
  startedAt: row.startedAt?.toISOString() ?? null,
  playedAt: row.playedAt?.toISOString() ?? null,
  draws: [],
  lineup: [],
  saveFiles: [],
});

/** The match's open game, or a fresh one when none is open. */
const ensureGame = async (
  { tx, emit }: TournamentTx,
  located: Located,
): Promise<LiveGame> => {
  const existing = openGame(located.match);
  if (existing) return existing;
  const [row] = await tx
    .insert(matchGame)
    .values({
      matchId: located.match.id,
      gameNumber: located.match.games.length + 1,
      status: 'pending',
    })
    .returning();
  if (!row) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
  await tx
    .update(match)
    .set({ status: 'in_progress' })
    .where(eq(match.id, located.match.id));
  await emit({
    stream: 'match',
    type: 'game_opened',
    payload: {
      matchId: located.match.id,
      gameId: row.id,
      gameNumber: row.gameNumber,
    },
  });
  return gameRowToLive(row);
};

/** When a game's factions were drawn: both captains were ready by then. */
const drawTime = (g: LiveGame) =>
  Math.max(
    g.readyTeamAAt ? Date.parse(g.readyTeamAAt) : 0,
    g.readyTeamBAt ? Date.parse(g.readyTeamBAt) : 0,
  );

/**
 * Every earlier draw of a team in the pool's scope (this phase, or every
 * phase so far when the pool carries over), oldest first.
 */
const drawHistory = (
  state: LiveState,
  phase: LivePhase,
  teamId: string,
  excludeGameId: string,
) => {
  const scope = phase.factions?.poolCarriesOver
    ? state.phases.filter((p) => p.order <= phase.order)
    : [phase];
  return scope
    .flatMap((p) => p.matches.flatMap((m) => m.games))
    .filter((g) => g.id !== excludeGameId && g.draws.length > 0)
    .sort((a, b) => drawTime(a) - drawTime(b))
    .map((g) =>
      g.draws.filter((d) => d.teamId === teamId).map((d) => d.factionId),
    )
    .filter((ids) => ids.length > 0);
};

/** Both captains are ready: draw the factions, or skip straight to ready when the game has none. */
const drawForGame = async (
  ctx: TournamentTx,
  state: LiveState,
  located: Located,
  game: LiveGame,
) => {
  const { tx, emit } = ctx;
  const { phase, match: m } = located;
  const a = teamOf(state, m.teamAId);
  const b = teamOf(state, m.teamBId);
  if (!a || !b) throw bad('Faltan equipos en este partido.');
  const all = state.factions.map((f) => f.id);
  if (all.length === 0) {
    await tx
      .update(matchGame)
      .set({ status: 'ready', startedAt: new Date() })
      .where(eq(matchGame.id, game.id));
    await emit({
      stream: 'match',
      type: 'game_started',
      payload: { matchId: m.id, gameId: game.id, factions: false },
    });
    return;
  }
  const rules: DrawRules = {
    poolMode: phase.factions?.poolMode ?? 'fresh',
    allowRepeatAcrossTeams: phase.factions?.allowRepeatAcrossTeams ?? true,
  };
  const result = drawFactions(
    all,
    {
      teamId: a.id,
      size: a.members.length,
      history: drawHistory(state, phase, a.id, game.id),
    },
    {
      teamId: b.id,
      size: b.members.length,
      history: drawHistory(state, phase, b.id, game.id),
    },
    rules,
  );
  const rows = [
    ...result.a.factionIds.map((factionId, drawOrder) => ({
      matchGameId: game.id,
      teamId: a.id,
      factionId,
      drawOrder,
    })),
    ...result.b.factionIds.map((factionId, drawOrder) => ({
      matchGameId: game.id,
      teamId: b.id,
      factionId,
      drawOrder,
    })),
  ];
  if (rows.length > 0) await tx.insert(matchGameFactionDraw).values(rows);
  await tx
    .update(matchGame)
    .set({ status: 'factions_drawn' })
    .where(eq(matchGame.id, game.id));
  await emit({
    stream: 'match',
    type: 'factions_drawn',
    payload: {
      matchId: m.id,
      gameId: game.id,
      order: result.order,
      teams: {
        [a.id]: { factionIds: result.a.factionIds, relaxed: result.a.relaxed },
        [b.id]: { factionIds: result.b.factionIds, relaxed: result.b.relaxed },
      },
      rules,
    },
  });
};

/** A captain presses "Listos"; the second one triggers the draw. */
const readyGame = async (
  ctx: TournamentTx,
  state: LiveState,
  located: Located,
  side: 'A' | 'B',
) => {
  assertPlayable(state, located);
  const game = await ensureGame(ctx, located);
  if (game.status !== 'pending') throw bad('Esta partida ya está sorteada.');
  const column = side === 'A' ? 'readyTeamAAt' : 'readyTeamBAt';
  if (game[column]) return game.id;
  const now = new Date();
  await ctx.tx
    .update(matchGame)
    .set({ [column]: now })
    .where(eq(matchGame.id, game.id));
  await ctx.emit({
    stream: 'match',
    type: 'captain_ready',
    payload: { matchId: located.match.id, gameId: game.id, side },
    at: now,
  });
  const otherReady = side === 'A' ? game.readyTeamBAt : game.readyTeamAAt;
  if (otherReady) {
    const updated: LiveGame = {
      ...game,
      readyTeamAAt: side === 'A' ? now.toISOString() : game.readyTeamAAt,
      readyTeamBAt: side === 'B' ? now.toISOString() : game.readyTeamBAt,
    };
    await drawForGame(ctx, state, located, updated);
  }
  return game.id;
};

/** A captain distributes the drawn factions among the team's players. */
const setLineup = async (
  ctx: TournamentTx,
  state: LiveState,
  located: Located,
  team: LiveState['teams'][number],
  side: 'A' | 'B',
  assignments: { playerId: string; factionId: string }[],
) => {
  assertPlayable(state, located);
  const game = openGame(located.match);
  if (game?.status !== 'factions_drawn')
    throw bad('El reparto sólo se hace con las facciones sorteadas.');
  const drawn = game.draws
    .filter((d) => d.teamId === team.id)
    .map((d) => d.factionId);
  const members = team.members.map((m) => m.playerId);
  const players = assignments.map((a) => a.playerId);
  const factions = assignments.map((a) => a.factionId);
  if (
    assignments.length !== members.length ||
    new Set(players).size !== players.length ||
    new Set(factions).size !== factions.length ||
    players.some((p) => !members.includes(p)) ||
    factions.some((f) => !drawn.includes(f))
  ) {
    throw bad(
      'Cada jugador del equipo recibe exactamente una facción sorteada.',
    );
  }
  await ctx.tx
    .delete(matchGamePlayerFaction)
    .where(
      and(
        eq(matchGamePlayerFaction.matchGameId, game.id),
        inArray(matchGamePlayerFaction.playerId, members),
      ),
    );
  await ctx.tx.insert(matchGamePlayerFaction).values(
    assignments.map((a) => ({
      matchGameId: game.id,
      playerId: a.playerId,
      factionId: a.factionId,
    })),
  );
  // A new distribution needs confirming again.
  await ctx.tx
    .update(matchGame)
    .set(side === 'A' ? { confirmedTeamAAt: null } : { confirmedTeamBAt: null })
    .where(eq(matchGame.id, game.id));
  await ctx.emit({
    stream: 'match',
    type: 'lineup_set',
    payload: {
      matchId: located.match.id,
      gameId: game.id,
      teamId: team.id,
      assignments,
    },
  });
  return game.id;
};

/** A captain confirms the line-up; the second confirmation starts the game. */
const confirmLineup = async (
  ctx: TournamentTx,
  state: LiveState,
  located: Located,
  team: LiveState['teams'][number],
  side: 'A' | 'B',
) => {
  assertPlayable(state, located);
  const game = openGame(located.match);
  if (game?.status !== 'factions_drawn')
    throw bad('No hay reparto que confirmar.');
  const assigned = new Set(game.lineup.map((l) => l.playerId));
  if (team.members.some((m) => !assigned.has(m.playerId)))
    throw bad('Reparte todas las facciones antes de confirmar.');
  const now = new Date();
  const column = side === 'A' ? 'confirmedTeamAAt' : 'confirmedTeamBAt';
  const otherConfirmed =
    side === 'A' ? game.confirmedTeamBAt : game.confirmedTeamAAt;
  await ctx.tx
    .update(matchGame)
    .set({
      [column]: now,
      ...(otherConfirmed ? { status: 'ready' as const, startedAt: now } : {}),
    })
    .where(eq(matchGame.id, game.id));
  await ctx.emit({
    stream: 'match',
    type: 'lineup_confirmed',
    payload: { matchId: located.match.id, gameId: game.id, teamId: team.id },
    at: now,
  });
  if (otherConfirmed) {
    await ctx.emit({
      stream: 'match',
      type: 'game_started',
      payload: { matchId: located.match.id, gameId: game.id, factions: true },
      at: now,
    });
  }
  return game.id;
};

const setMap = async (
  ctx: TournamentTx,
  state: LiveState,
  located: Located,
  gameId: string,
  map: { name: string | null; mapId: string | null },
) => {
  const game = located.match.games.find((g) => g.id === gameId);
  if (!game) throw bad('Esa partida no existe.');
  const known = map.mapId
    ? (state.maps.find((m) => m.id === map.mapId) ?? null)
    : (state.maps.find(
        (m) => m.name.toLowerCase() === (map.name ?? '').trim().toLowerCase(),
      ) ?? null);
  await ctx.tx
    .update(matchGame)
    .set({
      map: known?.name ?? map.name?.trim() ?? null,
      mapId: known?.id ?? null,
    })
    .where(eq(matchGame.id, gameId));
  await ctx.emit({
    stream: 'match',
    type: 'map_set',
    payload: {
      matchId: located.match.id,
      gameId,
      map: known?.name ?? map.name,
    },
  });
};

// ------------------------------------------------------------ results

/** Fills the slots a decided match feeds: its winner, or its loser for the third-place match. */
const feedSlots = async (
  { tx }: TournamentTx,
  phase: LivePhase,
  m: LiveMatch,
  winnerTeamId: string | null,
) => {
  const loser =
    winnerTeamId && m.teamAId && m.teamBId
      ? winnerTeamId === m.teamAId
        ? m.teamBId
        : m.teamAId
      : null;
  for (const target of phase.matches) {
    const value = target.isThirdPlace ? loser : winnerTeamId;
    if (target.feederMatchAId === m.id)
      await tx
        .update(match)
        .set({ teamAId: value })
        .where(eq(match.id, target.id));
    if (target.feederMatchBId === m.id)
      await tx
        .update(match)
        .set({ teamBId: value })
        .where(eq(match.id, target.id));
  }
};

/** Matches downstream of this one that have already been played into. */
const downstreamTouched = (
  state: LiveState,
  phase: LivePhase,
  m: LiveMatch,
) => {
  if (phase.type === 'bracket') {
    return phase.matches.some(
      (t) =>
        (t.feederMatchAId === m.id || t.feederMatchBId === m.id) &&
        t.games.length > 0,
    );
  }
  if (phase.type === 'swiss') {
    return phase.matches.some(
      (t) => (t.roundIndex ?? 0) > (m.roundIndex ?? 0) && t.games.length > 0,
    );
  }
  // Groups: the next phase, once generated, took its seeding from here.
  return state.phases.some(
    (p) => p.order > phase.order && p.matches.length > 0,
  );
};

/** After a swiss round is complete, the next one; when one team stands, nothing. */
const advanceSwiss = async (
  ctx: TournamentTx,
  state: LiveState,
  phase: LivePhase,
  matchesNow: LiveMatch[],
) => {
  if (!phase.swiss) return;
  const roundIndex = Math.max(...matchesNow.map((m) => m.roundIndex ?? 0));
  const round = matchesNow.filter((m) => m.roundIndex === roundIndex);
  if (round.some((m) => !m.byeTeamId && m.status !== 'completed')) return;
  const records = swissRecords({ ...phase, matches: matchesNow });
  const alive = records.filter(
    (t) => t.losses < (phase.swiss?.eliminationLosses ?? 1),
  );
  if (alive.length <= 1) return;
  const seedOrder = teamRankOrder(state.teams, state.ranking ?? []);
  const { pairings, byeTeamId } = pairSwissRound(
    records,
    phase.swiss.pairingMethod,
    seedOrder,
    phase.swiss.eliminationLosses,
  );
  const rows: (typeof match.$inferInsert)[] = pairings.map((p, order) => ({
    phaseId: phase.id,
    teamAId: p.teamAId,
    teamBId: p.teamBId,
    roundIndex: roundIndex + 1,
    order: order + 1,
  }));
  if (byeTeamId) {
    rows.push({
      phaseId: phase.id,
      roundIndex: roundIndex + 1,
      order: rows.length + 1,
      byeTeamId,
    });
  }
  if (rows.length > 0) await ctx.tx.insert(match).values(rows);
  await ctx.emit({
    stream: 'match',
    type: 'swiss_round_generated',
    payload: {
      phaseId: phase.id,
      roundIndex: roundIndex + 1,
      pairings,
      byeTeamId,
    },
  });
};

/** The snapshot's matches of a phase with one match's fields replaced. */
const withMatch = (phase: LivePhase, patched: LiveMatch) =>
  phase.matches.map((m) => (m.id === patched.id ? patched : m));

/** The same, in memory, as feedSlots did in the database. */
const withFeeds = (
  matches: LiveMatch[],
  m: LiveMatch,
  winnerTeamId: string | null,
): LiveMatch[] => {
  const loser =
    winnerTeamId && m.teamAId && m.teamBId
      ? winnerTeamId === m.teamAId
        ? m.teamBId
        : m.teamAId
      : null;
  return matches.map((t) => {
    const value = t.isThirdPlace ? loser : winnerTeamId;
    return {
      ...t,
      teamAId: t.feederMatchAId === m.id ? value : t.teamAId,
      teamBId: t.feederMatchBId === m.id ? value : t.teamBId,
    };
  });
};

/**
 * Records a game's winner and everything that follows: the match closing
 * when the score reaches the games to win, bracket slots, the next swiss
 * round, and the champion when the last phase is done.
 */
const completeGame = async (
  ctx: TournamentTx,
  state: LiveState,
  located: Located,
  game: LiveGame,
  winnerTeamId: string,
  reason: 'declared' | 'admin',
) => {
  const { tx, emit } = ctx;
  const { phase, match: m } = located;
  if (winnerTeamId !== m.teamAId && winnerTeamId !== m.teamBId)
    throw bad('Ese equipo no juega este partido.');
  const now = new Date();
  await tx
    .update(matchGame)
    .set({ winnerTeamId, status: 'completed', playedAt: now })
    .where(eq(matchGame.id, game.id));
  await emit({
    stream: 'match',
    type: 'game_completed',
    payload: { matchId: m.id, gameId: game.id, winnerTeamId, reason },
    at: now,
  });
  const games = m.games.some((g) => g.id === game.id)
    ? m.games.map((g) =>
        g.id === game.id
          ? { ...g, winnerTeamId, status: 'completed' as const }
          : g,
      )
    : [...m.games, { ...game, winnerTeamId, status: 'completed' as const }];
  const score = matchScore({ teamAId: m.teamAId, teamBId: m.teamBId, games });
  const toWin = gamesToWinFor(phase, m);
  const won = Math.max(score.a, score.b) >= toWin;
  const patched: LiveMatch = {
    ...m,
    games,
    status: won ? 'completed' : 'in_progress',
    winnerTeamId: won ? winnerTeamId : null,
  };
  await tx
    .update(match)
    .set({
      status: patched.status,
      winnerTeamId: patched.winnerTeamId,
      playedAt: won ? now : null,
    })
    .where(eq(match.id, m.id));
  if (!won) return { matchCompleted: false };
  await emit({
    stream: 'match',
    type: 'match_completed',
    payload: { matchId: m.id, winnerTeamId, score },
    at: now,
  });
  let matchesNow = withMatch(phase, patched);
  if (phase.type === 'bracket') {
    await feedSlots(ctx, phase, patched, winnerTeamId);
    matchesNow = withFeeds(matchesNow, patched, winnerTeamId);
  }
  if (phase.type === 'swiss') await advanceSwiss(ctx, state, phase, matchesNow);
  await maybeCrown(ctx, state, phase, matchesNow);
  return { matchCompleted: true };
};

/** Stage → completed when the last phase has nothing left. */
const maybeCrown = async (
  ctx: TournamentTx,
  state: LiveState,
  phase: LivePhase,
  matchesNow: LiveMatch[],
) => {
  const isLast = !state.phases.some((p) => p.order > phase.order);
  if (!isLast) return;
  const projected: LiveState = {
    ...state,
    phases: state.phases.map((p) =>
      p.id === phase.id ? { ...p, matches: matchesNow } : p,
    ),
  };
  const last = projected.phases.find((p) => p.id === phase.id);
  if (!last || !phaseIsComplete(projected, last)) return;
  const winner = champion(projected);
  await ctx.tx
    .update(tournament)
    .set({ stage: 'completed', stageChangedAt: new Date() })
    .where(eq(tournament.id, state.id));
  await ctx.emit({
    stream: 'admin',
    type: 'stage_changed',
    payload: {
      from: 'in_progress',
      to: 'completed',
      direction: 'forward',
      championTeamId: winner,
    },
  });
};

/**
 * Takes a decided game back (the last one of its match) as long as nothing
 * downstream has been played. Hand-entered games vanish; played ones
 * return to where they were before the result.
 */
const undoGame = async (
  ctx: TournamentTx,
  state: LiveState,
  located: Located,
  gameId: string,
) => {
  const { tx, emit } = ctx;
  const { phase, match: m } = located;
  const game = m.games.find((g) => g.id === gameId);
  if (game?.status !== 'completed') throw bad('Esa partida no está decidida.');
  const decided = m.games.filter((g) => g.status === 'completed');
  if (decided.at(-1)?.id !== gameId)
    throw bad('Sólo se deshace la última partida decidida.');
  if (downstreamTouched(state, phase, m))
    throw bad('Ya se ha jugado algo que depende de este resultado.');
  const handEntered = game.draws.length === 0 && !game.startedAt;
  if (handEntered) {
    await tx.delete(matchGame).where(eq(matchGame.id, gameId));
  } else {
    await tx
      .update(matchGame)
      .set({
        winnerTeamId: null,
        status: game.startedAt ? 'ready' : 'pending',
        playedAt: null,
      })
      .where(eq(matchGame.id, gameId));
  }
  const remaining = handEntered
    ? m.games.filter((g) => g.id !== gameId)
    : m.games.map((g) => (g.id === gameId ? { ...g, winnerTeamId: null } : g));
  const anyDecided = remaining.some((g) => g.winnerTeamId);
  await tx
    .update(match)
    .set({
      status: anyDecided || remaining.length > 0 ? 'in_progress' : 'scheduled',
      winnerTeamId: null,
      playedAt: null,
    })
    .where(eq(match.id, m.id));
  if (m.status === 'completed') {
    if (phase.type === 'bracket') await feedSlots(ctx, phase, m, null);
    if (phase.type === 'swiss') {
      // The next round, generated when this one closed, goes with it.
      const later = phase.matches.filter(
        (t) => (t.roundIndex ?? 0) > (m.roundIndex ?? 0),
      );
      if (later.length > 0)
        await tx.delete(match).where(
          inArray(
            match.id,
            later.map((t) => t.id),
          ),
        );
    }
    if (state.stage === 'completed') {
      await tx
        .update(tournament)
        .set({ stage: 'in_progress', stageChangedAt: new Date() })
        .where(eq(tournament.id, state.id));
      await emit({
        stream: 'admin',
        type: 'stage_changed',
        payload: {
          from: 'completed',
          to: 'in_progress',
          direction: 'backward',
        },
      });
    }
  }
  await emit({
    stream: 'match',
    type: 'game_undone',
    payload: { matchId: m.id, gameId, removed: handEntered },
  });
};

/**
 * The organiser changes a decided game's winner: the old result is taken
 * back and the new one recorded on the same game, working on a snapshot
 * patched in memory (the transaction's own writes are not visible to a
 * fresh read).
 */
const overrideResult = async (
  ctx: TournamentTx,
  state: LiveState,
  located: Located,
  game: LiveGame,
  winnerTeamId: string,
) => {
  const { phase, match: m } = located;
  await undoGame(ctx, state, located, game.id);
  const reopened: LiveGame = {
    ...game,
    winnerTeamId: null,
    status: game.startedAt ? 'ready' : 'pending',
    playedAt: null,
  };
  const handEntered = game.draws.length === 0 && !game.startedAt;
  const patchedMatch: LiveMatch = {
    ...m,
    status: 'in_progress',
    winnerTeamId: null,
    games: handEntered
      ? m.games.filter((g) => g.id !== game.id)
      : m.games.map((g) => (g.id === game.id ? reopened : g)),
  };
  const patchedPhase: LivePhase = {
    ...phase,
    matches: phase.matches
      .filter(
        (t) =>
          !(
            phase.type === 'swiss' &&
            m.status === 'completed' &&
            (t.roundIndex ?? 0) > (m.roundIndex ?? 0)
          ),
      )
      .map((t) => {
        if (t.id === m.id) return patchedMatch;
        if (phase.type !== 'bracket' || m.status !== 'completed') return t;
        return {
          ...t,
          teamAId: t.feederMatchAId === m.id ? null : t.teamAId,
          teamBId: t.feederMatchBId === m.id ? null : t.teamBId,
        };
      }),
  };
  const patchedState: LiveState = {
    ...state,
    stage: 'in_progress',
    phases: state.phases.map((p) => (p.id === phase.id ? patchedPhase : p)),
  };
  await ctx.emit({
    stream: 'match',
    type: 'result_overridden',
    payload: {
      matchId: m.id,
      gameId: game.id,
      from: game.winnerTeamId,
      to: winnerTeamId,
    },
  });
  const target = handEntered
    ? await ensureGame(ctx, { phase: patchedPhase, match: patchedMatch })
    : reopened;
  return completeGame(
    ctx,
    patchedState,
    { phase: patchedPhase, match: patchedMatch },
    target,
    winnerTeamId,
    'admin',
  );
};

/** The seeded entrants of the next phase, as the organiser will confirm them. */
const proposeEntrants = (state: LiveState, previous: LivePhase): string[] => {
  if (previous.type === 'group') {
    const seeding = qualifiersSeeding(state, previous);
    if (!seeding) throw bad('Resuelve los empates del grupo antes de seguir.');
    return seeding;
  }
  if (previous.type === 'swiss') {
    const records = swissRecords(previous);
    return [...records]
      .sort((a, b) => b.wins - a.wins || a.losses - b.losses)
      .map((t) => t.id);
  }
  // A bracket ranks only its winner; anything after one is unusual.
  const finalRound = Math.max(
    ...previous.matches.map((m) => m.roundIndex ?? 0),
  );
  const final = previous.matches.find(
    (m) => m.roundIndex === finalRound && !m.isThirdPlace,
  );
  return [
    final?.winnerTeamId,
    final?.teamAId === final?.winnerTeamId ? final?.teamBId : final?.teamAId,
  ].filter((id): id is string => Boolean(id));
};

export {
  captainedTeam,
  captainSide,
  completeGame,
  confirmLineup,
  downstreamTouched,
  ensureGame,
  locate,
  openGame,
  overrideResult,
  proposeEntrants,
  readyGame,
  setLineup,
  setMap,
  sideOf,
  teamOf,
  undoGame,
};
