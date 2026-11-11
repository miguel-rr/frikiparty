import { TRPCError } from '@trpc/server';
import { and, asc, count, eq, inArray } from 'drizzle-orm';
import { z } from 'zod';

import { pollPhase, quorumFor, resultsVisible } from '@/lib/polls/rules';
import { getPlayerForUser } from '@/server/api/routers/player';
import {
  adminProcedure,
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
    .where(and(eq(poll.page, page), eq(poll.visible, true)))
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
      const phase = pollPhase({ ...row, now });
      const closed = phase === 'closed';
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
        opensAt: row.opensAt,
        closesAt: row.closesAt,
        phase,
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
      const phase = pollPhase({ ...row, now: Date.now() });
      if (phase !== 'open') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message:
            phase === 'closed'
              ? 'La votación ya está cerrada.'
              : 'La votación aún no se ha abierto.',
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

/** Every poll with its settings and turnout; never who voted what. */
const loadAdminPolls = async (db: TRPCContext['db']) => {
  const [polls, turnout, eligibleRows] = await Promise.all([
    db.select().from(poll).orderBy(asc(poll.page), asc(poll.position)),
    db
      .select({ pollId: pollVote.pollId, votes: count() })
      .from(pollVote)
      .groupBy(pollVote.pollId),
    db
      .select({ editionId: editionPlayer.editionId, players: count() })
      .from(editionPlayer)
      .groupBy(editionPlayer.editionId),
  ]);
  const votesBy = new Map(turnout.map((row) => [row.pollId, row.votes]));
  const eligibleBy = new Map(
    eligibleRows.map((row) => [row.editionId, row.players]),
  );
  const now = Date.now();
  return polls.map((row) => {
    const eligible = eligibleBy.get(row.editionId) ?? 0;
    return {
      id: row.id,
      page: row.page,
      question: row.question,
      options: row.options,
      visible: row.visible,
      votingOpen: row.votingOpen,
      opensAt: row.opensAt,
      closesAt: row.closesAt,
      phase: pollPhase({ ...row, now }),
      votes: votesBy.get(row.id) ?? 0,
      eligible,
      quorum: quorumFor(eligible),
    };
  });
};

const pollVotes = async (db: TRPCContext['db'], pollId: string) => {
  const [row] = await db
    .select({ votes: count() })
    .from(pollVote)
    .where(eq(pollVote.pollId, pollId));
  return row?.votes ?? 0;
};

const pollAdminRouter = createTRPCRouter({
  list: adminProcedure.query(({ ctx }) => loadAdminPolls(ctx.db)),

  /** Visibility, opening and closing; `null` clears a time. */
  update: adminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        visible: z.boolean().optional(),
        votingOpen: z.boolean().optional(),
        opensAt: z.date().nullable().optional(),
        closesAt: z.date().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...changes } = input;
      // Pausing also drops an opening time already passed, or it would
      // keep the poll open.
      const pausing =
        changes.votingOpen === false && changes.opensAt === undefined;
      await ctx.db
        .update(poll)
        .set(pausing ? { ...changes, opensAt: null } : changes)
        .where(eq(poll.id, id));
      return { ok: true };
    }),

  closeNow: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(poll)
        .set({ closesAt: new Date() })
        .where(eq(poll.id, input.id));
      return { ok: true };
    }),

  /** The wording, only while nobody has voted: a vote is for a text. */
  editText: adminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        question: z.string().trim().min(1).max(300),
        labels: z.record(z.string(), z.string().trim().min(1).max(120)),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select()
        .from(poll)
        .where(eq(poll.id, input.id));
      if (!row) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'No existe.' });
      }
      if ((await pollVotes(ctx.db, row.id)) > 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Ya hay votos: el texto no se puede cambiar.',
        });
      }
      await ctx.db
        .update(poll)
        .set({
          question: input.question,
          options: row.options.map((option) => ({
            key: option.key,
            label: input.labels[option.key] ?? option.label,
          })),
        })
        .where(eq(poll.id, row.id));
      return { ok: true };
    }),
});

type PollPage = NonNullable<Awaited<ReturnType<typeof loadPollPage>>>;

type AdminPoll = Awaited<ReturnType<typeof loadAdminPolls>>[number];

export { type AdminPoll, type PollPage, pollAdminRouter, pollRouter };
