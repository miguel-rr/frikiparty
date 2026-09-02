import { execFile } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { readFile, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import ffmpegPath from 'ffmpeg-static';

/**
 * Thin wrapper over the bundled ffmpeg binary: probing, poster frames and
 * the H.264 playback rendition. Everything works on a local copy of the
 * video (see downloadToTmp) — simpler and more predictable than streaming
 * from R2 through ffmpeg's own https client.
 */

const ffmpeg = (): string => {
  if (!ffmpegPath) {
    throw new Error('ffmpeg binary not available on this platform');
  }
  return ffmpegPath;
};

const run = (args: string[], timeoutMs: number) =>
  new Promise<{ stdout: Buffer; stderr: string }>((resolve, reject) => {
    execFile(
      ffmpeg(),
      args,
      { encoding: 'buffer', maxBuffer: 64 * 1024 * 1024, timeout: timeoutMs },
      (error, stdout, stderr) => {
        const err = stderr.toString('utf8');
        // `-i` without an output exits 1 by design (probe); the caller
        // decides what a failure is from the parsed output.
        if (error && !(error.code === 1 && err.includes('Input #0'))) {
          reject(new Error(`ffmpeg failed: ${err.slice(-600)}`));
          return;
        }
        resolve({ stdout, stderr: err });
      },
    );
  });

type VideoProbe = {
  codec: string | null;
  container: string | null;
  width: number | null;
  height: number | null;
  durationSeconds: number | null;
};

/** Codec, size (already rotated upright) and duration, parsed from `ffmpeg -i`. */
const probeVideoFile = async (file: string): Promise<VideoProbe> => {
  const { stderr } = await run(['-hide_banner', '-i', file], 30_000);
  const codec = /Stream #\d+:\d+.*?: Video: (\w+)/.exec(stderr)?.[1] ?? null;
  const container =
    /Input #0, ([\w,]+), from/.exec(stderr)?.[1]?.split(',')[0] ?? null;
  const size = /Video: .*?, (\d{2,5})x(\d{2,5})/.exec(stderr);
  const duration = /Duration: (\d+):(\d+):(\d+(?:\.\d+)?)/.exec(stderr);
  // Phones store portrait video as landscape frames plus a rotation flag.
  const rotation = /(?:rotate\s*:|rotation of )\s*(-?\d+)/.exec(stderr);
  const sideways = rotation
    ? Math.abs(Number(rotation[1])) % 180 === 90
    : false;
  let width = size ? Number(size[1]) : null;
  let height = size ? Number(size[2]) : null;
  if (sideways && width !== null && height !== null) {
    [width, height] = [height, width];
  }
  return {
    codec,
    container,
    width,
    height,
    durationSeconds: duration
      ? Math.round(
          Number(duration[1]) * 3600 +
            Number(duration[2]) * 60 +
            Number(duration[3]),
        )
      : null,
  };
};

/** One JPEG frame, at most 1600px on the long side, taken `at` seconds in. */
const extractPoster = async (file: string, at: number): Promise<Buffer> => {
  const { stdout } = await run(
    [
      '-hide_banner',
      '-loglevel',
      'error',
      '-ss',
      String(at),
      '-i',
      file,
      '-frames:v',
      '1',
      '-vf',
      "scale='min(1600,iw)':-2",
      '-c:v',
      'mjpeg',
      '-q:v',
      '3',
      '-f',
      'image2',
      'pipe:1',
    ],
    60_000,
  );
  if (stdout.length === 0) {
    throw new Error('ffmpeg produced no poster frame');
  }
  return stdout;
};

/**
 * Playback rendition: 720p H.264 + AAC in a fast-start mp4, the one
 * combination every browser and phone plays. Written to a temp file
 * (fast-start needs a seekable output) and returned as a buffer.
 */
const transcodeToPlayback = async (
  file: string,
  timeoutMs: number,
): Promise<Buffer> => {
  const out = join(tmpdir(), `frikiparty-playback-${crypto.randomUUID()}.mp4`);
  try {
    await run(
      [
        '-hide_banner',
        '-loglevel',
        'error',
        '-i',
        file,
        '-vf',
        "scale='if(gt(iw,ih),-2,min(720,iw))':'if(gt(iw,ih),min(720,ih),-2)'",
        '-c:v',
        'libx264',
        '-preset',
        'veryfast',
        '-crf',
        '23',
        '-pix_fmt',
        'yuv420p',
        '-c:a',
        'aac',
        '-b:a',
        '128k',
        '-movflags',
        '+faststart',
        '-y',
        out,
      ],
      timeoutMs,
    );
    return await readFile(out);
  } finally {
    await unlink(out).catch(() => undefined);
  }
};

/** Streams a URL into a temp file; the caller removes it when done. */
const downloadToTmp = async (url: string, suffix: string): Promise<string> => {
  const response = await fetch(url);
  if (!response.ok || !response.body) {
    throw new Error(`Download failed: ${response.status}`);
  }
  const file = join(tmpdir(), `frikiparty-src-${crypto.randomUUID()}${suffix}`);
  await pipeline(
    Readable.fromWeb(response.body as import('node:stream/web').ReadableStream),
    createWriteStream(file),
  );
  return file;
};

const removeTmp = (file: string) => unlink(file).catch(() => undefined);

export {
  downloadToTmp,
  extractPoster,
  probeVideoFile,
  removeTmp,
  transcodeToPlayback,
  type VideoProbe,
};
