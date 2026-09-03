import { TRPCError } from '@trpc/server';
import { and, asc, eq, isNotNull, isNull, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { generateLinkCode, normalizeLinkCode } from '@/lib/link-code';
import {
  competitionPositions,
  sortByHistoricalRanking,
} from '@/lib/tournament/ranking';
import {
  adminProcedure,
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
  type TRPCContext,
} from '@/server/api/trpc';
import type { db as Db } from '@/server/db';
import { player, user } from '@/server/db/schema';

type RankingRow = {
  id: string;
  name: string;
  slug: string;
  card_portrait: string | null;
  card_ability: string | null;
  card_ability_text: string | null;
  rings: number;
  individual_rings: number;
};

type RankedPlayer = {
  id: string;
  name: string;
  slug: string;
  cardPortrait: string | null;
  rings: number;
  individualRings: number;
  cardAbility: string | null;
  cardAbilityText: string | null;
};

type TitleRow = {
  year: number;
  order: number;
  game: string | null;
  team_size: number;
  members: { name: string; slug: string | null }[];
  title_venue_name: string | null;
  title_venue_slug: string | null;
  title_venue_is_place: boolean | null;
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
      p.card_ability,
      p.card_ability_text,
      coalesce(sum(CASE WHEN w.size > 1 THEN 1 ELSE 0 END), 0)::int AS rings,
      coalesce(sum(CASE WHEN w.size = 1 THEN 1 ELSE 0 END), 0)::int AS individual_rings
    FROM frikiparty_player p
    LEFT JOIN wins w ON w.player_id = p.id
    GROUP BY p.id, p.name, p.slug, p.card_portrait, p.card_ability, p.card_ability_text
  `)) as unknown as RankingRow[];

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    cardPortrait: row.card_portrait,
    cardAbility: row.card_ability,
    cardAbilityText: row.card_ability_text,
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
      v.name AS title_venue_name,
      v.slug AS title_venue_slug,
      v.is_place AS title_venue_is_place,
      (
        SELECT count(*)::int
        FROM frikiparty_team_member tm2
        WHERE tm2.team_id = tm.team_id
      ) AS team_size,
      (
        -- Draw order: pot by pot (captains first), else the import's seat order.
        SELECT coalesce(
          json_agg(
            json_build_object(
              'name', coalesce(p2.name, '???'),
              'slug', p2.slug
            )
            ORDER BY pp3.pot_index ASC NULLS LAST, tm3.seat ASC NULLS LAST, tm3.created_at ASC, tm3.ctid ASC
          ),
          '[]'::json
        )
        FROM frikiparty_team_member tm3
        LEFT JOIN frikiparty_player p2 ON p2.id = tm3.player_id
        LEFT JOIN frikiparty_team_formation_pot_player pp3
          ON pp3.tournament_id = tm3.tournament_id AND pp3.player_id = tm3.player_id
        WHERE tm3.team_id = tm.team_id
      ) AS members
    FROM frikiparty_team_member tm
    JOIN frikiparty_team t ON t.id = tm.team_id
    JOIN frikiparty_tournament tr ON tr.id = tm.tournament_id
    JOIN frikiparty_edition e ON e.id = tr.edition_id
    LEFT JOIN frikiparty_game g ON g.id = tr.game_id
    LEFT JOIN frikiparty_venue v ON v.id = e.venue_id
    WHERE tm.player_id = ${playerId} AND t.final_position = 1
    ORDER BY e.year DESC, e."order" DESC
  `)) as unknown as TitleRow[];

  return rows.map((row) => ({
    year: row.year,
    order: row.order,
    game: row.game,
    type: row.team_size > 1 ? ('team' as const) : ('individual' as const),
    members: row.members,
    // Edition page slug: "2025" or "2013-2".
    editionSlug: row.order > 1 ? `${row.year}-${row.order}` : String(row.year),
    venueName: row.title_venue_name,
    venueSlug: row.title_venue_slug,
    venueIsPlace: row.title_venue_is_place,
  }));
};

const canEditPlayer = (
  sessionUser: { id: string; role: string } | undefined,
  playerUserId: string | null,
) =>
  sessionUser !== undefined &&
  (sessionUser.role === 'admin' || sessionUser.id === playerUserId);

/**
 * A player's public profile. Pure query (no session) so the page can be
 * built statically; who may edit is resolved client-side via player.mine.
 */
