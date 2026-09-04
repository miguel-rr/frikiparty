import { TRPCError } from '@trpc/server';
import { and, asc, desc, eq, inArray, or, sql } from 'drizzle-orm';
import { z } from 'zod';

import {
  isPlayerId,
  mentionedRefs,
  mentionToken,
  rewriteMentions,
} from '@/lib/social/mentions';
import { cardSpecFor } from '@/lib/tournament/card-lore';
import { archiveProcedure } from '@/server/api/archive-procedure';
import { createTRPCRouter, type TRPCContext } from '@/server/api/trpc';
import {
  comment,
  edition,
  like,
  media,
  player,
  user,
} from '@/server/db/schema';

/**
 * Likes and comments on a file, an edition or a player. Only files have
 * UI today; the other two targets are accepted so the model is ready.
 * Everything here sits behind the archive rule (see archiveProcedure).
 */

const targetSchema = z.union([
  z.object({ mediaId: z.string().uuid() }),
  z.object({ editionId: z.string().uuid() }),
  z.object({ playerId: z.string().uuid() }),
]);

type Target = z.infer<typeof targetSchema>;

/** The three nullable columns a like or comment row carries. */
const targetColumns = (target: Target) => ({
  mediaId: 'mediaId' in target ? target.mediaId : null,
  editionId: 'editionId' in target ? target.editionId : null,
  playerId: 'playerId' in target ? target.playerId : null,
});

/** WHERE for one target on either table (same column names on both). */
const targetWhere = (table: typeof like | typeof comment, target: Target) =>
  'mediaId' in target
    ? eq(table.mediaId, target.mediaId)
    : 'editionId' in target
      ? eq(table.editionId, target.editionId)
      : eq(table.playerId, target.playerId);

const assertTargetExists = async (db: TRPCContext['db'], target: Target) => {
  const [row] =
    'mediaId' in target
      ? await db
          .select({ id: media.id })
          .from(media)
          .where(eq(media.id, target.mediaId))
      : 'editionId' in target
        ? await db
            .select({ id: edition.id })
            .from(edition)
            .where(eq(edition.id, target.editionId))
        : await db
            .select({ id: player.id })
            .from(player)
            .where(eq(player.id, target.playerId));
  if (!row) {
    throw new TRPCError({ code: 'NOT_FOUND' });
  }
};

/**
 * Who did it, as the site shows people: the claimed player with their
 * painted portrait when the account has one, otherwise the account name
 * with no portrait (the UI draws an anonymous medallion).
 */
type Author = {
  userId: string;
  name: string;
  slug: string | null;
  portrait: string | null;
};

type AuthorRow = {
  user_id: string;
  user_name: string;
  player_name: string | null;
  player_slug: string | null;
  card_portrait: string | null;
};

const toAuthor = (row: AuthorRow): Author =>
  row.player_name && row.player_slug
    ? {
        userId: row.user_id,
        name: row.player_name,
        slug: row.player_slug,
        portrait: cardSpecFor({
          name: row.player_name,
          rings: 0,
          cardPortrait: row.card_portrait,
        }).portrait,
      }
    : { userId: row.user_id, name: row.user_name, slug: null, portrait: null };

const authorSelect = {
  user_id: user.id,
  user_name: user.name,
  player_name: player.name,
  player_slug: player.slug,
  card_portrait: player.cardPortrait,
};

const bodySchema = z.string().trim().min(1).max(2000);

/**
 * The players behind a set of mention refs (ids, or slugs from older
 * bodies and from bodies being edited), keyed by whichever ref named them.
 */
const loadMentioned = async (db: TRPCContext['db'], refs: string[]) => {
  const found = new Map<string, { id: string; name: string; slug: string }>();
  if (refs.length === 0) {
    return found;
  }
  const ids = refs.filter(isPlayerId);
  const slugs = refs.filter((ref) => !isPlayerId(ref));
  const conditions = [
    ...(ids.length > 0 ? [inArray(player.id, ids)] : []),
    ...(slugs.length > 0 ? [inArray(player.slug, slugs)] : []),
  ];
  const rows = await db
    .select({ id: player.id, name: player.name, slug: player.slug })
    .from(player)
    .where(conditions.length === 1 ? conditions[0] : or(...conditions));
  for (const row of rows) {
    found.set(row.id, row);
    found.set(row.slug, row);
  }
  return found;
};

/**
 * What gets stored: every mention pinned to the player's id, so renames
 * can't strand it; mentions of nobody become plain `@Nombre` text.
 */
const sanitizeBody = async (db: TRPCContext['db'], body: string) => {
  const known = await loadMentioned(db, mentionedRefs(body));
  return rewriteMentions(body, (ref) => {
    const found = known.get(ref);
    return found ? mentionToken(found.name, found.id) : null;
  });
};

