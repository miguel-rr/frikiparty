import { TRPCError } from '@trpc/server';
import { asc, eq, sql } from 'drizzle-orm';
import { z } from 'zod';

import {
  competitionPositions,
  sortByHistoricalRanking,
} from '@/lib/tournament/ranking';
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from '@/server/api/trpc';
import type { db as Db } from '@/server/db';
import { player } from '@/server/db/schema';

type RankingRow = {
  id: string;
  name: string;
  slug: string;
  card_portrait: string | null;
  card_lore: string | null;
  rings: number;
  individual_rings: number;
};

type RankedPlayer = {
  id: string;
  name: string;
  slug: string;
  cardPortrait: string | null;
  cardLore: string | null;
  rings: number;
  individualRings: number;
};

type TitleRow = {
  year: number;
  order: number;
  game: string | null;
  team_size: number;
};

/**
 * rings/individualRings are derived, never stored — see
 * .claude/data-model.md. A win is a team_member row; whether it counts as a
 * "ring" or an "individual ring" is derived from that team's size (1 =
 * individual tournament, since a team is just "players grouped for a
 * tournament" and an individual champion is a team of one). Fetches every
 * player — fine at this scale (a few dozen players), and lets both the
 * ranking list and a single player's page share one query.
 */
const fetchRankedPlayers = async (db: typeof Db): Promise<RankedPlayer[]> => {
  const rows = (await db.execute(sql`
    WITH team_sizes AS (
      SELECT team_id, count(*)::int AS size
      FROM frikiparty_team_member
      GROUP BY team_id
    ),
    wins AS (
      SELECT tm.player_id, ts.size
      FROM frikiparty_team_member tm
      JOIN frikiparty_team t ON t.id = tm.team_id
      JOIN team_sizes ts ON ts.team_id = tm.team_id
      -- Champions only. Fallback semantics: with a full phase/match record
      -- this should derive from results instead (not implemented yet).
      WHERE tm.player_id IS NOT NULL AND t.final_position = 1
    )
    SELECT
      p.id,
      p.name,
      p.slug,
      p.card_portrait,
      p.card_lore,
      coalesce(sum(CASE WHEN w.size > 1 THEN 1 ELSE 0 END), 0)::int AS rings,
      coalesce(sum(CASE WHEN w.size = 1 THEN 1 ELSE 0 END), 0)::int AS individual_rings
    FROM frikiparty_player p
    LEFT JOIN wins w ON w.player_id = p.id
    GROUP BY p.id, p.name, p.slug, p.card_portrait, p.card_lore
  `)) as unknown as RankingRow[];

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    cardPortrait: row.card_portrait,
    cardLore: row.card_lore,
    rings: row.rings,
    individualRings: row.individual_rings,
  }));
};

/** One row per official tournament this player's team WON (final_position 1; team and individual alike). */
const fetchTitles = async (db: typeof Db, playerId: string) => {
  const rows = (await db.execute(sql`
    SELECT
      e.year,
      e."order",
      g.name AS game,
      (
        SELECT count(*)::int
        FROM frikiparty_team_member tm2
        WHERE tm2.team_id = tm.team_id
      ) AS team_size
    FROM frikiparty_team_member tm
    JOIN frikiparty_team t ON t.id = tm.team_id
    JOIN frikiparty_tournament tr ON tr.id = tm.tournament_id
    JOIN frikiparty_edition e ON e.id = tr.edition_id
    LEFT JOIN frikiparty_game g ON g.id = tr.game_id
    WHERE tm.player_id = ${playerId} AND t.final_position = 1
    ORDER BY e.year DESC, e."order" DESC
  `)) as unknown as TitleRow[];

  return rows.map((row) => ({
    year: row.year,
    order: row.order,
    game: row.game,
    type: row.team_size > 1 ? ('team' as const) : ('individual' as const),
  }));
};

const canEditPlayer = (
  sessionUser: { id: string; role: string } | undefined,
  playerUserId: string | null,
) =>
  sessionUser !== undefined &&
  (sessionUser.role === 'admin' || sessionUser.id === playerUserId);

const playerRouter = createTRPCRouter({
  list: publicProcedure.query(({ ctx }) =>
    ctx.db
      .select({ id: player.id, name: player.name })
      .from(player)
      .orderBy(asc(player.name)),
  ),

  historicalRanking: publicProcedure.query(({ ctx }) =>
    fetchRankedPlayers(ctx.db).then((players) => {
      const byId = new Map(players.map((p) => [p.id, p]));
      return sortByHistoricalRanking(players).map((id) => {
        const p = byId.get(id);
        if (!p) throw new Error(`Ranking produced unknown player id ${id}`);
        return p;
      });
    }),
  ),

  bySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select()
        .from(player)
        .where(eq(player.slug, input.slug));
      if (!row) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }

      const [allRanked, titles] = await Promise.all([
        fetchRankedPlayers(ctx.db),
        fetchTitles(ctx.db, row.id),
      ]);
      const rankedIndex = allRanked.findIndex((p) => p.id === row.id);
      const ranked = rankedIndex >= 0 ? allRanked[rankedIndex] : null;
      // Shared "1224" competition positions (individual rings break ties),
      // so the profile matches the podium and the ranking table.
      const position = ranked
        ? (competitionPositions(allRanked)[rankedIndex] ?? null)
        : null;

      return {
        id: row.id,
        slug: row.slug,
        name: row.name,
        bio: row.bio,
        cardPortrait: row.cardPortrait,
        cardLore: row.cardLore,
        rings: ranked?.rings ?? 0,
        individualRings: ranked?.individualRings ?? 0,
        position,
        titles,
        canEdit: canEditPlayer(ctx.session?.user, row.userId),
      };
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().trim().min(1).optional(),
        bio: z.string().trim().max(4000).nullable().optional(),
        cardPortrait: z.string().trim().max(64).nullable().optional(),
        cardLore: z.string().trim().max(120).nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select({ userId: player.userId })
        .from(player)
        .where(eq(player.id, input.id));
      if (!row) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }
      if (!canEditPlayer(ctx.session.user, row.userId)) {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }

      const { id, ...changes } = input;
      const [updated] = await ctx.db
        .update(player)
        .set(changes)
        .where(eq(player.id, id))
        .returning({ id: player.id, name: player.name, bio: player.bio });
      return updated;
    }),
});

export { playerRouter };