const getPlayerProfile = async (db: TRPCContext['db'], slug: string) => {
  const [row] = await db.select().from(player).where(eq(player.slug, slug));
  if (!row) {
    return null;
  }

  const [allRanked, titles] = await Promise.all([
    fetchRankedPlayers(db),
    fetchTitles(db, row.id),
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
    cardAbility: row.cardAbility,
    cardAbilityText: row.cardAbilityText,
    rings: ranked?.rings ?? 0,
    individualRings: ranked?.individualRings ?? 0,
    position,
    titles,
    // The edit gate resolves client-side (see PlayerProfile) so the
    // page itself can be built statically.
  };
};

const ROMAN_ORDINALS = ['I', 'II', 'III', 'IV', 'V'] as const;

/** One won ring, with everything the ranking tooltip needs. */
type RingTitle = {
  type: 'team' | 'individual';
  /** "2025" or "2013 · II". */
  label: string;
  /** Edition page slug: "2025" or "2013-2". */
  slug: string;
  venueName: string | null;
  /** Winning roster, unknown seats as '???'. */
  members: string[];
};

type RingTitleRow = {
  player_id: string;
  year: number;
  order: number;
  venue_name: string | null;
  team_size: number;
  members: string[];
};

/**
 * Every ring ever won, per player, oldest first — so the nth team ring in
 * a player's count is the nth entry here. Pure query for the static
 * ranking page.
 */
const listRingTitles = async (
  db: typeof Db,
): Promise<Map<string, RingTitle[]>> => {
  const rows = (await db.execute(sql`
    SELECT
      tm.player_id, e.year, e."order",
      v.name AS venue_name,
      (
        SELECT count(*)::int FROM frikiparty_team_member tm2
        WHERE tm2.team_id = tm.team_id
      ) AS team_size,
      (
        -- Draw order: pot by pot (captains first), else the import's seat order.
        SELECT array_agg(
          coalesce(p2.name, '???')
          ORDER BY pp3.pot_index ASC NULLS LAST, tm3.seat ASC NULLS LAST, tm3.created_at ASC, tm3.ctid ASC
        )
        FROM frikiparty_team_member tm3
        LEFT JOIN frikiparty_player p2 ON p2.id = tm3.player_id
        LEFT JOIN frikiparty_team_formation_pot_player pp3
          ON pp3.tournament_id = tm3.tournament_id AND pp3.player_id = tm3.player_id
        WHERE tm3.team_id = tm.team_id
      ) AS members
    FROM frikiparty_team_member tm
    JOIN frikiparty_team t ON t.id = tm.team_id
    JOIN frikiparty_tournament tr ON tr.id = tm.tournament_id
    JOIN frikiparty_edition e ON e.id = tr.edition_id
    LEFT JOIN frikiparty_venue v ON v.id = e.venue_id
    WHERE tm.player_id IS NOT NULL AND t.final_position = 1
    ORDER BY e.year ASC, e."order" ASC
  `)) as unknown as RingTitleRow[];

  const byPlayer = new Map<string, RingTitle[]>();
  for (const row of rows) {
    const titles = byPlayer.get(row.player_id) ?? [];
    titles.push({
      type: row.team_size > 1 ? 'team' : 'individual',
      label:
        row.order > 1
          ? `${row.year} · ${ROMAN_ORDINALS[row.order - 1] ?? row.order}`
          : String(row.year),
      slug: row.order > 1 ? `${row.year}-${row.order}` : String(row.year),
      venueName: row.venue_name,
      members: row.members,
    });
    byPlayer.set(row.player_id, titles);
  }
  return byPlayer;
};

/** Pure queries (no session) so pages can be built statically. */
const listPlayers = (db: TRPCContext['db']) =>
  db
    .select({ id: player.id, name: player.name, slug: player.slug })
    .from(player)
    .orderBy(asc(player.name));

const getHistoricalRanking = (db: TRPCContext['db']) =>
  fetchRankedPlayers(db).then((players) => {
    const byId = new Map(players.map((p) => [p.id, p]));
    return sortByHistoricalRanking(players).map((id) => {
      const p = byId.get(id);
      if (!p) throw new Error(`Ranking produced unknown player id ${id}`);
      return p;
    });
  });

/**
 * Every player with either the account that claimed them or the code an
 * admin can hand out. Codes are minted lazily here for unclaimed players
 * that still lack one, so the admin list is always complete. Admin-only
 * (the caller gates it) — codes are secrets.
 */
const listPlayersForAdmin = async (db: TRPCContext['db']) => {
  const missing = await db
    .select({ id: player.id })
    .from(player)
    .where(and(isNull(player.userId), isNull(player.linkCode)));
  for (const row of missing) {
    await db
      .update(player)
      .set({ linkCode: generateLinkCode() })
      .where(eq(player.id, row.id));
  }
  return db
    .select({
      id: player.id,
      name: player.name,
      slug: player.slug,
      linkCode: player.linkCode,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    })
    .from(player)
    .leftJoin(user, eq(user.id, player.userId))
    .orderBy(asc(player.name));
};

/**
 * Accounts that signed in but never claimed a player, oldest first, plus
 * the players still free to be claimed — the admin matches them by hand.
 */
const listUnlinkedUsers = async (db: TRPCContext['db']) => {
  const [users, freePlayers] = await Promise.all([
    db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      })
      .from(user)
      .leftJoin(player, eq(player.userId, user.id))
      .where(isNull(player.id))
      .orderBy(asc(user.createdAt)),
    db
      .select({ id: player.id, name: player.name })
      .from(player)
      .where(isNull(player.userId))
      .orderBy(asc(player.name)),
  ]);
  return { users, freePlayers };
};

/** The player claimed by this user, if any. */
const getPlayerForUser = async (db: TRPCContext['db'], userId: string) => {
  const [row] = await db
    .select({ id: player.id, slug: player.slug, name: player.name })
    .from(player)
    .where(eq(player.userId, userId));
  return row ?? null;
};

