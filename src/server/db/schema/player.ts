import { text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { user } from '@/server/db/schema/auth';
import { createTable } from '@/server/db/schema/create-table';

/**
 * Rings, individual rings, and editions-played are deliberately not columns
 * here — they're derived by querying tournament results, so they can never
 * drift from what actually happened.
 */
const player = createTable('player', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  // Generated from name at creation time and never changed afterwards, so
  // renaming a player doesn't break existing links to their page.
  slug: text('slug').notNull().unique(),
  userId: text('user_id')
    .references(() => user.id)
    .unique(),
  avatar: text('avatar').notNull().default('gandalf'),
  imageUrl: text('image_url'),
  bio: text('bio'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export { player };
