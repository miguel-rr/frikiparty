import { eq } from 'drizzle-orm';
import sharp from 'sharp';

import type { db as Db } from '@/server/db';
import { media } from '@/server/db/schema';
import {
  downloadToTmp,
  extractPoster,
  probeVideoFile,
  removeTmp,
  transcodeToPlayback,
} from '@/server/media/ffmpeg';
import { headObject, publicUrl, putObject } from '@/server/storage/r2';

/**
 * Background pass over a freshly catalogued video: a poster when the
 * browser couldn't capture one, real dimensions and duration, and an
 * H.264 playback rendition when the original wouldn't play everywhere.
 * Runs after the upload response (next/server `after`), so the phone
 * never waits for it. Failures leave the original served as it was.
 */

/** Above this the function's disk and time budget aren't worth risking. */
const MAX_PROCESSABLE_BYTES = 400 * 1024 * 1024;
const THUMBNAIL_SIZE = 480;
// Vercel caps a function at 300 s on Hobby; leave room for download and upload.
const TRANSCODE_TIMEOUT_MS = 200_000;

/** H.264 in mp4 and VP8/VP9 in webm play in every current browser; the rest doesn't. */
const playsEverywhere = (codec: string | null, container: string | null) =>
  (codec === 'h264' && container === 'mov') ||
  ((codec === 'vp8' || codec === 'vp9') && container === 'matroska');

type Keys = {
  original: string;
  poster: string;
  thumbnail: string;
  playback: string;
};

const processVideo = async (db: typeof Db, id: string, keys: Keys) => {
  const [row] = await db.select().from(media).where(eq(media.id, id));
  if (row?.type !== 'video') {
    return;
  }
  if ((row.fileSize ?? 0) > MAX_PROCESSABLE_BYTES) {
    await db
      .update(media)
      .set({ playbackStatus: 'failed' })
      .where(eq(media.id, id));
    return;
  }

  const extension = keys.original.slice(keys.original.lastIndexOf('.'));
  let file: string | null = null;
  try {
    file = await downloadToTmp(publicUrl(keys.original), extension);
    const probe = await probeVideoFile(file);

    const patch: Partial<typeof media.$inferInsert> = {
      width: row.width ?? probe.width,
      height: row.height ?? probe.height,
      durationSeconds: row.durationSeconds ?? probe.durationSeconds,
    };

    if (!row.thumbnailKey && !(await headObject(keys.poster))) {
      const at = Math.min(1, (probe.durationSeconds ?? 0) / 10);
      const poster = await extractPoster(file, at);
      const thumb = await sharp(poster)
        .resize({
          width: THUMBNAIL_SIZE,
          height: THUMBNAIL_SIZE,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp({ quality: 82 })
        .toBuffer();
      await Promise.all([
        putObject(keys.poster, poster, 'image/jpeg'),
        putObject(keys.thumbnail, thumb, 'image/webp'),
      ]);
      patch.thumbnailKey = keys.thumbnail;
      patch.displayKey = keys.poster;
    }

    if (row.playbackKey || playsEverywhere(probe.codec, probe.container)) {
      patch.playbackStatus = null;
      await db.update(media).set(patch).where(eq(media.id, id));
      return;
    }

    await db
      .update(media)
      .set({ ...patch, playbackStatus: 'converting' })
      .where(eq(media.id, id));
    const playback = await transcodeToPlayback(file, TRANSCODE_TIMEOUT_MS);
    await putObject(keys.playback, playback, 'video/mp4');
    await db
      .update(media)
      .set({ playbackKey: keys.playback, playbackStatus: null })
      .where(eq(media.id, id));
  } catch (error) {
    console.error(`[media] video processing failed for ${id}:`, error);
    await db
      .update(media)
      .set({ playbackStatus: 'failed' })
      .where(eq(media.id, id));
  } finally {
    if (file) {
      await removeTmp(file);
    }
  }
};

export { playsEverywhere, processVideo };
