import { TRPCError } from '@trpc/server';
import { asc, eq, inArray, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { teamsLayout } from '@/lib/tournament/teams-layout';
import { getHistoricalRanking } from '@/server/api/routers/player';
import {
  adminProcedure,
  createTRPCRouter,
  type TRPCContext,
} from '@/server/api/trpc';
import {
  auction,
  auctionBid,
  auctionLot,
  draft,
  draftPick,
  game,
  gameVersion,
  match,
  matchGame,
  matchGameFactionDraw,
  matchGamePlayerFaction,
  matchGameSaveFile,
  phase,
  phaseGroup,
  phaseGroupTeam,
  TOURNAMENT_STAGES,
  type TournamentStage,
  team,
  teamFormationPotPlayer,
  teamMember,
  tournament,
  tournamentRankingSnapshot,
  tournamentSwissConfig,
} from '@/server/db/schema';
import {
  getLiveState,
  listParticipantCandidates,
  listStaffWithoutPlayer,
} from '@/server/live/state';
import { actorFromSession, runTournamentTx, type Tx } from '@/server/live/tx';

const stageSchema = z.enum(TOURNAMENT_STAGES);

const configSchema = z.object({
  kind: z.enum(['team', 'individual']),
  isOfficial: z.boolean(),
  gameId: z.string().uuid(),
  gameVersionId: z.string().uuid().nullable(),
  model: z.enum(['classic', 'swiss']),
  teamSize: z.number().int().min(1).max(10),
  rankingSource: z.enum(['historical', 'vote', 'combined']),
  historicalWeightPercent: z.number().int().min(0).max(100).nullable(),
});

/** Stages during which the roster and team size may still change. */
const ROSTER_EDITABLE: TournamentStage[] = [
  'setup',
  'voting',
  'ranking_review',
  'pots_review',
];

const stageIndex = (stage: TournamentStage) => TOURNAMENT_STAGES.indexOf(stage);

/** Live pages are dynamic; /council is static and must be told. */
const revalidateLive = () => {
  revalidatePath('/council');
};

const loadTournament = async (db: TRPCContext['db'], tournamentId: string) => {
  const [row] = await db
    .select()
    .from(tournament)
    .where(eq(tournament.id, tournamentId));
  if (!row?.stage) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Ese torneo no existe o no se lleva desde la web.',
    });
  }
  return { ...row, stage: row.stage };
};

const assertRosterEditable = (stage: TournamentStage) => {
  if (!ROSTER_EDITABLE.includes(stage)) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Los equipos ya están en marcha: no se puede tocar la lista.',
    });
  }
};

/**
 * Participants + frozen historical ranking, in one write. Positions are
 * sequential in ranking order (ties keep the ranking's own order) since
 * the snapshot table wants them unique.
 */
const writeRankingSnapshot = async (
  db: TRPCContext['db'],
  tx: Tx,
  tournamentId: string,
  playerIds: string[],
) => {
  const wanted = new Set(playerIds);
  // Historical data, unaffected by this transaction: read it outside.
  const ranking = (await getHistoricalRanking(db)).filter((ranked) =>
    wanted.has(ranked.id),
  );
  if (ranking.length !== wanted.size) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Alguno de los jugadores elegidos no existe.',
    });
  }
  await tx
    .delete(tournamentRankingSnapshot)
    .where(eq(tournamentRankingSnapshot.tournamentId, tournamentId));
  if (ranking.length > 0) {
    await tx.insert(tournamentRankingSnapshot).values(
      ranking.map((ranked, index) => ({
        tournamentId,
        playerId: ranked.id,
        position: index + 1,
        rings: ranked.rings,
        individualRings: ranked.individualRings,
      })),
    );
  }
  return ranking.length;
};

/**
 * The empty teams the roster implies (live plan §5.1): they exist from the
 * moment the team size is known, so every later step (captains, draft,
 * phases) has real ids to hang from. Only teams without members are
 * recreated; the count comes from teamsLayout.
 */
