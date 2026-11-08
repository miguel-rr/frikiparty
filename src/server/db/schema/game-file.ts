import { bigint, integer, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { user } from '@/server/db/schema/auth';
import { game, gameMap, gameVersion } from '@/server/db/schema/catalog';
import { createTable } from '@/server/db/schema/create-table';

const GAME_FILE_CATEGORIES = [
  'map',
  'installer',
  'patch',
  'mod',
  'tool',
  'other',
] as const;

type GameFileCategory = (typeof GAME_FILE_CATEGORIES)[number];

/**
 * Downloads that belong to a game rather than to the archive: maps,
 * installers, patches, mods, tools. Kept apart from `media` on purpose —
 * no players, no renditions, and sizes in the gigabytes.
 */
const gameFile = createTable('game_file', {
  id: uuid('id').primaryKey().defaultRandom(),
  gameId: uuid('game_id')
    .notNull()
    .references(() => game.id),
  // The version it's meant for; null means any version.
  gameVersionId: uuid('game_version_id').references(() => gameVersion.id),
  // Maps only, when the map is in the catalogue.
  gameMapId: uuid('game_map_id').references(() => gameMap.id),
  category: text('category').notNull().$type<GameFileCategory>(),
  title: text('title').notNull(),
  description: text('description'),
  // The original name, which the download keeps.
  fileName: text('file_name').notNull(),
  mimeType: text('mime_type').notNull(),
  // R2 object key, never a full URL (see media.storageKey).
  storageKey: text('storage_key').notNull(),
  // bigint: installers go past the 2 GB an integer holds.
  fileSize: bigint('file_size', { mode: 'number' }).notNull(),
  downloadCount: integer('download_count').notNull().default(0),
  uploadedByUserId: text('uploaded_by_user_id').references(() => user.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export { GAME_FILE_CATEGORIES, type GameFileCategory, gameFile };
