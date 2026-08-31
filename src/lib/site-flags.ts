import { env } from '@/env';

/**
 * Central visibility switches per deployment stage. Preview and local dev
 * show everything in progress; production only what's ready. Flipping a
 * flag is a commit, so features go live exactly when develop is promoted
 * to main — no dashboard state to keep in sync.
 */

const stage = env.VERCEL_ENV ?? 'development';
const isProduction = stage === 'production';

const siteFlags = {
  /** "Entrar" button and user menu in the top nav. */
  auth: !isProduction,
  /** Section/page links in the top nav. */
  navigation: !isProduction,
} as const;

export { siteFlags };
