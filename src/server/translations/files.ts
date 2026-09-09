import { desc, eq, sql } from 'drizzle-orm';

import type { db as Db } from '@/server/db';
import { game, gameVersion, strFile, user } from '@/server/db/schema';
import type { StrLanguage } from '@/server/db/schema/translations';

type Database = typeof Db;

/** The uploaded files with their version, newest version first. */
const listFiles = (db: Database) =>
  db
    .select({
      id: strFile.id,
      language: strFile.language,
      source: strFile.source,
      uploadedAt: strFile.uploadedAt,
      uploadedBy: user.name,
      entryCount: strFile.entryCount,
      issues: strFile.issues,
      header: strFile.header,
      gameVersionId: strFile.gameVersionId,
      version: gameVersion.version,
      releaseOrder: gameVersion.releaseOrder,
      gameName: game.name,
    })
    .from(strFile)
    .innerJoin(gameVersion, eq(gameVersion.id, strFile.gameVersionId))
    .innerJoin(game, eq(game.id, gameVersion.gameId))
    .leftJoin(user, eq(user.id, strFile.uploadedByUserId))
    .orderBy(desc(gameVersion.releaseOrder), desc(strFile.uploadedAt));

type FileRow = Awaited<ReturnType<typeof listFiles>>[number];

/** The newest file of a language by game version, if any was uploaded. */
const latestFile = async (
  db: Database,
  language: StrLanguage,
): Promise<FileRow | null> => {
  const rows = await listFiles(db);
  return rows.find((row) => row.language === language) ?? null;
};

/** A uuid no row carries, so a missing file joins to nothing. */
const NO_FILE = '00000000-0000-0000-0000-000000000000';

/**
 * Key → raw value for a file, last occurrence winning (what the game
 * does with repeated keys), plus the position of that occurrence.
 */
const loadEntries = async (db: Database, fileId: string) => {
  const rows = (await db.execute(sql`
    SELECT DISTINCT ON (key) key, value, seq
    FROM frikiparty_str_entry
    WHERE file_id = ${fileId}
    ORDER BY key, seq DESC
  `)) as unknown as { key: string; value: string; seq: number }[];
  return new Map(rows.map((r) => [r.key, { value: r.value, seq: r.seq }]));
};

export {
  type Database,
  type FileRow,
  latestFile,
  listFiles,
  loadEntries,
  NO_FILE,
};
