import {
  boolean,
  integer,
  jsonb,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';

import {
  DEFAULT_TIEBREAK_CHAIN,
  GROUP_TIEBREAK_CRITERIA,
  type GroupTiebreakCriterion,
} from '@/lib/tournament/tiebreak';
import { createTable } from '@/server/db/schema/create-table';
import { team } from '@/server/db/schema/team';
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
      .references(() => tournament.id, { onDelete: 'cascade' }),
    phaseOrder: integer('phase_order').notNull(),
    type: text('type').notNull().$type<'group' | 'bracket' | 'swiss'>(),
    // Display name ("Fase de grupos", "Playoffs"); derived from type when null.
    name: text('name'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [unique().on(table.tournamentId, table.phaseOrder)],
);

const phaseGroupConfig = createTable('phase_group_config', {
  id: uuid('id').primaryKey().defaultRandom(),
  phaseId: uuid('phase_id')
    .notNull()
    .unique()
    .references(() => phase.id, { onDelete: 'cascade' }),
  roundsFormat: text('rounds_format').notNull().$type<'single' | 'double'>(),
  gamesToWinMatch: integer('games_to_win_match').notNull(),
  // Ordered list of active criteria; the standings show it as the rule.
  tiebreakChain: jsonb('tiebreak_chain')
    .$type<GroupTiebreakCriterion[]>()
    .notNull()
    .default(DEFAULT_TIEBREAK_CHAIN),
  // Usually 1; several groups are supported but rare.
  groupCount: integer('group_count').notNull().default(1),
  qualifiersPerGroup: integer('qualifiers_per_group').notNull().default(4),
  groupDistribution: text('group_distribution')
    .notNull()
    .default('random')
    .$type<'random' | 'manual'>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

const phaseGroup = createTable(
  'phase_group',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    phaseId: uuid('phase_id')
      .notNull()
      .references(() => phase.id, { onDelete: 'cascade' }),
    groupIndex: integer('group_index').notNull(),
    label: text('label').notNull(),
    // Ties the organiser settled by hand or by lot (plan §6.4): ordered
    // clusters of team ids, best first, fed to the standings as `manual`.
    tieResolutions: jsonb('tie_resolutions')
      .$type<string[][]>()
      .notNull()
      .default([]),
  },
  (table) => [unique().on(table.phaseId, table.groupIndex)],
);

const phaseGroupTeam = createTable(
  'phase_group_team',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    groupId: uuid('group_id')
      .notNull()
      .references(() => phaseGroup.id, { onDelete: 'cascade' }),
    teamId: uuid('team_id')
      .notNull()
      .references(() => team.id),
    seed: integer('seed').notNull(),
  },
  (table) => [unique().on(table.groupId, table.teamId)],
);

/**
 * Brackets never use byes: sizes that aren't a power of two open with a
 * play-in round (roundIndex 0) so every team can still qualify.
 */
const phaseBracketConfig = createTable('phase_bracket_config', {
  id: uuid('id').primaryKey().defaultRandom(),
  phaseId: uuid('phase_id')
    .notNull()
    .unique()
    .references(() => phase.id, { onDelete: 'cascade' }),
  hasThirdPlaceMatch: boolean('has_third_place_match').notNull().default(false),
  seedingSource: text('seeding_source')
    .notNull()
    .default('previous_phase')
    .$type<'previous_phase' | 'ranking' | 'manual'>(),
});

/**
 * How factions are drawn for games in this phase (only for games with a
 * faction catalogue). `depleting`: each team draws from a pool of every
 * faction that refills once it can't cover a full draw (live plan §6.8).
 */
const phaseFactionRules = createTable('phase_faction_rules', {
  id: uuid('id').primaryKey().defaultRandom(),
  phaseId: uuid('phase_id')
    .notNull()
    .unique()
    .references(() => phase.id, { onDelete: 'cascade' }),
  allowRepeatAcrossTeams: boolean('allow_repeat_across_teams')
    .notNull()
    .default(true),
  poolMode: text('pool_mode')
    .notNull()
    .default('fresh')
    .$type<'fresh' | 'depleting'>(),
  // With `depleting`: keep consuming the previous phase's pool instead of
  // starting this phase with every faction again.
  poolCarriesOver: boolean('pool_carries_over').notNull().default(false),
});

const phaseBracketRoundConfig = createTable(
  'phase_bracket_round_config',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    phaseId: uuid('phase_id')
      .notNull()
      .references(() => phase.id, { onDelete: 'cascade' }),
    // Same numbering as match.roundIndex (0 = play-in, 1 = main-bracket round 1…).
    roundIndex: integer('round_index').notNull(),
    gamesToWinMatch: integer('games_to_win_match').notNull(),
  },
  (table) => [unique().on(table.phaseId, table.roundIndex)],
);

export {
  DEFAULT_TIEBREAK_CHAIN,
  GROUP_TIEBREAK_CRITERIA,
  type GroupTiebreakCriterion,
  phase,
  phaseBracketConfig,
  phaseBracketRoundConfig,
  phaseFactionRules,
  phaseGroup,
  phaseGroupConfig,
  phaseGroupTeam,
};
