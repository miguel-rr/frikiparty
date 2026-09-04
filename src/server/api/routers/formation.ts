import { TRPCError } from '@trpc/server';
import { and, asc, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import {
  changeConfig,
  confirmNext,
  confirmSkip,
  DEFAULT_AUCTION_CONFIG,
  pause as pauseAuction,
  placeBid,
  resume as resumeAuction,
  runRaffle,
  startAuctionEvents,
  undoLot,
} from '@/lib/tournament/auction-live';
import {
  closeDraft,
  isDraftComplete,
  pauseDraft,
  pickPlayer,
  resumeDraft,
  startDraftEvents,
  undoPick,
} from '@/lib/tournament/draft-live';
import { shuffle } from '@/lib/tournament/ranking';
import { playerProcedure } from '@/server/api/player-procedure';
import {
  adminProcedure,
  createTRPCRouter,
  publicProcedure,
  type TRPCContext,
} from '@/server/api/trpc';
import {
  auction,
  auctionBid,
  auctionLot,
  draft,
  draftPick,
  team,
  teamMember,
  tournament,
  tournamentEvent,
} from '@/server/db/schema';
import {
  applyRoomCommand,
  loadRoom,
  settleAuctionTimers,
} from '@/server/live/formation';
import { getLiveState, type LiveState } from '@/server/live/state';
import { actorFromSession, runTournamentTx, type Tx } from '@/server/live/tx';

const id = z.string().uuid();

const auctionConfigSchema = z.object({
  initialTimerMs: z.number().int().min(3_000).max(600_000),
  countdownMs: z.number().int().min(3_000).max(600_000),
  countdownShortMs: z.number().int().min(3_000).max(600_000),
  countdownShortAfterBids: z.number().int().min(1).max(100),
  lockoutMs: z.number().int().min(0).max(10_000),
});

const captainOrderSchema = z.enum([
  'ranking',
  'inverse-ranking',
  'fixed-random',
  'full-random',
]);

/** DB spelling of the order method (data-model.md) from the engine's. */
const captainOrderToDb = {
  ranking: 'ranking',
  'inverse-ranking': 'ranking_inverse',
  'fixed-random': 'random_fixed',
  'full-random': 'random_total',
} as const;

const loadFormationState = async (
  db: TRPCContext['db'],
  tournamentId: string,
) => {
  const state = await getLiveState(db, tournamentId, { privileged: true });
  if (!state) throw new TRPCError({ code: 'NOT_FOUND' });
  if (state.stage !== 'formation') {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'La formación de equipos no está abierta.',
    });
  }
  return state;
};

const captainsOf = (state: LiveState) =>
  state.teams
    .map((t) => t.members.find((m) => m.isCaptain)?.playerId)
    .filter((captainId): captainId is string => captainId !== undefined);

const teamOfCaptain = (state: LiveState, captainId: string) =>
  state.teams.find((t) =>
    t.members.some((m) => m.isCaptain && m.playerId === captainId),
  );

/** The captain behind the session, or 403. */
const requireCaptain = (state: LiveState, playerId: string) => {
  if (!teamOfCaptain(state, playerId)) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Sólo los capitanes actúan aquí.',
    });
  }
  return playerId;
};

/**
 * Seats every non-captain on a team: the rosters decided by the room
 * (auction/draft) or drawn at random, written as team_member with seats in
 * pot order, then the stage moves on. Runs inside the tournament tx.
 */
const seatTeams = async (
  tx: Tx,
  state: LiveState,
  rosters: Record<string, string[]>,
) => {
  const potOf = new Map<string, number>();
  state.pots.forEach((pot, potIndex) => {
    for (const playerId of pot) potOf.set(playerId, potIndex);
  });
  const rows: (typeof teamMember.$inferInsert)[] = [];
  for (const [captainId, playerIds] of Object.entries(rosters)) {
    const teamRow = teamOfCaptain(state, captainId);
    if (!teamRow) continue;
    for (const playerId of playerIds) {
      rows.push({
        teamId: teamRow.id,
        playerId,
        tournamentId: state.id,
        isCaptain: false,
        seat: potOf.get(playerId) ?? 99,
      });
    }
  }
  if (rows.length > 0) await tx.insert(teamMember).values(rows);
  await tx
    .update(tournament)
    .set({ stage: 'teams_ready', stageChangedAt: new Date() })
    .where(eq(tournament.id, state.id));
};

