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

/**
 * The final's pool: the most epic of the tracks above, played instead of
 * the general queue while a final is on screen (live plan F7). Track
 * numbers as in MUSIC_FILES; empty means "no special pool yet".
 */
const FINAL_POOL_NUMBERS: number[] = [];

/** Absolute URLs for the player; `publicBase` is the bucket's public origin. */
const musicTrackUrls = (publicBase: string): string[] =>
  MUSIC_FILES.map((file) => `${publicBase}/${MUSIC_PREFIX}/${file}`);

const musicFinalPoolUrls = (publicBase: string): string[] =>
  FINAL_POOL_NUMBERS.map(
    (n) =>
      `${publicBase}/${MUSIC_PREFIX}/audio-${String(n).padStart(5, '0')}.mp3`,
  );

export {
  FINAL_POOL_NUMBERS,
  MUSIC_FILES,
  MUSIC_PREFIX,
  musicFinalPoolUrls,
  musicTrackUrls,
};
