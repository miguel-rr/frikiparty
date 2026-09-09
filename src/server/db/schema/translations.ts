import {
  foreignKey,
  index,
  integer,
  jsonb,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';

import type { StrIssue } from '@/lib/translations/str';
import { user } from '@/server/db/schema/auth';
import { gameVersion } from '@/server/db/schema/catalog';
import { createTable } from '@/server/db/schema/create-table';

type StrLanguage = 'en' | 'es';

/**
 * One uploaded `lotr.str`: the game's original (en) or the community
 * translation (es) for a given game version. The whole file lives in R2
 * so an export can reproduce it byte for byte; the rows in `str_entry`
 * are what we search and compare.
 */
const strFile = createTable(
  'str_file',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    gameVersionId: uuid('game_version_id').notNull(),
    language: text('language').notNull().$type<StrLanguage>(),
    // Who made it: "oficial", "Galcano11"…
    source: text('source'),
    uploadedByUserId: text('uploaded_by_user_id').references(() => user.id),
    uploadedAt: timestamp('uploaded_at').defaultNow().notNull(),
    entryCount: integer('entry_count').notNull(),
    sha256: text('sha256').notNull(),
    r2Key: text('r2_key').notNull(),
    // The comment lines that open the file (author, version…).
    header: text('header'),
    // What the parser flagged: broken keys, stray ENDs, unquoted values.
    issues: jsonb('issues').notNull().default([]).$type<StrIssue[]>(),
  },
  (table) => [
    unique().on(table.gameVersionId, table.language),
    // Named by hand: the generated name would exceed Postgres' 63 chars.
    foreignKey({
      name: 'str_file_game_version_fk',
      columns: [table.gameVersionId],
      foreignColumns: [gameVersion.id],
    }),
  ],
);

/** One `KEY … END` block of a file, in file order; ~24k rows per file. */
const strEntry = createTable(
  'str_entry',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    fileId: uuid('file_id')
      .notNull()
      .references(() => strFile.id, { onDelete: 'cascade' }),
    seq: integer('seq').notNull(),
    key: text('key').notNull(),
    // The value lines verbatim (quotes and escapes included).
    value: text('value').notNull(),
    // `// context:` comments found inside the block.
    comment: text('comment'),
  },
  (table) => [
    index('str_entry_file_key_idx').on(table.fileId, table.key),
    index('str_entry_file_seq_idx').on(table.fileId, table.seq),
  ],
);

/**
 * Our own text for a key, valid across versions. It remembers the English
 * original (and the Spanish) it was written against: when a newer English
 * file carries a different value for the key, the row goes to 'review'.
 */
const customString = createTable(
  'custom_string',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    key: text('key').notNull().unique(),
    // What the game will show, without the surrounding quotes.
    value: text('value').notNull(),
    note: text('note'),
    baseEnFileId: uuid('base_en_file_id'),
    // Raw values, as in `str_entry.value`, at the time of writing.
    baseEnValue: text('base_en_value'),
    baseEsValue: text('base_es_value'),
    status: text('status').notNull().default('ok').$type<'ok' | 'review'>(),
    createdByUserId: text('created_by_user_id').references(() => user.id),
    updatedByUserId: text('updated_by_user_id').references(() => user.id),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    foreignKey({
      name: 'custom_string_base_en_file_fk',
      columns: [table.baseEnFileId],
      foreignColumns: [strFile.id],
    }).onDelete('set null'),
  ],
);

export { customString, type StrLanguage, strEntry, strFile };