const rebuildEmptyTeams = async (
  tx: Tx,
  tournamentId: string,
  playerCount: number,
  teamSize: number,
) => {
  const occupied = await tx
    .select({ teamId: teamMember.teamId })
    .from(teamMember)
    .where(eq(teamMember.tournamentId, tournamentId));
  if (occupied.length > 0) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Ya hay jugadores en los equipos; no se pueden recrear.',
    });
  }
  await tx.delete(team).where(eq(team.tournamentId, tournamentId));
  const { teamCount } = teamsLayout(playerCount, teamSize);
  if (teamCount > 0) {
    await tx
      .insert(team)
      .values(Array.from({ length: teamCount }, () => ({ tournamentId })));
  }
  return teamCount;
};

/**
 * Removes a tournament and everything hanging from it, child tables
 * first. Meant for test runs; a completed tournament is history and stays.
 */
const deleteTournamentCascade = async (tx: Tx, tournamentId: string) => {
  const phaseIds = (
    await tx
      .select({ id: phase.id })
      .from(phase)
      .where(eq(phase.tournamentId, tournamentId))
  ).map((row) => row.id);
  if (phaseIds.length > 0) {
    const matchIds = (
      await tx
        .select({ id: match.id })
        .from(match)
        .where(inArray(match.phaseId, phaseIds))
    ).map((row) => row.id);
    if (matchIds.length > 0) {
      const gameIds = (
        await tx
          .select({ id: matchGame.id })
          .from(matchGame)
          .where(inArray(matchGame.matchId, matchIds))
      ).map((row) => row.id);
      if (gameIds.length > 0) {
        await tx
          .delete(matchGameSaveFile)
          .where(inArray(matchGameSaveFile.matchGameId, gameIds));
        await tx
          .delete(matchGamePlayerFaction)
          .where(inArray(matchGamePlayerFaction.matchGameId, gameIds));
        await tx
          .delete(matchGameFactionDraw)
          .where(inArray(matchGameFactionDraw.matchGameId, gameIds));
        await tx.delete(matchGame).where(inArray(matchGame.id, gameIds));
      }
      // Feeder links point at other matches of the same phase set.
      await tx
        .update(match)
        .set({ feederMatchAId: null, feederMatchBId: null })
        .where(inArray(match.id, matchIds));
      await tx.delete(match).where(inArray(match.id, matchIds));
    }
    const groupIds = (
      await tx
        .select({ id: phaseGroup.id })
        .from(phaseGroup)
        .where(inArray(phaseGroup.phaseId, phaseIds))
    ).map((row) => row.id);
    if (groupIds.length > 0) {
      await tx
        .delete(phaseGroupTeam)
        .where(inArray(phaseGroupTeam.groupId, groupIds));
    }
    // Configs and groups cascade from phase.
    await tx.delete(phase).where(inArray(phase.id, phaseIds));
  }
  const [draftRow] = await tx
    .select({ id: draft.id })
    .from(draft)
    .where(eq(draft.tournamentId, tournamentId));
  if (draftRow) {
    await tx.delete(draftPick).where(eq(draftPick.draftId, draftRow.id));
    await tx.delete(draft).where(eq(draft.id, draftRow.id));
  }
  const [auctionRow] = await tx
    .select({ id: auction.id })
    .from(auction)
    .where(eq(auction.tournamentId, tournamentId));
  if (auctionRow) {
    const lotIds = (
      await tx
        .select({ id: auctionLot.id })
        .from(auctionLot)
        .where(eq(auctionLot.auctionId, auctionRow.id))
    ).map((row) => row.id);
    if (lotIds.length > 0) {
      await tx.delete(auctionBid).where(inArray(auctionBid.lotId, lotIds));
      await tx.delete(auctionLot).where(inArray(auctionLot.id, lotIds));
    }
    await tx.delete(auction).where(eq(auction.id, auctionRow.id));
  }
  await tx
    .delete(teamFormationPotPlayer)
    .where(eq(teamFormationPotPlayer.tournamentId, tournamentId));
  await tx.delete(teamMember).where(eq(teamMember.tournamentId, tournamentId));
  await tx.delete(team).where(eq(team.tournamentId, tournamentId));
  await tx
    .delete(tournamentRankingSnapshot)
    .where(eq(tournamentRankingSnapshot.tournamentId, tournamentId));
  await tx
    .delete(tournamentSwissConfig)
    .where(eq(tournamentSwissConfig.tournamentId, tournamentId));
  // votes, events, live rooms and the version row cascade from tournament.
  await tx.delete(tournament).where(eq(tournament.id, tournamentId));
};

