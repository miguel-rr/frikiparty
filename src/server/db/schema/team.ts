import {
  boolean,
  integer,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';

import { createTable } from '@/server/db/schema/create-table';
import { player } from '@/server/db/schema/player';
import { tournament } from '@/server/db/schema/tournament';

/** Teams don't persist between editions — they're born and die with their tournament. */
const team = createTable('team', {
  id: uuid('id').primaryKey().defaultRandom(),
  tournamentId: uuid('tournament_id')
    .notNull()
    .references(() => tournament.id),
  name: text('name'),
  // Historical FALLBACK only (1 = champions, 2 = runners-up, null = unknown):
  // when a tournament has its full phase/match record, final standings must
  // be derived from results instead; read this column only when they can't.
  finalPosition: integer('final_position'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

const teamMember = createTable(
  'team_member',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    teamId: uuid('team_id')
      .notNull()
      .references(() => team.id),
    // Null means "we know someone was on this team, we just don't know who" —
    // only expected for historical imports with an incomplete roster memory.
    // Postgres doesn't treat NULLs as equal for the unique constraints below,
    // so multiple unidentified members on the same team are still allowed.
    playerId: uuid('player_id').references(() => player.id),
    // Duplicated from team.tournamentId on purpose, so the DB itself can
    // enforce "a player can't be on two teams of the same tournament".
    tournamentId: uuid('tournament_id')
      .notNull()
      .references(() => tournament.id),
    isCaptain: boolean('is_captain').notNull().default(false),
    // Roster order as written in the source (0 = captain when known): the
    // fallback for listing a team when no formation pots were recorded.
    // Insertion order can't be trusted — updates move rows around.
    seat: integer('seat'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    unique().on(table.teamId, table.playerId),
    unique().on(table.tournamentId, table.playerId),
  ],
);

const teamFormationPotPlayer = createTable(
  'team_formation_pot_player',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tournamentId: uuid('tournament_id')
      .notNull()
      .references(() => tournament.id),
    // 0 = cabezas de serie. No FK — a pot is just a number, validated at the app layer.
    potIndex: integer('pot_index').notNull(),
    playerId: uuid('player_id')
      .notNull()
      .references(() => player.id),
  },
  (table) => [unique().on(table.tournamentId, table.playerId)],
);

const draft = createTable('draft', {
  id: uuid('id').primaryKey().defaultRandom(),
  tournamentId: uuid('tournament_id')
    .notNull()
    .unique()
    .references(() => tournament.id),
  method: text('method').notNull().$type<'snake' | 'linear'>(),
  captainOrderMethod: text('captain_order_method')
    .notNull()
    .$type<'ranking' | 'ranking_inverse' | 'random_fixed' | 'random_total'>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

const draftPick = createTable(
  'draft_pick',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    draftId: uuid('draft_id')
      .notNull()
      .references(() => draft.id),
    captainPlayerId: uuid('captain_player_id')
      .notNull()
      .references(() => player.id),
    potIndex: integer('pot_index').notNull(),
    pickedPlayerId: uuid('picked_player_id')
      .notNull()
      .references(() => player.id),
    // Determines pick order — always known, the draft has no pre-app history to import.
    pickedAt: timestamp('picked_at').notNull(),
  },
  (table) => [unique().on(table.draftId, table.pickedPlayerId)],
);

const auction = createTable('auction', {
  id: uuid('id').primaryKey().defaultRandom(),
  tournamentId: uuid('tournament_id')
    .notNull()
    .unique()
    .references(() => tournament.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

const auctionLot = createTable(
  'auction_lot',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    auctionId: uuid('auction_id')
      .notNull()
      .references(() => auction.id),
    potIndex: integer('pot_index').notNull(),
    playerId: uuid('player_id')
      .notNull()
      .references(() => player.id),
    // Determines auction order — always known, the auction has no history to import either.
    soldAt: timestamp('sold_at').notNull(),
    winningCaptainPlayerId: uuid('winning_captain_player_id')
      .notNull()
      .references(() => player.id),
    finalPrice: integer('final_price').notNull(),
    wasAutoAssigned: boolean('was_auto_assigned').notNull().default(false),
  },
  (table) => [unique().on(table.auctionId, table.playerId)],
);

const auctionBid = createTable('auction_bid', {
  id: uuid('id').primaryKey().defaultRandom(),
  lotId: uuid('lot_id')
    .notNull()
    .references(() => auctionLot.id),
  captainPlayerId: uuid('captain_player_id')
    .notNull()
    .references(() => player.id),
  amount: integer('amount').notNull(),
  bidAt: timestamp('bid_at').notNull(),
});

export {
  auction,
  auctionBid,
  auctionLot,
  draft,
  draftPick,
  team,
  teamFormationPotPlayer,
  teamMember,
};
