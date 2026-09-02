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
  /** Themed pages hidden (404) in production until launch. */
  editionsPage: !isProduction,
  playersPage: !isProduction,
  rankingPage: !isProduction,
  /** Tournament page: countdown while waiting, live view when playing. */
  councilPage: !isProduction,
  /** /venues and /venues/<slug>; the index is reachable by URL only. */
  venuesPage: !isProduction,
} as const;

export { siteFlags };
