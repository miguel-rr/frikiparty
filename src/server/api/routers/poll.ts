import { TRPCError } from '@trpc/server';
import { and, asc, count, eq, inArray } from 'drizzle-orm';
import { z } from 'zod';

import { quorumFor, resultsVisible } from '@/lib/polls/rules';
import { getPlayerForUser } from '@/server/api/routers/player';
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
  type TRPCContext,
} from '@/server/api/trpc';
import { editionPlayer, poll, pollVote } from '@/server/db/schema';

/** Is this user's player confirmed for the edition? */
const isConfirmed = async (
  db: TRPCContext['db'],
  userId: string,
  editionId: string,
) => {
  const me = await getPlayerForUser(db, userId);
  if (!me) return false;
  const [row] = await db
    .select({ id: editionPlayer.id })
    .from(editionPlayer)
    .where(
      and(
        eq(editionPlayer.editionId, editionId),
        eq(editionPlayer.playerId, me.id),
      ),
    );
  return Boolean(row);
};

/**
 * A polls page as the viewer may see it: questions, options, turnout and
 * the quorum, the viewer's own votes, and the results only where the
 * rules allow (see src/lib/polls/rules). Who voted what never leaves.
 */
const loadPollPage = async (
  db: TRPCContext['db'],
  page: string,
  userId: string | null,
) => {
  const polls = await db
    .select()
    .from(poll)
    .where(eq(poll.page, page))
    .orderBy(asc(poll.position));
  if (polls.length === 0) return null;
  const ids = polls.map((row) => row.id);
  const editionIds = [...new Set(polls.map((row) => row.editionId))];
  const [tallies, eligibleRows, mine] = await Promise.all([
    db
      .select({
        pollId: pollVote.pollId,
        optionKey: pollVote.optionKey,
        votes: count(),
      })
      .from(pollVote)
      .where(inArray(pollVote.pollId, ids))
      .groupBy(pollVote.pollId, pollVote.optionKey),
    db
      .select({ editionId: editionPlayer.editionId, players: count() })
      .from(editionPlayer)
      .where(inArray(editionPlayer.editionId, editionIds))
      .groupBy(editionPlayer.editionId),
    userId
      ? db
          .select({ pollId: pollVote.pollId, optionKey: pollVote.optionKey })
          .from(pollVote)
          .where(
            and(inArray(pollVote.pollId, ids), eq(pollVote.userId, userId)),
          )
      : Promise.resolve([]),
  ]);
  const eligibleBy = new Map(
    eligibleRows.map((row) => [row.editionId, row.players]),
  );
  const myVote = new Map(mine.map((row) => [row.pollId, row.optionKey]));
  const canVote = userId
    ? await isConfirmed(db, userId, polls[0]?.editionId ?? '')
    : false;
  const now = Date.now();
  return {
    signedIn: userId !== null,
    canVote,
    polls: polls.map((row) => {
      const counts = new Map(
        tallies
          .filter((tally) => tally.pollId === row.id)
          .map((tally) => [tally.optionKey, tally.votes]),
      );
      const votes = [...counts.values()].reduce((sum, n) => sum + n, 0);
      const eligible = eligibleBy.get(row.editionId) ?? 0;
      const quorum = quorumFor(eligible);
      const closed = row.closesAt.getTime() <= now;
      const mineKey = myVote.get(row.id) ?? null;
      const visible = resultsVisible({
        closed,
        votes,
        quorum,
        hasVoted: mineKey !== null,
      });
      return {
        id: row.id,
        slug: row.slug,
        question: row.question,
        options: row.options,
        closesAt: row.closesAt,
        closed,
        eligible,
        quorum,
        votes,
        myVote: mineKey,
        results: visible
          ? row.options.map((option) => ({
              key: option.key,
              votes: counts.get(option.key) ?? 0,
            }))
          : null,
      };
    }),
  };
};

const pollRouter = createTRPCRouter({
  page: publicProcedure
    .input(z.object({ page: z.string().min(1).max(80) }))
    .query(({ ctx, input }) =>
      loadPollPage(ctx.db, input.page, ctx.session?.user.id ?? null),
    ),

  /** Casts or changes the viewer's vote while the poll is open. */
  vote: protectedProcedure
    .input(
      z.object({
        pollId: z.string().uuid(),
        optionKey: z.string().min(1).max(40),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select()
        .from(poll)
        .where(eq(poll.id, input.pollId));
      if (!row) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'No existe.' });
      }
      if (row.closesAt.getTime() <= Date.now()) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'La votación ya está cerrada.',
        });
      }
      if (!row.options.some((option) => option.key === input.optionKey)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Opción no válida.',
        });
      }
      const userId = ctx.session.user.id;
      if (!(await isConfirmed(ctx.db, userId, row.editionId))) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Solo votan los confirmados para esta edición.',
        });
      }
      await ctx.db
        .insert(pollVote)
        .values({ pollId: row.id, userId, optionKey: input.optionKey })
        .onConflictDoUpdate({
          target: [pollVote.pollId, pollVote.userId],
          set: { optionKey: input.optionKey, updatedAt: new Date() },
        });
      return { ok: true };
    }),
});

type PollPage = NonNullable<Awaited<ReturnType<typeof loadPollPage>>>;

export { type PollPage, pollRouter };