/**
 * What gets shown: every mention carrying the player's current name and
 * page slug, whatever the body was saved with.
 */
const resolveMentions = async (db: TRPCContext['db'], bodies: string[]) => {
  const known = await loadMentioned(
    db,
    Array.from(new Set(bodies.flatMap(mentionedRefs))),
  );
  return bodies.map((body) =>
    rewriteMentions(body, (ref) => {
      const found = known.get(ref);
      return found ? mentionToken(found.name, found.slug) : null;
    }),
  );
};

const loadOwnComment = async (
  ctx: {
    db: TRPCContext['db'];
    session: { user: { id: string; role: string } };
  },
  id: string,
  { adminMayToo }: { adminMayToo: boolean },
) => {
  const [row] = await ctx.db.select().from(comment).where(eq(comment.id, id));
  if (!row) {
    throw new TRPCError({ code: 'NOT_FOUND' });
  }
  const isAdmin = ctx.session.user.role === 'admin';
  if (row.userId !== ctx.session.user.id && !(adminMayToo && isAdmin)) {
    throw new TRPCError({ code: 'FORBIDDEN' });
  }
  return row;
};

const socialRouter = createTRPCRouter({
  /** Puts or takes back the viewer's like; returns the new state and count. */
  toggleLike: archiveProcedure
    .input(targetSchema)
    .mutation(async ({ ctx, input }) => {
      await assertTargetExists(ctx.db, input);
      const userId = ctx.session.user.id;
      const liked = await ctx.db.transaction(async (tx) => {
        const removed = await tx
          .delete(like)
          .where(and(eq(like.userId, userId), targetWhere(like, input)))
          .returning({ id: like.id });
        if (removed.length > 0) {
          return false;
        }
        await tx.insert(like).values({ userId, ...targetColumns(input) });
        return true;
      });
      const [row] = await ctx.db
        .select({ count: sql<number>`count(*)::int` })
        .from(like)
        .where(targetWhere(like, input));
      return { liked, count: row?.count ?? 0 };
    }),

  /** Who has liked it, newest first. */
  likers: archiveProcedure.input(targetSchema).query(async ({ ctx, input }) => {
    const rows = await ctx.db
      .select(authorSelect)
      .from(like)
      .innerJoin(user, eq(user.id, like.userId))
      .leftJoin(player, eq(player.userId, user.id))
      .where(targetWhere(like, input))
      .orderBy(desc(like.createdAt));
    return rows.map(toAuthor);
  }),

  /** The whole thread, oldest first. */
  comments: archiveProcedure
    .input(targetSchema)
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db
        .select({
          id: comment.id,
          body: comment.body,
          createdAt: comment.createdAt,
          editedAt: comment.editedAt,
          ...authorSelect,
        })
        .from(comment)
        .innerJoin(user, eq(user.id, comment.userId))
        .leftJoin(player, eq(player.userId, user.id))
        .where(targetWhere(comment, input))
        .orderBy(asc(comment.createdAt));
      const bodies = await resolveMentions(
        ctx.db,
        rows.map((row) => row.body),
      );
      return rows.map((row, index) => ({
        id: row.id,
        body: bodies[index] ?? row.body,
        createdAt: row.createdAt.toISOString(),
        editedAt: row.editedAt?.toISOString() ?? null,
        author: toAuthor(row),
      }));
    }),

  addComment: archiveProcedure
    .input(z.object({ target: targetSchema, body: bodySchema }))
    .mutation(async ({ ctx, input }) => {
      await assertTargetExists(ctx.db, input.target);
      const [row] = await ctx.db
        .insert(comment)
        .values({
          userId: ctx.session.user.id,
          body: await sanitizeBody(ctx.db, input.body),
          ...targetColumns(input.target),
        })
        .returning({ id: comment.id });
      return { id: row?.id ?? null };
    }),

  /** The author only; marks the comment as edited. */
  editComment: archiveProcedure
    .input(z.object({ id: z.string().uuid(), body: bodySchema }))
    .mutation(async ({ ctx, input }) => {
      await loadOwnComment(ctx, input.id, { adminMayToo: false });
      await ctx.db
        .update(comment)
        .set({
          body: await sanitizeBody(ctx.db, input.body),
          editedAt: new Date(),
        })
        .where(eq(comment.id, input.id));
      return { id: input.id };
    }),

  /** The author or an admin. */
  removeComment: archiveProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await loadOwnComment(ctx, input.id, { adminMayToo: true });
      await ctx.db.delete(comment).where(eq(comment.id, input.id));
      return { id: input.id };
    }),
});

export { type Author, socialRouter };
