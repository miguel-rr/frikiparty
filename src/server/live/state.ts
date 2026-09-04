import { and, asc, desc, eq, gte, isNotNull, ne, sql } from 'drizzle-orm';

import type { db as Db } from '@/server/db';
import {
  edition,
  editionPlayer,
  game,
  gameVersion,
  liveVersion,
  player,
  type TournamentStage,
  team,
  teamMember,
  tournament,
  tournamentRankingSnapshot,
  user,
} from '@/server/db/schema';

type Database = typeof Db;

/**
 * The tournament the live module is about: the newest one created through
 * the app (stage set) for the edition that lies ahead or is running. Null
 * when nothing is being prepared — /council then shows the door.
 */
const getCurrentTournament = async (db: Database) => {
  const today = new Date().toISOString().slice(0, 10);
  const [row] = await db
    .select({
      id: tournament.id,
      stage: tournament.stage,
      stageChangedAt: tournament.stageChangedAt,
      kind: tournament.kind,
      editionId: edition.id,
      editionYear: edition.year,
      editionOrder: edition.order,
    })
    .from(tournament)
    .innerJoin(edition, eq(edition.id, tournament.editionId))
    .where(
      and(
        isNotNull(tournament.stage),
        isNotNull(edition.endsAt),
        gte(edition.endsAt, today),
      ),
    )
    .orderBy(asc(edition.startsAt), desc(tournament.createdAt))
    .limit(1);
  if (!row?.stage) return null;
  return {
    ...row,
    stage: row.stage,
    editionSlug:
      row.editionOrder > 1
        ? `${row.editionYear}-${row.editionOrder}`
        : String(row.editionYear),
  };
};

/** Public once the admin has given the tournament its start. */
const isPublicStage = (stage: TournamentStage) => stage !== 'setup';

type Participant = {
  id: string;
  name: string;
  slug: string;
  position: number;
  rings: number;
  individualRings: number;
  /** Has an account claimed this player (so they can act in the app). */
  hasAccount: boolean;
};

/**
 * Everything the live views need about a tournament in one read; grows
 * with each phase of the live plan. Participants come from the ranking
 * snapshot, which is also the participant list (regenerated on every
 * roster change until formation).
 */
const getLiveState = async (db: Database, tournamentId: string) => {
  const [head] = await db
    .select({
      id: tournament.id,
      stage: tournament.stage,
      stageChangedAt: tournament.stageChangedAt,
      kind: tournament.kind,
      isOfficial: tournament.isOfficial,
      model: tournament.model,
      teamSize: tournament.teamSize,
      rankingSource: tournament.rankingSource,
      historicalWeightPercent: tournament.historicalWeightPercent,
      formationMethod: tournament.formationMethod,
      captainPotIndex: tournament.captainPotIndex,
      gameId: tournament.gameId,
      gameName: game.name,
      gameVersion: gameVersion.version,
      editionId: edition.id,
      editionYear: edition.year,
      editionOrder: edition.order,
      editionStartsAt: edition.startsAt,
      editionEndsAt: edition.endsAt,
    })
    .from(tournament)
    .innerJoin(edition, eq(edition.id, tournament.editionId))
    .leftJoin(game, eq(game.id, tournament.gameId))
    .leftJoin(gameVersion, eq(gameVersion.id, tournament.gameVersionId))
    .where(eq(tournament.id, tournamentId));
  if (!head?.stage) return null;

  const [participants, teams, [versionRow]] = await Promise.all([
    db
      .select({
        id: player.id,
        name: player.name,
        slug: player.slug,
        position: tournamentRankingSnapshot.position,
        rings: tournamentRankingSnapshot.rings,
        individualRings: tournamentRankingSnapshot.individualRings,
        hasAccount: sql<boolean>`${player.userId} IS NOT NULL`,
      })
      .from(tournamentRankingSnapshot)
      .innerJoin(player, eq(player.id, tournamentRankingSnapshot.playerId))
      .where(eq(tournamentRankingSnapshot.tournamentId, tournamentId))
      .orderBy(asc(tournamentRankingSnapshot.position)),
    db
      .select({
        id: team.id,
        name: team.name,
        memberId: teamMember.id,
        playerId: teamMember.playerId,
        playerName: player.name,
        playerSlug: player.slug,
        isCaptain: teamMember.isCaptain,
        seat: teamMember.seat,
      })
      .from(team)
      .leftJoin(teamMember, eq(teamMember.teamId, team.id))
      .leftJoin(player, eq(player.id, teamMember.playerId))
      .where(eq(team.tournamentId, tournamentId))
      .orderBy(asc(team.createdAt), asc(teamMember.seat)),
    db
      .select({ version: liveVersion.version })
      .from(liveVersion)
      .where(eq(liveVersion.tournamentId, tournamentId)),
  ]);

  const teamMap = new Map<
    string,
    {
      id: string;
      name: string | null;
      members: {
        playerId: string;
        name: string;
        slug: string;
        isCaptain: boolean;
        seat: number | null;
      }[];
    }
  >();
  for (const row of teams) {
    const entry = teamMap.get(row.id) ?? {
      id: row.id,
      name: row.name,
      members: [],
    };
    if (row.playerId && row.playerName && row.playerSlug) {
      entry.members.push({
        playerId: row.playerId,
        name: row.playerName,
        slug: row.playerSlug,
        isCaptain: row.isCaptain ?? false,
        seat: row.seat,
      });
    }
    teamMap.set(row.id, entry);
  }

  const { editionOrder, editionYear, ...rest } = head;
  return {
    ...rest,
    stage: head.stage,
    editionYear,
    editionSlug:
      editionOrder > 1 ? `${editionYear}-${editionOrder}` : String(editionYear),
    version: versionRow?.version ?? 0,
    participants: participants as Participant[],
    teams: [...teamMap.values()],
  };
};

type LiveState = NonNullable<Awaited<ReturnType<typeof getLiveState>>>;

/** Version counter alone, for the change subscription's poll. */
const getLiveVersion = async (db: Database, tournamentId: string) => {
  const [row] = await db
    .select({ version: liveVersion.version })
    .from(liveVersion)
    .where(eq(liveVersion.tournamentId, tournamentId));
  return row?.version ?? 0;
};

/**
 * Who the admin can pick as participants: everyone, with the edition's
 * confirmations flagged so the confirmed come preselected.
 */
const listParticipantCandidates = async (db: Database, editionId: string) => {
  const rows = await db
    .select({
      id: player.id,
      name: player.name,
      slug: player.slug,
      hasAccount: sql<boolean>`${player.userId} IS NOT NULL`,
      confirmed: sql<boolean>`${editionPlayer.id} IS NOT NULL`,
    })
    .from(player)
    .leftJoin(
      editionPlayer,
      and(
        eq(editionPlayer.playerId, player.id),
        eq(editionPlayer.editionId, editionId),
      ),
    )
    .orderBy(asc(player.name));
  return rows;
};

/** Accounts with a role above `user`, to warn which admins lack a player. */
const listStaffWithoutPlayer = (db: Database) =>
  db
    .select({ id: user.id, name: user.name })
    .from(user)
    .leftJoin(player, eq(player.userId, user.id))
    .where(and(ne(user.role, 'user'), sql`${player.id} IS NULL`));

export {
  getCurrentTournament,
  getLiveState,
  getLiveVersion,
  isPublicStage,
  type LiveState,
  listParticipantCandidates,
  listStaffWithoutPlayer,
  type Participant,
};
