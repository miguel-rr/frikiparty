import { integer, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';

import { createTable } from '@/server/db/schema/create-table';
import { tournament } from '@/server/db/schema/tournament';

/**
 * The tournament's phase count isn't stored — it's just how many rows
 * reference it. A `'swiss'` tournament always has exactly one phase row
 * (there's only one continuous stage, not distinct group/bracket etapas) —
 * its rounds live in `match.roundIndex`, not in separate phase rows.
 */
const phase = createTable(
  'phase',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tournamentId: uuid('tournament_id')
      .notNull()
      .references(() => tournament.id),
    phaseOrder: integer('phase_order').notNull(),
    type: text('type').notNull().$type<'group' | 'bracket' | 'swiss'>(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [unique().on(table.tournamentId, table.phaseOrder)],
);

const phaseGroupConfig = createTable('phase_group_config', {
  id: uuid('id').primaryKey().defaultRandom(),
  phaseId: uuid('phase_id')
    .notNull()
    .unique()
    .references(() => phase.id),
  roundsFormat: text('rounds_format').notNull().$type<'single' | 'double'>(),
  gamesToWinMatch: integer('games_to_win_match').notNull(),
  tiebreakMethod: text('tiebreak_method')
    .notNull()
    .$type<'ranking_inverse' | 'rings_inverse'>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

const phaseBracketRoundConfig = createTable(
  'phase_bracket_round_config',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    phaseId: uuid('phase_id')
      .notNull()
      .references(() => phase.id),
    // Same numbering as match.roundIndex (0 = play-in, 1 = main-bracket round 1…).
    roundIndex: integer('round_index').notNull(),
    gamesToWinMatch: integer('games_to_win_match').notNull(),
  },
  (table) => [unique().on(table.phaseId, table.roundIndex)],
);

export { phase, phaseBracketRoundConfig, phaseGroupConfig };
