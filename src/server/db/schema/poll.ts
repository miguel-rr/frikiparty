import {
  boolean,
  integer,
  jsonb,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';

import { user } from '@/server/db/schema/auth';
import { createTable } from '@/server/db/schema/create-table';
import { edition } from '@/server/db/schema/edition';

type PollOption = { key: string; label: string };

/**
 * One question of a polls page. A page (`page`) groups its polls in
 * `position` order. Only players confirmed for `editionId` vote; results
 * open once half of them plus one have voted (see src/lib/polls). The
 * admin desk (/admin/polls) shows, hides, opens and closes them.
 */
const poll = createTable('poll', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(),
  page: text('page').notNull(),
  position: integer('position').notNull().default(0),
  question: text('question').notNull(),
  options: jsonb('options').$type<PollOption[]>().notNull(),
  editionId: uuid('edition_id')
    .notNull()
    .references(() => edition.id, { onDelete: 'cascade' }),
  /** Hidden polls are left out of their page altogether. */
  visible: boolean('visible').notNull().default(true),
  /** Opened by hand; `opensAt` opens it on its own at that time. */
  votingOpen: boolean('voting_open').notNull().default(true),
  opensAt: timestamp('opens_at', { withTimezone: true }),
  /** No closing time yet: it stays open until one is set. */
  closesAt: timestamp('closes_at', { withTimezone: true }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/**
 * One vote per person and poll, changeable until the poll closes. The
 * user id is only there to let people change their vote: no screen or
 * endpoint ever says who voted what.
 */
const pollVote = createTable(
  'poll_vote',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    pollId: uuid('poll_id')
      .notNull()
      .references(() => poll.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    optionKey: text('option_key').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [unique().on(table.pollId, table.userId)],
);

export { type PollOption, poll, pollVote };
