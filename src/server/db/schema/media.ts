import { sql } from 'drizzle-orm';
import {
  check,
  integer,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { user } from '@/server/db/schema/auth';
import { tag } from '@/server/db/schema/catalog';
import { createTable } from '@/server/db/schema/create-table';
import { edition, venue } from '@/server/db/schema/edition';
import { match, matchGame } from '@/server/db/schema/match';
import { player } from '@/server/db/schema/player';
import { tournament } from '@/server/db/schema/tournament';

const media = createTable('media', {
  id: uuid('id').primaryKey().defaultRandom(),
  type: text('type').notNull().$type<'image' | 'video' | 'audio'>(),
  mimeType: text('mime_type').notNull(),
  // R2 object keys, never full URLs: the public domain lives in env
  // (R2_PUBLIC_URL) so it can change without touching a single row.
  // Original as uploaded.
  storageKey: text('storage_key').notNull(),
  // Small webp for grids; for video it's a frame captured in the browser.
  thumbnailKey: text('thumbnail_key'),
  // Screen-sized webp (images) or the full-size poster frame (video).
  displayKey: text('display_key'),
  caption: text('caption'),
  description: text('description'),
  width: integer('width'),
  height: integer('height'),
  durationSeconds: integer('duration_seconds'),
  fileSize: integer('file_size'),
  // The actual capture date, which can differ a lot from createdAt (upload date) for old photos.
  takenAt: timestamp('taken_at'),
  uploadedByUserId: text('uploaded_by_user_id').references(() => user.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/**
 * Polymorphic association with real per-column FKs instead of a generic
 * entityType/entityId pair — each row is exactly one association (enforced
 * by the CHECK below). A file tagged to an edition + a match + 3 players
 * gets 5 rows here, one per association.
 */
const mediaAssociation = createTable(
  'media_association',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    mediaId: uuid('media_id')
      .notNull()
      .references(() => media.id),
    editionId: uuid('edition_id').references(() => edition.id),
    tournamentId: uuid('tournament_id').references(() => tournament.id),
    matchId: uuid('match_id').references(() => match.id),
    matchGameId: uuid('match_game_id').references(() => matchGame.id),
    playerId: uuid('player_id').references(() => player.id),
    // Explicit venue link; a venue's gallery also derives from the
    // editions held there, so this is only for photos of the house itself.
    venueId: uuid('venue_id').references(() => venue.id),
  },
  (table) => [
    check(
      'media_association_single_target',
      sql`num_nonnulls(${table.editionId}, ${table.tournamentId}, ${table.matchId}, ${table.matchGameId}, ${table.playerId}, ${table.venueId}) = 1`,
    ),
  ],
);

const mediaTag = createTable(
  'media_tag',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    mediaId: uuid('media_id')
      .notNull()
      .references(() => media.id),
    tagId: uuid('tag_id')
      .notNull()
      .references(() => tag.id),
  },
  (table) => [unique().on(table.mediaId, table.tagId)],
);

export { media, mediaAssociation, mediaTag };
