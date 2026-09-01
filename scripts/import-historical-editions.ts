import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { and, eq, or, sql } from 'drizzle-orm';

import { slugify } from '@/lib/slug';
import { db } from '@/server/db';
import {
  edition,
  game,
  match,
  matchGame,
  phase,
  phaseBracketRoundConfig,
  player,
  team,
  teamFormationPotPlayer,
  teamMember,
  tournament,
  venue,
} from '@/server/db/schema';

/**
 * Syncs `data/historical-editions.json` into the DB. Runs on an empty
 * database (creates everything) and on a populated one (adds only what's
 * missing and fills in blanks) — it is idempotent and STRICTLY ADDITIVE:
 * nothing is ever deleted, and a value already recorded is only overwritten
 * when the JSON states something different, never blanked out.
 *
 * A `null` inside a roster is a team member nobody remembers: the seat is
 * kept (team_member with player_id null) so the team keeps its real size.
 *
 * Group phases aren't covered: no edition has a group-stage record yet, and
 * neither are factions per partida — the JSON has no faction data.
 */

type Roster = (string | null)[];

/**
 * A knockout match. Teams are referenced by ANY of their players (the
 * captain by convention; in an individual tournament, the player himself),
 * since teams have no names. `games` lists the winner of each partida in
 * order. A match with an empty teamA/teamB is one still to be filled in: it
 * is skipped with a warning instead of failing the whole import.
 */
type MatchSpec = {
  teamA: string;
  teamB: string;
  winner?: string;
  games?: string[];
};

/**
 * One bracket round. `gamesToWinMatch` is per round because the format can
 * change between them (2 = best of three); omit it when it isn't known.
 */
type RoundSpec = {
  gamesToWinMatch?: number;
  matches: MatchSpec[];
};

/** Bracket rounds in order — the last one is the final. */
type KnockoutSpec = { rounds: RoundSpec[] };

type VenueSpec = {
  name: string;
  description?: string;
  /** false = a label, not a house (no page of its own). Defaults to true. */
  isPlace?: boolean;
};

type HistoricalEdition = {
  year: number;
  order?: number;
  venue?: string;
  mapsUrl?: string;
  startsAt?: string;
  endsAt?: string;
  /** Formation pots, index 0 = cabezas de serie. */
  pots?: string[][];
  /** Every team of the team tournament, captain first. */
  teams?: Roster[];
  winningTeam: Roster;
  runnerUpTeam?: Roster;
  individualChampion?: string;
  individualRunnerUp?: string;
  /** Knockout of the team tournament. */
  knockout?: KnockoutSpec;
  /** Knockout of the individual tournament (one-player "teams"). */
  individualKnockout?: KnockoutSpec;
};

/** Years for which we're confident the game was Age of the Ring — everything else stays unofficial-game (gameId null). */
const AOTR_YEARS = new Set([2024, 2025]);

type TeamRecord = {
  id: string;
  finalPosition: number | null;
  memberIds: string[];
  captainIds: string[];
};

const changes: string[] = [];
const warnings: string[] = [];
const record = (message: string) => {
  changes.push(message);
  console.log(`  ~ ${message}`);
};
const warn = (message: string) => {
  warnings.push(message);
  console.log(`  ! ${message}`);
};

const sameMembers = (a: string[], b: string[]) =>
  a.length === b.length && [...a].sort().join() === [...b].sort().join();

