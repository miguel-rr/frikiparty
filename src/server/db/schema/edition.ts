import {
  boolean,
  date,
  integer,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';

import { createTable } from '@/server/db/schema/create-table';
import { player } from '@/server/db/schema/player';

/** Rural houses / venues get reused across editions — normalized so the Maps link and photo are entered once. */
const venue = createTable('venue', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  /** URL identity for /venues/<slug>; derived from the name (see lib/slug). */
  slug: text('slug').notNull().unique(),
  mapsUrl: text('maps_url'),
  /** Representative photo of the house (one per venue, like mapsUrl). */
  photoUrl: text('photo_url'),
  /** Resolved address for the keyless Google Maps embed (q= parameter). */
  mapsEmbedQuery: text('maps_embed_query'),
  /** Free text about the house: how it was, anecdotes, why we moved on. */
  description: text('description'),
  // Some historical "venues" are labels rather than houses ("Madrid", a
  // farewell party): they stay for the record but get no page of their own.
  isPlace: boolean('is_place').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/** The global roman-numeral ordinal (I, II, III…) isn't stored — it's derived by ordering by (year, order). */
const edition = createTable(
  'edition',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    year: integer('year').notNull(),
    order: integer('order').notNull().default(1),
    venueId: uuid('venue_id').references(() => venue.id),
    // Nullable: unknown for most historical editions (only the year survives).
    startsAt: date('starts_at'),
    endsAt: date('ends_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [unique().on(table.year, table.order)],
);

/**
 * Who has answered the call for an edition — the attendance list that grows
 * while the tournament doesn't exist yet. Deliberately separate from
 * team_member (that's tournament roster, born with the draw): a confirmed
 * player is just "I'll be there". confirmedAt keeps the order they answered.
 */
const editionPlayer = createTable(
  'edition_player',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    editionId: uuid('edition_id')
      .notNull()
      .references(() => edition.id, { onDelete: 'cascade' }),
    playerId: uuid('player_id')
      .notNull()
      .references(() => player.id, { onDelete: 'cascade' }),
    confirmedAt: timestamp('confirmed_at').defaultNow().notNull(),
  },
  (table) => [unique().on(table.editionId, table.playerId)],
);

export { edition, editionPlayer, venue };
