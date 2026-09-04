/**
 * Central visibility switches. Flipping a flag is a commit, so features go
 * live exactly when develop is promoted to main — no dashboard state to
 * keep in sync. To gate something to preview only again, derive it from
 * `env.VERCEL_ENV` (set by Vercel; absent in local dev).
 */

const siteFlags = {
  /** "Entrar" button and user menu in the top nav, live everywhere since Los Archivos. */
  auth: true,
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
  /**
   * /archive, the whole library, for every account with archive access
   * (linked player or editor). Admins always get in; anonymous never.
   * Open since 2026-09-04: members see everything, edit only their own
   * uploads; admins and editors edit all.
   */
  archiveForMembers: true,
  /** Background music control in the top nav. */
  music: true,
} as const;

export { siteFlags };