const main = async () => {
  const path = join(import.meta.dirname, 'data/historical-editions.json');
  const { editions, venues = [] } = JSON.parse(readFileSync(path, 'utf-8')) as {
    editions: HistoricalEdition[];
    venues?: VenueSpec[];
  };

  // Fail loudly instead of silently creating a player — the whole point of
  // this check is that every name in the JSON must already exist.
  const allPlayers = await db.select().from(player);
  const playerIdByName = new Map(allPlayers.map((p) => [p.name, p.id]));
  const knockoutNames = (spec: KnockoutSpec | undefined): string[] =>
    (spec?.rounds ?? [])
      .flatMap((round) => round.matches)
      .flatMap((m) => [m.teamA, m.teamB, m.winner ?? '', ...(m.games ?? [])]);
  const namesOf = (entry: HistoricalEdition): string[] =>
    [
      ...entry.winningTeam,
      ...(entry.runnerUpTeam ?? []),
      ...(entry.teams ?? []).flat(),
      ...(entry.pots ?? []).flat(),
      entry.individualChampion ?? null,
      entry.individualRunnerUp ?? null,
      ...knockoutNames(entry.knockout),
      ...knockoutNames(entry.individualKnockout),
    ]
      .filter((name): name is string => name !== null)
      .filter((name) => name.trim() !== '');
  const unknownNames = new Set(
    editions.flatMap(namesOf).filter((name) => !playerIdByName.has(name)),
  );
  if (unknownNames.size > 0) {
    throw new Error(
      `Unknown player name(s), not importing anything: ${[...unknownNames].join(', ')}`,
    );
  }
  const playerId = (name: string): string => {
    const id = playerIdByName.get(name);
    if (!id) throw new Error(`Unknown player name: ${name}`);
    return id;
  };
  const rosterIds = (roster: Roster): string[] =>
    roster.filter((name): name is string => name !== null).map(playerId);

  let aotrGameId: string | null = null;
  const getAotrGameId = async () => {
    if (aotrGameId) return aotrGameId;
    const [existing] = await db
      .select({ id: game.id })
      .from(game)
      .where(eq(game.name, 'Age of the Ring'));
    if (existing) {
      aotrGameId = existing.id;
      return existing.id;
    }
    const [row] = await db
      .insert(game)
      .values({ name: 'Age of the Ring', isOfficial: true })
      .returning({ id: game.id });
    if (!row) throw new Error('Failed to insert game "Age of the Ring"');
    aotrGameId = row.id;
    return row.id;
  };

  const uniqueVenueSlug = async (name: string, keepId?: string) => {
    const base = slugify(name);
    const taken = new Set(
      (await db.select({ id: venue.id, slug: venue.slug }).from(venue))
        .filter((row) => row.id !== keepId)
        .map((row) => row.slug),
    );
    let candidate = base;
    let suffix = 2;
    while (taken.has(candidate)) {
      candidate = `${base}-${suffix}`;
      suffix += 1;
    }
    return candidate;
  };

  /** Venues are renamed in place when only this edition uses them — the row IS the same house, just better known now. */
  const syncVenue = async (
    entry: HistoricalEdition,
    label: string,
    editionRow: { id: string; venueId: string | null },
  ) => {
    if (!entry.venue) return;
    const [current] = editionRow.venueId
      ? await db.select().from(venue).where(eq(venue.id, editionRow.venueId))
      : [];

    if (current && current.name === entry.venue) {
      if (entry.mapsUrl && current.mapsUrl !== entry.mapsUrl) {
        await db
          .update(venue)
          .set({ mapsUrl: entry.mapsUrl })
          .where(eq(venue.id, current.id));
        record(`${label}: maps URL of "${current.name}" updated`);
      }
      return;
    }

    const [named] = await db
      .select()
      .from(venue)
      .where(eq(venue.name, entry.venue));
    if (named) {
      await db
        .update(edition)
        .set({ venueId: named.id })
        .where(eq(edition.id, editionRow.id));
      record(`${label}: venue set to existing "${named.name}"`);
      if (entry.mapsUrl && named.mapsUrl !== entry.mapsUrl) {
        await db
          .update(venue)
          .set({ mapsUrl: entry.mapsUrl })
          .where(eq(venue.id, named.id));
        record(`${label}: maps URL of "${named.name}" updated`);
      }
      return;
    }

    if (current) {
      const [usage] = (await db.execute(sql`
        SELECT count(*)::int AS users FROM frikiparty_edition
        WHERE venue_id = ${current.id}
      `)) as unknown as { users: number }[];
      const users = usage?.users ?? 0;
      if (users > 1) {
        warn(
          `${label}: venue "${current.name}" is shared by ${users} editions — not renaming it to "${entry.venue}", do it by hand if intended`,
        );
        return;
      }
      await db
        .update(venue)
        .set({
          name: entry.venue,
          slug: await uniqueVenueSlug(entry.venue, current.id),
          mapsUrl: entry.mapsUrl ?? current.mapsUrl,
        })
        .where(eq(venue.id, current.id));
      record(`${label}: venue "${current.name}" renamed to "${entry.venue}"`);
      return;
    }

    const [created] = await db
      .insert(venue)
      .values({
        name: entry.venue,
        slug: await uniqueVenueSlug(entry.venue),
        mapsUrl: entry.mapsUrl,
      })
      .returning({ id: venue.id });
    if (!created) throw new Error(`Failed to insert venue "${entry.venue}"`);
    await db
      .update(edition)
      .set({ venueId: created.id })
      .where(eq(edition.id, editionRow.id));
    record(`${label}: venue "${entry.venue}" created and linked`);
  };

  const loadTeams = async (tournamentId: string): Promise<TeamRecord[]> => {
    const rows = (await db.execute(sql`
      SELECT t.id, t.final_position,
        coalesce(array_agg(tm.player_id) FILTER (WHERE tm.player_id IS NOT NULL), '{}') AS member_ids,
        coalesce(array_agg(tm.player_id) FILTER (WHERE tm.is_captain), '{}') AS captain_ids
      FROM frikiparty_team t
      LEFT JOIN frikiparty_team_member tm ON tm.team_id = t.id
      WHERE t.tournament_id = ${tournamentId}
      GROUP BY t.id, t.final_position
    `)) as unknown as {
      id: string;
      final_position: number | null;
      member_ids: string[];
      captain_ids: string[];
    }[];
    return rows.map((row) => ({
      id: row.id,
      finalPosition: row.final_position,
      memberIds: row.member_ids,
      captainIds: row.captain_ids,
    }));
  };

  /**
   * A one-player team only exists to hold a placement: once the JSON gives
   * that placement to somebody else, and nothing else references the team,
   * it has no reason to stay.
   */
  const dropDisplacedTeam = async (
    teams: TeamRecord[],
    teamRecord: TeamRecord,
    label: string,
  ) => {
    if (teamRecord.memberIds.length !== 1) return;
    const [inAMatch] = await db
      .select({ id: match.id })
      .from(match)
      .where(
        or(
          eq(match.teamAId, teamRecord.id),
          eq(match.teamBId, teamRecord.id),
          eq(match.winnerTeamId, teamRecord.id),
        ),
      )
      .limit(1);
    const [inAGame] = await db
      .select({ id: matchGame.id })
      .from(matchGame)
      .where(eq(matchGame.winnerTeamId, teamRecord.id))
      .limit(1);
    if (inAMatch || inAGame) return;
    await db.delete(teamMember).where(eq(teamMember.teamId, teamRecord.id));
    await db.delete(team).where(eq(team.id, teamRecord.id));
    teams.splice(teams.indexOf(teamRecord), 1);
    record(`${label}: displaced one-player team removed`);
  };

  /**
   * The JSON is the source of truth: whoever else held this position loses
   * it (the team row stays, only its placement is cleared) and a placement
   * already recorded on this team is overwritten rather than kept.
   */
  const setFinalPosition = async (
    teams: TeamRecord[],
    teamRecord: TeamRecord,
    position: number,
    label: string,
    what: string,
    dropDisplaced = false,
  ) => {
    for (const other of [...teams]) {
      if (other.id === teamRecord.id || other.finalPosition !== position) {
        continue;
      }
      await db
        .update(team)
        .set({ finalPosition: null })
        .where(eq(team.id, other.id));
      other.finalPosition = null;
      record(
        `${label}: final position ${position} taken away from the previously recorded team — the JSON now gives it to ${what}`,
      );
      if (dropDisplaced) await dropDisplacedTeam(teams, other, label);
    }
    if (teamRecord.finalPosition === position) return;
    const previous = teamRecord.finalPosition;
    await db
      .update(team)
      .set({ finalPosition: position })
      .where(eq(team.id, teamRecord.id));
    teamRecord.finalPosition = position;
    record(
      previous === null
        ? `${label}: ${what} marked as final position ${position}`
        : `${label}: ${what} moved from final position ${previous} to ${position}`,
    );
  };

  const ensureTeam = async (
    teams: TeamRecord[],
    tournamentId: string,
    roster: Roster,
    label: string,
    what: string,
    captainFirst: boolean,
  ): Promise<TeamRecord> => {
    const ids = rosterIds(roster);
    const existing = teams.find((candidate) =>
      sameMembers(candidate.memberIds, ids),
    );
    if (existing) {
      if (captainFirst && roster[0]) {
        const captainId = playerId(roster[0]);
        if (existing.captainIds.length === 0) {
          await db
            .update(teamMember)
            .set({ isCaptain: true })
            .where(
              and(
                eq(teamMember.teamId, existing.id),
                eq(teamMember.playerId, captainId),
              ),
            );
          existing.captainIds = [captainId];
          record(`${label}: ${roster[0]} marked as captain of ${what}`);
        } else if (!existing.captainIds.includes(captainId)) {
          warn(
            `${label}: ${what} already has a different captain recorded — leaving it alone`,
          );
        }
      }
      return existing;
    }

    const [row] = await db
      .insert(team)
      .values({ tournamentId })
      .returning({ id: team.id });
    if (!row) throw new Error(`Failed to insert team for ${label}`);
    await db.insert(teamMember).values(
      roster.map((name, index) => ({
        teamId: row.id,
        tournamentId,
        playerId: name ? playerId(name) : null,
        isCaptain: captainFirst && index === 0,
      })),
    );
    const created: TeamRecord = {
      id: row.id,
      finalPosition: null,
      memberIds: ids,
      captainIds: captainFirst && roster[0] ? [playerId(roster[0])] : [],
    };
    teams.push(created);
    record(
      `${label}: ${what} created — ${roster.map((name) => name ?? '???').join(', ')}`,
    );
    return created;
  };

  /**
   * Two teams sharing a final position means the JSON changed its mind about
   * who finished there: the new team was added (this script never deletes)
   * and the old one is still standing. Only a human can say which is right.
   */
  const checkPositions = (teams: TeamRecord[], label: string, what: string) => {
    const byPosition = new Map<number, TeamRecord[]>();
    for (const teamRecord of teams) {
      if (teamRecord.finalPosition === null) continue;
      const bucket = byPosition.get(teamRecord.finalPosition) ?? [];
      bucket.push(teamRecord);
      byPosition.set(teamRecord.finalPosition, bucket);
    }
    for (const [position, bucket] of byPosition) {
      if (bucket.length > 1) {
        warn(
          `${label}: ${bucket.length} ${what} teams share final position ${position} — check which one is right`,
        );
      }
    }
  };

  const resolveTeam = (
    teams: TeamRecord[],
    name: string,
    label: string,
  ): TeamRecord => {
    const id = playerId(name);
    const found = teams.find((candidate) => candidate.memberIds.includes(id));
    if (!found) {
      throw new Error(
        `${label}: no team of ${name} to build the knockout with`,
      );
    }
    return found;
  };

  /**
   * Bracket rounds, in JSON order: round 1 first, the final last. The phase
   * is created with phaseOrder 2 on purpose — order 1 stays free for the
   * group phase if its record ever gets reconstructed.
   */
  const syncKnockout = async (
    spec: KnockoutSpec,
    tournamentId: string,
    teams: TeamRecord[],
    label: string,
    what: string,
  ) => {
    const [existingPhase] = await db
      .select({ id: phase.id })
      .from(phase)
      .where(
        and(eq(phase.tournamentId, tournamentId), eq(phase.type, 'bracket')),
      );
    // Created on demand: an empty bracket phase would make the tournament
    // look like it has a full phase/match record when it doesn't.
    let phaseId = existingPhase?.id ?? null;
    const getPhaseId = async (): Promise<string> => {
      if (phaseId) return phaseId;
      const [created] = await db
        .insert(phase)
        .values({ tournamentId, phaseOrder: 2, type: 'bracket' })
        .returning({ id: phase.id });
      if (!created) throw new Error(`Failed to insert ${what} phase`);
      phaseId = created.id;
      record(`${label}: ${what} bracket phase created`);
      return created.id;
    };

    const matches = phaseId
      ? await db
          .select({
            id: match.id,
            roundIndex: match.roundIndex,
            teamAId: match.teamAId,
            teamBId: match.teamBId,
            winnerTeamId: match.winnerTeamId,
            feederMatchAId: match.feederMatchAId,
            feederMatchBId: match.feederMatchBId,
          })
          .from(match)
          .where(eq(match.phaseId, phaseId))
      : [];

    for (const [index, round] of spec.rounds.entries()) {
      const roundIndex = index + 1;
      const isFinal = index === spec.rounds.length - 1;
      const roundName = isFinal ? 'final' : `round ${roundIndex}`;

      for (const spec_ of round.matches) {
        if (!spec_.teamA.trim() || !spec_.teamB.trim()) {
          warn(
            `${label}: a ${what} ${roundName} match is still empty — skipped`,
          );
          continue;
        }
        const teamA = resolveTeam(teams, spec_.teamA, label);
        const teamB = resolveTeam(teams, spec_.teamB, label);
        const winner = spec_.winner?.trim()
          ? resolveTeam(teams, spec_.winner, label)
          : null;
        const pairing = `${spec_.teamA} vs ${spec_.teamB}`;

        let row = matches.find(
          (candidate) =>
            (candidate.teamAId === teamA.id &&
              candidate.teamBId === teamB.id) ||
            (candidate.teamAId === teamB.id && candidate.teamBId === teamA.id),
        );
        if (!row) {
          const [created] = await db
            .insert(match)
            .values({
              phaseId: await getPhaseId(),
              teamAId: teamA.id,
              teamBId: teamB.id,
              winnerTeamId: winner?.id ?? null,
              status: winner ? 'completed' : 'scheduled',
              roundIndex,
            })
            .returning({ id: match.id });
          if (!created) throw new Error(`Failed to insert ${what} match`);
          row = {
            id: created.id,
            roundIndex,
            teamAId: teamA.id,
            teamBId: teamB.id,
            winnerTeamId: winner?.id ?? null,
            feederMatchAId: null,
            feederMatchBId: null,
          };
          matches.push(row);
          record(`${label}: ${what} ${roundName} — ${pairing} recorded`);
        } else if (winner && !row.winnerTeamId) {
          await db
            .update(match)
            .set({ winnerTeamId: winner.id, status: 'completed' })
            .where(eq(match.id, row.id));
          row.winnerTeamId = winner.id;
          record(`${label}: ${what} ${roundName} — winner of ${pairing} set`);
        }

        if (spec_.games && spec_.games.length > 0) {
          const played = await db
            .select({ id: matchGame.id })
            .from(matchGame)
            .where(eq(matchGame.matchId, row.id));
          if (played.length === 0) {
            await db.insert(matchGame).values(
              spec_.games.map((gameWinner, gameIndex) => ({
                matchId: row.id,
                gameNumber: gameIndex + 1,
                winnerTeamId: resolveTeam(teams, gameWinner, label).id,
              })),
            );
            record(
              `${label}: ${what} ${roundName} — ${spec_.games.length} partida(s) of ${pairing} recorded`,
            );
          }
        }
      }

      if (round.gamesToWinMatch && phaseId) {
        const [config] = await db
          .select({ id: phaseBracketRoundConfig.id })
          .from(phaseBracketRoundConfig)
          .where(
            and(
              eq(phaseBracketRoundConfig.phaseId, phaseId),
              eq(phaseBracketRoundConfig.roundIndex, roundIndex),
            ),
          );
        if (!config) {
          await db.insert(phaseBracketRoundConfig).values({
            phaseId,
            roundIndex,
            gamesToWinMatch: round.gamesToWinMatch,
          });
          record(
            `${label}: ${what} ${roundName} set to best of ${round.gamesToWinMatch * 2 - 1}`,
          );
        }
      }
    }

    // Bracket progression: a match's feeders are the previous round's
    // matches won by each of its two teams.
    for (const row of matches) {
      if (!row.roundIndex || row.roundIndex < 2) continue;
      if (row.feederMatchAId && row.feederMatchBId) continue;
      const previous = matches.filter(
        (candidate) => candidate.roundIndex === (row.roundIndex ?? 0) - 1,
      );
      const feederA = previous.find((c) => c.winnerTeamId === row.teamAId);
      const feederB = previous.find((c) => c.winnerTeamId === row.teamBId);
      if (!feederA && !feederB) continue;
      await db
        .update(match)
        .set({
          feederMatchAId: row.feederMatchAId ?? feederA?.id ?? null,
          feederMatchBId: row.feederMatchBId ?? feederB?.id ?? null,
        })
        .where(eq(match.id, row.id));
      row.feederMatchAId = row.feederMatchAId ?? feederA?.id ?? null;
      row.feederMatchBId = row.feederMatchBId ?? feederB?.id ?? null;
      record(`${label}: ${what} bracket progression linked`);
    }
  };

  for (const entry of editions) {
    const order = entry.order ?? 1;
    const label = `${entry.year}${order > 1 ? ` · #${order}` : ''}`;
    console.log(`\n${label}`);

    const [existingEdition] = await db
      .select()
      .from(edition)
      .where(and(eq(edition.year, entry.year), eq(edition.order, order)));
    let editionRow = existingEdition;
    if (!editionRow) {
      const [created] = await db
        .insert(edition)
        .values({ year: entry.year, order })
        .returning();
      if (!created) throw new Error(`Failed to insert edition ${label}`);
      editionRow = created;
      record(`${label}: edition created`);
    }

    await syncVenue(entry, label, editionRow);

    const dates: { startsAt?: string; endsAt?: string } = {};
    if (entry.startsAt && editionRow.startsAt !== entry.startsAt) {
      dates.startsAt = entry.startsAt;
    }
    if (entry.endsAt && editionRow.endsAt !== entry.endsAt) {
      dates.endsAt = entry.endsAt;
    }
    if (Object.keys(dates).length > 0) {
      await db.update(edition).set(dates).where(eq(edition.id, editionRow.id));
      record(
        `${label}: dates set to ${entry.startsAt ?? editionRow.startsAt} → ${entry.endsAt ?? editionRow.endsAt}`,
      );
    }

    const gameId = AOTR_YEARS.has(entry.year) ? await getAotrGameId() : null;
    const tournamentRows = (await db.execute(sql`
      SELECT tr.id, coalesce(max(sizes.members), 0)::int AS max_members
      FROM frikiparty_tournament tr
      LEFT JOIN (
        SELECT t.id, t.tournament_id, count(tm.id)::int AS members
        FROM frikiparty_team t
        LEFT JOIN frikiparty_team_member tm ON tm.team_id = t.id
        GROUP BY t.id
      ) sizes ON sizes.tournament_id = tr.id
      WHERE tr.edition_id = ${editionRow.id} AND tr.is_official
      GROUP BY tr.id
    `)) as unknown as { id: string; max_members: number }[];

    const newTournament = async (what: string) => {
      const [row] = await db
        .insert(tournament)
        .values({ editionId: editionRow.id, gameId, isOfficial: true })
        .returning({ id: tournament.id });
      if (!row) throw new Error(`Failed to insert ${what} for ${label}`);
      record(`${label}: ${what} created`);
      return row.id;
    };

    // --- Team tournament: every roster we know, then the known positions.
    const teamTournamentId =
      tournamentRows.find((row) => row.max_members > 1)?.id ??
      (await newTournament('team tournament'));
    const teams = await loadTeams(teamTournamentId);
    if (entry.teams) {
      for (const roster of entry.teams) {
        await ensureTeam(
          teams,
          teamTournamentId,
          roster,
          label,
          `team of ${roster[0] ?? '???'}`,
          true,
        );
      }
    }
    const champions = await ensureTeam(
      teams,
      teamTournamentId,
      entry.winningTeam,
      label,
      'champion team',
      Boolean(entry.teams),
    );
    await setFinalPosition(teams, champions, 1, label, 'champion team');
    if (entry.runnerUpTeam) {
      const runnersUp = await ensureTeam(
        teams,
        teamTournamentId,
        entry.runnerUpTeam,
        label,
        'runner-up team',
        Boolean(entry.teams),
      );
      await setFinalPosition(teams, runnersUp, 2, label, 'runner-up team');
    }

    // --- Formation pots: only ever filled in when the tournament has none.
    if (entry.pots) {
      const existingPots = await db
        .select({ id: teamFormationPotPlayer.id })
        .from(teamFormationPotPlayer)
        .where(eq(teamFormationPotPlayer.tournamentId, teamTournamentId));
      if (existingPots.length === 0) {
        await db.insert(teamFormationPotPlayer).values(
          entry.pots.flatMap((names, potIndex) =>
            names.map((name) => ({
              tournamentId: teamTournamentId,
              potIndex,
              playerId: playerId(name),
            })),
          ),
        );
        record(`${label}: ${entry.pots.flat().length} pot placements imported`);
      } else if (existingPots.length !== entry.pots.flat().length) {
        warn(
          `${label}: pots already recorded (${existingPots.length} placements) but the JSON lists ${entry.pots.flat().length} — left untouched`,
        );
      }
    }

    // --- Team knockout: semifinals, final and their partidas when known.
    if (entry.knockout) {
      await syncKnockout(
        entry.knockout,
        teamTournamentId,
        teams,
        label,
        'team',
      );
    }

    checkPositions(teams, label, 'team');

    // --- Individual tournament: one-player "teams", champion and runner-up.
    if (entry.individualChampion || entry.individualRunnerUp) {
      const individualTournamentId =
        tournamentRows.find(
          (row) => row.max_members === 1 && row.id !== teamTournamentId,
        )?.id ?? (await newTournament('individual tournament'));
      const individualTeams = await loadTeams(individualTournamentId);
      const positions: [string | undefined, number, string][] = [
        [entry.individualChampion, 1, 'individual champion'],
        [entry.individualRunnerUp, 2, 'individual runner-up'],
      ];
      for (const [name, position, what] of positions) {
        if (!name) continue;
        const teamRecord = await ensureTeam(
          individualTeams,
          individualTournamentId,
          [name],
          label,
          `${what} (${name})`,
          false,
        );
        await setFinalPosition(
          individualTeams,
          teamRecord,
          position,
          label,
          `${what} (${name})`,
          true,
        );
      }
      checkPositions(individualTeams, label, 'individual');
      if (entry.individualKnockout) {
        await syncKnockout(
          entry.individualKnockout,
          individualTournamentId,
          individualTeams,
          label,
          'individual',
        );
      }
    }
  }

  // --- Venue details. The web editor is the source of truth for venues:
  // this pass only fills blanks (fresh database) and warns on divergence
  // instead of overwriting hand-edited values.
  console.log('\nVenues');
  for (const spec of venues) {
    const [row] = await db
      .select()
      .from(venue)
      .where(eq(venue.name, spec.name));
    if (!row) {
      warn(`venue "${spec.name}" is not used by any edition — skipped`);
      continue;
    }
    const description = spec.description?.trim() || null;
    if (description && row.description === null) {
      await db.update(venue).set({ description }).where(eq(venue.id, row.id));
      record(`venue "${spec.name}": description filled in`);
    } else if (description && description !== row.description) {
      warn(
        `venue "${spec.name}": description differs from the JSON — kept the DB one (edited on the web)`,
      );
    }
    const isPlace = spec.isPlace ?? true;
    if (isPlace !== row.isPlace) {
      warn(
        `venue "${spec.name}": isPlace differs from the JSON (db=${row.isPlace}) — kept the DB one`,
      );
    }
  }

  console.log(
    `\nDone: ${editions.length} editions checked, ${changes.length} change(s) applied.`,
  );
  if (warnings.length > 0) {
    console.log(`${warnings.length} warning(s):`);
    for (const message of warnings) console.log(`  ! ${message}`);
  }
};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
