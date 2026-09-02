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
  /**
   * "Entrar" button and user menu in the top nav. Hidden in production —
   * /login itself stays reachable by URL for those who know the way in.
   */
  auth: !isProduction,
  /** Section/page links in the top nav. */
  navigation: true,
  /** Themed pages, live everywhere since the 2026-09 launch. */
  editionsPage: true,
  playersPage: true,
  rankingPage: true,
  /** Tournament page: countdown while waiting, live view when playing. */
  councilPage: true,
  /** /venues and /venues/<slug>; the index is reachable by URL only. */
  venuesPage: true,
  /** /archive (Los Archivos, the whole library). Admins always get in. */
  archivePublic: false,
} as const;

export { siteFlags };
