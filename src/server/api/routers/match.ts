import { TRPCError } from '@trpc/server';
import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { openTies, phaseIsComplete } from '@/lib/live/progression';
import { roundRobinSchedule } from '@/lib/tournament/phase-engine';
import { playerProcedure } from '@/server/api/player-procedure';
import { generatePhase } from '@/server/api/routers/phases';
import { getPlayerForUser } from '@/server/api/routers/player';
import {
  adminProcedure,
  createTRPCRouter,
  protectedProcedure,
} from '@/server/api/trpc';
import { match, matchGameSaveFile, phaseGroup } from '@/server/db/schema';
import {
  captainSide,
  completeGame,
  confirmLineup,
  ensureGame,
  locate,
  openGame,
  overrideResult,
  proposeEntrants,
  readyGame,
  setLineup,
  setMap,
  sideOf,
  undoGame,
} from '@/server/live/matches';
import { getLiveState, type LiveState } from '@/server/live/state';
import { actorFromSession, runTournamentTx } from '@/server/live/tx';
import {
  deleteObjects,
  headObject,
  presignUpload,
  publicUrl,
} from '@/server/storage/r2';

const id = z.string().uuid();
const REPLAY_MAX_BYTES = 50 * 1024 * 1024;
const REPLAY_CONTENT_TYPE = 'application/octet-stream';

const loadState = async (
  db: Parameters<typeof getLiveState>[0],
  tournamentId: string,
): Promise<LiveState> => {
  const state = await getLiveState(db, tournamentId, { privileged: true });
  if (!state) throw new TRPCError({ code: 'NOT_FOUND' });
  return state;
};

/** Match sheets are static for nobody: only /council caches, and it shows the current phase. */
const refresh = () => revalidatePath('/council');

const replayKey = (tournamentId: string, gameId: string, fileId: string) =>
  `replays/${tournamentId}/${gameId}/${fileId}.BfME2Replay`;

/**
 * Playing a match (plan §6.7): the captains' "Listos", the draw, the
 * line-ups, the map and the result; the organiser's results, undo, tie
 * resolutions and the next phase; the replays of each game.
 */
