import { TRPCError } from '@trpc/server';
import { and, asc, eq, gte, isNotNull, sql } from 'drizzle-orm';
import { z } from 'zod';

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
  venue_slug: string | null;
  champion_name: string | null;
  champion_slug: string | null;
  team_size: number | null;
};

/**
 * A champion. Some old editions record a winning team whose full roster we
 * never knew: those team_member rows have no player, and surface here with
 * name/slug null so the UI can still show an anonymous champion.
 */
type ChampionRef = { name: string | null; slug: string | null };

type EditionListItem = {
  id: string;
  year: number;
  order: number;
  /** Display label: the year, suffixed "· II" only when the year repeats. */
  label: string;
  /** Detail-page slug: "2025", or "2013-2" for order > 1. */
  slug: string;
  startsAt: string | null;
  endsAt: string | null;
  venueName: string | null;
  venueSlug: string | null;
  teamChampions: ChampionRef[];
  individualChampion: ChampionRef | null;
  status: 'upcoming' | 'live' | 'past';
};

const ROMAN_ORDINALS = ['I', 'II', 'III', 'IV', 'V'] as const;

/**
 * A team member. Old editions have rosters we only half know: those rows
 * carry no player, and keep their seat here with name/slug null so the team
 * is shown at its real size.
 */
type PlayerRef = {
  name: string | null;
  slug: string | null;
  isCaptain: boolean;
};

type EditionTeam = {
  id: string;
  finalPosition: number | null;
  players: PlayerRef[];
};

type FinalGame = { gameNumber: number; winnerTeamId: string | null };

type EditionMatch = {
  id: string;
  teamAId: string | null;
  teamBId: string | null;
  winnerTeamId: string | null;
  games: FinalGame[];
};

/** One bracket round; `gamesToWinMatch` is null when the format wasn't recorded. */
type EditionRound = {
  roundIndex: number;
  gamesToWinMatch: number | null;
  matches: EditionMatch[];
};

type EditionTournament = {
  id: string;
  teams: EditionTeam[];
  /** Bracket rounds in order — the last one holds the final. */
  rounds: EditionRound[];
};

type TeamRow = {
  tournament_id: string;
  team_id: string;
  final_position: number | null;
  is_captain: boolean;
  name: string | null;
  slug: string | null;
  size: number;
};

type PotRow = { pot_index: number; name: string; slug: string };

type BracketRow = {
  tournament_id: string;
  match_id: string;
  round_index: number | null;
  games_to_win_match: number | null;
  team_a_id: string | null;
  team_b_id: string | null;
  winner_team_id: string | null;
  game_number: number | null;
  game_winner_team_id: string | null;
};

