import { and, asc, desc, eq, isNull, or } from 'drizzle-orm';

import type { db as Db } from '@/server/db';
import { gameFile, gameMap, gameVersion, user } from '@/server/db/schema';

type Database = typeof Db;

/** R2 key of a game file: its own folder, ending in the original (sanitised) name. */
const gameFileKey = (id: string, fileName: string) =>
  `game-files/${id}/${fileName.replace(/[^A-Za-z0-9._-]+/g, '_').slice(0, 180) || 'file'}`;

/**
 * A game's files, newest first. With a version, only that version's and
 * the ones meant for any version.
 */
const listGameFiles = (db: Database, gameId: string, gameVersionId?: string) =>
  db
    .select({
      id: gameFile.id,
      category: gameFile.category,
      title: gameFile.title,
      description: gameFile.description,
      fileName: gameFile.fileName,
      fileSize: gameFile.fileSize,
      downloadCount: gameFile.downloadCount,
      createdAt: gameFile.createdAt,
      gameVersionId: gameFile.gameVersionId,
      version: gameVersion.version,
      gameMapId: gameFile.gameMapId,
      mapName: gameMap.name,
      uploadedByUserId: gameFile.uploadedByUserId,
      uploadedBy: user.name,
    })
    .from(gameFile)
    .leftJoin(gameVersion, eq(gameVersion.id, gameFile.gameVersionId))
    .leftJoin(gameMap, eq(gameMap.id, gameFile.gameMapId))
    .leftJoin(user, eq(user.id, gameFile.uploadedByUserId))
    .where(
      gameVersionId
        ? and(
            eq(gameFile.gameId, gameId),
            or(
              eq(gameFile.gameVersionId, gameVersionId),
              isNull(gameFile.gameVersionId),
            ),
          )
        : eq(gameFile.gameId, gameId),
    )
    .orderBy(desc(gameFile.createdAt), asc(gameFile.title));

type GameFileRow = Awaited<ReturnType<typeof listGameFiles>>[number];

export { type GameFileRow, gameFileKey, listGameFiles };
