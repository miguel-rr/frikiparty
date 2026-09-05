import {
  type AnyPgColumn,
  boolean,
  integer,
  jsonb,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { user } from '@/server/db/schema/auth';
import { faction, gameMap } from '@/server/db/schema/catalog';
import { createTable } from '@/server/db/schema/create-table';
import { phase, phaseGroup } from '@/server/db/schema/phase';
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
    .references(() => phase.id, { onDelete: 'cascade' }),
  // Group phases with several groups; null elsewhere.
  groupId: uuid('group_id').references(() => phaseGroup.id),
  teamAId: uuid('team_a_id').references(() => team.id),
  teamBId: uuid('team_b_id').references(() => team.id),
  winnerTeamId: uuid('winner_team_id').references(() => team.id),
  status: text('status')
    .notNull()
    .default('scheduled')
    .$type<'scheduled' | 'in_progress' | 'completed'>(),
  playedAt: timestamp('played_at'),
  leg: integer('leg'),
  // Jornada in groups, round in swiss and bracket (0 = play-in).
  roundIndex: integer('round_index'),
  // Position within its jornada/round, for the calendar.
  order: integer('order'),
  isThirdPlace: boolean('is_third_place').notNull().default(false),
  // Extra match the admin generates to break a group tie.
  isTiebreak: boolean('is_tiebreak').notNull().default(false),
  // Swiss rounds with an odd count: the team that sits this one out. Such
  // a row has no teams and no result; it only records the bye.
  byeTeamId: uuid('bye_team_id').references(() => team.id),
  feederMatchAId: uuid('feeder_match_a_id').references(
    (): AnyPgColumn => match.id,
  ),
  feederMatchBId: uuid('feeder_match_b_id').references(
    (): AnyPgColumn => match.id,
  ),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

type MatchGameStatus =
  | 'pending'
  | 'awaiting_draw'
  | 'factions_drawn'
  | 'ready'
  | 'completed';

const matchGame = createTable('match_game', {
  id: uuid('id').primaryKey().defaultRandom(),
  matchId: uuid('match_id')
    .notNull()
    .references(() => match.id, { onDelete: 'cascade' }),
  winnerTeamId: uuid('winner_team_id').references(() => team.id),
  map: text('map'),
  mapId: uuid('map_id').references(() => gameMap.id),
  // Live flow: pending → (both captains ready) → factions_drawn → (both
  // confirmed their line-up) → ready → completed. Hand-entered results
  // jump straight to completed.
  status: text('status').notNull().default('pending').$type<MatchGameStatus>(),
  readyTeamAAt: timestamp('ready_team_a_at'),
  readyTeamBAt: timestamp('ready_team_b_at'),
  confirmedTeamAAt: timestamp('confirmed_team_a_at'),
  confirmedTeamBAt: timestamp('confirmed_team_b_at'),
  startedAt: timestamp('started_at'),
  // 1-based order within the match for hand-entered results ("ganaron la
  // primera"); live games can rely on playedAt instead, so it's nullable.
  gameNumber: integer('game_number'),
  // Determines order when present; nullable for hand-entered results without an exact time.
  playedAt: timestamp('played_at'),
});

/**
 * What the draw handed each team before the captain distributed it among
 * the players (that distribution is match_game_player_faction). Also the
 * source the depleting pool is derived from.
 */
const matchGameFactionDraw = createTable(
  'match_game_faction_draw',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    matchGameId: uuid('match_game_id')
      .notNull()
      .references(() => matchGame.id, { onDelete: 'cascade' }),
    teamId: uuid('team_id')
      .notNull()
      .references(() => team.id),
    factionId: uuid('faction_id')
      .notNull()
      .references(() => faction.id),
    drawOrder: integer('draw_order').notNull(),
  },
  (table) => [unique().on(table.matchGameId, table.teamId, table.factionId)],
);

const matchGamePlayerFaction = createTable(
  'match_game_player_faction',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    matchGameId: uuid('match_game_id')
      .notNull()
      .references(() => matchGame.id, { onDelete: 'cascade' }),
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
    .references(() => matchGame.id, { onDelete: 'cascade' }),
  url: text('url').notNull(),
  // The replay's original name, kept for the download.
  fileName: text('file_name'),
  fileSize: integer('file_size'),
  extractedMetadata: jsonb('extracted_metadata'),
  uploadedByUserId: text('uploaded_by_user_id').references(() => user.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export {
  type MatchGameStatus,
  match,
  matchGame,
  matchGameFactionDraw,
  matchGamePlayerFaction,
  matchGameSaveFile,
};
