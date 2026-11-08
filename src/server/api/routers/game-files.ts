import { TRPCError } from '@trpc/server';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';

import {
  GAME_FILE_MAX_BYTES,
  GAME_FILE_PART_SIZE,
  gameFilePartCount,
  titleFromFileName,
} from '@/lib/games/files';
import { archiveProcedure } from '@/server/api/archive-procedure';
import { createTRPCRouter, type TRPCContext } from '@/server/api/trpc';
import {
  GAME_FILE_CATEGORIES,
  game,
  gameFile,
  gameMap,
  gameVersion,
} from '@/server/db/schema';
import { gameFileKey } from '@/server/games/files';
import { contentDisposition } from '@/server/storage/content-disposition';
import {
  abortMultipartUpload,
  completeMultipartUpload,
  createMultipartUpload,
  deleteObjects,
  headObject,
  presignUploadPart,
} from '@/server/storage/r2';

const fileNameSchema = z.string().trim().min(1).max(255);

/** What a file is filed under: shared by `complete` and `update`. */
const placementSchema = z.object({
  category: z.enum(GAME_FILE_CATEGORIES),
  title: z.string().trim().max(200).nullable(),
  description: z.string().trim().max(4000).nullable(),
  gameVersionId: z.string().uuid().nullable(),
  gameMapId: z.string().uuid().nullable(),
});

const uploadRefSchema = z.object({
  id: z.string().uuid(),
  uploadId: z.string().min(1),
  fileName: fileNameSchema,
});

/** The version and the map, when given, must be the game's own. */
const assertPlacement = async (
  db: TRPCContext['db'],
  gameId: string,
  placement: { gameVersionId: string | null; gameMapId: string | null },
) => {
  const [versionOk, mapOk] = await Promise.all([
    placement.gameVersionId
      ? db
          .select({ id: gameVersion.id })
          .from(gameVersion)
          .where(
            and(
              eq(gameVersion.id, placement.gameVersionId),
              eq(gameVersion.gameId, gameId),
            ),
          )
          .then((rows) => rows.length > 0)
      : true,
    placement.gameMapId
      ? db
          .select({ id: gameMap.id })
          .from(gameMap)
          .where(
            and(
              eq(gameMap.id, placement.gameMapId),
              eq(gameMap.gameId, gameId),
            ),
          )
          .then((rows) => rows.length > 0)
      : true,
  ]);
  if (!versionOk || !mapOk) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'La versión o el mapa no son de este juego.',
    });
  }
};

/** The row, if the caller uploaded it or moderates the archive. */
const loadEditable = async (
  ctx: TRPCContext & { access: { canModerate: boolean } },
  id: string,
) => {
  const [row] = await ctx.db.select().from(gameFile).where(eq(gameFile.id, id));
  if (!row) {
    throw new TRPCError({ code: 'NOT_FOUND' });
  }
  if (
    !ctx.access.canModerate &&
    row.uploadedByUserId !== ctx.session?.user.id
  ) {
    throw new TRPCError({ code: 'FORBIDDEN' });
  }
  return row;
};

/**
 * Game files (maps, installers, patches…). Every upload is multipart,
 * straight from the browser to R2: `start` opens it and signs every
 * part, the browser PUTs them, `complete` closes it and catalogues the
 * file. Same access rule as the archive.
 */
const gameFilesRouter = createTRPCRouter({
  start: archiveProcedure
    .input(
      z.object({
        gameId: z.string().uuid(),
        fileName: fileNameSchema,
        fileSize: z.number().int().positive().max(GAME_FILE_MAX_BYTES),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select({ id: game.id })
        .from(game)
        .where(eq(game.id, input.gameId));
      if (!row) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }
      const id = crypto.randomUUID();
      const key = gameFileKey(id, input.fileName);
      // Always a download, never rendered: an .html or .svg in here
      // must not open in the browser.
      const uploadId = await createMultipartUpload(key, {
        contentType: 'application/octet-stream',
        contentDisposition: contentDisposition('attachment', input.fileName),
      });
      const partCount = gameFilePartCount(input.fileSize);
      const partUrls = await Promise.all(
        Array.from({ length: partCount }, (_, index) =>
          presignUploadPart(key, uploadId, index + 1),
        ),
      );
      return { id, uploadId, partSize: GAME_FILE_PART_SIZE, partUrls };
    }),

  complete: archiveProcedure
    .input(
      uploadRefSchema.extend({
        gameId: z.string().uuid(),
        mimeType: z.string().trim().max(200).nullable(),
        placement: placementSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertPlacement(ctx.db, input.gameId, input.placement);
      const key = gameFileKey(input.id, input.fileName);
      try {
        await completeMultipartUpload(key, input.uploadId);
      } catch {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message:
            'El archivo no llegó entero al almacén. Vuelve a intentarlo.',
        });
      }
      const stored = await headObject(key);
      if (!stored) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'El archivo no llegó al almacén. Vuelve a intentarlo.',
        });
      }
      if (stored.size > GAME_FILE_MAX_BYTES) {
        await deleteObjects([key]);
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'El archivo pasa de 10 GB.',
        });
      }
      const { placement } = input;
      await ctx.db.insert(gameFile).values({
        id: input.id,
        gameId: input.gameId,
        gameVersionId: placement.gameVersionId,
        gameMapId: placement.category === 'map' ? placement.gameMapId : null,
        category: placement.category,
        title: placement.title || titleFromFileName(input.fileName),
        description: placement.description || null,
        fileName: input.fileName,
        mimeType: input.mimeType || 'application/octet-stream',
        storageKey: key,
        fileSize: stored.size,
        uploadedByUserId: ctx.session.user.id,
      });
      return { id: input.id };
    }),

  /** Drops a cancelled or failed upload, so its parts don't linger in R2. */
  abort: archiveProcedure.input(uploadRefSchema).mutation(async ({ input }) => {
    await abortMultipartUpload(
      gameFileKey(input.id, input.fileName),
      input.uploadId,
    );
    return { id: input.id };
  }),

  update: archiveProcedure
    .input(placementSchema.extend({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const row = await loadEditable(ctx, input.id);
      await assertPlacement(ctx.db, row.gameId, input);
      await ctx.db
        .update(gameFile)
        .set({
          category: input.category,
          title: input.title || titleFromFileName(row.fileName),
          description: input.description || null,
          gameVersionId: input.gameVersionId,
          gameMapId: input.category === 'map' ? input.gameMapId : null,
        })
        .where(eq(gameFile.id, input.id));
      return { id: input.id };
    }),

  /** Removes the row and the object in R2. Uploader or moderator. */
  remove: archiveProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const row = await loadEditable(ctx, input.id);
      await ctx.db.delete(gameFile).where(eq(gameFile.id, input.id));
      await deleteObjects([row.storageKey]);
      return { id: input.id };
    }),
});

export { gameFilesRouter };
