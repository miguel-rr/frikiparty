import { and, asc, eq, gte, isNotNull, sql } from 'drizzle-orm';

import { createTRPCRouter, publicProcedure } from '@/server/api/trpc';
import { edition, venue } from '@/server/db/schema';

type ChampionRow = {
  name: string | null;
  team_size: number;
};

type EditionListRow = {
  id: string;
  year: number;
  order: number;
  starts_at: string | null;
  ends_at: string | null;
  venue_name: string | null;
  champion_name: string | null;
  champion_slug: string | null;
  team_size: number | null;
};

type ChampionRef = { name: string; slug: string };

type EditionListItem = {
  id: string;
  year: number;
  order: number;
  /** Display label: the year, suffixed "· II" only when the year repeats. */
  label: string;
  startsAt: string | null;
  endsAt: string | null;
  venueName: string | null;
  teamChampions: ChampionRef[];
  individualChampion: ChampionRef | null;
  status: 'upcoming' | 'live' | 'past';
};

const ROMAN_ORDINALS = ['I', 'II', 'III', 'IV', 'V'] as const;

const editionStatus = (
  startsAt: string | null,
  endsAt: string | null,
  today: string,
): EditionListItem['status'] => {
  if (startsAt && startsAt > today) {
    return 'upcoming';
  }
  if (startsAt && endsAt && startsAt <= today && today <= endsAt) {
    return 'live';
  }
  return 'past';
};

const editionRouter = createTRPCRouter({
  /**
   * The upcoming (or currently running) edition: the first one whose end
   * date hasn't passed. Null once the last edition is over and the next one
   * hasn't been announced yet — the homepage shows the "beacons are unlit"
   * state in that case.
   */
  next: publicProcedure.query(async ({ ctx }) => {
    const today = new Date().toISOString().slice(0, 10);
    const [row] = await ctx.db
      .select({
        id: edition.id,
        year: edition.year,
        startsAt: edition.startsAt,
        endsAt: edition.endsAt,
        venueName: venue.name,
        venueMapsUrl: venue.mapsUrl,
        venuePhotoUrl: venue.photoUrl,
        venueMapsEmbedQuery: venue.mapsEmbedQuery,
      })
      .from(edition)
      .leftJoin(venue, eq(edition.venueId, venue.id))
      .where(and(isNotNull(edition.endsAt), gte(edition.endsAt, today)))
      .orderBy(asc(edition.startsAt))
      .limit(1);
    return row ?? null;
  }),

  /**
   * Every edition, newest first, with its venue and champions — the
   * /editions chronicle. One query; champions grouped in TS afterwards
   * (team_size > 1 = team title, = 1 = individual; unregistered teammates,
   * player_id null, are dropped like everywhere else).
   */
  list: publicProcedure.query(async ({ ctx }): Promise<EditionListItem[]> => {
    const rows = (await ctx.db.execute(sql`
      WITH team_sizes AS (
        SELECT team_id, count(*)::int AS size
        FROM frikiparty_team_member
        GROUP BY team_id
      ),
      champions AS (
        SELECT tr.edition_id, p.name, p.slug, ts.size AS team_size
        FROM frikiparty_tournament tr
        JOIN frikiparty_team t ON t.tournament_id = tr.id
        JOIN frikiparty_team_member tm ON tm.team_id = t.id
        JOIN team_sizes ts ON ts.team_id = t.id
        LEFT JOIN frikiparty_player p ON p.id = tm.player_id
      )
      SELECT
        e.id, e.year, e."order", e.starts_at, e.ends_at,
        v.name AS venue_name,
        c.name AS champion_name, c.slug AS champion_slug, c.team_size
      FROM frikiparty_edition e
      LEFT JOIN frikiparty_venue v ON v.id = e.venue_id
      LEFT JOIN champions c ON c.edition_id = e.id
      ORDER BY e.year DESC, e."order" DESC, c.team_size DESC, c.name ASC
    `)) as unknown as EditionListRow[];

    const today = new Date().toISOString().slice(0, 10);
    const editionsById = new Map<string, EditionListItem>();
    for (const row of rows) {
      let item = editionsById.get(row.id);
      if (!item) {
        item = {
          id: row.id,
          year: row.year,
          order: row.order,
          label: String(row.year),
          startsAt: row.starts_at,
          endsAt: row.ends_at,
          venueName: row.venue_name,
          teamChampions: [],
          individualChampion: null,
          status: editionStatus(row.starts_at, row.ends_at, today),
        };
        editionsById.set(row.id, item);
      }
      if (row.champion_name && row.champion_slug && row.team_size !== null) {
        const champion = { name: row.champion_name, slug: row.champion_slug };
        if (row.team_size > 1) {
          item.teamChampions.push(champion);
        } else {
          item.individualChampion = champion;
        }
      }
    }

    const items = [...editionsById.values()];
    const editionsPerYear = new Map<number, number>();
    for (const item of items) {
      editionsPerYear.set(item.year, (editionsPerYear.get(item.year) ?? 0) + 1);
    }
    for (const item of items) {
      if (item.order > 1 || (editionsPerYear.get(item.year) ?? 0) > 1) {
        const ordinal = ROMAN_ORDINALS[item.order - 1] ?? String(item.order);
        item.label = `${item.year} · ${ordinal}`;
      }
    }
    return items;
  }),

  /**
   * Champions of the most recent edition that has a recorded winner. In the
   * DB a win is a team_member row (see player router): the size>1 team is
   * the team championship, the size-1 team the individual one.
   */
  latestChampions: publicProcedure.query(async ({ ctx }) => {
    const latest = (await ctx.db.execute(sql`
      SELECT e.id, e.year, v.name AS venue_name
      FROM frikiparty_edition e
      LEFT JOIN frikiparty_venue v ON v.id = e.venue_id
      WHERE EXISTS (
        SELECT 1
        FROM frikiparty_tournament tr
        JOIN frikiparty_team t ON t.tournament_id = tr.id
        JOIN frikiparty_team_member tm ON tm.team_id = t.id
        WHERE tr.edition_id = e.id
      )
      ORDER BY e.year DESC, e."order" DESC
      LIMIT 1
    `)) as unknown as { id: string; year: number; venue_name: string | null }[];

    const latestEdition = latest[0];
    if (!latestEdition) {
      return null;
    }

    const rows = (await ctx.db.execute(sql`
      WITH team_sizes AS (
        SELECT team_id, count(*)::int AS size
        FROM frikiparty_team_member
        GROUP BY team_id
      )
      SELECT p.name, ts.size AS team_size
      FROM frikiparty_tournament tr
      JOIN frikiparty_team t ON t.tournament_id = tr.id
      JOIN frikiparty_team_member tm ON tm.team_id = t.id
      JOIN team_sizes ts ON ts.team_id = t.id
      LEFT JOIN frikiparty_player p ON p.id = tm.player_id
      WHERE tr.edition_id = ${latestEdition.id}
      ORDER BY ts.size DESC, p.name ASC
    `)) as unknown as ChampionRow[];

    return {
      year: latestEdition.year,
      venueName: latestEdition.venue_name,
      teamChampions: rows
        .filter((row) => row.team_size > 1 && row.name)
        .map((row) => row.name as string),
      individualChampion:
        rows.find((row) => row.team_size === 1 && row.name)?.name ?? null,
    };
  }),
});

export { editionRouter };
