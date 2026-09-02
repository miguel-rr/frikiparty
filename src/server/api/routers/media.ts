import { TRPCError } from '@trpc/server';
import { and, asc, eq, isNotNull, or, sql } from 'drizzle-orm';
import { after } from 'next/server';
import sharp from 'sharp';
import { z } from 'zod';

import { listEditions } from '@/server/api/routers/edition';
import {
  listMediaForEdition,
  listMediaForPlayer,
  listMediaForVenue,
} from '@/server/api/routers/media-queries';
import {
  adminProcedure,
  createTRPCRouter,
  protectedProcedure,
  type TRPCContext,
} from '@/server/api/trpc';
import {
  media,
  mediaAssociation,
  mediaTag,
  player,
  tournament,
} from '@/server/db/schema';
import { resolveArchiveAccess } from '@/server/media/access';
import { processVideo } from '@/server/media/process-video';
import {
  deleteObjects,
  getObject,
  headObject,
  presignUpload,
  putObject,
} from '@/server/storage/r2';

/**
 * What the browser may upload, and the extension each type gets in R2.
 * HEIC is deliberately out: iOS converts to JPEG on the file picker, and
 * sharp can't decode it server-side anyway.
 */
const UPLOAD_TYPES = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
  'video/webm': 'webm',
} as const;

type UploadType = keyof typeof UPLOAD_TYPES;

const uploadTypeSchema = z.enum(
  Object.keys(UPLOAD_TYPES) as [UploadType, ...UploadType[]],
);

const THUMBNAIL_SIZE = 480;
const DISPLAY_SIZE = 1600;

const mediaKeys = (id: string, contentType: UploadType) => ({
  original: `media/${id}/original.${UPLOAD_TYPES[contentType]}`,
  poster: `media/${id}/poster.jpg`,
  thumbnail: `media/${id}/thumb.webp`,
  display: `media/${id}/display.webp`,
  playback: `media/${id}/playback.mp4`,
});

const mediaTypeOf = (contentType: UploadType) =>
  contentType.startsWith('video/') ? ('video' as const) : ('image' as const);

/** Reading and uploading share one rule (see resolveArchiveAccess). */
const archiveProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  const access = await resolveArchiveAccess(ctx.db, ctx.session.user);
  if (!access.allowed) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Vincula tu jugador para entrar en Los Archivos.',
    });
  }
  return next({ ctx: { ...ctx, uploader: { userId: ctx.session.user.id } } });
});

type TournamentKindRow = {
  id: string;
  edition_id: string;
  max_team_size: number | null;
};

/**
 * Pickers for the upload form: every player, every edition (newest first)
 * with its official tournaments split into team/individual by roster size.
 */
const getUploadContext = async (db: TRPCContext['db']) => {
  const [players, editions, tournamentRows] = await Promise.all([
    db
      .select({ id: player.id, name: player.name })
      .from(player)
      .orderBy(asc(player.name)),
    listEditions(db),
    db.execute(sql`
      SELECT tr.id, tr.edition_id,
        (
          SELECT max(size) FROM (
            SELECT count(*)::int AS size
            FROM frikiparty_team_member tm
            JOIN frikiparty_team t ON t.id = tm.team_id
            WHERE t.tournament_id = tr.id
            GROUP BY t.id
          ) sizes
        ) AS max_team_size
      FROM frikiparty_tournament tr
      WHERE tr.is_official
    `) as unknown as Promise<TournamentKindRow[]>,
  ]);
  const tournamentsByEdition = new Map<
    string,
    { id: string; kind: 'team' | 'individual' }[]
  >();
  for (const row of tournamentRows) {
    const list = tournamentsByEdition.get(row.edition_id) ?? [];
    list.push({
      id: row.id,
      kind: (row.max_team_size ?? 2) > 1 ? 'team' : 'individual',
    });
    tournamentsByEdition.set(row.edition_id, list);
  }
  return {
    players,
    editions: editions.map((item) => ({
      id: item.id,
      label: item.label,
      tournaments: (tournamentsByEdition.get(item.id) ?? []).sort((a, b) =>
        a.kind === b.kind ? 0 : a.kind === 'team' ? -1 : 1,
      ),
    })),
  };
};

/** Downscaled webp; EXIF orientation applied so phones' portraits stay upright. */
const renditionOf = (source: Buffer, size: number) =>
  sharp(source)
    .rotate()
    .resize({
      width: size,
      height: size,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality: 82 })
    .toBuffer({ resolveWithObject: true });

