import {
  type AnyPgColumn,
  integer,
  jsonb,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { user } from '@/server/db/schema/auth';
import { faction } from '@/server/db/schema/catalog';
import { createTable } from '@/server/db/schema/create-table';
import { phase } from '@/server/db/schema/phase';
import { player } from '@/server/db/schema/player';
import { team } from '@/server/db/schema/team';

/**
 * Group-only (`leg`) and bracket/swiss-only (`roundIndex`, `feederMatch*Id`)
 * fields live inline here rather than in side tables, unlike the rest of the
 * model — `match` is high-volume and read constantly, so avoiding a join per
 * read wins over keeping nulls out of the base table.
 *
 * `roundIndex` means "bracket round" when the parent phase is `'bracket'`
 * and "swiss round number" when it's `'swiss'` — in the swiss case
 * `feederMatchAId`/`feederMatchBId` stay null, since pairings are
 * recalculated live from standings each round rather than following a fixed
 * bracket tree.
 *
 * The match score and bracket progression are never stored directly: the
 * score is derived by counting `match_game` wins against the phase's
 * `gamesToWinMatch`, and bracket progression is the table itself — closing a
 * match means finding whichever match references it as a feeder and filling
 * that slot with `winnerTeamId`.
 */
const match = createTable('match', {
  id: uuid('id').primaryKey().defaultRandom(),
  phaseId: uuid('phase_id')
    .notNull()
    .references(() => phase.id),
  teamAId: uuid('team_a_id').references(() => team.id),
  teamBId: uuid('team_b_id').references(() => team.id),
  winnerTeamId: uuid('winner_team_id').references(() => team.id),
  status: text('status')
    .notNull()
    .default('scheduled')
    .$type<'scheduled' | 'in_progress' | 'completed'>(),
  playedAt: timestamp('played_at'),
  leg: integer('leg'),
  roundIndex: integer('round_index'),
  feederMatchAId: uuid('feeder_match_a_id').references(
    (): AnyPgColumn => match.id,
  ),
  feederMatchBId: uuid('feeder_match_b_id').references(
    (): AnyPgColumn => match.id,
  ),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

const matchGame = createTable('match_game', {
  id: uuid('id').primaryKey().defaultRandom(),
  matchId: uuid('match_id')
    .notNull()
    .references(() => match.id),
  winnerTeamId: uuid('winner_team_id').references(() => team.id),
  map: text('map'),
  // Determines order when present; nullable for hand-entered results without an exact time.
  playedAt: timestamp('played_at'),
});

const matchGamePlayerFaction = createTable(
  'match_game_player_faction',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    matchGameId: uuid('match_game_id')
      .notNull()
      .references(() => matchGame.id),
    playerId: uuid('player_id')
      .notNull()
      .references(() => player.id),
    factionId: uuid('faction_id')
      .notNull()
      .references(() => faction.id),
  },
  (table) => [unique().on(table.matchGameId, table.playerId)],
);

const matchGameSaveFile = createTable('match_game_save_file', {
  id: uuid('id').primaryKey().defaultRandom(),
  matchGameId: uuid('match_game_id')
    .notNull()
    .references(() => matchGame.id),
  url: text('url').notNull(),
  fileSize: integer('file_size'),
  extractedMetadata: jsonb('extracted_metadata'),
  uploadedByUserId: text('uploaded_by_user_id').references(() => user.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export { match, matchGame, matchGamePlayerFaction, matchGameSaveFile };
