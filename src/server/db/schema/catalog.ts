import {
  boolean,
  integer,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';

import { createTable } from '@/server/db/schema/create-table';

/** Official games (AotR, BotME) plus a growing list of non-official ones. */
const game = createTable('game', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  isOfficial: boolean('is_official').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

const gameVersion = createTable(
  'game_version',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    gameId: uuid('game_id')
      .notNull()
      .references(() => game.id),
    version: text('version').notNull(),
    // Chronological order — version strings like "1.06" vs "1.10" don't sort correctly as text.
    releaseOrder: integer('release_order').notNull(),
  },
  (table) => [unique().on(table.gameId, table.version)],
);

/**
 * A faction's availability for a given tournament is derived by comparing
 * `introducedInVersion`/`removedInVersion` release order against the
 * tournament's own game version — there's no per-tournament roster table.
 */
const faction = createTable('faction', {
  id: uuid('id').primaryKey().defaultRandom(),
  introducedInVersionId: uuid('introduced_in_version_id')
    .notNull()
    .references(() => gameVersion.id),
  removedInVersionId: uuid('removed_in_version_id').references(
    () => gameVersion.id,
  ),
  name: text('name').notNull(),
});

/** Free-form tag catalog, scoped to media for now. Grows as users type new tags. */
const tag = createTable('tag', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export { faction, game, gameVersion, tag };
