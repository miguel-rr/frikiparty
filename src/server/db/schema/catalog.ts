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
  // Stable key into the presentation catalogue (emblems, colours) in
  // src/lib/tournament/factions.ts; null for games without one.
  code: text('code').unique(),
  sortOrder: integer('sort_order').notNull().default(0),
});

/**
 * Maps a game is played on. Grows as organisers type new names (same
 * pattern as `tag`); can be pre-seeded when a list is available.
 */
const gameMap = createTable(
  'game_map',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    gameId: uuid('game_id')
      .notNull()
      .references(() => game.id),
    name: text('name').notNull(),
    // Player slots the map is built for, when known (2, 4, 6, 8…).
    players: integer('players'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [unique().on(table.gameId, table.name)],
);

/** Free-form tag catalog, scoped to media for now. Grows as users type new tags. */
const tag = createTable('tag', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export { faction, game, gameMap, gameVersion, tag };