/** "2025" or "2013-2" (order > 1). */
const parseEditionSlug = (slug: string): { year: number; order: number } => {
  const match = /^(\d{4})(?:-(\d+))?$/.exec(slug);
  if (!match) {
    throw new TRPCError({ code: 'NOT_FOUND' });
  }
  return { year: Number(match[1]), order: match[2] ? Number(match[2]) : 1 };
};

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
   * (team_size > 1 = team title, = 1 = individual). Champions whose player
   * we never recorded (player_id null) are kept as anonymous refs — the team
   * had that many members even if we can't name them all.
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
        WHERE t.final_position = 1
      )
      SELECT
        e.id, e.year, e."order", e.starts_at, e.ends_at,
        v.name AS venue_name, v.slug AS venue_slug,
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
          slug: row.order > 1 ? `${row.year}-${row.order}` : String(row.year),
          startsAt: row.starts_at,
          endsAt: row.ends_at,
          venueName: row.venue_name,
          venueSlug: row.venue_slug,
          teamChampions: [],
          individualChampion: null,
          status: editionStatus(row.starts_at, row.ends_at, today),
        };
        editionsById.set(row.id, item);
      }
      if (row.team_size !== null) {
        const champion = {
          name: row.champion_name,
          slug: row.champion_slug,
        };
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
   * One edition in full detail: venue, every recorded team of its official
   * tournaments (with captains and final positions), the formation pots and
   * the final matches when known. Old editions may only have the champion
   * team, and even that roster may include members we never recorded
   * (name/slug null) — the page degrades gracefully.
   */
  bySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      const { year, order } = parseEditionSlug(input.slug);
      const [row] = await ctx.db
        .select({
          id: edition.id,
          year: edition.year,
          order: edition.order,
          startsAt: edition.startsAt,
          endsAt: edition.endsAt,
          venueName: venue.name,
          venueSlug: venue.slug,
        })
        .from(edition)
        .leftJoin(venue, eq(edition.venueId, venue.id))
        .where(and(eq(edition.year, year), eq(edition.order, order)));
      if (!row) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }

      const [meta] = (await ctx.db.execute(sql`
        SELECT
          (SELECT count(*)::int FROM frikiparty_edition e2
            WHERE e2.year > ${year} OR (e2.year = ${year} AND e2."order" > ${order})
          ) AS scene_index,
          (SELECT count(*)::int FROM frikiparty_edition e3 WHERE e3.year = ${year}) AS editions_in_year
      `)) as unknown as { scene_index: number; editions_in_year: number }[];
      const label =
        order > 1 || (meta?.editions_in_year ?? 1) > 1
          ? `${year} · ${ROMAN_ORDINALS[order - 1] ?? order}`
          : String(year);

      const teamRows = (await ctx.db.execute(sql`
        WITH team_sizes AS (
          SELECT team_id, count(*)::int AS size
          FROM frikiparty_team_member
          GROUP BY team_id
        )
        SELECT
          tr.id AS tournament_id, t.id AS team_id, t.final_position,
          tm.is_captain, p.name, p.slug, ts.size
        FROM frikiparty_tournament tr
        JOIN frikiparty_team t ON t.tournament_id = tr.id
        JOIN frikiparty_team_member tm ON tm.team_id = t.id
        JOIN team_sizes ts ON ts.team_id = t.id
        LEFT JOIN frikiparty_player p ON p.id = tm.player_id
        WHERE tr.edition_id = ${row.id} AND tr.is_official
        ORDER BY t.final_position ASC NULLS LAST, tm.is_captain DESC, p.name ASC
      `)) as unknown as TeamRow[];

      const tournaments = new Map<string, EditionTournament>();
      const teamsById = new Map<string, EditionTeam>();
      const sizeByTournament = new Map<string, number>();
      for (const teamRow of teamRows) {
        let tournament = tournaments.get(teamRow.tournament_id);
        if (!tournament) {
          tournament = { id: teamRow.tournament_id, teams: [], rounds: [] };
          tournaments.set(teamRow.tournament_id, tournament);
        }
        sizeByTournament.set(
          teamRow.tournament_id,
          Math.max(
            sizeByTournament.get(teamRow.tournament_id) ?? 0,
            teamRow.size,
          ),
        );
        let team = teamsById.get(teamRow.team_id);
        if (!team) {
          team = {
            id: teamRow.team_id,
            finalPosition: teamRow.final_position,
            players: [],
          };
          teamsById.set(teamRow.team_id, team);
          tournament.teams.push(team);
        }
        team.players.push({
          name: teamRow.name,
          slug: teamRow.slug,
          isCaptain: teamRow.is_captain,
        });
      }

      // Every bracket match, grouped into rounds. Old editions only kept the
      // final (a single round); newer ones have the whole knockout.
      const bracketRows = (await ctx.db.execute(sql`
        SELECT
          ph.tournament_id, m.id AS match_id, m.round_index,
          c.games_to_win_match, m.team_a_id, m.team_b_id, m.winner_team_id,
          g.game_number, g.winner_team_id AS game_winner_team_id
        FROM frikiparty_match m
        JOIN frikiparty_phase ph ON ph.id = m.phase_id
        JOIN frikiparty_tournament tr ON tr.id = ph.tournament_id
        LEFT JOIN frikiparty_match_game g ON g.match_id = m.id
        LEFT JOIN frikiparty_phase_bracket_round_config c
          ON c.phase_id = ph.id AND c.round_index = m.round_index
        WHERE tr.edition_id = ${row.id} AND ph.type = 'bracket'
        ORDER BY ph.tournament_id, m.round_index ASC, m.id, g.game_number ASC
      `)) as unknown as BracketRow[];
      const matchesById = new Map<string, EditionMatch>();
      for (const bracketRow of bracketRows) {
        const tournament = tournaments.get(bracketRow.tournament_id);
        if (!tournament) continue;
        let bracketMatch = matchesById.get(bracketRow.match_id);
        if (!bracketMatch) {
          bracketMatch = {
            id: bracketRow.match_id,
            teamAId: bracketRow.team_a_id,
            teamBId: bracketRow.team_b_id,
            winnerTeamId: bracketRow.winner_team_id,
            games: [],
          };
          matchesById.set(bracketRow.match_id, bracketMatch);
          const roundIndex = bracketRow.round_index ?? 1;
          let round = tournament.rounds.find(
            (candidate) => candidate.roundIndex === roundIndex,
          );
          if (!round) {
            round = {
              roundIndex,
              gamesToWinMatch: bracketRow.games_to_win_match,
              matches: [],
            };
            tournament.rounds.push(round);
          }
          round.matches.push(bracketMatch);
        }
        if (bracketRow.game_number !== null) {
          bracketMatch.games.push({
            gameNumber: bracketRow.game_number,
            winnerTeamId: bracketRow.game_winner_team_id,
          });
        }
      }
      for (const tournament of tournaments.values()) {
        tournament.rounds.sort((a, b) => a.roundIndex - b.roundIndex);
        for (const round of tournament.rounds) {
          for (const bracketMatch of round.matches) {
            bracketMatch.games.sort((a, b) => a.gameNumber - b.gameNumber);
          }
        }
        // Read top to bottom: each match sits where its winner shows up in
        // the next round, so the semifinal feeding the final's top side
        // comes first. Matches whose winner didn't go through stay last.
        for (let index = tournament.rounds.length - 2; index >= 0; index -= 1) {
          const round = tournament.rounds[index];
          const next = tournament.rounds[index + 1];
          if (!round || !next) continue;
          const nextTeams = next.matches.flatMap((nextMatch) => [
            nextMatch.teamAId,
            nextMatch.teamBId,
          ]);
          const seat = (bracketMatch: EditionMatch) => {
            const position = nextTeams.indexOf(bracketMatch.winnerTeamId);
            return position === -1 ? Number.MAX_SAFE_INTEGER : position;
          };
          round.matches.sort((a, b) => seat(a) - seat(b));
        }
      }

      const teamTournament =
        [...tournaments.values()].find(
          (t) => (sizeByTournament.get(t.id) ?? 0) > 1,
        ) ?? null;
      const individualTournament =
        [...tournaments.values()].find(
          (t) => (sizeByTournament.get(t.id) ?? 0) === 1,
        ) ?? null;

      const potRows = teamTournament
        ? ((await ctx.db.execute(sql`
            SELECT fp.pot_index, p.name, p.slug
            FROM frikiparty_team_formation_pot_player fp
            JOIN frikiparty_player p ON p.id = fp.player_id
            WHERE fp.tournament_id = ${teamTournament.id}
            ORDER BY fp.pot_index ASC, p.name ASC
          `)) as unknown as PotRow[])
        : [];
      const potsByIndex = new Map<number, { name: string; slug: string }[]>();
      for (const potRow of potRows) {
        const pot = potsByIndex.get(potRow.pot_index) ?? [];
        pot.push({ name: potRow.name, slug: potRow.slug });
        potsByIndex.set(potRow.pot_index, pot);
      }

      return {
        id: row.id,
        year: row.year,
        order: row.order,
        label,
        startsAt: row.startsAt,
        endsAt: row.endsAt,
        venueName: row.venueName,
        venueSlug: row.venueSlug,
        sceneIndex: meta?.scene_index ?? 0,
        teamTournament,
        individualTournament,
        pots: [...potsByIndex.entries()]
          .sort(([a], [b]) => a - b)
          .map(([potIndex, players]) => ({ potIndex, players })),
      };
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
        WHERE tr.edition_id = e.id AND t.final_position = 1
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
      WHERE tr.edition_id = ${latestEdition.id} AND t.final_position = 1
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
