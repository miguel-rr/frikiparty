import { and, asc, desc, eq, gte, isNotNull, ne, sql } from 'drizzle-orm';

import type { AuctionLiveState } from '@/lib/tournament/auction-live';
import type { DraftLiveState } from '@/lib/tournament/draft-live';
import { combineBallotsToRanking } from '@/lib/tournament/ranking';
import { stageIndex, type TournamentStage } from '@/lib/tournament/stages';
import type { db as Db } from '@/server/db';
import {
  edition,
  editionPlayer,
  game,
  gameVersion,
  liveRoom,
  liveVersion,
  player,
  team,
  teamFormationPotPlayer,
  teamMember,
  tournament,
  tournamentRankingSnapshot,
  tournamentVote,
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

/**
 * The ranking, its vote-derived half and the pots are the admin's until the
 * pots are published (stage `formation`); before that the Council only
 * says it deliberates.
 */
const revealsDeliberation = (stage: TournamentStage) =>
  stageIndex(stage) >= stageIndex('formation');

type Participant = {
  id: string;
  name: string;
  slug: string;
  position: number;
  rings: number;
  individualRings: number;
  cardPortrait: string | null;
  cardAbility: string | null;
  cardAbilityText: string | null;
  /** Has an account claimed this player (so they can act in the app). */
  hasAccount: boolean;
};

/** Ballots as the engine wants them; never leaves the server. */
const loadBallots = async (db: Database, tournamentId: string) =>
  (
    await db
      .select({
        voterId: tournamentVote.voterPlayerId,
        order: tournamentVote.order,
      })
      .from(tournamentVote)
      .where(eq(tournamentVote.tournamentId, tournamentId))
  ).map((row) => ({ voterId: row.voterId, order: row.order }));

/**
 * Everything the live views need about a tournament in one read; grows
 * with each phase of the live plan. Participants come from the ranking
 * snapshot, which is also the participant list. Pass `privileged` for an
 * admin reader: the deliberation (ranking, votes' aggregate, pots) is
 * only included for everyone else once the pots are published.
 */
const getLiveState = async (
  db: Database,
  tournamentId: string,
  options: { privileged?: boolean } = {},
) => {
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
      teamRankingSnapshot: tournament.teamRankingSnapshot,
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
  const stage = head.stage;
  const reveal = options.privileged || revealsDeliberation(stage);

  const [participants, teams, [versionRow], voters, potRows, rooms] =
    await Promise.all([
      db
        .select({
          id: player.id,
          name: player.name,
          slug: player.slug,
          position: tournamentRankingSnapshot.position,
          rings: tournamentRankingSnapshot.rings,
          individualRings: tournamentRankingSnapshot.individualRings,
          cardPortrait: player.cardPortrait,
          cardAbility: player.cardAbility,
          cardAbilityText: player.cardAbilityText,
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
      db
        .select({
          playerId: tournamentVote.voterPlayerId,
          submittedAt: tournamentVote.submittedAt,
        })
        .from(tournamentVote)
        .where(eq(tournamentVote.tournamentId, tournamentId))
        .orderBy(asc(tournamentVote.submittedAt)),
      db
        .select({
          potIndex: teamFormationPotPlayer.potIndex,
          playerId: teamFormationPotPlayer.playerId,
        })
        .from(teamFormationPotPlayer)
        .where(eq(teamFormationPotPlayer.tournamentId, tournamentId)),
      db
        .select({
          kind: liveRoom.kind,
          state: liveRoom.state,
          version: liveRoom.version,
          status: liveRoom.status,
        })
        .from(liveRoom)
        .where(eq(liveRoom.tournamentId, tournamentId)),
    ]);

  // The formation room, if one runs. Mid-lot, the high bidder's identity is
  // nobody's business (core-logic): only the amount leaves the server.
  const roomRow = rooms.find((row) => row.kind === head.formationMethod);
  const room: LiveRoom | null = roomRow
    ? roomRow.kind === 'auction'
      ? {
          kind: 'auction',
          version: roomRow.version,
          status: roomRow.status,
          state: hideBidder(roomRow.state as AuctionLiveState),
        }
      : {
          kind: 'draft',
          version: roomRow.version,
          status: roomRow.status,
          state: roomRow.state as DraftLiveState,
        }
    : null;

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

  // Pots in ranking order within each tier (the snapshot decides).
  const rankPosition = new Map(
    (head.teamRankingSnapshot ?? []).map((id, index) => [id, index]),
  );
  const potCount = potRows.reduce(
    (max, row) => Math.max(max, row.potIndex + 1),
    0,
  );
  const pots: string[][] = Array.from({ length: potCount }, () => []);
  for (const row of potRows) pots[row.potIndex]?.push(row.playerId);
  for (const pot of pots) {
    pot.sort(
      (a, b) =>
        (rankPosition.get(a) ?? Number.MAX_SAFE_INTEGER) -
        (rankPosition.get(b) ?? Number.MAX_SAFE_INTEGER),
    );
  }

  // The votes' own ranking is only computed once voting is closed: a live
  // partial tally would leak how the vote is going.
  const votingClosed = stageIndex(stage) > stageIndex('voting');
  const participantIds = participants.map((row) => row.id);
  const voteRanking =
    reveal && votingClosed && head.rankingSource !== 'historical'
      ? combineBallotsToRanking(
          await loadBallots(db, tournamentId),
          participantIds,
        )
      : null;

  const { editionOrder, editionYear, teamRankingSnapshot, ...rest } = head;
  return {
    ...rest,
    stage,
    editionYear,
    editionSlug:
      editionOrder > 1 ? `${editionYear}-${editionOrder}` : String(editionYear),
    version: versionRow?.version ?? 0,
    participants: participants as Participant[],
    teams: [...teamMap.values()],
    voting: {
      submittedPlayerIds: voters.map((row) => row.playerId),
    },
    /** Tournament ranking (best first); null until computed or while private. */
    ranking: reveal ? (teamRankingSnapshot ?? null) : null,
    voteRanking,
    pots: reveal ? pots : [],
    room,
  };
};

type LiveRoom =
  | {
      kind: 'auction';
      version: number;
      status: string;
      state: AuctionLiveState;
    }
  | { kind: 'draft'; version: number; status: string; state: DraftLiveState };

const hideBidder = (state: AuctionLiveState): AuctionLiveState =>
  state.currentLot?.highBid
    ? {
        ...state,
        currentLot: {
          ...state.currentLot,
          highBid: { ...state.currentLot.highBid, captainId: '' },
        },
      }
    : state;

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
  type LiveRoom,
  type LiveState,
  listParticipantCandidates,
  listStaffWithoutPlayer,
  loadBallots,
  type Participant,
  revealsDeliberation,
};
