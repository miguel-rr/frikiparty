import { sql } from 'drizzle-orm';
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
  // The page address, generated from the name and following it on a
  // rename. Every slug the player ever had lives on in previousSlugs, so
  // old links redirect to the current page (see /players/[slug]).
  slug: text('slug').notNull().unique(),
  previousSlugs: text('previous_slugs')
    .array()
    .notNull()
    .default(sql`'{}'::text[]`),
  userId: text('user_id')
    .references(() => user.id)
    .unique(),
  // One-time code an admin hands to the person so they can claim this
  // player from their user menu; cleared once consumed (see player.linkByCode).
  linkCode: text('link_code').unique(),
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
