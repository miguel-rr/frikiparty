import { sql } from 'drizzle-orm';
import { check, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { user } from '@/server/db/schema/auth';
import { createTable } from '@/server/db/schema/create-table';
import { edition } from '@/server/db/schema/edition';
import { media } from '@/server/db/schema/media';
import { player } from '@/server/db/schema/player';

/**
 * Likes and comments share one target shape: exactly one of media,
 * edition or player, as real per-column FKs (the media_association
 * pattern). Only media has UI for now; the other two are ready for later.
 * Targets cascade, so removing a file takes its likes and comments along.
 */
const socialTarget = () => ({
  mediaId: uuid('media_id').references(() => media.id, { onDelete: 'cascade' }),
  editionId: uuid('edition_id').references(() => edition.id, {
    onDelete: 'cascade',
  }),
  playerId: uuid('player_id').references(() => player.id, {
    onDelete: 'cascade',
  }),
});

const singleTarget = (
  name: string,
  table: { mediaId: unknown; editionId: unknown; playerId: unknown },
) =>
  check(
    name,
    sql`num_nonnulls(${table.mediaId}, ${table.editionId}, ${table.playerId}) = 1`,
  );

/** One "me gusta" per person and target. */
const like = createTable(
  'like',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    ...socialTarget(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    singleTarget('like_single_target', table),
    // Partial unique indexes: one per target column, ignoring the nulls
    // of the other two (a plain composite unique would treat nulls as
    // distinct and let duplicates through).
    uniqueIndex('like_user_media_unique')
      .on(table.userId, table.mediaId)
      .where(sql`${table.mediaId} IS NOT NULL`),
    uniqueIndex('like_user_edition_unique')
      .on(table.userId, table.editionId)
      .where(sql`${table.editionId} IS NOT NULL`),
    uniqueIndex('like_user_player_unique')
      .on(table.userId, table.playerId)
      .where(sql`${table.playerId} IS NOT NULL`),
  ],
);

/**
 * Flat comments, plain text with line breaks. Mentions live inside the
 * body as `@[Name](slug)` tokens, rendered as links to the player's page
 * without any lookup (see src/lib/social/mentions.ts).
 */
const comment = createTable(
  'comment',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    ...socialTarget(),
    body: text('body').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    // Set on every edit by the author; the UI shows "editado".
    editedAt: timestamp('edited_at'),
  },
  (table) => [singleTarget('comment_single_target', table)],
);

export { comment, like };
