import {
  boolean,
  integer,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import {
  type FormationMethod,
  type RankingSource,
  TOURNAMENT_STAGES,
  type TournamentKind,
  type TournamentStage,
} from '@/lib/tournament/stages';
import { user } from '@/server/db/schema/auth';
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
  // The ordered ranking actually used to build teams whenever it differs
  // from the historical one: votación/combinado results, or a hand-adjusted
  // order after manual tie-breaks.
  teamRankingSnapshot: uuid('team_ranking_snapshot').array(),
  // ---- Live module (see .claude/live-tournament-plan.md) ----
  // Individual = teams of one. Null only on historical imports.
  kind: text('kind').$type<TournamentKind>(),
  // Where the live flow stands; null for historical imports (they were
  // never run through the app). See TOURNAMENT_STAGES for the order.
  stage: text('stage').$type<TournamentStage>(),
  stageChangedAt: timestamp('stage_changed_at'),
  // Max players per team = number of pots; fixes the team count as
  // ceil(participants / teamSize). Null for historical imports.
  teamSize: integer('team_size'),
  rankingSource: text('ranking_source').$type<RankingSource>(),
  // Only for rankingSource = 'combined'.
  historicalWeightPercent: integer('historical_weight_percent'),
  formationMethod: text('formation_method').$type<FormationMethod>(),
  // Which pot the captains come from (0 = cabezas de serie).
  captainPotIndex: integer('captain_pot_index').notNull().default(0),
  createdByUserId: text('created_by_user_id').references(() => user.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/**
 * A participant's personal ranking of every other participant, best
 * first. Sealed on submit: no updatedAt, no edits. Never returned by any
 * procedure outside the non-production debug viewer — votes are private
 * from everyone, admins included.
 */
const tournamentVote = createTable(
  'tournament_vote',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tournamentId: uuid('tournament_id')
      .notNull()
      .references(() => tournament.id, { onDelete: 'cascade' }),
    voterPlayerId: uuid('voter_player_id')
      .notNull()
      .references(() => player.id),
    order: uuid('order').array().notNull(),
    submittedAt: timestamp('submitted_at').defaultNow().notNull(),
  },
  (table) => [unique().on(table.tournamentId, table.voterPlayerId)],
);

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
  },
  (table) => [
    unique().on(table.tournamentId, table.playerId),
    unique().on(table.tournamentId, table.position),
  ],
);

export {
  type FormationMethod,
  type RankingSource,
  TOURNAMENT_STAGES,
  type TournamentKind,
  type TournamentStage,
  tournament,
  tournamentRankingSnapshot,
  tournamentSwissConfig,
  tournamentVote,
};
