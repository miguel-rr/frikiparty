import { TRPCError } from '@trpc/server';
import { and, asc, eq } from 'drizzle-orm';
import { z } from 'zod';

import { playerProcedure } from '@/server/api/player-procedure';
import { getPlayerForUser } from '@/server/api/routers/player';
import { createTRPCRouter, protectedProcedure } from '@/server/api/trpc';
import {
  tournament,
  tournamentRankingSnapshot,
  tournamentVote,
} from '@/server/db/schema';
import { actorFromSession, runTournamentTx } from '@/server/live/tx';

/**
 * The personal ranking each participant sends while the vote is open.
 * Sealed on submit and private from everyone: this router never returns
 * a ballot's order once it's stored — only whether it was sent.
 */
const voteRouter = createTRPCRouter({
  /**
   * Where the signed-in person stands: not a participant (null), or their
   * status plus the historical order the ballot opens with.
   */
  mine: protectedProcedure
    .input(z.object({ tournamentId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const me = await getPlayerForUser(ctx.db, ctx.session.user.id);
      if (!me) return null;
      const roster = await ctx.db
        .select({
          id: tournamentRankingSnapshot.playerId,
          position: tournamentRankingSnapshot.position,
        })
        .from(tournamentRankingSnapshot)
        .where(eq(tournamentRankingSnapshot.tournamentId, input.tournamentId))
        .orderBy(asc(tournamentRankingSnapshot.position));
      if (!roster.some((row) => row.id === me.id)) return null;
      const [vote] = await ctx.db
        .select({ submittedAt: tournamentVote.submittedAt })
        .from(tournamentVote)
        .where(
          and(
            eq(tournamentVote.tournamentId, input.tournamentId),
            eq(tournamentVote.voterPlayerId, me.id),
          ),
        );
      return {
        playerId: me.id,
        submittedAt: vote?.submittedAt ?? null,
        initialOrder: roster.map((row) => row.id).filter((id) => id !== me.id),
      };
    }),

  submit: playerProcedure
    .input(
      z.object({
        tournamentId: z.string().uuid(),
        order: z.array(z.string().uuid()).min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select({ stage: tournament.stage })
        .from(tournament)
        .where(eq(tournament.id, input.tournamentId));
      if (row?.stage !== 'voting') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'La votación no está abierta.',
        });
      }
      const roster = new Set(
        (
          await ctx.db
            .select({ id: tournamentRankingSnapshot.playerId })
            .from(tournamentRankingSnapshot)
            .where(
              eq(tournamentRankingSnapshot.tournamentId, input.tournamentId),
            )
        ).map((entry) => entry.id),
      );
      if (!roster.has(ctx.player.id)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'No participas en este torneo.',
        });
      }
      // Exactly every other participant, once each.
      const expected = new Set(
        [...roster].filter((id) => id !== ctx.player.id),
      );
      const given = new Set(input.order);
      if (
        given.size !== input.order.length ||
        given.size !== expected.size ||
        [...given].some((id) => !expected.has(id))
      ) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'La papeleta debe ordenar a todos los demás participantes.',
        });
      }
      await runTournamentTx(
        ctx.db,
        input.tournamentId,
        actorFromSession(ctx.session),
        async ({ tx, emit }) => {
          const inserted = await tx
            .insert(tournamentVote)
            .values({
              tournamentId: input.tournamentId,
              voterPlayerId: ctx.player.id,
              order: input.order,
            })
            .onConflictDoNothing()
            .returning({ id: tournamentVote.id });
          if (inserted.length === 0) {
            throw new TRPCError({
              code: 'CONFLICT',
              message: 'Tu voto ya estaba sellado.',
            });
          }
          // The event records who voted, never what: the order stays in
          // the vote table alone.
          await emit({
            stream: 'admin',
            type: 'vote_submitted',
            payload: { playerId: ctx.player.id },
          });
        },
      );
      return { ok: true };
    }),
});

export { voteRouter };