const assertTournamentInEdition = async (
  db: TRPCContext['db'],
  tournamentId: string | null,
  editionId: string | null,
) => {
  if (!tournamentId) {
    return;
  }
  const [row] = await db
    .select({ editionId: tournament.editionId })
    .from(tournament)
    .where(eq(tournament.id, tournamentId));
  if (!row || row.editionId !== editionId) {
    throw new TRPCError({ code: 'BAD_REQUEST' });
  }
};

/** Who may change or remove a file: its uploader, or an admin. */
const loadEditable = async (
  ctx: {
    db: TRPCContext['db'];
    session: { user: { id: string; role: string } };
  },
  id: string,
) => {
  const [row] = await ctx.db.select().from(media).where(eq(media.id, id));
  if (!row) {
    throw new TRPCError({ code: 'NOT_FOUND' });
  }
  const isAdmin = ctx.session.user.role === 'admin';
  if (!isAdmin && row.uploadedByUserId !== ctx.session.user.id) {
    throw new TRPCError({ code: 'FORBIDDEN' });
  }
  return { row, isAdmin };
};

const mediaRouter = createTRPCRouter({
  /** Whether the signed-in user may see and feed the archive. */
  access: protectedProcedure.query(({ ctx }) =>
    resolveArchiveAccess(ctx.db, ctx.session.user),
  ),

  /** Everything tagged to one player, edition or venue (derived, see media-queries). */
  gallery: archiveProcedure
    .input(
      z.union([
        z.object({ playerId: z.string().uuid() }),
        z.object({ editionId: z.string().uuid() }),
        z.object({ venueId: z.string().uuid() }),
      ]),
    )
    .query(({ ctx, input }) =>
      'playerId' in input
        ? listMediaForPlayer(ctx.db, input.playerId)
        : 'editionId' in input
          ? listMediaForEdition(ctx.db, input.editionId)
          : listMediaForVenue(ctx.db, input.venueId),
    ),

  uploadContext: archiveProcedure.query(({ ctx }) => getUploadContext(ctx.db)),

  /**
   * Reserves an id and signs the direct browser → R2 uploads (the original
   * and, for video, the poster frame the browser captures). Nothing is
   * written to the database until `finalize` confirms the objects exist.
   */
  presign: archiveProcedure
    .input(z.object({ contentType: uploadTypeSchema }))
    .mutation(async ({ input }) => {
      const id = crypto.randomUUID();
      const keys = mediaKeys(id, input.contentType);
      const [uploadUrl, posterUploadUrl] = await Promise.all([
        presignUpload(keys.original, input.contentType),
        mediaTypeOf(input.contentType) === 'video'
          ? presignUpload(keys.poster, 'image/jpeg')
          : Promise.resolve(null),
      ]);
      return { id, uploadUrl, posterUploadUrl };
    }),

  /**
   * Turns an uploaded object into a catalogued file: renditions (thumb +
   * display) generated server-side from the original or the poster, then
   * the row and its associations. At least one player, always.
   */
  finalize: archiveProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        contentType: uploadTypeSchema,
        caption: z.string().trim().max(200).nullable(),
        // Video metadata read in the browser; images are measured here.
        width: z.number().int().positive().nullable(),
        height: z.number().int().positive().nullable(),
        durationSeconds: z.number().int().nonnegative().nullable(),
        playerIds: z.array(z.string().uuid()).min(1).max(40),
        editionId: z.string().uuid().nullable(),
        tournamentId: z.string().uuid().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const keys = mediaKeys(input.id, input.contentType);
      const type = mediaTypeOf(input.contentType);

      const [existing] = await ctx.db
        .select({ id: media.id })
        .from(media)
        .where(eq(media.id, input.id));
      if (existing) {
        throw new TRPCError({ code: 'CONFLICT' });
      }
      const original = await headObject(keys.original);
      if (!original) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'El archivo no llegó al almacén. Vuelve a intentarlo.',
        });
      }
      await assertTournamentInEdition(
        ctx.db,
        input.tournamentId,
        input.editionId,
      );

      let width = input.width;
      let height = input.height;
      let thumbnailKey: string | null = null;
      let displayKey: string | null = null;

      if (type === 'image') {
        const source = await getObject(keys.original);
        const [thumb, display] = await Promise.all([
          renditionOf(source, THUMBNAIL_SIZE),
          renditionOf(source, DISPLAY_SIZE),
        ]);
        await Promise.all([
          putObject(keys.thumbnail, thumb.data, 'image/webp'),
          putObject(keys.display, display.data, 'image/webp'),
        ]);
        thumbnailKey = keys.thumbnail;
        displayKey = keys.display;
        // Dimensions of the upright original: metadata() reports the
        // stored pixels, so swap when EXIF turns the photo on its side.
        const meta = await sharp(source).metadata();
        const sideways = (meta.orientation ?? 1) >= 5;
        width = (sideways ? meta.height : meta.width) ?? null;
        height = (sideways ? meta.width : meta.height) ?? null;
      } else if (await headObject(keys.poster)) {
        const poster = await getObject(keys.poster);
        const thumb = await renditionOf(poster, THUMBNAIL_SIZE);
        await putObject(keys.thumbnail, thumb.data, 'image/webp');
        thumbnailKey = keys.thumbnail;
        displayKey = keys.poster;
      }

      await ctx.db.transaction(async (tx) => {
        await tx.insert(media).values({
          id: input.id,
          type,
          mimeType: input.contentType,
          storageKey: keys.original,
          thumbnailKey,
          displayKey,
          caption: input.caption || null,
          width,
          height,
          durationSeconds: input.durationSeconds,
          fileSize: original.size,
          uploadedByUserId: ctx.uploader.userId,
        });
        const targets = [
          ...input.playerIds.map((playerId) => ({ playerId })),
          ...(input.editionId ? [{ editionId: input.editionId }] : []),
          ...(input.tournamentId ? [{ tournamentId: input.tournamentId }] : []),
        ];
        await tx
          .insert(mediaAssociation)
          .values(targets.map((target) => ({ mediaId: input.id, ...target })));
      });

      if (type === 'video') {
        // Poster fallback, real metadata and the H.264 rendition happen
        // after the response; galleries pick them up on their next fetch.
        after(() => processVideo(ctx.db, input.id, keys));
      }
      return { id: input.id };
    }),

  /** Admin: run the video pass again (a failed conversion, a missing poster). */
  reprocessVideo: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select({ mimeType: media.mimeType, type: media.type })
        .from(media)
        .where(eq(media.id, input.id));
      if (row?.type !== 'video') {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }
      await ctx.db
        .update(media)
        .set({ playbackStatus: 'converting' })
        .where(eq(media.id, input.id));
      const keys = mediaKeys(input.id, row.mimeType as UploadType);
      after(() => processVideo(ctx.db, input.id, keys));
      return { id: input.id };
    }),

  /**
   * Caption and links (players, edition, tournament) by the uploader or
   * an admin; the long description is admin-only. Match, game and venue
   * links aren't touched here — they have no picker yet.
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        caption: z.string().trim().max(200).nullable(),
        description: z.string().trim().max(4000).nullable().optional(),
        playerIds: z.array(z.string().uuid()).min(1).max(40),
        editionId: z.string().uuid().nullable(),
        tournamentId: z.string().uuid().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { isAdmin } = await loadEditable(ctx, input.id);
      if (input.description !== undefined && !isAdmin) {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }
      await assertTournamentInEdition(
        ctx.db,
        input.tournamentId,
        input.editionId,
      );

      await ctx.db.transaction(async (tx) => {
        await tx
          .update(media)
          .set({
            caption: input.caption || null,
            ...(input.description !== undefined
              ? { description: input.description || null }
              : {}),
          })
          .where(eq(media.id, input.id));
        await tx
          .delete(mediaAssociation)
          .where(
            and(
              eq(mediaAssociation.mediaId, input.id),
              or(
                isNotNull(mediaAssociation.playerId),
                isNotNull(mediaAssociation.editionId),
                isNotNull(mediaAssociation.tournamentId),
              ),
            ),
          );
        const targets = [
          ...input.playerIds.map((playerId) => ({ playerId })),
          ...(input.editionId ? [{ editionId: input.editionId }] : []),
          ...(input.tournamentId ? [{ tournamentId: input.tournamentId }] : []),
        ];
        await tx
          .insert(mediaAssociation)
          .values(targets.map((target) => ({ mediaId: input.id, ...target })));
      });

      return { id: input.id };
    }),

  /** Removes the row, its links and every object in R2. Uploader or admin. */
  remove: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { row } = await loadEditable(ctx, input.id);
      await ctx.db.transaction(async (tx) => {
        await tx
          .delete(mediaAssociation)
          .where(eq(mediaAssociation.mediaId, input.id));
        await tx.delete(mediaTag).where(eq(mediaTag.mediaId, input.id));
        await tx.delete(media).where(eq(media.id, input.id));
      });
      const keys = mediaKeys(input.id, row.mimeType as UploadType);
      await deleteObjects([
        keys.original,
        keys.poster,
        keys.thumbnail,
        keys.display,
        keys.playback,
      ]);
      return { id: input.id };
    }),
});

export { getUploadContext, mediaRouter, UPLOAD_TYPES, type UploadType };
