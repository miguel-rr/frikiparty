import { sql } from 'drizzle-orm';

import type { TRPCContext } from '@/server/api/trpc';
import { publicUrl } from '@/server/storage/r2';

/**
 * Pure gallery queries (no session) so the static pages can embed their
 * galleries and /archive/<id> can render on demand. Keys become public
 * URLs here, so nothing downstream knows about R2.
 */

type MediaRow = {
  id: string;
  type: 'image' | 'video' | 'document';
  mime_type: string;
  storage_key: string;
  thumbnail_key: string | null;
  display_key: string | null;
  playback_key: string | null;
  playback_status: 'converting' | 'failed' | null;
  caption: string | null;
  description: string | null;
  width: number | null;
  height: number | null;
  duration_seconds: number | null;
  file_size: number | null;
  created_at: Date;
  uploaded_by_user_id: string | null;
  uploader_name: string | null;
  like_count: number;
  comment_count: number;
  liked_by_me: boolean;
  players: { id: string; name: string; slug: string }[];
  edition_id: string | null;
  edition_year: number | null;
  edition_order: number | null;
  editions_in_year: number | null;
  tournament_id: string | null;
  venue_name: string | null;
  venue_slug: string | null;
};

type MediaItem = {
  id: string;
  type: 'image' | 'video' | 'document';
  mimeType: string;
  originalUrl: string;
  thumbnailUrl: string | null;
  displayUrl: string | null;
  /** Video: the H.264 rendition when one was needed and made. */
  playbackUrl: string | null;
  playbackStatus: 'converting' | 'failed' | null;
  caption: string | null;
  description: string | null;
  width: number | null;
  height: number | null;
  durationSeconds: number | null;
  fileSize: number | null;
  createdAt: string;
  uploadedByUserId: string | null;
  uploaderName: string | null;
  likeCount: number;
  commentCount: number;
  /** Whether the viewer passed to the query has liked it; false without one. */
  likedByMe: boolean;
  players: { id: string; name: string; slug: string }[];
  edition: { id: string; label: string; slug: string } | null;
  tournamentId: string | null;
  /** Explicit venue link or, failing that, the edition's house. */
  venue: { name: string; slug: string } | null;
};

const ROMAN_ORDINALS = ['I', 'II', 'III', 'IV', 'V'] as const;

const toItem = (row: MediaRow): MediaItem => ({
  id: row.id,
  type: row.type,
  mimeType: row.mime_type,
  originalUrl: publicUrl(row.storage_key),
  thumbnailUrl: row.thumbnail_key ? publicUrl(row.thumbnail_key) : null,
  displayUrl: row.display_key ? publicUrl(row.display_key) : null,
  playbackUrl: row.playback_key ? publicUrl(row.playback_key) : null,
  playbackStatus: row.playback_status,
  caption: row.caption,
  description: row.description,
  width: row.width,
  height: row.height,
  durationSeconds: row.duration_seconds,
  fileSize: row.file_size,
  createdAt: new Date(row.created_at).toISOString(),
  uploadedByUserId: row.uploaded_by_user_id,
  uploaderName: row.uploader_name,
  likeCount: row.like_count,
  commentCount: row.comment_count,
  likedByMe: row.liked_by_me,
  players: row.players,
  edition:
    row.edition_id && row.edition_year && row.edition_order
      ? {
          id: row.edition_id,
          label:
            row.edition_order > 1 || (row.editions_in_year ?? 1) > 1
              ? `${row.edition_year} · ${ROMAN_ORDINALS[row.edition_order - 1] ?? row.edition_order}`
              : String(row.edition_year),
          slug:
            row.edition_order > 1
              ? `${row.edition_year}-${row.edition_order}`
              : String(row.edition_year),
        }
      : null,
  tournamentId: row.tournament_id,
  venue:
    row.venue_name && row.venue_slug
      ? { name: row.venue_name, slug: row.venue_slug }
      : null,
});

/**
 * Full rows for a set of media ids (or every row when `ids` is null),
 * newest first, with the tagged players, the edition and the like and
 * comment counts. The edition comes from the explicit edition link or,
 * failing that, the tournament's. `viewerUserId` only decides `likedByMe`.
 */
