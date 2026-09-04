import {
  integer,
  jsonb,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';

import { user } from '@/server/db/schema/auth';
import { createTable } from '@/server/db/schema/create-table';
import { tournament } from '@/server/db/schema/tournament';

/**
 * The live module's source of truth: everything that happens during a
 * tournament run through the app, as an append-only sequence with the
 * real time of each fact (see .claude/live-tournament-plan.md §5.3).
 *
 * Bids, picks, timer resolutions, faction draws, results and admin actions
 * all land here in the same transaction as the tables that project them
 * (auction_bid, draft_pick, match_game…). Nothing is ever deleted: an undo
 * marks the undone row via `undoneBySeq` and appends its own `undo` event,
 * so a replay shows things being undone exactly as they were.
 *
 * `at` is the moment the fact happened, not when the server noticed it —
 * lazily resolved timers store their deadline, so replays keep the
 * original pacing.
 */
const tournamentEvent = createTable(
  'tournament_event',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tournamentId: uuid('tournament_id')
      .notNull()
      .references(() => tournament.id, { onDelete: 'cascade' }),
    stream: text('stream').notNull().$type<EventStream>(),
    // Strictly increasing per tournament, across every stream.
    seq: integer('seq').notNull(),
    type: text('type').notNull(),
    payload: jsonb('payload').notNull().default({}),
    at: timestamp('at').notNull(),
    actorUserId: text('actor_user_id').references(() => user.id),
    impersonatedByUserId: text('impersonated_by_user_id'),
    undoneBySeq: integer('undone_by_seq'),
  },
  (table) => [unique().on(table.tournamentId, table.seq)],
);

type EventStream = 'auction' | 'draft' | 'match' | 'admin';

/**
 * The draft/auction in progress, as the engine's own state object. A
 * projection of tournament_event up to `lastSeq` — rebuildable from the
 * log if it were ever lost — kept so every read is one row.
 *
 * `version` guards concurrent writes (UPDATE … WHERE version = $v);
 * `deadlineAt` is the next timer to resolve, lazily, by whichever
 * request first sees it expired. Pausing stores the remaining time.
 */
const liveRoom = createTable(
  'live_room',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tournamentId: uuid('tournament_id')
      .notNull()
      .references(() => tournament.id, { onDelete: 'cascade' }),
    kind: text('kind').notNull().$type<'draft' | 'auction'>(),
    state: jsonb('state').notNull(),
    version: integer('version').notNull().default(0),
    lastSeq: integer('last_seq').notNull().default(0),
    deadlineAt: timestamp('deadline_at'),
    pausedRemainingMs: integer('paused_remaining_ms'),
    status: text('status')
      .notNull()
      .default('open')
      .$type<'open' | 'paused' | 'closed'>(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [unique().on(table.tournamentId, table.kind)],
);

/**
 * One counter per tournament, bumped by every write the live views care
 * about (stage, participants, pots, teams, phases, matches, games). The
 * change subscription polls this row and only pushes when it moves.
 */
const liveVersion = createTable('live_version', {
  tournamentId: uuid('tournament_id')
    .primaryKey()
    .references(() => tournament.id, { onDelete: 'cascade' }),
  version: integer('version').notNull().default(0),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export { type EventStream, liveRoom, liveVersion, tournamentEvent };