const tournamentRouter = createTRPCRouter({
  /** Games and versions to pick from when creating a tournament. */
  catalog: adminProcedure.query(async ({ ctx }) => {
    const [games, versions] = await Promise.all([
      ctx.db
        .select({ id: game.id, name: game.name, isOfficial: game.isOfficial })
        .from(game)
        .orderBy(asc(game.name)),
      ctx.db
        .select({
          id: gameVersion.id,
          gameId: gameVersion.gameId,
          version: gameVersion.version,
          releaseOrder: gameVersion.releaseOrder,
        })
        .from(gameVersion)
        .orderBy(asc(gameVersion.releaseOrder)),
    ]);
    return { games, versions };
  }),

  candidates: adminProcedure
    .input(z.object({ editionId: z.string().uuid() }))
    .query(({ ctx, input }) =>
      listParticipantCandidates(ctx.db, input.editionId),
    ),

  /** Admin view of a tournament: the live snapshot plus setup helpers. */
  setup: adminProcedure
    .input(z.object({ tournamentId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const state = await getLiveState(ctx.db, input.tournamentId);
      if (!state) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }
      const [candidates, staffWithoutPlayer] = await Promise.all([
        listParticipantCandidates(ctx.db, state.editionId),
        listStaffWithoutPlayer(ctx.db),
      ]);
      return { state, candidates, staffWithoutPlayer };
    }),

  create: adminProcedure
    .input(
      configSchema.extend({
        editionId: z.string().uuid(),
        participantPlayerIds: z.array(z.string().uuid()),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const teamSize = input.kind === 'individual' ? 1 : input.teamSize;
      const id = await ctx.db.transaction(async (tx) => {
        const [row] = await tx
          .insert(tournament)
          .values({
            editionId: input.editionId,
            gameId: input.gameId,
            isOfficial: input.isOfficial,
            gameVersionId: input.gameVersionId,
            model: input.model,
            kind: input.kind,
            stage: 'setup',
            stageChangedAt: new Date(),
            teamSize,
            rankingSource: input.rankingSource,
            historicalWeightPercent:
              input.rankingSource === 'combined'
                ? (input.historicalWeightPercent ?? 50)
                : null,
            createdByUserId: ctx.session.user.id,
          })
          .returning({ id: tournament.id });
        if (!row) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const count = await writeRankingSnapshot(
          ctx.db,
          tx,
          row.id,
          input.participantPlayerIds,
        );
        await rebuildEmptyTeams(tx, row.id, count, teamSize);
        return row.id;
      });
      await runTournamentTx(
        ctx.db,
        id,
        actorFromSession(ctx.session),
        ({ emit }) =>
          emit({
            stream: 'admin',
            type: 'tournament_created',
            payload: { ...input, teamSize },
          }),
      );
      return { id };
    }),

  updateConfig: adminProcedure
    .input(configSchema.partial().extend({ tournamentId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { tournamentId, ...changes } = input;
      const current = await loadTournament(ctx.db, tournamentId);
      const teamSizeChanged =
        changes.teamSize !== undefined && changes.teamSize !== current.teamSize;
      if (teamSizeChanged) assertRosterEditable(current.stage);
      await runTournamentTx(
        ctx.db,
        tournamentId,
        actorFromSession(ctx.session),
        async ({ tx, emit }) => {
          await tx
            .update(tournament)
            .set({
              ...changes,
              historicalWeightPercent:
                (changes.rankingSource ?? current.rankingSource) === 'combined'
                  ? (changes.historicalWeightPercent ??
                    current.historicalWeightPercent ??
                    50)
                  : null,
            })
            .where(eq(tournament.id, tournamentId));
          if (teamSizeChanged && changes.teamSize !== undefined) {
            const [row] = await tx
              .select({ count: sql<number>`count(*)::int` })
              .from(tournamentRankingSnapshot)
              .where(eq(tournamentRankingSnapshot.tournamentId, tournamentId));
            await rebuildEmptyTeams(
              tx,
              tournamentId,
              row?.count ?? 0,
              changes.teamSize,
            );
          }
          await emit({
            stream: 'admin',
            type: 'config_changed',
            payload: changes,
          });
        },
      );
      return { ok: true };
    }),

  setParticipants: adminProcedure
    .input(
      z.object({
        tournamentId: z.string().uuid(),
        playerIds: z.array(z.string().uuid()).min(2),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const current = await loadTournament(ctx.db, input.tournamentId);
      assertRosterEditable(current.stage);
      await runTournamentTx(
        ctx.db,
        input.tournamentId,
        actorFromSession(ctx.session),
        async ({ tx, emit }) => {
          const count = await writeRankingSnapshot(
            ctx.db,
            tx,
            input.tournamentId,
            input.playerIds,
          );
          await rebuildEmptyTeams(
            tx,
            input.tournamentId,
            count,
            current.teamSize ?? 1,
          );
          await emit({
            stream: 'admin',
            type: 'participants_changed',
            payload: { playerIds: input.playerIds },
          });
        },
      );
      revalidateLive();
      return { ok: true };
    }),

  /**
   * "Dar comienzo": the tournament becomes public and /council switches
   * from the door to the live block. Where it lands depends on whether
   * there's a vote to run first.
   */
  start: adminProcedure
    .input(z.object({ tournamentId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const current = await loadTournament(ctx.db, input.tournamentId);
      if (current.stage !== 'setup') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'El torneo ya ha comenzado.',
        });
      }
      const [row] = await ctx.db
        .select({ count: sql<number>`count(*)::int` })
        .from(tournamentRankingSnapshot)
        .where(eq(tournamentRankingSnapshot.tournamentId, input.tournamentId));
      if ((row?.count ?? 0) < 2) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Hacen falta al menos dos participantes.',
        });
      }
      const next: TournamentStage =
        current.rankingSource === 'historical' ? 'ranking_review' : 'voting';
      await changeStage(ctx, input.tournamentId, current.stage, next);
      return { stage: next };
    }),

  /** Manual stage move, for the admin and for test runs. */
  setStage: adminProcedure
    .input(z.object({ tournamentId: z.string().uuid(), stage: stageSchema }))
    .mutation(async ({ ctx, input }) => {
      const current = await loadTournament(ctx.db, input.tournamentId);
      if (current.stage === input.stage) return { stage: input.stage };
      await changeStage(ctx, input.tournamentId, current.stage, input.stage);
      return { stage: input.stage };
    }),

  delete: adminProcedure
    .input(z.object({ tournamentId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const current = await loadTournament(ctx.db, input.tournamentId);
      if (current.stage === 'completed') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Un torneo terminado es historia: no se borra.',
        });
      }
      await ctx.db.transaction((tx) =>
        deleteTournamentCascade(tx, input.tournamentId),
      );
      revalidateLive();
      return { ok: true };
    }),

  /** Tournaments run through the app, newest first (for the setup index). */
  list: adminProcedure.query(({ ctx }) =>
    ctx.db
      .select({
        id: tournament.id,
        stage: tournament.stage,
        kind: tournament.kind,
        createdAt: tournament.createdAt,
        editionId: tournament.editionId,
      })
      .from(tournament)
      .where(sql`${tournament.stage} IS NOT NULL`)
      .orderBy(asc(tournament.createdAt)),
  ),
});

const changeStage = async (
  ctx: { db: TRPCContext['db']; session: TRPCContext['session'] },
  tournamentId: string,
  from: TournamentStage,
  to: TournamentStage,
) => {
  await runTournamentTx(
    ctx.db,
    tournamentId,
    actorFromSession(ctx.session),
    async ({ tx, emit }) => {
      await tx
        .update(tournament)
        .set({ stage: to, stageChangedAt: new Date() })
        .where(eq(tournament.id, tournamentId));
      await emit({
        stream: 'admin',
        type: 'stage_changed',
        payload: {
          from,
          to,
          direction: stageIndex(to) > stageIndex(from) ? 'forward' : 'back',
        },
      });
    },
  );
  revalidateLive();
};

export { tournamentRouter };