const playerRouter = createTRPCRouter({
  list: publicProcedure.query(({ ctx }) => listPlayers(ctx.db)),

  historicalRanking: publicProcedure.query(({ ctx }) =>
    getHistoricalRanking(ctx.db),
  ),

  bySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      const profile = await getPlayerProfile(ctx.db, input.slug);
      if (!profile) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }
      return profile;
    }),

  /** The signed-in user's own player, or null while unlinked. */
  mine: protectedProcedure.query(({ ctx }) =>
    getPlayerForUser(ctx.db, ctx.session.user.id),
  ),

  /**
   * Claims a player with the one-time code an admin handed out. The code
   * is consumed on success; a user can hold exactly one player and a
   * player exactly one user.
   */
  linkByCode: protectedProcedure
    .input(z.object({ code: z.string().trim().min(1).max(20) }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      if (await getPlayerForUser(ctx.db, userId)) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Tu cuenta ya está vinculada a un jugador.',
        });
      }
      const code = normalizeLinkCode(input.code);
      const [target] = await ctx.db
        .select({ id: player.id, slug: player.slug, userId: player.userId })
        .from(player)
        .where(eq(player.linkCode, code));
      if (!target || target.userId) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Ese código no corresponde a ningún jugador.',
        });
      }
      const [linked] = await ctx.db
        .update(player)
        .set({ userId, linkCode: null })
        .where(and(eq(player.id, target.id), isNull(player.userId)))
        .returning({ id: player.id, slug: player.slug, name: player.name });
      if (!linked) {
        throw new TRPCError({ code: 'CONFLICT' });
      }
      return linked;
    }),

  /** Admin: link an account to a free player by hand, no code involved. */
  linkUser: adminProcedure
    .input(z.object({ userId: z.string().min(1), playerId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      if (await getPlayerForUser(ctx.db, input.userId)) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Esa cuenta ya tiene jugador.',
        });
      }
      const [linked] = await ctx.db
        .update(player)
        .set({ userId: input.userId, linkCode: null })
        .where(and(eq(player.id, input.playerId), isNull(player.userId)))
        .returning({ slug: player.slug, name: player.name });
      if (!linked) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Ese jugador ya está vinculado a otra cuenta.',
        });
      }
      return linked;
    }),

  /**
   * Admin: change an account's role. Admins can't demote themselves, so
   * the site can never end up without one.
   */
  setUserRole: adminProcedure
    .input(
      z.object({
        userId: z.string().min(1),
        role: z.enum(['user', 'editor', 'admin']),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.userId === ctx.session.user.id && input.role !== 'admin') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'No puedes quitarte el rol de admin a ti mismo.',
        });
      }
      const [updated] = await ctx.db
        .update(user)
        .set({ role: input.role })
        .where(eq(user.id, input.userId))
        .returning({ id: user.id, role: user.role });
      if (!updated) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }
      return updated;
    }),

  /**
   * Admin: detach the account from a player. The player gets a fresh code
   * so it can be claimed again; the account keeps its role and history.
   */
  unlinkUser: adminProcedure
    .input(z.object({ playerId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [unlinked] = await ctx.db
        .update(player)
        .set({ userId: null, linkCode: generateLinkCode() })
        .where(and(eq(player.id, input.playerId), isNotNull(player.userId)))
        .returning({ slug: player.slug, name: player.name });
      if (!unlinked) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Ese jugador no tiene ninguna cuenta vinculada.',
        });
      }
      return unlinked;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().trim().min(1).optional(),
        bio: z.string().trim().max(4000).nullable().optional(),
        cardPortrait: z.string().trim().max(64).nullable().optional(),
        cardAbility: z.string().trim().max(80).nullable().optional(),
        cardAbilityText: z.string().trim().max(300).nullable().optional(),
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

      // A curated attack always travels whole: name and definition
      // together, or neither.
      if (
        (input.cardAbility === undefined) !==
          (input.cardAbilityText === undefined) ||
        (input.cardAbility === null) !== (input.cardAbilityText === null)
      ) {
        throw new TRPCError({ code: 'BAD_REQUEST' });
      }

      const { id, ...changes } = input;
      const [updated] = await ctx.db
        .update(player)
        .set(changes)
        .where(eq(player.id, id))
        .returning({
          id: player.id,
          slug: player.slug,
          name: player.name,
          bio: player.bio,
        });
      // Statically built pages that show the player's name or card.
      if (updated) {
        revalidatePath(`/players/${updated.slug}`);
        revalidatePath('/editions/[slug]', 'page');
        revalidatePath('/venues/[slug]', 'page');
        revalidatePath('/');
        revalidatePath('/ranking');
        revalidatePath('/champions');
        revalidatePath('/editions');
        revalidatePath('/venues');
        revalidatePath('/simulator');
      }
      return updated;
    }),
});

export {
  getHistoricalRanking,
  getPlayerForUser,
  getPlayerProfile,
  listPlayers,
  listPlayersForAdmin,
  listRingTitles,
  listUnlinkedUsers,
  playerRouter,
  type RingTitle,
};
