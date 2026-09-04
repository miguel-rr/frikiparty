/**
 * Background music: files live in the shared R2 bucket under `music/`
 * (uploaded with `pnpm run audio:sync`). The site plays them in a loop,
 * starting at a random track so the same intro doesn't greet every visit.
 *
 * Placeholder tracks for now; when the final ones land, each entry grows a
 * title and credit line for the footer.
 */
const MUSIC_PREFIX = 'music';

const MUSIC_FILES = Array.from(
  { length: 32 },
  (_, index) => `audio-${String(index + 1).padStart(5, '0')}.mp3`,
);

/** Absolute URLs for the player; `publicBase` is the bucket's public origin. */
const musicTrackUrls = (publicBase: string): string[] =>
  MUSIC_FILES.map((file) => `${publicBase}/${MUSIC_PREFIX}/${file}`);

export { MUSIC_FILES, MUSIC_PREFIX, musicTrackUrls };
