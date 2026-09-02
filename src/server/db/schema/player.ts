import { text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { user } from '@/server/db/schema/auth';
import { createTable } from '@/server/db/schema/create-table';

/**
 * Rings and individual rings are deliberately not columns here — they're
 * derived by querying tournament results, so they can never drift from what
 * actually happened.
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
  // Chosen card identity; null means "let the card system decide" (curated
  // map or race pool for the portrait, a random lore-deck deal for the text).
  cardPortrait: text('card_portrait'),
  cardLore: text('card_lore'),
  // A personal, curated ability (bold name + definition). When set it IS
  // the player's line: it never rotates and the lore picker hides.
  cardAbility: text('card_ability'),
  cardAbilityText: text('card_ability_text'),
  bio: text('bio'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export { player };