const matchRouter = createTRPCRouter({
  /** A captain declares the team ready for the next game; the second "Listos" draws. */
  ready: playerProcedure
    .input(z.object({ tournamentId: id, matchId: id }))
    .mutation(async ({ ctx, input }) => {
      const state = await loadState(ctx.db, input.tournamentId);
      const located = locate(state, input.matchId);
      const { side } = captainSide(state, located.match, ctx.player.id);
      await runTournamentTx(
        ctx.db,
        input.tournamentId,
        actorFromSession(ctx.session),
        (tctx) => readyGame(tctx, state, located, side),
      );
      return { ok: true };
    }),

  /** A captain hands each of the team's players one of the drawn factions. */
  setLineup: playerProcedure
    .input(
      z.object({
        tournamentId: id,
        matchId: id,
        assignments: z.array(z.object({ playerId: id, factionId: id })),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const state = await loadState(ctx.db, input.tournamentId);
      const located = locate(state, input.matchId);
      const { team, side } = captainSide(state, located.match, ctx.player.id);
      await runTournamentTx(
        ctx.db,
        input.tournamentId,
        actorFromSession(ctx.session),
        (tctx) =>
          setLineup(tctx, state, located, team, side, input.assignments),
      );
      return { ok: true };
    }),

  confirmLineup: playerProcedure
    .input(z.object({ tournamentId: id, matchId: id }))
    .mutation(async ({ ctx, input }) => {
      const state = await loadState(ctx.db, input.tournamentId);
      const located = locate(state, input.matchId);
      const { team, side } = captainSide(state, located.match, ctx.player.id);
      await runTournamentTx(
        ctx.db,
        input.tournamentId,
        actorFromSession(ctx.session),
        (tctx) => confirmLineup(tctx, state, located, team, side),
      );
      return { ok: true };
    }),

  /** Either captain or the organiser names the map of a game. */
  setMap: protectedProcedure
    .input(
      z.object({
        tournamentId: id,
        matchId: id,
        gameId: id,
        map: z.string().trim().max(80).nullable(),
        mapId: id.nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const state = await loadState(ctx.db, input.tournamentId);
      const located = locate(state, input.matchId);
      if (ctx.session.user.role !== 'admin') {
        const player = await getPlayerForUser(ctx.db, ctx.session.user.id);
        if (!player) throw new TRPCError({ code: 'FORBIDDEN' });
        captainSide(state, located.match, player.id);
      }
      await runTournamentTx(
        ctx.db,
        input.tournamentId,
        actorFromSession(ctx.session),
        (tctx) =>
          setMap(tctx, state, located, input.gameId, {
            name: input.map,
            mapId: input.mapId,
          }),
      );
      return { ok: true };
    }),

  /** "Hemos perdido": a captain can only concede their own team's game. */
  declareLoss: playerProcedure
    .input(z.object({ tournamentId: id, matchId: id }))
    .mutation(async ({ ctx, input }) => {
      const state = await loadState(ctx.db, input.tournamentId);
      const located = locate(state, input.matchId);
      const { team } = captainSide(state, located.match, ctx.player.id);
      const m = located.match;
      const winnerTeamId = m.teamAId === team.id ? m.teamBId : m.teamAId;
      if (!winnerTeamId) throw new TRPCError({ code: 'BAD_REQUEST' });
      if (m.status === 'completed')
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Este partido ya está decidido.',
        });
      const result = await runTournamentTx(
        ctx.db,
        input.tournamentId,
        actorFromSession(ctx.session),
        async (tctx) => {
          const game = await ensureGame(tctx, located);
          return completeGame(
            tctx,
            state,
            located,
            game,
            winnerTeamId,
            'declared',
          );
        },
      );
      if (result.matchCompleted) refresh();
      return result;
    }),

  /**
   * The organiser sets a game's winner: the open game, a fresh hand-entered
   * one when none is open, or a decided game (override) while nothing
   * downstream has been played.
   */
  setResult: adminProcedure
    .input(
      z.object({
        tournamentId: id,
        matchId: id,
        gameId: id.nullable(),
        winnerTeamId: id,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const state = await loadState(ctx.db, input.tournamentId);
      const located = locate(state, input.matchId);
      const target = input.gameId
        ? located.match.games.find((g) => g.id === input.gameId)
        : openGame(located.match);
      const result = await runTournamentTx(
        ctx.db,
        input.tournamentId,
        actorFromSession(ctx.session),
        async (tctx) => {
          if (target?.status === 'completed') {
            if (target.winnerTeamId === input.winnerTeamId)
              return { matchCompleted: located.match.status === 'completed' };
            return overrideResult(
              tctx,
              state,
              located,
              target,
              input.winnerTeamId,
            );
          }
          if (located.match.status === 'completed')
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'Este partido ya está decidido.',
            });
          const game = target ?? (await ensureGame(tctx, located));
          return completeGame(
            tctx,
            state,
            located,
            game,
            input.winnerTeamId,
            'admin',
          );
        },
      );
      refresh();
      return result;
    }),

  undoGame: adminProcedure
    .input(z.object({ tournamentId: id, matchId: id, gameId: id }))
    .mutation(async ({ ctx, input }) => {
      const state = await loadState(ctx.db, input.tournamentId);
      const located = locate(state, input.matchId);
      await runTournamentTx(
        ctx.db,
        input.tournamentId,
        actorFromSession(ctx.session),
        (tctx) => undoGame(tctx, state, located, input.gameId),
      );
      refresh();
      return { ok: true };
    }),

  /** Settles an open group tie: by lot, or in the order the organiser gives. */
  resolveTie: adminProcedure
    .input(
      z.object({
        tournamentId: id,
        phaseId: id,
        groupId: id,
        teamIds: z.array(id).min(2),
        method: z.enum(['draw', 'manual']),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const state = await loadState(ctx.db, input.tournamentId);
      const phase = state.phases.find((p) => p.id === input.phaseId);
      const group = phase?.groups.find((g) => g.id === input.groupId);
      if (!phase || !group) throw new TRPCError({ code: 'NOT_FOUND' });
      const wanted = [...input.teamIds].sort().join();
      const tie = openTies(state, phase).find(
        (t) => t.groupId === group.id && t.teamIds.join() === wanted,
      );
      if (!tie)
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Esos equipos no están empatados entre sí.',
        });
      const order =
        input.method === 'draw'
          ? [...input.teamIds].sort(() => Math.random() - 0.5)
          : input.teamIds;
      const kept = group.tieResolutions.filter(
        (cluster) => !cluster.some((teamId) => input.teamIds.includes(teamId)),
      );
      await runTournamentTx(
        ctx.db,
        input.tournamentId,
        actorFromSession(ctx.session),
        async ({ tx, emit }) => {
          await tx
            .update(phaseGroup)
            .set({ tieResolutions: [...kept, order] })
            .where(eq(phaseGroup.id, group.id));
          await emit({
            stream: 'admin',
            type: 'tie_resolved',
            payload: {
              phaseId: phase.id,
              groupId: group.id,
              method: input.method,
              order,
            },
          });
        },
      );
      refresh();
      return { order };
    }),

  /** Extra round-robin matches between tied teams; the organiser records the order afterwards. */
  createTiebreakMatches: adminProcedure
    .input(
      z.object({
        tournamentId: id,
        phaseId: id,
        groupId: id,
        teamIds: z.array(id).min(2),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const state = await loadState(ctx.db, input.tournamentId);
      const phase = state.phases.find((p) => p.id === input.phaseId);
      const group = phase?.groups.find((g) => g.id === input.groupId);
      if (!phase || !group) throw new TRPCError({ code: 'NOT_FOUND' });
      const roundIndex =
        Math.max(0, ...phase.matches.map((m) => m.roundIndex ?? 0)) + 1;
      const rows = roundRobinSchedule(input.teamIds, 'single').flatMap(
        (jornada) =>
          jornada.pairings.map((p, order) => ({
            phaseId: phase.id,
            groupId: group.id,
            teamAId: p.teamAId,
            teamBId: p.teamBId,
            roundIndex: roundIndex + jornada.roundIndex - 1,
            leg: 1,
            order: order + 1,
            isTiebreak: true,
          })),
      );
      await runTournamentTx(
        ctx.db,
        input.tournamentId,
        actorFromSession(ctx.session),
        async ({ tx, emit }) => {
          if (rows.length > 0) await tx.insert(match).values(rows);
          await emit({
            stream: 'admin',
            type: 'tiebreak_matches_created',
            payload: {
              phaseId: phase.id,
              groupId: group.id,
              teamIds: input.teamIds,
              count: rows.length,
            },
          });
        },
      );
      return { count: rows.length };
    }),

  /** The next phase, from the previous one's qualifiers (or the order the organiser reviewed). */
  generateNext: adminProcedure
    .input(z.object({ tournamentId: id, seedOrder: z.array(id).optional() }))
    .mutation(async ({ ctx, input }) => {
      const state = await loadState(ctx.db, input.tournamentId);
      const played = state.phases.filter((p) => p.matches.length > 0);
      const previous = played.at(-1);
      const next = previous
        ? state.phases.find((p) => p.order > previous.order)
        : undefined;
      if (!previous || !next)
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'No hay una fase siguiente que generar.',
        });
      if (!phaseIsComplete(state, previous))
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'La fase actual aún no ha terminado.',
        });
      const proposed = proposeEntrants(state, previous);
      const entrants = input.seedOrder ?? proposed;
      if (
        entrants.length !== proposed.length ||
        [...entrants].sort().join() !== [...proposed].sort().join()
      ) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'El orden revisado no coincide con los clasificados.',
        });
      }
      await runTournamentTx(
        ctx.db,
        input.tournamentId,
        actorFromSession(ctx.session),
        async (tctx) => {
          await generatePhase(tctx.tx, state, next, entrants, undefined, {
            seeded: true,
          });
          await tctx.emit({
            stream: 'admin',
            type: 'phase_generated',
            payload: { phaseId: next.id, order: next.order, entrants },
          });
        },
      );
      refresh();
      return { ok: true };
    }),

  /** Signs a direct browser → R2 upload of a game's replay. */
  presignReplay: protectedProcedure
    .input(
      z.object({
        tournamentId: id,
        matchId: id,
        gameId: id,
        fileName: z.string().trim().min(1).max(160),
        size: z.number().int().positive().max(REPLAY_MAX_BYTES),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const state = await loadState(ctx.db, input.tournamentId);
      const located = locate(state, input.matchId);
      await assertMayUpload(ctx, state, located.match);
      if (!located.match.games.some((g) => g.id === input.gameId))
        throw new TRPCError({ code: 'NOT_FOUND' });
      const fileId = crypto.randomUUID();
      const key = replayKey(input.tournamentId, input.gameId, fileId);
      return {
        fileId,
        uploadUrl: await presignUpload(key, REPLAY_CONTENT_TYPE),
        contentType: REPLAY_CONTENT_TYPE,
      };
    }),

  /** Once the object is there, the replay joins the game. */
  finalizeReplay: protectedProcedure
    .input(
      z.object({
        tournamentId: id,
        matchId: id,
        gameId: id,
        fileId: id,
        fileName: z.string().trim().min(1).max(160),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const state = await loadState(ctx.db, input.tournamentId);
      const located = locate(state, input.matchId);
      await assertMayUpload(ctx, state, located.match);
      const key = replayKey(input.tournamentId, input.gameId, input.fileId);
      const head = await headObject(key);
      if (!head)
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'La partida no ha llegado al almacén.',
        });
      if (head.size > REPLAY_MAX_BYTES) {
        await deleteObjects([key]);
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'La partida supera los 50 MB.',
        });
      }
      await runTournamentTx(
        ctx.db,
        input.tournamentId,
        actorFromSession(ctx.session),
        async ({ tx, emit }) => {
          await tx.insert(matchGameSaveFile).values({
            id: input.fileId,
            matchGameId: input.gameId,
            url: publicUrl(key),
            fileName: input.fileName,
            fileSize: head.size,
            uploadedByUserId: ctx.session.user.id,
          });
          await emit({
            stream: 'match',
            type: 'replay_uploaded',
            payload: {
              matchId: input.matchId,
              gameId: input.gameId,
              fileId: input.fileId,
              size: head.size,
            },
          });
        },
      );
      return { ok: true };
    }),

  /** The uploader or the organiser removes a replay. */
  removeReplay: protectedProcedure
    .input(z.object({ tournamentId: id, matchId: id, gameId: id, fileId: id }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select()
        .from(matchGameSaveFile)
        .where(
          and(
            eq(matchGameSaveFile.id, input.fileId),
            eq(matchGameSaveFile.matchGameId, input.gameId),
          ),
        );
      if (!row) throw new TRPCError({ code: 'NOT_FOUND' });
      if (
        row.uploadedByUserId !== ctx.session.user.id &&
        ctx.session.user.role !== 'admin'
      )
        throw new TRPCError({ code: 'FORBIDDEN' });
      await runTournamentTx(
        ctx.db,
        input.tournamentId,
        actorFromSession(ctx.session),
        async ({ tx, emit }) => {
          await tx
            .delete(matchGameSaveFile)
            .where(eq(matchGameSaveFile.id, input.fileId));
          await emit({
            stream: 'match',
            type: 'replay_removed',
            payload: {
              matchId: input.matchId,
              gameId: input.gameId,
              fileId: input.fileId,
            },
          });
        },
      );
      await deleteObjects([
        replayKey(input.tournamentId, input.gameId, input.fileId),
      ]);
      return { ok: true };
    }),
});

/** Replays: the organiser, an editor, or a linked player of either team. */
const assertMayUpload = async (
  ctx: {
    db: Parameters<typeof getLiveState>[0];
    session: { user: { id: string; role: string } };
  },
  state: LiveState,
  m: LiveState['phases'][number]['matches'][number],
) => {
  if (ctx.session.user.role === 'admin' || ctx.session.user.role === 'editor')
    return;
  const player = await getPlayerForUser(ctx.db, ctx.session.user.id);
  const team = player
    ? state.teams.find((t) => t.members.some((mm) => mm.playerId === player.id))
    : null;
  if (!player || !team || !sideOf(m, team.id))
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Sólo quien jugó este partido puede subir su partida guardada.',
    });
};

export { matchRouter };
