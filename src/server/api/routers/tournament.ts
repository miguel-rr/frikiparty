import { TRPCError } from '@trpc/server';
import { asc, eq, inArray, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { env } from '@/env';
import {
  CRITERION_SHORTAGES,
  CRITERION_SURPLUSES,
  type FormationConfig,
  formationConfigPatchSchema,
  POT_CRITERIA,
  POT_LAYOUTS,
  POT_TIEBREAKS,
  parseFormationConfig,
  type RankingMeta,
  VOTE_COUNTS,
} from '@/lib/tournament/formation-config';
import {
  buildPotGroups,
  meetsCriterion,
  type PotLayoutOptions,
  requota,
} from '@/lib/tournament/pot-groups';
import {
  breakTie,
  findCutTies,
  type PotTiebreak,
  resolveCutTies,
} from '@/lib/tournament/pot-tiebreak';
import { keepContiguousTies } from '@/lib/tournament/ranking';
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
  tournamentVote,
} from '@/server/db/schema';
import {
  computeRanking,
  loadHistoricalRanking,
  loadLatestRingYears,
} from '@/server/live/ranking-count';
import {
  getLiveState,
  listParticipantCandidates,
  listStaffWithoutPlayer,
  loadBallots,
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

/**
 * The roster and team size change only before the start: ballots, the
 * ranking and the pots all depend on them. To add a latecomer later, the
 * admin moves the stage back to setup (which also clears those).
 */
const ROSTER_EDITABLE: TournamentStage[] = ['setup'];

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
      message:
        'El torneo ya ha comenzado: vuelve a "Preparación" para tocar la lista.',
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

/** Participants in historical-ranking order (the snapshot's positions). */
const loadHistoricalOrder = async (
  db: TRPCContext['db'],
  tournamentId: string,
) =>
  (
    await db
      .select({ id: tournamentRankingSnapshot.playerId })
      .from(tournamentRankingSnapshot)
      .where(eq(tournamentRankingSnapshot.tournamentId, tournamentId))
      .orderBy(asc(tournamentRankingSnapshot.position))
  ).map((row) => row.id);

const assertSameSet = (
  given: string[],
  expected: string[],
  message: string,
) => {
  const wanted = new Set(expected);
  const seen = new Set(given);
  if (
    seen.size !== given.length ||
    seen.size !== wanted.size ||
    given.some((id) => !wanted.has(id))
  ) {
    throw new TRPCError({ code: 'BAD_REQUEST', message });
  }
};

const writePots = async (tx: Tx, tournamentId: string, pots: string[][]) => {
  await tx
    .delete(teamFormationPotPlayer)
    .where(eq(teamFormationPotPlayer.tournamentId, tournamentId));
  const rows = pots.flatMap((pot, potIndex) =>
    pot.map((playerId) => ({ tournamentId, potIndex, playerId })),
  );
  if (rows.length > 0) {
    await tx.insert(teamFormationPotPlayer).values(rows);
  }
};

/** Pot size the ranking is cut at: as many players per pot as teams. */
const potSizeFor = (playerCount: number, teamSize: number | null) =>
  Math.ceil(playerCount / Math.max(1, teamSize ?? 1));

const voteOptionsSchema = z.object({
  voteCount: formationConfigPatchSchema.shape.voteCount.unwrap(),
  voteOutlierThreshold: z.number().min(0).max(100).nullable(),
  historicalWeightPercent: z.number().int().min(0).max(100).nullable(),
});

/** Stages where the formation options can still change. */
const CONFIG_EDITABLE: TournamentStage[] = [
  'setup',
  'voting',
  'ranking_review',
  'pots_review',
];

/** Each tie-break option applied to the ties the pot cuts run through. */
const previewCutTies = async (
  db: TRPCContext['db'],
  order: string[],
  tieGroups: string[][],
  potSize: number,
  names: Record<string, string>,
) => {
  const ties = findCutTies(order, tieGroups, potSize);
  if (ties.length === 0) return [];
  const latestRingYear = await loadLatestRingYears(
    db,
    ties.flatMap((tie) => tie.players),
  );
  const context = { names, latestRingYear };
  return ties.map((tie) => ({
    ...tie,
    latestRingYear: Object.fromEntries(
      tie.players.map((id) => [id, latestRingYear[id] ?? null]),
    ),
    options: POT_TIEBREAKS.map((method: PotTiebreak) => ({
      method,
      ...breakTie(tie.players, method, context),
    })),
  }));
};

/** Ranking from the stored ballots for a source and a set of options. */
const rankFromBallots = async (
  db: TRPCContext['db'],
  tournamentId: string,
  source: 'historical' | 'vote' | 'combined',
  options: z.infer<typeof voteOptionsSchema>,
) => {
  const [historical, ballots] = await Promise.all([
    loadHistoricalRanking(db, tournamentId),
    loadBallots(db, tournamentId),
  ]);
  return {
    historical,
    ballots,
    outcome: computeRanking({
      source,
      historical,
      ballots,
      historicalWeightPercent: options.historicalWeightPercent,
      config: options,
    }),
  };
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
      const state = await getLiveState(ctx.db, input.tournamentId, {
        privileged: true,
      });
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
          // Anything derived from the old roster is void.
          await tx
            .delete(tournamentVote)
            .where(eq(tournamentVote.tournamentId, input.tournamentId));
          await tx
            .delete(teamFormationPotPlayer)
            .where(eq(teamFormationPotPlayer.tournamentId, input.tournamentId));
          await tx
            .update(tournament)
            .set({ teamRankingSnapshot: null, rankingMeta: null })
            .where(eq(tournament.id, input.tournamentId));
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
      if (next === 'ranking_review') {
        // No vote: the tournament ranking opens as the historical one.
        const historical = await loadHistoricalRanking(
          ctx.db,
          input.tournamentId,
        );
        await ctx.db
          .update(tournament)
          .set({
            teamRankingSnapshot: historical.order,
            rankingMeta: { tieGroups: historical.tieGroups },
          })
          .where(eq(tournament.id, input.tournamentId));
      }
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

  /**
   * Closes the vote: the ballots, counted with the configured method
   * (Borda by default) and blended with the historical order when the
   * source is `combined`, become the working ranking the admin reviews.
   */
  closeVoting: adminProcedure
    .input(z.object({ tournamentId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const current = await loadTournament(ctx.db, input.tournamentId);
      if (current.stage !== 'voting') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'La votación no está abierta.',
        });
      }
      const config = parseFormationConfig(current.formationConfig);
      const { historical, ballots, outcome } = await rankFromBallots(
        ctx.db,
        input.tournamentId,
        current.rankingSource ?? 'vote',
        { ...config, historicalWeightPercent: current.historicalWeightPercent },
      );
      if (ballots.length === 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Nadie ha votado todavía.',
        });
      }
      const ranking = outcome.order;
      const voteRanking = outcome.vote?.order ?? [];
      await runTournamentTx(
        ctx.db,
        input.tournamentId,
        actorFromSession(ctx.session),
        async ({ tx, emit }) => {
          await tx
            .update(tournament)
            .set({
              teamRankingSnapshot: ranking,
              rankingMeta: outcome.meta,
              stage: 'ranking_review',
              stageChangedAt: new Date(),
            })
            .where(eq(tournament.id, input.tournamentId));
          await emit({
            stream: 'admin',
            type: 'voting_closed',
            payload: {
              ballots: ballots.length,
              voteRanking,
              historical: historical.order,
              ranking,
              historicalWeightPercent: current.historicalWeightPercent,
              voteCount: config.voteCount,
              ballotsDiscarded: outcome.meta.ballotsDiscarded ?? 0,
              tieGroups: outcome.meta.tieGroups,
            },
          });
          await emit({
            stream: 'admin',
            type: 'stage_changed',
            payload: {
              from: 'voting',
              to: 'ranking_review',
              direction: 'forward',
            },
          });
        },
      );
      revalidateLive();
      return { ok: true };
    }),

  /**
   * Development only: the raw ballots, to tune the vote while building it.
   * Refused in production — votes are private there, admins included.
   */
  ballots: adminProcedure
    .input(z.object({ tournamentId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      if (env.VERCEL_ENV === 'production') {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }
      return loadBallots(ctx.db, input.tournamentId);
    }),

  /** Hand-adjusted tournament ranking, while it's under review. */
  setRanking: adminProcedure
    .input(
      z.object({
        tournamentId: z.string().uuid(),
        order: z.array(z.string().uuid()).min(2),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const current = await loadTournament(ctx.db, input.tournamentId);
      if (current.stage !== 'ranking_review') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'El ranking sólo se edita durante su revisión.',
        });
      }
      const roster = await loadHistoricalOrder(ctx.db, input.tournamentId);
      assertSameSet(
        input.order,
        roster,
        'El ranking debe incluir a todos los participantes.',
      );
      await runTournamentTx(
        ctx.db,
        input.tournamentId,
        actorFromSession(ctx.session),
        async ({ tx, emit }) => {
          const meta: RankingMeta = current.rankingMeta ?? { tieGroups: [] };
          await tx
            .update(tournament)
            .set({
              teamRankingSnapshot: input.order,
              rankingMeta: {
                ...meta,
                tieGroups: keepContiguousTies(input.order, meta.tieGroups),
              },
            })
            .where(eq(tournament.id, input.tournamentId));
          await emit({
            stream: 'admin',
            type: 'ranking_edited',
            payload: { order: input.order },
          });
        },
      );
      return { ok: true };
    }),

  /**
   * Formation options, while they can still change. A change to how the
   * vote is counted after it closed goes through `applyRankingOptions`.
   */
  updateFormationConfig: adminProcedure
    .input(
      z.object({
        tournamentId: z.string().uuid(),
        patch: formationConfigPatchSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const current = await loadTournament(ctx.db, input.tournamentId);
      if (!CONFIG_EDITABLE.includes(current.stage)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Los equipos ya se están formando: las opciones no cambian.',
        });
      }
      const config: FormationConfig = {
        ...parseFormationConfig(current.formationConfig),
        ...Object.fromEntries(
          Object.entries(input.patch).filter(
            ([, value]) => value !== undefined,
          ),
        ),
      };
      await runTournamentTx(
        ctx.db,
        input.tournamentId,
        actorFromSession(ctx.session),
        async ({ tx, emit }) => {
          await tx
            .update(tournament)
            .set({ formationConfig: config })
            .where(eq(tournament.id, input.tournamentId));
          await emit({
            stream: 'admin',
            type: 'formation_config_changed',
            payload: { patch: input.patch },
          });
        },
      );
      return config;
    }),

  /**
   * What each counting option would give, side by side, so the admin can
   * see the effect before choosing: every method with the given discard
   * threshold and weight, the anonymous distance of each ballot to the
   * rest, and how each tie-break would settle the ties at the pot cuts of
   * the current ranking (the historical one before the review).
   */
  rankingPreview: adminProcedure
    .input(
      z.object({
        tournamentId: z.string().uuid(),
        voteOutlierThreshold: z.number().min(0).max(100).nullable(),
        historicalWeightPercent: z.number().int().min(0).max(100).nullable(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const current = await loadTournament(ctx.db, input.tournamentId);
      if (!['setup', 'voting', 'ranking_review'].includes(current.stage)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Los bombos ya están hechos: no hay nada que previsualizar.',
        });
      }
      const source = current.rankingSource ?? 'historical';
      // The vote only enters the preview once it's closed: a partial tally
      // would leak how it's going.
      const counted =
        current.stage === 'ranking_review' && source !== 'historical';
      const [historical, ballots] = await Promise.all([
        loadHistoricalRanking(ctx.db, input.tournamentId),
        counted ? loadBallots(ctx.db, input.tournamentId) : Promise.resolve([]),
      ]);
      const methods =
        ballots.length === 0
          ? []
          : VOTE_COUNTS.map((voteCount) => {
              const outcome = computeRanking({
                source,
                historical,
                ballots,
                historicalWeightPercent: input.historicalWeightPercent,
                config: {
                  voteCount,
                  voteOutlierThreshold: input.voteOutlierThreshold,
                },
              });
              return {
                voteCount,
                order: outcome.order,
                tieGroups: outcome.meta.tieGroups,
                voteOrder: outcome.vote?.order ?? [],
                ballotsUsed: outcome.meta.ballotsUsed ?? 0,
                ballotsDiscarded: outcome.meta.ballotsDiscarded ?? 0,
              };
            });
      const distances =
        ballots.length === 0
          ? []
          : (computeRanking({
              source: 'vote',
              historical,
              ballots,
              historicalWeightPercent: null,
              config: { voteCount: 'borda', voteOutlierThreshold: null },
            }).vote?.distances ?? []);
      const reviewing = current.stage === 'ranking_review';
      const order =
        (reviewing ? current.teamRankingSnapshot : null) ?? historical.order;
      const tieGroups =
        (reviewing ? current.rankingMeta?.tieGroups : null) ??
        historical.tieGroups;
      const config = parseFormationConfig(current.formationConfig);
      const teamSize = current.teamSize ?? 1;
      const layoutWith = (patch: Partial<PotLayoutOptions>) =>
        buildPotGroups({
          order,
          teamCount: teamsLayout(order.length, teamSize).teamCount,
          teamSize,
          rings: historical.rings,
          layout: config.potLayout,
          criterion: config.potCriterion,
          surplus: config.criterionSurplus,
          shortage: config.criterionShortage,
          ...patch,
        });
      // The rule's options are shown on a layout that has the rule's pot.
      const ruleLayout =
        config.potLayout === 'criterion_market'
          ? 'criterion_market'
          : 'criterion_ranking';
      const pots = {
        teamCount: teamsLayout(order.length, teamSize).teamCount,
        layouts: POT_LAYOUTS.map((layout) => ({
          layout,
          ...layoutWith({ layout }),
        })),
        criteria: POT_CRITERIA.map((criterion) => ({
          criterion,
          meeting: order.filter((id) =>
            meetsCriterion(criterion, historical.rings[id]),
          ),
        })),
        surpluses: CRITERION_SURPLUSES.map((surplus) => ({
          surplus,
          ...layoutWith({ layout: ruleLayout, surplus }),
        })),
        shortages: CRITERION_SHORTAGES.map((shortage) => ({
          shortage,
          ...layoutWith({ layout: ruleLayout, shortage }),
        })),
      };
      return {
        pots,
        source,
        ballots: ballots.length,
        historical: {
          order: historical.order,
          tieGroups: historical.tieGroups,
        },
        /** Which ranking the cut ties come from. */
        cutSource: reviewing ? ('current' as const) : ('historical' as const),
        methods,
        distances,
        potSize: potSizeFor(order.length, current.teamSize),
        cutTies: await previewCutTies(
          ctx.db,
          order,
          tieGroups,
          potSizeFor(order.length, current.teamSize),
          historical.names,
        ),
      };
    }),

  /**
   * Recounts the closed vote with other options and makes the result the
   * working ranking (hand edits are replaced, as the screen warns).
   */
  applyRankingOptions: adminProcedure
    .input(voteOptionsSchema.extend({ tournamentId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const current = await loadTournament(ctx.db, input.tournamentId);
      if (current.stage !== 'ranking_review') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message:
            'El recuento sólo se cambia durante la revisión del ranking.',
        });
      }
      const source = current.rankingSource ?? 'historical';
      if (source === 'historical') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Este torneo no tiene votación que recontar.',
        });
      }
      const { ballots, outcome } = await rankFromBallots(
        ctx.db,
        input.tournamentId,
        source,
        input,
      );
      if (ballots.length === 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'No hay papeletas que recontar.',
        });
      }
      const config: FormationConfig = {
        ...parseFormationConfig(current.formationConfig),
        voteCount: input.voteCount,
        voteOutlierThreshold: input.voteOutlierThreshold,
      };
      await runTournamentTx(
        ctx.db,
        input.tournamentId,
        actorFromSession(ctx.session),
        async ({ tx, emit }) => {
          await tx
            .update(tournament)
            .set({
              formationConfig: config,
              historicalWeightPercent:
                source === 'combined'
                  ? input.historicalWeightPercent
                  : current.historicalWeightPercent,
              teamRankingSnapshot: outcome.order,
              rankingMeta: outcome.meta,
            })
            .where(eq(tournament.id, input.tournamentId));
          await emit({
            stream: 'admin',
            type: 'ranking_recounted',
            payload: {
              voteCount: input.voteCount,
              voteOutlierThreshold: input.voteOutlierThreshold,
              historicalWeightPercent: input.historicalWeightPercent,
              ranking: outcome.order,
              tieGroups: outcome.meta.tieGroups,
              ballotsDiscarded: outcome.meta.ballotsDiscarded ?? 0,
            },
          });
        },
      );
      return { ok: true };
    }),

  /** The ranking is final: pots are dealt from it and go under review. */
  confirmRanking: adminProcedure
    .input(z.object({ tournamentId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const current = await loadTournament(ctx.db, input.tournamentId);
      if (current.stage !== 'ranking_review' || !current.teamRankingSnapshot) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'No hay ranking que confirmar.',
        });
      }
      const config = parseFormationConfig(current.formationConfig);
      const meta: RankingMeta = current.rankingMeta ?? { tieGroups: [] };
      const historical = await loadHistoricalRanking(
        ctx.db,
        input.tournamentId,
      );
      const { order: dealt, resolutions } = resolveCutTies(
        current.teamRankingSnapshot,
        meta.tieGroups,
        potSizeFor(current.teamRankingSnapshot.length, current.teamSize),
        config.potTiebreak,
        {
          names: historical.names,
          latestRingYear: await loadLatestRingYears(
            ctx.db,
            current.teamRankingSnapshot,
          ),
        },
      );
      const built = buildPotGroups({
        order: dealt,
        teamCount: teamsLayout(dealt.length, current.teamSize ?? 1).teamCount,
        teamSize: current.teamSize ?? 1,
        rings: historical.rings,
        layout: config.potLayout,
        criterion: config.potCriterion,
        surplus: config.criterionSurplus,
        shortage: config.criterionShortage,
      });
      const { pots } = built;
      await runTournamentTx(
        ctx.db,
        input.tournamentId,
        actorFromSession(ctx.session),
        async ({ tx, emit }) => {
          await writePots(tx, input.tournamentId, pots);
          await tx
            .update(tournament)
            .set({
              stage: 'pots_review',
              stageChangedAt: new Date(),
              teamRankingSnapshot: dealt,
              ...(built.captainPotIndex === null
                ? {}
                : { captainPotIndex: built.captainPotIndex }),
              rankingMeta: {
                ...meta,
                cutTies: resolutions,
                groups: built.groups,
                criterionMoves: {
                  movedOut: built.movedOut,
                  filledIn: built.filledIn,
                  drawn: built.drawn,
                },
              },
            })
            .where(eq(tournament.id, input.tournamentId));
          await emit({
            stream: 'admin',
            type: 'ranking_confirmed',
            payload: { order: dealt },
          });
          for (const resolution of resolutions) {
            await emit({
              stream: 'admin',
              type: 'pot_tiebreak',
              payload: resolution,
            });
          }
          await emit({
            stream: 'admin',
            type: 'pots_generated',
            payload: {
              pots,
              groups: built.groups,
              layout: config.potLayout,
              movedOut: built.movedOut,
              filledIn: built.filledIn,
              drawn: built.drawn,
            },
          });
          await emit({
            stream: 'admin',
            type: 'stage_changed',
            payload: {
              from: 'ranking_review',
              to: 'pots_review',
              direction: 'forward',
            },
          });
        },
      );
      revalidateLive();
      return { ok: true };
    }),

  /** Hand-moved pots, while they're under review. */
  setPots: adminProcedure
    .input(
      z.object({
        tournamentId: z.string().uuid(),
        pots: z.array(z.array(z.string().uuid())).min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const current = await loadTournament(ctx.db, input.tournamentId);
      if (current.stage !== 'pots_review') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Los bombos sólo se editan durante su revisión.',
        });
      }
      const roster = await loadHistoricalOrder(ctx.db, input.tournamentId);
      assertSameSet(
        input.pots.flat(),
        roster,
        'Los bombos deben repartir a todos los participantes.',
      );
      await runTournamentTx(
        ctx.db,
        input.tournamentId,
        actorFromSession(ctx.session),
        async ({ tx, emit }) => {
          await writePots(tx, input.tournamentId, input.pots);
          if (current.rankingMeta?.groups) {
            await tx
              .update(tournament)
              .set({
                rankingMeta: {
                  ...current.rankingMeta,
                  groups: requota(
                    input.pots,
                    current.rankingMeta.groups,
                    teamsLayout(roster.length, current.teamSize ?? 1).teamCount,
                  ),
                },
              })
              .where(eq(tournament.id, input.tournamentId));
          }
          await emit({
            stream: 'admin',
            type: 'pots_edited',
            payload: { pots: input.pots },
          });
        },
      );
      return { ok: true };
    }),

  /**
   * Pots are final: every player of the captains' pot takes a team (in
   * pot order), the pots become public, and formation can begin.
   */
  confirmPots: adminProcedure
    .input(z.object({ tournamentId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const current = await loadTournament(ctx.db, input.tournamentId);
      if (current.stage !== 'pots_review') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'No hay bombos que confirmar.',
        });
      }
      const state = await getLiveState(ctx.db, input.tournamentId, {
        privileged: true,
      });
      const captainPot = state?.pots[current.captainPotIndex] ?? [];
      const teams = state?.teams ?? [];
      if (captainPot.length === 0 || captainPot.length !== teams.length) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `El bombo de capitanes tiene ${captainPot.length} jugadores y hay ${teams.length} equipos.`,
        });
      }
      if (teams.some((teamRow) => teamRow.members.length > 0)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Los equipos ya tienen miembros.',
        });
      }
      await runTournamentTx(
        ctx.db,
        input.tournamentId,
        actorFromSession(ctx.session),
        async ({ tx, emit }) => {
          const assignments = captainPot.map((playerId, index) => ({
            teamId: teams[index]?.id ?? '',
            playerId,
          }));
          await tx.insert(teamMember).values(
            assignments.map((entry) => ({
              teamId: entry.teamId,
              playerId: entry.playerId,
              tournamentId: input.tournamentId,
              isCaptain: true,
              seat: 0,
            })),
          );
          await tx
            .update(tournament)
            .set({ stage: 'formation', stageChangedAt: new Date() })
            .where(eq(tournament.id, input.tournamentId));
          await emit({
            stream: 'admin',
            type: 'pots_published',
            payload: { pots: state?.pots ?? [] },
          });
          await emit({
            stream: 'admin',
            type: 'captains_assigned',
            payload: { assignments },
          });
          await emit({
            stream: 'admin',
            type: 'stage_changed',
            payload: {
              from: 'pots_review',
              to: 'formation',
              direction: 'forward',
            },
          });
        },
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

export { deleteTournamentCascade, tournamentRouter };