const fetchMediaItems = async (
  db: TRPCContext['db'],
  ids: string[] | null,
  viewerUserId: string | null,
): Promise<MediaItem[]> => {
  if (ids !== null && ids.length === 0) {
    return [];
  }
  const rows = (await db.execute(sql`
    WITH picked AS (
      SELECT m.* FROM frikiparty_media m
      ${ids === null ? sql`` : sql`WHERE m.id IN ${ids}`}
    ),
    edition_of AS (
      SELECT a.media_id, coalesce(a.edition_id, tr.edition_id) AS edition_id,
        a.tournament_id
      FROM frikiparty_media_association a
      LEFT JOIN frikiparty_tournament tr ON tr.id = a.tournament_id
      WHERE a.edition_id IS NOT NULL OR a.tournament_id IS NOT NULL
    )
    SELECT
      p.id, p.type, p.mime_type, p.storage_key, p.thumbnail_key, p.display_key,
      p.playback_key, p.playback_status, p.caption, p.description, p.width, p.height, p.duration_seconds,
      p.file_size, p.created_at, p.uploaded_by_user_id,
      u.name AS uploader_name,
      (SELECT count(*)::int FROM frikiparty_like l WHERE l.media_id = p.id) AS like_count,
      (SELECT count(*)::int FROM frikiparty_comment c WHERE c.media_id = p.id) AS comment_count,
      ${
        viewerUserId === null
          ? sql`false`
          : sql`EXISTS (SELECT 1 FROM frikiparty_like l WHERE l.media_id = p.id AND l.user_id = ${viewerUserId})`
      } AS liked_by_me,
      (
        SELECT coalesce(json_agg(json_build_object('id', pl.id, 'name', pl.name, 'slug', pl.slug) ORDER BY pl.name), '[]'::json)
        FROM frikiparty_media_association a
        JOIN frikiparty_player pl ON pl.id = a.player_id
        WHERE a.media_id = p.id
      ) AS players,
      e.id AS edition_id, e.year AS edition_year, e."order" AS edition_order,
      (SELECT count(*)::int FROM frikiparty_edition e2 WHERE e2.year = e.year) AS editions_in_year,
      (SELECT eo.tournament_id FROM edition_of eo WHERE eo.media_id = p.id AND eo.tournament_id IS NOT NULL LIMIT 1) AS tournament_id,
      v.name AS venue_name, v.slug AS venue_slug
    FROM picked p
    LEFT JOIN "user" u ON u.id = p.uploaded_by_user_id
    LEFT JOIN frikiparty_edition e ON e.id = (
      SELECT eo.edition_id FROM edition_of eo WHERE eo.media_id = p.id LIMIT 1
    )
    LEFT JOIN frikiparty_venue v ON v.id = coalesce(
      (SELECT a.venue_id FROM frikiparty_media_association a WHERE a.media_id = p.id AND a.venue_id IS NOT NULL LIMIT 1),
      e.venue_id
    )
    ORDER BY p.created_at DESC
  `)) as unknown as MediaRow[];
  return rows.map(toItem);
};

type IdRow = { id: string };

const idsOf = (rows: IdRow[]) => rows.map((row) => row.id);

/** Everything tagged with the player. */
const listMediaForPlayer = async (
  db: TRPCContext['db'],
  playerId: string,
  viewerUserId: string | null,
) =>
  fetchMediaItems(
    db,
    idsOf(
      (await db.execute(sql`
        SELECT DISTINCT media_id AS id FROM frikiparty_media_association
        WHERE player_id = ${playerId}
      `)) as unknown as IdRow[],
    ),
    viewerUserId,
  );

/**
 * Everything of the edition, derived: tagged to the edition itself, to
 * one of its tournaments, or to a match or game inside them.
 */
const listMediaForEdition = async (
  db: TRPCContext['db'],
  editionId: string,
  viewerUserId: string | null,
) =>
  fetchMediaItems(
    db,
    idsOf(
      (await db.execute(sql`
        SELECT DISTINCT a.media_id AS id
        FROM frikiparty_media_association a
        LEFT JOIN frikiparty_tournament tr ON tr.id = a.tournament_id
        LEFT JOIN frikiparty_match mt ON mt.id = a.match_id
        LEFT JOIN frikiparty_phase ph ON ph.id = mt.phase_id
        LEFT JOIN frikiparty_tournament tr2 ON tr2.id = ph.tournament_id
        LEFT JOIN frikiparty_match_game mg ON mg.id = a.match_game_id
        LEFT JOIN frikiparty_match mt2 ON mt2.id = mg.match_id
        LEFT JOIN frikiparty_phase ph2 ON ph2.id = mt2.phase_id
        LEFT JOIN frikiparty_tournament tr3 ON tr3.id = ph2.tournament_id
        WHERE a.edition_id = ${editionId}
          OR tr.edition_id = ${editionId}
          OR tr2.edition_id = ${editionId}
          OR tr3.edition_id = ${editionId}
      `)) as unknown as IdRow[],
    ),
    viewerUserId,
  );

/** The house itself, plus everything from the editions held there. */
const listMediaForVenue = async (
  db: TRPCContext['db'],
  venueId: string,
  viewerUserId: string | null,
) =>
  fetchMediaItems(
    db,
    idsOf(
      (await db.execute(sql`
        SELECT DISTINCT a.media_id AS id
        FROM frikiparty_media_association a
        LEFT JOIN frikiparty_edition e ON e.id = a.edition_id
        LEFT JOIN frikiparty_tournament tr ON tr.id = a.tournament_id
        LEFT JOIN frikiparty_edition e2 ON e2.id = tr.edition_id
        WHERE a.venue_id = ${venueId}
          OR e.venue_id = ${venueId}
          OR e2.venue_id = ${venueId}
      `)) as unknown as IdRow[],
    ),
    viewerUserId,
  );

const listAllMedia = (db: TRPCContext['db'], viewerUserId: string | null) =>
  fetchMediaItems(db, null, viewerUserId);

const getMediaItem = async (
  db: TRPCContext['db'],
  id: string,
  viewerUserId: string | null,
) => (await fetchMediaItems(db, [id], viewerUserId))[0] ?? null;

export {
  getMediaItem,
  listAllMedia,
  listMediaForEdition,
  listMediaForPlayer,
  listMediaForVenue,
  type MediaItem,
};
