import {
  boolean,
  integer,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { game, gameVersion } from '@/server/db/schema/catalog';
import { createTable } from '@/server/db/schema/create-table';
import { edition } from '@/server/db/schema/edition';
import { player } from '@/server/db/schema/player';

/**
 * `hasDetailedRecord` isn't a column — whether a tournament has full
 * phase/match tracking (vs. a historical import that only records the
 * winning team) is derived from whether it has any `phase` rows.
 */
const tournament = createTable('tournament', {
  id: uuid('id').primaryKey().defaultRandom(),
  editionId: uuid('edition_id')
    .notNull()
    .references(() => edition.id),
  // Nullable: for historical imports we may know it was an official
  // tournament without knowing whether it was AotR or BotME. The app layer
  // shows "AotR/BotME" in that case instead of guessing.
  gameId: uuid('game_id').references(() => game.id),
  // Independent of game.isOfficial: a torneo can play AotR/BotME "unofficially".
  isOfficial: boolean('is_official').notNull(),
  gameVersionId: uuid('game_version_id').references(() => gameVersion.id),
  model: text('model').$type<'classic' | 'swiss'>(),
  // Only populated when isOfficial + a votación/combinado ranking source was used.
  teamRankingSnapshot: uuid('team_ranking_snapshot').array(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

const tournamentSwissConfig = createTable('tournament_swiss_config', {
  id: uuid('id').primaryKey().defaultRandom(),
  tournamentId: uuid('tournament_id')
    .notNull()
    .unique()
    .references(() => tournament.id),
  eliminationLosses: integer('elimination_losses').notNull(),
  pairingMethod: text('pairing_method')
    .notNull()
    .$type<'random' | 'ranking_parity' | 'ranking_seed'>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

const tournamentRankingSnapshot = createTable(
  'tournament_ranking_snapshot',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tournamentId: uuid('tournament_id')
      .notNull()
      .references(() => tournament.id),
    playerId: uuid('player_id')
      .notNull()
      .references(() => player.id),
    position: integer('position').notNull(),
    rings: integer('rings').notNull(),
    individualRings: integer('individual_rings').notNull(),
    editionsPlayed: integer('editions_played').notNull(),
  },
  (table) => [
    unique().on(table.tournamentId, table.playerId),
    unique().on(table.tournamentId, table.position),
  ],
);

export { tournament, tournamentRankingSnapshot, tournamentSwissConfig };