const formationRouter = createTRPCRouter({
  setMethod: adminProcedure
    .input(
      z.object({
        tournamentId: id,
        method: z.enum(['random', 'pots_random', 'draft', 'auction']),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await loadFormationState(ctx.db, input.tournamentId);
      await runTournamentTx(
        ctx.db,
        input.tournamentId,
        actorFromSession(ctx.session),
        async ({ tx, emit }) => {
          await tx
            .update(tournament)
            .set({ formationMethod: input.method })
            .where(eq(tournament.id, input.tournamentId));
          await emit({
            stream: 'admin',
            type: 'formation_method_set',
            payload: { method: input.method },
          });
        },
      );
      return { ok: true };
    }),

  /**
   * Random formation, both flavours: within pots (one player of each pot
   * per team, shuffled inside the pot) or fully random (everyone but the
   * captains dealt round-robin). Teams are seated at once; the Council
   * reveals them.
   */
  startRandom: adminProcedure
    .input(z.object({ tournamentId: id }))
    .mutation(async ({ ctx, input }) => {
      const state = await loadFormationState(ctx.db, input.tournamentId);
      const captains = captainsOf(state);
      const rosters: Record<string, string[]> = Object.fromEntries(
        captains.map((captainId) => [captainId, [] as string[]]),
      );
      if (state.formationMethod === 'pots_random') {
        state.pots.forEach((pot, potIndex) => {
          if (potIndex === state.captainPotIndex) return;
          shuffle(pot).forEach((playerId, index) => {
            const captainId = captains[index % captains.length];
            if (captainId) rosters[captainId]?.push(playerId);
          });
        });
      } else if (state.formationMethod === 'random') {
        const captainSet = new Set(captains);
        const rest = shuffle(
          state.participants
            .map((p) => p.id)
            .filter((pid) => !captainSet.has(pid)),
        );
        rest.forEach((playerId, index) => {
          const captainId = captains[index % captains.length];
          if (captainId) rosters[captainId]?.push(playerId);
        });
      } else {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Elige primero un método aleatorio.',
        });
      }
      await runTournamentTx(
        ctx.db,
        input.tournamentId,
        actorFromSession(ctx.session),
        async ({ tx, emit }) => {
          await emit({
            stream: 'admin',
            type: 'teams_drawn',
            payload: { method: state.formationMethod, rosters },
          });
          await seatTeams(tx, state, rosters);
          await emit({
            stream: 'admin',
            type: 'stage_changed',
            payload: {
              from: 'formation',
              to: 'teams_ready',
              direction: 'forward',
            },
          });
        },
      );
      revalidatePath('/council');
      return { ok: true };
    }),

  startDraft: adminProcedure
    .input(
      z.object({
        tournamentId: id,
        method: z.enum(['snake', 'linear']),
        captainOrderMethod: captainOrderSchema,
        baseOrder: z.array(id).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const state = await loadFormationState(ctx.db, input.tournamentId);
      const captains = captainsOf(state);
      if (input.baseOrder) {
        const given = new Set(input.baseOrder);
        if (
          given.size !== captains.length ||
          captains.some((c) => !given.has(c))
        ) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'El orden debe incluir a todos los capitanes.',
          });
        }
      }
      await ctx.db
        .insert(draft)
        .values({
          tournamentId: input.tournamentId,
          method: input.method,
          captainOrderMethod: captainOrderToDb[input.captainOrderMethod],
        })
        .onConflictDoNothing();
      await applyRoomCommand(
        ctx.db,
        input.tournamentId,
        actorFromSession(ctx.session),
        'draft',
        (room) =>
          room.startedAt
            ? { error: 'El draft ya está en marcha.' }
            : {
                events: startDraftEvents({
                  pots: state.pots,
                  captainIds: captains,
                  captainPotIndex: state.captainPotIndex,
                  ranking: state.ranking ?? [],
                  captainOrderMethod: input.captainOrderMethod,
                  method: input.method,
                  baseOrder: input.baseOrder,
                  now: Date.now(),
                }),
              },
      );
      return { ok: true };
    }),

  startAuction: adminProcedure
    .input(
      z.object({ tournamentId: id, config: auctionConfigSchema.partial() }),
    )
    .mutation(async ({ ctx, input }) => {
      const state = await loadFormationState(ctx.db, input.tournamentId);
      const config = { ...DEFAULT_AUCTION_CONFIG, ...input.config };
      await ctx.db
        .insert(auction)
        .values({ tournamentId: input.tournamentId, ...config })
        .onConflictDoNothing();
      await applyRoomCommand(
        ctx.db,
        input.tournamentId,
        actorFromSession(ctx.session),
        'auction',
        (room) =>
          room.startedAt
            ? { error: 'La subasta ya está en marcha.' }
            : {
                events: startAuctionEvents({
                  pots: state.pots,
                  captainIds: captainsOf(state),
                  captainPotIndex: state.captainPotIndex,
                  config,
                  now: Date.now(),
                }),
              },
      );
      return { ok: true };
    }),

  updateAuctionConfig: adminProcedure
    .input(
      z.object({ tournamentId: id, config: auctionConfigSchema.partial() }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(auction)
        .set(input.config)
        .where(eq(auction.tournamentId, input.tournamentId));
      await applyRoomCommand(
        ctx.db,
        input.tournamentId,
        actorFromSession(ctx.session),
        'auction',
        () => changeConfig(input.config, Date.now()),
      );
      return { ok: true };
    }),

  bid: playerProcedure
    .input(z.object({ tournamentId: id, amount: z.number().int().min(0) }))
    .mutation(async ({ ctx, input }) => {
      const state = await loadFormationState(ctx.db, input.tournamentId);
      const captainId = requireCaptain(state, ctx.player.id);
      await settleAuctionTimers(ctx.db, input.tournamentId);
      await applyRoomCommand(
        ctx.db,
        input.tournamentId,
        actorFromSession(ctx.session),
        'auction',
        (room) => placeBid(room, captainId, input.amount, Date.now()),
      );
      return { ok: true };
    }),

  pick: playerProcedure
    .input(
      z.object({
        tournamentId: id,
        potIndex: z.number().int().min(0),
        playerId: id,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const state = await loadFormationState(ctx.db, input.tournamentId);
      const captainId = requireCaptain(state, ctx.player.id);
      const after = await applyRoomCommand(
        ctx.db,
        input.tournamentId,
        actorFromSession(ctx.session),
        'draft',
        (room) =>
          pickPlayer(
            room,
            captainId,
            input.potIndex,
            input.playerId,
            Date.now(),
          ),
      );
      if (isDraftComplete(after)) {
        await applyRoomCommand(
          ctx.db,
          input.tournamentId,
          { userId: null },
          'draft',
          (room) => closeDraft(room, Date.now()),
        );
      }
      return { ok: true };
    }),

  confirmNext: adminProcedure
    .input(z.object({ tournamentId: id }))
    .mutation(async ({ ctx, input }) => {
      await settleAuctionTimers(ctx.db, input.tournamentId);
      await applyRoomCommand(
        ctx.db,
        input.tournamentId,
        actorFromSession(ctx.session),
        'auction',
        (room) => confirmNext(room, Date.now()),
      );
      return { ok: true };
    }),

  confirmSkip: adminProcedure
    .input(z.object({ tournamentId: id }))
    .mutation(async ({ ctx, input }) => {
      await applyRoomCommand(
        ctx.db,
        input.tournamentId,
        actorFromSession(ctx.session),
        'auction',
        (room) => confirmSkip(room, Date.now()),
      );
      return { ok: true };
    }),

  raffle: adminProcedure
    .input(z.object({ tournamentId: id }))
    .mutation(async ({ ctx, input }) => {
      await applyRoomCommand(
        ctx.db,
        input.tournamentId,
        actorFromSession(ctx.session),
        'auction',
        (room) => runRaffle(room, Date.now()),
      );
      return { ok: true };
    }),

  pause: adminProcedure
    .input(z.object({ tournamentId: id, kind: z.enum(['draft', 'auction']) }))
    .mutation(async ({ ctx, input }) => {
      if (input.kind === 'auction') {
        await settleAuctionTimers(ctx.db, input.tournamentId);
        await applyRoomCommand(
          ctx.db,
          input.tournamentId,
          actorFromSession(ctx.session),
          'auction',
          (room) => pauseAuction(room, Date.now()),
        );
      } else {
        await applyRoomCommand(
          ctx.db,
          input.tournamentId,
          actorFromSession(ctx.session),
          'draft',
          (room) => pauseDraft(room, Date.now()),
        );
      }
      return { ok: true };
    }),

  resume: adminProcedure
    .input(z.object({ tournamentId: id, kind: z.enum(['draft', 'auction']) }))
    .mutation(async ({ ctx, input }) => {
      if (input.kind === 'auction') {
        await applyRoomCommand(
          ctx.db,
          input.tournamentId,
          actorFromSession(ctx.session),
          'auction',
          (room) => resumeAuction(room, Date.now()),
        );
      } else {
        await applyRoomCommand(
          ctx.db,
          input.tournamentId,
          actorFromSession(ctx.session),
          'draft',
          (room) => resumeDraft(room, Date.now()),
        );
      }
      return { ok: true };
    }),

  undo: adminProcedure
    .input(z.object({ tournamentId: id, kind: z.enum(['draft', 'auction']) }))
    .mutation(async ({ ctx, input }) => {
      if (input.kind === 'auction') {
        await settleAuctionTimers(ctx.db, input.tournamentId);
        await applyRoomCommand(
          ctx.db,
          input.tournamentId,
          actorFromSession(ctx.session),
          'auction',
          (room, events) => {
            const result = undoLot(events, room, Date.now());
            return 'error' in result
              ? result
              : { events: [result.event], undoneSeqs: result.undoneSeqs };
          },
        );
      } else {
        await applyRoomCommand(
          ctx.db,
          input.tournamentId,
          actorFromSession(ctx.session),
          'draft',
          (room, events) => {
            const result = undoPick(events, room, Date.now());
            return 'error' in result
              ? result
              : { events: [result.event], undoneSeqs: result.undoneSeqs };
          },
        );
      }
      return { ok: true };
    }),

  /**
   * The room is closed: seat the teams it decided, write the historical
   * projections (draft picks / auction lots and bids) from the log, and
   * move on. The organiser presses this — the reveal is a moment.
   */
  finish: adminProcedure
    .input(z.object({ tournamentId: id }))
    .mutation(async ({ ctx, input }) => {
      const state = await loadFormationState(ctx.db, input.tournamentId);
      const kind = state.formationMethod === 'auction' ? 'auction' : 'draft';
      await runTournamentTx(
        ctx.db,
        input.tournamentId,
        actorFromSession(ctx.session),
        async ({ tx, emit }) => {
          const { events, state: room } = await loadRoom(
            tx,
            input.tournamentId,
            kind,
          );
          if (room.phase !== 'closed') {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'La sala aún no ha terminado.',
            });
          }
          const rosters: Record<string, string[]> = {};
          if (kind === 'auction') {
            const auctionRoom =
              room as import('@/lib/tournament/auction-live').AuctionLiveState;
            Object.assign(rosters, auctionRoom.rosters);
            const [auctionRow] = await tx
              .select({ id: auction.id })
              .from(auction)
              .where(eq(auction.tournamentId, input.tournamentId));
            if (auctionRow) {
              const live = events.filter((e) => e.undoneBySeq === null);
              for (const sale of auctionRoom.sales) {
                const [lot] = await tx
                  .insert(auctionLot)
                  .values({
                    auctionId: auctionRow.id,
                    potIndex: sale.potIndex,
                    playerId: sale.playerId,
                    soldAt: new Date(sale.at),
                    winningCaptainPlayerId: sale.captainId,
                    finalPrice: sale.amount,
                    wasAutoAssigned: sale.kind !== 'sold',
                  })
                  .onConflictDoNothing()
                  .returning({ id: auctionLot.id });
                if (!lot) continue;
                // Bids of that lot: those between its opening and its sale.
                const opened = [...live]
                  .reverse()
                  .find(
                    (e) =>
                      e.type === 'lot_opened' &&
                      e.seq < sale.seq &&
                      e.payload.playerId === sale.playerId,
                  );
                const bids = live.filter(
                  (e) =>
                    e.type === 'bid_placed' &&
                    opened &&
                    e.seq > opened.seq &&
                    e.seq < sale.seq,
                );
                if (bids.length > 0) {
                  await tx.insert(auctionBid).values(
                    bids.map((e) => ({
                      lotId: lot.id,
                      captainPlayerId: String(e.payload.captainId),
                      amount: Number(e.payload.amount),
                      bidAt: new Date(e.at),
                    })),
                  );
                }
              }
            }
          } else {
            const draftRoom =
              room as import('@/lib/tournament/draft-live').DraftLiveState;
            for (const captainId of draftRoom.captainIds)
              rosters[captainId] = [];
            for (const pick of draftRoom.picks) {
              rosters[pick.captainId]?.push(pick.playerId);
            }
            const [draftRow] = await tx
              .select({ id: draft.id })
              .from(draft)
              .where(eq(draft.tournamentId, input.tournamentId));
            if (draftRow && draftRoom.picks.length > 0) {
              await tx
                .insert(draftPick)
                .values(
                  draftRoom.picks.map((pick) => ({
                    draftId: draftRow.id,
                    captainPlayerId: pick.captainId,
                    potIndex: pick.potIndex,
                    pickedPlayerId: pick.playerId,
                    pickedAt: new Date(pick.at),
                  })),
                )
                .onConflictDoNothing();
            }
          }
          await seatTeams(tx, state, rosters);
          await emit({
            stream: 'admin',
            type: 'teams_published',
            payload: { rosters },
          });
          await emit({
            stream: 'admin',
            type: 'stage_changed',
            payload: {
              from: 'formation',
              to: 'teams_ready',
              direction: 'forward',
            },
          });
        },
      );
      revalidatePath('/council');
      return { ok: true };
    }),

  /** A captain names their team (players stay the point; the name is a flourish). */
  nameTeam: playerProcedure
    .input(z.object({ tournamentId: id, name: z.string().trim().max(40) }))
    .mutation(async ({ ctx, input }) => {
      const state = await getLiveState(ctx.db, input.tournamentId, {
        privileged: true,
      });
      if (!state) throw new TRPCError({ code: 'NOT_FOUND' });
      const mine = teamOfCaptain(state, ctx.player.id);
      if (!mine)
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Sólo el capitán bautiza al equipo.',
        });
      await runTournamentTx(
        ctx.db,
        input.tournamentId,
        actorFromSession(ctx.session),
        async ({ tx, emit }) => {
          await tx
            .update(team)
            .set({ name: input.name || null })
            .where(eq(team.id, mine.id));
          await emit({
            stream: 'admin',
            type: 'team_named',
            payload: { teamId: mine.id, name: input.name },
          });
        },
      );
      revalidatePath('/council');
      return { ok: true };
    }),

  /** The room's full log, for the replay. Public: the auction was a public show. */
  events: publicProcedure
    .input(z.object({ tournamentId: id, kind: z.enum(['draft', 'auction']) }))
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db
        .select({
          seq: tournamentEvent.seq,
          type: tournamentEvent.type,
          payload: tournamentEvent.payload,
          at: tournamentEvent.at,
          undoneBySeq: tournamentEvent.undoneBySeq,
        })
        .from(tournamentEvent)
        .where(
          and(
            eq(tournamentEvent.tournamentId, input.tournamentId),
            eq(tournamentEvent.stream, input.kind),
          ),
        )
        .orderBy(asc(tournamentEvent.seq));
      return rows.map((row) => ({
        seq: row.seq,
        type: row.type,
        payload: (row.payload ?? {}) as Record<string, unknown>,
        at: row.at.getTime(),
        undoneBySeq: row.undoneBySeq,
      }));
    }),
});

export { formationRouter };
