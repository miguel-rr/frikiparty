import {
  date,
  integer,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';

import { createTable } from '@/server/db/schema/create-table';

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

export { edition, venue };
